/* 
Create SVG File from Website Action for LaunchBar
by Christian Bender (@ptujec)
2023-01-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable;

function run() {
  // Settings
  // if (LaunchBar.options.shiftKey) {
  //   var output = settings();
  //   return output;
  // }

  // Get current website from Safari
  var url = LaunchBar.executeAppleScript(
    'tell application "Safari" to set _URL to URL of front document'
  ).trim();

  if (url == 'missing value' || url == 'favorites://' || url == '') {
    LaunchBar.alert('No current website found in Safari!'.localize());
    LaunchBar.hide();
    return;
  }

  var baseUrl = url.match(
    /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/
  )[0];

  var siteName = url.split('/')[2].replace(/\./g, '_').replace('www_', '');

  // Try to extract svg files from website
  var html = HTTP.loadRequest(url, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data;

  var svgJSON = [];

  if (html == undefined) {
    LaunchBar.alert('Not able to retrieve html from this website!'.localize());
    LaunchBar.hide();
    return;
  }

  // Get code and name from linked SVG files as JSON
  var svgUrlPaths = html.match(/"((?:\\.|[^"\\])+\.svg)"/g);

  if (svgUrlPaths != undefined) {
    // Avoid duplicates
    svgUrlPaths = [...new Set(svgUrlPaths)];

    svgUrlPaths.forEach(function (item) {
      var svgUrlPath = item.match(/"(.*?\.svg)"/)[1];

      var svgName = svgUrlPath.split('/');
      svgName = siteName + '_' + svgName[svgName.length - 1];

      if (svgUrlPath.startsWith('http')) {
        var svgUrl = svgUrlPath;
      } else {
        var svgUrl = baseUrl + svgUrlPath;
      }

      var svgTag = HTTP.loadRequest(svgUrl, {
        timeout: 5.0,
        method: 'GET',
        resultType: 'text',
      }).data;

      if (svgTag == undefined) {
        LaunchBar.alert(
          'Error: No code found for the URL'.localize(),
          "Please report this issue. Don't forget to include the Website this happend with: ".localize() +
            svgUrl
        );
      } else {
        svgJSON.push({
          svgName: svgName,
          svgTag: svgTag,
        });
      }
    });
  }

  // Get SVG code integrated directly in the HTML
  var svgTags = html.match(/<svg(.|\n)+?<\/svg>/g);

  if (svgTags != undefined) {
    // exclude svg files with no path
    for (var i = svgTags.length - 1; i >= 0; i -= 1) {
      if (!svgTags[i].includes('<path')) {
        svgTags.splice(i, 1);
      }
    }

    // Avoid duplicates
    svgTags = [...new Set(svgTags)];

    svgTags.forEach(function (item, index) {
      if (item.includes('<title>') && !item.includes('<symbol')) {
        var svgName =
          siteName +
          '_' +
          pad(index + 1) +
          '_' +
          item
            .match(/<title>(.*?)<\/title>/)[1]
            .trim()
            .replace(/\s/g, '_')
            .replace(/:/g, '') +
          '.svg';
      } else {
        var svgName = siteName + '_' + pad(index + 1) + '.svg';
      }

      svgJSON.push({
        svgName: svgName,
        svgTag: item,
      });
    });
  }

  // Alert for no results
  if (svgJSON == '') {
    LaunchBar.alert('No SVG code found!'.localize(), url);
    LaunchBar.hide();
    return;
  }

  // Warning for more 100+ results
  if (svgJSON.length > 100) {
    var response = LaunchBar.alert(
      svgJSON.length + ' SVG code snippets found!'.localize(),
      'Do you want to continue?'.localize(),
      'Ok',
      'Cancel'.localize()
    );
    switch (response) {
      case 0:
        // Ok … do something
        var output = createSVGs(svgJSON, siteName);
        return output;

      case 1:
        break;
    }
  } else {
    var output = createSVGs(svgJSON, siteName);
    return output;
  }
}

function createSVGs(svgJSON) {
  // Write Files and return path

  var paths = [];
  svgJSON.forEach(function (item) {
    var svgTag = item.svgTag;

    // Fix to make sure quicklook works
    if (!svgTag.includes('xmlns')) {
      svgTag = svgTag.replace(
        /<svg /,
        '<svg xmlns="http://www.w3.org/2000/svg" '
      );
    }

    // Fix to avoid white on white - uncomment if you want to preserve the original color
    // svgTag = svgTag
    //   .replace(/fill=".*?"/gi, '')
    //   .replace(/<style(.|\n|\r)*?<\/style>/g, '');

    var fileLocation = '/private/tmp/' + item.svgName;

    File.writeText(svgTag, fileLocation);

    paths.push({
      path: fileLocation,
    });
  });

  return paths;
}

function pad(d) {
  return d < 10 ? '0' + d.toString() : d.toString();
}

// function settings() {
//   if (Action.preferences.grey == undefined) {
//     var icon = 'backgroundTemplate';
//     var arg = 'off';
//     var title = 'Grey background (Quicklook)';
//   } else {
//     var icon = 'nobackgroundTemplate';
//     var arg = 'on';
//     var title = 'Standard background (Quicklook)';
//   }

//   return [
//     {
//       title: title,
//       icon: icon,
//       action: 'backgroundSetting',
//       actionArgument: arg,
//     },
//   ];
// }

// function backgroundSetting(arg) {
//   if (arg == 'off') {
//     Action.preferences.grey = false;
//   } else {
//     Action.preferences.grey = undefined;
//   }
//   var output = settings();
//   return output;
// }
