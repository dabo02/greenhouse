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

export RPi="True"
#export SECRET_KEY="Your secret key here"
mongod --repair
sleep 2
mongod --fork --logpath /var/log/mongod.log
sleep 1
python3 /home/pi/greenhouse/websockets.py &
sleep  3
echo 'Everything started succesfully'
echo continue
