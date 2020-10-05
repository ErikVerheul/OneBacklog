#!/bin/bash
# This script copies the server side scripts to the server
echo "Copy the scripts removeOldUpload.sh and installOneBacklog.sh to your home directory at your developemt host to run them from there"
echo "Update the source path before you run this script"
SCRIPTS_SOURCE_PATH=/c/_dev/OneBL/onebacklog/scripts
SCRIPTS_TARGET_DIR=erik@onebacklog.net:/home/erik
echo "The source directory is set to: $SCRIPTS_SOURCE_PATH"
echo "The target directory is set to: $SCRIPTS_TARGET_DIR"
scp $SCRIPTS_SOURCE_PATH/removeOldUpload.sh $SCRIPTS_SOURCE_PATH/installOneBacklog.sh $SCRIPTS_TARGET_DIR
