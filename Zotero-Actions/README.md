# Search Zotero Action

Search, browse, and act on items from your local [Zotero](https://www.zotero.org) database. 

**Note**: I tested this action with a library of 2k items (almost 4k if you count attachments). It should be pretty snappy with that size. However, I am always open to ideas or contributions to improve performance.

## Search 

<img src="01.jpg" width="700"/> 

As you begin your search, helpful suggestions will appear, including creator names, tags, and titles.

If your search returns no results in the database, the action will automatically search the content of your local attachments (PDFs) using [`mdfind (Spotlight)`](https://metaredux.com/posts/2019/12/22/mdfind.html). 

You can also directly search both the database and your local attachments with `command` + `enter`.  

**Note**: Searching in local attachments does not work with [linked files](https://www.zotero.org/support/attaching_files#stored_files_and_linked_files). It also does not work if you use a custom Zotero directory that is not indexed by Spotlight.
  

## Browse

<img src="02.jpg" width="700"/> 

If you press `enter` instead of `space`, you can [browse your database](https://ptujec.github.io/the-unique-power-of-browsing-in-launchbar/) by creators, tags, collections, or all items. 

Additionally, you have quick access to your three most recently used items.

## Details & Actions

<img src="03.jpg" width="700"/> 

If you hit `enter` (or `space` or `→`) on a particular item, you can see more details such as tags, links, attachments, annotations and notes. 

Many of the details also offer further functionality. For instance, you can quickly look inside an attached PDF.

<img src="04.jpg" width="700"/>  

Here is a list of possible actions: 

#### 1) More Browsing

You can [browse](https://ptujec.github.io/the-unique-power-of-browsing-in-launchbar/) and display related items that are part of the same collection, publication, or book, have the same tag, or are written by the same author.

#### 2) Interact with Attachments

You can use Quick Look, open the attachment, or even mail it to someone. There are plenty of possibilities. [(If you are new to LaunchBar, take a look at the "Joining Forces" video.)](https://www.obdev.at/products/launchbar/videos.html)

#### 3) Open Links 

If there is a URL specified for the item, you can open it.

#### 4) Select in Zotero

This action also allows you to quickly look up items in the Zotero app. This way, you can quickly edit an item or perform other tasks that you cannot currently do within the action itself.

**Note**: This will always open Zotero, but it may fail to select the item on the first attempt if Zotero is not running previously. This is a limitation of Zotero. In this case, use the action again once Zotero is running.

#### 5) Paste and Link Citation/Bibliography

You can paste citation and bibliography references for a selected item to your frontmost application, including a link to the item in Zotero.

By default, the citation will be pasted, and the link is copied to the clipboard, so it is easy to add it. Other options are rich text*, markdown, or HTML. Select the action, and then press `option` + `enter`. 

With the same shortcut, you can also access the setting to turn off linking to the Zotero item. (The HTML option does not include the link to the Zotero item, regardless of this setting.)

This feature will use the last used style from the Zotero preferences by default. However, you can choose a different one from your installed styles when you select the action and then press `option` + `enter`.

**Note:** This feature is using a **local version** of the [web API](https://www.zotero.org/support/dev/web_api/v3/basics) (available in Zotero 7). You need to enable `Allow other applications on this computer to communicate with Zotero` in Zotero → Settings → Advanced. Additionally, Zotero needs to be running.

*"***Zotero Paste Helper**" is a companion action written in Swift that is **not required** but largely improves pasting rich text. If available the Zotero action will utilize it automatically. It includes a fallback to Markdown for apps that can't handle rich text.* *[It needs to be compiled to run properly](https://github.com/Ptujec/LaunchBar/tree/master/Compile-Swift-Action#launchbar-action-compile-swift-action).*

#### 6) View, Open, or Paste Annotations

If there are annotations linked to an item (like highlighted or underlined text), you can view them, open them, or paste them into a text field using the usual modifier keys (see "Shortcuts" below). When you paste an annotation, a citation reference (see 5) is included automatically.

#### 7) 🪄 The Magic Title Item

As this LaunchBar action is primarily tailored to give you quick access to the content of your Zotero database, the title item has kind of "superpowers". If a PDF is attached, you can open the PDF right from that item using Quick Look. If there is no PDF, but there is a link, you can open that instead. If none of these options are available, pressing `enter` will reveal the item in Zotero.

## Shortcuts

There are also some shortcuts (modifier keys) that work with any selected Zotero item. 

1) Open a given item in Zotero with `command` + `enter`. This will reveal a PDF attachment in the Finder if selected.

2) Paste a citation reference with `shift` + `enter`. 

3) Paste a bibliography reference with `shift` + `option` + `enter`.  

Those even work on the top level. So you don't need to go into details to use them.

# RIS Cleanup Action

This action helps to clean up and remove unnecessary tags before importing a RIS file. Send the RIS file to the action, choose the tag you want to remove and confirm with `enter`. When everything looks fine choose the `Add to Zotero` option on top. 

You can find more options when you press `command` + `enter`, including setting up a list with RIS tags to be removed automatically.

If you run the action without any input, it will select a copy of your last used RIS file.

BTW, you can set up a [folder action](https://www.macosxautomation.com/automator/folder-action/) to monitor your downloads folder for RIS files so the action runs automatically. This script will do the job:

```
on run {input, parameters}
	set s to input as string
	if s ends with ".ris" then
		do shell script "afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf"
		tell application "LaunchBar"
			activate
			perform action "RIS Cleanup" with string input
		end tell
	end if
end run
```

**Note:** If you use this in a Chromium-based browser with the Zotero Connector extension, you need to turn off the automatic import option.

# Download & Update

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or simply use [LaunchBar Repo Updates](https://github.com/Ptujec/LaunchBar/tree/master/LB-Repo-Updates#launchbar-repo-updates-action)! It helps automate updating existing and installing new actions.