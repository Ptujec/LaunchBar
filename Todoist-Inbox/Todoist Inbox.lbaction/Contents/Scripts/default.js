/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2025-04-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.todoist.com/api/v1/
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
    quotedParts,
    deadline;

  if (!apiToken) {
    setApiKey();
    return;
  }

  if (LaunchBar.options.shiftKey) return settings();

  argument += ' '; // The added space is because Launchbar trims the argument (which does not catch if just a priority is entered and will take it as the task name)

  // Exclude parts in quotation marks from being parsed
  if (argument.includes('"')) {
    quotedParts = (argument.match(reQuotedParts) || [])
      .map((part) => part.slice(1, -1))
      .join(' ');
    argument = argument.replace(reQuotedParts, ' ');
  }

  // Reminder
  reminder = argument.includes(' !') ? argument.match(reReminder)[1] : null;

  argument = argument.includes(' !')
    ? argument.replace(reReminder, '')
    : argument;

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
    dueString =
      dueStringOptions.reduce((acc, opt) => {
        const re = new RegExp('(^| )' + opt + '($| )', 'i');
        if (re.test(argument)) {
          const match = argument.match(re)[0].trim();
          argument = argument.replace(re, ' ');
          return acc ? `${acc} ${match}` : match;
        }
        return acc;
      }, '') || undefined;
  }

  // Deadline
  const deadlineMatch = argument.match(reDeadline);
  if (deadlineMatch) {
    const parsedDate = parseDeadlineDate(deadlineMatch[1]);
    if (parsedDate) deadline = { date: parsedDate, lang };
    argument = argument.replace(reDeadline, ' ').trim();
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
    reminder,
    prioValue,
    prioText,
    deadline,
    // lang, // not needed because its global
    advancedData: false,
  };

  if (!argument) return LaunchBar.alert('This task has no content!'.localize());

  if (LaunchBar.options.commandKey) return advancedOptions(taskDict);

  postTask(taskDict);
}

function postTask(taskDict) {
  LaunchBar.hide();

  let body;
  if (taskDict.advancedData) {
    body = processAdvancedData(taskDict);
  } else {
    body = {
      content: taskDict.content,
      description: taskDict.description,
      due_lang: lang,
      due_string: taskDict.dueString,
      priority: taskDict.prioValue,
      duration: taskDict.duration,
      duration_unit: taskDict.durationUnit,
      deadline_date: taskDict.deadline?.date,
      deadline_lang: taskDict.deadline?.lang,
    };
  }

  const result = HTTP.postJSON('https://api.todoist.com/api/v1.0/tasks', {
    body: body,
    headerFields: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  processPostResponse(result, taskDict.reminder);
}

function advancedOptions(taskDict) {
  if (!File.exists(todoistDataPath)) {
    Action.preferences.syncToken = undefined;
    Action.preferences.lastSyncDate = undefined;

    LaunchBar.alert(
      'Just a second! Local data needs to be updated.'.localize(),
    );
    update(false); // false = don't hide LaunchBar
  }

  Action.preferences.updateNow = true;

  taskDict.advancedData = true;

  const labelDict = taskDict.labelDict || undefined;
  const usedLabels = taskDict.usedLabels || [];

  const todoistData = getTodoistData();
  const usageData = getUsageData();

  let labels = todoistData.labels?.filter((label) => !label.is_archived);
  let lastUsed, lastUsedCategoryId, lastUsedSectionId;

  if (labelDict) {
    taskDict.usedLabels = [...usedLabels, labelDict];

    const labelUsageItem = usageData.labels[labelDict.labelId] || {
      usage: 0,
      usedWords: [],
    };
    lastUsed = labelUsageItem.lastUsed;
    lastUsedCategoryId = labelUsageItem.lastUsedCategoryId;
    lastUsedSectionId = labelUsageItem.lastUsedSectionId;
  }

  const usedLabelsNames = taskDict.usedLabels
    ? taskDict.usedLabels.map((usedLabel) => usedLabel.labelName)
    : [];
  labels = labels.filter((label) => !usedLabelsNames.includes(label.name));

  // Clean up and split used words
  const words = taskDict.content
    .replace(/\[(.+)\]\(.+\)/, '$1') // replace markdown links
    .replace(/https?\S+/, '') // replace links
    .replace(/,|\||\(|\)|\[|\]|\\|\/|:|,|\.|\?|\d+/g, '') // replace numbers and other stuff
    .toLowerCase()
    .split(' ');

  taskDict.words = words;

  const projects = todoistData.projects?.filter(
    (project) => !project.is_archived,
  );

  // MARK: Projects

  const projectResults = projects.map((project, index) => {
    const title = project.name == 'Inbox' ? 'Inbox'.localize() : project.name;
    const id = project.id;
    const projectUsageItem = usageData.projects[id] || {
      usage: 0,
      usedWords: [],
    };
    const usage = projectUsageItem.usage || 0;

    const getProjectPath = (proj) => {
      if (!proj.parent_id) return '';
      const parent = projects.find((p) => p.id === proj.parent_id);
      if (!parent) return '';
      const parentPath = getProjectPath(parent);
      return parentPath ? `${parentPath}/${parent.name}` : parent.name;
    };

    const projectPath = project.name == 'Inbox' ? '' : getProjectPath(project);

    const pushDataProject = {
      title,
      label: projectPath || undefined,
      icon: 'projectTemplate',
      usage,
      action: 'postTask',
      actionArgument: {
        ...taskDict,
        type: labelDict ? 'projectAndLabel' : 'project',
        id,
        index,
      },
      actionRunsInBackground: true,
      inboxProject: project.inbox_project === true,
    };

    // Determine match count for prioritization
    let matchCount = words.includes(project.name.toLowerCase()) ? 2 : 0;
    if (projectUsageItem.usedWords) {
      const additionalMatches = words.filter((word) =>
        projectUsageItem.usedWords.includes(word),
      ).length;
      matchCount += additionalMatches;
    }

    // Add match count and badge if applicable
    if (matchCount > 0) {
      pushDataProject.matchCount = matchCount;
      pushDataProject.badge = 'Prioritized'.localize();
    }

    return {
      data: pushDataProject,
      matchCount,
      isLastUsed: lastUsed === 'project' && lastUsedCategoryId === id,
    };
  });

  // MARK: Sections

  const sections = todoistData.sections?.filter(
    (section) => !section.is_archived,
  );

  const sectionResults = sections.map((section, index) => {
    const name = section.name;
    const id = section.id;
    const sectionProjectId = section.project_id;

    const project = projects.find((item) => item.id === sectionProjectId);
    const sectionUsageItem = usageData.sections[id] || {
      usage: 0,
      usedWords: [],
    };
    const usage = sectionUsageItem.usage || 0;

    // Get full project hierarchy for the section
    const getFullProjectPath = (proj) => {
      if (!proj) return '';
      const parent = projects.find((p) => p.id === proj.parent_id);
      const parentPath = parent ? getFullProjectPath(parent) : '';
      return parentPath ? `${parentPath}/${proj.name}` : proj.name;
    };

    const projectPath = project ? getFullProjectPath(project) : '';

    const pushDataSection = {
      title: name,
      label: projectPath,
      icon: 'sectionTemplate',
      usage,
      action: 'postTask',
      actionArgument: {
        ...taskDict,
        type: labelDict ? 'sectionAndLabel' : 'section',
        id,
        sectionProjectId,
        index,
      },
      actionRunsInBackground: true,
    };

    // Determine match count for prioritization
    let matchCount = words.includes(section.name.toLowerCase()) ? 2 : 0;
    if (sectionUsageItem.usedWords) {
      const additionalMatches = words.filter((word) =>
        sectionUsageItem.usedWords.includes(word),
      ).length;
      matchCount += additionalMatches;
    }

    // Add match count and badge if applicable
    if (matchCount > 0) {
      pushDataSection.matchCount = matchCount;
      pushDataSection.badge = 'Prioritized'.localize();
    }

    return {
      data: pushDataSection,
      matchCount,
      isLastUsed: lastUsed === 'section' && lastUsedSectionId === id,
    };
  });

  // MARK: Labels

  const labelResults = labels.map((label) => {
    const name = label.name;
    const id = label.id;
    const labelUsageItem = usageData.labels[id] || { usage: 0, usedWords: [] };
    const usage = labelUsageItem.usage || 0;

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

    // Determine match count for prioritization
    let matchCount = words.includes(label.name.toLowerCase()) ? 2 : 0;
    if (labelUsageItem.usedWords) {
      const additionalMatches = words.filter((word) =>
        labelUsageItem.usedWords.includes(word),
      ).length;
      matchCount += additionalMatches;
    }

    // Add match count and badge if applicable
    if (matchCount > 0) {
      pushDataLabel.matchCount = matchCount;
      pushDataLabel.badge = 'Prioritized'.localize();
      return { data: pushDataLabel, isPrioritized: true };
    }

    return { data: pushDataLabel, isPrioritized: false };
  });

  // Collect all results
  const resultLastUsed = [
    ...projectResults
      .filter((result) => result.isLastUsed)
      .map((result) => ({ ...result.data, badge: 'Last Used'.localize() })),
    ...sectionResults
      .filter((result) => result.isLastUsed)
      .map((result) => ({ ...result.data, badge: 'Last Used'.localize() })),
  ];

  const resultPrioritized = [
    ...projectResults
      .filter((result) => !result.isLastUsed && result.matchCount > 0)
      .map((result) => result.data),
    ...sectionResults
      .filter((result) => !result.isLastUsed && result.matchCount > 0)
      .map((result) => result.data),
    ...labelResults
      .filter((result) => result.isPrioritized)
      .map((result) => result.data),
  ];

  const resultProjects = projectResults
    .filter((result) => !result.isLastUsed && result.matchCount === 0)
    .map((result) => result.data)
    .sort((a, b) => (b.inboxProject ? 1 : 0) - (a.inboxProject ? 1 : 0));

  const resultSections = sectionResults
    .filter((result) => !result.isLastUsed && result.matchCount === 0)
    .map((result) => result.data);

  const resultLabels = labelResults
    .filter((result) => !result.isPrioritized)
    .map((result) => result.data);

  return [
    ...resultLastUsed.sort((a, b) => b.usage - a.usage),
    ...resultPrioritized.sort(
      (a, b) => b.matchCount - a.matchCount || b.usage - a.usage,
    ),
    ...resultProjects,
    ...resultSections,
    ...resultLabels,
  ];
}

function processAdvancedData(taskDict) {
  const todoistData = getTodoistData();
  const usageData = getUsageData();

  const labels = todoistData.labels;
  const projects = todoistData.projects;
  const sections = todoistData.sections;

  const usedLabels = taskDict.usedLabels;
  const newWords = taskDict.words.filter((word) => !stopwords.has(word));

  let body = {
    content: taskDict.content,
    description: taskDict.description,
    due_lang: lang,
    due_string: taskDict.dueString,
    priority: taskDict.prioValue,
    duration: taskDict.duration,
    duration_unit: taskDict.durationUnit,
    deadline_date: taskDict.deadline?.date,
    deadline_lang: taskDict.deadline?.lang,
    project_id: taskDict.id,
  };

  // Sections & Section with Labels
  if (taskDict.type.includes('section')) {
    const sectionId = taskDict.id;

    // Remember used words
    if (!usageData.sections[sectionId]) {
      usageData.sections[sectionId] = { usage: 0, usedWords: [] };
    }
    const sectionUsedWords = usageData.sections[sectionId].usedWords || [];
    usageData.sections[sectionId].usedWords = [
      ...new Set([...sectionUsedWords, ...newWords]),
    ];

    // Count usage
    usageData.sections[sectionId].usage =
      (usageData.sections[sectionId].usage || 0) + 1;

    body.project_id = taskDict.sectionProjectId;
    body.section_id = taskDict.id;

    if (taskDict.type == 'sectionAndLabel') {
      // Add labels to body
      body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

      // Remember section used for the label
      const lastLabelId = usedLabels.slice(-1)[0].labelId;
      if (!usageData.labels[lastLabelId]) {
        usageData.labels[lastLabelId] = { usage: 0, usedWords: [] };
      }
      usageData.labels[lastLabelId].lastUsed = 'section';
      usageData.labels[lastLabelId].lastUsedSectionId = sectionId;
      delete usageData.labels[lastLabelId].lastUsedCategoryId;

      // Remember words and count usage for each label
      for (const usedLabel of usedLabels) {
        const labelId = usedLabel.labelId;
        if (!usageData.labels[labelId]) {
          usageData.labels[labelId] = { usage: 0, usedWords: [] };
        }
        const labelUsedWords = usageData.labels[labelId].usedWords || [];
        usageData.labels[labelId].usedWords = [
          ...new Set([...labelUsedWords, ...newWords]),
        ];
        usageData.labels[labelId].usage =
          (usageData.labels[labelId].usage || 0) + 1;
      }
    }

    saveUsageData(usageData);
    return body;
  }

  // Projects & Projects with Labels
  const projectId = taskDict.id;

  // Statistics for projects except for Inbox
  const project = projects.find((p) => p.id === projectId);
  if (project && project.inbox_project !== true) {
    // Remember used words
    if (!usageData.projects[projectId]) {
      usageData.projects[projectId] = { usage: 0, usedWords: [] };
    }
    const projectUsedWords = usageData.projects[projectId].usedWords || [];
    usageData.projects[projectId].usedWords = [
      ...new Set([...projectUsedWords, ...newWords]),
    ];

    // Count usage
    usageData.projects[projectId].usage =
      (usageData.projects[projectId].usage || 0) + 1;
  }

  if (taskDict.type == 'projectAndLabel') {
    // Add label to body
    body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

    // Remember project used for the label
    const lastLabelId = usedLabels.slice(-1)[0].labelId;
    if (!usageData.labels[lastLabelId]) {
      usageData.labels[lastLabelId] = { usage: 0, usedWords: [] };
    }
    usageData.labels[lastLabelId].lastUsed = 'project';
    usageData.labels[lastLabelId].lastUsedCategoryId = projectId;
    delete usageData.labels[lastLabelId].lastUsedSectionId;

    // Remember words and count usage for each label
    for (const usedLabel of usedLabels) {
      const labelId = usedLabel.labelId;
      if (!usageData.labels[labelId]) {
        usageData.labels[labelId] = { usage: 0, usedWords: [] };
      }
      const labelUsedWords = usageData.labels[labelId].usedWords || [];
      usageData.labels[labelId].usedWords = [
        ...new Set([...labelUsedWords, ...newWords]),
      ];
      usageData.labels[labelId].usage =
        (usageData.labels[labelId].usage || 0) + 1;
    }
  }

  saveUsageData(usageData);
  return body;
}

function processPostResponse(result, reminder) {
  if (!result.error) {
    if (result.response.status != 200) {
      // LaunchBar.log(JSON.stringify(result));
      LaunchBar.displayNotification({
        title: 'Todoist Action Error',
        string: `${result.response.status}: ${result.response.localizedStatus}: ${result.data}`,
      });
      if (result.response.status == 401) {
        Action.preferences.apiToken = undefined; // to promt API token entry dialog
      }
      return;
    }

    // MARK: Open Task URL

    const data = eval(`[${result.data}]`)[0];
    const taskID = data.id;
    const url = `todoist://task?id=${taskID}`;

    // Open Task
    if (LaunchBar.options.commandKey || Action.preferences.openTaskOnAdd) {
      LaunchBar.openURL(url);
    }

    // Add Reminder
    if (reminder) {
      // const dueDate = data.due?.date;
      // if (dueDate.includes('T') && reminder.includes('vorher')) {
      //   // TODO: create a regex test depending on language … and count in minutes for minute_offset … but it would be nice if that could be covered by due string … I send feedback about that to Doist
      // }

      postReminder(taskID, reminder);
    }

    return;
  }

  LaunchBar.displayNotification({
    title: 'Todoist Action Error',
    string: result.error,
  });
}

function postReminder(taskID, reminder) {
  const [tempId, uuid] = LaunchBar.execute('/bin/bash', './idGen.sh').split(
    '\n',
  );

  const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
    body: {
      commands: [
        {
          type: 'reminder_add',
          temp_id: tempId,
          uuid,
          args: {
            item_id: taskID,
            due: {
              string: reminder,
              lang,
            },
            type: 'absolute',
          },
        },
      ],
    },
  });

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

  // Check if there are errors in sync_status
  const parsedData = JSON.parse(result.data);
  const errorInfo = Object.values(parsedData.sync_status || {})[0];

  if (errorInfo?.error) {
    const errorTitle = errorInfo.error;
    const errorExplanation =
      errorInfo.error_extra?.explanation || 'Unknown error';
    const errorMessage = `${errorTitle}: ${errorExplanation}`;

    const response = LaunchBar.alert(
      'Reminder Error',
      errorMessage,
      'Open Task'.localize(),
      'Cancel'.localize(),
    );
    if (response === 0) LaunchBar.openURL(`todoist://task?id=${taskID}`);
    return;
  }
}

// MARK: Settings

function settings() {
  let icon, actionArgument, subtitle, badge;

  if (Action.preferences.openTaskOnAdd) {
    actionArgument = 'off';
    icon = 'openTemplate';
    subtitle = 'Hit enter to turn off'.localize();
    badge = 'On'.localize();
  } else {
    actionArgument = 'on';
    icon = 'greyOpenTemplate';
    subtitle = 'Hit enter to turn on'.localize();
    badge = 'Off'.localize();
  }

  return [
    {
      title: 'Open task after creation'.localize(),
      subtitle,
      badge,
      icon,
      action: 'openTaskSetting',
      actionArgument,
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Update'.localize(),
      icon: 'updateTemplate',
      children: refreshData(),
    },
    {
      title: 'Reset API-Token'.localize(),
      icon: 'keyTemplate',
      action: 'setApiKey',
    },
  ];
}

function openTaskSetting(argument) {
  if (argument == 'on') {
    Action.preferences.openTaskOnAdd = true;
  } else {
    Action.preferences.openTaskOnAdd = undefined;
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
      title: 'Refresh projects, sections & labels.'.localize(),
      subtitle:
        'Local data will be updated without affecting usage statistics.'.localize(),
      icon: 'updateTemplate',
      action: 'update',
      alwaysShowsSubtitle: true,
      actionRunsInBackground: true,
    },
    {
      title: 'Reset projects, sections & labels.'.localize(),
      subtitle: 'Replace local data with a full sync.'.localize(),
      icon: 'resetTemplate',
      action: 'resetTodoistDataWarning',
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Reset Usage Data'.localize(),
      subtitle: 'Clear all usage statistics.'.localize(),
      icon: 'eraserTemplate',
      action: 'resetUsageDataWarning',
      alwaysShowsSubtitle: true,
    },
  ];
}

function resetTodoistDataWarning() {
  const response = LaunchBar.alert(
    'Are you sure?'.localize(),
    'This will remove all current Todoist data and perform a full sync.'.localize(),
    'Ok',
    'Cancel'.localize(),
  );
  switch (response) {
    case 0:
      return resetTodoistData();

    case 1:
      return;
  }
}

function resetUsageDataWarning() {
  const response = LaunchBar.alert(
    'Are you sure?'.localize(),
    'This will clear all usage statistics.'.localize(),
    'Ok',
    'Cancel'.localize(),
  );
  switch (response) {
    case 0:
      return resetUsageData();

    case 1:
      return;
  }
}
