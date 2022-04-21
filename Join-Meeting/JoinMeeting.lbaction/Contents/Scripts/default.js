/* 
Join Meeting Action for LaunchBar
by Christian Bender (@ptujec)
2022-04-19

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

function run() {
  var firstrun = Action.preferences.firstrun;

  if (firstrun == undefined) {
    Action.preferences.firstrun = false;
    var response = LaunchBar.alert(
      'Install Shortcut'.localize(),
      'This action requires the shortcut "Get current events"'.localize(),
      'Install'.localize(),
      'Cancel'.localize()
    );

    switch (response) {
      case 0:
        LaunchBar.hide();
        LaunchBar.openURL(
          'https://www.icloud.com/shortcuts/05f9af8ded344f579d36776bcf44bc3d'
        );

      case 1:
        break;
    }
    return;
  }

  var events = LaunchBar.executeAppleScript(
    'try',
    ' tell application "Shortcuts Events" to set _result to run shortcut "Get current events"',
    'on error e',
    ' set _result to "error"',
    'end try'
  );

  var zoomRE = /https:\/\/us02web.zoom.us\/j\/(\d+)(?:(?:\?pwd=)(.*))?/;
  var teamsRE = /(https:\/\/teams\.microsoft\.com.*)>/;

  if (events != undefined) {
    if (events.trim() == 'error') {
      var response = LaunchBar.alert(
        'Error!'.localize(),
        'Check if the shortcut "Get current events" is correctly installed. Click "Install" to install.'.localize(),
        'Install'.localize(),
        'Cancel'.localize()
      );

      switch (response) {
        case 0:
          LaunchBar.hide();
          LaunchBar.openURL(
            'https://www.icloud.com/shortcuts/05f9af8ded344f579d36776bcf44bc3d'
          );

        case 1:
          break;
      }
      return;
    }

    events = events.trim().split('-||-');

    var result = [];

    for (var i = 0; i < events.length - 1; i++) {
      var eventDetails = events[i].split(':||:');
      var title = eventDetails[0].trim().replace(/^, /, '');

      var url = eventDetails[2].trim();
      var notes = eventDetails[3].trim();

      var startdate = new Date(eventDetails[1].trim());
      var now = new Date();

      var diffInMS = startdate - now;
      var msInHour = Math.floor(diffInMS / 1000 / 60);

      if (msInHour > -60 && msInHour < 20) {
        if (url.includes('zoom.us')) {
          var meetingurl = url
            .match(zoomRE)[0]
            .toString()
            .replace(zoomRE, 'zoommtg://zoom.us/join?confno=$1&pwd=$2');
        } else if (url.includes('teams.microsoft')) {
          var meetingurl = url
            // .match(teamsRE)[0]
            // .toString()
            .replace(/https/, 'msteams');
        } else if (notes.includes('zoom.us')) {
          var meetingurl = notes
            .match(zoomRE)[0]
            .toString()
            .replace(zoomRE, 'zoommtg://zoom.us/join?confno=$1&pwd=$2');
        } else if (notes.includes('teams.microsoft')) {
          var meetingurl = notes
            .match(teamsRE)[1]
            .toString()
            .replace(/https/, 'msteams');
        } else {
          var meetingurl = '';
        }

        if (meetingurl != '') {
          if (msInHour.toString().includes('-')) {
            var sub =
              'The meeting has started '.localize() +
              msInHour.toString().replace('-', '') +
              ' minutes ago.'.localize();
          } else {
            var sub =
              'The meeting starts in '.localize() +
              msInHour +
              ' minutes.'.localize();
          }

          if (meetingurl.startsWith('msteams')) {
            var icon = 'teamsTemplate';
          } else {
            var icon = 'videoTemplate';
          }

          result.push({
            title: title,
            subtitle: sub,
            icon: icon,
            url: meetingurl,
          });
        }
      }
    }
    // LaunchBar.clearClipboard();

    if (result.length == 1) {
      // LaunchBar.alert(meetingurl);
      LaunchBar.hide();
      LaunchBar.openURL(meetingurl);
    } else if (result.length > 1) {
      return result;
    } else {
      LaunchBar.alert('No meeting found!'.localize());
    }
  } else {
    LaunchBar.alert('No meeting found!'.localize());
  }
}
