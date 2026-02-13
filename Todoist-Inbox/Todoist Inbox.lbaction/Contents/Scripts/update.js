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

  if (!apiToken) return;

  const syncToken = Action.preferences.syncToken || '*';
  const timestamp = new Date().toLocaleString('sv').replace(/[: ]/g, '-');
  const logPath = `/tmp/todoist_inbox_log_${timestamp}.log`;

  const syncResult = performSync(syncToken);
  if (!syncResult) return;

  const { data: syncData, lastSyncDate } = syncResult;
  Action.preferences.lastSyncDate = lastSyncDate;
  if (syncData.sync_token) {
    Action.preferences.syncToken = syncData.sync_token;
  }

  const todoistData = getTodoistData();
  const isFullSync = syncData.full_sync || false;
  const resourceTypes = ['projects', 'sections', 'labels'];

  const results = resourceTypes.map((name) => ({
    type: name,
    changes: updateResourceData(syncData[name], name, todoistData, isFullSync),
  }));

  const resourceLabel = (type) => type.charAt(0).toUpperCase() + type.slice(1);
  const log = [
    `Todoist Inbox Update Log - ${timestamp}\n`,
    ...results
      .map(({ type, changes }) => formatChanges(type, changes))
      .filter(Boolean)
      .map(
        (changeLog, i) =>
          `${resourceLabel(resourceTypes[i])} Changes:\n${changeLog}`,
      ),
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

  saveTodoistData(todoistData);

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

function resetTodoistData() {
  LaunchBar.hide();

  if (!apiToken) return;

  const syncResult = performSync('*');
  if (!syncResult) return;

  const { data: syncData, lastSyncDate } = syncResult;
  Action.preferences.lastSyncDate = lastSyncDate;
  if (syncData.sync_token) Action.preferences.syncToken = syncData.sync_token;

  const todoistData = {
    projects: syncData.projects || [],
    sections: syncData.sections || [],
    labels: syncData.labels || [],
  };

  saveTodoistData(todoistData);

  LaunchBar.displayNotification({
    title: 'Todoist Inbox'.localize(),
    subtitle: 'Todoist Data Reset'.localize(),
    string: 'Projects, sections & labels reset.'.localize(),
  });
}

function resetUsageData() {
  LaunchBar.hide();

  const emptyUsageData = {
    projects: {},
    sections: {},
    labels: {},
  };

  saveUsageData(emptyUsageData);

  // Notification
  LaunchBar.displayNotification({
    title: 'Todoist Inbox'.localize(),
    subtitle: 'Usage Data Reset'.localize(),
    string: 'All usage statistics cleared.'.localize(),
  });
}

function performSync(syncToken = '*') {
  const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
    body: {
      sync_token: syncToken,
      resource_types: '["labels", "projects", "sections"]',
    },
  });

  if (result.error) {
    LaunchBar.alert(result.error);
    return null;
  }

  if (!result.response || result.response.status !== 200) {
    const statusCode = result.response?.status || 'unknown';
    const errorMessage = result.data
      ? JSON.parse(result.data).error_message || 'Unknown error'
      : 'No response data';
    LaunchBar.alert(`Todoist API Error (${statusCode}): ${errorMessage}`);
    return null;
  }

  return {
    data: JSON.parse(result.data),
    lastSyncDate: result.response.headerFields?.Date,
  };
}

function formatChanges(type, { newIds, oldIds, updatedItems, archivedItems }) {
  const sections = [
    { title: `New ${type}`, items: (newIds ?? []).map((item) => item.name) },
    {
      title: `Removed ${type}`,
      items: (oldIds ?? []).map((item) => item.name),
    },
    {
      title: `Updated ${type} names`,
      items: (updatedItems ?? []).map(
        ({ oldName, newName }) => `"${oldName}" → "${newName}"`,
      ),
    },
    {
      title: `Archived ${type}`,
      items: (archivedItems ?? []).map((item) => item.name),
    },
  ];

  return (
    sections
      .filter(({ items }) => items.length > 0)
      .map(
        ({ title, items }) =>
          `- ${title} (${items.length}):\n  • ${items.join('\n  • ')}`,
      )
      .join('\n\n') || null
  );
}

function updateResourceData(
  syncResults,
  resourceName,
  todoistData,
  isFullSync = false,
) {
  const localArray = todoistData[resourceName];

  const newIds = [];
  const oldIds = [];
  const updatedItems = [];
  const archivedItems = [];

  // Create a Map for O(1) lookups instead of O(n) find operations
  const localMap = new Map(localArray.map((item) => [item.id, item]));
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
      });
    } else {
      // Item exists - track name changes before updating
      if (localItem.name !== syncItem.name) {
        updatedItems.push({
          oldName: localItem.name,
          newName: syncItem.name,
        });
      }
      // Track archived status changes
      if (!localItem.is_archived && syncItem.is_archived) {
        archivedItems.push(syncItem);
      }
      // Replace all properties from syncItem
      localMap.set(syncItem.id, {
        ...syncItem,
      });
    }
  }

  // If this is a full sync, remove items not in syncData
  if (isFullSync) {
    for (const localId of localMap.keys()) {
      if (!processedIds.has(localId)) {
        const item = localMap.get(localId);
        oldIds.push(item);
        localMap.delete(localId);
      }
    }
  }

  todoistData[resourceName] = Array.from(localMap.values());

  return {
    newIds,
    oldIds,
    updatedItems,
    archivedItems,
    updatedNameCount: updatedItems.length,
  };
}
