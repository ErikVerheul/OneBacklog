#!/bin/bash
# It is assumed that the script is run from the target directory (home/user) on the web server
source .env
WEB_DIR=${WEB_DIR}
if [ -z "${WEB_DIR}" ]; then
  echo "The target directory is not set in the .env file"
  echo "Please set the WEB_DIR variable in the .env file"
  exit 1
fi
PM2_DIR=${PM2_DIR}
if [ -z "${PM2_DIR}" ]; then
  echo "The target directory is not set in the .env file"
  echo "Please set the PM2_DIR variable in the .env file"
  exit 1
fi
echo "Delete previous version of the web app (leave the mail service app as is)"
rm  -rf $WEB_DIR/*
echo "The directory should be clean"
ls -al $WEB_DIR
echo
echo "Copying files to the WEB directory"
cp index.html $WEB_DIR
cp favicon.ico $WEB_DIR
cp -av assets $WEB_DIR
cp -av img $WEB_DIR
echo "Check the new contents of the WEB directory"
ls -al $WEB_DIR
echo
echo "Copy the e-mail service app over the existing files in the PM2 directory"
cd mailservice
cp .env $PM2_DIR
cp package.json $PM2_DIR
cp app.mjs $PM2_DIR
echo
echo "Check the new contents of the MAIL APP directory"
ls -al $PM2_DIR
echo
echo "Run npm install manualy in the PM2 home directory if package.json is updated"
echo "Run pm2 restart app to restart the app"
echo "Run pm2 logs to check the logs of the app"
echo "Run pm2 status to check the status of the app"