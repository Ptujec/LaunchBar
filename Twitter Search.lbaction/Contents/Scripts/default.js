// LaunchBar Action Script

function run(argument) {
    LaunchBar.openURL('twitter://search?query=' + encodeURIComponent(argument));
}