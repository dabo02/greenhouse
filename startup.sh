#!/bin/bash
# /etc/init.d/startup

### BEGIN INIT INFO
# Provides:          startup
# Required-Start:    $ALL
# Required-Stop:
# Default-Start:     2 3 5
# Default-Stop:      0 1 6
# Short-Description: Run GrowBot as Daemon
# Description:       This script starts the server for the GrowBotV1
### END INIT INFO
service mongod start
sleep 3
python3 /home/pi/websockets.py &
echo 'Everything started succesfully'
echo continue
