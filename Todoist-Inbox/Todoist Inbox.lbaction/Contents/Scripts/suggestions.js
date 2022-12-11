/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('constants.js');
include('localization.js');
include('setKey.js');

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
              order: 03,
            });
            string = string.replace(re, ' ');
          }
        }
      }

      // Description
      if (string.includes(': ')) {
        show = true;
        var description = string.match(/(?:\: )(.*)/)[1];

        description =
          description.charAt(0).toUpperCase() + description.slice(1);

        result.push({
          title: description,
          icon: 'descriptionTemplate',
          order: 02,
        });
        string = string.replace(/(?:\: )(.*)/, '');
      }

      if (p != undefined) {
        show = true;
        result.push({
          title: p,
          icon: icon,
          order: 04,
        });
      }

      if (show == true) {
        string = string.trim();
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
