# KALAP! — MVP 01

KALAP! adalah dopamine marketplace simulasi versi Indonesia. Tidak ada transaksi nyata.

## Struktur kategori

Setiap storefront benar-benar terpisah dan memiliki 100 item:

- Makanan: 100 menu Indonesia
- Pakaian: 100 produk
- Sepatu: 100 produk
- Tumbler: 100 produk

Keranjang disimpan terpisah per kategori. Item makanan tidak dapat tercampur dengan pakaian, sepatu, atau tumbler.

## Menjalankan lokal

Tidak memerlukan npm/build step. Jalankan HTTP server sederhana dari folder project, misalnya:

```bash
python3 -m http.server 8080
```

Buka `http://localhost:8080`.

## GitHub Pages

Repository menggunakan GitHub Actions untuk deployment Pages. Setelah Pages diaktifkan di Settings > Pages dengan Source = GitHub Actions, setiap push ke branch `main` akan memicu deployment otomatis melalui `.github/workflows/pages.yml`.

Target production URL:

`https://revisispace.github.io/kalap-id/`

Karena semua asset menggunakan relative paths dan tidak ada client-side route, project dapat berjalan langsung dari GitHub Pages project URL.

## Fitur MVP

- 4 storefront terpisah
- 100 item per storefront
- Search per storefront
- Load-more 20 item
- Cart terpisah per storefront
- Fake checkout
- Lifetime money saved via localStorage
- Responsive desktop/tablet/mobile
- Explicit simulation labels
