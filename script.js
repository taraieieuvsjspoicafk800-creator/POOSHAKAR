(() => {
  "use strict";

  // آدرس خام گیت‌هاب - همیشه از همینجا داده‌ی زنده خوانده می‌شود
  const DATA_BASE = "https://raw.githubusercontent.com/taraieieuvsjspoicafk800-creator/POOSHAKAR/main/data";

  const state = {
    config: null,
    products: [],
    activeCategory: "all",
    cart: JSON.parse(localStorage.getItem("cart") || "[]"),
  };

  const fmt = (n) => new Intl.NumberFormat("fa-IR").format(n) + " تومان";
  const $ = (id) => document.getElementById(id);

  async function loadData() {
    const [configRes, productsRes] = await Promise.all([
      fetch(`${DATA_BASE}/config.json?t=${Date.now()}`),
      fetch(`${DATA_BASE}/products.json?t=${Date.now()}`),
    ]);
    state.config = await configRes.json();
    state.products = await productsRes.json();
  }

  function applyConfig() {
    const c = state.config;
    document.title = `${c.siteName} | ${c.tagline}`;
    ["siteName", "footerSiteName"].forEach((id) => ($(id).textContent = c.siteName));
    $("footerTagline").textContent = c.tagline;
    $("phoneNumber").textContent = c.phone;
    $("phoneLink").href = "tel:" + c.phone.replace(/[^0-9+]/g, "");
    $("footerPhone").href = "tel:" + c.phone.replace(/[^0-9+]/g, "");
    $("footerPhone").textContent = "تماس: " + c.phone;
    $("footerTelegram").href = c.telegramChannel || "#";
    if (c.banner) {
      if (c.banner.headline) $("heroHeadline").textContent = c.banner.headline;
      if (c.banner.subtext) $("heroSubtext").textContent = c.banner.subtext;
      if (c.banner.image) {
        $("hero").style.backgroundImage =
          `linear-gradient(rgba(23,26,29,.72), rgba(23,26,29,.72)), url('${c.banner.image}')`;
        $("hero").style.backgroundSize = "cover";
        $("hero").style.backgroundPosition = "center";
      }
    }

    const catRow = $("catRow");
    (c.categories || []).forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "cat-chip";
      btn.dataset.cat = cat.id;
      btn.textContent = cat.label;
      btn.addEventListener("click", () => setCategory(cat.id));
      catRow.appendChild(btn);
    });
    catRow.querySelector('[data-cat="all"]').addEventListener("click", () => setCategory("all"));
  }

  function categoryLabel(id) {
    const found = (state.config.categories || []).find((c) => c.id === id);
    return found ? found.label : id;
  }

  function setCategory(id) {
    state.activeCategory = id;
    document.querySelectorAll(".cat-chip").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.cat === id);
    });
    renderProducts();
  }

  function renderProducts() {
    const grid = $("productGrid");
    const list = state.products.filter(
      (p) => state.activeCategory === "all" || p.category === state.activeCategory
    );
    grid.innerHTML = "";
    $("emptyState").hidden = state.products.length > 0;

    list.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product-card";
      const img = p.images && p.images[0]
        ? `<img src="${p.images[0]}" alt="${p.title}" loading="lazy">`
        : `<span class="initial">${p.title.trim().charAt(0)}</span>`;
      card.innerHTML = `
        <div class="accent-bar"></div>
        <div class="product-media">${img}</div>
        <div class="product-body">
          <span class="product-cat">${categoryLabel(p.category)}</span>
          <h3 class="product-title">${p.title}</h3>
          <span class="product-price">${fmt(p.price)}</span>
          <div class="product-actions">
            <button class="btn-outline" data-detail="${p.id}">جزئیات</button>
            <button class="btn-add" data-quickadd="${p.id}">افزودن</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-detail]").forEach((btn) =>
      btn.addEventListener("click", () => openDetail(btn.dataset.detail))
    );
    grid.querySelectorAll("[data-quickadd]").forEach((btn) =>
      btn.addEventListener("click", () => addToCart(btn.dataset.quickadd, null, null, 1))
    );
  }

  // ---------- Product detail ----------
  function openDetail(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    let selectedSize = p.sizes && p.sizes[0] ? p.sizes[0] : null;
    let selectedColor = p.colors && p.colors[0] ? p.colors[0] : null;

    const body = $("detailBody");
    const img = p.images && p.images[0]
      ? `<img src="${p.images[0]}" alt="${p.title}">`
      : `<span class="initial">${p.title.trim().charAt(0)}</span>`;

    body.innerHTML = `
      <div class="detail-media">${img}</div>
      <h3>${p.title}</h3>
      <p style="color:var(--text-muted)">${p.description || ""}</p>
      <p class="product-price">${fmt(p.price)}</p>
      ${p.sizes && p.sizes.length ? `<div><strong>سایز</strong><div class="detail-row" id="sizeRow"></div></div>` : ""}
      ${p.colors && p.colors.length ? `<div><strong>رنگ</strong><div class="detail-row" id="colorRow"></div></div>` : ""}
      <button class="btn btn-primary btn-block" id="detailAddBtn" style="margin-top:16px">افزودن به سبد</button>
    `;

    const renderChips = (rowId, values, selectedGetter, onPick) => {
      const row = $(rowId);
      if (!row) return;
      row.innerHTML = "";
      values.forEach((v) => {
        const chip = document.createElement("button");
        chip.className = "detail-chip" + (v === selectedGetter() ? " is-active" : "");
        chip.textContent = v;
        chip.addEventListener("click", () => {
          onPick(v);
          row.querySelectorAll(".detail-chip").forEach((c) => c.classList.remove("is-active"));
          chip.classList.add("is-active");
        });
        row.appendChild(chip);
      });
    };
    if (p.sizes && p.sizes.length) renderChips("sizeRow", p.sizes, () => selectedSize, (v) => (selectedSize = v));
    if (p.colors && p.colors.length) renderChips("colorRow", p.colors, () => selectedColor, (v) => (selectedColor = v));

    $("detailAddBtn").addEventListener("click", () => {
      addToCart(p.id, selectedSize, selectedColor, 1);
      $("detailOverlay").hidden = true;
    });

    $("detailOverlay").hidden = false;
  }
  $("detailClose").addEventListener("click", () => ($("detailOverlay").hidden = true));

  // ---------- Cart ----------
  function saveCart() {
    localStorage.setItem("cart", JSON.stringify(state.cart));
  }

  function addToCart(productId, size, color, qty) {
    const key = `${productId}__${size || ""}__${color || ""}`;
    const existing = state.cart.find((i) => i.key === key);
    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({ key, productId, size, color, qty });
    }
    saveCart();
    renderCart();
    openCart();
  }

  function renderCart() {
    const box = $("cartItems");
    box.innerHTML = "";
    let subtotal = 0;
    let count = 0;

    state.cart.forEach((item) => {
      const p = state.products.find((x) => x.id === item.productId);
      if (!p) return;
      subtotal += p.price * item.qty;
      count += item.qty;
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="cart-item-info">
          <div class="ci-title">${p.title}</div>
          <div class="ci-meta">${[item.size, item.color].filter(Boolean).join(" · ")}</div>
        </div>
        <div class="qty-controls">
          <button data-dec="${item.key}">−</button>
          <span>${item.qty}</span>
          <button data-inc="${item.key}">+</button>
        </div>`;
      box.appendChild(row);
    });

    box.querySelectorAll("[data-inc]").forEach((b) =>
      b.addEventListener("click", () => changeQty(b.dataset.inc, 1))
    );
    box.querySelectorAll("[data-dec]").forEach((b) =>
      b.addEventListener("click", () => changeQty(b.dataset.dec, -1))
    );

    $("cartCount").textContent = count;
    $("cartEmpty").hidden = state.cart.length > 0;
    $("cartSummary").hidden = state.cart.length === 0;

    if (state.cart.length) {
      const shipping = state.config.shippingCost || 0;
      $("cartSubtotal").textContent = fmt(subtotal);
      $("cartShipping").textContent = fmt(shipping);
      $("cartTotal").textContent = fmt(subtotal + shipping);
    }
  }

  function changeQty(key, delta) {
    const item = state.cart.find((i) => i.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((i) => i.key !== key);
    saveCart();
    renderCart();
  }

  function openCart() {
    $("cartDrawer").hidden = false;
    $("drawerBackdrop").hidden = false;
  }
  function closeCart() {
    $("cartDrawer").hidden = true;
    $("drawerBackdrop").hidden = true;
  }
  $("cartBtn").addEventListener("click", openCart);
  $("cartClose").addEventListener("click", closeCart);
  $("drawerBackdrop").addEventListener("click", closeCart);

  // ---------- Checkout via Telegram ----------
  async function checkout() {
    const btn = $("checkoutBtn");
    const items = state.cart.map((item) => {
      const p = state.products.find((x) => x.id === item.productId);
      return {
        id: p.id,
        title: p.title,
        price: p.price,
        size: item.size,
        color: item.color,
        qty: item.qty,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = state.config.shippingCost || 0;

    btn.textContent = "در حال اتصال…";
    btn.disabled = true;
    try {
      const res = await fetch(state.config.orderApiUrl + "/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, subtotal, shipping, total: subtotal + shipping }),
      });
      const data = await res.json();
      window.location.href = `https://t.me/${state.config.botUsername}?start=order_${data.code}`;
    } catch (err) {
      alert("ارتباط با سرور سفارش برقرار نشد. لطفاً دوباره تلاش کنید یا مستقیم با ما در تلگرام پیام بدهید.");
    } finally {
      btn.textContent = "تکمیل سفارش در تلگرام";
      btn.disabled = false;
    }
  }
  $("checkoutBtn").addEventListener("click", checkout);

  // ---------- Popup offer ----------
  function maybeShowPopup() {
    const offer = state.config.popupOffer;
    if (!offer || !offer.enabled) return;
    if (sessionStorage.getItem("offerSeen")) return;
    setTimeout(() => {
      $("popupTitle").textContent = offer.title || "";
      $("popupText").textContent = offer.text || "";
      if (offer.image) {
        $("popupImage").src = offer.image;
        $("popupImage").hidden = false;
      }
      $("popupOverlay").hidden = false;
      sessionStorage.setItem("offerSeen", "1");
    }, 1500);
  }
  $("popupClose").addEventListener("click", () => ($("popupOverlay").hidden = true));

  // ---------- Init ----------
  (async function init() {
    await loadData();
    applyConfig();
    renderProducts();
    renderCart();
    maybeShowPopup();
  })();
})();
