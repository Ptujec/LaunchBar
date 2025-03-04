#!/bin/sh
# 
# Actual Budget Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-03
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
# 

# Path to the original database
path="$1"

# Create a copy of the database with launchbar_ prefix in the same directory
original_dir=$(dirname "$path")
copy_path="${original_dir}/launchbar_$(basename "$path")"
cp "$path" "$copy_path"

# Check if copy was successful
if [ ! -f "$copy_path" ]; then
    echo "Error: Failed to create a copy of the database."
    exit 1
fi

# Query the 50 most recent transactions from the copied database and format as a JSON array
sqlite3 "$copy_path" <<EOF
.mode json
SELECT * FROM (
    -- Account balances
    SELECT
        name || ': ' || replace(printf('%.2f', COALESCE((
            SELECT SUM(amount)
            FROM v_transactions_internal_alive t
            WHERE t.account = accounts.id
            AND t.tombstone = 0
            AND t.is_child = 0
        ), 0) / 100.0), '.', ',') || '€' as title,
        '' as subtitle,
        '' as badge,
        'open' as action,
        id as actionArgument,
        1 as actionRunsInBackground,
        1 as alwaysShowsSubtitle,
        CASE 
            WHEN (
                SELECT SUM(amount)
                FROM v_transactions_internal_alive t
                WHERE t.account = accounts.id
                AND t.tombstone = 0
                AND t.is_child = 0
            ) < 0 THEN 'creditcardRed'
            ELSE 'creditcardTemplate'
        END as "icon",
        '' as "label",
        '' as transactionId
    FROM accounts
    WHERE tombstone = 0 
    AND closed = 0 
    AND offbudget = 0

    UNION ALL

    -- Existing transactions query
    SELECT 
        title,
        subtitle,
        badge,
        action,
        actionArgument,
        actionRunsInBackground,
        alwaysShowsSubtitle,
        "icon",
        "label",
        transactionId
    FROM (
        SELECT
            CASE 
                WHEN t.transfer_id IS NOT NULL THEN 
                    CASE 
                        WHEN t.amount < 0 THEN 'Transfer: -' 
                        ELSE 'Transfer: ' 
                    END || 
                    replace(printf('%.2f', abs(t.amount) / 100.0), '.', ',') || '€'
                WHEN p.name IS NOT NULL THEN 
                    p.name || ': ' || 
                    CASE 
                        WHEN t.amount < 0 THEN '-' 
                        ELSE '' 
                    END || 
                    replace(printf('%.2f', abs(t.amount) / 100.0), '.', ',') || '€'
                ELSE 
                    CASE 
                        WHEN t.amount < 0 THEN '-' 
                        ELSE '' 
                    END || 
                    replace(printf('%.2f', abs(t.amount) / 100.0), '.', ',') || '€'
            END ||
            CASE 
                WHEN t.cleared = 0 THEN ' (uncleared)' 
                ELSE '' 
            END AS title,
            substr(t.date, 1, 4) || '-' || substr(t.date, 5, 2) || '-' || substr(t.date, 7, 2) || 
            CASE 
                WHEN p.name IS NULL AND t.notes = 'Reconciliation balance adjustment' THEN ' (Reconciliation balance adjustment)'
                WHEN c.name IS NOT NULL THEN ' (' || c.name || ')' 
                ELSE '' 
            END AS subtitle,
            a.name AS badge,
            'open' AS action,
            CASE
                WHEN t.notes LIKE '%message://%' THEN
                    substr(t.notes, instr(t.notes, 'message://'), 
                           CASE 
                               WHEN instr(substr(t.notes, instr(t.notes, 'message://')), ' ') > 0 
                               THEN instr(substr(t.notes, instr(t.notes, 'message://')), ' ') - 1
                               ELSE length(substr(t.notes, instr(t.notes, 'message://')))
                           END)
                ELSE t.id
            END AS actionArgument,
            0 AS actionReturnsItems,
            1 AS actionRunsInBackground,
            1 AS alwaysShowsSubtitle,
            CASE 
                WHEN p.name IS NULL AND t.notes = 'Reconciliation balance adjustment' THEN 'plusminusTemplate'
                WHEN t.transfer_id IS NOT NULL THEN
                    CASE 
                        WHEN t.amount < 0 THEN 'transferOutTemplate' 
                        ELSE 'transferInTemplate' 
                    END
                WHEN t.amount >= 0 THEN 'incomingTemplate' 
                ELSE 'cartTemplate' 
            END AS "icon",
            CASE
                WHEN t.notes LIKE '%message://%' THEN '􀣪'
                ELSE ""
            END AS "label",
            t.id AS transactionId
        FROM v_transactions_internal_alive t
        LEFT JOIN accounts a ON t.account = a.id
        LEFT JOIN payees p ON t.payee = p.id
        LEFT JOIN categories c ON t.category = c.id
        WHERE t.tombstone = 0
        ORDER BY t.date DESC
        LIMIT 150 
    )
)
ORDER BY transactionId = '' DESC, subtitle DESC;
EOF
