#!/bin/bash
# This script copies a new version of the OneBacklog distribution to the server
echo "Note: Update the target directory in this script before you run it"
TARGET_DIR=erik@onebacklog.net:/home/erik
echo "The target directory is set to: $TARGET_DIR"
echo "The files index.html, favicon.ico and maintenance.tml will be copied to your target directory:"
scp dist/index.html dist/favicon.ico dist/maintenance.html $TARGET_DIR
echo "The folders css, img, js will be copied to your target directory:"
scp  -r dist/css dist/img dist/js $TARGET_DIR
echo "Copy the e-mail service app"
scp dist/../nodejs/app.js $TARGET_DIR
echo "Upload is done"
