#!/bin/bash

repo_path="$1"

cd "$repo_path"

# Check if the repository has a remote configured
if ! git config --get remote.origin.url > /dev/null; then
  echo "No remote repository configured"
  exit 1
fi

# Store the current commit hash
before_pull=$(git rev-parse HEAD)

# Stash any uncommitted changes
git stash push --include-untracked --message "LaunchBar: Auto-stashed changes before pulling updates"

# Pull updates from the remote repository
if git pull; then
  # Check for either new/modified .lbaction bundles or changes within Contents directories
  action_changes=$(git diff --name-only $before_pull HEAD -- "*.lbaction/**" "*.lbaction/Contents/*")
  
  if [ -n "$action_changes" ]; then
    echo "{ \"status\": \"success\", \"hasActionUpdates\": true, \"changes\": \"$action_changes\" }"
  else
    echo "{ \"status\": \"success\", \"hasActionUpdates\": false }"
  fi
else
  echo "{ \"status\": \"error\", \"message\": \"Error pulling updates\" }"
  exit 1
fi

# Reapply stashed changes if any
if git stash list | grep -q "LaunchBar: Auto-stashed"; then
  git stash pop
fi 