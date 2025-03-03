/* 
Brave Bookmarks Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const bookmarksPath =
  LaunchBar.homeDirectory +
  '/Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks';

function run() {
  const { roots } = File.readJSON(bookmarksPath);
  const items = Object.keys(roots).flatMap((key) =>
    traverseBookmarks(roots[key], key)
  );
  const hasMultiplePaths = new Set(items.map((i) => i._path)).size > 1;

  return items.map((item) => ({
    ...item,
    ...(hasMultiplePaths && { label: item._path.split('/').pop() }),
  }));
}

function traverseBookmarks(node, path = '') {
  if (!node.children) return [];

  return node.children.flatMap((child) => {
    if (child.type === 'url') {
      return [
        {
          title: child.name,
          subtitle: child.url,
          alwaysShowsSubtitle: true,
          icon: 'URLTemplate',
          action: 'openURL',
          actionArgument: child.url,
          _path: path,
        },
      ];
    }
    return traverseBookmarks(
      child,
      path ? `${path}/${child.name}` : child.name
    );
  });
}

function openURL(url) {
  LaunchBar.hide();
  LaunchBar.openURL(url, 'com.brave.Browser');
}
