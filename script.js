const API_BASE = "http://127.0.0.1:8000";

async function predictCropImage(endpoint, file) {
    if (!file) throw new Error("Please select an image first.");
    if (!file.type.startsWith("image/")) throw new Error("Please select a valid image file.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Image must be smaller than 10 MB.");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData
    });

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`The server returned an unreadable response (HTTP ${response.status}).`);
    }

    if (!response.ok) {
        throw new Error(
            typeof data.detail === "string"
                ? data.detail
                : "The prediction server rejected the request."
        );
    }

    if (typeof data.prediction !== "string" || typeof data.confidence !== "number") {
        throw new Error("The server response does not contain the expected prediction fields.");
    }

    return data;
}

let currentUser = null;
let currentLanguage = "en";
let i18nData = {};
let scanHistory = JSON.parse(localStorage.getItem("crop_doctor_history") || "[]");

document.addEventListener("DOMContentLoaded", async () => {
    setTimeout(() => {
        document.getElementById("splash-screen").classList.add("hidden");
        initApp();
    }, 3000);

    await loadI18n();
});

async function loadI18n() {
    try {
        const res = await fetch("i18n.json");
        i18nData = await res.json();
    } catch (e) {
        console.warn("Using fallback i18n.");
    }
}

function initApp() {
    const savedUser = localStorage.getItem("crop_doctor_user");

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showAuth();
    }

    renderHistory();
    updateDashboardStats();
}

function changeLanguage(lang) {
    currentLanguage = lang;

    document.getElementById("lang-select").value = lang;
    document.getElementById("auth-lang-select").value = lang;
    document.getElementById("settings-lang").value = lang;

    if (i18nData[lang]) {
        const dict = i18nData[lang];

        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (dict[key]) el.innerText = dict[key];
        });
    }

    const welcomeMsg = document.getElementById("chat-welcome-msg");
    if (welcomeMsg && i18nData[lang]?.chat_welcome) {
        welcomeMsg.innerText = i18nData[lang].chat_welcome;
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll(".auth-tabs .tab-btn").forEach(b => b.classList.remove("active"));

    if (tab === "login") {
        event.target.classList.add("active");
        document.getElementById("login-form").classList.remove("hidden");
        document.getElementById("register-form").classList.add("hidden");
    } else {
        event.target.classList.add("active");
        document.getElementById("login-form").classList.add("hidden");
        document.getElementById("register-form").classList.remove("hidden");
    }
}

function handleLogin(e) {
    e.preventDefault();

    const user = document.getElementById("login-user").value.trim();

    currentUser = {
        username: user,
        name: "Farmer " + user.substring(0, 5),
        acres: 5.0,
        region: "Thanjavur"
    };

    localStorage.setItem("crop_doctor_user", JSON.stringify(currentUser));
    showApp();
}

function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById("reg-name").value.trim();
    const user = document.getElementById("reg-user").value.trim();
    const acres = document.getElementById("reg-acres").value.trim();
    const region = document.getElementById("reg-region").value.trim();

    currentUser = {
        username: user,
        name: name,
        acres: parseFloat(acres),
        region: region
    };

    localStorage.setItem("crop_doctor_user", JSON.stringify(currentUser));
    showApp();
}

function fillDemoLogin() {
    document.getElementById("login-user").value = "FARM123";
    document.getElementById("login-pass").value = "1234";
}

function handleLogout() {
    localStorage.removeItem("crop_doctor_user");
    currentUser = null;
    location.reload();
}

function showAuth() {
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("app-container").classList.add("hidden");
}

function showApp() {
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");

    document.getElementById("display-farmer-name").innerText = currentUser.name;
    document.getElementById("display-username").innerText = currentUser.username;

    document.getElementById("dash-welcome-text").innerText =
        (i18nData[currentLanguage]?.dash_welcome || "Welcome back,") +
        " " + currentUser.name + "! 🌱";
}

function switchNav(viewId) {
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));

    event.currentTarget.classList.add("active");
    document.getElementById("view-" + viewId).classList.add("active");
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-theme");

    const icon = document.getElementById("theme-icon");
    icon.classList.toggle("fa-moon");
    icon.classList.toggle("fa-sun");
}

// SIDE-BY-SIDE COMBINED HEALTH MODULE

let combLeafFile = null;
let combSoilFile = null;

function handleCombLeafSelect(e) {
    const file = e.target.files[0];

    if (file) {
        combLeafFile = file;

        const reader = new FileReader();

        reader.onload = function(evt) {
            document.getElementById("comb-leaf-placeholder").classList.add("hidden");

            const preview = document.getElementById("comb-leaf-preview-box");
            preview.classList.remove("hidden");

            document.getElementById("comb-leaf-img").src = evt.target.result;
        };

        reader.readAsDataURL(file);
    }
}

function resetCombLeaf() {
    combLeafFile = null;
    document.getElementById("comb-leaf-input").value = "";
    document.getElementById("comb-leaf-placeholder").classList.remove("hidden");
    document.getElementById("comb-leaf-preview-box").classList.add("hidden");
}

function handleCombSoilSelect(e) {
    const file = e.target.files[0];

    if (file) {
        combSoilFile = file;

        const reader = new FileReader();

        reader.onload = function(evt) {
            document.getElementById("comb-soil-placeholder").classList.add("hidden");

            const preview = document.getElementById("comb-soil-preview-box");
            preview.classList.remove("hidden");

            document.getElementById("comb-soil-img").src = evt.target.result;
        };

        reader.readAsDataURL(file);
    }
}

function resetCombSoil() {
    combSoilFile = null;
    document.getElementById("comb-soil-input").value = "";
    document.getElementById("comb-soil-placeholder").classList.remove("hidden");
    document.getElementById("comb-soil-preview-box").classList.add("hidden");
}

async function runSideBySideCombinedAnalysis() {
    if (!combLeafFile || !combSoilFile) {
        alert("Please upload both a leaf image and a soil image.");
        return;
    }

    const button = document.querySelector(
        '[onclick="runSideBySideCombinedAnalysis()"]'
    );

    try {
        if (button) button.disabled = true;

        const [leafResult, soilResult] = await Promise.all([
            predictCropImage("/api/leaf/predict", combLeafFile),
            predictCropImage("/api/soil/predict-image", combSoilFile)
        ]);

        const report = document.getElementById("combined-report-body");
        report.replaceChildren();

        function addResult(title, result) {
            const section = document.createElement("div");
            section.className = "diag-box";

            const heading = document.createElement("h4");
            heading.textContent = title;

            const prediction = document.createElement("p");
            prediction.textContent = `Prediction: ${result.prediction}`;

            const confidence = document.createElement("p");
            confidence.textContent = `Model confidence: ${result.confidence}%`;

            section.append(heading, prediction, confidence);

            if (result.low_confidence) {
                const warning = document.createElement("p");
                warning.textContent =
                    "Uncertain result — upload a clearer image and verify the prediction.";
                section.appendChild(warning);
            }

            report.appendChild(section);
        }

        addResult("Leaf Disease Prediction", leafResult);
        addResult("Soil Classification", soilResult);

        document.getElementById("combined-result-card").classList.remove("hidden");
        saveToHistory("Combined Analysis", leafResult.prediction);
    } catch (error) {
        alert("Combined analysis error: " + error.message);
    } finally {
        if (button) button.disabled = false;
    }
}

// LEAF SCAN MODULE

function handleLeafFileSelect(e) {
    const file = e.target.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function(evt) {
            document.getElementById("upload-placeholder").classList.add("hidden");

            const preview = document.getElementById("upload-preview-container");
            preview.classList.remove("hidden");

            document.getElementById("leaf-preview-img").src = evt.target.result;
        };

        reader.readAsDataURL(file);
    }
}

function resetLeafUpload() {
    document.getElementById("leaf-file-input").value = "";
    document.getElementById("upload-placeholder").classList.remove("hidden");
    document.getElementById("upload-preview-container").classList.add("hidden");
}

async function runLeafAnalysis() {
    const file = document.getElementById("leaf-file-input").files[0];

    if (!file) {
        alert("Please upload a leaf image first.");
        return;
    }

    const button = document.querySelector('[onclick="runLeafAnalysis()"]');

    try {
        if (button) {
            button.disabled = true;
            button.textContent = "Analyzing...";
        }

        const result = await predictCropImage("/api/leaf/predict", file);

        document.getElementById("leaf-result-card").classList.remove("hidden");
        document.getElementById("leaf-disease-name").textContent = result.prediction;

        document.getElementById("leaf-symptoms-text").textContent =
            `Model confidence: ${result.confidence}%`;

        const topPredictionsElement = document.getElementById("leaf-top-predictions");

        if (topPredictionsElement && Array.isArray(result.top_predictions)) {
            topPredictionsElement.replaceChildren();

            result.top_predictions.forEach(item => {
                const row = document.createElement("p");
                row.textContent = `${item.label}: ${item.confidence}%`;
                topPredictionsElement.appendChild(row);
            });
        }

        if (result.low_confidence) {
            alert(
                "The model is uncertain about this result. " +
                "Please try a clearer leaf image."
            );
        }

        // ADDED: show recommendations for the predicted leaf class
        await loadDiseaseRecommendations();
        displayDiseaseRecommendations(result.prediction);

        saveToHistory("Leaf Scan", result.prediction);
    } catch (error) {
        alert("Leaf prediction error: " + error.message);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Analyze Leaf";
        }
    }
}

// SOIL ANALYSIS MODULE

function switchSoilTab(tab) {
    document.querySelectorAll(".soil-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".soil-pane").forEach(p => p.classList.add("hidden"));

    event.currentTarget.classList.add("active");
    document.getElementById("soil-tab-" + tab).classList.remove("hidden");
}

function handleSoilFileSelect(e) {
    const file = e.target.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function(evt) {
            document.getElementById("soil-upload-placeholder").classList.add("hidden");

            const preview = document.getElementById("soil-upload-preview");
            preview.classList.remove("hidden");

            document.getElementById("soil-preview-img").src = evt.target.result;
        };

        reader.readAsDataURL(file);
    }
}

function resetSoilUpload() {
    document.getElementById("soil-file-input").value = "";
    document.getElementById("soil-upload-placeholder").classList.remove("hidden");
    document.getElementById("soil-upload-preview").classList.add("hidden");
}

async function runSoilPhotoAnalysis() {
    const file = document.getElementById("soil-file-input").files[0];

    if (!file) {
        alert("Please upload a soil image first.");
        return;
    }

    const card = document.getElementById("soil-result-card");

    try {
        const result = await predictCropImage("/api/soil/predict-image", file);

        card.classList.remove("hidden");
        document.getElementById("soil-result-content").innerHTML = "";

        const heading = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = "Soil Classification: ";
        heading.appendChild(strong);
        heading.appendChild(document.createTextNode(result.prediction));

        const confidence = document.createElement("p");
        confidence.textContent = `Model confidence: ${result.confidence}%`;

        document.getElementById("soil-result-content").append(heading, confidence);

        saveToHistory("Soil Analysis", result.prediction);
    } catch (error) {
        alert("Soil prediction error: " + error.message);
    }
}

function runManualSoilAnalysis() {
    const card = document.getElementById("soil-result-card");
    card.classList.remove("hidden");

    document.getElementById("soil-result-content").innerHTML =
        `<p><strong>Classification:</strong> Manual Telemetry Soil (pH 6.5, NPK Optimal)</p>`;

    saveToHistory("Soil Analysis", "Manual Parameters");
}
// FARMER AI CHATBOT + DISEASE-SPECIFIC RECOMMENDATIONS
// Keep chatbot_qa.json and disease_recommendations.json beside index.html and app.js.

let chatbotQA = [];
let diseaseRecommendations = {};
let chatbotQALoadPromise = null;
let diseaseRecommendationsLoadPromise = null;

async function loadChatbotQA() {
    if (chatbotQALoadPromise) return chatbotQALoadPromise;

    chatbotQALoadPromise = (async () => {
        try {
            const response = await fetch("./chatbot_qa.json");
            if (!response.ok) {
                throw new Error("Could not load chatbot_qa.json");
            }

            const data = await response.json();
            chatbotQA = Array.isArray(data.questions) ? data.questions : [];

            if (chatbotQA.length !== 50) {
                console.warn(
                    `Expected 50 chatbot Q&A entries; loaded ${chatbotQA.length}.`
                );
            }

            console.log("Chatbot Q&A loaded:", chatbotQA.length);
        } catch (error) {
            console.error("Chatbot data loading error:", error);
            chatbotQA = [];
        }
    })();

    return chatbotQALoadPromise;
}

async function loadDiseaseRecommendations() {
    if (diseaseRecommendationsLoadPromise) {
        return diseaseRecommendationsLoadPromise;
    }

    diseaseRecommendationsLoadPromise = (async () => {
        try {
            const response = await fetch("./disease_recommendations.json");

            if (!response.ok) {
                throw new Error("Could not load disease_recommendations.json");
            }

            const data = await response.json();
            diseaseRecommendations = data.diseases || data;

            console.log(
                "Disease recommendation classes loaded:",
                Object.keys(diseaseRecommendations).length
            );
        } catch (error) {
            console.error("Disease recommendation loading error:", error);
            diseaseRecommendations = {};
        }
    })();

    return diseaseRecommendationsLoadPromise;
}

function normalizeText(text) {
    return String(text || "")
        .toLocaleLowerCase()
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getLocalizedText(value, language = currentLanguage) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";

    return value[language] || value.en || value.ta || value.te || "";
}

function findBestChatbotAnswer(userText) {
    const language = ["en", "ta", "te"].includes(currentLanguage)
        ? currentLanguage
        : "en";

    const query = normalizeText(userText);
    if (!query) return null;

    let bestItem = null;
    let bestScore = 0;

    for (const item of chatbotQA) {
        const localizedKeywords = item.keywords?.[language] || [];
        const englishKeywords = item.keywords?.en || [];
        const question = getLocalizedText(item.question, language);

        const candidates = [
            ...localizedKeywords,
            ...englishKeywords,
            question
        ].map(normalizeText).filter(Boolean);

        let score = 0;

        for (const candidate of candidates) {
            if (query === candidate) {
                score = Math.max(score, 100);
            } else if (candidate.length > 2 && query.includes(candidate)) {
                score = Math.max(score, 85);
            } else {
                const queryWords = new Set(query.split(" "));
                const candidateWords = candidate.split(" ")
                    .filter(word => word.length > 1);

                const matched = candidateWords.filter(
                    word => queryWords.has(word)
                );

                const ratio = candidateWords.length
                    ? matched.length / candidateWords.length
                    : 0;

                score = Math.max(score, ratio * 60);
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestItem = item;
        }
    }

    if (!bestItem || bestScore < 35) return null;

    return {
        question: getLocalizedText(bestItem.question, language),
        answer: getLocalizedText(bestItem.answer, language),
        score: bestScore
    };
}

function appendChatMessage(text, sender) {
    const chatBox = document.getElementById("chat-messages");
    if (!chatBox) return;

    const message = document.createElement("div");
    message.className = `chat-msg ${sender}`;

    if (sender === "bot") {
        const icon = document.createElement("i");
        icon.className = "fas fa-robot";
        message.appendChild(icon);
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    message.appendChild(paragraph);
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function getChatFallback() {
    const messages = {
        en: "I could not confidently match that question. Try asking about soil pH, NPK, irrigation, compost, pests, crop diseases, or planting.",
        ta: "உங்கள் கேள்விக்கு சரியான பதிலைக் கண்டறிய முடியவில்லை. மண் pH, NPK, பாசனம், உரம், பூச்சிகள், பயிர் நோய்கள் அல்லது நடவு பற்றி கேளுங்கள்.",
        te: "మీ ప్రశ్నకు సరైన సమాధానాన్ని గుర్తించలేకపోయాను. నేల pH, NPK, నీటిపారుదల, కంపోస్ట్, పురుగులు, పంట వ్యాధులు లేదా నాటడం గురించి అడగండి."
    };

    return messages[currentLanguage] || messages.en;
}

async function sendChatMessage() {
    const input = document.getElementById("chat-user-input");
    if (!input) return;

    const value = input.value.trim();
    if (!value) return;

    appendChatMessage(value, "user");
    input.value = "";

    await loadChatbotQA();

    const result = findBestChatbotAnswer(value);

    if (result && result.answer) {
        appendChatMessage(result.answer, "bot");
    } else {
        appendChatMessage(getChatFallback(), "bot");
    }
}

function getDiseaseRecommendationKey(predictedClass) {
    const raw = String(predictedClass || "").trim();

    if (diseaseRecommendations[raw]) return raw;

    const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");

    return Object.keys(diseaseRecommendations).find(key =>
        key.toLowerCase().replace(/[\s-]+/g, "_") === normalized
    ) || null;
}

function displayDiseaseRecommendations(
    predictedClass,
    targetElementId = "leaf-result-card"
) {
    const target = document.getElementById(targetElementId);
    if (!target) return;

    let panel = document.getElementById("leaf-recommendations-panel");

    if (!panel) {
        panel = document.createElement("section");
        panel.id = "leaf-recommendations-panel";
        panel.className = "diag-box mt-3";
        target.appendChild(panel);
    }

    panel.replaceChildren();

    const language = ["en", "ta", "te"].includes(currentLanguage)
        ? currentLanguage
        : "en";

    const key = getDiseaseRecommendationKey(predictedClass);
    const item = key ? diseaseRecommendations[key] : null;

    const title = document.createElement("h4");
    title.textContent = ({
        en: "Disease-specific recommendations",
        ta: "நோய்க்கான பரிந்துரைகள்",
        te: "వ్యాధి-సంబంధిత సూచనలు"
    })[language];

    panel.appendChild(title);

    if (!item) {
        const message = document.createElement("p");

        message.textContent = ({
            en: "No recommendation entry was found for this exact model label. Please verify the predicted class and JSON key.",
            ta: "இந்த மாடல் லேபிளுக்கான பரிந்துரை கிடைக்கவில்லை. கணிக்கப்பட்ட வகையையும் JSON key-யையும் சரிபார்க்கவும்.",
            te: "ఈ మోడల్ లేబుల్‌కు సూచనలు కనబడలేదు. అంచనా తరగతి మరియు JSON keyని తనిఖీ చేయండి."
        })[language];

        panel.appendChild(message);
        return;
    }

    const localizedDisease = getLocalizedText(item.disease, language) || key;
    const diseaseHeading = document.createElement("p");
    const strong = document.createElement("strong");

    strong.textContent = ({
        en: "Detected class: ",
        ta: "கண்டறியப்பட்ட வகை: ",
        te: "గుర్తించిన తరగతి: "
    })[language];

    diseaseHeading.append(
        strong,
        document.createTextNode(localizedDisease)
    );

    panel.appendChild(diseaseHeading);

    const sections = [
        {
            field: "leaf_actions",
            title: {
                en: "Leaf actions",
                ta: "இலைக்கான நடவடிக்கைகள்",
                te: "ఆకుకు తీసుకోవాల్సిన చర్యలు"
            }
        },
        {
            field: "soil_actions",
            title: {
                en: "Soil actions",
                ta: "மண்ணுக்கான நடவடிக்கைகள்",
                te: "నేల చర్యలు"
            }
        },
        {
            field: "precautions",
            title: {
                en: "Precautions",
                ta: "முன்னெச்சரிக்கைகள்",
                te: "ముందుజాగ్రత్తలు"
            }
        }
    ];

    for (const sectionInfo of sections) {
        const textValue = getLocalizedText(
            item[sectionInfo.field],
            language
        );

        if (!textValue) continue;

        const block = document.createElement("div");
        block.className = "mt-2";

        const heading = document.createElement("strong");
        heading.textContent = sectionInfo.title[language];

        const paragraph = document.createElement("p");
        paragraph.textContent = textValue;

        block.append(heading, paragraph);
        panel.appendChild(block);
    }
}

// Load the two JSON files when the page is initialized.
document.addEventListener("DOMContentLoaded", () => {
    loadChatbotQA();
    loadDiseaseRecommendations();
});
// AGRICULTURE OFFICER CONSULTATION (DOWNLOADABLE ADVISORY LETTER)

function generateConsultationLetter() {
    const issue =
        document.getElementById("expert-issue").value.trim() ||
        "Severe foliar blight and crop distress";

    const details =
        document.getElementById("expert-details").value.trim() ||
        "Observed across field plots.";

    const dateStr = new Date().toLocaleDateString();

    const letterText = `OFFICIAL ADVISORY & INSPECTION REQUEST LETTER

--------------------------------------------------------

Date: ${dateStr}

From:

Farmer Name: ${currentUser.name}

Username ID: ${currentUser.username}

Field Size: ${currentUser.acres} Acres

Region / District: ${currentUser.region}


To:

The Chief Agricultural Officer / KVK Extension Specialist,

State Krishi Vigyan Kendra (KVK) Research Station,

Main Agricultural University Campus.


Subject: Urgent Request for Crop Health Inspection & Expert Advisory


Respected Sir/Madam,

I am writing to formally request expert intervention and field inspection regarding crop distress observed in my cultivation area.

Primary Issue Reported:

- ${issue}

Additional Field Observations:

- ${details}

Based on preliminary AI diagnostics, I kindly request your esteemed office to review this case and advise on appropriate field quarantine, pesticide recommendation, or soil amendment protocols.

Yours faithfully,

(Signature)

--------------------------------------------------------

${currentUser.name}

Contact Farmer | ID: ${currentUser.username}

Region: ${currentUser.region}
`;

    document.getElementById("letter-content").innerText = letterText;
    document.getElementById("consultation-result-box").classList.remove("hidden");

    alert("Official consultation letter generated successfully! You can now download it.");
}

function downloadLetterText() {
    const letterContent = document.getElementById("letter-content").innerText;
    const blob = new Blob([letterContent], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `Crop_Consultation_Letter_${currentUser.username}.txt`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// HISTORY & STORAGE

function saveToHistory(type, title) {
    const record = {
        type,
        title,
        date: new Date().toLocaleDateString()
    };

    scanHistory.unshift(record);

    localStorage.setItem(
        "crop_doctor_history",
        JSON.stringify(scanHistory)
    );

    renderHistory();
    updateDashboardStats();
}

function renderHistory() {
    const container = document.getElementById("history-list-container");

    if (scanHistory.length === 0) {
        container.innerHTML =
            `<p class="text-muted" data-i18n="no_history">No history available.</p>`;
        return;
    }

    container.innerHTML = scanHistory.map(item => `
        <div class="card mb-2" style="padding: 1rem;">
            <div class="flex-between">
                <strong>${item.type}: ${item.title}</strong>
                <small class="text-muted">${item.date}</small>
            </div>
        </div>
    `).join("");
}

function clearHistory() {
    scanHistory = [];
    localStorage.removeItem("crop_doctor_history");
    renderHistory();
    updateDashboardStats();
}

function updateDashboardStats() {
    document.getElementById("stat-scans").innerText = scanHistory.length;
}

function saveSettings() {
    alert("Settings saved successfully!");
}