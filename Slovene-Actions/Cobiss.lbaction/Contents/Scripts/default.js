// LaunchBar Action Script

function run(argument) {
  LaunchBar.openURL(
    'https://plus.cobiss.net/cobiss/si/sl/bib/search?q=' +
      encodeURI(argument) +
      '&db=cobib&mat=allmaterials'
  );
}
