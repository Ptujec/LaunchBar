/* 
Duden Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-31

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (argument == '') {
    return;
  }

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
        icon: 'dTemplate',
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

    var snippet = item
      .match(/ <p class="vignette__snippet">(.|\n)*?<\/p>/)[0]
      .replace(/(<([^>]+)>)/g, '')
      .replace(/, oder/g, ' /')
      //   .replace(/Substantiv/g, 'Sbst.')
      //   .replace(/maskulin/g, 'm.')
      //   .replace(/feminin/g, 'f.')
      //   .replace(/Neutrum/g, 'N.')
      .trim();

    var label = [];
    var labelWords = link.replace('/rechtschreibung/', '').split('_');
    labelWords.forEach(function (item) {
      if (!title.includes(item)) {
        label.push(item);
      }
    });

    var pushData = {
      title: title,
      subtitle: snippet,
      label: label.join(' '),
      badge: dict.suggestion,
      icon: 'dTemplate',
      // url: url,
      action: 'showMore',
      actionArgument: url,
    };

    results.push(pushData);
  });

  // Filter out unnecessary labels
  results.forEach(function (item) {
    var hits = 0;
    for (var i = 0; i < results.length; i++) {
      if (item.title == results[i].title) {
        hits++;
      }
    }

    if (hits < 2) {
      item.label = '';
    }
  });

  return results;
}

function showMore(url) {
  // LaunchBar.openQuickLook(url);
  LaunchBar.hide();
  LaunchBar.openURL(url);
}
