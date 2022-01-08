# LaunchBar Action: Todoist Inbox

<img src="main.gif" width="800"/> 

## Why? 
Todoist has its own [quick add function](https://todoist.com/help/articles/task-quick-add). And it’s really really good! So what’s the benefit of a LaunchBar action?

If you don't mind using global shortcuts, there really is not much of a good reason. Even if you do mind, you could do, what I did for a long time. For a long time, I would use a custom action to either simulate pressing the global shortcut or lately launching it with the URI scheme "todoist://addtask". 

The were only a few minor things bugging me with when using my old action: 

1) Running the action, when Todoist is not running. My old action does not work in that (rare) case. Neither does the global shortcut. The app needs to run first. The new action does not need the app running, because it is using the API directly. 

2) When working in fullscreen mode the old action would result  in switching to the desktop or the interface would show up on my other (dimmed) screen. 

3) My old action would also frequently bring up the main Todoist interface.

4) Evoking LaunchBar first and then Todoists quick add interface seemed to be more "noise" than needed. 

**Obviously some of this could easily be solved by just using the global shortcut. But I just like the LaunchBar workflow of pressing cmd-space followed by the initials of the app/action**. It's second nature. It's easier to remember and execute than most global shortcuts. It's kind of my [hyper key](https://thesweetsetup.com/macos-hyper-key-bettertouchtool/).  

So I took another look at the [API](https://developer.todoist.com/rest/v1/#create-a-new-task) and started making this action.

## How it works

The basic idea is very simple. **You select the action in LaunchBar (or the app), hit space, type a few words, hit return, it's in your inbox.** That's it. This is the main purpose. Hence the name.

<img src="02.png" width="800"/> 

However, as I enjoyed adding things to Todoist that way, I added a few more features: 

### Due dates and times

Todoists [Natural Language support](https://todoist.com/help/articles/due-dates-and-times#some-example-date-formats-you-can-use) is the best I have seen in any app. Fortunately you can make use of it with the API.

The action will detect a bunch of due strings like "today, next week, …" automatically (German or English depending on the current locale of your system). The action will provide feedback on how it parses your input. 

<img src="04.png" width="800"/> 

If what you are typing is not detected automatically, you can add "@" at the beginning of your due string to force the action to use that as the due date/time. (In that case just make sure your date string is not followed by some content you want to use for the title.) 

### Priorities

Add priorities like you would in Todoists interface with p1-3.

<img src="05.png" width="800"/> 

### URLs from Safari or Mail

You can even add markdown formatted links for the current website in Safari or a selected email in Mail if you start with a "." 

<img src="md_links.gif" width="800"/> 

### Projects and labels

<img src="06.png" width="800"/> 

If you add "#" somewhere to what you are writing, you can select a project or label after hitting return. (Alternatively you can press ⌘⏎ to get to projects and labels.)

<img src="07.png" width="800"/> 

The projects and labels you use frequently, will appear on top of the list. If you entered a task before, it will suggest the matching project/label the next time.  

### Setup & Settings

You need an API-Token for this action, which you can find when you scroll all the way to the bottom in Todoists [integration settings](https://todoist.com/app/settings/integrations). 
You will be prompted to add it on the first run. 

Hit ⇧⏎ to get to the settings. You can change the API-Token, refresh preloaded data or turn off confirmation notifications. 

## Download

[Download LaunchBar Action: Todoist Inbox](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Todoist-Inbox) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))