import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { usePostHog } from 'posthog-js/react'; 

function Auth({ setToken, parseJwt }) {
  const [showPassword, setShowPassword] = useState(false); 
  const [view, setView] = useState('login'); 
  const [authData, setAuthData] = useState({ 
    username: '', email: '', password: '', resetToken: '', newPassword: '', city: 'Lusaka'
  });
  
  const posthog = usePostHog();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const loader = toast.loading('Processing...');
    try {
      if (view === 'login') {
        const res = await axios.post(`${API_URL}/api/auth/login`, { username: authData.username, password: authData.password });
        const receivedToken = res.data.token;
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        
        const decodedUser = parseJwt(receivedToken);
        if (decodedUser?.id) {
          posthog.identify(decodedUser.id, { username: decodedUser.username, email: decodedUser.email });
          posthog.capture('user_login');
        }
        toast.success('Welcome back!');
      } else if (view === 'register') {
        await axios.post(`${API_URL}/api/auth/register`, { 
          username: authData.username, email: authData.email, password: authData.password, city: authData.city
        });
        toast.success('Account created! Please login.');
        setView('login');
      } else if (view === 'forgot') {
        await axios.post(`${API_URL}/api/auth/forgot-password`, { email: authData.email });
        toast.success('Token sent to email!');
        setView('reset');
      } else if (view === 'reset') {
        await axios.post(`${API_URL}/api/auth/reset-password`, { token: authData.resetToken, newPassword: authData.newPassword });
        toast.success('Password changed! Please login.');
        setView('login');
      }
      toast.dismiss(loader);
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="auth-container" style={{ position: 'relative', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="auth-box">
        <h1>CityWatch 🇿🇲</h1>
        <p className="subtitle">
          {view === 'login' && 'Login to your account'}
          {view === 'register' && 'Create a new account'}
          {view === 'forgot' && 'Recover your account'}
          {view === 'reset' && 'Set a new password'}
        </p>
        <form onSubmit={handleAuthSubmit}>
          {(view === 'login' || view === 'register') && (
            <input type="text" placeholder="Username" required value={authData.username} onChange={(e) => setAuthData({...authData, username: e.target.value})} />
          )}
          {(view === 'register' || view === 'forgot') && (
            <input type="email" placeholder="Email Address" required value={authData.email} onChange={(e) => setAuthData({...authData, email: e.target.value})} />
          )}
          {view === 'register' && (
            <select value={authData.city} onChange={(e) => setAuthData({...authData, city: e.target.value})} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '16px' }}>
              <option value="Lusaka">Lusaka</option>
              <option value="Ndola">Ndola</option>
              <option value="Kitwe">Kitwe</option>
              <option value="Livingstone">Livingstone</option>
              <option value="Kabwe">Kabwe</option>
              <option value="Chingola">Chingola</option>
            </select>
          )}
          {(view === 'login' || view === 'register') && (
            <div className="password-wrapper">
              <input type={showPassword ? "text" : "password"} placeholder="Password" required value={authData.password} onChange={(e) => setAuthData({...authData, password: e.target.value})} />
              <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          )}
          {view === 'reset' && (
            <>
              <input type="text" placeholder="Paste Token from Email" required value={authData.resetToken} onChange={(e) => setAuthData({...authData, resetToken: e.target.value})} />
              <div className="password-wrapper">
                <input type={showPassword ? "text" : "password"} placeholder="New Password" required value={authData.newPassword} onChange={(e) => setAuthData({...authData, newPassword: e.target.value})} />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </>
          )}
          <button type="submit" style={{ marginTop: '10px' }}>
            {view === 'login' ? 'Login' : view === 'register' ? 'Sign Up' : view === 'forgot' ? 'Send Recovery Email' : 'Reset Password'}
          </button>
          {view === 'login' && (
            <button type="button" className="google-btn" onClick={() => window.location.href = `${API_URL}/api/auth/google`} style={{ margin: '15px auto', width: '100%', maxWidth: '250px' }}>
              <img src="https://img.icons8.com/color/16/000000/google-logo.png" alt="G" /> Sign in with Google
            </button>
          )}
        </form>
        <div style={{ marginTop: '20px', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '15px', color: '#666' }}>
          {view === 'login' && (
            <>
              <span className="toggle-link" onClick={() => setView('register')}>Create account</span>
              <span>|</span>
              <span className="toggle-link" onClick={() => setView('forgot')}>Forgot Password?</span>
            </>
          )}
          {view !== 'login' && (
            <span className="toggle-link" onClick={() => setView('login')}>Back to Login</span>
          )}
        </div>
      </div>
      <footer style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>© 2026 CityWatch 🇿🇲 • Built by <strong>Chiza Labs</strong></p>
      </footer>
    </div>
  );
}

export default Auth;