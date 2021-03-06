-- by Joseph Weaks, 2009
-- adapted by Christian Bender, 2021

---------------------------------------
-- Code to replace any book title containing the book string with the corresponding English title in the same place. 
---------------------------------------

property NumberList : "1 | 2 | 3 | 4 | 5"

property SloveneBookString : "Mojzes | Geneza | Eksodus | Levitik | Numeri | Devteronomij | Jozue | Sodniki | Ruta | Kralji | 1Kralji | 2Kralji | Kroniška | 1Kroniška | 2Kroniška | Ezra | Nehemija | Estera | Job | Psalmi | Pregovori |Pregovori | Kohelet | Pridigar | Visoka esem | Izaija | Jeremija | Žalostinke | Ezekiel | Ozej | Abdija | Jona | Mihej | Habakuk | Sofonija | Agej | Zaharija | Malahija | Matej | Marko | Luka | Janez | Apostolska dela | Rimljanom | Korinčanom | 1Korinčanom | 2Korinčanom | Galačanom | Efežanom | Filipljanom | Kološanom | Tesaloničanom | 1Tesaloničanom | 2Tesaloničanom | Timoteju | 1Timoteju | 2Timoteju | Titu | Filemonu | Hebrejcem | Jakob | Peter | 1Peter | 2Peter | Janez | 1Janez | 2Janez | 3Janez | Juda | Razodetje"


property SloveneBookList : {"Mojzes", "Geneza", "Eksodus", "Levitik", "Numeri", "Devteronomij", "Jozue", "Sodniki", "Ruta", "Kralji", "1Kralji", "2Kralji", "Kroniška", "1Kroniška", "2Kroniška", "Ezra", "Nehemija", "Estera", "Job", "Psalmi", "Pregovori", "Pregovori", "Kohelet", "Pridigar", "Visoka pesem", "Izaija", "Jeremija", "Žalostinke", "Ezekiel", "Ozej", "Abdija", "Jona", "Mihej", "Habakuk", "Sofonija", "Agej", "Zaharija", "Malahija", "Matej", "Marko", "Luka", "Janez", "Apostolska dela", "Rimljanom", "Korinčanom", "1Korinčanom", "2Korinčanom", "Galačanom", "Efežanom", "Filipljanom", "Kološanom", "Tesaloničanom", "1Tesaloničanom", "2Tesaloničanom", "Timoteju", "1Timoteju", "2Timoteju", "Filemonu", "Hebrejcem", "Jakob", "Peter", "1Peter", "2Peter", "Janez", "1Janez", "2Janez", "3Janez", "Juda", "Razodetje"}


property EnglishBookList : {"Moses", "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "Kings", "1Kings", "2Kings", "Chronicles", "1Chronicles", "2Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Proverbs", "Ecclesiastes", "Ecclesiastes", "Song", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Hosea", "Obadiah", "Jonah", "Micah", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "Corinthians", "1Corinthians", "2Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "Thessalonians", "1Thessalonians", "2Thessalonians", "Timothy", "1Timothy", "2Timothy", "Philemon", "Hebrews", "James", "Peter", "1Peter", "2Peter", "John", "1John", "2John", "3John", "Jude", "Revelation"}


---------------------------------------
-- Routine to replace any book title containing the book string with the corresponding English title in the same place.
---------------------------------------

on run (t)
	set t to t as string 
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
end run