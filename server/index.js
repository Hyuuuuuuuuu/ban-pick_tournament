// 1. CẤU HÌNH MÔI TRƯỜNG
require('dotenv').config(); 

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- ĐƯỜNG DẪN FILE DỮ LIỆU ---
const DATA_DIR = path.join(__dirname, 'data');
const SONGS_PATH = path.join(DATA_DIR, 'songs.json');
const POOLS_PATH = path.join(DATA_DIR, 'pools.json');
const PLAYERS_PATH = path.join(DATA_DIR, 'players.json');

// --- LOAD DỮ LIỆU (KHỞI ĐỘNG) ---
// 1. Load Songs
let allSongs = [];
try {
    allSongs = require(SONGS_PATH);
    console.log(`[OK] Da load ${allSongs.length} bai hat tu songs.json`);
} catch (e) {
    console.error("[ERROR] Khong tim thay file songs.json!");
}

// 2. Load Pools
let pools = { round_8: [], round_4: [], final: [] };
try {
    if (fs.existsSync(POOLS_PATH)) {
        pools = JSON.parse(fs.readFileSync(POOLS_PATH, 'utf8'));
    }
} catch (e) { 
    console.warn("[WARN] Chua co pools.json, su dung cau hinh mac dinh."); 
}

// 3. Load Roster
let playerRoster = [];
try {
    if (fs.existsSync(PLAYERS_PATH)) {
        playerRoster = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8'));
        console.log(`[OK] Da load ${playerRoster.length} tuyen thu.`);
    }
} catch (e) { 
    console.warn("[WARN] Chua co players.json, danh sach rong."); 
}


// --- GAME STATE ---
let gameState = {
  phase: 'SETUP', 
  pool: [],       
  banned_ids: [],
  p1_pick: null,
  p2_pick: null,
  decider_song: null,
  players: { p1: "Player 1", p2: "Player 2" }
};

let timer = 30;
let timerInterval = null;

// --- HÀM HỖ TRỢ ---
const startTimer = (seconds) => {
  if (timerInterval) clearInterval(timerInterval);
  timer = seconds;
  io.emit('timer_tick', timer);
  
  timerInterval = setInterval(() => {
    timer--;
    io.emit('timer_tick', timer);
    if (timer <= 0) clearInterval(timerInterval);
  }, 1000);
};

// =========================================================
// API ENDPOINTS
// =========================================================

// --- 1. LOGIN ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const validUser = process.env.ADMIN_USER || "admin";
    const validPass = process.env.ADMIN_PASS || "admin";

    if (username === validUser && password === validPass) {
        console.log(`[AUTH] Admin da dang nhap thanh cong.`);
        res.json({ success: true, message: "Login Success" });
    } else {
        console.log(`[AUTH] Login that bai (User: ${username})`);
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

// --- 2. ROSTER ---
app.get('/api/roster', (req, res) => {
    res.json(playerRoster);
});

app.post('/api/roster', (req, res) => {
    const { name } = req.body;
    if (name && !playerRoster.includes(name)) {
        playerRoster.push(name);
        fs.writeFileSync(PLAYERS_PATH, JSON.stringify(playerRoster, null, 2), 'utf8');
        console.log(`[ROSTER] Da them tuyen thu: ${name}`);
        res.json({ success: true, roster: playerRoster });
    } else {
        res.status(400).json({ success: false, message: "Invalid Name" });
    }
});

app.delete('/api/roster/:name', (req, res) => {
    const { name } = req.params;
    playerRoster = playerRoster.filter(p => p !== name);
    fs.writeFileSync(PLAYERS_PATH, JSON.stringify(playerRoster, null, 2), 'utf8');
    console.log(`[ROSTER] Da xoa tuyen thu: ${name}`);
    res.json({ success: true, roster: playerRoster });
});

// --- 3. SONGS & POOLS ---
app.get('/api/songs', (req, res) => res.json(allSongs));
app.get('/api/pools', (req, res) => res.json(pools));

app.post('/api/save-pools', (req, res) => {
    try {
        const newPools = req.body;
        pools = newPools; 
        fs.writeFileSync(POOLS_PATH, JSON.stringify(newPools, null, 2), 'utf8');
        console.log("[DATA] Admin da luu file pools.json");
        res.json({ success: true });
    } catch (err) {
        console.error("[ERROR] Loi khi luu file:", err);
        res.status(500).json({ success: false });
    }
});

// --- 4. GAME CONTROL ---
app.post('/api/update-players', (req, res) => {
    const { p1, p2 } = req.body;
    gameState.players = { p1: p1 || "Player 1", p2: p2 || "Player 2" };
    io.emit('update_state', gameState);
    console.log(`[MATCH] Cap nhat nguoi choi: ${gameState.players.p1} vs ${gameState.players.p2}`);
    res.json({ status: "success", players: gameState.players });
});

app.get('/api/setup/:roundName', (req, res) => {
  const { roundName } = req.params;

  if (!pools[roundName]) {
    console.error(`[ERROR] Khong tim thay vong dau: ${roundName}`);
    return res.status(404).send("Round not found");
  }

  const targetIds = pools[roundName];
  let selectedSongs = allSongs.filter(song => targetIds.includes(song.id));

  if (selectedSongs.length === 0) {
    console.warn(`[WARN] Vong ${roundName} chua co bai hat nao.`);
    return res.status(400).send("Empty Pool");
  }

  // Random logic
  if (selectedSongs.length > 10) {
      console.log(`[SYSTEM] Random 10 bai tu pool ${selectedSongs.length} bai.`);
      selectedSongs = selectedSongs.sort(() => 0.5 - Math.random());
      selectedSongs = selectedSongs.slice(0, 10);
  }

  // Reset State
  gameState.phase = 'BAN_PHASE';
  gameState.pool = selectedSongs;
  gameState.banned_ids = [];
  gameState.p1_pick = null;
  gameState.p2_pick = null;
  gameState.decider_song = null;

  io.emit('update_state', gameState);
  startTimer(30);

  console.log(`[SETUP] Da thiet lap vong: ${roundName} (${selectedSongs.length} bai)`);
  res.send(`Setup Complete: ${roundName}`);
});

// =========================================================
// SOCKET.IO
// =========================================================
io.on('connection', (socket) => {
  console.log(`[CONNECT] Client ID: ${socket.id}`);
  
  socket.emit('update_state', gameState);
  socket.emit('timer_tick', timer);

  socket.on('ban_song', (songId) => {
    if (gameState.phase !== 'BAN_PHASE') return;
    
    if (!gameState.banned_ids.includes(songId)) {
      gameState.banned_ids.push(songId);
      io.emit('update_state', gameState);
      console.log(`[ACTION] Ban bai hat ID: ${songId}`);
    }
  });

  socket.on('disconnect', () => {
      // console.log(`[DISCONNECT] Client ID: ${socket.id}`); // Bỏ comment nếu muốn hiện log ngắt kết nối
  });
});

// =========================================================
// START SERVER
// =========================================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SYSTEM] SERVER DANG CHAY TAI PORT ${PORT}`);
  console.log(`[SYSTEM] Dashboard: http://localhost:3000`);
});