/* 
Timezones for LaunchBar by Christian Bender @Ptujec

Datasources: 
- https://github.com/dmfilipenko/timezones.json/blob/master/timezones.json
- https://github.com/dr5hn/countries-states-cities-database
- https://github.com/kevinroberts/city-timezones (This is what I am currently using)
- https://github.com/moment/moment-timezone/tree/bf1de5d6a7cc6cb493d90b021fb2c0ac777c93eb


Documentation: 
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html

Usefull:
- https://timezone360.com/en/time-in/ for timezone name lookup
*/

function run(argument) {

    if (argument == undefined) {
        if (LaunchBar.options.alternateKey) {
            return [
                {
                    title: 'Set Day Time',
                    badge: 'Settings',
                    icon: 'gearTemplate',
                    action: 'setDayTimeOptions'
                }
            ]
        } else {
            var output = showFavs()
            return output;
        }
    } else {
        if (argument != '' && argument != ' ') {
            var cData = File.readJSON('~/Library/Application Support/LaunchBar/Actions/Timezones.lbaction/Contents/Resources/cities.json');

            var cities = []
            // var provinces = []

            for (var i = 0; i < cData.length; i++) {
                var city = cData[i].city

                if (city.toLowerCase().includes(argument.toLowerCase())) {
                    city = city
                        .replace(/\(.*\)/, '')
                        .trim()

                    var tz = cData[i].timezone
                    var country = cData[i].country
                    var province = cData[i].province
                    if (province != '') {
                        var localeInfo = province + ', ' + country
                    } else {
                        var localeInfo = country
                    }

                    var lat = cData[i].lat
                    var lng = cData[i].lng

                    if (cData[i].iso2 == 'US') {
                        var mapLocationInfo = province
                    } else {
                        var mapLocationInfo = country
                    }

                    var mapsURL = encodeURI(('https://maps.apple.com/?q=' + city + ',' + mapLocationInfo + '&near=' + lat + ',' + lng))

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

                        // Check for day time setting
                        if (Action.preferences.dayTime != undefined) {
                            var m = Action.preferences.dayTime.m
                            var e = Action.preferences.dayTime.e
                        } else {
                            var m = 8
                            var e = 21
                        }

                        if (hour >= m && hour < e) {
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
                            actionArgument: {
                                mapsURL: mapsURL,
                                city: city,
                                lat: lat,
                                lng: lng,
                                cData: cData[i]
                            }
                        })
                    } catch (error) {
                        // 
                    }
                }
            }
        }

        cities.sort(function (a, b) {
            return a.title > b.title;
        });

        return cities;
    }
}

function showFavs() {
    if (Action.preferences.favorites == undefined || Action.preferences.favorites == '') {
        if (Action.preferences.favoritesBackup != undefined) {
            var responseCheckURL = LaunchBar.alert('No Favorites found!', 'Do you want to restore your old Favorites?', 'Restore', 'Cancel');
            switch (responseCheckURL) {
                case 0: // Restore
                    Action.preferences.favorites = Action.preferences.favoritesBackup
                    // LaunchBar.alert('Done!')
                    var output = showFavs()
                    return output;
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
                .replace(/\(.*\)/, '')
                .trim()
            var tz = cData[i].timezone
            var country = cData[i].country
            var province = cData[i].province
            if (province != '') {
                var localeInfo = province + ', ' + country
            } else {
                var localeInfo = country
            }

            var lat = cData[i].lat
            var lng = cData[i].lng

            if (cData[i].iso2 == 'US') {
                var mapLocationInfo = province
            } else {
                var mapLocationInfo = country
            }

            var mapsURL = encodeURI(('https://maps.apple.com/?q=' + city + ',' + mapLocationInfo + '&near=' + lat + ',' + lng))

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

                // Check for day time setting
                if (Action.preferences.dayTime != undefined) {
                    var m = Action.preferences.dayTime.m
                    var e = Action.preferences.dayTime.e
                } else {
                    var m = 8
                    var e = 21
                }

                if (hour >= m && hour < e) {
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
                    actionArgument: {
                        mapsURL: mapsURL,
                        city: city,
                        lat: lat,
                        lng: lng,
                        cData: cData[i]
                    }
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
}

function actionOptions(a) {

    var url = a.mapsURL
    var city = a.city
    var cData = a.cData

    return [
        {
            title: 'Open "' + city + '" in Apple Maps',
            url: url,
            // icon: 'mapTemplate'
            icon: 'com.apple.Maps'
        }, {
            title: 'Mark "' + city + '" as Favorite',
            icon: 'favTemplate',
            action: 'makeFav',
            actionArgument: cData
        }
    ]
}

function makeFav(cData) {
    var oldFavs = Action.preferences.favorites

    if (oldFavs != '') {
        var favs = oldFavs.concat(cData)
    } else {
        var favs = cData
    }
    Action.preferences.favorites = favs
    var output = showFavs()
    return output;
}

function favOptions(a) {
    var url = a.mapsURL
    var city = a.city
    var cData = a.cData

    return [
        {
            title: 'Open "' + city + '" in Apple Maps',
            url: url,
            // icon: 'mapTemplate'
            icon: 'com.apple.Maps'
        }, {
            title: 'Remove "' + city + '" from Favorites',
            icon: 'unFavTemplate.png',
            action: 'removeFav',
            actionArgument: cData
        }, {
            title: 'Remove all Favorites',
            icon: 'unFavAllTemplate.png',
            action: 'removeAll'
        }
    ]
}

function removeFav(cData) {
    var fcData = Action.preferences.favorites

    var city = cData.city
    var tz = cData.timezone

    for (var i = 0; i < fcData.length; i++) {
        if (fcData[i].city == city && fcData[i].timezone == tz) {
            fcData.splice(i, 1)
            break
        }
    }
    Action.preferences.favorites = fcData
    var output = showFavs()
    return output;
}

function removeAll() {
    var responseCheckURL = LaunchBar.alert('Remove all Favorites', 'Do you want to remove all Favorites?', 'Yes', 'Cancel');
    switch (responseCheckURL) {
        case 0: // Remove all
            Action.preferences.favoritesBackup = Action.preferences.favorites
            Action.preferences.favorites = ''
            break;
        case 1: // Cancel
            var output = showFavs()
            return output;
    }
}

function setDayTimeOptions() {
    return [
        {
            title: '6:00 - 21:00 (6 am - 9 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 6,
                'e': 21
            }
        }, {
            title: '6:00 - 22:00 (6 am - 10 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 6,
                'e': 22
            }
        }, {
            title: '7:00 - 21:00 (7 am - 9 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 7,
                'e': 21
            }
        }, {
            title: '7:00 - 22:00 (7 am - 10 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 7,
                'e': 22
            }
        }, {
            title: '8:00 - 21:00 (8 am - 9 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 8,
                'e': 21
            }
        }, {
            title: '8:00 - 22:00 (8 am - 10 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 8,
                'e': 22
            }
        }, {
            title: '8:00 - 23:00 (8 am - 11 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 8,
                'e': 23
            }
        }, {
            title: '9:00 - 23:00 (9 am - 11 pm)',
            badge: 'Settings - Day Time',
            icon: 'gearTemplate',
            action: 'setDayTime',
            actionArgument: {
                'm': 9,
                'e': 23
            }
        }
    ]
}

function setDayTime(dayTime) {
    Action.preferences.dayTime = dayTime
    var output = showFavs()
    return output;
}

function refreshData() {
    var result = HTTP.getJSON('https://raw.githubusercontent.com/kevinroberts/city-timezones/master/data/cityMap.json');

    File.writeJSON(result.data, '~/Library/Application Support/LaunchBar/Actions/Timezones.lbaction/Contents/Resources/cities.json')

    LaunchBar.alert('Done!')
    var output = showFavs()
    return output;
}