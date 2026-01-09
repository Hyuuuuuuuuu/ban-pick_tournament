import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import MatchControl from './MatchControl';
import PoolManager from './PoolManager';

const socket = io.connect("http://localhost:3001");

const Dashboard = () => {
  const [activePage, setActivePage] = useState('MATCH'); 
  const [allSongs, setAllSongs] = useState([]); 
  const [roster, setRoster] = useState([]);

  // Fetch dữ liệu dùng chung (Bài hát & Danh sách tuyển thủ)
  useEffect(() => {
    const fetchData = async () => {
      const resSongs = await fetch('http://localhost:3001/api/songs');
      setAllSongs(await resSongs.json());

      const resRoster = await fetch('http://localhost:3001/api/roster');
      setRoster(await resRoster.json());
    };
    fetchData();
  }, []);

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