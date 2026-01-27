/// <reference types="@types/google-apps-script" />

// ============================================
// Платежі
// ============================================

/**
 * Форматувати повідомлення платіж
 * @param {string} title - Заголовок повідомлення
 * @param {Object} paymentData - Дані про оплату
 * @param {string|Date|undefined} paymentData.paymentDate - Дата планової оплати
 * @param {string} paymentData.contractor - Контрагент
 * @param {number|string} paymentData.amount - Сума оплати
 * @param {string} paymentData.currency - Валюта
 * @param {string} paymentData.purpose - Призначення платежу
 * @returns {string} Форматоване повідомлення
 */
function formatPaymentMessage(title, paymentData) {
  const { paymentDate, contractor, amount, currency, purpose } = paymentData;

  let message = `<b>${title}</b>\n\n`;
  message += `📅 <b>Дата оплати:</b> ${formatDateUa(paymentDate || new Date())}\n`;
  message += `📋 <b>Контрагент:</b> ${contractor || "Не вказано"}\n`;
  message += `💵 <b>Сума:</b> ${amount || "0"} ${currency || "UAH"}\n`;
  message += `📝 <b>Призначення:</b> ${purpose || "Не вказано"}`;

  return message;
}

/**
 * Форматувати повідомлення про платежі
 * @param {string} title - Заголовок повідомлення
 * @param {Array<{ paymentDate: string|Date|undefined, contractor: string, amount: number|string, currency: string, purpose: string }>} paymentsData - Масив даних про планові оплати
 * @param {string} emptyText - Текст, якщо немає платежів
 * @returns {string} Форматоване повідомлення
 */
function formatPaymentsMessage(title, paymentsData, emptyText) {
  let message = paymentsData.length > 0 ? `<b>${title}</b>\n\n` : "";
  let currentLength = message.length;

  paymentsData.forEach(
    ({ paymentDate, contractor, amount, currency, purpose }, i, { length }) => {
      let item = `${i + 1}.\n`;
      item += `📅 <b>Дата платежу:</b> ${formatDateUa(paymentDate || new Date())}\n`;
      item += `📋 <b>Контрагент:</b> ${contractor || "Не вказано"}\n`;
      item += `💵 <b>Сума:</b> ${amount || "0"} ${currency || "UAH"}\n`;
      item += `📝 <b>Призначення:</b> ${purpose || "Не вказано"}\n`;
      if (i < length - 1) item += "_______________________________________\n";
      if (currentLength + item.length > TELEGRAM_LIMIT) {
        message += "<i>Далі список обрізано через ліміт Telegram</i>\n";
        return;
      }
      message += item;
      currentLength += item.length;
    },
  );

  message += paymentsData.length > 0 ? "" : `<b>${emptyText}</b>`;

  return message;
}

// ============================================
// КОНФІГУРАЦІЯ
// ============================================

const DEFAULT_SOURCE_CONFIG = {
  sheetName: "Свод заявок",
  columns: {
    PLAN_PAYMENT_DATE: 25, // Y - Планова дата оплати
    ORGANIZATION: 26, // Z - Організація
    CONTRACTOR: 27, // AA - Контрагент
    PROJECT: 28, // AB - Проект
    NOMENCLATURE: 29, // AC - Номенклатура
    CONTRACT: 35, // AI - Договір
    INVOICE: 36, // AJ - Рахунок
    PURPOSE: 37, // AK - Призначення
    DEPARTMENT: 38, // AL - Підрозділ
    RESPONSIBLE: 43, // AQ - Відповідальний
    AMOUNT: 33, // AG - Сумма
    CURRENCY: 34, // AH - ВАЛЮТА
  },
  toggleApprovedColumn: -1, // не використовується
  togglePaidColumn: -1, // не використовується
  paymentIdColumn: -1, // не використовується
  dataStartRow: 2, // Дані починаються з 2-го рядка
};

const DEFAULT_TARGET_CONFIG = {
  sheetName: "Реєстр",
  columns: {
    PLAN_PAYMENT_DATE: 1, // A - Планова дата оплати
    ORGANIZATION: 2, // B - Організація
    CONTRACTOR: 3, // C - Контрагент
    PROJECT: 4, // D - Проект
    NOMENCLATURE: 5, // E - Номенклатура
    CONTRACT: 6, // F - Договір
    INVOICE: 7, // G - Рахунок
    PURPOSE: 8, // H - Призначення
    DEPARTMENT: 9, // I - Підрозділ
    RESPONSIBLE: 10, // J - Відповідальний
    AMOUNT: 11, // K - Сумма
    CURRENCY: 12, // L - ВАЛЮТА
  },
  toggleApprovedColumn: 13, // M - Позначка затвердження
  togglePaidColumn: 14, // N - Позначка оплати
  paymentIdColumn: 15, // O - ID платежу
  dataStartRow: 7, // Дані починаються з 7-го рядка
};

/** Отримати конфігурацію з урахуванням кастомної
 * @param {Object} defaultConfig - Дефолтна конфігурація
 * @param {Object} customConfig - Кастомна конфігурація
 * @returns {Object} Об'єднана конфігурація
 */
function getPaymentsConfig(defaultConfig, customConfig = {}) {
  return {
    sheetName: customConfig.sheetName || defaultConfig.sheetName,
    columns: { ...defaultConfig.columns, ...(customConfig.columns || {}) },
    toggleApprovedColumn:
      customConfig.toggleApprovedColumn || defaultConfig.toggleApprovedColumn,
    togglePaidColumn:
      customConfig.togglePaidColumn || defaultConfig.togglePaidColumn,
    paymentIdColumn:
      customConfig.paymentIdColumn || defaultConfig.paymentIdColumn,
    dataStartRow: customConfig.dataStartRow || defaultConfig.dataStartRow,
  };
}

// ============================================
// ГОЛОВНА ЛОГІКА
// ============================================

/**
 * Обробити подію проведення оплати
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e - Об'єкт події
 * @param {Object} customConfig - Конфігурація
 */
function processApplicationPayment(e, customConfig = {}) {
  if (!e || !e.range) return;

  const config = getPaymentsConfig(DEFAULT_TARGET_CONFIG, customConfig);
  let chatId = "";

  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const col = range.getColumn();

    // Перевіряємо назву листа
    if (sheet.getName() !== config.sheetName) {
      return;
    }

    // Перевіряємо чи це стовпець "Позначка оплати"
    if (col !== config.togglePaidColumn) {
      return;
    }

    const data = sheet
      .getRange(
        range.getRow(),
        1,
        1,
        Math.max(...Object.values(config.columns), config.togglePaidColumn),
      )
      .getValues();

    if (data.length === 0) {
      return;
    }

    const isPaidChecked = e.value === "TRUE";

    if (!isPaidChecked) {
      addDebugLog(
        "processApplicationPayment",
        `Рядок ${range.getRow()}: прапорець "Оплачено" не встановлено, пропускаємо`,
      );

      return;
    }

    const amountValue = data[0][config.columns.AMOUNT - 1];

    if (!amountValue) {
      addDebugLog(
        "processApplicationPayment",
        `Рядок ${range.getRow()}: відсутня сума, пропускаємо`,
      );

      return;
    }

    const responsibleValue = data[0][config.columns.RESPONSIBLE - 1];

    if (!responsibleValue) {
      addDebugLog(
        "processApplicationPayment",
        `Рядок ${range.getRow()}: відсутній відповідальний, пропускаємо`,
      );

      return;
    }

    const user = getUserByName(responsibleValue);

    if (!user) {
      addDebugLog(
        "processApplicationPayment",
        `Користувач з ім'ям "${responsibleValue}" не знайдений`,
      );

      return;
    }

    if (!user.settings.paymentsNotifications) {
      addDebugLog(
        "processApplicationPayment",
        `Користувач ${user.fullname} вимкнув сповіщення про оплати`,
        user.chatId,
      );

      return;
    }

    chatId = user.chatId;

    const purposeArray = [];

    if (data[0][config.columns.PROJECT - 1]) {
      purposeArray.push(`Проект: ${data[0][config.columns.PROJECT - 1]}`);
    }

    if (data[0][config.columns.PURPOSE - 1]) {
      purposeArray.push(data[0][config.columns.PURPOSE - 1]);
    }

    if (purposeArray.length === 0 && data[0][config.columns.NOMENCLATURE - 1]) {
      purposeArray.push(data[0][config.columns.NOMENCLATURE - 1]);
    }

    // Формуємо дані для повідомлення
    const paymentData = {
      paymentDate: data[0][config.columns.PLAN_PAYMENT_DATE - 1],
      contractor: data[0][config.columns.CONTRACTOR - 1],
      amount: data[0][config.columns.AMOUNT - 1],
      currency: data[0][config.columns.CURRENCY - 1],
      purpose: purposeArray.join(", "),
    };

    // Відправляємо повідомлення
    const message = formatPaymentMessage("💰 Оплату здійснено!", paymentData);
    sendTelegramMessage(chatId, message);
    const /** @type {string} */ paymentId = sheet
        .getRange(range.getRow(), config.paymentIdColumn, 1, 1)
        .getValue();

    if (paymentId) {
      sheet
        .getRange(range.getRow(), config.paymentIdColumn)
        .setValue(`${NOTIFIED_ID_PREFIX}${paymentId.slice(1)}`);
    }

    addDebugLog(
      "processApplicationPayment",
      `Рядок ${range.getRow()}: повідомлення про оплату відправлено користувачу ${user.fullname}`,
      chatId,
    );
  } catch (error) {
    addErrorLog(
      "processApplicationPayment",
      `Помилка обробки: ${error.message}`,
      chatId,
    );
  }
}

/**
 * Обробити всі несплачені рядки в таблиці
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
function processUnpaidUserApplications(user, customConfig = {}) {
  try {
    const config = getPaymentsConfig(DEFAULT_TARGET_CONFIG, customConfig);

    addDebugLog(
      "processUnpaidUserApplications",
      `${user.fullname}`,
      user.chatId,
    );

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
      "PAYMENTS_SPREADSHEET_ID",
    );

    if (!spreadsheetId) {
      addErrorLog(
        "processUnpaidUserApplications",
        "PAYMENTS_SPREADSHEET_ID не налаштовано в Script Properties",
      );

      return;
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(config.sheetName);

    if (!sheet) {
      addErrorLog(
        "processUnpaidUserApplications",
        `Лист "${config.sheetName}" не знайдено`,
      );

      return;
    }

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

    const unpaidNotifications = data.reduce((acc, rowData) => {
      const rowDate = rowData[config.columns.PLAN_PAYMENT_DATE - 1];

      if (!rowDate) {
        return acc;
      }

      const isPaid = rowData[config.togglePaidColumn - 1];

      if (isPaid === true || isPaid === "TRUE") {
        return acc;
      }

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

      if (compareDates(rowDate, ">", filterDate)) {
        return acc;
      }

      const amount = rowData[config.columns.AMOUNT - 1];

      if (!amount) {
        return acc;
      }

      const purposeArray = [];

      if (rowData[config.columns.PROJECT - 1]) {
        purposeArray.push(`Проект: ${rowData[config.columns.PROJECT - 1]}`);
      }

      if (rowData[config.columns.PURPOSE - 1]) {
        purposeArray.push(rowData[config.columns.PURPOSE - 1]);
      }

      if (
        purposeArray.length === 0 &&
        rowData[config.columns.NOMENCLATURE - 1]
      ) {
        purposeArray.push(rowData[config.columns.NOMENCLATURE - 1]);
      }

      const paymentData = {
        paymentDate: rowDate,
        contractor: rowData[config.columns.CONTRACTOR - 1],
        amount: amount,
        currency: rowData[config.columns.CURRENCY - 1],
        purpose: purposeArray.join(", "),
      };

      acc.push(paymentData);

      return acc;
    }, []);

    addDebugLog(
      "processUnpaidUserApplications",
      `Знайдено ${unpaidNotifications.length} несплачених рядків для користувача ${user.fullname}`,
      user.chatId,
    );

    const message = formatPaymentsMessage(
      "⏰ Протерміновані оплати:",
      unpaidNotifications,
      "Всі оплати виконані вчасно! ✅",
    );
    sendTelegramMessage(user.chatId, message);
    addDebugLog(
      "processUnpaidUserApplications",
      `Повідомлення про несплачені рядки відправлено користувачу ${user.fullname}`,
      user.chatId,
    );
  } catch (error) {
    addErrorLog(
      "processUnpaidUserApplications",
      `Помилка обробки: ${error.message}`,
      user.chatId,
    );
  }
}

/**
 * Надіслати відповідальному заявки, які ще не підтверджені (toggleApprovedColumn != TRUE), з inline-кнопкою підтвердження
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
function processUnapprovedUserApplications(user, customConfig = {}) {
  if (!APPROVER_USERS.includes(user.fullname)) {
    return;
  }

  const config = getPaymentsConfig(DEFAULT_TARGET_CONFIG, customConfig);

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    "PAYMENTS_SPREADSHEET_ID",
  );

  if (!spreadsheetId) {
    addErrorLog(
      "processUnapprovedUserApplications",
      "PAYMENTS_SPREADSHEET_ID не налаштовано в Script Properties",
    );
    return;
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    addErrorLog(
      "processUnapprovedUserApplications",
      `Лист "${config.sheetName}" не знайдено`,
    );

    return;
  }

  try {
    const lastCol = Math.max(
      ...Object.values(config.columns),
      config.toggleApprovedColumn,
      config.togglePaidColumn,
      config.paymentIdColumn,
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

    const unapproved = data.reduce((acc, rowData) => {
      const approved = rowData[config.toggleApprovedColumn - 1];

      if (approved === true || approved === "TRUE") return acc;

      const amount = rowData[config.columns.AMOUNT - 1];

      if (!amount) return acc;

      const purposeArray = [];

      if (rowData[config.columns.PROJECT - 1]) {
        purposeArray.push(`Проект: ${rowData[config.columns.PROJECT - 1]}`);
      }

      if (rowData[config.columns.PURPOSE - 1]) {
        purposeArray.push(rowData[config.columns.PURPOSE - 1]);
      }

      if (
        purposeArray.length === 0 &&
        rowData[config.columns.NOMENCLATURE - 1]
      ) {
        purposeArray.push(rowData[config.columns.NOMENCLATURE - 1]);
      }

      const paymentData = {
        id: rowData[config.paymentIdColumn - 1]
          ? rowData[config.paymentIdColumn - 1].slice(1)
          : "",
        paymentDate: rowData[config.columns.PLAN_PAYMENT_DATE - 1],
        contractor: rowData[config.columns.CONTRACTOR - 1],
        amount: amount,
        currency: rowData[config.columns.CURRENCY - 1],
        purpose: purposeArray.join(", "),
      };

      acc.push(paymentData);

      return acc;
    }, []);

    unapproved.sort((a, b) => {
      const d1 = getMidnightTimestamp(a.paymentDate);
      const d2 = getMidnightTimestamp(b.paymentDate);
      return d1 - d2;
    });

    // Для кожної заявки надсилаємо окреме повідомлення з кнопкою
    unapproved.forEach((paymentData) => {
      const message = formatPaymentMessage(
        "⏳ Заявка очікує підтвердження:",
        paymentData,
      );

      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: "Підтвердити платіж",
              callback_data: `approve_payment:${paymentData.id}`,
            },
          ],
        ],
      };

      sendTelegramMessage(
        user.chatId,
        message,
        paymentData.id ? inlineKeyboard : undefined,
      );
    });

    addDebugLog(
      "processUnapprovedUserApplications",
      `Повідомлення про непідтверджені заявки відправлено користувачу ${user.fullname}`,
      user.chatId,
    );
  } catch (error) {
    addErrorLog(
      "processUnapprovedUserApplications",
      `Помилка обробки: ${error.message}`,
      user.chatId,
    );
  }
}

/** Підтвердити заявку на оплату
 * @param {Object} user - Користувач
 * @param {string} user.fullname - ПІБ користувача
 * @param {string} user.position - Посада користувача
 * @param {string} user.service - Служба користувача
 * @param {string} user.chatId - Telegram chat_id користувача
 * @param {Object} user.settings - Налаштування користувача
 * @param {boolean} user.settings.paymentsNotifications - Сповіщення про оплати
 * @param {boolean} user.settings.unpaidNotifications - Сповіщення про несплачені заявки
 * @param {boolean} user.settings.newTasksNotifications - Сповіщення про нові завдання
 * @param {string} paymentId - ID платежу
 * @param {Object} customConfig - Кастомна конфігурація
 * @return {boolean|undefined} Повертає true, якщо успішно підтверджено, інакше нічого
 */
function approvePayment(user, paymentId, customConfig = {}) {
  if (!APPROVER_USERS.includes(user.fullname)) {
    return;
  }

  const config = getPaymentsConfig(DEFAULT_TARGET_CONFIG, customConfig);

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    "PAYMENTS_SPREADSHEET_ID",
  );

  if (!spreadsheetId) {
    addErrorLog(
      "approvePayment",
      "PAYMENTS_SPREADSHEET_ID не налаштовано в Script Properties",
    );
    return;
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    addErrorLog("approvePayment", `Лист "${config.sheetName}" не знайдено`);

    return;
  }

  try {
    const lastCol = Math.max(
      ...Object.values(config.columns),
      config.toggleApprovedColumn,
      config.togglePaidColumn,
      config.paymentIdColumn,
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

    const paymentRowIndex = data.findIndex((rowData) => {
      const rowPaymentId = rowData[config.paymentIdColumn - 1];

      return rowPaymentId.includes(paymentId);
    });

    if (paymentRowIndex === -1) {
      addErrorLog(
        "approvePayment",
        `Заявка з ID "${paymentId}" не знайдена`,
        user.chatId,
      );

      return;
    }

    const sheetRowIndex = config.dataStartRow + paymentRowIndex;

    sheet
      .getRange(sheetRowIndex, config.toggleApprovedColumn, 1, 1)
      .setValue(true);

    return true;
  } catch (error) {
    addErrorLog(
      "approvePayment",
      `Помилка обробки: ${error.message}`,
      user.chatId,
    );
  }
}

/**
 * Розсилка повідомлень про несплачені заявки для всіх відповідальних (для тригера в Google Sheets)
 * @param {Object} customConfig - Кастомна конфігурація
 */
function notifyAllUnpaidApplications(customConfig = {}) {
  const config = getPaymentsConfig(DEFAULT_TARGET_CONFIG, customConfig);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    addErrorLog(
      "notifyAllUnpaidApplications",
      `Лист "${config.sheetName}" не знайдено`,
    );

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

    // Групуємо платежі по відповідальному
    const userPaymentsMap = {};

    data.forEach((rowData) => {
      const rowDate = rowData[config.columns.PLAN_PAYMENT_DATE - 1];

      if (!rowDate) return;

      const isPaid = rowData[config.togglePaidColumn - 1];

      if (isPaid === true || isPaid === "TRUE") return;

      if (compareDates(rowDate, ">", filterDate)) return;

      const amount = rowData[config.columns.AMOUNT - 1];

      if (!amount) return;

      const responsible = rowData[config.columns.RESPONSIBLE - 1];

      if (!responsible) return;

      const user = getUserByName(responsible);

      if (
        !user ||
        !user.chatId ||
        !user.settings ||
        user.settings.unpaidNotifications === false
      )
        return;

      const purposeArray = [];

      if (rowData[config.columns.PROJECT - 1]) {
        purposeArray.push(`Проект: ${rowData[config.columns.PROJECT - 1]}`);
      }

      if (rowData[config.columns.PURPOSE - 1]) {
        purposeArray.push(rowData[config.columns.PURPOSE - 1]);
      }

      if (
        purposeArray.length === 0 &&
        rowData[config.columns.NOMENCLATURE - 1]
      ) {
        purposeArray.push(rowData[config.columns.NOMENCLATURE - 1]);
      }

      const paymentData = {
        paymentDate: rowDate,
        contractor: rowData[config.columns.CONTRACTOR - 1],
        amount: amount,
        currency: rowData[config.columns.CURRENCY - 1],
        purpose: purposeArray.join(", "),
      };

      if (!userPaymentsMap[user.chatId]) {
        userPaymentsMap[user.chatId] = {
          user,
          payments: [],
        };
      }

      userPaymentsMap[user.chatId].payments.push(paymentData);
    });

    // Формуємо масив для розсилки
    const unpaidNotifications = Object.values(userPaymentsMap);

    unpaidNotifications.forEach(({ user, payments }) => {
      if (!payments.length) return;

      const message = formatPaymentsMessage(
        "⏰ Протерміновані оплати:",
        payments,
        "Всі оплати виконані вчасно! ✅",
      );
      sendTelegramMessage(user.chatId, message);
      addDebugLog(
        "notifyAllUnpaidApplications",
        `Повідомлення про несплачені рядки відправлено користувачу ${user.fullname}`,
        user.chatId,
      );
    });
  } catch (error) {
    addErrorLog(
      "notifyAllUnpaidApplications",
      `Помилка обробки: ${error.message}`,
    );
  }
}

const DEFAULT_DATE_CONFIG = {
  sheetName: "Реєстр",
  row: 2, // 2
  column: 3, // C2
};

/** Встановити сьогоднішню дату в комірку
 * @param {Object} dateCustomConfig - Конфігурація дати
 */
function setTodayDate(dateCustomConfig = {}) {
  const dateConfig = { ...DEFAULT_DATE_CONFIG, ...dateCustomConfig };

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(dateConfig.sheetName);

  const dateObject = new Date();
  dateObject.setHours(23, 59, 59, 999); // Встановлюємо кінець дня

  sheet.getRange(dateConfig.row, dateConfig.column, 1, 1).setValue(dateObject);
}

/** * Отримати заявки на оплату за певну дату
 * @param {Object|undefined} dateCustomConfig - Конфігурація дати
 * @param {Object|undefined} customSourceConfig - Кастомна конфігурація джерела
 * @param {Object|undefined} customTargetPaymentsConfig - Кастомна конфігурація приймача
 * @param {string|Date|undefined} date - Дата для фільтрації
 */
function getApplications(
  dateCustomConfig = {},
  customSourceConfig = {},
  customTargetPaymentsConfig = {},
  date = undefined,
) {
  const sourceConfig = getPaymentsConfig(
    DEFAULT_SOURCE_CONFIG,
    customSourceConfig,
  );
  const targetPaymentsConfig = getPaymentsConfig(
    DEFAULT_TARGET_CONFIG,
    customTargetPaymentsConfig,
  );
  const dateConfig = { ...DEFAULT_DATE_CONFIG, ...dateCustomConfig };
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = spreadsheet.getSheetByName(sourceConfig.sheetName);
  const targetSheet = spreadsheet.getSheetByName(
    targetPaymentsConfig.sheetName,
  );

  // 1. Отримуємо дату для фільтрації (обрізаємо час, залишаємо тільки дату)
  const filterDate =
    date || targetSheet.getRange(dateConfig.row, dateConfig.column).getValue();

  if (!filterDate) return;

  // 2. Визначаємо межі діапазону (min та max стовпці)
  const sourceColValues = Object.values(sourceConfig.columns);
  const minCol = Math.min(...sourceColValues);
  const maxCol = Math.max(...sourceColValues);
  const lastRow = sourceSheet.getLastRow();

  if (lastRow < sourceConfig.dataStartRow) return; // Якщо таблиця порожня

  // 3. Беремо дані тільки з потрібного діапазону стовпців
  // rangeData починається з індексу 0, який відповідає колонці minCol
  const data = sourceSheet
    .getRange(
      sourceConfig.dataStartRow,
      minCol,
      lastRow - sourceConfig.dataStartRow + 1,
      maxCol - minCol + 1,
    )
    .getValues();

  // 4. Обробка даних через reduce
  const targetLastRow = targetSheet.getLastRow();
  const targetData =
    targetLastRow >= targetPaymentsConfig.dataStartRow
      ? targetSheet
          .getRange(
            targetPaymentsConfig.dataStartRow,
            1,
            targetLastRow - targetPaymentsConfig.dataStartRow + 1,
            Math.max(
              ...Object.values(targetPaymentsConfig.columns),
              targetPaymentsConfig.togglePaidColumn,
              targetPaymentsConfig.toggleApprovedColumn,
              targetPaymentsConfig.paymentIdColumn,
            ),
          )
          .getValues()
      : [];

  const resultData = data.reduce((acc, row) => {
    // Вираховуємо індекс дати в обрізаному масиві
    // (Індекс у конфігу) - (Зсув мінімальної колонки) - 1 (бо масив з 0)
    const dateColIndex = sourceConfig.columns.PLAN_PAYMENT_DATE - minCol;
    const rowDate = row[dateColIndex];

    if (!rowDate) return acc;

    const amountColIndex = sourceConfig.columns.AMOUNT - minCol;
    const rowAmount = row[amountColIndex];

    if (!rowAmount || isNaN(Number(rowAmount)) || Number(rowAmount) <= 0)
      return acc;

    if (!compareDates(rowDate, "===", filterDate)) return acc;

    const existedRow = targetData.find((targetRow) => {
      if (
        !compareDates(
          targetRow[targetPaymentsConfig.columns.PLAN_PAYMENT_DATE - 1],
          "===",
          rowDate,
        )
      ) {
        return false;
      }

      const isSame = Object.keys(targetPaymentsConfig.columns).every((key) => {
        if (key === "PLAN_PAYMENT_DATE") {
          return true; // Дату ми вже порівняли вище
        }

        const targetColIndex = targetPaymentsConfig.columns[key] - 1;
        const sourceColIndex = sourceConfig.columns[key] - minCol;

        return targetRow[targetColIndex] === row[sourceColIndex];
      });

      return isSame;
    });

    if (existedRow) {
      acc.push(existedRow);

      return acc;
    }

    const newRow = new Array(
      Math.max(
        ...Object.values(targetPaymentsConfig.columns),
        targetPaymentsConfig.togglePaidColumn,
        targetPaymentsConfig.toggleApprovedColumn,
        targetPaymentsConfig.paymentIdColumn,
      ),
    ).fill("");

    newRow[targetPaymentsConfig.toggleApprovedColumn - 1] = false;
    newRow[targetPaymentsConfig.togglePaidColumn - 1] = false;
    newRow[targetPaymentsConfig.paymentIdColumn - 1] =
      generateId(UNOTIFIED_ID_PREFIX);

    // Пробігаємось по ключах (ORGANIZATION, AMOUNT і т.д.)
    Object.keys(targetPaymentsConfig.columns).forEach((key) => {
      // Логіка: індекс з конфігу мінус minCol (щоб попасти в обрізаний масив)
      if (sourceConfig.columns[key]) {
        newRow[targetPaymentsConfig.columns[key] - 1] =
          row[sourceConfig.columns[key] - minCol];
      }
    });

    acc.push(newRow);

    return acc;
  }, []);

  // 5. Видалення старих даних з Target Sheet Data
  const filteredTargetData = targetData.filter((row) => {
    return (
      row[targetPaymentsConfig.columns.PLAN_PAYMENT_DATE - 1] &&
      !compareDates(
        row[targetPaymentsConfig.columns.PLAN_PAYMENT_DATE - 1],
        "===",
        filterDate,
      )
    );
  });

  // 6. Вставка даних у Target Sheet Data
  if (resultData.length > 0) {
    // Шукаємо перший рядок, де дата < filterDate
    const firstLessIdx = filteredTargetData.findIndex((row) =>
      compareDates(
        row[targetPaymentsConfig.columns.PLAN_PAYMENT_DATE - 1],
        "<",
        filterDate,
      ),
    );

    if (firstLessIdx !== -1) {
      // Вставляємо перед першим меншим
      filteredTargetData.splice(firstLessIdx, 0, ...resultData);
    } else {
      // Якщо менших немає, шукаємо більшу дату з кінця
      let lastGreaterIdx = -1;
      for (let i = filteredTargetData.length - 1; i >= 0; i--) {
        if (
          compareDates(
            filteredTargetData[i][
              targetPaymentsConfig.columns.PLAN_PAYMENT_DATE - 1
            ],
            ">",
            filterDate,
          )
        ) {
          lastGreaterIdx = i;
          break;
        }
      }
      if (lastGreaterIdx !== -1) {
        // Вставляємо після останньої більшої
        filteredTargetData.splice(lastGreaterIdx + 1, 0, ...resultData);
      } else {
        // Якщо і більших немає — вставляємо на початок
        filteredTargetData.unshift(...resultData);
      }
    }
  }

  // 7. Вставка даних у Target Sheet
  if (targetLastRow >= targetPaymentsConfig.dataStartRow) {
    targetSheet.deleteRows(
      targetPaymentsConfig.dataStartRow,
      targetLastRow - targetPaymentsConfig.dataStartRow + 1,
    );
  }

  if (filteredTargetData.length > 0) {
    // Вставляємо порожні РЯДКИ (rows), щоб звільнити місце
    targetSheet.insertRowsAfter(
      targetPaymentsConfig.dataStartRow - 1,
      filteredTargetData.length,
    );

    // Записуємо дані у новостворений діапазон
    targetSheet
      .getRange(
        targetPaymentsConfig.dataStartRow,
        1,
        filteredTargetData.length,
        filteredTargetData[0].length,
      )
      .setValues(filteredTargetData);
  }
}
