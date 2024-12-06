/* 
NBA Scoreboard Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://docs.balldontlie.io/#introduction
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

TODO: 
- Would be nice to be able to not have to guess to show the games on youtube and such … but probably requires new API
- German Localization? (Settings)
*/

String.prototype.localizationTable = 'default';

const defaultPast = '1';
const defaultFuture = '0';

function run(argument) {
  if (!Action.preferences.apiKey) return setAPIKey();
  if (LaunchBar.options.alternateKey) return settings();

  const date = new Date();
  let currentDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000); // Timezone adjustments

  let startDate = new Date(currentDate);
  let endDate = new Date(currentDate);

  if (!argument) {
    startDate.setDate(
      startDate.getDate() -
        parseInt(Action.preferences.rangePast || defaultPast)
    );
    endDate.setDate(
      endDate.getDate() +
        parseInt(Action.preferences.rangeFuture || defaultFuture)
    );

    return showGames(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  }

  let number = parseInt(argument);

  // Convert weekday input into numbers
  if (isNaN(number)) {
    const weekdays = [
      'sunday'.localize(),
      'monday'.localize(),
      'tuesday'.localize(),
      'wednesday'.localize(),
      'thursday'.localize(),
      'friday'.localize(),
      'saturday'.localize(),
    ];

    const dayOfWeek = weekdays.findIndex((day) =>
      day.startsWith(argument.toLowerCase())
    );

    if (dayOfWeek === -1) return { title: 'No valid entry', icon: 'alert' };

    number = (dayOfWeek - currentDate.getDay() + 7) % 7;
  }

  const isNegative = Math.sign(number) === -1;
  const days = Math.abs(number);

  if (isNegative) {
    startDate.setDate(startDate.getDate() - days);
    endDate = startDate;
  } else {
    endDate.setDate(endDate.getDate() + days);
    startDate = endDate;
  }

  return showGames(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
}

function showGames(startDateString, endDateString) {
  if (!Action.preferences.apiKey) return setAPIKey();

  const scoreData = HTTP.getJSON(
    `https://api.balldontlie.io/v1/games?start_date=${startDateString}&end_date=${endDateString}`,
    {
      headerFields: {
        Authorization: Action.preferences.apiKey,
      },
    }
  );

  // File.writeJSON(scoreData, Action.supportPath + '/test.json');
  // return;
  // const scoreData = File.readJSON(Action.supportPath + '/test.json');

  if (scoreData.response == undefined || scoreData.error)
    return { title: scoreData.error, icon: 'alert' };

  if (scoreData.response.status != 200) {
    return {
      title: `${scoreData.response.status}: ${scoreData.response.localizedStatus}`,
      icon: 'alert',
    };
  }

  const games = scoreData.data.data;

  let scheduledGames = [];
  let otherGames = [];
  let espnSearchURL, ytSearchURL, nbaComSearchURL, title, icon, label;

  for (const game of games) {
    const gameTime = game.time;
    const gameStatus = game.status;
    const gameDate = game.date.split('T')[0];
    const vTeam = game.visitor_team.abbreviation;
    const vTeamScore = game.visitor_team_score;
    const hTeam = game.home_team.abbreviation;
    const hTeamScore = game.home_team_score;

    const espnDate = LaunchBar.formatDate(new Date(gameDate), {
      dateStyle: 'long',
      locale: 'en',
      timeStyle: 'none',
    });

    espnSearchURL = `https://duckduckgo.com/?q=!ducky+${encodeURIComponent(
      `site:espn.com ${game.visitor_team.name} vs. ${game.home_team.name} NBA Game Summary ${espnDate} ESPN`
    )}`;

    const nbaComDate = LaunchBar.formatDate(new Date(gameDate), {
      dateStyle: 'medium',
      locale: 'en',
      timeStyle: 'none',
    });

    // Test gameStatus for date
    const statusIsDate = new Date(gameStatus);

    // Time difference from now to game start
    // const difference = (new Date(gameStatus) - new Date()) / (1000 * 60 * 60);
    // if (difference > 0) {

    if (statusIsDate != 'Invalid Date') {
      // Date
      const relativeDate = LaunchBar.formatDate(new Date(gameStatus), {
        relativeDateFormatting: true,
      });

      // Title
      // title = `${vTeam} vs. ${hTeam} - ${relativeDate}`;
      title = `${vTeam} vs. ${hTeam}`;

      label = relativeDate;

      // Icon
      icon = hTeam.toLowerCase();

      nbaComSearchURL = `https://duckduckgo.com/?q=!ducky+${encodeURIComponent(
        // Example: Dallas Mavericks vs San Antonio Spurs Dec 31, 2022 Game Summary | NBA.com
        `site:nba.com ${game.visitor_team.full_name} vs ${game.home_team.full_name} ${nbaComDate} Game Summary Preview`
      )}`;
    } else {
      // Games that are currently played or have finished
      ytSearchURL = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        // Example: Game Recap: Mavericks 126, Spurs 125
        `Game Recap: ${game.visitor_team.name} ${vTeamScore}, ${game.home_team.name} ${hTeamScore}`
      )}`;

      nbaComSearchURL = `https://duckduckgo.com/?q=!ducky+${encodeURIComponent(
        `site:nba.com ${game.visitor_team.full_name} vs ${game.home_team.full_name} ${nbaComDate} Game Summary`
      )}`;

      // Title
      title = `${hTeam} ${hTeamScore} : ${vTeam} ${vTeamScore}`;

      // Icon
      icon =
        parseInt(vTeamScore) > parseInt(hTeamScore)
          ? vTeam.toLowerCase()
          : hTeam.toLowerCase();

      label = LaunchBar.formatDate(new Date(gameDate), {
        relativeDateFormatting: true,
        timeStyle: 'none',
        // timeZone: 'GMT',
      });
    }

    const pushData = {
      title,
      label,
      // alwaysShowsSubtitle: true,
      icon,
      action: 'open',
      id: game.id,
      actionArgument: {
        espnSearchURL,
        ytSearchURL,
        nbaComSearchURL,
      },
      actionRunsInBackground: true,
    };

    if (gameTime != 'Final' && gameTime != '' && gameTime != null) {
      pushData.label = gameTime;
    }

    if (statusIsDate != 'Invalid Date') {
      pushData.date = statusIsDate.getTime();
      scheduledGames.push(pushData);
    } else {
      otherGames.push(pushData);
    }
  }

  otherGames.sort((a, b) => a.id - b.id);
  scheduledGames.sort((a, b) => a.date - b.date);

  return [...otherGames, ...scheduledGames];
}

function open({ espnSearchURL, ytSearchURL, nbaComSearchURL }) {
  LaunchBar.hide();
  LaunchBar.openURL(
    LaunchBar.options.alternateKey
      ? espnSearchURL
      : LaunchBar.options.commandKey
      ? nbaComSearchURL
      : ytSearchURL
  );
}

// SETTINGS

function settings() {
  return [
    {
      title: 'Set Range Past'.localize(),
      subtitle: 'How many past days should be included by default?'.localize(),
      alwaysShowsSubtitle: true,
      badge:
        (Action.preferences.rangePast || defaultPast) + ' day(s)'.localize(),
      icon: 'pastTemplate',
      children: showRangePast(),
    },
    {
      title: 'Set Range Future'.localize(),
      subtitle:
        'How many future days should be included by default?'.localize(),
      alwaysShowsSubtitle: true,
      badge:
        (Action.preferences.rangeFuture || defaultFuture) +
        ' day(s)'.localize(),
      icon: 'futureTemplate',
      children: showRangeFuture(),
    },

    {
      title: 'Set API Key'.localize(),
      icon: 'keyTemplate',
      action: 'setAPIKey',
    },
  ];
}

function showRangePast() {
  const rangePast = Action.preferences.rangePast || defaultPast;

  return Array.from({ length: 5 }, (_, index) => ({
    title: 'Show games from the past '.localize() + index + ' days.'.localize(),
    icon: rangePast === index.toString() ? 'checkTemplate' : 'circleTemplate',
    action: 'setRangePast',
    actionArgument: index.toString(),
  }));
}

function setRangePast(rangePast) {
  Action.preferences.rangePast = rangePast;
  return settings();
}

function showRangeFuture() {
  const rangeFuture = Action.preferences.rangeFuture || defaultFuture;

  return Array.from({ length: 5 }, (_, index) => ({
    title: 'Show games from the past '.localize() + index + ' days.'.localize(),
    icon: rangeFuture === index.toString() ? 'checkTemplate' : 'circleTemplate',
    action: 'setRangeFuture',
    actionArgument: index.toString(),
  }));
}

function setRangeFuture(rangeFuture) {
  Action.preferences.rangeFuture = rangeFuture;
  return settings();
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
      const clipboard = LaunchBar.getClipboardString().trim();

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
