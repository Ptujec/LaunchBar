// LaunchBar Action Script

function run(path) {
  if (File.isDirectory(path)) {
    return { title: 'Choose a printable document!', icon: 'alert' };
  }

  const lines =
    LaunchBar.execute('/bin/bash', './printers.sh')?.split('\n') ?? [];

  const printers = lines
    .flatMap((line, i) => {
      const [, name] = line.match(/^printer (\S+) is/) ?? [];
      if (!name) return [];

      const description = lines
        .slice(i, i + 10)
        .find((l) => l.trim().startsWith('Description:'))
        ?.split('Description:')[1]
        ?.trim();

      return [{ name, description }];
    })
    .map((printer) => ({
      title: printer.description || printer.name,
      subtitle: printer.description ? printer.name : undefined,
      icon: 'iconTemplate',
      action: 'print',
      actionArgument: { printer: printer.name, path },
      actionRunsInBackground: true,
    }))
    .reverse();

  return printers;
}

function print({ printer, path }) {
  LaunchBar.hide();
  LaunchBar.execute('/usr/bin/lpr', '-P', printer, path);
  LaunchBar.openURL(
    File.fileURLForPath('/System/Applications/Utilities/Print Center.app')
  );
}
