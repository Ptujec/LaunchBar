// LaunchBar Action Script
// URL Scheme: 
// https://thesweetsetup.com/share-from-drafts-to-mindnode-to-easily-visualize-your-documents/
// https://mindnode.cdn.prismic.io/mindnode/418d8e20-51d4-45ef-94f5-ee28ce05c347_MindNode-User-Guide.pdf

function run(argument) {
    if (argument == undefined) {
        argument = LaunchBar.getClipboardString()
    }

    // fix long dashes except when using shift 
    if (!LaunchBar.options.shiftKey) {
        argument = argument
            .replace(/–|—/g, '-')
    }

    if (LaunchBar.options.shiftKey) {
        // Import as is 
        LaunchBar.openURL('mindnode://import?format=txt&content=' + encodeURIComponent(argument));
    } else if (LaunchBar.options.commandKey) {
        // Add tab to all lines except first … this will result in the first line being the main node and the others as child nodes
        argument = argument.replace(/\n\s*\n/g, '\n').replace(/\n/g, '\n\t')
        LaunchBar.openURL('mindnode://import?format=txt&content=' + encodeURIComponent(argument));
    } else if (LaunchBar.options.alternateKey) {
        // Treat as markdown
        LaunchBar.openURL('mindnode://import?format=markdown&content=' + encodeURIComponent(argument));
    } else {
        // Smart (default) option
        if (argument.includes('# ')) {
            LaunchBar.openURL('mindnode://import?format=markdown&content=' + encodeURIComponent(argument));
        } else if (argument.includes('\t')) {
            argument = argument.replace(/\n\s*\n/g, '\n')
            LaunchBar.openURL('mindnode://import?format=txt&content=' + encodeURIComponent(argument));
        } else {
            argument = argument.replace(/\n\s*\n/g, '\n').replace(/\n/g, '\n\t')
            LaunchBar.openURL('mindnode://import?format=txt&content=' + encodeURIComponent(argument));
        }
    }
}