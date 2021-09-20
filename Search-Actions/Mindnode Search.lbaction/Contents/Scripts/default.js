/* 
Mindnode Search 
by Ptujec 
2021-07-12
*/

function run(argument) {

    argument = argument
        .toLowerCase()
        .trim()

    if (LaunchBar.options.commandKey) {
        var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', '/Users/hischa/Library/Mobile\ Documents/W6L39UYL6Z\~com\~mindnode\~MindNode/Documents', '-name', argument)
            .split('\n')
    } else if (LaunchBar.options.shiftKey) {
        LaunchBar.performAction('Run Terminal Command', 'grep -ri ' + argument + ' /Users/hischa/Library/Mobile\\ Documents/W6L39UYL6Z\~com\~mindnode\~MindNode/Documents')
        return
    } else {
        var output = LaunchBar.execute('/usr/bin/mdfind', '-onlyin', '/Users/hischa/Library/Mobile\ Documents/W6L39UYL6Z\~com\~mindnode\~MindNode/Documents', argument)
            .split('\n')
    }

    if (output == '') {
        return [{
            'title': 'No result',
            'icon': 'com.ideasoncanvas.mindnode.macos'
        }]
    } else {
        var results = []
        for (var i = 0; i < output.length; i++) {
            var result = output[i]
            if (result != '') {
                var path = result
                var title = File.displayName(path)

                if (LaunchBar.options.commandKey) {
                    results.push({
                        'title': title,
                        'path': path
                    })

                } else {
                    try {
                        var content = File.readPlist(path + '/contents.xml')
                        content = JSON.stringify(content)

                        // var regex = new RegExp(argument + '.*?<', 'gi')
                        var regex = new RegExp('([a-zčšžäüöß]*\ )*?' + argument + '.*?<', 'gi')

                        var sub = content.match(regex)
                            .toString()
                            .replace(/</g, '')
                            .trim()
                    } catch (error) {
                    }

                    if (sub != null) {
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