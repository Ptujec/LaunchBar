/* 
DeepL Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developers.deepl.com/docs/api-reference/translate
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
*/

String.prototype.localizationTable = 'default';

const apiKey = Action.preferences.apiKey;

function run(argument) {
  if (LaunchBar.options.alternateKey || !apiKey) return setApiKey();
  if (!argument) return showLanguages('setDefault');
  if (LaunchBar.options.commandKey) return showLanguages('translate', argument);

  const lang = Action.preferences.lang || 'EN';
  return translate(argument, lang);
}

function showLanguages(mode, inputText) {
  const lang = Action.preferences.lang || 'EN';

  const target_langs = File.readText(
    Action.path + '/Contents/Resources/target_langs.txt'
  ).split('\n');

  return target_langs
    .reduce(
      ([selected, others], item) => {
        const [langCode, enName, deName] = item.split(',');
        const isDefault = langCode === lang;

        const entry = {
          title: LaunchBar.currentLocale === 'de' ? deName : enName,
          subtitle:
            mode === 'translate'
              ? `${'Translate: '.localize()}"${inputText}"`
              : undefined,
          icon: `${langCode.toLowerCase()}_Template`,
          badge: isDefault ? 'default'.localize() : undefined,
          action: 'setLanguage',
          actionArgument: { langCode, mode, inputText },
        };

        return [
          isDefault ? [...selected, entry] : selected,
          isDefault ? others : [...others, entry],
        ];
      },
      [[], []]
    )
    .flat();
}

function setLanguage({ langCode, mode, inputText }) {
  if (mode === 'translate') return translate(inputText, langCode);

  Action.preferences.lang = langCode;
  return showLanguages('setDefault');
}

function translate(inputText, langCode) {
  const result = HTTP.postJSON('https://api-free.deepl.com/v2/translate', {
    headerFields: {
      Authorization: 'DeepL-Auth-Key ' + apiKey,
    },
    body: {
      text: [inputText],
      target_lang: langCode,
    },
  });

  if (!result || !result.response) {
    LaunchBar.alert(result ? result.error : 'No response from API');
    return;
  }

  if (result.response.status !== 200) {
    LaunchBar.alert(
      result.response.status + ': ' + result.response.localizedStatus
    );
    return;
  }

  const json = JSON.parse(result.data);
  const resultText = json.translations[0].text;

  return {
    title: resultText,
    subtitle: inputText,
    icon: 'iconTemplate',
  };
}

function setApiKey() {
  const response = LaunchBar.alert(
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
