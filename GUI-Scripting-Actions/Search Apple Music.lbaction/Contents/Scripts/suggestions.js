// Copyright (c) 2014 Manuel Weiel
// http://manuel.weiel.eu
//
// Updated URL https://stackoverflow.com/questions/11275365/youtube-api-search-auto-complete

function runWithString(argument)
{
	// This is no official api. This could stop working any time...
    var result = HTTP.get('https://clients1.google.com/complete/search?client=youtube&gs_ri=youtube&ds=yt&q=' + encodeURIComponent(argument), 3);

    if (result == undefined) {
        LaunchBar.log('HTTP.getJSON() returned undefined');
        return [];
    }
    if (result.error != undefined) {
        LaunchBar.log('Error in HTTP request: ' + result.error);
        return [];
    }
	
	var json = eval(result.data.replace('window.google.ac.h', ''))
	
	LaunchBar.log(json);
	LaunchBar.log(json[1][0][0])
	
	var suggestionsResult = json[1]

    try {
        var suggestions = [];
		var i = 0;
        for (i = 0; i < suggestionsResult.length; i++) {
			var suggestion = suggestionsResult[i][0];
            suggestions.push({
                             'title' : suggestion,
                             'icon' : 'com.apple.Music'
                             });
        }
        return suggestions;
    } catch (exception) {
        LaunchBar.log('Exception while parsing result: ' + exception);
        return [];
    }
}
