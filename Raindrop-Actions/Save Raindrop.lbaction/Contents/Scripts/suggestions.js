/* 
Save Raindrop - Raindrop.io Action for LaunchBar - Suggestions (Tags)

Documentation:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.raindrop.io
*/

const apiKey = File.readText('~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.SaveRaindrop/api_key.txt')
    .trim()

function runWithString(string) {
    var rData = HTTP.getJSON(encodeURI('https://api.raindrop.io/rest/v1/tags/0?access_token=' + apiKey))

    var first = [];
    var second = [];
    for (var iData = 0; iData < rData.data.items.length; iData++) {
        var suggestion = rData.data.items[iData]._id

        testString = string
            .split(',')

        var t = testString[testString.length - 1]
            .trim()

        if (suggestion.toLowerCase().includes(t.toLowerCase())) {
            if (suggestion.toLowerCase().startsWith(t.toLowerCase())) {
                if (testString.length >= 2) {
                    s = string.split(",")
                    s.pop().toString()
                    var title = s + ', ' + suggestion
                    var icon = 'tagsTemplate'
                } else {
                    var title = suggestion
                    var icon = 'tagTemplate'
                }

                first.push({
                    'title': title,
                    'icon': icon
                });
            } else {
                if (testString.length >= 2) {
                    s = string.split(",")
                    s.pop().toString()
                    var title = s + ', ' + suggestion
                    var icon = 'tagsTemplate'
                } else {
                    var title = suggestion
                    var icon = 'tagTemplate'
                }

                second.push({
                    'title': title,
                    'icon': icon
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