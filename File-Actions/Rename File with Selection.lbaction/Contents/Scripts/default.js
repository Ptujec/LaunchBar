/* 
Rename File with Selection

https://www.satimage.fr/software/en/smile/external_codes/file_paths.html
https://themacbeginner.com/rename-files-folders-mac-os-x-using-terminal/
https://developer.obdev.at/launchbar-developer-documentation/#/javascript-file

*/

function run(argument) {
    argument = argument.trim()

    var output = LaunchBar.executeAppleScript(
        'tell application (path to frontmost application as text)',
        'set _path to file of document of window 1',
        'set _path to POSIX path of _path',
        'end tell')
        .trim()

    var oldFile = output
        .trim()

    var oldName = File.displayName(output)
    var ext = oldName.split('.')[1]

    var re = new RegExp(oldName)
    var newFile = output.replace(re, argument + '.' + ext)
        .trim()

    LaunchBar.execute('/bin/mv', oldFile, newFile)
}