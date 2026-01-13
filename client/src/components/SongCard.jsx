// client/src/components/SongCard.js
import React from 'react';

const SongCard = ({ player, song, status }) => {
  // Màu sắc đại diện cho từng slot
  const borderColor = player === 'PLAYER 1' ? '#ff4d4f' : (player === 'PLAYER 2' ? '#1890ff' : '#faad14');

  return (
    <div style={{
      border: `4px solid ${borderColor}`,
      borderRadius: '15px',
      padding: '20px',
      width: '300px',
      textAlign: 'center',
      backgroundColor: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    }}>
      <h2 style={{ color: borderColor, marginBottom: '10px' }}>{player}</h2>

      {song ? (
        // TRƯỜNG HỢP: ĐÃ CHỌN BÀI
        <div>
          <img 
            src={`https://maimai.sega.jp/storage/maimai/jacket/${song.image_hash}`} 
            alt={song.title}
            style={{ width: '100%', borderRadius: '10px', marginBottom: '15px' }}
          />
          <h3 style={{ fontSize: '18px', margin: '0 0 5px 0' }}>{song.display_title}</h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            <span style={{ 
              background: '#333', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' 
            }}>
              {song.difficulty}
            </span>
            <span style={{ 
              background: '#e6f7ff', color: '#1890ff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' 
            }}>
              Lv: {song.level}
            </span>
          </div>
        </div>
      ) : (
        // TRƯỜNG HỢP: CHƯA CHỌN (ĐANG CHỜ)
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#ccc' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
          <p>{status === 'WAITING' || status === 'PICKING' ? 'Đang chọn...' : 'Chờ lượt...'}</p>
        </div>
      )}
    </div>
  );
};

export default SongCard;