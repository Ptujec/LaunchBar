/* 
Create SVG File from Clipboard Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable;

function run(argument) {
  // Get Website

  // Try to create file from clipboard
  if (argument == undefined) {
    argument = 'temp';
  }

  var svg = LaunchBar.getClipboardString().trim();
  var fileLocation = '/private/tmp/' + argument + '.svg';

  if (svg.startsWith('<svg')) {
    // Fix to make sure quicklook works
    if (!svg.includes('xmlns')) {
      svg = svg.replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    // Fix to avoid white on white - uncomment if you want to preserve the original color
    // svg = svg.replace(/fill=".*?"/gi, '');

    // Write File
    File.writeText(svg, fileLocation);
    return [
      {
        path: fileLocation,
      },
    ];
  } else {
    LaunchBar.alert(
      'The current clipboard item does not appear to be svg code.'.localize()
    );
  }
}
