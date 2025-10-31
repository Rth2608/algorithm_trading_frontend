import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const useQuery = () => new URLSearchParams(useLocation().search);

function MainPage() {
  const query = useQuery();
  const token = query.get("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      localStorage.setItem("jwt_token", token);
      window.history.replaceState({}, document.title, "/main");
    }
  }, [token]);

  const storedToken = localStorage.getItem("jwt_token");

  const handleAdminNavigate = () => {
    navigate("/admin");
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold text-green-400">
        로그인 성공 (기존 유저)
      </h1>
      <p className="mt-4">메인 페이지로 리디렉션</p>

      {storedToken ? (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg w-full max-w-lg">
          <p className="text-lg font-semibold">발급된 JWT 토큰:</p>
          <pre className="text-xs text-gray-300 break-words whitespace-pre-wrap mt-2">
            {storedToken}
          </pre>

          <button
            onClick={handleAdminNavigate}
            className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            DB 관리자 페이지로 이동
          </button>
        </div>
      ) : (
        <p className="text-red-400">토큰을 찾을 수 없습니다.</p>
      )}
    </div>
  );
}

export default MainPage;
