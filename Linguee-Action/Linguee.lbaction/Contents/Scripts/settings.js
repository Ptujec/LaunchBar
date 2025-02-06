/* 
Linguee Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function showLanguages(language) {
  const languages = [
    'english-german',
    'french-german',
    'french-english',
    'spanish-german',
    'spanish-english',
    'german-portuguese',
    'english-portuguese',
    'english-russian',
  ];

  return languages.map((item) => ({
    title: getTitle(item),
    icon: item === language ? 'checkTemplate' : 'circleTemplate',
    action: 'setLanguage',
    actionArgument: item,
  }));
}

function getTitle(arg) {
  const [lang1, lang2] = arg.split('-');
  return `${lang1.charAt(0).toUpperCase() + lang1.slice(1)} ↔ ${
    lang2.charAt(0).toUpperCase() + lang2.slice(1)
  }`.localize();
}

function setLanguage(language) {
  Action.preferences.language = language;
  return showLanguages(language);
}
