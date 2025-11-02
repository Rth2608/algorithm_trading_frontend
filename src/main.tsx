import React from "react";
import ReactDOM from "react-dom/client";
// BrowserRouter, Routes, Route 임포트 
import { BrowserRouter, Routes, Route } from "react-router-dom";


import App from "./App"; //login 페이지
import MainPage from "./pages/MainPage";
import InterestPage from "./pages/InterestPage";
import AdminPage from "./pages/AdminPage";
import SignupPage from "./pages/SignupPage"; //signup 페이지
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        {/* 💡 BrowserRouter: 최상위에서 한 번만 사용합니다. */}
        <BrowserRouter>
            <Routes>
                {/* 기본 로그인 페이지 */}
                <Route path="/" element={<App />} />

                {/* 회원가입 페이지 (새로 추가) */}
                <Route path="/signup" element={<SignupPage />} />

                {/* 로그인 후 접근 가능한 페이지들 (ProtectedRoute로 보호) */}
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

                {/* 404 Not Found 핸들링 (선택 사항) */}
                <Route path="*" element={<div className="text-white text-3xl p-8 bg-slate-900 min-h-screen">404 Not Found</div>} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
