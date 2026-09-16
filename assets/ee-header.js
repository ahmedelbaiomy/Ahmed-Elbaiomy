document.addEventListener('click', function (event) {
  var button = event.target.closest('.ee-banner__menu-icon');
  if (!button) return;

  var header = button.closest('.ee-banner__header');
  if (!header) return;

  var isOpen = header.classList.toggle('is-menu-open');
  button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});
