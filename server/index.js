const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// --- 1. CẤU HÌNH ---
app.use(cors());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- 2. DATABASE ---
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const FILES = { 
    SONGS: path.join(DATA_DIR, 'songs.json'), 
    ROSTER: path.join(DATA_DIR, 'roster.json'), 
    POOLS: path.join(DATA_DIR, 'pools.json') 
};

const loadJSON = (p, d) => { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : d; } catch (e) { return d; } };
const saveJSON = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

let allSongs = loadJSON(FILES.SONGS, []);
let roster = loadJSON(FILES.ROSTER, []);
let poolConfig = loadJSON(FILES.POOLS, { round_8: [], round_4: [], final: [] });

// --- 3. STATE & TIMER ---
let timerInterval = null;
let timerValue = 30;

let gameState = {
    phase: 'SETUP', 
    pool: [],
    banned_ids: [], 
    p1_banned: [],  
    p2_banned: [],  
    p1_pick: null, 
    p2_pick: null,
    decider_song: null, // Lưu bài hát được random cuối cùng
    players: { p1: "Player 1", p2: "Player 2" }
};

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

const stopTimer = () => clearInterval(timerInterval);

const handleTimerEnd = () => {
    if (gameState.phase === 'BAN_PHASE') {
        // Gom tất cả bài bị cấm ẩn vào danh sách công khai
        const allBans = new Set([...gameState.banned_ids, ...gameState.p1_banned, ...gameState.p2_banned]);
        gameState.banned_ids = Array.from(allBans);
        gameState.phase = 'REVEAL_PHASE';
        io.emit('update_state', gameState);

        // Đợi 5 giây cho khán giả xem rồi sang phase Pick
        setTimeout(() => {
            gameState.phase = 'PICK_PHASE';
            startTimer(30); 
            io.emit('update_state', gameState);
        }, 5000);
    }
    else if (gameState.phase === 'PICK_PHASE') {
        // Hết giờ chọn bài -> Sang hiệu ứng Random Decider
        gameState.phase = 'DECIDER_PHASE';
        io.emit('update_state', gameState);

        // Giả lập 3 giây nhảy viền trên màn hình Projector
        setTimeout(() => {
            // Lọc các bài: KHÔNG bị ban, KHÔNG được p1 pick, KHÔNG được p2 pick
            const available = gameState.pool.filter(s => 
                !gameState.banned_ids.includes(s.id) && 
                gameState.p1_pick?.id !== s.id && 
                gameState.p2_pick?.id !== s.id
            );

            if (available.length > 0) {
                // CHỐT KẾT QUẢ RANDOM
                gameState.decider_song = available[Math.floor(Math.random() * available.length)];
            }
            
            gameState.phase = 'READY'; // Trận đấu sẵn sàng
            io.emit('update_state', gameState);
        }, 3500); 
    }
};

// --- 4. SOCKET IO ---
io.on('connection', (socket) => {
    socket.emit('update_state', gameState);
    socket.emit('timer_tick', timerValue);

    socket.on('set_phase', (newPhase) => {
        gameState.phase = newPhase;
        if (newPhase === 'BAN_PHASE') startTimer(30);
        else if (newPhase === 'PICK_PHASE') startTimer(30);
        else stopTimer();
        io.emit('update_state', gameState);
    });

    socket.on('reset_game', () => {
        stopTimer();
        gameState = { 
            ...gameState, 
            phase: 'SETUP', 
            pool: [], 
            banned_ids: [], 
            p1_banned: [], 
            p2_banned: [], 
            p1_pick: null, 
            p2_pick: null,
            decider_song: null
        };
        io.emit('update_state', gameState);
    });
});

// --- 5. API ---
app.get('/api/songs', (req, res) => res.json(allSongs));
app.get('/api/roster', (req, res) => res.json(roster));
app.get('/api/pools', (req, res) => res.json(poolConfig));
app.get('/api/game-state', (req, res) => res.json(gameState));

app.post('/api/save-pools', (req, res) => { 
    poolConfig = req.body; 
    saveJSON(FILES.POOLS, poolConfig); 
    res.json({success:true}); 
});

app.post('/api/update-players', (req, res) => { 
    gameState.players = { p1: req.body.p1, p2: req.body.p2 }; 
    io.emit('update_state', gameState); 
    res.json({success:true}); 
});

app.get('/api/setup/:round', (req, res) => {
    const configIds = poolConfig[req.params.round] || [];
    let selected = configIds.length > 0 
        ? allSongs.filter(s => configIds.includes(s.id)) 
        : [...allSongs].sort(()=>0.5-Math.random()).slice(0,10);
        
    if (selected.length > 10) selected = selected.sort(()=>0.5-Math.random()).slice(0,10);

    gameState.pool = selected;
    gameState.banned_ids = []; 
    gameState.p1_banned = []; 
    gameState.p2_banned = [];
    gameState.p1_pick = null; 
    gameState.p2_pick = null;
    gameState.decider_song = null;
    
    gameState.phase = 'BAN_PHASE';
    startTimer(30); 
    
    io.emit('update_state', gameState);
    res.json({ success: true, pool: gameState.pool });
});

app.post('/api/mobile-login', (req, res) => 
    req.body.pin === "123456" ? res.json({success:true}) : res.status(401).json({success:false})
);

app.post('/api/mobile-action', (req, res) => {
    const { player, action, songId } = req.body;
    const song = gameState.pool.find(s => s.id === songId);
    if (!song) return res.status(404).json({success:false});

    if (action === 'BAN') {
        const LIMIT = 1;
        if (player === 'p1') {
            if (gameState.p1_banned.length >= LIMIT) return res.json({success:false, message: "Đã chọn xong!"});
            if (!gameState.p1_banned.includes(songId)) gameState.p1_banned.push(songId);
        }
        if (player === 'p2') {
            if (gameState.p2_banned.length >= LIMIT) return res.json({success:false, message: "Đã chọn xong!"});
            if (!gameState.p2_banned.includes(songId)) gameState.p2_banned.push(songId);
        }
    } 
    else if (action === 'PICK') {
        if (gameState.banned_ids.includes(songId)) return res.json({success:false, message: "Bài này bị cấm!"});
        if (player === 'p1') gameState.p1_pick = song;
        if (player === 'p2') gameState.p2_pick = song;
    }

    io.emit('update_state', gameState);
    res.json({success:true});
});

server.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));