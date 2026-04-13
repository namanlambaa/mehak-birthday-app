window.Router = (function () {
  var views = {};
  var currentView = null;

  function init() {
    document.querySelectorAll('.view').forEach(function (el) {
      views[el.id] = el;
    });
  }

  function navigate(viewId) {
    if (currentView === viewId) return;
    Object.keys(views).forEach(function (id) {
      views[id].classList.remove('active');
    });
    var target = views[viewId];
    if (target) {
      void target.offsetWidth; // force reflow for animation restart
      target.classList.add('active');
      currentView = viewId;
      target.scrollTop = 0;
    }
  }

  return { init: init, navigate: navigate };
})();
