/*
Translation Suggestion
*/

function runWithString(string) {

    var t = string
    var texts = File.getDirectoryContents('~/Library/Application Support/Accordance/Modules/Texts')

    var result = []
    for (var i = 0; i < texts.length; i++) {
        var text = texts[i].split('.')
        text = text[0]
        if (text.toLowerCase().startsWith(t)) {
            result.push({
                'title': text + ':',
                'icon' : 'bookTemplate',
                'badge': 'translation'
            })
        }
    }
    return result
}
