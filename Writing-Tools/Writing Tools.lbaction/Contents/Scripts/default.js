/*
Writing Tools Action for LaunchBar (using Chat GPT) 
by Christian Bender (@ptujec)
2024-11-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
- https://platform.openai.com/docs/api-reference/chat
- https://platform.openai.com/docs/models#model-endpoint-compatibility
- https://platform.openai.com/docs/guides/chat/introduction
- https://platform.openai.com/docs/guides/prompt-engineering


TODO: 
- savety check … maybe optional? … only with longer text?
- make faster detect frontmost and get contents
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

  const frontmostAppID = LaunchBar.executeAppleScript(getFrontmostAS).trim(); // TODO: Faster method? … slow especially when no argument … and exAS is used twice … maybe combine?

  const contentAS =
    frontmostAppID === 'pro.writer.mac'
      ? getWriterContentAs
      : getStandardContentAs;

  const hasArgument = argument ? true : false; // For Writer AS

  let content = argument?.trim();

  if (!argument) {
    // TODO: savety check … maybe optional … only with longer text

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

    LaunchBar.hide();

    if (doIt === false) return;

    content = LaunchBar.executeAppleScript(contentAS).trim();

    if (content.startsWith('Error')) return { title: content, icon: 'alert' };

    if (content == '') return { title: 'No text!'.localize(), icon: 'alert' };
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
      children: showTools({}),
    },
    {
      title: 'Choose Model'.localize(),
      icon: 'gearTemplate',
      badge: Action.preferences.model || 'gpt-4o-mini',
      action: 'showModels',
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

function showTools({ content, hasArgument, frontmostAppID }) {
  const tools = getUserToolsJSON();
  const defaultToolID = Action.preferences.defaultToolID || '1';

  return tools.map((tool) => ({
    title: `${tool.title}`.localize(),
    icon: content
      ? 'toolTemplate'
      : tool.id === defaultToolID
      ? 'checkTemplate.png'
      : 'circleTemplate.png',
    badge:
      content && tool.id === defaultToolID ? 'Default'.localize() : undefined,
    action: content ? 'mainAction' : 'setDefaultTool',
    actionArgument: { content, hasArgument, frontmostAppID, tool },
    actionRunsInBackground: content ? true : false,
  }));
}

function setDefaultTool({ tool }) {
  Action.preferences.defaultToolID = tool.id;
  return settings();
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

  const result = HTTP.getJSON('https://api.openai.com/v1/models', {
    headerFields: {
      Authorization: `Bearer ${Action.preferences.apiKey}`,
    },
  });

  if (result.response.status !== 200) {
    return LaunchBar.alert(
      `Error ${result.response.status}`,
      result.response.localizedStatus
    );
  }

  const modelsData = result.data.data;

  return (
    modelsData
      // Filter out versions that are not compatible with completions https://platform.openai.com/docs/models#model-endpoint-compatibility
      .filter(
        (item) =>
          item.id.startsWith('gpt-') &&
          !item.id.includes('realtime-preview') &&
          !item.id.includes('audio')
      )
      // .sort((a, b) => a.id > b.id)
      .map((item) => ({
        title: item.id,
        icon:
          currentModel === item.id ? 'checkTemplate.png' : 'circleTemplate.png',
        action: 'setModel',
        actionArgument: item.id,
        badge: item.id === 'gpt-4o-mini' ? 'Recommended'.localize() : undefined,
      }))
  );
}

function setModel(model) {
  Action.preferences.model = model;
  return settings();
}

function showAuthors({ isMain, content, hasArgument, frontmostAppID }) {
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
        content,
        hasArgument,
        frontmostAppID,
      },
    };
  });
}

function setAuthor({ author, isMain, content, hasArgument, frontmostAppID }) {
  if (author) Action.preferences.iaAuthor = author;
  if (isMain === true)
    return showTools({ content, hasArgument, frontmostAppID });
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
      const isValidAPIKey = checkAPIKey(clipboardContent);

      if (!isValidAPIKey) return;

      Action.preferences.apiKey = clipboardContent;

      LaunchBar.alert(
        'Success!'.localize(),
        'API key set to: '.localize() + Action.preferences.apiKey
      );
      break;
    case 2:
      break;
  }
}

function checkAPIKey(apiKey) {
  if (!apiKey.startsWith('sk-')) {
    LaunchBar.alert(
      'Invalid API key format'.localize(),
      'Make sure the API key is the most recent item in the clipboard!'.localize()
    );
    return false;
  }

  const result = HTTP.getJSON('https://api.openai.com/v1/models', {
    headerFields: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (result.response.status === 200) return true;

  LaunchBar.alert(
    'Invalid OpenAI API key'.localize(),
    `Error ${result.response.status}: ${result.response.localizedStatus}`
  );

  return false;
}

function playConfirmationSound() {
  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );
}
