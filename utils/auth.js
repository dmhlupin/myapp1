// utils/auth.js
const bcrypt = require('bcryptjs');

/**
 * Хеширование пароля
 * @param {string} password - пароль в открытом виде
 * @returns {Promise<string>} - хеш пароля
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Проверка пароля
 * @param {string} password - пароль в открытом виде
 * @param {string} hash - хеш пароля из БД
 * @returns {Promise<boolean>} - true если пароли совпадают
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

/**
 * Генерация временного пароля
 * Использует безопасные символы, которые легко прочитать/ввести
 * @param {number} length - длина пароля (по умолчанию 10)
 * @returns {string} - сгенерированный пароль
 */
function generateTempPassword(length = 10) {
  // Исключаем похожие символы: 0/O, 1/l/I, 5/S, 8/B
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%&*';
  
  let password = '';
  const crypto = require('crypto');
  
  for (let i = 0; i < length - 2; i++) {
    password += chars[crypto.randomInt(0, chars.length)];
  }
  
  // Добавляем 2 спецсимвола в случайные позиции
  for (let i = 0; i < 2; i++) {
    const pos = crypto.randomInt(0, password.length + 1);
    password = password.slice(0, pos) + symbols[crypto.randomInt(0, symbols.length)] + password.slice(pos);
  }
  
  return password;
}

/**
 * Валидация пароля
 * @param {string} password - пароль для проверки
 * @returns {{ valid: boolean, errors: string[] }} - результат валидации
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну заглавную букву');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну строчную букву');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну цифру');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Валидация логина
 * @param {string} username - логин для проверки
 * @returns {{ valid: boolean, errors: string[] }} - результат валидации
 */
function validateUsername(username) {
  const errors = [];
  
  if (!username || username.length < 3) {
    errors.push('Логин должен содержать минимум 3 символа');
  }
  if (username && username.length > 30) {
    errors.push('Логин не должен превышать 30 символов');
  }
  if (username && !/^[a-zA-Z0-9_.-]+$/.test(username)) {
    errors.push('Логин может содержать только латинские буквы, цифры, точку, дефис и подчёркивание');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Валидация email
 * @param {string} email - email для проверки
 * @returns {{ valid: boolean, errors: string[] }} - результат валидации
 */
function validateEmail(email) {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    errors.push('Email обязателен');
  } else if (!emailRegex.test(email)) {
    errors.push('Некорректный формат email');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateTempPassword,
  validatePassword,
  validateUsername,
  validateEmail
};