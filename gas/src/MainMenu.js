/// <reference types="@types/google-apps-script" />

// ============================================
// Головне меню боту
// ============================================


const MAIN_KEYBOARD_BUTTON = {
  myProcessingTasks: "⏳ Мої завдання в роботі",
  myUnpaidApplications: "💳 Мої неоплачені заявки",
  applicationsToApprove: "✅ Заявки на затвердження",
  settings: "⚙️ Налаштування",
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
 */
function sendMainMenu(user) {
  const keyboard = {
    keyboard: [
      [
        MAIN_KEYBOARD_BUTTON.myProcessingTasks,
        MAIN_KEYBOARD_BUTTON.myUnpaidApplications,
      ],
      [MAIN_KEYBOARD_BUTTON.settings],
    ],
    resize_keyboard: true, // Щоб кнопки були компактними, а не на пів екрана
    one_time_keyboard: false, // Щоб меню не зникало після натискання
  };

  if (APPROVER_USERS.includes(user.fullname)) {
    keyboard.keyboard[1].unshift(MAIN_KEYBOARD_BUTTON.applicationsToApprove);
  }

  sendTelegramMessage(
    user.chatId,
    "Головне меню: оберіть потрібний розділ 👇",
    keyboard,
  );
}
