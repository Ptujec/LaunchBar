# LaunchBar Action: Password Generator

Password managers usually cover the need to generate passwords. But every now and then there might be a case where your password manager doesn't work for some reason or it is just easier to do it with a LaunchBar action. 

Per default this action generates a random 12 character long password with lower and upper case letters, numbers and symbols. 

<img src="01.jpg" width="600"/> 

You can change the length with `␣` (space).

<img src="02.jpg" width="596"/>

With `⇧` (shift) you can change defaults for numbers and symbols, that is if they should be included or not.

<img src="03.jpg" width="600"/>

## Clear Clipboard Action

I included a complimentary action that clears the internal clipboard (not LaunchBars clipboard history) after a delay of 30 seconds. The main action runs that automatically. It needed to be an extra action in order to run in the background. Otherwise you would not be able to use LaunchBar again until the delay time has passed.

## Caution

The action both pastes the password in the active text field and copies it to the clipboard. Since it is not an app it can not be excluded for LaunchBars clipboard history (yet). So you need to remove it manually for now. (The Clear Clipboard action does not do that.)

## Download

[Download LaunchBar Action: Password Generator](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Password-Generator) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))

## Updates

This action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).