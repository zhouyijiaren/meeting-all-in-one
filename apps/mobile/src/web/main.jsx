/**
 * Vite Web 入口：React Router + 与现有 app 页面共用组件，实现 vendor 拆包。
 * 最外层用纯 div，避免 RNW/SafeAreaProvider 根节点在部分环境下不占高导致只看到背景。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { setRouterNavigate } from './routerCompat';

import HomeScreen from '../../app/index.js';
import RoomScreen from '../../app/room/[id].js';
import ShortJoinScreen from '../../app/r/[shortCode].js';

function NavigateRef() {
  const navigate = useNavigate();
  React.useEffect(() => {
    setRouterNavigate(navigate);
  }, [navigate]);
  return null;
}

const rootContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  width: '100%',
  boxSizing: 'border-box',
};
const contentAreaStyle = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
};
// 包一层纯 div，保证有高度且为 flex 容器，RNW 的 View(flex:1) 才能撑满
const routesWrapStyle = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' };

function App() {
  return (
    <>
      <NavigateRef />
      <div style={routesWrapStyle}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/room/:id" element={<RoomScreen />} />
          <Route path="/r/:shortCode" element={<ShortJoinScreen />} />
          <Route path="*" element={<HomeScreen />} />
        </Routes>
      </div>
    </>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <div style={rootContainerStyle}>
        <div style={contentAreaStyle}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </div>
      </div>
    </React.StrictMode>
  );
}
