/* 
Wikipedia (EN) Action for LaunchBar
by Christian Bender (@ptujec)
2024-02-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function runWithString(argument) {
  if (argument == '') return;

  const data = HTTP.getJSON(
    'https://en.wikipedia.org/w/rest.php/v1/search/title?q=' +
      encodeURI(argument) +
      '&limit=20'
  );

  if (data.response.status != 200) return;

  return data.data.pages.map((item) => {
    pushData = {
      title: item.title,
      icon: 'wikiconTemplate',
    };

    if (item.description != null) {
      pushData.subtitle = item.description;
      pushData.alwaysShowsSubtitle = true;
    }

    return pushData;
  });
}
