const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

export const API_ENDPOINTS = {
  // Auth Endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    GOOGLE_OAUTH: `${API_BASE_URL}/api/auth/google`,
    PROFILE: `${API_BASE_URL}/api/auth/profile`,
    VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify`,
  },

  // User Endpoints
  USERS: {
    BASE: `${API_BASE_URL}/users`,
    BY_ID: (id) => `${API_BASE_URL}/user/${id}`,
    PROFILE: `${API_BASE_URL}/user/profile`,
  },

  // Event Endpoints
  EVENTS: {
    BASE: `${API_BASE_URL}/regularevents`,
    BY_ID: (id) => `${API_BASE_URL}/regularevents/${id}`,
    SPECIFIC_EVENT: (eventId) => `${API_BASE_URL}/api/events/${eventId}`,
  },

  // Event Check-in Endpoints
  CHECKIN: {
    CHECK_IN: (eventId) => `${API_BASE_URL}/api/events/${eventId}/check-in`,
    ATTENDEES: (eventId) => `${API_BASE_URL}/api/events/${eventId}/attendees`,
    USER_ATTENDANCE: (userId) => `${API_BASE_URL}/api/events/users/${userId}/attendance`,
    ATTENDANCE_STATS: `${API_BASE_URL}/events/attendance`,
  },

  // Application Endpoints
  APPLICATIONS: {
    BASE: `${API_BASE_URL}/eventapplications`,
    BY_ID: (id) => `${API_BASE_URL}/eventapplications/${id}`,
    EVENT: (eventId) => `${API_BASE_URL}/eventapplications/event/${eventId}`,
    USER: (userId) => `${API_BASE_URL}/eventapplications/user/${userId}`,
    STATUS: (appId) => `${API_BASE_URL}/eventapplications/${appId}/status`,
  },

  // Officer Endpoints
  OFFICERS: {
    BASE: `${API_BASE_URL}/api/officers`,
    BY_ID: (id) => `${API_BASE_URL}/api/officers/${id}`,
    UPLOADS: (id) => `${API_BASE_URL}/api/officers/uploads/${id}`,
  },

  // Information/Content Endpoints
  INFORMATION: {
    BASE: `${API_BASE_URL}/api/information`,
    ABOUT: `${API_BASE_URL}/api/information/about`,
    RESOURCES: `${API_BASE_URL}/api/information/resources`,
    FAQ: `${API_BASE_URL}/api/information/faq`,
  },
};

// Helper function for API requests
export const apiRequest = async (endpoint, options = {}) => {  
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Specific API functions for common operations
export const api = {
  // Auth functions
  login: (credentials) => apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  logout: () => apiRequest(API_ENDPOINTS.AUTH.LOGOUT, {
    method: 'POST',
  }),

  getProfile: () => apiRequest(API_ENDPOINTS.USERS.PROFILE),


  // Event functions
  getEvents: () => apiRequest(API_ENDPOINTS.EVENTS.BASE),
  getEvent: (id) => apiRequest(API_ENDPOINTS.EVENTS.BY_ID(id)),
  getEventForCheckin: (eventId) => apiRequest(API_ENDPOINTS.EVENTS.SPECIFIC_EVENT(eventId)),
  createEvent: (eventData) => apiRequest(API_ENDPOINTS.EVENTS.BASE, {
    method: 'POST',
    body: JSON.stringify(eventData),
  }),
  updateEvent: (id, eventData) => apiRequest(API_ENDPOINTS.EVENTS.BY_ID(id), {
    method: 'PATCH',
    body: JSON.stringify(eventData),
  }),
  deleteEvent: (id) => apiRequest(API_ENDPOINTS.EVENTS.BY_ID(id), {
    method: 'DELETE',
  }),


  // User functions
  getUsers: () => apiRequest(API_ENDPOINTS.USERS.BASE),
  getUser: (id) => apiRequest(API_ENDPOINTS.USERS.BY_ID(id)),
  getUserByGmail: (gmail) => apiRequest(`${API_BASE_URL}/user/gmail/${gmail}`),
  updateUser: (id, userData) => apiRequest(API_ENDPOINTS.USERS.BY_ID(id), {
    method: 'PATCH',
    body: JSON.stringify(userData),
  }),


  // Officer functions
  getOfficers: () => apiRequest(API_ENDPOINTS.OFFICERS.BASE),
  getOfficer: (id) => apiRequest(API_ENDPOINTS.OFFICERS.BY_ID(id)),
  createOfficer: (officerData) => apiRequest(API_ENDPOINTS.OFFICERS.BASE, {
    method: 'POST',
    body: JSON.stringify(officerData),
  }),
  updateOfficer: (id, officerData) => apiRequest(API_ENDPOINTS.OFFICERS.BY_ID(id), {
    method: 'PATCH',
    body: JSON.stringify(officerData),
  }),
  deleteOfficer: (id) => apiRequest(API_ENDPOINTS.OFFICERS.BY_ID(id), {
    method: 'DELETE',
  }),


  // Application functions
  submitApplication: (applicationData) => apiRequest(API_ENDPOINTS.APPLICATIONS.BASE, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  }),
  getApplications: () => apiRequest(API_ENDPOINTS.APPLICATIONS.BASE),
  getApplication: (id) => apiRequest(API_ENDPOINTS.APPLICATIONS.BY_ID(id)),


  // Check-in functions
  checkIn: (checkInData) => {
    const { eventId, ...data } = checkInData;
    return apiRequest(API_ENDPOINTS.CHECKIN.CHECK_IN(eventId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getEventAttendees: (eventId) => apiRequest(API_ENDPOINTS.CHECKIN.ATTENDEES(eventId)),

  checkUserAttendance: (userId) => apiRequest(API_ENDPOINTS.CHECKIN.USER_ATTENDANCE(userId)),

  getAttendanceStats: () => apiRequest(API_ENDPOINTS.CHECKIN.ATTENDANCE_STATS),
};