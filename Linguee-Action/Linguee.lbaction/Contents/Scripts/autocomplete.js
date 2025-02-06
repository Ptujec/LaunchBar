/* 
Linguee Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function getAutocompleteResults(argument) {
  if (!argument) return;

  const html = getHTML(
    `https://www.linguee.com/${language}/search?qe=${encodeURI(
      argument
    )}&source=auto`
  )?.replace(/&#039;/g, "'");

  const adjustedHtml =
    html +
    `\n<div class='autocompletion_item sourceIsLang1 isForeignTerm'></div>`;

  const autocompletionItems = adjustedHtml.match(
    /<div class='main_row'>(?:[\s\S]*?)(?=<div class='autocompletion_item)/gi // using <div class='main_row'> prevents catching suggest_row items
  );

  if (!autocompletionItems) {
    return {
      title: 'No results found'.localize(),
      icon: 'alert',
    };
  }

  return autocompletionItems.map((item) => formatAutocompletionItems(item));
}

function formatAutocompletionItems(item) {
  item = item
    .replace(/<span class='sep'>&middot;<\/span>/g, '')
    .replace(/<span class='grammar_info'>.*?<\/span>/g, '')
    .replace(/<span class='placeholder'>(.*?)<\/span>/g, '$1')
    .replace(/\n|\t/g, '');

  // Main Item
  const title = item.match(/<div class='main_item'.+?>(.+?)<\/div>/)?.[1];

  const url =
    'https://www.linguee.com' +
    item.match(/<div class='main_item'.+?href='(.*?)'>/)?.[1];

  const badge =
    Array.from(item.matchAll(/<div class='main_wordtype'.*?>([\s\S]*?)</g))
      .filter((match) => match[1] !== '')
      .map((match) => match[1])
      .join(' • ') || undefined;

  const lang = item.match(/lc='(.*?)'/)[1];
  const icon = `${lang}_l`;

  // Translation Item
  const transTitle =
    Array.from(
      item.matchAll(/<div class='translation_item'[\s\S]*?>([\s\S]*?)</g)
    )
      .map((match) => match[1]?.trim().replace(/(<([^>]+)>)/g, ''))
      .filter((match) => match !== '')
      .join(', ') || undefined;

  const subtitle = transTitle;

  return {
    title,
    subtitle,
    alwaysShowsSubtitle: true,
    badge,
    icon,
    action: 'getTranslations',
    actionArgument: { title, url },
  };
}
