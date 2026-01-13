import React, { useState, useEffect } from 'react';
import SmartImage from '../components/SmartImage';

const MatchControl = ({ socket, allSongs, roster, onRosterUpdate }) => {
  const [gameState, setGameState] = useState({ pool: [], phase: 'SETUP', banned_ids: [], players: {p1: "", p2: ""} });
  const [currentRound, setCurrentRound] = useState(null);
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [newPlayerName, setNewPlayerName] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  useEffect(() => {
    socket.on('update_state', (data) => setGameState(data));
    return () => socket.off('update_state');
  }, [socket]);

  const addPlayer = async () => { 
    if (!newPlayerName.trim()) return; 
    const res = await fetch(`${API_URL}/api/roster`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ name: newPlayerName }) 
    }); 
    const data = await res.json(); 
    if (data.success) { onRosterUpdate(data.roster); setNewPlayerName(""); } 
  };

  const removePlayer = async (name) => { 
    if (window.confirm(`Xóa ${name}?`)) { 
        const res = await fetch(`${API_URL}/api/roster/${name}`, { method: 'DELETE' }); 
        const data = await res.json(); 
        if (data.success) onRosterUpdate(data.roster); 
    } 
  };

  const updatePlayers = async () => { 
    await fetch(`${API_URL}/api/update-players`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ p1: p1Name, p2: p2Name }) 
    }); 
  };

  const setupRound = async (r) => { 
    await updatePlayers(); 
    setCurrentRound(r); 
    await fetch(`${API_URL}/api/setup/${r}`); 
  };

  const rerollRound = async () => { 
    if (currentRound && window.confirm(`REROLL ${currentRound}?`)) await setupRound(currentRound); 
  };

  const getDiffTextColor = (diff) => {
      if (!diff) return '#aaa';
      const d = diff.toLowerCase();
      if (d.includes('re:mas') || d.includes('remas')) return '#e082ff'; 
      if (d.includes('expert') || d.includes('exp')) return '#ff4d4f';   
      if (d.includes('master') || d.includes('mas')) return '#a64dff';   
      if (d.includes('advanced') || d.includes('adv')) return '#fb9c2d'; 
      if (d.includes('basic') || d.includes('bas')) return '#22bb5b';    
      return '#aaa'; 
  };

  return (
    <div style={{display: 'flex', gap: 30, height: '100%'}}>
        <div style={{flex: 4, display: 'flex', flexDirection: 'column', gap: 20}}>
            <div style={cardStyle}>
                <h3 style={headerStyle}>1. Thiết lập Tuyển thủ</h3>
                <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15}}>
                     <div style={{flex:1}}><div style={{color:'#ff4d4f', fontWeight:'bold', marginBottom: 5}}>PLAYER 1</div><select value={p1Name} onChange={e=>setP1Name(e.target.value)} style={selectBoxStyle}><option value="">-- Chọn --</option>{roster.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                     <div style={{fontWeight:'bold', fontSize: 20, paddingTop: 20}}>VS</div>
                     <div style={{flex:1}}><div style={{color:'#1890ff', fontWeight:'bold', marginBottom: 5}}>PLAYER 2</div><select value={p2Name} onChange={e=>setP2Name(e.target.value)} style={selectBoxStyle}><option value="">-- Chọn --</option>{roster.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                </div>
                <div style={{display:'flex', gap: 5}}><input placeholder="Thêm tên mới..." value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value)} style={{flex:1, background:'#222', border:'1px solid #444', color:'white', padding: 8, borderRadius: 4}} /><button onClick={addPlayer} style={btnSimpleStyle}>THÊM</button></div>
            </div>

            <div style={cardStyle}>
                <h3 style={headerStyle}>2. Bắt đầu trận đấu</h3>
                <div style={{display: 'flex', gap: 10, flexDirection: 'column'}}>
                    <RoundBtn name="VÒNG 8 (Tứ Kết)" onClick={()=>setupRound('round_8')} active={currentRound==='round_8'} />
                    <RoundBtn name="VÒNG 4 (Bán Kết)" onClick={()=>setupRound('round_4')} active={currentRound==='round_4'} />
                    <RoundBtn name="CHUNG KẾT" onClick={()=>setupRound('final')} color="#ff0055" active={currentRound==='final'} />
                </div>
                {currentRound && (<button onClick={rerollRound} style={{marginTop: 15, width: '100%', padding: 15, background: '#ff9800', border: 'none', borderRadius: 5, color: 'white', fontWeight: 'bold', cursor: 'pointer'}}>REROLL</button>)}
            </div>
        </div>

        <div style={{flex: 6, ...cardStyle, display: 'flex', flexDirection: 'column'}}>
             <h3 style={{marginTop: 0, color: '#eee', display: 'flex', justifyContent: 'space-between'}}>Trạng thái Realtime <span style={{color: '#00e5ff'}}>{gameState.phase}</span></h3>
             <div style={{flex: 1, background: '#111', borderRadius: 8, padding: 10, overflowY: 'auto'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10}}>
                    {gameState.pool.map(song => (
                        <div key={song.id} style={{position: 'relative', opacity: gameState.banned_ids.includes(song.id) ? 0.3 : 1}}>
                            <SmartImage song={song} style={{width: '100%', borderRadius: 5}} />
                            {gameState.banned_ids.includes(song.id) && <div style={labelOverlay('red')}>BANNED</div>}
                            {gameState.p1_pick?.id === song.id && <div style={labelOverlay('#ff4d4f')}>P1</div>}
                            {gameState.p2_pick?.id === song.id && <div style={labelOverlay('#1890ff')}>P2</div>}
                            
                            <div style={{fontSize: 11, marginTop: 5, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ccc'}}>
                                {song.title}
                            </div>
                            <div style={{fontSize: 10, textAlign: 'center', fontWeight: 'bold', color: getDiffTextColor(song.difficulty)}}>
                                {song.difficulty} - Lv.{song.level}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    </div>
  );
};

const cardStyle = { background: '#252525', padding: 15, borderRadius: 8 };
const headerStyle = { marginTop: 0, color: '#00e5ff', borderBottom: '1px solid #333', paddingBottom: 10 };
const selectBoxStyle = { width: '100%', padding: 10, background: '#111', color: 'white', border: '1px solid #444', borderRadius: 4 };
const btnSimpleStyle = { background:'#444', color:'white', border:'none', padding:'0 15px', cursor:'pointer', borderRadius: 4, fontWeight: 'bold' };
const labelOverlay = (col) => ({position: 'absolute', top: 5, right: 5, background: col, color: 'white', padding: '2px 5px', fontSize: 10, fontWeight:'bold', borderRadius: 3});
const RoundBtn = ({name, onClick, color='#333', active}) => (<button onClick={onClick} style={{padding: 15, background: active ? '#00e5ff' : color, color: active ? 'black' : 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', width: '100%', textAlign: 'left'}}>{active ? '▶ ' : ''}{name}</button>);

export default MatchControl;