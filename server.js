const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Set security rules so your React website is allowed to talk to this backend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

// Connect to your cloud MongoDB Database
// Note: If you made your own account, replace this URL string with your unique connection string from Atlas!
const url = 'mongodb+srv://User:Password@mmgdb.agmgqu2.mongodb.net/?appName=MMGDb';
const client = new MongoClient(url);
client.connect();

// Sample API Endpoint for checking user credentials against the database
app.post('/api/login', async (req, res, next) => {
  var error = '';
  const { login, password } = req.body;

  const db = client.db('COP4331Cards');
  const results = await db.collection('Users').find({Login:login, Password:password}).toArray();

  var id = -1;
  var fn = '';
  var ln = '';

  if(results.length > 0) {
    id = results[0].UserID;
    fn = results[0].FirstName;
    ln = results[0].LastName;
  }

  var ret = { id:id, firstName:fn, lastName:ln, error:''};
  res.status(200).json(ret);
});

app.listen(5000); // Start the server engine on port 5000