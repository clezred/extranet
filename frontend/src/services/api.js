const API_BASE_URL = 'http://localhost:5000/api';
export const ASSET_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

// Utility for API calls
async function apiCall(endpoint, options = {}) {
  const { method = 'GET', body = null, requiresAuth = false } = options;
  
  const headers = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API error');
  }

  return response.json();
}

// Authentication service
export const authService = {
  register: async (username, password, name, surname, email) => {
    return apiCall('/register', {
      method: 'POST',
      body: { username, password, name, surname, email }
    });
  },

  login: async (username, password) => {
    const response = await apiCall('/login', {
      method: 'POST',
      body: { username, password }
    });
    
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    
    return response;
  },

  logout: async () => {
    await apiCall('/logout', {
      method: 'POST',
      requiresAuth: true
    });
    
    localStorage.removeItem('token');
  },

  checkUsernameAvailability: async (username) => {
    return apiCall(`/check-username?username=${encodeURIComponent(username)}`);
  }
};

// Profile service
export const profileService = {
  getProfile: async () => {
    return apiCall('/profile', { requiresAuth: true });
  },

  updateProfile: async (id, name, surname, email, avatar = null, removeAvatar = false) => {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('name', name);
    formData.append('surname', surname);
    formData.append('email', email);
    formData.append('removeAvatar', removeAvatar ? 'true' : 'false');
    if (avatar) {
      formData.append('avatar', avatar);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/profile/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API error');
    }

    return response.json();
  }
};

// Status service
export const statusService = {
  checkConnection: async () => {
    return apiCall('/status');
  }
};
