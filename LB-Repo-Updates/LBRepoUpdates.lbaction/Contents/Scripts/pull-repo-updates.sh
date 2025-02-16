#!/bin/bash

repo_path="$1"
support_path="$2"
results_plist="$support_path/PullResults.plist"

# Function to write error and exit
write_error() {
    local error_msg="$1"
    echo "{\"status\": \"error\", \"message\": \"$error_msg\"}" | plutil -convert xml1 -o "$results_plist" -
    exit 1
}

# Create support directory and plist if they don't exist
mkdir -p "$support_path"
[ ! -f "$results_plist" ] && /usr/bin/plutil -create xml1 "$results_plist"

# Change to repo directory or exit with error
cd "$repo_path" || write_error "Could not change to directory: $repo_path"

# Store the current commit hash and stash changes
before_pull=$(git rev-parse HEAD)
git stash push --include-untracked --message "LaunchBar: Auto-stashed changes before pulling updates"

# Pull updates and check for action changes
if git pull; then
    action_changes=$(git diff --name-only $before_pull HEAD | grep -E '\.lbaction$|\.lbaction/')
    
    has_updates=$([ -n "$action_changes" ] && echo "true" || echo "false")
    
    echo "{
        \"status\": \"success\",
        \"hasActionUpdates\": $has_updates,
        \"changes\": \"${action_changes:-}\"
    }" | plutil -convert xml1 -o "$results_plist" -
else
    write_error "Error pulling updates"
fi

# Reapply stashed changes if any
git stash list | grep -q "LaunchBar: Auto-stashed" && git stash pop 