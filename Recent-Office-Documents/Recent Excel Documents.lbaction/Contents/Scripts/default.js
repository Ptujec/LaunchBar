/* 
Recent Excel Documents Action for LaunchBar
by Christian Bender (@ptujec)
2023-10-31

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  const plistPath =
    '~/Library/Containers/com.microsoft.Excel/Data/Library/Preferences/com.microsoft.Excel.securebookmarks.plist';
  const plist = File.readPlist(plistPath);

  const fileURLs = JSON.stringify(plist)
    .replace(/"/g, '\n"')
    .match(/file.*/g);

  return fileURLs
    .map((fileURL) => {
      const lastUsedDate = plist[fileURL].kLastUsedDateKey.toString();
      const path = File.pathForFileURL(fileURL);
      if (File.exists(path) && !File.isDirectory(path))
        return { path, lastUsedDate };
    })
    .sort(function (a, b) {
      return new Date(b.lastUsedDate) - new Date(a.lastUsedDate);
    });
}
