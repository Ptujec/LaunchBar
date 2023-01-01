# LaunchBar Action: NBA Scoreboard

This action is mostly for checking scores of NBA games that are completed and upcoming games. 

<img src="01.jpg" width="656"/> 


## Features

- Per default the action displays games from yesterday and today.
- Enter days from now (e.g. "-3" or "2") or an upcoming weekday ("Sunday", "sun") to look up games from the past or games scheduled in the near future.
- The icon displayed in LaunchBar is either the one from the winning team or the home team, if the game has not started yet.
- Dates and times for scheduled games are translated to your timezone.
- You can press enter `‌↩` to go to the summary of a selected game on espn.com. *(This uses DuckDuckGo and might not always be reliable)*
- Hit `‌⌥ + ↩` to check Youtube for a game recap of the selected game when completed. If the game is not yet completed `⌥ + ↩` should lead you to NBA.com (e.g. to watch the game via league pass). *(This uses DuckDuckGo and might not always be reliable)*

## API Limitations

There are some [limitations due to the balldontlie.io API](https://www.balldontlie.io/#considerations-3) this action is using:
 
- Games are updated only every ~10 minutes. Hence live scores won't be very reliable. 
- Pre-season games are not included.

But the API is completely free. Consider [supporting them](https://www.patreon.com/balldontlie) to keep the API running.

## Download

[Download LaunchBar Action: NBA Scoreboard](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/NBA-Scoreboard) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))