import React, { ReactElement, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  exp: number;
}

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    let token = localStorage.getItem("jwt_token");

    // URL 파라미터에서도 token 탐색
    const params = new URLSearchParams(location.search);
    const tokenFromURL = params.get("token");

    if (tokenFromURL && !token) {
      localStorage.setItem("jwt_token", tokenFromURL);
      token = tokenFromURL;
      // 주소창 정리 (token 쿼리 제거)
      window.history.replaceState({}, document.title, location.pathname);
    }

    if (!token) {
      setChecked(true);
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Date.now() / 1000;
      if (decoded.exp > now) {
        setIsValid(true);
      } else {
        localStorage.removeItem("jwt_token");
      }
    } catch {
      localStorage.removeItem("jwt_token");
    }

    setChecked(true);
  }, [location]);

  // 아직 토큰 검사 중이면 렌더링 지연
  if (!checked) return null;

  // 유효하지 않은 토큰은 로그인 페이지로
  if (!isValid) return <Navigate to="/" replace />;

  // 유효한 경우에만 children 렌더링
  return children;
};

export default ProtectedRoute;
