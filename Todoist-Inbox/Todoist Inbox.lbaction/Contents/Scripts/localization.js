/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

let lang, dueStringOptions, reDuration, stopwords;

if (LaunchBar.currentLocale == 'de') {
  lang = 'de';
  dueStringOptions = dueStringsJSON.de;
  reDuration =
    /(?:für)?(?:\s+|^)(\d+(?:(?:\.|,)\d+)?)(\s+min(?:uten)?|m|h|\s+stunde(?:n)?)/i;

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

  stopwords = new Set([
    ...stopwordsJSON.en,
    ...stopwordsJSON.general,
    ...stopwordsJSON.social,
  ]);
}
