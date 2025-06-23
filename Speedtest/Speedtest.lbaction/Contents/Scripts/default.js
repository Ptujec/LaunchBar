/*
Speedtest Action for LaunchBar
by Christian Bender (@ptujec)
2025-05-09

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run() {
  if (LaunchBar.options.commandKey) {
    runInTerminal();
    return;
  }

  const history = getHistory();

  return [
    {
      title: 'Run Test',
      action: 'runTest',
      icon: 'runTemplate',
      actionRunsInBackground: true,
    },
    ...history,
  ];
}

function runTest() {
  if (LaunchBar.options.commandKey) {
    runInTerminal();
    return;
  }

  LaunchBar.hide();

  LaunchBar.displayNotification({
    title: 'Speedtest',
    string: 'Test started … may take a few seconds',
  });

  const jsonStr = LaunchBar.execute('/bin/sh', './networkinfo.sh').trim();

  const json = JSON.parse(jsonStr);

  if (json.error_code) {
    LaunchBar.displayNotification({
      title: 'Speedtest',
      string: `Error ${json.error_code}: Could not run the speed test.\nTry again holding down the command key!`,
    });
    return;
  }

  File.writeJSON(
    json,
    `${Action.supportPath}/test_${json.start_date
      ?.replace(/:/g, '-')
      .replace(/ /g, '_')}.json`
  );

  const [_, __, down, up, resp, runtime] = formatResult(json);

  LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.displayNotification({
    title: 'Speedtest',
    string: `▼ ${down} ▲ ${up} Mbps\nResponsiveness: ${resp} milliseconds\nRuntime: ${runtime} seconds`,
  });
}

function runInTerminal() {
  LaunchBar.hide();
  LaunchBar.executeAppleScript(
    'tell application "Terminal"',
    'do script "networkQuality"',
    'activate',
    'end tell'
  );
}

function getHistory() {
  const files = File.getDirectoryContents(`${Action.supportPath}/`);

  if (files.length === 0) {
    LaunchBar.alert('No speed test history found.');
    return [];
  }

  return files
    .filter(
      (file) =>
        File.displayName(file).startsWith('test_') &&
        File.displayName(file).endsWith('.json')
    )
    .map((file) => {
      const json = File.readJSON(`${Action.supportPath}/${file}`);
      return {
        json: json,
        file: file,
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.json.start_date);
      const dateB = new Date(b.json.start_date);
      return dateB - dateA; // Sort in descending order (newest first)
    })
    .map(({ json, file }) => {
      const [startDate, _, down, up] = formatResult(json);

      const subtitle = LaunchBar.formatDate(new Date(startDate), {
        relativeDateFormatting: true,
        timeStyle: 'short',
        dateStyle: 'short',
      });

      return {
        title: `${down} / ${up} Mbps`,
        subtitle,
        label: json.wifi_name || undefined,
        badge: json.connection_type?.toUpperCase() || undefined,
        alwaysShowsSubtitle: true,
        action: 'showDetails',
        actionArgument: { json, file },
        actionReturnsItems: true,
        icon: 'reportTemplate',
      };
    });
}

function showDetails({ json, file }) {
  if (LaunchBar.options.commandKey) {
    LaunchBar.hide();
    LaunchBar.openURL(File.fileURLForPath(`${Action.supportPath}/${file}`));
    return;
  }

  const [startDate, endDate, down, up, resp, runtime] = formatResult(json);

  const formattedStartDate = LaunchBar.formatDate(new Date(startDate), {
    relativeDateFormatting: true,
    timeStyle: 'medium',
    dateStyle: 'short',
  });

  const formattedEndDate = LaunchBar.formatDate(new Date(endDate), {
    relativeDateFormatting: true,
    timeStyle: 'medium',
    dateStyle: 'short',
  });

  return [
    {
      title: `${down} Mbps`,
      label: 'Down',
      icon: 'downTemplate',
    },
    { title: `${up} Mbps`, label: 'Up', icon: 'upTemplate' },
    {
      title: `${resp} milliseconds`,
      label: 'Responsiveness',
      icon: 'timeTemplate',
    },
    {
      title: `${runtime} seconds`,
      label: 'Runtime',
      icon: 'timeTemplate',
    },
    {
      title: formattedStartDate,
      label: 'Start Time',
      icon: 'calTemplate',
    },
    {
      title: formattedEndDate,
      label: 'End Time',
      icon: 'calTemplate',
    },
    {
      title: json.connection_type?.toUpperCase() || 'N/A',
      label: 'Connection Type',
      icon: 'connectedTemplate',
    },
    json.wifi_name
      ? {
          title: json.wifi_name,
          label: 'Network Name',
          icon: 'connectedTemplate',
        }
      : {},
    {
      title: json.interface_name || 'N/A',
      label: 'Network Interface',
      icon: 'connectedTemplate',
    },
    {
      title: json.test_endpoint || 'N/A',
      label: 'Test Server',
      icon: 'serverTemplate',
    },
    {
      title: json.os_version || 'N/A',
      label: 'OS Version',
      icon: 'gearTemplate',
    },
  ];
}

function formatResult(json) {
  const startDate = new Date(json.start_date);
  const endDate = new Date(json.end_date);
  const timeDiff = (endDate - startDate) / 1000;

  const down = Math.round(json.dl_throughput / 1000000);
  const up = Math.round(json.ul_throughput / 1000000);
  const resp = json.responsiveness.toFixed(1);
  const runtime = timeDiff.toFixed(1);

  return [startDate, endDate, down, up, resp, runtime];
}
