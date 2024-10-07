/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function update() {
  LaunchBar.hide(); // causes notification not to show when the api key was set just before the updating process

  const apiToken = Action.preferences.apiToken; // Repeated because if ApiToken is set right before this it returns "undifined"

  let newProjectIds,
    oldProjectIds = [],
    newSectionIds,
    oldSectionIds = [],
    newLabelIds,
    oldLabelIds = [],
    updatedProjectNameCount = 0,
    updatedSectionNameCount = 0,
    updatedLabelNameCount = 0;

  // Projects
  const projectsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v2/projects',
    {
      headerFields: {
        Authorization: 'Bearer ' + apiToken,
      },
    }
  );

  if (projectsOnline.error) {
    LaunchBar.alert(projectsOnline.error);
  }

  if (!File.exists(projectsPath)) {
    File.writeJSON(projectsOnline, projectsPath);
    newProjectIds = projectsOnline.data; // for Counter
  } else {
    const projectsLocal = File.readJSON(projectsPath);

    // Update project names
    projectsLocal.data = projectsLocal.data.map((localProject) => {
      const onlineProject = projectsOnline.data.find(
        (project) => project.id === localProject.id
      );
      if (onlineProject && localProject.name !== onlineProject.name) {
        localProject.name = onlineProject.name;
        updatedProjectNameCount++;
      }
      return localProject;
    });

    // Add new projects
    const localProjectIds = projectsLocal.data.map((ch) => ch.id);
    newProjectIds = projectsOnline.data.filter(
      (ch) => !localProjectIds.includes(ch.id)
    );

    for (const id of newProjectIds) {
      projectsLocal.data.push(id);
    }

    // Remove old projects
    const onlineProjectIds = projectsOnline.data.map((ch) => ch.id);
    oldProjectIds = projectsLocal.data.filter(
      (ch) => !onlineProjectIds.includes(ch.id)
    );

    projectsLocal.data = projectsLocal.data.filter(
      (project) => !oldProjectIds.includes(project)
    );

    File.writeJSON(projectsLocal, projectsPath);
  }

  // Sections
  const sectionsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v2/sections',
    {
      headerFields: {
        Authorization: 'Bearer ' + apiToken,
      },
    }
  );

  if (sectionsOnline.error) {
    LaunchBar.alert(sectionsOnline.error);
  }

  if (!File.exists(sectionsPath)) {
    File.writeJSON(sectionsOnline, sectionsPath);
    newSectionIds = sectionsOnline.data;
  } else {
    const sectionsLocal = File.readJSON(sectionsPath);

    // Update section names
    let updatedSectionNameCount = 0;

    sectionsLocal.data = sectionsLocal.data.map((localSection) => {
      const onlineSection = sectionsOnline.data.find(
        (section) => section.id === localSection.id
      );
      if (onlineSection && onlineSection.name !== localSection.name) {
        localSection.name = onlineSection.name;
        updatedSectionNameCount++;
      }
      return localSection;
    });

    // Add new sections
    const localSectionIds = sectionsLocal.data.map((ch) => ch.id);
    newSectionIds = sectionsOnline.data.filter(
      (ch) => !localSectionIds.includes(ch.id)
    );

    for (const id of newSectionIds) {
      sectionsLocal.data.push(id);
    }

    // Remove old sectionss
    const onlineSectionIds = sectionsOnline.data.map((ch) => ch.id);
    oldSectionIds = sectionsLocal.data.filter(
      (ch) => !onlineSectionIds.includes(ch.id)
    );

    sectionsLocal.data = sectionsLocal.data.filter(
      (section) => !oldSectionIds.includes(section)
    );

    File.writeJSON(sectionsLocal, sectionsPath);
  }

  // Labels
  const labelsOnline = HTTP.getJSON('https://api.todoist.com/rest/v2/labels', {
    headerFields: {
      Authorization: 'Bearer ' + apiToken,
    },
  });

  if (labelsOnline.error) {
    LaunchBar.alert(labelsOnline.error);
  }

  if (!File.exists(labelsPath)) {
    File.writeJSON(labelsOnline, labelsPath);
    newLabelIds = labelsOnline.data;
  } else {
    const labelsLocal = File.readJSON(labelsPath);

    // Update label names
    labelsLocal.data = labelsLocal.data.map((localLabel) => {
      const onlineLabel = labelsOnline.data.find(
        (label) => label.id === localLabel.id
      );
      if (onlineLabel && onlineLabel.name !== localLabel.name) {
        localLabel.name = onlineLabel.name;
        updatedLabelNameCount++;
      }
      return localLabel;
    });

    // Add new labels
    const localLabelIds = labelsLocal.data.map((ch) => ch.id);
    newLabelIds = labelsOnline.data.filter(
      (ch) => !localLabelIds.includes(ch.id)
    );

    for (const id of newLabelIds) {
      labelsLocal.data.push(id);
    }

    // Remove old labels
    const onlineLabelIds = labelsOnline.data.map((ch) => ch.id);
    oldLabelIds = labelsLocal.data.filter(
      (ch) => !onlineLabelIds.includes(ch.id)
    );

    labelsLocal.data = labelsLocal.data.filter(
      (label) => !oldLabelIds.includes(label)
    );

    File.writeJSON(labelsLocal, labelsPath);
  }

  // Changes Notification
  const changes =
    newSectionIds.length +
    oldSectionIds.length +
    newLabelIds.length +
    oldLabelIds.length +
    newProjectIds.length +
    oldProjectIds.length +
    updatedSectionNameCount +
    updatedLabelNameCount +
    updatedProjectNameCount;

  LaunchBar.displayNotification({
    title: 'Projects, sections & labels updated.'.localize(),
    string: changes + ' change(s)'.localize(),
  });
}
