/*
Dad Jokes Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

API: https://icanhazdadjoke.com/

TODO:
- Next funktion for favs?
- Reverse order for favs
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  if (LaunchBar.options.alternateKey) return chooseLocation();

  if (!argument) {
    if (LaunchBar.options.shiftKey) return showFavs();
    if (LaunchBar.options.commandKey) {
      if (File.exists(getDadjokesFile())) {
        LaunchBar.hide();
        LaunchBar.openURL(
          File.fileURLForPath(getDadjokesFile()),
          'com.barebones.bbedit',
        );
      }
      return;
    }
    getJoke();
    return;
  }
  const response = HTTP.getJSON(
    'https://icanhazdadjoke.com/search?term=' + encodeURI(argument),
    { headerFields: { Accept: 'application/json', method: 'GET' } },
  );

  return response.data.results.map((item) => ({
    title: item.joke.trim(),
    icon: 'mustacheTemplate',
    action: 'displayJoke',
    actionArgument: item.joke,
  }));
}

function getDadjokesFile() {
  const defaultLocation =
    '/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/';

  return (
    (Action.preferences.folderLocation || defaultLocation) + 'dadjokes.txt'
  );
}

function getJoke() {
  const joke = HTTP.getJSON('https://icanhazdadjoke.com/', {
    headerFields: { Accept: 'application/json', method: 'GET' },
  }).data.joke;

  const choice = LaunchBar.alert(
    joke,
    '',
    'Next'.localize(),
    'Copy & Save'.localize(),
    'Cancel'.localize(),
  );

  if (choice === 0) getJoke();
  else if (choice === 1) {
    save(joke);
    LaunchBar.setClipboardString(joke);
  }
}

function showFavs() {
  const dadjokesFile = getDadjokesFile();
  if (!File.exists(dadjokesFile)) {
    LaunchBar.alert('No Favs (file) yet!');
    return;
  }

  const text = File.readText(dadjokesFile);
  const favs = text.replace(/^(\s|\t)*\n/gm, '').split('\n');

  return favs
    .filter((item) => item.length > 0)
    .map((item) => {
      if (item.includes('[')) {
        const joke = item.match(/\[(.+)\]/)[1];
        const url = item.match(/\((.+)\)/)[1];
        return { title: joke, icon: 'mustacheTemplate', url };
      }
      return {
        title: item,
        icon: 'mustacheTemplate',
        action: 'displayFav',
        actionArgument: item,
      };
    });
}

function displayJoke(joke) {
  const choice = LaunchBar.alert(
    joke,
    '',
    'Copy & Save'.localize(),
    'Cancel'.localize(),
  );

  if (choice === 0) {
    save(joke);
    LaunchBar.setClipboardString(joke);
    return showFavs();
  }
}

function displayFav(joke) {
  const choice = LaunchBar.alert(
    joke,
    '',
    'Copy'.localize(),
    'Remove'.localize(),
    'Cancel'.localize(),
  );

  if (choice === 0) LaunchBar.setClipboardString(joke);
  else if (choice === 1) {
    remove(joke);
    return showFavs();
  }
}

function save(joke) {
  const dadjokesFile = getDadjokesFile();

  if (!File.exists(dadjokesFile)) {
    File.writeText(joke, dadjokesFile);
    return;
  }

  let jokes = File.readText(dadjokesFile);
  jokes = jokes.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');

  if (!jokes.includes(joke)) {
    File.writeText(jokes + '\n\n' + joke, dadjokesFile);
  }
}

function remove(joke) {
  const dadjokesFile = getDadjokesFile();
  let jokes = File.readText(dadjokesFile).replace(joke, '');
  jokes = jokes.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  File.writeText(jokes, dadjokesFile);
}

function chooseLocation() {
  LaunchBar.hide();
  const newLocation = LaunchBar.executeAppleScript(
    `
    set _home to path to home folder as string
    set _default to _home & "Library:Mobile Documents:iCloud~is~workflow~my~workflows:" as alias
    set _folder to choose folder with prompt "Select a folder for this action:" default location _default
    set _folder to POSIX path of _folder
    `,
  ).trim();

  if (!newLocation) return;
  Action.preferences.folderLocation = newLocation;
  return;
}
