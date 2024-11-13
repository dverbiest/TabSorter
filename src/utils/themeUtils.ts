export function initializeThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');

  // Apply the saved theme on initialization or default to dark mode
  const darkModeSetting = localStorage.getItem('dark-mode');
  if (darkModeSetting === 'true' || darkModeSetting === null) {
    document.body.classList.add('dark-mode');
  }

  themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    // Save the current theme setting
    localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode').toString());
  });
}
