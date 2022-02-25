// Todoist Inbox Suggestion Script
//

const apiToken = Action.preferences.apiToken;

var dateStrings = File.readJSON(
  '~/Library/Application Support/LaunchBar/Actions/Todoist Inbox.lbaction/Contents/Resources/dateStrings.json'
);

// Localization
if (LaunchBar.currentLocale == 'de') {
  var p1 = 'Priorität 1';
  var p2 = 'Priorität 2';
  var p3 = 'Priorität 3';
  var advancedOptions = 'Weitere Optionen (Projekte & Etiketten)';

  dateStrings = dateStrings.de;
} else {
  var p1 = 'Priority 1';
  var p2 = 'Priority 2';
  var p3 = 'Priority 3';
  var advancedOptions = 'Advanced Options (Projects & Labels)';

  dateStrings = dateStrings.en;
}

function runWithString(string) {
  if (apiToken == undefined) {
    setApiKey();
  } else {
    if (string.startsWith('.')) {
      // Get Markdown Links from Mail and Safari
      var output = LaunchBar.executeAppleScriptFile(
        './mdLinks.applescript'
      ).trim();

      if (output != '_') {
        output = output.split('\n_');

        if (output[1] == undefined) {
          var safariMD = output.toString().replace(/^_/, '');

          return [
            {
              title: safariMD,
              icon: 'com.apple.safari',
            },
          ];
        } else {
          var mailOutput = output[0].split('\n');

          var mailResult = [];
          for (var i = 0; i < mailOutput.length; i++) {
            var title = mailOutput[i].split('--')[0];
            var subtitle = mailOutput[i].split('--')[1];

            mailResult.push({
              title: title.trim(),
              subtitle: subtitle,
              icon: 'com.apple.mail',
            });
          }

          if (output[1] != '') {
            var safariResult = [
              {
                title: output[1],
                icon: 'com.apple.safari',
              },
            ];

            var result = mailResult.concat(safariResult);
            return result;
          } else {
            return mailResult;
          }
        }
      }
    } else {
      // Main Action
      var result = [];
      var show = false;

      if (/(p[1-3] )|( p[1-3])/.test(string)) {
        if (string.includes('p1')) {
          var p = p1;
          var icon = 'redFlag';
        } else if (string.includes('p2')) {
          var p = p2;
          var icon = 'orangeFlag';
        } else if (string.includes('p3')) {
          var p = p3;
          var icon = 'blueFlag';
        } else {
          var p = undefined;
        }
        string = string.replace(/(p[1-3] )|( p[1-3])/, '');
      }

      // Due/date String
      // with @ (should work for most cenarios except for "@date <title>")
      if (string.includes(' @')) {
        show = true;
        var due = string.match(/ @(.*?)(p\d|((^| )#($| ))|$)/)[1];
        result.push({
          title: due,
          icon: 'calTemplate',
          order: 02,
        });
        string = string.replace(/ @(.*?)(p\d|((^| )#($| ))|$)/, '$2');
      } else {
        // dateStrings
        for (var i = 0; i < dateStrings.length; i++) {
          var dateString = dateStrings[i];
          var re = new RegExp('(^| )' + dateString + '($| )', 'i');
          if (re.test(string)) {
            show = true;
            var dateTitle = string.match(re)[0].trim();
            result.push({
              title: dateTitle,
              icon: 'calTemplate',
              order: 02,
            });
            string = string.replace(re, ' ');
          }
        }
      }

      if (p != undefined) {
        show = true;
        result.push({
          title: p,
          icon: icon,
          order: 03,
        });
      }

      if (/#($| )/.test(string)) {
        show = true;
        result.push({
          title: advancedOptions,
          icon: 'returnTemplate',
          order: 04,
        });
      }

      if (show == true) {
        string = string.replace(/#($| )/, ' ').trim();
        string = string.charAt(0).toUpperCase() + string.slice(1);

        result.push({
          title: string,
          icon: 'titleTemplate',
          order: 01,
        });

        result.sort(function (a, b) {
          return a.order > b.order;
        });

        return result;
      }
    }
  }
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API-Token required',
    '1) Go to Settings/Integrations and copy the API-Token.\n2) Press »Set API-Token«',
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
        var projects = HTTP.getJSON(
          'https://api.todoist.com/rest/v1/projects?token=' + clipboardConent
        );

        if (projects.error != undefined) {
          LaunchBar.alert(projects.error);
        } else {
          Action.preferences.apiToken = clipboardConent;

          Action.preferences.projects = projects;

          var labels = HTTP.getJSON(
            'https://api.todoist.com/rest/v1/labels?token=' + clipboardConent
          );
          Action.preferences.labels = labels;

          LaunchBar.alert(
            'Success!',
            'API-Token set to: ' +
              Action.preferences.apiToken +
              '.\nProjects and labels loaded.'
          );
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
