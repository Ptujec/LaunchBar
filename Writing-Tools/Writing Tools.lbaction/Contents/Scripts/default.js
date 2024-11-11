/*
Writing Tools Action for LaunchBar (using Chat GPT) 
by Christian Bender (@ptujec)
2024-11-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
- https://platform.openai.com/docs/api-reference/chat
- https://platform.openai.com/docs/guides/chat/introduction
- https://platform.openai.com/docs/guides/prompt-engineering

TODO: 
- code cleanup
*/

String.prototype.localizationTable = 'default';
include('as.js');

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

  Action.preferences.frontmostAppID =
    LaunchBar.executeAppleScript(getFrontmostAS).trim();

  const contentAS =
    Action.preferences.frontmostAppID === 'pro.writer.mac'
      ? getWriterContentAs
      : getStandardContentAs;

  if (Action.preferences.frontmostAppID !== 'pro.writer.mac') LaunchBar.hide(); // necessary for UI scripting part of getStandardContentAs

  Action.preferences.hasArgument = argument ? true : false; // For Writer AS (as.js)

  if (!argument) {
    const output = LaunchBar.executeAppleScript(contentAS).trim();

    if (output.startsWith('Error')) return { title: output, icon: 'alert' };

    if (output == '') return { title: 'No text!'.localize(), icon: 'alert' };

    argument = output;
  }

  // CHECK FOR AUTHOR (iA Writer)
  if (
    Action.preferences.frontmostAppID === 'pro.writer.mac' &&
    !Action.preferences.iaAuthor
  )
    return showAuthors((isMain = true), argument);

  // SHOW TOOL OPTIONS
  if (LaunchBar.options.commandKey) return showTools(argument);

  // RUN MAIN ACTION USING THE DEFAULT TOOL
  return mainAction({ argument });
}

function mainAction({ argument, tool }) {
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
        { role: 'user', content: `${tool.prompt}${argument}` },
      ],
    },
  });

  processResult(result, argument);
}

function processResult(result, argument) {
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

  if (argument === answer)
    return {
      title: 'No changes. Input and answer are identical.'.localize(),
      icon: 'alert',
    };

  // COMPARE INPUT TO ANSWER IN BBEDIT Option (Settings)
  if (Action.preferences.useBBEditCompare) {
    compareTexts(argument, answer);
    playConfirmationSound();
    return;
  }

  // PASTE ANSWER IN IA WRITER
  if (
    Action.preferences.frontmostAppID === 'pro.writer.mac' &&
    Action.preferences.iaAuthor
  ) {
    pasteAnswerInWriter(answer);
    playConfirmationSound();
    return;
  }

  // PASTE ANSWER IN OTHER APP
  LaunchBar.setClipboardString(answer);
  LaunchBar.paste();
  playConfirmationSound();
}

function pasteAnswerInWriter(answer) {
  LaunchBar.setClipboardString(answer);
  LaunchBar.hide();
  LaunchBar.executeAppleScript(pasteInWriterAS);
}

function compareTexts(argument, answer) {
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
  File.writeText(argument, originalTextFile);

  LaunchBar.executeAppleScript(
    'tell application "BBEdit"',
    '	activate',
    `	set theResult to compare file ("${originalTextFile}" as POSIX file) against file ("${answerTextFile}" as POSIX file)`,
    'end tell'
  );
}

// SETTINGS

function settings() {
  const defaultToolID = Action.preferences.defaultToolID || '1';
  const tools = getUserToolsJSON();
  const defaultToolName = tools.find(
    (tool) => tool.id === defaultToolID
  )?.title;

  return [
    {
      title: 'Choose Default Tool'.localize(),
      icon: 'toolTemplate',
      badge: defaultToolName.localize(),
      children: showTools(),
    },
    {
      title: 'Choose Model'.localize(),
      icon: 'gearTemplate',
      badge: Action.preferences.model || 'gpt-4o-mini',
      children: showModels(),
    },
    File.exists('/Applications/iA Writer.app')
      ? {
          title: 'Set Author (iA Writer)'.localize(),
          icon: 'iATemplate',
          action: 'showAuthors',
          badge: Action.preferences.iaAuthor
            ? Action.preferences.iaAuthor
            : undefined,
        }
      : {},
    File.exists('/Applications/BBEdit.app')
      ? {
          title: 'Use Compare (BBEdit)'.localize(),
          icon: 'bbTemplate',
          action: 'toogleBBEditCompare',
          badge: Action.preferences.useBBEditCompare
            ? 'On'.localize()
            : 'Off'.localize(),
        }
      : {},
    ,
    {
      title: 'Edit Tools'.localize(),
      icon: 'codeTemplate',
      action: 'editTools',
    },
    {
      title: 'Reset Tools'.localize(),
      icon: 'resetTemplate',
      action: 'resetTools',
    },
    {
      title: 'Set API Key'.localize(),
      icon: 'keyTemplate',
      action: 'setApiKey',
    },
  ];
}

function getUserToolsJSON() {
  try {
    return File.readJSON(userToolsPath).tools;
  } catch (error) {
    File.writeJSON(toolsPath, userToolsPath);
    return File.readJSON(userToolsPath).tools;
  }
}

function showTools(argument) {
  const tools = getUserToolsJSON();
  const defaultToolID = Action.preferences.defaultToolID || '1';

  return tools.map((tool) => ({
    title: `${tool.title}`.localize(),
    icon: argument
      ? 'toolTemplate'
      : tool.id === defaultToolID
      ? 'checkTemplate.png'
      : 'circleTemplate.png',
    badge:
      argument && tool.id === defaultToolID ? 'Default'.localize() : undefined,
    action: argument ? 'mainAction' : 'setDefaultTool',
    actionArgument: { argument, tool },
    actionRunsInBackground: argument ? true : false,
  }));
}

function setDefaultTool({ tool }) {
  Action.preferences.defaultToolID = tool.id;
  return settings();
}

function setTool(tool) {
  LaunchBar.alert(JSON.stringify(tool));
  return tool;
}

function editTools() {
  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(userToolsPath));
}

function resetTools() {
  File.writeJSON(toolsPath, userToolsPath);
  return settings();
}

function showModels() {
  const currentModel = Action.preferences.model || 'gpt-4o-mini';
  const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'];

  return models.map((model) => ({
    title: model,
    icon: currentModel === model ? 'checkTemplate.png' : 'circleTemplate.png',
    action: 'setModel',
    actionArgument: model,
  }));
}

function setModel(model) {
  Action.preferences.model = model;
  return settings();
}

function showAuthors(isMain, argument) {
  // if (isMain === true) LaunchBar.alert(isMain);

  const authors = LaunchBar.executeAppleScript(showAuthorsAS).trim().split(',');

  return authors.map((item) => {
    const author = item.trim();
    return {
      title: author,
      subtitle:
        isMain === true ? 'Set Author (iA Writer)'.localize() : undefined,
      alwaysShowsSubtitle: isMain === true ? true : false,
      icon:
        isMain === true
          ? 'iATemplate'
          : author === Action.preferences.iaAuthor
          ? 'checkTemplate.png'
          : 'circleTemplate.png',
      action: 'setAuthor',
      actionArgument: {
        author,
        isMain,
        argument,
      },
    };
  });
}

function setAuthor({ author, isMain, argument }) {
  if (author) Action.preferences.iaAuthor = author;
  if (isMain === true) return showTools(argument);
  return settings();
}

function toogleBBEditCompare() {
  if (Action.preferences.useBBEditCompare) {
    Action.preferences.useBBEditCompare = false;
  } else {
    Action.preferences.useBBEditCompare = true;
  }
  return settings();
}

function importAPIKey() {
  // Try to import API key from Ask ChatGPT Action
  const AskChatGPTPrefs =
    '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.AskChatGPT/Preferences.plist';

  if (File.exists(AskChatGPTPrefs)) {
    Action.preferences.apiKey = File.readPlist(AskChatGPTPrefs).apiKey;
  }
}

function setApiKey() {
  // API Key dialog
  const response = LaunchBar.alert(
    'API key required'.localize(),
    '1) Press »Open OpenAI.com« to create an API key.\n2) Press »Set API Key«'.localize(),
    'Open OpenAI.com'.localize(),
    'Set API Key'.localize(),
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://platform.openai.com/account/api-keys');
      LaunchBar.hide();
      break;
    case 1:
      const clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length == 56) {
        // TODO: Better API key test

        Action.preferences.apiKey = clipboardContent;

        LaunchBar.alert(
          'Success!'.localize(),
          'API key set to: '.localize() + Action.preferences.apiKey
        );
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a valid API key.',
          'Make sure the API key is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}

function playConfirmationSound() {
  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );
}
