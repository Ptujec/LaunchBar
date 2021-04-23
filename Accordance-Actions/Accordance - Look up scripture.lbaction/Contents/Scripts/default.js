// 2021-04-22 @Ptujec 
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
// http://www.accordancebible.com/Accordance-1043-Is-Automagical/
// http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)
// https://stackoverflow.com/a/13012698 (if contains statement)

function run(argument) {
    // next line is only relevant for Slovene input … maybe you can use it for another language … you will need to uncomment it
    // argument = LaunchBar.executeAppleScriptFile('./sloTitles.applescript', argument);
    
    argument = argument.trim()
    
    if (LaunchBar.options.commandKey) {
        LaunchBar.openURL('accord://read/' + encodeURIComponent(argument))
    } else {
        // UI language check
        var lang = LaunchBar.executeAppleScriptFile('./langCheck.applescript');
        if (lang.indexOf('de') >= 0) {
            var allTextSetting = '[Alle_Texte];Verses?'
        } else {
            var allTextSetting = '[All_Texts];Verses?'
        }

        LaunchBar.openURL('accord://research/' + allTextSetting + encodeURIComponent(argument))
    }
}