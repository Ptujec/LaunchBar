/*
ChaptGPT Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://platform.openai.com/docs/api-reference/chat
- https://platform.openai.com/docs/guides/chat/introduction
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http

Prompts: 
- https://prompts.chat/

*/

String.prototype.localizationTable = 'default'; // For potential localization later

include('browser.js');

const apiKey = Action.preferences.apiKey;
const recentTimeStamp = Action.preferences.recentTimeStamp;
const chatsFolder = Action.supportPath + '/chats/';
const presets = File.readJSON(Action.path + '/Contents/Resources/presets.json');
const userPresetsPath = Action.supportPath + '/userPresets.json';
const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '2.0';

function run(argument) {
  // ON FIRST RUN COPY PRESETS TO ACTION SUPPORT
  if (!File.exists(userPresetsPath)) {
    File.writeJSON(presets, userPresetsPath);
  } else {
    // CHECK IF LB CAN READ THE CUSTOM JSON
    try {
      let test = File.readJSON(userPresetsPath);
    } catch (e) {
      var response = LaunchBar.alert(
        e,
        'You can either start fresh or try to fix your custom presets JSON code.',
        'Start fresh',
        'Edit presets',
        'Cancel'
      );
      switch (response) {
        case 0:
          // Start fresh
          File.writeJSON(presets, userPresetsPath);
          break;
        case 1:
          editPresets();
          break;
        case 2:
          break;
      }
      return;
    }
  }

  // CHECK/SET API KEY
  if (apiKey == undefined) {
    setApiKey();
    return;
  }

  // SETTINGS
  if (LaunchBar.options.alternateKey) {
    return settings();
  }

  // IF NO ARGUMENT IS PASSED
  if (argument == undefined) {
    // CHECK FOR NEW PRESETS
    if (isNewerVersion(lastUsedActionVersion, currentActionVersion)) {
      // Compare presets with user presets
      var newPresetsList = comparePresets();

      if (newPresetsList != undefined) {
        // Offer updating presets if they don't match
        var response = LaunchBar.alert(
          'Update presets?',
          'The following presets are new or missing in your user presets:\n' +
            newPresetsList +
            '\nWould you like to add them to your user presets?',
          'Ok',
          'Cancel'
        );
        switch (response) {
          case 0:
            // Update
            updatePresets();
            break;
          case 1:
            break;
        }
      }
      // Save current version number
      Action.preferences.lastUsedActionVersion = Action.version;
    }

    // SHOW PREDEFINED PROMPTS
    if (!LaunchBar.options.commandKey) {
      return prompts();
    }

    // DISPLAY RECENT CHATS
    // GET CHATS
    var chatsExist = false;
    if (File.exists(chatsFolder)) {
      var chatFiles = LaunchBar.execute('/bin/ls', '-t', chatsFolder)
        .trim()
        .split('\n');

      if (chatFiles != '') {
        chatsExist = true;
      }
    }
    if (chatsExist == false) {
      return;
    }
    var result = [];
    chatFiles.forEach(function (item) {
      var path = chatsFolder + item;
      var title = File.displayName(path).replace(/\.md$/, ''),
        pushData = {
          title: title,
          subtitle: '',
          path: chatsFolder + item,
        };
      result.push(pushData);
    });
    return result;
  }

  // IF ARGUMENT IS PASSED

  // CHOOSE PERSONA
  if (LaunchBar.options.commandKey) {
    return showPersonas(argument);
  }

  // OPTIONS
  // (e.g. continue with chat, add url, …)
  return options({
    argument: argument,
  });
}

function options(dict) {
  // LaunchBar.alert('Options:\n' + JSON.stringify(dict));
  // return;

  var argument = dict.argument;
  var defaultPersonaIcon = Action.preferences.defaultPersonaIcon ?? 'weasel';

  var result = [
    {
      title: 'New Chat',
      subtitle: 'Asks: ' + argument,
      icon: dict.icon ?? defaultPersonaIcon,
      action: 'ask',
      actionArgument: {
        argument: argument,
        icon: dict.icon ?? defaultPersonaIcon,
      },
      actionRunsInBackground: true,
    },
  ];

  // GET MOST RECENT CHAT
  var recent = Action.preferences.recent;

  if (
    recent != undefined &&
    recent.path != undefined &&
    File.exists(recent.path)
  ) {
    var recentFileTitle = File.displayName(recent.path).replace(/\.md$/, '');

    var pushData = {
      title: 'Continue: ' + recentFileTitle,
      subtitle: 'Asks: ' + argument,
      icon: dict.icon ?? recent.icon ?? defaultPersonaIcon,
      action: 'ask',
      actionArgument: {
        argument: argument,
        presetTitle: recent.presetTitle,
        addRecent: true,
        icon: dict.icon ?? recent.icon ?? defaultPersonaIcon,
        recentPath: recent.path,
        recentFileTitle: recentFileTitle,
        persona: recent.persona ?? undefined,
      },
      actionRunsInBackground: true,
    };

    var recentBadge = recent.presetTitle;
    var defaultPersonaTitle =
      Action.preferences.defaultPersonaTitle ??
      File.readJSON(userPresetsPath).personas[0].title; // default

    if (recentBadge != defaultPersonaTitle) {
      pushData.badge = recentBadge;
    }

    result.push(pushData);

    // Reverse order if recent was created less than five minutes ago
    const timeDifference = (new Date() - new Date(recentTimeStamp)) / 60000;
    if (timeDifference < 10) {
      result.reverse();
    }
  }

  // SHOW CONTEXT OPTIONS
  result.push(
    {
      title: 'Add Website',
      subtitle: 'Asks: ' + argument,
      action: 'ask',
      icon: 'weasel_web',
      actionArgument: {
        argument: argument + '\n',
        addURL: true,
        icon: dict.icon ?? 'weasel_web',
      },
      actionRunsInBackground: true,
    },
    {
      title: 'Add Clipboard',
      subtitle: 'Asks: ' + argument,
      action: 'ask',
      icon: 'weasel_clipboard',
      actionArgument: {
        argument: argument + '\n',
        addClipboard: true,
        icon: dict.icon ?? 'weasel_clipboard',
      },
      actionRunsInBackground: true,
    }
  );

  if (dict.persona != undefined) {
    result.forEach(function (item) {
      item.badge = dict.presetTitle; // persona title
      item.actionArgument.persona = dict.persona;
      item.actionArgument.presetTitle = dict.presetTitle; // persona  title
    });
  }

  return result;
}

function ask(dict) {
  // LaunchBar.alert('Ask:\n' + JSON.stringify(dict));

  var argument = dict.argument.trim();

  if (dict.isPrompt) {
    var title = dict.presetTitle ?? argument; // for (new) file name
  } else {
    var title = argument;
  }

  // ITEMS WITH CLIPBOARD CONTENT
  if (dict.addClipboard == true) {
    var clipboard = LaunchBar.getClipboardString().trim();

    var displayClipboard = clipboard;
    if (displayClipboard.length > 500) {
      displayClipboard = displayClipboard.substring(0, 500) + '…';
    }

    var response = LaunchBar.alert(
      argument.trim(),
      '"' + displayClipboard + '"',
      'Ok',
      'Cancel'
    );
    switch (response) {
      case 0:
        title = title + ' - ' + clipboard;
        argument += '\n\n' + clipboard;
        break;
      case 1:
        return;
    }
  }

  LaunchBar.hide();

  // ITEMS WITH URL
  if (dict.addURL == true) {
    var currentURL = getCurrentURL();
    if (currentURL != undefined) {
      title = (title + ' - ' + currentURL)
        .replace(/[&~#@[\]{}\\\/%*$:;,.?><\|"“]/g, '_')
        .replace(/(https?|www)/g, ' ');

      argument += ' ' + currentURL;
    } else {
      return;
    }
  }

  var question = argument; // position is important becaus of addClipboard & addURL

  // INCLUDE PREVIOUS CHAT HISTORY?
  var addRecent = dict.addRecent;
  if (addRecent == true) {
    var recentPath = dict.recentPath;

    if (!File.exists(recentPath)) {
      return;
    }

    // Add thread for context
    var text = File.readText(recentPath).replace(/^> /gm, '');
    question = text + '...' + argument + '\n';

    var title = dict.recentFileTitle;
  } else {
    // TITLE CLEANUP
    title = title
      .replace(/[&~=§#@[\]{}()+\\\/%*$:;,.?><\|"“'´]/g, ' ')
      .replace(/[\s_]{2,}/g, ' ');

    if (title.length > 80) {
      title = title.substring(0, 80) + '…';
    }
  }

  // MODEL
  var model = Action.preferences.model ?? 'gpt-3.5-turbo';

  // PERSONA
  // GET DEFAULT
  var defaultPersona =
    Action.preferences.persona ??
    File.readJSON(userPresetsPath).personas[0].persona;

  // PRIORITIZE INPUT PERSONA
  var persona = dict.persona ?? defaultPersona;

  // alertWhenRunningInBackground('Title: ' + title);
  // alertWhenRunningInBackground('Argument: ' + argument);
  // alertWhenRunningInBackground('Persona: ' + persona);
  // return;

  // API CALL
  var result = HTTP.postJSON('https://api.openai.com/v1/chat/completions', {
    headerFields: {
      Authorization: 'Bearer ' + apiKey,
    },
    body: {
      model: model,
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: question },
      ],
    },
  });

  // File.writeJSON(result, Action.supportPath + '/test.json');
  // var result = File.readJSON(Action.supportPath + '/test.json');

  // ADDITIONAL INFO FOR STORING RECENT INFO IN THE NEXT STEP
  var presetTitle =
    dict.presetTitle ??
    Action.preferences.defaultPersonaTitle ??
    File.readJSON(userPresetsPath).personas[0].title; // default

  var icon = dict.icon; // might need fallback(s) to default

  processResult(result, argument, title, persona, icon, presetTitle);
}

function processResult(result, argument, title, persona, icon, presetTitle) {
  // ERROR HANDLING
  if (result.response == undefined) {
    alertWhenRunningInBackground(result.error);
    return;
  }

  if (result.response.status != 200) {
    if (result.data != undefined) {
      var data = JSON.parse(result.data);
      if (data.error != undefined) {
        var details = data.error.message;
      }
    }

    alertWhenRunningInBackground(
      result.response.status + ': ' + details ?? result.response.localizedStatus
    );
    return;
  }

  // PARSE RESULT JSON
  var data = JSON.parse(result.data);

  // COPY RESULT TO CLIPBOARD
  LaunchBar.setClipboardString(data.choices[0].message.content.trim());

  // CREATE TEXT FILE
  var answer = data.choices[0].message.content;

  var quotetArgument = [];
  argument.split('\n').forEach(function (item) {
    quotetArgument.push('> ' + item);
  });

  var text = quotetArgument.join('\n') + '\n\n' + answer;

  if (!File.exists(chatsFolder)) {
    File.createDirectory(chatsFolder);
  }

  const fileLocation = chatsFolder + title + '.md';

  if (File.exists(fileLocation)) {
    text = File.readText(fileLocation) + '\n\n' + text;
  }

  File.writeText(text, fileLocation);

  // STORE TIMESTAMP
  Action.preferences.recentTimeStamp = new Date().toISOString();

  // STORE USED PERSONA PROPERTIES
  // Preset prompts have an icon. They can also have a persona. The title is the prompt title not of the persona. But it does not really matter.

  Action.preferences.recent = {
    persona: persona,
    presetTitle: presetTitle,
    icon: icon,
    path: fileLocation,
  };

  // PLAY SOUND AND OPEN FILE
  var result = LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  var fileURL = File.fileURLForPath(fileLocation);
  LaunchBar.openURL(fileURL);
}

function prompts() {
  if (!File.exists(userPresetsPath)) {
    return;
  }

  const prompts = File.readJSON(userPresetsPath).prompts;
  var result = [];
  prompts.forEach(function (item) {
    result.push({
      title: item.title,
      subtitle: item.description,
      icon: item.icon,
      action: 'ask',
      actionArgument: {
        presetTitle: item.title,
        argument: item.argument,
        persona: item.persona,
        icon: item.icon,
        addClipboard: item.addClipboard,
        addURL: item.addURL,
        isPrompt: true,
      },
      actionRunsInBackground: true,
    });
  });
  return result;
}

function showPersonas(argument) {
  if (!File.exists(userPresetsPath)) {
    return;
  }

  const personas = File.readJSON(userPresetsPath).personas;

  var result = [];
  personas.forEach(function (item) {
    var pushData = {
      title: item.title,
      subtitle: item.description,
      icon: item.icon,
      action: 'setPersona',
      actionArgument: {
        persona: item.persona, // default persona
        title: item.title, // default persona title (for Settings)
        icon: item.icon, // default persona icon
      },
    };

    if (argument != undefined) {
      pushData.subtitle = 'Asks: ' + argument;
      pushData.action = 'options';
      pushData.actionArgument.argument = argument;
      pushData.actionArgument.title = undefined;
      pushData.actionArgument.presetTitle = item.title;
    }

    result.push(pushData);
  });
  return result;
}

function alertWhenRunningInBackground(alertMessage) {
  LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
  LaunchBar.alert(alertMessage);
  LaunchBar.hide();
}

// SETTING FUNCTIONS

function settings() {
  var model = Action.preferences.model ?? 'gpt-3.5-turbo';

  var defaultPersonaTitle =
    Action.preferences.defaultPersonaTitle ??
    File.readJSON(userPresetsPath).personas[0].title; // default

  return [
    {
      title: 'Choose default persona',
      icon: Action.preferences.defaultPersonaIcon ?? 'weasel',
      badge: defaultPersonaTitle,
      children: showPersonas(),
    },
    {
      title: 'Choose model',
      icon: 'gearTemplate',
      badge: model,
      // action: 'models',
      children: models(),
    },
    {
      title: 'Set API key',
      icon: 'keyTemplate',
      action: 'setApiKey',
    },
    {
      title: 'Customize personas & prompts',
      icon: 'codeTemplate',
      action: 'editPresets',
    },
    {
      title: 'Update personas & prompts',
      icon: 'updateTemplate',
      action: 'updatePresets',
    },
    {
      title: 'Reset personas & prompts',
      icon: 'sparkleTemplate',
      action: 'resetPresets',
    },
  ];
}

function setPersona(dict) {
  Action.preferences.defaultPersona = dict.persona;
  Action.preferences.defaultPersonaTitle = dict.title;
  Action.preferences.defaultPersonaIcon = dict.icon;
  return settings();
}

function models() {
  var model = Action.preferences.model;
  var v3 = 'gpt-3.5-turbo';
  var v4 = 'gpt-4';

  if (model == v3 || model == undefined) {
    var icon3 = 'checkTemplate.png';
    var icon4 = 'circleTemplate.png';
  } else if (model == v4) {
    var icon3 = 'circleTemplate.png';
    var icon4 = 'checkTemplate.png';
  }

  return [
    {
      title: v3,
      icon: icon3,
      action: 'setModel',
      actionArgument: v3,
    },
    {
      title: v4,
      icon: icon4,
      action: 'setModel',
      actionArgument: v4,
    },
  ];
}

function setModel(arg) {
  Action.preferences.model = arg;
  return settings();
}

function editPresets() {
  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(userPresetsPath));
}

function isNewerVersion(lastUsedActionVersion, currentActionVersion) {
  const lastUsedParts = lastUsedActionVersion.split('.');
  const currentParts = currentActionVersion.split('.');
  for (var i = 0; i < currentParts.length; i++) {
    const a = ~~currentParts[i]; // parse int
    const b = ~~lastUsedParts[i]; // parse int
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

function comparePresets() {
  if (!File.exists(userPresetsPath)) {
    return;
  }

  var userPresets = File.readJSON(userPresetsPath);

  var allUserPresets = userPresets.prompts.concat(userPresets.personas);

  var allUserPresetTitles = [];

  allUserPresets.forEach(function (item) {
    allUserPresetTitles.push(item.title);
  });

  var allPresets = presets.prompts.concat(presets.personas);

  var newPresetTitles = [];

  allPresets.forEach(function (item) {
    if (!allUserPresetTitles.includes(item.title)) {
      newPresetTitles.push(item.title);
    }
  });

  if (newPresetTitles.length > 0) {
    return newPresetTitles.join('\n');
  }
}

function updatePresets() {
  if (!File.exists(userPresetsPath)) {
    return;
  }

  var personaCount = 0;
  var promptCount = 0;

  var userPresets = File.readJSON(userPresetsPath);
  var userPrompts = userPresets.prompts;

  var userPromptTitles = [];
  userPrompts.forEach(function (item) {
    userPromptTitles.push(item.title);
  });

  presets.prompts.forEach(function (item) {
    if (!userPromptTitles.includes(item.title)) {
      userPresets.prompts.push(item);
      promptCount++;
    }
  });

  var userPersonas = userPresets.personas;

  var userPersonaTitles = [];
  userPersonas.forEach(function (item) {
    userPersonaTitles.push(item.title);
  });

  presets.personas.forEach(function (item) {
    if (!userPersonaTitles.includes(item.title)) {
      userPresets.personas.push(item);
      personaCount++;
    }
  });

  File.writeJSON(userPresets, userPresetsPath);

  LaunchBar.displayNotification({
    title: 'Done!',
    string: personaCount + ' new personas. ' + promptCount + ' new prompts.',
  });

  return settings();
}

function resetPresets() {
  File.writeJSON(presets, userPresetsPath);
  return settings();
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API key required',
    '1) Press »Open OpenAI.com« to create an API key.\n2) Press »Set API key«',
    'Open OpenAI.com',
    'Set API key',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://platform.openai.com/account/api-keys');
      LaunchBar.hide();
      break;
    case 1:
      var clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length == 51) {
        // TODO: Better API key test

        // Write new API key in Action preferences
        Action.preferences.apiKey = clipboardContent;

        LaunchBar.alert(
          'Success!',
          'API key set to: ' + Action.preferences.apiKey
        );
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API key',
          'Make sure the API key is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}
