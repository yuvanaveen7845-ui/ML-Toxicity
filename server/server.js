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
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
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

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
