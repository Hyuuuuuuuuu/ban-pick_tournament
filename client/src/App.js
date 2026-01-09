import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Projector from './pages/Projector';
import Login from './pages/Login';
import './App.css';

// Component Bảo vệ (Chặn cửa)
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('isAdminLoggedIn') === 'true';
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Màn hình Tivi thì KHÔNG CẦN đăng nhập */}
        <Route path="/screen" element={<Projector />} />

        {/* Trang Login */}
        <Route path="/login" element={
          <Login onLoginSuccess={() => {
            localStorage.setItem('isAdminLoggedIn', 'true');
            window.location.href = "/dashboard";
          }} />
        } />

        {/* Trang Dashboard (CẦN Đăng nhập) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Mặc định vào Dashboard (sẽ bị chặn nếu chưa login) */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;