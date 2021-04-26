// Spotifeed Action by @Ptujec 2021-04-26
// https://spotifeed.timdorr.com
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

const sFeedBase = 'https://spotifeed.timdorr.com/'

function run(argument) {
    if (argument == undefined) {
        // const sURL = 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk?si=rNT4wXriSoaOcq_qwoP1gg'
        var sURL = LaunchBar.executeAppleScriptFile('./getShowURL.applescript');
        var name = LaunchBar.executeAppleScript('tell application "Safari" to set _name to name of front document');
        name = name.trim().replace(/ \| Podcast on Spotify/,'') 
        var notiString = 'The feed of "' + name +'"'
    } else {
        var sURL = argument
    }

    // replace addtional stuff after the ID in the Spotify URL 
    sURL = sURL.replace(/\?.*/,'')

    // match the ID
    var match = sURL.match(/(show\/)(.*)/)
    var sID = match[2]

    // create Feed 
    var pFeed = sFeedBase + sID
    LaunchBar.setClipboardString(pFeed);

    if (name == undefined){
        var notiString = pFeed   
    }

    LaunchBar.displayNotification({
        title: 'RSS feed successfully copied!',
        string: notiString + ' has been copied to your clipboard. (Click to open.)',
        url: pFeed 
    });
}