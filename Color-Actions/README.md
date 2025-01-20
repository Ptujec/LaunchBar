# LaunchBar Color Actions

*[→ Click here to view a list of all my actions.](https://ptujec.github.io/launchbar)*

## Color Palette from Website

<img src="01.jpg" width="649"/> 

This action extracts color codes (hex and rgba) from a website and puts them in a local HTML file. You can:

- Copy a color value by clicking on it. 
- Import the whole palette as a list to the system color picker. 
- Browse files (with `space`).
- Choose a browser in which the files should be opened (with `option` + `enter`).

## Import Colors

<img src="02.jpg" width="649"/> 

This action is meant to be used with LaunchBar's "send to" feature. Select a list of color values, e.g., from the clipboard history, hit `tab`, select the action and press `enter`. 

## Note

Unfortunately new lists/palettes will not appear in the color picker of an active application automatically. Either restart the app or click the little `…` icon, choose `open` and select the `.clr` file from `~/Library/Colors`.

If you have an idea how to solve that programmatically let me know. 

## Installation (IMPORTANT!)

Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. I made [a dedicated action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme). Run the `.lbaction` bundle of each action through the compile action before you start using it.

Let me know if you need help. 

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

Use [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates#launchbar-action-local-action-updates) to keep track of new versions of all my actions and discover new ones at the same time. 

This action also supports [Action Updates](https://renaghan.com/launchbar/action-updates/) by Padraic Renaghan. 

## Miscellaneous

- You can find good color palettes on [Color Hunt](https://colorhunt.co/). The website action works great here.
- ChatGPT also produces some cool results sometimes. I have a prompt for that in my [Ask ChatGPT action](https://github.com/Ptujec/LaunchBar/tree/master/Ask-ChatGPT#2-use-predefined-prompts). You can select the results in the table and send them to the import action. 
- [System Color Picker by Sindre Sorhus](https://sindresorhus.com/system-color-picker) puts the system color picker in a nice little app, with some helpful additions.
- Want to learn more about the Color Picker? [Macmost](https://www.youtube.com/watch?v=MQqntlvhGLg) and [robinwood](https://www.robinwood.com/Catalog/Technical/OtherTuts/MacColorPicker/MacColorPicker.html) have you covered.

