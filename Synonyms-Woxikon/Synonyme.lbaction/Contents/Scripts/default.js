/* 
Synonyme Action for LaunchBar 
by Christian Bender (@ptujec)
2022-12-30

Copyright:
Action: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
Source website: https://www.woxikon.de/nutzungsbedingungen
*/

function run(argument) {
  const query = argument?.trim();
  if (!query) return;

  const getApiUrl = (lang) =>
    `https://synonyme.woxikon.de/ajaxSearch?lang=${lang}&query=${encodeURI(
      query
    )}`;

  const deData = HTTP.getJSON(getApiUrl('de')).data;
  const enData = HTTP.getJSON(getApiUrl('en')).data;

  const createResult = (item, lang) => ({
    title: item.compat_word,
    badge: lang,
    icon: 'iconTemplate',
    action: 'getSynonyms',
    actionArgument: {
      argument: item.compat_word,
      url: `https://synonyme.woxikon.de/synonyme${
        lang === 'en' ? '-englisch' : ''
      }/${encodeURI(item.compat_word)}.php`,
    },
  });

  const deResult = deData.map((item) => createResult(item, 'de'));
  const enResult = enData.map((item) => createResult(item, 'en'));

  return [...deResult, ...enResult];
}

function getSynonyms({ argument, url }) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.openURL(url);
    return;
  }

  const html = HTTP.loadRequest(url, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data;

  const groups = html
    .replace(/(\n|\s+)/gm, ' ')
    .match(/<li class="synonyms-list-item.*?<\/li>/g);

  // File.writeText(groups.join('\n'), `${Action.supportPath}/test.html`);

  const processGroup = (group) => {
    const meaning = group.match(/<b>(.*?)<\/b>/)?.[1] || '';
    const synMatch =
      group.match(/<div class="upper-synonyms">(.*?)<\/div>/)?.[1] || '';

    const synonyms =
      synMatch
        .match(/<(?:i|span class="text-black"|a)[^>]*>(.*?)<\/(?:i|span|a)>/g)
        ?.map((match) => match.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean) || [];

    return { meaning, synonyms };
  };

  const { meaning, synonyms } = processGroup(groups[0]);

  return groups.length === 1
    ? synonyms.map((synonym) => createSynonymItem(synonym, meaning, url))
    : groups.map((group) => {
        const { meaning, synonyms } = processGroup(group);
        return {
          title: meaning,
          subtitle: synonyms.join(' · '),
          alwaysShowsSubtitle: true,
          icon: 'equalTemplate',
          action: 'showSynonyms',
          actionArgument: { synonyms, meaning, url },
          actionReturnsItems: true,
        };
      });
}

function showSynonyms({ synonyms, meaning, url }) {
  if (LaunchBar.options.commandKey) return LaunchBar.openURL(url);
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(meaning);

  return synonyms.map((synonym) => createSynonymItem(synonym, meaning, url));
}

function createSynonymItem(synonym, meaning, url) {
  return {
    title: synonym,
    label: meaning,
    icon: 'equalTemplate',
    action: 'doSomething',
    actionArgument: { url, synonym },
  };
}

function doSomething({ url, synonym }) {
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(synonym);
  LaunchBar.openURL(url);
}
