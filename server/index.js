const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// 1. Import Data Nhạc
const allSongs = require('./data/songs.json');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- TRẠNG THÁI TRẬN ĐẤU (STATE) ---
// Đây là "bộ nhớ" của trọng tài
let matchState = {
    status: 'WAITING', // WAITING, PICKING, READY, FINISHED
    turn: 'PLAYER_1',  // Lượt của ai: PLAYER_1 hoặc PLAYER_2
    
    // Dữ liệu 3 bài thi đấu
    p1_pick: null,     // Bài Player 1 chọn
    p2_pick: null,     // Bài Player 2 chọn
    decider_pick: null // Bài Random
};

// --- HÀM HỖ TRỢ ---
// Hàm lấy thông tin bài hát từ ID
const getSongById = (id) => allSongs.find(s => s.id === id);

// Hàm Random bài thứ 3 (Tránh trùng 2 bài đã chọn)
const randomDeciderSong = () => {
    // Lọc bỏ bài P1 và P2 đã chọn
    const availableSongs = allSongs.filter(s => 
        s.id !== matchState.p1_pick?.id && 
        s.id !== matchState.p2_pick?.id &&
        s.difficulty === 'MAS' // Ví dụ: Bài random chỉ lấy Master (tùy bạn chỉnh)
    );
    
    // Random 1 bài
    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    return availableSongs[randomIndex];
};

// --- API ---
app.get('/api/songs', (req, res) => {
    res.json(allSongs);
});

// API để Client mới vào biết trạng thái hiện tại
app.get('/api/match-state', (req, res) => {
    res.json(matchState);
});

// API Reset trận đấu (Dành cho Admin)
app.get('/api/reset', (req, res) => {
    matchState = {
        status: 'PICKING',
        turn: 'PLAYER_1',
        p1_pick: null,
        p2_pick: null,
        decider_pick: null
    };
    io.emit('update_state', matchState); // Báo tất cả reset
    res.send("Đã reset trận đấu!");
});

// --- SOCKET (REAL-TIME LOGIC) ---
io.on('connection', (socket) => {
    console.log(` Connected: ${socket.id}`);

    // Gửi trạng thái ngay khi vừa kết nối
    socket.emit('update_state', matchState);

    // LẮNG NGHE: Khi Player chọn bài
    socket.on('select_song', (data) => {
        // data = { playerId: 'PLAYER_1', songId: '582_dx_mas' }
        
        console.log(` ${data.playerId} chọn bài: ${data.songId}`);

        const selectedSong = getSongById(data.songId);
        if (!selectedSong) return;

        // LOGIC LƯỢT ĐẤU
        if (matchState.turn === 'PLAYER_1' && data.playerId === 'PLAYER_1') {
            // P1 chọn xong -> Chuyển lượt sang P2
            matchState.p1_pick = selectedSong;
            matchState.turn = 'PLAYER_2';
        
        } else if (matchState.turn === 'PLAYER_2' && data.playerId === 'PLAYER_2') {
            // P2 chọn xong -> Kiểm tra trùng
            if (matchState.p1_pick.id === selectedSong.id) {
                // Nếu muốn cấm chọn trùng thì return ở đây (gửi lỗi về)
                // Ở đây mình cho phép chọn trùng hoặc xử lý sau
            }
            matchState.p2_pick = selectedSong;
            matchState.turn = 'DECIDER_PHASE'; // Chuyển sang giai đoạn Random
            
            // TỰ ĐỘNG RANDOM BÀI CUỐI
            setTimeout(() => {
                matchState.decider_pick = randomDeciderSong();
                matchState.status = 'READY'; // Sẵn sàng thi đấu
                
                // Cập nhật lần cuối cho tất cả mọi người
                io.emit('update_state', matchState);
            }, 2000); // Đợi 2 giây tạo hiệu ứng hồi hộp
        }

        // Cập nhật trạng thái mới cho PC và Mobile
        io.emit('update_state', matchState);
    });

    socket.on('disconnect', () => {
        console.log(` Disconnected: ${socket.id}`);
    });
});

server.listen(3001, () => {
    console.log(" SERVER ĐANG CHẠY TẠI PORT 3001");
});