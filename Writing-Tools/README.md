# LaunchBar Action: Writing Tools (powered by ChatGPT)

*[→ Click here to view a list of all my actions.](https://ptujec.github.io/launchbar)* 

<img src="01.jpg" width="848"/> 

Writing Tools[^1] is an action that helps you improve your writing, e.g. by checking your spelling, grammar, and punctuation. Tools are fully customizable (see below).

You can mark and send text to the action or have it mark all text automatically. The changed text will replace the selection.

By default, the action will use your default tool (see Settings). To select a different tool, press `Command` + `Enter`.

<img src="02.jpg" width="848"/> 

The action works with any text field in any app. However, **it works best with iA Writer** and its [powerful feature to distinguish between authors](https://ia.net/writer/support/editor/authorship). This way, you can easily see all the changes made by ChatGPT.

If you prefer, you can also use the [BBEdit](https://www.barebones.com) comparison feature instead.

***Note:** The iA Writer paste feature uses [GUI scripting](http://www.macosxautomation.com/applescript/uiscripting/) and may not work properly after an update of iA Writer. Please [report](https://github.com/Ptujec/LaunchBar/issues/new) any issues you encounter.* 

## Settings

Access the settings with `Option` + `Enter`. 

<img src="03.jpg" width="848"/> 

## Edit tools

You can customize and add as many tools as you like. Make sure you keep the JSON syntax intact; otherwise, tools will be reset to the default set of tools. Below is an example of how the code looks:

```
{
  "tools" : [
    {
      "id" : "1",
      "title" : "Check spelling",
      "prompt" : "Correct the following text:\n",
      "persona" : "You are a proofreader. Review the provided input for any spelling, grammar, or punctuation errors. Answer in the language of the provided text."
    },
    {
      "id" : "2",
      "title" : "Make concise",
      "prompt" : "Make the following text more concise:\n",
      "persona" : "You are an editor. Remove unnecessary words to achieve a concise, simple and coherent text with correct spelling, grammar and punctuation. Answer in the language of the provided text."
    }
  ]
}
```

## Requirements

To use this action, you need an [API key from OpenAI](https://platform.openai.com/account/api-keys). If you're using my [Ask ChatGPT](https://github.com/Ptujec/LaunchBar/tree/master/Ask-ChatGPT#readme) action already, it will automatically import the key.

## Download

[Download LaunchBar Action: Writing Tools](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Writing-Tools) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))

## Updates

This action integrates with Action Updates by @prenagha. Find the [latest version on his GitHub](https://github.com/prenagha/launchbar) and a signed version on his [website](https://renaghan.com/launchbar/action-updates/).

[^1]: I have not had the chance to try Apple's AI Writing Tools, but so far, they do not sound too promising anyway. With this action, you can always benefit from the latest OpenAI models and refine the tools yourself.