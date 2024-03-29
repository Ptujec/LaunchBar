/*
Raindrops - Raindrop.io Action for LaunchBar
Main Action

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io
*/

const getApiKey = () => {
  if (Action.preferences.access_token_expiry_date !== undefined) {
    const expiryDate = new Date(Action.preferences.access_token_expiry_date);
    const now = new Date();

    if (expiryDate <= now) {
      if (Action.preferences.refresh_token === undefined) {
        setAPIkey();
      } else {
        var result = HTTP.postJSON('https://raindrop.io/oauth/access_token', {
          body: {
            grant_type: 'refresh_token',
            refresh_token: Action.preferences.refresh_token,
            client_id: '6116c7c7c1005a0f29f1d303',
            client_secret: '85bf8ca2-1e85-491b-82ca-a344c65cd3eb',
          },
        });

        if (result.data !== undefined && typeof result.data === 'string') {
          const resultData = JSON.parse(result.data);
          const now = new Date();
          Action.preferences.access_token_expiry_date =
            now.getTime() + resultData.expires_in * 1000;
          Action.preferences.apiKey = resultData.access_token;
        }
      }
    }
  }
  return Action.preferences.apiKey;
};

function run(argument) {
  if (LaunchBar.options.commandKey) {
    if (File.exists('/Applications/Raindrop.io.app')) {
      LaunchBar.openURL(File.fileURLForPath('/Applications/Raindrop.io.app'));
    } else {
      LaunchBar.openURL('https://app.raindrop.io');
    }
  } else {
    var apiKey = getApiKey();
    if (apiKey === undefined) {
      setAPIkey();
    } else {
      if (argument != undefined) {
        // Search
        if (LaunchBar.options.controlKey) {
          // Force search all text (takes longer … more possible results)
          var rData = HTTP.getJSON(
            'https://api.raindrop.io/rest/v1/raindrops/0?search=' +
              encodeURI(argument) +
              '&access_token=' +
              apiKey
          );
        } else if (LaunchBar.options.shiftKey) {
          // Force search all text (takes longer … more possible results)
          var rData = HTTP.getJSON(
            'https://api.raindrop.io/rest/v1/raindrops/0?search=link:' +
              encodeURI(argument) +
              '&access_token=' +
              apiKey
          );
        } else {
          if (argument.includes(':')) {
            // Search all if argument includes operator (since they all include a colon we check for that)
            var rData = HTTP.getJSON(
              'https://api.raindrop.io/rest/v1/raindrops/0?search=' +
                encodeURI(argument) +
                '&access_token=' +
                apiKey
            );
          } else {
            // Search by tag (fast)
            var rData = HTTP.getJSON(
              encodeURI(
                'https://api.raindrop.io/rest/v1/raindrops/0?search=[{"key":"tag","val":"' +
                  argument +
                  '"}]&access_token=' +
                  apiKey
              )
            );

            if (rData.data != undefined && rData.data.items.length == 0) {
              // Search all text if query does not match a tag (takes longer)
              rData = HTTP.getJSON(
                'https://api.raindrop.io/rest/v1/raindrops/0?search=' +
                  encodeURI(argument) +
                  '&access_token=' +
                  apiKey
              );
            }
          }
        }
      } else {
        // List 25 most recent items
        var rData = HTTP.getJSON(
          'https://api.raindrop.io/rest/v1/raindrops/0?access_token=' + apiKey
        );
      }

      if (rData.error == undefined) {
        if (rData.data.items != undefined) {
          var results = [];
          for (var i = 0; i < rData.data.items.length; i++) {
            // var collId = rData.data.items[i].collection.$id
            var title = rData.data.items[i].title;
            var link = rData.data.items[i].link;
            var label = link;
            if (label.length > 30) {
              // label = label.toString().replace(/^(.*\/\/[^\/?#]*).*$/, "$1");
              label = label
                .toString()
                .replace(/^(https?:\/\/[^\/?#]*).*$/, '$1');
            }

            var tags = [];
            for (var iT = 0; iT < rData.data.items[i].tags.length; iT++) {
              var tag = '#' + rData.data.items[i].tags[iT] + ' ';
              tags.push(tag);
            }
            tags = tags.join('');

            results.push({
              title: title,
              subtitle: tags,
              label: label,
              icon: 'drop',
              url: link,
            });
          }

          if (results == '') {
            LaunchBar.alert('No raindrop found for "' + argument + '"');
          } else {
            if (argument != undefined) {
              results.sort(function (a, b) {
                return a.title > b.title;
              });
            }
            return results;
          }
        } else if (rData.data.errorMessage != undefined) {
          var e = rData.data.errorMessage;
          if (e == 'Incorrect access_token') {
            setAPIkey();
          } else {
            LaunchBar.alert(e);
          }
        }
      } else {
        LaunchBar.alert(rData.error);
      }
    }
  }
}

function setAPIkey() {
  var response = LaunchBar.alert(
    'Authentication Required',
    'You will be redirected to Raindrop.io to connect your account.',
    'Open Raindrop.io',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL(
        'https://raindrop.io/oauth/authorize?redirect_uri=https://launchbar.link/action/ptujec.LaunchBar.action.Raindrops/redirect&client_id=6116c7c7c1005a0f29f1d303'
      );
      LaunchBar.hide();
      break;
    case 1:
      break;
  }
}
