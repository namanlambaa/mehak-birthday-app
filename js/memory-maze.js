window.MemoryMaze = (function () {
  var POINTS_PER_STAGE = 24;
  var TOTAL_STAGES = 20;

  var gameArea = null;
  var instructionEl = null;
  var inputArea = null;
  var inputField = null;
  var inputBtn = null;
  var timerEl = null;
  var stageIndicator = null;
  var progressBar = null;
  var stageCompleteOverlay = null;

  var currentStage = 0;
  var stageState = {};
  var callbacks = {};
  var running = false;
  var stopped = false;
  var timerInterval = null;
  var catTapsRequired = 3;
  var dogTapsRequired = 2;
  var reversed = false;

  var STAGES = buildStages();

  function buildStages() {
    return [
      // STAGE 1: 1 cat, tap 3x
      {
        elements: [{ type: 'cat', count: 1 }],
        instruction: 'Tap the cat 3 times',
        hasInput: false,
        tierColor: 'green'
      },
      // STAGE 2: 4 cats, tap each 3x
      {
        elements: [{ type: 'cat', count: 4 }],
        instruction: '',
        hasInput: false,
        tierColor: 'green'
      },
      // STAGE 3: tree -> shake -> fruits + cat falls, tap cat 3x
      {
        elements: [{ type: 'tree', count: 1 }],
        instruction: 'Double tap the tree to shake fruits',
        hasInput: false,
        tierColor: 'green',
        hasTreeCat: true
      },
      // STAGE 4: 6 balls — rule screen (even=45, odd=56)
      {
        elements: [{ type: 'ball', count: 6 }],
        instruction: 'New rule! When balls are EVEN enter 45, when ODD enter 56.\nThere are 6 balls (even) — enter 45',
        hasInput: true,
        correctAnswer: '45',
        tierColor: 'green',
        isRuleIntro: true
      },
      // STAGE 5: 5 balls -> enter 56
      {
        elements: [{ type: 'ball', count: 5 }],
        instruction: '',
        hasInput: true,
        correctAnswer: '56',
        tierColor: 'green'
      },
      // STAGE 6: 1 cat + 4 balls
      {
        elements: [{ type: 'cat', count: 1 }, { type: 'ball', count: 4 }],
        instruction: '',
        hasInput: true,
        correctAnswer: '45',
        tierColor: 'yellow'
      },
      // STAGE 7: tree + cat + 3 balls
      {
        elements: [{ type: 'tree', count: 1 }, { type: 'cat', count: 1 }, { type: 'ball', count: 3 }],
        instruction: '',
        hasInput: true,
        correctAnswer: '56',
        tierColor: 'yellow',
        hasTreeCat: false
      },
      // STAGE 8: 1 dog, tap 2x
      {
        elements: [{ type: 'dog', count: 1 }],
        instruction: 'New friend! Tap the dog 2 times',
        hasInput: false,
        tierColor: 'yellow',
        isRuleIntro: true
      },
      // STAGE 9: cat + dog
      {
        elements: [{ type: 'cat', count: 1 }, { type: 'dog', count: 1 }],
        instruction: '',
        hasInput: false,
        tierColor: 'yellow'
      },
      // STAGE 10: tree + dog -> shake -> cat falls
      {
        elements: [{ type: 'tree', count: 1 }, { type: 'dog', count: 1 }],
        instruction: '',
        hasInput: false,
        tierColor: 'yellow',
        hasTreeCat: true
      },
      // STAGE 11: rule screen — cat=3, dog=2
      {
        elements: [],
        instruction: '',
        hasInput: false,
        tierColor: 'orange',
        isInfoScreen: true
      },
      // STAGE 12: cat + dog + cat -> enter total taps = 8
      {
        elements: [{ type: 'cat', count: 1 }, { type: 'dog', count: 1 }, { type: 'cat', count: 1 }],
        instruction: 'Enter the total taps needed for all the animals above',
        hasInput: true,
        correctAnswer: '8',
        tierColor: 'orange',
        noTapRequired: true
      },
      // STAGE 13: 4 balloons
      {
        elements: [{ type: 'balloon', count: 4 }],
        instruction: 'New element! Tap each balloon once to pop it',
        hasInput: false,
        tierColor: 'orange',
        isRuleIntro: true
      },
      // STAGE 14: balloon + cat + dog
      {
        elements: [{ type: 'balloon', count: 1 }, { type: 'cat', count: 1 }, { type: 'dog', count: 1 }],
        instruction: '',
        hasInput: false,
        tierColor: 'orange'
      },
      // STAGE 15: tree + balloon + 6 balls
      {
        elements: [{ type: 'tree', count: 1 }, { type: 'balloon', count: 1 }, { type: 'ball', count: 6 }],
        instruction: '',
        hasInput: true,
        correctAnswer: '45',
        tierColor: 'blue',
        hasTreeCat: false
      },
      // STAGE 16: cat + dog + balloon with 5-second timer
      {
        elements: [{ type: 'cat', count: 1 }, { type: 'dog', count: 1 }, { type: 'balloon', count: 1 }],
        instruction: 'Do everything in 5 seconds! Go!',
        hasInput: false,
        tierColor: 'blue',
        timeLimit: 5
      },
      // STAGE 17: reverse rule screen
      {
        elements: [],
        instruction: 'TWIST! Rules are now reversed!\n🐱 Cat = 2 taps\n🐶 Dog = 3 taps\n\nTap \"Got it!\" to continue',
        hasInput: false,
        tierColor: 'blue',
        isInfoScreen: true,
        applyReversal: true
      },
      // STAGE 18: cat + dog + 5 balls (reversed)
      {
        elements: [{ type: 'cat', count: 1 }, { type: 'dog', count: 1 }, { type: 'ball', count: 5 }],
        instruction: '',
        hasInput: true,
        correctAnswer: '56',
        tierColor: 'blue'
      },
      // STAGE 19: tree + cat + dog + balloon + 4 balls (boss)
      {
        elements: [
          { type: 'tree', count: 1 },
          { type: 'cat', count: 1 },
          { type: 'dog', count: 1 },
          { type: 'balloon', count: 1 },
          { type: 'ball', count: 4 }
        ],
        instruction: '',
        hasInput: true,
        correctAnswer: '45',
        tierColor: 'purple',
        hasTreeCat: true
      },
      // STAGE 20: congrats
      {
        elements: [],
        instruction: '',
        hasInput: false,
        tierColor: 'purple',
        isEndScreen: true
      }
    ];
  }

  function init(opts) {
    callbacks = opts || {};
    gameArea = document.getElementById('maze-game-area');
    instructionEl = document.getElementById('maze-instruction');
    inputArea = document.getElementById('maze-input-area');
    inputField = document.getElementById('maze-input');
    inputBtn = document.getElementById('maze-input-btn');
    timerEl = document.getElementById('maze-timer');
    stageIndicator = document.getElementById('maze-stage-indicator');
    progressBar = document.getElementById('maze-progress-fill');
    stageCompleteOverlay = document.getElementById('maze-stage-complete');

    currentStage = 0;
    reversed = false;
    catTapsRequired = 3;
    dogTapsRequired = 2;
    running = true;
    stopped = false;

    if (inputBtn) {
      inputBtn.onclick = handleInputSubmit;
    }
    if (inputField) {
      inputField.onkeydown = function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleInputSubmit();
        }
      };
    }

    renderStage();
  }

  function stop() {
    running = false;
    stopped = true;
    clearTimer();
  }

  function getPointsSoFar() {
    return currentStage * POINTS_PER_STAGE;
  }

  function getCurrentStage() {
    return currentStage;
  }

  // ==================== Rendering ====================

  function renderStage() {
    if (!running) return;
    clearTimer();

    var stage = STAGES[currentStage];
    if (!stage) return;

    stageState = {
      tapCounts: {},
      treeShaken: false,
      treeCatRevealed: false,
      treeCatTaps: 0,
      balloonsPoppedCount: 0,
      balloonsTotal: 0,
      inputSubmitted: false,
      timerExpired: false,
      gotItClicked: false,
      elementIdCounter: 0
    };

    updateProgressBar();
    updateStageIndicator(stage);

    gameArea.innerHTML = '';
    inputArea.hidden = true;
    timerEl.hidden = true;
    if (inputField) {
      inputField.value = '';
      inputField.disabled = false;
      inputField.classList.remove('maze-input-correct');
    }
    if (inputBtn) {
      inputBtn.disabled = false;
      inputBtn.textContent = 'Submit';
    }

    if (stage.isEndScreen) {
      renderEndScreen();
      return;
    }

    if (stage.isInfoScreen) {
      renderInfoScreen(stage);
      return;
    }

    renderElements(stage);

    if (stage.instruction) {
      instructionEl.textContent = stage.instruction;
      instructionEl.hidden = false;
    } else {
      instructionEl.textContent = '';
      instructionEl.hidden = true;
    }

    if (stage.hasInput) {
      inputArea.hidden = false;
      inputField.value = '';
      inputField.focus();
    }

    if (stage.timeLimit) {
      startTimer(stage.timeLimit);
    }
  }

  function renderElements(stage) {
    var elementsContainer = document.createElement('div');
    elementsContainer.className = 'maze-elements-row';

    stage.elements.forEach(function (group) {
      for (var i = 0; i < group.count; i++) {
        var el = createInteractiveElement(group.type, stage);
        elementsContainer.appendChild(el);
      }
    });

    gameArea.appendChild(elementsContainer);
  }

  function createInteractiveElement(type, stage) {
    var id = 'el-' + (stageState.elementIdCounter++);
    stageState.tapCounts[id] = 0;

    var wrapper = document.createElement('div');
    wrapper.className = 'maze-element maze-element-' + type;
    wrapper.setAttribute('data-id', id);
    wrapper.setAttribute('data-type', type);

    var emojiSpan = document.createElement('span');
    emojiSpan.className = 'maze-emoji';

    switch (type) {
      case 'cat':
        emojiSpan.textContent = '🐱';
        if (stage.noTapRequired) {
          wrapper.classList.add('maze-no-tap');
        } else {
          bindTapHandler(wrapper, id, catTapsRequired, stage);
        }
        break;

      case 'dog':
        emojiSpan.textContent = '🐶';
        if (stage.noTapRequired) {
          wrapper.classList.add('maze-no-tap');
        } else {
          bindTapHandler(wrapper, id, dogTapsRequired, stage);
        }
        break;

      case 'tree':
        emojiSpan.textContent = '🌳';
        bindTreeHandler(wrapper, id, stage);
        break;

      case 'ball':
        emojiSpan.textContent = '⚽';
        wrapper.classList.add('maze-no-tap');
        break;

      case 'balloon':
        emojiSpan.textContent = '🎈';
        stageState.balloonsTotal++;
        bindBalloonHandler(wrapper, id, stage);
        break;
    }

    wrapper.appendChild(emojiSpan);
    return wrapper;
  }

  // ==================== Tap Handlers ====================

  function bindTapHandler(el, id, needed, stage) {
    el.addEventListener('click', function () {
      if (!running || stageState.timerExpired) return;
      if (stageState.tapCounts[id] >= needed) return;

      stageState.tapCounts[id]++;
      var count = stageState.tapCounts[id];

      el.classList.add('maze-element-tapped');
      setTimeout(function () { el.classList.remove('maze-element-tapped'); }, 150);

      if (count >= needed) {
        el.classList.add('maze-element-done');
      }

      checkStageComplete(stage);
    });
  }

  function bindTreeHandler(el, id, stage) {
    var lastTap = 0;
    el.addEventListener('click', function () {
      if (!running || stageState.treeShaken || stageState.timerExpired) return;

      var now = Date.now();
      if (now - lastTap < 400) {
        stageState.treeShaken = true;
        el.classList.add('maze-element-shaking');

        setTimeout(function () {
          el.classList.remove('maze-element-shaking');
          el.classList.add('maze-element-done');
        }, 600);

        showFallingFruits();

        if (stage.hasTreeCat) {
          setTimeout(function () {
            revealTreeCat(stage);
          }, 800);
        } else {
          setTimeout(function () {
            checkStageComplete(stage);
          }, 650);
        }
      }
      lastTap = now;
    });
  }

  function showFallingFruits() {
    var fruits = ['🍎', '🍊', '🍋', '🍐'];
    var container = document.createElement('div');
    container.className = 'maze-fruits-container';

    fruits.forEach(function (f, i) {
      var fruitEl = document.createElement('span');
      fruitEl.className = 'maze-fruit-item';
      fruitEl.textContent = f;
      fruitEl.style.animationDelay = (i * 0.1) + 's';
      container.appendChild(fruitEl);
    });

    gameArea.appendChild(container);
    setTimeout(function () {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 1200);
  }

  function revealTreeCat(stage) {
    if (!running) return;
    stageState.treeCatRevealed = true;

    var catWrapper = document.createElement('div');
    catWrapper.className = 'maze-element maze-element-cat maze-tree-cat-reveal';
    var catId = 'tree-cat';
    stageState.tapCounts[catId] = 0;

    var emojiSpan = document.createElement('span');
    emojiSpan.className = 'maze-emoji';
    emojiSpan.textContent = '🐱';

    catWrapper.appendChild(emojiSpan);
    catWrapper.setAttribute('data-id', catId);
    catWrapper.setAttribute('data-type', 'cat');

    catWrapper.addEventListener('click', function () {
      if (!running || stageState.timerExpired) return;
      if (stageState.treeCatTaps >= catTapsRequired) return;

      stageState.treeCatTaps++;
      var count = stageState.treeCatTaps;

      catWrapper.classList.add('maze-element-tapped');
      setTimeout(function () { catWrapper.classList.remove('maze-element-tapped'); }, 150);

      if (count >= catTapsRequired) {
        catWrapper.classList.add('maze-element-done');
      }

      checkStageComplete(stage);
    });

    var row = gameArea.querySelector('.maze-elements-row');
    if (row) {
      row.appendChild(catWrapper);
    } else {
      gameArea.appendChild(catWrapper);
    }
  }

  function bindBalloonHandler(el, id, stage) {
    el.addEventListener('click', function () {
      if (!running || stageState.timerExpired) return;
      if (el.classList.contains('maze-element-done')) return;

      el.classList.add('maze-balloon-popping');
      stageState.balloonsPoppedCount++;

      setTimeout(function () {
        el.classList.add('maze-element-done');
        el.classList.remove('maze-balloon-popping');
        var emoji = el.querySelector('.maze-emoji');
        if (emoji) emoji.textContent = '💥';
        checkStageComplete(stage);
      }, 350);
    });
  }

  // ==================== Input ====================

  function handleInputSubmit() {
    if (!running) return;
    var stage = STAGES[currentStage];
    if (!stage || !stage.hasInput) return;

    var val = (inputField.value || '').trim();
    if (!val) {
      shakeEl(inputField);
      return;
    }

    if (val === stage.correctAnswer) {
      stageState.inputSubmitted = true;
      inputField.disabled = true;
      inputBtn.disabled = true;
      inputBtn.textContent = 'Correct!';
      inputField.classList.add('maze-input-correct');
      checkStageComplete(stage);
    } else {
      shakeEl(inputField);
      inputField.value = '';
      inputField.focus();
    }
  }

  // ==================== Timer ====================

  function startTimer(seconds) {
    timerEl.hidden = false;
    var remaining = seconds;
    timerEl.textContent = remaining + 's';
    timerEl.classList.remove('maze-timer-critical');

    timerInterval = setInterval(function () {
      remaining--;
      if (remaining <= 2) {
        timerEl.classList.add('maze-timer-critical');
      }
      if (remaining <= 0) {
        clearTimer();
        stageState.timerExpired = true;
        timerEl.textContent = 'Time\'s up!';
        handleTimerExpired();
        return;
      }
      timerEl.textContent = remaining + 's';
    }, 1000);
  }

  function clearTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function handleTimerExpired() {
    var stage = STAGES[currentStage];
    if (isStageConditionsMet(stage)) {
      advanceStage();
    } else {
      showStageFailed();
    }
  }

  function showStageFailed() {
    var wasRunning = running;
    running = false;
    stageCompleteOverlay.innerHTML = '<div class="maze-stage-msg maze-stage-fail">Time\'s up! Stage failed<br>Try again from the start</div>';
    stageCompleteOverlay.hidden = false;

    setTimeout(function () {
      stageCompleteOverlay.hidden = true;
      if (stopped) return;
      if (wasRunning && callbacks.onFail) {
        callbacks.onFail(currentStage, getPointsSoFar());
      }
    }, 1800);
  }

  // ==================== Validation ====================

  function checkStageComplete(stage) {
    if (!running) return;
    if (stageState.timerExpired) return;

    if (isStageConditionsMet(stage)) {
      if (!stage.timeLimit || !stageState.timerExpired) {
        advanceStage();
      }
    }
  }

  function isStageConditionsMet(stage) {
    var allTapsDone = true;
    var elements = stage.elements || [];

    elements.forEach(function (group) {
      if (group.type === 'cat' && !stage.noTapRequired) {
        var needed = catTapsRequired;
        for (var key in stageState.tapCounts) {
          if (key.indexOf('el-') === 0) {
            var el = gameArea.querySelector('[data-id="' + key + '"][data-type="cat"]');
            if (el && stageState.tapCounts[key] < needed) allTapsDone = false;
          }
        }
      }
      if (group.type === 'dog' && !stage.noTapRequired) {
        var needed = dogTapsRequired;
        for (var key in stageState.tapCounts) {
          if (key.indexOf('el-') === 0) {
            var el = gameArea.querySelector('[data-id="' + key + '"][data-type="dog"]');
            if (el && stageState.tapCounts[key] < needed) allTapsDone = false;
          }
        }
      }
    });

    var hasTrees = elements.some(function (g) { return g.type === 'tree'; });
    if (hasTrees && !stageState.treeShaken) return false;

    if (stage.hasTreeCat) {
      if (!stageState.treeCatRevealed) return false;
      if (stageState.treeCatTaps < catTapsRequired) return false;
    }

    var hasBalloons = elements.some(function (g) { return g.type === 'balloon'; });
    if (hasBalloons && stageState.balloonsPoppedCount < stageState.balloonsTotal) return false;

    if (stage.hasInput && !stageState.inputSubmitted) return false;

    return allTapsDone;
  }

  // ==================== Stage Advance ====================

  function advanceStage() {
    if (!running) return;
    clearTimer();
    running = false;

    var pts = (currentStage + 1) * POINTS_PER_STAGE;
    stageCompleteOverlay.innerHTML = '<div class="maze-stage-msg maze-stage-success">Stage ' + (currentStage + 1) + ' Complete!<br>+' + POINTS_PER_STAGE + ' pts</div>';
    stageCompleteOverlay.hidden = false;

    setTimeout(function () {
      stageCompleteOverlay.hidden = true;
      if (stopped) return;

      currentStage++;
      running = true;

      var nextStage = STAGES[currentStage];
      if (nextStage && nextStage.applyReversal) {
        reversed = true;
        catTapsRequired = 2;
        dogTapsRequired = 3;
      }

      renderStage();
    }, 1200);
  }

  // ==================== Info / End Screens ====================

  function renderInfoScreen(stage) {
    instructionEl.hidden = true;

    var card = document.createElement('div');
    card.className = 'maze-info-card';

    if (stage.instruction) {
      var text = document.createElement('p');
      text.className = 'maze-info-text';
      text.textContent = stage.instruction;
      card.appendChild(text);
    }

    var btn = document.createElement('button');
    btn.className = 'btn btn-primary maze-got-it-btn';
    btn.textContent = 'Got it!';
    btn.addEventListener('click', function () {
      if (stageState.gotItClicked) return;
      stageState.gotItClicked = true;
      advanceStage();
    });

    card.appendChild(btn);
    gameArea.appendChild(card);
  }

  function renderEndScreen() {
    instructionEl.hidden = true;
    clearTimer();

    var total = TOTAL_STAGES * POINTS_PER_STAGE;
    var card = document.createElement('div');
    card.className = 'maze-end-card';

    card.innerHTML =
      '<div class="maze-end-icon">💖✨</div>' +
      '<h2 class="maze-end-title">Congratulations!</h2>' +
      '<p class="maze-end-text">You completed all 20 stages!</p>' +
      '<p class="maze-end-text">You just unlocked BONUS points 🎉</p>' +
      '<p class="maze-end-points">+' + total + ' pts</p>';

    gameArea.appendChild(card);

    setTimeout(function () {
      if (stopped) return;
      if (callbacks.onComplete) {
        callbacks.onComplete(total);
      }
    }, 1500);
  }

  // ==================== UI Helpers ====================

  function updateProgressBar() {
    if (!progressBar) return;
    var pct = (currentStage / TOTAL_STAGES) * 100;
    progressBar.style.width = pct + '%';
  }

  function updateStageIndicator(stage) {
    if (!stageIndicator) return;
    stageIndicator.textContent = 'Stage ' + (currentStage + 1) + ' / ' + TOTAL_STAGES;
    stageIndicator.className = 'maze-stage-indicator maze-tier-' + (stage.tierColor || 'green');
  }

  function shakeEl(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(function () { el.style.animation = ''; }, 400);
  }

  // ==================== Public API ====================

  return {
    init: init,
    stop: stop,
    getPointsSoFar: getPointsSoFar,
    getCurrentStage: getCurrentStage,
    POINTS_PER_STAGE: POINTS_PER_STAGE,
    TOTAL_STAGES: TOTAL_STAGES
  };
})();
