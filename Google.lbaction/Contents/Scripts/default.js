// The 'run' function is called by LaunchBar when the user opens the action.
function run(argument) {
    // Return a single item that describes the argument
    if (LaunchBar.options.shiftKey) {
        LaunchBar.paste([argument])
    } else if (LaunchBar.options.commandKey) {
        return [argument];
    } else if (LaunchBar.options.alternateKey) {
        if (argument != undefined && argument.length > 0) {
            // Googles Feeling Lucky doesn't work anymore so I am using DuckDuckGo for this part
            LaunchBar.openURL('https://duckduckgo.com/?q=!ducky+' + encodeURIComponent(argument));
        } else {
            // No argument passed, just open the website:
            LaunchBar.openURL('https://www.google.com');
        }
    } else {
        if (argument != undefined && argument.length > 0) {
            // If there is an argument, search for it:
            LaunchBar.openURL('http://www.google.com/search?q=' + encodeURIComponent(argument));
        } else {
            // No argument passed, just open the website:
            LaunchBar.openURL('https://www.google.com');
        }
    }
}