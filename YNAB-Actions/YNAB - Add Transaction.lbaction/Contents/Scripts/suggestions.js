/* 
YNAB - Add Transaction Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

const currency = Action.preferences.budgetCurrency;

function runWithString(string) {
  // Don't show if just a currency symbol is entered or if currency is undefined
  if (!string || string == '$' || string == '€' || !currency) {
    return;
  }

  let icon, seperator, title, income, testDecimal;

  if (currency == 'EUR') {
    icon = 'euroTemplate';
    seperator = ',';
  } else {
    icon = 'dollarTemplate';
    seperator = '.';
  }

  if (string.startsWith('+')) {
    income = true;
    string = string.replace(/\+/, '');
  } else {
    income = false;
    string = string.replace(/\-/, '');
  }

  if (string.includes(',') || string.includes('.')) {
    string = string.replace(/[^\d,.+]/g, '').trim();
    testDecimal = string.match(/(?:,|\.)(\d*)/);

    if (string.startsWith(',') || string.startsWith('.')) {
      string = `0${string}`;
    }
    if (testDecimal[1].length == 1) {
      title = `${string}0`;
    } else if (testDecimal[1].length < 1) {
      title = `${string}00`;
    } else {
      title = string;
    }
  } else {
    string = string.replace(/[^\d,.+€\$]/g, '').trim();

    if (string.includes('€') || string.includes('$')) {
      string = string.replace(/€|\$/g, '').trim();

      if (string != '') {
        title = `${string}${seperator}00`;
      }
    } else {
      if (string.length < 2) {
        title = `0${seperator}0${string}`;
      } else if (string.length < 3) {
        title = `0${seperator}${string}`;
      } else {
        title = string.replace(/(\d+?)?(\d\d$)/, '$1' + seperator + '$2');
      }
    }
  }

  title = income ? (title = `+${title}`) : (title = `-${title}`);

  return [
    {
      title: title,
      icon: icon,
    },
  ];
}
