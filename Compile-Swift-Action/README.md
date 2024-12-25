# LaunchBar Action: Compile Swift Action

This action compiles Swift scripts within a LaunchBar action and removes the quarantine attribute from each file in the bundle.

**Be aware that this action should only be used for actions from trusted sources.**

## How To

Follow these steps:

1. Run this action.
2. Select the `.lbaction` bundle of the action you want to compile.
3. Confirm by pressing `return` (`↩`).

If you want to do this for an already installed action, you will find the `.lbaction` bundle at `~/Library/Application Support/LaunchBar/Actions`.

Alternatively, you can:

1. Select the action you want to compile in LaunchBar.
2. Press and hold the `option` (`⌥`) key, then press `→` to select the `.lbaction` bundle.
3. Press `tab` (`⇥`).
4. Select this action.
5. Confirm by pressing `return` (`↩`).

## Background 

Swift scripts run more efficiently when compiled. However, actions with a compiled script can't be shared easily. For security purposes, Apple adds a `com.apple.quarantine` attribute to every file of the download, which you can confirm in Terminal with `xattr` and the file's path. 

This is not an issue until the action contains compiled code. When you attempt to run it, you will receive a malware alert. 

If you have installed [Apple's Command Line Tools](https://www.maketecheasier.com/install-command-line-tools-without-xcode/), you can compile the Swift files yourself (with e.g. `swiftc -O default.swift`) and point the action to the compiled file in the Action Editor. However, the action still won't run due to the `com.apple.quarantine` attribute that Apple adds to every file of the downloaded action bundle. 

Again, you could remove those with LaunchBar's built-in `Open Anyways` action. If you do, you should check the entire bundle before doing this though.

**To make this easier, I built this action so you don't have to do all that manually.**  The action compiles the raw swift files and points `LBSuggestionsScript.LBScriptName`, `LBActionURLScript.LBScriptName` or `LBDefaultScript.LBScriptName` to the complied versions.

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

Use [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates#launchbar-action-local-action-updates) to keep track of new versions of all my actions and discover new ones at the same time. 

This action also supports [Action Updates](https://renaghan.com/launchbar/action-updates/) by Padraic Renaghan.