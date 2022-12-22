/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function update() {
  const apiToken = Action.preferences.apiToken; // Repeated because if ApiToken is set right before this it returns "undifined"

  LaunchBar.hide(); // causes notification not to show when the api key was set just before the updating process

  // Projects
  var projectsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v2/projects',
    {
      headerFields: {
        Authorization: 'Bearer ' + apiToken,
      },
    }
  );

  if (projectsOnline.error != undefined) {
    LaunchBar.alert(projectsOnline.error);
  } else {
    var updatedProjectNameCount = 0;

    if (!File.exists(projectsPath)) {
      File.writeJSON(projectsOnline, projectsPath);
      var newProjectIds = projectsOnline.data; // for Counter
      var oldProjectIds = [];
    } else {
      var projectsLocal = File.readJSON(projectsPath);

      // Update project names
      for (var i = 0; i < projectsLocal.data.length; i++) {
        projectsOnline.data.forEach(function (item) {
          if (item.id == projectsLocal.data[i].id) {
            if (item.name != projectsLocal.data[i].name) {
              projectsLocal.data[i].name = item.name;
              updatedProjectNameCount++;
            }
          }
        });
      }

      // Add new projects
      var localProjectIds = projectsLocal.data.map((ch) => ch.id);
      var newProjectIds = projectsOnline.data.filter(
        (ch) => !localProjectIds.includes(ch.id)
      );

      for (var i = 0; i < newProjectIds.length; i++) {
        projectsLocal.data.push(newProjectIds[i]);
      }

      // Remove old projects
      var onlineProjectIds = projectsOnline.data.map((ch) => ch.id);
      var oldProjectIds = projectsLocal.data.filter(
        (ch) => !onlineProjectIds.includes(ch.id)
      );

      for (var i = 0; i < oldProjectIds.length; i++) {
        for (var j = 0; j < projectsLocal.data.length; j++) {
          if (projectsLocal.data[j] == oldProjectIds[i]) {
            projectsLocal.data.splice(j, 1);
          }
        }
      }

      File.writeJSON(projectsLocal, projectsPath);
    }
  }

  // Sections
  var sectionsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v2/sections',
    {
      headerFields: {
        Authorization: 'Bearer ' + apiToken,
      },
    }
  );

  if (sectionsOnline.error != undefined) {
    LaunchBar.alert(sectionsOnline.error);
  } else {
    var updatedSectionNameCount = 0;

    if (!File.exists(sectionsPath)) {
      File.writeJSON(sectionsOnline, sectionsPath);
      var newSectionIds = sectionsOnline.data;
      var oldSectionIds = [];
    } else {
      var sectionsLocal = File.readJSON(sectionsPath);

      // Update section names
      for (var i = 0; i < sectionsLocal.data.length; i++) {
        sectionsOnline.data.forEach(function (item) {
          if (item.id == sectionsLocal.data[i].id) {
            if (item.name != sectionsLocal.data[i].name) {
              sectionsLocal.data[i].name = item.name;
              updatedSectionNameCount++;
            }
          }
        });
      }

      // Add new sections
      var localSectionIds = sectionsLocal.data.map((ch) => ch.id);
      var newSectionIds = sectionsOnline.data.filter(
        (ch) => !localSectionIds.includes(ch.id)
      );

      for (var i = 0; i < newSectionIds.length; i++) {
        sectionsLocal.data.push(newSectionIds[i]);
      }

      // Remove old sectionss
      var onlineSectionIds = sectionsOnline.data.map((ch) => ch.id);
      var oldSectionIds = sectionsLocal.data.filter(
        (ch) => !onlineSectionIds.includes(ch.id)
      );

      for (var i = 0; i < oldSectionIds.length; i++) {
        for (var j = 0; j < sectionsLocal.data.length; j++) {
          if (sectionsLocal.data[j] == oldSectionIds[i]) {
            sectionsLocal.data.splice(j, 1);
          }
        }
      }

      File.writeJSON(sectionsLocal, sectionsPath);
    }
  }

  // Labels
  var labelsOnline = HTTP.getJSON('https://api.todoist.com/rest/v2/labels', {
    headerFields: {
      Authorization: 'Bearer ' + apiToken,
    },
  });

  if (labelsOnline.error != undefined) {
    LaunchBar.alert(labelsOnline.error);
  } else {
    var updatedLabelNameCount = 0;

    if (!File.exists(labelsPath)) {
      File.writeJSON(labelsOnline, labelsPath);
      var newLabelIds = labelsOnline.data;
      var oldLabelIds = [];
    } else {
      var labelsLocal = File.readJSON(labelsPath);

      // Update label names
      for (var i = 0; i < labelsLocal.data.length; i++) {
        labelsOnline.data.forEach(function (item) {
          if (item.id == labelsLocal.data[i].id) {
            if (item.name != labelsLocal.data[i].name) {
              labelsLocal.data[i].name = item.name;
              updatedLabelNameCount++;
            }
          }
        });
      }

      // Add new labels
      var localLabelIds = labelsLocal.data.map((ch) => ch.id);
      var newLabelIds = labelsOnline.data.filter(
        (ch) => !localLabelIds.includes(ch.id)
      );

      for (var i = 0; i < newLabelIds.length; i++) {
        labelsLocal.data.push(newLabelIds[i]);
      }

      // Remove old labels
      var onlineLabelIds = labelsOnline.data.map((ch) => ch.id);
      var oldLabelIds = labelsLocal.data.filter(
        (ch) => !onlineLabelIds.includes(ch.id)
      );

      for (var i = 0; i < oldLabelIds.length; i++) {
        for (var j = 0; j < labelsLocal.data.length; j++) {
          if (labelsLocal.data[j] == oldLabelIds[i]) {
            labelsLocal.data.splice(j, 1);
          }
        }
      }

      File.writeJSON(labelsLocal, labelsPath);
    }
  }

  // Changes Notification
  var changes =
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
    title: updateNotificationTitle,
    string: changes + updateNotificationString,
  });
}
