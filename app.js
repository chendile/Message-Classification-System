const labels = [
  "授信成功", "授信失败", "放款成功", "放款失败", "逾期未还", "还款成功", "催收", "营销", "其他"
];

const samples = [
  { label: "授信成功", text: "【额度通知】您的授信已获批，最高额度50000元，点击 https://q9x.cn/a 领取，逾qi将影响征信。" },
  { label: "放款成功", text: "您申请的借款已放款成功，到账金额12000元，请注意查收并按期还款。" },
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
  const known = new Set(Object.keys(dictionary));
  const tokens = normalized.match(/[\u4e00-\u9fa5]{2,8}|[a-zA-Z0-9]+|\[链接\]/g) || [];
  const candidates = new Map();

  const addCandidate = (word, attentionBoost = 0) => {
    if (!word || word.length < 2 || word.length > 8 || known.has(word)) return;
    if (/^\d+$/.test(word)) return;
    const attention = clamp(0.48 + attentionBoost + keywordAttention(word, classification.label), 0.18, 0.98);
    const pmi = clamp(0.35 + uniqueRatio(word) * 0.38 + (normalized.includes(word) ? 0.12 : 0), 0.2, 0.96);
    const entropy = clamp(0.30 + Math.min(word.length, 6) * 0.08 + (features.link.hasLink ? 0.04 : 0), 0.16, 0.92);
    const labelGuidance = clamp(0.34 + keywordAttention(word, classification.label) * 0.8, 0.22, 0.96);
    const trust = clamp(attention * 0.30 + pmi * 0.25 + entropy * 0.20 + labelGuidance * 0.25, 0, 1);
    candidates.set(word, { word, attention, pmi, entropy, labelGuidance, trust, trusted: trust >= 0.6 });
  };

  tokens.forEach(token => addCandidate(token, 0.05));
  for (let i = 0; i < tokens.length - 1; i += 1) {
    addCandidate(tokens[i] + tokens[i + 1], 0.10);
  }

  const fixedTerms = ["授信获批", "获批额度", "到账金额", "逾期金额", "催收专员", "征信影响", "老客户专享", "提额包", "领取额度"];
  fixedTerms.forEach(term => {
    if (text.includes(term.slice(0, 2)) || normalized.includes(term.slice(0, 2))) addCandidate(term, 0.16);
  });

  return [...candidates.values()]
    .sort((a, b) => b.trust - a.trust)
    .slice(0, 8);
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
  renderPipeline(result);
  renderCandidates(result.candidates);
  renderDictionary(result.lifecycle);
  renderExplain(result);
}

function renderOverview(result) {
  const pct = Math.round(result.classification.confidence * 100);
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

  renderTaskScores(result);
  renderModalLegend(result.modalWeights);
  drawModalCanvas(result.modalWeights);
}

function renderTaskScores(result) {
  const tasks = [
    { name: "短信分类", value: result.classification.confidence, desc: `输出类别：${result.classification.label}` },
    { name: "新词检测", value: result.candidates.some(item => item.trusted) ? 0.86 : 0.42, desc: `${result.candidates.filter(item => item.trusted).length} 个可信新词` },
    { name: "变异检测", value: result.variants.length ? 0.88 : 0.31, desc: result.variants.length ? "命中变异映射规则" : "未命中变异映射规则" }
  ];
  document.querySelector("#taskScores").innerHTML = tasks.map(task => `
    <div class="task-card">
      <h3>${task.name}</h3>
      <div class="confidence"><span>${task.desc}</span><strong>${Math.round(task.value * 100)}%</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(task.value * 100)}%"></div></div>
    </div>
  `).join("");
}

function renderModalLegend(weights) {
  const names = { text: "文本语义", numeric: "数值模态", symbol: "符号模态", link: "链接模态" };
  document.querySelector("#modalLegend").innerHTML = Object.entries(weights).map(([key, value]) => `
    <div class="legend-row">
      <span class="legend-swatch" style="background:${colors[key]}"></span>
      <span>${names[key]}</span>
      <strong>${Math.round(value * 100)}%</strong>
    </div>
  `).join("");
}

function drawModalCanvas(weights) {
  const canvas = document.querySelector("#modalCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);

  const center = { x: width - 150, y: height / 2 };
  const nodes = [
    { key: "text", label: "文本", x: 120, y: 48 },
    { key: "numeric", label: "数值", x: 120, y: 95 },
    { key: "symbol", label: "符号", x: 120, y: 142 },
    { key: "link", label: "链接", x: 120, y: 189 }
  ];

  nodes.forEach(node => {
    ctx.beginPath();
    ctx.moveTo(node.x + 62, node.y);
    ctx.lineTo(center.x - 70, center.y);
    ctx.strokeStyle = colors[node.key];
    ctx.lineWidth = 2 + weights[node.key] * 8;
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  nodes.forEach(node => {
    ctx.fillStyle = colors[node.key];
    roundRect(ctx, node.x - 58, node.y - 17, 116, 34, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${node.label} ${Math.round(weights[node.key] * 100)}%`, node.x, node.y + 5);
  });

  ctx.fillStyle = "#244653";
  roundRect(ctx, center.x - 74, center.y - 38, 148, 76, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 16px sans-serif";
  ctx.fillText("跨模态注意力", center.x, center.y - 5);
  ctx.font = "12px sans-serif";
  ctx.fillText("融合特征 512D", center.x, center.y + 18);
}

function renderPipeline(result) {
  const amountText = result.features.numeric.amounts.length ? result.features.numeric.amounts.join("、") : "无";
  const linksText = result.features.link.links.length ? result.features.link.links.join("、") : "无";
  const steps = [
    ["文本获取", `原始短信完成输入；标准化后文本：${result.normalized}`, "S1"],
    ["纠错与格式标准化", result.variants.length ? `变异还原：${result.variants.map(v => `${v.variant}->${v.standard}`).join("，")}` : "未发现形近字、同音字或拼音混写变异", "S1"],
    ["多模态特征提取", `金额：${amountText}；链接：${linksText}；符号数：${result.features.symbol.symbolCount}；关键词：${result.features.text.keywordHits.join("、") || "无"}`, "S2"],
    ["跨模态多头注意力融合", `文本、数值、符号、链接权重分别为 ${Object.values(result.modalWeights).map(v => `${Math.round(v * 100)}%`).join(" / ")}`, "S3"],
    ["候选新词获取", `从高注意力词元扩展得到 ${result.candidates.length} 个候选词，超过可信阈值 ${result.candidates.filter(c => c.trusted).length} 个`, "S4-S5"],
    ["词表注入与嵌入扩展", result.lifecycle.graduated.length ? `晋升并注入词表：${result.lifecycle.graduated.join("、")}` : "候选词进入观察区，待累计置信度达到阈值后注入", "S6"],
    ["多任务联合训练输出", `分类=${result.classification.label}，新词检测=${result.candidates.some(c => c.trusted) ? "含新词" : "未确认"}，变异检测=${result.variants.length ? "含变异" : "无变异"}`, "S7-S8"]
  ];
  document.querySelector("#pipelineSteps").innerHTML = steps.map((step, index) => `
    <article class="step">
      <div class="step-index">${index + 1}</div>
      <div>
        <h3>${step[0]}</h3>
        <p>${step[1]}</p>
      </div>
      <span class="tag">${step[2]}</span>
    </article>
  `).join("");
}

function renderCandidates(candidates) {
  const rows = candidates.length ? candidates.map(item => `
    <tr>
      <td><strong>${item.word}</strong></td>
      <td>${percent(item.attention)}</td>
      <td>${percent(item.pmi)}</td>
      <td>${percent(item.entropy)}</td>
      <td>${percent(item.labelGuidance)}</td>
      <td><span class="score-pill">${percent(item.trust)}</span></td>
      <td>${item.trusted ? "<span class='highlight'>可信新词</span>" : "<span class='warn'>观察中</span>"}</td>
    </tr>
  `).join("") : `<tr><td colspan="7">暂无候选新词</td></tr>`;
  document.querySelector("#candidateRows").innerHTML = rows;
}

function renderDictionary(lifecycle = { graduated: [], observed: [] }) {
  const renderWord = entries => entries
    .sort((a, b) => b[1] - a[1])
    .map(([word, score]) => `<span class="word-chip">${word}<small>${percent(score)}</small></span>`)
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

function initTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".tab-view").forEach(view => view.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
      if (lastResult) drawModalCanvas(lastResult.modalWeights);
    });
  });
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

document.querySelector("#analyzeBtn").addEventListener("click", analyze);
document.querySelector("#clearBtn").addEventListener("click", () => {
  document.querySelector("#smsInput").value = "";
});

initSamples();
initTabs();
renderDictionary();
analyze();
