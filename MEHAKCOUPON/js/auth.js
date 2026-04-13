window.Auth = (function () {
  var STORAGE_KEY = AppConfig.STORAGE_KEY;

  function login(username, password) {
    var u = username.trim().toLowerCase();
    var p = password.trim();
    var match = AppConfig.USERS.find(function (user) {
      return user.username === u && user.password === p;
    });
    if (!match) return null;
    var session = { username: match.username, role: match.role };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.username && parsed.role) return parsed;
      return null;
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function isAdmin() {
    var user = getUser();
    return user && user.role === 'admin';
  }

  return { login: login, getUser: getUser, logout: logout, isAdmin: isAdmin };
})();
