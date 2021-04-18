// 2021-03-16 Ptujec

function runWithPaths(path) {
    // get file name with extention from path
    var docTitle = path.toString().replace(/\/Users\/.+\/Documents\//g, '');
    var eDocTitle = encodeURIComponent(docTitle)
    
    // Path to Mindnode URI Scheme
    var urlScheme = 'mindnode://open?name=' + eDocTitle;

    // Markdown Link
    var mdLink = '[' + docTitle + '](' + urlScheme + ')'

    if (LaunchBar.options.alternateKey) {
        LaunchBar.paste(mdLink)
        LaunchBar.setClipboardString(mdLink)
    } else if (LaunchBar.options.shiftKey) {
        LaunchBar.executeAppleScriptFile('./rtf.applescript', urlScheme, docTitle);        
    } else if (LaunchBar.options.commandKey) {
        return urlScheme
    } else {
        LaunchBar.paste(urlScheme)
        LaunchBar.setClipboardString(urlScheme)
    }
}