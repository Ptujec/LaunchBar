#!/bin/sh
if [ -z "$1" ]; then
    exit 1
fi

zip_file="$1"
parent_dir=$(dirname "$zip_file")
base_name=$(basename "$zip_file" .zip)
target_dir="$parent_dir/$base_name"

counter=1
while [ -d "$target_dir" ]; do
    target_dir="$parent_dir/$base_name $counter"
    counter=$((counter + 1))
done

# Create temporary directory for initial unzip
temp_dir=$(mktemp -d)
unzip -q "$zip_file" -d "$temp_dir"

# Move contents from temp dir to target dir
mkdir -p "$target_dir"
mv "$temp_dir"/*/* "$target_dir" 2>/dev/null || mv "$temp_dir"/* "$target_dir"

# Clean up temp directory
rm -rf "$temp_dir"
echo "$target_dir"