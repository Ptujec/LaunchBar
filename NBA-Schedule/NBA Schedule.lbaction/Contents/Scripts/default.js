/* 
NBA Schedule Action for LaunchBar
by Christian Bender (@ptujec)
2022-04-29

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Data & Documentation
- http://nbasense.com/nba-api/Data/Cms/Teams/SportsMetaTeams#request-example
- http://nbasense.com/nba-api/Data/MobileTeams/Schedule/LeagueRollingSchedule
- https://github.com/rlabausa/nba-schedule-data

TODO:
- Update Team data option 
*/

function run() {
  if (LaunchBar.options.shiftKey) {
    var output = teamsList();
    return output;
  } else {
    var output = getSchedule();
    return output;
  }
}

function teamsList() {
  var teams = File.readJSON(Action.path + '/Contents/Resources/nba_teams.json')
    .sports_content.teams.team;

  var fav = Action.preferences.fav;

  if (fav != undefined) {
    var result = [
      {
        title: fav.team_name + ' ' + fav.team_nickname,
        icon: fav.team_abbrev.toLowerCase(),
        badge: 'My Team',
        action: 'options',
        actionArgument: fav,
      },
    ];
  } else {
    var result = [];
  }

  teams.forEach(function (item) {
    var pushData = {
      title: item.team_name + ' ' + item.team_nickname,
      icon: item.team_abbrev.toLowerCase(),
      action: 'options',
      actionArgument: item,
    };
    if (fav != undefined) {
      if (item.is_nba_team == true && item.team_code != fav.team_code) {
        result.push(pushData);
      }
    } else {
      if (item.is_nba_team == true) {
        result.push(pushData);
      }
    }
  });
  return result;
}

function options(item) {
  if (LaunchBar.options.controlKey) {
    Action.preferences.fav = item;
    var output = teamsList();
    return output;
  } else {
    var output = getSchedule(item.team_abbrev);
    return output;
  }
}

function getSchedule(team) {
  var d = new Date();
  var now = d.toISOString();
  var month = d.getMonth();
  var year = d.getFullYear();

  if (month > 5) {
    var season = year;
  } else {
    var season = year - 1;
  }

  var schedule = HTTP.getJSON(
    'http://data.nba.net/v2015/json/mobile_teams/nba/' +
      season +
      '/league/00_rolling_schedule.json'
  ).data.rscd.g;

  var result = [];
  schedule.forEach(function (item) {
    var gameDate = item.gdtutc + 'T' + item.utctm + ':00.000Z';

    if (gameDate > now) {
      var relativeGameDate = LaunchBar.formatDate(new Date(gameDate), {
        relativeDateFormatting: true,
      });

      var vTeam = item.v.ta;
      var hTeam = item.h.ta;

      var title = hTeam + ' vs. ' + vTeam + ' (' + relativeGameDate + ')';

      var icon = hTeam.toLowerCase();

      var url =
        'https://www.nba.com/game/' +
        vTeam.toLowerCase() +
        '-vs-' +
        hTeam.toLowerCase() +
        '-' +
        item.gid +
        '/box-score';

      if (team != undefined) {
        if (vTeam == team || hTeam == team) {
          result.push({
            title: title,
            icon: icon,
            url: url,
          });
        }
      } else {
        result.push({
          title: title,
          icon: icon,
          url: url,
        });
      }
    }
  });

  return result;
}
