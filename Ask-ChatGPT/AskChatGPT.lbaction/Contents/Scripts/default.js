/*
ChaptGPT Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developers.openai.com/api/docs
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http

TODO:

- check api … update if necessary
  - how we post
    - https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create#(resource)%20chat.completions%20%3E%20(method)%20create%20%3E%20(params)%200.non_streaming%20%3E%20(param)%20messages%20%3E%20(schema)
  - modell selection
- when none default sys prompt set in settings use badge?
- consistent and meaningful naming
*/

String.prototype.localizationTable = 'default';

include('settings.js');

const recommendedModel = 'gpt-5.4-mini';
const apiKey = Action.preferences.apiKey;
const recentTimeStamp = Action.preferences.recentTimeStamp;
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
    } catch (e) {
      const response = LaunchBar.alert(
        e,
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
    migrateUserPresets();

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

  if (LaunchBar.options.alternateKey) return settings();

  if (!argument) return showChats();

  if (LaunchBar.options.commandKey) return showSystemPrompts(argument);

  return options({ argument });
}

function options(item) {
  const { argument, systemPrompt, presetTitle } = item;

  const newChatIcon =
    Action.preferences.defaultSystemPrompt?.icon &&
    Action.preferences.defaultSystemPrompt?.icon !== 'weasel'
      ? Action.preferences.defaultSystemPrompt?.icon
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

  const recentChat = Action.preferences.recentChat;
  const hasRecentChat = recentChat?.path && File.exists(recentChat.path);

  const continueChatItem = hasRecentChat
    ? (() => {
        const recentFileTitle = File.displayName(recentChat.path).replace(
          /\.md$/,
          '',
        );
        return {
          title: `${'Continue'.localize()}: ${recentFileTitle}`,
          subtitle: `Prompt: ${argument}`,
          alwaysShowsSubtitle: true,
          icon: 'weasel_watch',
          action: 'ask',
          actionArgument: {
            argument,
            presetTitle: recentChat.presetTitle,
            addRecent: true,
            recentPath: recentChat.path,
            recentFileTitle,
            systemPrompt: recentChat.systemPrompt,
            isPrompt: recentChat.isPrompt,
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

  // Check if need to reverse order (recent created less than 5 minutes ago)
  const shouldReverse =
    hasRecentChat && (new Date() - new Date(recentTimeStamp)) / 60000 < 5;
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

  // INCLUDE PREVIOUS CHAT HISTORY
  if (item.addRecent) {
    recentPath = item.recentPath;
    if (!File.exists(recentPath)) return;

    const text = File.readText(recentPath).replace(/^> /gm, '');
    prompt = `${text}...${argument}\n`;
    title = item.recentFileTitle;
  } else {
    // TITLE CLEANUP
    title = title
      .replace(/[&~=§#@[\]{}()+\\\/%*$:;,.?><\|""'´]/g, ' ')
      .replace(/[\s_]{2,}/g, ' ')
      .substring(0, 80)
      .trim();

    if (title.length === 80) title += '…';
  }

  // MODEL
  const model = Action.preferences.model ?? recommendedModel;

  // SYSTEM PROMPT
  const defaultSystemPrompt =
    Action.preferences.systemPrompt?.systemPrompt ??
    File.readJSON(userPresetsPath).systemPrompts[0].systemPrompt;

  const systemPrompt = item.systemPrompt ?? defaultSystemPrompt;

  // API CALL
  const result = HTTP.postJSON('https://api.openai.com/v1/chat/completions', {
    headerFields: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    },
  });

  const presetTitle =
    item.presetTitle ??
    Action.preferences.defaultSystemPrompt?.title ??
    File.readJSON(userPresetsPath).systemPrompts[0].title;

  processResult(
    result,
    argument,
    title,
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
  title,
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
  const answer = data.choices[0].message.content.trim();

  // PLAY CONFIRMATION SOUND
  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf',
  );

  // COPY RESULT TO CLIPBOARD
  const originalClipboard = LaunchBar.getClipboardString();
  LaunchBar.setClipboardString(answer);

  // CREATE/OPEN CHAT TEXT FILE
  const fileLocation = recentPath || `${chatsFolder}${title}.md`;
  const recentChat = {
    systemPrompt,
    presetTitle,
    icon,
    path: fileLocation,
    isPrompt,
  };
  openChatTextFile(argument, fileLocation, answer, recentChat);
}

function openChatTextFile(argument, fileLocation, answer, recentChat) {
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

  // STORE TIMESTAMP
  Action.preferences.recentTimeStamp = new Date().toISOString();

  // STORE USED SYSTEM PROMPT PROPERTIES
  Action.preferences.recentChat = recentChat;
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
          systemPrompt: item.systemPrompt,
          icon: item.icon,
        },
      };
    }

    return {
      ...baseData,
      action: 'setSystemPrompt',
      actionArgument: {
        systemPrompt: item.systemPrompt,
        title: item.title,
        icon: item.icon,
      },
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
    const fileTitle = File.displayName(filePath).replace(/\.md$/, '');

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

  const item = {
    argument: prompt,
    addRecent: true,
    recentPath: filePath,
    recentFileTitle: fileTitle,
  };

  ask(item);

  // TODO: Ask with attached file content … make sure we save to the correct file location …  maybe in the future we can also store things like the original system prompt etc. … but needs different structure
}
