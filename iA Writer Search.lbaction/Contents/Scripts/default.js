// https://ia.net/writer/support/general/urlschemes

function run(argument) {
    if (argument == undefined) {
        LaunchBar.openURL('ia-writer://quick-search');
    } else {
        LaunchBar.openURL('ia-writer://quick-search?query=' + encodeURIComponent(argument));
    }
}
