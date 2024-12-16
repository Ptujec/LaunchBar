/* 
Raindrops - Raindrop.io Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

OAuth implementation by Manfred Linzner (@mlinzner)

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io

Note: I used Cursor to refactor the code.
*/

include('global.js');

const API_BASE_URL = 'https://api.raindrop.io/rest/v1/raindrops/0';

function handleAppLaunch() {
  const appPath = '/Applications/Raindrop.io.app';
  if (File.exists(appPath)) {
    LaunchBar.openURL(File.fileURLForPath(appPath));
  } else {
    LaunchBar.openURL('https://app.raindrop.io');
  }
}

function buildSearchURL(query, apiKey, searchType = 'default') {
  const baseURL = `${API_BASE_URL}?access_token=${apiKey}`;

  if (!query) return baseURL;

  switch (searchType) {
    case 'fullText':
    case 'link':
      const prefix = searchType === 'link' ? 'link:' : '';
      return `${baseURL}&search=${encodeURI(prefix + query)}`;
    case 'tag':
      return encodeURI(`${baseURL}&search=[{"key":"tag","val":"${query}"}]`);
    default:
      return `${baseURL}&search=${encodeURI(query)}`;
  }
}

function formatDropResult(item) {
  const tags = item.tags.map((tag) => `#${tag} `).join('');
  const label =
    item.link.length > 30
      ? item.link.toString().replace(/^(https?:\/\/[^\/?#]*).*$/, '$1')
      : item.link;

  return {
    title: item.title,
    subtitle: tags,
    alwaysShowsSubtitle: true,
    label: label,
    icon: 'drop',
    url: item.link,
  };
}

function fetchRaindrops(url) {
  return HTTP.getJSON(url);
}

function handleSearchResults(data, query) {
  if (!data.data?.items) {
    if (data.data?.errorMessage === 'Incorrect access_token') {
      return initiateOAuthFlow();
    }
    return LaunchBar.alert(data.data?.errorMessage || data.error);
  }

  if (data.data.items.length === 0) {
    return LaunchBar.alert(`No raindrop found for "${query}"`);
  }

  const results = data.data.items.map(formatDropResult);

  if (query) results.sort((a, b) => a.title > b.title);

  return results;
}

function run(argument) {
  if (LaunchBar.options.commandKey) {
    return handleAppLaunch();
  }

  const apiKey = getApiKey();
  if (!apiKey) return initiateOAuthFlow();

  let searchURL;

  if (argument) {
    if (LaunchBar.options.controlKey) {
      searchURL = buildSearchURL(argument, apiKey, 'fullText');
    } else if (LaunchBar.options.shiftKey) {
      searchURL = buildSearchURL(argument, apiKey, 'link');
    } else if (argument.includes(':')) {
      searchURL = buildSearchURL(argument, apiKey);
    } else {
      // Try tag search first
      let response = fetchRaindrops(buildSearchURL(argument, apiKey, 'tag'));

      // If no results, fall back to full text search
      if (response.data?.items?.length === 0) {
        searchURL = buildSearchURL(argument, apiKey, 'fullText');
      } else {
        return handleSearchResults(response, argument);
      }
    }
  } else {
    searchURL = buildSearchURL(null, apiKey);
  }

  const response = fetchRaindrops(searchURL);
  return handleSearchResults(response, argument);
}
