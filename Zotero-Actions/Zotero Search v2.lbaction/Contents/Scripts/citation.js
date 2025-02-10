/* 
Zotero Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-05

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://www.zotero.org/support/dev/web_api/v3/basics
- https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/localAPI/server_localAPI.js#L28
- https://www.zotero.org/styles/
- https://docs.citationstyles.org/en/stable/specification.html#info
- https://www.zotero.org/support/dev/citation_styles/style_editing_step-by-step

*/

function pasteCitation(dict) {
  LaunchBar.hide();

  const citationJson = getCitationLocalAPI(dict.itemKey);
  if (!citationJson) return;

  const itemID = dict.itemID;
  saveRecent(itemID);

  const isBibliography =
    LaunchBar.options.alternateKey || dict.isBibliography ? true : false;

  let text = isBibliography ? citationJson.bib : citationJson.citation;

  const citationFormat = Action.preferences.citationFormat || fallbackFormat;

  const includeZoteroLink = Action.preferences.includeZoteroLink ?? true;

  if (citationFormat == 'html') {
    LaunchBar.paste(text);
    return;
  }

  if (citationFormat == 'richText') {
    if (isBibliography)
      text = text.match(/<div class="csl-entry">(.*?)<\/div>/)[1];

    if (pasteHelperInstalled) {
      Action.preferences.pasteHelperContent = {
        text: text,
        url: includeZoteroLink ? dict.zoteroSelectURL : '',
      };
      LaunchBar.performAction('Zotero Paste Helper');
    } else {
      LaunchBar.execute(
        '/bin/bash',
        'rt.sh',
        text,
        includeZoteroLink ? dict.zoteroSelectURL : ''
      );
    }
    return;
  }

  if (isBibliography) {
    text = text
      .match(/<div class="csl-entry">(.*?)<\/div>/)[1]
      .replace(/<\/?i>/g, '*')
      .replace(/&amp;/g, '&');
  } else {
    text = text.replace(/&#38;/g, '&');
  }

  if (citationFormat == 'markdown') {
    text = includeZoteroLink ? `[${text}](${dict.zoteroSelectURL})` : text;
    LaunchBar.paste(text);
    return;
  }

  // Default format handling
  text = text.replace(/\*/g, '');

  if (includeZoteroLink) {
    // LaunchBar.setClipboardString(dict.url) and LaunchBar.paste(text) do not work in this instance for some reason
    LaunchBar.executeAppleScript(
      `set the clipboard to "${dict.zoteroSelectURL}"`,
      `tell application "LaunchBar" to paste in frontmost application "${text}"`
    );
  } else {
    LaunchBar.paste(text);
  }
  return;
}

function getCitationLocalAPI(itemKey) {
  apiPermissionCheck();

  const style = Action.preferences.citationStyle || fallbackStyle;

  const url = `http://localhost:23119/api/users/0/items/${itemKey}?format=json&include=bib,citation&style=${style}`;
  const result = HTTP.getJSON(url);

  const citationJson = result.data;
  const httpResponse = result.response;

  if (!citationJson || Object.keys(citationJson).length === 0) {
    const errorDetails = httpResponse
      ? `: ${httpResponse.status}\n(${httpResponse.localizedStatus})`
      : '';

    const alertResponse = LaunchBar.alert(
      `Zotero API Error${errorDetails}`,
      `Failed to fetch citation data. Please check that:\n1. Zotero is running\n2. The citation style (${style}) is working properly in Zotero.\n3. Check if the style ID in the CSL file is prefixed with "http://www.zotero.org/styles/". The URL that is used as the ID does not have to exist. But the the prefix seems to be required for the API to accept the style.`,
      'Open Zotero',
      'Cancel'
    );
    if (alertResponse === 0) {
      LaunchBar.openURL(File.fileURLForPath('/Applications/Zotero.app'));
    }
    return;
  }

  return citationJson;
}

function apiPermissionCheck() {
  const localAPIEnabled =
    zoteroPrefs['extensions.zotero.httpServer.localAPI.enabled'];

  if (!localAPIEnabled) {
    const response = LaunchBar.alert(
      'Permission required!',
      'You need to enable "Allow other applications on this computer to communicate with Zotero" in Zotero → Settings → Advanced.',
      'Ok',
      'Cancel'
    );
    if (response === 0)
      LaunchBar.openURL(File.fileURLForPath('/Applications/Zotero.app'));
  }
}
