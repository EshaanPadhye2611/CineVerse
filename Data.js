/**
 * Curated picks ("My picks" tab).
 * Format per line:  Title | Year | LanguageCode | GenreCodes
 *   LanguageCode: m=Malayalam t=Tamil u=Telugu k=Kannada h=Hindi e=English o=Korean j=Japanese
 *   GenreCodes:   see GENRES in app.js (Y = Series)
 */
const CURATED_RAW = `Kishkindha Kaandam|2024|m|T
Anjaam Pathiraa|2020|m|TK
Iratta|2023|m|TK
Anweshippin Kandethum|2024|m|TK
Thudarum|2025|m|TD
Eko|2025|m|T
Sookshmadarshini|2024|m|TC
Rekhachithram|2025|m|T
Drishyam|2013|m|TD
Manjummel Boys|2024|m|TD
Bramayugam|2024|m|HT
Nayattu|2021|m|TD
Joseph|2018|m|T
Ela Veezha Poonchira|2022|m|T
Eleven|2025|t|T
Dhuruvangal Pathinaaru|2016|t|T
Por Thozhil|2023|t|T
Maharaja|2024|t|TK
Ratsasan|2018|t|TH
Vikram|2022|t|AT
Vikram Vedha|2017|t|AK
Kaithi|2019|t|AT
Thani Oruvan|2015|t|AT
Jigarthanda|2014|t|KC
Super Deluxe|2019|t|DC
Vada Chennai|2018|t|K
Pariyerum Perumal|2018|t|D
Kshanam|2016|u|T
Kavaludaari|2019|k|T
U Turn|2016|k|T
Lucia|2013|k|TS
Vikrant Rona|2022|k|TF
Premam|2015|m|R
Premalu|2024|m|RC
Bethlehem Kudumba Unit|2025|m|RC
Om Shanti Oshana|2014|m|RC
Hridayam|2022|m|RD
Thattathin Marayathu|2012|m|R
Bangalore Days|2014|m|RCD
Vaazha: Biopic of a Billion Boys|2024|m|C
Vaazha II|2025|m|C
Kumbalangi Nights|2019|m|DR
Aavesham|2024|m|CA
Thallumaala|2022|m|CA
Jaya Jaya Jaya Jaya Hey|2022|m|C
Minnal Murali|2021|m|AFC
Lucifer|2019|m|AT
Lokah Chapter 1: Chandra|2025|m|FA
96|2018|t|R
With Love|2025|t|RC
Sapta Sagaradaache Ello|2023|k|RD
Mungaru Male|2006|k|R
Kirik Party|2016|k|CR
Hi Nanna|2023|u|RD
Sita Ramam|2022|u|R
Dear Comrade|2019|u|RD
Geetha Govindam|2018|u|RC
Arjun Reddy|2017|u|RD
Jersey|2019|u|D
Baahubali: The Beginning|2015|u|AF
RRR|2022|u|A
Pushpa: The Rise|2021|u|AK
Eega|2012|u|FC
Kantara|2022|k|AFH
KGF: Chapter 1|2018|k|A
Shutter Island|2010|e|T
Memento|2000|e|T
The Prestige|2006|e|TS
The Sixth Sense|1999|e|TH
Se7en|1995|e|TK
Zodiac|2007|e|TK
The Silence of the Lambs|1991|e|TH
Knives Out|2019|e|TC
Glass Onion|2022|e|TC
Wake Up Dead Man|2025|e|TC
Fight Club|1999|e|TD
Inception|2010|e|TS
The Matrix|1999|e|SA
Gone Girl|2014|e|T
Prisoners|2013|e|TK
The Usual Suspects|1995|e|TK
American Pie|1999|e|CR
American Pie 2|2001|e|CR
American Wedding|2003|e|CR
The Proposal|2009|e|RC
How to Lose a Guy in 10 Days|2003|e|RC
10 Things I Hate About You|1999|e|RC
The Ugly Truth|2009|e|RC
Friends with Benefits|2011|e|RC
The Holiday|2006|e|RC
Before Sunrise|1995|e|RD
Before Sunset|2004|e|RD
Before Midnight|2013|e|RD
(500) Days of Summer|2009|e|RC
No Strings Attached|2011|e|RC
Crazy, Stupid, Love.|2011|e|RC
About Time|2013|e|RFD
My Oxford Year|2025|e|RD
Life List|2025|e|RD
The Girl Next Door|2004|e|RC
People We Meet on Vacation|2026|e|RC
Good Will Hunting|1997|e|D
Eternal Sunshine of the Spotless Mind|2004|e|RSD
Voicemails for Isabelle|2025|e|R
We Live in Time|2024|e|RD
The Dictator|2012|e|C
She's the Man|2006|e|RC
Mad Max: Fury Road|2015|e|AS
John Wick|2014|e|AK
The Dark Knight|2008|e|AK
Gladiator|2000|e|AD
Mission: Impossible – Fallout|2018|e|AT
Die Hard|1988|e|AT
Top Gun: Maverick|2022|e|AD
Interstellar|2014|e|SD
Blade Runner 2049|2017|e|ST
Arrival|2016|e|SD
Ex Machina|2014|e|ST
Dune|2021|e|SA
The Martian|2015|e|SD
Edge of Tomorrow|2014|e|SA
The Conjuring|2013|e|H
Hereditary|2018|e|H
Get Out|2017|e|HT
A Quiet Place|2018|e|HS
Midsommar|2019|e|H
The Shining|1980|e|H
Superbad|2007|e|C
The Hangover|2009|e|C
Mean Girls|2004|e|C
Free Guy|2021|e|CA
The Shawshank Redemption|1994|e|D
Forrest Gump|1994|e|DR
The Godfather|1972|e|KD
Whiplash|2014|e|D
Joker|2019|e|DK
Oppenheimer|2023|e|D
Spirited Away|2001|j|NF
Your Name|2016|j|NR
Spider-Man: Into the Spider-Verse|2018|e|NA
Inside Out|2015|e|NC
Coco|2017|e|NF
Up|2009|e|NC
The Fellowship of the Ring|2001|e|FA
Harry Potter and the Sorcerer's Stone|2001|e|F
Pan's Labyrinth|2006|e|FD
The Princess Bride|1987|e|FR
Parasite|2019|o|TD
Oldboy|2003|o|TK
Memories of Murder|2003|o|TK
Train to Busan|2016|o|HA
The Handmaiden|2016|o|TR
3 Idiots|2009|h|CD
Dangal|2016|h|D
Andhadhun|2018|h|TC
Drishyam|2015|h|T
Kahaani|2012|h|T
Badla|2019|h|T
Talaash|2012|h|TK
Article 15|2019|h|TK
Dhurandhar|2025|h|AT
Jab We Met|2007|h|RC
Yeh Jawaani Hai Deewani|2013|h|RD
Dilwale Dulhania Le Jayenge|1995|h|R
Barfi!|2012|h|RC
Queen|2013|h|CD
Zindagi Na Milegi Dobara|2011|h|DC
Rockstar|2011|h|RD
Laapataa Ladies|2023|h|CD
Tumbbad|2018|h|HF
Stree|2018|h|HC
Munjya|2024|h|HC
Gangs of Wasseypur|2012|h|K
Sholay|1975|h|A
Lagaan|2001|h|D
Pathaan|2023|h|A
Jawan|2023|h|A
12th Fail|2023|h|D
Kerala Crime Files|2023|m|YK
Money Heist|2017|e|YKT
Dark|2017|e|YST
Breaking Bad|2008|e|YKD
Better Call Saul|2015|e|YKD
Stranger Things|2016|e|YSH
Sherlock|2010|e|YTK
True Detective|2014|e|YTK
Mindhunter|2017|e|YTK
Narcos|2015|e|YK
Chernobyl|2019|e|YD
Black Mirror|2011|e|YST
Game of Thrones|2011|e|YF
Squid Game|2021|o|YT
The Boys|2019|e|YA
Succession|2018|e|YD
Fleabag|2016|e|YC
Friends|1994|e|YCR
The Office (US)|2005|e|YC
Brooklyn Nine-Nine|2013|e|YCK
Panchayat|2020|h|YC
Mirzapur|2018|h|YK
Sacred Games|2018|h|YKT
Scam 1992|2020|h|YD
The Family Man|2019|h|YAT
Paatal Lok|2020|h|YKT
Delhi Crime|2019|h|YK
Gullak|2019|h|YC`;