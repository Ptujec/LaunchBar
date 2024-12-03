/* 
Verbs Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  const searchURL = `https://www.theconjugator.com/english/verb/to+${encodeURI(
    argument
  )}.html`;

  const html = HTTP.loadRequest(searchURL, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data;

  if (/ does not exist./.test(html)) {
    let response = LaunchBar.alert(
      'No hit!',
      'Try on dictionary.cambridge.org?',
      'Open',
      'Cancel'
    );
    if (response === 0) {
      LaunchBar.openURL(
        `https://dictionary.cambridge.org/dictionary/english/${argument}`
      );
    }
    return [];
  }
  // File.writeText(html, Action.supportPath + '/test.html');

  if (/<h2 id="inv">Reverse conjugation/.test(html)) {
    html = HTTP.loadRequest(
      `https://www.theconjugator.com/english/verb/${
        html.match(/<td><a href="\/english\/verb\/(.*?)">/)[1]
      }`,
      { timeout: 5.0, method: 'GET', resultType: 'text' }
    ).data;
  }

  const verbs = html
    .match(/<meta name="description" content="([^"]+)"/)[1]
    .split(':')[1]
    .replace(/\.$/, '')
    .trim()
    .split('-')
    .map((v) => v.trim());

  const [infinitive, past, participle] = verbs;
  const detailsURLBase = 'https://dictionary.cambridge.org/dictionary/english/';

  return [
    {
      title: infinitive,
      badge: 'infinitive',
      icon: 'oneTemplate',
      action: 'doStuff',
      actionArgument: {
        title: infinitive,
        url: `${detailsURLBase}${infinitive}`,
      },
    },
    {
      title: past,
      badge: 'past (preterite)',
      icon: 'twoTemplate',
      action: 'doStuff',
      actionArgument: {
        title: past,
        url: `${detailsURLBase}${past.split(', ')[0] || past}`,
      },
    },
    {
      title: participle,
      badge: 'past participle',
      icon: 'threeTemplate',
      action: 'doStuff',
      actionArgument: {
        title: participle,
        url: `${detailsURLBase}${participle.split(', ')[0] || participle}`,
      },
    },
  ];
}

function doStuff(dict) {
  LaunchBar.options.shiftKey
    ? LaunchBar.paste(dict.title)
    : LaunchBar.openURL(dict.url);
}
