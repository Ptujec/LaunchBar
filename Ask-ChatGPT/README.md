# LaunchBar Action: Ask ChatGPT

*[→ Click here to view a list of all my actions.](https://ptujec.github.io/launchbar)* 


This action allows you to send requests to ChatGPT. 

<img src="01.jpg" width="740"/> 

Press `space` to start or continue a "conversation" with ChatGPT. Type your question or command, and then select one of the options presented to you, such as starting a new chat or continuing the current conversation.

### What’s next?

No need to wait while the answer is generated. All this is happening in the background without affecting the LaunchBar interface.

The chat will open as a simple **markdown file** when done. 

<img src="04.jpg" width="740"/> 

Additionally the answer is automatically copied to the **clipboard**.

This action works with any text editor, but especially well with a dedicated preview app for Markdown files like [Markdown Preview](https://markdownpreview.app/) or [Marked](https://markedapp.com/).

### Additional Features

- To view recent chats, select the action in LaunchBar and press `enter` or right arrow 
- Use alternative system prompts with `command` + `enter` when you are done entering text. 

### Settings

Access the settings with `option` + `enter`. Here you can:

- Choose a default system prompt
- Choose between models
- Choose an editor/viewer to display the resulting chats 
- Set or reset your API key
- Update, reset or customize system prompts 

### Customize system prompts

You can customize and add as many system prompts as you want, and choose an emoji as the icon to identify them easily. 

```
{
  "systemPrompts": [
    {
      "title": "Assistant",
      "icon": "weasel",
      "description": "This is the default",
      "systemPrompt": "You are a helpful assistant."
    }
  ]
}
```

## Requirements

To use this action, you need an [API key from OpenAI](https://platform.openai.com/account/api-keys) and good judgement on how to use a tool like this 😉. 

## Miscellaneous

- [ChipiChat](https://github.com/quinncomendant/ChipiChat.lbaction#chipichat-launchbarchatgpt) is a cool alternative LaunchBar action for ChatGPT. 
- Why the icon? [The answer is in this toot.](https://mastodon.social/@tess/110105460869464011)

## Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.