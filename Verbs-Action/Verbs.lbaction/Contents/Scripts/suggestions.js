/* 
Verbs Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-03

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  if (argument != '') {
    const contents = HTTP.getJSON(
      'https://www.the-conjugation.com/ajx/moteur.php?o=verbeAutoComplete&q=' +
        argument +
        '&l=en'
    ).data;

    return contents
      .map((item) => item.split('to ')[1])
      .filter((item) => item.startsWith(argument))
      .map((item) => ({ title: item, icon: 'Template' }))
      .sort(
        (a, b) =>
          a.title.length - b.title.length || a.title.localeCompare(b.title)
      );
  }
}
