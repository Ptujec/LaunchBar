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
        var result = HTTP.postJSON("https://raindrop.io/oauth/access_token", {
          body: {
            grant_type: "refresh_token",
            refresh_token: Action.preferences.refresh_token,
            client_id: "6116c7c7c1005a0f29f1d303",
            client_secret: "85bf8ca2-1e85-491b-82ca-a344c65cd3eb",
          },
        });

        if (result.data !== undefined && typeof result.data === "string") {
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
    if (File.exists("/Applications/Raindrop.io.app")) {
      LaunchBar.openURL(File.fileURLForPath("/Applications/Raindrop.io.app"));
    } else {
      LaunchBar.openURL("https://app.raindrop.io");
    }
  } else {
    var apiKey = getApiKey();

    if (apiKey === undefined) {
      setAPIkey();
    } else {
      if (argument != undefined) {
        // Search
        argument = argument.replace(/,/g, "");
        if (LaunchBar.options.shiftKey) {
          var rData = HTTP.getJSON(
            encodeURI(
              'https://api.raindrop.io/rest/v1/raindrops/0?search=[{"key":"tag","val":"' +
                argument +
                '"}]&access_token=' +
                apiKey
            )
          );
        } else {
          var rData = HTTP.getJSON(
            encodeURI(
              'https://api.raindrop.io/rest/v1/raindrops/0?search=[{"key":"word","val":"' +
                argument +
                '"}]&access_token=' +
                apiKey
            )
          );
        }
      } else {
        // List 25 most recent items
        var rData = HTTP.getJSON(
          "https://api.raindrop.io/rest/v1/raindrops/0?access_token=" + apiKey
        );
      }

      if (rData.data != undefined && rData.data.items != undefined) {
        var results = [];
        for (var i = 0; i < rData.data.items.length; i++) {
          var title = rData.data.items[i].title;
          var link = rData.data.items[i].link;
          var tags = rData.data.items[i].tags
            .toString()
            .replace(/(.),(.)/g, "$1, $2");

          results.push({
            title: title,
            subtitle: link,
            label: tags,
            icon: "drop",
            url: link,
          });
        }

        if (results == "") {
          LaunchBar.alert('No raindrop found for "' + argument + '"');
        } else {
          if (argument != undefined) {
            results.sort(function (a, b) {
              return a.title > b.title;
            });
          }
          return results;
        }
      } else if (
        rData.data != undefined &&
        rData.data.errorMessage != undefined
      ) {
        var e = rData.data.errorMessage;
        if (e == "Incorrect access_token") {
          setAPIkey();
        } else {
          LaunchBar.alert(e);
        }
      } else if (rData.data == undefined) {
        // Check internet connection
        var output = LaunchBar.execute("/sbin/ping", "-o", "www.raindrop.io");
        if (output == "") {
          LaunchBar.alert("You seem to have no internet connection!");
          return;
        } else {
          setAPIkey();
        }
      }
    }
  }
}

function setAPIkey() {
  var response = LaunchBar.alert(
    "Authentication Required",
    "You will be redirected to Raindrop.io to connect your account.",
    "Open Raindrop.io",
    "Cancel"
  );
  switch (response) {
    case 0:
      LaunchBar.openURL(
        "https://raindrop.io/oauth/authorize?redirect_uri=https://launchbar.link/action/ptujec.LaunchBar.action.Raindrops/redirect&client_id=6116c7c7c1005a0f29f1d303"
      );
      LaunchBar.hide();
      break;
    case 2:
      break;
  }
}
