// backend/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Render
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Раздача статических файлов
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ========== REST API ==========

// Регистрация
app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    if (db.getUserByUsername(username)) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ error: 'Имя минимум 3 символа' });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль минимум 4 символа' });
    }
    
    const user = db.createUser(username, password, email);
    res.json({ 
        success: true, 
        user: { id: user.id, username: user.username }
    });
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = db.getUserByUsername(username);
    if (!user) {
        return res.status(400).json({ error: 'Пользователь не найден' });
    }
    
    if (user.password !== password) {
        return res.status(400).json({ error: 'Неверный пароль' });
    }
    
    db.updateUserOnline(username, true);
    res.json({ 
        success: true, 
        user: { id: user.id, username: user.username }
    });
});

// Получить всех пользователей
app.get('/api/users', (req, res) => {
    const users = db.getAllUsers();
    res.json(users.map(u => ({ 
        id: u.id, 
        username: u.username, 
        online: u.online,
        avatarColor: u.avatarColor
    })));
});

// Получить чаты пользователя
app.get('/api/chats/:userId', (req, res) => {
    const userId = req.params.userId;
    // В этой версии все чаты хранятся локально
    // Для полноценной работы нужна база данных
    res.json([]);
});

// ========== WebSocket (Socket.IO) ==========

const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Подключился:', socket.id);
    
    socket.on('user_join', (data) => {
        const { username, userId } = data;
        socket.username = username;
        socket.userId = userId;
        
        activeUsers.set(socket.id, { username, userId });
        db.updateUserOnline(username, true);
        
        const onlineUsers = db.getAllUsers().filter(u => u.online);
        io.emit('users_online', onlineUsers.map(u => u.username));
        
        console.log(`👤 ${username} присоединился`);
    });
    
    socket.on('send_message', (data) => {
        const { chatId, text, file, video, isCircle } = data;
        const username = socket.username || 'Аноним';
        const userId = socket.userId;
        
        const msg = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            chatId: chatId,
            sender: userId,
            username: username,
            text: text || '',
            file: file || null,
            video: video || null,
            isCircle: isCircle || false,
            time: Date.now(),
            isBot: false,
            isSystem: false
        };
        
        // Отправляем всем подключённым пользователям
        io.emit('new_message', msg);
    });
    
    socket.on('typing', (data) => {
        const { chatId, isTyping } = data;
        socket.broadcast.emit('user_typing', {
            username: socket.username,
            chatId: chatId,
            isTyping: isTyping
        });
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Отключился:', socket.id);
        
        if (socket.username) {
            db.updateUserOnline(socket.username, false);
            const onlineUsers = db.getAllUsers().filter(u => u.online);
            io.emit('users_online', onlineUsers.map(u => u.username));
        }
        
        activeUsers.delete(socket.id);
    });
});

// ========== Запуск сервера ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Tlim сервер запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`📍 Локально: http://localhost:${PORT}`);
});