/* =========================================================
   CONFIG
   Paste the Cloudflare Worker URL you deployed in Project 8
   here to power the "Ask about your routine" chat with real
   AI answers. If left blank, the chat falls back to a simple
   built-in responder so the page still works without a key.
========================================================= */
const WORKER_URL = ""; // e.g. "https://85b388d0.loreal-advisor-azukaakozar-workers.pages.dev"

/* =========================================================
   PRODUCT DATA
   Brands shown are real L'Oréal Group brands (CeraVe, La
   Roche-Posay, Vichy, Kiehl's, Garnier, L'Oréal Paris).
   step: "am" | "pm" | "both"  -> when it belongs in a routine
   order: sort position within a routine (lower = earlier)
========================================================= */
const PRODUCTS = [
  { id: "p1", brand: "CeraVe", name: "Foaming Facial Cleanser", category: "Cleanser", skin: "oily / combination", step: "both", order: 1 },
  { id: "p2", brand: "CeraVe", name: "Hydrating Facial Cleanser", category: "Cleanser", skin: "dry / normal", step: "both", order: 1 },
  { id: "p3", brand: "La Roche-Posay", name: "Toleriane Purifying Cleanser", category: "Cleanser", skin: "sensitive", step: "both", order: 1 },
  { id: "p4", brand: "Garnier", name: "SkinActive Micellar Water", category: "Cleanser", skin: "all skin types", step: "pm", order: 0 },
  { id: "p5", brand: "CeraVe", name: "Resurfacing Retinol Serum", category: "Serum", skin: "uneven texture", step: "pm", order: 3 },
  { id: "p6", brand: "La Roche-Posay", name: "Hyalu B5 Serum", category: "Serum", skin: "dehydrated", step: "both", order: 2 },
  { id: "p7", brand: "L'Oréal Paris", name: "Revitalift Vitamin C Serum", category: "Serum", skin: "dull / uneven tone", step: "am", order: 2 },
  { id: "p8", brand: "CeraVe", name: "Moisturizing Cream", category: "Moisturizer", skin: "dry", step: "both", order: 4 },
  { id: "p9", brand: "CeraVe", name: "AM Facial Moisturizing Lotion SPF 30", category: "Moisturizer", skin: "normal / combination", step: "am", order: 5 },
  { id: "p10", brand: "CeraVe", name: "PM Facial Moisturizing Lotion", category: "Moisturizer", skin: "normal / combination", step: "pm", order: 4 },
  { id: "p11", brand: "Vichy", name: "Aqualia Thermal Rehydrating Cream", category: "Moisturizer", skin: "dehydrated", step: "both", order: 4 },
  { id: "p12", brand: "Kiehl's", name: "Ultra Facial Cream", category: "Moisturizer", skin: "all skin types", step: "both", order: 4 },
  { id: "p13", brand: "La Roche-Posay", name: "Anthelios Melt-in Milk SPF 60", category: "Sunscreen", skin: "all skin types", step: "am", order: 6 },
  { id: "p14", brand: "CeraVe", name: "Eye Repair Cream", category: "Eye Care", skin: "under-eye / all skin types", step: "both", order: 3.5 },
];

const BRAND_COLORS = {
  "CeraVe": "#0072ce",
  "La Roche-Posay": "#00838a",
  "Garnier": "#2e7d32",
  "Vichy": "#00a0af",
  "Kiehl's": "#8a6d3b",
  "L'Oréal Paris": "#e2001a",
};

/* =========================================================
   STATE
========================================================= */
let selectedIds = new Set();
let showAll = false;
const PAGE_SIZE = 6;

/* =========================================================
   DOM REFS
========================================================= */
const productGrid = document.getElementById("productGrid");
const showMoreBtn = document.getElementById("showMoreBtn");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const selectedChips = document.getElementById("selectedChips");
const generateBtn = document.getElementById("generateBtn");
const routineOutput = document.getElementById("routineOutput");
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

/* =========================================================
   RENDER: product grid (search + category filter + paging)
========================================================= */
function getFilteredProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;

  return PRODUCTS.filter((p) => {
    const matchesCategory = category === "all" || p.category === category;
    const haystack = `${p.brand} ${p.name} ${p.category}`.toLowerCase();
    const matchesQuery = query === "" || haystack.includes(query);
    return matchesCategory && matchesQuery;
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  productGrid.innerHTML = "";

  if (visible.length === 0) {
    productGrid.innerHTML = `<p class="empty-state">No products match your search.</p>`;
  }

  visible.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card" + (selectedIds.has(p.id) ? " selected" : "");
    card.dataset.id = p.id;

    const initial = p.brand.charAt(0);
    const color = BRAND_COLORS[p.brand] || "#999";

    card.innerHTML = `
      <div class="product-swatch" style="background:${color}">${initial}</div>
      <div class="product-info">
        <div class="product-brand">${p.brand}</div>
        <div class="product-name">${p.name}</div>
      </div>
      <div class="product-check">&#10003;</div>
    `;

    card.addEventListener("click", () => toggleProduct(p.id));
    productGrid.appendChild(card);
  });

  showMoreBtn.style.display = filtered.length > PAGE_SIZE && !showAll ? "block" : "none";
}

function toggleProduct(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  renderProducts();
  renderSelected();
}

/* =========================================================
   RENDER: selected chips
========================================================= */
function renderSelected() {
  selectedChips.innerHTML = "";

  if (selectedIds.size === 0) {
    selectedChips.innerHTML = `<p class="empty-state">Select products above to build your routine.</p>`;
    generateBtn.disabled = true;
    return;
  }

  generateBtn.disabled = false;

  selectedIds.forEach((id) => {
    const p = PRODUCTS.find((prod) => prod.id === id);
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${p.brand} ${p.name}</span>`;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", `Remove ${p.name}`);
    removeBtn.addEventListener("click", () => toggleProduct(id));
    chip.appendChild(removeBtn);
    selectedChips.appendChild(chip);
  });
}

/* =========================================================
   ROUTINE GENERATION (rule-based, no API required)
========================================================= */
function buildRoutine(products) {
  const am = products
    .filter((p) => p.step === "am" || p.step === "both")
    .sort((a, b) => a.order - b.order);
  const pm = products
    .filter((p) => p.step === "pm" || p.step === "both")
    .sort((a, b) => a.order - b.order);
  return { am, pm };
}

function renderRoutine(products) {
  const { am, pm } = buildRoutine(products);

  const renderList = (list) =>
    list.length
      ? `<ol>${list.map((p) => `<li><strong>${p.brand} ${p.name}</strong> &mdash; ${categoryReason(p)}</li>`).join("")}</ol>`
      : `<p class="empty-state">Add a product suited for this time of day.</p>`;

  routineOutput.innerHTML = `
    <h3>Morning</h3>
    ${renderList(am)}
    <h3>Evening</h3>
    ${renderList(pm)}
  `;
}

function categoryReason(p) {
  switch (p.category) {
    case "Cleanser": return "clears the skin so the next steps absorb well";
    case "Serum": return `targets ${p.skin}`;
    case "Moisturizer": return "locks in hydration";
    case "Sunscreen": return "protects against daily UV exposure";
    case "Eye Care": return "addresses the delicate under-eye area";
    default: return "supports your routine";
  }
}

generateBtn.addEventListener("click", () => {
  const chosen = PRODUCTS.filter((p) => selectedIds.has(p.id));
  renderRoutine(chosen);
  addChatMessage(
    "bot",
    "I've built your AM and PM routine from your selected products — ask me anything about the order, timing, or why a step is included."
  );
});

/* =========================================================
   CHAT
   Uses your deployed Cloudflare Worker if WORKER_URL is set.
   Otherwise falls back to a simple local responder so the
   page still demonstrates working Q&A without any API key.
========================================================= */
function addChatMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function askAboutRoutine(question) {
  const chosen = PRODUCTS.filter((p) => selectedIds.has(p.id));
  const { am, pm } = buildRoutine(chosen);

  const routineSummary =
    `AM: ${am.map((p) => `${p.brand} ${p.name}`).join(", ") || "none selected"}. ` +
    `PM: ${pm.map((p) => `${p.brand} ${p.name}`).join(", ") || "none selected"}.`;

  if (!WORKER_URL) {
    return localFallbackAnswer(question, chosen);
  }

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a L'Oréal skincare routine advisor. Only answer questions about the user's selected products, routine order, and general skincare/beauty guidance. Politely decline anything unrelated.",
          },
          {
            role: "user",
            content: `My selected products and routine: ${routineSummary}\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error("Worker request failed");
    const data = await response.json();
    return data.reply || data.content?.[0]?.text || "Sorry, I couldn't generate a response just now.";
  } catch (err) {
    console.error("Chat request error:", err);
    return localFallbackAnswer(question, chosen);
  }
}

function localFallbackAnswer(question, chosen) {
  if (chosen.length === 0) {
    return "Select a few products first, then generate a routine — I can walk you through the order and reasoning.";
  }
  const q = question.toLowerCase();
  if (q.includes("order") || q.includes("why")) {
    return "Routines generally go cleanser → treatment/serum → eye cream → moisturizer → SPF (AM only), so each step can absorb before the next.";
  }
  if (q.includes("retinol")) {
    return "Retinol products are best used at night and paired with a daily SPF, since they can increase sun sensitivity.";
  }
  if (q.includes("spf") || q.includes("sunscreen")) {
    return "Sunscreen is always the last step of a morning routine — it needs to sit on top to protect the skin.";
  }
  return "Ask me about the order of your routine, why a product's included, or general skincare tips — connect a Cloudflare Worker endpoint for full AI-powered answers.";
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;

  addChatMessage("user", question);
  chatInput.value = "";

  const reply = await askAboutRoutine(question);
  addChatMessage("bot", reply);
});

/* =========================================================
   EVENTS: search / filter / show more
========================================================= */
searchInput.addEventListener("input", renderProducts);
categorySelect.addEventListener("change", renderProducts);
showMoreBtn.addEventListener("click", () => {
  showAll = true;
  renderProducts();
});

/* =========================================================
   INIT
========================================================= */
renderProducts();
renderSelected();
