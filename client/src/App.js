// client/src/App.js
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import SongCard from './components/SongCard'; // Import component vừa tạo

// Kết nối tới Server Node.js
const socket = io.connect("http://localhost:3001");

function App() {
  // State lưu trạng thái trận đấu
  const [gameState, setGameState] = useState({
    status: 'WAITING',
    turn: 'PLAYER_1',
    p1_pick: null,
    p2_pick: null,
    decider_pick: null
  });

  useEffect(() => {
    // 1. Lắng nghe sự kiện cập nhật từ Server
    socket.on('update_state', (data) => {
      console.log("Nhận dữ liệu mới:", data);
      setGameState(data);
    });

    // Cleanup khi thoát
    return () => socket.off('update_state');
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f0f2f5', 
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', margin: '0', color: '#333' }}>MAIMAI TOURNAMENT</h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          Trạng thái: <b style={{ color: '#eb2f96' }}>{gameState.status}</b> | 
          Lượt: <b>{gameState.turn}</b>
        </p>
      </div>

      {/* KHUNG HIỂN THỊ 3 BÀI */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        gap: '40px',
        flexWrap: 'wrap' // Để responsive nếu màn hình nhỏ
      }}>
        
        {/* CỘT PLAYER 1 */}
        <SongCard 
          player="PLAYER 1" 
          song={gameState.p1_pick} 
          status={gameState.turn === 'PLAYER_1' ? 'PICKING' : 'DONE'}
        />

        {/* CỘT RANDOM (DECIDER) */}
        <div style={{ marginTop: '50px' }}> {/* Hạ thấp xuống chút cho đẹp */}
          <SongCard 
            player="DECIDER TRACK" 
            song={gameState.decider_pick} 
            status={gameState.status === 'READY' ? 'DONE' : 'WAITING'}
          />
        </div>

        {/* CỘT PLAYER 2 */}
        <SongCard 
          player="PLAYER 2" 
          song={gameState.p2_pick} 
          status={gameState.turn === 'PLAYER_2' ? 'PICKING' : 'DONE'}
        />

      </div>

    </div>
  );
}

export default App;