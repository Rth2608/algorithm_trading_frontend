import React from 'react';

function App() {
  const SERVICE_NAME = import.meta.env.VITE_SERVICE_NAME;
  const GOOGLE_CLIENT_ID =
    '674131826959-3bo3bg1mh8rfnibqfokdd7l6q1n015pj.apps.googleusercontent.com';

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const redirect_uri = `${API_BASE_URL}/auth/google/callback`;

  const handleLogin = () => {
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    );
    const response_type = 'code';

    const auth_url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirect_uri}&response_type=${response_type}&scope=${scope}`;
    window.location.href = auth_url;
  };

  return (
    <div className="flex flex-col justify-between items-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white">
      <header className="w-full py-5 px-6 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          {SERVICE_NAME}
        </h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            {SERVICE_NAME}
          </h2>
          <p className="mt-2 text-gray-300">시스템 알고리즘 트레이딩 서비스</p>
        </div>

        <div className="w-full bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-700">
          <h3 className="text-3xl font-bold mb-8 text-center">로그인</h3>

          <button
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 rounded-lg py-3 px-4 font-medium hover:bg-gray-100 transition-colors"
            onClick={handleLogin}
          >
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span className="text-sm">Google로 로그인</span>
          </button>
        </div>
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} {SERVICE_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
