/* 
Mastodon Post (Toot) Action for LaunchBar
by Christian Bender (@ptujec)
2025-01-11

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function runWithString(string) {
  if (string.includes('..')) {
    const output = LaunchBar.executeAppleScript(
      'tell application "Safari" to set _URL to URL of front document'
    ).trim();

    const newString =
      string.trim().replace('..', ' ').replace(/\s\s+/g, '') + ' ' + output;
    return [{ title: newString, icon: 'link2Template' }];
  }

  if (Action.preferences.count !== 'always' && string.length < 400) return;

  const icon = string.length > 500 ? 'countRed' : 'postTemplate';
  return [{ title: `${string.length}/500`, icon }];
}
