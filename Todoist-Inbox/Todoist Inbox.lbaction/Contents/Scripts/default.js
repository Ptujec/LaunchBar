/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources:
- https://developer.todoist.com/rest/v2/#create-a-new-task
- https://todoist.com/help/articles/set-a-recurring-due-date#some-examples-of-recurring-due-dates
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

Stopwords:
- https://github.com/stopwords-iso/stopwords-de
- https://github.com/stopwords-iso/stopwords-iso/blob/master/python/stopwordsiso/stopwords-iso.json
*/

include('constants.js');
include('localization.js');
include('setKey.js');
include('update.js');

function run(argument) {
  if (apiToken == undefined) {
    setApiKey();
  } else {
    if (LaunchBar.options.shiftKey) {
      var output = settings();
      return output;
    } else {
      argument = argument + ' '; // The added space is because Launchbar trims the argument (which does not catch if just a priority is entered and will take it as the task name)

      // Priority
      if (/(p[1-3] )|( p[1-3])/.test(argument)) {
        var m = argument.match(/p[1-3]/);
        if (m == 'p1') {
          var prioValue = 4;
          var prioText = p1;
        } else if (m == 'p2') {
          var prioValue = 3;
          var prioText = p2;
        } else if (m == 'p3') {
          var prioValue = 2;
          var prioText = p3;
        }
        argument = argument.replace(/(p[1-3] )|( p[1-3])/, '');
      } else {
        var prioValue = 1;
        var prioText = '';
      }

      // Due/date String
      var dueString = '';

      if (argument.includes(' @')) {
        // with @ (should work for most cenarios except for "@date <title>")
        dueString = argument.match(/ @(.*?)(p\d|((^| )#($| ))|$)/)[1].trim();

        argument = argument
          .replace(/ @(.*?)(p\d|((^| )#($| ))|$)/, '$2')
          .trim();
      } else {
        // dateStrings
        for (var i = 0; i < dateStrings.length; i++) {
          var dateString = dateStrings[i];
          var re = new RegExp('(^| )' + dateString + '($| )', 'i');
          if (re.test(argument)) {
            dueString = argument.match(re)[0].trim();
            argument = argument.replace(re, ' ');
          }
        }
      }

      // Description
      if (argument.includes(': ')) {
        var description = argument.match(/(?:\: )(.*)/)[1];

        // Capitalize first character of description
        description =
          description.charAt(0).toUpperCase() + description.slice(1);

        argument = argument.replace(/(?:\: )(.*)/, '');
      }

      argument = argument.replace(/\s+/g, ' ').trim();

      // Capitalize first character of the content/title
      argument = argument.charAt(0).toUpperCase() + argument.slice(1);

      Action.preferences.taskDict = {
        content: argument,
        description: description,
        dueString: dueString,
        prioValue: prioValue,
        prioText: prioText,
        lang: lang,
      };

      if (LaunchBar.options.commandKey) {
        if (argument == '') {
          LaunchBar.alert(missingArg);
          return;
        }
        var output = advancedOptions();
        return output;
      } else {
        if (argument == '') {
          LaunchBar.alert(missingArg);
          return;
        }
        postTask();
      }
    }
  }
}

function advancedOptions() {
  if (
    !File.exists(projectsPath) ||
    !File.exists(sectionsPath) ||
    !File.exists(labelsPath)
  ) {
    LaunchBar.alert(updateNeeded);
    update();
  }

  var taskDict = Action.preferences.taskDict;

  var resultProjects = [];
  var resultPrioritized = [];
  var projects = File.readJSON(projectsPath).data;

  // Projects
  for (var i = 0; i < projects.length; i++) {
    var name = projects[i].name;
    if (name == 'Inbox') {
      name = inboxName;
    }
    var id = projects[i].id;

    if (taskDict.description != undefined) {
      var content = taskDict.content + ': ' + taskDict.description;
    } else {
      var content = taskDict.content;
    }

    if (taskDict.dueString != '') {
      var sub =
        content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub = content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    if (projects[i].usage == undefined) {
      var usage = 0;
    } else {
      var usage = projects[i].usage;
    }

    var pushDataProject = {
      title: name,
      subtitle: sub,
      icon: 'projectTemplate',
      usage: usage,
      action: 'postTask',
      actionArgument: {
        type: 'project',
        id: id,
        index: i,
      },
    };

    var words = taskDict.content
      .replace(/\[(.+)\]\(.+\)/, '$1')
      .match(/[a-zäüööčžšß]+/gi);

    var taskDictWords = [];
    for (var j = 0; j < words.length; j++) {
      taskDictWords.push(words[j].toLowerCase());
    }
    Action.preferences.taskDict.words = taskDictWords;
    words = taskDictWords;

    // Prioritize projects with matching title and/or words
    if (projects[i].usedWords != undefined) {
      if (words.includes(projects[i].name.toLowerCase())) {
        var matchCount = 2; // 2 to prioritize it more … might change back to 1
      } else {
        var matchCount = 0;
      }

      for (var k = 0; k < words.length; k++) {
        if (projects[i].usedWords.includes(words[k].toLowerCase())) {
          matchCount = matchCount + 1;
        }
      }

      if (matchCount > 0) {
        pushDataProject.matchCount = matchCount;
        resultPrioritized.push(pushDataProject);
      } else {
        resultProjects.push(pushDataProject);
      }
    } else {
      if (words.includes(projects[i].name.toLowerCase())) {
        pushDataProject.matchCount = 2; // 2 to prioritize it more … might change back to 1
        resultPrioritized.push(pushDataProject);
      } else {
        resultProjects.push(pushDataProject);
      }
    }
  }

  // Sections
  var resultSections = [];
  var sections = File.readJSON(sectionsPath).data;

  for (var i = 0; i < sections.length; i++) {
    var name = sections[i].name;
    var id = sections[i].id;
    var sectionProjectId = sections[i].project_id;

    projects.forEach(function (item) {
      if (item.id == sectionProjectId) {
        sectionProjectName = item.name;
      }
    });

    if (taskDict.description != undefined) {
      var content = taskDict.content + ': ' + taskDict.description;
    } else {
      var content = taskDict.content;
    }

    if (taskDict.dueString != '') {
      var sub =
        content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub = content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    if (sections[i].usage == undefined) {
      var usage = 0;
    } else {
      var usage = sections[i].usage;
    }

    var pushDataSection = {
      title: name + ' (' + sectionProjectName + ')',
      subtitle: sub,
      icon: 'sectionTemplate',
      usage: usage,
      action: 'postTask',
      actionArgument: {
        type: 'section',
        id: id,
        sectionProjectId: sectionProjectId,
        index: i,
      },
    };

    var words = taskDict.content
      .replace(/\[(.+)\]\(.+\)/, '$1')
      .match(/[a-zäüööčžšß]+/gi);

    var taskDictWords = [];
    for (var j = 0; j < words.length; j++) {
      taskDictWords.push(words[j].toLowerCase());
    }
    Action.preferences.taskDict.words = taskDictWords;
    words = taskDictWords;

    // Prioritize sections with matching title and/or words
    if (sections[i].usedWords != undefined) {
      if (words.includes(sections[i].name.toLowerCase())) {
        var matchCount = 2; // 2 to prioritize it more … might change back to 1
      } else {
        var matchCount = 0;
      }

      for (var k = 0; k < words.length; k++) {
        if (sections[i].usedWords.includes(words[k].toLowerCase())) {
          matchCount = matchCount + 1;
        }
      }

      if (matchCount > 0) {
        pushDataSection.matchCount = matchCount;
        resultPrioritized.push(pushDataSection);
      } else {
        resultSections.push(pushDataSection);
      }
    } else {
      if (words.includes(sections[i].name.toLowerCase())) {
        pushDataSection.matchCount = 2; // 2 to prioritize it more … might change back to 1
        resultPrioritized.push(pushDataSection);
      } else {
        resultSections.push(pushDataSection);
      }
    }
  }

  var resultLabels = [];
  var labels = File.readJSON(labelsPath).data;
  for (var i = 0; i < labels.length; i++) {
    var name = labels[i].name;
    var id = labels[i].id;

    if (taskDict.description != undefined) {
      var content = taskDict.content + ': ' + taskDict.description;
    } else {
      var content = taskDict.content;
    }

    if (taskDict.dueString != '') {
      var sub =
        content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub = content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    if (labels[i].usage == undefined) {
      var usage = 0;
    } else {
      var usage = labels[i].usage;
    }

    var pushDataLabel = {
      title: name,
      subtitle: sub,
      icon: 'labelTemplate',
      usage: usage,
      action: 'addProject',
      actionArgument: {
        name: name,
        id: id,
        index: i,
      },
    };

    // Prioritize labels with matching title and/or words
    if (labels[i].usedWords != undefined) {
      if (words.includes(labels[i].name.toLowerCase())) {
        var labelMatchCount = 2; // 2 to prioritize it more … might change back to 1
      } else {
        var labelMatchCount = 0;
      }

      for (var j = 0; j < words.length; j++) {
        if (labels[i].usedWords.includes(words[j].toLowerCase())) {
          labelMatchCount = labelMatchCount + 1;
        }
      }

      if (labelMatchCount > 0) {
        pushDataLabel.matchCount = labelMatchCount;
        resultPrioritized.push(pushDataLabel);
      } else {
        resultLabels.push(pushDataLabel);
      }
    } else {
      if (words.includes(labels[i].name.toLowerCase())) {
        pushDataLabel.matchCount = 2; // 2 to prioritize it more … might change back to 1
        resultPrioritized.push(pushDataLabel);
      } else {
        resultLabels.push(pushDataLabel);
      }
    }
  }

  resultPrioritized.sort(function (a, b) {
    return b.matchCount - a.matchCount || b.usage - a.usage;
  });

  var all = resultProjects.concat(resultSections.concat(resultLabels));

  all.sort(function (a, b) {
    return b.usage - a.usage;
  });

  var result = resultPrioritized.concat(all);
  return result;
}

function addProject(labelDict) {
  var labelName = labelDict.name;
  var labelIndex = labelDict.index;
  var taskDict = Action.preferences.taskDict;
  var labels = File.readJSON(labelsPath).data;
  var lastUsed = labels[labelIndex].lastUsed;
  var lastUsedCategoryId = labels[labelIndex].lastUsedCategoryId;
  var lastUsedSectionId = labels[labelIndex].lastUsedSectionId;

  var pinnedItem = [];
  var projectItems = [];
  var sectionItems = [];

  // Projects
  var projects = File.readJSON(projectsPath).data;
  for (var i = 0; i < projects.length; i++) {
    var name = projects[i].name;
    if (name == 'Inbox') {
      name = inboxName;
    }
    var id = projects[i].id;

    if (taskDict.description != undefined) {
      var content = taskDict.content + ': ' + taskDict.description;
    } else {
      var content = taskDict.content;
    }

    if (taskDict.dueString != '') {
      var sub =
        '@' +
        labelName +
        ': ' +
        content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub = '@' + labelName + ': ' + content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    var projectPushData = {
      title: name,
      subtitle: sub,
      icon: 'projectTemplate',
      action: 'postTask',
      actionArgument: {
        type: 'projectAndLabel',
        id: id,
        index: i,
        labelName: labelName,
        labelIndex: labelIndex,
      },
    };

    if (lastUsed == 'project' || lastUsed == undefined) {
      if (lastUsedCategoryId != undefined && lastUsedCategoryId == id) {
        pinnedItem.push(projectPushData);
      } else {
        projectItems.push(projectPushData);
      }
    } else {
      projectItems.push(projectPushData);
    }
  }

  // Sections
  var sections = File.readJSON(sectionsPath).data;
  for (var i = 0; i < sections.length; i++) {
    var name = sections[i].name;
    var id = sections[i].id;
    var sectionProjectId = sections[i].project_id;

    projects.forEach(function (item) {
      if (item.id == sectionProjectId) {
        sectionProjectName = item.name;
      }
    });

    if (taskDict.description != undefined) {
      var content = taskDict.content + ': ' + taskDict.description;
    } else {
      var content = taskDict.content;
    }

    if (taskDict.dueString != '') {
      var sub =
        '@' +
        labelName +
        ': ' +
        content +
        dueStringTitle +
        taskDict.dueString +
        ', ' +
        taskDict.prioText;
    } else {
      var sub = '@' + labelName + ': ' + content + ', ' + taskDict.prioText;
    }
    sub = sub.trim().replace(/,$/, '');

    var sectionPushData = {
      title: name + ' (' + sectionProjectName + ')',
      subtitle: sub,
      icon: 'sectionTemplate',
      action: 'postTask',
      actionArgument: {
        type: 'sectionAndLabel',
        id: id,
        sectionProjectId: sectionProjectId,
        index: i,
        labelName: labelName,
        labelIndex: labelIndex,
      },
    };

    if (lastUsed == 'section') {
      if (lastUsedSectionId != undefined && lastUsedSectionId == id) {
        pinnedItem.push(sectionPushData);
      } else {
        sectionItems.push(sectionPushData);
      }
    } else {
      sectionItems.push(sectionPushData);
    }
  }

  var result = pinnedItem.concat(projectItems.concat(sectionItems));
  return result;
}

function postTask(advancedData) {
  LaunchBar.hide();

  var taskDict = Action.preferences.taskDict;
  var sections = File.readJSON(sectionsPath);
  var projects = File.readJSON(projectsPath);
  var labels = File.readJSON(labelsPath);

  if (advancedData != undefined) {
    if (advancedData.type.includes('section')) {
      // Sections & Section with Labels
      var sectionIndex = advancedData.index;

      // Remember used words
      var sectionUsedWords = sections.data[sectionIndex].usedWords;
      if (sectionUsedWords == undefined) {
        sections.data[sectionIndex].usedWords = [];
        var sectionUsedWords = sections.data[sectionIndex].usedWords;
      }
      for (var i = 0; i < taskDict.words.length; i++) {
        if (
          !sectionUsedWords.includes(taskDict.words[i]) &&
          !stopwords.includes(taskDict.words[i].toLowerCase())
        ) {
          sectionUsedWords.push(taskDict.words[i].toLowerCase());
        }
      }

      // Count usage
      var sectionUsageCount = sections.data[sectionIndex].usage;
      if (sectionUsageCount == undefined) {
        sections.data[sectionIndex].usage = 1;
      } else {
        var newSectionCount = sectionUsageCount + 1;
        sections.data[sectionIndex].usage = newSectionCount;
      }

      if (advancedData.type == 'section') {
        var body = {
          content: taskDict.content,
          description: taskDict.description,
          due_lang: taskDict.lang,
          due_string: taskDict.dueString,
          priority: taskDict.prioValue,
          project_id: advancedData.sectionProjectId,
          section_id: advancedData.id,
        };
      } else if (advancedData.type == 'sectionAndLabel') {
        var labelName = advancedData.labelName;

        var body = {
          content: taskDict.content,
          description: taskDict.description,
          due_lang: taskDict.lang,
          due_string: taskDict.dueString,
          labels: [labelName],
          priority: taskDict.prioValue,
          project_id: advancedData.sectionProjectId,
          section_id: advancedData.id,
        };

        var labelIndex = advancedData.labelIndex;

        // Remember section used for the label
        labels.data[labelIndex].lastUsed = 'section';
        labels.data[labelIndex].lastUsedSectionId = advancedData.id;

        // Remember used words
        var labelUsedWords = labels.data[labelIndex].usedWords;
        if (labelUsedWords == undefined) {
          labels.data[labelIndex].usedWords = [];
          labelUsedWords = labels.data[labelIndex].usedWords;
        }
        for (var i = 0; i < taskDict.words.length; i++) {
          if (
            !labelUsedWords.includes(taskDict.words[i]) &&
            !stopwords.includes(taskDict.words[i].toLowerCase())
          ) {
            labelUsedWords.push(taskDict.words[i].toLowerCase());
          }
        }

        // Count usage
        var labelUsageCount = labels.data[labelIndex].usage;
        if (labelUsageCount == undefined) {
          labels.data[labelIndex].usage = 1;
        } else {
          var newLabelCount = labelUsageCount + 1;
          labels.data[labelIndex].usage = newLabelCount;
        }

        File.writeJSON(labels, labelsPath);
      }
      File.writeJSON(sections, sectionsPath);
    } else {
      // Projects & Projects with Labels
      var projectIndex = advancedData.index;

      // Remember used words
      var projectUsedWords = projects.data[projectIndex].usedWords;
      if (projectUsedWords == undefined) {
        projects.data[projectIndex].usedWords = [];
        var projectUsedWords = projects.data[projectIndex].usedWords;
      }
      for (var i = 0; i < taskDict.words.length; i++) {
        if (
          !projectUsedWords.includes(taskDict.words[i]) &&
          !stopwords.includes(taskDict.words[i].toLowerCase())
        ) {
          projectUsedWords.push(taskDict.words[i].toLowerCase());
        }
      }

      // Count usage
      var projectUsageCount = projects.data[projectIndex].usage;
      if (projectUsageCount == undefined) {
        projects.data[projectIndex].usage = 1;
      } else {
        var newProjectCount = projectUsageCount + 1;
        projects.data[projectIndex].usage = newProjectCount;
      }

      if (advancedData.type == 'project') {
        var body = {
          content: taskDict.content,
          description: taskDict.description,
          due_lang: taskDict.lang,
          due_string: taskDict.dueString,
          priority: taskDict.prioValue,
          project_id: advancedData.id,
        };
      } else if (advancedData.type == 'projectAndLabel') {
        var labelName = advancedData.labelName;

        var body = {
          content: taskDict.content,
          description: taskDict.description,
          due_lang: taskDict.lang,
          due_string: taskDict.dueString,
          labels: [labelName],
          priority: taskDict.prioValue,
          project_id: advancedData.id,
        };

        var labelIndex = advancedData.labelIndex;

        // Remember project used for the label
        labels.data[labelIndex].lastUsed = 'project';
        labels.data[labelIndex].lastUsedCategoryId = advancedData.id;

        // Remember used words
        var labelUsedWords = labels.data[labelIndex].usedWords;
        if (labelUsedWords == undefined) {
          labels.data[labelIndex].usedWords = [];
          var labelUsedWords = labels.data[labelIndex].usedWords;
        }
        for (var i = 0; i < taskDict.words.length; i++) {
          if (
            !labelUsedWords.includes(taskDict.words[i]) &&
            !stopwords.includes(taskDict.words[i].toLowerCase())
          ) {
            labelUsedWords.push(taskDict.words[i].toLowerCase());
          }
        }

        // Count usage
        var labelUsageCount = labels.data[labelIndex].usage;
        if (labelUsageCount == undefined) {
          labels.data[labelIndex].usage = 1;
        } else {
          var newLabelCount = labelUsageCount + 1;
          labels.data[labelIndex].usage = newLabelCount;
        }

        File.writeJSON(labels, labelsPath);
      }
      File.writeJSON(projects, projectsPath);
    }
  } else {
    var body = {
      content: taskDict.content,
      description: taskDict.description,
      due_lang: taskDict.lang,
      due_string: taskDict.dueString,
      priority: taskDict.prioValue,
    };
  }

  // Post

  var result = HTTP.postJSON(
    'https://api.todoist.com/rest/v2/tasks?token=' + apiToken,
    {
      body: body,
    }
  );

  if (result.error == undefined) {
    if (result.response.status != 200) {
      LaunchBar.displayNotification({
        title: 'Todoist Action Error',
        string:
          result.response.status +
          ': ' +
          result.response.localizedStatus +
          ': ' +
          result.data,
      });
      if (result.response.status == 401) {
        Action.preferences.apiToken = undefined; // to promt API token entry dialog
      }
    } else {
      if (Action.preferences.notifications != false) {
        // Confirmation notification
        var data = eval('[' + result.data + ']')[0];
        var taskId = data.id;
        var link = 'todoist://showTask?id=' + taskId;

        var projectId = data.project_id;
        var projects = File.readJSON(projectsPath).data;
        for (var i = 0; i < projects.length; i++) {
          var id = projects[i].id;
          if (projectId == id) {
            var projectName = projects[i].name;
            break;
          }
        }

        if (projectName != 'Inbox') {
          var projectString = '#' + projectName;
        } else {
          var projectString = '';
        }

        if (data.section_id != undefined) {
          var sections = File.readJSON(sectionsPath).data;
          for (var i = 0; i < sections.length; i++) {
            var id = sections[i].id;
            if (data.section_id == id) {
              var sectionName = sections[i].name;
              break;
            }
          }
          projectString = projectString + '/' + sectionName;
        }

        var dueInfo = data.due;
        if (dueInfo != undefined) {
          if (dueInfo.datetime != undefined) {
            var dueDateTime = LaunchBar.formatDate(new Date(dueInfo.datetime), {
              relativeDateFormatting: true,
            });
          } else {
            var dueDateTime = LaunchBar.formatDate(new Date(dueInfo.date), {
              relativeDateFormatting: true,
              timeStyle: 'none',
            });
          }
          if (dueInfo.recurring == true) {
            var notificationString =
              '⏰ ' +
              dueDateTime +
              ' 🔁 ' +
              dueInfo.string +
              '\n' +
              projectString;
          } else {
            var notificationString = '⏰ ' + dueDateTime + '\n' + projectString;
          }
        } else {
          var notificationString = projectString;
        }

        if (data.labels[0] != undefined) {
          notificationString = notificationString + ' @' + data.labels[0];
        }

        if (data.priority == 4) {
          notificationString = '🔴 ' + notificationString;
        } else if (data.priority == 3) {
          notificationString = '🟠 ' + notificationString;
        } else if (data.priority == 2) {
          notificationString = '🔵 ' + notificationString;
        }

        // Description
        if (data.description != undefined) {
          var descriptionString = data.description;

          // truncate
          if (descriptionString.length > 40) {
            var m = descriptionString.match(/.{1,40}/g);
            descriptionString = m[0] + '…';
          }

          notificationString = descriptionString + '\n' + notificationString;
        }

        // Fallback
        if (notificationString == '') {
          notificationString = notificationStringFallback;
        }

        // Send Notification
        LaunchBar.displayNotification({
          title: data.content,
          string: notificationString,
          url: link,
        });
      }
    }
  } else {
    LaunchBar.displayNotification({
      title: 'Todoist Action Error',
      string: result.error,
    });
  }
}

function settings() {
  if (Action.preferences.notifications == undefined) {
    var nIcon = 'notiTemplate';
    var nArgument = 'off';
    var nSub = nSubOff;
  } else {
    var nIcon = 'notiOffTemplate';
    var nArgument = 'on';
    var nSub = nSubOn;
  }

  return [
    {
      title: notiSettings,
      subtitle: nSub,
      icon: nIcon,
      action: 'notificationSetting',
      actionArgument: nArgument,
    },
    {
      title: setKey,
      icon: 'keyTemplate',
      action: 'setApiKey',
    },
    {
      title: refresh,
      icon: 'refreshTemplate',
      children: refreshData(),
    },
  ];
}

function notificationSetting(nArgument) {
  if (nArgument == 'off') {
    Action.preferences.notifications = false;
  } else {
    Action.preferences.notifications = undefined;
  }
  var output = settings();
  return output;
}

function refreshData() {
  if (apiToken == undefined) {
    setApiKey();
  } else {
    return [
      {
        title: titleUpdate,
        subtitle: subUpdate,
        icon: 'refreshTemplate',
        action: 'update',
      },
      {
        title: titleReset,
        subtitle: subReset,
        icon: 'refreshTemplate',
        action: 'reset',
      },
    ];
  }
}

function reset() {
  LaunchBar.hide();

  // Projects & Check
  var projectsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v2/projects?token=' + apiToken
  );

  if (projectsOnline.error != undefined) {
    LaunchBar.alert(projectsOnline.error);
  } else {
    File.writeJSON(projectsOnline, projectsPath);

    // Sections
    var sectionsOnline = HTTP.getJSON(
      'https://api.todoist.com/rest/v2/sections?token=' + apiToken
    );
    File.writeJSON(sectionsOnline, sectionsPath);

    // Labels
    var labelsOnline = HTTP.getJSON(
      'https://api.todoist.com/rest/v2/labels?token=' + apiToken
    );
    File.writeJSON(labelsOnline, labelsPath);

    // Notification
    LaunchBar.displayNotification({
      title: resetNotificationTitle,
    });
  }
}
