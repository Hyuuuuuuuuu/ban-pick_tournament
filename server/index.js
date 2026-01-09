const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');       // Thư viện đọc ghi file
const path = require('path');   // Thư viện xử lý đường dẫn

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // QUAN TRỌNG: Để đọc được dữ liệu JSON từ Client gửi lên

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- 1. ĐƯỜNG DẪN FILE DỮ LIỆU ---
const DATA_DIR = path.join(__dirname, 'data');
const SONGS_PATH = path.join(DATA_DIR, 'songs.json');
const POOLS_PATH = path.join(DATA_DIR, 'pools.json');

// --- 2. LOAD DỮ LIỆU ---
// Load kho bài hát tổng (Bắt buộc phải có)
let allSongs = [];
try {
    allSongs = require(SONGS_PATH);
    console.log(`Đã load ${allSongs.length} bài hát từ songs.json`);
} catch (e) {
    console.error("LỖI: Không tìm thấy file songs.json!");
}

// Load cấu hình Pool (Nếu chưa có thì tạo mặc định)
let pools = { round_8: [], round_4: [], final: [] };
try {
    if (fs.existsSync(POOLS_PATH)) {
        const rawData = fs.readFileSync(POOLS_PATH, 'utf8');
        pools = JSON.parse(rawData);
        console.log("Đã load file pools.json thành công.");
    } else {
        console.warn("Chưa có file pools.json, sẽ tạo mới khi lưu.");
    }
} catch (e) {
    console.error("Lỗi đọc file pools.json, sử dụng cấu hình rỗng.");
}

// --- 3. KHỞI TẠO GAME STATE ---
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

// --- 4. HÀM HỖ TRỢ ---
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

// --- 5. CÁC API (ENDPOINTS) ---

// API: Lấy toàn bộ bài hát (Cho trang Editor tìm kiếm)
app.get('/api/songs', (req, res) => {
    res.json(allSongs);
});

// API: Lấy cấu hình Pool hiện tại (Cho trang Editor hiển thị)
app.get('/api/pools', (req, res) => {
    res.json(pools);
});

// API: LƯU CẤU HÌNH POOL MỚI (Từ trang Editor gửi về)
app.post('/api/save-pools', (req, res) => {
    try {
        const newPools = req.body;
        
        // 1. Cập nhật bộ nhớ RAM server
        pools = newPools; 

        // 2. Ghi đè xuống file ổ cứng
        fs.writeFileSync(POOLS_PATH, JSON.stringify(newPools, null, 2), 'utf8');
        
        console.log("Admin đã lưu cấu hình Pool mới!");
        res.json({ success: true, message: "Đã lưu thành công!" });
    } catch (err) {
        console.error("Lỗi khi ghi file pools.json:", err);
        res.status(500).json({ success: false, message: "Lỗi Server khi lưu file." });
    }
});

// API: Cập nhật tên người chơi
app.post('/api/update-players', (req, res) => {
    const { p1, p2 } = req.body;
    gameState.players = { p1: p1 || "Player 1", p2: p2 || "Player 2" };
    io.emit('update_state', gameState); // Báo Tivi cập nhật ngay
    res.json({ status: "success", players: gameState.players });
});

// API: Setup Vòng Đấu (Load bài từ Pool vào Game)
app.get('/api/setup/:roundName', (req, res) => {
  const { roundName } = req.params;

  // Kiểm tra vòng đấu có trong dữ liệu không
  if (!pools[roundName]) {
    return res.status(404).send(`Lỗi: Không tìm thấy vòng "${roundName}"`);
  }

  const targetIds = pools[roundName];

  // Lọc lấy thông tin chi tiết bài hát từ ID
  let selectedSongs = allSongs.filter(song => targetIds.includes(song.id));
  console.log(`✅ Tìm thấy thông tin của: ${selectedSongs.length} bài.`);

  if (selectedSongs.length === 0) {
    console.log(" Pool rỗng!");
    return res.status(400).send(` Vòng "${roundName}" chưa có bài nào. Hãy vào mục Chỉnh Sửa Pool để thêm bài.`);
  }
  

  // Chỉ random nếu số lượng bài trong pool lớn hơn 10
  if (selectedSongs.length > 10) {
      console.log(" Số lượng > 10. Đang tiến hành Random...");
      
      // Trộn ngẫu nhiên
      selectedSongs = selectedSongs.sort(() => 0.5 - Math.random());
      
      // Cắt lấy 10 bài đầu
      selectedSongs = selectedSongs.slice(0, 10);
      
      console.log(` Đã cắt xuống còn 10 bài.`);
  } else {
      console.log(`Số lượng (${selectedSongs.length}) <= 10 nên lấy tất cả (Không random).`);
  }

  // Reset Game State
  gameState.phase = 'BAN_PHASE';
  gameState.pool = selectedSongs;
  gameState.banned_ids = [];
  gameState.p1_pick = null;
  gameState.p2_pick = null;
  gameState.decider_song = null;

  io.emit('update_state', gameState);
  startTimer(30);

  console.log(`SETUP: ${roundName} (${selectedSongs.length} bài)`);
  res.send(`Đã thiết lập: ${roundName}`);
});

// --- 6. SOCKET.IO ---
io.on('connection', (socket) => {
  console.log(' Client kết nối:', socket.id);
  
  // Gửi trạng thái hiện tại ngay khi kết nối
  socket.emit('update_state', gameState);
  socket.emit('timer_tick', timer);

  // Xử lý sự kiện BAN (Từ Mobile App)
  socket.on('ban_song', (songId) => {
    if (gameState.phase !== 'BAN_PHASE') return;
    
    if (!gameState.banned_ids.includes(songId)) {
      gameState.banned_ids.push(songId);
      io.emit('update_state', gameState);
    }
  });

  socket.on('disconnect', () => {});
});

// --- 7. CHẠY SERVER ---
server.listen(3001, () => {
  console.log(' SERVER ĐANG CHẠY');
  console.log(' Dashboard: http://localhost:3000/dashboard');
});