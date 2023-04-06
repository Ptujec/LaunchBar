const apiKey = Action.preferences.apiKey;
const ratesDataPath = Action.supportPath + '/localRatesData.json';
const currencyList = File.readJSON(
  Action.path + '/Contents/Resources/currencyList.json'
).symbols;
const todayDate = new Date().toISOString().split('T')[0];
