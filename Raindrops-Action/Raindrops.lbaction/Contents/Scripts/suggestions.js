/* 
Raindrops - Raindrop.io Action for LaunchBar
Suggestions (Tags)

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io
*/

const apiKey = File.readText('~/Library/Application Support/LaunchBar/Actions/Raindrops.lbaction/Contents/Resources/api_key.txt')
    .trim()

function runWithString(string) {
    var rData = HTTP.getJSON(encodeURI('https://api.raindrop.io/rest/v1/tags/-1?access_token=' + apiKey))
    var first = [];
    var second = [];
    for (var i = 0; i < rData.data.items.length; i++) {
        var suggestion = rData.data.items[i]._id
        if (suggestion.toLowerCase().includes(string.toLowerCase())) {
            if (suggestion.toLowerCase().startsWith(string.toLowerCase())) {
                first.push({
                    'title': suggestion,
                    'icon': 'tagTemplate'
                });
            } else {
                second.push({
                    'title': suggestion,
                    'icon': 'tagTemplate'
                });
            }
        }
    }
    first.sort(function (a, b) {
        return a.title > b.title;
    });
    second.sort(function (a, b) {
        return a.title > b.title;
    });
    var suggestions = first.concat(second)
    return suggestions;
}