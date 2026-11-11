"use strict";

// ===================================
// GBOT AI - APPLICATION ENGINE
// Professional JavaScript Architecture
// ===================================

/**
 * @typedef {"user" | "assistant"} ChatRole
 */

/**
 * @typedef {Object} ChatMessage
 * @property {ChatRole} role
 * @property {string} content
 */

/**
 * @typedef {Object} Chat
 * @property {string} id
 * @property {string} title
 * @property {ChatMessage[]} messages
 * @property {number} updatedAt
 */

/**
 * @typedef {"dark" | "light"} Theme
 */

// ===================================
// CONFIGURATION
// ===================================

const API_URL = "/api/chat";

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
const $ = (id) => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Elemento HTML não encontrado: ${id}`);
  }

  return element;
};

const STORAGE = {
  chats: "gbot_chats_v1",
  current: "gbot_current_v1",
  name: "gbot_username",
  theme: "gbot_theme"
};

// ===================================
// APPLICATION STATE
// ===================================

/**
 * @type {Chat[]}
 */
let chats = [];

try {
  const storedChats = JSON.parse(
    localStorage.getItem(STORAGE.chats) || "[]"
  );

  chats = Array.isArray(storedChats) ? storedChats : [];
} catch (error) {
  console.error("Erro ao carregar conversas:", error);
  chats = [];
}

/** @type {string | null} */
let currentChatId = localStorage.getItem(STORAGE.current);

let isSending = false;

// ===================================
// STORAGE ENGINE
// ===================================

function saveData() {
  localStorage.setItem(
    STORAGE.chats,
    JSON.stringify(chats)
  );

  localStorage.setItem(
    STORAGE.current,
    currentChatId || ""
  );
}

// ===================================
// CHAT MANAGEMENT
// ===================================

function createChat() {
  /** @type {Chat} */
  const chat = {
    id: crypto.randomUUID(),
    title: "Nova conversa",
    messages: [],
    updatedAt: Date.now()
  };

  chats.unshift(chat);
  currentChatId = chat.id;

  saveData();
  renderChat();
  renderHistory();
}

/**
 * @returns {Chat | undefined}
 */
function getCurrentChat() {
  return chats.find(
    chat => chat.id === currentChatId
  );
}

// ===================================
// HISTORY ENGINE
// ===================================

function renderHistory() {
  const container = $("historyList");

  container.innerHTML = "";

  chats.forEach(chat => {
    const button = document.createElement("button");

    button.className = "history-item";
    button.textContent = "◷ " + chat.title;
    button.title = chat.title;

    button.addEventListener("click", () => {
      currentChatId = chat.id;

      saveData();
      renderChat();
      closeSidebar();
    });

    container.appendChild(button);
  });
}

// ===================================
// CHAT RENDER ENGINE
// ===================================

function renderChat() {
  const chat = getCurrentChat();
  const messages = $("messages");

  messages.innerHTML = "";

  $("welcome").style.display =
    chat && chat.messages.length ? "none" : "block";

  if (!chat) return;

  chat.messages.forEach(message => {
    appendMessage(
      message.role,
      message.content,
      false
    );
  });

  scrollToBottom();
}

// ===================================
// MESSAGE ENGINE
// ===================================

/**
 * @param {ChatRole} role
 * @param {string} content
 * @param {boolean} [save=true]
 * @returns {HTMLElement}
 */
function appendMessage(role, content, save = true) {
  const container = $("messages");

  const row = document.createElement("div");

  row.className = "message " + role;

  const avatar = document.createElement("div");

  avatar.className = "message-avatar";

  avatar.textContent =
    role === "user" ? "U" : "G";

  const contentBox = document.createElement("div");

  contentBox.className = "message-content";
  contentBox.textContent = content;

  row.append(avatar, contentBox);

  container.appendChild(row);

  // COPY RESPONSE BUTTON

  if (role === "assistant") {
    const actions = document.createElement("div");

    actions.className = "message-actions";

    const copy = document.createElement("button");

    copy.textContent = "▣ Copiar";

    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);

        copy.textContent = "✓ Copiado";

      } catch {
        copy.textContent = "Não foi possível copiar";
      }
    });

    actions.appendChild(copy);
    contentBox.appendChild(actions);
  }

  // SAVE MESSAGE

  if (save) {
    const chat = getCurrentChat();

    if (chat) {
      chat.messages.push({
        role,
        content
      });

      chat.updatedAt = Date.now();

      if (
        chat.title === "Nova conversa" &&
        role === "user"
      ) {
        chat.title = content.slice(0, 35);
      }

      saveData();
      renderHistory();
    }
  }

  scrollToBottom();

  return contentBox;
}

// ===================================
// SCROLL ENGINE
// ===================================

function scrollToBottom() {
  const area = $("chatArea");

  area.scrollTop = area.scrollHeight;
}

// ===================================
// TYPING INDICATOR
// ===================================

function showTyping() {
  const typing = document.createElement("div");

  typing.id = "typingIndicator";
  typing.className = "typing";

  typing.textContent = "GBot está a pensar...";

  $("messages").appendChild(typing);

  scrollToBottom();
}

function removeTyping() {
  $("typingIndicator")?.remove();
}

// ===================================
// AI COMMUNICATION ENGINE
// ===================================

/**
 * @param {string} text
 */
async function sendMessage(text) {
  text = text.trim();

  if (!text || isSending) return;

  if (!getCurrentChat()) {
    createChat();
  }

  const chat = getCurrentChat();

  if (!chat) return;

  isSending = true;

  $("sendButton").disabled = true;

  appendMessage("user", text);

  $("messageInput").value = "";
  $("messageInput").style.height = "auto";

  $("welcome").style.display = "none";

  showTyping();

  try {
    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: chat.messages.slice(-20)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Erro no servidor."
      );
    }

    if (!data.reply) {
      throw new Error(
        "O servidor não devolveu uma resposta."
      );
    }

    removeTyping();

    appendMessage(
      "assistant",
      data.reply
    );

  } catch (error) {
    removeTyping();

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    const errorText =
      "Não consegui contactar o servidor. " +
      "Verifica a ligação à internet e se o backend está ativo. " +
      "Detalhe: " + errorMessage;

    appendMessage(
      "assistant",
      errorText
    );

  } finally {
    isSending = false;

    $("sendButton").disabled =
      !$("messageInput").value.trim();
  }
}

// ===================================
// EVENT SYSTEM
// ===================================

// SEND BUTTON

$("sendButton").addEventListener("click", () => {
  sendMessage($("messageInput").value);
});

// INPUT RESIZING

$("messageInput").addEventListener("input", event => {
  const input = /** @type {HTMLTextAreaElement} */ (
    event.target
  );

  input.style.height = "auto";

  input.style.height =
    Math.min(input.scrollHeight, 140) + "px";

  $("sendButton").disabled =
    !input.value.trim() || isSending;
});

// ENTER TO SEND

$("messageInput").addEventListener("keydown", event => {
  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {
    event.preventDefault();

    const input = /** @type {HTMLTextAreaElement} */ (
      event.target
    );

    sendMessage(input.value);
  }
});

// NEW CHAT

$("newChat").addEventListener(
  "click",
  createChat
);

// HOME BUTTON

$("homeButton").addEventListener("click", () => {
  if (!getCurrentChat()) {
    createChat();
  } else {
    renderChat();
  }

  closeSidebar();
});

// HISTORY BUTTON

$("historyButton").addEventListener("click", () => {
  renderHistory();
  closeSidebar();
});

// CLEAR CHAT

$("clearButton").addEventListener("click", () => {
  if (
    !confirm("Apagar as mensagens desta conversa?")
  ) {
    return;
  }

  const chat = getCurrentChat();

  if (chat) {
    chat.messages = [];
    chat.title = "Nova conversa";

    saveData();
    renderChat();
    renderHistory();
  }
});

// SUGGESTIONS

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    const prompt = /** @type {HTMLElement} */ (
      button
    ).dataset.prompt;

    if (prompt) {
      sendMessage(prompt);
    }
  });
});

// ===================================
// SIDEBAR ENGINE
// ===================================

function openSidebar() {
  $("sidebar").classList.add("open");
  $("overlay").classList.add("show");
}

function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("overlay").classList.remove("show");
}

$("menuButton").addEventListener(
  "click",
  openSidebar
);

$("closeSidebar").addEventListener(
  "click",
  closeSidebar
);

$("overlay").addEventListener(
  "click",
  closeSidebar
);

// ===================================
// SETTINGS ENGINE
// ===================================

$("settingsButton").addEventListener("click", () => {
  $("userName").value =
    localStorage.getItem(STORAGE.name) || "";

  $("settingsModal").classList.add("show");

  closeSidebar();
});

$("closeSettings").addEventListener("click", () => {
  $("settingsModal").classList.remove("show");
});

$("saveSettings").addEventListener("click", () => {
  localStorage.setItem(
    STORAGE.name,
    $("userName").value.trim()
  );

  $("settingsModal").classList.remove("show");

  alert("Definições guardadas!");
});

// ===================================
// THEME ENGINE
// ===================================

/**
 * @param {Theme} theme
 */
function applyTheme(theme) {
  document.body.classList.toggle(
    "light",
    theme === "light"
  );

  localStorage.setItem(
    STORAGE.theme,
    theme
  );
}

$("themeButton").addEventListener("click", () => {
  const next = document.body.classList.contains("light")
    ? "dark"
    : "light";

  applyTheme(next);
});

// ===================================
// APPLICATION INITIALIZATION
// ===================================

function initialize() {
  /** @type {Theme} */
  const savedTheme =
    localStorage.getItem(STORAGE.theme) === "light"
      ? "light"
      : "dark";

  applyTheme(savedTheme);

  if (!getCurrentChat()) {
    if (chats.length) {
      currentChatId = chats[0].id;
    } else {
      createChat();
    }
  }

  saveData();

  renderHistory();
  renderChat();
}

// ===================================
// START GBOT
// ===================================

initialize();