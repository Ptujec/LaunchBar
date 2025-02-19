// LaunchBar Action Script

function runWithString(argument) {
  if (!argument) return;

  const data = HTTP.getJSON(
    `https://api.ardmediathek.de/search-system/search/suggestions?query=${encodeURIComponent(
      argument
    )}&resultCount=20&platform=MEDIA_THEK`
  );

  return data.data.map((item) => ({
    title: item.title,
    icon: 'iconTemplate',
    ...(item.type !== 'Item' && item.type !== '[null]' && { label: item.type }),
  }));
}
