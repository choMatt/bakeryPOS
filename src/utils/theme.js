export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
    root.style.colorScheme = 'light'
  } else {
    root.removeAttribute('data-theme')
    root.style.colorScheme = 'light dark'
  }

  try {
    localStorage.setItem('bakerypos_theme', theme || 'system')
  } catch {
    // Ignore storage errors (e.g. private browsing or disabled storage)
  }
}

export function getInitialTheme() {
  try {
    return localStorage.getItem('bakerypos_theme') || 'system'
  } catch {
    return 'system'
  }
}
