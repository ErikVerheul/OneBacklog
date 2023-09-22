#!/bin/bash
echo "Delete previous version"
WEB_DIR=/var/www/html
PM2_DIR=/home/pm2
rm  -rf $WEB_DIR/*
echo "The directory should be clean"
ls -al $WEB_DIR
cp index.html $WEB_DIR
cp favicon.ico $WEB_DIR
cp maintenance.html $WEB_DIR
cp app.js $PM2_DIR
cp -av assets $WEB_DIR
cp -av img $WEB_DIR
echo "Check the new contents"
ls -al $WEB_DIR
echo "Done refreshing app version"
