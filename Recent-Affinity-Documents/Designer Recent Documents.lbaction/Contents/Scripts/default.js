/* 
Designer Recent Documents Action for LaunchBar
by Christian Bender (@ptujec)
2023-11-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  const plist = File.readPlist(
    '~/Library/Application Support/Affinity Designer 2/mru.dat'
  );
  const plistString = JSON.stringify(plist);
  const fileURLs = plistString.match(/file.*?\.afdesign/g);

  //   let fileURLs = plistString.match(/file.*?\.afdesign/g);
  //   fileURLs = [...new Set(fileURLs)];

  return fileURLs.map((fileURL) => {
    const path = File.pathForFileURL(fileURL);

    if (File.exists(path)) {
      return {
        path,
        // alwaysShowsSubtitle: true,
      };
    }
  });
}
