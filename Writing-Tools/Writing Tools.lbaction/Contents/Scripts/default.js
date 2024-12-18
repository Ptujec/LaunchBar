/*
Writing Tools Action for LaunchBar (using Chat GPT) 
by Christian Bender (@ptujec)
2024-12-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
- https://platform.openai.com/docs/api-reference/chat
- https://platform.openai.com/docs/models#model-endpoint-compatibility
- https://platform.openai.com/docs/guides/chat/introduction
- https://platform.openai.com/docs/guides/prompt-engineering

ISSUES: 
- If I select text where there is none text is still taken from the clipboard and pasted ... which is not what you want

TODO: 
- savety check only with longer text? Needs better way to select text (see issue above)
- make faster detect frontmost and get contents?
- code cleanup
*/

String.prototype.localizationTable = 'default';
include('as.js');
include('settings.js');

const toolsPath = File.readJSON(`${Action.path}/Contents/Resources/tools.json`);
const userToolsPath = `${Action.supportPath}/userTools.json`;

function run(argument) {
  // COPY TOOLS SO THEY CAN BE CUSTOMIZED
  if (!File.exists(userToolsPath)) File.writeJSON(toolsPath, userToolsPath);

  // CHECK/SET API KEY
  if (!Action.preferences.apiKey) importAPIKey();
  if (!Action.preferences.apiKey) return setApiKey();

  // SHOW SETTINGS
  if (LaunchBar.options.alternateKey) return settings();

  const frontmostAppID = LaunchBar.executeAppleScript(getFrontmostAS).trim(); // TODO: Faster method? … slow especially when no argument … and exAS is used twice … maybe combine?

  const contentAS =
    frontmostAppID === 'pro.writer.mac'
      ? getWriterContentAs
      : getStandardContentAs;

  const hasArgument = argument ? true : false; // For Writer AS

  let content = argument?.trim();

  if (!argument) {
    if (!Action.preferences.excludedApps.includes(frontmostAppID)) {
      if (confirmationDialog() === false) {
        // if user canceled
        LaunchBar.hide();
        return;
      }
    }

    if (frontmostAppID !== 'pro.writer.mac') LaunchBar.hide(); // necessary for UI scripting part of getStandardContentAs

    content = LaunchBar.executeAppleScript(contentAS).trim();

    if (content.startsWith('Error')) {
      LaunchBar.alert(content);
      LaunchBar.hide();
      return;
    }

    if (content == '') {
      LaunchBar.alert('No text!'.localize());
      LaunchBar.hide();
      return;
    }
  }

  // CHECK FOR AUTHOR (iA Writer)
  if (frontmostAppID === 'pro.writer.mac' && !Action.preferences.iaAuthor)
    return showAuthors({ isMain: true, content, hasArgument, frontmostAppID });

  // SHOW TOOL OPTIONS
  if (LaunchBar.options.commandKey)
    return showTools({ content, hasArgument, frontmostAppID });

  // RUN MAIN ACTION USING THE DEFAULT TOOL
  return mainAction({ content, hasArgument, frontmostAppID });
}

function mainAction({ content, hasArgument, frontmostAppID, tool }) {
  LaunchBar.hide();

  const model = Action.preferences.model || 'gpt-4o-mini';
  const defaultToolID = Action.preferences.defaultToolID || '1';
  const tools = getUserToolsJSON();
  tool = tool ? tool : tools.find((tool) => tool.id === defaultToolID);

  // API CALL
  const result = HTTP.postJSON('https://api.openai.com/v1/chat/completions', {
    headerFields: {
      Authorization: `Bearer ${Action.preferences.apiKey}`,
    },
    body: {
      model: model,
      messages: [
        { role: 'system', content: tool.persona },
        { role: 'user', content: `${tool.prompt}${content}` },
      ],
    },
  });

  processResult({ result, content, hasArgument, frontmostAppID });
}

function processResult({ result, content, hasArgument, frontmostAppID }) {
  // ERROR HANDLING
  if (result.response == undefined) {
    return { title: result.error, icon: 'alert' };
  }

  if (result.response.status != 200) {
    let details;
    if (result.data != undefined) {
      const data = JSON.parse(result.data);
      if (data.error != undefined) {
        details = data.error.message;
      }
    }

    return {
      title:
        result.response.status + ': ' + details ??
        result.response.localizedStatus,
      icon: 'alert',
    };
  }

  // PARSE RESULT
  let data = JSON.parse(result.data);
  const answer = data.choices[0].message.content.trim();

  if (content === answer) {
    return LaunchBar.alert(
      'No changes. Input and answer are identical.'.localize()
    );
  }

  // COMPARE INPUT TO ANSWER IN BBEDIT Option (Settings)
  if (Action.preferences.useBBEditCompare) {
    compareTexts({ content, answer });
    playConfirmationSound();
    return;
  }

  // PASTE ANSWER IN IA WRITER
  if (frontmostAppID === 'pro.writer.mac' && Action.preferences.iaAuthor) {
    pasteAnswerInWriter({ answer, hasArgument });
    playConfirmationSound();
    return;
  }

  // PASTE ANSWER IN OTHER APP
  // TODO: this is causing trouble sometimes
  LaunchBar.setClipboardString(answer);
  LaunchBar.hide();
  LaunchBar.paste(answer);

  playConfirmationSound();
}

function pasteAnswerInWriter({ answer, hasArgument }) {
  LaunchBar.setClipboardString(answer);
  LaunchBar.hide();

  const markAllAS = !hasArgument
    ? // ? 'delay 0.2\nkeystroke "a" using command down\n'
      'click menu item 14 of menu 4 of menu bar 1 of application process "iA Writer"\n'
    : '';
  const authorName = Action.preferences.iaAuthor;

  const pasteInWriterAS =
    'tell application "iA Writer" to activate\n' +
    'tell application "System Events"\n' +
    markAllAS +
    `click menu item "${authorName}" of ${pasteEditsFromMenu}\n` +
    'end tell\n';

  LaunchBar.executeAppleScript(pasteInWriterAS);
}

function compareTexts({ content, answer }) {
  // Check if BBEdit is installed
  if (!File.exists('/Applications/BBEdit.app')) {
    return {
      title: 'BBEdit is not installed',
      icon: 'alert',
    };
  }

  const timeStamp = new Date().toISOString().replace(/-|:|\./g, '');
  const tempDir = '/tmp/compare';
  const answerTextFile = `${tempDir}/${timeStamp}_answer.txt`;
  let originalTextFile = `${tempDir}/${timeStamp}_original.txt`;

  File.createDirectory(tempDir);
  File.writeText(answer, answerTextFile);
  File.writeText(content, originalTextFile);

  LaunchBar.executeAppleScript(
    'tell application "BBEdit"',
    '	activate',
    `	set theResult to compare file ("${originalTextFile}" as POSIX file) against file ("${answerTextFile}" as POSIX file)`,
    'end tell'
  );
}

function playConfirmationSound() {
  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );
}

function confirmationDialog() {
  const response = LaunchBar.alert(
    'Select all text?'.localize(),
    '',
    'Ok',
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      // Continue
      doIt = true;
      break;
    case 1:
      doIt = false;
      break;
  }
  return doIt;
}
