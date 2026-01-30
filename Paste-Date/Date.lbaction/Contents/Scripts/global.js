/* 
Date Action for LaunchBar
by Christian Bender (@ptujec)
2026-01-30

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

// CONSTANTS

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ordinalMap = {
  ['First'.localize().toLowerCase()]: 1,
  ['Second'.localize().toLowerCase()]: 2,
  ['Third'.localize().toLowerCase()]: 3,
  ['Fourth'.localize().toLowerCase()]: 4,
  ['Last'.localize().toLowerCase()]: 'last',
};

const relativeDaySuggestions = ['Yesterday'.localize(), 'Tomorrow'.localize()];

const monthBoundarySuggestions = [
  'First day of last month'.localize(),
  'Last day of last month'.localize(),
  'First day of this month'.localize(),
  'Last day of this month'.localize(),
  'First day of next month'.localize(),
  'Last day of next month'.localize(),
];

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

  return result.getMonth() === month ? result : null;
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

  // Handle weekdays first
  const weekdayIndex = weekdays.findIndex((day) =>
    day.localize().toLowerCase().startsWith(argument),
  );

  if (weekdayIndex !== -1) {
    return getNextWeekday(date, weekdayIndex);
  }

  // First and last days of month
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

  // nTh weekday matching
  const match = findFirstMatch(
    argument,
    generateNthWeekdaySuggestions().map((s) => s.toLowerCase()),
  );

  if (match) {
    const [ordinal, weekday, ...rest] = match.split(' ');
    const isNextMonth = match.includes(
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

  return null;
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
  return weekdays
    .map((day) => day.localize())
    .flatMap((weekday) =>
      Object.keys(ordinalMap).flatMap((ordinal) => {
        const prefix = `${
          ordinal.charAt(0).toUpperCase() + ordinal.slice(1)
        } ${weekday}`;
        return [
          `${prefix} ${'of this month'.localize()}`,
          `${prefix} ${'of next month'.localize()}`,
        ];
      }),
    );
}
