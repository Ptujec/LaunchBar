tell application "System Events"
	activate
	set f to choose folder with prompt "Pick a folder:"
	set p to POSIX path of f
end tell

return p