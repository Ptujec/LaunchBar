#!/bin/bash

repo_path="$1"
support_path="$2"
results_plist="$support_path/StatusResults.plist"

# Function to write error and exit
write_error() {
    local error_msg="$1"
    echo "{\"error\": \"$error_msg\"}" | plutil -convert xml1 -o "$results_plist" -
    echo "{\"error\": \"$error_msg\"}"
    exit 0
}

# Create support directory and plist if they don't exist
mkdir -p "$support_path"
[ ! -f "$results_plist" ] && /usr/bin/plutil -create xml1 "$results_plist"

# Change to repo directory or exit with error
[ -n "$repo_path" ] && cd "$repo_path" || write_error "Could not change to directory: $repo_path"

# Update all remotes silently
git remote update &>/dev/null

# Get current branch or exit with error
branch=$(git symbolic-ref --short HEAD 2>/dev/null)
[ -z "$branch" ] && write_error "Unable to determine current branch"

# Get tracking branch and build result
tracking_branch=$(git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)" 2>/dev/null)

if [ -n "$tracking_branch" ]; then
    # Get ahead/behind counts
    read -r behind ahead <<< $(git rev-list --left-right --count "$tracking_branch"...HEAD 2>/dev/null || echo "0 0")
    
    # Write results
    echo "{
        \"branch\": \"$branch\",
        \"trackingBranch\": \"$tracking_branch\",
        \"hasUpstream\": true,
        \"behindBy\": $behind,
        \"aheadBy\": $ahead
    }" | plutil -convert xml1 -o "$results_plist" -
else
    echo "{
        \"branch\": \"$branch\",
        \"hasUpstream\": false,
        \"behindBy\": 0,
        \"aheadBy\": 0
    }" | plutil -convert xml1 -o "$results_plist" -
fi 