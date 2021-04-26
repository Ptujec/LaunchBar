// Spotifeed Action by @Ptujec 2021-04-26
// https://spotifeed.timdorr.com
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

const sFeedBase = 'https://spotifeed.timdorr.com/'

function run(argument) {
    if (argument == undefined) {
        var sURL = LaunchBar.executeAppleScriptFile('./getShowURL.applescript');
        var name = LaunchBar.executeAppleScript('tell application "Safari" to set _name to name of front document');
        name = name.trim().replace(/ \| Podcast on Spotify/, '')
        var notiString = 'The feed of "' + name + '"'
    } else {
        var sURL = argument
    }

    if (sURL.indexOf('http') >= 0) {
        // replace addtional stuff after the ID in the Spotify URL 
        sURL = sURL.replace(/\?.*/, '')

        // match the ID
        var match = sURL.match(/(show\/)(.*)/)
        var sID = match[2]

        // create Feed 
        var pFeed = sFeedBase + sID
        LaunchBar.setClipboardString(pFeed);

        if (name == undefined) {
            var notiString = pFeed
        }

        LaunchBar.displayNotification({
            title: 'RSS feed successfully copied!',
            string: notiString + ' has been copied to your clipboard. (Click to open.)',
            url: pFeed
        });

    } else {
        LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
        LaunchBar.alert(sURL)
    }
}