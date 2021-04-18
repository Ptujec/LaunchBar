# http://superuser.com/questions/331313/how-to-automagically-move-windows-between-monitors-with-one-keystroke
# https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
# https://forum.latenightsw.com/t/get-sizes-of-monitor-s-via-applescript/1351/10


on run
	set s to 85
	resize(s)
end run

on handle_string(_string)
	set s to 100 - _string
	resize(s)
end handle_string

on resize(s)
	try
		tell application "System Events"
			tell (first process whose frontmost is true)
				set _size to size of window 1
				set _w to item 1 of _size
				set _h to item 2 of _size
				
				set _w1 to _w * s / 100
				set _h1 to _h * s / 100
				
				set _x_offset to (_w1 - _w) / 2
				set _y_offset to (_h1 - _h) / 2
				
				set _pos to position of window 1
				set _x to item 1 of _pos
				set _y to item 2 of _pos
				set _x to _x - _x_offset
				set _y to _y - _y_offset
				
				if _x < 0 then
					set _x to 0
				end if
				if _y < 25 then
					set _y to 25
				end if
				
				set position of window 1 to {_x, _y}
				set size of window 1 to {_w1, _h1} # {1072, 730}
			end tell
		end tell
	end try
end resize