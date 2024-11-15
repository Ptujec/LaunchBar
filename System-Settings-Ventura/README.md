# LaunchBar Action: System Settings Ventura

This action is just filling the gap until [Objective Development](https://www.obdev.at/index.html) releases their Ventura update. 

It has what is available in `‌/System/Library/ExtensionKit/Extensions/`. (Found the hint for that [here](https://gist.github.com/rmcdongit/f66ff91e0dad78d4d6346a75ded4b751?permalink_comment_id=4287036#gistcomment-4287036)). 
It's using localized names if possible. But `‌CFBundleDisplayName` is missing in some of the `‌InfoPlist.loctable` files. Unfortunately the section icons can't displayed either. They are generated automatically from SF Symbols. No support for that in LaunchBar yet. (Not sure there is even an API for that.)

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar Action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

This action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).