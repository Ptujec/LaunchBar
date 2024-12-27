# LaunchBar Action: Join Meeting

This action checks your recent events for links to Zoom or Microsoft Teams, events that started within the last two hours or will start in the next 30 minutes. 

<img src="01.png" width="648"/>

Press `⏎` to join the selected meeting. 

## Setup and Note About Swift Scripts

Unfortunately, this is kind of a pain to set up. I'm sharing it anyway because I find it so beneficial. If you need help, let me know.

This action needs calendar access. You will hopefully be prompted to allow calendar access.

If you don't have Apple's Command Line Tools installed[^1], you will probably be prompted to do so. They will surely be needed if you want to compile the script, which helps run it much faster. 

Unfortunately, I can't share the action with a compiled script. For security reasons, Apple adds a `com.apple.quarantine` attribute to every downloaded file. (You can check that in Terminal with `‌xattr` plus the path to the file.) 

Just the added attribute is not necessarily a problem yet. But you will surely run into an issue when the main script file is an executable (the compiled script). If you want to run that, you will get a malware alert.

You can compile the `default.swift` file yourself with `swiftc -O default.swift`. You will need Command Line Tools for that. [But it's a fairly easy and small install](https://www.maketecheasier.com/install-command-line-tools-without-xcode/).[^1] Obviously, you also need to change the `LBScriptName` key in `info.plist`, pointing it to the executable. 

Now you have the compiled executable, and you know it matches the source file because you compiled it yourself. But the action still won't run. This is because of the attribute on every other file of the action bundle. You can remove the attribute with LaunchBar's built-in `Open Anyway` action. Just be aware that this will remove the attribute from all files in that bundle. Potentially, there could be other executables that the main script refers to. So check the whole bundle before you do this. And only do it if you trust the source. 

**I know that sounds like a lot. That is why I built [an action to make that process a little easier](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme).**

If you still need help, which is totally possible, let me know.  

## Download
[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

Use [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates#launchbar-action-local-action-updates) to keep track of new versions of all my actions and discover new ones at the same time. 

This action also supports [Action Updates](https://renaghan.com/launchbar/action-updates/) by Padraic Renaghan.


[^1]: There is currently a [bug when installing command line tools as described](https://github.com/orgs/Homebrew/discussions/5723#discussioncomment-11185411). That's on Apple. But it doesn't matter. Try to install it as described in the linked thread.

---
Anmerkungen: 0,3217 SHA-256 bea81566c18f8e1a32450c50007351b6  
&ChatGPT: 3181  
...
