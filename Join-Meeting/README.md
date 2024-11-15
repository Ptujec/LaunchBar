# LaunchBar Action: Join Meeting

This action checks your recent events for links to Zoom or Microsoft Teams, events that started within the last hour or will start in the next 20 minutes. 

<img src="01.png" width="648"/>

Press `⏎` to join the selected meeting. 

## Note about Swift scripts

Swift scripts run faster when compiled. Unfortunately I can't share the action with a compiled script. For security reasons Apple adds a `com.apple.quarantine` attribute to every downloaded file. (You can check that in Terminal with `‌xattr` plus the path to the file.) 

This is not a problem yet. The problem starts when the main script file is an executable. If you want to run that you will get a malware alert.

You can compile `default.swift` file yourself with `swiftc -O default.swift`. You will need Command Line Tools for that. [But it's a fairly easy and small install](https://www.maketecheasier.com/install-command-line-tools-without-xcode/). Obviously you also need to change the `LBScriptName` key in `info.plist`, pointing it to the executable. 

Now you have the compiled executable and you know it matches the source file, because you compiled it yourself. But the action still won't run. This is because of the attribute on every other file of the action bundle. You can remove the attribute with LaunchBars built in `Open Anyways` action. Just be aware that this will remove the attribute from all files in that bundle. Potentially there could be other executables that the main script refers to. So check the whole bundle before you do this. And only do it if you trust the source. 

**I know, that sounds like a lot. That is why I built [an action to make that process easier](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme).** 

## Download
[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

The latest version of this action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).