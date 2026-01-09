import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projector from './pages/Projector';

function App() {
  return (
    <Router>
      <Routes>
        {/* Vào localhost:3000 mặc định ra trang Login */}
        <Route path="/" element={<Login />} />
        
        {/* Trang Admin quản lý */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Trang hiển thị lên Tivi (Mở tab riêng) */}
        <Route path="/screen" element={<Projector />} />
      </Routes>
    </Router>
  );
}

export default App;