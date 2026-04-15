(function () {
  var PUZZLES = [
    { emojis: '🫧👶', answer: 'bub' },
    { emojis: '🇮🇳🚪', answer: 'india gate' },
    { emojis: '🏫🚌', answer: 'school bus' },
    { emojis: '🏫❤️✨', answer: 'highschool romance' },
    { emojis: '👶👶👶', answer: '3 babies' },
    { emojis: '👳‍♂️💍🧑‍💼', answer: 'jaat weds bania' },
    { emojis: '🧘‍♂️🌊🏔️', answer: 'rishikesh' },
    { emojis: '🕌🌸🏰', answer: 'jaipur' },
    { emojis: '🎓🌧️🏙️', answer: 'pune' },
    { emojis: '🏢🚗💼', answer: 'gurugram' }
  ];
  var POINTS_PER_PUZZLE = 50;

  var refs = {
    clue: null,
    blanks: null,
    input: null,
    progress: null,
    hint: null,
    checkBtn: null
  };

  var state = {
    currentIndex: 0,
    totalEarned: 0,
    onComplete: null,
    transitioning: false
  };

  function init(options) {
    refs.clue = document.getElementById('emoji-clue');
    refs.blanks = document.getElementById('emoji-blanks');
    refs.input = document.getElementById('emoji-input');
    refs.progress = document.getElementById('emoji-progress');
    refs.hint = document.getElementById('emoji-hint');
    refs.checkBtn = document.getElementById('emoji-check');

    state.currentIndex = 0;
    state.totalEarned = 0;
    state.transitioning = false;
    state.onComplete = options && typeof options.onComplete === 'function'
      ? options.onComplete
      : null;

    renderPuzzle(0);
  }

  function renderPuzzle(index) {
    var puzzle = PUZZLES[index];
    if (!puzzle) return;

    refs.progress.textContent = (index + 1) + ' / ' + PUZZLES.length;
    refs.clue.textContent = puzzle.emojis;
    refs.input.value = '';
    refs.hint.textContent = '';
    refs.hint.className = 'emoji-hint';
    if (refs.checkBtn) {
      refs.checkBtn.disabled = false;
      refs.checkBtn.textContent = 'Check';
    }

    refs.blanks.innerHTML = '';
    var answer = puzzle.answer;
    for (var i = 0; i < answer.length; i++) {
      var span = document.createElement('span');
      if (answer[i] === ' ') {
        span.className = 'emoji-blank-space';
      } else {
        span.className = 'emoji-blank';
        span.textContent = '\u00A0';
      }
      refs.blanks.appendChild(span);
    }

    refs.input.focus();
  }

  function checkAnswer() {
    if (state.transitioning) return;

    var puzzle = PUZZLES[state.currentIndex];
    if (!puzzle) return;

    var userAnswer = refs.input.value.trim().toLowerCase();
    var correctAnswer = puzzle.answer.toLowerCase();

    if (!userAnswer) {
      shakeElement(refs.input);
      return;
    }

    if (userAnswer !== correctAnswer) {
      refs.hint.textContent = 'Not quite, try again! 💭';
      refs.hint.className = 'emoji-hint emoji-hint-wrong';
      shakeElement(refs.input);
      return;
    }

    state.transitioning = true;
    state.totalEarned += POINTS_PER_PUZZLE;

    refs.hint.textContent = 'Correct! +' + POINTS_PER_PUZZLE + ' pts 🎉';
    refs.hint.className = 'emoji-hint emoji-hint-correct';
    if (refs.checkBtn) {
      refs.checkBtn.disabled = true;
    }

    var blanks = refs.blanks.querySelectorAll('.emoji-blank');
    var letters = puzzle.answer.split('').filter(function (c) { return c !== ' '; });
    for (var i = 0; i < blanks.length; i++) {
      blanks[i].textContent = letters[i] ? letters[i].toUpperCase() : '';
      blanks[i].classList.add('emoji-blank-correct');
    }

    setTimeout(function () {
      state.transitioning = false;
      state.currentIndex++;

      if (state.currentIndex >= PUZZLES.length) {
        if (typeof state.onComplete === 'function') {
          state.onComplete(state.totalEarned);
        }
        return;
      }

      renderPuzzle(state.currentIndex);
    }, 900);
  }

  function shakeElement(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(function () { el.style.animation = ''; }, 400);
  }

  window.EmojiGame = {
    init: init,
    checkAnswer: checkAnswer
  };
})();
