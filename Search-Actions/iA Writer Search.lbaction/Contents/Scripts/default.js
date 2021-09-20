/* 
iA Writer Search 
by Ptujec 
2021-07-13
*/

function run(argument) {
    argument = argument
        .toLowerCase()
        .trim()

    if (LaunchBar.options.commandKey) {
        // Dateiname 
        var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', '/Users/hischa/Library/Mobile\ Documents/27N4MQEA55~pro~writer/Documents', '-name', argument)
            .split('\n')
    } else if (LaunchBar.options.shiftKey) {
        LaunchBar.performAction('Run Terminal Command', 'grep -ri ' + argument + ' /Users/hischa/Library/Mobile\\ Documents/27N4MQEA55~pro~writer/Documents')
        return
    } else {
        var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', '/Users/hischa/Library/Mobile\ Documents/27N4MQEA55~pro~writer/Documents', argument)
            .split('\n')
    }

    // LaunchBar.alert(output.length)
    // return

    if (output == '') {
        return [{
            'title': 'Keine Treffer',
            'icon': 'pro.writer.mac'
        }]
    } else {
        var results = []
        for (var i = 0; i < output.length; i++) {
            var result = output[i]
            if (result != '' && !File.isDirectory(result)) {
                var path = result

                if (LaunchBar.options.commandKey) {
                    results.push({
                        'path': path
                    })

                } else {

                    var regex = new RegExp('.*' + argument + '.*', 'gi')
                    try {
                        var sub = File.readText(path)
                            .match(regex)
                    } catch (error) {
                    }

                    if (sub != null) {
                        sub = sub
                            .toString()
                            .replace(/\n/g, ' ')
                            .trim()

                        results.push({
                            'subtitle': sub,
                            'path': path
                        })
                    } else {
                        results.push({
                            'path': path
                        })
                    }
                }
            }
        }
        results.sort(function (a, b) {
            return a.title > b.title;
        });
        return results
    }
}