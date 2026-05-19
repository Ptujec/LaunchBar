// SETTING FUNCTIONS

function settings() {
  return [
    {
      title: 'Choose Default System Prompt'.localize(),
      icon: Action.preferences.defaultSystemPromptIcon ?? 'weasel',
      badge:
        Action.preferences.defaultSystemPromptTitle ??
        File.readJSON(userPresetsPath).systemPrompts[0].title,
      children: showSystemPrompts(),
    },
    {
      title: 'Open Chats In…'.localize(),
      icon: 'appsTemplate',
      badge:
        Action.preferences.editor?.bundleName ?? 'Default Editor'.localize(),
      action: 'chooseEditor',
      actionReturnsItems: true,
    },
    {
      title: 'Choose model'.localize(),
      icon: 'gearTemplate',
      badge: Action.preferences.model ?? recommendedModel,
      action: 'showModels',
      actionReturnsItems: true,
    },
    {
      title: 'Set API Key'.localize(),
      icon: 'keyTemplate',
      action: 'setApiKey',
    },
    {
      title: 'Customize System Prompts'.localize(),
      icon: 'codeTemplate',
      action: 'editPresets',
    },
    {
      title: 'Reset System Prompts'.localize(),
      icon: 'sparkleTemplate',
      action: 'resetPresets',
    },
  ];
}

function setSystemPrompt(item) {
  Action.preferences.defaultSystemPrompt = item.systemPrompt;
  Action.preferences.defaultSystemPromptTitle = item.title;
  Action.preferences.defaultSystemPromptIcon = item.icon;
  return settings();
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
    .filter(
      (item) =>
        item.id.startsWith('gpt-') &&
        !item.id.includes('realtime-preview') &&
        !item.id.includes('audio'),
    )
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

function setModel(model) {
  Action.preferences.model = model;
  return settings();
}

function editPresets() {
  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(userPresetsPath));
}

function isNewerVersion(lastUsedActionVersion, currentActionVersion) {
  const lastUsedParts = lastUsedActionVersion.split('.');
  const currentParts = currentActionVersion.split('.');

  for (let i = 0; i < currentParts.length; i++) {
    const a = ~~currentParts[i];
    const b = ~~lastUsedParts[i];
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

function comparePresets() {
  if (!File.exists(userPresetsPath)) return;

  const userPresets = File.readJSON(userPresetsPath);
  const allPresets = presets.systemPrompts ? [...presets.systemPrompts] : [];
  const userPresetTitles = userPresets.systemPrompts
    ? [...userPresets.systemPrompts].map((item) => item.title)
    : [];

  return allPresets
    .filter((item) => !userPresetTitles.includes(item.title))
    .map((item) => item.title)
    .join('\n');
}

function updatePresets() {
  if (!File.exists(userPresetsPath)) return;

  const userPresets = File.readJSON(userPresetsPath);
  const userSystemPromptTitles = userPresets?.systemPrompts?.map(
    (item) => item.title,
  );
  const newSystemPrompts = presets?.systemPrompts?.filter(
    (item) => !userSystemPromptTitles?.includes(item.title),
  );

  const updatedPresets = {
    ...userPresets,
    systemPrompts: userPresets.systemPrompts
      ? [...userPresets.systemPrompts, ...newSystemPrompts]
      : newSystemPrompts,
  };

  File.writeJSON(updatedPresets, userPresetsPath);

  LaunchBar.displayNotification({
    title: 'Done!',
    string: `${newSystemPrompts.length} new system prompts added.`,
  });

  return settings();
}

function resetPresets() {
  File.writeJSON(presets, userPresetsPath);
  return settings();
}

function setApiKey() {
  const response = LaunchBar.alert(
    'API Key required'.localize(),
    '1) Press »Open OpenAI.com« to create an API Key.\n2) Press »Set API Key«'.localize(),
    'Open OpenAI.com'.localize(),
    'Set API Key'.localize(),
    'Cancel'.localize(),
  );

  if (response === 0) {
    LaunchBar.openURL('https://platform.openai.com/account/api-keys');
    LaunchBar.hide();
    return;
  }

  if (response === 1) {
    const clipboardContent = LaunchBar.getClipboardString().trim();
    if (!checkAPIKey(clipboardContent)) return;

    Action.preferences.apiKey = clipboardContent;

    LaunchBar.alert(
      'Success!'.localize(),
      `API Key set to: ${Action.preferences.apiKey}`,
    );
  }
}

function checkAPIKey(apiKey) {
  if (!apiKey.startsWith('sk-')) {
    LaunchBar.alert(
      'Invalid API Key format'.localize(),
      'Make sure the API Key is the most recent item in the clipboard!'.localize(),
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
    'Invalid OpenAI API Key'.localize(),
    `Error ${result.response.status}: ${result.response.localizedStatus}`,
  );

  return false;
}

function migrateUserPresets() {
  const userPresets = File.readJSON(userPresetsPath);

  // Check if old 'personas' key exists
  if (userPresets.personas && !userPresets.systemPrompts) {
    // Migrate from old format to new format
    const migratedPrompts = userPresets.personas.map((item) => ({
      title: item.title,
      systemPrompt: item.persona, // 'persona' → 'systemPrompt'
      description: item.description,
      icon: item.icon,
    }));

    const updatedPresets = {
      ...userPresets,
      systemPrompts: migratedPrompts,
    };

    // Remove old 'personas' key
    delete updatedPresets.personas;

    File.writeJSON(updatedPresets, userPresetsPath);
  }
}

// Editor selection

const excludedApps = [
  'com.ideasoncanvas.mindnode.macos',
  'net.kovidgoyal.calibre',
  'com.cameronshemilt.StudyCards',
  'com.apple.dt.Xcode',
  'org.musescore.MuseScore',
];

function chooseEditor() {
  const basePath = '/Applications/';
  const installedApps = File.getDirectoryContents(basePath);

  return installedApps
    .map((item) => {
      if (!item.endsWith('.app')) return;

      const infoPlistPath = basePath + item + '/Contents/Info.plist';
      if (!File.exists(infoPlistPath)) return;

      const infoPlist = File.readPlist(infoPlistPath);
      const bundleName = infoPlist.CFBundleName;
      const appID = infoPlist.CFBundleIdentifier;

      if (!canHandleMarkdown(infoPlist)) return;

      return {
        title: bundleName,
        icon: appID,
        label: appID === Action.preferences.editor?.appID ? '✔' : undefined,
        action: 'setEditor',
        actionArgument: {
          appID,
          bundleName,
        },
      };
    })
    .filter(Boolean)
    .filter((item) => !excludedApps.includes(item.icon))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function canHandleMarkdown(infoPlist) {
  const typeDeclarations = [
    infoPlist.UTImportedTypeDeclarations,
    infoPlist.UTExportedTypeDeclarations,
  ];

  if (
    typeDeclarations.some((decls) =>
      decls?.some((item) => {
        const ext = item.UTTypeTagSpecification?.['public.filename-extension'];
        return ext && String(ext).includes('markdown');
      }),
    )
  ) {
    return true;
  }

  // Check CFBundleDocumentTypes for markdown-related extensions
  const documentTypes = infoPlist.CFBundleDocumentTypes || [];
  return documentTypes.some((docType) => {
    const extensions = docType.CFBundleTypeExtensions || [];
    return extensions.some(
      (ext) =>
        String(ext).toLowerCase() === 'md' ||
        String(ext).toLowerCase() === 'markdown',
    );
  });
}

function setEditor(item) {
  Action.preferences.editor = item;
  return settings();
}
