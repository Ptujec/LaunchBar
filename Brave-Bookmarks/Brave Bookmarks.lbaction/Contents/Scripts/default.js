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
    (acc, key) => {
      const { items, paths } = getBookmarks(roots[key], key);
      acc.items.push(...items);
      paths.forEach((p) => acc.paths.add(p));
      return acc;
    },
    { items: [], paths: new Set() }
  );

  return results.items.map((item) => ({
    ...item,
    ...(results.paths.size > 1 ? { label: item._path } : {}),
  }));
}

function getBookmarks(node, path = '') {
  if (!node.children) return { items: [], paths: new Set() };

  return node.children.reduce(
    (acc, child) => {
      if (child.type === 'url') {
        acc.items.push({
          title: child.name,
          subtitle: child.url,
          alwaysShowsSubtitle: true,
          url: child.url,
          _path: path,
        });
        acc.paths.add(path);
      } else if (child.type === 'folder') {
        const nested = getBookmarks(
          child,
          path ? `${path}/${child.name}` : child.name
        );
        acc.items.push(...nested.items);
        nested.paths.forEach((p) => acc.paths.add(p));
      }
      return acc;
    },
    { items: [], paths: new Set() }
  );
}
