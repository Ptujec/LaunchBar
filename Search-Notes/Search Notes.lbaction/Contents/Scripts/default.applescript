(* 
Search Notes Action for LaunchBar
by Christian Bender (@ptujec)
2022-06-20

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE 
*)

on handle_string(s)
	set output to {}
	
	tell application "Notes"
		set _notes to (notes whose plaintext contains s)
		
		repeat with _note in _notes
			set _id to id of _note
			set _name to name of _note
			set _sub to creation date of _note as string
			
			set _cont to container of _note
			set _folder to name of _cont
			
			set end of output to {title:_name, subtitle:_sub, label:_folder, icon:"com.apple.Notes", action:"openNote", actionArgument:_id, actionRunsInBackground:true}
		end repeat
	end tell
	return output
end handle_string

on openNote(_id)
	tell me to activate
	tell application "Notes" 
		activate
		show note id _id
	end tell
end openNote