# LaunchBar Action: Audio Devices

This action allows you to switch between audio devices. 

<img src="01.jpg" width="802"/>

## Features

Devices are **intentionally sorted** in a way that makes it easy to toggle between two output devices. 

**Exclude selected devices** with `Control` + `Enter`. You can show excluded devices with `Command` + `Enter`.

By default, **sound effects** (e.g. system alerts) will play on the new output device. You can prevent that by pressing `Option` + `Enter` on a selected output device.

If you hold `Command` when switching to a new output device, the list will be filtered by only input devices next, or vice versa.

## Note About AirPlay Devices

AirPlay devices are not fully supported yet. CoreAudio does not list AirPlay devices consistently. You can try to add or update AirPlay devices by holding `Shift`, but this is a workaround that involves GUI scripting, which is very fragile.

## Note About Swift Scripts

Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. I made [an action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme).

## Miscellaneous

Padraic Renaghan has [a similar LaunchBar action](https://renaghan.com/launchbar/switch-audio/). Shout out also to George Karagkiaouris for his [macos-audio-devices](https://github.com/karaggeorge/macos-audio-devices) repo; this was very helpful. If you are using Alfred, have a look at [alfred-audio-switcher](https://github.com/TobiasMende/alfred-audio-switcher) by Tobias Mende. 

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

Use [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates#launchbar-action-local-action-updates) to keep track of new versions of all my actions and discover new ones at the same time. 

This action also supports [Action Updates](https://renaghan.com/launchbar/action-updates/) by Padraic Renaghan.