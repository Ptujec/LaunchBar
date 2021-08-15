// LaunchBar Action Script

function runWithURL(URL, details) {
  if (details.path === "/ptujec.LaunchBar.action.RaindropCollections/redirect") {
    if (details.queryParameters.code !== undefined) {
      var result = HTTP.postJSON("https://raindrop.io/oauth/access_token", {
        body: {
          grant_type: "authorization_code",
          code: details.queryParameters.code,
          client_id: "61192949c84b9e800141364c",
          client_secret: "29474c6d-7164-4b8d-90bb-12b11f6d40c5",
          redirect_uri:
            "https://launchbar.link/action/ptujec.LaunchBar.action.RaindropCollections/redirect",
        },
      });

      if (result.data !== undefined && typeof result.data === "string") {
        const resultData = JSON.parse(result.data);
        const now = new Date();
        Action.preferences.access_token_expiry_date =
          now.getTime() + resultData.expires_in * 1000;
        Action.preferences.apiKey = resultData.access_token;
        Action.preferences.refresh_token = resultData.refresh_token;

        LaunchBar.alert("Successfully Authenticated");
      }
    }
  }
}
