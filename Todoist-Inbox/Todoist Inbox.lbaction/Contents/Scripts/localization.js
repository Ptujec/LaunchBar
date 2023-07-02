/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

let missingArg,
  p1,
  p2,
  p3,
  lang,
  refresh,
  titleReset,
  subReset,
  titleUpdate,
  subUpdate,
  resetNotificationTitle,
  updateNotificationTitle,
  updateNotificationString,
  setKey,
  dueStringTitle,
  notiSettings,
  nSubOff,
  nSubOn,
  notificationStringFallback,
  inboxName,
  done,
  updateNeeded,
  dateStrings,
  stopwords;

if (LaunchBar.currentLocale == 'de') {
  missingArg = 'Die Aufgabe hat keinen Namen!';
  p1 = 'Priorität 1';
  p2 = 'Priorität 2';
  p3 = 'Priorität 3';
  lang = 'de';
  refresh = 'Projekte, Abschitte & Etiketten aktualisieren';
  titleReset = 'Zurücksetzen';
  subReset = 'Nutzungsdaten werden zurückgesetzt!';
  titleUpdate = 'Aktualisieren';
  subUpdate =
    'Projekte, Abschnitte und Etiketten werden aktualisiert. Nutzungsdaten bleiben erhalten.';
  resetNotificationTitle =
    'Projekte, Abschitte & Etiketten wurden zurückgesetzt.';
  updateNotificationTitle =
    'Projekte, Abschitte & Etiketten wurden aktualisiert.';
  updateNotificationString = ' Änderung(en)';
  setKey = 'API-Token erneuern';
  dueStringTitle = 'Fällig: ';
  notiSettings = 'Bestätigungsmitteilungen';
  nSubOff = 'Eingabetaste drücken, um Mitteilungen auszuschalten.';
  nSubOn = 'Eingabetaste drücken, um Mitteilungen anzuschalten.';
  notificationStringFallback = 'wurde zu Todoist hinzugefügt!';
  inboxName = 'Eingang';
  done = 'Fertig!';
  updateNeeded =
    'Einen Moment, bitte! Lokale Daten müssen aktualisiert werden.';

  dateStrings = dateStringsJSON.de;
  stopwords = new Set([
    ...stopwordsJSON.de,
    ...stopwordsJSON.en,
    ...stopwordsJSON.social,
  ]);
} else {
  missingArg = 'This task has no name!';
  p1 = 'Priority 1';
  p2 = 'Priority 2';
  p3 = 'Priority 3';
  lang = 'en';
  refresh = 'Refresh projects, sections & labels.';
  titleReset = 'Reset';
  subReset = 'A complete reset including usage data.';
  titleUpdate = 'Update';
  subUpdate =
    'Projects, sections and lables will be updated without impacting usage data.';
  resetNotificationTitle = 'Projects, sections & labels reset.';
  updateNotificationTitle = 'Projects, sections & labels updated.';
  updateNotificationString = ' change(s)';
  setKey = 'Reset API-Token';
  dueStringTitle = 'Due: ';
  notiSettings = 'Confirmation Notifications';
  nSubOff = 'Hit enter to turn off notifications';
  nSubOn = 'Hit enter to turn on notifications';
  notificationStringFallback = 'has been added to Todoist!';
  inboxName = 'Inbox';
  done = 'Done!';
  updateNeeded = 'Just a second! Local data needs to be updated';

  dateStrings = dateStringsJSON.en;
  stopwords = new Set([...stopwordsJSON.en, ...stopwordsJSON.social]);
}
