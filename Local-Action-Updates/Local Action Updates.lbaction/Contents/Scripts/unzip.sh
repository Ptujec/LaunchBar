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

unzip -q "$zip_file" -d "$target_dir"
echo "$target_dir"