import React, { useState, useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import SmartImage from '../components/SmartImage';

const socket = io.connect("http://localhost:3001");

const Dashboard = () => {
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [gameState, setGameState] = useState({ pool: [], phase: 'SETUP', banned_ids: [], p1_pick: null, p2_pick: null });
  const [activeTab, setActiveTab] = useState('round'); 
  const [currentRound, setCurrentRound] = useState(null); 

  // STATE POOL EDITOR
  const [allSongs, setAllSongs] = useState([]); 
  const [poolConfig, setPoolConfig] = useState({ round_8: [], round_4: [], final: [] }); 
  const [editRound, setEditRound] = useState('round_8'); 
  
  // STATE BỘ LỌC (ĐÃ THÊM VERSION)
  const [searchText, setSearchText] = useState(""); 
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [filterGenre, setFilterGenre] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [filterVersion, setFilterVersion] = useState("ALL"); // <--- MỚI

  useEffect(() => {
    socket.on('update_state', (data) => setGameState(data));
    fetchSongsAndPools(); 
    return () => socket.off('update_state');
  }, []);

  const fetchSongsAndPools = async () => {
      const resSongs = await fetch('http://localhost:3001/api/songs');
      const dataSongs = await resSongs.json();
      setAllSongs(dataSongs);

      const resPools = await fetch('http://localhost:3001/api/pools');
      const dataPools = await resPools.json();
      if (dataPools) setPoolConfig(dataPools);
  };

  // --- TẠO MENU FILTER TỰ ĐỘNG ---
  const uniqueLevels = useMemo(() => {
      const levels = [...new Set(allSongs.map(s => s.level))];
      return levels.sort((a, b) => parseFloat(a.replace('+', '.5')) - parseFloat(b.replace('+', '.5')));
  }, [allSongs]);

  const uniqueGenres = useMemo(() => [...new Set(allSongs.map(s => s.genre))].sort(), [allSongs]);
  const uniqueDiffs = useMemo(() => [...new Set(allSongs.map(s => s.difficulty))].sort(), [allSongs]);
  
  // Lấy danh sách Version (Loại bỏ các giá trị null/undefined/Unknown nếu muốn)
  const uniqueVersions = useMemo(() => {
      return [...new Set(allSongs.map(s => s.version))].filter(Boolean).sort();
  }, [allSongs]);

  // --- LOGIC LỌC ---
  const filteredSongs = allSongs.filter(song => {
      const matchText = song.display_title.toLowerCase().includes(searchText.toLowerCase()) || 
                        song.title.toLowerCase().includes(searchText.toLowerCase());
      
      const matchLevel = filterLevel === "ALL" || song.level === filterLevel;
      const matchGenre = filterGenre === "ALL" || song.genre === filterGenre;
      const matchType = filterType === "ALL" || song.type === filterType;
      const matchDiff = filterDiff === "ALL" || song.difficulty === filterDiff;
      
      // Lọc theo Version (MỚI)
      const matchVer = filterVersion === "ALL" || song.version === filterVersion;

      return matchText && matchLevel && matchGenre && matchType && matchDiff && matchVer;
  });

  const savePoolConfig = async () => { await fetch('http://localhost:3001/api/save-pools', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(poolConfig) }); alert("💾 Đã lưu!"); };
  const addToPool = (id) => { if (!poolConfig[editRound].includes(id)) setPoolConfig({ ...poolConfig, [editRound]: [...poolConfig[editRound], id] }); };
  const removeFromPool = (id) => { setPoolConfig({ ...poolConfig, [editRound]: poolConfig[editRound].filter(x => x !== id) }); };
  const updatePlayers = async () => { await fetch('http://localhost:3001/api/update-players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p1: p1Name, p2: p2Name }) }); alert("✅ Đã cập nhật!"); };
  const setupRound = async (r) => { setCurrentRound(r); await fetch(`http://localhost:3001/api/setup/${r}`); setActiveTab('monitor'); };
  const rerollCurrentRound = async () => { if (currentRound && window.confirm(`⚠️ REROLL ${currentRound}?`)) await setupRound(currentRound); };

  return (
    <div style={{display: 'flex', height: '100vh', background: '#222', color: 'white', fontFamily: 'sans-serif'}}>
      
      {/* SIDEBAR */}
      <div style={{width: 250, background: '#111', padding: 20, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column'}}>
        <h2 style={{color: '#00e5ff', margin: 0, marginBottom: 30}}>ADMIN DASHBOARD</h2>
        <div>
          <MenuBtn label="1. Cài đặt Người Chơi" active={activeTab==='players'} onClick={()=>setActiveTab('players')} />
          <MenuBtn label="2. Chọn Vòng Đấu" active={activeTab==='round'} onClick={()=>setActiveTab('round')} />
          <MenuBtn label="3. Theo Dõi (Realtime)" active={activeTab==='monitor'} onClick={()=>setActiveTab('monitor')} />
          <div style={{height: 1, background: '#333', margin: '10px 0'}}></div>
          <MenuBtn label="4. ✏️ CHỈNH SỬA POOL" active={activeTab==='editor'} onClick={()=>setActiveTab('editor')} />
        </div>
      </div>

      {/* CONTENT */}
      <div style={{flex: 1, padding: 40, overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
        
        {/* TABS 1, 2, 3 GIỮ NGUYÊN (Để gọn code mình ẩn đi, bạn giữ nguyên nhé) */}
        {activeTab === 'players' && (
          <div>
             <h1>👥 Nhập thông tin thi đấu</h1>
             <div style={{display: 'flex', gap: 20, marginTop: 20}}>
              <InputBox label="Tên Player 1" val={p1Name} setVal={setP1Name} />
              <InputBox label="Tên Player 2" val={p2Name} setVal={setP2Name} />
            </div>
            <button onClick={updatePlayers} style={btnSaveStyle}>LƯU</button>
          </div>
        )}
        {activeTab === 'round' && (
             <div>
                <h1>🎯 Tùy chỉnh Vòng Đấu</h1>
                <div style={{display: 'flex', gap: 20, marginTop: 30}}>
                    <RoundBtn name="VÒNG 8" onClick={()=>setupRound('round_8')} />
                    <RoundBtn name="VÒNG 4" onClick={()=>setupRound('round_4')} />
                    <RoundBtn name="CHUNG KẾT" onClick={()=>setupRound('final')} color="#ff0055" />
                </div>
            </div>
        )}
        {activeTab === 'monitor' && (
             <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h1>📡 Realtime: <span style={{color: '#00e5ff'}}>{gameState.phase}</span></h1>
                    {currentRound && <button onClick={rerollCurrentRound} style={{padding: '10px', background: '#ff9800', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer'}}>🔄 REROLL</button>}
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginTop: 20}}>
                    {gameState.pool.map(song => (
                        <div key={song.id} style={{position: 'relative'}}>
                            <SmartImage song={song} style={{width: '100%', borderRadius: 5}} />
                            {gameState.banned_ids.includes(song.id) && <div style={badge('red')}>BANNED</div>}
                            {gameState.p1_pick?.id === song.id && <div style={badge('blue')}>P1</div>}
                            {gameState.p2_pick?.id === song.id && <div style={badge('blue')}>P2</div>}
                        </div>
                    ))}
                </div>
             </div>
        )}

        {/* --- TAB 4: EDITOR (ĐẦY ĐỦ FILTER) --- */}
        {activeTab === 'editor' && (
            <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                    <h1>✏️ Chỉnh sửa Pool</h1>
                    <button onClick={savePoolConfig} style={{padding: '10px 30px', background: '#00e5ff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: 5}}>💾 LƯU THAY ĐỔI</button>
                </div>

                <div style={{display: 'flex', gap: 10, marginBottom: 20}}>
                    {['round_8', 'round_4', 'final'].map(r => (
                        <button key={r} onClick={()=>setEditRound(r)} style={{padding: '10px 20px', background: editRound===r ? '#fff' : '#333', color: editRound===r ? '#000' : '#fff', border: '1px solid #555', cursor: 'pointer', fontWeight: 'bold'}}>{r.toUpperCase()}</button>
                    ))}
                </div>

                <div style={{display: 'flex', flex: 1, gap: 20, minHeight: 0}}>
                    {/* FILTER PANEL */}
                    <div style={{flex: 1, background: '#1a1a1a', padding: 15, borderRadius: 10, display: 'flex', flexDirection: 'column'}}>
                        <h3 style={{color: '#aaa', margin: '0 0 10px 0'}}>🔍 Bộ lọc ({filteredSongs.length})</h3>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10}}>
                            <input placeholder="Tìm tên..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{gridColumn: 'span 3', padding: 10, background: '#333', border: '1px solid #555', color: 'white'}} />
                            
                            <select onChange={e => setFilterLevel(e.target.value)} style={selectStyle}>
                                <option value="ALL">Level: Tất cả</option>
                                {uniqueLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                            </select>

                            <select onChange={e => setFilterGenre(e.target.value)} style={selectStyle}>
                                <option value="ALL">Thể loại: Tất cả</option>
                                {uniqueGenres.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>

                            <select onChange={e => setFilterVersion(e.target.value)} style={selectStyle}>
                                <option value="ALL">Phiên bản: Tất cả</option>
                                {uniqueVersions.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>

                            <select onChange={e => setFilterDiff(e.target.value)} style={selectStyle}>
                                <option value="ALL">Độ khó: Tất cả</option>
                                {uniqueDiffs.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            <select onChange={e => setFilterType(e.target.value)} style={selectStyle}>
                                <option value="ALL">Loại: Tất cả</option>
                                <option value="DX">DX</option>
                                <option value="STD">STD</option>
                            </select>
                        </div>

                        {/* LIST BÀI HÁT */}
                        <div style={{flex: 1, overflowY: 'auto', borderTop: '1px solid #333', paddingTop: 10}}>
                            {filteredSongs.slice(0, 100).map(song => {
                                const isAdded = poolConfig[editRound]?.includes(song.id);
                                return (
                                    <div key={song.id} style={{display: 'flex', alignItems: 'center', padding: 5, borderBottom: '1px solid #333', opacity: isAdded ? 0.5 : 1}}>
                                        <div style={{width: 50, height: 50, marginRight: 10}}><SmartImage song={song} style={{width: '100%', height: '100%'}}/></div>
                                        <div style={{flex: 1}}>
                                            <div style={{fontSize: 14, fontWeight: 'bold'}}>{song.display_title}</div>
                                            <div style={{fontSize: 11, color: '#aaa', marginTop: 2}}>
                                                <span style={{color: '#ffec3d', border: '1px solid #ffec3d', padding: '0 4px', borderRadius: 3, marginRight: 5}}>{song.level}</span>
                                                <span style={{marginRight: 5}}>{song.version || "Unknown"}</span>
                                                <span style={{color: '#888'}}>{song.difficulty}</span>
                                            </div>
                                        </div>
                                        {!isAdded && <button onClick={()=>addToPool(song.id)} style={{background: '#00e5ff', border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 3, fontWeight: 'bold'}}>➕</button>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* POOL ĐÃ CHỌN */}
                    <div style={{flex: 1, background: '#2c2c2c', padding: 15, borderRadius: 10, display: 'flex', flexDirection: 'column', border: '2px solid #00e5ff'}}>
                        <h3 style={{color: '#00e5ff', margin: '0 0 10px 0'}}>{editRound.toUpperCase()} ({poolConfig[editRound]?.length || 0})</h3>
                        <div style={{flex: 1, overflowY: 'auto'}}>
                            {poolConfig[editRound]?.map(id => {
                                const song = allSongs.find(s => s.id === id);
                                if (!song) return null;
                                return (
                                    <div key={id} style={{display: 'flex', alignItems: 'center', padding: 5, borderBottom: '1px solid #444', background: '#333', marginBottom: 5}}>
                                        <div style={{width: 40, height: 40, marginRight: 10}}><SmartImage song={song} style={{width: '100%', height: '100%'}}/></div>
                                        <div style={{flex: 1}}>
                                            <div style={{fontSize: 13, fontWeight: 'bold'}}>{song.display_title}</div>
                                            <div style={{fontSize: 10, color: '#aaa'}}>Lv.{song.level} | {song.version}</div>
                                        </div>
                                        <button onClick={()=>removeFromPool(id)} style={{background: '#ff4d4f', color: 'white', border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: 3}}>❌</button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// Styles
const selectStyle = { padding: 10, background: '#222', border: '1px solid #555', color: '#fff', cursor: 'pointer' };
const MenuBtn = ({label, active, onClick}) => (<div onClick={onClick} style={{padding: '15px', cursor: 'pointer', marginBottom: 5, borderRadius: 5, background: active ? '#00e5ff' : 'transparent', color: active ? '#000' : '#fff', fontWeight: active ? 'bold' : 'normal'}}>{label}</div>);
const InputBox = ({label, val, setVal}) => (<div style={{flex: 1}}><label style={{display: 'block', marginBottom: 8}}>{label}</label><input value={val} onChange={e=>setVal(e.target.value)} style={{width: '100%', padding: 12, background: '#333', border: 'none', color: 'white'}} /></div>);
const RoundBtn = ({name, onClick, color='#333'}) => (<button onClick={onClick} style={{padding: '30px', fontSize: 16, background: color, color: 'white', border: '1px solid #555', borderRadius: 8, cursor: 'pointer', flex: 1}}>{name}</button>);
const btnSaveStyle = { marginTop: 20, padding: '12px 25px', background: '#00e5ff', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer' };
const badge = (col) => ({position: 'absolute', top: 0, right: 0, background: col, color: 'white', padding: '2px 5px', fontSize: 10});

export default Dashboard;