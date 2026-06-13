/*
Writing Tools Action for LaunchBar (using Chat GPT)
by Christian Bender (@ptujec)
2024-12-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
- https://developers.openai.com/api/reference/resources/responses/methods/create

  Migration:
    - https://developers.openai.com/api/docs/guides/migrate-to-responses?update-item-definitions=responses#migrating-from-chat-completions


TODO:
- model selection per prompt … or just for custom prompt?
- reasoning setting?
- use system prompt instead of persona terminology (check AskGPT action for migration) … maybe remove the persona field entirely
- savety check only with longer text? Needs better way to select text
*/

String.prototype.localizationTable = 'default';
include('as.js');
include('settings.js');

const toolsPath = File.readJSON(`${Action.path}/Contents/Resources/tools.json`);
const userToolsPath = `${Action.supportPath}/userTools.json`;
const logPath = `${Action.supportPath}/writing-tools-usage.log`;

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
    'lsappinfo info -only bundleid $(/usr/bin/lsappinfo front)',
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

function mainAction({
  content,
  hasArgument,
  frontmostAppID,
  tool,
  isCustomPrompt,
}) {
  LaunchBar.hide();

  const prefs = Action.preferences;
  const model = prefs.model || recommendedModel;
  const defaultToolID = prefs.defaultToolID || '1';
  const tools = getUserToolsJSON();

  // Handle custom prompt
  if (isCustomPrompt) {
    const customPrompt = LaunchBar.executeAppleScript(
      `set result to display dialog "${'Enter Prompt'.localize()}:" with title "${'New Prompt'.localize()}" default answer ""`,
      'set result to text returned of result',
    ).trim();

    if (customPrompt === '') return;

    const toolsData = File.readJSON(userToolsPath);

    if (!toolsData.customPromptPersona) {
      toolsData.customPromptPersona = toolsPath.customPromptPersona;
      File.writeJSON(toolsData, userToolsPath);
    }

    const customPromptPersona = toolsData.customPromptPersona;

    tool = {
      id: 'custom',
      prompt: `${customPrompt}:\n`,
      persona: customPromptPersona,
    };
  } else {
    tool = tool ? tool : tools.find((tool) => tool.id === defaultToolID);
  }

  // API CALL
  const result = HTTP.postJSON('https://api.openai.com/v1/responses', {
    headerFields: {
      Authorization: `Bearer ${prefs.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      instructions: tool.persona,
      input: `${tool.prompt} ${content}`,
      store: false,
    },
  });

  // File.writeJSON(result, Action.supportPath + '/test.json');
  // File.writeJSON(
  //   JSON.parse(result.data),
  //   Action.supportPath + '/testData.json',
  // );

  // const result = File.readJSON(Action.supportPath + '/test.json');

  processResult({ result, content, hasArgument, frontmostAppID, model, tool });
}

function processResult({
  result,
  content,
  hasArgument,
  frontmostAppID,
  model,
  tool,
}) {
  const prefs = Action.preferences;

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
  const answer = data.output[0]?.content[0]?.text.trim();

  // LOG TOKEN USAGE
  logTokenUsage(data, model, tool);

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
    ? 'click menu item 14 of menu 4 of menu bar 1 of application process "iA Writer"\n'
    : '';

  const authorName = prefs.iaAuthor;

  const pasteInWriterAS = `
    tell application "iA Writer" to activate\n
    tell application "System Events"\n
    ${markAllAS}
    click menu item "${authorName}" of ${pasteEditsFromMenu}\n
    end tell
    `;

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

  LaunchBar.executeAppleScript(`
    tell application "BBEdit"
      activate
      set theResult to compare file ("${originalTextFile}" as POSIX file) against file ("${answerTextFile}" as POSIX file)
    end tell
    `);
}

function playConfirmationSound() {
  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf',
  );
}

function confirmationDialog() {
  const response = LaunchBar.alert(
    'Select all text?'.localize(),
    '',
    'Ok',
    'Cancel'.localize(),
  );
  return response === 0;
}
