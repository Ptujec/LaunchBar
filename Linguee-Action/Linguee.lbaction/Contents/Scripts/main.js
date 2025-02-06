/* 
Linguee Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const TAG_CLASSES = [
  'grammar_info',
  'tag_type',
  'tag_c',
  'tag_usage',
  'tag_area',
  'semantic_field',
];

function getTranslations({ title, url }) {
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(title);
  if (LaunchBar.options.commandKey) return LaunchBar.openURL(url);

  const html = getHTML(url);
  if (!html) return handleNoResults(url);

  const data = html
    .replace(/&#039;/g, "'")
    .replace(/<div class='line inflectioninfo'>.+?<\/div>/g, '')
    .match(/<div class='lemma( featured)?'(.|\n|\r)+?<!--lemma-->/g);

  if (!data) return handleNoResults(url);

  return data.reduce((result, item) => {
    const translations = processLemmaItem(item, url);
    return [...result, ...translations];
  }, []);
}

function processLemmaItem(item, url) {
  const badgeMatch =
    item.match(
      /<div class='lemma( featured)?'.*?<span class='tag_wordtype'>/g
    ) || item.match(/<div class='lemma( featured)?'.*?<\/h2>/g);

  const badge = badgeMatch[0]
    .replace(/(<[^>]+>)/g, '')
    .replace(/&mdash;/g, '')
    .trim();

  const [mainSection, rareSection] = item.split(/<span class='notascommon'>/);

  const mainTranslations = processTranslations(mainSection, badge, url);
  const rareTranslations = rareSection
    ? processTranslations(rareSection, badge, url, true)
    : [];

  return [...mainTranslations, ...rareTranslations];
}

function processTranslations(section, badge, url, isRare = false) {
  if (!section) return [];

  const translations =
    section.match(/<span class='tag_trans'(.+?)<!--tag_trans-->/g) || [];

  return translations.map((trans) => {
    let title = trans
      .replace(
        new RegExp(`<span class='(${TAG_CLASSES.join('|')})'.*?<\/span>`, 'g'),
        ''
      )
      .replace(/<[^>]+>/g, '')
      .trim();

    const tags = TAG_CLASSES.map((className) =>
      extractTag(trans, className)
    ).filter(Boolean);
    const tagList = isRare ? [...tags, 'less common'.localize()] : tags;
    const label = tagList.length > 0 ? tagList.join(' • ') : undefined;

    const lang = (trans.match(/lid='(.*?):/) || [])[1];

    return {
      title,
      badge,
      label,
      action: 'options',
      actionArgument: { title, url },
      actionRunsInBackground: true,
      icon: lang + '_r',
    };
  });
}

function extractTag(trans, tagClass) {
  return trans
    .match(new RegExp(`<span class='${tagClass}'.*?>(.*?)<\/span>`))?.[0]
    ?.replace(/<[^>]+>/g, '');
}

function handleNoResults(url) {
  const response = LaunchBar.alert(
    'No content!'.localize(),
    'Open Website?',
    'Open',
    'Cancel'
  );
  if (response === 0) LaunchBar.openURL(url);
  return;
}
