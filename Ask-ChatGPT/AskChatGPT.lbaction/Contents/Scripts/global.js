/*
ChaptGPT Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-05-21

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function settings() {
  const defaultPreset = getDefaultPreset();

  return [
    {
      title: 'Choose Default System Prompt'.localize(),
      icon: defaultPreset?.icon ?? 'weasel',
      badge: defaultPreset?.title,
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
    {
      title: 'Show Usage Log'.localize(),
      icon: 'logTemplate',
      action: 'showUsageLog',
      actionRunsInBackground: true,
    },
  ];
}

// CHAT FILES AND METADATA

function titleCleanup(title) {
  title = title.replace(/\.md$/, '').trim();
  if (title.includes('_')) {
    // Format: {title}_{uuid}
    // Remove the UUID at the end (everything after the last underscore)
    return title.substring(0, title.lastIndexOf('_'));
  }
  return title;
}

function cleanupOrphanedChatMetadata() {
  if (!File.exists(chatsFolder) || !Action.preferences.chatMetadata) return;

  // Get all existing chat file IDs
  const chatFiles = File.getDirectoryContents(chatsFolder, {
    includeHidden: false,
  });

  // Extract UUIDs from filenames: {title}_{uuid}.md
  const existingChatIds = new Set(
    chatFiles
      .map((file) => {
        const withoutExtension = file.replace(/\.md$/, '');
        const potentialUuid = withoutExtension.split('_').pop();
        return isValidUuid(potentialUuid) ? potentialUuid : undefined;
      })
      .filter(Boolean),
  );

  // Remove orphaned entries
  for (const id of Object.keys(Action.preferences.chatMetadata)) {
    if (!existingChatIds.has(id)) {
      delete Action.preferences.chatMetadata[id];
    }
  }
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

  const chatMetadata = Action.preferences.chatMetadata?.[chatId]; // currently lastEdited and presetId

  if (!chatMetadata) {
    // for older chats that don't have metadata
    const lastEdited = File.modificationDate(filePath);
    const presetId = getDefaultPreset()?.id;
    return { filePath, lastEdited, presetId };
  }

  return {
    filePath,
    ...chatMetadata,
  };
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

function isValidUuid(uuid) {
  const uuidRegex =
    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  return uuidRegex.test(uuid);
}

// MODELS

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

// PRESETS

function setSystemPrompt(presetId) {
  Action.preferences.defaultSystemPromptId = presetId;
  return settings();
}

function getDefaultPreset() {
  const userPresets = File.readJSON(userPresetsPath).systemPrompts;
  return (
    userPresets.find(
      (p) => p.id === Action.preferences.defaultSystemPromptId,
    ) || userPresets[0]
  );
}

function getPresetById(presetId) {
  if (!presetId) return undefined;
  const userPresets = File.readJSON(userPresetsPath);
  return userPresets.systemPrompts?.find((p) => p.id === presetId);
}

function editPresets() {
  LaunchBar.hide();
  LaunchBar.openURL(File.fileURLForPath(userPresetsPath));
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

// API KEY

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

// EDITOR SELECTION

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

// ACTION SETUP CHECKS AND MIGRATION

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

function isVersionBelow(version1, version2) {
  const parts1 = version1.split('.');
  const parts2 = version2.split('.');

  for (let i = 0; i < parts2.length; i++) {
    const a = ~~parts1[i];
    const b = ~~parts2[i];
    if (a < b) return true;
    if (a > b) return false;
  }
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

function migratePresetsWithIds() {
  if (!File.exists(userPresetsPath)) return;

  const userPresets = File.readJSON(userPresetsPath);

  if (userPresets.systemPrompts) {
    userPresets.systemPrompts = userPresets.systemPrompts.map((preset) => {
      // If preset already has an id, keep it
      if (preset.id) return preset;

      // Generate id from title: lowercase, replace spaces with underscores
      const id = preset.title
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      return {
        ...preset,
        id,
      };
    });

    File.writeJSON(userPresets, userPresetsPath);
  }
}

// LOGGING

function logTokenUsage(data, model, presetId, fileLocation) {
  const usage = data.usage || {};

  const timestamp = new Date().toISOString();
  const logEntry = [
    `[${timestamp}]`,
    `File: ${fileLocation || ''}`,
    `Model: ${model}`,
    `Preset: ${presetId}`,
    `Prompt Tokens: ${usage.prompt_tokens || 0}`,
    `Completion Tokens: ${usage.completion_tokens || 0}`,
    `Total Tokens: ${usage.total_tokens || 0}`,
    usage.prompt_tokens_details?.cached_tokens
      ? `Cached Tokens: ${usage.prompt_tokens_details.cached_tokens}`
      : '',
    usage.completion_tokens_details?.reasoning_tokens
      ? `Reasoning Tokens: ${usage.completion_tokens_details.reasoning_tokens}`
      : '',
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
