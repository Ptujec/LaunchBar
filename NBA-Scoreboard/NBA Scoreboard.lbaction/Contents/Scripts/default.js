/* 
NBA Scoreboard Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://www.balldontlie.io/
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
*/

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

  var checkNum = parseInt(argument);

  if (!isNaN(checkNum)) {
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
  const ducky = 'https://duckduckgo.com/?q=!ducky+';

  var scoreData = HTTP.getJSON(
    'https://www.balldontlie.io/api/v1/games?start_date=' +
      startDateString +
      '&end_date=' +
      endDateString
  );

  // File.writeJSON(scoreData, Action.supportPath + '/test.json');
  // return;
  // var scoreData = File.readJSON(Action.supportPath + '/test.json');

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

    // If the game status starts with a time - meaning it did not start yet
    if (/^\d+:\d+/.test(status)) {
      // Date
      var minutes = status.match(/:(\d+)/)[1];
      var hours = status.match(/^\d+/);
      if (status.includes('PM')) {
        hours = parseInt(hours) + 12;
      }

      var dateTime = gameDate.replace(/-/g, '') + hours + minutes; // for Sorting

      var etISODate = gameDate + 'T' + hours + ':' + minutes + ':00.000Z';
      var utc = new Date(etISODate);
      var timeoffset = 5;
      utc.setTime(utc.getTime() + timeoffset * 60 * 60 * 1000);

      var relativeDate = LaunchBar.formatDate(new Date(utc), {
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

    if (time != 'Final' && time != '') {
      pushData.label = time;
    }

    if (/^\d+:\d+/.test(status)) {
      pushData.date = dateTime;
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
  if (LaunchBar.options.alternateKey) {
    if (dict.ytSearchURL != undefined) {
      LaunchBar.openURL(dict.ytSearchURL);
    } else if (dict.nbaComSearchURL != undefined) {
      LaunchBar.openURL(dict.nbaComSearchURL);
    }
  } else {
    LaunchBar.openURL(dict.espnSearchURL);
  }
}
