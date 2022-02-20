// LaunchBar Action Script

function run(argument) {
  if (argument == undefined) {
    if (LaunchBar.options.shiftKey) {
      var output = LaunchBar.executeAppleScriptFile('./md.applescript').trim();
    } else if (LaunchBar.options.controlKey) {
      var output = LaunchBar.executeAppleScriptFile('./rtf.applescript').trim();
    } else {
      var output = LaunchBar.executeAppleScriptFile('./url.applescript').trim();
    }
  } else {
    if (LaunchBar.options.shiftKey) {
      var output = LaunchBar.executeAppleScriptFile(
        './md_with_argument.applescript',
        argument
      ).trim();
    } else if (LaunchBar.options.controlKey) {
      var output = LaunchBar.executeAppleScriptFile(
        './rtf_with_argument.applescript',
        argument
      ).trim();
    } else {
      var output = LaunchBar.executeAppleScriptFile('./url.applescript').trim();
    }
  }
  output = eval('[' + output + ']');
  output.sort(function (a, b) {
    return a.date < b.date;
  });

  if (output.length > 1) {
    return output;
  } else if (output.length == 1) {
    LaunchBar.hide();
    if (output[0].action == 'pasteRtf') {
      pasteRtf(output[0].actionArgument);
    } else {
      paste(output[0].actionArgument);
    }
  }
}

function paste(link) {
  m = link.split('\n');
  var url = encodeURI(decodeURI(m[0]));
  var title = m[1];

  if (title != undefined) {
    LaunchBar.paste('[' + title + '](' + url + ')');
  } else {
    LaunchBar.paste(url);
  }
}

function pasteRtf(link) {
  m = link.split('\n');
  var url = encodeURI(decodeURI(m[0]));
  var title = m[1];
  var html =
    '<font size="4"><font face="helvetica neue"><a href="' +
    url +
    '">' +
    title +
    '</a> </font></font>';
  LaunchBar.executeAppleScriptFile('./convertRtf.applescript', html);
}
