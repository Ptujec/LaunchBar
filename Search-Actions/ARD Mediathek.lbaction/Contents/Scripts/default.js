// LaunchBar Action Script

function run(argument) {
  LaunchBar.openURL(
    'https://www.ardmediathek.de/suche/' + encodeURIComponent(argument)
  );
}
