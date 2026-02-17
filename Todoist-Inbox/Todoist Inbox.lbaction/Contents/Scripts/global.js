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
const stopwordsPath = `${actionPath}/Contents/Resources/stopwords.json`;
const stopwordsJSON = File.readJSON(stopwordsPath);
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

function buildWordsList(string) {
  return string
    .replace(/\[(.+)\]\(.+\)/, '$1') // replace markdown links
    .replace(/https?\S+/, '') // replace links
    .replace(/,|\||\(|\)|\[|\]|\\|\/|:|,|\.|\?|\d+/g, '') // replace numbers and other stuff
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      '',
    ) // replace emojis
    .toLowerCase()
    .split(' ')
    .filter((word) => !stopwords.has(word));
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

// Helper function to check if an item was used within 30 days
function isRecentlyUsed(lastUsedDate) {
  if (!lastUsedDate) return false;
  const lastDate = new Date(lastUsedDate);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return lastDate >= thirtyDaysAgo;
}

// Helper function to check if text contains a whole word match
function isWholeWordMatch(text, word) {
  const words = text.toLowerCase().split(/\s+/);
  return words.includes(word);
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

// MARK: Clean Up Stopwords and Used Words Lists

function cleanStopwordsUsedWordsList() {
  LaunchBar.hide();

  const logPath = '/tmp/filter_log.log';
  const logs = [];

  const addLog = (message) => {
    logs.push(message);
    LaunchBar.log(message);
  };

  const stopwords = File.readJSON(stopwordsPath);

  // Step 1: Deduplicate stopwords
  let totalDuplicatesRemoved = 0;

  for (const key in stopwords) {
    if (Array.isArray(stopwords[key])) {
      const originalLength = stopwords[key].length;
      stopwords[key] = [...new Set(stopwords[key])];
      const duplicates = originalLength - stopwords[key].length;
      if (duplicates > 0) {
        addLog(`${key}: Removed ${duplicates} duplicates`);
        totalDuplicatesRemoved += duplicates;
      }
    }
  }

  File.writeJSON(stopwords, stopwordsPath);
  addLog(`Total duplicates removed: ${totalDuplicatesRemoved}\n`);

  // Step 2: Create a set of all stopwords (lowercase for comparison)
  const allStopwords = new Set();
  for (const category in stopwords) {
    if (Array.isArray(stopwords[category])) {
      stopwords[category].forEach((word) => {
        allStopwords.add(word.toLowerCase());
      });
    }
  }

  addLog(`Total unique stopwords: ${allStopwords.size}\n`);

  // Step 3: Filter usageData
  const usageData = File.readJSON(usageDataPath);

  const categories = ['labels', 'projects', 'sections'];
  const stats = {};
  const removedWords = {};

  categories.forEach((category) => {
    stats[category] = { itemsProcessed: 0, wordsRemoved: 0, wordsKept: 0 };
    removedWords[category] = {};

    if (usageData[category]) {
      for (const id in usageData[category]) {
        if (usageData[category][id].usedWords) {
          stats[category].itemsProcessed++;
          const filtered = {};
          for (const word in usageData[category][id].usedWords) {
            if (!allStopwords.has(word.toLowerCase())) {
              filtered[word] = usageData[category][id].usedWords[word];
              stats[category].wordsKept++;
            } else {
              stats[category].wordsRemoved++;
              removedWords[category][word] =
                (removedWords[category][word] || 0) +
                usageData[category][id].usedWords[word];
            }
          }
          usageData[category][id].usedWords = filtered;
        }
      }
    }
  });

  File.writeJSON(usageData, usageDataPath);

  // Log results
  addLog('Filtering Results:');
  for (const category in stats) {
    const s = stats[category];
    addLog(
      `${category}: ${s.itemsProcessed} items, ${s.wordsRemoved} words removed, ${s.wordsKept} words kept`,
    );
  }

  // Log removed words by category
  addLog('\n--- Removed Words ---');
  for (const category in removedWords) {
    const words = Object.keys(removedWords[category]).sort(
      (a, b) => removedWords[category][b] - removedWords[category][a],
    );
    if (words.length > 0) {
      addLog(`\n${category} (${words.length} unique stopwords removed):`);
      words.forEach((word) => {
        addLog(`  ${word}: ${removedWords[category][word]}`);
      });
    }
  }

  // Write logs to file
  File.writeText(logs.join('\n'), logPath);

  LaunchBar.openURL(File.fileURLForPath(logPath));
}
