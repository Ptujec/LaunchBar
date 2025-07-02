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

  const hasAnnotation = dict.annotation;
  const annotationText = hasAnnotation ? `"${dict.annotation}"` : '';

  const isBibliography =
    LaunchBar.options.alternateKey || dict.isBibliography ? true : false;

  const citation =
    dict.pageLabel && citationJson.citation.endsWith(')')
      ? citationJson.citation.replace(/\)$/, `:${dict.pageLabel})`) // TODO: Make this more flexible in alignment with the style … it is called "locator" in the csl style. There seems to be not support in the API for this yet. Could do by parsing the style? Or separate setting?
      : citationJson.citation;

  let text = hasAnnotation
    ? citation
    : isBibliography
    ? citationJson.bib
    : citationJson.citation;

  const citationFormat = Action.preferences.citationFormat || fallbackFormat;

  const includeZoteroLink = Action.preferences.includeZoteroLink ?? true;

  if (citationFormat == 'html') {
    text = hasAnnotation ? `${annotationText} ${text}` : text;
    LaunchBar.paste(text);
    return;
  }

  // TODO: Support more styles, including ACS … might need to in Zotero Paste Helper
  if (citationFormat == 'richText') {
    if (isBibliography) {
      const match = text.match(/<div class="csl-entry">(.*?)<\/div>/);
      text = match ? match[1] : text;
    }

    if (pasteHelperInstalled) {
      Action.preferences.pasteHelperContent = {
        text: text,
        url: includeZoteroLink
          ? dict.zoteroAnnotationURL || dict.zoteroSelectURL
          : '',
        annotation: hasAnnotation ? dict.annotation : '',
      };
      LaunchBar.performAction('Zotero Paste Helper');
    } else {
      LaunchBar.execute(
        '/bin/bash',
        'rt.sh',
        text,
        includeZoteroLink
          ? dict.zoteroAnnotationURL || dict.zoteroSelectURL
          : '',
        hasAnnotation ? dict.annotation : ''
      );
    }
    return;
  }

  text = text.decodeHTMLEntities();

  if (isBibliography) {
    const match = text.match(/<div class="csl-entry">(.*?)<\/div>/);
    text = match ? match[1] : text;
    text = text.replace(/<\/?i>/g, '*');
  }

  if (citationFormat == 'markdown') {
    if (includeZoteroLink) {
      text = `[${text}](${dict.zoteroAnnotationURL || dict.zoteroSelectURL})`;
    }
    text = hasAnnotation ? `${annotationText} ${text}` : text;
    LaunchBar.paste(text);
    return;
  }

  // Default format handling
  text = text.replace(/\*/g, '');
  text = hasAnnotation ? `${annotationText} ${text}` : text;

  if (includeZoteroLink) {
    // LaunchBar.setClipboardString(dict.url) and LaunchBar.paste(text) do not work in this instance for some reason

    // TODO: BUG: currently there seems to be some issue with pasting annotations … maybe remove this option … or at least the link part?

    const url = dict.zoteroAnnotationURL ?? dict.zoteroSelectURL;

    LaunchBar.executeAppleScript(`
      set the clipboard to "${text}"
      delay 0.1
      tell application "System Events" to keystroke "v" using command down
      delay 0.1
      set the clipboard to "${url}"
    `);
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
