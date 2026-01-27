/**
 * Повертає номер останнього непорожнього рядка у вказаному стовпці.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Аркуш Google Sheets.
 * @param {number} col - Номер стовпця (починаючи з 1).
 * @returns {number} Номер останнього непорожнього рядка або 0, якщо всі порожні.
 */

function getLastNonEmptyRowInColumn(sheet, col) {
  const lastRow = sheet.getLastRow();

  if (lastRow === 0) return 0;

  const values = sheet.getRange(1, col, lastRow).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== "" && values[i][0] !== null) {
      return i + 1;
    }
  }

  return 0;
}

/**
 * Форматує дату у форматі "дд.мм.рррр"
 * @param {Date|string|null} date - Дата або рядок дати
 * @returns {string} Відформатована дата або "Не вказано"
 */
function formatDateUa(date) {
  if (!date) return "Не вказано";

  if (typeof date === "string") {
    const cleanDate = date.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");

    try {
      const d = new Date(cleanDate);

      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("uk-UA");
      }
    } catch (e) {
      console.log("Date parse error:", e, cleanDate);
    }

    return date;
  }

  if ("toLocaleDateString" in date) {
    return date.toLocaleDateString("uk-UA");
  }

  return date;
}

/**
 * Функція для генерації ідентифікатора
 */
function generateId(prefix = "", suffix = "") {
  return `${prefix}${Utilities.getUuid()}${suffix}`;
}

/**
 * Порівнює дві дати з урахуванням оператора.
 * Ігнорує час (порівнює лише календарні дні).
 * @param {Date|Object|string} date1 - Перша дата (з таблиці або скрипта)
 * @param {string} operator - Оператор: '=', '>', '<', '>=', '<='
 * @param {Date|Object|string} date2 - Друга дата (ліміт)
 * @returns {boolean} Результат порівняння
 */
function compareDates(date1, operator, date2) {
  // 1. Нормалізуємо дати до Timestamp (число мілісекунд опівночі)
  const t1 = getMidnightTimestamp(date1);
  const t2 = getMidnightTimestamp(date2);

  // Якщо хоча б одну дату не вдалося розпізнати — повертаємо false
  if (t1 === null || t2 === null) {
    console.error("Некоректна дата для порівняння:", date1, date2);
    return false;
  }

  // 2. Виконуємо порівняння чисел
  switch (operator) {
    case ">":
      return t1 > t2;
    case "<":
      return t1 < t2;
    case ">=":
      return t1 >= t2;
    case "<=":
      return t1 <= t2;
    case "=":
    case "==":
    case "===":
      return t1 === t2;
    default:
      return false;
  }
}

/**
 * Допоміжна функція: перетворює будь-що на Timestamp (00:00:00)
 * @param {Date|Object|string} input - Вхідні дані (дата, об'єкт з getTime(), рядок)
 * @returns {number|null} Timestamp опівночі або null, якщо невалідна дата
 */
function getMidnightTimestamp(input) {
  if (!input) return null;

  let dateObj = null;

  // ВАРІАНТ 1: Це об'єкт (Date або GAS-обгортка), що має метод getTime()
  // Duck typing: якщо у об'єкта є getTime — вважаємо його датою
  if (typeof input.getTime === "function") {
    // Створюємо копію через new Date(), щоб працювати зі стандартним JS
    dateObj = new Date(input.getTime());
  }

  // ВАРІАНТ 2: Це рядок
  else if (typeof input === "string") {
    const cleanInput = input.trim();

    // Спроба 1: Європейський формат "DD.MM.YYYY" (найчастіший у таблицях)
    if (cleanInput.includes(".")) {
      const parts = cleanInput.split("."); // [27, 01, 2026]
      if (parts.length === 3) {
        // new Date(рік, місяць (0-11), день)
        dateObj = new Date(
          Number(parts[2]),
          Number(parts[1]) - 1,
          Number(parts[0]),
        );
      }
    }

    // Спроба 2: Стандартний ISO "YYYY-MM-DD" або слэші
    if (!dateObj || isNaN(dateObj.getTime())) {
      dateObj = new Date(cleanInput);
    }
  }

  // Якщо після всіх спроб дата невалідна
  if (!dateObj || isNaN(dateObj.getTime())) return null;

  // СКИДАЄМО ЧАС
  dateObj.setHours(0, 0, 0, 0);

  return dateObj.getTime();
}
