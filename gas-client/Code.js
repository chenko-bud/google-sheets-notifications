/// <reference types="@types/google-apps-script" />
/**
 * Клієнтський скрипт для таблиці
 * Цей код копіюється в кожну таблицю
 *
 * НАЛАШТУВАННЯ:
 * 1. Замініть 'YOUR_LIBRARY_ID' на ID вашої бібліотеки
 * 2. Налаштуйте CONFIG під свою таблицю (за потреби)
 * 3. Запустіть setupTrigger() один раз
 */

// Декларація бібліотеки (підключається в GAS)
// @ts-ignore - NotificationBotLibrary доступний після підключення бібліотеки в GAS
/** @type {{ processEdit: Function, processAllUnpaid: Function, testNotification: Function, getChatIdByUsername: Function, getRegisteredUsers: Function }} */
var NotificationBotLibrary;

// ============================================
// КОНФІГУРАЦІЯ ТАБЛИЦІ
// ============================================

/**
 * Конфігурація для цієї конкретної таблиці
 * Можна перевизначити будь-які стовпці, якщо вони відрізняються від дефолтних
 */
const TABLE_CONFIG = {
  // Назва листа (null = будь-який лист)
  sheetName: "Заявка",

  // Перевизначення стовпців (якщо відрізняються від дефолтних)
  // Індекси з 1: A=1, B=2, C=3, ...
  columns: {
    // PLAN_PAYMENT_DATE: 1,    // A - Планова дата оплати
    // CONTRACTOR: 3,           // C - Контрагент
    // AMOUNT: 9,               // I - Сумма
    // CURRENCY: 10,            // J - Валюта
    // PURPOSE: 13,             // M - Призначення
    // CONTACT_USERNAME: 21,    // U - Контакти
    // ACTUAL_PAYMENT_DATE: 22, // V - Дата фактичної оплати
    // NOTIFIED: 23,            // W - Повідомлено
  },

  // Кастомний формат повідомлення про оплату(опціонально)
  // formatPaymentMessage: function(data) {
  //   return `Оплата: ${data.contractor} - ${data.amount} ${data.currency}`;
  // }

  // Кастомний формат повідомлення про всі несплачені рядки (опціонально)
  // formatUnpaidMessage: function(unpaidRows) {
  //   let message = "Несплачені рядки:\n";
  //   unpaidRows.forEach(row => {
  //     message += `- ${row.contractor}: ${row.amount} ${row.currency}\n`;
  //   });
  //   return message;
  // }
};

// ============================================
// ОБРОБНИКИ ПОДІЙ
// ============================================

/**
 * Обробник події редагування
 * Викликається тригером при зміні комірки
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onEditHandler(e) {
  console.log(NotificationBotLibrary.processEdit(e, TABLE_CONFIG, true));
}

/**
 * Щоденний тригер для повідомлення про всі несплачені рядки
 */
function dailyTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  console.log(
    NotificationBotLibrary.processAllUnpaid(spreadsheet, TABLE_CONFIG, true),
  );
}

/**
 * Встановити тригер
 * Запустіть цю функцію ОДИН раз після підключення бібліотеки
 */
function setupTriggers() {
  // Видаляємо існуючі тригери
  deleteAllTriggers();

  // Створюємо новий тригер
  ScriptApp.newTrigger("onEditHandler")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  ScriptApp.newTrigger("dailyTrigger")
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .inTimezone("Europe/Kiev")
    .create();

  console.log("✅ Тригер успішно встановлено!");
}

/**
 * Видалити всі тригери
 */
function deleteAllTriggers() {
  // Видаляємо існуючі тригери
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    if (
      trigger.getHandlerFunction() === "onEditHandler" ||
      trigger.getHandlerFunction() === "dailyTrigger"
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  console.log("✅ Всі тригери успішно видалено!");
}

/**
 * Тестова функція
 * Замініть username на свій для тестування
 */
function testNotification() {
  NotificationBotLibrary.testNotification();
}
