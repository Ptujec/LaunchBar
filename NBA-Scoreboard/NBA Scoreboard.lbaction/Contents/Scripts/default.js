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

        var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]

        var dateY = new Date();
        dateY.setDate(dateY.getDate() - 1);

        var dateStringY = new Date(dateY.getTime() - (dateY.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]

        // LaunchBar.alert(dateStringY)
        dateStringY = dateStringY.replace(/-/g, '')

    } else {
        var date = new Date();

        // Add or subtrackt days
        var offsetNumber = parseInt(argument);
        date.setDate(date.getDate() + offsetNumber);

        var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]
    }
    dateString = dateString.replace(/-/g, '')

    if (LaunchBar.options.commandKey) {
        LaunchBar.openURL('https://www.espn.com/nba/scoreboard/_/date/' + dateString)
    } else {
        if (argument == undefined) {
            var scoreData = HTTP.getJSON('http://data.nba.net/prod/v2/' + dateString + '/scoreboard.json')
            var games = scoreData.data.games
            var scoreDataY = HTTP.getJSON('http://data.nba.net/prod/v2/' + dateStringY + '/scoreboard.json')
            var gamesY = scoreDataY.data.games
            games = gamesY.concat(games)
        } else {
            var scoreData = HTTP.getJSON('http://data.nba.net/prod/v2/' + dateString + '/scoreboard.json')
            var games = scoreData.data.games
        }

        // games = games.sort(function (a, b) {
        //     return b.startTimeEastern > b.startTimeEastern;
        // });

        var results = [];
        var i = 0;
        for (i = 0; i < games.length; i++) {
            var game = games[i]
            var clock = game.clock
            var vTeam = game.vTeam.triCode
            var vTeamScore = game.vTeam.score
            var hTeam = game.hTeam.triCode
            var hTeamScore = game.hTeam.score

            // Subtitle 
            var playoffs = game.playoffs
            if (playoffs != undefined) {
                var subtitle = playoffs.seriesSummaryText
            } else {
                var subtitle = ''
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
                var title = hTeam + ' vs. ' + vTeam + ' (' + relativeDate + ' Uhr)'

                // Icon 
                var icon = hTeam.toLowerCase()

            } else {
                // Title
                var title = hTeam + ' ' + hTeamScore + ' : ' + vTeam + ' ' + vTeamScore

                // Icon
                if (parseInt(vTeamScore) > parseInt(hTeamScore)) {
                    var icon = vTeam.toLowerCase()
                } else {
                    var icon = hTeam.toLowerCase()
                }
            }

            // URL (Boxscore)
            // https://www.nba.com/game/lac-vs-dal-0042000176/box-score
            var url = 'https://www.nba.com/game/' + vTeam.toLowerCase() + '-vs-' + hTeam.toLowerCase() + '-' + game.gameId + '/box-score'

            // Badge 
            var label = ''
            if (clock != '') {
                label = clock
            }
            
            results.push({
                'title': title,
                'subtitle': subtitle,
                'icon': icon,
                'url': url,
                'label': label
            });
        }
        return results;
    }
}