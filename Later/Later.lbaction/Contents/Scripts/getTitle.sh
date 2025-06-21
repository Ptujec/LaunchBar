#!/bin/bash

url="$1"

# Extract title using regex patterns
title=$(curl -s --max-time 10 -L "$url" | head -n 1000 | perl -l -0777 -ne '
    # Try Open Graph title first (usually more accurate)
    if (/<meta[^>]*?property=["'"'"']og:title["'"'"'][^>]*?content=["'"'"']([^"'"'"']*)/i) {
        print $1;
        exit;
    }
    # Try standard title tag
    elsif (/<title[^>]*>([^<]+)/i) {
        print $1;
        exit;
    }
    # Try meta title tag
    elsif (/<meta[^>]*?name=["'"'"']title["'"'"'][^>]*?content=["'"'"']([^"'"'"']*)/i) {
        print $1;
        exit;
    }
    print "";
')

# Output the raw title - JavaScript will handle the cleanup
echo "$title"