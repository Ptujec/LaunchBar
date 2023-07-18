/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

include('days.js');

function runWithString(string) {
  string = string.toLowerCase();

  return daySuggestions
    .filter((day) => {
      const stringParts = day.split(' ');
      return stringParts.some((part) => part.toLowerCase().startsWith(string));
    })
    .map((day) => {
      return {
        title: day,
        icon: 'Template',
      };
    });
}
