/* 
Recent MindNode Next Documents Action for LaunchBar
by Christian Bender (@ptujec)
2024-11-20

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

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
  const assetsInfoArray = assetsInfo ? assetsInfo.split('\n') : [];

  const data = JSON.parse(documentsJsonString);

  return data
    .map((item) => {
      const previewImage = assetsInfoArray.find((assetsInfoItem) =>
        assetsInfoItem.startsWith(`${item.documentID}_full_`)
      );

      return {
        title: item.title,
        icon: 'com.ideasoncanvas.mindnode',
        // icon: path,
        path: assetsDir + previewImage,
        action: 'open',
        actionArgument: `https://mindnode.com/document/${item.documentID}#${item.title}`,
        actionRunsInBackground: true,
        date: item.lastModifiedDate,
      };
    })
    .sort((a, b) => a.date < b.date);
}

function open(url) {
  LaunchBar.hide();
  LaunchBar.openURL(url);
}
