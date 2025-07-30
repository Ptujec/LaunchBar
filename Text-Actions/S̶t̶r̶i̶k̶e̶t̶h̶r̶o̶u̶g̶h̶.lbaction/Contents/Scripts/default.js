/* 
S̶t̶r̶i̶k̶e̶t̶h̶r̶o̶u̶g̶h̶ Action for LaunchBar
by Christian Bender (@ptujec)
2025-07-30

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  const strikethrough = argument.split('').join('\u0336') + '\u0336';
  LaunchBar.paste(strikethrough);
}
