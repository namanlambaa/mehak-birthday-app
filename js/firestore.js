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

  var FLAPPY_MAX_TRIES = 15;

  function getFlappyTriesLeft(userData) {
    var used = userData.flappyTriesUsed || 0;
    return Math.max(0, FLAPPY_MAX_TRIES - used);
  }

  function submitFlappyTry(newScore) {
    var db = DB.getDb();
    if (!db) return Promise.reject(new Error('No database'));
    var ref = db.collection('users').doc('mehak');

    return ref.get().then(function (snap) {
      var data = snap.exists ? snap.data() : { points: 0, contestsPlayed: 0, flappyTriesUsed: 0, flappyBestScore: 0 };
      var oldBest = data.flappyBestScore || 0;
      var triesUsed = data.flappyTriesUsed || 0;
      var isFirstTry = triesUsed === 0;

      var update = {
        flappyTriesUsed: triesUsed + 1
      };

      if (newScore > oldBest) {
        var delta = newScore - oldBest;
        update.points = firebase.firestore.FieldValue.increment(delta);
        update.flappyBestScore = newScore;
      }

      if (isFirstTry) {
        update.contestsPlayed = firebase.firestore.FieldValue.increment(1);
      }

      return ref.set(update, { merge: true }).then(function () {
        return {
          triesLeft: Math.max(0, FLAPPY_MAX_TRIES - (triesUsed + 1)),
          bestScore: Math.max(newScore, oldBest),
          isNewBest: newScore > oldBest
        };
      });
    });
  }

  return {
    getUserDoc: getUserDoc,
    getCurrentContest: getCurrentContest,
    submitContest: submitContest,
    hasPlayedToday: hasPlayedToday,
    getFlappyTriesLeft: getFlappyTriesLeft,
    submitFlappyTry: submitFlappyTry,
    FLAPPY_MAX_TRIES: FLAPPY_MAX_TRIES
  };
})();
