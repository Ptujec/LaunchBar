/* 
Bluesky Search Action for LaunchBar
by Christian Bender (@ptujec)
2024-11-15

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  const result = HTTP.getJSON(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURI(
      argument
    )}&limit=12`
  );

  if (result.error) return;

  if (result.response.status !== 200) {
    return;
    // return LaunchBar.alert(
    //   `Error ${result.response.status}: ${result.response.localizedStatus}`
    // );
  }

  const actors = result.data.actors.map((item) => ({
    title: item.displayName,
    subtitle: item.handle,
    alwaysShowsSubtitle: true,
    url: `https://bsky.app/profile/${item.handle}`,
    icon: 'iconTemplate',
  }));

  const searchQuery = {
    title: argument,
    icon: 'searchTemplate',
    url: `https://bsky.app/search?q=${encodeURI(argument)}`,
  };

  const hashtag = argument.split(/\s+/).join('');

  const hashtagItem = {
    title: `#${hashtag}`,
    icon: 'hashtagTemplate',
    url: `https://bsky.app/hashtag/${hashtag}`,
  };

  return [searchQuery, hashtagItem, ...actors];
}
