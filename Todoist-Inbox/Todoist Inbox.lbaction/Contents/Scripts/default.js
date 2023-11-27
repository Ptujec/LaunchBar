/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
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
  let prioMatch, prioValue, prioText, dueString, description;

  if (!apiToken) {
    setApiKey();
    return;
  }

  if (LaunchBar.options.shiftKey) {
    return settings();
  }

  argument += ' '; // The added space is because Launchbar trims the argument (which does not catch if just a priority is entered and will take it as the task name)

  // Priorities
  prioMatch = argument.match(/p[1-3]/);
  switch (prioMatch ? prioMatch[0] : '') {
    case 'p1':
      prioValue = 4;
      prioText = p1;
      break;
    case 'p2':
      prioValue = 3;
      prioText = p2;
      break;
    case 'p3':
      prioValue = 2;
      prioText = p3;
      break;
    default:
      prioValue = 1;
      prioText = '';
  }

  argument = argument.replace(/(p[1-3] )|( p[1-3])/, '');

  // Due/date String
  dueString = argument.includes(' @')
    ? argument.match(/ @(.*?)(p\d|((^| )#($| ))|$)/)[1].trim()
    : '';

  argument = argument.includes(' @')
    ? argument.replace(/ @(.*?)(p\d|((^| )#($| ))|$)/, '$2').trim()
    : argument;

  if (!argument.includes(' @')) {
    for (let i = 0; i < dateStrings.length; i++) {
      var dateString = dateStrings[i];
      var re = new RegExp('(^| )' + dateString + '($| )', 'i');
      if (re.test(argument)) {
        dueString = argument.match(re)[0].trim();
        argument = argument.replace(re, ' ');
      }
    }
  }

  // Description
  description = argument.includes(': ')
    ? argument.match(/(?:\: )(.*)/)[1]
    : description;
  argument = argument.includes(': ')
    ? argument.replace(/(?:\: )(.*)/, '')
    : argument;

  argument = argument.replace(/\s+/g, ' ').trim();

  argument = argument.charAt(0).toUpperCase() + argument.slice(1);

  Action.preferences.taskDict = {
    content: argument,
    description: description,
    dueString: dueString,
    prioValue: prioValue,
    prioText: prioText,
    lang: lang,
  };

  if (argument == '') {
    LaunchBar.alert(missingArg);
    return;
  }

  if (LaunchBar.options.commandKey) {
    return advancedOptions();
  }

  postTask();
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

  const taskDict = Action.preferences.taskDict;
  const content = taskDict.description
    ? `${taskDict.content}: ${taskDict.description}`
    : taskDict.content;

  const sub = [
    content,
    taskDict.dueString ? dueStringTitle + taskDict.dueString : '',
    taskDict.prioText,
  ]
    .filter(Boolean)
    .join(', ');

  const words = taskDict.content
    .replace(/\[(.+)\]\(.+\)/, '$1')
    .toLowerCase()
    .split(' ');

  Action.preferences.taskDict.words = words;

  const resultProjects = [];
  const resultPrioritized = [];
  const projects = File.readJSON(projectsPath).data;

  // Projects
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const title = project.name == 'Inbox' ? inboxName : project.name;
    const id = project.id;

    const usage = project.usage || 0;

    const pushDataProject = {
      title,
      subtitle: sub,
      icon: 'projectTemplate',
      usage,
      action: 'postTask',
      actionArgument: {
        type: 'project',
        id,
        index: i,
      },
    };

    // Prioritize projects with matching title and/or words
    let matchCount = words.includes(project.name.toLowerCase()) ? 2 : 0;

    if (project.usedWords) {
      words.find((word) => {
        if (project.usedWords.includes(word)) {
          matchCount++;
        }
      });

      if (matchCount > 0) {
        pushDataProject.matchCount = matchCount;
        resultPrioritized.push(pushDataProject);
      } else {
        resultProjects.push(pushDataProject);
      }
    } else {
      if (words.includes(project.name.toLowerCase())) {
        pushDataProject.matchCount = 2; // 2 to prioritize it more
        resultPrioritized.push(pushDataProject);
      } else {
        resultProjects.push(pushDataProject);
      }
    }
  }

  // Sections
  const resultSections = [];
  const sections = File.readJSON(sectionsPath).data;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const name = section.name;
    const id = section.id;
    const sectionProjectId = section.project_id;

    const project = projects.find((item) => item.id === sectionProjectId);
    const sectionProjectName = project ? project.name : '';

    const usage = section.usage || 0;

    const pushDataSection = {
      title: name + ' (' + sectionProjectName + ')',
      subtitle: sub,
      icon: 'sectionTemplate',
      usage,
      action: 'postTask',
      actionArgument: {
        type: 'section',
        id,
        sectionProjectId,
        index: i,
      },
    };

    // Prioritize sections with matching title and/or words
    let matchCount = words.includes(section.name.toLowerCase()) ? 2 : 0;

    if (section.usedWords) {
      words.find((word) => {
        if (section.usedWords.includes(word)) {
          matchCount++;
        }
      });

      if (matchCount > 0) {
        pushDataSection.matchCount = matchCount;
        resultPrioritized.push(pushDataSection);
      } else {
        resultSections.push(pushDataSection);
      }
    } else {
      if (words.includes(section.name.toLowerCase())) {
        pushDataSection.matchCount = 2; // 2 to prioritize it more
        resultPrioritized.push(pushDataSection);
      } else {
        resultSections.push(pushDataSection);
      }
    }
  }

  // Labels
  const resultLabels = [];
  const labels = File.readJSON(labelsPath).data;

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const name = label.name;
    const usage = label.usage || 0;

    const pushDataLabel = {
      title: name,
      subtitle: sub,
      icon: 'labelTemplate',
      usage,
      action: 'addProject',
      actionArgument: {
        labelName: name,
        labelIndex: i,
      },
    };

    // Prioritize labels with matching title and/or words
    let matchCount = words.includes(label.name.toLowerCase()) ? 2 : 0;

    if (label.usedWords) {
      words.find((word) => {
        if (label.usedWords.includes(word)) {
          matchCount++;
        }
      });

      if (matchCount > 0) {
        pushDataLabel.matchCount = matchCount;
        resultPrioritized.push(pushDataLabel);
      } else {
        resultLabels.push(pushDataLabel);
      }
    } else {
      if (words.includes(label.name.toLowerCase())) {
        pushDataLabel.matchCount = 2; // 2 to prioritize it more
        resultPrioritized.push(pushDataLabel);
      } else {
        resultLabels.push(pushDataLabel);
      }
    }
  }

  resultPrioritized.sort(
    (a, b) => b.matchCount - a.matchCount || b.usage - a.usage
  );

  const all = [...resultProjects, ...resultSections, ...resultLabels].sort(
    (a, b) => b.usage - a.usage
  );

  return [...resultPrioritized, ...all];
}

function addProject({ labelName, labelIndex }) {
  const labels = File.readJSON(labelsPath).data;
  const lastUsed = labels[labelIndex].lastUsed;
  const lastUsedCategoryId = labels[labelIndex].lastUsedCategoryId;
  const lastUsedSectionId = labels[labelIndex].lastUsedSectionId;

  const pinnedItem = [];
  const projectItems = [];
  const sectionItems = [];

  const taskDict = Action.preferences.taskDict;
  const content = taskDict.description
    ? `${taskDict.content}: ${taskDict.description}`
    : taskDict.content;

  const sub = [
    `@${labelName}: ${content}`,
    taskDict.dueString ? dueStringTitle + taskDict.dueString : '',
    taskDict.prioText,
  ]
    .filter(Boolean)
    .join(', ');

  // Projects
  const projects = File.readJSON(projectsPath).data;
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const title = project.name == 'Inbox' ? inboxName : project.name;
    const id = project.id;

    const projectPushData = {
      title: title,
      subtitle: sub,
      icon: 'projectTemplate',
      action: 'postTask',
      actionArgument: {
        type: 'projectAndLabel',
        id,
        index: i,
        labelName,
        labelIndex,
      },
    };

    if (lastUsed == 'project' && lastUsedCategoryId == id) {
      pinnedItem.push(projectPushData);
    } else {
      projectItems.push(projectPushData);
    }
  }

  // Sections
  const sections = File.readJSON(sectionsPath).data;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const name = section.name;
    const id = section.id;
    const sectionProjectId = section.project_id;

    const project = projects.find((item) => item.id === sectionProjectId);
    const sectionProjectName = project ? project.name : '';

    const sectionPushData = {
      title: name + ' (' + sectionProjectName + ')',
      subtitle: sub,
      icon: 'sectionTemplate',
      action: 'postTask',
      actionArgument: {
        type: 'sectionAndLabel',
        id,
        sectionProjectId,
        index: i,
        labelName,
        labelIndex,
      },
    };

    if (lastUsed == 'section' && lastUsedSectionId == id) {
      pinnedItem.push(sectionPushData);
    } else {
      sectionItems.push(sectionPushData);
    }
  }
  return [...pinnedItem, ...projectItems, ...sectionItems];
}

function postTask(advancedData) {
  LaunchBar.hide();

  const taskDict = Action.preferences.taskDict;
  let sections = File.readJSON(sectionsPath);
  let projects = File.readJSON(projectsPath);
  let body;

  if (advancedData) {
    body = processAdvancedData(advancedData, taskDict, sections, projects);
  } else {
    body = {
      content: taskDict.content,
      description: taskDict.description,
      due_lang: taskDict.lang,
      due_string: taskDict.dueString,
      priority: taskDict.prioValue,
    };
  }

  const result = HTTP.postJSON('https://api.todoist.com/rest/v2/tasks', {
    body: body,
    headerFields: {
      Authorization: 'Bearer ' + apiToken,
    },
  });
  processPostResponse(result, sections, projects);
}

function processAdvancedData(advancedData, taskDict, sections, projects) {
  const labels = File.readJSON(labelsPath);
  const newWords = taskDict.words.filter((word) => !stopwords.has(word));
  const labelName = advancedData.labelName;
  const labelIndex = advancedData.labelIndex;
  let body;

  // Sections & Section with Labels

  if (advancedData.type.includes('section')) {
    const sectionIndex = advancedData.index;

    // Remember used words
    const sectionUsedWords = sections.data[sectionIndex].usedWords || [];
    sections.data[sectionIndex].usedWords = [
      ...new Set([...sectionUsedWords, ...newWords]),
    ];

    // Count usage
    sections.data[sectionIndex].usage
      ? sections.data[sectionIndex].usage++
      : (sections.data[sectionIndex].usage = 1);

    body = {
      content: taskDict.content,
      description: taskDict.description,
      due_lang: taskDict.lang,
      due_string: taskDict.dueString,
      priority: taskDict.prioValue,
      project_id: advancedData.sectionProjectId,
      section_id: advancedData.id,
    };

    if (advancedData.type == 'sectionAndLabel') {
      // Add label to body
      body.labels = [labelName];

      // Remember section used for the label
      labels.data[labelIndex].lastUsed = 'section';
      labels.data[labelIndex].lastUsedSectionId = advancedData.id;

      // Remember used words
      const labelUsedWords = labels.data[labelIndex].usedWords || [];
      labels.data[labelIndex].usedWords = [
        ...new Set([...labelUsedWords, ...newWords]),
      ];

      // Count usage
      labels.data[labelIndex].usage
        ? labels.data[labelIndex].usage++
        : (labels.data[labelIndex].usage = 1);

      File.writeJSON(labels, labelsPath);
    }

    File.writeJSON(sections, sectionsPath);
    return body;
  }

  // Projects & Projects with Labels
  const projectIndex = advancedData.index;

  // Remember used words
  const projectUsedWords = projects.data[projectIndex].usedWords || [];
  projects.data[projectIndex].usedWords = [
    ...new Set([...projectUsedWords, ...newWords]),
  ];

  // Count usage
  projects.data[projectIndex].usage
    ? projects.data[projectIndex].usage++
    : (projects.data[projectIndex].usage = 1);

  body = {
    content: taskDict.content,
    description: taskDict.description,
    due_lang: taskDict.lang,
    due_string: taskDict.dueString,
    priority: taskDict.prioValue,
    project_id: advancedData.id,
  };

  if (advancedData.type == 'projectAndLabel') {
    // Add label to body
    body.labels = [labelName];

    // Remember project used for the label
    labels.data[labelIndex].lastUsed = 'project';
    labels.data[labelIndex].lastUsedCategoryId = advancedData.id;

    // Remember used words
    const labelUsedWords = labels.data[labelIndex].usedWords || [];
    labels.data[labelIndex].usedWords = [
      ...new Set([...labelUsedWords, ...newWords]),
    ];

    // Count usage
    labels.data[labelIndex].usage
      ? labels.data[labelIndex].usage++
      : (labels.data[labelIndex].usage = 1);

    File.writeJSON(labels, labelsPath);
  }

  File.writeJSON(projects, projectsPath);
  return body;
}

function processPostResponse(result, sections, projects) {
  if (!result.error) {
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
      return;
    }

    if (Action.preferences.notifications != 'off') {
      // Confirmation notification
      const data = eval('[' + result.data + ']')[0];
      var taskId = data.id;
      var link = 'todoist://showTask?id=' + taskId;

      // Section & Project
      const project = projects.data.find((p) => p.id === data.project_id);

      const projectName = project ? project.name : '';
      const projectString = projectName != 'Inbox' ? `#${projectName}` : '';

      if (data.section_id) {
        const section = sections.data.find((s) => s.id === data.section_id);
        if (section) {
          projectString += '/' + section.name;
        }
      }

      // Due
      const dueInfo = data.due;
      const dueDateTime = dueInfo
        ? dueInfo.datetime
          ? LaunchBar.formatDate(new Date(dueInfo.datetime), {
              relativeDateFormatting: true,
            })
          : LaunchBar.formatDate(new Date(dueInfo.date), {
              relativeDateFormatting: true,
              timeStyle: 'none',
            })
        : null;

      var notificationString = dueInfo
        ? dueInfo.recurring
          ? `⏰ ${dueDateTime} 🔁 ${dueInfo.string}\n${projectString}`
          : `⏰ ${dueDateTime}\n${projectString}`
        : projectString;

      // Label
      if (data.labels[0]) {
        notificationString += ' @' + data.labels[0];
      }

      // Priority
      const priorityEmojis = {
        4: '🔴',
        3: '🟠',
        2: '🔵',
      };
      if (priorityEmojis.hasOwnProperty(data.priority)) {
        notificationString =
          priorityEmojis[data.priority] + ' ' + notificationString;
      }

      // Description
      if (data.description) {
        let descriptionString = data.description;

        // truncate
        if (descriptionString.length > 40) {
          descriptionString = descriptionString.substring(0, 37) + '…';
        }

        notificationString = descriptionString + '\n' + notificationString;
      }

      // Fallback
      notificationString = notificationString
        ? notificationString
        : notificationStringFallback;

      // Send Notification
      LaunchBar.displayNotification({
        title: data.content,
        string: notificationString,
        url: link,
      });
    }
    return;
  }

  LaunchBar.displayNotification({
    title: 'Todoist Action Error',
    string: result.error,
  });
}

function settings() {
  let nIcon, nArgument, nSub;

  if (Action.preferences.notifications == 'off') {
    nIcon = 'notiOffTemplate';
    nArgument = 'on';
    nSub = nSubOn;
  } else {
    nIcon = 'notiTemplate';
    nArgument = 'off';
    nSub = nSubOff;
  }

  return [
    {
      title: notiSettings,
      subtitle: nSub,
      icon: nIcon,
      action: 'notificationSetting',
      actionArgument: nArgument,
      alwaysShowsSubtitle: true,
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
    Action.preferences.notifications = 'off';
  } else {
    Action.preferences.notifications = undefined;
  }
  return settings();
}

function refreshData() {
  if (!apiToken) {
    setApiKey();
    return;
  }
  return [
    {
      title: titleUpdate,
      subtitle: subUpdate,
      icon: 'refreshTemplate',
      action: 'update',
      alwaysShowsSubtitle: true,
    },
    {
      title: titleReset,
      subtitle: subReset,
      icon: 'refreshTemplate',
      action: 'reset',
      alwaysShowsSubtitle: true,
    },
  ];
}

function reset() {
  LaunchBar.hide();

  // Projects & Check
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
    return;
  }

  File.writeJSON(projectsOnline, projectsPath);

  // Sections
  const sectionsOnline = HTTP.getJSON(
    'https://api.todoist.com/rest/v2/sections',
    {
      headerFields: {
        Authorization: 'Bearer ' + apiToken,
      },
    }
  );
  File.writeJSON(sectionsOnline, sectionsPath);

  // Labels
  const labelsOnline = HTTP.getJSON('https://api.todoist.com/rest/v2/labels', {
    headerFields: {
      Authorization: 'Bearer ' + apiToken,
    },
  });
  File.writeJSON(labelsOnline, labelsPath);

  // Notification
  LaunchBar.displayNotification({
    title: resetNotificationTitle,
  });
}
