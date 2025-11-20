// ==========================
// Admin JS untuk Jualan Kue
// ==========================

// Load awal ketika halaman admin dibuka
window.addEventListener("DOMContentLoaded", () => {
    loadSiteConfig();
    loadProductList();
});

// =============================
// 1. SIMPAN PENGATURAN WEBSITE
// =============================
function saveSiteConfig(){
    const title = document.querySelector('#siteTitleInput').value.trim();
    const tag   = document.querySelector('#siteTagInput').value.trim();

    localStorage.setItem('siteTitle', title);
    localStorage.setItem('siteTag', tag);

    alert('Konfigurasi website berhasil disimpan!');
}

function loadSiteConfig(){
    document.querySelector('#siteTitleInput').value = localStorage.getItem('siteTitle') || '';
    document.querySelector('#siteTagInput').value   = localStorage.getItem('siteTag') || '';
}

// =============================
// 2. TAMBAH PRODUK BARU
// =============================
function addProduct(){
    const name  = document.querySelector('#prodName').value.trim();
    const price = document.querySelector('#prodPrice').value.trim();
    const file  = document.querySelector('#prodImg').files[0];

    if(!name || !price || !file){
        alert('Nama, harga, dan gambar wajib diisi');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e){
        const imgData = e.target.result;
        const products = JSON.parse(localStorage.getItem('products') || '[]');

        products.push({ name, price, img: imgData });
        localStorage.setItem('products', JSON.stringify(products));

        document.querySelector('#prodName').value = '';
        document.querySelector('#prodPrice').value = '';
        document.querySelector('#prodImg').value = '';

        loadProductList();
        alert('Produk berhasil ditambahkan!');
    };

    reader.readAsDataURL(file);
}

// ==================================
// 3. TAMPILKAN DAN HAPUS PRODUK
// ==================================
function loadProductList(){
    const list = JSON.parse(localStorage.getItem('products') || '[]');
    const box = document.querySelector('#productList');

    box.innerHTML = '';

    list.forEach((p, i) => {
        box.innerHTML += `
            <div class="product-item">
                <strong>${p.name}</strong><br>
                Harga: ${p.price}<br>
                <img src="${p.img}" style="width:80px;border-radius:6px;margin-top:5px;"><br>
                <button onclick="deleteProduct(${i})">Hapus Produk</button>
            </div>
        `;
    });
}

function deleteProduct(index){
    const list = JSON.parse(localStorage.getItem('products') || '[]');
    list.splice(index, 1);
    localStorage.setItem('products', JSON.stringify(list));
    loadProductList();
}
