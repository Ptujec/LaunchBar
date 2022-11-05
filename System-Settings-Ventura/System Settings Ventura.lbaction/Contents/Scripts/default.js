// LaunchBar Action Script
const folderPath = '/System/Library/ExtensionKit/Extensions/';

function run(argument) {
  var contents = File.getDirectoryContents(folderPath, {
    includeHidden: true,
  });

  var result = [];

  contents.forEach(function (item) {
    var path = folderPath + item;
    var title = item.replace(/\.appex/, '');
    var plistPath = path + '/Contents/Info.plist';
    var loctablePath = path + '/Contents/Resources/InfoPlist.loctable';

    if (File.exists(loctablePath)) {
      var loctable = File.readPlist(loctablePath);

      var localeName = eval(
        'loctable.' + LaunchBar.currentLocale + '.CFBundleDisplayName'
      );

      var name = localeName;
    }

    if (name == undefined) {
      name = title;
    }

    if (
      File.exists(plistPath) == true &&
      item != 'AppExtensionManagement.appex'
    ) {
      var plist = File.readPlist(plistPath);
      var id = plist.CFBundleIdentifier;

      result.push({
        title: name,
        path: path,
        icon: 'icon_32x32_Normal@2x',
        action: 'open',
        actionArgument: id,
      });
    } else {
      result.push({
        title: 'Passwords',
        icon: 'icon_32x32_Normal@2x',
        action: 'open',
        actionArgument: 'com.apple.Passwords-Settings.extension',
      });
      //   LaunchBar.alert(item);
      // x-apple.systempreferences:com.apple.Passwords-Settings.extension
    }
  });
  result.sort(function (a, b) {
    return a.title > b.title;
  });

  return result;
}

function open(id) {
  LaunchBar.hide();
  LaunchBar.openURL('x-apple.systempreferences:' + id);
}
