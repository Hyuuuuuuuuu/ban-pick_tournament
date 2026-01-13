import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Dùng biến môi trường Vite
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        onLoginSuccess();
      } else {
        setError(" " + data.message);
      }
    } catch (err) {
      setError(" Lỗi kết nối Server!");
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#111', color: 'white', fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: 350, padding: 40, background: '#1a1a1a', borderRadius: 10,
        boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)', border: '1px solid #333'
      }}>
        <h2 style={{color: '#00e5ff', textAlign: 'center', marginBottom: 30, letterSpacing: 2}}>ADMIN ACCESS</h2>
        
        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: 15}}>
          <div>
            <label style={{display: 'block', marginBottom: 5, color: '#aaa', fontSize: 12}}>USERNAME</label>
            <input 
              type="text" 
              value={username} onChange={e=>setUsername(e.target.value)}
              style={inputStyle}
            />
          </div>
          
          <div>
            <label style={{display: 'block', marginBottom: 5, color: '#aaa', fontSize: 12}}>PASSWORD</label>
            <input 
              type="password" 
              value={password} onChange={e=>setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && <div style={{color: '#ff4d4f', fontSize: 13, textAlign: 'center'}}>{error}</div>}

          <button type="submit" style={btnStyle}>ĐĂNG NHẬP</button>
        </form>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '12px', background: '#222', 
  border: '1px solid #444', color: 'white', borderRadius: 5, outline: 'none',
  boxSizing: 'border-box'
};

const btnStyle = {
  padding: '12px', background: '#00e5ff', color: '#000', fontWeight: 'bold',
  border: 'none', borderRadius: 5, cursor: 'pointer', marginTop: 10,
  transition: '0.2s'
};

export default Login;