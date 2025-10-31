import React from "react";
import { useLocation } from "react-router-dom";

const useQuery = () => new URLSearchParams(useLocation().search);

function InterestPage() {
  const query = useQuery();
  const token = query.get("token");

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold text-cyan-400">
        로그인 성공 (신규 유저)
      </h1>
      <p className="mt-4">회원가입 페이지로 리디렉션되었습니다.</p>

      {token ? (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg w-full max-w-lg">
          <p className="text-lg font-semibold">발급된 JWT 토큰:</p>
          <pre className="text-xs text-gray-300 break-words whitespace-pre-wrap mt-2">
            {token}
          </pre>
          <p className="mt-4 text-sm text-yellow-300">
            (신규 회원 로그인 시 이용약관 동의 / 사용자 정보 입력창으로 리디렉션 후 회원가입 완료 시 db에 저장하도록 수정해야함)
          </p>
        </div>
      ) : (
        <p className="text-red-400">토큰을 찾을 수 없습니다.</p>
      )}
    </div>
  );
}

export default InterestPage;
