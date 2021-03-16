// 2021-03-16 Ptujec

function runWithPaths(path) {
    // get file name with extention from path
    var docTitle = path.toString().replace(/\/Users\/.+\/Documents\//g, '');
    var eDocTitle = encodeURIComponent(docTitle)
    
    // Path to Mindnode URI Scheme
    var uriScheme = 'ia-writer://open?path=' + eDocTitle;

    // Markdown Link
    var mdLink = '[' + docTitle + '](' + uriScheme + ')'

    if (LaunchBar.options.alternateKey) {
        LaunchBar.setClipboardString(uriScheme)
        LaunchBar.paste(uriScheme)

    } else if (LaunchBar.options.commandKey){
        return uriScheme
    } else {
        LaunchBar.setClipboardString(mdLink)
        LaunchBar.paste(mdLink)
    }
}