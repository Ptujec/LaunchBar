/*
Date Action for LaunchBar
by Christian Bender (@ptujec)
2026-01-30

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

// CONSTANTS

const currentActionVersion = Action.version;
const lastUsedActionVersion = Action.preferences.lastUsedActionVersion ?? '1.3';

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getLocalizedStrings() {
  const currentLocale = LaunchBar.currentLocale;
  const cachedLocale = Action.preferences.localizedStringsLocale;

  if (
    cachedLocale !== currentLocale ||
    isNewerVersion(lastUsedActionVersion, currentActionVersion)
  ) {
    // Regenerate all localized strings
    const cached = {
      localizedWeekdays: weekdays.map((day) => day.localize()),
      localizedMonths: months.map((month) => month.localize()),
      localizedOrdinals: [
        'First'.localize(),
        'Second'.localize(),
        'Third'.localize(),
        'Fourth'.localize(),
        'Last'.localize(),
      ],
      ordinalMap: {
        ['First'.localize().toLowerCase()]: 1,
        ['Second'.localize().toLowerCase()]: 2,
        ['Third'.localize().toLowerCase()]: 3,
        ['Fourth'.localize().toLowerCase()]: 4,
        ['Last'.localize().toLowerCase()]: 'last',
      },
      relativeDaySuggestions: ['Yesterday'.localize(), 'Tomorrow'.localize()],
      monthBoundarySuggestions: [
        'First day of last month'.localize(),
        'Last day of last month'.localize(),
        'First day of this month'.localize(),
        'Last day of this month'.localize(),
        'First day of next month'.localize(),
        'Last day of next month'.localize(),
      ],
    };

    cached.localizedOrdinalKeys = cached.localizedOrdinals.map((ord) =>
      ord.toLowerCase(),
    );

    // Store in preferences
    Action.preferences.localizedStrings = JSON.stringify(cached);
    Action.preferences.localizedStringsLocale = currentLocale;
    Action.preferences.lastUsedActionVersion = Action.version;

    return cached;
  }

  const cached = Action.preferences.localizedStrings;
  if (cached) return JSON.parse(cached);

  return getLocalizedStrings();
}

const {
  localizedWeekdays,
  localizedMonths,
  localizedOrdinals,
  localizedOrdinalKeys,
  ordinalMap,
  relativeDaySuggestions,
  monthBoundarySuggestions,
} = getLocalizedStrings();

// UTILITY FUNCTIONS

function findFirstMatch(input, candidates) {
  input = input.toLowerCase();
  const searchParts = input.split(' ');

  return candidates.find((candidate) => {
    const candidateParts = candidate.toLowerCase().split(' ');
    let currentIndex = 0;

    return searchParts.every((searchPart) => {
      while (currentIndex < candidateParts.length) {
        if (candidateParts[currentIndex].startsWith(searchPart)) {
          currentIndex++;
          return true;
        }
        currentIndex++;
      }
      return false;
    });
  });
}

// DATE MANIPULATION FUNCTIONS

function getNextWeekday(date, weekdayIndex) {
  const nextWeekdayDate = new Date(date.getTime());
  const daysToAdd = (weekdayIndex - date.getDay() + 7) % 7;
  // Always add at least 7 days if it's the same weekday
  nextWeekdayDate.setDate(date.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
  return nextWeekdayDate;
}

// This function returns the most recent past occurrence of a given weekday
function getLastWeekday(date, weekdayIndex) {
  const lastWeekdayDate = new Date(date.getTime());
  const daysToSubtract = (date.getDay() - weekdayIndex + 7) % 7;
  // Always subtract at least 7 days if it's the same weekday
  lastWeekdayDate.setDate(
    date.getDate() - (daysToSubtract === 0 ? 7 : daysToSubtract),
  );
  return lastWeekdayDate;
}

// This function calculates the next occurrence of a given weekday from a specified date.
function getNthWeekdayOfMonth(date, number, weekdayIndex) {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (number === 'last') {
    const lastDay = new Date(year, month + 1, 0);
    const lastDayOfWeek = lastDay.getDay();
    const daysToSubtract = (lastDayOfWeek - weekdayIndex + 7) % 7;
    lastDay.setDate(lastDay.getDate() - daysToSubtract);
    return lastDay;
  }

  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const daysToAdd =
    ((weekdayIndex - firstDayOfWeek + 7) % 7) + (number - 1) * 7;
  const result = new Date(year, month, 1 + daysToAdd);

  return result.getMonth() === month ? result : undefined;
}

// Get the nth weekday of a specific month (future occurrence)
function getNthWeekdayOfSpecificMonth(date, monthIndex, number, weekdayIndex) {
  let targetDate = new Date(date.getFullYear(), monthIndex, 1);

  // If the target month is in the past this year, use next year
  if (targetDate < date) {
    targetDate = new Date(date.getFullYear() + 1, monthIndex, 1);
  }

  return getNthWeekdayOfMonth(targetDate, number, weekdayIndex);
}

// Get first or last day of a specific month (future occurrence)
function getMonthBoundaryOfSpecificMonth(date, monthIndex, isLastDay) {
  let targetDate = new Date(date.getFullYear(), monthIndex, 1);

  // If the target month is in the past this year, use next year
  if (targetDate < date) {
    targetDate = new Date(date.getFullYear() + 1, monthIndex, 1);
  }

  if (isLastDay) {
    return new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  } else {
    return new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  }
}

// Date formatting functions
function formatISODate(date, includeTZ = false) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() - tzOffset);
  return includeTZ
    ? adjustedDate.toISOString()
    : adjustedDate.toISOString().split('T')[0];
}

function formatISODateTime(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() - tzOffset);
  return adjustedDate.toISOString().replace('T', ' ').substring(0, 19);
}

function formatUSShort(date) {
  const year = date.toLocaleString('default', { year: 'numeric' });
  const month = date.toLocaleString('default', { month: '2-digit' });
  const day = date.toLocaleString('default', { day: '2-digit' });
  return `${month}/${day}/${year}`;
}

function formatUnixTimestamp(date) {
  return Math.floor(date / 1000).toString();
}

function format(dateString, dateStyle) {
  const date = new Date(dateString);

  switch (dateStyle) {
    case 'iso':
      return formatISODate(date, false);
    case 'iso_full':
      return formatISODate(date, true);
    case 'iso_datetime':
      return formatISODateTime(date);
    case 'us_short':
      return formatUSShort(date);
    case 'unix_timestamp':
      return formatUnixTimestamp(date);
    default:
      return LaunchBar.formatDate(date, {
        timeStyle: 'none',
        dateStyle,
      });
  }
}

// ARGUMENT PROCESSING

function processArgument(argument, date) {
  argument = argument.toLowerCase();
  const month = date.getMonth();
  const year = date.getFullYear();

  // Handle "last [weekday]" patterns
  const lastWordLower = 'Last'.localize().toLowerCase();
  const firstArgWord = argument.split(' ')[0];
  const startsWithLastPrefix = lastWordLower.startsWith(firstArgWord);

  if (startsWithLastPrefix) {
    const lastWeekdaySuggestions = generateLastWeekdaySuggestions().map((s) =>
      s.toLowerCase(),
    );
    const lastWeekdayMatch = findFirstMatch(argument, lastWeekdaySuggestions);
    if (lastWeekdayMatch) {
      const parts = lastWeekdayMatch.split(' ');
      const weekday = parts[parts.length - 1]; // Last part is the weekday
      const dayIndex = weekdays.findIndex(
        (day) => day.localize().toLowerCase() === weekday,
      );
      if (dayIndex !== -1) {
        return getLastWeekday(date, dayIndex);
      }
    }
  }

  // Handle weekdays (next occurrence)
  const weekdayIndex = weekdays.findIndex((day) =>
    day.localize().toLowerCase().startsWith(argument),
  );

  if (weekdayIndex !== -1) {
    return getNextWeekday(date, weekdayIndex);
  }

  // First and last days of month (relative)
  const monthMatch = findFirstMatch(
    argument,
    monthBoundarySuggestions.map((s) => s.toLowerCase()),
  );
  if (monthMatch) {
    switch (monthMatch) {
      case 'First day of last month'.localize().toLowerCase():
        return new Date(year, month - 1, 1);
      case 'Last day of last month'.localize().toLowerCase():
        return new Date(year, month, 0);
      case 'First day of this month'.localize().toLowerCase():
        return new Date(year, month, 1);
      case 'Last day of this month'.localize().toLowerCase():
        return new Date(year, month + 1, 0);
      case 'First day of next month'.localize().toLowerCase():
        return new Date(year, month + 1, 1);
      case 'Last day of next month'.localize().toLowerCase():
        return new Date(year, month + 2, 0);
    }
  }

  // First and last days of specific months (e.g., "First day of September")
  const allMonthBoundarySuggestions = generateMonthBoundarySuggestions().map(
    (s) => s.toLowerCase(),
  );
  const specificMonthMatch = findFirstMatch(
    argument,
    allMonthBoundarySuggestions,
  );
  if (specificMonthMatch) {
    const parts = specificMonthMatch.split(' ');
    const ordinal = parts[0]; // "First" or "Last"
    const isLastDay = ordinal === 'Last'.localize().toLowerCase();
    const monthName = parts[parts.length - 1]; // Last part is the month

    const monthIndex = months.findIndex(
      (m) => m.localize().toLowerCase() === monthName,
    );

    if (monthIndex !== -1) {
      return getMonthBoundaryOfSpecificMonth(date, monthIndex, isLastDay);
    }
  }

  // Relative days
  if (findFirstMatch(argument, ['Tomorrow'.localize()])) {
    return new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }
  if (findFirstMatch(argument, ['Yesterday'.localize()])) {
    return new Date(date.getTime() - 24 * 60 * 60 * 1000);
  }

  // Offset numbers
  if (!isNaN(parseInt(argument))) {
    date.setDate(date.getDate() + parseInt(argument));
    return new Date(date);
  }

  // nTh weekday matching (with specific month support)
  const allNthSuggestions = [
    ...generateNthWeekdaySuggestions(),
    ...generateMonthWeekdaySuggestions(),
  ];
  const match = findFirstMatch(
    argument,
    allNthSuggestions.map((s) => s.toLowerCase()),
  );

  if (match) {
    const matchLower = match.toLowerCase();
    const parts = matchLower.split(' ');

    // Check if it's a month-based query (e.g., "third sunday september")
    const monthMatch = months.find(
      (m) =>
        m.localize().toLowerCase() === parts[parts.length - 1].toLowerCase(),
    );

    if (monthMatch) {
      const monthIndex = months.indexOf(monthMatch);
      const ordinal = parts[0];
      const weekday = parts[1];
      const dayIndex = weekdays.findIndex(
        (day) => day.localize().toLowerCase() === weekday,
      );

      if (dayIndex !== -1 && ordinalMap[ordinal]) {
        return getNthWeekdayOfSpecificMonth(
          date,
          monthIndex,
          ordinalMap[ordinal],
          dayIndex,
        );
      }
    } else {
      // Standard nTh weekday matching (this month/next month)
      const [ordinal, weekday, ...rest] = parts;
      const isNextMonth = matchLower.includes(
        'of next month'.localize().toLowerCase(),
      );
      const dayIndex = weekdays.findIndex(
        (day) => day.localize().toLowerCase() === weekday,
      );

      if (dayIndex !== -1) {
        const targetDate = new Date(date);
        if (isNextMonth) targetDate.setMonth(targetDate.getMonth() + 1, 1);
        return getNthWeekdayOfMonth(targetDate, ordinalMap[ordinal], dayIndex);
      }
    }
  }

  return;
}

// SUGGESTION FUNCTIONS

function getWeekdaySuggestions() {
  const today = new Date();
  return weekdays
    .map((day, index) => ({
      day: day.localize(),
      nextDate: getNextWeekday(today, index),
    }))
    .sort((a, b) => a.nextDate - b.nextDate)
    .map((item) => item.day);
}

function generateNthWeekdaySuggestions() {
  const ofThisMonth = 'of this month'.localize();
  const ofNextMonth = 'of next month'.localize();

  return localizedWeekdays.flatMap((weekday) =>
    localizedOrdinalKeys.flatMap((ordinal) => {
      const prefix = `${
        ordinal.charAt(0).toUpperCase() + ordinal.slice(1)
      } ${weekday}`;
      return [`${prefix} ${ofThisMonth}`, `${prefix} ${ofNextMonth}`];
    }),
  );
}

function generateMonthWeekdaySuggestions() {
  const inStr = 'in'.localize();

  return localizedMonths.flatMap((month) =>
    localizedWeekdays.flatMap((weekday) =>
      localizedOrdinalKeys.map((ordinal) => {
        const prefix = `${
          ordinal.charAt(0).toUpperCase() + ordinal.slice(1)
        } ${weekday}`;
        return `${prefix} ${inStr} ${month}`;
      }),
    ),
  );
}

function generateMonthBoundarySuggestions() {
  const firstDayOf = 'First day of'.localize();
  const lastDayOf = 'Last day of'.localize();

  return localizedMonths.flatMap((month) => [
    `${firstDayOf} ${month}`,
    `${lastDayOf} ${month}`,
  ]);
}

function generateLastWeekdaySuggestions() {
  const lastStr = 'Last'.localize();
  return localizedWeekdays.map((weekday) => `${lastStr} ${weekday}`);
}

// Get matched suggestion strings for a search input (single source of truth)
// Returns array of matching suggestion strings in order
function getMatchedSuggestionStrings(searchString) {
  searchString = searchString.toLowerCase();
  if (!searchString) return [];

  // Get all suggestion strings (cached if needed, with time-dependent ordering)
  const currentLocale = LaunchBar.currentLocale;
  const cachedLocale = Action.preferences.suggestionStringsLocale;

  // Only regenerate the static parts if locale has changed or action version has updated
  if (
    cachedLocale !== currentLocale ||
    isNewerVersion(lastUsedActionVersion, currentActionVersion)
  ) {
    const staticStrings = [
      ...relativeDaySuggestions,
      ...monthBoundarySuggestions,
      ...generateMonthBoundarySuggestions(),
      ...generateLastWeekdaySuggestions(),
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

  const allStrings = [...orderedWeekdays, ...cachedStrings];

  // Filter for matches (cheap operation, no date processing)
  return allStrings.filter((suggestion) => {
    const suggLower = suggestion.toLowerCase();
    if (!suggLower.includes(searchString.charAt(0))) return false;
    return findFirstMatch(searchString, [suggLower]) !== undefined;
  });
}

// Get the first suggestion that matches the search string
function getFirstMatchingSuggestion(searchString) {
  // Use the single source of truth from global.js for matching
  const matched = getMatchedSuggestionStrings(searchString);
  return matched.length > 0 ? matched[0] : undefined;
}

// DETECT ACTION UPDATES

function isNewerVersion(lastUsedActionVersion, currentActionVersion) {
  const lastUsedParts = lastUsedActionVersion.split('.');
  const currentParts = currentActionVersion.split('.');

  for (let i = 0; i < currentParts.length; i++) {
    const a = ~~currentParts[i];
    const b = ~~lastUsedParts[i];
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}
