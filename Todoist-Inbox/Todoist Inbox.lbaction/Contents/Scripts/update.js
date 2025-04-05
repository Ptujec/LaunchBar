/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2025-04-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function update() {
  LaunchBar.hide(); // causes notification not to show when the api key was set just before the updating process

  const apiToken = Action.preferences.apiToken;

  // Projects
  const projectsOnline = HTTP.getJSON(
    'https://api.todoist.com/api/v1.0/projects',
    {
      headerFields: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (projectsOnline.error) {
    LaunchBar.alert(projectsOnline.error);
    return;
  }

  // Sections
  const sectionsOnline = HTTP.getJSON(
    'https://api.todoist.com/api/v1.0/sections',
    {
      headerFields: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (sectionsOnline.error) {
    LaunchBar.alert(sectionsOnline.error);
    return;
  }

  // Labels
  const labelsOnline = HTTP.getJSON('https://api.todoist.com/api/v1.0/labels', {
    headerFields: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (labelsOnline.error) {
    LaunchBar.alert(labelsOnline.error);
    return;
  }

  const projectsResult = updateResourceData(projectsOnline, projectsPath);
  const sectionsResult = updateResourceData(sectionsOnline, sectionsPath);
  const labelsResult = updateResourceData(labelsOnline, labelsPath);

  // Calculate total changes
  const changes = [projectsResult, sectionsResult, labelsResult].reduce(
    (total, result) => {
      return (
        total +
        result.newIds.length +
        result.oldIds.length +
        result.updatedNameCount
      );
    },
    0
  );

  LaunchBar.displayNotification({
    title: 'Projects, sections & labels updated.'.localize(),
    string: `${changes} change(s)`.localize(),
  });
}

function updateResourceData(onlineData, localPath) {
  let newIds = [];
  let oldIds = [];
  let updatedNameCount = 0;

  if (!File.exists(localPath)) {
    File.writeJSON(onlineData, localPath);
    return {
      newIds: onlineData.data.results,
      oldIds: [],
      updatedNameCount: 0,
    };
  }

  const localData = File.readJSON(localPath);

  // Update names
  localData.data.results = localData.data.results.map((localItem) => {
    const onlineItem = onlineData.data.results.find(
      (item) => item.id === localItem.id
    );
    if (onlineItem && localItem.name !== onlineItem.name) {
      localItem.name = onlineItem.name;
      updatedNameCount++;
    }
    return localItem;
  });

  // Add new items
  const localIds = localData.data.results.map((item) => item.id);
  newIds = onlineData.data.results.filter(
    (item) => !localIds.includes(item.id)
  );

  localData.data.results = [...localData.data.results, ...newIds];

  // Remove old items
  const onlineIds = onlineData.data.results.map((item) => item.id);
  oldIds = localData.data.results.filter(
    (item) => !onlineIds.includes(item.id)
  );

  localData.data.results = localData.data.results.filter(
    (item) => !oldIds.includes(item)
  );

  File.writeJSON(localData, localPath);

  return { newIds, oldIds, updatedNameCount };
}

function reset() {
  LaunchBar.hide();

  // Projects & Check
  const projectsOnline = HTTP.getJSON(
    'https://api.todoist.com/api/v1.0/projects',
    {
      headerFields: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (projectsOnline.error) {
    LaunchBar.alert(projectsOnline.error);
    return;
  }

  File.writeJSON(projectsOnline, projectsPath);

  // Sections
  const sectionsOnline = HTTP.getJSON(
    'https://api.todoist.com/api/v1.0/sections',
    {
      headerFields: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );
  File.writeJSON(sectionsOnline, sectionsPath);

  // Labels
  const labelsOnline = HTTP.getJSON('https://api.todoist.com/api/v1.0/labels', {
    headerFields: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  File.writeJSON(labelsOnline, labelsPath);

  // Notification
  LaunchBar.displayNotification({
    title: 'Projects, sections & labels reset.'.localize(),
  });
}

function migrateData() {
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

  LaunchBar.displayNotification({
    title: 'Todoist Action',
    string:
      'Data structure and IDs updated to conform to the new Todoist API'.localize(),
  });
}
