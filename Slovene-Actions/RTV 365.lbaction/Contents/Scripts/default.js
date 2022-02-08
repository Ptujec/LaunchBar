function run(argument) {
  if (argument == undefined) {
    LaunchBar.openURL('https://365.rtvslo.si');
  } else {
    var url = 'https://365.rtvslo.si/raziskuj?q=' + encodeURI(argument);
    LaunchBar.openURL(url);
  }
}
