# LaunchBar Repo Updates Action

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

<img src="01.jpg" width="744"/>

This action completes the idea behind my [Local Action Updates](https://github.com/Ptujec/LaunchBar/tree/master/Local-Action-Updates) action.

## Main Flow

**Action 1: LaunchBar Repo Updates**

1) Checks and updates included repositories.

2) If a repo has new or updated LaunchBar actions, it automatically runs …

**Action 2: Local Action Updates**

3) Compares actions within repos included in Action 1 with your installed actions locally.

4) Offers to update installed actions if a newer version is available.

5) Sends a comprehensive report of updated, new, installed, and not installed actions.

## What is a Repo?

A repository (short repo) is something like a folder. It lives on the web (usually on GitHub.com) and has a local representation on your Mac if you clone it.

## Adding Repositories Locally (Cloning)

If you are new to Git, I recommend using [GitHub Desktop](https://github.com/apps/desktop). This should make adding repos locally (cloning) easier.

All platforms should offer a URL that ends on `.git` somewhere on the main repo page. On [GitHub](https://github.com/Ptujec/LaunchBar) click the green `Code` button. On [Codeberg](https://codeberg.org/Ptujec/LaunchBar) you can find it next to the blue `HTTP` button.

In GitHub Desktop then go to `File > Clone Repository…` and enter the URL.

**Note:** Don't be surprised if you don't see any updates after the initial setup. Everything should already be up to date. In this case, you can run "Local Action Updates" manually and select the newly created local repo.

## Required

[Git](https://git-scm.com). Check if it is installed with the terminal command `git -v`. If not, an easy solution is to install GitHub Desktop, as this will also take care of it.

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.
