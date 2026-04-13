window.Store = (function () {
  function getUserDoc() {
    var db = DB.getDb();
    if (!db) return Promise.reject(new Error('No database'));
    return db.collection('users').doc('mehak').get().then(function (snap) {
      if (!snap.exists) {
        return { points: 0, contestsPlayed: 0, lastPlayedDate: '' };
      }
      return snap.data();
    });
  }

  function getCurrentContest() {
    var db = DB.getDb();
    if (!db) return Promise.reject(new Error('No database'));
    return db.collection('config').doc('currentContest').get().then(function (snap) {
      if (!snap.exists) return null;
      return snap.data();
    });
  }

  function submitContest(pointsToAdd) {
    var db = DB.getDb();
    if (!db) return Promise.reject(new Error('No database'));
    var ref = db.collection('users').doc('mehak');
    return ref.set({
      points: firebase.firestore.FieldValue.increment(pointsToAdd),
      contestsPlayed: firebase.firestore.FieldValue.increment(1),
      lastPlayedDate: AppConfig.getTodayString()
    }, { merge: true });
  }

  function hasPlayedToday(userData) {
    return userData.lastPlayedDate === AppConfig.getTodayString();
  }

  return {
    getUserDoc: getUserDoc,
    getCurrentContest: getCurrentContest,
    submitContest: submitContest,
    hasPlayedToday: hasPlayedToday
  };
})();
