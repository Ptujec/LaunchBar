# LaunchBar Action: Transcripts (YouTube)

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

This action allows you to download transcriptions from YouTube videos. You can pass a URL to the action, or simply press `Enter` to let the action retrieve the URL from your browser.

Then choose the desired transcription from the list of languages.

<img src="01.jpg" width="584"/>

The action will create and open a plain text file with the selected transcript in Markdown format.

## Requirements

The actual downloading of a transcript requires an API key. You can get yours [here](https://rapidapi.com/nikzeferis/api/youtube-captions-transcript-subtitles-video-combiner). The basic plan is free.

You will be prompted to enter it upon first use.

## Settings

When holding `Option` while pressing `Enter`, you can decide whether you want to include time markers and links by default.

You can also reset your API key there. This information is stored locally in the [Action Support Path](https://developer.obdev.at/resources/documentation/launchbar-developer-documentation/#/script-environment).

## Good to Know

1) Some videos don’t provide transcriptions. 

2) This action works best with Safari because we save a load request.

## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.
