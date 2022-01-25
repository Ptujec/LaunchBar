/* Show PDF in Zotero
 */

function run(path) {
  var itemKey = path.toString().match(/Zotero\/storage\/(.*)\//)[1];
  var zURL = 'zotero://select/library/items/' + itemKey;
  LaunchBar.openURL(zURL);
}
