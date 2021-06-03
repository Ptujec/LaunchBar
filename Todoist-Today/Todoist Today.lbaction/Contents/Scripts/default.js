// Todoist Today View
// https://developer.todoist.com/rest/v1/#overview
// https://mike.ps/todoist-today-by-project/

// Add your API-Token in the next line inside the quotations
const token = ''

function run(argument) {

    if (token == '') {
        LaunchBar.alert('You need to enter your API-Token in default.js (line 6)')
    } else {

        var todayData = HTTP.getJSON('https://api.todoist.com/rest/v1/tasks?filter=today&token=' + token)

        todayData = todayData.data

        todayData = todayData.sort(function (a, b) {
            return a.priority < b.priority
        });

        var results = [];
        var i = 0;
        for (i = 0; i < todayData.length; i++) {
            var task = todayData[i]
            var title = task.content
            // var sub = ''
            var url = 'todoist://' // task.url
            var prio = task.priority
            var label = ''
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
                label = 'link'
            }

            // if (dueTime != null) {
            //     title = title + ' (' + dueTime + ' Uhr)'
            // }

            results.push({
                'title': title,
                // 'subtitle': sub,
                'icon': icon,
                'url': url,
                'label': label
            });
        }
        return results;
    }
}