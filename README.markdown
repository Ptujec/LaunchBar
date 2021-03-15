# LaunchBar
## Installation and usage:
These actions and applescripts are created for use with [LaunchBar](http://www.obdev.at/products/launchbar/)
- Install AppleScripts by moving them to a folder which is indexed by LaunchBar. The default location would be ~/Library/Application Support/LaunchBar/Actions
- Install LB Actions is much easier. Just double click them.
- For most of them you can enter a query if you hit spacebar when the script or action is selected in LaunchBar … and all the other nice shenanigans which we love LaunchBar for … 
- Some scripts may work even without LaunchBar or might only need some minor modification

## NEW: Subfolder with GUI Scripting Actions
I added a folder with some actions that depend on [GUI scripting](http://www.macosxautomation.com/applescript/uiscripting/). 

GUI scripting is fragile. If Apple or developers make changes to the UI menus involved things will break. Also if you use a different language. My default is German. **So most of these probably won't work out of the box if your UI language is not German.**

But GUI scripting sometimes is the only way to make things happen. And these are some of the most useful in my personal workflow.  

There is one action that can help you fix things. "GUI Elements of active Application" creates lists with all the available elements for GUI scripting of whatever app is active as you run it.   

## Good to know:
- I use Apples [SF Symbols](https://developer.apple.com/sf-symbols/) to create most of the icons for my new actions. It's fairly easy with some tool like Affinity Designer or Pixelmator Pro. They look best if you use simple black vector shapes or text (because that what the symbols are). You can play with the opacity though. Make sure the name ends with "Template" (e.g. IconTemplate.pdf) for LaunchBar to catch it … so they fit in nicely.
