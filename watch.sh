#!/bin/bash
while true; do

inotifywait -e modify /home/aaronjkosel/projects/a2bus/dist && \
  sudo make install

done
