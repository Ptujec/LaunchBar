/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.todoist.com/rest/v2/#create-a-new-task
- https://developer.todoist.com/guides/#tasks (URL Scheme)
- https://todoist.com/help/articles/set-a-recurring-due-date#some-examples-of-recurring-due-dates
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

Stopwords:
- https://github.com/stopwords-iso/stopwords-de
- https://github.com/stopwords-iso/stopwords-iso/blob/master/python/stopwordsiso/stopwords-iso.json
*/

String.prototype.localizationTable = 'default';

include('global.js');
include('localization.js');
include('setKey.js');
include('update.js');

function run(argument) {
  let prioMatch,
    prioValue,
    prioText,
    dueString,
    duration,
    durationUnit,
    description,
    quotedParts;

  if (!apiToken) {
    setApiKey();
    return;
  }

  if (LaunchBar.options.shiftKey) {
    return settings();
  }

  argument += ' '; // The added space is because Launchbar trims the argument (which does not catch if just a priority is entered and will take it as the task name)

  // Exclude parts in quotation marks from being parsed
  if (argument.includes('"')) {
    quotedParts = (argument.match(reQuotedParts) || [])
      .map((part) => part.slice(1, -1))
      .join(' ');
    argument = argument.replace(reQuotedParts, ' ');
  }

  // Description
  description = argument.includes(': ')
    ? capitalizeFirstLetter(argument.match(reDescription)[1])
    : null;
  argument = argument.includes(': ')
    ? argument.replace(reDescription, '')
    : argument;

  // Priorities
  prioMatch = argument.match(rePrio);
  switch (prioMatch ? prioMatch[0].trim() : '') {
    case 'p1':
      prioValue = 4;
      prioText = 'Priority 1'.localize();
      break;
    case 'p2':
      prioValue = 3;
      prioText = 'Priority 2'.localize();
      break;
    case 'p3':
      prioValue = 2;
      prioText = 'Priority 3'.localize();
      break;
    default:
      prioValue = 1;
      prioText = '';
  }

  argument = argument.replace(rePrio, ' ');

  // Due String
  dueString = argument.includes(' @')
    ? argument.match(reDueStringWithAt)[1].trim()
    : '';

  argument = argument.includes(' @')
    ? argument.replace(reDueStringWithAt, '$2').trim()
    : argument;

  if (!argument.includes(' @')) {
    let due = [];
    for (let dueStringOption of dueStringOptions) {
      const reDueString = new RegExp('(^| )' + dueStringOption + '($| )', 'i');

      if (reDueString.test(argument)) {
        due.push(argument.match(reDueString)[0].trim());
        argument = argument.replace(reDueString, ' ');
      }
    }
    if (due.length > 0) {
      dueString = due.join(' ') || undefined;
    }
  }

  // Duration
  if (reDuration.test(argument)) {
    durationUnit = 'minute';
    // If no date(time)
    if (!dueString) {
      dueString =
        'today'.localize() +
        ' ' +
        LaunchBar.formatDate(new Date(), {
          timeStyle: 'short',
          dateStyle: 'none',
        });
    }

    const durationString = argument.match(reDuration);

    duration = durationString[1].replace(/\,/g, '.').trim();

    if (
      durationString[2] === 'h' ||
      durationString[2].trim().toLowerCase().startsWith('hour')
    )
      duration = duration * 60;

    argument = argument.replace(reDuration, ' ');
  }

  // Add quoted string parts & cleanup
  argument = quotedParts ? quotedParts + argument : argument;
  argument = argument.replace(/\s+/g, ' ').trim();
  argument = capitalizeFirstLetter(argument);

  const taskDict = {
    content: argument,
    description,
    dueString,
    duration,
    durationUnit,
    prioValue,
    prioText,
    lang,
    advancedData: false,
  };

  if (!argument) {
    return LaunchBar.alert('This task has no content!'.localize());
  }

  if (LaunchBar.options.commandKey) {
    return advancedOptions(taskDict);
  }

  postTask(taskDict);
}

function advancedOptions(taskDict) {
  if (
    !File.exists(projectsPath) ||
    !File.exists(sectionsPath) ||
    !File.exists(labelsPath)
  ) {
    LaunchBar.alert(
      'Just a second! Local data needs to be updated.'.localize()
    );
    update();
  }
  taskDict.advancedData = true;

  const labelDict = taskDict.labelDict || undefined;
  const usedLabels = taskDict.usedLabels || [];

  let labels = File.readJSON(labelsPath).data;
  let lastUsed, lastUsedCategoryId, lastUsedSectionId;

  if (labelDict) {
    // Build array of used labels in taskDict
    usedLabels.push(labelDict);

    taskDict.usedLabels = usedLabels;

    // Get usage information
    const labelIndex = labels.findIndex(
      (item) => item.id === labelDict.labelId
    );

    lastUsed = labels[labelIndex].lastUsed;
    lastUsedCategoryId = labels[labelIndex].lastUsedCategoryId;
    lastUsedSectionId = labels[labelIndex].lastUsedSectionId;
    lastUsedLabelId = labels[labelIndex].lastUsedLabelId;
  }

  // Remove used labels from labels list
  if (usedLabels.includes(labelDict)) {
    const usedLabelsNames = usedLabels.map((usedLabel) => usedLabel.labelName);
    labels = labels.filter((label) => !usedLabelsNames.includes(label.name));
  }

  // Clean up and split used words
  const words = taskDict.content
    .replace(/\[(.+)\]\(.+\)/, '$1') // replace markdown links
    .replace(/https?\S+/, '') // replace links
    .replace(/,|\||\(|\)|\[|\]|\\|\/|:|,|\.|\?|\d+/g, '') // replace numbers and other stuff
    .toLowerCase()
    .split(' ');

  taskDict.words = words;

  const resultLastUsed = [];
  const resultProjects = [];
  const resultPrioritized = [];

  const projects = File.readJSON(projectsPath).data;

  // Projects
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const title = project.name == 'Inbox' ? 'Inbox'.localize() : project.name;
    const id = project.id;

    const usage = project.usage || 0;

    const pushDataProject = {
      title,
      icon: 'projectTemplate',
      usage,
      action: 'postTask',
      actionArgument: {
        ...taskDict,
        type: labelDict ? 'projectAndLabel' : 'project',
        id,
        index: i,
      },
      actionRunsInBackground: true,
    };

    // Pinn last used project
    if (lastUsed == 'project' && lastUsedCategoryId == id) {
      pushDataProject.badge = 'Last Used'.localize();
      resultLastUsed.push(pushDataProject);
    } else {
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
          pushDataProject.badge = 'Prioritized'.localize();
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
      icon: 'sectionTemplate',
      usage,
      action: 'postTask',
      actionArgument: {
        ...taskDict,
        type: labelDict ? 'sectionAndLabel' : 'section',
        id,
        sectionProjectId,
        index: i,
      },
      actionRunsInBackground: true,
    };

    // Pinn and prioritize sections with matching title and/or words
    if (lastUsed == 'section' && lastUsedSectionId == id) {
      pushDataSection.badge = 'Last Used'.localize();
      resultLastUsed.push(pushDataSection);
    } else {
      let matchCount = words.includes(section.name.toLowerCase()) ? 2 : 0;

      if (section.usedWords) {
        words.find((word) => {
          if (section.usedWords.includes(word)) {
            matchCount++;
          }
        });

        if (matchCount > 0) {
          pushDataSection.matchCount = matchCount;
          pushDataSection.badge = 'Prioritized'.localize();
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
  }

  // Labels
  const resultLabels = [];
  for (const label of labels) {
    const name = label.name;
    const id = label.id;
    const usage = label.usage || 0;

    const pushDataLabel = {
      title: name,
      icon: 'labelTemplate',
      usage,
      action: 'advancedOptions',
      actionArgument: {
        ...taskDict,
        labelDict: {
          labelName: name,
          labelId: id,
        },
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
        pushDataLabel.badge = 'Prioritized'.localize();
        resultPrioritized.push(pushDataLabel);
      } else {
        resultLabels.push(pushDataLabel);
      }
    } else {
      if (words.includes(label.name.toLowerCase())) {
        pushDataLabel.matchCount = 1; // 2 to prioritize it more
        resultPrioritized.push(pushDataLabel);
      } else {
        resultLabels.push(pushDataLabel);
      }
    }
  }

  return [
    ...resultLastUsed.sort((a, b) => b.usage - a.usage),
    ...resultPrioritized.sort(
      (a, b) => b.matchCount - a.matchCount || b.usage - a.usage
    ),
    ...resultProjects,
    ...resultSections,
    ...resultLabels,
  ];
}

function postTask(taskDict) {
  LaunchBar.hide();

  let projects = File.readJSON(projectsPath);
  let sections = File.readJSON(sectionsPath);
  let body;

  if (taskDict.advancedData) {
    body = processAdvancedData(taskDict, projects, sections);
  } else {
    body = {
      content: taskDict.content,
      description: taskDict.description,
      due_lang: taskDict.lang,
      due_string: taskDict.dueString,
      priority: taskDict.prioValue,
      duration: taskDict.duration,
      duration_unit: taskDict.durationUnit,
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

function processAdvancedData(taskDict, projects, sections) {
  const labels = File.readJSON(labelsPath);
  const usedLabels = taskDict.usedLabels;
  const newWords = taskDict.words.filter((word) => !stopwords.has(word));

  let body = {
    content: taskDict.content,
    description: taskDict.description,
    due_lang: taskDict.lang,
    due_string: taskDict.dueString,
    priority: taskDict.prioValue,
    duration: taskDict.duration,
    duration_unit: taskDict.durationUnit,
    project_id: taskDict.id,
  };

  // Sections & Section with Labels
  if (taskDict.type.includes('section')) {
    const sectionIndex = taskDict.index;

    // Remember used words
    const sectionUsedWords = sections.data[sectionIndex].usedWords || [];
    sections.data[sectionIndex].usedWords = [
      ...new Set([...sectionUsedWords, ...newWords]),
    ];

    // Count usage
    sections.data[sectionIndex].usage
      ? sections.data[sectionIndex].usage++
      : (sections.data[sectionIndex].usage = 1);

    body.project_id = taskDict.sectionProjectId;
    body.section_id = taskDict.id;

    if (taskDict.type == 'sectionAndLabel') {
      // Add labels to body
      body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

      // Remember section used for the label
      const lastLabelId = usedLabels.slice(-1)[0].labelId;
      const lastLabelIndex = labels.data.findIndex(
        (item) => item.id === lastLabelId
      );

      labels.data[lastLabelIndex].lastUsed = 'section';
      labels.data[lastLabelIndex].lastUsedSectionId = taskDict.id;

      // Remember words and count usage
      for (const usedLabel of usedLabels) {
        const labelId = usedLabel.labelId;
        const labelIndex = labels.data.findIndex((item) => item.id === labelId);

        // Remember used words
        const labelUsedWords = labels.data[labelIndex].usedWords || [];
        labels.data[labelIndex].usedWords = [
          ...new Set([...labelUsedWords, ...newWords]),
        ];

        // Count usage
        labels.data[labelIndex].usage
          ? labels.data[labelIndex].usage++
          : (labels.data[labelIndex].usage = 1);
      }

      File.writeJSON(labels, labelsPath);
    }

    File.writeJSON(sections, sectionsPath);
    return body;
  }

  // Projects & Projects with Labels
  const projectIndex = taskDict.index;

  // Statistics for projects except for Inbox
  if (projects.data[projectIndex].is_inbox_project === false) {
    // Remember used words
    const projectUsedWords = projects.data[projectIndex].usedWords || [];
    projects.data[projectIndex].usedWords = [
      ...new Set([...projectUsedWords, ...newWords]),
    ];

    // Count usage
    projects.data[projectIndex].usage
      ? projects.data[projectIndex].usage++
      : (projects.data[projectIndex].usage = 1);
  }

  if (taskDict.type == 'projectAndLabel') {
    // Add label to body
    body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

    // Remember project used for the label
    const lastLabelId = usedLabels.slice(-1)[0].labelId;
    const lastLabelIndex = labels.data.findIndex(
      (item) => item.id === lastLabelId
    );
    labels.data[lastLabelIndex].lastUsed = 'project';
    labels.data[lastLabelIndex].lastUsedCategoryId = taskDict.id;

    // Remember words and count usage
    for (const usedLabel of usedLabels) {
      const labelId = usedLabel.labelId;
      const labelIndex = labels.data.findIndex((item) => item.id === labelId);

      // Remember used words
      const labelUsedWords = labels.data[labelIndex].usedWords || [];
      labels.data[labelIndex].usedWords = [
        ...new Set([...labelUsedWords, ...newWords]),
      ];

      // Count usage
      labels.data[labelIndex].usage
        ? labels.data[labelIndex].usage++
        : (labels.data[labelIndex].usage = 1);
    }

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
        string: `${result.response.status}: ${result.response.localizedStatus}: ${result.data}`,
      });
      if (result.response.status == 401) {
        Action.preferences.apiToken = undefined; // to promt API token entry dialog
      }
      return;
    }

    const data = eval(`[${result.data}]`)[0];
    const url = `todoist://task?id=${data.id}`;

    // Open Task
    if (LaunchBar.options.commandKey) {
      LaunchBar.openURL(url);
    }

    // Confirmation notification
    if (Action.preferences.notifications != 'off') {
      // Section & Project
      const project = projects.data.find((p) => p.id === data.project_id);

      const projectName = project ? project.name : '';
      const projectString = projectName != 'Inbox' ? `#${projectName}` : '';

      if (data.section_id) {
        const section = sections.data.find((s) => s.id === data.section_id);
        if (section) {
          projectString += `/${section.name}`;
        }
      }

      // Due
      const due = data.due;
      const dueDateTime = due
        ? due.datetime
          ? LaunchBar.formatDate(new Date(due.datetime), {
              relativeDateFormatting: true,
            })
          : LaunchBar.formatDate(new Date(due.date), {
              relativeDateFormatting: true,
              timeStyle: 'none',
            })
        : null;

      const dueString = dueDateTime
        ? due.is_recurring
          ? `${'Due'.localize()}: ${dueDateTime}\n${'Recurring'.localize()}: ${
              due.string
            }`
          : `${'Due'.localize()}: ${dueDateTime}`
        : '';

      // Duration
      const duration = data.duration;

      const durationString = duration
        ? `\n${'Duration'.localize()}: ${
            duration.amount
          } ${capitalizeFirstLetter(data.duration.unit)}${'(s)'.localize()}`
        : '';

      let notificationString = dueString
        ? `${dueString}${durationString}\n${projectString}`
        : projectString;

      // Labels
      const labels = data.labels;
      let labelString = [];
      if (labels) {
        for (const label of labels) {
          labelString.push(` @${label}`);
        }

        notificationString += labelString.join('');
      }

      // Title & Description
      let title = data.content;

      if (data.description) {
        let descriptionString = data.description;

        // truncate
        if (descriptionString.length > 40) {
          descriptionString = descriptionString.substring(0, 37) + '…';
        }

        title += `: ${descriptionString}`;
      }

      // Priority
      const priorityEmojis = {
        4: '🔴',
        3: '🟠',
        2: '🔵',
      };

      if (priorityEmojis.hasOwnProperty(data.priority)) {
        title += ` ${priorityEmojis[data.priority]}`;
      }

      // Fallback
      notificationString = notificationString
        ? notificationString
        : 'has been added to Todoist!'.localize();

      // Send Notification
      LaunchBar.displayNotification({
        title,
        string: notificationString,
        url,
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
  let icon, actionArgument, subtitle;

  if (Action.preferences.notifications == 'off') {
    icon = 'notiOffTemplate';
    actionArgument = 'on';
    subtitle = 'Hit enter to turn on notifications'.localize();
  } else {
    icon = 'notiTemplate';
    actionArgument = 'off';
    subtitle = 'Hit enter to turn off notifications'.localize();
  }

  return [
    {
      title: 'Confirmation Notifications'.localize(),
      subtitle,
      icon,
      action: 'notificationSetting',
      actionArgument,
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Reset API-Token'.localize(),
      icon: 'keyTemplate',
      action: 'setApiKey',
    },
    {
      title: 'Refresh projects, sections & labels.'.localize(),
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
      title: 'Update'.localize(),
      subtitle:
        'Projects, sections and lables will be updated without impacting usage data.'.localize(),
      icon: 'refreshTemplate',
      action: 'update',
      alwaysShowsSubtitle: true,
      actionRunsInBackground: true,
    },
    {
      title: 'Reset'.localize(),
      subtitle: 'A complete reset including usage data.'.localize(),
      icon: 'refreshTemplate',
      action: 'resetWarning',
      alwaysShowsSubtitle: true,
    },
  ];
}

function resetWarning() {
  const response = LaunchBar.alert(
    'Are you sure?'.localize(),
    'Do you really want to reset all your local data?'.localize(),
    'Ok',
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      return reset();

    case 1:
      return;
  }
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
    title: 'Projects, sections & labels reset.'.localize(),
  });
}
