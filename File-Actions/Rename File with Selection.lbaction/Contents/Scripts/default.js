/* 
Rename File with Selection Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-13

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  const output = LaunchBar.executeAppleScript(
    `tell application (path to frontmost application as text)
      try
		    set _path to file spec of document of window 1
	    on error
		    set _path to file of document 1
	    end try
	    
      set _path to POSIX path of _path
    end tell`
  ).trim();

  // LaunchBar.log(output);

  const oldFile = output.trim();
  const oldName = File.displayName(output);
  const extension = oldName.split('.').pop();
  const newName = argument.trim();
  const newFile = output.replace(oldName, `${newName}.${extension}`);

  LaunchBar.execute('/bin/mv', oldFile, newFile);
}
