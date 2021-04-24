// 2021-04-22 @Ptujec 
// http://www.accordancebible.com/Accordance-1043-Is-Automagical/
// http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)

function run(argument) {
    // A = <AND>, O = <OR>, N = <NOT>
    argument = argument.replace(/\sO\s/g, '<OR>').replace(/\sA\s/g, '<AND>').replace(/\sN\s/g, '<NOT>')
    if (LaunchBar.options.commandKey) {
        // LaunchBar.openURL('accord://search/' + encodeURIComponent(argument))
        LaunchBar.openURL('accord://research/[Alle];?' + encodeURIComponent(argument))
    } else if (LaunchBar.options.alternateKey) {
        argument = argument.replace(/\s/g, '<OR>')
        LaunchBar.openURL('accord://research/' + encodeURIComponent(argument))
    } else {
        argument = argument.replace(/\s/g, '<AND>')
        // "[Alle];?" is only in the URL to make it work with German local … but it works with English aswell
        LaunchBar.openURL('accord://research/[Alle];?' + encodeURIComponent(argument))
    }
}