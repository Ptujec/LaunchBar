// Spotifeed Action - Ptujec 2021-04-26

// https://spotifeed.timdorr.com
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
// https://stackoverflow.com/questions/33208299/launch-podcast-app-with-url-scheme?newreg=760cc419999e457d822ecca8f94797d5
// https://overcast.fm/podcasterinfo

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

        // Create open Podcast Feed URL for cmd-enter or notification
        var podApp = LaunchBar.executeAppleScriptFile('./getPodApp.applescript');
        podApp = podApp.trim()

        if (podApp.indexOf('Overcast') >= 0) {
            var openURL = 'overcast://x-callback-url/add?url=' + pFeed
        } else if (podApp.indexOf('Podcasts') >= 0) {
            var openURL = pFeed.replace(/https/, 'podcast')    
        } 
    
        if (name == undefined) {
            var notiString = pFeed
        }
        
        if (openURL == undefined) {
            var openURL = pFeed
            var clickString = '(Click to open.)'
        } else {
            var clickString = '\nClick to open in ' + podApp + '!'
        }
        
        if (LaunchBar.options.commandKey) {
            LaunchBar.openURL(openURL)
        } else {
      
            LaunchBar.displayNotification({
                title: 'RSS feed successfully copied!',
                string: notiString + ' has been copied to your clipboard. ' + clickString,
                url: openURL
            });
        }

    } else {
        // Error message when no valid Spotify URL is found
        LaunchBar.alert(sURL)
    }
}