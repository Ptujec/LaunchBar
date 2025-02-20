# LaunchBar Repo Updates Action

<img src="https://raw.githubusercontent.com/Ptujec/LaunchBar/master/header.jpg" width="640"/>

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

## Adding Repositories Locally

If you are new to Git, I recommend using [GitHub Desktop](https://github.com/apps/desktop). This should make adding repos locally (cloning) easier.

It is pretty straightforward. For repos hosted on GitHub, go to the main repo page …

1) Click the green `Code` button.

2) If not selected, click `GitHub CLI`.

3) Click `Open with GitHub Desktop` and follow the instructions.

<img src="01.jpg" width="572"/>

It is not complicated at all for other platforms (e.g. [Codeberg](https://codeberg.org/Ptujec/LaunchBar)) either. Just copy the Git URL. In GitHub Desktop, go to `File > Clone Repository…` and enter the URL.

**Note:** Don't be surprised if you don't see any updates after the initial setup. Everything should already be up to date. In this case, you can run **Local Action Updates** manually and select the newly created local repo.

## Required/Recommended

1) [Git](https://dev.to/milu_franz/git-explained-the-basics-igc). Installing GitHub Desktop will take care of this.

2) [GitHub account](https://github.com/signup). This is not required, but recommended since [most LaunchBar repositories exist on GitHub](https://github.com/topics/launchbar?o=desc&s=updated). This action also works with [Codeberg](https://codeberg.org/Ptujec/LaunchBar) … and probably GitLab. But I have not tested the latter.

## Download

[Click here](https://github.com/Ptujec/LaunchBar/archive/refs/heads/master.zip) to download this LaunchBar action along with all the others. Or [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)*