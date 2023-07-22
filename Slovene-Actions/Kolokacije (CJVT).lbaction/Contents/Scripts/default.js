/* 
Kolokacije Action for LaunchBar
Kolokacije, kolokacijski slovar sodobne slovenščine

by Christian Bender (@ptujec)
2023-07-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  argument = argument.trim();
  if (argument == '') return;

  const data = HTTP.getJSON(
    'https://viri.cjvt.si/kolokacije/ajax_api/v1/slv/search/' +
      encodeURIComponent(argument),
    3
  ).data;

  if (!data) return;

  return data.map((item) => ({
    title: item.candidate,
    icon: 'kTemplate',
    action: 'getRelatedWords',
    actionArgument: item.headword_id.toString(),
  }));
}

function getRelatedWords(headwordID) {
  let data = HTTP.loadRequest(
    'https://viri.cjvt.si/kolokacije/slv/subfragments/collocations/' +
      headwordID,
    {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }
  ).data;

  const structures = JSON.parse(JSON.parse(data).json).structures;

  let result = [];

  for (const structure of structures) {
    const category = structure.category;
    const mappingId = structure.mapping_id;
    const collocations = structure.collocations;
    const preposition = structure.preposition;

    for (const collocation of collocations) {
      var form = collocation.form.replace(/<(\/)?.>/g, '');
      var formId = collocation.id;

      const pushData = {
        title: form,
        badge: preposition ? `${category} + ${preposition}` : category,
        icon: 'connectionTemplate',
        action: 'showExamples',
        actionArgument: {
          formId: formId.toString(),
          url: `https://viri.cjvt.si/kolokacije/slv/headword/${headwordID}/structure/${mappingId}?example=${formId}#`,
        },
        frequency: collocation.frequency,
        preposition: preposition ? preposition : '',
      };

      result.push(pushData);
    }
  }

  return result.sort(
    (a, b) => a.badge.localeCompare(b.badge) || b.frequency - a.frequency
  );
}

function showExamples({ formId, url }) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(url);
    return;
  }

  let data = HTTP.loadRequest(
    `https://viri.cjvt.si/kolokacije/slv/subfragments/examples/${formId}`,
    {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }
  ).data;

  const examples = JSON.parse(JSON.parse(data).json).examples;

  let result = [];

  for (const example of examples) {
    const source = example.source;
    const year = example.year;
    const form = example.form;

    const shortForm = form.match(/<.*>/)[0].replace(/<(\/)?.>/g, '');
    const fullForm = form.replace(/<.>(.*?)<\/.>/g, (_, match) =>
      match.toUpperCase()
    );

    result.push({
      title: shortForm,
      subtitle: `${fullForm} (${source}, ${year})`,
      alwaysShowsSubtitle: true,
      icon: 'resultTemplate',
      children: [{ title: fullForm }],
    });
  }
  return result;
}
