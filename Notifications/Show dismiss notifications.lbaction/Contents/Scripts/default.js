/* 
Show/dismiss notifications
by Christian Bender @ptujec

Sources:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://apple.stackexchange.com/questions/408019/dismiss-macos-big-sur-notifications-with-keyboard 
- https://www.reddit.com/r/applescript/comments/jxhm19/clear_all_notifications_with_single_script_on_big/gig3phd/
- https://gist.github.com/lancethomps/a5ac103f334b171f70ce2ff983220b4f
- https://github.com/prenagha/launchbar/blob/main/Dismiss%20Notifications.lbaction/Contents/Scripts/dismiss.applescript
- https://forum.keyboardmaestro.com/t/clear-notifications-in-big-sur/20327/6 
*/

function run(argument) {
    // Localize strings - English and German are supported
    if (LaunchBar.currentLocale == 'de') {
        var titleClose = 'Mitteilungen schließen'
        var titleLess = 'Weniger anzeigen'
        var titleMore = 'Mehr anzeigen'
        var titleOpen = 'Aktuelle öffnen'
        var titleActions = 'Weitere Aktionen anzeigen'
    } else {
        var titleClose = 'Dismiss notifications'
        var titleLess = 'Show less'
        var titleMore = 'Show more'
        var titleOpen = 'Open most recent'
        var titleActions = 'Show more actions'
    }

    var output = LaunchBar.executeAppleScriptFile('./show.applescript')
        .trim()

    if (output == 'success') {
        return [
            {
                title: titleClose,
                icon: "notiTemplate",
                action: "closeAction"
            }, {
                title: titleMore,
                icon: "moreTemplate",
                action: "showMore"
            }, {
                title: titleLess,
                icon: "lessTemplate",
                action: "showLess"
            }, {
                title: titleOpen,
                icon: "openTemplate",
                action: "openAction"
            }, {
                title: titleActions,
                icon: "actionsTemplate",
                action: "getActions"
            }
        ]
    } else {
        LaunchBar.hide()
        LaunchBar.executeAppleScriptFile('./close.applescript')
    }
}

function closeAction() {
    LaunchBar.hide()
    LaunchBar.executeAppleScriptFile('./close.applescript')
}

function showLess() {
    if (LaunchBar.currentLocale == 'de') {
        var titleClose = 'Mitteilungen schließen'
        var titleLess = 'Weniger anzeigen'
        var titleMore = 'Mehr anzeigen'
        var titleOpen = 'Aktuelle öffnen'
        var titleActions = 'Weitere Aktionen anzeigen'
    } else {
        var titleClose = 'Dismiss notifications'
        var titleLess = 'Show less'
        var titleMore = 'Show more'
        var titleOpen = 'Open most recent'
        var titleActions = 'Show more actions'
    }

    LaunchBar.executeAppleScriptFile('./less.applescript')

    return [
        {
            title: titleClose,
            icon: "notiTemplate",
            action: "closeAction"
        }, {
            title: titleMore,
            icon: "moreTemplate",
            action: "showMore"
        }, {
            title: titleLess,
            icon: "lessTemplate",
            action: "showLess"
        }, {
            title: titleOpen,
            icon: "openTemplate",
            action: "openAction"
        }, {
            title: titleActions,
            icon: "actionsTemplate",
            action: "getActions"
        }
    ]
}

function showMore() {
    if (LaunchBar.currentLocale == 'de') {
        var titleClose = 'Mitteilungen schließen'
        var titleLess = 'Weniger anzeigen'
        var titleMore = 'Mehr anzeigen'
        var titleOpen = 'Aktuelle öffnen'
        var titleActions = 'Weitere Aktionen anzeigen'
    } else {
        var titleClose = 'Dismiss notifications'
        var titleLess = 'Show less'
        var titleMore = 'Show more'
        var titleOpen = 'Open most recent'
        var titleActions = 'Show more actions'
    }

    var output = LaunchBar.executeAppleScriptFile('./show.applescript')
        .trim()

    if (output == 'success') {
        return [
            {
                title: titleClose,
                icon: "notiTemplate",
                action: "closeAction"
            }, {
                title: titleMore,
                icon: "moreTemplate",
                action: "showMore"
            }, {
                title: titleLess,
                icon: "lessTemplate",
                action: "showLess"
            }, {
                title: titleOpen,
                icon: "openTemplate",
                action: "openAction"
            }, {
                title: titleActions,
                icon: "actionsTemplate",
                action: "getActions"
            }
        ]
    }
}

function openAction() {
    LaunchBar.hide()
    LaunchBar.executeAppleScriptFile('./open.applescript')
}

function getActions() {
    var output = LaunchBar.executeAppleScriptFile('./getActions.applescript')
        .trim()
        .split(',')

    var actions = []
    for (var i = 0; i < output.length; i++) {
        var action = output[i].trim()

        if (action != 'AXScrollToVisible' && action != 'drücken' && action != 'press') {
            actions.push({
                title: action,
                icon: 'actionTemplate',
                action: 'runAction',
                actionArgument: action
            })
        }
    }
    return actions
        .reverse()
}

function runAction(argument) {
    LaunchBar.hide()
    LaunchBar.executeAppleScriptFile('./runAction.applescript', argument)
}