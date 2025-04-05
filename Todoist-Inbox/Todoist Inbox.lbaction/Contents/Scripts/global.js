/* 
Todoist Inbox Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

// Constants
const apiToken = Action.preferences.apiToken;

const supportPath = Action.supportPath;
const actionPath = Action.path;

const dueStringsJSON = File.readJSON(
  `${actionPath}/Contents/Resources/dueStringOptions.json`
);
const stopwordsJSON = File.readJSON(
  `${actionPath}/Contents/Resources/stopwords.json`
);
const sectionsPath = `${supportPath}/sections.json`;
const projectsPath = `${supportPath}/projects.json`;
const labelsPath = `${supportPath}/labels.json`;

const rePrio = /( p[1-3]( |$))|((^| )p[1-3] )/i;
const reDueStringWithAt = / @(.*?)(p\d|((^| )#($| ))|$)/i;
const reDescription = /(?:\: )(.*)/;
const reQuotedParts = /"(.*?)"/g;

// Functions
function capitalizeFirstLetter(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}
