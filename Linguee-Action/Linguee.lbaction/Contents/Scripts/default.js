/* 
Linguee Action for LaunchBar
by Christian Bender (@ptujec)
2022-04-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: 
- Reduce suggestions to a relevant number
- Sort suggestions by language?

Features:
- play mp3? https://www.linguee.com/mp3/EN_US/12/1253208465b1efa876f982d8a9e73eef-100.mp3
*/

String.prototype.localizationTable = 'default';
include('settings.js');
include('autocomplete.js');
include('main.js');
include('global.js');

const language = Action.preferences.language || 'english-german';

function run(argument) {
  if (argument == null) return showLanguages(language);
  return getAutocompleteResults(argument);
}

function options({ title, url }) {
  LaunchBar.hide();
  if (LaunchBar.options.shiftKey) return LaunchBar.paste(title);
  LaunchBar.openURL(url);
}
