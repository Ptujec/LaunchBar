/* 
Kagi.com Action for LaunchBar
by Christian Bender (@ptujec)
2023-02-10

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function runWithString(string) {
  const apiToken = Action.preferences.apiToken;

  if (string == '' || apiToken == undefined) return;

  const data = HTTP.getJSON(
    'https://kagi.com/autosuggest?q=' + encodeURI(string),
    {
      headerFields: {
        Cookie: 'kagi_session=' + apiToken,
      },
    }
  );

  if (data.response.status != 200) return;

  return data.data.map((item) => ({
    title: item.t,
    icon: 'iconTemplate',
  }));
}
