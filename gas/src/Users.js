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
    morningTasksNotifications: {
      index: 8,
      name: "morning_tasks_notifications",
    },
    eveningTasksNotifications: {
      index: 9,
      name: "evening_tasks_notifications",
    },
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
      .getRange(1, 1, 1, 9)
      .setValues([
        [
          USERS_SHEET_CONFIG.columns.fullname.name,
          USERS_SHEET_CONFIG.columns.position.name,
          USERS_SHEET_CONFIG.columns.service.name,
          USERS_SHEET_CONFIG.columns.chatId.name,
          USERS_SHEET_CONFIG.columns.paymentsNotifications.name,
          USERS_SHEET_CONFIG.columns.unpaidNotifications.name,
          USERS_SHEET_CONFIG.columns.newTasksNotifications.name,
          USERS_SHEET_CONFIG.columns.morningTasksNotifications.name,
          USERS_SHEET_CONFIG.columns.eveningTasksNotifications.name,
        ],
      ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold");
  }

  return sheet;
}

/**
 * Отримати User за chatId
 * @param {string} chatId - Telegram chat_id
 * @returns {{fullname: string, position: string, service: string, chatId: string, settings: {paymentsNotifications: boolean, unpaidNotifications: boolean, newTasksNotifications: boolean, morningTasksNotifications: boolean, eveningTasksNotifications: boolean}} | null} Об'єкт користувача або null
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
        paymentsNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.paymentsNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.paymentsNotifications.index - 1
          ] === true
            ? true
            : false,
        unpaidNotifications:
          userRow[USERS_SHEET_CONFIG.columns.unpaidNotifications.index - 1] ===
            "TRUE" ||
          userRow[USERS_SHEET_CONFIG.columns.unpaidNotifications.index - 1] ===
            true
            ? true
            : false,
        newTasksNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.newTasksNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.newTasksNotifications.index - 1
          ] === true
            ? true
            : false,
        morningTasksNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.morningTasksNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.morningTasksNotifications.index - 1
          ] === true
            ? true
            : false,
        eveningTasksNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.eveningTasksNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.eveningTasksNotifications.index - 1
          ] === true
            ? true
            : false,
      },
    };
  }

  return null;
}

/**
 * Отримати User за name
 * @param {string} name - Повне ім'я користувача
 * @returns {{fullname: string, position: string, service: string, chatId: string, settings: {paymentsNotifications: boolean, unpaidNotifications: boolean, newTasksNotifications: boolean, morningTasksNotifications: boolean, eveningTasksNotifications: boolean}} | null} Об'єкт користувача або null
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
        paymentsNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.paymentsNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.paymentsNotifications.index - 1
          ] === true
            ? true
            : false,
        unpaidNotifications:
          userRow[USERS_SHEET_CONFIG.columns.unpaidNotifications.index - 1] ===
            "TRUE" ||
          userRow[USERS_SHEET_CONFIG.columns.unpaidNotifications.index - 1] ===
            true
            ? true
            : false,
        newTasksNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.newTasksNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.newTasksNotifications.index - 1
          ] === true
            ? true
            : false,
        morningTasksNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.morningTasksNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.morningTasksNotifications.index - 1
          ] === true
            ? true
            : false,
        eveningTasksNotifications:
          userRow[
            USERS_SHEET_CONFIG.columns.eveningTasksNotifications.index - 1
          ] === "TRUE" ||
          userRow[
            USERS_SHEET_CONFIG.columns.eveningTasksNotifications.index - 1
          ] === true
            ? true
            : false,
      },
    };
  }

  return null;
}

const OPTIONS_KEYBOARD_BUTTON = {
  paymentsNotifications: {
    id: "paymentsNotifications",
    enabled: "✅ Отримувати сповіщення про оплати (ввімкнено)",
    disabled: "❌ Отримувати сповіщення про оплати (вимкнено)",
  },
  unpaidNotifications: {
    id: "unpaidNotifications",
    enabled: "✅ Отримувати сповіщення про несплачені заявки (ввімкнено)",
    disabled: "❌ Отримувати сповіщення про несплачені заявки (вимкнено)",
  },
  newTasksNotifications: {
    id: "newTasksNotifications",
    enabled: "✅ Отримувати сповіщення про нові завдання (ввімкнено)",
    disabled: "❌ Отримувати сповіщення про нові завдання (вимкнено)",
  },
  morningTasksNotifications: {
    id: "morningTasksNotifications",
    enabled: "✅ Отримувати ранкові сповіщення про завдання (ввімкнено)",
    disabled: "❌ Отримувати ранкові сповіщення про завдання (вимкнено)",
  },
  eveningTasksNotifications: {
    id: "eveningTasksNotifications",
    enabled: "✅ Отримувати вечірні сповіщення про завдання (ввімкнено)",
    disabled: "❌ Отримувати вечірні сповіщення про завдання (вимкнено)",
  },
};
/**
 * Відправити головне меню користувачу
 * @param {Object} user - Користувач
 * @param {string} user.fullname - ПІБ користувача
 * @param {string} user.position - Посада користувача
 * @param {string} user.service - Служба користувача
 * @param {string} user.chatId - Telegram chat_id користувача
 * @param {Object} user.settings - Налаштування користувача
 * @param {boolean} user.settings.paymentsNotifications - Сповіщення про оплати
 * @param {boolean} user.settings.unpaidNotifications - Сповіщення про несплачені заявки
 * @param {boolean} user.settings.newTasksNotifications - Сповіщення про нові завдання
 * @param {boolean} user.settings.morningTasksNotifications - Ранкові сповіщення про завдання
 * @param {boolean} user.settings.eveningTasksNotifications - Вечірні сповіщення про завдання
 * @param {number|undefined} messageId - Ідентифікатор повідомлення для редагування
 */
function optionsMenu(user, messageId = undefined) {
  const keyboard = {
    inline_keyboard: Object.values(OPTIONS_KEYBOARD_BUTTON).map((option) => [
      {
        text: user.settings[option.id] ? option.enabled : option.disabled,
        callback_data: `change_option:${option.id}`,
      },
    ]),
  };

  const messageText = "Налаштування сповіщень: оберіть потрібний параметр 👇";

  if (messageId) {
    editTelegramMessage(user.chatId, messageId, messageText, keyboard);
  } else {
    sendTelegramMessage(user.chatId, messageText, keyboard);
  }
}

/**
 * Встановити опцію для користувача
 * @param {Object} user - Користувач
 * @param {string} user.fullname - ПІБ користувача
 * @param {string} user.position - Посада користувача
 * @param {string} user.service - Служба користувача
 * @param {string} user.chatId - Telegram chat_id користувача
 * @param {Object} user.settings - Налаштування користувача
 * @param {boolean} user.settings.paymentsNotifications - Сповіщення про оплати
 * @param {boolean} user.settings.unpaidNotifications - Сповіщення про несплачені заявки
 * @param {boolean} user.settings.newTasksNotifications - Сповіщення про нові завдання
 * @param {boolean} user.settings.morningTasksNotifications - Ранкові сповіщення про завдання
 * @param {boolean} user.settings.eveningTasksNotifications - Вечірні сповіщення про завдання
 * @param {string} optionId - Ідентифікатор опції
 * @param {number} messageId - Ідентифікатор повідомлення для редагування
 */
function setOptionForUser(user, optionId, messageId) {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();

  const userRowIndex = data.findIndex((row, i) => {
    if (i === 0) return false; // Пропускаємо заголовок

    return (
      row[USERS_SHEET_CONFIG.columns.chatId.index - 1].toString() ===
      user.chatId.toString()
    );
  });

  if (userRowIndex === -1) {
    addErrorLog(
      "setOptionForUser",
      `Користувача з chatId ${user.chatId} не знайдено в таблиці`,
      user.chatId,
    );

    return;
  }

  const columnIndex = USERS_SHEET_CONFIG.columns[optionId].index;

  sheet
    .getRange(userRowIndex + 1, columnIndex)
    .setValue(!user.settings[optionId]);
  user.settings[optionId] = !user.settings[optionId];

  addDebugLog(
    "setOptionForUser",
    `Оновлено опцію ${optionId} для користувача ${user.fullname} (${user.chatId}) на ${user.settings[optionId]}`,
    user.chatId,
  );

  optionsMenu(user, messageId);
}
