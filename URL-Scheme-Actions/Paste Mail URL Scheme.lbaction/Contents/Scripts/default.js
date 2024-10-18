/* 
Paste Mail URL Scheme Action for LaunchBar
by Christian Bender (@ptujec)
2024-10-18

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources and helful links:
- https://daringfireball.net/2007/12/message_urls_leopard_mail
- https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/ManipulateListsofItems.html
- https://stackoverflow.com/questions/21035368/applescript-less-than-number-or-greater-than-number

textutil:
- https://www.alfredforum.com/topic/5653-creating-rich-text-links-in-mail-app/ 
- https://ss64.com/osx/textutil.html 
- https://discourse.devontechnologies.com/t/return-links-back-links/54390
- Example: "<font size=\"5\" color=\"#8080BB\"><font face=\"Menlo\">'" & theList & "'</font></font>'" 			
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  const output = LaunchBar.executeAppleScriptFile(
    './getMailData.applescript'
  ).trim();

  if (output == 'false')
    return { title: 'Mail is not running!'.localize(), icon: 'alert' };

  const format = LaunchBar.options.shiftKey
    ? 'MD'
    : LaunchBar.options.commandKey
    ? 'RTF'
    : 'URL';

  const json = eval('[' + output + ']').sort(
    (a, b) => a.shortdate < b.shortdate
  );

  if (json.length == 1) {
    const item = json[0];
    return paste({
      title: argument || item.subject,
      url: item.url,
      format,
    });
  }

  return json.map((item) => ({
    shortdate: item.shortdate,
    title: item.sender + ' on '.localize() + item.date,
    subtitle: argument || item.subject,
    alwaysShowsSubtitle: true,
    icon: 'threadTemplate',
    badge: format,
    action: 'paste',
    argument: {
      title: argument || item.subject,
      url: item.url,
      format,
    },
    actionRunsInBackground: true,
  }));

  function paste({ title, url, format }) {
    LaunchBar.hide();

    // URL only
    if (format === 'URL') {
      LaunchBar.paste(url);
    }
    // Markdown
    if (format === 'MD') {
      LaunchBar.paste(`[${title}](${url})`);
    }
    // Richtext
    if (format === 'RTF') {
      const html = `<font size="4"><font face="helvetica neue"><a href="${url}">${title}</a> </font></font>`;
      LaunchBar.executeAppleScriptFile('./convertRtf.applescript', html);
    }
  }
}
