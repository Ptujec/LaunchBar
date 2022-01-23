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

      if (words.length == 1) {
        var query =
          `(kMDItemDisplayName=='*` +
          argument +
          `*'cw)||(kMDItemTitle=='*` +
          argument +
          `*'cw)||(kMDItemAuthors=='*` +
          argument +
          `*'cw)||(kMDItemFinderComment=='*` +
          argument +
          `*'cw)||(kMDItemUserTags=='*` +
          argument +
          `*'cw)`;
      } else {
        var title = [];
        var displayName = [];
        var finderComment = [];
        var userTags = [];
        var authors = [];

        words.forEach(function (item) {
          // LaunchBar.alert(item);
          displayName.push(`(kMDItemDisplayName=='*` + item + `*'cw)`);
          title.push(`(kMDItemTitle=='*` + item + `*'cw)`);
          authors.push(`(kMDItemAuthors=='*` + item + `*'cw)`);
          finderComment.push(`(kMDItemFinderComment=='*` + item + `*'cw)`);
          userTags.push(`(kMDItemUserTags=='*` + item + `*'cw)`);
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
      result.push({
        path: output[i],
      });
    }

    if (result[0].path == '') {
      LaunchBar.alert('No hit'.localize());
    } else {
      return result;
    }
  }
}
