/*
ChaptGPT Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developers.openai.com/api/docs
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http

TODO:
- refactor … consistant naming structure
*/

String.prototype.localizationTable = 'default';

include('global.js');

const recommendedModel = 'gpt-5.4-mini';
const apiKey = Action.preferences.apiKey;
const chatsFolder = `${Action.supportPath}/chats/`;
const presets = File.readJSON(`${Action.path}/Contents/Resources/presets.json`);
const userPresetsPath = `${Action.supportPath}/userPresets.json`;
const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '2.0';

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
  const { argument, systemPrompt, presetTitle } = item;

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
            presetTitle: recentChatInfo.presetTitle,
            addRecent: true,
            recentPath: recentChatInfo.filePath,
            recentFileTitle,
            systemPrompt: recentChatInfo.systemPrompt,
            isPrompt: recentChatInfo.isPrompt,
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
      icon: 'weasel_clipboard',
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

  return items.map((item) => ({
    ...item,
    badge: presetTitle,
    actionArgument: {
      ...item.actionArgument,
      systemPrompt,
      presetTitle,
    },
  }));
}

function ask(item) {
  let argument = item.argument.trim();
  let title = item.isPrompt ? (item.presetTitle ?? argument) : argument;
  let recentPath;

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

    title = `${title} - ${clipboard}`;
    argument += `\n\n${clipboard}`;
  }

  LaunchBar.hide();

  // ITEMS WITH URL
  let prompt = argument;
  let chatResponseProperties = {};

  // INCLUDE PREVIOUS CHAT HISTORY
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
  const defaultSystemPrompt = defaultPreset.systemPrompt;

  // For continuing chats, try to get systemPrompt from chatMetadata if not provided
  let systemPrompt = item.systemPrompt ?? defaultSystemPrompt;
  if (item.addRecent && !item.systemPrompt) {
    const chatId = extractChatId(item.recentPath);
    const chatMetadata = Action.preferences.chatMetadata?.[chatId];
    if (chatMetadata?.systemPrompt) {
      systemPrompt = chatMetadata.systemPrompt;
    }
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

  const defaultPresetForTitle = getDefaultPreset();
  const presetTitle = item.presetTitle ?? defaultPresetForTitle.title;

  processResult(
    result,
    argument,
    systemPrompt,
    item.icon,
    presetTitle,
    item.isPrompt,
    recentPath,
  );
}

function processResult(
  result,
  argument,
  systemPrompt,
  icon,
  presetTitle,
  isPrompt,
  recentPath,
) {
  // Error handling
  if (!result.response) {
    alertWhenRunningInBackground(result.error);
    return;
  }

  if (result.response.status !== 200) {
    let details = result.response.localizedStatus;
    if (result.data) {
      const data = JSON.parse(result.data);
      if (data.error?.message) details = data.error.message;
    }

    alertWhenRunningInBackground(`${result.response.status}: ${details}`);
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
  const originalClipboard = LaunchBar.getClipboardString();
  LaunchBar.setClipboardString(answer);

  // CREATE/OPEN CHAT TEXT FILE
  const uuid = LaunchBar.execute('/usr/bin/uuidgen').trim();
  const fileLocation = recentPath || `${chatsFolder}${title}_${uuid}.md`;

  const recentChat = {
    systemPrompt,
    presetTitle,
    icon,
    path: fileLocation,
    isPrompt,
  };

  openChatTextFile(
    argument,
    fileLocation,
    answer,
    {
      systemPrompt,
      presetTitle,
      icon,
      isPrompt,
    },
    recentPath,
  );
}

function openChatTextFile(
  argument,
  fileLocation,
  answer,
  chatInfo,
  recentPath,
) {
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
  // Only store metadata if chatId is a valid UUID (not for old files without UIDs)
  if (chatId && isValidUuid(chatId)) {
    if (!Action.preferences.chatMetadata) {
      Action.preferences.chatMetadata = {};
    }
    Action.preferences.chatMetadata[chatId] = {
      presetId: getPresetIdByTitle(chatInfo.presetTitle),
      presetTitle: chatInfo.presetTitle,
      systemPrompt: chatInfo.systemPrompt,
      icon: chatInfo.icon,
      isPrompt: chatInfo.isPrompt,
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
          presetTitle: item.title,
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

function alertWhenRunningInBackground(alertMessage) {
  LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
  LaunchBar.alert(alertMessage);
  LaunchBar.hide();
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
    recentFileTitle: fileTitle,
    presetTitle: chatMetadata?.presetTitle,
    systemPrompt: chatMetadata?.systemPrompt,
    icon: chatMetadata?.icon,
    isPrompt: chatMetadata?.isPrompt,
  };

  ask(item);

  // TODO: Ask with attached file content … make sure we save to the correct file location …  maybe in the future we can also store things like the original system prompt etc. … but needs different structure
}

function titleCleanup(title) {
  title = title.replace(/\.md$/, '').trim();
  if (title.includes('_')) {
    // Format: {title}_{uuid}
    // Remove the UUID at the end (everything after the last underscore)
    return title.substring(0, title.lastIndexOf('_'));
  }
  return title;
}

function extractChatId(fileLocation) {
  const fileName = File.displayName(fileLocation);
  // Chat file format: {title}_{uuid}.md
  const withoutExtension = fileName.replace(/\.md$/, '');
  const parts = withoutExtension.split('_');
  // UUID is at the end, so we take the last part if it's a valid UUID
  const potentialUuid = parts[parts.length - 1];
  return isValidUuid(potentialUuid) ? potentialUuid : undefined;
}

function getPresetIdByTitle(presetTitle) {
  if (!presetTitle) return undefined;
  const userPresets = File.readJSON(userPresetsPath);
  const preset = userPresets.systemPrompts?.find(
    (p) => p.title === presetTitle,
  );
  return preset?.id;
}

function getMostRecentChatInfo() {
  // Get the most recent chat file from the filesystem
  if (!File.exists(chatsFolder)) return undefined;

  const chatFiles = LaunchBar.execute('/bin/ls', '-t', chatsFolder)
    .trim()
    .split('\n');

  if (!chatFiles[0] || chatFiles[0] === '') return undefined;

  const mostRecentFile = chatFiles[0];
  const filePath = `${chatsFolder}${mostRecentFile}`;
  const chatId = extractChatId(filePath);

  // Get metadata from chatMetadata, with createdAt as fallback timestamp
  const chatMetadata = Action.preferences.chatMetadata?.[chatId];
  if (!chatMetadata) return undefined;

  return {
    filePath,
    ...chatMetadata,
  };
}
