/*
    List CUPS print jobs by @Ptujec

    Note to self: Delete print jobs in Brave Browser. 
        Click delete. 
        Click the link. 
        Enter "pi" and "raspberry"
*/

// Replace the IP below with IP of your printserver 
const IP = '192.168.1.190'

function run() {
    if (LaunchBar.options.commandKey) {
        LaunchBar.hide()
        LaunchBar.openURL('http://' + IP + ':631/jobs/')
    } else if (LaunchBar.options.alternateKey) {
        LaunchBar.hide()
        LaunchBar.openURL('http://' + IP + ':631/jobs?which_jobs=completed')
    } else {
        var parseURL = 'http://' + IP + ':631/jobs/'

        var cupsData = HTTP.loadRequest(parseURL, {
            timeout: 5.0,
            method: 'GET',
            resultType: 'text'
        });

        try {
            var table = cupsData.data
                .toString()
                .match(/<table.*>(.|\n)*?<\/table>/gi)
        } catch (error) { }

        if (table == null) {

            if (LaunchBar.currentLocale == 'de') {    
                var title = 'Kein aktiver Auftrag'
                var sub = '⏎ = Beendete Auträge anzeigen'
            } else {
                var title = 'No active print jobs'
                var sub = '⏎ = View completed print jobs'
            }
                
            return [{
                title: title,
                subtitle: sub,
                icon: 'Template.png',
                url: 'http://' + IP + ':631/jobs?which_jobs=completed'
            }]
        } else {
            table = table
                .toString()
                .replace(/<br>/gi, ' ')
                .replace(/<form action.*>*?<\/form>/gi, '')

            var head = table
                .match(/<th>(.|\n)*?<\/th>/gi)
                .toString()
                .replace(/(<([^>]+)>)/gi, '')
                .split(',')

            var rows = table
                .match(/<tr \w+.*>(.|\n)*?<\/tr>/gi)

            var results = []
            for (var i = 0; i < rows.length; i++) {

                var row = rows[i]
                    .match(/<td>(.|\n)*?<\/td>/gi)
                    .toString()
                    .replace(/<\/td>/gi, '\n<\/td>')
                    .replace(/(<([^>]+)>)/gi, '')
                    .replace(/&nbsp;/g, '')
                    .replace(/\n+/g, '')
                    .replace(/\, /g, ': ')
                    .replace(/"/g, '\"')
                    .split(',')

                results.push(
                    {
                        // ID = row[0], size = row[3], pages = row[4]/head[4], status = row[5]
                        'title': row[0] + ' (' + row[3] + ', ' + row[4] + ' ' + head[4] + ')',
                        'subtitle': 'Status: ' + row[5].match(/\".*\"/).toString(),
                        'icon': 'Template',
                        'url': 'http://' + IP + ':631/jobs/'
                    }
                );
            }
            return results;
        }
    }
}