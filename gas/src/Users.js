// ============================================
// КОРИСТУВАЧІ
// ============================================

/**
 * Файл для роботи з таблицею користувачів Telegram
 */

const USERS_SHEET_CONFIG = {
  sheetName: "users",
  columns: {
    fullname: { index: 1, name: "ПІБ" },
    position: { index: 2, name: "Посада" },
    service: { index: 3, name: "Служба" },
    chatId: { index: 4, name: "Telegram chat_id" },
    paymentsNotifications: { index: 5, name: "payments_notifications" },
    unpaidNotifications: { index: 6, name: "unpaid_notifications" },
    newTasksNotifications: { index: 7, name: "new_tasks_notifications" },
    reserved1: { index: 8, name: "reserved_1" },
    reserved2: { index: 9, name: "reserved_2" },
  },
};

/**
 * Отримати таблицю користувачів
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Аркуш з користувачами
 */
function getUsersSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    "USERS_SPREADSHEET_ID",
  );
  if (!spreadsheetId) {
    throw new Error("USERS_SPREADSHEET_ID не налаштовано в Script Properties");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(USERS_SHEET_CONFIG.sheetName);

  // Створюємо аркуш якщо не існує
  if (!sheet) {
    sheet = spreadsheet.insertSheet(USERS_SHEET_CONFIG.sheetName);
    sheet
      .getRange(1, 1, 1, 4)
      .setValues([
        [
          USERS_SHEET_CONFIG.columns.fullname.name,
          USERS_SHEET_CONFIG.columns.position.name,
          USERS_SHEET_CONFIG.columns.service.name,
          USERS_SHEET_CONFIG.columns.chatId.name,
        ],
      ]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
  }

  return sheet;
}

/**
 * Отримати User за chatId
 * @param {string} chatId - Telegram chat_id
 * @returns {{fullname: string, position: string, service: string, chatId: string, settings: {paymentsNotifications: boolean, unpaidNotifications: boolean, newTasksNotifications: boolean}} | null} Об'єкт користувача або null
 */
function getUserByChatId(chatId) {
  const data = getUsersSheet().getDataRange().getValues();
  const userRow = data.find((row, i) => {
    if (i === 0) return false; // Пропускаємо заголовок
    if (
      row[USERS_SHEET_CONFIG.columns.chatId.index - 1].toString() !==
      chatId.toString()
    ) {
      return false;
    }

    return true;
  });

  if (userRow) {
    return {
      fullname: userRow[USERS_SHEET_CONFIG.columns.fullname.index - 1],
      position: userRow[USERS_SHEET_CONFIG.columns.position.index - 1],
      service: userRow[USERS_SHEET_CONFIG.columns.service.index - 1],
      chatId: userRow[USERS_SHEET_CONFIG.columns.chatId.index - 1].toString(),
      settings: {
        paymentsNotifications: Boolean(
          userRow[USERS_SHEET_CONFIG.columns.paymentsNotifications.index - 1],
        ),
        unpaidNotifications: Boolean(
          userRow[USERS_SHEET_CONFIG.columns.unpaidNotifications.index - 1],
        ),
        newTasksNotifications: Boolean(
          userRow[USERS_SHEET_CONFIG.columns.newTasksNotifications.index - 1],
        ),
      },
    };
  }

  return null;
}

/**
 * Отримати User за name
 * @param {string} name - Повне ім'я користувача
 * @returns {{fullname: string, position: string, service: string, chatId: string, settings: {paymentsNotifications: boolean, unpaidNotifications: boolean, newTasksNotifications: boolean}} | null} Об'єкт користувача або null
 */
function getUserByName(name) {
  if (!name?.trim()) return null;

  const data = getUsersSheet().getDataRange().getValues();
  const userRow = data.find((row, i) => {
    if (i === 0) return false; // Пропускаємо заголовок
    if (
      !row[USERS_SHEET_CONFIG.columns.fullname.index - 1]
        .toString()
        .toLowerCase()
        .trim()
        .includes(name.toString().toLowerCase().trim())
    ) {
      return false;
    }

    return true;
  });

  if (userRow) {
    return {
      fullname: userRow[USERS_SHEET_CONFIG.columns.fullname.index - 1],
      position: userRow[USERS_SHEET_CONFIG.columns.position.index - 1],
      service: userRow[USERS_SHEET_CONFIG.columns.service.index - 1],
      chatId: userRow[USERS_SHEET_CONFIG.columns.chatId.index - 1].toString(),
      settings: {
        paymentsNotifications: Boolean(
          userRow[USERS_SHEET_CONFIG.columns.paymentsNotifications.index - 1],
        ),
        unpaidNotifications: Boolean(
          userRow[USERS_SHEET_CONFIG.columns.unpaidNotifications.index - 1],
        ),
        newTasksNotifications: Boolean(
          userRow[USERS_SHEET_CONFIG.columns.newTasksNotifications.index - 1],
        ),
      },
    };
  }

  return null;
}
