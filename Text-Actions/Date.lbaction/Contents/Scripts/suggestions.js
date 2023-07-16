// LaunchBar Action Script

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
        icon: 'CopyActionTemplate',
      };
    });
}
