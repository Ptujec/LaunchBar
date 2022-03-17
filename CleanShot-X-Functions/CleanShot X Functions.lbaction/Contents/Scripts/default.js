/*
CleanShot X Functions
- https://cleanshot.com/docs/api
*/

function run(argument) {
  return [
    {
      title: 'Capture Text', // .localize()
      icon: 'ocrTemplate',
      url: 'cleanshot://capture-text',
    },
    {
      title: 'Capture Fullscreen', // .localize()
      icon: 'camTemplate',
      url: 'cleanshot://capture-fullscreen',
    },
    {
      title: 'Capture Area', // .localize()
      icon: 'areaTemplate',
      url: 'cleanshot://capture-area',
    },
    {
      title: 'Record Screen (Video/GIF)', // .localize()
      icon: 'videoTemplate',
      url: 'cleanshot://record-screen',
    },
    {
      title: 'Scrolling Capture', // .localize()
      icon: 'arrowTemplate',
      url: 'cleanshot://scrolling-capture',
    },
  ];
}
