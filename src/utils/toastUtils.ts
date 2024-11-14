function getUndoShortcut() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘Z' : 'Ctrl+Z';
}

export function showToast(message: string, undo = false) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  message = undo ? `${message} Press ${getUndoShortcut()} to undo.` : message;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Position the toast above the previous ones
  const existingToasts = document.querySelectorAll('.toast');
  const offset = (existingToasts.length - 1) * 50 + 30;
  toast.style.bottom = `${offset}px`;

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
      // Adjust the position of remaining toasts
      const remainingToasts = document.querySelectorAll('.toast');
      remainingToasts.forEach((t, index) => {
        (t as HTMLElement).style.bottom = `${index * 50 + 30}px`;
      });
    }, 300);
  }, 3000);
}
