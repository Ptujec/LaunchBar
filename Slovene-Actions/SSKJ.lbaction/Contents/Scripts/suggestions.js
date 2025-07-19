function runWithString(argument) {
  if (!argument?.trim()) return [];

  const result = HTTP.getJSON(
    'http://www.fran.si/ajax/iskanje/autocomplete?query=' +
      encodeURIComponent(argument.trim()) +
      '&dictionaries=133',
    3
  );

  if (!result) {
    LaunchBar.log('HTTP.getJSON() returned undefined');
    return [];
  }

  if (result.error) {
    LaunchBar.log('Error in HTTP request: ' + result.error);
    return [];
  }

  try {
    return result.data.map((suggestion) => ({
      title: suggestion,
      icon: 'resultTemplate',
    }));
  } catch (exception) {
    LaunchBar.log('Exception while parsing result: ' + exception);
    return [];
  }
}
