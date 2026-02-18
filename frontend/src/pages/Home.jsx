import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { profileService, authService } from '../services/api';
import './Home.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [logoutAnimating, setLogoutAnimating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      setIsLoggedIn(true);
      const fetchProfile = async () => {
        try {
          const profile = await profileService.getProfile();
          setUser(profile);
        } catch (err) {
          console.error('Error loading profile');
          setIsLoggedIn(false);
          localStorage.removeItem('token');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, []);

  const handleProfileClick = () => {
    if (isLoggedIn) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    setLogoutAnimating(true);
    setTimeout(async () => {
      try {
        await authService.logout();
        setIsLoggedIn(false);
        setUser(null);
        navigate('/home');
      } catch (err) {
        console.error('Error during logout');
        setLogoutAnimating(false);
      }
    }, 600);
  };

  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Extranet</h1>
        </div>
        
        <div className="navbar-end">
          {isLoggedIn ? (
            <div className="profile-menu">
              <button className="profile-button" onClick={handleProfileClick}>
                {user && user.avatar && (
                  <img src={user.avatar} alt="Avatar" className="profile-avatar" />
                )}
                <span className="profile-name">{user?.name || user?.username || 'User'}</span>
              </button>
              <button onClick={handleLogout} className={`btn-logout ${logoutAnimating ? 'logout-active' : ''}`} title="Logout">
                <img src="/src/assets/logout.svg" alt="Logout" />
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">Sign In</Link>
              <Link to="/signup" className="btn-signup">Sign Up</Link>
            </div>
          )}
        </div>
      </nav>

      <div className="home-content">
        {loading ? (
          <p className="loading">Loading...</p>
        ) : isLoggedIn && user ? (
          <div className="welcome-card">
            <h2>Welcome, {user.name || user.username}!</h2>

            <Link to="/profile" className="btn-primary">Edit My Profile</Link>
          </div>
        ) : (
          <div className="welcome-card">
            <h2>Welcome to Extranet</h2>
            <p className="welcome-text">Sign in to access your profile and manage your account.</p>
            <div className="welcome-buttons">
              <Link to="/login" className="btn-primary">Sign In</Link>
              <Link to="/signup" className="btn-secondary">Sign Up</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
