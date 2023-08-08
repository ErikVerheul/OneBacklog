#!/bin/bash
echo "Update the target directory in this script before you run it"
echo "Run this script from the app install directory as scripts/installScripts.sh"
TARGET_DIR=erik@onebacklog.net:/home/erik
echo "This script copies the server side scripts to : $TARGET_DIR"
echo "Copy the scripts removeOldUpload.sh and installOneBacklog.sh to your home directory at your developemt host to run them from there"
scp scripts/removeOldUpload.sh scripts/installOneBacklog.sh $TARGET_DIR
echo "Upload is done"
