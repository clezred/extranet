import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { profileService, ASSET_BASE_URL } from '../services/api';
import './Profile.css';

export default function Profile() {
  const defaultAvatarUrl = `${ASSET_BASE_URL}/uploads/avatars/default.png`;
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastFading, setToastFading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => {
      setToastFading(true);
      setTimeout(() => {
        setShowToast(false);
        setToastFading(false);
      }, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileService.getProfile();
        setProfile(data);
        setName(data.name || data.nom || '');
        setSurname(data.surname || data.prenom || '');
        setEmail(data.email || '');
        setAvatarPreview(data.avatar);
        setRemoveAvatar(false);
      } catch (err) {
        setError('Error loading profile');
        if (err.message === 'Authentication required') {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setRemoveAvatar(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarPreview(defaultAvatarUrl);
    setRemoveAvatar(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await profileService.updateProfile(
        profile.id,
        name,
        surname,
        email,
        avatar,
        removeAvatar
      );
      setToastMessage('Profile updated successfully');
      setShowToast(true);
      setAvatar(null);
      setRemoveAvatar(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseToast = () => {
    setToastFading(true);
    setTimeout(() => {
      setShowToast(false);
      setToastFading(false);
    }, 300);
  };

  if (loading) {
    return <div className="profile-container"><p>Loading...</p></div>;
  }

  return (
    <div className="profile-container">
      <nav className="navbar">
        <Link to="/home" className="btn-back">← Back</Link>
        <h1>Edit Profile</h1>
      </nav>

      <div className="profile-content">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-sections">
            <div className="form-section">
              <h2>Profile Picture</h2>
              <div className="avatar-section">
                {avatarPreview && (
                  <img src={avatarPreview} alt="Avatar Preview" className="avatar-preview" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="file-input"
                  id="avatar-input"
                />
                <div className="avatar-actions">
                  <label htmlFor="avatar-input" className="btn-secondary">
                    Change Picture
                  </label>
                  {avatarPreview && (
                    <button type="button" className="btn-secondary" onClick={handleRemoveAvatar}>
                      Remove Picture
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Personal Information</h2>
            
            <div className="form-group">
              <label htmlFor="username">Username (cannot be changed)</label>
              <input
                id="username"
                type="text"
                value={profile.username}
                disabled
                className="disabled-input"
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
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/home" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>

      {(showToast || toastFading) && (
        <div className={`toast ${toastFading ? 'fade-out' : ''}`} role="status" aria-live="polite">
          <button type="button" className="toast-close" onClick={handleCloseToast} aria-label="Close">
            ×
          </button>
          <div className="toast-title">Success</div>
          <div className="toast-message">{toastMessage}</div>
          <div className="toast-progress" />
        </div>
      )}
    </div>
  );
}
