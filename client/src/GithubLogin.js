import React from 'react';

const Login = () => {
  const handleLogin = () => {
    // Direct the user to the GitHub login route defined in the backend
    window.location.href = 'http://localhost:8080/auth/github';
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '20%' }}>
      <h1>Welcome to Chess Game</h1>
      <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
        Login with GitHub
      </button>
    </div>
  );
}

export default Login;
