import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import SmartImage from '../components/SmartImage';
import '../App.css'; 

const socket = io.connect("http://localhost:3001");

const Projector = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState({
    phase: 'SETUP', pool: [], banned_ids: [], 
    p1_pick: null, p2_pick: null, decider_song: null,
    players: { p1: "Player 1", p2: "Player 2" }
  });
  
  const [timer, setTimer] = useState(30);
  const [highlightedId, setHighlightedId] = useState(null); 
  const animationRef = useRef(null);

  // STATE MỚI: Kiểm soát việc lật thẻ
  const [revealed, setRevealed] = useState(false);

  // --- 1. LẮNG NGHE SERVER ---
  useEffect(() => {
    socket.on('update_state', (data) => {
      setGameState(prev => {
        // Nếu danh sách bài hát thay đổi (do Admin Setup vòng mới)
        // Thì reset trạng thái lật thẻ về False (Úp xuống)
        if (JSON.stringify(prev.pool) !== JSON.stringify(data.pool)) {
            setRevealed(false);
            // Sau 100ms thì bắt đầu lật ngửa
            setTimeout(() => setRevealed(true), 100);
        }
        return data;
      });
    });

    socket.on('timer_tick', (time) => setTimer(time));

    return () => {
      socket.off('update_state');
      socket.off('timer_tick');
    };
  }, []);

  // --- 2. LOGIC RANDOM (GIỮ NGUYÊN) ---
  useEffect(() => {
    if (gameState.phase === 'DECIDER_PHASE') {
      startRandomAnimation();
    } else {
      stopRandomAnimation();
      if (gameState.phase === 'READY') setHighlightedId(null); 
    }
  }, [gameState.phase]);

  const startRandomAnimation = () => {
    if (animationRef.current) clearInterval(animationRef.current);
    animationRef.current = setInterval(() => {
      const availableSongs = gameState.pool.filter(s => 
        !gameState.banned_ids.includes(s.id) &&
        gameState.p1_pick?.id !== s.id &&
        gameState.p2_pick?.id !== s.id
      );
      if (availableSongs.length > 0) {
        const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        setHighlightedId(randomSong.id);
      }
    }, 100);
  };

  const stopRandomAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  };

  // --- 3. CLASS CSS ---
  // Lưu ý: Class 'song-card' cũ giờ sẽ nằm bên trong mặt trước
  const getCardClass = (song) => {
    let classes = "song-card"; // Class gốc (để giữ style cũ)
    if (gameState.banned_ids.includes(song.id)) return classes + " banned";
    if (gameState.p1_pick?.id === song.id || gameState.p2_pick?.id === song.id) return classes + " picked";
    if (gameState.phase === 'READY' && gameState.decider_song?.id === song.id) return classes + " decider";
    if (gameState.phase === 'DECIDER_PHASE' && highlightedId === song.id) return classes + " active-random";
    return classes;
  };

  return (
    <div className="app-container" style={{backgroundColor: '#111', minHeight: '100vh'}}>
      
      {/* HEADER GIỮ NGUYÊN */}
      <div className="header" style={{paddingBottom: 10}}>
        <h1 style={{color: '#666', fontSize: 20, letterSpacing: 2, margin: 0}}>MAIMAI TOURNAMENT</h1>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 50, marginTop: 10, padding: '10px 0'}}>
            <div style={{textAlign: 'right'}}><div style={{color: '#ff4d4f', fontSize: 32, fontWeight: 'bold', textShadow: '0 0 10px rgba(255, 77, 79, 0.5)'}}>{gameState.players?.p1 || "PLAYER 1"}</div></div>
            <div style={{fontSize: 40, color: '#aaa', fontFamily: 'Impact'}}>VS</div>
            <div style={{textAlign: 'left'}}><div style={{color: '#1890ff', fontSize: 32, fontWeight: 'bold', textShadow: '0 0 10px rgba(24, 144, 255, 0.5)'}}>{gameState.players?.p2 || "PLAYER 2"}</div></div>
        </div>
        {(gameState.phase === 'BAN_PHASE' || gameState.phase === 'PICK_PHASE') && (
          <div className={`timer-box ${timer <= 10 ? 'urgent' : ''}`} style={{marginTop: 10}}>{timer < 10 ? `0${timer}` : timer}</div>
        )}
        <h2 style={{color: '#00e5ff', textTransform: 'uppercase', marginTop: 15, fontSize: 24, textShadow: '0 0 10px #00e5ff'}}>
          {gameState.phase === 'SETUP' && "ĐANG CHỜ ADMIN THIẾT LẬP..."}
          {gameState.phase === 'BAN_PHASE' && "GIAI ĐOẠN 1: BLIND BAN (CẤM ẨN)"}
          {gameState.phase === 'REVEAL' && "CÔNG BỐ KẾT QUẢ BAN!"}
          {gameState.phase === 'PICK_PHASE' && "GIAI ĐOẠN 2: PICK (CHỌN BÀI)"}
          {gameState.phase === 'DECIDER_PHASE' && "RANDOM BÀI QUYẾT ĐỊNH..."}
          {gameState.phase === 'READY' && "TRẬN ĐẤU SẴN SÀNG!"}
        </h2>
      </div>

      {/* DANH SÁCH BÀI HÁT (POOL) */}
      <div className="pool-grid">
        {gameState.pool.length > 0 ? (
          gameState.pool.map((song, index) => (
            // --- CẤU TRÚC LẬT THẺ ---
            <div key={song.id} className="flip-card-container">
                <div 
                    className={`flip-card-inner ${revealed ? 'is-flipped' : ''}`} 
                    style={{ transitionDelay: `${index * 0}s` }} // Tạo hiệu ứng lật lần lượt (Stagger)
                >
                    
                    {/* MẶT TRƯỚC (NỘI DUNG BÀI HÁT) */}
                    <div className="flip-card-front">
                        {/* Copy nguyên nội dung hiển thị bài hát cũ vào đây */}
                        <div className={getCardClass(song)} style={{height: '100%', margin: 0, border: 'none'}}>
                            <SmartImage song={song} />
                            
                            {gameState.banned_ids.includes(song.id) && <div className="status-label ban-label">BANNED</div>}
                            {gameState.p1_pick?.id === song.id && <div className="status-label pick-label" style={{backgroundColor: '#ff4d4f'}}>P1 PICK</div>}
                            {gameState.p2_pick?.id === song.id && <div className="status-label pick-label" style={{backgroundColor: '#1890ff'}}>P2 PICK</div>}

                            <div className="song-info">
                                <div className="song-title">{song.display_title}</div>
                                <div className="song-level">
                                    <span style={{marginRight: 5, color: '#ffd700'}}>Lv.{song.level}</span>
                                    <span>{song.difficulty}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MẶT SAU (LƯNG BÀI - KHI CHƯA LẬT) */}
                    <div className="flip-card-back">
                        <div style={{textAlign: 'center'}}>
                            <h3 style={{color: '#333', fontSize: 30, margin: 0}}>MAIMAI</h3>
                            <div style={{color: '#555', fontSize: 12}}>TOURNAMENT</div>
                        </div>
                    </div>

                </div>
            </div>
          ))
        ) : (
          <div style={{gridColumn: 'span 5', textAlign: 'center', marginTop: 100, color: '#666'}}>
            <h2>Sẵn sàng phát sóng...</h2>
          </div>
        )}
      </div>

    </div>
  );
};

export default Projector;