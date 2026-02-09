const API_KEY = "YOUR_API_KEY_HERE";

// ざっくり PC / モバイル判定
const isMobile = window.innerWidth < 700;

let videos = [];
let editIndex = null;

// 起動時：常に videos.json を読み込む（ローカルストレージは使わない）
fetch("videos.json?v=20240209")
  .then(res => res.json())
  .then(data => {
    videos = data || [];
    renderList("all");
  })
  .catch(err => {
    console.error("videos.json の読み込みに失敗:", err);
  });

// タブ切り替え
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.category;

    if (tab.id === "addTab") return;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    renderList(category);
  });
});

// ＋タブ（PCのみ有効）
const addTab = document.getElementById("addTab");
if (isMobile) {
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

    if (!isMobile) {
      // 通常クリック → YouTubeを開く
      card.addEventListener("click", (e) => {
        // 長押しで編集したときの click を抑制したい場合はフラグ管理も可能
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

    // モバイルでは長押し自体を使わない（スクロール誤作動防止）
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
  let sec = 0;
  if (start.includes(":")) {
    const [m, s] = start.split(":").map(n => parseInt(n || 0, 10));
    sec = m * 60 + s;
  } else {
    sec = parseInt(start, 10) || 0;
  }
  return sec > 0 ? `&t=${sec}s` : "";
}

// 新規追加フォーム（PCのみ）
function openFormForNew() {
  editIndex = null;
  document.getElementById("formTitle").textContent = "動画を追加";
  clearForm();
  showForm();
}

// 編集フォーム（PCのみ）
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

// URL入力 → タイトル＆動画時間自動取得
document.getElementById("urlInput").addEventListener("change", async () => {
  const url = document.getElementById("urlInput").value.trim();
  const id = extractID(url);
  if (!id) {
    alert("YouTube の URL が正しくありません。");
    return;
  }

  // タイトル（oEmbed）
  try {
    const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
      .then(r => {
        if (!r.ok) throw new Error("oEmbed 取得失敗");
        return r.json();
      });
    if (oembed && oembed.title) {
      document.getElementById("titleInput").value = oembed.title;
    }
  } catch (e) {
    console.error("タイトル取得エラー:", e);
  }

  // 動画時間（YouTube Data API）
  try {
    const api = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${id}&part=contentDetails&key=${API_KEY}`
    ).then(r => {
      if (!r.ok) throw new Error("YouTube Data API 取得失敗");
      return r.json();
    });

    if (api.items && api.items.length > 0) {
      const iso = api.items[0].contentDetails.duration;
      document.getElementById("durationInput").value = isoToTime(iso);
    } else {
      console.warn("動画情報が取得できませんでした:", api);
      alert("動画時間を取得できませんでした。APIキーや制限設定を確認してください。");
    }
  } catch (e) {
    console.error("動画時間取得エラー:", e);
    alert("動画時間の取得に失敗しました。コンソールを確認してください。");
  }
});

// YouTube ID 抽出
function extractID(url) {
  const m = url.match(/v=([^&]+)/);
  return m ? m[1] : null;
}

// ISO8601 → mm:ss
function isoToTime(iso) {
  const m = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  const min = parseInt(m?.[1] || "0", 10);
  const sec = parseInt(m?.[2] || "0", 10);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// 保存（PCのみ・videos.json をダウンロード）
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

  if (!data.title) {
    alert("タイトルが空です。");
    return;
  }

  if (editIndex == null) {
    videos.push(data);
  } else {
    videos[editIndex] = data;
  }

  // 画面更新
  renderList("all");
  hideForm();

  // videos.json を自動生成してダウンロード
  downloadVideosJson();

  alert("画面上のリストを更新し、videos.json をダウンロードしました。\nGitHub のリポジトリにアップロードしてください。");
});

// videos.json をダウンロード
function downloadVideosJson() {
  const blob = new Blob([JSON.stringify(videos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "videos.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// キャンセル
document.getElementById("cancelBtn").addEventListener("click", () => {
  hideForm();
});
