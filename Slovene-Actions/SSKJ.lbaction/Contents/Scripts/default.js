/* LaunchBar Action for SSKJ² 
https://www.fran.si/133/sskj2-slovar-slovenskega-knjiznega-jezika-2
*/

function run(argument) {
  var url =
    'https://www.fran.si/iskanje?FilteredDictionaryIds=133&View=1&Query=' +
    encodeURIComponent(argument);

  if (LaunchBar.options.alternateKey) {
    LaunchBar.openURL(url);
  } else {
    var html = HTTP.loadRequest(url, {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    }).data;

    if (html != undefined) {
      var groups = html.match(/<div class="entry-content">(.|\n|\r)*?<\/div>/g); //  list-group results

      if (groups == undefined) {
        return;
      }

      var groupsResult = [];
      groups.forEach(function (item) {
        var group = item
          .toString()
          .replace(/<span class="color_orange".*<\/ul>/g, '');

        var header = group.match(
          /<div class="entry-content">(.|\n|\r|\t)*?<br \/>/g
        );

        if (header == undefined) {
          return;
        }

        header = header
          .toString()
          .replace(/(<([^>]+)>)/g, '')
          .trim();

        var meanings = group
          .replace(/<br \/>/g, '<br />\n')
          .match(
            /(<span class="color_lightdark strong">.*?<\/span>)|(<span class="color_dark.*"explanation ?">.*?<\/span>)/g
          )
          .join('\n')
          .replace(/(:|;)(\s?<\/)/g, '$2')
          .replace(/(<([^>]+)>)/g, '')
          .replace(/(^\d\..*)\n/gm, '$1')
          .replace(/(^.\).*)\n/gm, '$1')
          .replace(/\n(.\))/g, ' $1')
          .replace(/(^\D)/gm, '/$1')
          .replace(/\n\//g, ' / ')
          .split('\n');

        meanings.forEach(function (item) {
          var title = item.replace(/(^\/)/, '');
          var sub = header.replace(/(^\S+)\d+/, '$1');

          var badge = header.match(/^\S+(\d+)/);

          if (badge != undefined) {
            badge = badge[1];
          }

          if (/^\d/.test(title)) {
            if (badge != undefined) {
              badge = badge + '.' + title.match(/^\d/);
            } else {
              badge = title.match(/^\d+/).toString();
            }
            title = title
              .replace(/^\d+\./, '')
              .trim()
              .replace(/(^\/\s+)/, '');
          }

          var pushData = {
            title: title,
            subtitle: sub,
            icon: 'resultTemplate',
            url: url,
          };

          if (title.includes('/')) {
            pushData.children = showParts(title, sub, url);
          }

          if (badge != undefined) {
            pushData.badge = badge;
          }

          groupsResult.push(pushData);
        });
      });

      var subGroups = html.match(/<span class="color_orange".*?<\/ul>/g);

      if (subGroups != undefined) {
        var subGroupsResult = [];
        subGroups.forEach(function (item) {
          var group = item.toString();

          var header = group.match(/<span class="color_orange".*?<\/span>/g);

          if (header == undefined) {
            return;
          }

          header = header
            .toString()
            .replace(/(<([^>]+)>)/g, '')
            .trim();

          var meanings = group
            .replace(/<br \/>/g, '<br />\n')
            .match(
              /(<span class="color_lightdark strong">.*?<\/span>)|(<span class="color_dark.*"explanation ?">.*?<\/span>)/g
            );

          if (meanings != undefined) {
            meanings = meanings
              .join('\n')
              .replace(/(:)(\s?<\/)/g, '$2')
              .replace(/(<([^>]+)>)/g, '')
              .replace(/(^\d\..*)\n/gm, '$1')
              .replace(/(^.\).*)\n/gm, '$1')
              .replace(/\n(.\))/g, ' $1')
              .replace(/(^\D)/gm, '/$1')
              .replace(/\n\//g, ' / ')
              .split('\n');

            meanings.forEach(function (item) {
              var title = item.replace(/(^\/)/, '');
              var sub = header.replace(/(^\S+)\d+/, '$1');

              var badge = header.match(/^\S+(\d+)/);

              if (badge != undefined) {
                badge = badge[1];
              }

              if (/^\d/.test(title)) {
                if (badge != undefined) {
                  badge = badge + '.' + title.match(/^\d/);
                } else {
                  badge = title.match(/^\d/).toString();
                }
                title = title.replace(/^\d\./, '').trim();
              }

              var pushData = {
                title: title,
                subtitle: sub,
                icon: 'resultTemplate',
                url: url,
              };

              if (title.includes('/')) {
                pushData.children = showParts(title, sub, url);
              }

              if (badge != undefined) {
                pushData.badge = badge;
              }

              subGroupsResult.push(pushData);
            });
          }
        });
        var result = groupsResult.concat(subGroupsResult);
      } else {
        var result = groupsResult;
      }
      return result;
    } else {
      var response = LaunchBar.alert(
        'Timeout',
        'The website took more than 5 seconds to launch. Do you want to try to open it in your browser?',
        'Ok',
        'Cancel'
      );
      switch (response) {
        case 0:
          LaunchBar.openURL(url);
        case 1:
          break;
      }
    }
  }
}

function showParts(title, sub, url) {
  var parts = title.split('/');

  var result = [];
  parts.forEach(function (item) {
    result.push({
      title: item.trim(),
      subtitle: sub,
      icon: 'resultTemplate',
      url: url,
    });
  });
  return result;
}
