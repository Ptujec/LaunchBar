/* 
Unsplash Search Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function runWithString(string) {
  const data = HTTP.getJSON(
    'https://unsplash.com/nautocomplete/' + encodeURI(string)
  );

  let queries = data.data.autocomplete;
  if (queries.length === 0) queries = data.data.fuzzy;
  if (queries.length === 0) queries = data.data.did_you_mean;

  return queries.map((item) => ({
    title: item.query,
    alwaysShowsSubtitle: true,
    icon: 'iconTemplate',
  }));
}
