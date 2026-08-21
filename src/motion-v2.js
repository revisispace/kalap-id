(() => {
  let lastMarketplace = null
  let lastTrackerList = null

  function restartClass(node, className) {
    if (!node) return
    node.classList.remove(className)
    void node.offsetWidth
    node.classList.add(className)
  }

  function animateFreshContent() {
    const marketplace = document.querySelector('.marketplace')
    if (marketplace && marketplace !== lastMarketplace) {
      lastMarketplace = marketplace
      marketplace.classList.add('motion-enter')
      document.querySelector('.store-switcher-wrap')?.classList.add('motion-soft-enter')
    }

    const trackerList = document.querySelector('.panel-modal.order-panel:not(.order-detail) .tracker-list')
    if (trackerList && trackerList !== lastTrackerList) {
      lastTrackerList = trackerList
      trackerList.classList.add('motion-tab-enter')
    }
  }

  document.addEventListener('click', event => {
    const store = event.target.closest('[data-action="switch-store"]')
    if (store) {
      document.querySelector('.marketplace')?.classList.add('motion-leave')
      return
    }

    const trackerTab = event.target.closest('[data-action="tracker-tab"]')
    if (trackerTab) {
      const list = document.querySelector('.panel-modal.order-panel:not(.order-detail) .tracker-list')
      if (list) {
        list.classList.remove('motion-tab-enter')
        list.style.opacity = '.55'
        list.style.transform = 'translateX(5px)'
        list.style.transition = 'opacity 100ms ease, transform 100ms ease'
        window.setTimeout(() => {
          list.style.opacity = ''
          list.style.transform = ''
          list.style.transition = ''
        }, 120)
      }
      return
    }

    const bottomNav = event.target.closest('.kalap-bottom-nav [data-v2-nav]')
    if (bottomNav) {
      restartClass(bottomNav, 'motion-nav-tap')
    }
  }, true)

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(animateFreshContent)
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })
  animateFreshContent()
})()
