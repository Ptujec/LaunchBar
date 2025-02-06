/* 
Linguee Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-06

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function getHTML(url) {
  const data = HTTP.get(url);

  if (data.error) {
    LaunchBar.alert(data.error);
    return;
  }

  if (data.response.status !== 200) {
    return {
      title: data.response.status + ': ' + data.response.localizedStatus,
      icon: 'alert',
    };
  }
  return data.data;
}
