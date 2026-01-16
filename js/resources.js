/* =========================
   PARC Research - resources.js
   Data-driven Project Library (projects.json)
   Supports:
   1) 2-pane "sketch" layout: #category-list + #projects-panel  (preferred)
   2) fallback single-mount list: #project-sections or #project-grid
   Also keeps ToC working if #toc-list exists.
   ========================= */

(async function () {
  "use strict";

  /* ---------- tiny helpers ---------- */

  const $ = (sel) => document.querySelector(sel);

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function ensureUniqueId(base, used) {
    let id = base || "item";
    let i = 2;
    while (used.has(id)) {
      id = `${base}-${i}`;
      i += 1;
    }
    used.add(id);
    return id;
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  function normalizeCategory(p) {
    const c = (p.category && String(p.category).trim()) || "Other";
    return c;
  }

  function groupByCategory(projects) {
    const groups = new Map();
    projects.forEach((p) => {
      const cat = normalizeCategory(p);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(p);
    });
    return groups;
  }

  function sortedCategories(groups) {
    const cats = Array.from(groups.keys());
    cats.sort((a, b) => {
      if (a === "AgTech") return -1;
      if (b === "AgTech") return 1;
      return a.localeCompare(b);
    });
    return cats;
  }

  function clearEl(el) {
    if (el) el.innerHTML = "";
  }

  function safeSetHTML(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  /* ---------- render: 2-pane sketch layout ---------- */

  function renderCategoryButtons(groups, categoryListEl, onSelect) {
    clearEl(categoryListEl);

    const cats = sortedCategories(groups);
    cats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "project-box category-btn";
      btn.dataset.category = cat;
      btn.innerHTML = `
        <h3><i>${cat}</i></h3>
        <p class="opacity-10">Click to view projects</p>
      `;
      btn.addEventListener("click", () => onSelect(cat));
      categoryListEl.appendChild(btn);
    });
  }

  function setActiveCategory(categoryListEl, catOrNull) {
    if (!categoryListEl) return;
    const buttons = Array.from(categoryListEl.querySelectorAll(".category-btn"));
    buttons.forEach((b) => b.classList.remove("is-active"));
    if (!catOrNull) return;
    const active = buttons.find((b) => b.dataset.category === catOrNull);
    if (active) active.classList.add("is-active");
  }

  function renderProjectsPanel(catOrNull, groups, projectsPanelEl) {
    clearEl(projectsPanelEl);
    if (!projectsPanelEl) return;

    if (!catOrNull) {
      const empty = document.createElement("div");
      empty.className = "project-box projects-empty";
      empty.innerHTML = `<h3><i>Select a category</i></h3><p>Projects will appear here.</p>`;
      projectsPanelEl.appendChild(empty);
      return;
    }

    const items = groups.get(catOrNull) || [];
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "project-box projects-empty";
      empty.innerHTML = `<h3><i>${catOrNull}</i></h3><p>No projects listed yet.</p>`;
      projectsPanelEl.appendChild(empty);
      return;
    }

    const used = new Set();
    const row = document.createElement("div");
    row.className = "projects-row";

    items.forEach((p) => {
      const a = document.createElement("a");
      const baseId = slugify(p.title) || "project";
      a.id = ensureUniqueId(baseId, used);
      a.className = "project-box";
      a.href = p.url || "project_pending.html";

      // Optional background image hook
      if (p.image) a.style.backgroundImage = `url('${p.image}')`;

      a.innerHTML = `
        <h3><i>${p.title || "Untitled"}</i></h3>
        <p>${p.subtitle || ""}</p>
      `;
      row.appendChild(a);
    });

    projectsPanelEl.appendChild(row);
  }

  /* ---------- ToC builder (optional) ---------- */

  function buildTOCFromGroups(groups, tocListEl) {
    if (!tocListEl) return;
    clearEl(tocListEl);

    const cats = sortedCategories(groups);
    const used = new Set();

    cats.forEach((cat) => {
      const catId = ensureUniqueId(`cat-${slugify(cat)}`, used);

      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${catId}`;
      a.textContent = cat;
      li.appendChild(a);

      // Create a hidden anchor target so ToC links work
      const anchor = document.createElement("div");
      anchor.id = catId;
      anchor.style.position = "relative";
      anchor.style.top = "-80px";
      anchor.style.height = "0px";

      // Insert anchor near top of page (best effort)
      const content = document.querySelector(".content") || document.body;
      content.insertBefore(anchor, content.firstChild);

      const subUl = document.createElement("ul");
      (groups.get(cat) || []).forEach((p) => {
        const pli = document.createElement("li");
        const pa = document.createElement("a");
        pa.textContent = p.title || "Untitled";
        // Project ids are generated at render time; keep ToC lightweight:
        // point to category anchor instead (and user sees projects on the right).
        pa.href = `#${catId}`;
        pli.appendChild(pa);
        subUl.appendChild(pli);
      });
      li.appendChild(subUl);

      tocListEl.appendChild(li);
    });
  }

  /* ---------- Fallback renderer (single mount) ---------- */

  function renderFlatGrid(projects, mountEl) {
    if (!mountEl) return;
    clearEl(mountEl);

    const grid = document.createElement("div");
    grid.className = "project-grid";

    const used = new Set();
    projects.forEach((p) => {
      const a = document.createElement("a");
      a.className = "project-box";
      a.href = p.url || "project_pending.html";
      a.id = ensureUniqueId(slugify(p.title) || "project", used);

      if (p.image) a.style.backgroundImage = `url('${p.image}')`;

      a.innerHTML = `
        <h3><i>${p.title || "Untitled"}</i></h3>
        <p>${p.subtitle || ""}</p>
      `;
      grid.appendChild(a);
    });

    mountEl.appendChild(grid);
  }

  /* ---------- main ---------- */

  document.addEventListener("DOMContentLoaded", async () => {
    // Prefer the 2-pane sketch layout
    const categoryListEl = $("#category-list");
    const projectsPanelEl = $("#projects-panel");

    // Optional mounts
    const fallbackMountEl = $("#project-sections") || $("#project-grid");
    const tocListEl = $("#toc-list");

    try {
      const projects = await loadJSON("assets/json/projects.json");
      const groups = groupByCategory(projects);

      // Build ToC if present
      buildTOCFromGroups(groups, tocListEl);

      // 2-pane exists -> use it
      if (categoryListEl && projectsPanelEl) {
        let selectedCategory = null; // start collapsed

        const onSelect = (cat) => {
          // toggle collapse by clicking same category
          if (selectedCategory === cat) {
            selectedCategory = null;
            setActiveCategory(categoryListEl, null);
            renderProjectsPanel(null, groups, projectsPanelEl);
            return;
          }

          selectedCategory = cat;
          setActiveCategory(categoryListEl, cat);
          renderProjectsPanel(cat, groups, projectsPanelEl);
        };

        renderCategoryButtons(groups, categoryListEl, onSelect);
        renderProjectsPanel(null, groups, projectsPanelEl); // collapsed default
        return;
      }

      // Otherwise: fallback flat render (prevents null errors)
      if (fallbackMountEl) {
        renderFlatGrid(projects, fallbackMountEl);
        return;
      }

      // If nothing exists, fail gracefully
      console.warn("No mount elements found for projects. Add #category-list/#projects-panel or #project-sections.");
    } catch (err) {
      console.error(err);

      // Try to display error somewhere visible
      if (projectsPanelEl) {
        safeSetHTML(projectsPanelEl, `<div class="project-box"><h3><i>Error</i></h3><p>${err.message}</p></div>`);
      } else if (fallbackMountEl) {
        safeSetHTML(fallbackMountEl, `<div class="project-box"><h3><i>Error</i></h3><p>${err.message}</p></div>`);
      }
    }
  });
})();
