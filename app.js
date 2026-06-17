const labels = [
  "授信成功", "授信失败", "放款成功", "放款失败", "逾期未还", "还款成功", "催收", "营销", "其他"
];

const categoryStats = [
  { label: "授信成功", count: 100, color: "#7dd3fc" },
  { label: "逾期未还", displayLabel: "逾期", count: 30, color: "#f9a8d4" },
  { label: "放款成功", count: 150, color: "#a7f3d0" },
  { label: "催收", count: 10, color: "#fde68a" },
  { label: "营销", count: 299, color: "#c4b5fd" },
  { label: "授信失败", count: 50, color: "#fdba74" },
  { label: "还款成功", count: 120, color: "#67e8f9" },
  { label: "放款失败", count: 67, color: "#fca5a5" }
];

const categoryTotal = categoryStats.reduce((sum, item) => sum + item.count, 0);

const supervisedTrainingRounds = [
  {
    round: 1,
    time: "2026/6/16 10:00",
    words: ["支付宝", "最高额度", "花呗", "授信失败"],
    macroF1: 0.812,
    accuracy: 0.824,
    macroRecall: 0.798
  },
  {
    round: 2,
    time: "2026/6/16 10:12",
    words: ["授信申请", "已获批", "已逾期", "提额包"],
    macroF1: 0.838,
    accuracy: 0.849,
    macroRecall: 0.826
  },
  {
    round: 3,
    time: "2026/6/16 10:25",
    words: ["放款失败", "综合评分", "扣款成功", "很抱歉"],
    macroF1: 0.861,
    accuracy: 0.872,
    macroRecall: 0.854
  },
  {
    round: 4,
    time: "2026/6/16 10:37",
    words: ["逾期金额", "授信获批", "本次授信失败", "到账金额"],
    macroF1: 0.884,
    accuracy: 0.891,
    macroRecall: 0.875
  },
  {
    round: 5,
    time: "2026/6/16 10:50",
    words: ["支付宝", "最高额度", "综合评分", "逾期金额"],
    macroF1: 0.907,
    accuracy: 0.913,
    macroRecall: 0.899
  }
];

const supervisedTrainingResults = [
  { text: "综合评分暂不符合要求", truth: "授信失败", prediction: "授信失败", confidence: 0.91 },
  { text: "授信已获批，额度可领取", truth: "授信成功", prediction: "授信成功", confidence: 0.94 },
  { text: "借款已放款成功，请查收", truth: "放款成功", prediction: "放款成功", confidence: 0.93 },
  { text: "银行卡异常导致放款失败", truth: "放款失败", prediction: "放款失败", confidence: 0.89 },
  { text: "账单已逾期，请今日处理", truth: "逾期未还", prediction: "逾期未还", confidence: 0.92 },
  { text: "本期账单扣款成功", truth: "还款成功", prediction: "还款成功", confidence: 0.90 },
  { text: "请联系催收专员处理欠款", truth: "催收", prediction: "催收", confidence: 0.88 },
  { text: "老客户专享福利，回复退订", truth: "营销", prediction: "营销", confidence: 0.95 }
];

const samples = [
  { label: "授信失败", text: "很抱歉，您的授信申请未通过，本次授信失败，原因是综合评分暂不符合要求。" },
  { label: "授信成功", text: "【额度通知】您的授信已获批，最高额度50000元，点击 https://q9x.cn/a 领取，逾qi将影响征信。" },
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

const mainDictionarySeed = {
  "授信申请": 0.89,
  "授信失败": 0.91,
  "已获批": 0.88,
  "最高额度": 0.95,
  "放款失败": 0.82,
  "支付宝": 0.99,
  "花呗": 0.92,
  "已逾期": 0.87,
  "提额包": 0.85
};

const observationSeed = {
  "很抱歉": 0.72,
  "综合评分": 0.75,
  "授信获批": 0.67,
  "本次授信失败": 0.65,
  "到账金额": 0.63,
  "扣款成功": 0.74,
  "逾期金额": 0.72
};

let dictionary = { ...mainDictionarySeed };
let observation = { ...observationSeed };

const newWordDictionary = [
  ...Object.entries(mainDictionarySeed).map(([word, score]) => ({ word, score, source: "main" })),
  ...Object.entries(observationSeed).map(([word, score]) => ({ word, score, source: "observe" }))
];

const existingVocabularyWords = new Set(["已逾期", "花呗", "综合评分"]);

const initialDictionaryWords = new Set([
  ...Object.keys(dictionary),
  ...Object.keys(observation),
  "点击",
  "领取"
]);

let todayCount = 0;
let lastResult = null;
let selectedSample = null;
let corrections = {};
let runtimeConfig = getRuntimeConfig();
let dictionaryEditMode = false;
let taskLogs = [];
let taskSequence = 0;
let resultSequence = 0;
const currentUser = "cdl";
const defaultModelName = "默认：内置规则模型";

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

function classify(normalized, features, variants, config = runtimeConfig) {
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
  const predictedLabel = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const confidence = clamp(0.48 + maxScore / 1.55, 0.54, 0.97);
  const belowThreshold = confidence < config.confidenceThreshold;
  const label = belowThreshold ? "其他" : predictedLabel;
  return { label, predictedLabel, confidence, scores, belowThreshold };
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

function discoverCandidates() {
  return newWordDictionary
    .map(item => {
      const textFeature = clamp(item.score + (item.source === "main" ? 0.03 : 0.02), 0, 1);
      const contribution = clamp(item.score - 0.02, 0, 1);
      const boundary = clamp(item.score + (item.word.length >= 4 ? 0.01 : -0.01), 0, 1);
      const categoryRelated = clamp(item.score * 4 - textFeature - contribution - boundary, 0, 1);
      return {
        word: item.word,
        attention: textFeature,
        pmi: contribution,
        entropy: boundary,
        labelGuidance: categoryRelated,
        trust: item.score,
        trusted: item.source === "main",
        inDictionary: existingVocabularyWords.has(item.word),
        source: item.source
      };
    })
    .sort((a, b) => b.trust - a.trust);
}

function isInExistingDictionary(word) {
  return initialDictionaryWords.has(word) || Boolean(dictionary[word]);
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
  return {
    graduated: candidates.filter(item => item.source === "main").map(item => item.word),
    observed: candidates.filter(item => item.source === "observe").map(item => item.word),
    decayed: []
  };
}

function analyze() {
  const text = document.querySelector("#smsInput").value.trim();
  if (!text) return;

  runtimeConfig = getRuntimeConfig();
  renderParameterSummary(runtimeConfig);
  const normalizedResult = normalizeText(text);
  const features = extractFeatures(text, normalizedResult.normalized);
  const classification = classify(normalizedResult.normalized, features, normalizedResult.variants, runtimeConfig);
  const modalWeights = computeModalWeights(features);
  const candidates = discoverCandidates(text, normalizedResult.normalized, features, classification, runtimeConfig);
  const lifecycle = updateDictionary(candidates);
  const risk = computeRisk(features, normalizedResult.variants, classification);

  todayCount += 1;
  const resultId = `result-${++resultSequence}`;
  lastResult = { resultId, text, ...normalizedResult, features, classification, modalWeights, candidates, lifecycle, risk, config: runtimeConfig, sampleId: selectedSample?.id || "" };
  logDictionaryIteration(lastResult);
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
  setText("#todayCount", todayCount);
  setText("#dictSize", Object.keys(dictionary).length);
  setText("#observeSize", Object.keys(observation).length);
  renderOverview(result);
  renderCandidates(result.candidates);
  renderDictionary(result);
  renderIterationGraph(result);
  renderTrainingTimeline(result);
  renderTrainingClassificationResults(result);
  renderTaskLogs();
}

function getSingleSampleCandidates(result) {
  const text = `${result.text}${result.normalized || ""}`;
  const semanticMatches = {
    "授信获批": ["授信", "获批"],
    "提额包": ["提额"],
    "授信申请": ["授信", "申请"]
  };

  return result.candidates.filter(item => {
    if (text.includes(item.word)) return true;
    const parts = semanticMatches[item.word];
    return parts ? parts.every(part => text.includes(part)) : false;
  });
}

function renderOverview(result) {
  const pct = Math.round(result.classification.confidence * 100);
  const correction = selectedSample ? corrections[selectedSample.id] : null;
  const finalLabel = correction?.manualLabel || result.classification.label;
  const sampleCandidates = getSingleSampleCandidates(result);
  document.querySelector("#labelResult").textContent = finalLabel;
  document.querySelector("#confidenceText").textContent = `${pct}%`;
  document.querySelector("#confidenceBar").style.width = `${pct}%`;
  document.querySelector("#newWordFlag").textContent = sampleCandidates.some(item => item.trusted) ? "含可信新词" : "未确认";
  document.querySelector("#newWordSummary").textContent = sampleCandidates.length
    ? `发现 ${sampleCandidates.length} 个候选词`
    : "未发现候选新词";
  document.querySelector("#variantFlag").textContent = result.variants.length ? "含变异词" : "未检出";
  document.querySelector("#variantSummary").textContent = result.variants.length
    ? result.variants.map(item => `${item.variant}->${item.standard}`).join("，")
    : "文本未命中形近字、同音字或拼音混写规则";
  renderCorrectionPanel(result);

}

function getRuntimeConfig() {
  const minInput = document.querySelector("#minNewWordLength");
  const maxInput = document.querySelector("#maxNewWordLength");
  const thresholdInput = document.querySelector("#confidenceThreshold");
  const modelInput = document.querySelector("#modelEndpoint");
  const minNewWordLength = clamp(Number(minInput?.value || 2), 2, 12);
  const maxNewWordLength = clamp(Number(maxInput?.value || 8), minNewWordLength, 12);
  const confidenceThreshold = clamp(Number(thresholdInput?.value || 0.7), 0.7, 1);
  return {
    modelEndpoint: (modelInput?.value || "").trim() || "默认：内置规则模型",
    minNewWordLength,
    maxNewWordLength,
    confidenceThreshold
  };
}

function renderParameterSummary(config) {
  document.querySelector("#minNewWordLength").value = config.minNewWordLength;
  document.querySelector("#maxNewWordLength").value = config.maxNewWordLength;
  document.querySelector("#confidenceThreshold").value = config.confidenceThreshold.toFixed(2);
  document.querySelector("#parameterSummary").textContent =
    `当前参数：模型地址 ${config.modelEndpoint}；新词长度 ${config.minNewWordLength}-${config.maxNewWordLength} 字；置信度低于 ${config.confidenceThreshold.toFixed(2)} 归为其他并进入人工审核。`;
}

function renderCorrectionPanel(result) {
  const panel = document.querySelector("#manualCorrection");
  if (!selectedSample) {
    panel.hidden = true;
    return;
  }

  const correction = corrections[selectedSample.id];
  panel.hidden = false;
  const auditText = result.classification.belowThreshold ? `，原预测：${result.classification.predictedLabel}` : "";
  document.querySelector("#autoLabelText").textContent = `自动标注：${result.classification.label}${auditText}，置信度 ${percent(result.classification.confidence)}`;
  document.querySelector("#correctedLabel").value = correction?.manualLabel || result.classification.label;
  document.querySelector("#correctionReason").value = correction?.reason || "";
  setCorrectionStatus(
    correction
      ? `已人工修正为：${correction.manualLabel}。`
      : "人工修正会覆盖该样本的最终展示分类。",
    correction ? "saved" : ""
  );
}

function setCorrectionStatus(message, type = "") {
  const status = document.querySelector("#correctionStatus");
  status.textContent = message;
  status.classList.remove("saved", "error");
  if (type) status.classList.add(type);
}

function addTaskLog(entry) {
  taskLogs.unshift({
    id: `task-${++taskSequence}`,
    user: currentUser,
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    ...entry
  });
  taskLogs = taskLogs.slice(0, 60);
}

function seedTaskLogs() {
  const baseTasks = [
    {
      user: "cdl",
      time: "2026/5/18 09:20:11",
      type: "短信分类",
      words: ["主词典：最高额度：95%", "主词典：已获批：88%", "观察区：授信获批：67%"],
      model: defaultModelName,
      params: "新词 2-6 字；门限 0.80",
      sampleId: "sample-0"
    },
    {
      user: "zhangmin",
      time: "2026/5/24 14:41:36",
      type: "短信分类",
      words: ["主词典：放款失败：82%", "观察区：到账金额：63%", "观察区：综合评分：75%"],
      model: defaultModelName,
      params: "新词 3-5 字；门限 0.85",
      sampleId: "sample-3"
    },
    {
      user: "liwen",
      time: "2026/5/31 10:05:49",
      type: "手动词典更新",
      words: ["观察区：很抱歉：72%", "观察区：本次授信失败：65%"],
      model: defaultModelName,
      params: "新词 4-7 字；门限 0.82",
      sampleId: "sample-7"
    },
    {
      user: "zhouyan",
      time: "2026/5/28 13:24:09",
      type: "单条短信分类",
      words: ["主词典：授信失败：91%", "观察区：很抱歉：72%", "观察区：综合评分：75%"],
      model: defaultModelName,
      params: "新词 2-8 字；门限 0.78",
      sampleId: "sample-1"
    },
    {
      user: "liujie",
      time: "2026/6/2 18:06:44",
      type: "批量短信分类",
      words: ["主词典：放款失败：82%", "观察区：到账金额：63%", "主词典：支付宝：99%"],
      model: defaultModelName,
      params: "新词 2-8 字；门限 0.80",
      sampleId: "sample-3"
    },
    {
      user: "wangyu",
      time: "2026/6/7 16:32:18",
      type: "短信分类",
      words: ["主词典：已逾期：87%", "观察区：逾期金额：72%", "主词典：花呗：92%"],
      model: defaultModelName,
      params: "新词 3-8 字；门限 0.88",
      sampleId: "sample-5"
    },
    {
      user: "sunhao",
      time: "2026/6/11 08:52:31",
      type: "单条短信分类",
      words: ["主词典：已获批：88%", "主词典：最高额度：95%", "观察区：授信获批：67%"],
      model: defaultModelName,
      params: "新词 2-6 字；门限 0.82",
      sampleId: "sample-0"
    },
    {
      user: "chenqi",
      time: "2026/6/15 11:08:03",
      type: "手动词典更新",
      words: ["主词典：授信申请：89%", "主词典：支付宝：99%", "观察区：扣款成功：74%"],
      model: defaultModelName,
      params: "新词 2-5 字；门限 0.80",
      sampleId: "sample-0"
    },
    {
      user: "huangrui",
      time: "2026/6/16 15:19:22",
      type: "批量短信分类",
      words: ["主词典：提额包：85%", "主词典：花呗：92%", "观察区：逾期金额：72%"],
      model: defaultModelName,
      params: "新词 3-8 字；门限 0.84",
      sampleId: "sample-7"
    },
    {
      user: "wuxin",
      time: "2026/6/17 09:37:05",
      type: "手动词典更新",
      words: ["主词典：已逾期：87%", "观察区：扣款成功：74%", "观察区：本次授信失败：65%"],
      model: defaultModelName,
      params: "新词 2-8 字；门限 0.81",
      sampleId: "sample-5"
    },
    {
      user: "zhenghao",
      time: "2026/6/17 14:26:48",
      type: "手动词典更新",
      words: ["主词典：支付宝：99%", "主词典：花呗：92%", "观察区：综合评分：75%"],
      model: defaultModelName,
      params: "新词 2-8 字；门限 0.83",
      sampleId: "sample-1"
    }
  ];

  taskLogs = baseTasks
    .sort((a, b) => new Date(b.time.replace(/\//g, "-")).getTime() - new Date(a.time.replace(/\//g, "-")).getTime())
    .map(task => ({ id: `task-${++taskSequence}`, ...task }));
}

function logDictionaryIteration(result) {
  const linkedEntries = getLinkedDictionaryEntries(result);
  const changedWords = [
    ...linkedEntries.main.map(([word, score]) => `主词典：${word}：${percent(score)}`),
    ...linkedEntries.observe.map(([word, score]) => `观察区：${word}：${percent(score)}`)
  ];
  addTaskLog({
    type: "短信分类",
    words: changedWords.length ? changedWords : ["本轮无词典变更"],
    model: result.config.modelEndpoint,
    params: formatConfig(result.config),
    resultLabel: result.classification.label,
    sampleId: result.sampleId,
    resultId: result.resultId
  });
}

function formatConfig(config) {
  return `新词 ${config.minNewWordLength}-${config.maxNewWordLength} 字；门限 ${config.confidenceThreshold.toFixed(2)}`;
}

function renderTaskLogs() {
  const taskRows = document.querySelector("#taskRows");
  if (!taskRows) return;
  const visibleLogs = selectedSample
    ? taskLogs.filter(log => log.sampleId === selectedSample.id)
    : taskLogs;
  const sortedLogs = [...visibleLogs]
    .sort((a, b) => new Date(b.time.replace(/\//g, "-")).getTime() - new Date(a.time.replace(/\//g, "-")).getTime());
  taskRows.innerHTML = sortedLogs.length ? sortedLogs.map(log => `
    <tr>
      <td>${log.user}</td>
      <td>${log.time}</td>
      <td><strong>${log.type}</strong></td>
      <td>${renderTaskWords(log.words)}</td>
      <td>${log.model}</td>
      <td>${log.params}</td>
      <td><button class="task-link" type="button" data-sample-id="${log.sampleId || ""}">查看结果</button></td>
    </tr>
  `).join("") : `<tr><td colspan="7">当前样本暂无任务记录</td></tr>`;
}

function renderTaskWords(words) {
  const list = words.length ? words : ["无修改词"];
  return `
    <details class="task-word-list">
      <summary>${list.length} 项修改</summary>
      ${list.map(word => `<div>${word}</div>`).join("")}
    </details>
  `;
}

function getLinkedWords(result, roundIndex = 0) {
  const candidates = result?.candidates || discoverCandidates();
  const chunkSize = 4;
  const start = roundIndex * chunkSize;
  const chunk = candidates.slice(start, start + chunkSize);
  return (chunk.length ? chunk : candidates.slice(0, chunkSize))
    .map(item => `${item.word}：${percent(item.trust)}`);
}

function renderTrainingTimeline(result = lastResult) {
  const container = document.querySelector("#trainingTimeline");
  if (!container) return;
  container.innerHTML = supervisedTrainingRounds.map((round, index) => {
    const previous = supervisedTrainingRounds[index - 1];
    const f1Delta = previous ? round.macroF1 - previous.macroF1 : 0;
    const accDelta = previous ? round.accuracy - previous.accuracy : 0;
    const linkedWords = getLinkedWords(result, index);
    return `
      <article class="training-round">
        <div class="round-marker">
          <span>第 ${round.round} 轮</span>
          <strong>${round.time}</strong>
        </div>
        <div class="round-body">
          <div class="round-head">
            <h3>第 ${round.round} 轮监督训练</h3>
            <span>更新 ${linkedWords.length} 个词</span>
          </div>
          <div class="round-words">
            ${linkedWords.map(word => `<span>${word}</span>`).join("")}
          </div>
          <div class="metric-grid">
            ${renderTrainingMetric("Macro-F1", round.macroF1, f1Delta, true)}
            ${renderTrainingMetric("Accuracy", round.accuracy, accDelta)}
            ${renderTrainingMetric("Macro-Recall", round.macroRecall, previous ? round.macroRecall - previous.macroRecall : 0)}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderTrainingMetric(name, value, delta, primary = false) {
  const deltaText = delta > 0 ? `+${(delta * 100).toFixed(1)}%` : "基线";
  return `
    <div class="training-metric ${primary ? "primary-metric" : ""}">
      <span>${name}</span>
      <strong>${(value * 100).toFixed(1)}%</strong>
      <em>${deltaText}</em>
    </div>
  `;
}

function startSupervisedTraining() {
  const status = document.querySelector("#trainingStatus");
  const result = document.querySelector("#trainingResult");
  status.textContent = "训练结束，已生成时间轴和分类结果。";
  status.classList.add("done");
  result.hidden = false;
  renderTrainingTimeline(lastResult);
  renderTrainingClassificationResults(lastResult);
}

function renderTrainingClassificationResults(result = lastResult) {
  const rows = selectedSample && result ? [{
    text: selectedSample.text,
    truth: selectedSample.label,
    prediction: corrections[selectedSample.id]?.manualLabel || result.classification.label,
    confidence: result.classification.confidence
  }] : supervisedTrainingResults;

  document.querySelector("#trainingClassRows").innerHTML = rows.map(item => `
    <tr>
      <td>${item.text}</td>
      <td>${item.truth}</td>
      <td>${item.prediction}</td>
      <td>${percent(item.confidence)}</td>
      <td>${item.truth === item.prediction ? "<span class='highlight'>正确</span>" : "<span class='warn'>错误</span>"}</td>
    </tr>
  `).join("");
}

function initTrainingControls() {
  document.querySelector("#startTraining").addEventListener("click", startSupervisedTraining);
  document.querySelector("#trainingFile").addEventListener("change", event => {
    const file = event.target.files[0];
    document.querySelector("#trainingFileName").textContent = file ? `已选择：${file.name}` : "已选择：supervised_samples_20260616.csv";
  });
}

function openTaskResult(sampleId) {
  activateTab("overview");
  if (sampleId) {
    const sampleButton = document.querySelector(`.overview-sample-item[data-sample-id="${sampleId}"]`);
    if (sampleButton) {
      sampleButton.click();
      return;
    }
  }
  document.querySelector("#singleSampleDetails").hidden = false;
}

async function loadCorrections() {
  try {
    const response = await fetch("/api/corrections");
    if (!response.ok) throw new Error("load failed");
    const payload = await response.json();
    corrections = payload.corrections || {};
  } catch (error) {
    corrections = {};
  }
}

async function saveManualCorrection() {
  if (!selectedSample || !lastResult) return;

  const manualLabel = document.querySelector("#correctedLabel").value;
  const reason = document.querySelector("#correctionReason").value.trim();
  const correction = {
    sampleId: selectedSample.id,
    text: selectedSample.text,
    autoLabel: lastResult.classification.label,
    manualLabel,
    confidence: lastResult.classification.confidence,
    reason,
    source: "manual",
    correctedAt: new Date().toISOString()
  };

  try {
    const response = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(correction)
    });
    if (!response.ok) throw new Error("save failed");
    const payload = await response.json();
    corrections[payload.correction.sampleId] = payload.correction;
    logManualCorrection(correction);
    renderOverview(lastResult);
    renderTaskLogs();
    setCorrectionStatus(`已保存人工修正：${manualLabel}。`, "saved");
  } catch (error) {
    corrections[correction.sampleId] = correction;
    logManualCorrection(correction);
    renderOverview(lastResult);
    renderTaskLogs();
    setCorrectionStatus("后端未连接，已仅在当前页面临时生效。请用 node server.js 启动后端后保存。", "error");
  }
}

function logManualCorrection(correction) {
  addTaskLog({
    type: "短信分类",
    words: [`${correction.autoLabel} -> ${correction.manualLabel}`, correction.reason ? `说明：${correction.reason}` : "无修正说明"],
    model: runtimeConfig.modelEndpoint,
    params: formatConfig(runtimeConfig),
    resultLabel: correction.manualLabel,
    sampleId: correction.sampleId,
    resultId: lastResult?.resultId || ""
  });
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
    .map(item => ({ ...item, inDictionary: existingVocabularyWords.has(item.word) }))
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
      <td>${item.source === "main" ? "<span class='highlight'>主词典</span>" : "<span class='warn'>观察区</span>"}</td>
    </tr>
  `).join("") : `<tr><td colspan="8">暂无候选新词</td></tr>`;
  document.querySelector("#candidateRows").innerHTML = rows;
}

function getLinkedDictionaryEntries(result = lastResult) {
  if (!result) return { main: [], observe: [] };
  const entries = result.candidates.reduce((groups, item) => {
    groups[item.source === "main" ? "main" : "observe"].push([item.word, item.trust]);
    return groups;
  }, { main: [], observe: [] });

  return entries;
}

function renderDictionary(result = lastResult) {
  const renderWord = (entries, source) => entries
    .sort((a, b) => b[1] - a[1])
    .map(([word, score]) => `
      <div class="dict-bar-row">
        <span class="dict-word" title="${word}">${word}</span>
        <div class="dict-track"><span class="dict-fill" style="width:${Math.round(score * 100)}%"></span></div>
        <strong class="dict-score">${percent(score)}</strong>
        <label class="dict-remove">
          <input type="checkbox" class="dict-remove-check" data-source="${source}" data-word="${word}">
          踢出
        </label>
      </div>
    `)
    .join("");

  const mainDict = document.querySelector("#mainDict");
  const observeDict = document.querySelector("#observeDict");
  mainDict.classList.toggle("editing", dictionaryEditMode);
  observeDict.classList.toggle("editing", dictionaryEditMode);
  document.querySelector("#toggleDictEdit").textContent = dictionaryEditMode ? "退出人工调整" : "人工调整词典";
  document.querySelector("#applyDictEdit").disabled = !dictionaryEditMode;
  const linkedEntries = getLinkedDictionaryEntries(result);
  mainDict.innerHTML = linkedEntries.main.length
    ? renderWord(linkedEntries.main, "main")
    : "<p class='muted'>暂无主词典新词</p>";
  observeDict.innerHTML = linkedEntries.observe.length
    ? renderWord(linkedEntries.observe, "observe")
    : "<p class='muted'>暂无观察区新词</p>";
  document.querySelector("#lifecycleLog").innerHTML = `
    升入主词典：<span class="highlight">${linkedEntries.main.length ? linkedEntries.main.map(([word]) => word).join("、") : "无"}</span>；
    观察区：${linkedEntries.observe.length ? linkedEntries.observe.map(([word]) => word).join("、") : "无"}。
  `;
}

function toggleDictionaryEdit() {
  dictionaryEditMode = !dictionaryEditMode;
  renderDictionary(lastResult);
}

function applyDictionaryEdit() {
  const checkedItems = [...document.querySelectorAll(".dict-remove-check:checked")];
  const removedWords = checkedItems.map(item => `${item.dataset.source === "main" ? "主词典" : "观察区"}：${item.dataset.word}`);
  checkedItems.forEach(item => {
    if (item.dataset.source === "main") {
      delete dictionary[item.dataset.word];
    } else {
      delete observation[item.dataset.word];
    }
  });
  if (removedWords.length) {
    addTaskLog({
      type: "手动词典更新",
      words: removedWords.map(word => `踢出：${word}`),
      model: runtimeConfig.modelEndpoint,
      params: formatConfig(runtimeConfig),
      resultLabel: lastResult?.classification.label || "-",
      sampleId: lastResult?.sampleId || "",
      resultId: lastResult?.resultId || ""
    });
  }
  dictionaryEditMode = false;
  renderDictionary(lastResult);
  renderCandidates(lastResult?.candidates || []);
  if (lastResult) renderIterationGraph(lastResult);
  renderTaskLogs();
}

function renderIterationGraph(result) {
  const graph = document.querySelector("#iterationGraph");
  if (!graph) return;
  const candidates = [...result.candidates].sort((a, b) => b.trust - a.trust);
  const candidateWords = candidates.slice(0, 8).map(item => `${item.word} ${percent(item.trust)}`);
  const linkedEntries = getLinkedDictionaryEntries(result);
  const observedWords = linkedEntries.observe
    .slice(0, 8)
    .map(([word, score]) => `${word} ${percent(score)}`);
  const graduatedWords = linkedEntries.main
    .slice(0, 8)
    .map(([word, score]) => `${word} ${percent(score)}`);

  graph.innerHTML = `
    <div class="graph-canvas">
      <svg class="graph-lines" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
        <path d="M180 105 C300 105 300 105 420 105" />
        <path d="M180 105 C300 210 300 210 420 210" />
        <path d="M580 210 C700 210 700 105 820 105" />
        <path d="M580 310 C700 310 700 310 820 310" />
      </svg>
      ${renderGraphNode("候选新词", "短信抽取", candidateWords, "source")}
      ${renderGraphNode("观察区", "置信度累计", observedWords, "observe")}
      ${renderGraphNode("主词典", "达到阈值后加入词典中", graduatedWords, "main")}
    </div>
    <div class="graph-summary">
      <span>候选词 <strong>${candidates.length}</strong></span>
      <span>进入观察区 <strong>${linkedEntries.observe.length}</strong></span>
      <span>加入主词典 <strong>${linkedEntries.main.length}</strong></span>
    </div>
  `;
}

function renderGraphNode(title, subtitle, words, type) {
  const items = words.length
    ? words.map(word => `<li>${word}</li>`).join("")
    : "<li>本轮无</li>";
  return `
    <article class="graph-node ${type}">
      <h3>${title}</h3>
      <p>${subtitle}</p>
      <ul>${items}</ul>
    </article>
  `;
}

function initOverviewSamples() {
  const list = document.querySelector("#overviewSampleList");

  list.innerHTML = samples.map((sample, index) => `
    <button class="overview-sample-item" data-index="${index}" data-sample-id="sample-${index}" type="button">
      <strong>${sample.label}</strong>
      <span>${sample.text}</span>
      <b>查看</b>
    </button>
  `).join("");

  list.querySelectorAll(".overview-sample-item").forEach(button => {
    button.addEventListener("click", () => {
      selectOverviewSample(Number(button.dataset.index));
    });
  });
}

function selectOverviewSample(sampleIndex) {
  const list = document.querySelector("#overviewSampleList");
  const details = document.querySelector("#singleSampleDetails");
  const button = list.querySelector(`.overview-sample-item[data-index="${sampleIndex}"]`);
  const sample = samples[sampleIndex];
  if (!button || !sample) return;

  list.querySelectorAll(".overview-sample-item").forEach(item => {
    item.classList.remove("active");
    item.querySelector("b").textContent = "查看";
  });
  button.classList.add("active");
  button.querySelector("b").textContent = "已选中";
  selectedSample = { id: `sample-${sampleIndex}`, ...sample };
  document.querySelector("#smsInput").value = sample.text;
  button.insertAdjacentElement("afterend", details);
  analyze();
  details.hidden = false;
}

function initCorrectionControls() {
  document.querySelector("#correctedLabel").innerHTML = labels
    .map(label => `<option value="${label}">${label}</option>`)
    .join("");
  document.querySelector("#saveCorrection").addEventListener("click", saveManualCorrection);
}

function initParameterControls() {
  ["#modelEndpoint", "#minNewWordLength", "#maxNewWordLength", "#confidenceThreshold"].forEach(selector => {
    document.querySelector(selector).addEventListener("input", () => {
      renderParameterSummary(getRuntimeConfig());
    });
  });
  renderParameterSummary(runtimeConfig);
}

function initTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
    });
  });
}

function activateTab(tabId) {
  document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item.dataset.tab === tabId));
  document.querySelectorAll(".tab-view").forEach(view => view.classList.toggle("active", view.id === tabId));
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

function initDictionaryControls() {
  document.querySelector("#toggleDictEdit").addEventListener("click", toggleDictionaryEdit);
  document.querySelector("#applyDictEdit").addEventListener("click", applyDictionaryEdit);
}

function initTaskLogControls() {
  document.querySelector("#taskRows").addEventListener("click", event => {
    const button = event.target.closest(".task-link");
    if (button) openTaskResult(button.dataset.sampleId);
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

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

document.querySelector("#analyzeBtn").addEventListener("click", analyze);
document.querySelector("#clearBtn").addEventListener("click", () => {
  document.querySelector("#smsInput").value = "";
});

async function initApp() {
  seedTaskLogs();
  renderCategoryOverview();
  initOverviewSamples();
  initCorrectionControls();
  initParameterControls();
  initTabs();
  initCandidateFilters();
  initDictionaryControls();
  initTaskLogControls();
  initTrainingControls();
  await loadCorrections();
  selectOverviewSample(0);
  startSupervisedTraining();
}

initApp();
