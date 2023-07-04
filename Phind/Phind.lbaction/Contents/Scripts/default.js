/* 
Phind Search Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (argument == undefined) {
    LaunchBar.hide();
    LaunchBar.openURL('https://www.phind.com');
    return;
  }

  if (LaunchBar.options.commandKey) {
    ask({ argument });
  }

  return showOptions(argument);
}

function showOptions(argument) {
  // Other potential option translate into language (JS, Applescript)

  const titles = [
    'Make more concise!',
    'Improve performance!',
    'What went wrong?',
    'Explain!',
    '<Custom prompt>',
    'Ask',
  ];

  return titles.map((title) => ({
    title: title === 'Ask' ? argument.split('\n').join('\n') : title,
    // title: title === 'Ask' ? 'Use Query directly with ⌘ ↩' : title,
    badge: title === 'Ask' ? undefined : 'Prompt',
    label: title === 'Ask' ? '(Search directly with ⌘ ↩)' : '',
    icon: title === 'Ask' ? 'lightTemplate' : 'iconTemplate',
    action: 'ask',
    actionArgument: title === 'Ask' ? { argument } : { argument, title },
  }));
}

function ask({ argument, title }) {
  if (title === '<Custom prompt>') {
    const prompt = customPrompt(argument);
    if (!prompt) return;
    title = prompt;
  }

  if (title) argument = `${title}\n${argument}`;

  LaunchBar.hide();
  LaunchBar.openURL(
    'https://www.phind.com/search?q=' +
      encodeURIComponent(argument) +
      '&c=&l=&source=searchbox'
  );
}

function customPrompt(argument) {
  LaunchBar.hide();
  return LaunchBar.executeAppleScript(
    'set result to display dialog "What should be done with the Code?" with title "Custom Prompt" default answer "Translate to AppleScript!"',
    'set result to text returned of result'
  ).trim();
}
