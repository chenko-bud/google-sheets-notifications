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
  dataStartRow: 7, // Дані починаються з 7-го рядка
};

/** Отримати конфігурацію з урахуванням кастомної
 * @param {Object} defaultConfig - Дефолтна конфігурація
 * @param {Object} customConfig - Кастомна конфігурація
 * @returns {Object} Об'єднана конфігурація
 */
function getConfig(defaultConfig, customConfig = {}) {
  return {
    sheetName: customConfig.sheetName || defaultConfig.sheetName,
    columns: { ...defaultConfig.columns, ...(customConfig.columns || {}) },
    toggleApprovedColumn:
      customConfig.toggleApprovedColumn || defaultConfig.toggleApprovedColumn,
    togglePaidColumn:
      customConfig.togglePaidColumn || defaultConfig.togglePaidColumn,
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

  const config = getConfig(DEFAULT_TARGET_CONFIG, customConfig);
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
 * @param {string|Date} user.fullname - ПІБ користувача
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
  const config = getConfig(DEFAULT_TARGET_CONFIG, customConfig);

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    "PAYMENTS_SPREADSHEET_ID",
  );

  if (!spreadsheetId) {
    addErrorLog(
      "processAllUnpaidApplications",
      "PAYMENTS_SPREADSHEET_ID не налаштовано в Script Properties",
    );

    return;
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    addErrorLog(
      "processAllUnpaidApplications",
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

    const unpaidNotifications = data.reduce((acc, rowData, index) => {
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
  dateObject.setHours(0, 0, 0, 0);

  sheet.getRange(dateConfig.row, dateConfig.column, 1, 1).setValue(dateObject);
}

/** * Отримати заявки на оплату за певну дату
 * @param {Object} dateCustomConfig - Конфігурація дати
 * @param {Object} customSourceConfig - Кастомна конфігурація джерела
 * @param {Object} customTargetConfig - Кастомна конфігурація приймача
 */
function getApplications(
  dateCustomConfig = {},
  customSourceConfig = {},
  customTargetConfig = {},
) {
  const sourceConfig = getConfig(DEFAULT_SOURCE_CONFIG, customSourceConfig);
  const targetConfig = getConfig(DEFAULT_TARGET_CONFIG, customTargetConfig);
  const dateConfig = { ...DEFAULT_DATE_CONFIG, ...dateCustomConfig };
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = spreadsheet.getSheetByName(sourceConfig.sheetName);
  const targetSheet = spreadsheet.getSheetByName(targetConfig.sheetName);

  // 1. Отримуємо дату для фільтрації (обрізаємо час, залишаємо тільки дату)
  const rawDate = targetSheet
    .getRange(dateConfig.row, dateConfig.column)
    .getValue();

  if (!rawDate) return;

  const filterDate = new Date();

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

    const newRow = new Array(
      Math.max(...Object.values(targetConfig.columns)),
    ).fill("");

    // Пробігаємось по ключах (ORGANIZATION, AMOUNT і т.д.)
    Object.keys(targetConfig.columns).forEach((key) => {
      // Логіка: індекс з конфігу мінус minCol (щоб попасти в обрізаний масив)
      if (sourceConfig.columns[key]) {
        newRow[targetConfig.columns[key] - 1] =
          row[sourceConfig.columns[key] - minCol];
      }
    });

    acc.push(newRow);

    return acc;
  }, []);

  // 5. Вставка даних у Target Sheet
  if (resultData.length > 0) {
    // Вставляємо порожні РЯДКИ (rows), щоб звільнити місце
    targetSheet.insertRowsBefore(targetConfig.dataStartRow, resultData.length);

    // Записуємо дані у новостворений діапазон
    targetSheet
      .getRange(
        targetConfig.dataStartRow,
        1,
        resultData.length,
        resultData[0].length,
      )
      .setValues(resultData);
  }
}
