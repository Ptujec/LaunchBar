/*
Raindrop Collections - Raindrop.io Action for LaunchBar
Suggestions

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
            client_id: "61192949c84b9e800141364c",
            client_secret: "29474c6d-7164-4b8d-90bb-12b11f6d40c5",
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

var rData = HTTP.getJSON(
  encodeURI(
    "https://api.raindrop.io/rest/v1/collections/?access_token=" +
    Action.preferences.apiKey
  )
);
File.writeJSON(rData.data, '~/Library/Caches/at.obdev.LaunchBar/Actions/ptujec.LaunchBar.action.RaindropCollections/collections.json');

function runWithString(string) {
  // Get or set API-Token
  var apiKey = getApiKey();
  if (apiKey === undefined) {
    setAPIkey();
  } else {

    var first = [];
    var second = [];
    for (var iData = 0; iData < rData.data.items.length; iData++) {
      var suggestion = rData.data.items[iData].title;

      if (suggestion.toLowerCase().includes(string.toLowerCase())) {
        if (suggestion.toLowerCase().startsWith(string.toLowerCase())) {

          var title = suggestion;
          var icon = "collectionTemplate";

          first.push({
            title: title,
            icon: icon,
          });
        } else {
          var title = suggestion;
          var icon = "collectionTemplate";

          second.push({
            title: title,
            icon: icon,
          });
        }
      }
    }

    first.sort(function (a, b) {
      return a.title > b.title;
    });
    second.sort(function (a, b) {
      return a.title > b.title;
    });
    var suggestions = first.concat(second);

    return suggestions;
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
        "https://raindrop.io/oauth/authorize?redirect_uri=https://launchbar.link/action/ptujec.LaunchBar.action.RaindropCollections/redirect&client_id=61192949c84b9e800141364c"
      );
      LaunchBar.hide();
      break;
    case 1:
      break;
  }
}