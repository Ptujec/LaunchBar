String.prototype.localizationTable = 'default';

const plistPath =
  '~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.MusicAddToPlaylist/Preferences.plist';

function run() {
  const plist = File.readPlist(plistPath);

  const recentName = plist.recent_playlist || '';

  const allPlaylists = LaunchBar.executeAppleScript(
    `
    tell application "Music" to set _playlists to name of every user playlist whose smart is false

    set AppleScript's text item delimiters to linefeed
    set _lines to _playlists as text
    set AppleScript's text item delimiters to ""

    return _lines
  `,
  ).split('\n');

  const playlists =
    recentName && allPlaylists.includes(recentName)
      ? [
          recentName,
          ...allPlaylists.filter((playlist) => playlist !== recentName),
        ]
      : allPlaylists;

  return playlists.map((playlist) => {
    return {
      title: playlist,
      icon: 'plTemplate',
      badge: playlist === recentName ? 'last used'.localize() : undefined,
      action: 'addToPlaylist',
      actionArgument: playlist,
      actionRunsInBackground: true,
    };
  });
}

function addToPlaylist(playlist) {
  LaunchBar.hide();

  const appleScript = `
  tell application "Music"
    activate
    reveal current track
  end tell
  
  delay 0.1
  
  tell application "System Events"
    click menu item "${playlist}" of menu "${'Add to Playlist'.localize()}" of menu item "${'Add to Playlist'.localize()}" of menu "${'Song'.localize()}" of menu bar item "${'Song'.localize()}" of menu bar 1 of application process "Music"
  
    delay 0.1

    set _outline to outline 1 of scroll area 1 of splitter group 1 of window "Musik" of application process "Music"
	
	  select (first row of _outline whose name of UI element 1 is "${playlist}")
  end tell
  `;

  LaunchBar.executeAppleScript(appleScript);
  File.writePlist({ recent_playlist: playlist }, plistPath);
}
