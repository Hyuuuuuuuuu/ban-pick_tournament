import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [pass, setPass] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (pass === "admin123") { 
      navigate('/dashboard');
    } else {
      alert("Sai mật khẩu! (Gợi ý: admin123)");
    }
  };

  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'white'}}>
      <h1> ĐĂNG NHẬP HỆ THỐNG</h1>
      <input 
        type="password" placeholder="Nhập mật khẩu..." 
        value={pass} onChange={e => setPass(e.target.value)}
        style={{padding: 10, fontSize: 18, marginTop: 20, borderRadius: 5}}
      />
      <button onClick={handleLogin} style={{marginTop: 20, padding: '10px 30px', fontSize: 18, background: '#00e5ff', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>
        LOGIN
      </button>
      <p style={{marginTop: 50, color: '#666'}}>Dành cho khán giả: <a href="/screen" style={{color: '#00e5ff'}}>Mở Màn Hình Thi Đấu</a></p>
    </div>
  );
};
export default Login;