/* 
Color Palette from Website Action for LaunchBar
by Christian Bender (@ptujec)
2023-04-26

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

INFO: 
- icon: ~/Design/LaunchBar/Icons/color palette.afdesign

TODO:

v2:
- option to drag color like from the color picker?
- svg option?
- option to devide into different sources (html, css links …)?
- Safari finetuning?

*/

include('browser.js');
include('settings.js');

const palettesFolder = Action.supportPath + '/palettes/';

function run(argument) {
  // SHOW HTML FILES WITH PALETTES
  if (LaunchBar.options.commandKey || LaunchBar.options.spaceKey) {
    var paletteExist = false;

    if (File.exists(palettesFolder)) {
      var paletteFiles = LaunchBar.execute('/bin/ls', '-t', palettesFolder)
        .trim()
        .split('\n');

      if (paletteFiles != '') {
        paletteExist = true;
      }
    }
    if (paletteExist == false) {
      return;
    }
    var result = [];
    paletteFiles.forEach(function (item) {
      var path = palettesFolder + item;
      var title = File.displayName(path).replace(/\.md$/, ''),
        pushData = {
          title: title,
          subtitle: '',
          path: palettesFolder + item,
        };
      result.push(pushData);
    });
    return result;
  }

  if (LaunchBar.options.alternateKey) {
    return chooseBrowser();
  }

  // CREATE NEW PALETTE
  LaunchBar.hide();

  var url = getCurrentURL();
  if (url == undefined) {
    return;
  }

  var colorSets = [];
  var colors = [];

  // GET COLORS FROM WEBSITE HTML
  var colorSet = getColors(url);

  if (colorSet == undefined) {
    return;
  }

  colorSets.push(colorSet);

  // GET COLORS FROM LINKED CSS FILES
  var cssLinks = getCSS(url);

  // alertWhenRunningInBackground(cssLinks);

  if (cssLinks != undefined) {
    cssLinks.forEach(function (item) {
      var colorSet = getColors(item);
      if (colorSet != undefined) {
        colorSets.push(colorSet);
      } else {
        alertWhenRunningInBackground(item);
        LaunchBar.setClipboardString(item);
      }
    });
  }

  if (colorSets != undefined && colorSets.length > 0) {
    colorSets.forEach(function (colorSet) {
      colorSet.forEach(function (color) {
        if (
          color != undefined &&
          color.toLowerCase() != '#fff' &&
          color.toLowerCase() != '#ffffff' &&
          color != '#000' &&
          color != '#000000'
        ) {
          colors.push(color);
        }
      });
    });
  }

  // colors = [...new Set(colors.sort())];
  colors = [...new Set(colors)];

  if (colors.length == 0) {
    return;
  }

  var colorListBase64 = colors.join(';').trim().toBase64String();

  var columnCount = 8;

  if (colors.length < 64 && colors.length > 3) {
    columnCount = Math.ceil(Math.sqrt(colors.length));
    // columnCount = Math.sqrt(colors.length).toFixed(0);
  } else if (colors.length < 4) {
    columnCount = colors.length;
  }

  var newSets = [];
  while (colors.length > 0) newSets.push(colors.splice(0, columnCount));

  var table = createTableRows(newSets);

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  var header =
    '<h1>Color Palette</h1>' +
    '\n      ' +
    '<h2><a href="' +
    url +
    '">' +
    url +
    '</a></h2>' +
    '\n      ' +
    '<p>Click to copy!</p>';

  var fileName = url
    .replace(/[&~#@[\]{}\\\/%*$:;,.?><\|"“]+/g, '_')
    .replace(/https?|www/g, '')
    .replace(/^_+|_+$/g, '')
    .trim();

  var importURL =
    'x-launchbar:action/ptujec.LaunchBar.action.ColorPaletteFromWebsite?title=' +
    fileName +
    '&colors=' +
    colorListBase64;

  var footer =
    '<p><a href="' +
    importURL +
    '"><svg xmlns="http://www.w3.org/2000/svg" id="new-icon" viewBox="0 0 14 14" width="14" height="14"><g transform="matrix(0.160478,0,0,0.160478,2.20476,10.6067)"><path d="M29.881,-21.051c0.814,0 1.519,0.285 2.116,0.855c0.597,0.57 0.895,1.248 0.895,2.034l0,14.405l-0.285,6.388l3.418,-3.459l3.54,-3.621c0.299,-0.271 0.631,-0.488 0.997,-0.651c0.366,-0.163 0.739,-0.244 1.119,-0.244c0.787,-0 1.445,0.251 1.974,0.753c0.529,0.501 0.793,1.146 0.793,1.932c0,0.434 -0.088,0.828 -0.264,1.18c-0.177,0.353 -0.414,0.665 -0.712,0.936l-11.394,10.498c-0.407,0.38 -0.78,0.644 -1.119,0.794c-0.339,0.149 -0.698,0.223 -1.078,0.223c-0.38,0 -0.739,-0.074 -1.078,-0.223c-0.339,-0.15 -0.712,-0.414 -1.119,-0.794l-11.393,-10.498c-0.299,-0.271 -0.536,-0.583 -0.712,-0.936c-0.177,-0.352 -0.265,-0.746 -0.265,-1.18c0,-0.786 0.258,-1.431 0.773,-1.932c0.516,-0.502 1.18,-0.753 1.994,-0.753c0.38,-0 0.753,0.081 1.119,0.244c0.366,0.163 0.698,0.38 0.997,0.651l3.54,3.621l3.418,3.459l-0.244,-6.388l-0,-14.405c-0,-0.786 0.291,-1.464 0.875,-2.034c0.583,-0.57 1.281,-0.855 2.095,-0.855Zm-21.606,42.196l43.213,0c4.204,0 7.358,-1.065 9.46,-3.194c2.102,-2.13 3.153,-5.31 3.153,-9.542l0,-36.947l-29.459,0c-5.127,0 -7.691,-2.563 -7.691,-7.69l0,-29.867l-18.676,0c-4.205,0 -7.358,1.072 -9.461,3.215c-2.102,2.143 -3.153,5.33 -3.153,9.562l-0,61.727c-0,4.259 1.051,7.446 3.153,9.562c2.103,2.116 5.256,3.174 9.461,3.174Zm26.489,-55.257l28.849,-0c-0.135,-0.841 -0.488,-1.682 -1.058,-2.523c-0.569,-0.841 -1.343,-1.763 -2.319,-2.767l-22.42,-22.827c-0.95,-0.977 -1.859,-1.756 -2.727,-2.34c-0.868,-0.583 -1.722,-0.942 -2.563,-1.078l-0,29.338c-0,1.464 0.746,2.197 2.238,2.197Z" style="fill:var(--primary-color)"/></g></svg> Import this color palette</a> to the system color picker.<br>This will create a .clr file in "~/Library/Colors".</p>' +
    '<p>Created with <a href="https://github.com/Ptujec/LaunchBar/tree/master/Color-Actions">Color Palette Action</a> for <a href="https://www.obdev.at/products/launchbar/index.html">LaunchBar</a>.</p>';

  var html = File.readText(Action.path + '/Contents/Resources/template.html')
    .replace('<!-- header -->', header)
    .replace('<!-- table -->', table)
    .replace('<!-- url -->', url)
    .replace('<!-- footer -->', footer);

  var fileLocation = palettesFolder + fileName + '.html';

  if (!File.exists(palettesFolder)) {
    File.createDirectory(palettesFolder);
  }

  File.writeText(html, fileLocation);

  LaunchBar.openURL(
    File.fileURLForPath(fileLocation),
    Action.preferences.browser
  );
}

function getCSS(url) {
  try {
    var data = HTTP.loadRequest(url, {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    });
  } catch (error) {
    return;
  }

  if (data.data == undefined) {
    alertWhenRunningInBackground(data.error + '\n' + url);
    return;
  }

  var m = data.data.match(/href=["'](.*?\.css.*?)/g);

  if (m == undefined) {
    return;
  }

  var cssLinks = [];

  m.forEach(function (item) {
    var cssLink = item.split(/["']/)[1];

    if (!cssLink.startsWith('http')) {
      if (cssLink.startsWith('//')) {
        cssLink = 'https:' + cssLink;
      } else {
        cssLink = url + cssLink;
      }
    }

    // cssLinks.push(item);
    cssLinks.push(cssLink);
  });

  return cssLinks;
}

function getColors(url) {
  // alertWhenRunningInBackground(url);

  try {
    var data = HTTP.loadRequest(url, {
      timeout: 5.0,
      method: 'GET',
      resultType: 'text',
    });
  } catch (error) {
    return;
  }

  if (data.data == undefined) {
    alertWhenRunningInBackground(data.error + '\n' + url);
    return;
  }

  var colors = [];
  var hex = data.data.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}/g);

  colors = colors.concat(hex);

  // alertWhenRunningInBackground(colors);

  var rgb = data.data.match(
    /rgb\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/g
  );

  if (rgb != undefined) {
    colors = colors.concat(rgbToHex(rgb));
  }

  // alertWhenRunningInBackground(colors);

  var rgba = data.data.match(
    /rgba\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/g
  );

  if (rgba != undefined) {
    colors = colors.concat(rgba);
  }

  // alertWhenRunningInBackground(colors);

  if (colors == undefined) {
    // alertWhenRunningInBackground('No color codes found');
    return;
  }

  // alertWhenRunningInBackground(colors);
  // LaunchBar.setClipboardString(colors.join('\n'));

  return colors;
}

function rgbToHex(rgbArray) {
  let hexArray = [];
  for (let i = 0; i < rgbArray.length; i++) {
    let hex = rgbArray[i]
      .slice(4, -1)
      .split(',')
      .map((c) => parseInt(c).toString(16).padStart(2, '0'))
      .join('');
    hexArray.push('#' + hex);
  }
  return hexArray;
}

function createTableRows(newSets) {
  /*
  <tr>
    <td height="25px" style="background-color:#ffffff"></td>
    <td style="background-color:#000000"></td>
    <td style="background-color:#ECF3FF"></td>
    <td style="background-color:#AAC9FF"></td>
  </tr>
  <tr>
    <td height="25px" >#ffffff</td>
    <td>#000000</td>
    <td>#ECF3FF</td>
    <td>#AAC9FF</td>
  </tr>
   */

  var rows = [];

  newSets.forEach(function (set) {
    rows.push(createRows(set));
  });

  return rows.join('\n');
}

function createRows(set) {
  var columns1 = [];

  set.forEach(function (color) {
    var column1 =
      '<td style="background-color:' +
      color +
      '"onclick="copyToClipboard(\'' +
      color +
      '\')" class="ht"><span class="tooltip">' +
      color +
      '</span></td>';

    columns1.push(column1);
  });

  var row1 = '<tr>\n  ' + columns1.join('\n  ') + '\n</tr>';

  return row1;
}

function alertWhenRunningInBackground(alertMessage) {
  LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
  LaunchBar.alert(alertMessage);
  LaunchBar.hide();
}
