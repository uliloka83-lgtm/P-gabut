// admin.js — final version
// - sync to save.php (POST JSON)
// - fallback to localStorage if server unreachable
// - CRUD products, slides, logo, site settings
// - image uploads -> dataURL (base64)
// - simple client-side admin password (gustiulil)

// ---------- Config ----------
const ADMIN_PASSWORD = "gustiulil";
const SAVE_ENDPOINT = "save.php"; // server endpoint (PHP) that writes data/data.json
const DATA_JSON_URL = "data/data.json"; // used to load server data initially

// ---------- Utils ----------
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const nowTs = () => Date.now();

// safe JSON parse
function jparse(str, fallback = null) {
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

// ---------- Server sync ----------
async function postData(payload) {
  try {
    const res = await fetch(SAVE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    if (!res.ok) throw new Error("server returned " + res.status);
    return true;
  } catch (e) {
    console.warn("Save to server failed, saving to localStorage instead:", e);
    localStorage.setItem("site_data", JSON.stringify(payload));
    return false;
  }
}

// ---------- Local fallback ----------
function readLocalData() {
  return jparse(localStorage.getItem("site_data") || "null", null);
}

// ---------- Data model helpers ----------
function getProducts() { return jparse(localStorage.getItem("products") || "[]", []); }
function setProducts(list) { localStorage.setItem("products", JSON.stringify(list)); }

function getSlides() { return jparse(localStorage.getItem("tk_slides") || "[]", []); }
function setSlides(list) { localStorage.setItem("tk_slides", JSON.stringify(list)); }

// ---------- Data from UI ----------
function dataFromInputs() {
  const site = {
    title: qs("#siteTitleInput").value.trim(),
    tagline: qs("#siteTagInput").value.trim(),
    logo: qs("#logoPreview").src || ""
  };
  const hero = {
    headline: qs("#heroHeadlineInput").value.trim(),
    sub: qs("#heroSubInput").value.trim()
  };
  const contact = {
    phone: qs("#contactPhoneInput").value.trim(),
    email: qs("#contactEmailInput").value.trim()
  };
  const about = qs("#aboutInput").value.trim();
  const slides = getSlides();
  const products = getProducts();
  return { site, hero, contact, about, slides, products };
}

// ---------- Save all (server, fallback) ----------
async function saveAll() {
  const payload = dataFromInputs();
  const ok = await postData(payload);
  alert(ok ? "Berhasil disimpan ke server." : "Server tidak terjangkau — perubahan disimpan di localStorage.");
  // also update preview iframe
  refreshPreview();
}

// ---------- Apply loaded data to UI (admin inputs) ----------
function applyToUI(d) {
  if (!d) return;
  qs("#siteTitleInput").value = d.site?.title || "";
  qs("#siteTagInput").value = d.site?.tagline || "";
  if (d.site?.logo) {
    qs("#logoPreview").src = d.site.logo;
    qs("#logoPreview").style.display = "block";
  }
  qs("#heroHeadlineInput").value = d.hero?.headline || "";
  qs("#heroSubInput").value = d.hero?.sub || "";
  qs("#contactPhoneInput").value = d.contact?.phone || "";
  qs("#contactEmailInput").value = d.contact?.email || "";
  qs("#aboutInput").value = d.about || "";
  // store server products/slides into localStorage so UI rendering reuses them
  if (Array.isArray(d.products)) setProducts(d.products);
  if (Array.isArray(d.slides)) setSlides(d.slides);
  renderProdList();
  renderSlides();
}

// ---------- Initial load: try server data.json first, then fallback to localStorage ----------
async function init() {
  // simple password prompt to protect admin (client-side)
  const pw = prompt("Masukkan password admin:");
  if (pw === null) {
    // user cancelled -> do nothing (block further actions)
    alert("Akses admin dibatalkan.");
    disableAdminUI();
    return;
  }
  if (pw.trim() !== ADMIN_PASSWORD) {
    alert("Password salah — akses diblokir.");
    disableAdminUI();
    return;
  }

  // try fetch server data.json
  try {
    const res = await fetch(DATA_JSON_URL + "?t=" + nowTs(), {cache: "no-store"});
    if (res.ok) {
      const d = await res.json();
      applyToUI(d);
    } else {
      throw new Error("no data.json on server");
    }
  } catch (e) {
    console.warn("Fetching data.json failed:", e);
    const local = readLocalData();
    if (local) {
      applyToUI(local);
    } else {
      // nothing: leave inputs blank, but still try to render from local products/slides
      renderProdList();
      renderSlides();
    }
  }
}

// disable UI interactions (when no password)
function disableAdminUI() {
  qsa("input,textarea,button").forEach(el => el.setAttribute("disabled", "disabled"));
}

// ---------- Logo upload handler ----------
qs("#logoInput")?.addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    qs("#logoPreview").src = r.result;
    qs("#logoPreview").style.display = "block";
  };
  r.readAsDataURL(f);
});

// ---------- Products: add / render / delete / edit ----------
function renderProdList() {
  const list = getProducts();
  const box = qs("#prodList");
  if (!box) return;
  box.innerHTML = "";
  list.forEach((p, i) => {
    const el = document.createElement("div");
    el.style.display = "flex";
    el.style.gap = "8px";
    el.style.alignItems = "center";
    el.style.marginBottom = "8px";
    el.innerHTML = `
      <img src="${p.img || ""}" style="width:64px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #eee">
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(p.name || "")}</div>
        <div class="muted">${escapeHtml(p.price || "")}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" style="background:#1e88e5;color:#fff" onclick="openEditProd(${i})">Edit</button>
        <button class="btn" style="background:#e53935;color:#fff" onclick="delProd(${i})">Hapus</button>
      </div>
    `;
    box.appendChild(el);
  });
}

// helper to escape HTML
function escapeHtml(s) { if (!s) return ""; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

// open edit UI inline
window.openEditProd = function(i) {
  const list = getProducts();
  const p = list[i];
  const editBox = document.createElement("div");
  editBox.style.border = "1px solid #eef2ff";
  editBox.style.padding = "8px";
  editBox.style.borderRadius = "8px";
  editBox.style.marginTop = "8px";
  editBox.innerHTML = `
    <input type="text" id="e_name_${i}" value="${escapeHtml(p.name)}" placeholder="Nama" style="width:100%;margin-bottom:6px">
    <input type="text" id="e_price_${i}" value="${escapeHtml(p.price)}" placeholder="Harga" style="width:100%;margin-bottom:6px">
    <input type="file" id="e_img_${i}" accept="image/*" style="width:100%;margin-bottom:6px">
    <div style="display:flex;gap:8px">
      <button class="btn" onclick="saveEditProd(${i})">Simpan</button>
      <button class="btn ghost" onclick=\"this.closest('div').remove();\">Batal</button>
    </div>
  `;
  const box = qs("#prodList");
  // insert after product i: find the ith child and insert after
  const child = box.children[i];
  if (child) {
    child.after(editBox);
  } else {
    box.appendChild(editBox);
  }
};

window.saveEditProd = function(i) {
  const name = qs("#e_name_" + i).value.trim();
  const price = qs("#e_price_" + i).value.trim();
  const file = qs("#e_img_" + i).files[0];
  const list = getProducts();
  function apply(imgData) {
    list[i].name = name;
    list[i].price = price;
    if (imgData) list[i].img = imgData;
    setProducts(list);
    renderProdList();
    alert("Produk diperbarui");
  }
  if (file) {
    const r = new FileReader();
    r.onload = () => apply(r.result);
    r.readAsDataURL(file);
  } else {
    apply();
  }
};

function delProd(i) {
  if (!confirm("Hapus produk ini?")) return;
  const list = getProducts();
  list.splice(i, 1);
  setProducts(list);
  renderProdList();
}

// add new product from right-side fields
qs("#addProdBtn")?.addEventListener("click", () => {
  const name = qs("#prodName").value.trim();
  const price = qs("#prodPrice").value.trim();
  const file = qs("#prodImg").files[0];
  if (!name || !price) return alert("Isi nama dan harga produk");
  if (file) {
    const r = new FileReader();
    r.onload = () => {
      const arr = getProducts();
      arr.push({ name, price, img: r.result });
      setProducts(arr);
      renderProdList();
      qs("#prodName").value = "";
      qs("#prodPrice").value = "";
      qs("#prodImg").value = null;
      alert("Produk ditambahkan");
    };
    r.readAsDataURL(file);
  } else {
    const arr = getProducts();
    arr.push({ name, price, img: "" });
    setProducts(arr);
    renderProdList();
  }
});

// ---------- Slides: add / render / delete ----------
function renderSlides() {
  const arr = getSlides();
  const row = qs("#slideThumbs");
  if (!row) return;
  row.innerHTML = "";
  arr.forEach((s, i) => {
    const wrap = document.createElement("div");
    wrap.style.display = "inline-block";
    wrap.style.margin = "4px";
    wrap.style.textAlign = "center";
    wrap.innerHTML = `
      <img src="${s}" style="width:120px;height:80px;object-fit:cover;border-radius:6px;display:block;margin-bottom:6px">
      <div style="display:flex;gap:6px;justify-content:center">
        <button class="btn ghost" onclick="moveSlideUp(${i})">↑</button>
        <button class="btn ghost" onclick="moveSlideDown(${i})">↓</button>
        <button class="btn" style="background:#e53935" onclick="delSlide(${i})">Hapus</button>
      </div>
    `;
    row.appendChild(wrap);
  });
}
window.moveSlideUp = function(i) {
  const arr = getSlides();
  if (i === 0) return;
  arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
  setSlides(arr);
  renderSlides();
};
window.moveSlideDown = function(i) {
  const arr = getSlides();
  if (i === arr.length - 1) return;
  arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
  setSlides(arr);
  renderSlides();
};
window.delSlide = function(i) {
  if (!confirm("Hapus slide?")) return;
  const arr = getSlides();
  arr.splice(i, 1);
  setSlides(arr);
  renderSlides();
};

// add slide
qs("#addSlideBtn")?.addEventListener("click", () => {
  const f = qs("#slideInput").files[0];
  if (!f) return alert("Pilih gambar slide terlebih dahulu");
  const r = new FileReader();
  r.onload = () => {
    const arr = getSlides();
    arr.push(r.result);
    setSlides(arr);
    renderSlides();
    qs("#slideInput").value = null;
    alert("Slide ditambahkan");
  };
  r.readAsDataURL(f);
});

// ---------- Render helpers on startup ----------
renderProdList();
renderSlides();

// ---------- Preview iframe ----------
function refreshPreview() {
  const frame = qs("#previewFrame");
  if (!frame) {
    // fallback: open index in new tab
    window.open("index.html?ts=" + nowTs(), "_blank");
    return;
  }
  frame.src = "index.html?ts=" + nowTs();
}
qs("#refreshPreview")?.addEventListener("click", refreshPreview);

// ---------- Save button ----------
qs("#saveBtn")?.addEventListener("click", saveAll);

// ---------- Utility: render server data into localStorage (called from init apply) ----------
function renderProdList() { // ensure defined before init; it was previously declared above; to avoid duplication check: if exists skip
  // function already declared above; this placeholder exists to ensure linter compatibility
}

// ---------- Initialize ----------
init();
