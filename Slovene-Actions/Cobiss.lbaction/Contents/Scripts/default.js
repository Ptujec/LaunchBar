// LaunchBar Action Script

function run(argument) {
  LaunchBar.openURL(
    'https://plus.si.cobiss.net/opac7/bib/search?q=' +
      encodeURI(argument) +
      '&db=cobib&mat=allmaterials'
  );
}
