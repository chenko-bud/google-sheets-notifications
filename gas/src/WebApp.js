/// <reference types="@types/google-apps-script" />

// ============================================
// TELEGRAM API
// ============================================

/**
 * Web App для обробки webhook від Telegram
 */

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";
const TELEGRAM_LIMIT = 4096;

/**
 * Обробник GET запитів (для перевірки)
 */
function doGet(e) {
  return HtmlService.createHtmlOutput("NotificationBot Webhook is active!");
}

/**
 * Обробник POST запитів (webhook від Telegram)
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    handleWebhook(update);
  } catch (error) {
    // ignore
  }

  return HtmlService.createHtmlOutput("OK");
}

/**
 * Отримати токен бота з Script Properties
 * @returns {string} Bot Token
 */
function getBotTokenFromProperties() {
  const token =
    PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN не налаштовано в Script Properties");
  }

  return token;
}

/**
 * Налаштувати webhook
 * Запустіть цю функцію після деплою Web App
 */
function setupWebhook() {
  const botToken = getBotTokenFromProperties();
  const webAppUrl = PropertiesService.getScriptProperties().getProperty(
    "WEBAPP_DEPLOYMENT_URL",
  );

  if (!webAppUrl) {
    addErrorLog("setupWebhook", "WEBAPP_DEPLOYMENT_URL not configured");

    return { ok: false, description: "WEBAPP_DEPLOYMENT_URL not configured" };
  }

  removeWebhook();

  const url = `${TELEGRAM_API_BASE}${botToken}/setWebhook`;

  const response = UrlFetchApp.fetch(url, {
    method: /** @type {const} */ ("post"),
    contentType: "application/json",
    payload: JSON.stringify({ url: webAppUrl }),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());

  if (result.ok) {
    addInfoLog("setupWebhook", "Webhook успішно встановлено");
  } else {
    addErrorLog("setupWebhook", result.description);
  }

  return result;
}

/**
 * Видалити webhook
 */
function removeWebhook() {
  const botToken = getBotTokenFromProperties();
  const url = `${TELEGRAM_API_BASE}${botToken}/deleteWebhook`;

  const response = UrlFetchApp.fetch(url, {
    method: /** @type {const} */ ("post"),
    contentType: "application/json",
    payload: JSON.stringify({ drop_pending_updates: true }),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());
  addDebugLog("removeWebhook", JSON.stringify(result));

  if (result.ok) {
    addInfoLog("removeWebhook", "Webhook успішно видалено");
  }

  return result;
}

/**
 * Перевірити статус webhook
 */
function checkWebhookStatus() {
  const botToken = getBotTokenFromProperties();
  const url = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;

  const response = UrlFetchApp.fetch(url);
  const result = JSON.parse(response.getContentText());

  addDebugLog("checkWebhookStatus", JSON.stringify(result, null, 2));

  return result;
}

/**
 * Відправити повідомлення в Telegram
 * @param {string|number} chatId - ID чату
 * @param {string} text - Текст повідомлення
 * @param {Object|undefined} keyboard - Необов'язкова клавіатура
 * @returns {Object} Відповідь від API
 */
function sendTelegramMessage(chatId, text, keyboard) {
  const botToken = getBotTokenFromProperties();
  const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text || " ",
    parse_mode: "HTML",
  };

  if (keyboard) {
    payload.reply_markup = keyboard;
  }

  const response = UrlFetchApp.fetch(url, {
    method: /** @type {const} */ ("post"),
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());

  if (!result.ok) {
    throw new Error(`Telegram API помилка: ${result.description}`);
  }

  return result;
}

const MAIN_KEYBOARD_BUTTON = {
  myProcessingTasks: "⏳ Мої завдання в роботі",
  myUnpaidApplications: "💳 Мої незаплачені заявки",
  applicationsToApprove: "✅ Заявки на затвердження",
  settings: "⚙️ Налаштування",
};

/**
 * Обробити webhook від Telegram
 * @param {Object} update - Об'єкт оновлення від Telegram
 */
function handleWebhook(update) {
  if (!update.message) {
    return { ok: true, message: "No message" };
  }

  const message = update.message;
  const chatId = message.chat.id;
  const username = message.from.username || "";
  const /** @type {string} */ text = message.text || "";

  addDebugLog("handleWebhook", JSON.stringify(update, null, 2), chatId);

  const user = getUserByChatId(chatId);

  if (!user) {
    const responseText =
      `👋 Привіт!\n\n` +
      `Ви ще не зареєстровані в системі.\n` +
      `Зверніться до адміністратора для реєстрації.\n\n` +
      `Ваш chat_id: ${chatId}`;

    sendTelegramMessage(chatId, responseText);
    return;
  }

  // Обробляємо команду /start
  if (text === "/start" || text.startsWith("/start ")) {
    sendMainMenu(user);
  }

  // Команда /help
  if (
    text === MAIN_KEYBOARD_BUTTON.myProcessingTasks ||
    text.includes(MAIN_KEYBOARD_BUTTON.myProcessingTasks)
  ) {
    // TODO: Додати обробку
    sendTelegramMessage(chatId, "Функціонал в розробці.");
  }

  if (
    text === MAIN_KEYBOARD_BUTTON.myProcessingTasks ||
    text.includes(MAIN_KEYBOARD_BUTTON.myProcessingTasks)
  ) {
    // TODO: Додати обробку
    sendTelegramMessage(chatId, "Функціонал в розробці.");
  }

  if (
    text === MAIN_KEYBOARD_BUTTON.myProcessingTasks ||
    text.includes(MAIN_KEYBOARD_BUTTON.myProcessingTasks)
  ) {
    // TODO: Додати обробку
    sendTelegramMessage(chatId, "Функціонал в розробці.");
  }
}

/**
 * Тест відправки повідомлення
 */
function testNotification() {
  const user = getUserByName("Ващенко Ігор Володимирович");

  if (!user) {
    addErrorLog("testNotification", "Користувач не знайдений");
    return;
  }

  const testData = {
    paymentDate: new Date(),
    contractor: 'ТОВ "Тестова Компанія"',
    amount: "15000.00",
    currency: "UAH",
    purpose: "Тестове повідомлення",
  };

  const message = formatPaymentMessage("Тестове повідомлення", testData);
  sendTelegramMessage(user.chatId, message);
  addDebugLog(
    "testNotification",
    `Повідомлення відправлено користувачу ${user.fullname}`,
    user.chatId,
  );
}

/**
 * Перевірити поточні Script Properties
 */
function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  addDebugLog("checkScriptProperties", JSON.stringify(all, null, 2));
}
