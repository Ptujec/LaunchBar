/* LaunchBar Action for DeepL
- https://www.deepl.com/de/docs-api/translating-text/request/
*/

String.prototype.localizationTable = 'default';

const apiKey = Action.preferences.apiKey;
var lang = Action.preferences.lang;

if (lang == undefined) {
  var lang = 'EN';
}

function run(argument) {
  if (LaunchBar.options.shiftKey) {
    setApiKey();
  } else {
    if (argument == undefined) {
      Action.preferences.mode = 'setDefault';
      var output = showLanguages();
      return output;
    } else {
      if (apiKey == undefined) {
        setApiKey();
      } else {
        if (LaunchBar.options.commandKey) {
          Action.preferences.mode = 'translate';
          Action.preferences.argument = argument;
          var output = showLanguages();
          return output;
        } else {
          Action.preferences.mode = 'setDefault';
          Action.preferences.argument = argument;
          var output = translate(lang);
          return output;
        }
      }
    }
  }
}
function showLanguages() {
  var lang = Action.preferences.lang;

  var target_langs = File.readText(
    Action.path + '/Contents/Resources/target_langs.txt'
  ).split('\n');

  var all = [];
  var selected = [];
  target_langs.forEach(function (item) {
    var langCode = item.split(',')[0];
    if (LaunchBar.currentLocale == 'de') {
      var langName = item.split(',')[2];
    } else {
      var langName = item.split(',')[1];
    }

    var pushData = {
      title: langName,
      icon: langCode.toLowerCase() + '_Template',
      action: 'setLanguage',
      actionArgument: langCode,
    };

    if (Action.preferences.mode == 'translate') {
      pushData.subtitle =
        'Translate: '.localize() + '"' + Action.preferences.argument + '"';
    }

    if (langCode == lang) {
      pushData.label = '✔︎';
      selected.push(pushData);
    } else {
      all.push(pushData);
    }
  });

  var result = selected.concat(all);

  return result;
}

function setLanguage(lang) {
  if (Action.preferences.mode == 'translate') {
    var output = translate(lang);
    return output;
  } else {
    // set default language
    Action.preferences.lang = lang;
    var output = showLanguages();
    return output;
  }
}

function translate(lang) {
  var argument = Action.preferences.argument;

  var result = HTTP.getJSON(
    'https://api-free.deepl.com/v2/translate?auth_key=' +
      apiKey +
      '&text=' +
      encodeURI(argument) +
      '&target_lang=' +
      lang
  );

  return [
    {
      title: result.data.translations[0].text,
      subtitle: argument,
      icon: 'iconTemplate',
    },
  ];
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API Key required',
    'Set from Clipboard. You first need to create an account and retrieve your API key from https://www.deepl.com/de/pro-account/summary.',
    'Set API Key',
    'Cancel'
  );
  switch (response) {
    case 0:
      var clipboardConent = LaunchBar.getClipboardString().trim();

      if (clipboardConent.length == 39) {
        Action.preferences.apiKey = clipboardConent;
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API Key',
          'Make sure the API Key is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}
