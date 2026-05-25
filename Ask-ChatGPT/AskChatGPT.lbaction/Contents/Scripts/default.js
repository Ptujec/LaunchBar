/*
ChaptGPT Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-05-21

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
- https://developers.openai.com/api/reference/resources/responses/methods/create

  Migration:
    - https://developers.openai.com/api/docs/guides/migrate-to-responses?update-item-definitions=responses#migrating-from-chat-completions
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
  const newChatIcon = item.icon
    ? item.icon
    : defaultPreset?.icon && defaultPreset?.icon !== 'weasel'
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

  const continueChatItem = recentChatInfo
    ? {
        title: `${'Continue'.localize()}: ${recentChatInfo.title}`,
        subtitle: `Prompt: ${argument}`,
        alwaysShowsSubtitle: true,
        icon: 'weasel_watch',
        action: 'ask',
        actionArgument: {
          argument,
          addRecent: true,
          recentPath: recentChatInfo.filePath,
          recentFileTitle: recentChatInfo.title,
        },
        actionRunsInBackground: true,
      }
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

  // ADD CLIPBOARD CONTENT
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

  // API OPTIONS BASED ON CHAT EXISTENCE OF PREVIOUS RESPONSE ID
  const model = item.model ?? Action.preferences.model ?? recommendedModel;
  const recentPath = item.recentPath;

  let chatResponseProperties = {};
  let previousResponseId, systemPrompt, effort, presetId;

  if (item.addRecent) {
    if (!File.exists(recentPath)) return;

    const chatFileId = extractChatFileId(recentPath);
    if (!chatFileId) return;

    previousResponseId =
      Action.preferences.chatMetadata?.[chatFileId]?.previousResponseId;

    // NOTE: We could handle this gracefully by adding the existing text to the prompt … but I don't think it's worth the complexity
    if (!previousResponseId) {
      LaunchBar.alert(
        'No previous response found',
        'The responses API implementation requires a previous response ID',
      ); // TODO: localize
      return;
    }

    chatResponseProperties = {
      content: {
        type: 'string',
        description: 'Main response',
      },
    };
  } else {
    const defaultPreset = getDefaultPreset();
    presetId = item.presetId ?? defaultPreset?.id;
    systemPrompt =
      getPresetById(presetId)?.systemPrompt ?? defaultPreset?.systemPrompt;

    chatResponseProperties = {
      title: {
        type: 'string',
        description: 'Short, meaningful title for the chat',
      },
      content: {
        type: 'string',
        description: 'Main response',
      },
    };

    effort = supportsReasoningEffort(model)
      ? getReasoningEffort(model)
      : undefined;
  }

  LaunchBar.log(
    'effort: ' + effort,
    'presetId: ' + presetId,
    'systemPrompt: ' + systemPrompt,
    'previousResponseId: ' + previousResponseId,
  );

  // API CALL
  const result = HTTP.postJSON('https://api.openai.com/v1/responses', {
    headerFields: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      instructions: systemPrompt,
      input: argument,
      previous_response_id: previousResponseId,
      reasoning: effort ? { effort } : undefined,
      text: {
        format: {
          name: 'chat_response',
          schema: {
            type: 'object',
            properties: chatResponseProperties,
            required: Object.keys(chatResponseProperties),
            additionalProperties: false,
          },
          type: 'json_schema',
          strict: true,
        },
      },
    },
  });

  // File.writeJSON(result, Action.supportPath + '/test.json');
  // File.writeJSON(
  //   JSON.parse(result.data),
  //   Action.supportPath + '/testData.json',
  // );

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
  const text = JSON.parse(data.output[0].content[0].text);
  const answer = text.content;
  const title = text.title;
  const chatId = data.id;

  // PLAY CONFIRMATION SOUND
  const chatFileId = LaunchBar.execute('/bin/bash', './soundAndUuid.sh').trim();

  // COPY RESULT TO CLIPBOARD
  LaunchBar.setClipboardString(answer);

  // CREATE/OPEN CHAT TEXT FILE
  const fileLocation = recentPath || `${chatsFolder}${title}_${chatFileId}.md`;

  saveChatAndOpen(argument, fileLocation, answer, chatId);

  // LOG TOKEN USAGE
  logTokenUsage(data, model, presetId, fileLocation);
}

function saveChatAndOpen(argument, fileLocation, answer, chatId) {
  if (!File.exists(chatsFolder)) File.createDirectory(chatsFolder);

  const quotedArgument = argument
    .split('\n')
    .map((item) => `> ${item}`)
    .join('\n');

  let text = `${quotedArgument}\n\n---\n\n${answer}`;

  if (File.exists(fileLocation)) {
    text = `${File.readText(fileLocation)}\n\n---\n\n${text}`;
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
  const chatFileId = extractChatFileId(fileLocation);

  if (chatFileId) {
    if (!Action.preferences.chatMetadata) Action.preferences.chatMetadata = {};

    Action.preferences.chatMetadata[chatFileId] = {
      previousResponseId: chatId,
    };
  }
}

function showSystemPrompts(argument) {
  if (!File.exists(userPresetsPath)) return;

  const systemPrompts = File.readJSON(userPresetsPath).systemPrompts;

  if (!systemPrompts) {
    return {
      title: 'No system prompts found',
      alwaysShowsSubtitle: true,
    };
  }

  const defaultSystemPrompt = getDefaultPreset().id;

  return systemPrompts.map((item) => {
    const baseData = {
      title: item.title.localize(),
      subtitle: argument ? `Prompt: ${argument}` : item.description.localize(),
      alwaysShowsSubtitle: true,
      icon: item.icon,
      badge: item.id === defaultSystemPrompt ? 'Default'.localize() : undefined,
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
    const fileTitle = titleCleanup(item);
    const chatFileId = extractChatFileId(filePath);
    const previousResponseId =
      Action.preferences.chatMetadata?.[chatFileId]?.previousResponseId;

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
      badge: previousResponseId ? undefined : 'View Only'.localize(),
      path: filePath,
      action: 'handleChatFileAction',
      actionArgument: {
        filePath,
        fileTitle,
      },
      actionRunsInBackground: true,
    };
  });
}

function handleChatFileAction({ filePath, fileTitle }) {
  LaunchBar.hide();

  // RETRIEVE STORED METADATA FOR THIS CHAT
  const chatFileId = extractChatFileId(filePath);
  const previousResponseId =
    Action.preferences.chatMetadata?.[chatFileId]?.previousResponseId;

  if (LaunchBar.options.commandKey) {
    // LaunchBar.openURL(File.fileURLForPath(filePath));
    LaunchBar.execute('/usr/bin/open', '-R', filePath);
    return;
  }

  if (!previousResponseId || LaunchBar.options.alternateKey) {
    LaunchBar.openURL(File.fileURLForPath(filePath));
    return;
  }

  // Enter Prompt
  const argument = LaunchBar.executeAppleScript(
    `
    set result to display dialog "${'Enter a follow up prompt for'.localize()}:\n\\"${fileTitle}\\"" with title "Ask ChatGPT" default answer ""
    set result to text returned of result
    `,
  ).trim();

  if (argument === '') return;

  const item = {
    argument,
    addRecent: true,
    recentPath: filePath,
    recentTitle: fileTitle,
  };

  ask(item);
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
