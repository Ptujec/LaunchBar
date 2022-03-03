/* LaunchBar Action: Verbs
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
    LaunchBar.alert('No hit!');
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

    var infinitive = verbs.split('-')[0].trim();
    var past = verbs.split('-')[1].trim();
    var participle = verbs.split('-')[2].trim();

    var detailsURL =
      'https://conjugator.reverso.net/conjugation-english-verb-' +
      infinitive +
      '.html';

    return [
      {
        title: infinitive,
        badge: 'infinitive',
        url: detailsURL,
        icon: 'oneTemplate',
      },
      {
        title: past,
        badge: 'past (preterite)',
        url: detailsURL,
        icon: 'twoTemplate',
      },
      {
        title: participle,
        badge: 'past participle',
        url: detailsURL,
        icon: 'threeTemplate',
      },
    ];
  }
}
