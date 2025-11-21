const TOKEN_KEY = "authTokens";
const USER_KEY = "authUser";

// ✅ Save login data (both tokens + user)
export function setAuthData({ access, refresh, user }) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ access, refresh }));
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("userChanged")); // real-time sync trigger
}

// ✅ Get tokens (access + refresh)
export function getTokens() {
  const tokens = localStorage.getItem(TOKEN_KEY);
  return tokens ? JSON.parse(tokens) : null;
}

// ✅ Get only access token (used by axios)
export function getToken() {
  const tokens = getTokens();
  return tokens?.access || null;
}

// ✅ Get current logged-in user object
export function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

// ✅ Clear everything (logout)
export function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("userChanged")); // trigger UI updates
}

// ✅ Alias for axios interceptor (simple logout helper)
export function logout() {
  clearAuthData();
}

// ✅ Unified getter (returns both tokens + user)
export function getAuth() {
  const tokens = getTokens();
  const user = getUser();
  if (!tokens) return null;
  return { ...tokens, user };
}

// ✅ Unified setter (save both tokens + user)
export function setAuth(data) {
  const { access, refresh, user } = data;
  setAuthData({ access, refresh, user });
}
