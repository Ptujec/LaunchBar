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
*/

String.prototype.localizationTable = 'default';

const defaultRangePast = '1';
const defaultRangeFuture = '0';

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
        parseInt(Action.preferences.rangePast || defaultRangePast)
    );
    endDate.setDate(
      endDate.getDate() +
        parseInt(Action.preferences.rangeFuture || defaultRangeFuture)
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

  if (!scoreData.response && scoreData.error)
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

    // Test if gameStatus is date
    const statusIsDate = new Date(gameStatus);

    if (statusIsDate != 'Invalid Date') {
      const relativeDate = LaunchBar.formatDate(new Date(gameStatus), {
        relativeDateFormatting: true,
      });

      title = `${vTeam} vs. ${hTeam}`;
      label = relativeDate;
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

      title = `${hTeam} ${hTeamScore} : ${vTeam} ${vTeamScore}`;

      icon =
        parseInt(vTeamScore) > parseInt(hTeamScore)
          ? vTeam.toLowerCase()
          : hTeam.toLowerCase();

      label = LaunchBar.formatDate(new Date(gameDate), {
        relativeDateFormatting: true,
        timeStyle: 'none',
      });
    }

    // Fallback icon
    const resources = File.getDirectoryContents(
      `${Action.path}/Contents/Resources`
    );
    if (!resources.includes(`${icon}.png`)) icon = 'balldontlieTemplate';

    const pushData = {
      title,
      label,
      icon,
      action: 'open',
      id: game.id,
      actionArgument: { espnSearchURL, ytSearchURL, nbaComSearchURL, gameTime },
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

  const allGames = [...otherGames, ...scheduledGames];

  if (allGames.length === 0) {
    const fallBackURL = `https://www.espn.com/nba/schedule/_/date/${startDateString.replace(
      /-/g,
      ''
    )}`;

    return {
      title: 'No games available'.localize(),
      icon: 'logo',
      url: fallBackURL,
    };
  }
  return allGames;
}

function open({ espnSearchURL, ytSearchURL, nbaComSearchURL, gameTime }) {
  LaunchBar.hide();

  // 'Final' = game is finished; null = game has not started; else = running
  const urlMap = {
    null: [espnSearchURL, nbaComSearchURL],
    Final: [ytSearchURL, espnSearchURL],
  };

  const [url, altURL] = urlMap[gameTime] || [nbaComSearchURL, espnSearchURL];

  LaunchBar.openURL(LaunchBar.options.commandKey ? altURL : url);
}

// SETTINGS

function settings() {
  return [
    {
      title: 'Set Range Past'.localize(),
      subtitle: 'How many past days should be included by default?'.localize(),
      alwaysShowsSubtitle: true,
      badge:
        (Action.preferences.rangePast || defaultRangePast) +
        ' day(s)'.localize(),
      icon: 'pastTemplate',
      children: showRangePast(),
    },
    {
      title: 'Set Range Future'.localize(),
      subtitle:
        'How many future days should be included by default?'.localize(),
      alwaysShowsSubtitle: true,
      badge:
        (Action.preferences.rangeFuture || defaultRangeFuture) +
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
  const rangePast = Action.preferences.rangePast || defaultRangePast;

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
  const rangeFuture = Action.preferences.rangeFuture || defaultRangeFuture;

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
    'API Key required'.localize(),
    'This actions requires an API Key from https://balldontlie.io. Press "Open Website" to get yours. Copy the API Key to your clipboard, run the action again and press "Set API Key"'.localize(),
    'Open Website'.localize(),
    'Set API Key'.localize(),
    'Cancel'.localize()
  );
  switch (response) {
    case 0:
      LaunchBar.hide();
      LaunchBar.openURL('https://balldontlie.io');
      break;
    case 1:
      // Check API Key
      const clipboard = LaunchBar.getClipboardString().trim();
      Action.preferences.apiKey = clipboard;
      LaunchBar.alert('API Key: ', Action.preferences.apiKey);
      break;
    case 2:
      break;
  }
}
