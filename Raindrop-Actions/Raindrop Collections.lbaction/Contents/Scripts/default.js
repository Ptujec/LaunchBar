/*
Raindrop Collections - Raindrop.io Action for LaunchBar
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

function run(argument) {
  // Get or set API-Token
  var apiKey = getApiKey();
  if (apiKey === undefined) {
    setAPIkey();
  } else {
    // Get ID for selected collection (argument)
    try {
      var cData = File.readJSON('~/Library/Caches/at.obdev.LaunchBar/Actions/ptujec.LaunchBar.action.RaindropCollections/collections.json');
    } catch (exception) {
      LaunchBar.alert('Error while reading JSON: ' + exception);
    }

    for (var iC = 0; iC < cData.items.length; iC++) {
      if (cData.items[iC].title == argument) {
        var cId = cData.items[iC]._id
      }
    }

    // Get raindrop data of the selected collection
    var rData = HTTP.getJSON(
      "https://api.raindrop.io/rest/v1/raindrops/" + cId + "?access_token=" + apiKey
    );

    if (rData.data != undefined && rData.data.items != undefined) {
      var results = [];
      for (var i = 0; i < rData.data.items.length; i++) {
        var collId = rData.data.items[i].collection.$id
        var title = rData.data.items[i].title;
        var link = rData.data.items[i].link;
        var label = link
        if (label.length > 30) {
          label = label.toString().replace(/^(.*\/\/[^\/?#]*).*$/, "$1");
        }

        var tags = []
        for (var iT = 0; iT < rData.data.items[i].tags.length; iT++) {
          var tag = '#' + rData.data.items[i].tags[iT] + ' '
          tags.push(tag)
        }
        tags = tags
          .toString()
          .replace(/,/g, '')

        results.push({
          title: title,
          subtitle: tags,
          label: label,
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
