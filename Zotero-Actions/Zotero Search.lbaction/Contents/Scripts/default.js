/* Zotero Search

Sources: 
- https://stackoverflow.com/questions/45899411/compound-mdfind-search
- https://apple.stackexchange.com/questions/68432/can-mdfind-search-for-phrases-and-not-just-unordered-words
- https://gist.github.com/cwalston/7368493

Check for:
- kMDItemTitle
- kMDItemDisplayName
- kMDItemFinderComment
- kMDItemUserTags 
- kMDItemAuthors
*/

String.prototype.localizationTable = 'de';

const zoteroPath = LaunchBar.homeDirectory + '/Zotero/storage'; // TODO: Read the location in some plist or other local data

function run(argument) {
  if (argument == undefined) {
    LaunchBar.openURL(File.fileURLForPath('/Applications/Zotero.app'));
  } else {
    if (LaunchBar.options.commandKey) {
      // Search everything
      var output = LaunchBar.execute(
        '/usr/bin/mdfind',
        '-onlyin',
        zoteroPath,
        argument
      )
        .trim()
        .split('\n');
    } else {
      // Search Titel, Display Name, Comment and Tags
      var words = argument.match(/[a-zöäüßžčš]+/gi);

      var excludeFolders = `*'cw)&&!(kMDItemContentType=='public.folder'))`;

      if (words.length == 1) {
        var query =
          `((kMDItemDisplayName=='*` +
          argument +
          excludeFolders +
          '||' +
          `(kMDItemTitle=='*` +
          argument +
          excludeFolders +
          `(kMDItemAuthors=='*` +
          argument +
          excludeFolders +
          `(kMDItemFinderComment=='*` +
          argument +
          excludeFolders +
          `(kMDItemUserTags=='*` +
          argument +
          excludeFolders;
      } else {
        var title = [];
        var displayName = [];
        var finderComment = [];
        var userTags = [];
        var authors = [];

        var excludeFolders = `*'cw)&&!(kMDItemContentType=='public.folder')))`;

        words.forEach(function (item) {
          // LaunchBar.alert(item);
          displayName.push(`((kMDItemDisplayName=='*` + item + excludeFolders);
          title.push(`((kMDItemTitle=='*` + item + excludeFolders);
          authors.push(`((kMDItemAuthors=='*` + item + excludeFolders);
          finderComment.push(
            `((kMDItemFinderComment=='*` + item + excludeFolders
          );
          userTags.push(`((kMDItemUserTags=='*` + item + excludeFolders);
        });

        var query =
          displayName.join('&&') +
          '||' +
          title.join('&&') +
          '||' +
          authors.join('&&') +
          '||' +
          finderComment.join('&&') +
          '||' +
          userTags.join('&&');
      }

      if (query != undefined) {
        var output = LaunchBar.execute(
          '/usr/bin/mdfind',
          '-onlyin',
          zoteroPath,
          query
        )
          .trim()
          .split('\n');
      } else {
        return;
      }

      // if no content fallback to everything
      if (output == '') {
        // LaunchBar.alert('fallback');
        var output = LaunchBar.execute(
          '/usr/bin/mdfind',
          '-onlyin',
          zoteroPath,
          argument
        )
          .trim()
          .split('\n');
      }
    }

    var result = [];
    for (var i = 0; i < output.length; i++) {
      // if (!File.isDirectory(output[i])) { // cleaner looking code but doesn't perform well
      result.push({
        path: output[i],
      });
      // }
    }

    if (result[0].path == '') {
      LaunchBar.alert('No hit'.localize());
    } else {
      return result;
    }
  }
}
