#!/bin/bash
# This script copies the server side scripts to the server
echo "Copy these scripts to your home directory at your developemt host to run them from there"
echo "Update the source path before you run this script"
SCRIPTS_SOURCE_PATH=/c/_dev/OneBL/onebacklog/scripts
SCRIPTS_TARGET_DIR=erik@onebacklog.net:~
echo "The source directory is set to: $SCRIPTS_SOURCE_PATH"
echo "The files removeOldUpload.sh and installOneBacklog.sh will be copied from $SCRIPTS_SOURCE_PATH to your target directory at the server:"
scp $SCRIPTS_SOURCE_PATH/removeOldUpload.sh $SCRIPTS_SOURCE_PATH/installOneBacklog.sh SCRIPTS_TARGET_DIR
