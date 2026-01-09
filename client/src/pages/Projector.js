import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import SmartImage from '../components/SmartImage';
import '../App.css'; 

const socket = io.connect("http://localhost:3001");

const Projector = () => {
  const [gameState, setGameState] = useState({
    phase: 'SETUP', pool: [], banned_ids: [], 
    p1_pick: null, p2_pick: null, decider_song: null,
    players: { p1: "Player 1", p2: "Player 2" }
  });
  
  const [timer, setTimer] = useState(30);
  const [highlightedId, setHighlightedId] = useState(null); 
  const animationRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    socket.on('update_state', (data) => {
      setGameState(prev => {
        const isNewPool = prev.pool.length !== data.pool.length || (data.pool.length > 0 && prev.pool[0]?.id !== data.pool[0]?.id);
        if (isNewPool) {
            setRevealed(false);
            setTimeout(() => setRevealed(true), 100);
        }
        return data;
      });
    });
    socket.on('timer_tick', (time) => setTimer(time));
    return () => { socket.off('update_state'); socket.off('timer_tick'); };
  }, []);

  useEffect(() => {
    if (gameState.phase === 'DECIDER_PHASE') {
      if (animationRef.current) clearInterval(animationRef.current);
      animationRef.current = setInterval(() => {
        const availableSongs = gameState.pool.filter(s => !gameState.banned_ids.includes(s.id) && gameState.p1_pick?.id !== s.id && gameState.p2_pick?.id !== s.id);
        if (availableSongs.length > 0) setHighlightedId(availableSongs[Math.floor(Math.random() * availableSongs.length)].id);
      }, 100);
    } else {
      if (animationRef.current) { clearInterval(animationRef.current); animationRef.current = null; }
      if (gameState.phase === 'READY') setHighlightedId(null); 
    }
  }, [gameState.phase]);

  const getCardClass = (song) => {
    let classes = "song-card";
    if (gameState.banned_ids.includes(song.id)) return classes + " banned";
    if (gameState.p1_pick?.id === song.id || gameState.p2_pick?.id === song.id) return classes + " picked";
    if (gameState.phase === 'READY' && gameState.decider_song?.id === song.id) return classes + " decider";
    if (gameState.phase === 'DECIDER_PHASE' && highlightedId === song.id) return classes + " active-random";
    return classes;
  };

  const getTypeLogo = (type) => {
      const imgPath = type === 'DX' ? '/assets/music_dx.png' : '/assets/music_standard.png';
      return <img src={imgPath} alt={type} style={{position: 'absolute', top: 0, left: 0, width: '50px', zIndex: 5, filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.5))'}} />;
  };

  const getDiffTextColor = (diff) => {
      if (!diff) return '#fff';
      const d = diff.toLowerCase();
      if (d.includes('re:mas') || d.includes('remas')) return '#e082ff'; 
      if (d.includes('expert') || d.includes('exp')) return '#ff4d4f';   
      if (d.includes('master') || d.includes('mas')) return '#a64dff';   
      if (d.includes('advanced') || d.includes('adv')) return '#fb9c2d'; 
      if (d.includes('basic') || d.includes('bas')) return '#22bb5b';    
      return '#aaa'; 
  };

  return (
    <div className="app-container" style={{backgroundColor: '#111', minHeight: '100vh', display:'flex', flexDirection:'column'}}>
      
      <div className="header" style={{padding: '10px 0 20px 0', background: 'linear-gradient(to bottom, #000, transparent)'}}>
        <h1 style={{color: '#666', fontSize: 18, letterSpacing: 3, margin: 0, textAlign: 'center', marginBottom: 10}}>MAIMAI TOURNAMENT</h1>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 50, position: 'relative'}}>
            <div style={{textAlign: 'right', flex: 1}}><div style={{color: '#ff4d4f', fontSize: 40, fontWeight: 'bold', textShadow: '0 0 15px rgba(255, 77, 79, 0.6)'}}>{gameState.players?.p1 || "PLAYER 1"}</div></div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150}}>
                <div style={{fontSize: 30, color: '#aaa', fontFamily: 'Impact', marginBottom: 5}}>VS</div>
                {(gameState.phase === 'BAN_PHASE' || gameState.phase === 'PICK_PHASE') && (<div className={`timer-box ${timer <= 10 ? 'urgent' : ''}`} style={{fontSize: 40, padding: '5px 20px', border: '2px solid #555', borderRadius: 8, background: '#222', marginBottom: 10}}>{timer < 10 ? `0${timer}` : timer}</div>)}
            </div>
            <div style={{textAlign: 'left', flex: 1}}><div style={{color: '#1890ff', fontSize: 40, fontWeight: 'bold', textShadow: '0 0 15px rgba(24, 144, 255, 0.6)'}}>{gameState.players?.p2 || "PLAYER 2"}</div></div>
        </div>
        <h2 style={{textAlign: 'center', color: '#00e5ff', textTransform: 'uppercase', marginTop: 5, fontSize: 24, textShadow: '0 0 10px #00e5ff', letterSpacing: 1}}>
          {gameState.phase === 'SETUP' && "ĐANG CHỜ ADMIN THIẾT LẬP..."}
          {gameState.phase === 'BAN_PHASE' && "GIAI ĐOẠN 1: BLIND BAN (CẤM ẨN)"}
          {gameState.phase === 'REVEAL' && "CÔNG BỐ KẾT QUẢ BAN!"}
          {gameState.phase === 'PICK_PHASE' && "GIAI ĐOẠN 2: PICK (CHỌN BÀI)"}
          {gameState.phase === 'DECIDER_PHASE' && "RANDOM BÀI QUYẾT ĐỊNH..."}
          {gameState.phase === 'READY' && "TRẬN ĐẤU SẴN SÀNG!"}
        </h2>
      </div>

      <div className="pool-grid">
        {gameState.pool.length > 0 ? (
          gameState.pool.map((song, index) => (
            <div key={song.id} className="flip-card-container">
                <div className={`flip-card-inner ${revealed ? 'is-flipped' : ''}`} style={{ transitionDelay: `${index * 0.1}s` }}>
                    <div className="flip-card-front">
                        <div className={getCardClass(song)} style={{height: '100%', margin: 0, border: 'none', position: 'relative'}}>
                            {getTypeLogo(song.type)}
                            <SmartImage song={song} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                            {gameState.banned_ids.includes(song.id) && <div className="status-label ban-label">BANNED</div>}
                            {gameState.p1_pick?.id === song.id && <div className="status-label pick-label" style={{backgroundColor: '#ff4d4f'}}>P1 PICK</div>}
                            {gameState.p2_pick?.id === song.id && <div className="status-label pick-label" style={{backgroundColor: '#1890ff'}}>P2 PICK</div>}
                            
                            <div className="song-info">
                                <div className="song-title">{song.title}</div>
                                <div className="song-level" style={{display: 'flex', gap: 5, justifyContent: 'center', fontWeight: 'bold'}}>
                                    
                                    {/* CẬP NHẬT: Cả Lv và Diff dùng chung màu */}
                                    <span style={{color: getDiffTextColor(song.difficulty)}}>Lv.{song.level}</span>
                                    <span style={{color: getDiffTextColor(song.difficulty)}}>{song.difficulty}</span>

                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flip-card-back">
                        <div style={{textAlign: 'center', opacity: 0.7}}>
                            <h3 style={{color: '#fff', fontSize: 24, margin: 0, letterSpacing: 3}}>MAIMAI</h3>
                            <div style={{color: '#00e5ff', fontSize: 10, letterSpacing: 1}}>TOURNAMENT</div>
                        </div>
                    </div>
                </div>
            </div>
          ))
        ) : (
          <div style={{gridColumn: 'span 5', textAlign: 'center', marginTop: 100, color: '#666'}}><h2>Sẵn sàng phát sóng...</h2></div>
        )}
      </div>
    </div>
  );
};
export default Projector;