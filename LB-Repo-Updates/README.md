# LaunchBar Repo Updates Action

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

This action completes the idea behind my [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates) action.

<img src="02.jpg" width="750"/>

## How It Works

Even though there are two actions involved, it is one simple and largely automatic flow:

**Action 1: LaunchBar Repo Updates**

1) Checks and updates included repositories.

2) If a repo has new or updated LaunchBar actions, it automatically runs …

**Action 2: Local Action Updates**

3) Compares actions within repos included in Action 1 with your installed actions locally.

4) Offers to update installed actions if a newer version is available.

5) Sends a comprehensive report of updated, new, installed, and not installed actions.

## What Is a Repo?

A repository (short repo) is something like a folder. It lives on the web and has a local representation on your Mac if you clone it. 

Most [repos with LaunchBar actions](https://github.com/topics/launchbar?o=desc&s=updated) are hosted on GitHub.

## Adding Repositories Locally (Cloning)

If you are new to Git, I recommend using [GitHub Desktop](https://github.com/apps/desktop). This should make adding repos locally (cloning) easier.

All platforms should offer a URL that ends on `.git` somewhere on the main repo page. On GitHub click the green `Code` button. On Codeberg you can find it next to the blue `HTTP` button.

In GitHub Desktop then go to `File > Clone Repository…` and enter the URL. 

The URL for this repo is: 

```
https://github.com/Ptujec/LaunchBar.git. 
```

**Note:** Don't be surprised if you don't see any updates after the initial setup. Everything should already be up to date. In this case, you can run "Local Action Updates" manually and select the newly created local repo.

## Requirements

[Git](https://git-scm.com). Check if it is installed with the terminal command `git -v`. If not, an easy solution is to install GitHub Desktop as this will also install git in the process.

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.
