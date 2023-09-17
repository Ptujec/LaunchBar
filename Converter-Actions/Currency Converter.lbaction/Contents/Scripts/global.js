const apiKey = Action.preferences.apiKey;
const ratesDataPath = `${Action.cachePath}/localRatesData.json`;
const cLocale = LaunchBar.currentLocale;

const minMaxFractionDefault = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
};
const minMaxFractionRate = {
  maximumFractionDigits: 4,
  minimumFractionDigits: 2,
};

const currencyListData = File.readJSON(
  `${Action.path}/Contents/Resources/currencyList.json`
);

const currencyList =
  LaunchBar.currentLocale == 'de'
    ? currencyListData.currencies_de
    : currencyListData.currencies;

// SETTING VARIABLES
const base = Action.preferences.base ?? 'USD';

let baseSetting = {
  title: 'Choose base currency'.localize(),
  icon: 'settings',
  badge: 'USD',
  action: 'baseCurrencyList',
};

if (base) baseSetting.badge = base;

const targetsSetting = {
  title: 'Choose target currencies'.localize(),
  icon: 'settings',
  action: 'targetCurrencyList',
};

let targetCurrencies = Action.preferences.targetCurrencies ?? [];

if (targetCurrencies != '') {
  targetsSetting.badge = targetCurrencies.join(', ');
}
