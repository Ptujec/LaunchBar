#!/bin/bash

# Change to the directory passed as an argument
if [ -n "$1" ]; then
    cd "$1" || {
        echo "{\"error\":\"Could not change to directory: $1\"}"
        exit 0
    }
fi

# Make sure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "{\"error\":\"Not a git repository at: $(pwd)\"}"
    exit 0
fi

# Update all remotes (redirect stderr to stdout)
git remote update 2>&1 > /dev/null

# Get current branch
branch=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ -z "$branch" ]; then
    echo "{\"error\":\"Unable to determine current branch\"}"
    exit 0
fi

# Check for tracking branch
tracking_branch=$(git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)" 2>/dev/null)

# Build JSON object using jq
if [ -n "$tracking_branch" ]; then
    # Get ahead/behind counts (redirect stderr to stdout)
    ahead_behind=$(git rev-list --left-right --count "$tracking_branch"...HEAD 2>/dev/null)
    if [ $? -eq 0 ]; then
        behind=$(echo "$ahead_behind" | cut -f1)
        ahead=$(echo "$ahead_behind" | cut -f2)
    else
        behind=0
        ahead=0
    fi
    
    jq -n \
        --arg branch "$branch" \
        --arg tracking "$tracking_branch" \
        --argjson behind "${behind:-0}" \
        --argjson ahead "${ahead:-0}" \
        '{
            branch: $branch,
            trackingBranch: $tracking,
            hasUpstream: true,
            behindBy: $behind,
            aheadBy: $ahead
        }'
else
    jq -n \
        --arg branch "$branch" \
        '{
            branch: $branch,
            hasUpstream: false,
            behindBy: 0,
            aheadBy: 0
        }'
fi 