/* Show PDF in Zotero
 
*/

function run(path) {
  var itemKey = path.toString().match(/Zotero\/storage\/(.*)\//)[1];
  var zURL = 'zotero://select/items/0_' + itemKey;
  LaunchBar.openURL(zURL);
}
