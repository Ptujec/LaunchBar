// https://stackoverflow.com/questions/37462126/regex-match-markdown-link

function run(argument) {
    var md = argument;
    var text = md.replace(/\[([^\[\]]*)\]\((.*?)\)/gm, '$1');
    var url = md.replace(/\[([^\[\]]*)\]\((.*?)\)/gm, '$2');
    LaunchBar.executeAppleScriptFile('./rtf.applescript', url, text);
}