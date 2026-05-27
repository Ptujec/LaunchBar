/*
Todoist Today View Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-05-27

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

DOCUMENTATION:
- https://developer.todoist.com/api/v1/
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.todoist.com/guides/#tasks (Task URL Scheme)


TODO:
- setting to reset the API token
- better performance by using the Sync API?
*/

function run() {
  if (!Action.preferences.apiToken) return setApiKey();

  try {
    const response = HTTP.getJSON(
      'https://todoist.com/api/v1/tasks/filter?query=today&limit=30',
      {
        headerFields: {
          Authorization: `Bearer ${Action.preferences.apiToken}`,
        },
      },
    );

    if (response.error) {
      if (response.response?.localizedStatus === 'forbidden') {
        LaunchBar.alert('Invalid API Token', 'Please set a valid API token');
        setApiKey();
      } else {
        LaunchBar.alert(
          'API Error',
          response.error || 'Unknown error occurred',
        );
      }
      return;
    }

    // Ensure we have valid data with results array
    if (
      !response.data ||
      !response.data.results ||
      !Array.isArray(response.data.results)
    ) {
      LaunchBar.alert('Error', 'Invalid response format from Todoist API');
      return;
    }

    // File.writeJSON(response, Action.supportPath + '/test.json');
    // const response = File.readJSON(Action.supportPath + '/test.json');

    const tasks = response.data.results;

    // File.writeText(data, Action.supportPath + '/testData.json');

    return processTasks(tasks);
  } catch (error) {
    LaunchBar.alert('Error fetching tasks', error.message);
    return;
  }
}

function processTasks(tasks) {
  // Ensure tasks is an array
  if (!Array.isArray(tasks)) {
    LaunchBar.alert('Error', 'Tasks data is not in the expected format');
    return;
  }

  if (tasks.length === 0) {
    const title =
      LaunchBar.currentLocale === 'de' // Add proper localization
        ? 'Alles erledigt für heute!'
        : 'All done for today!';
    return [
      {
        title,
        icon: 'checkmarkTemplate',
        url: 'todoist://',
      },
    ];
  }

  return tasks
    .sort((a, b) => {
      // First sort by priority (4 is highest)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by due date
      if (a.due && b.due) {
        return new Date(a.due.date) - new Date(b.due.date);
      }
      // Finally by creation date
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .map((task) => {
      const { content, priority, description, labels, due } = task;
      const icon =
        {
          4: 'dotRed',
          3: 'dotOrange',
          2: 'dotBlue',
          1: 'dotTemplate',
        }[priority] || 'dotTemplate';

      let title = content;
      let url = task.url || `todoist://task?id=${task.id}`;
      let badge, mdLink;

      // Handle markdown-style links
      if (content.includes('](')) {
        const match = content.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          title = match[1];
          mdLink = match[2];
          badge = mdLink?.includes('todoist')
            ? mdLink?.includes('project')
              ? 'Project Link'
              : mdLink?.includes('task')
                ? 'Task Link'
                : 'Internal Link'
            : 'Link';
        }
      }

      return {
        title,
        subtitle: description || undefined,
        icon,
        badge,
        action: 'handleOptions',
        actionArgument: {
          url,
          mdLink,
        },
        actionRunsInBackground: true,
      };
    });
}

function handleOptions({ url, mdLink }) {
  if (mdLink?.includes('todoist.com')) {
    const id = mdLink.split('/').pop();

    if (mdLink.includes('/task/')) {
      mdLink = `todoist://task?id=${id}`;
    } else if (mdLink.includes('/project/')) {
      mdLink = `todoist://project?id=${id}`;
    }
  }

  LaunchBar.hide();
  if (LaunchBar.options.commandKey || !mdLink) {
    LaunchBar.openURL(url);
    return;
  }

  LaunchBar.openURL(mdLink);
}

function setApiKey() {
  const response = LaunchBar.alert(
    'API-Token required',
    '1) Go to Settings/Integrations/Developer and copy the API-Token.\n2) Press »Set API-Token«',
    'Open Todoist',
    'Set API-Token',
    'Cancel',
  );

  if (response === 2) {
    LaunchBar.hide();
    return;
  }

  if (response === 0) {
    LaunchBar.openURL(
      'https://app.todoist.com/app/settings/integrations/developer',
    );
    LaunchBar.hide();
    return;
  }

  // If response is 1 (Set API-Token was pressed)

  const clipboardContent = LaunchBar.getClipboardString().trim();

  if (clipboardContent.length !== 40) {
    LaunchBar.alert(
      'The length of the clipboard content does not match the length of a correct API-Token',
      'Make sure the API-Token is the most recent item in the clipboard!',
    );
    LaunchBar.hide();
    return;
  }

  // Test API-Token
  const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
    headerFields: { Authorization: `Bearer ${clipboardContent}` },
    body: {
      sync_token: '*',
      resource_types: '["user"]',
    },
  });

  if (result.error) {
    LaunchBar.alert('Todoist Action Error', result.error);
    return;
  }

  if (!result.response || result.response.status !== 200) {
    const statusCode = result.response?.status;

    const title = statusCode
      ? `Todoist API Error (${statusCode})`
      : 'Todoist API Error';

    const localizedStatus = result.response?.localizedStatus;

    const resultData = result.data;

    const errorMessage = localizedStatus
      ? `${localizedStatus}: ${resultData ? resultData : ''}`
      : resultData
        ? resultData
        : '';

    LaunchBar.alert(title, errorMessage);
    return;
  }

  // Write new API-Token in Action preferences
  Action.preferences.apiToken = clipboardContent;

  LaunchBar.alert(
    'Success!',
    `API-Token set to: ${Action.preferences.apiToken}`,
  );
}
