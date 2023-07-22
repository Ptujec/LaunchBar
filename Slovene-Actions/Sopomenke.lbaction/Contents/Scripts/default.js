/* 
Sopomenke Action for LaunchBar
Slovar sopomenk sodobne slovenščine (https://viri.cjvt.si/sopomenke/slv/)
by Christian Bender (@ptujec)
2023-07-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  argument = argument.trim();

  if (!argument) return;

  const data = HTTP.getJSON(
    `https://viri.cjvt.si/sopomenke/ajax_api/v1/slv/sinonimni/search/${encodeURIComponent(
      argument
    )}`,
    3
  ).data;

  if (!data) return;

  return data.map((item) => {
    const headword = item.headword;
    const id = item.id;
    const mainURL = `https://viri.cjvt.si/sopomenke/slv/state?mw=${headword}&mid=${id}&source=main_page`;
    const dataURL = `https://viri.cjvt.si/sopomenke/ajax_api/v1/slv/synonym/download/${id}`;

    return {
      title: headword,
      icon: 'sTemplate',
      action: 'getSynonyms',
      actionArgument: {
        headword,
        mainURL,
        dataURL,
      },
    };
  });
}

function getSynonyms({ headword, mainURL, dataURL }) {
  const data = HTTP.loadRequest(dataURL, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data.split('\n');

  return data.slice(9, -1).map((row) => {
    const columns = row.split('\t');

    const synonym = columns[0];
    const type = columns[1];
    const frequency = columns[4];

    const label =
      frequency && frequency != '-' ? `${type} (${frequency})` : type;

    return {
      title: synonym,
      label: type == 'uporabniški' ? '' : label,
      badge: headword,
      icon: type == 'uporabniški' ? 'synonymUserTemplate' : 'synonymTemplate',
      action: 'openURL',
      actionArgument: {
        title: synonym,
        url: mainURL,
      },
    };
  });
}

function openURL({ title, url }) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(title);
  } else {
    LaunchBar.hide();
    LaunchBar.openURL(encodeURI(url));
  }
}
