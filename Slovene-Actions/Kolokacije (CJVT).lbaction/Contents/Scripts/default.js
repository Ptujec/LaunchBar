/* 
Kolokacije Action for LaunchBar
Kolokacije, kolokacijski slovar sodobne slovenščine

by Christian Bender (@ptujec)
2023-07-22

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

function run(argument) {
  argument = argument.trim();
  if (argument == '') return;

  const data = HTTP.getJSON(
    'https://viri.cjvt.si/kolokacije/ajax_api/v1/slv/search/' +
      encodeURIComponent(argument),
    3
  ).data;

  if (!data) return;

  return data.map((item) => ({
    title: item.text,
    badge: item.category,
    icon: 'kTemplate',
    url: 'https://viri.cjvt.si/kolokacije/slv/headword/' + item.id.toString(),
  }));
}
