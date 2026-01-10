import React, { useState, useEffect, useMemo } from 'react';
import SmartImage from '../components/SmartImage';

const PoolManager = ({ allSongs }) => {
  const [poolConfig, setPoolConfig] = useState({ round_8: [], round_4: [], final: [] });
  const [editRound, setEditRound] = useState('round_8');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 48; 

  const [searchText, setSearchText] = useState(""); 
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [filterGenre, setFilterGenre] = useState("ALL");
  const [filterVersion, setFilterVersion] = useState("ALL");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const [editingSong, setEditingSong] = useState(null); 
  const [editForm, setEditForm] = useState({});
  const SERVER_URL = "http://localhost:3001"
  useEffect(() => {
    fetch('http://localhost:3001/api/pools').then(res => res.json()).then(data => { if(data) setPoolConfig(data); });
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchText, filterLevel, filterGenre, filterVersion, filterDiff, filterType]);

  const savePoolConfig = async () => { await fetch('http://localhost:3001/api/save-pools', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(poolConfig) }); alert("Đã lưu Pool!"); };
  const addToPool = (id) => { if (!poolConfig[editRound].includes(id)) setPoolConfig({ ...poolConfig, [editRound]: [...poolConfig[editRound], id] }); };
  const removeFromPool = (id) => { setPoolConfig({ ...poolConfig, [editRound]: poolConfig[editRound].filter(x => x !== id) }); };
  
  const openEditModal = (e, song) => { e.stopPropagation(); setEditingSong(song); setEditForm({ ...song }); };
  const handleUpdateSong = async () => {
      const res = await fetch('http://localhost:3001/api/songs/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (data.success) { alert(`Đã cập nhật: ${editForm.title}`); setEditingSong(null); window.location.reload(); } else { alert("Lỗi: " + data.message); }
  };

  const getDiffTextColor = (diff) => {
      if (!diff) return '#fff';
      const d = diff.toLowerCase();
      if (d.includes('re:mas') || d.includes('remas')) return '#e082ff'; 
      if (d.includes('expert') || d.includes('exp')) return '#ff4d4f';   
      if (d.includes('master') || d.includes('mas')) return '#a64dff';   
      if (d.includes('advanced') || d.includes('adv')) return '#fb9c2d'; 
      if (d.includes('basic') || d.includes('bas')) return '#22bb5b';    
      return '#fff'; 
  };

  const getTypeLogo = (type) => {
      const imgPath = type === 'DX' ? `${SERVER_URL}/assets/music_dx.png` : `${SERVER_URL}/assets/music_standard.png`;
      return <img src={imgPath} alt={type} style={{position: 'absolute', top: 0, left: 0, width: 35, zIndex: 2, filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))'}} />;
  };

  const uniqueLevels = useMemo(() => [...new Set(allSongs.map(s => s.level))].sort((a, b) => parseFloat(a.replace('+', '.5')) - parseFloat(b.replace('+', '.5'))), [allSongs]);
  const uniqueGenres = useMemo(() => [...new Set(allSongs.map(s => s.genre))].sort(), [allSongs]);
  const uniqueVersions = useMemo(() => [...new Set(allSongs.map(s => s.version))].filter(Boolean).sort(), [allSongs]);
  const uniqueDiffs = useMemo(() => [...new Set(allSongs.map(s => s.difficulty))].sort(), [allSongs]);

  const filteredSongs = allSongs.filter(song => {
      const matchText = song.title.toLowerCase().includes(searchText.toLowerCase());
      const matchLevel = filterLevel === "ALL" || song.level === filterLevel;
      const matchGenre = filterGenre === "ALL" || song.genre === filterGenre;
      const matchVersion = filterVersion === "ALL" || song.version === filterVersion;
      const matchDiff = filterDiff === "ALL" || song.difficulty === filterDiff;
      const matchType = filterType === "ALL" || song.type === filterType;
      return matchText && matchLevel && matchGenre && matchVersion && matchDiff && matchType;
  });

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const currentSongs = filteredSongs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const renderPageNumbers = () => { const pageNumbers = []; const maxButtons = 5; let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2)); let endPage = Math.min(totalPages, startPage + maxButtons - 1); if (endPage - startPage + 1 < maxButtons) startPage = Math.max(1, endPage - maxButtons + 1); for (let i = startPage; i <= endPage; i++) pageNumbers.push(i); return pageNumbers; };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', position: 'relative'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
            <div style={{display: 'flex', gap: 10}}>
                {['round_8', 'round_4', 'final'].map(r => (<button key={r} onClick={()=>setEditRound(r)} style={{padding: '10px 20px', background: editRound===r ? '#00e5ff' : '#333', color: editRound===r ? '#000' : '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold'}}>{r.toUpperCase()}</button>))}
            </div>
            <button onClick={savePoolConfig} style={{padding: '10px 30px', background: '#22bb5b', border: 'none', borderRadius: 5, color: 'white', fontWeight: 'bold', cursor: 'pointer'}}>LƯU THAY ĐỔI</button>
        </div>

        <div style={{display: 'flex', flex: 1, gap: 20, minHeight: 0}}>
            <div style={{flex: 7, ...cardStyle, display: 'flex', flexDirection: 'column'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
                    <h3 style={{margin:0, color:'#aaa'}}>Tìm kiếm ({filteredSongs.length})</h3>
                    <div style={{fontSize: 12, color: '#666'}}>Trang {currentPage} / {totalPages || 1}</div>
                </div>
                <div style={{display:'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 10}}>
                    <input placeholder="Tên bài..." value={searchText} onChange={e=>setSearchText(e.target.value)} style={{...inputStyle, gridColumn: 'span 2'}} />
                    <select onChange={e=>setFilterType(e.target.value)} style={selectStyle}><option value="ALL">Loại: Tất cả</option><option value="DX">DX</option><option value="STD">Standard</option></select>
                    <select onChange={e=>setFilterLevel(e.target.value)} style={selectStyle}><option value="ALL">Level: Tất cả</option>{uniqueLevels.map(l=><option key={l} value={l}>{l}</option>)}</select>
                    <select onChange={e=>setFilterDiff(e.target.value)} style={selectStyle}><option value="ALL">Diff: Tất cả</option>{uniqueDiffs.map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <select onChange={e=>setFilterVersion(e.target.value)} style={selectStyle}><option value="ALL">Ver: Tất cả</option>{uniqueVersions.map(v=><option key={v} value={v}>{v}</option>)}</select>
                </div>
                
                <div style={{flex: 1, overflowY: 'auto', paddingRight: 5}}>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10}}>
                        {currentSongs.map(song => {
                            const isAdded = poolConfig[editRound]?.includes(song.id);
                            const textColor = getDiffTextColor(song.difficulty);
                            const diffName = song.difficulty ? song.difficulty.toUpperCase() : "";
                            return (
                                <div key={song.id} onClick={() => !isAdded && addToPool(song.id)} style={{position: 'relative', cursor: isAdded ? 'default' : 'pointer', opacity: isAdded ? 0.4 : 1, border: isAdded ? '1px solid #555' : '1px solid #333', background: '#222', borderRadius: 6, overflow: 'hidden', transition: '0.2s'}}>
                                    {getTypeLogo(song.type)}
                                    <SmartImage song={song} style={{width:'100%', aspectRatio: '1/1', objectFit:'cover', display:'block'}} />
                                    {/* CẬP NHẬT MÀU */}
                                    <div style={{padding: '5px', fontSize: 11, fontWeight: 'bold', textAlign: 'center', color: textColor, background: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                        {diffName} {song.level}
                                    </div>
                                    <div style={{position:'absolute', bottom: 25, width:'100%', textAlign:'center', color:'#fff', textShadow:'0 0 4px #000', fontSize:10, fontWeight:'bold'}}>
                                        {song.title}
                                    </div>
                                    <div onClick={(e)=>openEditModal(e, song)} style={{position: 'absolute', top: 2, right: 2, background: '#444', color: 'white', fontSize: 9, padding: '2px 5px', borderRadius: 3, cursor: 'pointer', border: '1px solid #666', zIndex: 10}}>SỬA</div>
                                    {!isAdded && <div className="hover-add" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'0.2s'}}><span style={{color: '#00e5ff', fontWeight: 'bold', border: '1px solid #00e5ff', padding: '5px 10px', borderRadius: 4}}>THÊM</span></div>}
                                    {isAdded && <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)'}}><span style={{color: '#aaa', fontWeight:'bold', fontSize: 10}}>ĐÃ CHỌN</span></div>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {totalPages > 1 && (<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 15, paddingTop: 10, borderTop: '1px solid #333'}}><button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={paginationBtn}>{'<<'}</button><button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={paginationBtn}>{'<'}</button>{renderPageNumbers().map(num => (<button key={num} onClick={() => setCurrentPage(num)} style={{...paginationBtn, background: currentPage === num ? '#00e5ff' : '#333', color: currentPage === num ? '#000' : '#fff', borderColor: currentPage === num ? '#00e5ff' : '#444'}}>{num}</button>))}<button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={paginationBtn}>{'>'}</button><button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={paginationBtn}>{'>>'}</button></div>)}
            </div>

            <div style={{flex: 3, ...cardStyle, border: '1px solid #00e5ff', display: 'flex', flexDirection: 'column'}}>
                    <h3 style={{marginTop:0, marginBottom: 10, color:'#00e5ff'}}>{editRound.toUpperCase()} ({poolConfig[editRound]?.length || 0})</h3>
                    <div style={{flex:1, overflowY:'auto', paddingRight: 5}}>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10}}>
                            {poolConfig[editRound]?.map(id => {
                                const s = allSongs.find(x => x.id === id); if(!s) return null;
                                const textColor = getDiffTextColor(s.difficulty);
                                const diffName = s.difficulty ? s.difficulty.toUpperCase() : "";
                                return (
                                    <div key={id} onClick={()=>removeFromPool(id)} style={{position:'relative', cursor:'pointer', border:'1px solid #ff4d4f', borderRadius: 4, overflow:'hidden', background: '#222'}}>
                                        {getTypeLogo(s.type)}
                                        <SmartImage song={s} style={{width:'100%', aspectRatio: '1/1', objectFit:'cover', display:'block'}} />
                                        {/* CẬP NHẬT MÀU */}
                                        <div style={{fontSize: 11, fontWeight: 'bold', textAlign: 'center', padding: 5, color: textColor, background: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{diffName} {s.level}</div>
                                        <div style={{position:'absolute', bottom: 25, width:'100%', textAlign:'center', color:'#fff', textShadow:'0 0 4px #000', fontSize:10, fontWeight:'bold'}}>
                                            {s.title}
                                        </div>
                                        <div className="hover-del" style={{position:'absolute', inset:0, background:'rgba(255,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'0.2s'}}><span style={{color: 'white', fontWeight: 'bold', fontSize: 10}}>XÓA</span></div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
            </div>
        </div>

        {editingSong && (<div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{background: '#222', padding: 30, borderRadius: 10, width: 400, border: '1px solid #555', boxShadow: '0 0 20px rgba(0,0,0,0.8)'}}><h2 style={{color: '#00e5ff', marginTop: 0}}>SỬA THÔNG TIN BÀI HÁT</h2><div style={{display: 'flex', flexDirection: 'column', gap: 15}}><div><label style={{color: '#aaa', fontSize: 12}}>Tên bài hát</label><input value={editForm.title || ""} onChange={e=>setEditForm({...editForm, title: e.target.value})} style={modalInput} /></div><div style={{display: 'flex', gap: 10}}><div style={{flex: 1}}><label style={{color: '#aaa', fontSize: 12}}>Level</label><input value={editForm.level || ""} onChange={e=>setEditForm({...editForm, level: e.target.value})} style={modalInput} /></div><div style={{flex: 1}}><label style={{color: '#aaa', fontSize: 12}}>Type</label><select value={editForm.type || "DX"} onChange={e=>setEditForm({...editForm, type: e.target.value})} style={modalInput}><option value="DX">DX</option><option value="STD">STD</option></select></div></div><div><label style={{color: '#aaa', fontSize: 12}}>Difficulty</label><select value={editForm.difficulty || "master"} onChange={e=>setEditForm({...editForm, difficulty: e.target.value})} style={modalInput}><option value="basic">BASIC</option><option value="advanced">ADVANCED</option><option value="expert">EXPERT</option><option value="master">MASTER</option><option value="remas">Re:MASTER</option></select></div><div><label style={{color: '#aaa', fontSize: 12}}>Version</label><input value={editForm.version || ""} onChange={e=>setEditForm({...editForm, version: e.target.value})} style={modalInput} /></div></div><div style={{marginTop: 30, display: 'flex', gap: 10, justifyContent: 'flex-end'}}><button onClick={()=>setEditingSong(null)} style={{padding: '10px 20px', background: '#444', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}>HỦY</button><button onClick={handleUpdateSong} style={{padding: '10px 20px', background: '#00e5ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: 5, cursor: 'pointer'}}>LƯU LẠI</button></div></div></div>)}
        <style>{`.hover-add:hover { opacity: 1 !important; } .hover-del:hover { opacity: 1 !important; }`}</style>
    </div>
  );
};

const cardStyle = { background: '#252525', padding: 15, borderRadius: 8 };
const inputStyle = { padding: 8, background: '#333', border: '1px solid #555', color: 'white', borderRadius: 4 };
const selectStyle = { padding: 8, background: '#333', color: 'white', border: '1px solid #555', borderRadius: 4, cursor: 'pointer' };
const paginationBtn = { padding: '5px 10px', background: '#333', border: '1px solid #444', color: 'white', borderRadius: 3, cursor: 'pointer', minWidth: 30, fontSize: 12 };
const modalInput = { width: '100%', padding: 10, background: '#111', border: '1px solid #444', color: 'white', borderRadius: 4, marginTop: 5, boxSizing: 'border-box' };

export default PoolManager;