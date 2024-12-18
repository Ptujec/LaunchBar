/*
Settings for Writing Tools Action for LaunchBar (using Chat GPT) 
by Christian Bender (@ptujec)
2024-12-18
*/

function settings() {
  const prefs = Action.preferences || {};
  const defaultToolID = prefs.defaultToolID || '1';
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
      badge: prefs.model || 'gpt-4o-mini',
      action: 'showModels',
    },
    File.exists('/Applications/iA Writer.app')
      ? {
          title: 'Set Author (iA Writer)'.localize(),
          icon: 'iATemplate',
          action: 'showAuthors',
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
      // children: getApps(),
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
                (item) => item.endsWith('.app')
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
                type
              )
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
      1
    );
  } else {
    excludedApps.push(app);
  }
  Action.preferences.excludedApps = excludedApps;
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
