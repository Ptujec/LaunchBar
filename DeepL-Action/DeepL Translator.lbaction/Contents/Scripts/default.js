/* LaunchBar Action for DeepL
- https://www.deepl.com/de/docs-api/translating-text/request/
*/

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
      var output = showLanguages();
      return output;
    } else {
      if (apiKey == undefined) {
        setApiKey();
      } else {
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
  Action.preferences.lang = lang;
  var output = showLanguages();
  return output;
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
