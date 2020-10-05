#!/bin/bash
# This script copies a new version of the OneBacklog distribution to the server
echo "Copy this script to your home directory at your developemt host and run it from there"
echo "Update the source path before you run this script"
SOURCE_PATH=/c/_dev/OneBL/onebacklog/dist
TARGET_DIR=erik@onebacklog.net:/home/erik
echo "The source directory is set to: $SOURCE_PATH"
echo "The target directory is set to: $TARGET_DIR"
echo "The files index.html, favicon.ico, maintenance.tml and localhost-https.html will be copied from the source to your target directory:"
scp $SOURCE_PATH/index.html $SOURCE_PATH/favicon.ico $SOURCE_PATH/maintenance.html $SOURCE_PATH/localhost-https.html $TARGET_DIR
echo "The folders css, img, js will be copied from $SOURCE_PATH to your target directory:"
scp  -r $SOURCE_PATH/css $SOURCE_PATH/img $SOURCE_PATH/js $TARGET_DIR
echo "Copy the e-mail service app"
scp $SOURCE_PATH/../nodejs/app.js $TARGET_DIR
