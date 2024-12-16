/* 
Save Raindrop - Raindrop.io Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

OAuth implementation by Manfred Linzner (@mlinzner)

Note: I used Cursor to refactor the code.
*/

const RAINDROP_CONFIG = {
  CLIENT_ID: '610a5dff6eca444eb545bbab',
  CLIENT_SECRET: '5a9a94aa-fe4e-4103-bfbf-366b5ca932e5',
  AUTH_URL: 'https://raindrop.io/oauth/authorize',
  TOKEN_URL: 'https://raindrop.io/oauth/access_token',
  REDIRECT_URI:
    'https://launchbar.link/action/ptujec.LaunchBar.action.SaveRaindrop/redirect',
};

/**
 * Refreshes the access token using the refresh token
 * @returns {Object|null} The response data or null if refresh failed
 */
const refreshAccessToken = () => {
  try {
    const result = HTTP.postJSON(RAINDROP_CONFIG.TOKEN_URL, {
      body: {
        grant_type: 'refresh_token',
        refresh_token: Action.preferences.refresh_token,
        client_id: RAINDROP_CONFIG.CLIENT_ID,
        client_secret: RAINDROP_CONFIG.CLIENT_SECRET,
      },
    });

    if (!result.data) return null;

    const resultData =
      typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    return resultData;
  } catch (error) {
    LaunchBar.log(`Token refresh failed: ${error.message}`);
    return null;
  }
};

/**
 * Updates the stored access token and expiry date
 * @param {Object} tokenData The token response data
 */
const updateStoredToken = (tokenData) => {
  const now = new Date();
  Action.preferences.access_token_expiry_date =
    now.getTime() + tokenData.expires_in * 1000;
  Action.preferences.apiKey = tokenData.access_token;
};

/**
 * Initiates the OAuth flow by redirecting to Raindrop.io
 */
const initiateOAuthFlow = () => {
  const response = LaunchBar.alert(
    'Authentication Required',
    'You will be redirected to Raindrop.io to connect your account.',
    'Open Raindrop.io',
    'Cancel'
  );

  if (response === 0) {
    const authUrl = `${RAINDROP_CONFIG.AUTH_URL}?redirect_uri=${RAINDROP_CONFIG.REDIRECT_URI}&client_id=${RAINDROP_CONFIG.CLIENT_ID}`;
    LaunchBar.openURL(authUrl);
    LaunchBar.hide();
  }
};

/**
 * Gets the current API key, refreshing if necessary
 * @returns {string} The current API key
 */
const getApiKey = () => {
  if (!Action.preferences.access_token_expiry_date) {
    initiateOAuthFlow();
    return Action.preferences.apiKey;
  }

  const expiryDate = new Date(Action.preferences.access_token_expiry_date);
  const now = new Date();

  if (expiryDate <= now) {
    if (!Action.preferences.refresh_token) {
      initiateOAuthFlow();
    } else {
      const tokenData = refreshAccessToken();
      if (tokenData) {
        updateStoredToken(tokenData);
      }
    }
  }

  return Action.preferences.apiKey;
};
