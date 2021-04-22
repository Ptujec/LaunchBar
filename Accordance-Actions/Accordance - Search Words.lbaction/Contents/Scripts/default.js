// 2021-04-22 @Ptujec 
// http://www.accordancebible.com/Accordance-1043-Is-Automagical/

function run(argument) {
    if (LaunchBar.options.shiftKey) {
        // This will be called when holding shift ⇧ as you launch the action
        LaunchBar.openURL('accord://search/ESVS?' + encodeURIComponent(argument))
    } else if (LaunchBar.options.alternateKey) {
        // You can add another URL Scheme her that you can call when holding the option ⌥ key as you launch the action
    } else if (LaunchBar.options.commandKey) {
        // You can replace the SSP° with an alternative translation of your choice. This will be called when holding command ⌘ as you launch the action
        LaunchBar.openURL('accord://search/' + encodeURIComponent('SSP°') + '?' + encodeURIComponent(argument))
    } else {
        LaunchBar.openURL('accord://search/' + encodeURIComponent(argument))
    }
}