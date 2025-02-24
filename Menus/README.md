# LaunchBar Action: Menus

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

<img src="01.jpg" width="722"/> 

This action allows listing and triggering [menu items](https://developer.apple.com/design/human-interface-guidelines/components/system-experiences/the-menu-bar) of the current application right from within LaunchBar. 

The benefit of this vs. using the Help shortcut is that it utilizes the superpower of LaunchBar: **adaptive abbreviations**. This makes it easy to find the right menu with just a few keystrokes. 

The action also remembers the **last used item** per application. So if you want to trigger the same menu item again next time around, it's right there for you at the top of the list. 

**NOTE:** The `Apple` and `Help` menu paths are excluded. It helps both performance and avoids unwanted results. More exclusions can be configured in the `config` section in the actions `preferences.plist` (see Advanced).

**NOTE:** If you launch a menu item, after performing the action, the LB interface will not refresh automatically. This is especially relevant for [toggled items](https://developer.apple.com/design/human-interface-guidelines/menus#Toggled-items). If you bring up LB again the changed state is not reflected until you use the action again. You can reuse the item without it. Just be aware that it does the opposite of what it says.  

## Setup (IMPORTANT!)

In order to run smoothly, actions written in Swift need to be both "unquarantined" and compiled. I made [a dedicated action that does both](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#readme). Run the `.lbaction` bundle of this action through the compile action before you start using it.

## Advanced

You can exclude certain menu paths, e.g., "History" in Safari, by editing the `config` section in the actions `preferences.plist`. Just hold `command` while launching the action. This automatically opens the plist in your default editor, so you can tinker away. If something goes wrong, the plist will be reset by the action.

```
<plist version="1.0">
<dict>
	<key>config</key>
	<dict>
		<key>appMenuExclusions</key>
		<dict>
			<key>org.mozilla.firefox</key>
			<array>
				<string>Chronik</string>
			</array>
		</dict>
		<key>globalMenuExclusions</key>
		<array>
			<string>Open Recent</string>
			<string>Services</string>
			<string>History</string>
		</array>
	</dict>
	<key>recentItems</key>
	<array/>
</dict>
</plist>
```

## Alternatives 

If the setup sounds too cumbersome to you check out my ["Menu Bar"](https://github.com/Ptujec/LaunchBar/tree/master/Menu-Bar#launchbar-action-menu-bar-powered-by-finbar) action. It pretty much does the same thing but is powered by [Finbar](https://www.roeybiran.com/apps/finbar). 

There are a few differences, though, compared to this action. The Finbar-powered action does not show menus, just the items in them. Exclusions happen after retrieving all contents rather than while retrieving them. 

This action directly interacts with the Application Services API and should perform better because there is no added layer in between.

If you want a standalone app for the task, Finbar is a great choice, though.

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

Use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates) and [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates#launchbar-action-local-action-updates) to keep track of new versions of all my actions and discover new ones at the same time. 

This action also supports [Action Updates](https://renaghan.com/launchbar/action-updates/) by Padraic Renaghan.