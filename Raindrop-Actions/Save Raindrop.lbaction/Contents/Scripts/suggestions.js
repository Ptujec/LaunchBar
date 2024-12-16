/* 
Save Raindrop - Raindrop.io Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

OAuth implementation by Manfred Linzner (@mlinzner)

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io

Note: I used Cursor to refactor the code.
*/

include('global.js');

function runWithString(string) {
  const apiKey = getApiKey();
  if (!apiKey) return initiateOAuthFlow();

  const response = HTTP.getJSON(
    encodeURI(`https://api.raindrop.io/rest/v1/tags/0?access_token=${apiKey}`)
  );

  const searchTerms = string.split(',');
  const currentSearch = searchTerms[searchTerms.length - 1]
    .trim()
    .toLowerCase();
  const previousTerms = searchTerms.slice(0, -1).join(',');

  const createSuggestion = (suggestion, isMultiTag) => {
    const title = isMultiTag ? `${previousTerms}, ${suggestion}` : suggestion;
    const icon = isMultiTag ? 'tagsTemplate' : 'tagTemplate';
    return { title, icon };
  };

  const matchingSuggestions = response.data.items
    .map((item) => item._id)
    .filter((suggestion) => suggestion.toLowerCase().includes(currentSearch))
    .reduce(
      (acc, suggestion) => {
        const isMultiTag = searchTerms.length >= 2;
        const suggestionObj = createSuggestion(suggestion, isMultiTag);

        // Separate exact matches (starting with search term) from partial matches
        if (suggestion.toLowerCase().startsWith(currentSearch)) {
          acc.exact.push(suggestionObj);
        } else {
          acc.partial.push(suggestionObj);
        }
        return acc;
      },
      { exact: [], partial: [] }
    );

  // Sort both arrays alphabetically
  const sortByTitle = (a, b) => a.title.localeCompare(b.title);

  return [
    ...matchingSuggestions.exact.sort(sortByTitle),
    ...matchingSuggestions.partial.sort(sortByTitle),
  ];
}
