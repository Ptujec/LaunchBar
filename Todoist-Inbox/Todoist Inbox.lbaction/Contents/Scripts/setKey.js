/*
Todoist Inbox Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-05-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('update.js');

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
    `API-Token set to: ${Action.preferences.apiToken}.\nProjects, sections and labels will be updated next.`,
  );

  // Write or update local data
  update();
}
