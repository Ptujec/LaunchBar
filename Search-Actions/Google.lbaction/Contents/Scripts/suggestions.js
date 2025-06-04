/* 
Google Suggestions for LaunchBar Actions
by Christian Bender (@ptujec)
2024-12-13

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (!argument.trim()) return;

  const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURI(
    argument
  )}`;

  const result = HTTP.get(url, 3);

  if (!result) return;
  if (result.error) return LaunchBar.log(result.error);

  const suggestionsArray = JSON.parse(result.data)?.[1];

  return suggestionsArray.map((title) => ({
    title,
    icon: 'icon',
  }));
}
