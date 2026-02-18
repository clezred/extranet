import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import './Auth.css';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const navigate = useNavigate();

  // Check username availability in real-time
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-z._0-9]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(null);
      setUsernameError('Invalid format');
      return;
    }

    setUsernameError('');

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await authService.checkUsernameAvailability(username);
        setUsernameAvailable(response.available);
      } catch (err) {
        setError('Error checking username availability');
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate username format
    const usernameRegex = /^[a-z._]+$/;
    if (!usernameRegex.test(username)) {
      setError('Username can only contain lowercase letters, numbers, dots (.) and underscores (_)');
      return;
    }

    if (username.length > 32) {
      setError('Username must not exceed 32 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!usernameAvailable) {
      setError('This username is not available');
      return;
    }

    setLoading(true);

    try {
      await authService.register(username, password, name, surname, email);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Sign Up</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="username-input-group">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Lowercase letters, . and _ only"
                required
                minLength="3"
                maxLength="32"
                pattern="[a-z._]+"
                title="Only lowercase letters, numbers, dots (.) and underscores (_) are allowed"
              />
              {checkingUsername && <span className="checking">Checking...</span>}
              {usernameError && <span className="unavailable">✗ {usernameError}</span>}
              {!usernameError && usernameAvailable === true && <span className="available">✓ Available</span>}
              {!usernameError && usernameAvailable === false && <span className="unavailable">✗ Taken</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="surname">First Name</label>
            <input
              id="surname"
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="Your first name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Last Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your last name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !usernameAvailable} 
            className="btn-submit"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
