/* 
LaunchBar Action for SSKJ² 
by Christian Bender (@ptujec)
2023-07-07
Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Website:
https://www.fran.si/133/sskj2-slovar-slovenskega-knjiznega-jezika-2
*/

function run(argument) {
  const baseUrl = 'https://www.fran.si/iskanje';
  const url = `${baseUrl}?FilteredDictionaryIds=133&View=1&Query=${encodeURIComponent(
    argument
  )}`;

  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(url);
    return;
  }

  const data = HTTP.loadRequest(url, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  });

  if (data.error) {
    LaunchBar.alert('Error in HTTP request: ' + data.error);
    return;
  }

  const html = data.data;

  if (html) {
    const groups = html.match(/<div class="entry-content">(.|\n|\r)*?<\/div>/g);

    if (!groups) {
      LaunchBar.hide();
      LaunchBar.openURL(
        `${baseUrl}?View=1&Query=${encodeURIComponent(
          argument
        )}&AllNoHeadword=${encodeURIComponent(
          argument
        )}&FilteredDictionaryIds=133`
      );
      return;
    }

    const groupsResult = processGroups(groups, url);
    const subGroups = html.match(/<span class="color_orange".*?<\/ul>/g);

    if (!subGroups) {
      return groupsResult;
    }

    const subGroupsResult = processSubGroups(subGroups, url);
    return groupsResult.concat(subGroupsResult);
  }
}

function processGroups(groups, url) {
  const results = [];

  groups.forEach((group) => {
    const cleanGroup = group
      .toString()
      .replace(/<span class="color_orange".*<\/ul>/g, '');
    const header = extractHeader(cleanGroup);

    if (!header) return;

    const meanings = extractMeanings(cleanGroup);
    processMeanings(meanings, header, results, url);
  });

  return results;
}

function processSubGroups(subGroups, url) {
  const results = [];

  subGroups.forEach((group) => {
    const header = extractSubGroupHeader(group);
    if (!header) return;

    const meanings = extractMeanings(group.toString());
    if (meanings) {
      processMeanings(meanings, header, results, url);
    }
  });

  return results;
}

function extractHeader(group) {
  const headerMatch = group.match(
    /<div class="entry-content">(.|\n|\r|\t)*?<br \/>/g
  );
  return headerMatch?.map((h) =>
    h
      .toString()
      .replace(/(<([^>]+)>)/g, '')
      .trim()
  )[0];
}

function extractSubGroupHeader(group) {
  const headerMatch = group.match(/<span class="color_orange".*?<\/span>/g);
  return headerMatch?.map((h) =>
    h
      .toString()
      .replace(/(<([^>]+)>)/g, '')
      .trim()
  )[0];
}

function extractMeanings(text) {
  return text
    .replace(/<br \/>/g, '<br />\n')
    .match(
      /(<span class="color_lightdark strong">.*?<\/span>)|(<span class="color_dark.*"explanation ?">.*?<\/span>)/g
    )
    ?.join('\n')
    .replace(/(:)(\s?<\/)/g, '$2')
    .replace(/(<([^>]+)>)/g, '')
    .replace(/(^\d\..*)\n/gm, '$1')
    .replace(/(^.\).*)\n/gm, '$1')
    .replace(/\n(.\))/g, ' $1')
    .replace(/(^\D)/gm, '/$1')
    .replace(/\n\//g, ' / ')
    .split('\n');
}

function processMeanings(meanings, header, results, url) {
  meanings.forEach((item) => {
    let title = item.replace(/(^\/)/, '');
    const sub = header.replace(/(^\S+)\d+/, '$1');
    const badgeMatch = header.match(/^\S+(\d+)/);
    let badge = badgeMatch?.[1];

    if (/^\d/.test(title)) {
      if (badge) {
        badge = `${badge}.${title.match(/^\d/)}`;
      } else {
        badge = title.match(/^\d+/).toString();
      }
    }

    // Remove numbers after capturing them for the badge
    title = title.replace(/^\d+\.\s*/, '');

    const result = {
      title: title.trim().replace(/(^\/\s+)/, ''),
      subtitle: sub,
      icon: 'resultTemplate',
      action: 'openURL',
      actionArgument: url,
    };

    if (title.includes('/')) {
      result.children = showParts(title, sub, url);
    }

    if (badge) {
      result.badge = badge;
    }

    results.push(result);
  });
}

function showParts(title, sub, url) {
  return title.split('/').map((item) => ({
    title: item.trim(),
    subtitle: sub,
    icon: 'resultTemplate',
    action: 'openURL',
    actionArgument: url,
  }));
}

function openURL(url) {
  LaunchBar.openURL(url);
}
