/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('days.js');

function run(argument) {
  if (LaunchBar.options.shiftKey) return defaultFormatToggle();

  const date = new Date();
  let dateString;

  if (!argument) {
    // Return current date
    dateString = new Date();
  } else {
    // Return parsed argument date
    dateString = processArgument(argument, date);
    if (dateString === 'No valid entry') return;
  }

  formatAndPaste(dateString);
}

function processArgument(argument, date) {
  argument = argument.toLowerCase();

  const month = date.getMonth();
  const year = date.getFullYear();

  // First and last days of month
  if ('First day of last month'.localize().toLowerCase() == argument)
    return new Date(year, month - 1, 1);

  if ('Last day of last month'.localize().toLowerCase() == argument)
    return new Date(year, month, 1, -1);

  if ('First day of this month'.localize().toLowerCase() == argument)
    return new Date(year, month, 1);

  if ('Last day of this month'.localize().toLowerCase() == argument)
    return new Date(year, month + 1, 0);

  if ('First day of next month'.localize().toLowerCase() == argument)
    return new Date(year, month + 1, 1);

  if ('Last day of next month'.localize().toLowerCase() == argument)
    return new Date(year, month + 2, 0);

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

  // Upcoming day of the week offset
  let dayOfWeek = weekdaysEN.findIndex((day) => day.startsWith(argument));

  if (dayOfWeek === -1)
    dayOfWeek = weekdaysDE.findIndex((day) => day.startsWith(argument));

  if (dayOfWeek === -1) {
    LaunchBar.alert('No valid entry');
    return 'No valid entry';
  }

  let dayOfWeekDate = new Date(date.getTime());
  dayOfWeekDate.setDate(
    date.getDate() + ((dayOfWeek - 1 - date.getDay() + 7) % 7) + 1
  );

  return new Date(dayOfWeekDate);
}

function formatAndPaste(dateString) {
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

  LaunchBar.paste(dateString);
}

function defaultFormatToggle() {
  const dateFormat = Action.preferences.dateFormat ?? 'iso';
  return [
    {
      title: dateFormat == 'iso' ? 'ISO Date Format' : 'Local Date Format',
      action: 'setDateFormat',
      actionArgument: dateFormat == 'iso' ? 'local' : 'iso',
      icon: 'calTemplate',
    },
  ];
}

function setDateFormat(dateFormat) {
  Action.preferences.dateFormat = dateFormat;
  return defaultFormatToggle();
}
