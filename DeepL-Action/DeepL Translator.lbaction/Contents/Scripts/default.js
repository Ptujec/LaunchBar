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

  // TODO: get all available languages

  var settings = [
    {
      title: 'Slovene',
      icon: 'sl_Template',
      action: 'setLanguage',
      actionArgument: 'SL',
    },
    {
      title: 'Deutsch',
      icon: 'de_Template',
      action: 'setLanguage',
      actionArgument: 'DE',
    },
    {
      title: 'English',
      icon: 'en_Template',
      action: 'setLanguage',
      actionArgument: 'EN',
    },
  ];

  settings.forEach(function (item) {
    if (item.actionArgument == lang) {
      item.badge = 'current';
    } else {
    }
  });

  return settings;
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
