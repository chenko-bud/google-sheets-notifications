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
  NotificationsLibrary.processTaskAdd(e);
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

  console.log("✅ Тригер успішно встановлено!");
}

/**
 * Видалити всі тригери
 */
function deleteAllTriggers() {
  // Видаляємо існуючі тригери
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() === "onEditHandler") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  console.log("✅ Всі тригери успішно видалено!");
}

/** Встановити ID для існуючих завдань */
function setIdsToExistingTasks() {
  return NotificationsLibrary.setIdsToExistingTasks();
}

/**
 * Тестова функція
 */
function testNotification() {
  NotificationsLibrary.testNotification();
}
