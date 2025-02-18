// LaunchBar Action Script

function run(path) {
  const printers = LaunchBar.execute('/usr/bin/lpstat', '-p')
    ?.split('\n')
    .map((line) => line.match(/„([^"]+)“/)?.[1])
    .filter(Boolean);

  return printers.map((printer) => ({
    title: printer.toString(),
    icon: 'iconTemplate',
    action: 'print',
    actionArgument: { printer, path },
  }));
}

function print({ printer, path }) {
  LaunchBar.log(path);

  LaunchBar.execute('/usr/bin/lpr', '-P', printer, path);
}
