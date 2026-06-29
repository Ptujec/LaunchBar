/*
Settings for Writing Tools Action for LaunchBar (using Chat GPT)
by Christian Bender (@ptujec)
2024-12-18
*/

const recommendedModel = 'gpt-5.4-mini';

function settings() {
  const prefs = Action.preferences;
  const defaultToolID = prefs.defaultToolID || '1';
  const tools = getUserToolsJSON();
  const defaultToolName = tools.find(
    (tool) => tool.id === defaultToolID,
  )?.title;

  const currentModel = prefs.model ?? recommendedModel;
  const supportsReasoning = supportsReasoningEffort(currentModel);
  const currentEffort = getReasoningEffort(currentModel) ?? 'default';

  const effortBadge =
    currentEffort === 'xhigh'
      ? 'XHigh'.localize()
      : (
          currentEffort.charAt(0).toUpperCase() + currentEffort.slice(1)
        ).localize();

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
      badge: currentModel,
      actionReturnsItems: true,
      action: 'showModels',
    },
    supportsReasoning
      ? {
          title: 'Set Reasoning Effort'.localize(),
          icon: 'brainTemplate',
          badge: effortBadge,
          action: 'showReasoningEffortLevels',
          actionReturnsItems: true,
        }
      : undefined,
    File.exists('/Applications/iA Writer.app')
      ? {
          title: 'Set Author (iA Writer)'.localize(),
          icon: 'iATemplate',
          action: 'showAuthors',
          actionReturnsItems: true,
          badge: prefs.iaAuthor ? prefs.iaAuthor : undefined,
        }
      : {},
    File.exists('/Applications/BBEdit.app')
      ? {
          title: 'Use Compare (BBEdit)'.localize(),
          icon: 'bbTemplate',
          action: 'toogleBBEditCompare',
          badge: prefs.useBBEditCompare ? 'On'.localize() : 'Off'.localize(),
        }
      : {},
    ,
    {
      title: 'Disable Alert for Apps'.localize(),
      subtitle:
        'Disable alert before auto selecting text for certain apps'.localize(),
      alwaysShowsSubtitle: true,
      icon: 'appsTemplate',
      action: 'getApps',
      actionReturnsItems: true,
      badge:
        prefs.excludedApps?.length > 0
          ? prefs.excludedApps.length === 1
            ? prefs.excludedApps[0].title
            : prefs.excludedApps.length.toString()
          : undefined,
    },
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
    {
      title: 'Show Usage Log'.localize(),
      icon: 'logTemplate',
      action: 'showUsageLog',
      actionRunsInBackground: true,
    },
  ];
}

// TOOLS

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

  const toolItems = tools.map((tool) => ({
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
    // actionRunsInBackground: content ? true : false,
  }));

  // Add custom prompt at the top if content is available
  if (content) {
    const customPromptItem = {
      title: 'New Prompt'.localize(),
      icon: 'toolTemplate',
      action: 'mainAction',
      actionArgument: {
        content,
        hasArgument,
        frontmostAppID,
        isCustomPrompt: true,
      },
      // actionRunsInBackground: true,
    };
    return [customPromptItem, ...toolItems];
  }

  return toolItems;
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

// MODELS

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
    .reverse()
    .map((item) => ({
      title: item.id,
      icon:
        defaultModel === item.id ? 'checkTemplate.png' : 'circleTemplate.png',
      action: useCustomModel ? 'mainAction' : 'setModel',
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

function filterModels(model) {
  const id = model.id || '';

  const disallowedPatterns = [
    'image',
    'transcribe',
    'search',
    'tts',
    'codex',
    'audio',
    'realtime',
  ];

  if (!id.startsWith('gpt-') || model.owned_by === 'openai-internal')
    return false;
  if (disallowedPatterns.some((p) => id.includes(p))) return false;

  return true;
}

function setModel(model) {
  Action.preferences.model = model;
  return settings();
}

// REASONING EFFORT

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
      action: useCustomModel ? 'mainAction' : 'selectReasoningEffort',
      actionArgument: useCustomModel
        ? { effort: value, ...requestItem }
        : value,
    };
  });
}

function selectReasoningEffort(effort) {
  const currentModel = Action.preferences.model ?? recommendedModel;
  setReasoningEffort(currentModel, effort);
  return settings();
}

function supportsReasoningEffort(model) {
  const match = model.match(/gpt-(\d+\.\d+)/);
  if (!match) return false;
  const version = parseFloat(match[1]);
  return version >= 5.2;
}

function getReasoningEffort(model) {
  const prefKey = `reasoningEffort_${model}`;
  return Action.preferences[prefKey];
}

function setReasoningEffort(model, effort) {
  const prefKey = `reasoningEffort_${model}`;
  if (!effort || effort === 'default') {
    delete Action.preferences[prefKey];
    return;
  }
  Action.preferences[prefKey] = effort;
}

// TEXT EDITOR SETTINGS

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

function getApps() {
  const excludedApps = Action.preferences.excludedApps || [];
  const appPaths = ['/System/Applications/', '/Applications/'];

  return appPaths
    .flatMap((basePath) => {
      const dirContents = File.getDirectoryContents(basePath);

      return dirContents
        .filter((item) => item.endsWith('.app'))
        .map((item) => {
          const path = basePath + item;
          const title = File.displayName(path).replace('.app', '');
          let infoPlistPath = `${path}/Contents/Info.plist`;

          if (!File.exists(infoPlistPath)) {
            const wrapper = path + '/Wrapper/';
            if (File.exists(wrapper)) {
              const wrapperItem = File.getDirectoryContents(wrapper).find(
                (item) => item.endsWith('.app'),
              );
              if (wrapperItem) {
                infoPlistPath = `${path}/Wrapper/${wrapperItem}/Info.plist`;
              }
            }
          }

          if (!File.exists(infoPlistPath)) return null;

          const infoPlist = File.readPlist(infoPlistPath);
          const agentApp = infoPlist.LSUIElement;
          const appID = infoPlist.CFBundleIdentifier;

          const documentTypes = infoPlist.CFBundleDocumentTypes || [];
          const canHandleText = documentTypes.some((docType) => {
            const types = docType.LSItemContentTypes || [];
            return types.some((type) =>
              ['public.plain-text', 'public.text', 'public.content'].includes(
                type,
              ),
            );
          });

          if (!agentApp && appID && canHandleText) {
            return {
              title,
              icon: appID,
              action: 'excludeApp',
              actionArgument: { title, appID },
              sort: excludedApps.map((app) => app.appID).includes(appID)
                ? 1
                : 0,
              label:
                excludedApps.length === 0
                  ? '⏎: ' + 'Disable alert for this app!'.localize()
                  : undefined,
              badge: excludedApps.map((app) => app.appID).includes(appID)
                ? 'No alert'.localize()
                : undefined,
            };
          }
          return null;
        })
        .filter(Boolean);
    })
    .sort((a, b) => b.sort - a.sort)
    .sort((a, b) => {
      if (a.sort === b.sort) return a.title.localeCompare(b.title);
      return 0;
    });
}

function excludeApp(app) {
  const excludedApps = Action.preferences.excludedApps || [];
  if (
    excludedApps.map((excludedApp) => excludedApp.appID).includes(app.appID)
  ) {
    excludedApps.splice(
      excludedApps.findIndex((excludedApp) => excludedApp.appID === app.appID),
      1,
    );
  } else {
    excludedApps.push(app);
  }
  Action.preferences.excludedApps = excludedApps;
  return settings();
}

// API KEY SETTINGS

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
    'Cancel'.localize(),
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
        'API key set to: '.localize() + Action.preferences.apiKey,
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
      'Make sure the API key is the most recent item in the clipboard!'.localize(),
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
    `Error ${result.response.status}: ${result.response.localizedStatus}`,
  );

  return false;
}

// LOGGING

function logTokenUsage(data, model, tool) {
  const usage = data.usage || {};

  const timestamp = new Date().toISOString();
  const logEntry = [
    `[${timestamp}]`,
    `Model (preset): ${model}`,
    `Model (actual): ${data.model}`,
    `Reasoning Effort: ${data.reasoning.effort}`,
    `Tool: ${tool.id} (${tool.title || tool.prompt?.trim()})`,
    `Instructions: ${data.instructions}`,
    `Status: ${data.status}`,
    `Input Tokens: ${usage.input_tokens || 0}`,
    `Output Tokens: ${usage.output_tokens || 0}`,
    usage.input_tokens_details?.cached_tokens
      ? `Cached Tokens: ${usage.input_tokens_details.cached_tokens}`
      : '',
    usage.output_tokens_details?.reasoning_tokens
      ? `Reasoning Tokens: ${usage.output_tokens_details.reasoning_tokens}`
      : '',
    `Total Tokens: ${usage.total_tokens || 0}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const existingContent = File.exists(logPath) ? File.readText(logPath) : '';
  const newContent = existingContent
    ? existingContent + '\n' + logEntry
    : logEntry;

  File.writeText(newContent, logPath);
}

function showUsageLog() {
  if (!File.exists(logPath)) {
    LaunchBar.alert(
      'No Usage Log!'.localize(),
      'The usage log file does not exist.'.localize(),
    );
    return;
  }
  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(logPath));
}
