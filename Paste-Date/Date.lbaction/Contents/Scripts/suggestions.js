/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('global.js');

function runWithString(string) {
  const date = new Date();
  string = string.toLowerCase();

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
          findFirstMatch(string, [suggestion.toLowerCase()]) !== undefined
      )
    : orderedSuggestions;

  return matches.map((suggestion) => {
    const dateString = processArgument(suggestion, date);
    const subtitle = format(dateString, 'full');

    return {
      title: suggestion,
      subtitle,
      icon: 'Template',
      alwaysShowsSubtitle: true,
    };
  });
}
