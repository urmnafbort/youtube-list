const API_KEY = "AIzaSyCaHNz22bXSi1Dczs9hUcqOkIEBFyYMbm8";

let videos = [];
let editIndex = null;

// 初期データ読み込み
fetch("videos.json")
  .then(res => res.json())
  .then(data => {
    videos = loadLocal() || data;
    renderList("all");
  });

// ローカル保存
function saveLocal() {
  localStorage.setItem("videos", JSON.stringify(videos));
}

function loadLocal() {
  return JSON.parse(localStorage.getItem("videos"));
}

// タブ切り替え
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    if (tab.id === "openForm") return;

    const category = tab.dataset.category;
    renderList(category);
  });
});

// 一覧描画
function renderList(category) {
  const list = document.getElementById("videoList");
  list.innerHTML = "";

  const filtered = category === "all"
    ? videos
    : videos.filter(v => v.category === category);

  filtered.forEach((v, i) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="https://img.youtube.com/vi/${v.id}/hqdefault.jpg">
      <div class="title">${v.title}</div>
      <div class="desc">${v.desc}</div>
      <div class="duration">⏱ ${v.duration}</div>
    `;

    // 長押しで編集
    let pressTimer;
    card.addEventListener("touchstart", () => {
      pressTimer = setTimeout(() => openEdit(i), 500);
    });
    card.addEventListener("touchend", () => clearTimeout(pressTimer));

    list.appendChild(card);
  });
}

// ＋ボタン → フォーム表示
document.getElementById("openForm").addEventListener("click", () => {
  editIndex = null;
  document.getElementById("formTitle").textContent = "動画を追加";
  document.getElementById("formView").classList.remove("hidden");
  document.getElementById("listView").classList.add("hidden");

  clearForm();
});

// 編集モード
function openEdit(index) {
  editIndex = index;
  const v = videos[index];

  document.getElementById("formTitle").textContent = "動画を編集";
  document.getElementById("urlInput").value = "https://www.youtube.com/watch?v=" + v.id;
  document.getElementById("titleInput").value = v.title;
  document.getElementById("startInput").value = v.start;
  document.getElementById("durationInput").value = v.duration;
  document.getElementById("descInput").value = v.desc;
  document.getElementById("categoryInput").value = v.category;

  document.getElementById("formView").classList.remove("hidden");
  document.getElementById("listView").classList.add("hidden");
}

// フォームクリア
function clearForm() {
  document.getElementById("urlInput").value = "";
  document.getElementById("titleInput").value = "";
  document.getElementById("startInput").value = "";
  document.getElementById("durationInput").value = "";
  document.getElementById("descInput").value = "";
}

// URL入力 → 自動取得
document.getElementById("urlInput").addEventListener("change", async () => {
  const url = document.getElementById("urlInput").value;
  const id = extractID(url);
  if (!id) return;

  // タイトル取得（oEmbed）
  const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    .then(r => r.json())
    .catch(() => null);

  if (oembed) {
    document.getElementById("titleInput").value = oembed.title;
  }

  // 動画時間取得（YouTube Data API）
  const api = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${id}&part=contentDetails&key=${API_KEY}`
  ).then(r => r.json());

  if (api.items.length > 0) {
    const iso = api.items[0].contentDetails.duration;
    document.getElementById("durationInput").value = isoToTime(iso);
  }
});

// YouTube ID 抽出
function extractID(url) {
  const match = url.match(/v=([^&]+)/);
  return match ? match[1] : null;
}

// ISO8601 → mm:ss
function isoToTime(iso) {
  const match = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  const m = parseInt(match[1] || 0);
  const s = parseInt(match[2] || 0);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 保存
document.getElementById("saveBtn").addEventListener("click", () => {
  const url = document.getElementById("urlInput").value;
  const id = extractID(url);

  const data = {
    id,
    title: document.getElementById("titleInput").value,
    start: document.getElementById("startInput").value,
    duration: document.getElementById("durationInput").value,
    desc: document.getElementById("descInput").value,
    category: document.getElementById("categoryInput").value
  };

  if (editIndex === null) {
    videos.push(data);
  } else {
    videos[editIndex] = data;
  }

  saveLocal();
  renderList("all");

  document.getElementById("formView").classList.add("hidden");
  document.getElementById("listView").classList.remove("hidden");
});

// キャンセル
document.getElementById("cancelBtn").addEventListener("click", () => {
  document.getElementById("formView").classList.add("hidden");
  document.getElementById("listView").classList.remove("hidden");
});
