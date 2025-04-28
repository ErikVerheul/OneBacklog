#!/bin/bash
# It is assumed that this script is run from the root of the app development source directory
source .env
TARGET_DIR=${TARGET_DIR}
if [ -z "${TARGET_DIR}" ]; then
  echo "The target directory is not set in the .env file"
  echo "Please set the TARGET_DIR variable in the .env file"
  exit 1
fi
echo "Update the target directory in the .env file before you run it"
echo "Run this script from the app install directory as scripts/installScripts.sh"
echo "This script copies the server side scripts to : $TARGET_DIR"
echo "A copy of the .env file is uploaded to the server"
scp .env $TARGET_DIR
echo "Copy the scripts removeOldUpload.sh and installOneBacklog.sh to the target directory at your web server to run them from there"
scp scripts/removeOldUpload.sh scripts/installOneBacklog.sh $TARGET_DIR
echo
echo "Upload is done"
