// LaunchBar Action Script

function run() {
    var uptime = LaunchBar.executeAppleScriptFile('./up.applescript');

    // LaunchBar.paste(uptime)

    return [{
        title: 'Uptime: ' + uptime ,
        icon: 'SanduhrTemplate.png'
    }]
}

//  4 days  14:28

