window.SliderPuzzle = (function () {
  // 3x3 grid. Tile value 0 = empty. Solved state = [1,2,3,4,5,6,7,8,0].
  var GRID = 3;
  var EMPTY = 0;

  var board = null;
  var state = [];     // length 9; positions in row-major order
  var moves = 0;
  var completed = false;
  var onCompleteCb = null;
  var moveCountEl = null;

  function init(opts) {
    opts = opts || {};
    onCompleteCb = opts.onComplete || null;
    board = document.getElementById('slider-board');
    moveCountEl = document.getElementById('slider-move-count');
    if (!board) return;

    moves = 0;
    completed = false;
    updateMoveCount();

    state = solvedState();
    shuffle(80);
    render();
  }

  function solvedState() {
    var s = [];
    for (var i = 1; i <= GRID * GRID - 1; i++) s.push(i);
    s.push(EMPTY);
    return s;
  }

  function shuffle(times) {
    // Perform 'times' random valid moves from solved state to guarantee solvability.
    for (var i = 0; i < times; i++) {
      var emptyIdx = state.indexOf(EMPTY);
      var neighbors = neighborIdxs(emptyIdx);
      var pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      swap(emptyIdx, pick);
    }
    // Safety: if we accidentally landed back on solved, nudge once more.
    if (isSolved()) {
      var emptyIdx2 = state.indexOf(EMPTY);
      var n2 = neighborIdxs(emptyIdx2);
      swap(emptyIdx2, n2[0]);
    }
  }

  function neighborIdxs(idx) {
    var r = Math.floor(idx / GRID);
    var c = idx % GRID;
    var out = [];
    if (r > 0) out.push(idx - GRID);
    if (r < GRID - 1) out.push(idx + GRID);
    if (c > 0) out.push(idx - 1);
    if (c < GRID - 1) out.push(idx + 1);
    return out;
  }

  function swap(a, b) {
    var tmp = state[a];
    state[a] = state[b];
    state[b] = tmp;
  }

  function isSolved() {
    for (var i = 0; i < GRID * GRID - 1; i++) {
      if (state[i] !== i + 1) return false;
    }
    return state[GRID * GRID - 1] === EMPTY;
  }

  function render() {
    if (!board) return;
    board.innerHTML = '';
    for (var i = 0; i < state.length; i++) {
      var val = state[i];
      var tile = document.createElement('div');
      tile.className = 'slider-tile';
      if (val === EMPTY) {
        tile.classList.add('slider-tile-empty');
      } else {
        // Image piece: 1..8 maps to the grid position it should OCCUPY when solved.
        // Solved slot index for tile value v is v-1.
        var solvedIdx = val - 1;
        var sr = Math.floor(solvedIdx / GRID);
        var sc = solvedIdx % GRID;
        // With background-size: 300% 300%, each step is 50% (0%, 50%, 100%)
        var bx = (sc * 50);
        var by = (sr * 50);
        tile.style.backgroundPosition = bx + '% ' + by + '%';
        tile.dataset.value = String(val);
        (function (idx) {
          tile.addEventListener('click', function () { onTileClick(idx); });
        })(i);
      }
      board.appendChild(tile);
    }
  }

  function onTileClick(idx) {
    if (completed) return;
    var emptyIdx = state.indexOf(EMPTY);
    var neighbors = neighborIdxs(emptyIdx);
    if (neighbors.indexOf(idx) === -1) return;

    swap(idx, emptyIdx);
    moves++;
    updateMoveCount();
    render();

    if (isSolved()) {
      completed = true;
      // Show the full image (replace empty with the final piece briefly for celebration).
      revealComplete();
      setTimeout(function () {
        if (onCompleteCb) onCompleteCb();
      }, 500);
    }
  }

  function revealComplete() {
    if (!board) return;
    var tiles = board.querySelectorAll('.slider-tile');
    tiles.forEach(function (t, idx) {
      if (t.classList.contains('slider-tile-empty')) {
        // Fill in the last piece (bottom-right)
        t.classList.remove('slider-tile-empty');
        t.classList.add('slider-tile-filled');
        t.style.backgroundPosition = '100% 100%';
      }
      t.classList.add('slider-tile-done');
    });
  }

  function reshuffle() {
    if (!board) return;
    completed = false;
    moves = 0;
    updateMoveCount();
    state = solvedState();
    shuffle(80);
    render();
  }

  function updateMoveCount() {
    if (moveCountEl) moveCountEl.textContent = String(moves);
  }

  function stop() {
    if (board) board.innerHTML = '';
    onCompleteCb = null;
  }

  return {
    init: init,
    reshuffle: reshuffle,
    stop: stop
  };
})();
