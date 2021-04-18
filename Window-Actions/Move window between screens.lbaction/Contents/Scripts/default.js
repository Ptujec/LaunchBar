// LaunchBar Action Script
// Options:
// Enter: Move to a defined position and size
// Command: Move and make fullscreen
// Shift: Move and adjust window size and position according to respective screen size  

function run() {
    if (LaunchBar.options.commandKey) {
        LaunchBar.executeAppleScriptFile('./fullscreen.applescript');
    } else if (LaunchBar.options.shiftKey) {
        LaunchBar.executeAppleScriptFile('./fixed.applescript');
    } else {
        LaunchBar.executeAppleScriptFile('./proportional.applescript');
    }
}