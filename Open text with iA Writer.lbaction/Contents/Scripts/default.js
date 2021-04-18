// https://ia.net/writer/support/general/urlschemes

function run(argument) {
        LaunchBar.openURL('ia-writer://new?text=' + encodeURIComponent(argument));
}