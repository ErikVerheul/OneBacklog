When using a email provider like Mailgun add a .nvn file here with your credentials. Prevent the publication of this sensitive information in your .gitignore file like so:
# mailservice environment file
mailservice/.env

and create your .env file like so:
COUCH_USER=name
COUCH_PW=password
API_KEY=your key

Note: build the app on the server with npm install in /home/pm2