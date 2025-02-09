# LaunchBar Action for Zotero

Search, browse, and act on items from your local [Zotero](https://www.zotero.org) database. 

**Note**: I tested this action with a library of 2k items (almost 4k if you count attachments). It should be pretty snappy with that size. However, I am always open to ideas or contributions to improve performance.

## Search 

<img src="01.jpg" width="806"/> 

As you begin your search, helpful suggestions will appear, including creator names, tags, and titles.

If your search returns no results in the database, the action will automatically search the content of your local attachments (PDFs) using [`mdfind (Spotlight)`](https://metaredux.com/posts/2019/12/22/mdfind.html). 

You can also directly search both the database and your local attachments with `command` + `enter`.  

**Note**: Searching in local attachments does not work with [linked files](https://www.zotero.org/support/attaching_files#stored_files_and_linked_files). It also does not work if you use a custom Zotero directory that is not indexed by Spotlight.
  

## Browse

<img src="02.jpg" width="806"/> 

If you press `enter` instead of `space`, you can [browse your database](https://ptujec.github.io/the-unique-power-of-browsing-in-launchbar/) by creators, tags, collections, or all items. 

Additionally, you have quick access to your three most recently used items.

## Details & Actions

<img src="03.jpg" width="806"/> 

If you hit `enter` on a particular item, you can see more details such as tags, publications, links, or attachments. 

Many of the details also offer further functionality. For instance, you can quickly look inside an attached PDF.

<img src="04.jpg" width="806"/>  

Here is a list of possible actions: 

#### 1) More Browsing

You can browse and display related items that are part of the same collection, publication, or book, have the same tag, or are written by the same author.

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

#### 6) 🪄 The Magic Title Item

As this LaunchBar action is primarily tailored to give you quick access to the content of your Zotero database, the title item has kind of "superpowers". If a PDF is attached, you can open the PDF right from that item using Quick Look. If there is no PDF, but there is a link, you can open that instead. If none of these options are available, pressing `enter` will reveal the item in Zotero.

## Shortcuts

There are also some shortcuts (modifier keys) that work with any selected Zotero item. 

1) Open a given item in Zotero with `command` + `enter`. This will reveal a PDF attachment in the Finder if selected.

2) Paste a citation reference with `shift` + `enter`. 

3) Paste a bibliography reference with `shift` + `option` + `enter`.  

Those even work on the top level. So you don't need to go into details to use them.

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

## Updates

Use [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates#launchbar-action-local-action-updates) to keep track of new versions of all my actions and discover new ones at the same time. 

This action also supports [Action Updates](https://renaghan.com/launchbar/action-updates/) by Padraic Renaghan.