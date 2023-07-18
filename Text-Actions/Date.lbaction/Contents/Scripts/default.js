/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('days.js');

function run(argument) {
  if (LaunchBar.options.shiftKey) return defaultFormatToggle();

  const date = new Date();
  let dateString;

  if (!argument) {
    // Return current date
    dateString = date;
  } else {
    // Return parsed argument date
    dateString = processArgument(argument, date);
    if (dateString === 'No valid entry') return;
  }

  LaunchBar.paste(format(dateString));
}

function processArgument(argument, date) {
  argument = argument.toLowerCase();

  const month = date.getMonth();
  const year = date.getFullYear();

  // First and last days of month
  switch (argument) {
    case 'First day of last month'.localize().toLowerCase():
      return new Date(year, month - 1, 1);
    case 'Last day of last month'.localize().toLowerCase():
      return new Date(year, month, 0);
    case 'First day of this month'.localize().toLowerCase():
      return new Date(year, month, 1);
    case 'Last day of this month'.localize().toLowerCase():
      return new Date(year, month + 1, 0);
    case 'First day of next month'.localize().toLowerCase():
      return new Date(year, month + 1, 1);
    case 'Last day of next month'.localize().toLowerCase():
      return new Date(year, month + 2, 0);
  }

  // Upcoming day of the week offset
  if (isNaN(parseInt(argument))) {
    let dayOfWeek = weekdaysEN.findIndex((day) => day.startsWith(argument));

    if (dayOfWeek === -1)
      dayOfWeek = weekdaysDE.findIndex((day) => day.startsWith(argument));

    if (dayOfWeek !== -1) {
      let dayOfWeekDate = new Date(date.getTime());
      dayOfWeekDate.setDate(
        date.getDate() + ((dayOfWeek - 1 - date.getDay() + 7) % 7) + 1
      );
      return new Date(dayOfWeekDate);
    }
  }

  // Relativ days of the week (convert to offset number)
  if ('Tomorrow'.localize().toLowerCase().startsWith(argument)) {
    argument = '1';
  } else if ('Yesterday'.localize().toLowerCase().startsWith(argument)) {
    argument = '-1';
  }

  // Offset numbers
  if (!isNaN(parseInt(argument))) {
    // Add or subtrackt days
    date.setDate(date.getDate() + parseInt(argument));
    return new Date(date);
  }

  LaunchBar.alert('No valid entry');
  return 'No valid entry';
}

function format(dateString) {
  let dateFormat = Action.preferences.dateFormat ?? 'iso';

  if (LaunchBar.options.alternateKey) {
    // use the format that is not the default (setting) if "alt"
    if (dateFormat == 'iso') {
      dateFormat = 'local';
    } else {
      dateFormat = 'iso';
    }
  }

  if (dateFormat == 'iso') {
    // ISO ignores timezone offset. Fix found here: https://stackoverflow.com/a/37661393/15774924
    dateString = new Date(
      dateString.getTime() - dateString.getTimezoneOffset() * 60000
    );

    dateString = dateString.toISOString().split('T')[0];
  } else {
    //
    dateString = LaunchBar.formatDate(new Date(dateString), {
      timeStyle: 'none',
      dateStyle: 'medium',
    });
  }

  return dateString;
}

function defaultFormatToggle() {
  const dateString = format(new Date());
  const dateFormat = Action.preferences.dateFormat ?? 'iso';

  return [
    {
      title:
        dateFormat == 'iso'
          ? `ISO Format (${dateString})`
          : `Local Format (${dateString})`,
      action: 'setDateFormat',
      actionArgument: dateFormat == 'iso' ? 'local' : 'iso',
      icon: dateFormat == 'iso' ? 'isoTemplate' : 'localTemplate',
    },
  ];
}

function setDateFormat(dateFormat) {
  Action.preferences.dateFormat = dateFormat;
  return defaultFormatToggle();
}
