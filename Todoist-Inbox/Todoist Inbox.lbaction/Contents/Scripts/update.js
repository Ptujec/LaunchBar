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

function performSync(syncToken = '*') {
  const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
    body: {
      sync_token: syncToken,
      resource_types: '["labels", "projects", "sections"]',
    },
  });

  if (result.error) {
    LaunchBar.alert('Todoist Action Error', result.error);
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

function resetUsageData() {
  const emptyUsageData = {
    projects: {},
    sections: {},
    labels: {},
    tasks: {},
  };

  saveUsageData(emptyUsageData, true);

  const response = LaunchBar.alert(
    'Todoist Inbox'.localize(),
    'All usage statistics cleared. Do you want to import statistics from existing tasks?'.localize(),
    'Ok',
    'Cancel',
  );
  switch (response) {
    case 0:
      importUsedWords();
    case 1:
      break;
  }
}

function importUsedWords() {
  LaunchBar.hide();

  const logPath = '/tmp/import_used_words_log.log';
  const logs = [];

  const addLog = (message) => {
    logs.push(message);
    LaunchBar.log(message);
  };

  const result = getRecentTasks();
  if (!result || !result.data || !result.data.results) {
    addLog('Error: Could not fetch recent tasks');
    File.writeText(logs.join('\n'), logPath);
    LaunchBar.openURL(File.fileURLForPath(logPath));
    return;
  }

  const tasks = result.data.results;
  const usageData = getUsageData();
  const todoistData = getTodoistData();

  // Create sets of existing task IDs for quick lookup
  const processedTaskIds = new Set(Object.keys(usageData.tasks || {}));

  // Create maps for project and section ID lookups
  const projectMap = new Map(todoistData.projects.map((p) => [p.id, p]));
  const sectionMap = new Map(todoistData.sections.map((s) => [s.id, s]));
  const labelMap = new Map(todoistData.labels.map((l) => [l.id, l]));

  let tasksProcessed = 0;
  let tasksSkipped = 0;
  let totalWordsAdded = 0;
  const stats = {
    projects: { itemsUpdated: 0, wordsAdded: 0 },
    sections: { itemsUpdated: 0, wordsAdded: 0 },
    labels: { itemsUpdated: 0, wordsAdded: 0 },
  };

  addLog(`Import Statistics - ${new Date().toISOString()}\n`);
  addLog(`Total recent tasks: ${tasks.length}`);
  addLog(`Already processed tasks: ${processedTaskIds.size}`);
  addLog(`Available projects: ${projectMap.size}`);
  addLog(`Available sections: ${sectionMap.size}`);
  addLog(`Available labels: ${labelMap.size}\n`);

  for (const task of tasks) {
    // Skip if task already processed
    if (processedTaskIds.has(task.id)) {
      tasksSkipped++;
      continue;
    }

    // Extract words from content and description
    const combinedText = `${task.content} ${task.description?.split('\n').join(' ') || ''}`;
    const words = buildWordsList(combinedText);

    // Store task record for future reference
    if (!usageData.tasks) {
      usageData.tasks = {};
    }
    usageData.tasks[task.id] = {
      added_at: task.added_at,
    };

    // Update section usage OR project usage (not both)
    // If task has a section, only update section; otherwise update project
    if (task.section_id) {
      const sectionId = task.section_id;

      // Ensure section entry exists with proper structure
      if (!usageData.sections[sectionId]) {
        usageData.sections[sectionId] = {
          usedWords: {},
          usage: 0,
          lastUsedDate: task.added_at,
        };
      } else {
        // Ensure usedWords property exists (in case section was empty)
        if (!usageData.sections[sectionId].usedWords) {
          usageData.sections[sectionId].usedWords = {};
        }
      }

      // Update lastUsedDate if newer
      if (
        !usageData.sections[sectionId].lastUsedDate ||
        new Date(task.added_at) >
          new Date(usageData.sections[sectionId].lastUsedDate)
      ) {
        usageData.sections[sectionId].lastUsedDate = task.added_at;
      }

      // Increment usage count
      usageData.sections[sectionId].usage =
        (usageData.sections[sectionId].usage || 0) + 1;

      // Add word counts
      for (const word of words) {
        usageData.sections[sectionId].usedWords[word] =
          (usageData.sections[sectionId].usedWords[word] || 0) + 1;
      }

      stats.sections.itemsUpdated++;
      stats.sections.wordsAdded += words.length;
      totalWordsAdded += words.length;
    } else if (task.project_id) {
      const projectId = task.project_id;

      // Ensure project entry exists with proper structure
      if (!usageData.projects[projectId]) {
        usageData.projects[projectId] = {
          usedWords: {},
          usage: 0,
          lastUsedDate: task.added_at,
        };
      } else {
        // Ensure usedWords property exists (in case project was empty)
        if (!usageData.projects[projectId].usedWords) {
          usageData.projects[projectId].usedWords = {};
        }
      }

      // Update lastUsedDate if newer
      if (
        !usageData.projects[projectId].lastUsedDate ||
        new Date(task.added_at) >
          new Date(usageData.projects[projectId].lastUsedDate)
      ) {
        usageData.projects[projectId].lastUsedDate = task.added_at;
      }

      // Increment usage count
      usageData.projects[projectId].usage =
        (usageData.projects[projectId].usage || 0) + 1;

      // Add word counts
      for (const word of words) {
        usageData.projects[projectId].usedWords[word] =
          (usageData.projects[projectId].usedWords[word] || 0) + 1;
      }

      stats.projects.itemsUpdated++;
      stats.projects.wordsAdded += words.length;
      totalWordsAdded += words.length;
    }

    // Update label usage
    if (task.labels && Array.isArray(task.labels)) {
      for (const labelName of task.labels) {
        // Find label ID by name
        const label = Array.from(labelMap.values()).find(
          (l) => l.name === labelName,
        );
        if (label) {
          const labelId = label.id;

          // Ensure label entry exists with proper structure
          if (!usageData.labels[labelId]) {
            usageData.labels[labelId] = {
              usedWords: {},
              usage: 0,
              lastUsedDate: task.added_at,
            };
            stats.labels.itemsUpdated++;
          } else {
            // Ensure usedWords property exists (in case label was empty)
            if (!usageData.labels[labelId].usedWords) {
              usageData.labels[labelId].usedWords = {};
            }
          }

          // Update lastUsedDate if newer
          if (
            !usageData.labels[labelId].lastUsedDate ||
            new Date(task.added_at) >
              new Date(usageData.labels[labelId].lastUsedDate)
          ) {
            usageData.labels[labelId].lastUsedDate = task.added_at;
          }

          // Increment usage count
          usageData.labels[labelId].usage =
            (usageData.labels[labelId].usage || 0) + 1;

          // Add word counts
          for (const word of words) {
            usageData.labels[labelId].usedWords[word] =
              (usageData.labels[labelId].usedWords[word] || 0) + 1;
          }

          stats.labels.wordsAdded += words.length;
        }
      }
    }

    tasksProcessed++;
  }

  if (tasksProcessed > 0) {
    saveUsageData(usageData, true);
  }

  // Log summary
  addLog(`\n--- Import Summary ---`);
  addLog(`New tasks processed: ${tasksProcessed}`);
  addLog(`Already processed tasks updated: ${tasksSkipped}`);
  addLog(`Total words added: ${totalWordsAdded}\n`);

  addLog(
    `Projects: ${stats.projects.itemsUpdated} items updated, ${stats.projects.wordsAdded} words added`,
  );
  addLog(
    `Sections: ${stats.sections.itemsUpdated} items updated, ${stats.sections.wordsAdded} words added`,
  );
  addLog(
    `Labels: ${stats.labels.itemsUpdated} items updated, ${stats.labels.wordsAdded} words added`,
  );

  // Write logs to file
  File.writeText(logs.join('\n'), logPath);

  LaunchBar.openURL(File.fileURLForPath(logPath));
}

function getRecentTasks() {
  const filter = encodeURI('created after: -30 days');

  const result = HTTP.getJSON(
    `https://api.todoist.com/api/v1/tasks/filter?query=${filter}&limit=200`,
    {
      headerFields: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );

  // const result = File.readJSON(`${Action.supportPath}/test.json`);

  if (result.error) {
    LaunchBar.alert('Todoist Action Error', result.error);
    return null;
  }

  if (result.response.status != 200) {
    LaunchBar.alert(
      'Todoist Action Error',
      `${result.response.status}: ${result.response.localizedStatus}: ${result.data}`,
    );

    if (result.response.status == 401) {
      Action.preferences.apiToken = undefined; // to promt API token entry dialog
    }

    return;
  }

  return result;
}
