(() => {
  const icons = {
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.4 12 3.5l8.5 6.9"/><path d="M5.7 9.2v10.3h12.6V9.2"/><path d="M9.5 19.5v-5.3h5v5.3"/></svg>`,
    orders: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.2 7 7.8-3.5L19.8 7 12 10.6 4.2 7Z"/><path d="M4.2 7v9.8L12 20.5l7.8-3.7V7"/><path d="M12 10.6v9.9"/></svg>`,
    rewards: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.2h16v3.2H4z"/><path d="M5.7 12.4h12.6v8.1H5.7z"/><path d="M12 9.2v11.3"/><path d="M12 9.2c-2.4 0-4.7-1.3-4.7-3.1 0-1.3 1-2.2 2.2-2.2 1.8 0 2.5 2.1 2.5 5.3Z"/><path d="M12 9.2c2.4 0 4.7-1.3 4.7-3.1 0-1.3-1-2.2-2.2-2.2-1.8 0-2.5 2.1-2.5 5.3Z"/></svg>`,
    favorites: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 5.8c-2.1-2.1-5.6-1.8-7.4.6L12 7.5l-.8-1.1c-1.8-2.4-5.3-2.7-7.4-.6-2.3 2.3-2.1 6 .2 8.3 2.2 2.2 5 4.4 8 6.4 3-2 5.8-4.2 8-6.4 2.3-2.3 2.5-6 .2-8.3Z"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-4 3.4-6.1 7.2-6.1s6.3 2.1 7.2 6.1"/></svg>`,
  }

  const labels = {
    home: 'Home',
    orders: 'Pesanan',
    rewards: 'Rewards',
    favorites: 'Favorit',
    profile: 'Profil',
  }

  let active = 'home'

  function decorate() {
    const nav = document.querySelector('.kalap-bottom-nav.v2-bottom-nav')
    if (!nav) return false

    nav.querySelectorAll('[data-v2-nav]').forEach(button => {
      const key = button.dataset.v2Nav
      if (!icons[key]) return

      let shell = button.querySelector('.nav-icon-shell')
      if (!shell) {
        const badge = button.querySelector('b')
        button.querySelector(':scope > span')?.remove()
        button.querySelector(':scope > small')?.remove()
        shell = document.createElement('span')
        shell.className = 'nav-icon-shell'
        shell.innerHTML = icons[key]
        const label = document.createElement('small')
        label.className = 'nav-label'
        label.textContent = labels[key]
        button.insertBefore(shell, badge || null)
        button.insertBefore(label, badge || null)
      }

      button.classList.toggle('active', key === active)
      button.setAttribute('aria-current', key === active ? 'page' : 'false')
    })

    return true
  }

  function setActive(key) {
    if (!icons[key]) return
    active = key
    decorate()
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.kalap-bottom-nav [data-v2-nav]')
    if (!button) return
    setActive(button.dataset.v2Nav)
  }, true)

  window.addEventListener('scroll', () => {
    if (window.scrollY < 80 && !document.querySelector('#v2-overlay')) setActive('home')
  }, { passive: true })

  const observer = new MutationObserver(() => decorate())
  observer.observe(document.documentElement, { childList: true, subtree: true })

  if (!decorate()) {
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (decorate() || tries > 30) clearInterval(timer)
    }, 150)
  }
})()
