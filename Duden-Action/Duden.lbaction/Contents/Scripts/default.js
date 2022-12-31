/* 
Duden Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-31

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  var suggestions = HTTP.getJSON(
    'https://www.duden.de/search_api_autocomplete/dictionary_search?display=page_1&&filter=search_api_fulltext&q=' +
      encodeURI(argument) +
      '&scope=dictionary%27'
  );

  if (suggestions.error != undefined) {
    LaunchBar.alert(suggestions.error);
    return;
  }

  var results = [];
  var wordlist = [];

  suggestions.data.forEach(function (item) {
    var suggestion = item.build
      .replace(/\n/g, '')
      .replace(/(<([^>]+)>)/g, '')
      .replace(/­/g, '') // replace invisible character U+00ad
      .trim();

    var url = 'https://www.duden.de' + item.value.trim();

    if (!wordlist.includes(suggestion)) {
      wordlist.push(suggestion);
      results.push({
        title: suggestion,
        icon: 'duden1',
        action: 'openSuggestion',
        actionArgument: {
          url: url,
          suggestion: suggestion,
        },
      });
    }
  });
  return results;
}

function openSuggestion(dict) {
  var html = HTTP.loadRequest(dict.url, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data;

  var sections = html.match(/<section class="vignette">(.|\n)*?<\/section>/g);

  var results = [];

  sections.forEach(function (item) {
    var link = item.match(/<a class="vignette__label" href="(.*)">/)[1];
    var url = 'https://www.duden.de' + link;

    var title = item
      .match(/<h2 class="vignette__title">(.|\n)*?<\/h2>/)[0]
      .replace(/(<([^>]+)>)/g, '')
      .replace(/­/g, '') // replace invisible character U+00ad
      .replace('österreichisch auch', 'ö.a.')
      .trim();

    var subtitleWords = link
      .replace('/rechtschreibung/', '')
      .replace(/oe/, 'ö')
      .replace(/ue/, 'ü')
      .replace(/ae/, 'ä')
      .replace(/sz/, 'ß')
      .split('_');

    var subtitle = [];

    subtitleWords.forEach(function (item) {
      if (!title.includes(item)) {
        subtitle.push(item);
      }
    });

    var snippet = item
      .match(/ <p class="vignette__snippet">(.|\n)*?<\/p>/)[0]
      .replace(/(<([^>]+)>)/g, '')
      .replace(/, oder/g, ' /')
      //   .replace(/Substantiv/g, 'Sbst.')
      //   .replace(/maskulin/g, 'm.')
      //   .replace(/feminin/g, 'f.')
      //   .replace(/Neutrum/g, 'N.')
      .trim();

    var pushData = {
      title: title,
      label: snippet,
      badge: dict.suggestion,
      icon: 'duden1',
      url: url,
    };

    if (subtitle != undefined) {
      pushData.subtitle = subtitle.join(', ');
    }

    results.push(pushData);
  });
  return results;
}
