#!/bin/bash
#
# Actual Budget - Add Transaction Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-10
#
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
#

# Instead of set -e, we'll handle errors manually
set +e

DB_PATH="$1"
ACCOUNT_ID="$2"
CATEGORY_ID="$3"
AMOUNT="$4"
PAYEE_ID="$5"
NOTES="$6"
DATE="$7"
TRANSFER_ACCT="$8"  # Optional: if present, this is a transfer transaction
NEW_PAYEE_NAME="$9" # Optional: if present, create a new payee

# Function to log to stderr instead of stdout
log() {
    echo "$1" >&2
}

# Check if Actual is running and quit it if it is
if pgrep -x "Actual" > /dev/null; then
    log "Terminating Actual process..."
    ACTUAL_PID=$(pgrep -x "Actual")
    
    # Attempt normal kill first
    kill $ACTUAL_PID > /dev/null 2>&1
    
    # Wait for Actual to fully terminate (up to 5 seconds)
    for i in {1..5}; do
        if ! pgrep -x "Actual" > /dev/null; then
            break
        fi
        sleep 1
    done
    
    # If process is still running after waiting, try force kill
    if pgrep -x "Actual" > /dev/null; then
        log "Process still running, attempting force kill..."
        kill -9 $ACTUAL_PID > /dev/null 2>&1
        sleep 1
    fi
    
    # Final check - if still running, output error to stdout and exit
    if pgrep -x "Actual" > /dev/null; then
        echo "Error: Could not terminate Actual process"
        exit 1
    fi
fi

# Create backup directory if it doesn't exist
BACKUP_DIR="$(dirname "$DB_PATH")/backups"
mkdir -p "$BACKUP_DIR"

# Generate UUIDs for backup file and transaction(s)
BACKUP_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
TRANSACTION_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
BACKUP_FILE="$BACKUP_DIR/$BACKUP_UUID.sqlite"
cp "$DB_PATH" "$BACKUP_FILE"

# Create a temporary copy of the database to work with
TEMP_DB="${DB_PATH}.temp"
cp "$DB_PATH" "$TEMP_DB"

# If we have a new payee name, create the payee first
if [ -n "$NEW_PAYEE_NAME" ]; then
    PAYEE_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
    
    sqlite3 "$TEMP_DB" << EOF
BEGIN TRANSACTION;

INSERT INTO payees (
    id,
    name,
    tombstone
) VALUES (
    '$PAYEE_UUID',
    '$NEW_PAYEE_NAME',
    0
);

INSERT INTO payee_mapping (
    id,
    targetId
) VALUES (
    '$PAYEE_UUID',
    '$PAYEE_UUID'
);

COMMIT;
EOF

    if [ $? -ne 0 ]; then
        log "Failed to create new payee"
        echo "ERROR: Failed to create new payee"
        exit 1
    fi
    
    PAYEE_ID="$PAYEE_UUID"
fi

# Insert the transaction(s)
if [ -n "$TRANSFER_ACCT" ]; then
    # For transfers, we need two transactions linked by transferred_id
    TRANSFER_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
    
    sqlite3 "$TEMP_DB" << EOF
BEGIN TRANSACTION;

-- Insert the "from" transaction
INSERT INTO transactions (
    id,
    acct,
    category,
    amount,
    description,
    notes,
    date,
    cleared,
    tombstone,
    transferred_id
) VALUES (
    '$TRANSACTION_UUID',
    '$ACCOUNT_ID',
    NULL,
    $AMOUNT,
    '$PAYEE_ID',
    '$NOTES',
    $DATE,
    1,
    0,
    '$TRANSFER_UUID'
);

-- Insert the "to" transaction
INSERT INTO transactions (
    id,
    acct,
    category,
    amount,
    description,
    notes,
    date,
    cleared,
    tombstone,
    transferred_id
) VALUES (
    '$TRANSFER_UUID',
    '$TRANSFER_ACCT',
    NULL,
    $((-$AMOUNT)),
    '$PAYEE_ID',
    '$NOTES',
    $DATE,
    1,
    0,
    '$TRANSACTION_UUID'
);

COMMIT;
EOF

else
    # Regular non-transfer transaction
    sqlite3 "$TEMP_DB" << EOF
BEGIN TRANSACTION;

INSERT INTO transactions (
    id,
    acct,
    category,
    amount,
    description,
    notes,
    date,
    cleared,
    tombstone
) VALUES (
    '$TRANSACTION_UUID',
    '$ACCOUNT_ID',
    '$CATEGORY_ID',
    $AMOUNT,
    '$PAYEE_ID',
    '$NOTES',
    $DATE,
    1,
    0
);

COMMIT;
EOF

fi

# Move the temp file to replace the original first
mv "$TEMP_DB" "$DB_PATH" || {
    log "Failed to update database file"
    echo "ERROR: Failed to update database file"
    exit 1
}

# Wait for the database to settle
sleep 0.1

# Create a verification copy
VERIFY_DB="${DB_PATH}.verify"
cp "$DB_PATH" "$VERIFY_DB" || {
    log "Failed to create verification copy"
    echo "ERROR: Database verification failed"
    exit 1
}

# Check if the transaction was actually added by querying the verification copy
VERIFY_QUERY="SELECT COUNT(*) FROM transactions WHERE id='$TRANSACTION_UUID';"
TRANSACTION_COUNT=$(sqlite3 "$VERIFY_DB" "$VERIFY_QUERY" 2>/dev/null || echo "0")

# Clean up verification copy
rm -f "$VERIFY_DB"

# After successful transaction verification, delete the cache.db file
if [ "$TRANSACTION_COUNT" -gt 0 ]; then
    # Get the directory containing the main database
    DB_DIR=$(dirname "$DB_PATH")
    CACHE_DB="${DB_DIR}/cache.sqlite"
    
    # Delete the cache file if it exists
    if [ -f "$CACHE_DB" ]; then
        rm "$CACHE_DB"
        log "Cache file deleted successfully"
    fi
    
    afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/mic_unmute.caf
    log "Transaction verified successfully"
    echo "$TRANSACTION_UUID"
    exit 0
else
    afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/mic_unmute_fail.caf
    log "Transaction verification failed"
    echo "ERROR: Failed to verify transaction"
    exit 1
fi 