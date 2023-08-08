When using a email provider like Mailgun add a .nvn file here with your credentials. Prevent the publication of this sensitive information in your .gitignore file like so:
# node.js environment file
nodejs/.env

and create your .env file like so:
COUCH_USER=name
COUCH_PW=password
DOMAIN=mg.yourdomain.net
API_KEY=your key