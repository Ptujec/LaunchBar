/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

// MARK: Constants

const apiToken = Action.preferences.apiToken;

const supportPath = Action.supportPath;
const actionPath = Action.path;
const locale = LaunchBar.currentLocale;

const dueStringsJSON = File.readJSON(
  `${actionPath}/Contents/Resources/dueStringOptions.json`,
);
const stopwordsJSON = File.readJSON(
  `${actionPath}/Contents/Resources/stopwords.json`,
);
const todoistDataPath = `${supportPath}/todoistData.json`;
const usageDataPath = `${supportPath}/usageData.json`;

const rePrio = /( p[1-3]( |$))|((^| )p[1-3] )/i;
const reDueStringWithAt = / @(.*?)(p\d|((^| )#($| ))|$)/i;
const reDescription = /(?:\: )(.*?)(?:\:|$)/;
const reReminder = /(?: \!)(.*?)(?:\!|$)/;
const reQuotedParts = /"(.*?)"/g;
const reDeadline = /{([^}]+)}/;

// MARK: Functions

function capitalizeFirstLetter(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

function parseDeadlineDate(string) {
  if (!string) return null;

  const pattern = new Intl.DateTimeFormat(locale)
    .formatToParts(new Date())
    .reduce(
      (format, part, index) => (
        part.type !== 'literal' && (format[part.type] = index),
        format
      ),
      {},
    );

  const dateParts = string.split(/[./-]/).filter(Boolean).map(Number);
  if (dateParts.length < 2) return null;

  const positions =
    dateParts.length === 2
      ? [pattern.month === 0 ? 0 : 1, pattern.month === 0 ? 1 : 0]
      : [pattern.month / 2, pattern.day / 2, pattern.year / 2];
  const currentYear = new Date().getFullYear();
  const [month, day, year = currentYear] = positions.map((i) => dateParts[i]);

  try {
    const fullYear = year < 100 ? year + 2000 : year;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Create the date and check if it's in the past
    const date = new Date(fullYear, month - 1, day);
    const targetYear =
      dateParts.length === 2 && date < new Date() ? currentYear + 1 : fullYear;

    return `${targetYear}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`;
  } catch {
    return null;
  }
}

// MARK: Todoist Data File Management

function getTodoistData() {
  if (!File.exists(todoistDataPath)) {
    return {
      projects: [],
      sections: [],
      labels: [],
    };
  }
  return File.readJSON(todoistDataPath);
}

function saveTodoistData(data) {
  File.writeJSON(data, todoistDataPath);
}

// MARK: Usage Data File Management

function getUsageData() {
  let usageData;
  if (!File.exists(usageDataPath)) {
    usageData = {
      projects: {},
      sections: {},
      labels: {},
    };
  } else {
    usageData = File.readJSON(usageDataPath);
  }
  return usageData;
}

function saveUsageData(data) {
  const cleanedData = cleanupUnusedIds(data);
  File.writeJSON(cleanedData, usageDataPath);
}

function cleanupUnusedIds(usageData) {
  const todoistData = getTodoistData();
  let changes = 0;

  // Create sets of valid IDs from todoist data for quick lookup
  const validIds = {
    projects: new Set(todoistData.projects.map((p) => p.id)),
    sections: new Set(todoistData.sections.map((s) => s.id)),
    labels: new Set(todoistData.labels.map((l) => l.id)),
  };

  // Clean up each category
  ['projects', 'sections', 'labels'].forEach((category) => {
    Object.keys(usageData[category] || {}).forEach((id) => {
      if (!validIds[category].has(id)) {
        delete usageData[category][id];
        changes++;
      }
    });
  });

  LaunchBar.log('Removed old ids from usage data file:', changes);

  return usageData;
}
