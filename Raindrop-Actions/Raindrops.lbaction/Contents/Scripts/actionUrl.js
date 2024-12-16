/* 
Raindrops - Raindrop.io Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

OAuth implementation by Manfred Linzner (@mlinzner)

Note: I used Cursor to refactor the code.
*/

include('global.js');

function runWithURL(URL, details) {
  if (details.path === '/ptujec.LaunchBar.action.Raindrops/redirect') {
    if (details.queryParameters.code) {
      const result = HTTP.postJSON(RAINDROP_CONFIG.TOKEN_URL, {
        body: {
          grant_type: 'authorization_code',
          code: details.queryParameters.code,
          client_id: RAINDROP_CONFIG.CLIENT_ID,
          client_secret: RAINDROP_CONFIG.CLIENT_SECRET,
          redirect_uri: RAINDROP_CONFIG.REDIRECT_URI,
        },
      });

      if (result.data) {
        const resultData =
          typeof result.data === 'string'
            ? JSON.parse(result.data)
            : result.data;

        // Reuse the token storage function from global.js
        updateStoredToken(resultData);

        // Store refresh token (specific to initial auth)
        Action.preferences.refresh_token = resultData.refresh_token;

        LaunchBar.alert('Successfully Authenticated');
      }
    }
  }
}
