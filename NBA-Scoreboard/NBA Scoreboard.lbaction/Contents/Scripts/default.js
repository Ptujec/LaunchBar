// NBA Scoreboard by @Ptujec

// Data
// http://nbasense.com/nba-api/Data/Prod/Scores/Scoreboard

// weiter Optionen
// https://rapidapi.com/api-sports/api/api-nba (angemeldet)
// https://sportsdata.io/developers/api-documentation/nba

// ESPN
// https://www.espn.com/apis/devcenter/docs/scores.html#using-the-api

function run(argument) {
  // Date
  if (argument == undefined) {
    var date = new Date();

    var dateString = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];

    var dateY = new Date();
    dateY.setDate(dateY.getDate() - 1);

    var dateStringY = new Date(
      dateY.getTime() - dateY.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split('T')[0];

    // LaunchBar.alert(dateStringY)
    dateStringY = dateStringY.replace(/-/g, '');
  } else {
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
      var date = new Date();

      // Add or subtrackt days
      var offsetNumber = parseInt(argument);
      date.setDate(date.getDate() + offsetNumber);

      var dateString = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
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

      var dateString = new Date(
        dayOfWeekDate.getTime() - dayOfWeekDate.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split('T')[0];
    }
  }
  dateString = dateString.replace(/-/g, '');

  // LaunchBar.alert(dateString)

  // return
  //   if (LaunchBar.options.commandKey) {
  //     LaunchBar.openURL(
  //       'http://data.nba.net/prod/v2/' + dateString + '/scoreboard.json'
  //     );
  //   }
  if (LaunchBar.options.shiftKey) {
    LaunchBar.openURL(
      'https://www.espn.com/nba/scoreboard/_/date/' + dateString
    );
  } else {
    if (argument == undefined) {
      var scoreData = HTTP.getJSON(
        'http://data.nba.net/prod/v2/' + dateString + '/scoreboard.json'
      );
      var games = scoreData.data.games;
      var scoreDataY = HTTP.getJSON(
        'http://data.nba.net/prod/v2/' + dateStringY + '/scoreboard.json'
      );
      var gamesY = scoreDataY.data.games;
      games = gamesY.concat(games);
    } else {
      var scoreData = HTTP.getJSON(
        'http://data.nba.net/prod/v2/' + dateString + '/scoreboard.json'
      );
      var games = scoreData.data.games;
    }

    games = games.sort(function (a, b) {
      return b.isGameActivated - a.isGameActivated;
    });

    var results = [];
    var i = 0;
    for (i = 0; i < games.length; i++) {
      var game = games[i];
      var clock = game.clock;
      var period = game.period.current;
      var vTeam = game.vTeam.triCode;
      var vTeamScore = game.vTeam.score;
      var hTeam = game.hTeam.triCode;
      var hTeamScore = game.hTeam.score;
      var league = game.leagueName;

      // Subtitle
      var playoffs = game.playoffs;
      if (playoffs != undefined) {
        var subtitle =
          'Game ' +
          playoffs.gameNumInSeries +
          ' (' +
          playoffs.seriesSummaryText +
          ')';
      } else {
        var subtitle = '';
      }

      // Title and Icon
      if (vTeamScore == 0 && hTeamScore == 0) {
        // Date and Time
        // https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
        // https://stackoverflow.com/a/22914738/15774924

        var utc = new Date(game.startTimeUTC).toString();
        var relativeDate = LaunchBar.formatDate(new Date(utc), {
          relativeDateFormatting: true,
        });

        // Title
        if (LaunchBar.currentLocale == 'de') {
          var title =
            hTeam +
            ' vs. ' +
            vTeam +
            ' (' +
            relativeDate.toLowerCase() +
            ' Uhr)';
        } else {
          var title =
            hTeam + ' vs. ' + vTeam + ' (' + relativeDate.toLowerCase() + ')';
        }

        // Icon
        var icon = hTeam.toLowerCase();
      } else {
        // Title
        var title = hTeam + ' ' + hTeamScore + ' : ' + vTeam + ' ' + vTeamScore;

        // Icon
        if (parseInt(vTeamScore) > parseInt(hTeamScore)) {
          var icon = vTeam.toLowerCase();
        } else {
          var icon = hTeam.toLowerCase();
        }
      }

      // URL (Boxscore)
      // https://www.nba.com/game/lac-vs-dal-0042000176/box-score
      var url =
        'https://www.nba.com/game/' +
        vTeam.toLowerCase() +
        '-vs-' +
        hTeam.toLowerCase() +
        '-' +
        game.gameId +
        '/box-score';

      // Label
      var label = '';
      if (clock != '') {
        label = 'Q' + period + ' ' + clock;
      }

      var pushData = {
        title: title,
        subtitle: subtitle,
        icon: icon,
        action: 'open',
        actionArgument: url,
        label: label,
      };

      if (league != 'standard') {
        if (league == 'vegas') {
          pushData.badge = 'Summer League';
        } else {
          pushData.badge = league;
        }
      }
      results.push(pushData);
    }
    return results;
  }
}

function open(url) {
  LaunchBar.openURL(url, 'Brave Browser');
}
