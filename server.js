require('dotenv').config();
const express = require('express');
const path = require('path');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Middleware Setup
// ======================
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// ======================
// AWS Configuration
// ======================
AWS.config.update({
    region: 'ap-south-2' // Updated to your region
    // EC2 IAM Role will provide credentials automatically
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// ======================
// Enhanced Login Route
// ======================
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        // Generate unique ID and timestamp
        const userId = `${Date.now()}`;
        const loginTime = new Date().toISOString();

        // 1. First record the login attempt
        await dynamodb.put({
            TableName: 'Users',
            Item: {
                userId,
                username,
                loginTime,
                action: 'login_attempt',
                ipAddress: req.ip || req.connection.remoteAddress
            }
        }).promise();

        // 2. Simple authentication (replace with real auth in production)
        if (username === "admin" && password === "password") {
            // Record successful login
            await dynamodb.put({
                TableName: 'Users',
                Item: {
                    userId: `${Date.now()}_success`,
                    username,
                    loginTime,
                    action: 'login_success',
                    ipAddress: req.ip || req.connection.remoteAddress
                }
            }).promise();

            return res.json({ 
                success: true,
                message: 'Login successful'
            });
        }

        // 3. Record failed attempt
        await dynamodb.put({
            TableName: 'Users',
            Item: {
                userId: `${Date.now()}_failed`,
                username,
                loginTime,
                action: 'login_failed',
                ipAddress: req.ip || req.connection.remoteAddress
            }
        }).promise();

        res.status(401).json({ error: 'Invalid credentials' });

    } catch (error) {
        console.error('DynamoDB Error:', error);
        res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

// ======================
// Additional Routes
// ======================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index1.html'));
});

app.get('/api/buckets', async (req, res) => {
    try {
        const data = await s3.listBuckets().promise();
        res.json(data.Buckets);
    } catch (err) {
        console.error('S3 Error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch S3 buckets',
            details: err.message 
        });
    }
});

// ======================
// Error Handling
// ======================
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ======================
// Start Server
// ======================
app.listen(3000, '0.0.0.0', () => {
    console.log(`
    Server running on http://0.0.0.0:${PORT}
    DynamoDB Table: Users (ap-south-1)
    `);
});
