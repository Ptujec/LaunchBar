/* 
Markdown Link to RTF Action for LaunchBar
by Christian Bender (@ptujec)
2024-11-29

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Sources
- https://www.alfredforum.com/topic/5653-creating-rich-text-links-in-mail-app/ 
- https://ss64.com/osx/textutil.html 
- https://discourse.devontechnologies.com/t/return-links-back-links/54390
- Example: "<font size=\"5\" color=\"#8080BB\"><font face=\"Menlo\">'" & theList & "'</font></font>'"
*/

function run(argument) {
  if (!argument) argument = LaunchBar.getClipboardString();
  const html = `<font size="4"><font face="helvetica neue">${replaceMarkdownLinks(
    argument
  )}</font></font>`;
  LaunchBar.execute('/bin/sh', './rtf.sh', html);
  LaunchBar.executeAppleScript(
    'delay 0.1',
    'tell application "System Events" to keystroke "v" using command down'
  );
}

function replaceMarkdownLinks(text) {
  return text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, linkText, url) => {
    return `<a href="${url}">${linkText}</a>`;
  });
}
