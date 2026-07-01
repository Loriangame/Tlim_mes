// backend/database.js
const fs = require('fs');
const path = require('path');

// Для Render используем /tmp или папку в корне проекта
const DB_PATH = path.join(__dirname, '..', 'database');

// Создаём папку, если её нет
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

// ====== УТИЛИТЫ ======
function readData(filename) {
    const filePath = path.join(DB_PATH, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
    }
    const data = fs.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function writeData(filename, data) {
    const filePath = path.join(DB_PATH, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ====== ПОЛЬЗОВАТЕЛИ ======
function getUsers() {
    return readData('users.json');
}

function saveUsers(users) {
    writeData('users.json', users);
}

function getUserByUsername(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
}

function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id);
}

function createUser(username, password, email) {
    const users = getUsers();
    const newUser = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        username: username,
        password: password,
        email: email || '',
        avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'),
        online: false,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
}

function updateUserOnline(username, online) {
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        user.online = online;
        saveUsers(users);
        return user;
    }
    return null;
}

function getAllUsers() {
    return getUsers();
}

module.exports = {
    getUsers,
    saveUsers,
    getUserByUsername,
    getUserById,
    createUser,
    updateUserOnline,
    getAllUsers
};