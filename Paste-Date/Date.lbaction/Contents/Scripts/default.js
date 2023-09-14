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

  if (LaunchBar.options.alternateKey) {
    dateStyle = Action.preferences.altDateStyle ?? 'iso';
  } else if (LaunchBar.options.commandKey) {
    return styleOptions('custom', date, undefined, dateString);
  } else {
    dateStyle = Action.preferences.dateStyle ?? 'short';
  }

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
  } else if (dateStyle == 'US Short') {
    // I create this manually because it is not possible to get this format if you are otherwise on a different locale. You can set the locale in LaunchBar.formatDate but you can not change the format the system offers permamently. It will change back if you change the format for your locale.

    const date = new Date(dateString);
    const year = date.toLocaleString('default', { year: 'numeric' });
    const month = date.toLocaleString('default', { month: '2-digit' });
    const day = date.toLocaleString('default', { day: '2-digit' });
    dateString = `${month}/${day}/${year}`;
  } else {
    dateStyle = dateString = LaunchBar.formatDate(new Date(dateString), {
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

function styleOptions(mode, date, currentStyle, dateString) {
  const styles = ['iso', 'short', 'medium', 'long', 'full', 'US Short'];

  let action =
    mode == 'primary' ? 'setPrimaryDateFormat' : 'setSecondaryDateFormat';

  let icon = mode == 'primary' ? '1Template' : '2Template';

  if (mode == 'custom') {
    action = 'paste';
    icon = 'Template';
  }

  return styles.map((style) => ({
    title:
      style == 'iso'
        ? 'ISO 8601'
        : style.localize().charAt(0).toUpperCase() + style.localize().slice(1),
    subtitle: format(date, style),
    icon,
    action,
    actionArgument: { style, dateString },
    label: style == currentStyle ? '✔' : undefined,
    alwaysShowsSubtitle: true,
  }));
}

function setPrimaryDateFormat({ style }) {
  Action.preferences.dateStyle = style;
  return formatSettings();
}

function setSecondaryDateFormat({ style }) {
  Action.preferences.altDateStyle = style;
  return formatSettings();
}

function paste({ style, dateString }) {
  LaunchBar.paste(format(dateString, style));
}
