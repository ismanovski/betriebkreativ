(() => {
  const REQUEST_KEY = "bk-request-items";
  const BASE_CATALOG_URL = "https://www.wir-machen-druck.de";
  const CATALOG_FALLBACK_URL = "assets/data/catalog.json";
  const inlineCatalog = Array.isArray(window.__BK_CATALOG__)
    ? window.__BK_CATALOG__
    : [];

  const dom = {
    requestModal: document.querySelector(".request-modal"),
    requestItems: document.querySelector("[data-request-items]"),
    requestEmpty: document.querySelector("[data-request-empty]"),
    requestCounts: document.querySelectorAll("[data-request-count]"),
    requestForm: document.getElementById("request-form"),
    requestFeedback: document.querySelector(".request-form .form-feedback"),
    specialsSection: document.querySelector("[data-specials-section]"),
    specialsGrid: document.querySelector("[data-specials-grid]"),
    categoryNav: document.querySelector("[data-category-nav]"),
    categoryGroups: document.querySelector("[data-category-groups]"),
    searchInput: document.querySelector("[data-product-search]"),
    searchMeta: document.querySelector("[data-search-meta]"),
    searchSuggestions: document.querySelector("[data-search-suggestions]"),
    catalogOverlay: document.querySelector("[data-catalog-overlay]"),
    catalogPanel: document.querySelector("[data-catalog-panel]"),
    contactForm: document.getElementById("general-contact-form"),
    heroLines: document.querySelector("[data-hero-lines]"),
  };

  const state = {
    requestItems: loadRequestItems(),
    catalog: inlineCatalog.slice(),
    dataLoaded: inlineCatalog.length > 0,
    query: "",
    cards: [],
    suggestionItems: [],
  };

  /* -------------------- Helpers -------------------- */
  function loadRequestItems() {
    try {
      const raw = localStorage.getItem(REQUEST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Konnte gespeicherte Anfrage nicht laden:", error);
      return [];
    }
  }

  function persistRequestItems() {
    try {
      localStorage.setItem(REQUEST_KEY, JSON.stringify(state.requestItems));
    } catch (error) {
      console.warn("Konnte Anfrage nicht speichern:", error);
    }
  }

  function slugify(value) {
    return value
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function createButton(label, productLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button ghost";
    button.dataset.productLabel = productLabel;
    button.textContent = label;
    return button;
  }

  function flattenSubcategories() {
    const items = [];
    state.catalog.forEach((category) => {
      const subs = Array.isArray(category.subcategories) ? category.subcategories : [];
      if (subs.length) {
        subs.forEach((sub) => {
          items.push({
            category,
            label: sub.name,
            icon: sub.icon || category.icon,
            url: sub.url || "",
            targetId: `category-${category.id}`,
          });
        });
      } else if (Array.isArray(category.articles) && category.articles.length) {
        category.articles.forEach((article) => {
          items.push({
            category,
            label: article.name,
            icon: category.icon,
            url:
              article.slug && article.id
                ? `/${article.slug},article,${article.id}.html`
                : "",
            targetId: `category-${category.id}`,
          });
        });
      } else {
        items.push({
          category,
          label: category.name,
          icon: category.icon,
          url: category.url || "",
          targetId: `category-${category.id}`,
        });
      }
    });
    return items;
  }

  function stripText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  /* -------------------- Request handling -------------------- */
  function renderRequestItems() {
    if (!dom.requestItems) return;
    dom.requestItems.innerHTML = "";

    if (!state.requestItems.length) {
      if (dom.requestEmpty) dom.requestEmpty.hidden = false;
      return;
    }

    if (dom.requestEmpty) dom.requestEmpty.hidden = true;

    state.requestItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = "request-item";
      li.dataset.id = item.id;

      const header = document.createElement("header");
      const title = document.createElement("h4");
      title.textContent = item.label;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "request-remove";
      removeBtn.dataset.remove = item.id;
      removeBtn.textContent = "Entfernen";
      header.append(title, removeBtn);

      const qtyLabel = document.createElement("label");
      qtyLabel.textContent = "Menge";
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.value = item.quantity ?? 1;
      qtyInput.dataset.field = "quantity";
      qtyLabel.append(qtyInput);

      const noteLabel = document.createElement("label");
      noteLabel.textContent = "Spezifikation & Notizen";
      const noteArea = document.createElement("textarea");
      noteArea.rows = 3;
      noteArea.dataset.field = "notes";
      noteArea.placeholder =
        "Format, Materialien, Termine oder Designwünsche hier ergänzen.";
      noteArea.value = item.notes ?? "";
      noteLabel.append(noteArea);

      li.append(header, qtyLabel, noteLabel);
      dom.requestItems.append(li);
    });
  }

  function updateRequestBadges() {
    dom.requestCounts.forEach((node) => {
      node.textContent = state.requestItems.length.toString();
    });
  }

  function addProductToRequest(label) {
    if (!label) return;
    const existing = state.requestItems.find(
      (entry) => entry.label.toLowerCase() === label.toLowerCase()
    );
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      state.requestItems.push({
        id: slugify(label),
        label,
        quantity: 1,
        notes: "",
      });
    }
    persistRequestItems();
    updateRequestBadges();
    renderRequestItems();
  }

  function removeProductFromRequest(id) {
    const index = state.requestItems.findIndex((item) => item.id === id);
    if (index === -1) return;
    state.requestItems.splice(index, 1);
    persistRequestItems();
    updateRequestBadges();
    renderRequestItems();
  }

  function showFeedback(element, message, variant = "success") {
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
    element.classList.toggle("is-success", variant === "success");
    element.classList.toggle("is-error", variant === "error");
  }

  function resetFeedback(element) {
    if (!element) return;
    element.textContent = "";
    element.hidden = true;
    element.classList.remove("is-success", "is-error");
  }

  function openRequestModal() {
    if (!dom.requestModal) return;
    dom.requestModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeRequestModal() {
    if (!dom.requestModal) return;
    dom.requestModal.hidden = true;
    document.body.style.overflow = "";
  }

  function openCatalogOverlay() {
    if (!dom.catalogOverlay) return;
    renderCatalogOverlay();
    dom.catalogOverlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeCatalogOverlay() {
    if (!dom.catalogOverlay) return;
    dom.catalogOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  /* -------------------- Catalog rendering -------------------- */
  function renderHighlights() {
    if (!dom.specialsGrid) return;
    const items = flattenSubcategories().slice(0, 8);
    dom.specialsGrid.innerHTML = "";

    if (!items.length) {
      dom.specialsGrid.innerHTML =
        '<p class="product-catalog-empty">Keine hervorgehobenen Kategorien gefunden.</p>';
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "special-card";

      if (item.icon) {
        const img = document.createElement("img");
        img.src = item.icon;
        img.alt = `${item.label} Symbol`;
        img.className = "product-illustration";
        card.append(img);
      }

      const title = document.createElement("h3");
      title.textContent = item.label;
      const text = document.createElement("p");
      text.textContent = `Beliebt in ${item.category.name}. Direkt hinzufügen und anfragen.`;

      const button = createButton("Zur Anfrage hinzufügen", item.label);

      card.append(title, text, button);
      dom.specialsGrid.append(card);
    });
  }

  function renderCategoryNav() {
    if (!dom.categoryNav) return;
    dom.categoryNav.innerHTML = "";
    state.catalog.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = category.name;
      button.addEventListener("click", () => {
        const target = document.getElementById(`category-${category.id}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      dom.categoryNav.append(button);
    });
  }

  function renderCatalogOverlay() {
    if (!dom.catalogPanel) return;
    dom.catalogPanel.innerHTML = "";

    state.catalog.forEach((category) => {
      const group = document.createElement("div");
      group.className = "catalog-panel-group";

      const title = document.createElement("h3");
      title.textContent = category.name;
      group.append(title);

      const list = document.createElement("ul");

      const subs = Array.isArray(category.subcategories) ? category.subcategories : [];
      const categoryAnchor = `produkte.html#category-${category.id}`;

      const allItem = document.createElement("li");
      const allLink = document.createElement("a");
      allLink.href = categoryAnchor;
      allLink.textContent = `Alle ${category.name}`;
      allLink.addEventListener("click", closeCatalogOverlay);
      allItem.append(allLink);
      list.append(allItem);

      if (subs.length) {
        subs.slice(0, 6).forEach((sub) => {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.href = categoryAnchor;
          link.textContent = sub.name;
          link.addEventListener("click", closeCatalogOverlay);
          li.append(link);
          list.append(li);
        });
      } else if (Array.isArray(category.articles) && category.articles.length) {
        category.articles.slice(0, 6).forEach((article) => {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.href = categoryAnchor;
          link.textContent = article.name;
          link.addEventListener("click", closeCatalogOverlay);
          li.append(link);
          list.append(li);
        });
      }

      group.append(list);
      dom.catalogPanel.append(group);
    });
  }

  function collectSuggestionItems() {
    const suggestions = [];
    state.catalog.forEach((category) => {
      const subs = Array.isArray(category.subcategories) ? category.subcategories : [];
      if (subs.length) {
        subs.forEach((sub) => {
          suggestions.push({
            label: `${sub.name} (${category.name})`,
            value: sub.name,
            search: `${category.name} ${sub.name}`.toLowerCase(),
            targetId: `category-${category.id}`,
          });
        });
      } else if (Array.isArray(category.articles) && category.articles.length) {
        category.articles.forEach((article) => {
          suggestions.push({
            label: `${article.name} (${category.name})`,
            value: article.name,
            search: `${category.name} ${article.name}`.toLowerCase(),
            targetId: `category-${category.id}`,
          });
        });
      } else {
        suggestions.push({
          label: category.name,
          value: category.name,
          search: category.name.toLowerCase(),
          targetId: `category-${category.id}`,
        });
      }
    });
    state.suggestionItems = suggestions;
  }

  function renderCategories() {
    if (!dom.categoryGroups) return;
    dom.categoryGroups.innerHTML = "";
    state.cards = [];

    state.catalog.forEach((category) => {
      const section = document.createElement("section");
      section.id = `category-${category.id}`;
      section.className = "category-block";
      section.dataset.categorySection = category.id;

      const header = document.createElement("div");
      header.className = "category-header";

      if (category.icon) {
        const icon = document.createElement("img");
        icon.src = category.icon;
        icon.alt = "";
        header.append(icon);
      }

      const info = document.createElement("div");
      info.className = "category-info";
      const title = document.createElement("h3");
      title.textContent = category.name;
      info.append(title);

      if (category.description) {
        const desc = document.createElement("p");
        desc.textContent = stripText(category.description);
        info.append(desc);
      }

      header.append(info);
      section.append(header);

      const grid = document.createElement("div");
      grid.className = "product-items";

      const subcategories = Array.isArray(category.subcategories)
        ? category.subcategories
        : [];

      subcategories.forEach((sub) => {
        const card = document.createElement("article");
        card.className = "product-card";
        card.dataset.searchText = `${category.name} ${sub.name}`.toLowerCase();

        const iconSrc = sub.icon || category.icon;
        if (iconSrc) {
          const img = document.createElement("img");
          img.src = iconSrc;
          img.alt = `${sub.name} Symbol`;
          img.className = "product-illustration";
          card.append(img);
        }

        const nameEl = document.createElement("h4");
        nameEl.textContent = sub.name;
        card.append(nameEl);

        const actionRow = document.createElement("div");
        actionRow.className = "product-links";

        if (sub.url) {
          const link = document.createElement("a");
          link.href = `${BASE_CATALOG_URL}${sub.url}`;
          link.target = "_blank";
          link.rel = "noopener";
          link.className = "product-target";
          link.textContent = "Details ansehen";
          actionRow.append(link);
        }

        const button = createButton("Zur Anfrage hinzufügen", sub.name);
        actionRow.append(button);

        card.append(actionRow);
        grid.append(card);
        state.cards.push({ element: card, text: card.dataset.searchText });
      });

      const articles = Array.isArray(category.articles)
        ? category.articles
        : [];
            if (!subcategories.length && articles.length) {
        articles.forEach((article) => {
          const card = document.createElement("article");
          card.className = "product-card";
          card.dataset.searchText = `${category.name} ${article.name}`.toLowerCase();

          const iconSrc = category.icon;
          if (iconSrc) {
            const img = document.createElement("img");
            img.src = iconSrc;
            img.alt = `${article.name} Symbol`;
            img.className = "product-illustration";
            card.append(img);
          }

          const nameEl = document.createElement("h4");
          nameEl.textContent = article.name;
          card.append(nameEl);

          const actionRow = document.createElement("div");
          actionRow.className = "product-links";

          if (article.slug && article.id) {
            const url = `${BASE_CATALOG_URL}/${article.slug},article,${article.id}.html`;
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener";
            link.className = "product-target";
            link.textContent = "Details ansehen";
            actionRow.append(link);
          }

          const button = createButton("Zur Anfrage hinzufügen", article.name);
          actionRow.append(button);
          card.append(actionRow);

          grid.append(card);
          state.cards.push({ element: card, text: card.dataset.searchText });
        });
      }

if (!grid.children.length) {
        const empty = document.createElement("p");
        empty.className = "product-catalog-empty";
        empty.textContent = "Keine Unterkategorien verfügbar.";
        grid.append(empty);
      }

      section.append(grid);
      dom.categoryGroups.append(section);
    });
  }

  function applySearchFilter() {
    const query = state.query.trim().toLowerCase();
    const hasQuery = query.length > 0;
    let visibleCount = 0;

    state.cards.forEach((item) => {
      const match = !hasQuery || item.text.includes(query);
      item.element.classList.toggle("is-hidden", !match);
      if (match) {
        visibleCount += 1;
      }
    });

    if (dom.categoryGroups) {
      dom.categoryGroups
        .querySelectorAll("[data-category-section]")
        .forEach((section) => {
          const visibleCards = section.querySelectorAll(
            ".product-card:not(.is-hidden)"
          );
          section.classList.toggle("is-hidden", hasQuery && !visibleCards.length);
        });
    }

    if (dom.specialsSection) {
      dom.specialsSection.hidden = hasQuery;
    }

    updateSearchMeta(visibleCount, hasQuery);
  }

  function updateSearchMeta(count, hasQuery) {
    if (!dom.searchMeta) return;
    if (!hasQuery) {
      dom.searchMeta.textContent = "";
      return;
    }
    dom.searchMeta.textContent = count
      ? `${count} Treffer für "${state.query}"`
      : `Keine Treffer für "${state.query}"`;
  }

  function updateSuggestionsList(value) {
    if (!dom.searchSuggestions) return;
    const term = value.trim().toLowerCase();
    if (term.length < 2) {
      dom.searchSuggestions.hidden = true;
      dom.searchSuggestions.innerHTML = "";
      return;
    }

    const matches = state.suggestionItems
      .filter((item) => item.search.includes(term))
      .slice(0, 7);

    if (!matches.length) {
      dom.searchSuggestions.hidden = true;
      dom.searchSuggestions.innerHTML = "";
      return;
    }

    dom.searchSuggestions.innerHTML = "";
    matches.forEach((match) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = match.label;
      button.addEventListener("click", () => {
        if (dom.searchInput) {
          dom.searchInput.value = match.value;
          state.query = match.value;
          applySearchFilter();
        }
        dom.searchSuggestions.hidden = true;
        const target = document.getElementById(match.targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (window.location.pathname.indexOf("produkte.html") === -1) {
          window.location.href = `produkte.html#${match.targetId}`;
        }
      });
      dom.searchSuggestions.append(button);
    });

    dom.searchSuggestions.hidden = false;
  }

  function updateSearchMeta(count, hasQuery) {
    if (!dom.searchMeta) return;
    if (!hasQuery) {
      dom.searchMeta.textContent = "";
      return;
    }
    dom.searchMeta.textContent = count
      ? `${count} Treffer für „${state.query}“`
      : `Keine Treffer für „${state.query}“`;
  }

  function mountCatalog() {
    renderCategoryNav();
    renderHighlights();
    renderCategories();
    renderCatalogOverlay();
    collectSuggestionItems();
    applySearchFilter();
    if (dom.searchInput && dom.searchInput.value) {
      updateSuggestionsList(dom.searchInput.value);
    }
  }

  async function ensureCatalog() {
    if (state.dataLoaded) {
      mountCatalog();
      return;
    }

    try {
      const response = await fetch(CATALOG_FALLBACK_URL);
      if (!response.ok) throw new Error(response.statusText);
      const data = await response.json();
      state.catalog = Array.isArray(data) ? data : [];
      state.dataLoaded = true;
      mountCatalog();
    } catch (error) {
      console.error("Produktkatalog konnte nicht geladen werden:", error);
      if (dom.searchMeta) {
        dom.searchMeta.textContent =
          "Produkte konnten nicht geladen werden. Bitte später erneut versuchen.";
      }
    }
  }

  /* -------------------- Event bindings -------------------- */
  function bindNavigation() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.getElementById("primary-navigation");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open", !expanded);
    });
  }

  function bindCatalogOverlay() {
    if (!dom.catalogOverlay) return;
    const toggles = document.querySelectorAll("[data-toggle-catalog]");
    toggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        openCatalogOverlay();
        const nav = document.getElementById("primary-navigation");
        if (nav) {
          nav.classList.remove("open");
        }
        const menuToggle = document.querySelector(".menu-toggle");
        if (menuToggle) {
          menuToggle.setAttribute("aria-expanded", "false");
        }
      });
    });

    document
      .querySelectorAll("[data-close-catalog]")
      .forEach((button) => button.addEventListener("click", closeCatalogOverlay));

    dom.catalogOverlay.addEventListener("click", (event) => {
      if (event.target === dom.catalogOverlay) {
        closeCatalogOverlay();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dom.catalogOverlay && !dom.catalogOverlay.hidden) {
        closeCatalogOverlay();
      }
    });
  }

  function bindModalControls() {
    document
      .querySelectorAll("[data-open-request]")
      .forEach((trigger) =>
        trigger.addEventListener("click", (event) => {
          event.preventDefault();
          openRequestModal();
        })
      );

    document
      .querySelectorAll("[data-close-request]")
      .forEach((trigger) =>
        trigger.addEventListener("click", () => closeRequestModal())
      );

    if (dom.requestModal) {
      dom.requestModal.addEventListener("click", (event) => {
        if (event.target === dom.requestModal) {
          closeRequestModal();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dom.requestModal && !dom.requestModal.hidden) {
        closeRequestModal();
      }
    });
  }

  function bindRequestList() {
    if (!dom.requestItems) return;
    dom.requestItems.addEventListener("input", (event) => {
      const target = event.target;
      const itemElement = target.closest(".request-item");
      if (!itemElement) return;
      const item = state.requestItems.find(
        (entry) => entry.id === itemElement.dataset.id
      );
      if (!item) return;

      if (target.dataset.field === "quantity") {
        const value = Math.max(1, parseInt(target.value, 10) || 1);
        target.value = value;
        item.quantity = value;
      }

      if (target.dataset.field === "notes") {
        item.notes = target.value;
      }

      persistRequestItems();
    });

    dom.requestItems.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove]");
      if (!button) return;
      removeProductFromRequest(button.dataset.remove);
    });
  }

  function bindProductActions() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-product-label]");
      if (!button) return;
      const label = button.dataset.productLabel;
      const modalHidden = !dom.requestModal || dom.requestModal.hidden;
      addProductToRequest(label);
      if (modalHidden) {
        openRequestModal();
      } else {
        showFeedback(
          dom.requestFeedback,
          `„${label}“ wurde zur Anfrage hinzugefügt.`,
          "success"
        );
      }
    });
  }

  function bindSearch() {
    if (!dom.searchInput) return;
    const form = dom.searchInput.closest("form");
    if (form) {
      form.addEventListener("submit", (event) => event.preventDefault());
    }

    dom.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      applySearchFilter();
      updateSuggestionsList(event.target.value);
    });

    dom.searchInput.addEventListener("focus", (event) => {
      updateSuggestionsList(event.target.value);
    });

    dom.searchInput.addEventListener("blur", () => {
      if (!dom.searchSuggestions) return;
      setTimeout(() => {
        dom.searchSuggestions.hidden = true;
      }, 120);
    });

    if (dom.searchSuggestions) {
      dom.searchSuggestions.addEventListener("mousedown", (event) => event.preventDefault());
    }
  }

  function bindHeroLines() {
    if (!dom.heroLines) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          dom.heroLines.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      { threshold: 0.45 }
    );
    observer.observe(dom.heroLines);
  }

  function bindRequestForm() {
    if (!dom.requestForm) return;
    dom.requestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!state.requestItems.length) {
        showFeedback(
          dom.requestFeedback,
          "Bitte fügen Sie mindestens ein Produkt zur Anfrage hinzu.",
          "error"
        );
        return;
      }

      if (!dom.requestForm.checkValidity()) {
        dom.requestForm.reportValidity();
        showFeedback(
          dom.requestFeedback,
          "Bitte füllen Sie alle Pflichtfelder aus.",
          "error"
        );
        return;
      }

      const formData = Object.fromEntries(new FormData(dom.requestForm));
      console.info("Anfrage (Demo):", {
        kontakt: formData,
        produkte: state.requestItems,
      });

      showFeedback(
        dom.requestFeedback,
        "Vielen Dank! Wir melden uns innerhalb von zwei Stunden mit einem Angebot.",
        "success"
      );

      dom.requestForm.reset();
      state.requestItems = [];
      persistRequestItems();
      updateRequestBadges();
      renderRequestItems();

      setTimeout(closeRequestModal, 2200);
    });

    dom.requestForm.addEventListener("input", () =>
      resetFeedback(dom.requestFeedback)
    );
  }

  function bindContactForm() {
    if (!dom.contactForm) return;
    const feedback = dom.contactForm.querySelector(".form-feedback");
    dom.contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!dom.contactForm.checkValidity()) {
        dom.contactForm.reportValidity();
        showFeedback(feedback, "Bitte alle Pflichtfelder ausfüllen.", "error");
        return;
      }
      const data = Object.fromEntries(new FormData(dom.contactForm));
      console.info("Kontaktformular (Demo):", data);
      showFeedback(
        feedback,
        "Danke für Ihre Nachricht! Wir melden uns spätestens am nächsten Werktag.",
        "success"
      );
      dom.contactForm.reset();
    });

    dom.contactForm.addEventListener("input", () => resetFeedback(feedback));
  }

  function updateCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  /* -------------------- Init -------------------- */
  function init() {
    updateCurrentYear();
    renderRequestItems();
    updateRequestBadges();

    bindNavigation();
    bindCatalogOverlay();
    bindModalControls();
    bindRequestList();
    bindProductActions();
    bindSearch();
    bindRequestForm();
    bindContactForm();
    bindHeroLines();

    ensureCatalog();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
