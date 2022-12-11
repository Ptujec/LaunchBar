/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2022-12-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const apiToken = Action.preferences.apiToken;
const dateStringsJSON = File.readJSON(
  '~/Library/Application Support/LaunchBar/Actions/Todoist Inbox.lbaction/Contents/Resources/dateStrings.json'
);
const stopwordsJSON = File.readJSON(
  '~/Library/Application Support/LaunchBar/Actions/Todoist Inbox.lbaction/Contents/Resources/stopwords.json'
);
const sectionsPath = Action.supportPath + '/sections.json';
const projectsPath = Action.supportPath + '/projects.json';
const labelsPath = Action.supportPath + '/labels.json';
