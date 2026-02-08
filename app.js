const API_KEY = "YOUR_API_KEY_HERE";

// 画面幅で「スマホかどうか」をざっくり判定
const isMobile = window.innerWidth < 700;

let videos = [];
let editIndex = null;

// 起動時：常に videos.json を読み込む（ローカルストレージは使わない）
fetch("videos.json?v=20240209")
  .then(res => res.json())
  .then(data => {
    videos = data || [];
    renderList("all");
  });

// タブ切り替え
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.category;

    // ＋タブ
    if (tab.id === "addTab") return;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    renderList(category);
  });
});

// ＋タブ（PCのみ有効）
const addTab = document.getElementById("addTab");
if (isMobile) {
  // スマホでは＋を非表示（閲覧専用）
  addTab.style.display = "none";
} else {
  addTab.addEventListener("click", () => {
    openFormForNew();
  });
}

// 一覧描画
function renderList(category) {
  const list = document.getElementById("videoList");
  list.innerHTML = "";

  const filtered = category === "all"
    ? videos
    : videos.filter(v => v.category === category);

  filtered.forEach((v, index) => {
    const card = document.createElement("div");
    card.className = "card";

    const thumb = document.createElement("div");
    thumb.className = "thumb-wrapper";
    thumb.innerHTML = `
      <img src="https://img.youtube.com/vi/${v.id}/hqdefault.jpg">
      <div class="duration-badge">${v.duration || ""}</div>
    `;

    const body = document.createElement("div");
    body.className = "card-body";
    body.innerHTML = `
      <div class="card-title">${v.title}</div>
      <div class="card-desc">${v.desc || ""}</div>
      <div class="card-meta">${labelForCategory(v.category)} / 開始: ${v.start || "-"}</div>
    `;

    card.appendChild(thumb);
    card.appendChild(body);

    // PCのみ：クリックでYouTubeへ、長押しで編集
    if (!isMobile) {
      // 通常クリック → YouTubeを開く
      card.addEventListener("click", (e) => {
        // 編集モードへの長押しと区別したいなら、ここでフラグを使うこともできる
        window.open(`https://www.youtube.com/watch?v=${v.id}${buildStartParam(v.start)}`, "_blank");
      });

      // 長押しで編集（マウス用）
      let mouseTimer = null;
      card.addEventListener("mousedown", (e) => {
        mouseTimer = setTimeout(() => {
          e.preventDefault();
          openEdit(index);
        }, 600);
      });
      card.addEventListener("mouseup", () => {
        clearTimeout(mouseTimer);
      });
      card.addEventListener("mouseleave", () => {
        clearTimeout(mouseTimer);
      });
    }

    // スマホでは長押し自体を無効化（スクロール誤作動防止）
    list.appendChild(card);
  });
}

function labelForCategory(cat) {
  if (cat === "sleep") return "睡眠用";
  if (cat === "work") return "作業用";
  if (cat === "fav") return "お気に入り";
  return "";
}

function buildStartParam(start) {
  if (!start) return "";
  // "mm:ss" or "ss" を秒に変換
  let sec = 0;
  if (start.includes(":")) {
    const [m, s] = start.split(":").map(n => parseInt(n || 0, 10));
    sec = m * 60 + s;
  } else {
    sec = parseInt(start, 10) || 0;
  }
  return sec > 0 ? `&t=${sec}s` : "";
}

// 新規追加フォームを開く（PCのみ）
function openFormForNew() {
  editIndex = null;
  document.getElementById("formTitle").textContent = "動画を追加";
  clearForm();
  showForm();
}

// 編集フォームを開く（PCのみ）
function openEdit(index) {
  editIndex = index;
  const v = videos[index];

  document.getElementById("formTitle").textContent = "動画を編集";
  document.getElementById("urlInput").value = `https://www.youtube.com/watch?v=${v.id}`;
  document.getElementById("titleInput").value = v.title;
  document.getElementById("startInput").value = v.start || "";
  document.getElementById("durationInput").value = v.duration || "";
  document.getElementById("descInput").value = v.desc || "";
  document.getElementById("categoryInput").value = v.category || "work";

  showForm();
}

function showForm() {
  document.getElementById("formView").classList.remove("hidden");
  document.getElementById("listView").classList.add("hidden");
}

function hideForm() {
  document.getElementById("formView").classList.add("hidden");
  document.getElementById("listView").classList.remove("hidden");
}

function clearForm() {
  document.getElementById("urlInput").value = "";
  document.getElementById("titleInput").value = "";
  document.getElementById("startInput").value = "";
  document.getElementById("durationInput").value = "";
  document.getElementById("descInput").value = "";
  document.getElementById("categoryInput").value = "work";
}

// URL入力 → タイトル＆時間自動取得
document.getElementById("urlInput").addEventListener("change", async () => {
  const url = document.getElementById("urlInput").value.trim();
  const id = extractID(url);
  if (!id) return;

  // タイトル（oEmbed）
  try {
    const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
      .then(r => r.json());
    if (oembed && oembed.title) {
      document.getElementById("titleInput").value = oembed.title;
    }
  } catch (e) {
    // 失敗しても無視
  }

  // 動画時間（YouTube Data API）
  try {
    const api = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${id}&part=contentDetails&key=${API_KEY}`
    ).then(r => r.json());

    if (api.items && api.items.length > 0) {
      const iso = api.items[0].contentDetails.duration;
      document.getElementById("durationInput").value = isoToTime(iso);
    }
  } catch (e) {
    // 失敗しても無視
  }
});

// YouTube ID 抽出
function extractID(url) {
  const m = url.match(/v=([^&]+)/);
  return m ? m[1] : null;
}

// ISO8601 → mm:ss
function isoToTime(iso) {
  // PT#M#S だけ対応（時間は想定しない）
  const m = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  const min = parseInt(m?.[1] || "0", 10);
  const sec = parseInt(m?.[2] || "0", 10);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// 保存（PCのみ有効）
document.getElementById("saveBtn").addEventListener("click", () => {
  if (isMobile) {
    alert("スマートフォンからの編集は無効です（PCで編集してください）。");
    return;
  }

  const url = document.getElementById("urlInput").value.trim();
  const id = extractID(url);
  if (!id) {
    alert("URLが不正です。");
    return;
  }

  const data = {
    id,
    title: document.getElementById("titleInput").value.trim(),
    start: document.getElementById("startInput").value.trim(),
    duration: document.getElementById("durationInput").value.trim(),
    desc: document.getElementById("descInput").value.trim(),
    category: document.getElementById("categoryInput").value
  };

  if (editIndex == null) {
    videos.push(data);
  } else {
    videos[editIndex] = data;
  }

  // ここではローカルには保存せず、PC側で videos.json に反映して GitHub に push する運用
  // 一旦画面上だけ更新
  renderList("all");
  hideForm();

  alert("画面上のリストは更新されました。\nvideos.json にも反映して GitHub に push してください。");
});

// キャンセル
document.getElementById("cancelBtn").addEventListener("click", () => {
  hideForm();
});
