# LaunchBar Action: Send iMessage to Contact

You can tell LaunchBar to open Messages for a phone number out of the box. This action is an alternative way to do it. With this action all you need to do is select a contact and send it to the action. The number is picked automatically. 

<img src="01.gif" width="780"/>

Or you can select the action and type the contacts name.  

## Note
The action should run pretty smoothly. If not you can improve the performance by making the `default.swift` file an executable with `swiftc -O default.swift`. You obviously need to change the `LBScriptName` key in `info.plist`, pointing it to the executable. 
(Unfortunately I can't share the action with the executable at the moment, because I can not sign the action. So the action would be actually unusable.)

## Download
[Download LaunchBar Action: Send iMessage to Contact](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Send-iMessage-Contact) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))

## Updates

The latest version of this action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).