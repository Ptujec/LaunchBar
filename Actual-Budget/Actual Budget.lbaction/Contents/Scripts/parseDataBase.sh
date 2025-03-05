#!/bin/bash
# 
# Actual Budget Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-05
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
# 

set -e  # Exit on error

DB_PATH="$1"
DB_DIR=$(dirname "$DB_PATH")
TEMP_DB="${DB_DIR}/launchbar_$(basename "$DB_PATH")"

# Create a copy of the database
cp "$DB_PATH" "$TEMP_DB"

# Get accounts and transactions data separately
accounts=$(sqlite3 -json "$TEMP_DB" "
    SELECT 
        accounts.id, 
        accounts.name,
        accounts.closed,
        accounts.offbudget,
        accounts.sort_order,
        COALESCE((
            SELECT SUM(amount)
            FROM v_transactions_internal_alive t
            WHERE t.account = accounts.id
            AND t.tombstone = 0
            AND t.is_child = 0
        ), 0) as balance
    FROM accounts
    WHERE accounts.tombstone = 0 
    AND accounts.closed = 0 
    AND accounts.offbudget = 0
    ORDER BY accounts.sort_order;" 2>&1)
if [ $? -ne 0 ]; then
    echo "Error querying accounts: $accounts" >&2
    accounts="[]"
fi

transactions=$(sqlite3 -json "$TEMP_DB" "
    SELECT 
        t.id,
        t.amount,
        t.date,
        t.notes,
        t.cleared,
        t.transfer_id,
        a.name as account_name,
        p.name as payee_name,
        c.name as category_name
    FROM v_transactions_internal_alive t
    LEFT JOIN accounts a ON t.account = a.id
    LEFT JOIN payees p ON t.payee = p.id
    LEFT JOIN categories c ON t.category = c.id
    WHERE t.is_child = 0
    ORDER BY t.date DESC 
    LIMIT 150;" 2>&1)
if [ $? -ne 0 ]; then
    echo "Error querying transactions: $transactions" >&2
    transactions="[]"
fi

# Get number format preference
numberFormat=$(sqlite3 -json "$TEMP_DB" "
    SELECT COALESCE(
        (SELECT value FROM preferences WHERE id = 'numberFormat'),
        'comma-dot'
    ) as value;" 2>&1)
if [ $? -ne 0 ]; then
    echo "Error querying number format preference: $numberFormat" >&2
    numberFormat="[]"
fi

# Get date format preference
dateFormat=$(sqlite3 -json "$TEMP_DB" "
    SELECT COALESCE(
        (SELECT value FROM preferences WHERE id = 'dateFormat'),
        'MM-dd-yyyy'
    ) as value;" 2>&1)
if [ $? -ne 0 ]; then
    echo "Error querying date format preference: $dateFormat" >&2
    dateFormat="[]"
fi

# Output JSON
jq -n --argjson accounts "$accounts" --argjson transactions "$transactions" --argjson numberFormat "$numberFormat" --argjson dateFormat "$dateFormat" \
    '{ 
        accounts: $accounts, 
        transactions: $transactions, 
        numberFormat: ($numberFormat[0].value // "comma-dot"),
        dateFormat: ($dateFormat[0].value // "MM-dd-yyyy")
    }'

# Clean up
rm "$TEMP_DB"
