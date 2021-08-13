// LaunchBar Action Script

function runWithURL(URL, details) {
  if (details.path === "/ptujec.LaunchBar.action.SaveRaindrop/redirect") {
    if (details.queryParameters.code !== undefined) {
      var result = HTTP.postJSON("https://raindrop.io/oauth/access_token", {
        body: {
          grant_type: "authorization_code",
          code: details.queryParameters.code,
          client_id: "610a5dff6eca444eb545bbab",
          client_secret: "5a9a94aa-fe4e-4103-bfbf-366b5ca932e5",
          redirect_uri:
            "https://launchbar.link/action/ptujec.LaunchBar.action.SaveRaindrop/redirect",
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
