# LaunchBar Actions for Mastodon

*[→ See a list of all my actions here.](https://ptujec.github.io/launchbar)* 

## 1) Search Action

<img src="01.jpg" width="582"/> 

Search Mastodon accounts and hashtags easily with LaunchBar. You can limit results to just accounts by starting with `@` or just hashtags with `#`.

On first run you will have to choose your preferred Mastodon instance, the one, you are signed in on. You can change your preferred Mastodon instance any time in settings `⇧↩`. 

**Note**: You get better search results, if you use an [API-Token](#api-token). You can set your token in settings `⇧↩`.  

### Accounts

If you hit return `↩` on a selected account it will open the account on your preferred Mastodon instance. Use `⌘↩` to open the account on it's original page. You can even **follow** a selected account right from LaunchBar with `⌥↩`. 

### Hashtags

Hashtags open per default on mastodon.social, which usually has a lot more results. Use `⌘↩` to view results on your home instance. You can even **follow** a selected hashtag right from LaunchBar with `⌥↩`. 

**Note**: Following requires a (free) **[API-Token](#api-token)**.

## 2) Home Action

<img src="02.jpg" width="582"/> 

This action opens the current post or profile in Safari on your home instance. It is inspired by Jeff Johnsons [Homecoming Safari extension](https://underpassapp.com/news/2023-1-19homecoming.html) and [Federico Viticcis shortcut](https://www.macstories.net/ios/masto-redirect-a-mastodon-shortcut-to-redirect-profiles-and-posts-to-your-own-instance/). 

There are a couple of settings, that you can access with `⇧↩`:

<img src="03.jpg" width="582"/> 

**Note**: This action requires a (free) [API-Token](#api-token) to redirect posts. Account pages open quicker without using the API. But the API is still needed as a fallback. This is because in some cases the user handle can not be created correctly without it, e.g. "https://mastodon.macstories.net/@viticci". 

## 3) Post Action (Toot)

This is a simple action to post a status (toot) on Mastodon. If you type a lot a counter will show …

<img src="05.jpg" width="582"/> 

You can use `⌘↩` to view your timeline after a successful post.

**Note**: This action requires a (free) [API-Token](#api-token).

## API-Token 

Go to "https//:`your.server`/settings/applications/". (If you came here from the dialog in the action that link should have opened automatically along with this one.) Then click the `New application` button. 

You need the following permissions:

- Search action: `follow`
- Home action: `read:search`
- Post action: `write:statuses`

You can leave everything else unchecked. Click `Submit`. After that you just need to copy the access token from your newly created "application".  

<img src="04.jpg" width="582"/> 

If you change permissions in an existing application, you need to regenerate the token for the new permissions to take effect.

## Download

[Download LaunchBar Actions for Mastodon](https://minhaskamal.github.io/DownGit/#/home?url=https://github.com/Ptujec/LaunchBar/tree/master/Mastodon) (powered by [DownGit](https://github.com/MinhasKamal/DownGit))

## Updates

This action integrates with Action Updates by @prenagha. You can find the [latest version in his Github repository](https://github.com/prenagha/launchbar). For more information and a signed version of Action Updates [visit his website](https://renaghan.com/launchbar/action-updates/).

