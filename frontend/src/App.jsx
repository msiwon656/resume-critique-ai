import { useState } from 'react';

function App() {
  const [isLogin, setIsLogin] = useState(true); // true: 로그인 화면, false: 회원가입 화면
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState(null); // 로그인 성공 시 사용자 정보
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');

  const handleSignup = (e) => {
    e.preventDefault();
    setError('');

    fetch('http://localhost:3001/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status !== 201) {
          setError(data.error || '회원가입에 실패했습니다.');
          return;
        }
        alert('회원가입 성공! 로그인해주세요.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setName('');
      })
      .catch(() => setError('서버와 통신에 실패했습니다.'));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status !== 200) {
          setError(data.error || '로그인에 실패했습니다.');
          return;
        }
        setToken(data.token);
        setUser(data.user);
      })
      .catch(() => setError('서버와 통신에 실패했습니다.'));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  // 로그인 성공한 경우
  if (user) {
    return (
      <div style={{ maxWidth: '480px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
        <h1>이력서 첨삭 AI</h1>
        <p>{user.name}님 환영합니다! ({user.email})</p>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
          로그아웃
        </button>
        {/* 여기에 이후 이력서 관리 화면이 들어갈 예정 */}
      </div>
    );
  }

  // 로그인/회원가입 폼
  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>{isLogin ? '로그인' : '회원가입'}</h1>

      <form onSubmit={isLogin ? handleLogin : handleSignup}>
        {!isLogin && (
          <div style={{ marginBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        )}
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}

        <button type="submit" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}>
          {isLogin ? '로그인' : '회원가입'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isLogin ? '회원가입' : '로그인'}
        </button>
      </p>
    </div>
  );
}

export default App;