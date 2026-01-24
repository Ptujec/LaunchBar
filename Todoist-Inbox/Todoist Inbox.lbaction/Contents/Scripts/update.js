/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2025-04-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function update() {
  LaunchBar.hide();

  const apiToken = Action.preferences.apiToken;
  const timestamp = new Date().toLocaleString('sv').replace(/[: ]/g, '-');
  const logPath = `/tmp/todoist_inbox_log_${timestamp}.log`;

  const fetchResource = (endpoint) =>
    HTTP.getJSON(`https://api.todoist.com/api/v1.0/${endpoint}?limit=200`, {
      headerFields: { Authorization: `Bearer ${apiToken}` },
    });

  // Fetch all resources
  const resources = [
    { name: 'projects', data: fetchResource('projects') },
    { name: 'sections', data: fetchResource('sections') },
    { name: 'labels', data: fetchResource('labels') },
  ];

  // Check for errors
  const error = resources.find((r) => r.data.error);
  if (error) {
    LaunchBar.alert(error.data.error);
    return;
  }

  // Process all resources
  const results = resources.map(({ name, data }) => ({
    type: name,
    changes: updateResourceData(data, eval(`${name}Path`)),
  }));

  // Generate log
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

  // Write log file
  File.writeText(log, logPath);

  // Calculate total changes
  const totalChanges = results.reduce(
    (total, { changes }) =>
      total +
      changes.newIds.length +
      changes.oldIds.length +
      changes.updatedItems.length,
    0
  );

  LaunchBar.displayNotification({
    title: 'Projects, sections & labels updated.'.localize(),
    string: `${totalChanges}${' change(s)'.localize()}\n${'Click to open log!'.localize()}`,
    url: File.fileURLForPath(logPath),
  });
}

function formatChanges(type, { newIds, oldIds, updatedItems }) {
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
          ({ oldName, newName }) => `"${oldName}" → "${newName}"`
        ) ?? [],
    },
  ];

  return sections
    .filter((section) => section.items.length > 0)
    .map(
      ({ title, items }) =>
        `- ${title} (${items.length}):\n  • ${items.join('\n  • ')}`
    )
    .join('\n\n');
}

function updateResourceData(onlineData, localPath) {
  if (!File.exists(localPath)) {
    File.writeJSON(onlineData, localPath);
    return {
      newIds: onlineData.data.results,
      oldIds: [],
      updatedItems: [],
      updatedNameCount: 0,
    };
  }

  const localData = File.readJSON(localPath);
  const localResults = localData.data.results;
  const onlineResults = onlineData.data.results;

  // Track name updates
  const updatedItems = localResults
    .map((localItem) => {
      const onlineItem = onlineResults.find((item) => item.id === localItem.id);
      if (onlineItem && localItem.name !== onlineItem.name) {
        return {
          oldName: localItem.name,
          newName: onlineItem.name,
          id: localItem.id,
        };
      }
      return null;
    })
    .filter(Boolean);

  // Update all data except usage and usedWords
  localData.data.results = localResults.map((localItem) => {
    const onlineItem = onlineResults.find((item) => item.id === localItem.id);
    if (onlineItem) {
      return {
        ...onlineItem,
        usage: localItem.usage || 0,
        usedWords: localItem.usedWords || [],
      };
    }
    return localItem;
  });

  // Find new and removed items
  const localIds = new Set(localResults.map((item) => item.id));
  const onlineIds = new Set(onlineResults.map((item) => item.id));

  const newIds = onlineResults.filter((item) => !localIds.has(item.id));
  const oldIds = localResults.filter((item) => !onlineIds.has(item.id));

  // Update local data with new items
  localData.data.results = [
    ...localData.data.results.filter((item) => onlineIds.has(item.id)),
    ...newIds.map((item) => ({
      ...item,
      usage: 0,
      usedWords: [],
    })),
  ];

  File.writeJSON(localData, localPath);

  return {
    newIds,
    oldIds,
    updatedItems,
    updatedNameCount: updatedItems.length,
  };
}

function reset() {
  LaunchBar.hide();

  const fetchResource = (endpoint) =>
    HTTP.getJSON(`https://api.todoist.com/api/v1.0/${endpoint}?limit=200`, {
      headerFields: { Authorization: `Bearer ${apiToken}` },
    });

  // Projects & Check
  const projectsOnline = fetchResource('projects');
  if (projectsOnline.error) {
    LaunchBar.alert(projectsOnline.error);
    return;
  }

  // Reset all resources
  const resources = [
    { data: projectsOnline, path: projectsPath },
    { data: fetchResource('sections'), path: sectionsPath },
    { data: fetchResource('labels'), path: labelsPath },
  ];

  resources.map(({ data, path }) => {
    File.writeJSON(data, path);
    return path;
  });

  // Notification
  LaunchBar.displayNotification({
    title: 'Projects, sections & labels reset.'.localize(),
  });
}

function migrateData() {
  LaunchBar.displayNotification({
    title: 'Migrating data...'.localize(),
    string: 'Please wait...'.localize(),
  });

  const files = [projectsPath, sectionsPath, labelsPath];

  files.map((file) => {
    if (File.exists(file)) {
      const data = File.readJSON(file);
      if (data.data && !data.data.results) {
        File.writeJSON({ data: { results: data.data } }, file);
      }
    }
  });

  // Then migrate IDs https://todoist.com/api/v1/docs
  const fileTypes = [
    { path: projectsPath, type: 'projects' },
    { path: sectionsPath, type: 'sections' },
    // no new ids for labels
  ];

  // First handle projects to get ID mappings
  let projectIdMappings = {};
  const projectPath = fileTypes[0].path;
  if (File.exists(projectPath)) {
    const projectData = File.readJSON(projectPath);
    const projectOldIds = projectData.data.results
      .map((item) => item.id)
      .join(',');
    if (projectOldIds) {
      const mappings = HTTP.getJSON(
        `https://api.todoist.com/api/v1.0/id_mappings/projects/${projectOldIds}`,
        { headerFields: { Authorization: `Bearer ${apiToken}` } }
      );

      if (!mappings.error) {
        projectIdMappings = mappings.data.reduce(
          (acc, { old_id, new_id }) => ({ ...acc, [old_id]: new_id }),
          {}
        );

        // Update project IDs
        projectData.data.results = projectData.data.results.map((item) => ({
          ...item,
          id: projectIdMappings[item.id] || item.id,
          parent_id: projectIdMappings[item.parent_id] || item.parent_id,
        }));

        File.writeJSON(projectData, projectPath);
      }
    }
  }

  // Then handle sections using the project mappings
  const sectionPath = fileTypes[1].path;
  if (File.exists(sectionPath)) {
    const sectionData = File.readJSON(sectionPath);
    const sectionOldIds = sectionData.data.results
      .map((item) => item.id)
      .join(',');
    if (sectionOldIds) {
      const mappings = HTTP.getJSON(
        `https://api.todoist.com/api/v1.0/id_mappings/sections/${sectionOldIds}`,
        { headerFields: { Authorization: `Bearer ${apiToken}` } }
      );

      if (!mappings.error) {
        const sectionIdMappings = mappings.data.reduce(
          (acc, { old_id, new_id }) => ({ ...acc, [old_id]: new_id }),
          {}
        );

        // Update both section IDs and project IDs
        sectionData.data.results = sectionData.data.results.map((item) => ({
          ...item,
          id: sectionIdMappings[item.id] || item.id,
          project_id: projectIdMappings[item.project_id] || item.project_id,
        }));

        File.writeJSON(sectionData, sectionPath);
      }
    }
  }

  update();

  LaunchBar.displayNotification({
    title: 'Todoist Action',
    string:
      'Data structure and IDs updated to conform to the new Todoist API'.localize(),
  });
}
