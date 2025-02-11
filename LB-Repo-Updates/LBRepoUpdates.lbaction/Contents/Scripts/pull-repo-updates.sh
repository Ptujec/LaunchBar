#!/bin/bash

repo_path="$1"

cd "$repo_path"

# Check if the repository has a remote configured
if ! git config --get remote.origin.url > /dev/null; then
  echo "No remote repository configured"
  exit 1
fi

# Stash any uncommitted changes
git stash push --include-untracked --message "LaunchBar: Auto-stashed changes before pulling updates"

# Pull updates from the remote repository
if git pull; then
  echo "Updates pulled successfully"
else
  echo "Error pulling updates"
  exit 1
fi

# Reapply stashed changes if any
if git stash list | grep -q "LaunchBar: Auto-stashed"; then
  git stash pop
fi 