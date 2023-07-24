/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

include('days.js');

function run(argument) {
  if (LaunchBar.options.shiftKey) return formatSettings();

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

  dateStyle = LaunchBar.options.alternateKey
    ? Action.preferences.altDateStyle ?? 'iso'
    : Action.preferences.dateStyle ?? 'short';

  LaunchBar.paste(format(dateString, dateStyle));
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

function format(dateString, dateStyle) {
  if (dateStyle == 'iso') {
    // ISO ignores timezone offset. Fix found here: https://stackoverflow.com/a/37661393/15774924
    dateString = new Date(
      dateString.getTime() - dateString.getTimezoneOffset() * 60000
    );
    dateString = dateString.toISOString().split('T')[0];
  } else {
    //
    dateString = LaunchBar.formatDate(new Date(dateString), {
      timeStyle: 'none',
      dateStyle,
    });
  }
  return dateString;
}

function formatSettings() {
  const dateStyle = Action.preferences.dateStyle ?? 'short';
  const altDateStyle = Action.preferences.altDateStyle ?? 'iso';
  const date = new Date();

  return [
    {
      title: 'Primary Format'.localize(),
      subtitle: format(date, dateStyle),
      badge:
        dateStyle == 'iso'
          ? 'ISO 8601'
          : dateStyle.localize().charAt(0).toUpperCase() +
            dateStyle.localize().slice(1),
      icon: '1Template',
      alwaysShowsSubtitle: true,
      children: styleOptions('primary', date, dateStyle),
    },
    {
      title: 'Alternative Format'.localize(),
      subtitle: format(date, altDateStyle),
      badge:
        altDateStyle == 'iso'
          ? 'ISO 8601'
          : altDateStyle.localize().charAt(0).toUpperCase() +
            altDateStyle.localize().slice(1),
      icon: '2Template',
      alwaysShowsSubtitle: true,
      children: styleOptions('secondary', date, altDateStyle),
    },
  ];
}

function styleOptions(mode, date, currentStyle) {
  const styles = ['iso', 'short', 'medium', 'long', 'full'];

  return styles.map((style) => {
    return {
      title:
        style == 'iso'
          ? 'ISO 8601'
          : style.localize().charAt(0).toUpperCase() +
            style.localize().slice(1),
      subtitle: format(date, style),
      icon: mode == 'primary' ? '1Template' : '2Template',
      action:
        mode == 'primary' ? 'setPrimaryDateFormat' : 'setSecondaryDateFormat',
      actionArgument: style,
      alwaysShowsSubtitle: true,
      label: style == currentStyle ? '✔' : undefined,
    };
  });
}

function setPrimaryDateFormat(dateStyle) {
  Action.preferences.dateStyle = dateStyle;
  return formatSettings();
}

function setSecondaryDateFormat(dateStyle) {
  Action.preferences.altDateStyle = dateStyle;
  return formatSettings();
}
