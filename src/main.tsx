import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App"; // 로그인 페이지
import MainPage from "./pages/MainPage";
import InterestPage from "./pages/InterestPage";
import AdminPage from "./pages/AdminPage";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 기본 로그인 페이지 */}
        <Route path="/" element={<App />} />

        {/* 로그인 후 접근 가능한 페이지들 */}
        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interest"
          element={
            <ProtectedRoute>
              <InterestPage />
            </ProtectedRoute>
          }
        />

        {/* 관리자 페이지 보호 */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
