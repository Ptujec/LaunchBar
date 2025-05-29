/* 
YouTube Transcript Action for LaunchBar
by Christian Bender (@ptujec)
2025-05-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

// MARK: - Configuration

const downloadsPath = '/tmp';
const logFile = '/tmp/youtube_transcript_debug.log';
const mode = Action.preferences.mode || 'short'; // full, short, none
const maxAttempts = 2;

// MARK: - Run

function run(argument) {
  let url;
  let title;
  let source;

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
    const browser = LaunchBar.execute('/bin/bash', './appInfo.sh').trim();

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
    source = browser === 'com.apple.Safari' ? info.source : null;
  }

  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      title: 'Invalid YouTube URL',
      icon: 'alert',
    };
  }

  return getVideoTranscript(videoId, { url, title, source });
}

// MARK: - URL Handling

function extractVideoId(url) {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
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
  const options = {
    method: 'GET',
    headerFields: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      Accept: '*/*',
    },
  };

  const result = getCaptionTracks(videoId, info.source, options);
  if (!result) {
    return {
      title: 'No transcripts available',
      icon: 'alert',
    };
  }

  const { tracks, videoTitle } = result;

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
      title: info?.title || videoTitle,
      url: info?.url,
      videoId: videoId,
      track: track,
    },
    actionRunsInBackground: true,
  }));
}

function getCaptionTracks(videoId, pageSource, options) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  writeDebugLog(watchUrl, 'Requesting watch URL');

  let pageData;
  if (pageSource) {
    pageData = pageSource;
    writeDebugLog('Using Safari page source', 'Source Info');
  } else {
    const watchResponse = HTTP.loadRequest(watchUrl, options);
    if (!watchResponse?.data) return null;
    pageData = watchResponse.data;
  }

  const tracksMatch = pageData.match(
    /{"captionTracks":(\[.*?\])(?=,\s*"audioTracks")/
  );
  if (!tracksMatch?.[1]) return null;

  let tracks;
  try {
    tracks = JSON.parse(tracksMatch[1]);
    writeDebugLog(tracks, 'Parsed caption tracks');
    return {
      tracks,
      videoTitle: pageData
        .match(
          /"videoDetails":\s*{\s*"videoId":[^}]*"lengthSeconds":"[^"]*"/
        )?.[0]
        ?.match(/"title":"([^"]+)"/)?.[1],
    };
  } catch (e) {
    writeDebugLog(e, 'Error parsing caption tracks');
    return null;
  }
}

function downloadTranscript({ baseUrl, title, url, videoId, track }) {
  LaunchBar.hide();

  const options = {
    method: 'GET',
    headerFields: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      Accept: '*/*',
    },
  };

  if (tryDownloadTranscript(baseUrl, url, title, options)) return;

  writeDebugLog(
    'Empty data received from caption request',
    'Caption Request Error'
  );

  // If original URL failed, try with fresh URLs
  let attempt = 1;

  while (attempt < maxAttempts) {
    attempt++;

    const freshUrl = getFreshTrackUrl(videoId, track, options);
    if (!freshUrl) continue;

    if (tryDownloadTranscript(freshUrl, url, title, options)) return;

    writeDebugLog(
      `Empty data received from caption request (Attempt ${attempt}/${maxAttempts})`,
      'Caption Request Error'
    );
  }

  LaunchBar.displayNotification({
    title: 'Failed to download transcript',
    string: 'No data received after multiple attempts',
    url: File.fileURLForPath(logFile),
  });
}

function getFreshTrackUrl(videoId, track, options) {
  const result = getCaptionTracks(videoId, null, options);
  if (!result) return null;

  const { tracks } = result;

  const freshTrack = tracks.find(
    (t) =>
      t.name?.simpleText === track.name?.simpleText &&
      t.languageCode === track.languageCode
  );

  return freshTrack?.baseUrl;
}

function tryDownloadTranscript(captionUrl, url, title, options) {
  const captionResponse = HTTP.loadRequest(captionUrl, options);
  if (captionResponse?.data === '') return false;

  const transcript = parseTranscriptXML(captionResponse.data, url);
  if (!transcript) return false;

  const text = `# ${title} (Transcript)\n\n→ ${url}\n\n${transcript}`;
  const filename = `${downloadsPath}/${title} (Transcript).md`;

  File.writeText(text, filename);

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.openURL(File.fileURLForPath(filename));
  return true;
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

  let decodedText = textContent
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
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

function getBrowserInfo(browser) {
  let script;
  if (browser === 'com.apple.Safari') {
    script = `
      tell application id "${browser}"
        set _url to URL of front document
        set _name to name of front document
        set _source to source of front document
        return _url & "\n" & _name & "\n" & _source
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

  const parts = result.split('\n');
  const url = parts[0].trim();
  const title = cleanTitle(parts[1].trim());
  const source =
    browser === 'com.apple.Safari' ? parts.slice(2).join('\n') : null;

  return {
    url,
    title,
    source,
  };
}

function cleanTitle(title) {
  return title
    .replace(/^\(\d+\)\s*/, '') // Remove YouTube notification count at start
    .replace(/\//g, '') // Remove slashes
    .replace(/\s*-\s*YouTube$/, '') // Remove " - YouTube" at end
    .trim();
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
    badge: option === currentOption ? 'selected' : undefined,
    action: 'setOption',
    actionArgument: option,
  }));
}

function setOption(option) {
  Action.preferences.mode = option;
  return settings();
}

// MARK: - Debug Logging

function writeDebugLog(data, label = '') {
  // DEBUG: uncomment for debugging
  const timestamp = new Date().toISOString();
  const entry = `\n[${timestamp}] ${label}\n${JSON.stringify(data, null, 2)}\n`;
  const existingContent = File.exists(logFile) ? File.readText(logFile) : '';
  File.writeText(existingContent + entry, logFile);
}
