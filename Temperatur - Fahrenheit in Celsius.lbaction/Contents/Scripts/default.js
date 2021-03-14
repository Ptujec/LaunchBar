// LaunchBar Action Script
// https://developer.obdev.at/launchbar-developer-documentation/#/implementing-actions-javascript
//
// Example Code:
// function run(argument) {
//     if (argument == undefined) {
//         // Inform the user that there was no argument
//         LaunchBar.alert('No argument was passed to the action');
//     } else {
//         // Return a single item that describes the argument
//         return [{ title: 'An argument was passed: ' + argument }];
//     }
// }


// Calculation Fahrenheit into Celius
// (32 °F − 32) × 5/9 = 0 °C
function run(argument) {
    let tempInFahrenheit = argument;
    let celsius = (tempInFahrenheit - 32) * 5 / 9;
    // let result = celsius.toFixed(1) + ' °C';
    let result = argument + ' °F = ' + celsius.toFixed(1) + ' °C';
    result = result.replace('.', ',')
    LaunchBar.setClipboardString(result)
    return [{
        title: celsius.toFixed(1).replace('.', ',') + ' °C',
        subtitle: argument.replace('.', ',') + ' °F',
        icon: "ThermoTemplate"
    }];
}