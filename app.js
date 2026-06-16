const labels = [
  "授信成功", "授信失败", "放款成功", "放款失败", "逾期未还", "还款成功", "催收", "营销", "其他"
];

const categoryStats = [
  { label: "授信成功", count: 100, color: "#22c55e" },
  { label: "逾期未还", displayLabel: "逾期", count: 30, color: "#fb7185" },
  { label: "放款成功", count: 150, color: "#38bdf8" },
  { label: "催收", count: 10, color: "#f59e0b" },
  { label: "营销", count: 299, color: "#a78bfa" },
  { label: "授信失败", count: 50, color: "#f97316" },
  { label: "还款成功", count: 120, color: "#14b8a6" },
  { label: "放款失败", count: 67, color: "#ef4444" }
];

const categoryTotal = categoryStats.reduce((sum, item) => sum + item.count, 0);

const samples = [
  { label: "授信成功", text: "【额度通知】您的授信已获批，最高额度50000元，点击 https://q9x.cn/a 领取，逾qi将影响征信。" },
  { label: "授信失败", text: "很抱歉，您的授信申请未通过，本次授信失败，原因是综合评分暂不符合要求。" },
  { label: "放款成功", text: "您申请的借款已放款成功，到账金额12000元，请注意查收并按期还款。" },
  { label: "放款失败", text: "您的借款放款失败，银行卡异常导致款项未到账，请核对信息后重新提交。" },
  { label: "还款成功", text: "本期账单已扣款成功，还款金额3260元，账户状态正常。" },
  { label: "逾期未还", text: "您的账单已逾期3天，逾期金额980元，请今日24点前处理，避免影响征信。" },
  { label: "催收", text: "多次提醒仍未还款，请立即联系催sh专员处理欠款，否则将启动后续流程。" },
  { label: "营销", text: "老客户专享福利，免fei领取提额包，额度最高80000元，回复TD退订。" }
];

const variantMap = {
  "逾qi": "逾期",
  "催sh": "催收",
  "免fei": "免费",
  "代款": "贷款",
  "贷欵": "贷款",
  "V信": "微信",
  "薇信": "微信",
  "征芯": "征信",
  "还欵": "还款",
  "放欵": "放款"
};

let dictionary = {
  "授信获批": 0.92,
  "放款成功": 0.90,
  "还款成功": 0.87,
  "逾期金额": 0.84,
  "催收专员": 0.81,
  "提额包": 0.76,
  "征信影响": 0.74,
  "到账金额": 0.72,
  "老客户专享": 0.69,
  "账户状态": 0.66,
  "额度通知": 0.64,
  "本期账单": 0.62
};

let observation = {
  "获批额度": 0.48,
  "领取额度": 0.42,
  "后续流程": 0.39,
  "退订": 0.34
};

const initialDictionaryWords = new Set([
  ...Object.keys(dictionary),
  ...Object.keys(observation),
  "点击",
  "领取"
]);

let todayCount = 0;
let lastResult = null;

const colors = {
  text: "#315f9d",
  numeric: "#16735b",
  symbol: "#b7791f",
  link: "#b83a4b"
};

function normalizeText(text) {
  let normalized = text;
  const variants = [];
  Object.entries(variantMap).forEach(([variant, standard]) => {
    if (normalized.includes(variant)) {
      variants.push({ variant, standard, confidence: variant.includes("qi") || variant.includes("sh") ? 0.9 : 0.95 });
      normalized = normalized.split(variant).join(standard);
    }
  });
  normalized = normalized.replace(/[{}()<>「」『』]/g, "");
  normalized = normalized.replace(/https?:\/\/[^\s，。；]+/g, "[链接]");
  return { normalized, variants };
}

function extractFeatures(text, normalized) {
  const amountMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(元|万|人民币|RMB|￥)?/gi)]
    .map(match => Number(match[1]) * (match[2] === "万" ? 10000 : 1));
  const dateCount = (text.match(/\d{1,4}[年/-]\d{1,2}([月/-]\d{1,2})?/g) || []).length;
  const links = text.match(/https?:\/\/[^\s，。；]+|[a-zA-Z0-9-]+\.(com|cn|net|org|top|xyz)[^\s，。；]*/gi) || [];
  const symbolCount = (text.match(/[！!？?￥%【】★☆✓✔]/g) || []).length;
  const urgentCount = (text.match(/[！!]|立即|今日|马上|24点|逾期/g) || []).length;
  const suspiciousLink = links.some(url => /q9x|xyz|top|verify|secure|login|update|account/i.test(url));

  return {
    text: {
      length: normalized.length,
      keywordHits: countKeywordHits(normalized)
    },
    numeric: {
      amounts: amountMatches,
      amountCount: amountMatches.length,
      maxAmount: amountMatches.length ? Math.max(...amountMatches) : 0,
      dateCount
    },
    symbol: {
      symbolCount,
      urgentCount,
      density: text.length ? symbolCount / text.length : 0
    },
    link: {
      hasLink: links.length > 0,
      linkCount: links.length,
      suspiciousLink,
      links
    }
  };
}

function countKeywordHits(text) {
  const words = ["授信", "获批", "拒绝", "放款", "到账", "失败", "逾期", "还款", "催收", "营销", "额度", "征信", "扣款", "退订"];
  return words.filter(word => text.includes(word));
}

function classify(normalized, features, variants) {
  const scores = Object.fromEntries(labels.map(label => [label, 0.06]));
  const rules = [
    ["授信成功", ["授信", "获批", "额度", "通过"], 0.21],
    ["授信失败", ["授信失败", "未通过", "拒绝", "暂不符合"], 0.27],
    ["放款成功", ["放款成功", "已放款", "到账", "款项"], 0.24],
    ["放款失败", ["放款失败", "失败", "银行卡异常", "重新提交"], 0.24],
    ["逾期未还", ["逾期", "征信", "滞纳", "未还"], 0.25],
    ["还款成功", ["还款成功", "扣款成功", "账单已结清"], 0.28],
    ["催收", ["催收", "欠款", "专员", "联系", "后续流程"], 0.22],
    ["营销", ["专享", "福利", "免息", "免费", "提额", "退订", "领取"], 0.20]
  ];

  rules.forEach(([label, words, weight]) => {
    words.forEach(word => {
      if (normalized.includes(word)) scores[label] += weight;
    });
  });

  if (features.numeric.maxAmount >= 30000) {
    scores["授信成功"] += 0.08;
    scores["营销"] += 0.05;
  }
  if (features.link.hasLink) {
    scores["营销"] += 0.08;
    scores["授信成功"] += 0.04;
  }
  if (features.link.suspiciousLink) {
    scores["营销"] += 0.06;
  }
  if (features.symbol.urgentCount > 0) {
    scores["逾期未还"] += 0.07;
    scores["催收"] += 0.05;
  }
  if (variants.length) {
    scores["催收"] += 0.04;
    scores["营销"] += 0.04;
  }

  const maxScore = Math.max(...Object.values(scores));
  const label = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const confidence = clamp(0.48 + maxScore / 1.55, 0.54, 0.97);
  return { label, confidence, scores };
}

function computeModalWeights(features) {
  const raw = {
    text: 0.44 + Math.min(features.text.keywordHits.length * 0.035, 0.18),
    numeric: 0.16 + Math.min(features.numeric.amountCount * 0.08 + features.numeric.dateCount * 0.04, 0.22),
    symbol: 0.12 + Math.min(features.symbol.urgentCount * 0.05 + features.symbol.density * 2, 0.18),
    link: 0.10 + (features.link.hasLink ? 0.14 : 0) + (features.link.suspiciousLink ? 0.07 : 0)
  };
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value / total]));
}

function discoverCandidates(text, normalized, features, classification) {
  const tokens = normalized.match(/[\u4e00-\u9fa5]{2,8}|[a-zA-Z0-9]+|\[链接\]/g) || [];
  const candidates = new Map();

  const addCandidate = (word, attentionBoost = 0) => {
    if (!word || word.length < 2 || word.length > 8) return;
    if (/^\d+$/.test(word)) return;
    const attention = clamp(0.48 + attentionBoost + keywordAttention(word, classification.label), 0.18, 0.98);
    const pmi = clamp(0.35 + uniqueRatio(word) * 0.38 + (normalized.includes(word) ? 0.12 : 0), 0.2, 0.96);
    const entropy = clamp(0.30 + Math.min(word.length, 6) * 0.08 + (features.link.hasLink ? 0.04 : 0), 0.16, 0.92);
    const labelGuidance = clamp(0.34 + keywordAttention(word, classification.label) * 0.8, 0.22, 0.96);
    const trust = clamp(attention * 0.30 + pmi * 0.25 + entropy * 0.20 + labelGuidance * 0.25, 0, 1);
    candidates.set(word, { word, attention, pmi, entropy, labelGuidance, trust, trusted: trust >= 0.6, inDictionary: isInExistingDictionary(word) });
  };

  tokens.forEach(token => addCandidate(token, 0.05));
  for (let i = 0; i < tokens.length - 1; i += 1) {
    addCandidate(tokens[i] + tokens[i + 1], 0.10);
  }

  const fixedTerms = [
    "授信获批", "获批额度", "领取额度", "额度通知", "征信影响", "综合评分", "授信失败",
    "放款成功", "到账金额", "款项到账", "放款失败", "银行卡异常", "重新提交",
    "还款成功", "扣款成功", "本期账单", "账户状态", "账单结清",
    "逾期金额", "逾期账单", "今日处理", "影响征信", "滞纳风险",
    "催收专员", "后续流程", "欠款处理", "立即联系",
    "老客户专享", "专享福利", "提额包", "额度福利", "回复退订", "免费领取"
  ];
  fixedTerms.forEach(term => {
    if (text.includes(term.slice(0, 2)) || normalized.includes(term.slice(0, 2))) addCandidate(term, 0.16);
  });

  return [...candidates.values()]
    .sort((a, b) => b.trust - a.trust)
    .slice(0, 20);
}

function isInExistingDictionary(word) {
  return initialDictionaryWords.has(word);
}

function keywordAttention(word, label) {
  const table = {
    "授信成功": ["授信", "获批", "额度", "领取"],
    "授信失败": ["失败", "拒绝", "未通过"],
    "放款成功": ["放款", "到账", "款项"],
    "放款失败": ["失败", "异常", "提交"],
    "逾期未还": ["逾期", "征信", "账单", "金额"],
    "还款成功": ["还款", "扣款", "结清"],
    "催收": ["催收", "欠款", "专员", "流程"],
    "营销": ["专享", "福利", "提额", "退订", "领取"]
  };
  const hits = (table[label] || []).filter(key => word.includes(key)).length;
  return hits * 0.14;
}

function updateDictionary(candidates) {
  const graduated = [];
  const observed = [];
  candidates.forEach(candidate => {
    if (candidate.trusted) {
      if (dictionary[candidate.word]) {
        dictionary[candidate.word] = clamp(dictionary[candidate.word] + 0.04, 0, 1);
      } else if ((observation[candidate.word] || 0) + candidate.trust >= 0.7) {
        dictionary[candidate.word] = clamp((observation[candidate.word] || 0) + candidate.trust * 0.35, 0.62, 0.95);
        delete observation[candidate.word];
        graduated.push(candidate.word);
      } else {
        observation[candidate.word] = clamp((observation[candidate.word] || 0) + candidate.trust * 0.32, 0, 0.69);
        observed.push(candidate.word);
      }
    } else if (!dictionary[candidate.word]) {
      observation[candidate.word] = Math.max(observation[candidate.word] || 0, candidate.trust * 0.5);
      observed.push(candidate.word);
    }
  });

  Object.keys(dictionary).forEach(word => {
    const hit = candidates.some(candidate => candidate.word === word);
    if (!hit) dictionary[word] = clamp(dictionary[word] * 0.995, 0.3, 1);
  });

  return { graduated, observed };
}

function analyze() {
  const text = document.querySelector("#smsInput").value.trim();
  if (!text) return;

  const normalizedResult = normalizeText(text);
  const features = extractFeatures(text, normalizedResult.normalized);
  const classification = classify(normalizedResult.normalized, features, normalizedResult.variants);
  const modalWeights = computeModalWeights(features);
  const candidates = discoverCandidates(text, normalizedResult.normalized, features, classification);
  const lifecycle = updateDictionary(candidates);
  const risk = computeRisk(features, normalizedResult.variants, classification);

  todayCount += 1;
  lastResult = { text, ...normalizedResult, features, classification, modalWeights, candidates, lifecycle, risk };
  renderAll(lastResult);
}

function computeRisk(features, variants, classification) {
  let score = 0;
  if (features.link.hasLink) score += 0.22;
  if (features.link.suspiciousLink) score += 0.24;
  if (variants.length) score += 0.18;
  if (classification.label === "逾期未还" || classification.label === "催收") score += 0.16;
  if (features.symbol.urgentCount >= 2) score += 0.12;
  const level = score >= 0.55 ? "高" : score >= 0.28 ? "中" : "低";
  return { score: clamp(score, 0, 1), level };
}

function renderAll(result) {
  document.querySelector("#todayCount").textContent = todayCount;
  document.querySelector("#dictSize").textContent = Object.keys(dictionary).length;
  document.querySelector("#observeSize").textContent = Object.keys(observation).length;
  renderOverview(result);
  renderCandidates(result.candidates);
  renderDictionary(result.lifecycle);
  renderExplain(result);
}

function renderOverview(result) {
  const pct = Math.round(result.classification.confidence * 100);
  document.querySelector("#singleSamplePreview").textContent = result.text;
  document.querySelector("#labelResult").textContent = result.classification.label;
  document.querySelector("#confidenceText").textContent = `${pct}%`;
  document.querySelector("#confidenceBar").style.width = `${pct}%`;
  document.querySelector("#newWordFlag").textContent = result.candidates.some(item => item.trusted) ? "含可信新词" : "未确认";
  document.querySelector("#newWordSummary").textContent = result.candidates.length
    ? `发现 ${result.candidates.length} 个候选词，${result.candidates.filter(item => item.trusted).length} 个超过阈值`
    : "未发现候选新词";
  document.querySelector("#variantFlag").textContent = result.variants.length ? "含变异词" : "未检出";
  document.querySelector("#variantSummary").textContent = result.variants.length
    ? result.variants.map(item => `${item.variant}->${item.standard}`).join("，")
    : "文本未命中形近字、同音字或拼音混写规则";
  document.querySelector("#riskLevel").textContent = `${result.risk.level}风险`;
  document.querySelector("#riskSummary").textContent = `综合风险分 ${Math.round(result.risk.score * 100)}，由链接、变异、紧急符号和业务类型共同决定`;

}

function renderCategoryOverview() {
  let current = 0;
  const stops = categoryStats.map(item => {
    const start = current;
    current += item.count / categoryTotal * 100;
    return `${item.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
  }).join(", ");

  document.querySelector(".total-samples strong").textContent = `${categoryTotal} 条`;
  document.querySelector(".pie-center strong").textContent = categoryTotal;
  document.querySelector(".category-pie").style.setProperty("--pie-data", `conic-gradient(${stops})`);
  document.querySelector("#categoryLegend").innerHTML = categoryStats.map(item => {
    const percentText = formatPercent(item.count / categoryTotal);
    return `
      <div class="legend-item">
        <span class="legend-swatch" style="background:${item.color}"></span>
        <span class="legend-name">${item.displayLabel || item.label}</span>
        <strong class="legend-count">${item.count} 条</strong>
        <strong class="legend-percent">${percentText}</strong>
      </div>
    `;
  }).join("");
}

function renderCandidates(candidates) {
  const search = document.querySelector("#candidateSearch")?.value.trim() || "";
  const hideKnown = document.querySelector("#hideKnownTerms")?.checked || false;
  const filtered = candidates
    .map(item => ({ ...item, inDictionary: isInExistingDictionary(item.word) }))
    .filter(item => !search || item.word.includes(search))
    .filter(item => !hideKnown || !item.inDictionary)
    .sort((a, b) => b.trust - a.trust);

  const rows = filtered.length ? filtered.map(item => `
    <tr>
      <td><strong>${item.word}</strong></td>
      <td>${percent(item.attention)}</td>
      <td>${percent(item.pmi)}</td>
      <td>${percent(item.entropy)}</td>
      <td>${percent(item.labelGuidance)}</td>
      <td><span class="score-pill">${percent(item.trust)}</span></td>
      <td><span class="dict-pill ${item.inDictionary ? "exists" : ""}">${item.inDictionary ? "是" : "否"}</span></td>
      <td>${item.inDictionary ? "<span class='highlight'>现有词</span>" : item.trusted ? "<span class='highlight'>可信新词</span>" : "<span class='warn'>观察中</span>"}</td>
    </tr>
  `).join("") : `<tr><td colspan="8">暂无候选新词</td></tr>`;
  document.querySelector("#candidateRows").innerHTML = rows;
}

function renderDictionary(lifecycle = { graduated: [], observed: [] }) {
  const renderWord = entries => entries
    .sort((a, b) => b[1] - a[1])
    .map(([word, score]) => `
      <div class="dict-bar-row">
        <span class="dict-word" title="${word}">${word}</span>
        <div class="dict-track"><span class="dict-fill" style="width:${Math.round(score * 100)}%"></span></div>
        <strong class="dict-score">${percent(score)}</strong>
      </div>
    `)
    .join("");

  document.querySelector("#mainDict").innerHTML = renderWord(Object.entries(dictionary));
  document.querySelector("#observeDict").innerHTML = renderWord(Object.entries(observation));
  document.querySelector("#lifecycleLog").innerHTML = `
    本轮晋升：<span class="highlight">${lifecycle.graduated.length ? lifecycle.graduated.join("、") : "无"}</span>；
    本轮观察：${lifecycle.observed.length ? lifecycle.observed.slice(0, 8).join("、") : "无"}。
    词典策略：观察区累计置信度达到 0.70 后进入主词典，未命中的主词按衰减因子 0.995 轻量衰减。
  `;
}

function renderExplain(result) {
  const topWords = [...result.candidates].slice(0, 4).map(item => item.word);
  const cards = [
    ["分类依据", `该短信被分类为 <span class="highlight">【${result.classification.label}】</span>，置信度 ${percent(result.classification.confidence)}。模型主要依据 ${topWords.length ? topWords.join("、") : "业务关键词"} 等高注意力词元。`],
    ["多模态证据", `数值模态检测到 ${result.features.numeric.amountCount} 个金额/数字信号，符号模态检测到 ${result.features.symbol.symbolCount} 个特殊符号，链接模态${result.features.link.hasLink ? "检测到链接且参与风险判断" : "未检测到链接"}。`],
    ["新词与变异", `${result.candidates.some(c => c.trusted) ? `可信新词包括 ${result.candidates.filter(c => c.trusted).map(c => c.word).join("、")}` : "暂无候选词超过可信阈值"}；${result.variants.length ? `变异词还原为 ${result.variants.map(v => `${v.variant}->${v.standard}`).join("、")}` : "未发现对抗变异词"}。`],
    ["闭环更新", result.lifecycle.graduated.length ? `本轮已将 ${result.lifecycle.graduated.join("、")} 注入分类词表，并模拟扩展词嵌入矩阵。` : "本轮候选词暂存观察区，等待后续样本累计置信度后再注入词表。"]
  ];
  document.querySelector("#explainBox").innerHTML = cards.map(card => `
    <article class="explain-card">
      <h3>${card[0]}</h3>
      <p>${card[1]}</p>
    </article>
  `).join("");
}

function initSamples() {
  document.querySelector("#sampleList").innerHTML = samples.map((sample, index) => `
    <button class="sample-item" data-index="${index}">
      ${sample.label}
      <span>${sample.text}</span>
    </button>
  `).join("");

  document.querySelectorAll(".sample-item").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector("#smsInput").value = samples[Number(button.dataset.index)].text;
      analyze();
    });
  });
}

function initOverviewSamples() {
  const list = document.querySelector("#overviewSampleList");
  const details = document.querySelector("#singleSampleDetails");

  list.innerHTML = samples.map((sample, index) => `
    <button class="overview-sample-item" data-index="${index}" type="button">
      <strong>${sample.label}</strong>
      <span>${sample.text}</span>
      <b>查看</b>
    </button>
  `).join("");

  list.querySelectorAll(".overview-sample-item").forEach(button => {
    button.addEventListener("click", () => {
      list.querySelectorAll(".overview-sample-item").forEach(item => {
        item.classList.remove("active");
        item.querySelector("b").textContent = "查看";
      });
      button.classList.add("active");
      button.querySelector("b").textContent = "已选中";
      const sample = samples[Number(button.dataset.index)];
      document.querySelector("#smsInput").value = sample.text;
      button.insertAdjacentElement("afterend", details);
      analyze();
      details.hidden = false;
    });
  });
}

function initTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".tab-view").forEach(view => view.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
    });
  });
}

function initCandidateFilters() {
  const search = document.querySelector("#candidateSearch");
  const hideKnown = document.querySelector("#hideKnownTerms");
  const refresh = () => {
    if (lastResult) renderCandidates(lastResult.candidates);
  };
  search.addEventListener("input", refresh);
  hideKnown.addEventListener("change", refresh);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function uniqueRatio(word) {
  return new Set(word.split("")).size / Math.max(word.length, 1);
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

document.querySelector("#analyzeBtn").addEventListener("click", analyze);
document.querySelector("#clearBtn").addEventListener("click", () => {
  document.querySelector("#smsInput").value = "";
});

initSamples();
renderCategoryOverview();
initOverviewSamples();
initTabs();
initCandidateFilters();
renderDictionary();
analyze();
