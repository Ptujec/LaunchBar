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
  const results = Object.keys(roots).reduce(
    (acc, key) => ({
      items: [...acc.items, ...getBookmarks(roots[key], key).items],
      paths: new Set([...acc.paths, ...getBookmarks(roots[key], key).paths]),
    }),
    { items: [], paths: new Set() }
  );

  return results.items.map((item) => ({
    ...item,
    ...(results.paths.size > 1 ? { label: getLastFolder(item._path) } : {}),
  }));
}

function getBookmarks(node, path = '') {
  if (!node.children) return { items: [], paths: new Set() };

  return node.children.reduce(
    (acc, child) => ({
      items: [
        ...acc.items,
        ...(child.type === 'url'
          ? [
              {
                title: child.name,
                subtitle: child.url,
                alwaysShowsSubtitle: true,
                icon: 'URLTemplate',
                action: 'openURL',
                actionArgument: child.url,
                _path: path,
              },
            ]
          : []),
        ...(child.type === 'folder'
          ? getBookmarks(child, path ? `${path}/${child.name}` : child.name)
              .items
          : []),
      ],
      paths: new Set([
        ...acc.paths,
        ...(child.type === 'url' ? [path] : []),
        ...(child.type === 'folder'
          ? getBookmarks(child, path ? `${path}/${child.name}` : child.name)
              .paths
          : []),
      ]),
    }),
    { items: [], paths: new Set() }
  );
}

function getLastFolder(path) {
  const parts = path.split('/');
  return parts.length > 1 ? `…/${parts[parts.length - 1]}` : path;
}

function openURL(url) {
  LaunchBar.hide();
  LaunchBar.openURL(url, 'com.brave.Browser');
}
