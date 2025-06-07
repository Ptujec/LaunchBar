#!/bin/sh

network_quality=$(networkQuality -c)

connection_type=$(echo "$network_quality" | jq -r '.other["interface-type"] | keys[0]')
interface_name=$(echo "$network_quality" | jq -r '.interface_name')

if [ "$connection_type" = "wifi" ] && [ "$interface_name" != "" ]; then
    wifi_ssid=$(ipconfig getsummary "$interface_name" | awk '/ SSID/ {print $NF}')
    echo "$network_quality" | jq --arg ssid "$wifi_ssid" --arg type "$connection_type" '. + {wifi_name: $ssid, connection_type: $type}'
else
    echo "$network_quality" | jq --arg type "$connection_type" '. + {connection_type: $type}'
fi