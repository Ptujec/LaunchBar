/*
CleanShot X Functions
- https://cleanshot.com/docs/api
*/

function run(argument) {
  return [
    {
      title: 'Toggles Desktop icons visiblity', // .localize()
      icon: 'hideTemplate',
      url: 'cleanshot://toggle-desktop-icons',
    },
    {
      title: 'Restore recently closed item', // .localize()
      icon: 'restoreTemplate',
      url: 'cleanshot://restore-recently-closed',
    },
    {
      title: 'Capture Text', // .localize()
      icon: 'ocrTemplate',
      url: 'cleanshot://capture-text',
    },
    {
      title: 'Capture Area', // .localize()
      icon: 'areaTemplate',
      url: 'cleanshot://capture-area',
    },
    {
      title: 'Scrolling Capture', // .localize()
      icon: 'arrowTemplate',
      url: 'cleanshot://scrolling-capture',
    },
    {
      title: 'Capture Fullscreen', // .localize()
      icon: 'camTemplate',
      url: 'cleanshot://capture-fullscreen',
    },
    {
      title: 'Record Screen (Video/GIF)', // .localize()
      icon: 'videoTemplate',
      url: 'cleanshot://record-screen',
    },
  ];
}
