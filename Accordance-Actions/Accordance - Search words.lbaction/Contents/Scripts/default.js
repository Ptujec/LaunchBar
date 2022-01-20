/* 2021-07-25 @Ptujec 

- http://www.accordancebible.com/Accordance-1043-Is-Automagical/
- http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-file
*/

function run(argument) {
  // Mode (search or research)
  if (argument.includes('#')) {
    if (argument.includes(':')) {
      //Translation Suggestion
      var a = argument.split(':');
      var translation = encodeURI(a[0]);
      var query = encodeURI(a[1]);
      query = searchOptions(query);

      LaunchBar.openURL('accord://search/' + translation + '?' + query);
    } else {
      LaunchBar.openURL('accord://search/?' + encodeURI(argument));
    }
  } else if (argument.includes(':')) {
    var a = argument.split(':');
    var translation = encodeURI(a[0]);
    var query = encodeURI(a[1]);
    query = searchOptions(query);
    LaunchBar.openURL('accord://search/' + translation + '?' + query);
  } else {
    // UI language check
    var aPlist = File.readPlist(
      '~/Library/Preferences/com.OakTree.Accordance.plist'
    );
    var lang = aPlist.AppleLanguages;

    if (lang != undefined) {
      lang = lang.toString();
    } else {
      var gPlist = File.readPlist(
        '/Library/Preferences/.GlobalPreferences.plist'
      );
      lang = gPlist.AppleLanguages.toString();
    }

    if (lang.startsWith('de')) {
      var allSetting = '[Alle];?';
    } else {
      var allSetting = '[All];?';
    }

    var query = argument;
    query = searchOptions(query);

    LaunchBar.openURL('accord://research/' + allSetting + encodeURI(query));
  }
}

function searchOptions(query) {
  // Search options:
  // A = <AND>, O = <OR>, N = <NOT>
  query = query
    .trim()
    .replace(/(:)\s+/, '$1')
    .replace(/\s+(#)/, '$1')
    .replace(/\sO\s/g, '<OR>')
    .replace(/\sA\s/g, '<AND>')
    .replace(/\sN\s/g, '<NOT>');

  if (LaunchBar.options.commandKey) {
    //
  } else if (LaunchBar.options.alternateKey) {
    query = query.replace(/\s/g, '<OR>');
  } else {
    query = query.replace(/\s/g, '<AND>');
  }
  return query;
}
