/* 
Maps Route Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  //
  if (argument != undefined && argument.trim().length == 0) {
    return;
  }

  var parts = argument.split(/ to | nach | - /);

  var devider = argument
    .match(/ to | nach | - /)
    .join('')
    .trim();

  var saddr = parts[0]; // source address
  var daddr = parts[1]; // destination address

  if (daddr != undefined) {
    return [
      {
        title: saddr,
        icon: 'circleTemplate',
      },
      {
        title: devider,
        icon: 'dotsTemplate',
      },
      {
        title: daddr,
        icon: 'pinTemplate',
      },
    ];
  }
}
