const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    } 
});

// KẾT NỐI DATABASE
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log("Server connected to MongoDB Cloud"))
    .catch(err => console.error(" MongoDB connection error:", err));

// ĐỊNH NGHĨA SCHEMAS
const Song = mongoose.model('Song', new mongoose.Schema({
    id: String, sort_id: Number, title: String, display_title: String,
    artist: String, genre: String, image_hash: String,
    type: String, difficulty: String, level: String, version: String
}));

const Roster = mongoose.model('Roster', new mongoose.Schema({ names: [String] }));

const Pool = mongoose.model('Pool', new mongoose.Schema({
    round_8: [String], round_4: [String], final: [String]
}));

// TRẠNG THÁI TRẬN ĐẤU (Lưu trên RAM)
let gameState = {
    phase: 'SETUP', pool: [], banned_ids: [], p1_banned: [], p2_banned: [],
    p1_pick: null, p2_pick: null, decider_song: null,
    players: { p1: "Player 1", p2: "Player 2" }
};
let timerInterval = null;
let timerValue = 30;

// API ENDPOINTS
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Sai tài khoản Admin!" });
    }
});

app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find().sort({ sort_id: 1 });
        res.json(songs);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/roster', async (req, res) => {
    const data = await Roster.findOne();
    res.json(data ? data.names : []);
});

app.post('/api/roster', async (req, res) => {
    let data = await Roster.findOne();
    if (!data) data = new Roster({ names: [] });
    data.names.push(req.body.name);
    await data.save();
    res.json({ success: true, roster: data.names });
});

app.delete('/api/roster/:name', async (req, res) => {
    const data = await Roster.findOne();
    if (data) {
        data.names = data.names.filter(n => n !== req.params.name);
        await data.save();
        res.json({ success: true, roster: data.names });
    }
});

app.get('/api/pools', async (req, res) => {
    const data = await Pool.findOne();
    res.json(data || { round_8: [], round_4: [], final: [] });
});

app.post('/api/save-pools', async (req, res) => {
    await Pool.findOneAndUpdate({}, req.body, { upsert: true });
    res.json({ success: true });
});

app.post('/api/update-players', (req, res) => {
    gameState.players = { p1: req.body.p1, p2: req.body.p2 };
    io.emit('update_state', gameState);
    res.json({ success: true });
});

app.get('/api/setup/:round', async (req, res) => {
    const poolConfig = await Pool.findOne();
    const configIds = poolConfig ? poolConfig[req.params.round] : [];
    let selected = [];
    if (configIds.length > 0) {
        selected = await Song.find({ id: { $in: configIds } });
    } else {
        selected = await Song.aggregate([{ $sample: { size: 10 } }]);
    }
    gameState = {
        ...gameState,
        pool: selected.sort(() => 0.5 - Math.random()).slice(0, 10),
        banned_ids: [], p1_banned: [], p2_banned: [],
        p1_pick: null, p2_pick: null, decider_song: null,
        phase: 'BAN_PHASE'
    };
    startTimer(30);
    io.emit('update_state', gameState);
    res.json({ success: true });
});

// LOGIC TIMER
const startTimer = (seconds = 30) => {
    clearInterval(timerInterval);
    timerValue = seconds;
    io.emit('timer_tick', timerValue);
    timerInterval = setInterval(() => {
        timerValue--;
        io.emit('timer_tick', timerValue);
        if (timerValue <= 0) {
            clearInterval(timerInterval);
            handleTimerEnd();
        }
    }, 1000);
};

const handleTimerEnd = () => {
    if (gameState.phase === 'BAN_PHASE') {
        gameState.banned_ids = [...new Set([...gameState.p1_banned, ...gameState.p2_banned])];
        gameState.phase = 'REVEAL_PHASE';
        io.emit('update_state', gameState);
        setTimeout(() => {
            gameState.phase = 'PICK_PHASE';
            startTimer(30);
            io.emit('update_state', gameState);
        }, 5000);
    } else if (gameState.phase === 'PICK_PHASE') {
        gameState.phase = 'DECIDER_PHASE';
        io.emit('update_state', gameState);
        setTimeout(() => {
            const available = gameState.pool.filter(s => !gameState.banned_ids.includes(s.id) && gameState.p1_pick?.id !== s.id && gameState.p2_pick?.id !== s.id);
            if (available.length > 0) gameState.decider_song = available[Math.floor(Math.random() * available.length)];
            gameState.phase = 'READY';
            io.emit('update_state', gameState);
        }, 3500);
    }
};

// MOBILE ACTIONS
app.post('/api/mobile-login', (req, res) => {
    const envPin = process.env.MOBILE_PIN || "123456";
    req.body.pin === envPin ? res.json({success:true}) : res.status(401).json({success:false})
});

app.post('/api/mobile-action', (req, res) => {
    const { player, action, songId } = req.body;
    const song = gameState.pool.find(s => s.id === songId);
    if (!song) return res.status(404).json({success:false});
    if (action === 'BAN') {
        if (player === 'p1' && gameState.p1_banned.length < 1) gameState.p1_banned.push(songId);
        if (player === 'p2' && gameState.p2_banned.length < 1) gameState.p2_banned.push(songId);
    } else if (action === 'PICK') {
        if (!gameState.banned_ids.includes(songId)) {
            if (player === 'p1') gameState.p1_pick = song;
            if (player === 'p2') gameState.p2_pick = song;
        }
    }
    io.emit('update_state', gameState);
    res.json({success:true});
});

io.on('connection', (socket) => {
    socket.emit('update_state', gameState);
    socket.emit('timer_tick', timerValue);
});

server.listen(PORT, () => {
    console.log(` Server is running on port ${PORT}`);
});