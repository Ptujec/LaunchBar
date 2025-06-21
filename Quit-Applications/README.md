# LaunchBar Action: Quit Applications (by Context)

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

<img src="01.gif" width="600"/> 

The purpose of this action is to **limit distractions by quitting apps** that are not needed for what you are currently doing.  

No worries, the action uses non-aggressive termination, so you won't accidentally lose unsaved changes. 

## Custom Contexts

You can set up **custom contexts** in a **plain text file**, which will open on first launch or if you hold `Option`. It's very simple. Choose a name and an emoji that will be displayed as the icon for that context (e.g. `Writing:✍🏻`). 

<img src="02.jpg" width="600"/>   

## Context Configuration

For each context, you can specify apps that are necessary in that context (toggle). The action will quit all other apps. This applies only to apps that show up in the application switcher (`command` + `tab`). LaunchBar and Finder are also excluded. 

<img src="03.jpg" width="600"/>   

There are some additional options you can configure for each context:  
- Show confirmation dialog before quitting (toggle)
- Don't quit frontmost application (toggle)
- Close Finder windows (toggle)

Additionally, you can always protect the frontmost application with `command` + `enter`, even if you have not set it as the default behavior for the context.

## Installation & Requirements (IMPORTANT!)

Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. I made [a dedicated action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme). Run the `.lbaction` bundle of this action through the compile action before you start using it.

## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.