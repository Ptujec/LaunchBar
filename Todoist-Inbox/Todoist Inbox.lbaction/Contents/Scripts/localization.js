/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

if (LaunchBar.currentLocale == 'de') {
  var p1 = 'Priorität 1';
  var p2 = 'Priorität 2';
  var p3 = 'Priorität 3';
  var lang = 'de';
  var refresh = 'Projekte, Abschitte & Etiketten aktualisieren';
  var titleReset = 'Zurücksetzen';
  var subReset = 'Nutzungsdaten werden zurückgesetzt!';
  var titleUpdate = 'Aktualisieren';
  var subUpdate =
    'Projekte, Abschnitte und Etiketten werden aktualisiert. Nutzungsdaten bleiben erhalten.';
  var resetNotificationTitle =
    'Projekte, Abschitte & Etiketten wurden zurückgesetzt.';
  var updateNotificationTitle =
    'Projekte, Abschitte & Etiketten wurden aktualisiert.';
  var updateNotificationString = ' Änderung(en)';
  var setKey = 'API-Token erneuern';
  var dueStringTitle = ', Fällig: ';
  var notiSettings = 'Bestätigungsmitteilungen';
  var nSubOff = 'Eingabetaste drücken, um Mitteilungen auszuschalten.';
  var nSubOn = 'Eingabetaste drücken, um Mitteilungen anzuschalten.';
  var notificationStringFallback = 'wurde zu Todoist hinzugefügt!';
  var inboxName = 'Eingang';
  var done = 'Fertig!';
  var updateNeeded =
    'Einen Moment, bitte! Lokale Daten müssen aktualisiert werden.';

  var dateStrings = dateStringsJSON.de;
  var stopwords = stopwordsJSON.de.concat(stopwordsJSON.en);
} else {
  var p1 = 'Priority 1';
  var p2 = 'Priority 2';
  var p3 = 'Priority 3';
  var lang = 'en';
  var refresh = 'Refresh projects, sections & labels.';
  var titleReset = 'Reset';
  var subReset = 'A complete reset including usage data.';
  var titleUpdate = 'Update';
  var subUpdate =
    'Projects, sections and lables will be updated without impacting usage data.';
  var resetNotificationTitle = 'Projects, sections & labels reset.';
  var updateNotificationTitle = 'Projects, sections & labels updated.';
  var updateNotificationString = ' change(s)';
  var setKey = 'Reset API-Token';
  var dueStringTitle = ', Due: ';
  var notiSettings = 'Confirmation Notifications';
  var nSubOff = 'Hit enter to turn off notifications';
  var nSubOn = 'Hit enter to turn on notifications';
  var notificationStringFallback = 'has been added to Todoist!';
  var inboxName = 'Inbox';
  var done = 'Done!';
  var updateNeeded = 'Just a second! Local data needs to be updated';

  var dateStrings = dateStringsJSON.en;
  var stopwords = stopwordsJSON.de;
}
