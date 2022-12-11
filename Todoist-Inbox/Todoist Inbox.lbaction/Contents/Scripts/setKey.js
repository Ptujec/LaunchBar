/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('update.js');

function setApiKey() {
  var response = LaunchBar.alert(
    'API-Token required',
    '1) Go to Settings/Integrations/Developer and copy the API-Token.\n2) Press »Set API-Token«',
    'Open Settings',
    'Set API-Token',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://todoist.com/app/settings/integrations');
      LaunchBar.hide();
      break;
    case 1:
      var clipboardConent = LaunchBar.getClipboardString().trim();

      if (clipboardConent.length == 40) {
        // Test API-Token
        var projectsOnline = HTTP.getJSON(
          'https://api.todoist.com/rest/v2/projects?token=' + clipboardConent
        );

        if (projectsOnline.error != undefined) {
          LaunchBar.alert(projectsOnline.error);
        } else {
          // Write new API-Token in Action preferences
          Action.preferences.apiToken = clipboardConent;

          LaunchBar.alert(
            'Success!',
            'API-Token set to: ' +
              Action.preferences.apiToken +
              '.\nProjects, sections and labels will be updated next.'
          );

          // Write or update local data
          update();
        }
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API-Token',
          'Make sure the API-Token is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}
