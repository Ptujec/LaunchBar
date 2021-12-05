/* 
Timezones for LaunchBar by Christian Bender @Ptujec

Datasources: 
- https://github.com/dmfilipenko/timezones.json/blob/master/timezones.json
- https://github.com/dr5hn/countries-states-cities-database
- https://github.com/kevinroberts/city-timezones
- https://github.com/moment/moment-timezone/tree/bf1de5d6a7cc6cb493d90b021fb2c0ac777c93eb


Documentation: 
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
*/

function run(argument) {

    if (argument == undefined) {

        if (Action.preferences.favorites == undefined || Action.preferences.favorites == '') {
            if (Action.preferences.favoritesBackup != undefined) {
                var responseCheckURL = LaunchBar.alert('No Favorites found!', 'Do you want to restore your old Favorites?', 'Restore', 'Cancel');
                switch (responseCheckURL) {
                    case 0: // Restore
                        Action.preferences.favorites = Action.preferences.favoritesBackup
                        LaunchBar.alert('Done!')
                        break;
                    case 1: // Cancel
                        break;
                }
            } else {
                LaunchBar.alert('No Favorites found!', 'Press "space" to search for cities.\nThen press enter on a result for more options.')
            }
        } else {
            var cData = Action.preferences.favorites
            var cities = []
            for (var i = 0; i < cData.length; i++) {
                var city = cData[i].city
                var country = cData[i].country
                var province = cData[i].province
                var tz = cData[i].timezone

                if (province != '') {
                    var localeInfo = province + ', ' + country
                } else {
                    var localeInfo = country
                }

                if (cData[i].state_ansi != undefined) {
                    var mapsURL = 'https://maps.apple.com/?address=' + city + ',%20' + cData[i].state_ansi
                } else {
                    var mapsURL = 'https://maps.apple.com/?address=' + city + ',%20' + cData[i].country
                }

                try {
                    var date = LaunchBar.formatDate(new Date(), {
                        timeStyle: 'none',
                        dateStyle: 'long',
                        timeZone: tz
                    });

                    var time = LaunchBar.formatDate(new Date(), {
                        timeStyle: 'short',
                        dateStyle: 'none',
                        timeZone: tz
                    });

                    var hour = time.split(':')[0]

                    // Convert to 24 hour format
                    if (time.toLowerCase().includes('pm')) {
                        hour = hour + 12
                    }

                    if (hour > 7 && hour < 21) {
                        var icon = 'dayTemplate'
                    } else {
                        var icon = 'nightTemplate'
                    }

                    cities.push({
                        title: time + ', ' + date,
                        subtitle: localeInfo + ', TZ: ' + tz,
                        badge: city,
                        icon: icon,
                        action: 'favOptions',
                        actionArgument: mapsURL + '|' + city + '|' + JSON.stringify(cData[i])
                    })
                } catch (error) {
                    // 
                }
            }
            cities.sort(function (a, b) {
                return a.badge > b.badge;
            });
            return cities;
        }
    } else {

        if (argument != '' && argument != ' ') {

            var cData = File.readJSON('~/Library/Application Support/LaunchBar/Actions/Timezones.lbaction/Contents/Resources/cities.json');

            var cities = []
            // var provinces = []

            for (var i = 0; i < cData.length; i++) {
                var city = cData[i].city

                if (city.toLowerCase().includes(argument.toLowerCase())) {
                    var country = cData[i].country
                    var province = cData[i].province

                    var tz = cData[i].timezone

                    if (province != '') {
                        var localeInfo = province + ', ' + country
                    } else {
                        var localeInfo = country
                    }


                    if (cData[i].state_ansi != undefined) {
                        var mapsURL = 'https://maps.apple.com/?address=' + city + ',%20' + cData[i].state_ansi
                    } else {
                        var mapsURL = 'https://maps.apple.com/?address=' + city + ',%20' + cData[i].country
                    }

                    try {
                        var date = LaunchBar.formatDate(new Date(), {
                            timeStyle: 'none',
                            dateStyle: 'long',
                            timeZone: tz
                        });

                        var time = LaunchBar.formatDate(new Date(), {
                            timeStyle: 'short',
                            dateStyle: 'none',
                            timeZone: tz
                        });

                        var hour = time.split(':')[0]

                        // Convert to 24 hour format
                        if (time.toLowerCase().includes('pm')) {
                            hour = hour + 12
                        }

                        if (hour > 7 && hour < 21) {
                            var icon = 'dayTemplate'
                        } else {
                            var icon = 'nightTemplate'
                        }

                        cities.push({
                            title: time + ', ' + date,
                            subtitle: localeInfo + ', TZ: ' + tz,
                            badge: city,
                            icon: icon,
                            // url: mapsURL,
                            action: 'actionOptions',
                            actionArgument: mapsURL + '|' + city + '|' + JSON.stringify(cData[i])
                        })
                    } catch (error) {
                        // 
                    }
                }

                // if (province != '' && province.toLowerCase().includes(argument.toLowerCase())) {
                //     var tz = cData[i].timezone

                //     if (cData[i].state_ansi != undefined) {
                //         var mapsURL = 'https://maps.apple.com/?address=' + city + ',%20' + cData[i].state_ansi
                //     } else {
                //         var mapsURL = 'https://maps.apple.com/?address=' + city + ',%20' + cData[i].country
                //     }

                //     try {
                //         var date = LaunchBar.formatDate(new Date(), {
                //             timeStyle: 'none',
                //             dateStyle: 'long',
                //             timeZone: tz
                //         });

                //         var time = LaunchBar.formatDate(new Date(), {
                //             timeStyle: 'short',
                //             dateStyle: 'none',
                //             timeZone: tz
                //         });

                //         var hour = time.split(':')[0]

                //         // Convert to 24 hour format
                //         if (time.toLowerCase().includes('pm')) {
                //             hour = hour + 12
                //         }

                //         if (hour > 7 && hour < 21) {
                //             var icon = 'dayTemplate'
                //         } else {
                //             var icon = 'nightTemplate'
                //         }

                //         provinces.push({
                //             title: time + ', ' + date,
                //             subtitle: city + ', ' + country + ', TZ: ' + tz,
                //             badge: province,
                //             icon: icon,
                //             url: mapsURL
                //         })
                //         // break
                //     } catch (error) {
                //         // 
                //     }
                // }
            }
        }

        cities.sort(function (a, b) {
            return a.title > b.title;
        });

        return cities;
    }
}

function actionOptions(actionArgument) {
    // var sunsetData = HTTP.getJSON('https://api.sunrise-sunset.org/json?lat=' + cData[i].lat + '&lng=' + cData[i].lng)
    // var sunrise = sunsetData.data.results.sunrise
    // var sunset = sunsetData.data.results.sunset

    var a = actionArgument.split('|')

    var url = a[0]
    var city = a[1]
    var dataString = a[2]

    return [
        {
            title: 'Open "' + city + '" in Apple Maps',
            url: url,
            icon: 'com.apple.Maps'
        },
        {
            title: 'Mark "' + city + '" as Favorite',
            icon: 'pinTemplate',
            action: 'makeFav',
            actionArgument: dataString
        }
    ]
}

function makeFav(dataString) {
    var newFav = eval('[' + dataString + ']')
    var oldFavs = Action.preferences.favorites

    if (oldFavs != '') {
        var favs = oldFavs.concat(newFav)
    } else {
        var favs = newFav
    }
    Action.preferences.favorites = favs
}

function favOptions(actionArgument) {
    var a = actionArgument.split('|')

    var url = a[0]
    var city = a[1]
    var dataString = a[2]

    return [
        {
            title: 'Open "' + city + '" in Apple Maps',
            url: url,
            icon: 'com.apple.Maps'
        },
        {
            title: 'Remove "' + city + '" from Favorites',
            icon: 'brushTemplate',
            action: 'removeFav',
            actionArgument: dataString
        },
        {
            title: 'Remove all!',
            icon: 'brushTemplate',
            action: 'removeAll'
        }
    ]
}

function removeFav(dataString) {
    var oldFavs = Action.preferences.favorites
    var oldFavsString = JSON.stringify(oldFavs)

    var favs = oldFavsString.replace(dataString, '')
    favs = favs
        .replace(/\[\,/, '[')
        .replace(/\,\,/, ',')
        .replace(/\,\]/, ']')

    Action.preferences.favorites = eval(favs)
    // LaunchBar.executeAppleScript('delay 0.1',
    //     'tell application "LaunchBar" to perform action "Timezones by City"')
}

function removeAll() {
    // Frage reinmachen: Sicher?
    Action.preferences.favoritesBackup = Action.preferences.favorites
    Action.preferences.favorites = ''
}