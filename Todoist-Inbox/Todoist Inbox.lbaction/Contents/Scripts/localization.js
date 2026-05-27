/*
Todoist Inbox Action Script for LaunchBar
by Christian Bender (@ptujec)
2026-05-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

let lang, dueStringOptions, reDuration, reBeforeReminder, stopwords;

if (locale.startsWith('de')) {
  lang = locale;
  dueStringOptions = dueStringsJSON.de;
  reDuration =
    /(?:für)?(?:\s+|^)(\d+(?:(?:\.|,)\d+)?)(\s+min(?:uten)?|m|h|\s+stunde(?:n)?)/i;

  reBeforeReminder = /(?:vorher|v)/i;

  stopwords = new Set([
    ...stopwordsJSON.de,
    ...stopwordsJSON.en,
    ...stopwordsJSON.general,
    ...stopwordsJSON.social,
  ]);
} else {
  lang = 'en';
  dueStringOptions = dueStringsJSON.en;
  reDuration =
    /(?:for)?(?:\s+|^)(\d+(?:\.\d+)?)(\s+min(?:utes)?|m|h|\s+hour(?:s)?)/i;

  reBeforeReminder = /(?:before|b)/i;

  stopwords = new Set([
    ...stopwordsJSON.en,
    ...stopwordsJSON.general,
    ...stopwordsJSON.social,
  ]);
}
