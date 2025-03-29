#!/bin/bash
#
# Actual Budget Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-05
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

set -euo pipefail # Enhanced error handling
IFS=$'\n\t'

DB_PATH="$1"
CACHE_FILE="$2"

# If cache file exists, compare modification times
if [ -f "$CACHE_FILE" ]; then
  DB_MOD=$(stat -f %m "$DB_PATH")
  CACHE_MOD=$(stat -f %m "$CACHE_FILE")
  if [ $CACHE_MOD -gt $DB_MOD ]; then
    # Cache is newer than database, tell JavaScript to use cache
    echo '{"useCache": true}'
    exit 0
  fi
fi

if [ ! -r "$DB_PATH" ]; then
  echo "Error: Cannot read database at $DB_PATH" >&2
  exit 1
fi

# Get accounts data using read-only mode
accounts=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        accounts.id, 
        accounts.name,
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

# Get transactions data
transactions=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        t.id,
        t.amount,
        t.date,
        t.notes,
        t.cleared,
        t.transfer_id,
        t.account as account_id,
        t.payee as payee_id,
        t.category as category_id,
        a.name as account_name,
        p.name as payee_name,
        c.name as category_name
    FROM v_transactions_internal_alive t
    LEFT JOIN accounts a ON t.account = a.id
    LEFT JOIN payees p ON t.payee = p.id
    LEFT JOIN categories c ON t.category = c.id
    WHERE t.is_child = 0
    ORDER BY t.date DESC 
    LIMIT 200;" 2>&1)
if [ $? -ne 0 ]; then
  echo "Error querying transactions: $transactions" >&2
  transactions="[]"
fi

# Get categories data
categories=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    WITH RECURSIVE
    category_tree AS (
        SELECT 
            c.id,
            c.name,
            c.is_income,
            c.sort_order,
            g.id as group_id,
            g.name as group_name,
            g.is_income as group_is_income,
            g.sort_order as group_sort_order
        FROM categories c
        LEFT JOIN category_groups g ON c.cat_group = g.id
        WHERE c.tombstone = 0 AND g.tombstone = 0
        AND c.hidden = 0
        ORDER BY g.is_income, g.sort_order, c.sort_order
    )
    SELECT * FROM category_tree;" 2>&1)
if [ $? -ne 0 ]; then
  echo "Error querying categories: $categories" >&2
  categories="[]"
fi

# Get zero_budgets data for current month
current_month=$(date +"%Y%m")
zero_budgets=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        category as \"category\",
        amount as \"budgeted\"
    FROM zero_budgets
    WHERE month = $current_month;")
if [ -z "$zero_budgets" ]; then
  zero_budgets="[]"
fi

# Get number format preference
numberFormat=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT COALESCE(
        (SELECT value FROM preferences WHERE id = 'numberFormat'),
        'comma-dot'
    ) as value;" 2>&1)
if [ $? -ne 0 ]; then
  echo "Error querying number format preference: $numberFormat" >&2
  numberFormat="[]"
fi

# Get date format preference
dateFormat=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT COALESCE(
        (SELECT value FROM preferences WHERE id = 'dateFormat'),
        'MM-dd-yyyy'
    ) as value;" 2>&1)
if [ $? -ne 0 ]; then
  echo "Error querying date format preference: $dateFormat" >&2
  dateFormat="[]"
fi

# Output JSON
jq -n --argjson accounts "$accounts" --argjson transactions "$transactions" --argjson categories "$categories" --argjson zero_budgets "$zero_budgets" --argjson numberFormat "$numberFormat" --argjson dateFormat "$dateFormat" \
  '{ 
        useCache: false,
        accounts: $accounts, 
        transactions: $transactions,
        categories: $categories,
        zero_budgets: $zero_budgets,
        numberFormat: ($numberFormat[0].value // "comma-dot"),
        dateFormat: ($dateFormat[0].value // "MM-dd-yyyy")
    }'
