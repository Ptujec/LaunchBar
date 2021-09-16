/* Accordance Look Up by Ptujec 2021-07-22

Sources: 
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- http://www.accordancebible.com/Accordance-1043-Is-Automagical/
- http://accordancefiles2.com/helpfiles/OSX12/Default.htm#topics/05_dd/using_links_common_tasks.htm#kanchor184 (See: Examples of Accordance-specific URLs)
- https://stackoverflow.com/a/13012698 (if contains statement)
*/

const GermanBookList = ["Mose", "Genesis", "Exodus", "Levitikus", "Numeri", "Deuternomium", "Josua", "Richter", "Rut", "Könige", "Chronik", "Esra", "Nehemia", "Ester", "Hiob", "Psalmen", "Sprichwörter", "Sprüche", "Kohelet", "Prediger", "Hohelied", "Jesaja", "Jeremia", "Klagelieder", "Hesekiel", "Hosea", "Obadja", "Jona", "Micha", "Habakuk", "Zefanja", "Haggai", "Sacharja", "Maleachi", "Matthäus", "Markus", "Lukas", "Johannes", "Apg", "Apostelgeschichte", "Römer", "Korinther", "Galater", "Epheser", "Philipper", "Kolosser", "Thessalonicher", "Timotheus", "Philemon", "Hebräer", "Jakobus", "Petrus", "Judas", "Offenbarung"]

const SloveneBookList = ["Mojzes", "Geneza", "Eksodus", "Levitik", "Numeri", "Devteronomij", "Jozue", "Sodniki", "Ruta", "Kralji", "Kroniška", "Ezra", "Nehemija", "Estera", "Job", "Psalmi", "Pregovori", "Pregovori", "Kohelet", "Pridigar", "Visoka pesem", "Izaija", "Jeremija", "Žalostinke", "Ezekiel", "Ozej", "Abdija", "Jona", "Mihej", "Habakuk", "Sofonija", "Agej", "Zaharija", "Malahija", "Matej", "Marko", "Luka", "Janez", "Apd", "Apostolska dela", "Rimljanom", "Korinčanom", "Galačanom", "Efežanom", "Filipljanom", "Kološanom", "Tesaloničanom", "Timoteju", "Filemonu", "Hebrejcem", "Jakob", "Peter", "Juda", "Razodetje"]

const EnglishBookList = ["Moses", "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "Kings", "Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Proverbs", "Ecclesiastes", "Ecclesiastes", "Song", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Hosea", "Obadiah", "Jonah", "Micah", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Acts", "Romans", "Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "Thessalonians", "Timothy", "Philemon", "Hebrews", "James", "Peter", "Jude", "Revelation"]


function run(argument) {
    argument = argument
        .trim()

    // Check Vers Notation Setting (see checkbox in "Appearance" section of Accoradance Preferences)
    var content = File.readText('~/Library/Preferences/Accordance Preferences/General.apref')
    var string = content.match(/useeuropeanversenotation":(\d)/)
    var num = string[1]

    if (num == 0) {
        // Default Vers Notation
        var result = argument
    } else {
        // Add number of first chapternumber if just a bookname is given 
        var numCheck = / \d/.test(argument)
        if (numCheck == false) {
            argument = argument + ' 1'
        }

        // European Vers Notation
        argument = argument
            // clean up capture (e.g. brackets) and formart errors (e.g. spaces before or after verse numbers) in entry
            .replace(/\(|\)/g, '')
            .replace(/(\s+)?([\-–,:])(\s+)?/g, '$2')

        // Convert Slovene and German argument strings
        var mA = argument.match(/(?:[1-5]\.?\s?)?(?:[a-zžščöäü]+\.?\s?)?[0-9,.:\-–f]+/gi)

        if (mA == undefined) {
            var result = argument
        } else {
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
    lookUp(result)
}

function lookUp(result) {

    // UI language check
    var aPlist = File.readPlist('~/Library/Preferences/com.OakTree.Accordance.plist')
    var lang = aPlist.AppleLanguages

    if (lang != undefined) {
        lang = lang
            .toString()
    } else {
        var gPlist = File.readPlist('/Library/Preferences/.GlobalPreferences.plist')
        lang = gPlist.AppleLanguages
            .toString()
    }

    if (lang.startsWith('de')) {
        var allTextSetting = '[Alle_Texte];Verses?'
    } else {
        var allTextSetting = '[All_Texts];Verses?'
    }

    if (LaunchBar.options.commandKey) {
        // Force read option
        LaunchBar.openURL('accord://read/?' + encodeURIComponent(result))
    } else if (LaunchBar.options.alternateKey) {
        // Force research option
        LaunchBar.openURL('accord://research/' + allTextSetting + encodeURIComponent(result))
    } else {
        // Smart option
        if (result.endsWith('f') || result.includes('-') || result.includes(';') || !result.includes(',')) {
            LaunchBar.openURL('accord://read/?' + encodeURIComponent(result))
        } else {
            LaunchBar.openURL('accord://research/' + allTextSetting + encodeURIComponent(result))
        }
    }
}