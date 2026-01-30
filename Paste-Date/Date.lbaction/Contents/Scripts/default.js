/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2026-01-30

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('global.js');

// MAIN

function run(argument) {
  if (LaunchBar.options.shiftKey) return formatSettings();

  const date = new Date();
  const dateString = argument ? processArgument(argument, date) : date;
  if (!dateString) return { title: 'No valid entry', icon: 'alert' };

  let dateStyle = Action.preferences.dateStyle ?? 'short';

  if (LaunchBar.options.commandKey) {
    return styleOptions('custom', date, undefined, dateString);
  }

  if (LaunchBar.options.alternateKey) {
    dateStyle = Action.preferences.altDateStyle ?? 'iso';
  }

  LaunchBar.paste(format(dateString, dateStyle));
}

// STYLE OPTIONS

function styleOptions(mode, date, currentStyle, dateString) {
  const styles = [
    'iso',
    'iso_full',
    'iso_datetime',
    'short',
    'medium',
    'long',
    'full',
    'us_short',
    'unix_timestamp',
  ];

  const config =
    mode === 'custom'
      ? { action: 'paste', icon: 'Template', date: dateString }
      : {
          action:
            mode === 'primary'
              ? 'setPrimaryDateFormat'
              : 'setAlternativeDateFormat',
          icon: mode === 'primary' ? '1Template' : '2Template',
          date,
        };

  return styles.map((style) => ({
    title:
      style === 'iso'
        ? 'ISO 8601'
        : style.localize().charAt(0).toUpperCase() + style.localize().slice(1),
    subtitle: format(config.date, style),
    icon: config.icon,
    action: config.action,
    actionArgument: { style, dateString },
    label: style === currentStyle ? '✔' : undefined,
    alwaysShowsSubtitle: true,
  }));
}

// SETTINGS

function formatSettings() {
  const dateStyle = Action.preferences.dateStyle ?? 'short';
  const altDateStyle = Action.preferences.altDateStyle ?? 'iso';
  const date = new Date();

  const formatBadge = (style) =>
    style === 'iso'
      ? 'ISO 8601'
      : style.localize().charAt(0).toUpperCase() + style.localize().slice(1);

  return [
    {
      title: 'Primary Format'.localize(),
      subtitle: format(date, dateStyle),
      badge: formatBadge(dateStyle),
      icon: '1Template',
      alwaysShowsSubtitle: true,
      children: styleOptions('primary', date, dateStyle),
    },
    {
      title: 'Alternative Format'.localize(),
      subtitle: format(date, altDateStyle),
      badge: formatBadge(altDateStyle),
      icon: '2Template',
      alwaysShowsSubtitle: true,
      children: styleOptions('secondary', date, altDateStyle),
    },
  ];
}

function setPrimaryDateFormat({ style }) {
  Action.preferences.dateStyle = style;
  return formatSettings();
}

function setAlternativeDateFormat({ style }) {
  Action.preferences.altDateStyle = style;
  return formatSettings();
}

function paste({ style, dateString }) {
  LaunchBar.paste(format(dateString, style));
}
