// 2021-04-22 @Ptujec 
// http://www.accordancebible.com/Accordance-1043-Is-Automagical/
// http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)

function run(argument) {
    // UI language check
    var aPlist = File.readPlist('~/Library/Preferences/com.OakTree.Accordance.plist')
    var lang = aPlist.AppleLanguages

    if (lang != undefined) {
        lang = lang
            .toString()
    } else {
        var gPlist = File.readPlist('/Library/Preferences/.GlobalPreferences.plist')
        lang = gPlist.AppleLanguages
            .toString()
    }

    if (lang.startsWith('de')) {
        var allSetting = '[Alle];?'
    } else {
        var allSetting = '[All];?'
    }

    // Search options:
    // A = <AND>, O = <OR>, N = <NOT>
    argument = argument.replace(/\sO\s/g, '<OR>').replace(/\sA\s/g, '<AND>').replace(/\sN\s/g, '<NOT>')
    if (LaunchBar.options.commandKey) {
        LaunchBar.openURL('accord://research/' + allSetting + encodeURIComponent(argument))
    } else if (LaunchBar.options.alternateKey) {
        argument = argument.replace(/\s/g, '<OR>')
        LaunchBar.openURL('accord://research/' + allSetting + encodeURIComponent(argument))
    } else {
        argument = argument.replace(/\s/g, '<AND>')
        LaunchBar.openURL('accord://research/' + allSetting + encodeURIComponent(argument))
    }
}