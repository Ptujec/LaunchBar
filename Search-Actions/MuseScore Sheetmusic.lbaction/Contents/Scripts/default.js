// LaunchBar Action Script

function run(argument) {
  LaunchBar.openURL(
    'https://musescore.com/sheetmusic?text=' + encodeURI(argument)
  );
}
