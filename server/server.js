const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cron = require('node-cron');
const connectDB = require('./config/db');
const { retrainModel } = require('./services/mlService');

dotenv.config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://ml-toxicity.pages.dev',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5176'
].filter(Boolean);

// Setup Socket.io
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT"]
    }
});

// Store active socket connections mapping userId to socketId
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // When a user logs in / connects, they emit their ID
    socket.on('setup', (userId) => {
        userSockets.set(userId, socket.id);
        socket.join(userId); // Join a room of their own ID for direct messaging
        console.log(`User ${userId} setup complete`);
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        // Helper to remove from map (simplified)
        for (let [key, value] of userSockets.entries()) {
            if (value === socket.id) userSockets.delete(key);
        }
    });
});

// Make io accessible globally to controllers if needed
app.set('socketio', io);

// Security, CORS & parsing middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // or if the origin is in our allowed list
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/alerts', require('./routes/alerts'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Emergency CEO Account Fix
app.get('/api/emergency-fix-ceo', async (req, res) => {
    try {
        const User = require('./models/User');
        const accounts = [
            { email: 'kit28.24bad188@gmail.com', passwordHash: '$2b$12$rKAnmb6BIGbiiJb2/bs7YerAI/mqYuIsonT.VEYFvK0i.jngXjtcC' },
            { email: 'kit28.24bad133@gmail.com', passwordHash: '$2b$12$4L7eEQB.lJX0UadIPKfaWO6Htn70ZFf7gMJekMrbuItYKXbcy1GTi' }
        ];

        for (const acc of accounts) {
            await User.updateOne(
                { email: acc.email },
                { $set: { password: acc.passwordHash, role: 'ceo', isActive: true } }
            );
        }
        res.send('✅ CEO accounts reset successfully. Please try logging in now.');
    } catch (err) {
        res.status(500).send('❌ Error: ' + err.message);
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Scheduled retraining: daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled model retraining...');
    try {
        await retrainModel();
        console.log('Retraining completed successfully');
    } catch (error) {
        console.error('Retraining failed:', error.message);
    }
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    server.listen(PORT, () => console.log(`Server & Socket.io running on port ${PORT} in ${process.env.NODE_ENV} mode`));
};

startServer();

module.exports = app;
