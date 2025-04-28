
To install a new version of OneBacklog on your Linux web server follow these steps:
Build the app with NPM run build to create the files in dist.
Also adjust in your development environment the following parameters in the .env file in the app install root directory:
DOMAIN_NAME=< the domain name of your web server >
TARGET_DIR=< the target (home) directory on the remote host > // TARGET_DIR=you@<your domain name>:/home/you if you have SSH access to the web server
WEB_DIR=< the directory on the remote host containing the public html files > // WEB_DIR=/var/www/html for Apache web server
PM2_DIR=< the home directory of the account on the remote host running PM2 > // PM2_DIR=/home/pm2 when PM2 is installed and used as program management tool

cd to the root directory of the app on your development machine.
Then open a bash shell (eg. GIT bash) and type:
0. scripts/installScripts.sh to install the server side scripts (redo this when these scripts have changed)

1. ssh to the server
2. sudo ./removeOldUpload.sh in your server target directory. The home page is replaced by the maintenance page.

3. At the developer machine, cd to the onebacklog development root directory and run scripts/uploadNewVersion.sh to upload the new version to your target directory at the server.

4. ssh to the server
5. sudo ./installOneBacklog.sh to install the new version.
6. Ctrl-F5 the <your domain name> page in your browser to check if the version number has changed.

Note: cd ../pm2 to open the directory with the mailservice app
