// LaunchBar Action Script

// Date Infos:
// https://stackoverflow.com/a/3818198

// How to interpret argument as number:
// https://www.w3schools.com/jsref/jsref_parseint.asp

// Paste String with Launchbar:
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

// Parsing ISO 8601 date in Javascript:
// https://stackoverflow.com/a/22914738/15774924 
// see also NBA action

// Get next date from weekday in JavaScript:
// https://stackoverflow.com/questions/1579010/get-next-date-from-weekday-in-javascript
// https://stackoverflow.com/a/43624637/15774924 (best answer)


// https://codereview.stackexchange.com/questions/33527/find-next-occurring-friday-or-any-dayofweek


function run(argument) {
    if (argument == undefined) {
        // Return current date
        var date = new Date();

        var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]
        // return [ dateString ];
        LaunchBar.paste(dateString);

    } else {
        // Date with offset (either number … or an upcoming day of the week)

        var checkNum = parseInt(argument)

        if (!isNaN(checkNum)) {
            // Number offset
            var date = new Date();

            // Add or subtrackt days
            var offsetNumber = parseInt(argument);
            date.setDate(date.getDate() + offsetNumber);

            var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                .toISOString()
                .split('T')[0]

        } else {
            // day of the week

            var weekdaysEN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

            var weekdaysDE = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag']

            var dayOfWeek = '';
            var i = 0;
            for (i = 0; i < weekdaysEN.length; i++) {
                var dayOfWeekEN = weekdaysEN[i];
                if (dayOfWeekEN.startsWith(argument.toLowerCase())) {
                    dayOfWeek = i
                }
            }

            if (dayOfWeek == '') {
                var i = 0;
                for (i = 0; i < weekdaysDE.length; i++) {
                    var dayOfWeekDE = weekdaysDE[i];
                    if (dayOfWeekDE.startsWith(argument.toLowerCase())) {
                        dayOfWeek = i
                    }
                }
            }

            var date = new Date();

            var dayOfWeekDate = new Date(date.getTime());
            // dayOfWeekDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
            dayOfWeekDate.setDate(date.getDate() + (dayOfWeek - 1 - date.getDay() + 7) % 7 + 1);
            
            var dateString = new Date(dayOfWeekDate.getTime() - (dayOfWeekDate.getTimezoneOffset() * 60000))
                .toISOString()
                .split('T')[0]

        }
        LaunchBar.paste(dateString);
    }
}