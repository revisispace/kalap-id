import { catalog, storefronts } from './data/catalog-v12.js'

(() => {
  const META_KEY = 'kalap-v2-meta'
  const CUSTOM_KEY = 'kalap-v2-customizations'
  let bypassCoreAdd = false
  let activeDetail = null
  let quantity = 1

  const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  })

  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') }
    catch { return {} }
  }

  function writeMeta(meta) { localStorage.setItem(META_KEY, JSON.stringify(meta)) }

  function readCustom() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}') }
    catch { return {} }
  }

  function writeCustom(value) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(value)) }

  function allProducts() {
    return storefronts.flatMap(store => (catalog[store.key] || []).map(product => ({ ...product, store: store.key })))
  }

  const productIndex = new Map(allProducts().map(product => [`${product.store}:${product.id}`, product]))

  function getProduct(store, id) {
    return productIndex.get(`${store}:${id}`) || (catalog[store] || []).find(product => product.id === id)
  }

  function activeStore() {
    return document.querySelector('.store-tab.active')?.dataset.store || 'makanan'
  }

  function productFromCard(card) {
    const button = card?.querySelector('[data-action="add"][data-id]')
    if (!button) return null
    const store = activeStore()
    const product = getProduct(store, button.dataset.id)
    return product ? { ...product, store } : null
  }

  function storeInfo(key) {
    return storefronts.find(store => store.key === key) || { key, label:key, icon:'🛍️' }
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#039;')
  }

  function hash(text) {
    return [...String(text)].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 7)
  }

  function brandOf(product) {
    if (product.brand) return product.brand
    if (product.store === 'makanan') return 'KALAP Kitchen'
    const known = ['Nike','adidas','PUMA','UNIQLO','Levi\'s','The North Face','Patagonia','Carhartt','Polo','Lacoste','ASICS','New Balance','HOKA','On','Converse','Vans','Salomon','Stanley','YETI','Hydro Flask','Owala','KINTO','Zojirushi','Thermos','LocknLock','TYESO','Starbucks','Herschel','Fjallraven','JanSport','Eastpak','Coach','Longchamp','Michael Kors','Samsung','Apple','Xiaomi','Redmi','POCO']
    return known.find(name => product.name.startsWith(name)) || product.name.split(' ')[0]
  }

  function productFacts(product) {
    const seed = hash(product.id)
    const sold = 120 + (seed % 9400)
    const stock = 8 + (seed % 43)
    return { sold, stock }
  }

  function optionConfig(product) {
    if (product.store === 'makanan') return [
      { key:'spice', label:'Level pedas', type:'chips', values:['Tidak pedas','Sedang','Pedas','Extra pedas'], default:'Sedang' },
      { key:'utensils', label:'Alat makan', type:'chips', values:['Tidak perlu','Ya, sertakan'], default:'Tidak perlu' },
      { key:'note', label:'Catatan untuk restoran', type:'text', placeholder:'Contoh: sambal dipisah, jangan pakai bawang...' },
    ]
    if (product.store === 'pakaian') return [
      { key:'size', label:'Ukuran', type:'chips', values:['S','M','L','XL'], default:'M', required:true },
      { key:'fit', label:'Fit', type:'chips', values:['Regular','Relaxed','Oversized'], default:'Regular' },
    ]
    if (product.store === 'sepatu') return [
      { key:'size', label:'Ukuran EU', type:'chips', values:['38','39','40','41','42','43','44'], default:'41', required:true },
      { key:'box', label:'Packaging', type:'chips', values:['Standard box','Eco packaging'], default:'Standard box' },
    ]
    if (product.store === 'tumbler') return [
      { key:'lid', label:'Tipe tutup', type:'chips', values:['Standard','Straw','Flip'], default:'Standard' },
      { key:'engraving', label:'Nama pada tumbler', type:'text', placeholder:'Opsional, maks. 16 karakter', maxLength:16 },
    ]
    if (product.store === 'tas') return [
      { key:'carry', label:'Cara pakai', type:'chips', values:['Standard','Crossbody','Shoulder'], default:'Standard' },
      { key:'gift', label:'Packaging', type:'chips', values:['Regular','Gift wrap'], default:'Regular' },
    ]
    if (product.store === 'hp') return [
      { key:'setup', label:'Setup awal', type:'chips', values:['Standard','Transfer data','Siap pakai'], default:'Standard' },
      { key:'sim', label:'Preferensi SIM', type:'chips', values:['Physical SIM','eSIM jika tersedia'], default:'Physical SIM' },
    ]
    return []
  }

  function descriptionFor(product) {
    const brand = brandOf(product)
    const info = storeInfo(product.store)
    if (product.store === 'makanan') return `${product.name} dari ${brand}, disiapkan setelah pesanan dibuat. Kamu bisa atur level pedas, alat makan, dan catatan sebelum masuk keranjang.`
    if (product.store === 'hp') return `${product.name} dari ${brand}. Pilih preferensi setup sebelum masuk keranjang. Gambar produk bisa dibuka terpisah untuk melihat referensi visual lebih lengkap.`
    return `${product.name} dari ${brand} di kategori ${info.label}. Pilih opsi yang sesuai sebelum menambahkan produk ke keranjang.`
  }

  function existingSelections(product) {
    const saved = readCustom()[`${product.store}:${product.id}`]
    return saved?.selections || {}
  }

  function renderOption(option, selections) {
    if (option.type === 'text') {
      return `<label class="pd-option pd-text-option"><span>${esc(option.label)}</span><input data-pd-input="${option.key}" type="text" value="${esc(selections[option.key] || '')}" placeholder="${esc(option.placeholder || '')}" ${option.maxLength ? `maxlength="${option.maxLength}"` : ''}></label>`
    }
    const selected = selections[option.key] || option.default || option.values[0]
    return `<div class="pd-option"><div class="pd-option-label"><span>${esc(option.label)}</span>${option.required ? '<small>Wajib</small>' : ''}</div><div class="pd-chips">${option.values.map(value => `<button type="button" data-pd-chip="${option.key}" data-value="${esc(value)}" class="${selected === value ? 'active' : ''}">${esc(value)}</button>`).join('')}</div></div>`
  }

  function isFavorite(product) {
    const meta = readMeta()
    return Array.isArray(meta.favorites) && meta.favorites.some(item => item.id === product.id && item.store === product.store)
  }

  function syncFavoriteBadgeCount() {
    const meta = readMeta()
    const count = Array.isArray(meta.favorites) ? meta.favorites.length : 0
    document.querySelectorAll('[data-fav-count]').forEach(node => {
      node.hidden = count === 0
      node.textContent = Math.min(99, count)
    })
  }

  function toggleFavorite(product) {
    const card = [...document.querySelectorAll('.product-card')].find(card => {
      const add = card.querySelector('[data-action="add"]')
      return add?.dataset.id === product.id
    })
    const existingHeart = card?.querySelector('.favorite-button')
    if (existingHeart && existingHeart.dataset.pdOwned !== 'true') {
      existingHeart.click()
      setTimeout(() => updateDetailFavorite(product), 50)
      return
    }

    const meta = readMeta()
    const favorites = Array.isArray(meta.favorites) ? meta.favorites : []
    const index = favorites.findIndex(item => item.id === product.id && item.store === product.store)
    if (index >= 0) favorites.splice(index, 1)
    else favorites.unshift({ id:product.id, store:product.store, name:product.name, price:currency.format(product.price), image:product.image })
    meta.favorites = favorites.slice(0,100)
    writeMeta(meta)
    syncFavoriteButtons()
    updateDetailFavorite(product)
  }

  function updateDetailFavorite(product) {
    const button = document.querySelector('[data-pd-favorite]')
    if (!button) return
    const active = isFavorite(product)
    button.classList.toggle('active', active)
    button.innerHTML = active ? '♥ <span>Tersimpan</span>' : '♡ <span>Favorit</span>'
    syncFavoriteBadgeCount()
  }

  function openDetail(product) {
    if (!product) return
    closeDetail()
    activeDetail = product
    quantity = 1
    const facts = productFacts(product)
    const selections = existingSelections(product)
    const options = optionConfig(product)
    const info = storeInfo(product.store)

    const overlay = document.createElement('div')
    overlay.id = 'product-detail-overlay'
    overlay.className = `product-detail-overlay ${product.store === 'makanan' ? 'food' : 'goods'}`
    overlay.innerHTML = `<section class="product-detail-sheet" role="dialog" aria-modal="true" aria-label="Detail ${esc(product.name)}">
      <div class="pd-drag"></div>
      <header class="pd-header"><button type="button" data-pd-close aria-label="Tutup">←</button><strong>Detail Produk</strong><button type="button" data-pd-favorite>♡ <span>Favorit</span></button></header>
      <div class="pd-scroll">
        <a class="pd-image" href="${product.imageSearch}" target="_blank" rel="noopener noreferrer" title="Buka gambar ${esc(product.name)}"><img src="${product.image}" alt="${esc(product.name)}" referrerpolicy="no-referrer"><span>↗ Lihat gambar</span></a>
        <section class="pd-main-info"><div class="pd-breadcrumb">${info.icon} ${esc(info.label)} · ${esc(brandOf(product))}</div><h1>${esc(product.name)}</h1><div class="pd-price">${currency.format(product.price)}</div><div class="pd-stats"><span>★ ${product.rating}</span><span>${Number(product.reviewCount).toLocaleString('id-ID')} ulasan</span><span>${facts.sold.toLocaleString('id-ID')} terjual</span></div><div class="pd-stock">✓ Tersedia · ${facts.stock} stok</div></section>
        <section class="pd-section"><div class="pd-section-head"><h2>Detail produk</h2></div><p class="pd-description">${esc(descriptionFor(product))}</p></section>
        ${options.length ? `<section class="pd-section pd-customize"><div class="pd-section-head"><h2>Kustomisasi</h2><small>Pilih sebelum masuk keranjang</small></div>${options.map(option => renderOption(option,selections)).join('')}</section>` : ''}
      </div>
      <footer class="pd-footer"><div class="pd-qty"><button type="button" data-pd-qty="-1">−</button><strong data-pd-qty-value>1</strong><button type="button" data-pd-qty="1">+</button></div><button type="button" class="pd-add" data-pd-add><span>Tambah ke Keranjang</span><b>${currency.format(product.price)}</b></button></footer>
    </section>`

    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-pd-close]')) { closeDetail(); return }
      const fav = event.target.closest('[data-pd-favorite]')
      if (fav) { toggleFavorite(product); return }
      const chip = event.target.closest('[data-pd-chip]')
      if (chip) {
        overlay.querySelectorAll(`[data-pd-chip="${CSS.escape(chip.dataset.pdChip)}"]`).forEach(node => node.classList.remove('active'))
        chip.classList.add('active')
        return
      }
      const qty = event.target.closest('[data-pd-qty]')
      if (qty) {
        quantity = Math.max(1, Math.min(9, quantity + Number(qty.dataset.pdQty)))
        overlay.querySelector('[data-pd-qty-value]').textContent = quantity
        overlay.querySelector('.pd-add b').textContent = currency.format(product.price * quantity)
        return
      }
      if (event.target.closest('[data-pd-add]')) addCustomizedToCart(product, overlay)
    })

    document.body.appendChild(overlay)
    document.body.classList.add('product-detail-open')
    updateDetailFavorite(product)
  }

  function collectSelections(product, overlay) {
    const result = {}
    optionConfig(product).forEach(option => {
      if (option.type === 'chips') result[option.key] = overlay.querySelector(`[data-pd-chip="${CSS.escape(option.key)}"].active`)?.dataset.value || option.default || option.values[0]
      else result[option.key] = overlay.querySelector(`[data-pd-input="${CSS.escape(option.key)}"]`)?.value?.trim() || ''
    })
    return result
  }

  function selectionSummary(product, selections) {
    const labels = Object.entries(selections).filter(([,value]) => value).map(([,value]) => value)
    return labels.join(' · ')
  }

  function saveSelections(product, selections) {
    const custom = readCustom()
    custom[`${product.store}:${product.id}`] = { selections, summary:selectionSummary(product,selections), updatedAt:Date.now() }
    writeCustom(custom)
  }

  function addCustomizedToCart(product, overlay) {
    const selections = collectSelections(product, overlay)
    saveSelections(product, selections)
    const card = [...document.querySelectorAll('.product-card')].find(card => card.querySelector('[data-action="add"]')?.dataset.id === product.id)
    const add = card?.querySelector('[data-action="add"]')
    if (!add) return
    closeDetail()
    bypassCoreAdd = true
    for (let i = 0; i < quantity; i += 1) add.click()
    bypassCoreAdd = false
    setTimeout(() => {
      syncFavoriteButtons()
      annotateCart()
    }, 80)
  }

  function closeDetail() {
    document.querySelector('#product-detail-overlay')?.remove()
    document.body.classList.remove('product-detail-open')
    activeDetail = null
  }

  function addMissingHeart(card) {
    const product = productFromCard(card)
    if (!product || card.querySelector('.favorite-button')) return
    const heart = document.createElement('button')
    heart.type = 'button'
    heart.className = 'favorite-button'
    heart.dataset.pdOwned = 'true'
    heart.setAttribute('aria-label','Simpan ke Favorit')
    heart.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation()
      toggleFavorite(product)
    })
    card.querySelector('.product-image-wrap')?.appendChild(heart)
  }

  function syncFavoriteButtons() {
    const meta = readMeta()
    const favorites = Array.isArray(meta.favorites) ? meta.favorites : []
    document.querySelectorAll('.product-card').forEach(card => {
      addMissingHeart(card)
      const product = productFromCard(card)
      const heart = card.querySelector('.favorite-button')
      if (!product || !heart) return
      const active = favorites.some(item => item.id === product.id && (!item.store || item.store === product.store))
      heart.classList.toggle('active', active)
      heart.textContent = active ? '♥' : '♡'
    })
    syncFavoriteBadgeCount()
  }

  function annotateCart() {
    const custom = readCustom()
    document.querySelectorAll('.cart-line').forEach(line => {
      const id = line.querySelector('[data-action="qty"][data-id]')?.dataset.id
      if (!id || line.querySelector('.cart-custom-summary')) return
      const entry = custom[`${activeStore()}:${id}`]
      if (!entry?.summary) return
      const summary = document.createElement('small')
      summary.className = 'cart-custom-summary'
      summary.textContent = entry.summary
      line.querySelector('.line-copy')?.appendChild(summary)
    })
  }

  document.addEventListener('click', event => {
    if (bypassCoreAdd) return
    const add = event.target.closest('.product-card [data-action="add"]')
    if (add) {
      const card = add.closest('.product-card')
      const product = productFromCard(card)
      if (product) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation()
        openDetail(product)
      }
      return
    }

    const card = event.target.closest('.product-card')
    if (!card) return
    if (event.target.closest('.product-image-wrap a, .favorite-button, button, input, select, textarea')) return
    const product = productFromCard(card)
    if (product) {
      event.preventDefault()
      openDetail(product)
    }
  }, true)

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelector('#product-detail-overlay')) closeDetail()
  })

  setInterval(() => {
    syncFavoriteButtons()
    annotateCart()
  }, 650)

  syncFavoriteButtons()
})()
