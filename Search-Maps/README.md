# Search Maps Action for LaunchBar

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

This action improves searching on Apple Maps with LaunchBar. The two main features of this action are suggestions as you type and support for directions.

## Suggestions

The action displays suggestions as you type. Because, you know, sometimes it's just hard to recall the correct spelling of certain names. 

<img src="01.jpg" width="828"/> 

## Directions

If you indicate you are searching for directions (by using "to" or "from"), the action will display how it is interpreting your search query.

<img src="02.jpg" width="828"/> 

If you want to utilize the suggestion feature for your destination, you may start your query with the destination followed by the word "from". Doing so will result in the action defaulting to the current location if you do not specify a source location. 

<img src="03.jpg" width="828"/> 

## what3words

The action also supports [what3words](https://what3words.com/about) locations. An API key is required. Recognition is pretty flexible. You can skip the 3 slashes or send the entire url. It doesn't matter.  

<img src="04.jpg" width="828"/> 

## Installation (IMPORTANT!)

Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. I made [a dedicated action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme). Run the `.lbaction` bundle of this action through the compile action before you start using it.

Let me know if you need help. 

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.
