/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

// Constants
const apiToken = Action.preferences.apiToken;
const dueStringsJSON = File.readJSON(
  '~/Library/Application Support/LaunchBar/Actions/Todoist Inbox.lbaction/Contents/Resources/dueStringOptions.json'
);
const stopwordsJSON = File.readJSON(
  '~/Library/Application Support/LaunchBar/Actions/Todoist Inbox.lbaction/Contents/Resources/stopwords.json'
);
const sectionsPath = Action.supportPath + '/sections.json';
const projectsPath = Action.supportPath + '/projects.json';
const labelsPath = Action.supportPath + '/labels.json';

const rePrio = /( p[1-3]( |$))|((^| )p[1-3] )/i;
const reDueStringWithAt = / @(.*?)(p\d|((^| )#($| ))|$)/i;

// Functions
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
