(* Accordance Large Display Script for 

modified from Accordance Quicksilver Plugin
Version 0.2
QS plugin that handles text and interacts with Accordance engine
CC   Joseph Weaks, 2006
Creative Commons Attribution-NonCommercial-ShareAlike 2.5 license (http://creativecommons.org/licenses/by-nc-sa/2.5/)

adapted to make it work with Launchbar by Christian Bender, 2008 http://twitter.com/ptujec 
additional scripting to fix large type issues by :kelko: kelko < at > anakrino <.> de http://kelko.anakrino.de
additional scripting to fix issues with German Booknames by Joseph Weaks, 2009 

2021-04-22 fixed: remove preceding and trailing white spaces in string https://stackoverflow.com/a/35758114
 *)

---------------------------------------
-- User Settings  --
---------------------------------------
property sendOutputTo : "LBPaste"
property theModule : "ESV"
property quoteAs : "Citation"
---------------------------------------
-- End User Settings  --
---------------------------------------

---------------------------------------
-- Code to replace any book title containing the book string with the corresponding English title in the same place.
---------------------------------------

property NumberList : "1 | 2 | 3 | 4 | 5"

property GermanBookString : "Mose | Genesis | Exodus | Levitikus | Numeri | Deuternomium | Josua | Richter | Rut | Könige | 1Könige | 2Könige | Chronik | 1Chronik | 2Chronik | Esra | Nehemia | Ester | Hiob | Psalmen | Sprichwörter | Sprüche | Kohelet | Prediger | Hohelied | Jesaja | Jeremia | Klagelieder | Hesekiel | Hosea | Obadja | Jona | Micha | Habakuk | Zefanja | Haggai | Sacharja | Maleachi | Matthäus | Markus | Lukas | Johannes | Apostelgeschichte | Römer | Korinther | 1Korinther | 2Korinther | Galater | Epheser | Philipper | Kolosser | Thessalonicher | 1Thessalonicher | 2Thessalonicher | Timotheus | 1Timotheus | 2Timotheus | Philemon | Hebräer | Jakobus | Petrus | 1Petrus | 2Petrus | Johannes | 1Johannes | 2Johannes | 3Johannes | Judas | Offenbarung"


property GermanBookList : {"Mose", "Genesis", "Exodus", "Levitikus", "Numeri", "Deuternomium", "Josua", "Richter", "Rut", "Könige", "1Könige", "2Könige", "Chronik", "1Chronik", "2Chronik", "Esra", "Nehemia", "Ester", "Hiob", "Psalmen", "Sprichwörter", "Sprüche", "Kohelet", "Prediger", "Hohelied", "Jesaja", "Jeremia", "Klagelieder", "Hesekiel", "Hosea", "Obadja", "Jona", "Micha", "Habakuk", "Zefanja", "Haggai", "Sacharja", "Maleachi", "Matthäus", "Markus", "Lukas", "Johannes", "Apostelgeschichte", "Römer", "Korinther", "1Korinther", "2Korinther", "Galater", "Epheser", "Philipper", "Kolosser", "Thessalonicher", "1Thessalonicher", "2Thessalonicher", "Timotheus", "1Timotheus", "2Timotheus", "Philemon", "Hebräer", "Jakobus", "Petrus", "1Petrus", "2Petrus", "Johannes", "1Johannes", "2Johannes", "3Johannes", "Judas", "Offenbarung"}

property SloveneBookString : "Mojzes | Geneza | Eksodus | Levitik | Numeri | Devteronomij | Jozue | Sodniki | Ruta | Kralji | 1Kralji | 2Kralji | Kroniška | 1Kroniška | 2Kroniška | Ezra | Nehemija | Estera | Job | Psalmi | Pregovori |Pregovori | Kohelet | Pridigar | Visoka esem | Izaija | Jeremija | Žalostinke | Ezekiel | Ozej | Abdija | Jona | Mihej | Habakuk | Sofonija | Agej | Zaharija | Malahija | Matej | Marko | Luka | Janez | Apostolska dela | Rimljanom | Korinčanom | 1Korinčanom | 2Korinčanom | Galačanom | Efežanom | Filipljanom | Kološanom | Tesaloničanom | 1Tesaloničanom | 2Tesaloničanom | Timoteju | 1Timoteju | 2Timoteju | Titu | Filemonu | Hebrejcem | Jakob | Peter | 1Peter | 2Peter | Janez | 1Janez | 2Janez | 3Janez | Juda | Razodetje"


property SloveneBookList : {"Mojzes", "Geneza", "Eksodus", "Levitik", "Numeri", "Devteronomij", "Jozue", "Sodniki", "Ruta", "Kralji", "1Kralji", "2Kralji", "Kroniška", "1Kroniška", "2Kroniška", "Ezra", "Nehemija", "Estera", "Job", "Psalmi", "Pregovori", "Pregovori", "Kohelet", "Pridigar", "Visoka pesem", "Izaija", "Jeremija", "Žalostinke", "Ezekiel", "Ozej", "Abdija", "Jona", "Mihej", "Habakuk", "Sofonija", "Agej", "Zaharija", "Malahija", "Matej", "Marko", "Luka", "Janez", "Apostolska dela", "Rimljanom", "Korinčanom", "1Korinčanom", "2Korinčanom", "Galačanom", "Efežanom", "Filipljanom", "Kološanom", "Tesaloničanom", "1Tesaloničanom", "2Tesaloničanom", "Timoteju", "1Timoteju", "2Timoteju", "Filemonu", "Hebrejcem", "Jakob", "Peter", "1Peter", "2Peter", "Janez", "1Janez", "2Janez", "3Janez", "Juda", "Razodetje"}


property EnglishBookList : {"Moses", "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "Kings", "1Kings", "2Kings", "Chronicles", "1Chronicles", "2Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Proverbs", "Ecclesiastes", "Ecclesiastes", "Song", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Hosea", "Obadiah", "Jonah", "Micah", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "Corinthians", "1Corinthians", "2Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "Thessalonians", "1Thessalonians", "2Thessalonians", "Timothy", "1Timothy", "2Timothy", "Philemon", "Hebrews", "James", "Peter", "1Peter", "2Peter", "John", "1John", "2John", "3John", "Jude", "Revelation"}


---------------------------------------
-- Main Action  --
---------------------------------------
on run (theString)
	set theString to theString as string 
	set theString to do shell script "echo \"" & theString & "\" | xargs"
	try
		actionSorter(theString, theModule, quoteAs, sendOutputTo)
	on error e
		tell application "LaunchBar" to display in notification center with title "Error!" subtitle e
	end try
end run

on actionSorter(theString, thisModule, thisFormat, outputDestination)
	
	-- Looks up the module to use if a number is designated
	try
		set thisModule to thisModule as integer
		set thisModule to getModuleFromList(thisModule)
	end try
	
	if thisFormat begins with "Citation" then
		set quoteAsCitation to true
	else
		set quoteAsCitation to false
	end if
	
	-- use input for reference
	set theReference to theString
	
	-- replace book title (for German and/or Slovene) 
	set theString to convertGermanTitle2English(theString)
	-- set theString to convertSloveneTitle2English(theString)
	
	-- Get the text from Accordance
	tell application "Accordance"
		set theResult to «event AccdTxRf» {thisModule, theString, quoteAsCitation}
	end tell
	
	if outputDestination is "LBPaste" then
		set theResult to theResult & " (" & theReference & " " & theModule & ")" as Unicode text
		set theResult to do shell script "echo \"" & theResult & "\" | xargs"
		set theResult to "> " & theResult
		tell application "LaunchBar" to perform action "Copy and Paste" with string theResult
	end if
	
end actionSorter

------------------------------------------------------------------------------
-- The rest of the script are supporting routines. 
-- Altering them requires more advanced knowledge.
------------------------------------------------------------------------------
on removeExtraTrailingCharacters(t)
	repeat
		if text -1 thru -1 of t is in "abcčdefghijklmnopqrsštuvwxyzž1234567890" then exit repeat
		set t to text 1 thru -2 of t
	end repeat
	return t
end removeExtraTrailingCharacters


on getModuleFromList(m)
	tell application "Accordance" to set mList to «event AccdVerL»
	set m to (item m of mList)
	if (text 1 thru 1 of m) is not in "abcčdefghijklmnopqrsštuvwxyzž1234567890" then set m to text 2 thru -1 of m -- strip preceding control character
end getModuleFromList


on reformatScripture(t)
	set c to 0
	set u to ""
	
	repeat with p in (paragraphs in t)
		set o to offset of ":" in p
		set chap to text 1 thru (o - 1) of p
		set chap to last word of chap
		
		if chap > c then
			set c to chap
			set u to u & chap & ":"
		end if
		set u to u & (text (o + 1) thru -1 of p) & " "
	end repeat
	return u
end reformatScripture


---------------------------------------
-- Routine to replace any German book title containing the book string with the corresponding English title in the same place.
---------------------------------------

on convertGermanTitle2English(t)
	
	set prefix to ""
	
	if text 1 of t is in NumberList then
		
		set prefix to (text 1 of t) & " "
		set t to (text 3 thru -1 of t)
		
	end if
	
	set o to offset of " " in t
	set bookName to text 1 thru (o - 1) of t
	if bookName is in GermanBookString then
		repeat with n from 1 to (length of GermanBookList)
			if (get item n of GermanBookList) starts with bookName then
				-- replace any German book title containing the book string with the corresponding English title in the same place.
				set bookName to item n of EnglishBookList
			end if
		end repeat
	end if
	return (prefix & bookName & text o thru -1 of t)
end convertGermanTitle2English

on convertSloveneTitle2English(t)
	set prefix to ""
	
	if text 1 of t is in NumberList then
		
		set prefix to (text 1 of t) & " "
		set t to (text 3 thru -1 of t)
		
	end if
	
	set o to offset of " " in t
	set bookName to text 1 thru (o - 1) of t
	if bookName is in SloveneBookString then
		repeat with n from 1 to (length of SloveneBookList)
			if (get item n of SloveneBookList) starts with bookName then
				-- replace any Slovene book title containing the book string with the corresponding English title in the same place.
				set bookName to item n of EnglishBookList
			end if
		end repeat
	end if
	return (prefix & bookName & text o thru -1 of t)
end convertSloveneTitle2English