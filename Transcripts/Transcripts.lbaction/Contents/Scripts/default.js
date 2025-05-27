/* 
YouTube Transcript Action for LaunchBar
by Christian Bender (@ptujec)
2025-05-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const downloadsPath = `${LaunchBar.homeDirectory}/Desktop`;
const logFile = '/tmp/youtube_transcript_debug.log';
const mode = Action.preferences.mode || 'short'; // full, short, none

const supportedBrowsers = [
  'com.apple.Safari',
  'com.brave.Browser',
  'com.google.Chrome',
  'com.vivaldi.Vivaldi',
  'company.thebrowser.Browser',
];

// MARK: - Run

function run(argument) {
  let url;
  let title;

  if (LaunchBar.options.alternateKey) {
    return settings();
  }

  if (argument) {
    if (!argument.toLowerCase().includes('youtu')) {
      return {
        title: 'Not a YouTube URL',
        icon: 'alert',
      };
    }

    url = argument;
  } else {
    const browser = getActiveBrowser();

    // DEBUG: uncomment for debugging
    // LaunchBar.log('Browser bundle ID:', browser);

    if (!browser) {
      return {
        title: 'No supported browser found',
        icon: 'alert',
      };
    }

    const info = getBrowserInfo(browser);

    if (!info) {
      return {
        title: `Error getting browser information from ${browser}`,
        icon: 'alert',
      };
    }

    url = info.url;
    title = info.title;
  }

  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      title: 'Invalid YouTube URL',
      icon: 'alert',
    };
  }

  return getVideoTranscript(videoId, { url, title });
}

// MARK: - URL Handling

function extractVideoId(url) {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  LaunchBar.log('No video ID found in URL');
  return;
}

// MARK: - Get Transcript Data

function getVideoTranscript(videoId, info) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  writeDebugLog(watchUrl, 'Requesting watch URL');

  const options = {
    method: 'GET',
    headerFields: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      Accept: '*/*',
    },
  };

  const watchResponse = HTTP.loadRequest(watchUrl, options);

  if (!watchResponse?.data) {
    return {
      title: 'No transcripts available',
      icon: 'alert',
    };
  }

  // DEBUG: uncomment for debugging
  // File.writeText(watchResponse.data, Action.supportPath + '/test.html');

  // Extract caption tracks
  const tracksMatch = watchResponse.data.match(
    /{"captionTracks":(\[.*?\])(?=,\s*"audioTracks")/
  );
  if (!tracksMatch?.[1]) {
    return {
      title: 'No transcripts available',
      icon: 'alert',
    };
  }

  let videoTitle = info?.title;

  if (!videoTitle) {
    const videoDetails = watchResponse.data.match(
      /"videoDetails":\s*{\s*"videoId":[^}]*"lengthSeconds":"[^"]*"/
    );

    videoTitle = videoDetails?.[0]?.match(/"title":"([^"]+)"/)?.[1];
  }

  // DEBUG: uncomment for debugging
  // LaunchBar.log('Video Title: ', videoTitle);

  let tracks;
  try {
    tracks = JSON.parse(tracksMatch[1]);
    writeDebugLog(tracks, 'Parsed caption tracks');
  } catch (e) {
    return {
      title: 'Error parsing transcript tracks',
      subtitle: e,
      alwaysShowsSubtitle: true,
      icon: 'alert',
    };
  }

  if (tracks.length === 0) {
    return {
      title: 'No transcripts available',
      icon: 'alert',
    };
  }

  return tracks.map((track) => ({
    title: track.name?.simpleText,
    icon: 'iconTemplate',
    action: 'downloadTranscript',
    actionArgument: {
      baseUrl: track.baseUrl,
      title: videoTitle,
      url: info?.url,
    },
    actionRunsInBackground: true,
  }));
}

function downloadTranscript({ baseUrl, title, url }) {
  LaunchBar.hide();

  const options = {
    method: 'GET',
    headerFields: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      Accept: '*/*',
    },
  };

  const captionResponse = HTTP.loadRequest(baseUrl, options);

  if (!captionResponse) {
    writeDebugLog(
      'No response received from caption request',
      'Caption Request Error'
    );
    LaunchBar.alert('Failed to download transcript - No response received');
    return;
  }

  // DEBUG: uncomment for debugging
  // File.writeText(captionResponse.data, Action.supportPath + '/test.xml');

  const transcript = parseTranscriptXML(captionResponse.data, url);
  if (!transcript) {
    LaunchBar.alert('Failed to parse transcript');
    return;
  }

  const text = `# ${title} (Transcript)\n\n→ ${url}\n\n${transcript}`;
  const filename = `${downloadsPath}/${title} (Transcript).md`;

  File.writeText(text, filename);

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.openURL(File.fileURLForPath(filename));
}

// MARK: - Transcript Parsing

function parseTranscriptXML(xmlString, videoUrl) {
  if (!xmlString) {
    writeDebugLog('No XML string provided to parse', 'XML Parse Error');
    return;
  }

  const formatters = {
    short: (start, _, text) => `[${formatTimeMarker(start)}]\n${text}`,
    full: (start, _, text) => `[${formatTimeMarker(start, videoUrl)}]\n${text}`,
    none: (_, __, text) => text,
  };

  const format = formatters[LaunchBar.options.commandKey ? 'none' : mode];

  const matches = Array.from(
    xmlString.matchAll(
      /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]+)<\/text>/g
    )
  );

  if (matches.length === 0) {
    writeDebugLog('No text matches found', 'XML Parse Error');
    return;
  }

  const textContent = matches
    .map(([, start, dur, text]) => format(start, dur, text))
    .join('\n\n');

  const entitiesMap = File.readPlist(
    '/Applications/LaunchBar.app/Contents/Resources/HTMLEntities.plist'
  );

  let decodedText = textContent
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&([^;]+);/g, (match, entity) => {
      const codePoint = entitiesMap[entity];
      return codePoint ? String.fromCharCode(codePoint) : match;
    })
    .trim();

  return decodedText;
}

function formatTimeMarker(start, videoUrl = null) {
  const timeInSeconds = Math.floor(parseFloat(start));
  const formattedTime = formatTime(timeInSeconds);

  if (videoUrl) {
    const timeParam = `t=${timeInSeconds}`;
    const link = `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}${timeParam}`;
    return `[${formattedTime}](${link})`;
  }

  return `${formattedTime}`;
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

// MARK: - Browser Handling

function getActiveBrowser() {
  return LaunchBar.execute(
    '/bin/bash',
    './appInfo.sh',
    supportedBrowsers
  ).trim();
}

function getBrowserInfo(browser) {
  let script;
  if (browser === 'com.apple.Safari') {
    script = `
      tell application id "${browser}"
        set _url to URL of front document
        set _name to name of front document
        return _url & "\n" & _name
      end tell
    `;
  } else {
    script = `
      tell application id "${browser}"
        set _url to URL of active tab of front window
        set _name to title of active tab of front window
        return _url & "\n" & _name
      end tell
    `;
  }

  const result = LaunchBar.executeAppleScript(script);

  if (!result.trim()) return;

  const [url, title] = result.split('\n').map((s) => s.trim());

  // DEBUG: uncomment for debugging
  // LaunchBar.log('Browser returned URL:', url);
  // LaunchBar.log('Browser returned title:', title);

  return {
    url,
    title: cleanTitle(title),
  };
}

function cleanTitle(title) {
  // Remove YouTube notification count at start
  title = title.replace(/^\(\d+\)\s*/, '');

  // Remove " - YouTube" at the end
  title = title.replace(/\s*-\s*YouTube$/, '');

  return title.trim();
}

// MARK: - Debug Logging

function writeDebugLog(data, label = '') {
  // DEBUG: uncomment for debugging
  // const timestamp = new Date().toISOString();
  // const entry = `\n[${timestamp}] ${label}\n${JSON.stringify(data, null, 2)}\n`;
  // const existingContent = File.exists(logFile) ? File.readText(logFile) : '';
  // File.writeText(existingContent + entry, logFile);
}

// MARK: - Mode Settings

const options = {
  full: 'Include Time Markers With Links',
  short: 'Include Time Markers',
  none: 'Text Only',
};

function settings() {
  const currentOption = Action.preferences.mode || 'short';

  return Object.keys(options).map((option) => ({
    title: options[option],
    icon: option === currentOption ? 'checkTemplate' : 'circleTemplate',
    action: 'setOption',
    actionArgument: option,
  }));
}

function setOption(option) {
  Action.preferences.mode = option;
  return settings();
}
