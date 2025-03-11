# LaunchBar URL Scheme Actions

The following actions are great for what David Sparks calls [contextual computing](https://www.macsparky.com/blog/2020/12/linking-and-contextual-computing/).

## Mail

<img src="mailURL.gif" width="600"/> 

This action creates a formatted link to an open or selected email. A rich text and Markdown version is saved and inserted by the system depending on the target. You can add a custom title by pressing `space`. Paste only the URL using `command` + `enter`.

## Mindnode & iA Writer

Those work similarly to the Mail version, but you have to select the document you want to link to. If you run one of those actions, they will open a dialog to select the document. Alternatively, you can select the document first in LaunchBar and send it to the action with `tab`.

## Setup (IMPORTANT!)

**In order to run smoothly, actions written in Swift need to be both "un-quarantined" and compiled. I made [a dedicated action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme). Run the `.lbaction` bundle of the actions through the compile action before you start using them.**


## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.
