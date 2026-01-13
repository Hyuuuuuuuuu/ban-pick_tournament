import React from 'react';

const Admin = () => {
  const setupRound = async (roundName) => {
    try {
      const res = await fetch(`http://localhost:3001/api/setup/${roundName}`);
      const text = await res.text();
      alert(text);
    } catch (err) {
      alert("Lỗi: Không kết nối được với Server (Port 3001)!");
    }
  };

  const btnStyle = {
    padding: '20px 40px', fontSize: '20px', margin: '10px',
    cursor: 'pointer', backgroundColor: '#333', color: '#fff',
    border: '2px solid #00e5ff', borderRadius: '10px', fontWeight: 'bold'
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', backgroundColor: '#111', color: 'white'
    }}>
      <h1 style={{color: '#00e5ff', marginBottom: 50}}>🎛️ ADMIN CONTROL PANEL</h1>
      <div style={{display: 'flex', gap: 20}}>
        <button style={btnStyle} onClick={() => setupRound('round_8')}>VÒNG 8 (Tứ Kết)</button>
        <button style={btnStyle} onClick={() => setupRound('round_4')}>VÒNG 4 (Bán Kết)</button>
        <button style={{...btnStyle, borderColor: '#ff0055', color: '#ff0055'}} onClick={() => setupRound('final')}>CHUNG KẾT</button>
      </div>
    </div>
  );
};

export default Admin;