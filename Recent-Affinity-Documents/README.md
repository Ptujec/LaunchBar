# LaunchBar Actions: Recent Affinity Documents

Do you miss recent files when you select Affinity Designer, Photo or Publisher in LaunchBar and press space (or right arrow)? 

Actually Affinity apps should display recent documents with this action. But there is a [bug](https://forum.affinity.serif.com/index.php?/topic/186067-recent-files/#comment-1138702), which deletes the information when you close the app. They have been [slow to fix it](https://forum.affinity.serif.com/index.php?/topic/178822-no-”recently-opened-objects“-in-dock-bar/page/2/#comment-1138280). But I have found a work around in the meantime.

In addition to the standard place, the paths to recent files of e.g. Designer are also stored in `~/Library/Application Support/Affinity Designer 2/mru.dat`. This action reads that plist and displays the recent files in LaunchBar as you would expect. Luckily they are in the right order. 

I only use Designer, but this action should be easy to duplicate and modify for Photo and Publisher. 

## Download

[Download LaunchBar Actions: Recent Affinity Documents](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Recent-Affinity-Documents) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))

## Updates

This action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).