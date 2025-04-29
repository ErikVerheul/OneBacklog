#!/bin/bash
# It is assumed that this script is run from the root of the app development source directory
# This script copies a new version of the OneBacklog distribution to the server
# The script will copy the files to the target directory
# The target directory is set in the .env file
source .env
if [ -z "${TARGET_DIR}" ]; then
  echo "The target directory is not set in the .env file"
  echo "Please set the TARGET_DIR variable in the .env file"
  exit 1
fi
echo "The target directory is set to: ${TARGET_DIR}"
echo "A copy of the .env file will be uploaded to the server"
scp .env ${TARGET_DIR}
echo "The files index.html, favicon.ico and maintenance.tml will be copied to your target directory:"
scp dist/index.html dist/favicon.ico dist/maintenance.html ${TARGET_DIR}
echo "The folders assets and img will be copied to your target directory:"
scp -r dist/assets dist/img ${TARGET_DIR}
echo "Copy the e-mail service app to the mailservice subdirectory of the target directory"
scp -r mailservice ${TARGET_DIR}
echo
echo "Upload is done"
