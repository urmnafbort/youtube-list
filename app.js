async function loadVideos() {
  const res = await fetch("videos.json");
  const videos = await res.json();
  renderList(videos);

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelector(".tab.active").classList.remove("active");
      tab.classList.add("active");

      const cat = tab.dataset.category;
      const filtered = cat === "all" ? videos : videos.filter(v => v.category === cat);
      renderList(filtered);
    });
  });
}

function renderList(list) {
  const container = document.getElementById("video-list");
  container.innerHTML = "";

  list.forEach(v => {
    const url = `https://www.youtube.com/watch?v=${v.id}&t=${v.start}s`;
    const thumb = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;

    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => location.href = url;

    card.innerHTML = `
      <img class="thumb" src="${thumb}">
      <div class="info">
        <div class="title">${v.title}</div>
        <div class="desc">${v.desc}</div>
      </div>
    `;

    container.appendChild(card);
  });
}

loadVideos();