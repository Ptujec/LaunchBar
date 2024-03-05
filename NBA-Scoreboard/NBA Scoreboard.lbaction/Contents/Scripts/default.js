/* 
NBA Scoreboard Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://www.balldontlie.io/#introduction
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
*/

const apiKey = Action.preferences.apiKey;

function run(argument) {
  // Date
  if (argument == undefined) {
    argument = '0';
  }
  // Date with offset (either number … or an upcoming day of the week)

  // relativ days of the week
  if (argument.toLowerCase() == 'morgen') {
    argument = '1';
  } else if (argument.toLowerCase() == 'gestern') {
    argument = '-1';
  }

  if (!isNaN(parseInt(argument))) {
    // Number offset
    var startDate = new Date();
    var endDate = new Date();

    // Add or subtrackt days
    var offsetNumber = parseInt(argument);
    startDate.setDate(startDate.getDate() + (offsetNumber - 1));
    endDate.setDate(endDate.getDate() + offsetNumber);

    var startDateString = new Date(
      startDate.getTime() - startDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];

    var endDateString = new Date(
      endDate.getTime() - endDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];
  } else {
    // day of the week

    var weekdaysEN = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    var weekdaysDE = [
      'sonntag',
      'montag',
      'dienstag',
      'mittwoch',
      'donnerstag',
      'freitag',
      'samstag',
    ];

    for (var i = 0; i < weekdaysEN.length; i++) {
      var dayOfWeekEN = weekdaysEN[i];
      if (dayOfWeekEN.startsWith(argument.toLowerCase())) {
        var dayOfWeek = i;
      }
    }

    if (dayOfWeek == undefined) {
      for (i = 0; i < weekdaysDE.length; i++) {
        var dayOfWeekDE = weekdaysDE[i];
        if (dayOfWeekDE.startsWith(argument.toLowerCase())) {
          var dayOfWeek = i;
        }
      }
    }

    if (dayOfWeek == undefined) {
      LaunchBar.alert('No valid entry');
      return;
    }

    var date = new Date();

    var dayOfWeekDate = new Date(date.getTime());
    // dayOfWeekDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
    dayOfWeekDate.setDate(
      date.getDate() + ((dayOfWeek - 1 - date.getDay() + 7) % 7) + 1
    );

    var dayBeforeDayOfWeekDate = new Date(date.getTime());
    dayBeforeDayOfWeekDate.setDate(
      date.getDate() + ((dayOfWeek - 1 - date.getDay() + 7) % 7)
    );

    var startDateString = new Date(
      dayBeforeDayOfWeekDate.getTime() -
        dayBeforeDayOfWeekDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];

    var endDateString = new Date(
      dayOfWeekDate.getTime() - dayOfWeekDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];
  }

  var output = showGames(startDateString, endDateString);
  return output;
}

function showGames(startDateString, endDateString) {
  if (!apiKey || LaunchBar.options.alternateKey) {
    setAPIKey();
    return;
  }

  const ducky = 'https://duckduckgo.com/?q=!ducky+';

  const scoreData = HTTP.getJSON(
    'https://api.balldontlie.io/v1/games?start_date=' +
      startDateString +
      '&end_date=' +
      endDateString,
    {
      headerFields: {
        Authorization: apiKey,
      },
    }
  );

  // File.writeJSON(scoreData, Action.supportPath + '/test.json');
  // return;
  // const scoreData = File.readJSON(Action.supportPath + '/test.json');

  if (scoreData.response == undefined || scoreData.error) {
    LaunchBar.alert(scoreData.error);
    return;
  }

  if (scoreData.response.status != 200) {
    LaunchBar.alert(
      scoreData.response.status + ': ' + scoreData.response.localizedStatus
    );
    return;
  }

  var games = scoreData.data.data;

  var scheduledGames = [];
  var otherGames = [];

  var i = 0;
  for (i = 0; i < games.length; i++) {
    var espnSearchURL = undefined;
    var ytSearchURL = undefined;
    var nbaComSearchURL = undefined;

    var game = games[i];
    var time = game.time;
    var status = game.status;
    var gameDate = game.date.split('T')[0];
    var vTeam = game.visitor_team.abbreviation;
    var vTeamScore = game.visitor_team_score;
    var hTeam = game.home_team.abbreviation;
    var hTeamScore = game.home_team_score;

    var espnDate = LaunchBar.formatDate(new Date(gameDate), {
      dateStyle: 'long',
      locale: 'en',
      timeStyle: 'none',
    });

    espnSearchURL =
      ducky +
      encodeURIComponent(
        'site:espn.com ' +
          game.visitor_team.name +
          ' vs. ' +
          game.home_team.name +
          ' NBA Game Summary ' +
          espnDate +
          ' ESPN'
      );

    var nbaComDate = LaunchBar.formatDate(new Date(gameDate), {
      dateStyle: 'medium',
      locale: 'en',
      timeStyle: 'none',
    });

    // Test status for date
    var statusIsDate = new Date(status);

    // Time difference from now to game start
    var difference = (new Date(status) - new Date()) / (1000 * 60 * 60);

    // if (difference > 0) {
    if (statusIsDate != 'Invalid Date') {
      // Date
      var relativeDate = LaunchBar.formatDate(new Date(status), {
        relativeDateFormatting: true,
      });

      // Title
      var title = vTeam + ' vs. ' + hTeam + ' - ' + relativeDate;

      // Icon
      var icon = hTeam.toLowerCase();

      nbaComSearchURL =
        ducky +
        encodeURIComponent(
          // Example: Dallas Mavericks vs San Antonio Spurs Dec 31, 2022 Game Summary | NBA.com
          'site:nba.com ' +
            game.visitor_team.full_name +
            ' vs ' +
            game.home_team.full_name +
            ' ' +
            nbaComDate +
            ' Game Summary Preview'
        );
    } else {
      // Games that are currently played or have finished
      if (time == 'Final') {
        ytSearchURL =
          'https://www.youtube.com/results?search_query=' +
          encodeURIComponent(
            // Example: Game Recap: Mavericks 126, Spurs 125
            'Game Recap: ' +
              game.visitor_team.name +
              ' ' +
              vTeamScore +
              ', ' +
              game.home_team.name +
              ' ' +
              hTeamScore
          );
      } else {
        nbaComSearchURL =
          ducky +
          encodeURIComponent(
            'site:nba.com ' +
              game.visitor_team.full_name +
              ' vs ' +
              game.home_team.full_name +
              ' ' +
              nbaComDate +
              ' Game Summary'
          );
      }

      // Title
      var title = hTeam + ' ' + hTeamScore + ' : ' + vTeam + ' ' + vTeamScore;

      // Icon
      if (parseInt(vTeamScore) > parseInt(hTeamScore)) {
        var icon = vTeam.toLowerCase();
      } else {
        var icon = hTeam.toLowerCase();
      }
    }

    var pushData = {
      title: title,
      icon: icon,
      action: 'open',
      id: game.id,
      actionArgument: {
        espnSearchURL: espnSearchURL,
        ytSearchURL: ytSearchURL,
        nbaComSearchURL: nbaComSearchURL,
      },
      actionRunsInBackground: true,
    };

    if (time != 'Final' && time != '' && time != null) {
      pushData.label = time;
    }

    if (statusIsDate != 'Invalid Date') {
      pushData.date = statusIsDate.getTime();
      scheduledGames.push(pushData);
    } else {
      otherGames.push(pushData);
    }
  }

  otherGames = otherGames.sort(function (a, b) {
    return a.id - b.id;
  });

  scheduledGames = scheduledGames.sort(function (a, b) {
    return a.date - b.date;
  });

  results = otherGames.concat(scheduledGames);

  return results;
}

function open(dict) {
  LaunchBar.hide();
  if (!LaunchBar.options.alternateKey) {
    if (dict.ytSearchURL != undefined) {
      LaunchBar.openURL(dict.ytSearchURL);
    } else if (dict.nbaComSearchURL != undefined) {
      LaunchBar.openURL(dict.nbaComSearchURL);
    }
  } else {
    LaunchBar.openURL(dict.espnSearchURL);
  }
}

function setAPIKey() {
  const response = LaunchBar.alert(
    'API Key required',
    'This actions requires an API Key from https://new.balldontlie.io. Press "Open Website" to get yours.\nCopy the API Key to your clipboard, run the action again and press "Set API Key"',
    'Open Website',
    'Set API Key',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.hide();
      LaunchBar.openURL('https://new.balldontlie.io');
      break;
    case 1:
      // Check API Key
      var clipboard = LaunchBar.getClipboardString().trim();

      if (clipboard.length == 36) {
        Action.preferences.apiKey = clipboard;

        LaunchBar.alert(
          'Success!',
          'API Access Key set to: ' + Action.preferences.apiKey
        );
      } else {
        LaunchBar.alert(
          'Seems like an incorrect API-key. Make sure it is the most recent item of your clipboard history!'
        );
      }
      break;
    case 2:
      break;
  }
}
