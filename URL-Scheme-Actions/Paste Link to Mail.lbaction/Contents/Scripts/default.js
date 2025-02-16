/* 
Paste Mail URL Scheme Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

String.prototype.localizationTable = 'default';

function run(argument) {
  const output = LaunchBar.executeAppleScriptFile(
    './getMailData.applescript'
  ).trim();

  LaunchBar.log('initial output', output);

  if (output.startsWith('Error')) {
    LaunchBar.log(output);
    return { title: output.localize(), icon: 'alert' };
  }

  const json = eval('[' + output + ']').sort(
    (a, b) => a.shortdate < b.shortdate
  );

  if (json.length == 1) {
    LaunchBar.hide();
    const item = json[0];
    paste({
      title: argument || item.subject,
      url: item.url,
    });
    return;
  }

  return json.map((item) => {
    const title = item.sender + ' on '.localize() + item.date;
    const subtitle = argument || item.subject;
    const url = item.url;

    return {
      shortdate: item.shortdate,
      title,
      subtitle,
      alwaysShowsSubtitle: true,
      icon: 'threadTemplate',
      action: 'paste',
      actionArgument: {
        title: subtitle,
        url,
      },
      actionRunsInBackground: true,
    };
  });
}

function paste({ title, url }) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.paste(url);
    return;
  }

  LaunchBar.hide();

  const swiftScriptPathCompiled = `${Action.path}/Contents/Scripts/paste`;
  const swiftScriptPath = `${swiftScriptPathCompiled}.swift`;

  if (File.exists(swiftScriptPathCompiled)) {
    LaunchBar.execute('./paste', title, url);
  } else {
    LaunchBar.execute('/usr/bin/swift', swiftScriptPath, title, url);
  }
}
