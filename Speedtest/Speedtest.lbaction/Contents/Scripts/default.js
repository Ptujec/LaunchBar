// Speedtest by Christian Bender @ptujec
// macOS 12 required

function run() {

    if (LaunchBar.options.alternateKey) {
        LaunchBar.executeAppleScript(
            'tell application "Terminal"',
            'do script "networkQuality"',
            'activate',
            'end tell'
        )

        // } else if (LaunchBar.options.shiftKey) {
        //     LaunchBar.openURL('https://librespeed.org')

    } else {

        /* var noti = `==== SUMMARY ====                                                                                         
        Upload capacity: 89.504 Mbps
        Download capacity: 90.371 Mbps
        Upload flows: 20
        Download flows: 12
        Responsiveness: Medium (744 RPM)`
        */

        var noti = LaunchBar.execute('/usr/bin/networkQuality')
            .trim()
            .split('\n')


        var up = noti[1] // Upload capacity
            .match(/\d+\.\d+/)

        up = Math.round(up)
            .toFixed()
            + ' Mbps'


        var down = noti[2] // Download capacity
            .match(/\d+\.\d+/)

        down = Math.round(down)
            .toFixed()
            + ' Mbps'

        var resp = noti[5] // Responsiveness
            .trim()

        LaunchBar.executeAppleScript('do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf"') // Play Sound

        LaunchBar.displayNotification({
            title: 'Speedtest',
            string: '▼ ' + down + ' ▲ ' + up + '\n' + resp,
        });
    }
}