# LaunchBar Action: Compile Swift Action

This action compiles Swift scripts within one or multiple  LaunchBar actions and removes the quarantine attribute from each file in the bundle. **Use only with actions from developers you trust or code you have verified yourself.**

If you don't have **Apple's Command Line Tools** installed, you need to install them. It seems [best to do that manually at the moment](https://github.com/orgs/Homebrew/discussions/5723#discussioncomment-11185411).

If you have questions or need help, let me know.

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

Since version 1.3 the action can also process multiple action bundles at once.

If you compile an installed action, give LB a second or two to catch the changes.

## Background

Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled.

For security purposes, Apple adds a `com.apple.quarantine` attribute to every file of the download, which you can confirm in Terminal with `xattr` and the file's path.

When you attempt to run the action with a compiled script (executable), you will receive a malware alert. Even if you don't compile it, it may cause issues.

The quarantine attribute can be removed when you open the action in Terminal and run the following command: `xattr -rd com.apple.quarantine .`.

The following command will compile a script: `swiftc -O path-to-script-file`. Obviously, the action needs to be pointed to the compiled file in the Action Editor.

**I built this action so you don't have to do all that manually.**

The action first removes the quarantine attribute from each file in the bundle and then compiles the raw Swift files and points `LBSuggestionsScript.LBScriptName`, `LBActionURLScript.LBScriptName`, or `LBDefaultScript.LBScriptName` to the compiled versions.

## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.
