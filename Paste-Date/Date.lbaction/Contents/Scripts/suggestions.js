/*
Date Action for LaunchBar
by Christian Bender (@ptujec)
2026-01-30

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

include('global.js');

function runWithString(string) {
  string = string.toLowerCase();

  // Handle pure number input directly (offset numbers)
  if (!isNaN(parseInt(string))) {
    const date = new Date();
    const dateString = processArgument(string, date);
    const subtitle = format(dateString, 'full');
    return {
      title: string,
      subtitle,
      alwaysShowsSubtitle: true,
      icon: 'Template',
    };
  }

  if (!string) return getCachedSuggestions();

  // For searches: filter first, then process only matched suggestions
  const matched = getMatchedSuggestions(string);
  if (matched.length === 0)
    return { title: 'No valid entry'.localize(), icon: 'alert' };

  return matched;
}

// Process matched suggestion strings into formatted results
function getMatchedSuggestions(searchString) {
  // Use the single source of truth from global.js for matching
  const matched = getMatchedSuggestionStrings(searchString);

  if (matched.length === 0) return [];

  // Now compute dates and formats only for matched suggestions
  const icon = 'Template';
  const date = new Date();

  return matched.map((suggestion) => {
    const dateString = processArgument(suggestion, date);
    const isWeekday = localizedWeekdays.includes(suggestion);
    const isLastWeekday = suggestion.toLowerCase().startsWith('last');
    const subtitle =
      isWeekday || isLastWeekday
        ? format(dateString, 'long')
        : format(dateString, 'full');

    return {
      title: suggestion,
      subtitle,
      alwaysShowsSubtitle: true,
      icon,
    };
  });
}

function getCachedSuggestions() {
  const today = new Date().toDateString();
  const cachedDate = Action.preferences.suggestionCacheDate;

  // Invalidate cache if date has changed
  if (cachedDate !== today) {
    Action.preferences.suggestionObjects = undefined;
    Action.preferences.suggestionCacheDate = undefined;
  }

  const cached = Action.preferences.suggestionObjects;
  if (cached) return cached;

  // Cache the full processed suggestions list
  const suggestionObjects = getMatchedSuggestions('');
  Action.preferences.suggestionObjects = suggestionObjects;
  Action.preferences.suggestionCacheDate = today;
  return suggestionObjects;
}
