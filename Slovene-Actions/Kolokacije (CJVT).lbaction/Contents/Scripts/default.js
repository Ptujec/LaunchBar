// LaunchBar Action for Kolokacije, kolokacijski slovar sodobne slovenščine

function run(argument) {
  if (argument != undefined) {
    argument = argument.trim();
    if (argument != '') {
      var result = HTTP.getJSON(
        'https://viri.cjvt.si/kolokacije/ajax_api/v1/slv/search/' +
          encodeURIComponent(argument),
        3
      ).data;

      if (result != undefined) {
        var suggestions = [];
        for (var i = 0; i < result.length; i++) {
          var candidate = result[i].candidate;
          var headwordId = result[i].headword_id;

          suggestions.push({
            title: candidate,
            icon: 'kTemplate',
            action: 'getRelatedWords',
            actionArgument: headwordId.toString(),
          });
        }
      }
      return suggestions;
    }
  } else {
    LaunchBar.hide();
    LaunchBar.openURL('https://viri.cjvt.si/kolokacije/slv/');
  }
}

function getRelatedWords(headwordId) {
  var data = HTTP.loadRequest(
    'https://viri.cjvt.si/kolokacije/slv/subfragments/collocations/' +
      headwordId,
    {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }
  ).data;

  data = JSON.parse(data);
  var jData = JSON.parse(data.json);

  var structures = jData.structures;

  var resultWithoutPreposition = [];
  var resultWithPreposition = [];
  for (var i = 0; i < structures.length; i++) {
    var category = structures[i].category;
    var mappingId = structures[i].mapping_id;
    var collocations = structures[i].collocations;
    var preposition = structures[i].preposition;

    if (preposition == null) {
      for (var j = 0; j < collocations.length; j++) {
        var form = collocations[j].form.replace(/<(\/)?.>/g, '');
        var formId = collocations[j].id;

        resultWithoutPreposition.push({
          title: form,
          badge: category,
          icon: 'connectionTemplate',
          action: 'showExamples',
          actionArgument: {
            title: form,
            formId: formId.toString(),
            url:
              'https://viri.cjvt.si/kolokacije/slv/headword/' +
              headwordId +
              '/structure/' +
              mappingId +
              '?example=' +
              formId +
              '#',
          },
          frequency: collocations[j].frequency,
        });
      }
    } else {
      for (var j = 0; j < collocations.length; j++) {
        var form = collocations[j].form.replace(/<(\/)?.>/g, '');
        var formId = collocations[j].id;
        resultWithPreposition.push({
          title: form,
          badge: category + ' + ' + preposition,
          icon: 'connectionTemplate',
          action: 'showExamples',
          actionArgument: {
            formId: formId.toString(),
            url:
              'https://viri.cjvt.si/kolokacije/slv/headword/' +
              headwordId +
              '/structure/' +
              mappingId +
              '?example=' +
              formId +
              '#',
          },
          frequency: collocations[j].frequency,
          preposition: preposition,
        });
      }
    }
  }

  resultWithPreposition.sort(function (a, b) {
    return (
      a.preposition.localeCompare(b.preposition) || b.frequency - a.frequency
    );
  });

  resultWithoutPreposition.sort(function (a, b) {
    return a.badge.localeCompare(b.badge) || b.frequency - a.frequency;
  });

  var result = resultWithoutPreposition.concat(resultWithPreposition);

  return result;
}

function showExamples(dict) {
  var data = HTTP.loadRequest(
    'https://viri.cjvt.si/kolokacije/slv/subfragments/examples/' + dict.formId,
    {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }
  ).data;

  data = JSON.parse(data);
  var jData = JSON.parse(data.json);

  var examples = jData.examples;

  var result = [];
  for (var i = 0; i < examples.length; i++) {
    var source = jData.examples[i].source;
    var year = jData.examples[i].year;

    var form = jData.examples[i].form.replace(/<(\/)?.>/g, '');

    if (form.length > 80) {
      var words = form.split(' ');

      var full = words.length;
      var half = words.length / 2;

      var title = [];
      var subtitle = [];

      for (var j = 0; j < half; j++) {
        title.push(words[j]);
      }

      for (var j = full; j > half; j--) {
        subtitle.push(words[j]);
      }

      title = title.join(' ');
      subtitle =
        subtitle.reverse().join(' ') + ' (' + source + ', ' + year + ')';
    } else {
      var title = form;
      var subtitle = source + ', ' + year;
    }

    result.push({
      title: title,
      subtitle: subtitle,
      icon: 'resultTemplate',
      url: dict.url,
    });
  }
  return result;
}
