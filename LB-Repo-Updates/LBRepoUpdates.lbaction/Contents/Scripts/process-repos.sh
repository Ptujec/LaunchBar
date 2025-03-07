#!/bin/bash
# 
# LB Repo Updates Action for LaunchBar
# by Christian Bender (@ptujec)
# 2025-03-06
# 
# Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
# 

support_path="$1"
results_plist="$support_path/RepoResults.plist"
log_file="/tmp/launchbar-repo-update-$(date +%Y%m%d_%H%M%S).txt"
shift  # Remaining args are repo paths

# Create support directory and plist
mkdir -p "$support_path"
[ ! -f "$results_plist" ] && /usr/bin/plutil -create xml1 "$results_plist"

# Check if git is installed
if ! command -v git >/dev/null 2>&1; then
    echo "{\"error\": \"git is not installed\"}" | /usr/bin/plutil -convert xml1 -o "$results_plist" -
    exit 1
fi

# Helper function to output repo status as JSON
output_status() {
    local path=$1
    shift
    jq -n --arg path "$path" "{(\$path): $*}"
}

# Initialize log file with header
echo "🚀 LaunchBar Repository Update Log - $(date)" > "$log_file"
echo "========================================" >> "$log_file"

# Process all repos and create JSON objects, then combine them
(
    for repo_path in "$@"; do
        echo -e "\n📂 Processing repository: $repo_path" >> "$log_file"
        echo "----------------------------------------" >> "$log_file"

        if ! cd "$repo_path" 2>/dev/null; then
            echo "❌ ERROR: Could not change to directory" >> "$log_file"
            output_status "$repo_path" '{"error": "Could not change to directory"}'
            continue
        fi

        # Get current branch and tracking info
        branch=$(git symbolic-ref --short HEAD 2>/dev/null)
        if [ -z "$branch" ]; then
            echo "❌ ERROR: Unable to determine current branch" >> "$log_file"
            output_status "$repo_path" '{"error": "Unable to determine current branch"}'
            continue
        fi

        echo "Current branch: $branch" >> "$log_file"

        tracking_branch=$(git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)" 2>/dev/null)
        if [ -z "$tracking_branch" ]; then
            echo "ℹ️  No upstream branch configured" >> "$log_file"
            output_status "$repo_path" --arg branch "$branch" \
                '{"branch": $branch, "hasUpstream": false}'
            continue
        fi

        echo "Tracking branch: $tracking_branch" >> "$log_file"

        # Update remotes and get status
        echo -e "\n🔁 Updating remotes..." >> "$log_file"
        git remote update >/dev/null 2>&1
        read -r behind ahead <<< "$(git rev-list --left-right --count "$tracking_branch"...HEAD 2>/dev/null || echo "0 0")"
        
        echo "📊 Status: $behind commits behind, $ahead commits ahead" >> "$log_file"
        
        # Base status object
        status="{
            \"branch\": \"$branch\",
            \"hasUpstream\": true,
            \"behindBy\": $behind,
            \"aheadBy\": $ahead"

        # If behind, attempt to pull
        if [ "$behind" -gt 0 ]; then
            echo -e "\n⬇️ Attempting to pull updates..." >> "$log_file"
            before_pull=$(git rev-parse HEAD)
            
            # Stash changes if needed
            if [ -n "$(git status --porcelain)" ]; then
                echo "📦 Stashing local changes..." >> "$log_file"
                git stash push --include-untracked --message "LaunchBar: Auto-stashed changes" >/dev/null 2>&1
                was_stashed=true
            fi
            
            if git pull >/dev/null 2>&1; then
                echo "✅ Pull successful" >> "$log_file"
                echo -e "\n📝 New commits:" >> "$log_file"
                git log --pretty=format:"  • %s" "$before_pull..HEAD" >> "$log_file"
                echo -e "\n\n📄 Changed files:" >> "$log_file"
                git diff --name-only "$before_pull" HEAD | sed 's/^/  • /' >> "$log_file"
                
                has_updates=$(git diff --name-only "$before_pull" HEAD | grep -E '\.lbaction$|\.lbaction/' >/dev/null && echo "true" || echo "false")
                
                if [ -n "$(git stash list | grep 'LaunchBar: Auto-stashed')" ]; then
                    echo -e "\n♻️  Restoring stashed changes..." >> "$log_file"
                    git stash pop >/dev/null 2>&1
                fi
                
                status="$status,
                    \"pullSuccess\": true,
                    \"hasActionUpdates\": $has_updates,
                    \"wasStashed\": ${was_stashed:-false}"
            else
                echo "❌ ERROR: Pull failed" >> "$log_file"
                git_error=$(git pull 2>&1)
                echo "🔍 Git error message: $git_error" >> "$log_file"
                
                status="$status,
                    \"pullSuccess\": false,
                    \"error\": \"Pull failed\""
            fi
        fi
        
        status="$status }"
        output_status "$repo_path" "$status"
        
    done | jq -s "reduce .[] as \$item ({}; . * \$item) | . + {\"logFile\": \"$log_file\"}"
) | plutil -convert xml1 -o "$results_plist" - 

echo -e "\n✨ Update process completed at $(date)" >> "$log_file"

# Play notification sound when done
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf