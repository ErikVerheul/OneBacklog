#!/bin/bash
# It is assumed that the script is run from the target directory (home/user) on the web server
source .env
echo "Delete previous upload"
rm index.html
echo "Place maintenance.html"
cp maintenance.html ${WEB_DIR}/index.html
rm favicon.ico
rm -r assets
rm -r img
rm -r mailservice
echo "The directory should be clean"
ls -al
echo
echo "Done removing old upload and replacing index.html with maintenance.html"
