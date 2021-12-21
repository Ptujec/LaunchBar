/* Gedankensalat
Idee: Braindump für alles mögliche … hier eintragen und von hier aus weiter verwenden

Quellen:
-  https://ia.net/writer/support/general/urlschemes

Todo: 
- Restore removed items from backup
*/

function run(argument) {
    var fileLocation = Action.preferences.fileLocation

    if (fileLocation == undefined || LaunchBar.options.shiftKey) {
        var output = fileLocationOptions()
        return output
    }

    if (argument == undefined) { // Show Entries
        if (LaunchBar.options.controlKey) {
            // LaunchBar.openURL('ia-writer://open?path=/Locations/iCloud/Gedankensalat.txt')
            LaunchBar.openURL(File.fileURLForPath(fileLocation))
        } else {
            var output = show()
            return output
        }
    } else { // New Entry
        var timestamp = new Date()

        var date = new Date(timestamp.getTime() - (timestamp.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]

        var time = LaunchBar.formatDate(timestamp, {
            timeStyle: 'medium',
            dateStyle: 'none'
        });

        timestamp = date + ', ' + time

        var text = File.readText(fileLocation).trim();

        text = text + '\n\n' + timestamp + ': ' + argument

        File.writeText(text, fileLocation);

        LaunchBar.hide();
    }
    // var output = show()
    // return output
}

function fileLocationOptions() {
    if (LaunchBar.currentLocale == 'de') {
        var chooseTitle = 'Datei auswählen'
        var newTitle = 'Neue Datei erstellen'
    } else {
        var chooseTitle = 'Choose File'
        var newTitle = 'Create New File'
    }

    return [
        {
            title: chooseTitle,
            action: 'chooseFile',
            icon: 'fileTemplate'
        }, {
            title: newTitle,
            action: 'newFile',
            icon: 'newFileTemplate'
        }
    ]
}

function chooseFile() {
    if (LaunchBar.currentLocale == 'de') {
        var prompt = 'Wähle eine Datei für diese Aktion:'
        var success = 'Fertig!'
        var successMessage1 = 'Die ausgewählte Datei ist '
        var successMessage2 = 'Jetzt kanns losgehn!'
        var error = 'Fehler'
        var errorMessage = 'Keine Datei. Versuch es nochmal!'
    } else {
        var prompt = 'Select a file for this action:'
        var success = 'Success!'
        var successMessage1 = 'Your source file is '
        var successMessage2 = 'You can start adding entries.'
        var error = 'Error'
        var errorMessage = 'No File. Try again!'
    }

    var fileLocation = LaunchBar.executeAppleScript(
        'set _home to path to home folder as string',
        'set _default to _home & "Library:Mobile Documents:" as alias',
        'set _file to choose file with prompt "' + prompt + '" default location _default',
        'set _file to POSIX path of _file')
        .trim()
    Action.preferences.fileLocation = fileLocation

    if (Action.preferences.fileLocation != '') {
        LaunchBar.alert(success, successMessage1 + fileLocation + '\n' + successMessage2)
    } else {
        LaunchBar.alert(error, errorMessage)
    }
}

function newFile() {
    if (LaunchBar.currentLocale == 'de') {
        var prompt = 'Wähle einen Ordner, in dem die neue Datei erstellt werden soll:'
        var success = 'Fertig!'
        var successMessage1 = 'Die ausgewählte Datei ist '
        var successMessage2 = 'Jetzt kanns losgehn!'
        var header = '# Gedankensalat'
        var fileName = 'Gedankensalat.txt'
        var error = 'Fehler'
        var errorMessage = 'Keine Datei. Versuch es nochmal!'
    } else {
        var prompt = 'Select a folder to create the new file in:'
        var success = 'Success!'
        var successMessage1 = 'Your source file is '
        var successMessage2 = 'You can start adding entries.'
        var header = '# Scratchpad'
        var fileName = 'Scratchpad.txt'
        var error = 'Error'
        var errorMessage = 'No File. Try again!'
    }

    var folderPath = LaunchBar.executeAppleScript(
        'set _home to path to home folder as string',
        'set _default to _home & "Library:Mobile Documents:" as alias',
        'set _folder to choose folder with prompt "' + prompt + '" default location _default',
        'set _folder to POSIX path of _folder')
        .trim()

    var fileLocation = folderPath + fileName

    try {
        File.writeText(header, fileLocation);
        Action.preferences.fileLocation = fileLocation

        if (Action.preferences.fileLocation != '') {
            LaunchBar.alert(success, successMessage1 + fileLocation + '\n' + successMessage2)
        } else {
            LaunchBar.alert(error, errorMessage)
        }
    } catch (exception) {
        LaunchBar.alert('Error while writing text to file: ' + exception);
    }
}

function show() {
    var fileLocation = Action.preferences.fileLocation

    try {
        var lines = File.readText(fileLocation)
            .split('\n')
    } catch (error) {
        var output = fileLocationOptions()
        return output
    }

    var result = []
    for (var i = 1; i < lines.length; i++) {
        if (lines[i] != '') {
            var l = lines[i].split(/\d\d: /)

            result.push({
                title: l[1],
                subtitle: l[0].replace(/:$/, ''),
                icon: '_Template',
                action: 'options',
                actionArgument: {
                    entry: lines[i],
                    title: l[1]
                }
            })
        }
    }

    result.sort(function (a, b) {
        return a.subtitle < b.subtitle;
    });

    return result
}

function options(params) {
    var fileLocation = Action.preferences.fileLocation

    if (LaunchBar.options.shiftKey) {
        // LaunchBar.openURL('ia-writer://open?path=/Locations/iCloud/Gedankensalat.txt')
        LaunchBar.openURL(File.fileURLForPath(fileLocation))
    } else {
        if (LaunchBar.currentLocale == 'de') {
            var deleteTitle = 'Löschen'
            var pasteTitle = 'Einfügen'
        } else {
            var deleteTitle = 'Delete'
            var pasteTitle = 'Paste'
        }
        
        return [
            {
                title: 'Todoist',
                icon: 'todoistTemplate',
                action: 'addToTodoist',
                actionArgument: params.title
            }, {
                title: 'MindNode',
                icon: 'mindnodeTemplate',
                action: 'addToMindNode',
                actionArgument: params.title
            }, {
                title: 'iA Writer',
                icon: 'iATemplate',
                action: 'addToIAWriter',
                actionArgument: params.title
            }, {
                title: 'Day One',
                icon: 'dayoneTemplate',
                action: 'addToDayOne',
                actionArgument: params.title
            }, {
                title: pasteTitle,
                icon: 'CopyActionTemplate',
                action: 'paste',
                actionArgument: params.title
            }, {
                title: deleteTitle,
                icon: 'removeTemplate',
                action: 'remove',
                actionArgument: params.entry
            }
        ]
    }
}

function remove(params) {
    var fileLocation = Action.preferences.fileLocation
    var text = File.readText(fileLocation)
        .replace(params, '')
        .replace(/\n\n(\n)+/, '\n\n')

    File.writeText(text, fileLocation);

    var output = show()
    return output
}

function paste(params) {
    LaunchBar.paste(params)
}

function addToTodoist(params) {
    LaunchBar.openURL('todoist://addtask?content=' + encodeURI(params))
}

function addToDayOne(params) {
    LaunchBar.openURL('dayone://post?entry=' + encodeURI(params) + '&tags=Gedankensalat&journal=Privat')
}

function addToIAWriter(params) {
    LaunchBar.openURL('ia-writer://new?text=' + encodeURIComponent(params) + '&new-window=true');
}

function addToMindNode(params) {
    LaunchBar.openURL('mindnode://import?format=txt&name=' + encodeURIComponent(params) + '&content=' + encodeURIComponent(params));
}