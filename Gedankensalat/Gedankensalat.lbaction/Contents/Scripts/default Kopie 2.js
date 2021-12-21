// Gedankensalat
// iA Writer oder Mindmap?
// https://ia.net/writer/support/general/urlschemes

function run(argument) {
    if (argument == undefined) {
        // Open 
        if (Action.preferences.gedankensalat == undefined) {
            LaunchBar.alert('Nothing there. Start the dump by pressing space')
        } else {
            var gedankensalat = Action.preferences.gedankensalat
            LaunchBar.alert(gedankensalat.length)
        }
        
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


        timestamp = date + ', ' + time

        if (Action.preferences.gedankensalat == undefined) {
            Action.preferences.gedankensalat = [{
                timestamp : timestamp,
                entry : argument
            }]
                
        } else {
            var edankensalat = Action.preferences.gedankensalat


            LaunchBar.alert('hallo')
        }

        
        // text + '\n\n' + timestamp + '\n' + argument

    }
}
