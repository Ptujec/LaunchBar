/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2025-04-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: localization (maybe someday)
*/

include('update.js');

function setApiKey() {
  const response = LaunchBar.alert(
    'API-Token required',
    '1) Go to Settings/Integrations/Developer and copy the API-Token.\n2) Press »Set API-Token«',
    'Open Settings',
    'Set API-Token',
    'Cancel',
  );
  switch (response) {
    case 0:
      LaunchBar.openURL(
        'https://app.todoist.com/app/settings/integrations/developer',
      );
      LaunchBar.hide();
      break;
    case 1:
      const clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length == 40) {
        // Test API-Token
        const result = HTTP.postJSON(`https://api.todoist.com/api/v1/sync`, {
          headerFields: { Authorization: `Bearer ${clipboardContent}` },
          body: {
            sync_token: '*',
            resource_types: '["user"]',
          },
        });

        if (result.error) {
          LaunchBar.alert(result.error);
          break;
        }

        if (!result.response || result.response.status !== 200) {
          const statusCode = result.response?.status || 'unknown';
          const errorMessage = result.data
            ? JSON.parse(result.data).error_message || 'Unknown error'
            : 'No response data';
          LaunchBar.alert(`Todoist API Error (${statusCode}): ${errorMessage}`);
          break;
        }

        // Write new API-Token in Action preferences
        Action.preferences.apiToken = clipboardContent;

        LaunchBar.alert(
          'Success!',
          'API-Token set to: ' +
            Action.preferences.apiToken +
            '.\nProjects, sections and labels will be updated next.',
        );

        // Write or update local data
        update();
        break;
      }

      LaunchBar.alert(
        'The length of the clipboard content does not match the length of a correct API-Token',
        'Make sure the API-Token is the most recent item in the clipboard!',
      );
      break;

    case 2:
      break;
  }
}
