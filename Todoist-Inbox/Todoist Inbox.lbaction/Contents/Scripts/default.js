/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2025-04-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://todoist.com/api/v1/docs
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

  // Data migration to new API
  if (File.exists(projectsPath)) {
    const projects = File.readJSON(projectsPath);
    if (!projects.data?.results) {
      migrateData();
    }
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
    prioValue,
    prioText,
    deadline,
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

  let labels = File.readJSON(labelsPath).data.results;
  let lastUsed, lastUsedCategoryId, lastUsedSectionId;

  if (labelDict) {
    taskDict.usedLabels = [...usedLabels, labelDict];

    const labelIndex = labels.findIndex(
      (item) => item.id === labelDict.labelId
    );

    lastUsed = labels[labelIndex].lastUsed;
    lastUsedCategoryId = labels[labelIndex].lastUsedCategoryId;
    lastUsedSectionId = labels[labelIndex].lastUsedSectionId;
    lastUsedLabelId = labels[labelIndex].lastUsedLabelId;
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

  const projects = File.readJSON(projectsPath).data.results;

  // MARK: Projects

  const projectResults = projects.map((project, index) => {
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
        index,
      },
      actionRunsInBackground: true,
    };

    // Determine match count for prioritization
    let matchCount = words.includes(project.name.toLowerCase()) ? 2 : 0;
    if (project.usedWords) {
      const additionalMatches = words.filter((word) =>
        project.usedWords.includes(word)
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

  const sections = File.readJSON(sectionsPath).data.results;

  const sectionResults = sections.map((section, index) => {
    const name = section.name;
    const id = section.id;
    const sectionProjectId = section.project_id;

    const project = projects.find((item) => item.id === sectionProjectId);
    const sectionProjectName = project ? project.name : '';
    const usage = section.usage || 0;

    const pushDataSection = {
      title: `${name} (${sectionProjectName})`,
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
    if (section.usedWords) {
      const additionalMatches = words.filter((word) =>
        section.usedWords.includes(word)
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

    // Determine match count for prioritization
    let matchCount = words.includes(label.name.toLowerCase()) ? 2 : 0;
    if (label.usedWords) {
      const additionalMatches = words.filter((word) =>
        label.usedWords.includes(word)
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
    .map((result) => result.data);

  const resultSections = sectionResults
    .filter((result) => !result.isLastUsed && result.matchCount === 0)
    .map((result) => result.data);

  const resultLabels = labelResults
    .filter((result) => !result.isPrioritized)
    .map((result) => result.data);

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
    deadline_date: taskDict.deadline?.date,
    deadline_lang: taskDict.deadline?.lang,
    project_id: taskDict.id,
  };

  // Sections & Section with Labels
  if (taskDict.type.includes('section')) {
    const sectionIndex = taskDict.index;

    // Remember used words
    const sectionUsedWords =
      sections.data.results[sectionIndex].usedWords || [];
    sections.data.results[sectionIndex].usedWords = [
      ...new Set([...sectionUsedWords, ...newWords]),
    ];

    // Count usage
    sections.data.results[sectionIndex].usage
      ? sections.data.results[sectionIndex].usage++
      : (sections.data.results[sectionIndex].usage = 1);

    body.project_id = taskDict.sectionProjectId;
    body.section_id = taskDict.id;

    if (taskDict.type == 'sectionAndLabel') {
      // Add labels to body
      body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

      // Remember section used for the label
      const lastLabelId = usedLabels.slice(-1)[0].labelId;
      const lastLabelIndex = labels.data.results.findIndex(
        (item) => item.id === lastLabelId
      );

      labels.data.results[lastLabelIndex].lastUsed = 'section';
      labels.data.results[lastLabelIndex].lastUsedSectionId = taskDict.id;

      // Remember words and count usage
      for (const usedLabel of usedLabels) {
        const labelId = usedLabel.labelId;
        const labelIndex = labels.data.results.findIndex(
          (item) => item.id === labelId
        );

        // Remember used words
        const labelUsedWords = labels.data.results[labelIndex].usedWords || [];
        labels.data.results[labelIndex].usedWords = [
          ...new Set([...labelUsedWords, ...newWords]),
        ];

        // Count usage
        labels.data.results[labelIndex].usage
          ? labels.data.results[labelIndex].usage++
          : (labels.data.results[labelIndex].usage = 1);
      }

      File.writeJSON(labels, labelsPath);
    }

    File.writeJSON(sections, sectionsPath);
    return body;
  }

  // Projects & Projects with Labels
  const projectIndex = taskDict.index;

  // Statistics for projects except for Inbox
  if (projects.data.results[projectIndex].is_inbox_project === false) {
    // Remember used words
    const projectUsedWords =
      projects.data.results[projectIndex].usedWords || [];
    projects.data.results[projectIndex].usedWords = [
      ...new Set([...projectUsedWords, ...newWords]),
    ];

    // Count usage
    projects.data.results[projectIndex].usage
      ? projects.data.results[projectIndex].usage++
      : (projects.data.results[projectIndex].usage = 1);
  }

  if (taskDict.type == 'projectAndLabel') {
    // Add label to body
    body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

    // Remember project used for the label
    const lastLabelId = usedLabels.slice(-1)[0].labelId;
    const lastLabelIndex = labels.data.results.findIndex(
      (item) => item.id === lastLabelId
    );
    labels.data.results[lastLabelIndex].lastUsed = 'project';
    labels.data.results[lastLabelIndex].lastUsedCategoryId = taskDict.id;

    // Remember words and count usage
    for (const usedLabel of usedLabels) {
      const labelId = usedLabel.labelId;
      const labelIndex = labels.data.results.findIndex(
        (item) => item.id === labelId
      );

      // Remember used words
      const labelUsedWords = labels.data.results[labelIndex].usedWords || [];
      labels.data.results[labelIndex].usedWords = [
        ...new Set([...labelUsedWords, ...newWords]),
      ];

      // Count usage
      labels.data.results[labelIndex].usage
        ? labels.data.results[labelIndex].usage++
        : (labels.data.results[labelIndex].usage = 1);
    }

    File.writeJSON(labels, labelsPath);
  }

  File.writeJSON(projects, projectsPath);
  return body;
}

function processPostResponse(result, sections, projects) {
  if (!result.error) {
    if (result.response.status != 200) {
      LaunchBar.log(JSON.stringify(result));
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
      const project = projects.data.results.find(
        (p) => p.id === data.project_id
      );

      const projectName = project ? project.name : '';
      const projectString = projectName != 'Inbox' ? `#${projectName}` : '';

      if (data.section_id) {
        const section = sections.data.results.find(
          (s) => s.id === data.section_id
        );
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

      // Deadline
      const deadline = data.deadline;
      const deadlineDate = deadline?.date
        ? LaunchBar.formatDate(new Date(deadline.date), {
            relativeDateFormatting: true,
            timeStyle: 'none',
          })
        : null;

      const deadlineString = deadlineDate
        ? `\n${'Deadline'.localize()}: ${deadlineDate}`
        : '';

      // Duration
      const duration = data.duration;

      const durationString = duration
        ? `\n${'Duration'.localize()}: ${
            duration.amount
          } ${capitalizeFirstLetter(data.duration.unit)}${'(s)'.localize()}`
        : '';

      let notificationString = dueString
        ? `${dueString}${deadlineString}${durationString}\n${projectString}`
        : projectString;

      // Labels
      const labels = data.labels;
      if (labels?.length) {
        notificationString += labels.map((label) => ` @${label}`).join('');
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
