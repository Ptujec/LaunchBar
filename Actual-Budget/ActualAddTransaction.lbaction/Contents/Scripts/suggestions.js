/* 
YNAB - Add Transaction Action for LaunchBar
by Christian Bender (@ptujec)
2023-07-04

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/
include('global.js');

function runWithString(string) {
  if (!string) return;

  // TODO: check if there is a way to do this just once … not repeatly when the string changes
  Action.preferences.transactionBudget = undefined; // important reset
  Action.preferences.skipFileCheck = false; // Reset flag to ensure fresh data on new transaction

  getDatabaseData(); // good spot to refresh data as the user enters the amount … the delay in the parsing is fine … better than in other places
  Action.preferences.skipFileCheck = true; // Enable cache for subsequent calls

  const result = parseAmount(string);
  if (!result.success) return;

  return [
    {
      title: result.displayAmount,
      icon: 'addTemplate',
    },
  ];
}
