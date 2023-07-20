/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

include('default.js');

function runWithString(string) {
  const date = new Date();
  string = string.toLowerCase();

  if (!isNaN(parseInt(string))) {
    const subtitle = format(date, 'full');
    return {
      title: string,
      subtitle,
      icon: 'Template',
      alwaysShowsSubtitle: true,
    };
  }
  return [...weekdaySuggestions, ...otherSuggestions]
    .filter((day) => {
      const stringParts = day.split(' ');
      return stringParts.some((part) => part.toLowerCase().startsWith(string));
    })
    .map((day) => {
      const dateString = processArgument(day, date);
      const dateStyle = weekdaySuggestions.includes(day) ? 'long' : 'full';
      const subtitle = format(dateString, dateStyle);

      return {
        title: day,
        subtitle,
        icon: 'Template',
        alwaysShowsSubtitle: true,
      };
    });
}
