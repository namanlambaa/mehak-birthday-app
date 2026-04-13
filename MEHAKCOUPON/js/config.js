window.AppConfig = {
  BIRTHDAY: '2026-05-02',
  STORAGE_KEY: 'mehak_coupon_user',

  USERS: [
    { username: 'naman', password: 'NALAMBA', role: 'admin' },
    { username: 'mehak', password: 'ilovenaman', role: 'user' }
  ],

  DAILY_MESSAGES: [
    "Every day closer to the best day ever 💕",
    "You deserve all the love in the world 🌸",
    "Can't wait to celebrate you, beautiful 💖",
    "One more contest, one more reason to smile ✨",
    "Your birthday budget is growing! 🎉",
    "Making memories, one coupon at a time 🌷",
    "The countdown continues… you're worth every point 💗",
    "Today's a good day to win some love 💝",
    "Almost there! Something special awaits 🎀",
    "Every point is a piece of my heart 💌",
    "You make even countdowns feel magical 🦋",
    "One step closer to your perfect day 🌺"
  ],

  getDailyMessage: function () {
    var today = AppConfig.getTodayString();
    var hash = 0;
    for (var i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash |= 0;
    }
    var idx = Math.abs(hash) % AppConfig.DAILY_MESSAGES.length;
    return AppConfig.DAILY_MESSAGES[idx];
  },

  getTodayString: function () {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  },

  getDaysRemaining: function () {
    var today = new Date(AppConfig.getTodayString() + 'T00:00:00');
    var birthday = new Date(AppConfig.BIRTHDAY + 'T00:00:00');
    var diff = birthday - today;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
};
