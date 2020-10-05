
To install a new version of OneBacklog on the server folow these steps:
First adjust in your development environment the following parameters to your installation:
SCRIPTS_SOURCE_PATH=< the directory containing the scripts on your local machine >
SCRIPTS_TARGET_DIR=< the directory containing the scripts on your remote host>
SOURCE_PATH=< the directory containing the Vue distibution on your local machine >
TARGET_DIR=< the target (home) directory on the remote host >
WEB_DIR=< the directory on the remote host containing the public html files >
PM2_DIR=< the home directory of the account on the remote host running PM2 >

Then copy the installScripts.sh and uploadNewVersion.sh scripts from this source directory to to your home directory at your development machine.
Then open a bash shell on your dev machine (eg. GIT bash) and type:
0. ./installScripts.sh to install the server side scrips

1. ssh to the server
2. sudo ./removeOldUpload.sh in your server home directory. The home page is replaced by the maintenance page.

3. From the developer machine run uploadNewVersion.sh to upload the new version to your home directory at the server. Note: update the this script with the correct source path first.

4. ssh to the server
5. sudo ./installOneBacklog.sh to install the new version.
6. Ctrl-F5 the OneBacklog.net page in your browser to check if the version number has changed.

Note: cd ../pm2 to open the directory with the nodejs app
