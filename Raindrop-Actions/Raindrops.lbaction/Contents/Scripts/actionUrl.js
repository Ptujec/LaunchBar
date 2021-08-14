// LaunchBar Action Script

function runWithURL(URL, details) {
  if (details.path === "/ptujec.LaunchBar.action.Raindrops/redirect") {
    if (details.queryParameters.code !== undefined) {
      var result = HTTP.postJSON("https://raindrop.io/oauth/access_token", {
        body: {
          grant_type: "authorization_code",
          code: details.queryParameters.code,
          client_id: "6116c7c7c1005a0f29f1d303",
          client_secret: "85bf8ca2-1e85-491b-82ca-a344c65cd3eb",
          redirect_uri:
            "https://launchbar.link/action/ptujec.LaunchBar.action.Raindrops/redirect",
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
