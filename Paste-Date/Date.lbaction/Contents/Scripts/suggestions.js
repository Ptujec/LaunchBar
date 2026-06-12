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
  return getMatchedSuggestions(string);
}

// Generate all possible suggestion strings (cached by locale, not by date)
function getAllSuggestionStrings() {
  const currentLocale = LaunchBar.currentLocale;
  const cachedLocale = Action.preferences.suggestionStringsLocale;

  // Only regenerate the static parts if locale has changed
  if (cachedLocale !== currentLocale) {
    const staticStrings = [
      ...relativeDaySuggestions,
      ...monthBoundarySuggestions,
      ...generateMonthBoundarySuggestions(),
      ...generateNthWeekdaySuggestions(),
      ...generateMonthWeekdaySuggestions(),
    ];

    Action.preferences.suggestionStrings = JSON.stringify(staticStrings);
    Action.preferences.suggestionStringsLocale = currentLocale;
  }

  // Always reorder weekdays based on today's date (time-dependent)
  const todayIndex = new Date().getDay();
  const orderedWeekdays = [
    ...getWeekdaySuggestions().slice(todayIndex),
    ...getWeekdaySuggestions().slice(0, todayIndex),
  ];

  // Combine with cached static strings
  const cachedStrings = JSON.parse(
    Action.preferences.suggestionStrings || '[]',
  );

  return [...orderedWeekdays, ...cachedStrings];
}

// Filter suggestions by search string, then process only matched ones
function getMatchedSuggestions(searchString) {
  const allStrings = getAllSuggestionStrings();
  searchString = searchString.toLowerCase();

  // Filter first (cheap), then process only matches (expensive)
  const matched = allStrings.filter((suggestion) => {
    const suggLower = suggestion.toLowerCase();
    // Quick string check before expensive findFirstMatch
    if (!suggLower.includes(searchString.charAt(0))) return false;
    return findFirstMatch(searchString, [suggLower]) !== undefined;
  });

  // Now compute dates and formats only for matched suggestions
  const icon = 'Template';
  const date = new Date();

  return matched.map((suggestion) => {
    const dateString = processArgument(suggestion, date);
    const isWeekday = localizedWeekdays.includes(suggestion);
    const subtitle = isWeekday
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
