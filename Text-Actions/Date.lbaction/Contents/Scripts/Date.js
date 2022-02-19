// LaunchBar Action Script

// Date Infos:
// https://stackoverflow.com/a/3818198

// How to interpret argument as number:
// https://www.w3schools.com/jsref/jsref_parseint.asp

// Paste String with Launchbar:
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

// Parsing ISO 8601 date in Javascript:
// https://stackoverflow.com/a/22914738/15774924
// see also NBA action

// Get next date from weekday in JavaScript:
// https://stackoverflow.com/questions/1579010/get-next-date-from-weekday-in-javascript
// https://stackoverflow.com/a/43624637/15774924 (best answer)

// https://codereview.stackexchange.com/questions/33527/find-next-occurring-friday-or-any-dayofweek

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    var output = dateFormatOption();
    return output;
  } else {
    if (argument == undefined) {
      // Return current date
      var date = new Date();

      var dateString = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      );
    } else {
      // Date with offset (either number … or an upcoming day of the week)

      // relativ days of the week
      if (argument.toLowerCase() == 'morgen') {
        argument = '1';
      } else if (argument.toLowerCase() == 'gestern') {
        argument = '-1';
      }

      var checkNum = parseInt(argument);

      if (!isNaN(checkNum)) {
        // Number offset
        var date = new Date();

        // Add or subtrackt days
        var offsetNumber = parseInt(argument);
        date.setDate(date.getDate() + offsetNumber);

        var dateString = new Date(
          date.getTime() - date.getTimezoneOffset() * 60000
        )
          .toISOString()
          .split('T')[0];
      } else {
        // day of the week

        var weekdaysEN = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];

        var weekdaysDE = [
          'sonntag',
          'montag',
          'dienstag',
          'mittwoch',
          'donnerstag',
          'freitag',
          'samstag',
        ];

        for (var i = 0; i < weekdaysEN.length; i++) {
          var dayOfWeekEN = weekdaysEN[i];
          if (dayOfWeekEN.startsWith(argument.toLowerCase())) {
            var dayOfWeek = i;
          }
        }

        if (dayOfWeek == undefined) {
          for (i = 0; i < weekdaysDE.length; i++) {
            var dayOfWeekDE = weekdaysDE[i];
            if (dayOfWeekDE.startsWith(argument.toLowerCase())) {
              var dayOfWeek = i;
            }
          }
        }

        if (dayOfWeek == undefined) {
          LaunchBar.alert('No valid entry');
          return;
        }

        var date = new Date();

        var dayOfWeekDate = new Date(date.getTime());
        dayOfWeekDate.setDate(
          date.getDate() + ((dayOfWeek - 1 - date.getDay() + 7) % 7) + 1
        );

        var dateString = new Date(
          dayOfWeekDate.getTime() - dayOfWeekDate.getTimezoneOffset() * 60000
        );
      }
    }

    var dateFormat = Action.preferences.dateFormat;

    if (LaunchBar.options.alternateKey) {
      // use the format that is not the default (setting) if "alt"
      if (dateFormat == undefined || dateFormat == 'iso') {
        dateFormat = 'local';
      } else {
        dateFormat = 'iso';
      }
    }

    if (dateFormat == undefined || dateFormat == 'iso') {
      dateString = dateString.toISOString().split('T')[0];
    } else {
      //
      dateString = LaunchBar.formatDate(new Date(dateString), {
        timeStyle: 'none',
        dateStyle: 'medium',
      });
    }
    LaunchBar.paste(dateString);
  }
}

function dateFormatOption() {
  var dateFormat = Action.preferences.dateFormat;
  if (dateFormat == undefined || dateFormat == 'iso') {
    var isoIcon = 'onTemplate';
    var localIcon = 'offTemplate';
  } else {
    var isoIcon = 'offTemplate';
    var localIcon = 'onTemplate';
  }

  result = [
    {
      title: 'ISO Date Format',
      subtitle: 'yyyy-MM-dd',
      action: 'setDateFormat',
      actionArgument: 'iso',
      icon: isoIcon,
    },
    {
      title: 'Local Date Format',
      subtitle:
        'Date format as set in System Preferences/Language & Region/Advanced (Medium)',
      action: 'setDateFormat',
      actionArgument: 'local',
      icon: localIcon,
    },
  ];
  return result;
}

function setDateFormat(dateFormat) {
  Action.preferences.dateFormat = dateFormat;
  var output = dateFormatOption();
  return output;
}
