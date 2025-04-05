const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

AWS.config.update({ region: 'ap-south-1' });
const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'Users';

app.post('/login', async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing name or email' });
    
    try {
        await dynamo.put({ TableName: TABLE_NAME, Item: { email, name } }).promise();
        res.json({ message: 'Login successful', user: { email, name } });
    } catch (err) {
        res.status(500).json({ error: 'Error storing user', details: err });
    }
});

app.get('/profile/:email', async (req, res) => {
    try {
        const data = await dynamo.get({ TableName: TABLE_NAME, Key: { email: req.params.email } }).promise();
        if (!data.Item) return res.status(404).json({ error: 'User not found' });
        res.json(data.Item);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching user', details: err });
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server accessible at:');
    console.log('- http://localhost:3000');
    console.log('- http://<YOUR_EC2_IP>:3000');
});
