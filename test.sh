#!/bin/sh
cd home/pi/greenhouse/
python3 websockets.py  &
npm start &
