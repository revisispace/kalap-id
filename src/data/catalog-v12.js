import { catalog as baseCatalog, storefronts as baseStorefronts } from './catalog.js?base=1'
import { phoneCatalog, phoneStorefront } from './phones.js'

export const catalog = {
  ...baseCatalog,
  hp: phoneCatalog,
}

export const storefronts = [
  ...baseStorefronts,
  phoneStorefront,
]
