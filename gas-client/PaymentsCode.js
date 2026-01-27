/// <reference types="@types/google-apps-script" />
/**
 * Клієнтський скрипт для таблиці
 *
 * НАЛАШТУВАННЯ:
 * 1. Підключіть бібліотеку NotificationsLibrary (Script ID в .env файлі)
 * 2. Налаштуйте CONFIG під свою таблицю (за потреби)
 * 3. Запустіть setupTrigger() один раз
 */

// Декларація бібліотеки (підключається в GAS)
// @ts-ignore - NotificationsLibrary доступний після підключення бібліотеки в GAS
/** @type {{ processApplicationPayment: Function, notifyAllUnpaidApplications: Function, getApplications: Function, setTodayDate: Function, testNotification: Function, processTaskAdd: Function, setIdsToExistingTasks: Function }} */
var NotificationsLibrary;

// ============================================
// ОБРОБНИКИ ПОДІЙ
// ============================================

/**
 * Обробник події редагування
 * Викликається тригером при зміні комірки
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onEditHandler(e) {
  NotificationsLibrary.processApplicationPayment(e);
}

/**
 * Щоденний тригер для повідомлення про всі несплачені рядки
 */
function dailyUnpaidNotificationsTrigger() {
  NotificationsLibrary.notifyAllUnpaidApplications();
}

/** Щоденний тригер для отримання заявок
 */
function dailyGetApplicationsTrigger() {
  NotificationsLibrary.getApplications({}, {}, {}, new Date());
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

  ScriptApp.newTrigger("dailyUnpaidNotificationsTrigger")
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .inTimezone("Europe/Kiev")
    .create();

  ScriptApp.newTrigger("dailyGetApplicationsTrigger")
    .timeBased()
    .everyDays(1)
    .atHour(7)
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
      trigger.getHandlerFunction() === "dailyUnpaidNotificationsTrigger" ||
      trigger.getHandlerFunction() === "dailyGetApplicationsTrigger"
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  console.log("✅ Всі тригери успішно видалено!");
}

/**
 * Тестова функція
 */
function testNotification() {
  NotificationsLibrary.testNotification();
}

// ============================================
// ФУНКЦІЇ ДЛЯ РОБОТИ З ТАБЛИЦЕЮ
// ============================================
const DATE_CUSTOM_CONFIG = {
  sheetName: "Реєстр",
  row: 2,
  column: 3,
};

/** Встановити сьогоднішню дату в певну комірку
 */
function setTodayDate() {
  NotificationsLibrary.setTodayDate(DATE_CUSTOM_CONFIG);
}

/** Отримати список заявок */
function getApplications() {
  return NotificationsLibrary.getApplications(DATE_CUSTOM_CONFIG);
}
