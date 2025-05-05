#!/bin/bash
#
# Actual Budget - Add Transaction Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-10
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

# Get accounts data
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

# Get ALL transactions data (no date filter)
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
        t.is_parent,
        t.is_child,
        t.parent_id,
        a.name as account_name,
        p.name as payee_name,
        c.name as category_name,
        c.is_income as category_is_income,
        a.offbudget as account_offbudget
    FROM v_transactions_internal_alive t
    LEFT JOIN accounts a ON t.account = a.id
    LEFT JOIN payees p ON t.payee = p.id
    LEFT JOIN categories c ON t.category = c.id
    WHERE (t.is_child = 0 OR t.parent_id IS NOT NULL)
    AND a.offbudget = 0
    AND t.tombstone = 0
    ORDER BY t.date DESC;" 2>&1)
if [ $? -ne 0 ]; then
  echo "Error querying transactions: $transactions" >&2
  transactions="[]"
fi

# Replace the payees query with this updated version
payees=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    WITH active_accounts AS (
        SELECT id, name
        FROM accounts
        WHERE tombstone = 0 
        AND closed = 0 
        AND offbudget = 0
    ),
    transfer_payees AS (
        SELECT p.id, a.name, p.transfer_acct
        FROM payees p
        JOIN active_accounts a ON p.transfer_acct = a.id
        WHERE p.tombstone = 0 
        AND p.transfer_acct IS NOT NULL
    ),
    regular_payees AS (
        SELECT id, name, transfer_acct
        FROM payees
        WHERE tombstone = 0
        AND transfer_acct IS NULL
        AND name != ''
    )
    SELECT * FROM transfer_payees
    UNION ALL
    SELECT * FROM regular_payees
    ORDER BY name ASC;" 2>&1)
if [ $? -ne 0 ]; then
  echo "Error querying payees: $payees" >&2
  payees="[]"
fi

# Get categories with their type and group info
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

# Get ALL zero_budgets data (no date filter)
zero_budgets=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT 
        z.month,
        z.category,
        z.amount as budgeted,
        z.carryover,
        COALESCE(zbm.buffered, 0) as buffered
    FROM zero_budgets z
    LEFT JOIN zero_budget_months zbm ON z.month = zbm.id
    ORDER BY z.month DESC;")
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

# Get notes data
notes=$(sqlite3 -json "file:$DB_PATH?mode=ro" "
    SELECT id, note
    FROM notes
    WHERE note IS NOT NULL;")
if [ -z "$notes" ]; then
  notes="[]"
fi

# Output JSON
echo '{
  "useCache": false,
  "timestamp": "'$(date "+%Y-%m-%d %H:%M:%S")'",
  "accounts": '"$accounts"',
  "transactions": '"$transactions"',
  "payees": '"$payees"',
  "categories": '"$categories"',
  "zero_budgets": '"$zero_budgets"',
  "numberFormat": "'"$( echo "$numberFormat" | jq -r '.[0].value // "comma-dot"')"'",
  "dateFormat": "'"$( echo "$dateFormat" | jq -r '.[0].value // "MM-dd-yyyy"')"'",
  "notes": '"$notes"'
}' | jq '.'
