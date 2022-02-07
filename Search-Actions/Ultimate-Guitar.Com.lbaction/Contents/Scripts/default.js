// LaunchBar Action Script

function run(argument) {
  LaunchBar.openURL(
    'https://www.ultimate-guitar.com/search.php?search_type=title&value=' +
      encodeURI(argument)
  );
}
