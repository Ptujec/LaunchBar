// LaunchBar Action Script

function run(argument) {
    argument = argument
        .replace(/,/g, '\n')
        .replace(/^\s+|\s+$/gm, '')
    LaunchBar.paste(argument)
}
