# LaunchBar Browser Actions

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

<img src="01.jpg" width="633"/>

The actions are meant for opening the current tab or window in another browser. 

Supported browsers: 
- Safari
- Brave
- Arc
- Firefox 
- Chrome
- Vivaldi
- Zen

You can also close the site in the browser you came from with `⌘` + `↩`  (cmd-return). Set default behavior in settings `⌥` + `↩`  (shift-return). 

### Good to know
- If you use the close option be aware that Firefox (and Zen) cannot close individual tabs, just windows! 
- Getting an URL from Firefox (and Zen) might be buggy, because it lacks sufficient AppleScript support! If it's not working properly it might help to [increase delay times](https://github.com/Ptujec/LaunchBar/blob/1c6609e474f8916d9d65f83793f48ffbdc277f74/Browser-Actions/Open%20in%20Safari.lbaction/Contents/Scripts/default.js#L171).
- The action will add the **current time marker** to **YouTube** and **Twitch** video URLs automatically. However, for this to work, you need to allow JavaScript for Apple Events. This is turned off by default. To turn it on in Safari, go to `Settings` ‣ `Developer` ‣ `Automation`. In Chromium browsers, you can find the option in the `View` ‣ `Developer` menu. Otherwise, the URL will still be saved, but without the time marker.

## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.