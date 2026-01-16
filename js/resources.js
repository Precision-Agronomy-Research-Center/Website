async function loadProjectsJSON(path) {
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
  projects.forEach(p => {
    const cat = normalizeCategory(p);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p);
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

function renderCategories(groups, categoryListEl, onSelectCategory) {
  categoryListEl.innerHTML = "";

  // Order: AgTech first if present, then alphabetical
  const cats = Array.from(groups.keys());
  cats.sort((a, b) => {
    if (a === "AgTech") return -1;
    if (b === "AgTech") return 1;
    return a.localeCompare(b);
  });

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-box category-btn";
    btn.dataset.category = cat;

    btn.innerHTML = `
      <h3><i>${cat}</i></h3>
      <p class="opacity-10">Click to view projects</p>
    `;

    btn.addEventListener("click", () => onSelectCategory(cat));
    categoryListEl.appendChild(btn);
  });
}

function setActiveCategoryButton(categoryListEl, cat) {
  const buttons = Array.from(categoryListEl.querySelectorAll(".category-btn"));
  buttons.forEach(b => b.classList.remove("is-active"));
  const active = buttons.find(b => b.dataset.category === cat);
  if (active) active.classList.add("is-active");
}

function renderProjectsForCategory(cat, groups, projectsPanelEl) {
  projectsPanelEl.innerHTML = "";

  if (!cat) {
    const empty = document.createElement("div");
    empty.className = "project-box projects-empty";
    empty.innerHTML = `<h3><i>Select a category</i></h3><p>Projects will appear here.</p>`;
    projectsPanelEl.appendChild(empty);
    return;
  }

  const items = groups.get(cat) || [];
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "project-box projects-empty";
    empty.innerHTML = `<h3><i>${cat}</i></h3><p>No projects listed yet.</p>`;
    projectsPanelEl.appendChild(empty);
    return;
  }

  const row = document.createElement("div");
  row.className = "projects-row";

  items.forEach(p => {
    const a = document.createElement("a");
    a.className = "project-box";
    a.href = p.url || "project_pending.html";
    a.id = slugify(p.title) || `project-${Math.random().toString(16).slice(2)}`;

    // Optional background image hook (only if your CSS supports it)
    if (p.image) a.style.backgroundImage = `url('${p.image}')`;

    a.innerHTML = `
      <h3><i>${p.title || "Untitled"}</i></h3>
      <p>${p.subtitle || ""}</p>
    `;
    row.appendChild(a);
  });

  projectsPanelEl.appendChild(row);
}

document.addEventListener("DOMContentLoaded", async () => {
  const categoryListEl = document.getElementById("category-list");
  const projectsPanelEl = document.getElementById("projects-panel");

  try {
    const projects = await loadProjectsJSON("assets/json/projects.json");
    const groups = groupByCategory(projects);

    let selectedCategory = null; // start collapsed (nothing selected)

    const onSelectCategory = (cat) => {
      // Toggle behavior: clicking active category collapses it
      if (selectedCategory === cat) {
        selectedCategory = null;
        setActiveCategoryButton(categoryListEl, "__none__");
        renderProjectsForCategory(null, groups, projectsPanelEl);
        return;
      }

      selectedCategory = cat;
      setActiveCategoryButton(categoryListEl, cat);
      renderProjectsForCategory(cat, groups, projectsPanelEl);
    };

    renderCategories(groups, categoryListEl, onSelectCategory);
    renderProjectsForCategory(null, groups, projectsPanelEl); // collapsed default
  } catch (err) {
    console.error(err);
    projectsPanelEl.innerHTML = `<div class="project-box"><h3><i>Error</i></h3><p>${err.message}</p></div>`;
  }
});
