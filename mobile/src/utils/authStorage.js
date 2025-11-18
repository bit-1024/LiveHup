const TOKEN_KEY = 'lp_mobile_token';
const USER_KEY = 'lp_mobile_user';

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn('解析本地用户信息失败:', error);
    return null;
  }
};

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  getUser: () => safeParse(localStorage.getItem(USER_KEY)),
  setUser: (user) => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
