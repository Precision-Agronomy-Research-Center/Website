<script>
async function loadProjectCards() {
  const track = document.getElementById("carouselTrack");
  if (!track) return;

  const res = await fetch("assets/json/projects.json", { cache: "no-store" });
  const projects = await res.json();

  track.innerHTML = "";

  for (const p of projects) {
    const card = document.createElement("div");
    card.className = "project-card";

    card.innerHTML = `
      <a class="card-link" href="${p.url || '#'}" target="_blank" rel="noopener">
        ${p.image ? `
          <div class="thumb">
            <img src="${p.image}" alt="${p.title}" loading="lazy">
          </div>` : ""}
        <h3 class="title">${p.title}</h3>
        ${p.subtitle ? `<div class="meta">${p.subtitle}</div>` : ""}
      </a>
    `;

    track.appendChild(card);
  }

  // re-init carousel sizing after DOM injection
  if (window.initCarousel) window.initCarousel();
}

document.addEventListener("DOMContentLoaded", loadProjectCards);
</script>
