# LaunchBar Action: Passwords for 1Password 8

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

After a little setup (see below) you can view a list of all your login and other items from 1Password 8 in LaunchBar. 

You can view items also when 1Password is selected simply by pressing `space`. 

<img src="01.png" width="552"/>

**Note:** The data received from the CLI does not contain any passwords or secure information. You can enter `op item list --format=json` in the Terminal to see what data is retrieved. For performance reasons the output is stored in a JSON file in the action's support folder, which can be found in `~/Library/Application Support/LaunchBar/Action Support/`.

## Features 

If you hit enter on a selected **login item** it will by default **open the url** and try to **autofill** the relevant information securely in your default browser. If you want to view the item in 1Password instead hit `⌘↩`.

Other items will open in 1Password by default. If there is an url connected to an item (that is not a login item) you can open that with `⌘↩`. 


## Setup

This action requires 1Password's CLI. [Learn how to install and set it up on their website!](https://developer.1password.com/docs/cli/get-started#install). 

## Limitations

1) The action does not copy any passwords. In theory it would be possible to copy passwords to the clipboard. But those would also appear in your clipboard history. You would need to exclude LaunchBar from the clipboard history to prevent that. But this in turn would effect every other built in or custom action. 

2) Because this is just a standard user action there is no indexing going on in the background. To refresh data press `⌥↩`. (You need to do that with the action selected. I won't work if you have 1Password selected.)

3) Autofill and view item in 1Password actions won't work if 1Password 8 is locked.  

## Download

[Download LaunchBar Action: Passwords](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Passwords) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))

## Updates

This action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).
