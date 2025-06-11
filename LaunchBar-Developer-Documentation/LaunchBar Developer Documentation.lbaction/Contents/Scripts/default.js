/* 
LaunchBar Developer Documentation Action
by Christian Bender (@ptujec)
2025-06-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const baseURL =
  'https://developer.obdev.at/resources/documentation/launchbar-developer-documentation/';

const cacheFilePath = `${Action.supportPath}/cache.html`;

function run() {
  let html;

  if (LaunchBar.options.commandKey || !File.exists(cacheFilePath)) {
    html = HTTP.loadRequest(baseURL, {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }).data;

    File.writeText(html, cacheFilePath);
  } else {
    html = File.readText(cacheFilePath);
  }

  const navMatch = html.match(/<nav id="sidebar"[^>]*>([\s\S]*?)<\/nav>/);
  if (!navMatch) return [];

  const navContent = navMatch[1].replace(/\n/g, ' ');

  const sections = navContent.split(/<li role="treeitem"/).slice(1);

  const links = sections.flatMap((section) => {
    const groupMatch = section.match(
      /<h2><a href="([^"]+)">([^<]+)<\/a><\/h2>/
    );
    if (!groupMatch) return [];

    const [, sectionUrl, sectionTitle] = groupMatch;

    const sectionLinks = [
      {
        title: sectionTitle.trim(),
        url: baseURL + sectionUrl,
        icon: 'iconTemplate',
      },
    ];

    const topicMatches = [
      ...section.matchAll(
        /<a href="(#\/[^"]+)"[^>]*class="topic"[^>]*>([^<]+)<\/a>/g
      ),
    ];

    const topicLinks = topicMatches.map((match) => ({
      title: match[2].trim(),
      subtitle: sectionTitle.trim(),
      alwaysShowsSubtitle: true,
      url: baseURL + match[1],
      icon: 'dotTemplate',
    }));

    return [...sectionLinks, ...topicLinks];
  });

  return links;
}
