By default localhost.key and localhost.crt are used in development mode to realize a https connection to the app.
To avoid your browser to show a warning about a self-signed certificate you should add a new local CA to your system. See https://onebacklog.net/localhost-https.html how to do that.
Add localhost: 127.0.0.1 to your hosts file if not already present.
The same article also explains how to create a self-signed certificate and root CA your self.

Note: These ceritfiactes will not work on the Internet. They are trusted only on your system.