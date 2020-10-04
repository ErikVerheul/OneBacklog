#!/bin/bash
WEB_DIR=/var/www/html
echo "delete previous upload"
rm index.html
echo "place maintenance.html"
cp maintenance.html WEB_DIR/index.html
rm favicon.ico
rm -r css
rm -r img
rm -r js
ls -al
echo "done removing old upload and replacing index.html with maintenance.html"
