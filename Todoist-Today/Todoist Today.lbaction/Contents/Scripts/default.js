// Todoist Today View
// https://developer.todoist.com/rest/v1/#overview
// https://mike.ps/todoist-today-by-project/
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar

const apiToken = Action.preferences.apiToken

function run(argument) {
    if (apiToken == undefined) {
        setApiKey()
    } else {
        var todayData = HTTP.getJSON('https://api.todoist.com/rest/v1/tasks?filter=today&token=' + apiToken)

        if (todayData.error != undefined) {
            if (todayData.response != undefined) {
                if (todayData.response.localizedStatus = 'forbidden') {
                    LaunchBar.alert('You have not supplied a valid API-Token.')
                    setApiKey()
                    return
                }
            } else {
                LaunchBar.alert(todayData.error)
                return
            }
        }

        if (todayData.data == '') {
            if (LaunchBar.currentLocale == 'de') {
                var title = 'Alles erledigt für heute!'
            } else {
                var title = 'All done for today!'
            }
            return [{
                'title': title,
                'icon': 'checkmarkTemplate',
                'url': 'todoist://'
            }]
        }

        todayData = todayData.data

        todayData = todayData.sort(function (a, b) {
            return a.priority < b.priority && a.created > b.created
        });

        var results = [];
        var i = 0;
        for (i = 0; i < todayData.length; i++) {
            var task = todayData[i]
            var title = task.content
            // var sub = ''
            var url = 'todoist://' // task.url
            var badge = ''
            var prio = task.priority
            // var dueTime = task.due.string.match(/\d\d:\d\d/)

            if (prio == 4) {
                var icon = 'dotRed'
            } else if (prio == 3) {
                var icon = 'dotOrange'
            } else if (prio == 2) {
                var icon = 'dotBlue'
            } else {
                var icon = 'dotTemplate'
            }

            if (title.includes('](')) {
                m = title.match(/\[(.*?)\]\((.*?)\)/)
                title = m[1]
                url = m[2]
                badge = 'link'
            }

            // if (dueTime != null) {
            //     title = title + ' (' + dueTime + ' Uhr)'
            // }

            if (badge != '') {
                results.push({
                    'title': title,
                    // 'subtitle': sub,
                    'icon': icon,
                    'url': url,
                    'badge': badge
                });
            } else {
                results.push({
                    'title': title,
                    // 'subtitle': sub,
                    'icon': icon,
                    'url': url
                });
            }
        }
        return results;
    }
}

function setApiKey() {
    var response = LaunchBar.alert(
        "API-Token required", "1) Go to Settings/Integrations and copy the API-Token.\n2) Press »Set API-Token«", "Open Settings", "Set API-Token", "Cancel"
    );
    switch (response) {
        case 0:
            LaunchBar.openURL('https://todoist.com/app/settings/integrations')
            LaunchBar.hide()
            break
        case 1:
            Action.preferences.apiToken = LaunchBar.getClipboardString().trim()
            LaunchBar.alert('Success!', 'API-Token set to: ' + Action.preferences.apiToken)
            break
        case 2:
            break
    }
}