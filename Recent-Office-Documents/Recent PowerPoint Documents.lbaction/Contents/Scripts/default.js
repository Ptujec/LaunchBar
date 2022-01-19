// Recent Powerpoint Documents

function run() {
  var plistPath =
    '~/Library/Containers/com.microsoft.Powerpoint/Data/Library/Preferences/com.microsoft.Powerpoint.securebookmarks.plist';

  var plist = File.readPlist(plistPath);

  var fileURLs = JSON.stringify(plist)
    .replace(/":{/g, '\n":{')
    .replace(/},"file/g, '},\n"file')
    .match(/file.*/g);

  var result = [];
  for (var i = 0; i < fileURLs.length; i++) {
    var filePath = File.pathForFileURL(fileURLs[i]);
    var lastUsedDate = plist[fileURLs[i]].kLastUsedDateKey.toString();

    if (File.exists(filePath) && !File.isDirectory(filePath)) {
      result.push({
        path: filePath,
        lastUsedDate: lastUsedDate,
      });
    }
  }

  result.sort(function (a, b) {
    return new Date(b.lastUsedDate) - new Date(a.lastUsedDate);
  });
  return result;
}
