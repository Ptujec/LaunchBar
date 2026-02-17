/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2025-04-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

DOCUMENTATION:
General:
- https://developer.todoist.com/api/v1/
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

Tasks:
- https://developer.todoist.com/guides/#tasks (URL Scheme)

Reminders:
  - https://developer.todoist.com/api/v1/#tag/Sync/Reminders/Add-a-reminder
  - https://www.todoist.com/de/help/articles/introduction-to-reminders
  - https://www.todoist.com/help/articles/introduction-to-reminders

Due dates:
  - https://todoist.com/help/articles/set-a-recurring-due-date#some-examples-of-recurring-due-dates

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
    prioString,
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
      prioString = 'Priority 1'.localize();
      break;
    case 'p2':
      prioValue = 3;
      prioString = 'Priority 2'.localize();
      break;
    case 'p3':
      prioValue = 2;
      prioString = 'Priority 3'.localize();
      break;
    default:
      prioValue = 1;
      prioString = '';
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

  const task = {
    content: argument,
    description,
    dueString,
    duration,
    durationUnit,
    reminder,
    prioValue,
    prioString,
    deadline,
    // lang, // not needed because its global
    advancedData: false,
  };

  if (!argument) return LaunchBar.alert('This task has no content!'.localize());

  if (LaunchBar.options.commandKey) return advancedOptions(task);

  postTask(task);
}

function postTask(task) {
  LaunchBar.hide();

  let body;
  if (task.advancedData) {
    body = processAdvancedData(task);
  } else {
    body = {
      content: task.content,
      description: task.description,
      due_lang: lang,
      due_string: task.dueString,
      priority: task.prioValue,
      duration: task.duration,
      duration_unit: task.durationUnit,
      deadline_date: task.deadline?.date,
      deadline_lang: task.deadline?.lang,
    };
  }

  // TEST: add return for testing
  // return;

  const result = HTTP.postJSON('https://api.todoist.com/api/v1.0/tasks', {
    body: body,
    headerFields: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  processPostResponse(result, task.reminder);
}

function advancedOptions(task) {
  if (!File.exists(todoistDataPath)) {
    Action.preferences.syncToken = undefined;
    Action.preferences.lastSyncDate = undefined;

    LaunchBar.alert(
      'Just a second! Local data needs to be updated.'.localize(),
    );
    update(false); // false = don't hide LaunchBar
  }

  Action.preferences.updateNow = true; // TEST: comment out for testing

  task.advancedData = true;

  const labelObj = task.labelObj;
  const usedLabels = task.usedLabels || [];

  const todoistData = getTodoistData();
  const usageData = getUsageData();

  let labels = todoistData.labels?.filter((label) => !label.is_archived);

  if (labelObj) task.usedLabels = [...usedLabels, labelObj];

  const usedLabelsNames = task.usedLabels
    ? task.usedLabels.map((usedLabel) => usedLabel.labelName)
    : [];
  labels = labels.filter((label) => !usedLabelsNames.includes(label.name));

  // Build used words list for relevance matching and prioritization
  const combinedText = `${task.content} ${task.description || ''}`;
  const words = buildWordsList(combinedText);
  task.words = words;

  // MARK: Projects

  const projects = todoistData.projects?.filter(
    (project) => !project.is_archived,
  );

  const projectResults = projects.map((project, index) => {
    const title = project.name == 'Inbox' ? 'Inbox'.localize() : project.name;
    const id = project.id;
    const projectUsageItem = usageData.projects[id] || {
      usage: 0,
      usedWords: {},
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
        ...task,
        type: labelObj ? 'projectAndLabel' : 'project',
        id,
        index,
      },
      actionRunsInBackground: true,
      inboxProject: project.inbox_project === true,
    };

    // Determine match count for prioritization
    let matchCount = words.filter((word) =>
      project.name.toLowerCase().includes(word),
    ).length;

    if (projectUsageItem.usedWords) {
      const additionalMatches = words.reduce((sum, word) => {
        const frequency = projectUsageItem.usedWords[word] || 0;
        return sum + frequency;
      }, 0);
      matchCount += additionalMatches;
    }

    // Add match count and badge if applicable
    if (matchCount > 0) {
      pushDataProject.matchCount = matchCount;
      pushDataProject.badge = 'Prioritized'.localize();
    }

    const isRecent = isRecentlyUsed(projectUsageItem.lastUsedDate);

    return {
      data: pushDataProject,
      matchCount,
      isRecent,
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
      usedWords: {},
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
        ...task,
        type: labelObj ? 'sectionAndLabel' : 'section',
        id,
        sectionProjectId,
        index,
      },
      actionRunsInBackground: true,
    };

    // Determine match count for prioritization
    let matchCount = words.filter((word) =>
      section.name.toLowerCase().includes(word),
    ).length;
    if (sectionUsageItem.usedWords) {
      const additionalMatches = words.reduce((sum, word) => {
        const frequency = sectionUsageItem.usedWords[word] || 0;
        return sum + frequency;
      }, 0);
      matchCount += additionalMatches;
    }

    // Add match count and badge if applicable
    if (matchCount > 0) {
      pushDataSection.matchCount = matchCount;
      pushDataSection.badge = 'Prioritized'.localize();
    }

    const isRecent = isRecentlyUsed(sectionUsageItem.lastUsedDate);

    return {
      data: pushDataSection,
      matchCount,
      isRecent,
      originalIndex: index,
    };
  });

  // MARK: Labels

  const labelResults = labels.map((label, index) => {
    const name = label.name;
    const id = label.id;
    const labelUsageItem = usageData.labels[id] || {
      usage: 0,
      usedWords: {},
      projectRelationships: {},
    };
    const usage = labelUsageItem.usage || 0;

    const pushDataLabel = {
      title: name,
      icon: 'labelTemplate',
      usage,
      action: 'advancedOptions',
      actionArgument: {
        ...task,
        labelObj: {
          labelName: name,
          labelId: id,
        },
      },
    };

    // Determine match count for prioritization
    let matchCount = words.filter((word) =>
      label.name.toLowerCase().includes(word),
    ).length;
    if (labelUsageItem.usedWords) {
      const additionalMatches = words.reduce((sum, word) => {
        const frequency = labelUsageItem.usedWords[word] || 0;
        return sum + frequency;
      }, 0);
      matchCount += additionalMatches;
    }

    // Calculate relationship frequency if selected label exists
    let relationshipFreq = 0;
    if (labelObj && labelUsageItem.projectRelationships) {
      const selectedLabelId = labelObj.labelId;
      const selectedLabelData = usageData.labels[selectedLabelId];
      if (selectedLabelData?.projectRelationships) {
        relationshipFreq = selectedLabelData.projectRelationships[id] || 0;
      }
    }

    // Add match count and badge if applicable
    const isRecent = isRecentlyUsed(labelUsageItem.lastUsedDate);

    if (matchCount > 0) {
      pushDataLabel.matchCount = matchCount;
      pushDataLabel.badge = 'Prioritized'.localize();
      return {
        data: pushDataLabel,
        matchCount,
        relationshipFreq,
        isRecent,
        originalIndex: index,
      };
    }

    return {
      data: pushDataLabel,
      matchCount,
      relationshipFreq,
      isRecent,
      originalIndex: index,
    };
  });

  // Collect all results into single list with enhanced attributes
  const allResults = [
    ...projectResults.map((result) => ({
      ...result,
      type: 'project',
      relationshipFreq: 0,
      isRecent: result.isRecent,
    })),
    ...sectionResults.map((result) => ({
      ...result,
      type: 'section',
      relationshipFreq: 0,
      isRecent: result.isRecent,
    })),
    ...labelResults.map((result) => ({
      ...result,
      type: 'label',
      isRecent: result.isRecent,
    })),
  ];

  const prioritized = allResults.filter((result) => result.matchCount > 0);

  const sortedPrioritized = prioritized.sort((a, b) => {
    // Primary: matchCount (word relevance)
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }

    // Secondary: recency (used within 30 days)
    if (a.isRecent !== b.isRecent) {
      return b.isRecent ? 1 : -1; // Recently used items come first
    }

    // Tertiary: relationship frequency (for labels) or usage (for projects/sections)
    const aTertiary =
      a.relationshipFreq !== undefined && a.relationshipFreq > 0
        ? a.relationshipFreq
        : a.data.usage;
    const bTertiary =
      b.relationshipFreq !== undefined && b.relationshipFreq > 0
        ? b.relationshipFreq
        : b.data.usage;

    if (bTertiary !== aTertiary) {
      return bTertiary - aTertiary;
    }

    // Quaternary: general usage count (final tiebreaker)
    return b.data.usage - a.data.usage;
  });

  const topThreePrioritized = sortedPrioritized.slice(0, 3);
  const topThreeIds = new Set(
    topThreePrioritized.map((item) =>
      item.type === 'label'
        ? item.data.actionArgument.labelObj.labelId
        : item.data.actionArgument.id,
    ),
  );

  // Build remaining lists by category, excluding top 3, in original order
  const remainingProjects = projectResults
    .filter((result) => !topThreeIds.has(result.data.actionArgument.id))
    .sort((a, b) => {
      // Inbox first, then by original index
      if (a.data.inboxProject !== b.data.inboxProject) {
        return a.data.inboxProject ? -1 : 1;
      }
      return a.data.actionArgument.index - b.data.actionArgument.index;
    })
    .map((result) => {
      const restored = { ...result.data };
      delete restored.badge;
      delete restored.matchCount;
      return restored;
    });

  const remainingSections = sectionResults
    .filter((result) => !topThreeIds.has(result.data.actionArgument.id))
    .sort((a, b) => a.data.actionArgument.index - b.data.actionArgument.index)
    .map((result) => {
      const restored = { ...result.data };
      delete restored.badge;
      delete restored.matchCount;
      return restored;
    });

  const remainingLabels = labelResults
    .filter(
      (result) => !topThreeIds.has(result.data.actionArgument.labelObj.labelId),
    )
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map((result) => result.data);

  // Build final result list
  const finalResults = [
    ...topThreePrioritized.map((result) => result.data),
    ...remainingProjects,
    ...remainingSections,
    ...remainingLabels,
  ];

  return finalResults;
}

function processAdvancedData(task) {
  const todoistData = getTodoistData();
  const usageData = getUsageData();

  const projects = todoistData.projects;

  const usedLabels = task.usedLabels;
  const newWords = task.words;

  let body = {
    content: task.content,
    description: task.description,
    due_lang: lang,
    due_string: task.dueString,
    priority: task.prioValue,
    duration: task.duration,
    duration_unit: task.durationUnit,
    deadline_date: task.deadline?.date,
    deadline_lang: task.deadline?.lang,
    project_id: task.id,
  };

  // Sections & Section with Labels
  if (task.type.includes('section')) {
    const sectionId = task.id;

    // Remember used words with frequency tracking
    if (!usageData.sections[sectionId]) {
      usageData.sections[sectionId] = { usage: 0, usedWords: {} };
    }
    const sectionUsedWords = usageData.sections[sectionId].usedWords || {};
    newWords.forEach((word) => {
      sectionUsedWords[word] = (sectionUsedWords[word] || 0) + 1;
    });
    usageData.sections[sectionId].usedWords = sectionUsedWords;

    // Count usage
    usageData.sections[sectionId].usage =
      (usageData.sections[sectionId].usage || 0) + 1;
    usageData.sections[sectionId].lastUsedDate = new Date().toISOString();

    body.project_id = task.sectionProjectId;
    body.section_id = task.id;

    if (task.type == 'sectionAndLabel') {
      // Add labels to body
      body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

      // Remember section used for the label & track relationship frequency
      const lastLabelId = usedLabels.slice(-1)[0].labelId;
      if (!usageData.labels[lastLabelId]) {
        usageData.labels[lastLabelId] = {
          usage: 0,
          usedWords: {},
          projectRelationships: {},
        };
      }

      // Track label + section co-usage
      if (!usageData.labels[lastLabelId].projectRelationships) {
        usageData.labels[lastLabelId].projectRelationships = {};
      }
      usageData.labels[lastLabelId].projectRelationships[sectionId] =
        (usageData.labels[lastLabelId].projectRelationships[sectionId] || 0) +
        1;
      usageData.labels[lastLabelId].lastUsedDate = new Date().toISOString();

      // Remember words and count usage for each label with frequency tracking
      for (const usedLabel of usedLabels) {
        const labelId = usedLabel.labelId;
        if (!usageData.labels[labelId]) {
          usageData.labels[labelId] = {
            usage: 0,
            usedWords: {},
            projectRelationships: {},
          };
        }
        const labelUsedWords = usageData.labels[labelId].usedWords || {};
        newWords.forEach((word) => {
          labelUsedWords[word] = (labelUsedWords[word] || 0) + 1;
        });
        usageData.labels[labelId].usedWords = labelUsedWords;
        usageData.labels[labelId].usage =
          (usageData.labels[labelId].usage || 0) + 1;
        usageData.labels[labelId].lastUsedDate = new Date().toISOString();
      }
    }

    saveUsageData(usageData);
    return body;
  }

  // Projects & Projects with Labels
  const projectId = task.id;

  // Statistics for projects except for Inbox
  const project = projects.find((p) => p.id === projectId);
  if (project && project.inbox_project !== true) {
    // Remember used words with frequency tracking
    if (!usageData.projects[projectId]) {
      usageData.projects[projectId] = { usage: 0, usedWords: {} };
    }
    const projectUsedWords = usageData.projects[projectId].usedWords || {};
    newWords.forEach((word) => {
      projectUsedWords[word] = (projectUsedWords[word] || 0) + 1;
    });
    usageData.projects[projectId].usedWords = projectUsedWords;

    // Count usage
    usageData.projects[projectId].usage =
      (usageData.projects[projectId].usage || 0) + 1;
    usageData.projects[projectId].lastUsedDate = new Date().toISOString();
  }

  if (task.type == 'projectAndLabel') {
    // Add label to body
    body.labels = usedLabels.map((usedLabel) => usedLabel.labelName);

    // Remember project used for the label & track relationship frequency
    const lastLabelId = usedLabels.slice(-1)[0].labelId;
    if (!usageData.labels[lastLabelId]) {
      usageData.labels[lastLabelId] = {
        usage: 0,
        usedWords: {},
        projectRelationships: {},
      };
    }

    // Track label + project co-usage
    if (!usageData.labels[lastLabelId].projectRelationships) {
      usageData.labels[lastLabelId].projectRelationships = {};
    }
    usageData.labels[lastLabelId].projectRelationships[projectId] =
      (usageData.labels[lastLabelId].projectRelationships[projectId] || 0) + 1;
    usageData.labels[lastLabelId].lastUsedDate = new Date().toISOString();

    // Remember words and count usage for each label with frequency tracking
    for (const usedLabel of usedLabels) {
      const labelId = usedLabel.labelId;
      if (!usageData.labels[labelId]) {
        usageData.labels[labelId] = {
          usage: 0,
          usedWords: {},
          projectRelationships: {},
        };
      }
      const labelUsedWords = usageData.labels[labelId].usedWords || {};
      newWords.forEach((word) => {
        labelUsedWords[word] = (labelUsedWords[word] || 0) + 1;
      });
      usageData.labels[labelId].usedWords = labelUsedWords;
      usageData.labels[labelId].usage =
        (usageData.labels[labelId].usage || 0) + 1;
      usageData.labels[labelId].lastUsedDate = new Date().toISOString();
    }
  }

  saveUsageData(usageData);
  return body;
}

function processPostResponse(result, reminder) {
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
      const dueDate = data.due?.date;
      postReminder(taskID, reminder, dueDate);
    }

    return;
  }

  LaunchBar.displayNotification({
    title: 'Todoist Action Error',
    string: result.error,
  });
}

function postReminder(taskID, reminder, dueDate) {
  const reminderConfig = parseReminderString(reminder, dueDate);
  if (!reminderConfig) return;

  const [tempId, uuid] = LaunchBar.execute('/bin/bash', './idGen.sh').split(
    '\n',
  );

  const args = {
    item_id: taskID,
    type: reminderConfig.type,
  };

  if (reminderConfig.type === 'relative') {
    args.minute_offset = reminderConfig.minute_offset;
  } else {
    args.due = reminderConfig.due;
  }

  const commands = [
    {
      type: 'reminder_add',
      temp_id: tempId,
      uuid,
      args,
    },
  ];

  const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
    headerFields: { Authorization: `Bearer ${apiToken}` },
    body: {
      commands,
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
  const syncStatus = parsedData.sync_status || {};

  // Find any errors in the sync_status
  const errors = Object.entries(syncStatus)
    .filter(([_, status]) => typeof status === 'object' && status.error)
    .map(([_, status]) => status);

  if (errors.length > 0) {
    const firstError = errors[0];
    const errorTitle = firstError.error;
    const errorExplanation =
      firstError.error_extra?.explanation || 'Unknown error';
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

function parseReminderString(reminder, dueDate) {
  reminder = reminder.trim();

  const hasBeforeKeyword = reBeforeReminder.test(reminder);

  // LaunchBar.log(
  //   `[Reminder Debug] reminder="${reminder}", dueDate="${dueDate}"`,
  // ); // DEBUG:

  // Check if it contains only time offset patterns and optional before keywords
  // Patterns like: 30m, 1h, 1h30m, 1hb, 30m before, 1h vorher, etc.
  const isTimeOffsetPattern =
    /^(\d+(?:\s*[hm]\s*)?)+(?:\s*(?:before|b|vorher|v))?$/i.test(reminder);

  // LaunchBar.log(
  //   `[Reminder Debug] hasBeforeKeyword=${hasBeforeKeyword}, isTimeOffsetPattern=${isTimeOffsetPattern}`,
  // ); // DEBUG:

  // Use relative (minute_offset) reminder if:
  // 1. It's a time offset pattern
  // 2. It has a before keyword (using locale-specific pattern)
  // 3. Due date exists and has a time component (contains 'T' or has time info)
  if (
    isTimeOffsetPattern &&
    hasBeforeKeyword &&
    dueDate &&
    (dueDate.includes('T') || dueDate.includes(' '))
  ) {
    // Extract hours and minutes
    let totalMinutes = 0;

    // Extract all number-unit pairs (e.g., "1h", "30m")
    const matches = reminder.match(/(\d+)\s*([hm])/gi) || [];

    for (const match of matches) {
      const numUnitMatch = match.match(/(\d+)\s*([hm])/i);
      if (numUnitMatch) {
        const value = parseInt(numUnitMatch[1]);
        const unit = numUnitMatch[2].toLowerCase();

        if (unit === 'h') {
          totalMinutes += value * 60;
        } else if (unit === 'm') {
          totalMinutes += value;
        }
      }
    }

    // LaunchBar.log(
    //   `[Reminder Debug] Relative reminder: ${totalMinutes} minutes offset`,
    // ); // DEBUG:
    return {
      type: 'relative',
      minute_offset: totalMinutes,
    };
  }

  // Try to convert time offset patterns (without before keyword) or "later"/"später" to absolute date
  if (
    (isTimeOffsetPattern && !hasBeforeKeyword) ||
    reminder.match(/^(?:later|später)$/i)
  ) {
    const reminderConfig = convertTimeOffset(reminder);
    if (reminderConfig && reminderConfig.date) {
      // LaunchBar.log(
      //   `[Reminder Debug] Using absolute reminder with calculated date "${reminderConfig.date}"`,
      // ); // DEBUG:
      return {
        type: 'absolute',
        due: {
          date: reminderConfig.date,
        },
      };
    }
  }

  // For other absolute reminders, use as-is
  if (!isTimeOffsetPattern && !reminder.match(/^(?:later|später)$/i)) {
    // LaunchBar.log(
    //   `[Reminder Debug] Using absolute reminder with string "${reminder}"`,
    // ); // DEBUG:
    return {
      type: 'absolute',
      due: {
        string: reminder,
        lang,
      },
    };
  }

  // If conversion failed, skip reminder
  LaunchBar.log(
    `[Reminder Debug] Skipping reminder - could not convert reminder string`,
  );
  return null;
}

function convertTimeOffset(reminder) {
  reminder = reminder.trim().toLowerCase();

  // Handle "later" / "später" - calculate 4 hours from now, rounded down to the nearest hour
  if (reminder === 'later' || reminder === 'später') {
    const now = new Date();
    const later = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Add 4 hours
    later.setMinutes(0, 0, 0); // Round down to the nearest hour
    return {
      date: later.toISOString(),
    };
  }

  // Extract hours and minutes from patterns like "30m", "2h30m", "1h", etc.
  const matches = reminder.match(/(\d+)\s*([hm])/gi) || [];

  if (matches.length === 0) return null;

  let hours = 0;
  let minutes = 0;

  for (const match of matches) {
    const numUnitMatch = match.match(/(\d+)\s*([hm])/i);
    if (numUnitMatch) {
      const value = parseInt(numUnitMatch[1]);
      const unit = numUnitMatch[2].toLowerCase();

      if (unit === 'h') {
        hours += value;
      } else if (unit === 'm') {
        minutes += value;
      }
    }
  }

  // For time offset patterns, calculate the absolute date
  const totalMinutes = hours * 60 + minutes;
  const now = new Date();
  const future = new Date(now.getTime() + totalMinutes * 60 * 1000);
  return {
    date: future.toISOString(),
  };
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
      title: 'Update Options'.localize(),
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
      subtitle: 'Local data will be updated.'.localize(),
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
      actionRunsInBackground: true,
    },
    {
      title: 'Reset Usage Data'.localize(),
      subtitle: 'Clear all usage statistics.'.localize(),
      icon: 'eraserTemplate',
      action: 'resetUsageDataWarning',
      alwaysShowsSubtitle: true,
    },
    {
      title: 'Clean Up Used Words'.localize(),
      subtitle: 'Reapply stopwords filtering to used words list.'.localize(),
      alwaysShowsSubtitle: true,
      icon: 'cleanTemplate',
      action: 'cleanStopwordsUsedWordsList',
      actionRunsInBackground: true,
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
