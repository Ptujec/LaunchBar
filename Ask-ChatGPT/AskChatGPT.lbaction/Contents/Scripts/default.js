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
const userPresets = Action.supportPath + '/userPresets.json';

function run(argument) {
  // ON FIRST RUN COPY PRESETS TO ACTION SUPPORT
  if (!File.exists(userPresets)) {
    File.writeJSON(presets, userPresets);
  } else {
    // CHECK IF LB CAN READ THE CUSTOM JSON
    try {
      let test = File.readJSON(userPresets);
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
          File.writeJSON(presets, userPresets);
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
      var path = chatsFolder + '/' + item;
      var title = File.displayName(path).replace(/\.md$/, ''),
        pushData = {
          title: title,
          subtitle: '',
          path: chatsFolder + '/' + item,
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
  var argument = dict.argument;

  var personaIcon = Action.preferences.personaIcon ?? 'weasel';

  var result = [
    {
      title: 'New Chat',
      subtitle: 'Asks: ' + argument,
      icon: personaIcon,
      action: 'ask',
      actionArgument: {
        argument: argument,
      },
      actionRunsInBackground: true,
    },
  ];

  // GET MOST RECENT CHAT
  var chatsExist = false;
  if (File.exists(chatsFolder)) {
    var chatFiles = LaunchBar.execute('/bin/ls', '-t', chatsFolder)
      .trim()
      .split('\n');

    if (chatFiles != '') {
      chatsExist = true;
    }
  }
  if (chatsExist == true) {
    var recentPath = chatsFolder + '/' + chatFiles[0];
    var title = File.displayName(recentPath).replace(/\.md$/, '');

    var pushData = {
      title: 'Continue: ' + title,
      subtitle: 'Asks: ' + argument,
      icon: personaIcon,
      action: 'ask',
      actionArgument: {
        argument: argument,
        addRecent: true,
        recentPath: recentPath,
        recentTitle: title,
      },
      actionRunsInBackground: true,
    };

    // PERSONA ADJUSTMENTS FOR CONTINUE RECENT CHAT ITEM
    var recentPersona = Action.preferences.recentPersona;
    if (
      recentPersona != undefined &&
      recentPersona.title != Action.preferences.personaTitle
    ) {
      pushData.actionArgument.persona = recentPersona.persona;
      pushData.icon = recentPersona.icon;
      pushData.badge = recentPersona.title;
    }

    result.push(pushData);

    // Reverse order if recent was created less than five minutes ago
    const timeDifference = (new Date() - new Date(recentTimeStamp)) / 60000;
    if (timeDifference < 10) {
      result.reverse();
    }
  }

  if (dict.persona != undefined) {
    result.forEach(function (item) {
      item.actionArgument.persona = dict.persona;
      item.icon = dict.icon; // persona icon
      item.badge = dict.title; // persona title
    });
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
      },
      actionRunsInBackground: true,
    }
  );

  if (dict.persona != undefined) {
    result.forEach(function (item) {
      item.actionArgument.persona = dict.persona;
      item.badge = dict.title; // persona title
    });
  }

  return result;
}

function ask(dict) {
  Action.preferences.presetPrompt = dict.presetPrompt; // Needed for logic what persona to use and what icon to display for continue option the next time

  var argument = dict.argument.trim();
  var title = dict.title ?? argument;

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

    var title = dict.recentTitle;
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
    File.readJSON(userPresets).personas[0].persona;

  // PRIORITIZE INPUT PERSONA
  var persona = dict.persona ?? defaultPersona;

  // LaunchBar.alert(title);
  // LaunchBar.alert(argument);
  // LaunchBar.alert(persona);
  // return;

  // API CALL
  LaunchBar.hide();
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

  processResult(result, argument, title, persona);
}

function processResult(result, argument, title, persona) {
  // ERROR HANDLING
  if (result.response == undefined) {
    LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
    LaunchBar.alert(result.error);
    return;
  }

  if (result.response.status != 200) {
    LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');

    if (result.data != undefined) {
      var data = JSON.parse(result.data);
      if (data.error != undefined) {
        var details = data.error.message;
      }
    }

    LaunchBar.alert(
      result.response.status + ': ' + details ?? result.response.localizedStatus
    );
    return;
  }

  // STORE USED PERSONA PROPERTIES
  // Preset prompts have an icon. They can also have a persona. The title is the prompt title not of the persona. But it does not really matter.

  var recentPersona = {};

  if (Action.preferences.presetPrompt) {
    var presetData = File.readJSON(userPresets).prompts;
  } else {
    var presetData = File.readJSON(userPresets).personas;
  }

  presetData.forEach(function (item) {
    if (item.persona == persona) {
      recentPersona = {
        persona: item.persona,
        title: item.title,
        icon: item.icon,
      };
    }
  });

  Action.preferences.recentPersona = recentPersona;

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

  const fileLocation = chatsFolder + '/' + title + '.md';

  if (File.exists(fileLocation)) {
    text = File.readText(fileLocation) + '\n\n' + text;
  }

  File.writeText(text, fileLocation);

  Action.preferences.recentTimeStamp = new Date().toISOString();

  var fileURL = File.fileURLForPath(fileLocation);

  var result = LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.openURL(fileURL);
}

function prompts() {
  if (!File.exists(userPresets)) {
    return;
  }

  const prompts = File.readJSON(userPresets).prompts;
  var result = [];
  prompts.forEach(function (item) {
    result.push({
      title: item.title,
      subtitle: item.description,
      icon: item.icon,
      action: 'ask',
      actionArgument: {
        title: item.title,
        argument: item.argument,
        persona: item.persona,
        icon: item.icon,
        addURL: item.addURL,
        addClipboard: item.addClipboard,
        presetPrompt: true,
      },
      actionRunsInBackground: true,
    });
  });
  return result;
}

function showPersonas(argument) {
  if (!File.exists(userPresets)) {
    return;
  }

  const personas = File.readJSON(userPresets).personas;

  var result = [];
  personas.forEach(function (item) {
    var pushData = {
      title: item.title,
      subtitle: item.description,
      icon: item.icon,
      action: 'setPersona',
      actionArgument: {
        persona: item.persona,
        title: item.title,
        icon: item.icon,
      },
    };

    if (argument != undefined) {
      pushData.subtitle = 'Asks: ' + argument;
      pushData.action = 'options';
      pushData.actionArgument.argument = argument;
    }

    result.push(pushData);
  });
  return result;
}

// SETTING FUNCTIONS

function settings() {
  var model = Action.preferences.model ?? 'gpt-3.5-turbo';

  var personaTitle =
    Action.preferences.personaTitle ??
    File.readJSON(Action.path + '/Contents/Resources/presets.json').personas[0]
      .title;

  var personaIcon = Action.preferences.personaIcon ?? 'weasel';

  return [
    {
      title: 'Choose default persona',
      icon: personaIcon,
      badge: personaTitle,
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
  ];
}

function setPersona(dict) {
  Action.preferences.persona = dict.persona;
  Action.preferences.personaTitle = dict.title;
  Action.preferences.personaIcon = dict.icon;
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
  LaunchBar.openURL(File.fileURLForPath(userPresets));
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
