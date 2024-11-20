/* 
Recent MindNode Next Documents Action for LaunchBar
by Christian Bender (@ptujec)
2024-11-20

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const dataPath = Action.supportPath + '/data.json';
const cloudDocumentsDir = `${LaunchBar.homeDirectory}/Library/Containers/com.ideasoncanvas.mindnode/Data/Library/Application Support/MindNode Next/production-v1_0/CloudDocuments`;
const dataBaseDir = `${cloudDocumentsDir}/Content.sqlite3`;
const assetsDir = `${cloudDocumentsDir}/Assets/`;

function run() {
  const output = LaunchBar.execute(
    '/bin/sh',
    './data.sh',
    dataBaseDir,
    assetsDir
  );
  if (!output) return { title: 'Nothing found', icon: 'alert' };

  const [documentsJsonString, assetsInfo] = output.split('////');
  const assetsInfoArray = assetsInfo
    ? assetsInfo.split('\n').map((item) => ({
        date: item.split(assetsDir)[0],
        name: item.split(assetsDir)[1],
      }))
    : [];

  const data = JSON.parse(documentsJsonString);

  return data
    .map((item) => {
      const previewImageInfo = assetsInfoArray.find((assetsInfoItem) =>
        assetsInfoItem.name.startsWith(`${item.documentID}_full_`)
      );
      const date = new Date(previewImageInfo.date).toISOString();

      return {
        title: item.title,
        icon: 'com.ideasoncanvas.mindnode',
        // icon: path,
        path: assetsDir + previewImageInfo.name,
        action: 'open',
        actionArgument: `https://mindnode.com/document/${item.documentID}#${item.title}`,
        actionRunsInBackground: true,
        date,
      };
    })
    .sort((a, b) => a.date < b.date);
}

function open(url) {
  LaunchBar.hide();
  LaunchBar.openURL(url);
}
