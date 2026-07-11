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
  // Options to pick a custom model and if supported, reasoning effort level
  if (LaunchBar.options.commandKey) {
    if (item.useCustomModel && item.model) {
      if (!supportsReasoningEffort(item.model) || item.effort) return;
      return showReasoningEffortLevels(item);
    }
    return showModels({ ...item, useCustomModel: true });
  }

  const { argument, preset, model, effort } = item;

  const badge = preset?.id === 'none' ? undefined : preset?.title.localize();
  const label = model ? `${model}${effort ? ` (${effort})` : ''}` : undefined;

  const newChatIcon = preset ? preset.icon : getDefaultPreset().icon;

  const newChat = {
    title: 'New Chat'.localize(),
    subtitle: `Prompt: ${argument}`,
    alwaysShowsSubtitle: true,
    icon: newChatIcon,
    badge,
    label,
    action: 'ask',
    actionArgument: { argument, preset, model, effort },
    actionRunsInBackground: true,
  };

  const addClipboard = {
    title: 'Add Clipboard'.localize(),
    subtitle: `Prompt: ${argument}`,
    alwaysShowsSubtitle: true,
    icon: 'weasel_clipboard_plus',
    badge,
    label,
    action: 'ask',
    actionArgument: {
      addClipboard: true,
      argument: `${argument}\n`,
      preset,
      model,
      effort,
    },
    actionRunsInBackground: true,
  };

  let optionItems;

  // if (preset && preset.id !== getDefaultPreset().id) {
  if (preset) {
    optionItems = [newChat, addClipboard];
  } else {
    const recentChatInfo = getMostRecentChatInfo();

    const isRecentlyEdited =
      recentChatInfo?.lastEdited &&
      (Date.now() - new Date(recentChatInfo.lastEdited)) / 60000 < 5;

    addClipboard.actionArgument = {
      ...addClipboard.actionArgument,
      recentPath: recentChatInfo?.filePath,
    };

    const continueChat = recentChatInfo
      ? {
          title: `${'Continue Chat'.localize()}: "${recentChatInfo.title}"`,
          subtitle: `Prompt: ${argument}`,
          alwaysShowsSubtitle: true,
          icon: 'weasel_bubble_dots',
          action: 'ask',
          actionArgument: {
            argument,
            continueChat: true,
            recentPath: recentChatInfo.filePath,
          },
          actionRunsInBackground: true,
        }
      : {};

    optionItems = isRecentlyEdited
      ? [continueChat, newChat, addClipboard]
      : [newChat, continueChat, addClipboard];
  }

  return optionItems;
}

function ask(item) {
  let argument = item.argument.trim();
  let continueChat = item.continueChat;

  // ADD CLIPBOARD CONTENT
  if (item.addClipboard) {
    const clipboard = LaunchBar.getClipboardString().trim();
    const displayClipboard =
      clipboard.length > 500 ? clipboard.substring(0, 500) + '…' : clipboard;

    if (item.recentPath) {
      const response = LaunchBar.alert(
        argument.trim(),
        `"${displayClipboard}"`,
        'New Chat'.localize(),
        'Continue Chat'.localize(),
        'Cancel'.localize(),
      );
      if (response === 2) return;
      if (response === 1) continueChat = true;
    } else {
      const response = LaunchBar.alert(
        argument.trim(),
        `"${displayClipboard}"`,
        'Ok',
        'Cancel'.localize(),
      );
      if (response !== 0) return;
    }

    argument += `\n\n${clipboard}`;
  }

  LaunchBar.hide();

  // API OPTIONS BASED ON CHAT EXISTENCE OF PREVIOUS RESPONSE ID
  const model = item.model ?? Action.preferences.model ?? recommendedModel;
  const recentPath = item.recentPath;

  let chatResponseProperties = {};
  let previousResponseId, systemPrompt, effort, presetId;

  if (continueChat) {
    if (!File.exists(recentPath)) return;

    const chatFileId = extractChatFileId(recentPath);
    if (!chatFileId) return;

    previousResponseId =
      Action.preferences.chatMetadata?.[chatFileId]?.previousResponseId;

    // NOTE: We could handle this gracefully by adding the existing text to the prompt … but I don't think it's worth the complexity
    if (!previousResponseId) return;

    chatResponseProperties = {
      content: {
        type: 'string',
        description: 'Main response',
      },
    };
  } else {
    const defaultPreset = getDefaultPreset();
    presetId = item.preset?.id ?? defaultPreset?.id;
    systemPrompt = item.preset?.systemPrompt ?? defaultPreset?.systemPrompt;

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

    effort = item.effort
      ? item.effort
      : supportsReasoningEffort(model)
        ? getReasoningEffort(model)
        : undefined;
  }

  const instructions = presetId !== 'none' ? systemPrompt : undefined;

  LaunchBar.log(
    'effort: ' + effort,
    'continueChat: ' + continueChat,
    'model: ' + model,
    'presetId: ' + presetId,
    'instructions: ' + instructions,
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
      instructions,
      input: argument,
      previous_response_id: previousResponseId,
      reasoning: effort && effort !== 'default' ? { effort } : undefined,
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

  processResult(result, argument, presetId, continueChat, recentPath, model);
}

function processResult(
  result,
  argument,
  presetId,
  continueChat,
  recentPath,
  model,
) {
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

  let text = data.output
    .find((item) => item.type === 'message')
    ?.content?.find((item) => item.type === 'output_text')
    ?.text.trim();

  if (!text) {
    LaunchBar.alert('No answer in response'.localize());
    return;
  } else {
    text = JSON.parse(text);
  }

  const answer = text.content;
  const title = text.title;
  const chatId = data.id;

  // PLAY CONFIRMATION SOUND
  const chatFileId = LaunchBar.execute('/bin/bash', './soundAndUuid.sh').trim();

  // COPY RESULT TO CLIPBOARD
  LaunchBar.setClipboardString(answer);

  // CREATE/OPEN CHAT TEXT FILE
  const fileLocation =
    recentPath && continueChat
      ? recentPath
      : `${chatsFolder}${title}_${chatFileId}.md`;

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
          preset: item,
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

  return chatFiles
    .filter((item) => item.endsWith('.md'))
    .map((item) => {
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
        // icon: 'weasel_paper',
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
    set result to display dialog "${'Continue Chat'.localize()}: \\"${fileTitle}\\"" with title "Ask ChatGPT" default answer ""
    set result to text returned of result
    `,
  ).trim();

  if (argument === '') return;

  const item = {
    argument,
    continueChat: true,
    recentPath: filePath,
    recentTitle: fileTitle,
  };

  ask(item);
}

function showModels(requestItem) {
  const defaultModel = Action.preferences.model || recommendedModel;
  const useCustomModel = requestItem?.useCustomModel;

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
    .sort((a, b) => b.id.localeCompare(a.id))
    .map((item) => ({
      title: item.id,
      icon:
        defaultModel === item.id ? 'checkTemplate.png' : 'circleTemplate.png',
      action: useCustomModel ? 'options' : 'setModel',
      actionArgument: useCustomModel
        ? { ...requestItem, model: item.id }
        : item.id,
      badge:
        item.id === recommendedModel
          ? 'Recommended'.localize()
          : item.id === defaultModel
            ? 'Default'.localize()
            : undefined,
    }));
}

function showReasoningEffortLevels(requestItem) {
  const useCustomModel = requestItem?.useCustomModel;

  const currentModel = Action.preferences.model ?? recommendedModel;
  const currentEffort = getReasoningEffort(currentModel) ?? 'default';
  const availableEfforts = [
    'default',
    'none',
    'low',
    'medium',
    'high',
    'xhigh',
  ];

  return availableEfforts.map((value) => {
    const titleText =
      value === 'xhigh'
        ? 'XHigh'
        : value.charAt(0).toUpperCase() + value.slice(1);
    return {
      title: titleText.localize(),
      icon:
        currentEffort === value ? 'checkTemplate.png' : 'circleTemplate.png',
      badge: useCustomModel ? requestItem.model : undefined,
      action: useCustomModel ? 'options' : 'selectReasoningEffort',
      actionArgument: useCustomModel
        ? { effort: value, ...requestItem }
        : value,
    };
  });
}
