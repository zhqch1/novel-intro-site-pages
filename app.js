const PAGE_SIZE = 24;

const elements = {
  statTotal: document.querySelector("#stat-total"),
  statSummarized: document.querySelector("#stat-summarized"),
  statUpdated: document.querySelector("#stat-updated"),
  searchInput: document.querySelector("#search-input"),
  categorySelect: document.querySelector("#category-select"),
  summaryOnly: document.querySelector("#summary-only"),
  categoryChips: document.querySelector("#category-chips"),
  resultsMeta: document.querySelector("#results-meta"),
  cards: document.querySelector("#cards"),
  emptyState: document.querySelector("#empty-state"),
  loadMore: document.querySelector("#load-more"),
  cardTemplate: document.querySelector("#card-template"),
  detailDialog: document.querySelector("#detail-dialog"),
  closeDetail: document.querySelector("#close-detail"),
  detailCategory: document.querySelector("#detail-category"),
  detailTitle: document.querySelector("#detail-title"),
  detailMeta: document.querySelector("#detail-meta"),
  detailSummary: document.querySelector("#detail-summary"),
  detailLink: document.querySelector("#detail-link"),
};

const state = {
  payload: null,
  filteredItems: [],
  visibleCount: PAGE_SIZE,
  query: "",
  category: "全部",
  summaryOnly: true,
};

function formatDate(dateString) {
  if (!dateString) {
    return "日期未知";
  }
  return dateString;
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "--";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setStats(payload) {
  elements.statTotal.textContent = payload.totalCount.toLocaleString("zh-CN");
  elements.statSummarized.textContent = payload.summarizedCount.toLocaleString("zh-CN");
  elements.statUpdated.textContent = formatTimestamp(payload.sourceUpdatedAt);
}

function populateCategories(payload) {
  const categories = ["全部", ...payload.categories.map((item) => item.name)];

  elements.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  elements.categoryChips.innerHTML = categories
    .slice(0, 10)
    .map(
      (category) =>
        `<button class="chip${category === state.category ? " chip--active" : ""}" data-category="${category}" type="button">${category}</button>`
    )
    .join("");
}

function buildSearchText(item) {
  return [item.title, item.author, item.category, item.summary].join(" ").toLowerCase();
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  const payload = state.payload;

  state.filteredItems = payload.items.filter((item) => {
    if (state.summaryOnly && !item.hasSummary) {
      return false;
    }
    if (state.category !== "全部" && item.category !== state.category) {
      return false;
    }
    if (query && !buildSearchText(item).includes(query)) {
      return false;
    }
    return true;
  });

  state.visibleCount = PAGE_SIZE;
  render();
}

function createCard(item) {
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".card");
  const categoryBadge = fragment.querySelector(".badge--category");
  const statusBadge = fragment.querySelector(".badge--status");
  const openButton = fragment.querySelector(".card__open");
  const title = fragment.querySelector(".card__title");
  const meta = fragment.querySelector(".card__meta");
  const summary = fragment.querySelector(".card__summary");
  const link = fragment.querySelector(".text-link");

  categoryBadge.textContent = item.category;
  statusBadge.textContent = item.hasSummary ? "已生成梗概" : "梗概生成中";
  statusBadge.dataset.status = item.hasSummary ? "ready" : "pending";

  title.textContent = item.title;
  meta.textContent = `${item.author} · ${formatDate(item.date)} · TID ${item.tid}`;
  summary.textContent = item.summary || "当前还没有生成梗概，后续刷新数据后会自动补齐。";
  link.href = item.url || "#";
  link.textContent = item.url ? "原帖链接" : "暂无原帖链接";
  if (!item.url) {
    link.setAttribute("aria-disabled", "true");
  }

  openButton.addEventListener("click", () => openDetail(item));
  card.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) {
      return;
    }
    openDetail(item);
  });

  return fragment;
}

function render() {
  const visibleItems = state.filteredItems.slice(0, state.visibleCount);
  elements.cards.innerHTML = "";

  if (visibleItems.length === 0) {
    elements.emptyState.classList.remove("hidden");
  } else {
    elements.emptyState.classList.add("hidden");
    const fragment = document.createDocumentFragment();
    visibleItems.forEach((item) => fragment.appendChild(createCard(item)));
    elements.cards.appendChild(fragment);
  }

  elements.resultsMeta.textContent = `当前显示 ${visibleItems.length} / ${state.filteredItems.length} 条，数据总量 ${state.payload.totalCount} 条。`;

  const hasMore = state.filteredItems.length > state.visibleCount;
  elements.loadMore.classList.toggle("hidden", !hasMore);

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("chip--active", chip.dataset.category === state.category);
  });
}

function openDetail(item) {
  elements.detailCategory.textContent = item.category;
  elements.detailTitle.textContent = item.title;
  elements.detailMeta.textContent = `${item.author} · ${formatDate(item.date)} · TID ${item.tid}`;
  elements.detailSummary.textContent =
    item.summary || "这条记录还没有生成梗概，等数据下一次构建后会自动补齐。";
  elements.detailLink.href = item.url || "#";
  elements.detailLink.classList.toggle("hidden", !item.url);
  elements.detailDialog.showModal();
}

async function initialize() {
  const response = await fetch("./data/novels.json");
  if (!response.ok) {
    throw new Error("无法加载站点数据。");
  }

  state.payload = await response.json();
  setStats(state.payload);
  populateCategories(state.payload);
  applyFilters();
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  applyFilters();
});

elements.categorySelect.addEventListener("change", (event) => {
  state.category = event.target.value;
  applyFilters();
});

elements.summaryOnly.addEventListener("change", (event) => {
  state.summaryOnly = event.target.checked;
  applyFilters();
});

elements.categoryChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) {
    return;
  }
  state.category = chip.dataset.category;
  elements.categorySelect.value = state.category;
  applyFilters();
});

elements.loadMore.addEventListener("click", () => {
  state.visibleCount += PAGE_SIZE;
  render();
});

elements.closeDetail.addEventListener("click", () => {
  elements.detailDialog.close();
});

elements.detailDialog.addEventListener("click", (event) => {
  const rect = elements.detailDialog.getBoundingClientRect();
  const clickedOutside =
    event.clientY < rect.top ||
    event.clientY > rect.bottom ||
    event.clientX < rect.left ||
    event.clientX > rect.right;
  if (clickedOutside) {
    elements.detailDialog.close();
  }
});

initialize().catch((error) => {
  elements.resultsMeta.textContent = error.message;
});
