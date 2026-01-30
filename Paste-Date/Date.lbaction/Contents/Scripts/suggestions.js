/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2026-01-30

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('global.js');

function runWithString(string) {
  const icon = 'Template';
  const date = new Date();
  string = string.toLowerCase();

  // Handle pure number input directly (offset numbers)
  if (!isNaN(parseInt(string))) {
    const dateString = processArgument(string, date);
    const subtitle = format(dateString, 'full');
    return {
      title: string,
      subtitle,
      alwaysShowsSubtitle: true,
      icon,
    };
  }

  // Get weekdays starting from tomorrow
  const todayIndex = new Date().getDay();
  const orderedWeekdays = [
    ...getWeekdaySuggestions().slice(todayIndex),
    ...getWeekdaySuggestions().slice(0, todayIndex),
  ];

  const orderedSuggestions = [
    ...orderedWeekdays,
    ...relativeDaySuggestions,
    ...monthBoundarySuggestions,
    ...generateNthWeekdaySuggestions(),
  ];

  const matches = string
    ? orderedSuggestions.filter(
        (suggestion) =>
          findFirstMatch(string, [suggestion.toLowerCase()]) !== undefined,
      )
    : orderedSuggestions;

  return matches.map((suggestion) => {
    const dateString = processArgument(suggestion, date);
    const isWeekday = weekdays.some((day) => day.localize() === suggestion);
    const subtitle = isWeekday
      ? format(dateString, 'long')
      : format(dateString, 'full');

    return {
      title: suggestion,
      subtitle,
      alwaysShowsSubtitle: true,
      icon,
    };
  });
}
