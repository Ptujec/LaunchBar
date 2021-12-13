// Toggle Wi-Fi Action by Christian Bender (@ptujec)

// Localization
if (LaunchBar.currentLocale != 'de') {
    var titleOn = 'WLAN ist eingeschaltet'
    var subOn = 'Ausschalten?'
    var titleOff = 'WLAN ist ausgeschaltet'
    var subOff = 'Einschalten?'
} else {
    var titleOn = 'Wi-Fi is turned on'
    var subOn = 'Turn off?'
    var titleOff = 'Wi-Fi is turned off'
    var subOff = 'Turn on?'
}

function run(argument) {
    var output = fetch()
    return output
}

function fetch() {
    
    var hardwareports = LaunchBar.execute('/usr/sbin/networksetup', '-listallhardwareports')
        .split('\n\n')

    for (var i = 0; i < hardwareports.length; i++) {
        if (hardwareports[i].includes('Hardware Port')) {
            var info = hardwareports[i].trim().split('\n')
            var port = info[0]
            var device = info[1].split(':')[1].trim()
            if (port.includes('Wi-Fi')) {
                var wifiDevice = device
            }
        }
    }

    var wifiDeviceState = LaunchBar.execute('/usr/sbin/networksetup', '-getairportpower', wifiDevice).split(':')[1].trim()

    if (wifiDeviceState == 'On') {
        var output = wifiOff(wifiDevice)
        return output
    } else {
        var output = wifiOn(wifiDevice)
        return output
    }
}

function wifiOn(wifiDevice) {
    LaunchBar.execute('/usr/sbin/networksetup', '-setairportpower', wifiDevice, 'on')

    return [{
        title: titleOn,
        subtitle: subOn,
        action: 'fetch',
        icon: 'onTemplate'
    }]
}

function wifiOff(wifiDevice) {
    LaunchBar.execute('/usr/sbin/networksetup', '-setairportpower', wifiDevice, 'off')

    return [{
        title: titleOff,
        subtitle: subOff,
        action: 'fetch',
        icon: 'offTemplate'
    }]
}