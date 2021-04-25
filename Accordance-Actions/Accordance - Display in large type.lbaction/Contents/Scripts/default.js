// LaunchBar Action Script
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
// https://stackoverflow.com/questions/17895039/how-to-insert-line-break-after-every-80-characters/17895095

// http://jsfiddle.net/jahroy/Rwr7q/18/
//
// Folds a string at a specified length, optionally attempting
// to insert newlines after whitespace characters.
//
// s          -  input string
// n          -  number of chars at which to separate lines
// useSpaces  -  if true, attempt to insert newlines at whitespace
// a          -  array used to build result
//
// Returns an array of strings that are no longer than n
// characters long.  If a is specified as an array, the lines 
// found in s will be pushed onto the end of a. 
//
// If s is huge and n is very small, this metho will have
// problems... StackOverflow.

function fold(s, n, a) {
    a = a || [];
    if (s.length <= n) {
        a.push(s);
        return a;
    }
    var line = s.substring(0, n);
    var lastSpaceRgx = /\s(?!.*\s)/;
    var idx = line.search(lastSpaceRgx);
    var nextIdx = n;
    if (idx > 0) {
        line = line.substring(0, idx);
        nextIdx = idx;
    }
    a.push(line);
    return fold(s.substring(nextIdx), n, a);
}

function run(argument) {

    var scripture = LaunchBar.executeAppleScriptFile('./getScripture.applescript', argument);

    var arrayOfLines = fold(scripture, 70);
    scripture = arrayOfLines.join('\n').replace(/\n\s/g, '\n');
    
    if (scripture.length > 1050) {
        // truncate 
        scripture = scripture.substring(0, 1049) + "…";
    }

    // Uncomment if you are using this a lot in Fullscreen mode
    // LaunchBar.executeAppleScript('tell application "Mission Control" to launch');

    LaunchBar.displayInLargeType({
        title: argument,
        string: scripture
    });

}