// Image to Text (Christian Bender @ptujec)
// using the great command line app macOCR by Marcus Schappi (@schappi)
// https://github.com/schappim/macOCR

// LaunchBar documentation
// https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
// https://www.obdev.at/resources/launchbar/help/URLCommands.html

function run() {
    var result = LaunchBar.execute('/usr/local/bin/ocr')
        .trim()

    if (LaunchBar.options.commandKey) {
        LaunchBar.openURL('x-launchbar:select?string=' + encodeURI(result))

    } else if (LaunchBar.options.shiftKey) {
        // open URL, Email or Phone number

        if (result.includes('www') || result.includes('http') || result.includes('.com') && !result.includes('@')) {
            // var url = result.replace(/www/, 'http://www')
            if (!result.includes('http')) {
                result = 'http://' + result
            }
            var url = result.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])|(www\.[\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi).toString()
            LaunchBar.openURL(url)
        } else if (result.includes('@')) {
            var url = 'mailto:' + result
            LaunchBar.openURL(url)
        } else if (/\d\d\d/.test(result)) {
            var url = 'tel:' + result.replace(/\D/g, '')
            LaunchBar.openURL(url)
        }

    } else {

        // Notification
        // LaunchBar.displayNotification({
        //     title: 'Text copied!',
        //     string: result
        // })

        // Large display
        var rLength = result.length

        if (rLength > 70) {

            var lineLength = rLength / 7

            if (lineLength < 42) {
                lineLength = 42
            } else if (lineLength > 68) {
                lineLength = 68
            }

            if (rLength > 948) {
                // truncate 
                result = result.substring(0, 949) + "…";
                lineLength = 68
            }

            var arrayOfLines = fold(result, lineLength);
            result = arrayOfLines.join('\n').replace(/\n\s/g, '\n')
        }

        LaunchBar.displayInLargeType({
            title: 'Text copied!',
            string: result
        });

        LaunchBar.execute('/usr/bin/afplay', '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf')

        // Hide after 3 seconds
        wait(3000);
        LaunchBar.hide()
    }
}

// time out routine
// https://stackoverflow.com/a/33414145/15774924
function wait(ms) {
    var start = new Date().getTime();
    var end = start;
    while (end < start + ms) {
        end = new Date().getTime();
    }
}

// fold function
// http://jsfiddle.net/jahroy/Rwr7q/18/
function fold(s, n, a) {
    a = a || [];
    if (s.length <= n) {
        a.push(s);
        return a;
    }
    var line = s.substring(0, n);
    var lastSpaceRgx = /\s(?!.*\s)/;
    var idx = line.search(lastSpaceRgx);
    var nextIdx = n;
    if (idx > 0) {
        line = line.substring(0, idx);
        nextIdx = idx;
    }
    a.push(line);
    return fold(s.substring(nextIdx), n, a);
}