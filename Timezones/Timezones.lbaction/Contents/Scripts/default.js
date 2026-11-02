/* 
Timezones for LaunchBar by Christian Bender @Ptujec

Datasources: 
- https://github.com/dmfilipenko/timezones.json/blob/master/timezones.json
- https://github.com/dr5hn/countries-states-cities-database
- https://github.com/kevinroberts/city-timezones (This is what I am currently using)
- https://github.com/moment/moment-timezone/tree/bf1de5d6a7cc6cb493d90b021fb2c0ac777c93eb


Documentation: 
- https://developer.obdev.at/launchbar-developer-documentation/#/javascript-launchbar
- https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html

Usefull:
- https://timezone360.com/en/time-in/ for timezone name lookup
*/

const CITIES_PATH = Action.path + '/Contents/Resources/cities.json';
const DAY_TIMES = [
  [6, 21],
  [6, 22],
  [7, 21],
  [7, 22],
  [8, 21],
  [8, 22],
  [8, 23],
  [9, 23],
];

function run(argument) {
  if (argument === undefined) {
    return LaunchBar.options.shiftKey ? setDayTimeOptions() : showFavs();
  }
  if (argument.trim() === '') return [];

  const query = argument.toLowerCase();
  const matches = File.readJSON(CITIES_PATH).filter((c) =>
    c.city.toLowerCase().includes(query),
  );
  return buildItems(matches, (c) => ({
    alwaysShowsSubtitle: true,
    action: 'actionOptions',
    actionArgument: c,
  }));
}

function buildItems(cities, extra) {
  return cities
    .flatMap((c) => {
      try {
        return [{ ...cityItem(c), ...extra(c) }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function cityItem(c) {
  const city = cleanCity(c.city);
  const tz = c.timezone;
  const now = new Date();
  const fmt = (options) =>
    LaunchBar.formatDate(now, { timeZone: tz, ...options });

  const [date, time] = fmt({
    timeStyle: 'medium',
    dateStyle: 'medium',
    locale: 'de',
  }).split(', ');
  const [day, month, year] = date.split('.');
  const hour = Number(time.split(':')[0]);
  const { m, e } = dayTime();

  const longDate = fmt({ timeStyle: 'none', dateStyle: 'long' });
  const shortTime = fmt({ timeStyle: 'short', dateStyle: 'none' });

  return {
    title: `${shortTime}, ${longDate}`,
    subtitle: `${localeInfo(c)}, TZ: ${tz}`,
    badge: city,
    icon: hour >= m && hour < e ? 'dayTemplate' : 'nightTemplate',
    timestamp: `${year}-${month}-${day}T${time}`,
  };
}

function cleanCity(name) {
  return name.replace(/\(.*\)/, '').trim();
}

function localeInfo(c) {
  return c.province ? `${c.province}, ${c.country}` : c.country;
}

function mapsURL(c, city) {
  const place = c.iso2 === 'US' ? c.province : c.country;
  return encodeURI(
    `https://maps.apple.com/?q=${city},${place}&near=${c.lat},${c.lng}`,
  );
}

function dayTime() {
  return Action.preferences.dayTime ?? { m: 8, e: 21 };
}

function getFavorites() {
  const favs = Action.preferences.favorites;
  return Array.isArray(favs) ? favs : [];
}

function showFavs() {
  const favs = getFavorites();
  if (favs.length > 0) {
    return [
      ...buildItems(favs, (c) => ({ children: favOptions(c) })),
      {
        title: 'Remove all Favorites',
        icon: 'unFavTemplate.png',
        action: 'removeAll',
      },
    ];
  }

  const backup = Action.preferences.favoritesBackup;
  if (Array.isArray(backup) && backup.length > 0) {
    const choice = LaunchBar.alert(
      'No Favorites found!',
      'Do you want to restore your old Favorites?',
      'Restore',
      'Cancel',
    );
    if (choice === 0) {
      Action.preferences.favorites = backup;
      return showFavs();
    }
  } else {
    LaunchBar.alert(
      'No Favorites found!',
      'Press "space" to search for cities.\nThen press enter on a result for more options.',
    );
  }
}

function actionOptions(c) {
  const city = cleanCity(c.city);
  return [
    {
      title: `Open "${city}" in Apple Maps`,
      url: mapsURL(c, city),
      icon: 'com.apple.Maps',
    },
    {
      title: `Mark "${city}" as Favorite`,
      icon: 'favTemplate',
      action: 'makeFav',
      actionArgument: c,
    },
  ];
}

function favOptions(c) {
  const city = cleanCity(c.city);
  return [
    {
      title: `Open "${city}" in Apple Maps`,
      url: mapsURL(c, city),
      icon: 'com.apple.Maps',
    },
    {
      title: `Remove "${city}" from Favorites`,
      icon: 'unFavTemplate.png',
      action: 'removeFav',
      actionArgument: c,
    },
  ];
}

function makeFav(c) {
  Action.preferences.favorites = [...getFavorites(), c];
  return showFavs();
}

function removeFav(c) {
  const favs = getFavorites();
  const index = favs.findIndex(
    (f) => f.city === c.city && f.timezone === c.timezone,
  );
  Action.preferences.favorites = favs.filter((_, i) => i !== index);
  return showFavs();
}

function removeAll() {
  const choice = LaunchBar.alert(
    'Remove all Favorites',
    'Do you want to remove all Favorites?',
    'Yes',
    'Cancel',
  );
  if (choice !== 0) return showFavs();

  const favs = getFavorites();
  // Keep the existing backup if there is nothing to back up
  if (favs.length > 0) Action.preferences.favoritesBackup = favs;
  Action.preferences.favorites = [];
}

function setDayTimeOptions() {
  const current = dayTime();
  return DAY_TIMES.map(([m, e]) => ({
    title: `${m}:00 - ${e}:00 (${m} am - ${e - 12} pm)`,
    badge: 'Settings - Day Time',
    icon:
      current.m === m && current.e === e
        ? 'clockSelectedTemplate'
        : 'clockTemplate',
    action: 'setDayTime',
    actionArgument: { m, e },
  }));
}

function setDayTime(dayTime) {
  Action.preferences.dayTime = dayTime;
  return showFavs();
}
