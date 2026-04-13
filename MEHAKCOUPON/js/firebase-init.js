window.DB = (function () {
  var db = null;

  function init() {
    var config = window.__FIREBASE_CONFIG__;
    if (!config) {
      console.error('Firebase config not found. Create firebase-config.js from the example file.');
      return false;
    }
    firebase.initializeApp(config);
    db = firebase.firestore();
    return true;
  }

  function getDb() {
    return db;
  }

  return { init: init, getDb: getDb };
})();
