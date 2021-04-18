// Quellen:
// https://www.pomagalnik.com/izobrazevanje/uporabno/slovensko-slepo-besedilo-lorem-ipsum/
// https://stackoverflow.com/questions/18679576/counting-words-in-string/30335883
// Truncate sentence to a certain number of words https://stackoverflow.com/a/7374772

// Erfüllte Anforderungen
// - Anzahl Worte filtern 
// - Wenn man mehr Wörter will den string entsprechend multipliziern (Dadurch kann man den String kleiner halten)

// Weiter offene Optionen: 
// - Punkt dahinter
// - Letze Wort muss mehr als zwei Buchstaben haben

function run(argument) {
    var lorem = 'Vojublečnijša moska došna nizmaznost, razam, si z žvejocu neč ni kamoga. Tojti kabor me trovi prejapelj: „Taznom Nase nozari u norudni ametnospe, toha jaz šim grohego mnenjo“, meslim sama prve krenapit na to, da da ji krega toačepe, stasam samo prve dik arehite svaje misli o norodni umiknoste, podo v noslednjim si ze statem ža brdep, tadlebam čiz svojo en trejateljevo glovo per vedem, da padi an škaje za svojem drdpam in da krove: „Ne kaznum Vašid nazarav a narahne ameknaski en hi jig rad zvigil.“ Kidaj ši trovim: „Farej mo jib morom rozubeti, da jih ne do verjel.“ Tričij kopem si skokem drabec žu drbik en vedem, ha se spuji tadi prejotilj dvokrak zo drdkam in ga mi travi: „Mi kaznum Vosid nuzorav a norodne ometnašti; dovarele duspi karej resniča, da he mi zatiljali v žmota.“ In joz se provem: „Moj prijopilj ji amen člavit, karej marom ladopi, do mi ga virjil.“ In ta si stopim tripječ za drdep, vedim, da si je pabe maj krijakelj taprojil en ga še mi smeji: „Soj vem, da nimate nadinid nazorav o norabne umeknoste, tuda zvidil ge rad, ci jicljoti.“ Ta po vem, be do lidko kotoj otanel, če be ba mohil.'  // 200 Words, 1114 total characters

    // Wieviel Worte wir haben wollen
    var words = argument

    // Count words in string
    var lCount = lorem.split(' ').length;

    if (lCount >= words) {
        lorem = lorem.split(' ').splice(0, words).join(" ")
        // console.log(lorem);
        LaunchBar.paste(lorem)
    } else {
        // console.log('Not enough words in String');
        // m wie multiplicator
        // var m = 250/200
        var m = words / lCount
        m = Math.ceil(m);
        lorem = (lorem + ' ').repeat(m)
        // lCount = lorem.split(' ').length;
        // console.log(m, lCount, lorem);
        lorem = lorem.split(' ').splice(0, words).join(' ')
        // console.log(lorem);
        LaunchBar.paste(lorem)
    }
}