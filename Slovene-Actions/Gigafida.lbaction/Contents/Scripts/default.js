// LaunchBar Action for Gigafide - Korpus pisne standardne slovenščine (https://viri.cjvt.si/gigafida/)

function run(argument) {
  if (!argument) {
    // No argument passed, just open the website:
    LaunchBar.hide();
    LaunchBar.openURL('https://viri.cjvt.si/gigafida/');
    return;
  }

  argument = argument.trim().replace(/\s+/g, '+');

  if (LaunchBar.options.controlKey) argument = `"${argument}"`;

  //  Main action
  const mainURL = `https://viri.cjvt.si/gigafida/Concordance/Search?Query=${encodeURI(
    argument
  )}`;

  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(mainURL);
    return;
  }

  const data = HTTP.loadRequest(mainURL, {
    timeout: 5.0,
    method: 'GET',
    resultType: 'text',
  }).data;

  let colocationsSubfragment = data.match(
    /<div class="colocationsSubfragment">(.|\n|\r)*?<footer>/g
  );

  if (!colocationsSubfragment) {
    const response = LaunchBar.alert(
      'Gigafida: Ni bilo zadetkov!',
      'Lahko poskusite na spletni strani "Nova beseda" (ZRC SAZU) ali na Googlu?',
      'Nova beseda (ZRC SAZU)',
      'Google',
      'Cancel'
    );
    switch (response) {
      case 0:
        LaunchBar.openURL(
          `http://bos.zrc-sazu.si/c/ada.exe?hits_shown=100&clm=22&crm=22&expression=${encodeURI(
            argument
          )}&clm=22&crm=22&wth=0&hits_shown=100&sel=%28all%29&name=a_si`
        );
        break;
      case 1:
        LaunchBar.openURL(
          `http://www.google.si/search?q=${encodeURIComponent(argument)}`
        );
        break;
      case 2:
        break;
    }
    return;
  }

  colocationsSubfragment = colocationsSubfragment[0].replace(/&nbsp;/g, '');

  colocationsSubfragment = LaunchBar.execute(
    `${Action.path}/Contents/Scripts/HTMLEntityDecode.swift`,

    // `${Action.path}/Contents/Scripts/HTMLEntityDecode`,
    colocationsSubfragment
  );

  //   .replace(/&#x17E;/g, 'ž')
  //   .replace(/&#x17D;/g, 'Ž')
  //   .replace(/&#x10D;/g, 'č')
  //   .replace(/&#x10C;/g, 'Č')
  //   .replace(/&#x161;/g, 'š')
  //   .replace(/&#x160;/g, 'Š')
  //   .replace(/&#x107;/g, 'ć')
  //   .replace(/&#xFC;/g, 'ü')
  //   .replace(/&#xDC;/g, 'Ü')
  //   .replace(/&#xF6;/g, 'ö')
  //   .replace(/&#xD6;/g, 'Ö')
  //   .replace(/&#xE4;/g, 'ä')
  //   .replace(/&#xC4;/g, 'Ä')
  //   .replace(/&#xF4;/g, 'ô')
  //   .replace(/&#xF3;/g, 'ó')
  //   .replace(/&#xE3;/g, 'ã')
  //   .replace(/&#xE1;/g, 'á')
  //   .replace(/&#xED;/g, 'í')
  //   .replace(/&#xE9;/g, 'é')
  //   .replace(/&#x2B;/g, '+')
  //   .replace(/&#xBB;/g, '»')
  //   .replace(/&#xAB;/g, '«')
  //   .replace(/&#x201C;/g, '“')
  //   .replace(/&#x201D;/g, '”')
  //   .replace(/&quot;/g, '"')
  //   .replace(/&#x27;/g, "'")
  //   .replace(/&#x2026;/g, '…')
  //   .replace(/&#x2022;/g, '•')
  //   .replace(/&#x2013;/g, '–')
  //   .replace(/&#x2666/g, '♦')
  //   .replace(/&#xB0/g, '°')

  const leftText = colocationsSubfragment.match(
    /<div class="pure-u-1-2 text left">.*?<\/div>/g
  );

  const rightText = colocationsSubfragment.match(
    /<div class="pure-u-1-2 text right">.*?<\/div>/g
  );

  // LaunchBar.alert(leftText[0]);
  // LaunchBar.alert(rightText[0]);

  let result = [];
  for (var i = 0; i < rightText.length; i++) {
    let left = leftText[i].replace(/(<([^>]+)>)/g, '');

    left = left.split(/\s+/).slice(-4).join(' ');

    let right = rightText[i]; //.replace(/(<([^>]+)>)/g, '');

    let center = right
      .match(/<div class="pure-u-1-2 text right">.*<\/span>/)[0]
      .replace(/(<([^>]+)>)/g, '');

    right = right
      .replace(/<div class="pure-u-1-2 text right">.*<\/span>/, '')
      .replace(/(<([^>]+)>)/g, '')
      .split(/\s+/)
      .slice(0, 4)
      .join(' ');

    result.push({
      title: center,
      subtitle: `${left + center.toUpperCase()}${right}`,
      icon: 'resultTemplate',
      action: 'openURL',
      actionArgument: mainURL,
      alwaysShowsSubtitle: true,
    });
  }
  return result;
}

function openURL(url) {
  LaunchBar.hide();
  LaunchBar.openURL(url);
}
