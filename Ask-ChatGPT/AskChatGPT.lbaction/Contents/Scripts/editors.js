function chooseEditor() {
  var result = [];
  var installedApps = File.getDirectoryContents('/Applications/');
  installedApps.forEach(function (item) {
    if (item.endsWith('.app')) {
      var isMD = false;
      var infoPlistPath = '/Applications/' + item + '/Contents/Info.plist';

      if (File.exists(infoPlistPath)) {
        var infoPlist = File.readPlist(infoPlistPath);
        var bundleName = infoPlist.CFBundleName;
        var appID = infoPlist.CFBundleIdentifier;

        var importedTypeDeclarations = infoPlist.UTImportedTypeDeclarations;
        if (importedTypeDeclarations != undefined) {
          importedTypeDeclarations.forEach(function (item) {
            var spec = item.UTTypeTagSpecification;

            if (spec != undefined) {
              var ext = spec['public.filename-extension'];

              if (ext != undefined && ext.indexOf('markdown') !== -1) {
                isMD = true;
              }
            }
          });
        }

        var exportedTypeDeclarations = infoPlist.UTExportedTypeDeclarations;
        if (exportedTypeDeclarations != undefined) {
          exportedTypeDeclarations.forEach(function (item) {
            var spec = item.UTTypeTagSpecification;

            if (spec != undefined) {
              var ext = spec['public.filename-extension'];

              if (ext != undefined && ext.indexOf('markdown') !== -1) {
                isMD = true;
              }
            }
          });
        }

        var documentTypes = infoPlist.CFBundleDocumentTypes;

        if (documentTypes != undefined) {
          documentTypes.forEach(function (item) {
            var ext = item.CFBundleTypeExtensions;
            if (ext != undefined && ext.indexOf('markdown') !== -1) {
              isMD = true;
            }
          });
        }
      }
      if (isMD) {
        result.push({
          title: bundleName,
          icon: appID,
          action: 'setEditor',
          actionArgument: {
            appID: appID,
            bundleName: bundleName,
          },
        });
      }
    }
  });

  result.forEach(function (item) {
    if (item.icon == Action.preferences.EditorID) {
      item.label = '✔';
    }
  });

  result.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });

  return result;
}

function setEditor(dict) {
  Action.preferences.EditorID = dict.appID;
  Action.preferences.EditorName = dict.bundleName;
  return settings();
}
