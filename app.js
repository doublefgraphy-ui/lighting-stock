(() => {
  "use strict";

  const data = window.DUOMO_DATA || [];
  const meta = window.DUOMO_META || {};
  const $ = (selector) => document.querySelector(selector);
  const fmt = new Intl.NumberFormat("ko-KR");

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
    inCount: $("#inCount"),
    outCount: $("#outCount"),
    updated: $("#updated"),
    dialog: $("#detailDialog"),
    dialogBody: $("#dialogBody"),
    top: $("#topBtn")
  };

  const text = (value) => (value ?? "").toString();
  const escapeHTML = (value) => text(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);

  const unique = (key) => [...new Set(
    data.map((item) => text(item[key]).trim()).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "ko"));

  function fillSelect(element, values) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      element.appendChild(option);
    });
  }

  fillSelect(els.brand, unique("brand"));
  fillSelect(els.type, unique("type"));
  fillSelect(els.sheet, unique("sheet"));
  els.updated.textContent = `${meta.generated || ""} 기준 · ${fmt.format(meta.count || data.length)}개 항목`;

  function stockStatus(item) {
    if (typeof item.stock === "number") {
      if (item.stock <= 0) return { key: "out", label: "품절", detail: "재고 0개" };
      if (item.stock <= 5) return { key: "low", label: `${fmt.format(item.stock)}개`, detail: `가용 재고 ${fmt.format(item.stock)}개` };
      return { key: "in", label: `${fmt.format(item.stock)}개`, detail: `가용 재고 ${fmt.format(item.stock)}개` };
    }
    if (item.stockText) return { key: "unknown", label: item.stockText, detail: item.stockText };
    return { key: "unknown", label: "미표기", detail: "재고 미표기" };
  }

  function money(item) {
    if (typeof item.price === "number") return `${fmt.format(item.price)}원`;
    return item.priceText || "가격 미표기";
  }

  function searchable(item) {
    return [
      item.brand,
      item.type,
      item.product,
      item.option,
      item.code,
      item.size,
      item.sheet,
      item.remarks,
      item.arrival,
      item.category
    ].join(" ").toLowerCase();
  }

  function filtered() {
    const query = els.search.value.trim().toLowerCase();
    const brand = els.brand.value;
    const type = els.type.value;
    const stock = els.stock.value;
    const sheet = els.sheet.value;

    return data.filter((item) => {
      if (query && !searchable(item).includes(query)) return false;
      if (brand && item.brand !== brand) return false;
      if (type && item.type !== type) return false;
      if (sheet && item.sheet !== sheet) return false;

      if (stock === "in" && !(typeof item.stock === "number" && item.stock > 0)) return false;
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
    const clean = raw.split("\n").filter((line) => line.trim()).slice(0, 4).join("\n");
    const isLong = raw.length > clean.length;
    return `
      <div class="note-box${isLong ? " is-long" : ""}">
        <span class="note-label">NOTE</span>
        <p>${escapeHTML(clean)}</p>
        ${isLong ? '<button class="note-more" type="button">전체 비고 보기</button>' : ""}
      </div>`;
  }

  function card(item) {
    const status = stockStatus(item);
    const images = Array.isArray(item.images) ? item.images : [];
    const image = images[0]
      ? `<img loading="lazy" src="${escapeHTML(images[0])}" alt="${escapeHTML(item.product)}">`
      : '<span class="no-image">NO IMAGE</span>';
    const imageCount = images.length > 1 ? `<span class="image-count">+${images.length - 1}</span>` : "";

    return `
      <article class="card" data-id="${escapeHTML(item.id)}">
        <button class="thumb" type="button" aria-label="${escapeHTML(item.product)} 이미지 크게 보기">
          ${image}
          ${imageCount}
        </button>

        <div class="card-body">
          <div class="badge-row">
            <span class="badge dark">${escapeHTML(item.brand || item.sheet)}</span>
            ${item.type ? `<span class="badge">${escapeHTML(item.type)}</span>` : ""}
            <span class="stock-badge ${status.key}">${escapeHTML(status.label)}</span>
          </div>

          <h2 class="name">${escapeHTML(item.product || item.option || "제품명 미표기")}</h2>
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
        </div>
      </article>`;
  }

  function render() {
    const list = filtered();
    els.results.innerHTML = list.map(card).join("");
    els.empty.hidden = list.length > 0;
    els.shown.textContent = fmt.format(list.length);
    els.inCount.textContent = fmt.format(list.filter((item) => typeof item.stock === "number" && item.stock > 0).length);
    els.outCount.textContent = fmt.format(list.filter((item) => typeof item.stock === "number" && item.stock <= 0).length);
    els.clear.style.display = els.search.value ? "grid" : "none";
  }

  function openDetail(item) {
    const status = stockStatus(item);
    const images = Array.isArray(item.images) && item.images.length
      ? item.images.map((source) => `<img src="${escapeHTML(source)}" alt="${escapeHTML(item.product)}">`).join("")
      : '<div class="no-image modal-no-image">NO IMAGE</div>';

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
          ${specRow("재고", status.detail, `stock-text ${status.key}`)}
          ${specRow("입고 예정", item.arrival)}
        </div>
        ${item.remarks ? `<div class="detail-note"><span>NOTE</span><p>${escapeHTML(item.remarks)}</p></div>` : ""}
      </div>`;

    els.dialog.showModal();
  }

  ["input", "change"].forEach((eventName) => {
    [els.search, els.brand, els.type, els.stock, els.sheet].forEach((element) => {
      element.addEventListener(eventName, render);
    });
  });

  els.clear.addEventListener("click", () => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#homeBtn").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  els.results.addEventListener("click", (event) => {
    const cardElement = event.target.closest(".card");
    if (!cardElement) return;

    const shouldOpen = event.target.closest(".thumb") || event.target.closest(".note-more");
    if (!shouldOpen) return;

    const item = data.find((row) => row.id === cardElement.dataset.id);
    if (item) openDetail(item);
  });

  $(".dialog-close").addEventListener("click", () => els.dialog.close());
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) els.dialog.close();
  });

  window.addEventListener("scroll", () => els.top.classList.toggle("show", window.scrollY > 500));
  els.top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  render();
})();
