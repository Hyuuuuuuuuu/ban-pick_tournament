import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import MatchControl from './MatchControl';
import PoolManager from './PoolManager';

// Lấy URL từ biến môi trường của Vite
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true
});

const Dashboard = () => {
  const [activePage, setActivePage] = useState('MATCH'); 
  const [allSongs, setAllSongs] = useState([]); 
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resSongs = await fetch(`${SOCKET_URL}/api/songs`);
        setAllSongs(await resSongs.json());

        const resRoster = await fetch(`${SOCKET_URL}/api/roster`);
        setRoster(await resRoster.json());
      } catch (err) {
        console.error("Lỗi kết nối API:", err);
      }
    };
    fetchData();
  }, []);

  // Hàm để mở màn hình máy chiếu ở tab mới
  const openProjector = () => {
    window.open('/screen', '_blank');
  };

  return (
    <div style={{display: 'flex', height: '100vh', background: '#121212', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden'}}>
      
      {/* SIDEBAR */}
      <div style={{width: 260, background: '#000', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', padding: 20}}>
        <div style={{color: '#00e5ff', fontSize: 24, fontWeight: 'bold', marginBottom: 40, letterSpacing: 2}}>ADMIN PANEL</div>
        
        <MenuBtn 
          label="ĐIỀU KHIỂN TRẬN ĐẤU" 
          desc="Setup & Monitor" 
          active={activePage === 'MATCH'} 
          onClick={() => setActivePage('MATCH')} 
        />
        
        <MenuBtn 
          label="QUẢN LÝ POOL" 
          desc="Chỉnh sửa kho nhạc" 
          active={activePage === 'POOL'} 
          onClick={() => setActivePage('POOL')} 
        />

        {/* NÚT MỚI: MỞ TRANG PROJECTOR */}
        <div 
          onClick={openProjector} 
          style={{
            padding: '15px 20px', marginBottom: 10, borderRadius: 8, cursor: 'pointer', 
            background: 'rgba(0, 229, 255, 0.1)', border: '1px solid #00e5ff', color: '#00e5ff',
            marginTop: 20
          }}
        >
            <div style={{fontWeight: 'bold', fontSize: 16}}>📺 MỞ MÀN HÌNH TIVI</div>
            <div style={{fontSize: 12, opacity: 0.8, marginTop: 4}}>Mở tab mới cho máy chiếu</div>
        </div>

        {/* Nút đăng xuất */}
        <div style={{marginTop: 'auto', borderTop: '1px solid #333', paddingTop: 20}}>
            <button 
                onClick={() => { if(window.confirm("Đăng xuất Admin?")) { localStorage.removeItem('isAdminLoggedIn'); window.location.href = "/login"; } }}
                style={{width: '100%', padding: '10px', background: '#333', color: '#ff4d4f', border: '1px solid #ff4d4f', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold'}}
            >
                ĐĂNG XUẤT
            </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{flex: 1, padding: 30, overflowY: 'auto', background: '#1a1a1a'}}>
        
        {activePage === 'MATCH' && (
          <MatchControl 
            socket={socket} 
            allSongs={allSongs} 
            roster={roster} 
            onRosterUpdate={setRoster} 
          />
        )}

        {activePage === 'POOL' && (
          <PoolManager 
            allSongs={allSongs} 
          />
        )}

      </div>
    </div>
  );
};

const MenuBtn = ({label, desc, active, onClick}) => (
    <div onClick={onClick} style={{padding: '15px 20px', marginBottom: 10, borderRadius: 8, cursor: 'pointer', background: active ? '#00e5ff' : 'transparent', color: active ? '#000' : '#888', border: active ? 'none' : '1px solid #222'}}>
        <div style={{fontWeight: 'bold', fontSize: 16}}>{label}</div>
        <div style={{fontSize: 12, opacity: 0.7, marginTop: 4}}>{desc}</div>
    </div>
);

export default Dashboard;