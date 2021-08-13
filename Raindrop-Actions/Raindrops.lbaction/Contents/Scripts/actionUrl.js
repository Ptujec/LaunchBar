// LaunchBar Action Script

function runWithURL(URL, details) {
  if (details.path === "/ptujec.LaunchBar.action.Raindrops/redirect") {
    if (details.queryParameters.code !== undefined) {
      var result = HTTP.postJSON("https://raindrop.io/oauth/access_token", {
        body: {
          grant_type: "authorization_code",
          code: details.queryParameters.code,
          client_id: "61124ebbf7497de7c96ca18a",
          client_secret: "7b1047d2-51db-4168-a712-7eb8802b54b8",
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
