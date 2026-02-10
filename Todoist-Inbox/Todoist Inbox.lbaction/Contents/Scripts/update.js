/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2025-04-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation: 
- https://developer.todoist.com/api/v1/#tag/Sync/Overview/Read-resources
*/

function update(hide = true) {
  if (hide) LaunchBar.hide();

  const apiToken = Action.preferences.apiToken;
  const syncToken = Action.preferences.syncToken || '*';
  const timestamp = new Date().toLocaleString('sv').replace(/[: ]/g, '-');
  const logPath = `/tmp/todoist_inbox_log_${timestamp}.log`;

  const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
    body: {
      sync_token: syncToken,
      resource_types: '["labels", "projects", "sections"]',
    },
  });

  // File.writeJSON(result, `${Action.supportPath}/test.json`);

  if (result.error) {
    LaunchBar.alert(result.error);
    return;
  }

  if (!result.response || result.response.status !== 200) {
    const statusCode = result.response?.status || 'unknown';
    const errorMessage = result.data
      ? JSON.parse(result.data).error_message || 'Unknown error'
      : 'No response data';
    LaunchBar.alert(`Todoist API Error (${statusCode}): ${errorMessage}`);
    return;
  }

  Action.preferences.lastSyncDate =
    result?.response?.headerFields.Date || undefined;

  const syncData = JSON.parse(result.data);

  if (syncData.sync_token) {
    Action.preferences.syncToken = syncData.sync_token;
  }

  const resources = [
    {
      name: 'projects',
      data: { data: { results: syncData.projects } },
    },
    {
      name: 'sections',
      data: { data: { results: syncData.sections } },
    },
    {
      name: 'labels',
      data: { data: { results: syncData.labels } },
    },
  ];

  const isFullSync = syncData.full_sync || false;
  const results = resources.map(({ name, data }) => ({
    type: name,
    changes: updateResourceData(data, eval(`${name}Path`), isFullSync),
  }));

  const log = [
    `Todoist Inbox Update Log - ${timestamp}\n`,
    ...results
      .map(({ type, changes }) => {
        const changeLog = formatChanges(type, changes);
        return changeLog
          ? `${
              type.charAt(0).toUpperCase() + type.slice(1)
            } Changes:\n${changeLog}`
          : '';
      })
      .filter(Boolean),
  ].join('\n\n');

  const totalChanges = results.reduce(
    (total, { changes }) =>
      total +
      changes.newIds.length +
      changes.oldIds.length +
      changes.updatedItems.length +
      changes.archivedItems.length,
    0,
  );

  if (totalChanges > 0) File.writeText(log, logPath);

  if (hide || totalChanges > 0) {
    const notification = {
      title: 'Todoist Inbox'.localize(),
      subtitle: 'Local Data Update'.localize(),
      string: `${totalChanges}${' change(s)'.localize()}`,
    };

    if (totalChanges > 0) {
      notification.string += `\n${'Click to open log!'.localize()}`;
      notification.url = File.fileURLForPath(logPath);
    }

    LaunchBar.displayNotification(notification);
  }
}

function formatChanges(type, { newIds, oldIds, updatedItems, archivedItems }) {
  const sections = [
    {
      title: `New ${type}`,
      items: newIds?.map((item) => item.name) ?? [],
    },
    {
      title: `Removed ${type}`,
      items: oldIds?.map((item) => item.name) ?? [],
    },
    {
      title: `Updated ${type} names`,
      items:
        updatedItems?.map(
          ({ oldName, newName }) => `"${oldName}" → "${newName}"`,
        ) ?? [],
    },
    {
      title: `Archived ${type}`,
      items: archivedItems?.map((item) => item.name) ?? [],
    },
  ];

  return sections
    .filter((section) => section.items.length > 0)
    .map(
      ({ title, items }) =>
        `- ${title} (${items.length}):\n  • ${items.join('\n  • ')}`,
    )
    .join('\n\n');
}

function updateResourceData(onlineData, localPath, isFullSync = false) {
  if (!File.exists(localPath)) {
    File.writeJSON(onlineData, localPath);
    return {
      newIds: onlineData.data.results,
      oldIds: [],
      updatedItems: [],
      archivedItems: [],
      updatedNameCount: 0,
    };
  }

  const localData = File.readJSON(localPath);
  const syncResults = onlineData.data.results;

  const newIds = [];
  const oldIds = [];
  const updatedItems = [];
  const archivedItems = [];

  // Create a Map for O(1) lookups instead of O(n) find operations
  const localMap = new Map(
    localData.data.results.map((item) => [item.id, item]),
  );
  const processedIds = new Set();

  // Process sync data - handle changes, deletions, and new items
  for (const syncItem of syncResults) {
    processedIds.add(syncItem.id);
    const localItem = localMap.get(syncItem.id);

    if (syncItem.is_deleted) {
      // Item was deleted - remove from local
      if (localItem) {
        oldIds.push(localItem);
        localMap.delete(syncItem.id);
      }
    } else if (!localItem) {
      // New item
      newIds.push(syncItem);
      // Check if new item is already archived
      if (syncItem.is_archived) {
        archivedItems.push(syncItem);
      }
      localMap.set(syncItem.id, {
        ...syncItem,
        usage: 0,
        usedWords: [],
      });
    } else {
      // Item exists - track name changes before updating
      if (localItem.name !== syncItem.name) {
        updatedItems.push({
          oldName: localItem.name,
          newName: syncItem.name,
          id: syncItem.id,
        });
      }
      // Track archived status changes
      if (!localItem.is_archived && syncItem.is_archived) {
        archivedItems.push(syncItem);
      }
      // Replace all properties from syncItem except usage and usedWords
      localMap.set(syncItem.id, {
        ...syncItem,
        usage: localItem.usage || 0,
        usedWords: localItem.usedWords || [],
      });
    }
  }

  // If this is a full sync, remove items not in syncData
  if (isFullSync) {
    for (const localId of localMap.keys()) {
      if (!processedIds.has(localId)) {
        const deletedItem = localMap.get(localId);
        oldIds.push(deletedItem);
        localMap.delete(localId);
      }
    }
  }

  localData.data.results = Array.from(localMap.values());
  File.writeJSON(localData, localPath);

  return {
    newIds,
    oldIds,
    updatedItems,
    archivedItems,
    updatedNameCount: updatedItems.length,
  };
}

function reset() {
  LaunchBar.hide();

  const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
    body: {
      sync_token: '*',
      resource_types: '["labels", "projects", "sections"]',
    },
  });

  // Check for network/LaunchBar errors
  if (result.error) {
    LaunchBar.alert(result.error);
    return;
  }

  // Check for HTTP response errors
  if (!result.response || result.response.status !== 200) {
    const statusCode = result.response?.status || 'unknown';
    const errorMessage = result.data
      ? JSON.parse(result.data).error_message || 'Unknown error'
      : 'No response data';
    LaunchBar.alert(`Todoist API Error (${statusCode}): ${errorMessage}`);
    return;
  }

  Action.preferences.lastSyncDate =
    result?.response?.headerFields.Date || undefined;

  const syncData = JSON.parse(result.data);

  if (syncData.sync_token) {
    Action.preferences.syncToken = syncData.sync_token;
  }

  // Reset all resources
  const resources = [
    { data: { data: { results: syncData.projects } }, path: projectsPath },
    { data: { data: { results: syncData.sections } }, path: sectionsPath },
    { data: { data: { results: syncData.labels } }, path: labelsPath },
  ];

  resources.map(({ data, path }) => {
    File.writeJSON(data, path);
    return path;
  });

  // Notification
  LaunchBar.displayNotification({
    title: 'Todoist Inbox'.localize(),
    subtitle: 'Local Data Reset'.localize(),
    string: 'Projects, sections & labels reset.'.localize(),
  });
}
