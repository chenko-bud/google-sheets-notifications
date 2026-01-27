// ============================================
// Логування
// ============================================

/**
 * Файл для роботи з таблицею логів
 */

const LOG_LEVELS = {
  DEBUG: 1,
  INFO: 2,
  ERROR: 3,
  NONE: 4,
};

const LOG_TYPES = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  ERROR: "ERROR",
};

const LOGS_SHEET_CONFIG = {
  sheetName: "logs",
  columns: {
    timestamp: { index: 1, name: "timestamp" },
    functionName: { index: 2, name: "function_name" },
    logType: { index: 3, name: "log_type" },
    payload: { index: 4, name: "payload" },
    chatId: { index: 5, name: "chat_id" },
  },
};

/**
 * Отримати таблицю логів
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Аркуш з логами
 */
function getLogsSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    "LOGS_SPREADSHEET_ID",
  );

  if (!spreadsheetId) {
    throw new Error("LOGS_SPREADSHEET_ID не налаштовано в Script Properties");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(LOGS_SHEET_CONFIG.sheetName);

  // Створюємо аркуш якщо не існує
  if (!sheet) {
    sheet = spreadsheet.insertSheet(LOGS_SHEET_CONFIG.sheetName);
  }

  return sheet;
}

/**
 * Додати лог
 * @param {string} functionName - Ім'я функції
 * @param {string} logType - Тип логу
 * @param {string} payload - Дані для збереження в лог
 * @param {string|undefined} chatId - Telegram chat_id
 */
function addLog(functionName, logType, payload, chatId = undefined) {
  getLogsSheet().appendRow([
    new Date(),
    functionName,
    logType,
    JSON.stringify(payload),
    chatId || "",
  ]);
}

/**
 * Додати дебаг лог
 * @param {string} functionName - Ім'я функції
 * @param {string} payload - Дані для збереження в лог
 * @param {string|undefined} chatId - Telegram chat_id
 */
function addDebugLog(functionName, payload, chatId = undefined) {
  if (LOG_LEVEL <= LOG_LEVELS.DEBUG) {
    addLog(functionName, LOG_TYPES.DEBUG, payload, chatId);
  }
}

/**
 * Додати інфо лог
 * @param {string} functionName - Ім'я функції
 * @param {string} payload - Дані для збереження в лог
 * @param {string|undefined} chatId - Telegram chat_id
 */
function addInfoLog(functionName, payload, chatId = undefined) {
  if (LOG_LEVEL <= LOG_LEVELS.INFO) {
    addLog(functionName, LOG_TYPES.INFO, payload, chatId);
  }
}

/**
 * Додати еррор лог
 * @param {string} functionName - Ім'я функції
 * @param {string} payload - Дані для збереження в лог
 * @param {string|undefined} chatId - Telegram chat_id
 */
function addErrorLog(functionName, payload, chatId = undefined) {
  if (LOG_LEVEL <= LOG_LEVELS.ERROR) {
    addLog(functionName, LOG_TYPES.ERROR, payload, chatId);
  }
}
