/*
ChaptGPT Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-05-21

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
*/

String.prototype.localizationTable = 'default';

include('global.js');

const recommendedModel = 'gpt-5.4-mini';
const apiKey = Action.preferences.apiKey;
const chatsFolder = `${Action.supportPath}/chats/`;
const presets = File.readJSON(`${Action.path}/Contents/Resources/presets.json`);
const userPresetsPath = `${Action.supportPath}/userPresets.json`;
const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '4.0';
const logPath = `${Action.supportPath}/askchatgpt-usage.log`;

function run(argument) {
  if (!File.exists(userPresetsPath)) {
    File.writeJSON(presets, userPresetsPath);
  } else {
    try {
      File.readJSON(userPresetsPath);
    } catch (error) {
      const response = LaunchBar.alert(
        error,
        'You can either start fresh or try to fix your custom presets JSON code.'.localize(),
        'Start fresh'.localize(),
        'Edit presets'.localize(),
        'Cancel'.localize(),
      );
      if (response === 0) File.writeJSON(presets, userPresetsPath);
      else if (response === 1) editPresets();
      return;
    }
  }

  if (!apiKey) return setApiKey();

  // run cleanup here

  if (isNewerVersion(lastUsedActionVersion, currentActionVersion)) {
    // Migrate presets to add ids if upgrading from version below 4.0
    if (isVersionBelow(lastUsedActionVersion, '4.0')) {
      migrateUserPresets();
      migratePresetsWithIds();
    }

    const newPresetsList = comparePresets();
    if (newPresetsList) {
      const response = LaunchBar.alert(
        'Update presets?',
        `The following presets are new or missing in your user presets:\n${newPresetsList}\nWould you like to add them to your user presets?`,
        'Ok',
        'Cancel',
      );
      if (response === 0) updatePresets();
    }
    Action.preferences.lastUsedActionVersion = Action.version;
  }

  cleanupOrphanedChatMetadata();

  if (LaunchBar.options.alternateKey) return settings();

  if (!argument) return showChats();

  if (LaunchBar.options.commandKey) return showSystemPrompts(argument);

  return options({ argument });
}

function options(item) {
  const { argument, systemPrompt, presetId } = item;

  const defaultPreset = getDefaultPreset();
  const newChatIcon =
    defaultPreset?.icon && defaultPreset?.icon !== 'weasel'
      ? defaultPreset?.icon
      : 'weasel_blank';

  const newChatItem = {
    title: 'New Chat'.localize(),
    subtitle: `Prompt: ${argument}`,
    alwaysShowsSubtitle: true,
    icon: newChatIcon,
    action: 'ask',
    actionArgument: { argument },
    actionRunsInBackground: true,
  };

  const recentChatInfo = getMostRecentChatInfo();
  const hasRecentChat =
    recentChatInfo?.filePath && File.exists(recentChatInfo.filePath);

  const continueChatItem = hasRecentChat
    ? (() => {
        const recentFileTitle = titleCleanup(
          File.displayName(recentChatInfo.filePath),
        );

        return {
          title: `${'Continue'.localize()}: ${recentFileTitle}`,
          subtitle: `Prompt: ${argument}`,
          alwaysShowsSubtitle: true,
          icon: 'weasel_watch',
          action: 'ask',
          actionArgument: {
            argument,
            addRecent: true,
            presetId: recentChatInfo.presetId,
            recentPath: recentChatInfo.filePath,
            recentFileTitle,
          },
          actionRunsInBackground: true,
        };
      })()
    : undefined;

  const clipboardItem = {
    title: 'Add Clipboard'.localize(),
    subtitle: `Prompt: ${argument}`,
    alwaysShowsSubtitle: true,
    action: 'ask',
    icon: 'weasel_clipboard',
    actionArgument: {
      argument: `${argument}\n`,
      addClipboard: true,
    },
    actionRunsInBackground: true,
  };

  const baseItems = [
    newChatItem,
    ...(continueChatItem ? [continueChatItem] : []),
    clipboardItem,
  ];

  // Check if need to reverse order (recent edited less than 5 minutes ago)
  const shouldReverse =
    hasRecentChat &&
    recentChatInfo?.lastEdited &&
    (new Date() - new Date(recentChatInfo.lastEdited)) / 60000 < 5;
  const items = shouldReverse
    ? [baseItems[1], baseItems[0], ...baseItems.slice(2)]
    : baseItems;

  // Add badge and systemPrompt to all items if provided
  if (!systemPrompt) return items;

  const presetTitle = getPresetById(presetId)?.title;

  return items.map((item) => ({
    ...item,
    badge: presetTitle,
    actionArgument: {
      ...item.actionArgument,
      systemPrompt,
      presetId,
    },
  }));
}

function ask(item) {
  let argument = item.argument.trim();
  let recentPath;
  let presetId = item.presetId ?? getDefaultPreset()?.id;

  // ITEMS WITH CLIPBOARD CONTENT
  if (item.addClipboard) {
    const clipboard = LaunchBar.getClipboardString().trim();
    const displayClipboard =
      clipboard.length > 500 ? clipboard.substring(0, 500) + '…' : clipboard;

    const response = LaunchBar.alert(
      argument.trim(),
      `"${displayClipboard}"`,
      'Ok',
      'Cancel',
    );

    if (response !== 0) return;

    argument += `\n\n${clipboard}`;
  }

  LaunchBar.hide();

  // CONTINUE PREVIOUS CHAT
  let prompt = argument;
  let chatResponseProperties = {};

  if (item.addRecent) {
    recentPath = item.recentPath;
    if (!File.exists(recentPath)) return;

    const text = File.readText(recentPath).replace(/^> /gm, '');
    prompt = `${text}...${argument}\n`;
    chatResponseProperties = {
      content: {
        type: 'string',
        description: 'Main assistant response',
      },
    };
  } else {
    chatResponseProperties = {
      title: {
        type: 'string',
        description: 'Short, meaningful title for the chat',
      },
      content: {
        type: 'string',
        description: 'Main assistant response',
      },
    };
  }

  // MODEL
  const model = Action.preferences.model ?? recommendedModel;

  // SYSTEM PROMPT
  const defaultPreset = getDefaultPreset();
  let systemPrompt = defaultPreset.systemPrompt;

  if (item.addRecent) {
    const chatId = extractChatId(item.recentPath);
    const chatMetadata = Action.preferences.chatMetadata?.[chatId];
    const recentPresetId = chatMetadata?.presetId ?? presetId;
    const recentPreset = getPresetById(recentPresetId) ?? defaultPreset;

    systemPrompt = recentPreset.systemPrompt;
    presetId = recentPreset.id;
  }

  // API CALL
  const result = HTTP.postJSON('https://api.openai.com/v1/chat/completions', {
    headerFields: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      messages: [
        { role: 'developer', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'chat_response',
          schema: {
            type: 'object',
            properties: chatResponseProperties,
            required: Object.keys(chatResponseProperties),
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
  });

  // File.writeJSON(result, Action.supportPath + '/test.json');
  // const result = File.readJSON(Action.supportPath + '/test.json');

  processResult(result, argument, presetId, recentPath, model);
}

function processResult(result, argument, presetId, recentPath, model) {
  // Error handling
  if (!result.response) {
    LaunchBar.alert(result.error);
    return;
  }

  if (result.response.status !== 200) {
    let details = result.response.localizedStatus;
    if (result.data) {
      const data = JSON.parse(result.data);
      if (data.error?.message) details = data.error.message;
    }

    LaunchBar.alert(`${result.response.status}: ${details}`);
    return;
  }

  // PARSE RESULT
  const data = JSON.parse(result.data);
  const content = JSON.parse(data.choices[0].message.content);
  const answer = content.content;
  const title = content.title;

  // PLAY CONFIRMATION SOUND
  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf',
  );

  // COPY RESULT TO CLIPBOARD
  LaunchBar.setClipboardString(answer);

  // CREATE/OPEN CHAT TEXT FILE
  const uuid = LaunchBar.execute('/usr/bin/uuidgen').trim();
  const fileLocation = recentPath || `${chatsFolder}${title}_${uuid}.md`;

  saveChatAndOpen(argument, fileLocation, answer, presetId);

  // LOG TOKEN USAGE
  logTokenUsage(data, model, presetId, fileLocation);
}

function saveChatAndOpen(argument, fileLocation, answer, presetId) {
  if (!File.exists(chatsFolder)) File.createDirectory(chatsFolder);

  const quotedArgument = argument
    .split('\n')
    .map((item) => `> ${item}`)
    .join('\n');

  let text = `${quotedArgument}\n\n---\n\n${answer}`;

  if (File.exists(fileLocation)) {
    text = File.readText(fileLocation) + '\n\n---\n\n' + text;
  }

  File.writeText(text, fileLocation);

  // Open File
  const fileURL = File.fileURLForPath(fileLocation);
  LaunchBar.openURL(fileURL, Action.preferences.editor?.appID);

  // TODO: needs to language independent

  // if (Action.preferences.editor?.appID === 'pro.writer.mac') {
  //   LaunchBar.executeAppleScript(
  //     `
  //     tell application "iA Writer" to activate
  //     tell application "System Events"
  //       try
  //         click menu item "Modern (Sans)" of menu "Vorlage" of menu item "Vorlage" of menu "Darstellung" of menu bar item "Darstellung" of menu bar 1 of application process "iA Writer" of application "System Events"
  //         click menu item "Vorschau anzeigen" of menu "Darstellung" of menu bar item "Darstellung" of menu bar 1 of application process "iA Writer" of application "System Events"
  //       end try
  //     end tell
  //     `,
  //   );
  // }

  // STORE CHAT METADATA
  const chatId = extractChatId(fileLocation);

  if (chatId) {
    if (!Action.preferences.chatMetadata) Action.preferences.chatMetadata = {};

    Action.preferences.chatMetadata[chatId] = {
      presetId,
      lastEdited: new Date().toISOString(),
    };
  }
}

function showSystemPrompts(argument) {
  if (!File.exists(userPresetsPath)) return;

  const systemPrompts = File.readJSON(userPresetsPath).systemPrompts;

  if (!systemPrompts)
    return {
      title: 'No system prompts found',
      alwaysShowsSubtitle: true,
    };

  return systemPrompts.map((item) => {
    const baseData = {
      title: item.title.localize(),
      subtitle: argument ? `Prompt: ${argument}` : item.description.localize(),
      alwaysShowsSubtitle: true,
      icon: item.icon,
    };

    if (argument) {
      return {
        ...baseData,
        action: 'options',
        actionArgument: {
          argument,
          presetId: item.id,
          systemPrompt: item.systemPrompt,
          icon: item.icon,
        },
      };
    }

    return {
      ...baseData,
      action: 'setSystemPrompt',
      actionArgument: item.id,
    };
  });
}

function showChats() {
  // DISPLAY RECENT CHATS
  if (!File.exists(chatsFolder)) {
    LaunchBar.alert(
      'No folder with chats found!'.localize(),
      'Press space to enter a prompt.'.localize(),
    );
    return;
  }

  const chatFiles = LaunchBar.execute('/bin/ls', '-t', chatsFolder)
    .trim()
    .split('\n');

  if (chatFiles[0] === '') {
    LaunchBar.alert(
      'No chats found!'.localize(),
      'Press space to enter a prompt.'.localize(),
    );
    return;
  }

  return chatFiles.map((item) => {
    const filePath = `${chatsFolder}${item}`;
    const fileTitle = titleCleanup(File.displayName(filePath));

    const dateString = LaunchBar.formatDate(
      new Date(File.modificationDate(filePath)),
      {
        relativeDateFormatting: true,
        timeStyle: 'short',
        dateStyle: 'short',
      },
    );

    return {
      title: fileTitle,
      subtitle: dateString,
      alwaysShowsSubtitle: true,
      icon: 'weasel_paper',
      path: filePath,
      action: 'chatOptions',
      actionArgument: {
        filePath,
        fileTitle,
      },
      actionRunsInBackground: true,
    };
  });
}

function chatOptions({ filePath, fileTitle }) {
  LaunchBar.hide();

  if (LaunchBar.options.commandKey) {
    // LaunchBar.openURL(File.fileURLForPath(filePath));
    LaunchBar.execute('/usr/bin/open', '-R', filePath);
    return;
  }

  // Enter Prompt
  const prompt = LaunchBar.executeAppleScript(
    `
    set result to display dialog "${'Enter a follow up prompt for'.localize()}:\n\\"${fileTitle.trim()}\\"" with title "Ask ChatGPT" default answer ""
    set result to text returned of result
    `,
  ).trim();

  if (prompt === '') return;

  // RETRIEVE STORED METADATA FOR THIS CHAT
  const chatId = extractChatId(filePath);
  const chatMetadata = Action.preferences.chatMetadata?.[chatId];

  const item = {
    argument: prompt,
    addRecent: true,
    recentPath: filePath,
    presetId: chatMetadata?.presetId,
  };

  ask(item);

  // TODO: Ask with attached file content … make sure we save to the correct file location …  maybe in the future we can also store things like the original system prompt etc. … but needs different structure
}

function showModels() {
  const currentModel = Action.preferences.model || recommendedModel;

  const result = HTTP.getJSON('https://api.openai.com/v1/models', {
    headerFields: {
      Authorization: `Bearer ${Action.preferences.apiKey}`,
    },
  });

  if (result.response.status !== 200) {
    return LaunchBar.alert(
      `Error ${result.response.status}`,
      result.response.localizedStatus,
    );
  }

  return result.data.data
    .filter(filterModels)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => ({
      title: item.id,
      icon:
        currentModel === item.id ? 'checkTemplate.png' : 'circleTemplate.png',
      action: 'setModel',
      actionArgument: item.id,
      badge:
        item.id === recommendedModel ? 'Recommended'.localize() : undefined,
    }));
}
