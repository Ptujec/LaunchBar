# LaunchBar Action: Compile Swift Action

This action compiles Swift scripts within a LaunchBar action and removes the quarantine attribute from each file in the bundle.

**Be aware that this action should only be used for actions from trusted sources.**

## Background 

Swift scripts run more efficiently when compiled. However, actions with a compiled script can't be shared easily. For security purposes, Apple adds a `com.apple.quarantine` attribute to every file of the download, which you can confirm in Terminal with `xattr` and the file's path. 

This is not an issue until the action contains compiled code. When you attempt to run it, you will receive a malware alert. 

If you have installed [Apple's Command Line Tools](https://www.maketecheasier.com/install-command-line-tools-without-xcode/), you can compile the Swift files yourself (with e.g. `swiftc -O default.swift`) and point the action to the compiled file in the Action Editor. However, the action still won't run due to the `com.apple.quarantine` attribute that Apple adds to every file of the downloaded action bundle. 

Again, you could remove those with LaunchBar's built-in `Open Anyways` action. If you do, you should check the entire bundle before doing this though.

**To make this easier, I built this action so you don't have to do all that manually.**  The action compiles the raw swift files and points `LBSuggestionsScript.LBScriptName`, `LBActionURLScript.LBScriptName` or `LBDefaultScript.LBScriptName` to the complied versions.

## Download

[Download LaunchBar Action: Compile Swift Action](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))

## Updates

This action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).