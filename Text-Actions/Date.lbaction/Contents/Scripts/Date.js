// LaunchBar Action Script

// Date Infos:
// https://stackoverflow.com/a/3818198

// How to interpret argument as number:
// https://www.w3schools.com/jsref/jsref_parseint.asp

// Paste String with Launchbar:
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

function run(argument) {
    if (argument == undefined) {
        // Return current date
        var date = new Date();
         
        var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
            .toISOString()
            .split('T')[0]
        // return [ dateString ];
        LaunchBar.paste(dateString);

    } else {
        // Return current date with offset
        var date = new Date();

        // Add or subtrackt days
        var offsetNumber = parseInt(argument);
        date.setDate(date.getDate() + offsetNumber);
        
        var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000 ))
            .toISOString()
            .split('T')[0]
        // return [ dateString ];
        LaunchBar.paste(dateString);
    }
}