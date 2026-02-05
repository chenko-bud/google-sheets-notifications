/// <reference types="@types/google-apps-script" />

// ============================================
// Завдання
// ============================================

/**
 * Форматувати повідомлення завдання
 * @param {string} title - Заголовок повідомлення
 * @param {Object} taskData - Дані по завданню
 * @param {string} taskData.description - Опис завдання
 * @param {string} taskData.decision - Рішення по завданню
 * @param {string|Date|undefined} taskData.date - Дата виконання завдання
 * @returns {string} Форматоване повідомлення
 */
function formatTaskMessage(title, taskData) {
  const { description, decision, date } = taskData;

  const isOverdued = compareDates(date, "<", new Date());

  let message = `<b>${title}</b>\n\n`;

  if (description) {
    message += `📋 <b>Завдання:</b> ${description}\n`;
  }

  if (decision) {
    message += `💵 ${decision}\n`;
  }

  message += `📅 <b>Виконати до:</b> ${date ? formatDateUa(date) : "Не вказано"}${isOverdued ? "\n" : ""}`;

  if (isOverdued) {
    message += ` ⚠️ <i>(Протерміновано)</i>`;
  }

  return message;
}

/**
 * Форматувати повідомлення завдання
 * @param {string} title - Заголовок повідомлення
 * @param {Array<{ description: string, decision: string, date: string|Date|undefined }>} tasksData - Масив даних по завданням
 * @param {string} emptyText - Текст, якщо немає платежів
 * @returns {string} Форматоване повідомлення
 */
function formatTasksMessage(title, tasksData, emptyText) {
  let message = tasksData.length > 0 ? `<b>${title}</b>\n\n` : "";
  let currentLength = message.length;
  const currentDate = new Date();

  tasksData.forEach(({ description, decision, date }, i, { length }) => {
    const isOverdued = compareDates(date, "<", currentDate);
    let item = `${i + 1}.\n`;

    if (description) {
      message += `📋 <b>Завдання:</b> ${description}\n`;
    }

    if (decision) {
      message += `💵 ${decision}\n`;
    }

    message += `📅 <b>Виконати до:</b> ${date ? formatDateUa(date) : "Не вказано"}${isOverdued ? "\n" : ""}`;

    if (isOverdued) {
      message += ` ⚠️ <i>(Протерміновано)</i>`;
    }

    if (i < length - 1) item += "_______________________________________\n";

    if (currentLength + item.length > TELEGRAM_LIMIT) {
      message += "<i>Далі список обрізано через ліміт Telegram</i>\n";

      return;
    }

    message += item;
    currentLength += item.length;
  });

  message += tasksData.length > 0 ? "" : `<b>${emptyText}</b>`;

  return message;
}

/** Отримати клавіатуру для завдання
 * @param {string} taskId - Ідентифікатор завдання
 * @returns {Object|undefined} Клавіатура або undefined
 */
function getTaskKeyboard(taskId) {
  //   if (!taskId || taskId.toString().trim() === "") return;

  //   return {
  //     inline_keyboard: [
  //       [
  //         {
  //           text: "Відмітити як виконане ✅",
  //           callback_data: `complete_task:${taskId.slice(1)}`,
  //         },
  //       ],
  //     ],
  //   };
  return;
}

const DEFAULT_TASK_CONFIG = {
  sheetName: "Завдання",
  columns: {
    DESCRIPTION: 1, // A - Завдання
    DECISION: 4, // D - Рішення
    RESPONSIBLE: 5, // E - Відповідальний
    OVERDUE_DATE: 6, // F - Дата виконання
    STATUS: 7, // G - Статус
    ID: 8, // H - ID
  },
  dataStartRow: 11, // Починаючи з якої строки починаються дані,
  statuses: {
    inProgress: {
      id: "in_progress",
      text: "В роботі",
    },
    completed: {
      id: "completed",
      text: "Виконано",
    },
    postponed: {
      id: "postponed",
      text: "Перенесено",
    },
  },
};

/** Отримати конфігурацію з урахуванням кастомної
 * @param {Object} defaultConfig - Дефолтна конфігурація
 * @param {Object} customConfig - Кастомна конфігурація
 * @returns {Object} Об'єднана конфігурація
 */
function getTasksConfig(defaultConfig, customConfig = {}) {
  return {
    sheetName: customConfig.sheetName || defaultConfig.sheetName,
    dataStartRow: customConfig.dataStartRow || defaultConfig.dataStartRow,
    columns: { ...defaultConfig.columns, ...(customConfig.columns || {}) },
    statuses: { ...defaultConfig.statuses, ...(customConfig.statuses || {}) },
  };
}

/** Обробити додавання нового завдання
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e - Подія редагування
 * @param {Object} customConfig - Конфігурація
 */
function processTaskAdd(e, customConfig = {}) {
  try {
    if (!e || !e.range) return;

    const config = getTasksConfig(DEFAULT_TASK_CONFIG, customConfig);

    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const col = range.getColumn();

    // Перевіряємо назву листа
    if (sheet.getName() !== config.sheetName) {
      return;
    }

    if (col !== config.columns.STATUS) {
      return;
    }

    if (e.value !== config.statuses.inProgress.text) {
      return;
    }

    const data = sheet
      .getRange(
        range.getRow(),
        1,
        1,
        Math.max(...Object.values(config.columns)),
      )
      .getValues();

    if (data.length === 0) {
      return;
    }

    let id = data[0][config.columns.ID - 1];

    if (!id || id.toString().trim() === "") {
      id = generateId(UNOTIFIED_ID_PREFIX);

      sheet.getRange(range.getRow(), config.columns.ID).setValue(id);
    }

    if (id.toString().startsWith(NOTIFIED_ID_PREFIX)) {
      // Вже відправляли повідомлення по цьому завданню
      return;
    }

    const responsible = data[0][config.columns.RESPONSIBLE - 1];

    if (!responsible || responsible.toString().trim() === "") {
      addDebugLog(
        "processTaskAdd",
        `Не вказано відповідального для завдання з ID "${id}"`,
      );

      return;
    }

    const user = getUserByName(responsible.toString());

    if (!user) {
      addDebugLog(
        "processTaskAdd",
        `Користувача "${responsible}" не знайдено для завдання з ID "${id}"`,
      );

      return;
    }

    if (!user.settings.newTasksNotifications) {
      addDebugLog(
        "processTaskAdd",
        `Сповіщення про нові завдання вимкнено для користувача "${user.fullname}"`,
        user.chatId,
      );

      return;
    }

    const description = data[0][config.columns.DESCRIPTION - 1];
    const decision = data[0][config.columns.DECISION - 1];

    if (!description && !decision) {
      addDebugLog(
        "processTaskAdd",
        `Не вказано опис або рішення для завдання з ID "${id}"`,
        user.chatId,
      );

      return;
    }

    const date = data[0][config.columns.OVERDUE_DATE - 1];

    sendTelegramMessage(
      user.chatId,
      formatTaskMessage("😮‍💨 Вам призначено нове завдання:", {
        description,
        decision,
        date,
      }),
      getTaskKeyboard(id),
    );

    sheet
      .getRange(range.getRow(), config.columns.ID)
      .setValue(`${NOTIFIED_ID_PREFIX}${id.slice(1)}`);

    addDebugLog(
      "processTaskAdd",
      `Відправлено завдання з ID "${id}" користувачу "${user.fullname}" (${user.chatId})`,
      user.chatId,
    );
  } catch (error) {
    addErrorLog("processTaskAdd", error.message);
  }
}

/**
 * Відправити завдання в роботі користувачу
 * @param {Object} user - Користувач
 * @param {string} user.fullname - ПІБ користувача
 * @param {string} user.position - Посада користувача
 * @param {string} user.service - Служба користувача
 * @param {string} user.chatId - Telegram chat_id користувача
 * @param {Object} user.settings - Налаштування користувача
 * @param {boolean} user.settings.paymentsNotifications - Сповіщення про оплати
 * @param {boolean} user.settings.unpaidNotifications - Сповіщення про несплачені заявки
 * @param {boolean} user.settings.newTasksNotifications - Сповіщення про нові завдання
 * @param {Object} customConfig - Конфігурація
 */
function sendProcessingTaskToUser(user, customConfig = {}) {
  try {
    const config = getTasksConfig(DEFAULT_TASK_CONFIG, customConfig);

    addDebugLog("sendProcessingTaskToUser", `${user.fullname}`, user.chatId);

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
      "TASKS_SPREADSHEET_ID",
    );

    if (!spreadsheetId) {
      addErrorLog(
        "sendProcessingTaskToUser",
        "TASKS_SPREADSHEET_ID не налаштовано в Script Properties",
      );

      return;
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(config.sheetName);

    if (!sheet) {
      addErrorLog(
        "sendProcessingTaskToUser",
        `Лист "${config.sheetName}" не знайдено`,
      );

      return;
    }

    const lastCol = Math.max(...Object.values(config.columns));
    const lastRow = sheet.getLastRow();

    const data = sheet
      .getRange(
        config.dataStartRow,
        1,
        lastRow - config.dataStartRow + 1,
        lastCol,
      )
      .getValues();

    const userTasks = data.reduce((acc, rowData) => {
      const rowUser = rowData[config.columns.RESPONSIBLE - 1];

      if (
        !rowUser ||
        !user.fullname
          .toString()
          .trim()
          .toLowerCase()
          .includes(rowUser.toString().trim().toLowerCase())
      ) {
        return acc;
      }

      const status = rowData[config.columns.STATUS - 1];

      if (
        status.toString().trim().toLowerCase() !==
        config.statuses.inProgress.text.toLowerCase()
      ) {
        return acc;
      }

      const description = rowData[config.columns.DESCRIPTION - 1];
      const decision = rowData[config.columns.DECISION - 1];

      if (!description && !decision) {
        return acc;
      }

      const id = rowData[config.columns.ID - 1];
      const date = rowData[config.columns.OVERDUE_DATE - 1];

      acc.push({
        id,
        description,
        decision,
        date,
      });

      return acc;
    }, []);

    userTasks.sort(
      (a, b) => getMidnightTimestamp(a.date) - getMidnightTimestamp(b.date),
    );

    const message = formatPaymentsMessage(
      "⏳ <b>Завдання в роботі:</b>",
      userTasks,
      "Всі завдання виконані! ✅",
    );

    sendTelegramMessage(user.chatId, message);

    addDebugLog(
      "sendProcessingTaskToUser",
      `Завдання в кількості ${userTasks.length} відправлено користувачу: ${user.fullname}`,
      user.chatId,
    );
  } catch (error) {
    addErrorLog("sendProcessingTaskToUser", error.message, user.chatId);
  }
}

/** Відмітити завдання як виконане
 * @param {Object} user - Користувач
 * @param {string} user.fullname - ПІБ користувача
 * @param {string} user.chatId - Telegram chat_id користувача
 * @param {string} taskId - Ідентифікатор завдання
 * @param {number} messageId - Ідентифікатор повідомлення в Telegram
 * @param {Object|undefined} customConfig - Конфігурація
 */
function markTaskAsCompleted(user, taskId, messageId, customConfig = {}) {
  try {
    const config = getTasksConfig(DEFAULT_TASK_CONFIG, customConfig);

    addDebugLog(
      "markTaskAsCompleted",
      `Користувач ${user.fullname} відмічає завдання ${taskId} як виконане`,
      user.chatId,
    );

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
      "TASKS_SPREADSHEET_ID",
    );

    if (!spreadsheetId) {
      addErrorLog(
        "markTaskAsCompleted",
        "TASKS_SPREADSHEET_ID не налаштовано в Script Properties",
      );

      return;
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(config.sheetName);

    if (!sheet) {
      addErrorLog(
        "markTaskAsCompleted",
        `Лист "${config.sheetName}" не знайдено`,
      );

      return;
    }

    const lastCol = Math.max(...Object.values(config.columns));
    const lastRow = sheet.getLastRow();

    const data = sheet
      .getRange(
        config.dataStartRow,
        1,
        lastRow - config.dataStartRow + 1,
        lastCol,
      )
      .getValues();

    const taskIdx = data.findIndex((rowData) => {
      const id = rowData[config.columns.ID - 1];

      if (!id) return false;

      return id.toString().trim().includes(taskId);
    });

    if (taskIdx === -1) {
      addErrorLog(
        "markTaskAsCompleted",
        `Завдання з ID "${taskId}" не знайдено`,
        user.chatId,
      );

      return;
    }

    const statusCol = config.columns.STATUS;
    const sheetRow = config.dataStartRow + taskIdx;

    sheet
      .getRange(sheetRow, statusCol)
      .setValue(config.statuses.completed.text);

    deleteTelegramMessage(user.chatId, messageId);
  } catch (error) {
    addErrorLog("markTaskAsCompleted", error.message, user.chatId);
  }
}

function setIdsToExistingTasks(customConfig = {}) {
  try {
    const config = getTasksConfig(DEFAULT_TASK_CONFIG, customConfig);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(config.sheetName);

    if (!sheet) {
      addErrorLog(
        "setIdsToExistingTasks",
        `Лист "${config.sheetName}" не знайдено`,
      );

      return;
    }
    const lastCol = Math.max(...Object.values(config.columns));
    const lastRow = sheet.getLastRow();
    const data = sheet
      .getRange(
        config.dataStartRow,
        1,
        lastRow - config.dataStartRow + 1,
        lastCol,
      )
      .getValues();
    const ids = data.map((row) => {
      if (!row[config.columns.DESCRIPTION - 1]) {
        return [""];
      }

      if (row[config.columns.ID - 1].toString().trim()) {
        return [row[config.columns.ID - 1].toString().trim()];
      }

      return [generateId(UNOTIFIED_ID_PREFIX)];
    });

    sheet
      .getRange(
        config.dataStartRow,
        config.columns.ID,
        lastRow - config.dataStartRow + 1,
        1,
      )
      .setValues(ids);
  } catch (error) {
    addErrorLog("setIdsToExistingTasks", error.message);
  }
}

/**
 * Розсилка повідомлень про завдання для всіх відповідальних (для тригера в Google Sheets)
 * @param {Object} customConfig - Кастомна конфігурація
 * @param {string} mode - Режим розсилки ("morning" або "evening")
 */
function notifyAllTasks(customConfig = {}, mode = "morning") {
  const config = getTasksConfig(DEFAULT_TASK_CONFIG, customConfig);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    addErrorLog("notifyAllTasks", `Лист "${config.sheetName}" не знайдено`);

    return;
  }

  try {
    const lastCol = Math.max(
      ...Object.values(config.columns),
      config.togglePaidColumn,
    );
    const lastRow = sheet.getLastRow();
    const data = sheet
      .getRange(
        config.dataStartRow,
        1,
        lastRow - config.dataStartRow + 1,
        lastCol,
      )
      .getValues();
    const filterDate = new Date();

    // Групуємо завдання по відповідальному
    const userTasksMap = {};

    data.forEach((rowData) => {
      const description = rowData[config.columns.DESCRIPTION - 1];
      const decision = rowData[config.columns.DECISION - 1];

      if (!description && !decision) {
        return;
      }

      const status = rowData[config.columns.STATUS - 1];

      if (
        status.toString().trim().toLowerCase() !==
        config.statuses.inProgress.text.toLowerCase()
      ) {
        return;
      }

      const responsible = rowData[config.columns.RESPONSIBLE - 1];

      if (!responsible) return;

      const user = getUserByName(responsible);

      if (
        !user ||
        !user.chatId ||
        !user.settings ||
        (mode === "morning" &&
          user.settings.morningTasksNotifications === false) ||
        (mode === "evening" &&
          user.settings.eveningTasksNotifications === false)
      ) {
        return;
      }

      const taskData = {
        description,
        decision,
        date: rowData[config.columns.DATE - 1],
      };

      if (!userTasksMap[user.chatId]) {
        userTasksMap[user.chatId] = {
          user,
          tasks: [],
        };
      }

      userTasksMap[user.chatId].tasks.push(taskData);
    });

    // Формуємо масив для розсилки
    const taskNotifications = Object.values(userTasksMap);

    taskNotifications.forEach(({ user, tasks }) => {
      if (!tasks.length) return;

      const message = formatPaymentsMessage(
        "⏳ <b>Нагадування про завдання в роботі:</b>",
        tasks,
        "Всі завдання виконані! ✅",
      );

      sendTelegramMessage(user.chatId, message);

      addDebugLog(
        "notifyAllTasks",
        `Повідомлення про завдання в роботі відправлено користувачу ${user.fullname}`,
        user.chatId,
      );
    });
  } catch (error) {
    addErrorLog("notifyAllTasks", `Помилка обробки: ${error.message}`);
  }
}
