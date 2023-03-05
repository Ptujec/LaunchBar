(*
-- Zoom the first window of the frontmost application
--
-- @author Scott Buchanan <buchanan.sc@gmail.com>
-- @link http://wafflesnatcha.github.com

found here: https://github.com/wafflesnatcha/AppleScripts/blob/master/Windows/Zoom%20Window.applescript
*)

try
	tell application (path to frontmost application as Unicode text) to tell window 1 to set zoomed to not zoomed
end try