(() => {
  "use strict";

  const data = Array.isArray(window.DUOMO_DATA) ? window.DUOMO_DATA : [];
  const meta = window.DUOMO_META || {};
  const config = window.PREORDER_CONFIG || {};
  const STORAGE_KEY = "duomo_preorder_cart_v2";
  const fmt = new Intl.NumberFormat("ko-KR");
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    search: $("#search"),
    clear: $("#clearSearch"),
    brand: $("#brandFilter"),
    type: $("#typeFilter"),
    stock: $("#stockFilter"),
    sheet: $("#sheetFilter"),
    results: $("#results"),
    empty: $("#empty"),
    shown: $("#shownCount"),
    available: $("#availableCount"),
    selected: $("#selectedCount"),
    updated: $("#updated"),
    detailDialog: $("#detailDialog"),
    dialogBody: $("#dialogBody"),
    guideDialog: $("#guideDialog"),
    cartDialog: $("#cartDialog"),
    cartStep: $("#cartStep"),
    formStep: $("#formStep"),
    successStep: $("#successStep"),
    cartItems: $("#cartItems"),
    cartEmpty: $("#cartEmpty"),
    cartCount: $("#cartCount"),
    cartTotalQty: $("#cartTotalQty"),
    cartTotalPrice: $("#cartTotalPrice"),
    formSummary: $("#formOrderSummary"),
    form: $("#preorderForm"),
    deliveryFields: $("#deliveryFields"),
    formError: $("#formError"),
    submitBtn: $("#submitBtn"),
    successRequestId: $("#successRequestId"),
    top: $("#topBtn"),
    toast: $("#toast"),
    mobileBar: $("#mobileCartBar"),
    mobileCount: $("#mobileCartCount")
  };

  let cart = loadCart();
  let toastTimer;

  function text(value) {
    return (value ?? "").toString();
  }

  function escapeHTML(value) {
    return text(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[char]);
  }

  function itemKey(item) {
    return text(item.id || item.code || `${item.brand}-${item.product}-${item.option}`);
  }

  function findItem(id) {
    return data.find((item) => itemKey(item) === text(id));
  }

  function loadCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function persistCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartUI();
  }

  function unique(key) {
    return [...new Set(data.map((item) => text(item[key]).trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ko"));
  }

  function fillSelect(element, values) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      element.appendChild(option);
    });
  }

  function stockStatus(item) {
    if (typeof item.stock === "number") {
      if (item.stock <= 0) return { key: "out", label: "품절", detail: "현재 신청 불가", available: false };
      if (item.stock <= 5) return { key: "low", label: `${fmt.format(item.stock)}개`, detail: `가용 재고 ${fmt.format(item.stock)}개`, available: true };
      return { key: "in", label: `${fmt.format(item.stock)}개`, detail: `가용 재고 ${fmt.format(item.stock)}개`, available: true };
    }
    if (item.stockText) return { key: "unknown", label: item.stockText, detail: item.stockText, available: true };
    return { key: "unknown", label: "확인 필요", detail: "재고 확인 필요", available: true };
  }

  function money(item) {
    if (typeof item.price === "number") return `${fmt.format(item.price)}원`;
    return item.priceText || "가격 확인 필요";
  }

  function numericPrice(item) {
    return typeof item.price === "number" && Number.isFinite(item.price) ? item.price : 0;
  }

  function searchable(item) {
    return [
      item.brand, item.type, item.product, item.option, item.code, item.size,
      item.sheet, item.remarks, item.arrival, item.category
    ].join(" ").toLowerCase();
  }

  function filtered() {
    const query = els.search.value.trim().toLowerCase();
    const brand = els.brand.value;
    const type = els.type.value;
    const stock = els.stock.value;
    const sheet = els.sheet.value;

    return data.filter((item) => {
      const status = stockStatus(item);
      if (query && !searchable(item).includes(query)) return false;
      if (brand && item.brand !== brand) return false;
      if (type && item.type !== type) return false;
      if (sheet && item.sheet !== sheet) return false;
      if (stock === "available" && !status.available) return false;
      if (stock === "low" && !(typeof item.stock === "number" && item.stock > 0 && item.stock <= 5)) return false;
      if (stock === "out" && !(typeof item.stock === "number" && item.stock <= 0)) return false;
      if (stock === "unknown" && typeof item.stock === "number") return false;
      return true;
    });
  }

  function specRow(label, value, className = "") {
    if (value === undefined || value === null || text(value).trim() === "") return "";
    return `<div class="spec-row ${className}"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
  }

  function notePreview(value) {
    const raw = text(value).trim();
    if (!raw) return "";
    const clean = raw.split("\n").filter((line) => line.trim()).slice(0, 3).join("\n");
    const isLong = raw.length > clean.length;
    return `
      <div class="note-box${isLong ? " is-long" : ""}">
        <span class="note-label">NOTE</span>
        <p>${escapeHTML(clean)}</p>
        ${isLong ? '<button class="note-more" type="button">전체 비고 보기</button>' : ""}
      </div>`;
  }

  function card(item) {
    const id = itemKey(item);
    const status = stockStatus(item);
    const images = Array.isArray(item.images) ? item.images : [];
    const image = images[0]
      ? `<img loading="lazy" src="${escapeHTML(images[0])}" alt="${escapeHTML(item.product)}">`
      : '<span class="no-image">NO IMAGE</span>';
    const imageCount = images.length > 1 ? `<span class="image-count">+${images.length - 1}</span>` : "";
    const qty = cart[id] || 0;

    return `
      <article class="card" data-id="${escapeHTML(id)}">
        <button class="thumb" type="button" data-action="detail" aria-label="${escapeHTML(item.product)} 상세보기">
          ${image}${imageCount}
        </button>
        <div class="card-body">
          <div class="badge-row">
            <span class="badge dark">${escapeHTML(item.brand || item.sheet)}</span>
            ${item.type ? `<span class="badge">${escapeHTML(item.type)}</span>` : ""}
            <span class="stock-badge ${status.key}">${escapeHTML(status.label)}</span>
          </div>
          <button class="name-button" type="button" data-action="detail">
            <h2 class="name">${escapeHTML(item.product || item.option || "제품명 미표기")}</h2>
          </button>
          ${item.option ? `<p class="option-name">${escapeHTML(item.option)}</p>` : ""}
          <div class="price-block">
            <span class="price-label">소비자가</span>
            <strong class="price">${escapeHTML(money(item))}</strong>
          </div>
          <div class="spec">
            ${specRow("OPTION", item.option)}
            ${specRow("CODE", item.code)}
            ${specRow("재고", status.detail, `stock-text ${status.key}`)}
            ${specRow("입고 예정", item.arrival)}
          </div>
          ${notePreview(item.remarks)}
          <button class="add-btn${qty ? " is-added" : ""}" type="button" data-action="add" ${status.available ? "" : "disabled"}>
            ${status.available ? (qty ? `프리오더 목록 · ${qty}개` : "프리오더 담기") : "신청 불가"}
          </button>
        </div>
      </article>`;
  }

  function render() {
    const list = filtered();
    els.results.innerHTML = list.map(card).join("");
    els.empty.hidden = list.length > 0;
    els.shown.textContent = fmt.format(list.length);
    els.available.textContent = fmt.format(list.filter((item) => stockStatus(item).available).length);
    els.selected.textContent = fmt.format(cartQuantity());
    els.clear.style.display = els.search.value ? "grid" : "none";
  }

  function openDetail(item) {
    const id = itemKey(item);
    const status = stockStatus(item);
    const images = Array.isArray(item.images) && item.images.length
      ? item.images.map((source) => `<img src="${escapeHTML(source)}" alt="${escapeHTML(item.product)}">`).join("")
      : '<div class="no-image modal-no-image">NO IMAGE</div>';
    const qty = cart[id] || 0;

    els.dialogBody.innerHTML = `
      <div class="detail-images">${images}</div>
      <div class="detail-content">
        <div class="badge-row">
          <span class="badge dark">${escapeHTML(item.brand || item.sheet)}</span>
          ${item.type ? `<span class="badge">${escapeHTML(item.type)}</span>` : ""}
          <span class="stock-badge ${status.key}">${escapeHTML(status.label)}</span>
        </div>
        <h2>${escapeHTML(item.product || "제품명 미표기")}</h2>
        ${item.option ? `<p class="detail-option">${escapeHTML(item.option)}</p>` : ""}
        <div class="detail-price">${escapeHTML(money(item))}</div>
        <div class="detail-spec">
          ${specRow("OPTION", item.option)}
          ${specRow("CODE", item.code)}
          ${specRow("SIZE", item.size)}
          ${specRow("재고", status.detail, `stock-text ${status.key}`)}
          ${specRow("입고 예정", item.arrival)}
        </div>
        ${item.remarks ? `<div class="detail-note"><span>NOTE</span><p>${escapeHTML(item.remarks)}</p></div>` : ""}
        <button class="primary-btn detail-add" type="button" data-id="${escapeHTML(id)}" ${status.available ? "" : "disabled"}>
          ${status.available ? (qty ? `프리오더 목록에 ${qty}개 담김` : "프리오더 담기") : "현재 신청 불가"}
        </button>
      </div>`;
    els.detailDialog.showModal();
  }

  function maxQuantity(item) {
    if (typeof item.stock === "number" && item.stock > 0) return Math.min(item.stock, 99);
    return 99;
  }

  function addToCart(id, amount = 1) {
    const item = findItem(id);
    if (!item || !stockStatus(item).available) return;
    const max = maxQuantity(item);
    cart[id] = Math.min((cart[id] || 0) + amount, max);
    persistCart();
    render();
    renderCart();
    showToast(`${item.product || "제품"}을 프리오더 목록에 담았습니다.`);
  }

  function setCartQuantity(id, quantity) {
    const item = findItem(id);
    if (!item) return;
    const safeQty = Math.max(0, Math.min(Number(quantity) || 0, maxQuantity(item)));
    if (safeQty <= 0) delete cart[id];
    else cart[id] = safeQty;
    persistCart();
    render();
    renderCart();
  }

  function cartEntries() {
    return Object.entries(cart)
      .map(([id, quantity]) => ({ item: findItem(id), id, quantity: Number(quantity) || 0 }))
      .filter((entry) => entry.item && entry.quantity > 0);
  }

  function cartQuantity() {
    return cartEntries().reduce((sum, entry) => sum + entry.quantity, 0);
  }

  function cartPrice() {
    return cartEntries().reduce((sum, entry) => sum + numericPrice(entry.item) * entry.quantity, 0);
  }

  function updateCartUI() {
    const qty = cartQuantity();
    els.cartCount.textContent = fmt.format(qty);
    els.mobileCount.textContent = fmt.format(qty);
    els.mobileBar.hidden = qty === 0;
    els.selected.textContent = fmt.format(qty);
  }

  function cartRow(entry) {
    const { item, id, quantity } = entry;
    const image = Array.isArray(item.images) && item.images[0]
      ? `<img src="${escapeHTML(item.images[0])}" alt="">`
      : '<span class="no-image">NO IMAGE</span>';
    return `
      <article class="cart-row" data-id="${escapeHTML(id)}">
        <div class="cart-thumb">${image}</div>
        <div class="cart-info">
          <span>${escapeHTML(item.brand || item.sheet || "")}</span>
          <strong>${escapeHTML(item.product || "제품명 미표기")}</strong>
          <small>${escapeHTML(item.option || item.code || "")}</small>
          <b>${escapeHTML(money(item))}</b>
        </div>
        <div class="qty-control" aria-label="수량 조절">
          <button type="button" data-cart-action="minus" aria-label="수량 줄이기">−</button>
          <input type="number" min="1" max="${maxQuantity(item)}" value="${quantity}" inputmode="numeric" aria-label="수량">
          <button type="button" data-cart-action="plus" aria-label="수량 늘리기">＋</button>
        </div>
        <button class="remove-btn" type="button" data-cart-action="remove">삭제</button>
      </article>`;
  }

  function renderCart() {
    const entries = cartEntries();
    els.cartItems.innerHTML = entries.map(cartRow).join("");
    els.cartEmpty.hidden = entries.length > 0;
    els.cartItems.hidden = entries.length === 0;
    els.cartTotalQty.textContent = `${fmt.format(cartQuantity())}개`;
    els.cartTotalPrice.textContent = `${fmt.format(cartPrice())}원`;
    $("#checkoutBtn").disabled = entries.length === 0;

    els.formSummary.innerHTML = entries.map(({ item, quantity }) => `
      <div><span>${escapeHTML(item.brand || "")} · ${escapeHTML(item.product || "")}</span><strong>${quantity}개</strong></div>
    `).join("");
  }

  function showCart(step = "cart") {
    renderCart();
    switchStep(step);
    if (!els.cartDialog.open) els.cartDialog.showModal();
  }

  function switchStep(step) {
    els.cartStep.hidden = step !== "cart";
    els.formStep.hidden = step !== "form";
    els.successStep.hidden = step !== "success";
    els.cartDialog.scrollTop = 0;
  }

  function setDeliveryMode() {
    const isDelivery = new FormData(els.form).get("fulfillment") === "delivery";
    els.deliveryFields.hidden = !isDelivery;
    $$('input, select, textarea', els.deliveryFields).forEach((field) => {
      const requiredNames = ["recipientName", "recipientPhone", "postcode", "address"];
      field.disabled = !isDelivery;
      field.required = isDelivery && requiredNames.includes(field.name);
    });
  }

  function makeRequestId() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PO-${date}-${time}-${random}`;
  }

  function getPayload(formData, requestId) {
    const fulfillment = formData.get("fulfillment");
    const entries = cartEntries();
    return {
      formKey: config.formKey || "",
      requestId,
      submittedAt: new Date().toISOString(),
      source: config.source || "lighting-stock",
      shopName: config.shopName || "DUOMO LIGHTING STOCK",
      pageUrl: location.href,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent,
      honeypot: formData.get("website") || "",
      agreements: {
        preorder: formData.get("preorderAgreement") === "on",
        privacy: formData.get("privacyAgreement") === "on"
      },
      customer: {
        name: text(formData.get("customerName")).trim(),
        phone: text(formData.get("customerPhone")).trim(),
        email: text(formData.get("customerEmail")).trim(),
        instagram: text(formData.get("instagram")).trim()
      },
      fulfillment: {
        method: fulfillment,
        recipientName: fulfillment === "delivery" ? text(formData.get("recipientName")).trim() : "",
        recipientPhone: fulfillment === "delivery" ? text(formData.get("recipientPhone")).trim() : "",
        postcode: fulfillment === "delivery" ? text(formData.get("postcode")).trim() : "",
        address: fulfillment === "delivery" ? text(formData.get("address")).trim() : "",
        addressDetail: fulfillment === "delivery" ? text(formData.get("addressDetail")).trim() : "",
        elevator: fulfillment === "delivery" ? text(formData.get("elevator")).trim() : "",
        installation: fulfillment === "delivery" ? text(formData.get("installation")).trim() : "",
        deliveryNote: fulfillment === "delivery" ? text(formData.get("deliveryNote")).trim() : ""
      },
      customerNote: text(formData.get("customerNote")).trim(),
      totals: {
        quantity: cartQuantity(),
        productAmount: cartPrice()
      },
      items: entries.map(({ item, id, quantity }) => ({
        id,
        brand: text(item.brand || item.sheet),
        type: text(item.type),
        product: text(item.product),
        option: text(item.option),
        code: text(item.code),
        quantity,
        unitPrice: numericPrice(item),
        priceText: money(item),
        stockText: stockStatus(item).detail,
        image: Array.isArray(item.images) ? text(item.images[0]) : ""
      }))
    };
  }

  async function submitPreorder(event) {
    event.preventDefault();
    els.formError.hidden = true;

    if (!cartEntries().length) {
      showFormError("선택한 제품이 없습니다.");
      return;
    }

    setDeliveryMode();
    if (!els.form.checkValidity()) {
      els.form.reportValidity();
      showFormError("필수 입력 항목과 동의 내용을 확인해주세요.");
      return;
    }

    const endpoint = text(config.endpoint).trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec(?:\?.*)?$/.test(endpoint)) {
      showFormError("접수 시스템 설정이 완료되지 않았습니다. config.js에 Apps Script 웹 앱 주소를 입력해주세요.");
      return;
    }

    const formData = new FormData(els.form);
    const requestId = makeRequestId();
    const payload = getPayload(formData, requestId);

    els.submitBtn.disabled = true;
    els.submitBtn.textContent = "접수 중…";

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        cache: "no-store",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      localStorage.setItem("duomo_preorder_last_request", JSON.stringify({ requestId, submittedAt: payload.submittedAt }));
      els.successRequestId.textContent = requestId;
      cart = {};
      persistCart();
      els.form.reset();
      setDeliveryMode();
      render();
      renderCart();
      switchStep("success");
    } catch (error) {
      console.error(error);
      showFormError("접수 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = "프리오더 신청하기";
    }
  }

  function showFormError(message) {
    els.formError.textContent = message;
    els.formError.hidden = false;
    els.formError.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  fillSelect(els.brand, unique("brand"));
  fillSelect(els.type, unique("type"));
  fillSelect(els.sheet, unique("sheet"));
  els.updated.textContent = `${meta.generated || ""} 기준 · ${fmt.format(meta.count || data.length)}개 항목`;

  ["input", "change"].forEach((eventName) => {
    [els.search, els.brand, els.type, els.stock, els.sheet].forEach((element) => {
      element.addEventListener(eventName, render);
    });
  });

  els.results.addEventListener("click", (event) => {
    const cardEl = event.target.closest(".card");
    if (!cardEl) return;
    const item = findItem(cardEl.dataset.id);
    if (!item) return;
    if (event.target.closest('[data-action="detail"], .note-more')) openDetail(item);
    if (event.target.closest('[data-action="add"]')) addToCart(cardEl.dataset.id);
  });

  els.dialogBody.addEventListener("click", (event) => {
    const button = event.target.closest(".detail-add");
    if (!button) return;
    addToCart(button.dataset.id);
    const item = findItem(button.dataset.id);
    button.textContent = `프리오더 목록에 ${cart[button.dataset.id] || 0}개 담김`;
    if (item && cart[button.dataset.id] >= maxQuantity(item)) button.disabled = true;
  });

  els.cartItems.addEventListener("click", (event) => {
    const row = event.target.closest(".cart-row");
    if (!row) return;
    const action = event.target.closest("[data-cart-action]")?.dataset.cartAction;
    const current = cart[row.dataset.id] || 0;
    if (action === "minus") setCartQuantity(row.dataset.id, current - 1);
    if (action === "plus") setCartQuantity(row.dataset.id, current + 1);
    if (action === "remove") setCartQuantity(row.dataset.id, 0);
  });

  els.cartItems.addEventListener("change", (event) => {
    if (event.target.matches('input[type="number"]')) {
      const row = event.target.closest(".cart-row");
      setCartQuantity(row.dataset.id, event.target.value);
    }
  });

  $("#clearSearch").addEventListener("click", () => {
    els.search.value = "";
    els.search.focus();
    render();
  });

  $("#resetBtn").addEventListener("click", () => {
    els.search.value = "";
    els.brand.value = "";
    els.type.value = "";
    els.stock.value = "";
    els.sheet.value = "";
    render();
    scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#homeBtn").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  $("#guideBtn").addEventListener("click", () => els.guideDialog.showModal());
  $("#cartBtn").addEventListener("click", () => showCart("cart"));
  $("#mobileCartBtn").addEventListener("click", () => showCart("cart"));
  $("#checkoutBtn").addEventListener("click", () => {
    if (!cartEntries().length) return;
    renderCart();
    setDeliveryMode();
    switchStep("form");
  });
  $("#backToCartBtn").addEventListener("click", () => switchStep("cart"));
  $("#clearCartBtn").addEventListener("click", () => {
    if (!cartEntries().length || !confirm("선택한 제품을 모두 삭제할까요?")) return;
    cart = {};
    persistCart();
    render();
    renderCart();
  });
  $("#successCloseBtn").addEventListener("click", () => closeDialog(els.cartDialog));

  $$('input[name="fulfillment"]', els.form).forEach((radio) => radio.addEventListener("change", setDeliveryMode));
  els.form.addEventListener("submit", submitPreorder);

  $$('dialog .dialog-close').forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  addEventListener("scroll", () => {
    els.top.classList.toggle("show", scrollY > 500);
  }, { passive: true });
  els.top.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(console.warn));
  }

  setDeliveryMode();
  updateCartUI();
  renderCart();
  render();
})();
