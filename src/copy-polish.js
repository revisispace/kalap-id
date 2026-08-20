(() => {
  const replacements = [
    ['Pakai duit bohongan.', 'Belanja sepuasnya.'],
    ['Checkout ini hanya mengurangi saldo simulasi di device ini.', 'Pembayaran akan langsung memotong saldo KALAP Wallet kamu.'],
    ['Transaksi imajiner sedang diproses.', 'Pesananmu sedang diproses.'],
    ['Saldo bohongan sukses dibakar.', 'Pesanan berhasil dibuat.'],
    ['Pesanan Simulasi', 'Pesanan Kamu'],
    ['Pesanan simulasi masuk ke restoran', 'Pesanan masuk ke restoran'],
    ['Pesanan simulasi sedang dimasak', 'Makanan sedang disiapkan'],
    ['Driver simulasi menuju titik pickup', 'Driver menuju titik pickup'],
    ['Driver simulasi sedang menuju alamatmu', 'Driver sedang menuju alamatmu'],
    ['Makanan simulasi sudah sampai', 'Pesanan sudah sampai'],
    ['Checkout simulasi berhasil', 'Pembayaran berhasil'],
    ['Paket simulasi sudah dibungkus', 'Paket sudah dikemas'],
    ['Kurir simulasi menerima paket', 'Kurir menerima paket'],
    ['Paket simulasi sedang diproses', 'Paket sedang diproses di pusat sortir'],
    ['Kurir simulasi sedang mengantar', 'Kurir sedang mengantar pesananmu'],
    ['Paket simulasi sudah sampai', 'Paket sudah diterima'],
    ['Fake checkout dulu, lalu statusnya akan muncul di sini.', 'Checkout dulu, lalu status pesanan akan muncul di sini.'],
    ['Belum ada fake checkout.', 'Belum ada checkout.'],
    ['50 fake checkout terakhir di device ini.', '50 checkout terakhir di device ini.'],
    ['Fake checkout pertama', 'Checkout pertama'],
    ['Peta simulasi · bukan lokasi nyata', 'Perjalanan pesanan'],
    ['Alur dibuat seperti tracker layanan food-delivery: restoran → driver → perjalanan → tiba.', 'Status pesanan: restoran → driver → perjalanan → tiba.'],
    ['Alur dibuat seperti tracker marketplace: diproses → dikemas → kurir → sortir → diterima.', 'Status paket: diproses → dikemas → kurir → sortir → diterima.'],
    ['Semua status sepenuhnya simulasi dan hanya tersimpan di device ini.', 'Status diperbarui otomatis dan tersimpan di device ini.'],
    ['Semua saldo, streak, badge, tracker, dan riwayat tersimpan hanya di localStorage device ini.', 'Saldo, streak, badge, pesanan, dan riwayat tersimpan otomatis di device ini.'],
    ['SIMULASI', 'READY'],
  ]

  function polishText(text) {
    let next = text
    for (const [from, to] of replacements) next = next.split(from).join(to)
    return next
  }

  function polish(root = document.body) {
    if (!root) return
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    nodes.forEach(node => {
      const next = polishText(node.nodeValue || '')
      if (next !== node.nodeValue) node.nodeValue = next
    })

    document.querySelectorAll('[title],[aria-label]').forEach(element => {
      for (const attr of ['title', 'aria-label']) {
        if (!element.hasAttribute(attr)) continue
        const current = element.getAttribute(attr) || ''
        const next = polishText(current)
        if (next !== current) element.setAttribute(attr, next)
      }
    })
  }

  let queued = false
  const queuePolish = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      polish()
    })
  }

  const observer = new MutationObserver(queuePolish)
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queuePolish, { once: true })
  } else {
    queuePolish()
  }
})()
