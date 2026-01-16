async function loadProjectsJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function groupByCategory(projects) {
  const groups = new Map();
  projects.forEach(p => {
    const category = (p.category && String(p.category).trim()) || "Other";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(p);
  });
  return groups;
}

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

function renderHorizontalSections(groups, mountEl) {
  mountEl.innerHTML = "";

  const sectionBar = document.createElement("div");
  sectionBar.className = "section-bar";
  sectionBar.setAttribute("role", "tablist");

  const panelsWrap = document.createElement("div");
  panelsWrap.className = "section-panels";

  const usedIds = new Set();

  // Stable order (optional). Put AgTech first if present.
  const categories = Array.from(groups.keys());
  categories.sort((a, b) => {
    if (a === "AgTech") return -1;
    if (b === "AgTech") return 1;
    return a.localeCompare(b);
  });

  categories.forEach((cat) => {
    const sectionId = ensureUniqueId(`section-${slugify(cat)}`, usedIds);

    // Horizontal header button styled like project-box
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-box section-tab";
    btn.id = `${sectionId}-tab`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", sectionId);
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `
      <h3><i>${cat}</i></h3>
      <p class="opacity-10">Click to expand</p>
    `;

    // Panel (collapsed by default)
    const panel = document.createElement("div");
    panel.className = "section-panel";
    panel.id = sectionId;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", btn.id);
    panel.hidden = true;

    const grid = document.createElement("div");
    grid.className = "project-grid";

    groups.get(cat).forEach((p) => {
      const card = document.createElement("a");
      const projectId = ensureUniqueId(slugify(p.title), usedIds);

      card.href = p.url || "project_pending.html";
      card.id = projectId;
      card.className = "project-box";

      // Optional background image hook (only if your CSS supports it)
      if (p.image) card.style.backgroundImage = `url('${p.image}')`;

      card.innerHTML = `
        <h3><i>${p.title || "Untitled"}</i></h3>
        <p>${p.subtitle || ""}</p>
      `;

      grid.appendChild(card);
    });

    panel.appendChild(grid);
    sectionBar.appendChild(btn);
    panelsWrap.appendChild(panel);
  });

  mountEl.appendChild(sectionBar);
  mountEl.appendChild(panelsWrap);

  // Toggle behavior: all start collapsed, click to open/close one at a time
  const tabs = Array.from(sectionBar.querySelectorAll(".section-tab"));
  const panels = Array.from(panelsWrap.querySelectorAll(".section-panel"));

  function closeAll() {
    tabs.forEach(t => t.setAttribute("aria-expanded", "false"));
    panels.forEach(p => (p.hidden = true));
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("aria-controls");
      const panel = document.getElementById(targetId);
      const isOpen = tab.getAttribute("aria-expanded") === "true";

      closeAll();
      if (!isOpen) {
        tab.setAttribute("aria-expanded", "true");
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function buildTOCFromRendered(mountEl, tocListEl) {
  tocListEl.innerHTML = "";

  const sections = Array.from(mountEl.querySelectorAll(".section-panel"));
  sections.forEach(panel => {
    const tab = mountEl.querySelector(`#${panel.id}-tab`);
    const sectionTitle = tab?.querySelector("h3")?.textContent?.trim();
    if (!sectionTitle) return;

    const sectionLi = document.createElement("li");
    const sectionLink = document.createElement("a");
    sectionLink.href = `#${panel.id}`;
    sectionLink.textContent = sectionTitle;
    sectionLi.appendChild(sectionLink);

    const projects = Array.from(panel.querySelectorAll(".project-box[id]"));
    if (projects.length) {
      const subUl = document.createElement("ul");
      projects.forEach(p => {
        const h3 = p.querySelector("h3");
        if (!h3) return;
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${p.id}`;
        a.textContent = h3.textContent.replace(/\s+/g, " ").trim();
        li.appendChild(a);
        subUl.appendChild(li);
      });
      sectionLi.appendChild(subUl);
    }

    tocListEl.appendChild(sectionLi);
  });

  // If user clicks a ToC entry pointing at a project card, open its section
  tocListEl.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const hash = a.getAttribute("href");
    if (!hash || !hash.startsWith("#")) return;

    const target = document.querySelector(hash);
    if (!target) return;

    const panel = target.closest(".section-panel");
    if (!panel) return;

    const tab = document.getElementById(`${panel.id}-tab`);
    if (tab && tab.getAttribute("aria-expanded") !== "true") tab.click();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.getElementById("project-sections");
  const tocList = document.getElementById("toc-list");

  try {
    const projects = await loadProjectsJSON("assets/json/projects.json");
    const groups = groupByCategory(projects);

    renderHorizontalSections(groups, mount);
    buildTOCFromRendered(mount, tocList);
  } catch (err) {
    console.error(err);
    if (mount) {
      mount.innerHTML = `<div class="project-box"><h3><i>Error</i></h3><p>${err.message}</p></div>`;
    }
  }
});

