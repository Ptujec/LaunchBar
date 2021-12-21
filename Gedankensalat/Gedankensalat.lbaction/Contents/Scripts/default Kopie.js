// Gedankensalat
// iA Writer oder Mindmap?
// https://ia.net/writer/support/general/urlschemes

function run(argument) {
    if (argument == undefined) {
        // Launch
        // LaunchBar.openURL(File.fileURLForPath('~/Library/Mobile Documents/27N4MQEA55~pro~writer/Documents/Gedankensalat.txt'));
        LaunchBar.openURL('ia-writer://open?path=/Locations/iCloud/Gedankensalat.txt')
    } else {
        // Entry

        var timestamp = new Date()

        var date = new Date(timestamp.getTime() - (timestamp.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]

        var time = LaunchBar.formatDate(timestamp, {
            timeStyle: 'short',
            dateStyle: 'none'
        });

        var medTime = LaunchBar.formatDate(timestamp, {
            timeStyle: 'medium',
            dateStyle: 'none'
        });


        timestamp = date + ', ' + time + ':'

        var text = File.readText('~/Library/Mobile Documents/27N4MQEA55~pro~writer/Documents/Gedankensalat.txt');

        // if (text.includes(timestamp)) {
        //     var lE = text
        //         .split(timestamp)[1]
        //         .trim()

        //     var lines = lE
        //         .split('\n')

        //     if (!lines[0].startsWith('-')) {
        //         var rE = ""
        //         for (var i = 0; i < lines.length; i++) {
        //             var newLine = '- ' + lines[i]
        //             rE = rE.concat('\n' + newLine)
        //         }
        //         text = text.replace(lE, rE.trim())
        //     }

        //     var newEntry = text + '\n- ' + argument
        // } else {
        //     var newEntry = text + '\n\n' + timestamp + '\n' + argument
        // }

        if (text.includes(timestamp)) {
            timestamp = date + ', ' + medTime + ':'
        } 

        var newEntry = text + '\n\n' + timestamp + '\n' + argument

        File.writeText(newEntry, '~/Library/Mobile Documents/27N4MQEA55~pro~writer/Documents/Gedankensalat.txt');
    }
}
