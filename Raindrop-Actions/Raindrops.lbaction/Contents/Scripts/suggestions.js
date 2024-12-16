/* 
Raindrops - Raindrop.io Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

OAuth implementation by Manfred Linzner (@mlinzner)

Note: I used Cursor to refactor the code.
*/

include('global.js');

const MEDIA_TYPES = [
  { title: 'type:article', icon: 'articleTemplate' },
  { title: 'type:document', icon: 'docTemplate' },
  { title: 'type:image', icon: 'imageTemplate' },
  { title: 'type:video', icon: 'videoTemplate' },
  { title: 'type:audio', icon: 'audioTemplate' },
];

function fetchTags(apiKey) {
  return HTTP.getJSON(
    encodeURI(`https://api.raindrop.io/rest/v1/tags/0?access_token=${apiKey}`)
  );
}

function sortSuggestions(a, b) {
  return a.title > b.title;
}

function createTagSuggestions(tags, searchString) {
  const exactMatches = [];
  const partialMatches = [];
  const searchLower = searchString.toLowerCase();

  tags.forEach((tag) => {
    const suggestion = tag._id;
    const suggestionLower = suggestion.toLowerCase();

    if (suggestionLower.includes(searchLower)) {
      const tagObject = {
        title: suggestion,
        icon: 'tagTemplate',
      };

      if (suggestionLower.startsWith(searchLower)) {
        exactMatches.push(tagObject);
      } else {
        partialMatches.push(tagObject);
      }
    }
  });

  return [
    ...exactMatches.sort(sortSuggestions),
    ...partialMatches.sort(sortSuggestions),
  ];
}

function getMediaTypeSuggestions(searchString) {
  return MEDIA_TYPES.filter((type) => type.title.includes(searchString));
}

function runWithString(searchString) {
  const apiKey = getApiKey();
  if (!apiKey) return initiateOAuthFlow();

  const response = fetchTags(apiKey);
  const tagSuggestions = createTagSuggestions(
    response.data.items,
    searchString
  );
  const mediaTypeSuggestions = getMediaTypeSuggestions(searchString);

  return [...mediaTypeSuggestions, ...tagSuggestions];
}
