// LaunchBar Action Script

function run(argument) {
  argument = argument.replace(/\s*/g, '');
  LaunchBar.openURL('imessage://' + argument);
}
