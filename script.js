<script>
const FALLBACK_FOLDER = 'default';

function getTaipeiDateString() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // "YYYY-MM-DD"
}

function disableOptions() {
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
  });
}

async function fetchJsonWithFallback(folders, filename) {
  for (const folder of folders) {
    try {
      const res = await fetch(`${folder}/${filename}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        return { json, folderUsed: folder };
      }
    } catch (e) {
      // 忽略，嘗試下一個 folder
    }
  }
  return { json: null, folderUsed: null };
}

// 可選：圖片在同一個資料夾可能缺檔時，自動退回 default 圖片
function createImgWithFallback(primarySrc, fallbackSrc, alt = '') {
  const img = new Image();
  img.alt = alt;
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.src = primarySrc;
  img.onerror = () => {
    if (fallbackSrc && img.src !== fallbackSrc) {
      img.src = fallbackSrc;
    }
  };
  return img;
}

async function loadQuestion() {
  const nextButton = document.getElementById("next");
  const questionDiv = document.getElementById("question");
  const optionsDiv = document.getElementById("options");
  const feedbackDiv = document.getElementById("feedback");

  // 1) 初始化 UI
  nextButton.disabled = true;
  nextButton.style.display = "none";
  feedbackDiv.textContent = "";
  optionsDiv.innerHTML = "";
  questionDiv.innerHTML = "<p>Loading today's question...</p>";

  let dateString;
  try {
    dateString = getTaipeiDateString();
  } catch (e) {
    console.error("Error getting Taipei date:", e);
    questionDiv.innerHTML = "<p style='color: red;'>Error getting current date.</p>";
    return;
  }

  // 2) 順序：先當天資料夾，再 default
  const candidateFolders = [dateString, FALLBACK_FOLDER];

  try {
    // 3) 取 question.json（有備援）
    const { json: question, folderUsed } =
      await fetchJsonWithFallback(candidateFolders, 'question.json');

    if (!question || !folderUsed) {
      // 兩個資料夾都失敗
      questionDiv.innerHTML = `<p style="color: red; font-weight: bold;">
        今日題目載入失敗或尚無題目。
      </p><p>(${dateString})</p>`;
      optionsDiv.innerHTML = "";
      return;
    }

    // 4) 載入題目圖片（圖片也做 fallback 到 default）
    questionDiv.innerHTML = "";
    const qImg = createImgWithFallback(
      `${folderUsed}/question.png`,
      folderUsed === FALLBACK_FOLDER ? '' : `${FALLBACK_FOLDER}/question.png`,
      "Question Image"
    );
    questionDiv.appendChild(qImg);

    // 5) 渲染選項
    question.options.forEach((option, index) => {
      const btn = document.createElement("button");
      btn.textContent = option;
      btn.className = `option-btn option-btn-${index + 1}`;

      btn.onclick = () => {
        if (option === question.correct) {
          // 答對
          btn.classList.add("correct");
          feedbackDiv.textContent = "✅ Correct!";
          disableOptions();
          nextButton.disabled = false;
          nextButton.style.display = "block";

          // 顯示答案圖片（也做 fallback）
          questionDiv.innerHTML = "";
          const aImg = createImgWithFallback(
            `${folderUsed}/answer.png`,
            folderUsed === FALLBACK_FOLDER ? '' : `${FALLBACK_FOLDER}/answer.png`,
            "Answer Image"
          );
          questionDiv.appendChild(aImg);
        } else {
          // 答錯
          btn.classList.add("incorrect");
          feedbackDiv.textContent = "❌ Wrong. Try again.";
          btn.disabled = true;
        }
      };

      optionsDiv.appendChild(btn);
    });

  } catch (error) {
    console.error("Error loading question:", error);
    questionDiv.innerHTML = `<p style="color: red; font-weight: bold;">
      今日題目載入失敗或尚無題目。
    </p><p>(${dateString})</p>`;
    optionsDiv.innerHTML = "";
  }
}

// --- 提交邏輯 ---
document.getElementById("next").onclick = () => {
  document.getElementById("submission").style.display = "block";
};

document.getElementById("submit").onclick = () => {
  const id = document.getElementById("idNumber").value.trim();
  const word = document.getElementById("wordOfDay").value.trim();
  const status = document.getElementById("submitFeedback");

  if (!/^\d+$/.test(id)) {
    status.textContent = "❗ 請輸入正確的數字員工號";
    return;
  }
  if (!/^[a-zA-Z]+$/.test(word)) {
    status.textContent = "❗ 請輸入正確的英文單字";
    return;
  }

  status.textContent = "⏳Submitting...";
  document.getElementById("submit").disabled = true;

  fetch("https://script.google.com/macros/s/AKfycbxN_QRhW6F7ogSh_twhLlfMZNbSyGlzip3AmhiWHt1wJ0It4fReU53RJ5Ub5w_nWTLE/exec", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `id=${encodeURIComponent(id)}&word=${encodeURIComponent(word)}`
  })
  .then(r => r.json())
  .then(data => {
    status.textContent = data.message;
    document.getElementById("submit").disabled = (data.status === 'success');
  })
  .catch(err => {
    console.error("Submission error:", err);
    status.textContent = "❌ Submission failed. Check console for details.";
    document.getElementById("submit").disabled = false;
  });
};

// --- 頁面載入時執行 ---
loadQuestion();
</script>
