/*
ChaptGPT Action for LaunchBar
by Christian Bender (@ptujec)
2023-03-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://platform.openai.com/docs/api-reference/chat
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-http
*/

const apiKey = Action.preferences.apiKey;
const chatsFolder = Action.supportPath + '/chats/';
const recent = Action.preferences.recent;
const recentTimeStamp = Action.preferences.recentTimeStamp;

function run(argument) {
  // API KEY (RE)SET
  if (apiKey == undefined || LaunchBar.options.controlKey) {
    setApiKey();
    return;
  }

  // CHOOSE MODEL
  if (argument == undefined) {
    var model = Action.preferences.model;
    var v3 = 'gpt-3.5-turbo';
    var v4 = 'gpt-4';

    if (model == v3) {
      var sub = 'Your currently selected model is: ' + v3 + '.\n';
    } else if (model == v4) {
      var sub = 'Your currently selected model is: ' + v4 + '.\n';
    } else {
      var sub = '';
    }

    var response = LaunchBar.alert(
      'Choose your model!',
      sub +
        '(If you want to enter your question press "space" before "enter".)',
      v3,
      v4,
      'Cancel'
    );
    switch (response) {
      case 0:
        // Ok … do something
        Action.preferences.model = v3;
        break;

      case 1:
        Action.preferences.model = v4;
        break;

      case 2:
        break;
    }
    // LaunchBar.hide();
    return;
  }

  // SHOW RECENT CHAT REPLIES
  // if (argument == undefined) {
  //   if (!File.exists(chatsFolder)) {
  //     return;
  //   }
  //   LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');

  //   var result = [];
  //   var contents = File.getDirectoryContents(chatsFolder);
  //   contents.forEach(function (item) {
  //     result.push({
  //       path: chatsFolder + '/' + item,
  //     });
  //   });
  //   return result;
  // }

  // ASK

  ask(argument);
}

function ask(argument) {
  LaunchBar.hide();

  // CHECK TIME BETWEEN LAST QUESTION (in minutes)
  const timeDifference = (new Date() - new Date(recentTimeStamp)) / 60000;

  // INCLUDE RECENT RESULTS IF LESS THAN 5 MINUTES HAVE PASSED OR CMD MODIFIER
  var addRecent = false;
  if (timeDifference < 5 || LaunchBar.options.commandKey) {
    LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');

    var response = LaunchBar.alert(
      'Continue?',
      'Do you want to continue with the chat named:\n"' + recent + '"?',
      'Continue',
      'New',
      'Cancel'
    );
    switch (response) {
      case 0:
        // Ok … do something
        addRecent = true;
        break;
      case 1:
        break;
      case 2:
        return;
    }
    LaunchBar.hide();
  }

  if (addRecent == true) {
    var recentPath = chatsFolder + '/' + recent + '.md';

    if (recent != undefined && File.exists(recentPath)) {
      var text = File.readText(recentPath).replace(/^> /gm, '');
      question = text + '...' + argument + '\n';
      var title = recent;
    }
  } else {
    var question = argument;
  }

  // ASK
  var model = Action.preferences.model;
  if (model == undefined) {
    model = 'gpt-3.5-turbo';
  }

  var result = HTTP.postJSON('https://api.openai.com/v1/chat/completions', {
    headerFields: {
      Authorization: 'Bearer ' + apiKey,
    },
    body: {
      model: model,
      // model: 'gpt-4',
      messages: [{ role: 'user', content: question }],
    },
  });

  // File.writeJSON(result, Action.supportPath + '/test.json');
  // var result = File.readJSON(Action.supportPath + '/test.json');

  if (result.response == undefined) {
    LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
    LaunchBar.alert(result.error);
    return;
  }

  if (result.response.status != 200) {
    LaunchBar.executeAppleScript('tell application "LaunchBar" to activate');
    LaunchBar.alert(
      result.response.status + ': ' + result.response.localizedStatus
    );
    return;
  }

  var data = JSON.parse(result.data);
  var content = data.choices[0].message.content.trim().split('\n');

  var contentBlockQuote = [];
  content.forEach(function (item) {
    contentBlockQuote.push('> ' + item);
  });

  var text = argument + '\n\n' + contentBlockQuote.join('\n');
  +'\n\n';

  if (title == undefined) {
    var title = argument;
    if (title.length > 50) {
      title = title.substring(0, 50) + '…';
    }
  }

  if (!File.exists(chatsFolder)) {
    File.createDirectory(chatsFolder);
  }

  const fileLocation = chatsFolder + '/' + title + '.md';

  if (File.exists(fileLocation)) {
    text = File.readText(fileLocation) + '\n\n' + text;
  }

  File.writeText(text, fileLocation);

  Action.preferences.recent = title;
  Action.preferences.recentTimeStamp = new Date().toISOString();

  var fileURL = File.fileURLForPath(fileLocation);

  var result = LaunchBar.execute(
    '/usr/bin/afplay',
    '/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf'
  );

  LaunchBar.openURL(fileURL);

  // LaunchBar.displayNotification({
  //   title: argument,
  //   string: content,
  //   url: fileURL,
  // });
}

function setApiKey() {
  var response = LaunchBar.alert(
    'API key required',
    '1) Press »Open OpenAI.com« to create an API key.\n2) Press »Set API key«',
    'Open OpenAI.com',
    'Set API key',
    'Cancel'
  );
  switch (response) {
    case 0:
      LaunchBar.openURL('https://platform.openai.com/account/api-keys');
      LaunchBar.hide();
      break;
    case 1:
      var clipboardContent = LaunchBar.getClipboardString().trim();

      if (clipboardContent.length == 51) {
        // TODO: Better API key test

        // Write new API key in Action preferences
        Action.preferences.apiKey = clipboardContent;

        LaunchBar.alert(
          'Success!',
          'API key set to: ' + Action.preferences.apiKey
        );
      } else {
        LaunchBar.alert(
          'The length of the clipboard content does not match the length of a correct API key',
          'Make sure the API key is the most recent item in the clipboard!'
        );
      }
      break;
    case 2:
      break;
  }
}
