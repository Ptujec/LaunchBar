function run(argument) {
  var recordings = HTTP.getJSON(
    'https://api.rtvslo.si/ava/getSearch2?client_id=82013fb3a531d5414f478747c1aca622&q=' +
      encodeURI(argument) +
      '&showTypeId=&sort=date&order=desc&pageSize=20&pageNumber=0&subtitled=&clip=clip&from=2007-01-01'
  ).data.response.recordings;

  var result = [];
  recordings.forEach(function (item) {
    var rDate = item.broadcastDate;
    var showName = item.showName;
    var duration = item['length'];

    var sub = rDate + ', ' + showName + ' (' + duration + ')';

    result.push({
      title: item.title,
      subtitle: sub,
      url: item.link,
      icon: 'hitTemplate',
    });
  });

  return result;
}
