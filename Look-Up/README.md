# LaunchBar Action: Look Up in Dictionary

This action is an attempt to recreate some of what [this action](https://github.com/nbjahan/launchbar-livedic) did when it was still working.

<img src="01.jpg" width="794"/>

Unfortunately, the [official API](https://developer.apple.com/documentation/coreservices/1446842-dcscopytextdefinition) doesn't offer much else than all the info in one long string of text.

I guess it is better than nothing. But in all honesty, it might be easier to just use the [trackpad gesture](https://support.apple.com/de-de/guide/mac-help/mchl3983326c/mac). There is also a service that is associated with the app by default. It won't give you a preview, but it works fine to enter a query.

If you still want to use this, read on.

## Installation (IMPORTANT!)

Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. I made [a dedicated action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme). Run the `.lbaction` bundle of this action through the compile action before you start using it.

Let me know if you need help. 

## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.