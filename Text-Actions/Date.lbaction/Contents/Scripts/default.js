/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2022-06-07

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    var output = dateFormatOption();
    return output;
  } else {
    var date = new Date();

    if (argument == undefined) {
      // Return current date
      var dateString = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      );
    } else {
      // First and last days of month

      var month = date.getMonth();
      var year = date.getFullYear();

      if ('First day of previous month (FDPM)'.localize() == argument) {
        var dateString = new Date(year, month - 1, 1);
        formatAndPaste(dateString);
        return;
        // 2022-05-01
      }

      if ('Last day of previous month (LDPM)'.localize() == argument) {
        var dateString = new Date(year, month, 1, -1);
        formatAndPaste(dateString);
        return;
        // 2022-05-31
      }

      if ('First day of this month (FDTM)'.localize() == argument) {
        var dateString = new Date(year, month, 1);
        formatAndPaste(dateString);
        return;
        // 2022-06-01
      }

      if ('Last day of this month (LDTM)'.localize() == argument) {
        var dateString = new Date(year, month + 1, 0);
        formatAndPaste(dateString);
        return;
        // 2022-06-30
      }

      if ('First day of next month (FDNM)'.localize() == argument) {
        var dateString = new Date(year, month + 1, 1);
        formatAndPaste(dateString);
        return;
        // 2022-07-01
      }

      if ('Last day of next month (LDNM)'.localize() == argument) {
        var dateString = new Date(year, month + 2, 0);
        formatAndPaste(dateString);
        return;
        // 2022-07-31 31.07.2022
      }

      // relativ days of the week
      if (
        'Tomorrow'.localize().toLowerCase().startsWith(argument.toLowerCase())
      ) {
        argument = '1';
      } else if (
        'Yesterday'.localize().toLowerCase().startsWith(argument.toLowerCase())
      ) {
        argument = '-1';
      }

      // Date with offset (either number … or an upcoming day of the week)
      var checkNum = parseInt(argument);
      if (!isNaN(checkNum)) {
        // Number offset
        // var date = new Date();

        // Add or subtrackt days
        var offsetNumber = parseInt(argument);
        date.setDate(date.getDate() + offsetNumber);

        var dateString = new Date(
          date.getTime() - date.getTimezoneOffset() * 60000
        );
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

        // var date = new Date();

        var dayOfWeekDate = new Date(date.getTime());
        dayOfWeekDate.setDate(
          date.getDate() + ((dayOfWeek - 1 - date.getDay() + 7) % 7) + 1
        );

        var dateString = new Date(
          dayOfWeekDate.getTime() - dayOfWeekDate.getTimezoneOffset() * 60000
        );
      }
    }

    formatAndPaste(dateString);
  }
}

function formatAndPaste(dateString) {
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
    // ISO ignores timezone offset. Fix found here: https://stackoverflow.com/a/37661393/15774924
    // dateString = new Date(
    //   dateString.getTime() - dateString.getTimezoneOffset() * 60000
    // );

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
