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


// Calculation Celius into Fahrenheit
// (32 °C × 9/5) + 32 = 89,6 °F
function run(argument) {
    let tempInCelsius = argument;
    let fahrenheit = (tempInCelsius * 9/5) + 32;
    // let result = Math.round(fahrenheit) + ' °F';
    let result = argument + ' °C = ' + fahrenheit.toFixed(1) + ' °F';
    result = result.replace('.',',')
    LaunchBar.setClipboardString(result)
    return [{
        title: fahrenheit.toFixed(1).replace('.', ',') + ' °F',
        subtitle: argument.replace('.', ',') + ' °C',
        icon: "ThermoTemplate"
    }];
}