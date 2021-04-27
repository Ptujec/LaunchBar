-- Check if either Overcast or Podcasts is installed
-- Ptujec 2021-04-27

set podApp to "none"
try
	tell application "Finder" to get application file id "com.apple.podcasts"
	set podApp to "Podcasts"
end try
try
	tell application "Finder" to get application file id "fm.overcast.overcast"
	set podApp to "Overcast"
end try
return podApp
