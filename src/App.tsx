import React from "react";
import { Routes, Route } from "react-router-dom";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const handleGoogleLogin = () => {
  const redirect_uri = `${BACKEND_BASE_URL}/auth/google/callback`;
  const scope = encodeURIComponent(
    "openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
  );
  const response_type = "code";

  const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirect_uri}&response_type=${response_type}&scope=${scope}&access_type=offline&prompt=consent`;

  console.log("Redirecting to:", googleAuthURL);
  window.location.href = googleAuthURL;
};

function LoginPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>Google 로그인 테스트 페이지</h1>
      <button
        onClick={handleGoogleLogin}
        style={{
          backgroundColor: "#4285F4",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "5px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Google 로그인
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
    </Routes>
  );
}
