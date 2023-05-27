/* 
LaunchBar Action for Writers brew
For more url schemes take a look at the Raycast extension:
https://github.com/raycast/extensions/tree/98ac9faf67834d982fc44c391f3b900087784b8b/extensions/writersbrew/src
*/

function run() {
  return [
    {
      title: 'Captur text',
      icon: 'com.pradeepb28.Writersbrew-AI',
      action: 'open',
      actionArgument: 'writerbrew://capture-text', // urlScheme
    },
    {
      title: 'Improve fluency',
      icon: 'com.pradeepb28.Writersbrew-AI',
      action: 'open',
      actionArgument: 'writerbrew://improve-fluency', // urlScheme
    },
    {
      title: 'Translate to French',
      icon: 'com.pradeepb28.Writersbrew-AI',
      action: 'open',
      actionArgument: 'writerbrew://translate-to-french', // urlScheme
    },
    {
      title: 'Explain code',
      icon: 'com.pradeepb28.Writersbrew-AI',
      action: 'open',
      actionArgument: 'writerbrew://explain-code', // urlScheme
    },
  ];
}

function open(urlScheme) {
  LaunchBar.openURL(urlScheme);
}
