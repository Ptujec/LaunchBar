/* LaunchBar Action: Verbs
- List of irregular verbs for testing: https://conjugator.reverso.net/conjugation-irregular-verbs-english.html
 */

function run(argument) {
  var searchURL =
    'https://www.theconjugator.com/english/verb/to+' +
    encodeURI(argument) +
    '.html';

  var html = HTTP.loadRequest(searchURL, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data;

  // Check if exists
  var doesNotExist = / does not exist./.test(html);

  if (doesNotExist == true) {
    var response = LaunchBar.alert(
      'No hit!',
      'Try on https://dictionary.cambridge.org?',
      'Open',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          'https://dictionary.cambridge.org/dictionary/english/' + argument
        );
      case 1:
        break;
    }
  } else {
    // Check if what was entered is not the infinitive form
    var reverse = /<h2 id="inv">Reverse conjugation/.test(html);
    if (reverse == true) {
      var newSearchURL =
        'https://www.theconjugator.com/english/verb/' +
        html.match(/<td><a href="\/english\/verb\/(.*?)">/)[1];

      var html = HTTP.loadRequest(newSearchURL, {
        timeout: 5.0,
        method: 'GET',
        resultType: 'text',
      }).data;
    }

    var verbs = html
      .match(/<meta name="description" content="(.*?)" ?\/>/)[1]
      .split(':')[1]
      .replace(/\.$/, '')
      .trim();

    var detailsURLBase = 'https://dictionary.cambridge.org/dictionary/english/';

    var result = [];

    // Infinitive
    var infinitive = verbs.split('-')[0].trim();
    result.push({
      title: infinitive,
      badge: 'infinitive',
      icon: 'oneTemplate',
      action: 'doStuff',
      actionArgument: {
        title: infinitive,
        url: detailsURLBase + infinitive,
      },
    });

    // Past Simple
    var past = verbs.split('-')[1].trim();

    var pastPushData = {
      title: past,
      badge: 'past (preterite)',
      icon: 'twoTemplate',
      action: 'doStuff',
      actionArgument: {
        title: past,
      },
    };

    var wordCountPast = past.split(', ').length;

    if (wordCountPast > 1) {
      pastPushData.actionArgument.url = detailsURLBase + past.split(', ')[0];
    } else {
      pastPushData.actionArgument.url = detailsURLBase + past;
    }

    result.push(pastPushData);

    // Past Participle
    var participle = verbs.split('-')[2].trim();

    var parPushData = {
      title: participle,
      badge: 'past participle',
      icon: 'threeTemplate',
      action: 'doStuff',
      actionArgument: {
        title: participle,
      },
    };

    var wordCountParticiple = participle.split(', ').length;

    if (wordCountParticiple > 1) {
      parPushData.actionArgument.url =
        detailsURLBase + participle.split(', ')[0];
    } else {
      parPushData.actionArgument.url = detailsURLBase + participle;
    }

    result.push(parPushData);

    return result;
  }
}

function doStuff(dict) {
  if (LaunchBar.options.shiftKey) {
    LaunchBar.paste(dict.title);
  } else {
    LaunchBar.openURL(dict.url);
  }
}
