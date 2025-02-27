# LaunchBar Action: Audio Devices

This action allows you to switch between audio devices. 

<img src="01.jpg" width="802"/>

## Features

Devices are **intentionally sorted** in a way that makes it easy to toggle between two output devices. 

**Exclude selected devices** with `Control` + `Enter`. Virtual devices (e.g. Microsoft Teams Audio) are excluded automatically. You can show all devices, including excluded devices, with `Command` + `Enter`.

By default, **sound effects** (e.g. system alerts) will play on the new output device. You can prevent that by pressing `Option` + `Enter` on a selected output device.

If you hold `Command` when switching to a new output device, the list will be filtered by only input devices next, or vice versa.

## Note About AirPlay Devices

AirPlay support is not ideal yet. This is because CoreAudio does not list AirPlay devices consistently. You can try to add or update AirPlay devices by holding `Shift`. This is a compromise to keep the action as responsive as possible while allowing AirPlay devices to be included. **Listing and activating AirPlay devices usually involves GUI scripting. This means the action will open System Preferences.**

I tried to implement this as gracefully as possible, but there may be some hiccups, e.g., the device showing only a generic "AirPlay" name instead of its real name. This usually occurs if you activated an AirPlay device without using the action.

Also, the list of devices won't be refreshed automatically after activation with the GUI workaround. This is to avoid blocking the LB interface while waiting.

## Installation (IMPORTANT!)

Unfortunately, in order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. I made [a dedicated action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme). Run the `.lbaction` bundle of this action through the compile action before you start using it.

Let me know if you need help.  

## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.

## Miscellaneous

Padraic Renaghan has [a similar LaunchBar action](https://renaghan.com/launchbar/switch-audio/). Shout out also to George Karagkiaouris for his [macos-audio-devices](https://github.com/karaggeorge/macos-audio-devices) repo; this was very helpful. If you are using Alfred, have a look at [alfred-audio-switcher](https://github.com/TobiasMende/alfred-audio-switcher) by Tobias Mende.
