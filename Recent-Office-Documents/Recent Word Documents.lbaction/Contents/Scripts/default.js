// Recent Word Documents

function run() {
  var plistPath =
    '~/Library/Containers/com.microsoft.Word/Data/Library/Preferences/com.microsoft.Word.securebookmarks.plist';

  var plist = File.readPlist(plistPath);

  var fileURLs = JSON.stringify(plist)
    .replace(/":{/g, '\n":{')
    .replace(/},"file/g, '},\n"file')
    .match(/file.*/g);

  var result = [];
  for (var i = 0; i < fileURLs.length; i++) {
    var filePath = File.pathForFileURL(fileURLs[i]);
    var lastUsedDate = plist[fileURLs[i]].kLastUsedDateKey.toString();
    result.push({
      path: filePath,
      lastUsedDate: lastUsedDate,
    });
  }

  result.sort(function (a, b) {
    return new Date(b.lastUsedDate) - new Date(a.lastUsedDate);
  });
  return result;
}
