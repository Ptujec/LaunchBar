/* Accordance Display Text by Ptujec 2021-07-22

Sources:
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://macbiblioblog.blogspot.com/2009/01/downloads.html
- https://stackoverflow.com/questions/17895039/how-to-insert-line-break-after-every-80-characters/17895095
- http://jsfiddle.net/jahroy/Rwr7q/18/
*/

// SET THE TRANSLATION YOU WANT TO USE IN THE NEXT LINE. (You can usually find the correct abbreviation in brackets when you select "About this Text" in Accordance.)
var bibleText =  'ESVS'

// --- Only change if you know what you are doing from here --- //

const GermanBookList = ["Mose", "Genesis", "Exodus", "Levitikus", "Numeri", "Deuternomium", "Josua", "Richter", "Rut", "Könige", "Chronik", "Esra", "Nehemia", "Ester", "Hiob", "Psalmen", "Sprichwörter", "Sprüche", "Kohelet", "Prediger", "Hohelied", "Jesaja", "Jeremia", "Klagelieder", "Hesekiel", "Hosea", "Obadja", "Jona", "Micha", "Habakuk", "Zefanja", "Haggai", "Sacharja", "Maleachi", "Matthäus", "Markus", "Lukas", "Johannes", "Apg", "Apostelgeschichte", "Römer", "Korinther", "Galater", "Epheser", "Philipper", "Kolosser", "Thessalonicher", "Timotheus", "Philemon", "Hebräer", "Jakobus", "Petrus", "Judas", "Offenbarung"]

const SloveneBookList = ["Mojzes", "Geneza", "Eksodus", "Levitik", "Numeri", "Devteronomij", "Jozue", "Sodniki", "Ruta", "Kralji", "Kroniška", "Ezra", "Nehemija", "Estera", "Job", "Psalmi", "Pregovori", "Pregovori", "Kohelet", "Pridigar", "Visoka pesem", "Izaija", "Jeremija", "Žalostinke", "Ezekiel", "Ozej", "Abdija", "Jona", "Mihej", "Habakuk", "Sofonija", "Agej", "Zaharija", "Malahija", "Matej", "Marko", "Luka", "Janez", "Apd", "Apostolska dela", "Rimljanom", "Korinčanom", "Galačanom", "Efežanom", "Filipljanom", "Kološanom", "Tesaloničanom", "Timoteju", "Filemonu", "Hebrejcem", "Jakob", "Peter", "Juda", "Razodetje"]

const EnglishBookList = ["Moses", "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "Kings", "Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Proverbs", "Ecclesiastes", "Ecclesiastes", "Song", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Hosea", "Obadiah", "Jonah", "Micah", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Acts", "Romans", "Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "Thessalonians", "Timothy", "Philemon", "Hebrews", "James", "Peter", "Jude", "Revelation"]


function run(argument) {

    // Check Vers Notation Setting (see checkbox in "Appearance" section of Accoradance Preferences)
    var content = File.readText('~/Library/Preferences/Accordance Preferences/General.apref')
    var string = content.match(/useeuropeanversenotation":(\d)/)
    var num = string[1]

    if (num == 0) {
        // Default Vers Notation
        var result = argument
    } else {
        // European Vers Notation
        argument = argument
            .trim()
            // clean up capture (e.g. brackets) and formart errors (e.g. spaces before or after verse numbers) in entry
            .replace(/\(|\)/g, '')
            .replace(/(\s+)?([\-–,:])(\s+)?/g, '$2')


        // Convert Slovene and German argument strings
        var mA = argument.match(/(?:[1-5]\.?\s?)?(?:[a-zžščöäü]+\.?\s?)?[0-9,.:\-–f]+/gi)

        var result = []
        for (var i = 0; i < mA.length; i++) {
            var scrip = mA[i]
                .toString()
                .trim()

            // makes sure non-european styles get converted 
            if (scrip.includes(':')) {
                scrip = scrip
                    .replace(/,/g, '.')
                    .replace(/:/g, ',')
            }

            var mB = scrip.match(/([1-5]\.?\s?)?([a-zžščöäü]+\.?\s?)?([0-9,.:\-–f]+)/i)

            var prefix = mB[1]

            if (prefix == undefined) {
                prefix = ''
            } else {
                prefix = prefix
                    .replace(/\./, '')
            }

            var bookName = mB[2]

            if (bookName == undefined) {
                bookName = ''
            } else {
                bookName = bookName
                    .trim()
                    .replace(/\./, '')
                    .toLowerCase()

                var iBN = GermanBookList
                    .findIndex(element => element
                        .toLowerCase()
                        .startsWith(bookName))


                if (iBN == -1) {
                    iBN = SloveneBookList
                        .findIndex(element => element
                            .toLowerCase()
                            .startsWith(bookName))
                }

                if (iBN != -1) {
                    bookName = EnglishBookList[iBN]
                }
                bookName = bookName + ' '
            }
            var suffix = mB[3]

            var newScrip = prefix + bookName + suffix

            result.push(newScrip + ' ')
        }
        result = result
            .toString()
            .replace(/ ,/g, '; ')
            .trim()
            .replace(/1 Moses|1Moses/, 'Genesis')
            .replace(/2 Moses|2Moses/, 'Exodus')
            .replace(/3 Moses|3Moses/, 'Leviticus')
            .replace(/4 Moses|4Moses/, 'Numbers')
            .replace(/5 Moses|5Moses/, 'Deuteronomy')

    }
    displayText(result, argument)
}

function displayText(result, argument) {
    var text = LaunchBar.executeAppleScript('tell application "Accordance" to set theResult to «event AccdTxRf» {"' + bibleText + '", "' + result + '", true}')
        .trim()

    var tL = text.length
    var lineLength = tL / 7

    if (lineLength < 42) {
        lineLength = 42
    } else if (lineLength > 68) {
        lineLength = 68
    }

    if (tL > 948) {
        // truncate 
        text = text.trim()
        text = text.substring(0, 948) + "…";
        lineLength = 68
    }

    var arrayOfLines = fold(text, lineLength);
    text = arrayOfLines.join('\n').replace(/\n\s/g, '\n');

    // Uncomment if you are using this a lot in Fullscreen mode
    // LaunchBar.executeAppleScript('tell application "Mission Control" to launch');

    // Cleanup Bible Text Abbreviation for User Bibles and Bibles with Lemmata
    bibleText = bibleText.replace(/°|-LEM/g, '')

    LaunchBar.displayInLargeType({
        title: argument + ' (' + bibleText + ')',
        string: text
    });
}

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