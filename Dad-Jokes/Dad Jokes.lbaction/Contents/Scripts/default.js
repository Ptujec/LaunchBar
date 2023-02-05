/* 
Dad Jokes Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

API: https://icanhazdadjoke.com/
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  if (argument == undefined) {
    if (LaunchBar.options.shiftKey) {
      var output = showFavs();
      return output;
    } else if (LaunchBar.options.commandKey) {
      var dadjokesFile =
        LaunchBar.homeDirectory +
        '/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/dadjokes.txt';

      if (File.exists(dadjokesFile)) {
        LaunchBar.hide();
        LaunchBar.openURL(File.fileURLForPath(dadjokesFile), 'BBEdit');
      }
    } else {
      getJoke();
    }
  } else {
    var r = HTTP.getJSON(
      'https://icanhazdadjoke.com/search?term=' + encodeURI(argument),
      {
        headerFields: {
          Accept: 'application/json',
          method: 'GET',
        },
      }
    );

    var jokes = r.data.results;
    var result = [];

    for (var i = 0; i < jokes.length; i++) {
      var joke = jokes[i].joke.trim();

      result.push({
        title: joke,
        icon: 'mustacheTemplate',
        action: 'displayJoke',
        actionArgument: jokes[i].joke,
      });
    }
    return result;

    // LaunchBar.openURL('https://icanhazdadjoke.com/search?term=' + encodeURI(argument))
  }
}

function getJoke() {
  var joke = HTTP.getJSON('https://icanhazdadjoke.com/', {
    headerFields: {
      Accept: 'application/json',
      method: 'GET',
    },
  }).data.joke;

  var response = LaunchBar.alert(
    joke,
    '',
    'Next'.localize(),
    'Save'.localize(),
    'Cancel'.localize()
  );

  switch (response) {
    case 0:
      // Ok
      getJoke();
      break;

    case 1:
      // Sichern
      save(joke);
      getJoke();
      break;

    case 2:
      // Cancel
      LaunchBar.hide();
      break;
  }
}

function showFavs() {
  var dadjokesFile =
    LaunchBar.homeDirectory +
    '/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/dadjokes.txt';

  if (!File.exists(dadjokesFile)) {
    LaunchBar.alert('No Favs (file) yet!');
    return;
  }

  var text = File.readText(dadjokesFile);
  var favs = text.replace(/^(\s|\t)*\n/gm, '').split('\n');

  var result = [];

  favs.forEach(function (item) {
    if (item.includes('[')) {
      var joke = item.match(/\[(.+)\]/)[1];
      var url = item.match(/\((.+)\)/)[1];

      var pushData = {
        title: joke,
        icon: 'mustacheTemplate',
        url: url,
      };
    } else {
      var joke = item;
      var pushData = {
        title: joke,
        icon: 'mustacheTemplate',
        action: 'displayFav',
        actionArgument: joke,
        // children: optionsFavs(joke),
      };
    }

    result.push(pushData);
  });

  return result;
}

function displayJoke(joke) {
  var response = LaunchBar.alert(
    joke,
    '',
    'Ok',
    'Save'.localize(),
    'Cancel'.localize()
  );

  switch (response) {
    case 0:
      // remove
      break;

    case 1:
      // remove
      save(joke);
      var output = showFavs();
      return output;

    case 2:
      // Cancel
      LaunchBar.hide();
      break;
  }
}

function displayFav(joke) {
  var response = LaunchBar.alert(
    joke,
    '',
    'Ok',
    'Remove'.localize(),
    'Cancel'.localize()
  );

  switch (response) {
    case 0:
      // remove
      break;

    case 1:
      // remove
      remove(joke);
      var output = showFavs();
      return output;

    case 2:
      // Cancel
      LaunchBar.hide();
      break;
  }
}

function save(joke) {
  var dadjokesFile =
    LaunchBar.homeDirectory +
    '/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/dadjokes.txt';

  if (!File.exists(dadjokesFile)) {
    File.writeText(joke, dadjokesFile);
  } else {
    var jokes = File.readText(dadjokesFile);

    // Fix unnecessary empty lines at the top and inbetween
    jokes = jokes.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');

    if (!jokes.includes(joke)) {
      File.writeText(jokes + '\n\n' + joke, dadjokesFile);
    }
  }
}

function remove(joke) {
  var dadjokesFile =
    LaunchBar.homeDirectory +
    '/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/dadjokes.txt';

  var jokes = File.readText(dadjokesFile).replace(joke, '');

  // Fix unnecessary empty lines at the top and inbetween
  jokes = jokes.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');

  File.writeText(jokes, dadjokesFile);
}
