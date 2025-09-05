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
  const prefs = Action.preferences;

  // COPY TOOLS SO THEY CAN BE CUSTOMIZED
  if (!File.exists(userToolsPath)) File.writeJSON(toolsPath, userToolsPath);

  // CHECK/SET API KEY
  if (!prefs.apiKey) importAPIKey();
  if (!prefs.apiKey) return setApiKey();

  // SHOW SETTINGS
  if (LaunchBar.options.alternateKey) return settings();

  const frontmostAppID = LaunchBar.execute(
    '/bin/sh',
    '-c',
    'lsappinfo info -only bundleid $(/usr/bin/lsappinfo front)'
  )
    .split('=')[1]
    .split('"')[1];

  const contentAS =
    frontmostAppID === 'pro.writer.mac'
      ? getWriterContentAs
      : getStandardContentAs;

  const hasArgument = argument ? true : false; // For Writer AS

  let content = argument?.trim();

  if (!argument) {
    if (!prefs.excludedApps?.map((app) => app.appID).includes(frontmostAppID)) {
      if (confirmationDialog() === false) {
        // if user canceled
        LaunchBar.hide();
        return;
      }
    }

    if (frontmostAppID !== 'pro.writer.mac') {
      LaunchBar.clearClipboard(); // avoid pasting text from clipboard when no text can be selected
      LaunchBar.hide(); // necessary for UI scripting part of getStandardContentAs
    }

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
  if (frontmostAppID === 'pro.writer.mac' && !prefs.iaAuthor)
    return showAuthors({ isMain: true, content, hasArgument, frontmostAppID });

  // SHOW TOOL OPTIONS
  if (LaunchBar.options.commandKey)
    return showTools({ content, hasArgument, frontmostAppID });

  // RUN MAIN ACTION USING THE DEFAULT TOOL
  return mainAction({ content, hasArgument, frontmostAppID });
}

function mainAction({ content, hasArgument, frontmostAppID, tool }) {
  LaunchBar.hide();

  const prefs = Action.preferences;
  const model = prefs.model || 'gpt-4o-mini';
  const defaultToolID = prefs.defaultToolID || '1';
  const tools = getUserToolsJSON();
  tool = tool ? tool : tools.find((tool) => tool.id === defaultToolID);

  // API CALL
  const result = HTTP.postJSON('https://api.openai.com/v1/chat/completions', {
    headerFields: {
      Authorization: `Bearer ${prefs.apiKey}`,
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
  const prefs = Action.preferences;

  // ERROR HANDLING
  if (!result.response) {
    LaunchBar.alert(result.error || 'Unknown error occurred');
    return;
  }

  if (result.response.status != 200) {
    let errorMessage = result.response.localizedStatus;

    try {
      if (result.data) {
        const data = JSON.parse(result.data);
        if (data.error?.message) {
          errorMessage = data.error.message;
        }
      }
    } catch (e) {
      LaunchBar.log('Error parsing error response:', e);
    }

    LaunchBar.alert(`${result.response.status}: ${errorMessage}`);
    return;
  }

  // PARSE RESULT
  let data = JSON.parse(result.data);
  const answer = data.choices[0].message.content.trim();

  if (content === answer) {
    LaunchBar.alert('No changes. Input and answer are identical.'.localize());
    LaunchBar.hide();
    return;
  }

  // COMPARE INPUT TO ANSWER IN BBEDIT Option (Settings)
  if (prefs.useBBEditCompare) {
    compareTexts({ content, answer });
    playConfirmationSound();
    return;
  }

  // PASTE ANSWER IN IA WRITER
  if (frontmostAppID === 'pro.writer.mac' && prefs.iaAuthor) {
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
  const prefs = Action.preferences;

  LaunchBar.setClipboardString(answer);
  LaunchBar.hide();

  const markAllAS = !hasArgument
    ? // ? 'delay 0.2\nkeystroke "a" using command down\n'
      'click menu item 14 of menu 4 of menu bar 1 of application process "iA Writer"\n'
    : '';
  const authorName = prefs.iaAuthor;

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
