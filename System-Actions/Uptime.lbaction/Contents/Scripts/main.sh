#!/bin/bash

uptime=$(uptime --libxo json)
reboot=$(last reboot --libxo json)

jq -n --argjson up "$uptime" --argjson rb "$reboot" '{"uptime-information": $up["uptime-information"], "last-information": $rb["last-information"]}'
