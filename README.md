# 📦 MoveIT service

**Веб-приложение для учёта ТМЦ с авторизацией, ролями, справочником и статистикой**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-5.1-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.9.0-blue.svg)](CHANGELOG.md)

---

## 📖 О проекте

**MoveIT service** — полнофункциональное веб-приложение для управления материально-техническими ресурсами (ТМЦ) организации. Включает иерархический справочник категорий и типов, интеграцию справочника во все формы, фильтрацию и статистику.

### 🎯 Для кого

- **Малый и средний бизнес** — учёт ноутбуков, телефонов, офисной техники
- **IT-отделы** — управление парком устройств сотрудников
- **Отделы снабжения** — контроль выдачи и возврата ТМЦ
- **Образовательные учреждения** — учёт оборудования

---

## ✨ Возможности

### 🔐 Аутентификация и авторизация
- Вход по логину и паролю
- Хеширование паролей (bcryptjs, 10 раундов)
- Сессии в SQLite (24 часа)
- Обязательная смена пароля при первом входе
- Блокировка пользователей без удаления
- Автогенерация временных паролей
- Синхронизация сессии с БД на каждом запросе
- Роли: 👑 администратор и 👤 пользователь

### 📊 Дашборд (для админов)
- 6 карточек ключевой статистики
- SVG-график активности за 14 дней
- **📚 Техника по категориям** — с цветными полосами и процентами
- **🏷️ Техника без категории** — список для исправления
- Последние 10 действий пользователей
- Раздел "Требует внимания":
  - 🔧 Техника в ремонте
  - ⏰ Истекающая гарантия (< 30 дней)
  - 📋 Просроченная гарантия
  - 📦 Техника без владельца > 6 месяцев
- Топ-5 активных пользователей за 30 дней
- Быстрые действия

### 📚 Справочник техники
- **Категории и типы** (иерархия 2 уровней)
- 8 предустановленных категорий
- 35 предустановленных типов
- CRUD через удобный интерфейс
- **Интеграция в формы техники**:
  - Селекты "Категория → Тип"
  - Динамическая загрузка
  - Предзаполнение при редактировании
  - Автосброс типа при смене категории
- **Фильтрация техники** в справочнике
- **Поиск** по 6 полям (номер, название, модель, S/N, ФИО, логин)
- Счётчики техники по категориям

### 🔧 Учёт техники
- Полный CRUD
- **Категория и тип** (обязательные)
- Инвентарные номера, модели, S/N
- Даты покупки и гарантии
- 4 статуса: `available`, `assigned`, `maintenance`, `retired`
- Карточка техники с историей использования
- Авто-возврат при переназначении

### 🔍 Фильтры и поиск (страница /equipment)
- **Фильтр по категории** — динамический
- **Фильтр по типу** — обновляется при смене категории
- **Фильтр по статусу**
- Кнопка "Сбросить"
- Пустое состояние

### 👤 Личный кабинет
- Просмотр и редактирование профиля
- Своя активная техника
- Полная история получений
- Смена пароля
- Персональная статистика

### 👥 Управление пользователями
- Создание с автогенерацией пароля
- Показ временного пароля **один раз**
- Сброс пароля
- Блокировка / разблокировка
- Удаление с авто-возвратом техники
- Защита: нельзя удалить себя или последнего админа
- Карточка пользователя со всей его техникой

### 📈 Логирование
- Все действия записываются в БД
- 22+ типа действий (включая категории/типы)
- Фильтры: по пользователю, действию, дате
- Поиск по логам
- Статистика за 30 дней
- Пагинация

### 📑 Дополнительно
- PDF-инструкции (демо)
- Модальное окно помощи (FAQ)
- Адаптивный дизайн
- Русскоязычный интерфейс
- Скрипты seed и migrate

---

## 🛠 Технологии

### Backend
| Технология | Версия | Назначение |
|-----------|--------|-----------|
| **Node.js** | 18+ | Runtime |
| **Express.js** | 4.18 | Веб-фреймворк |
| **SQLite3** | 5.1 | База данных |
| **express-session** | 1.17 | Сессии |
| **connect-sqlite3** | 0.9 | Хранилище сессий |
| **bcryptjs** | 2.4 | Хеширование паролей |

### Frontend
- **HTML5** — семантическая разметка
- **CSS3** — Flexbox, Grid, адаптивность
- **Vanilla JavaScript** — ES6+, без фреймворков
- **SVG** — диаграммы без библиотек

### Инфраструктура
- **Docker** — контейнеризация
- **Git** — контроль версий

---

## 🚀 Быстрый старт

### Требования
- **Node.js** 18 или выше
- **npm** 9 или выше

### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/dmhlupin/myapp1.git
cd myapp1

# 2. Установить зависимости
npm install

# 3. Настроить БД и заполнить тестовыми данными
npm run setup
```

### Запуск

```bash
npm run dev    # режим разработки
npm start      # production
```

Приложение откроется на **http://localhost:3000**

### Учётные записи по умолчанию

| Роль | Логин | Пароль |
|------|-------|--------|
| 👑 Администратор | `admin` | `Admin123!` |
| 👑 Администратор | `manager` | `Admin123!` |
| 👤 Пользователь | `ivanov` | `ChangeMe123!` |
| 👤 Пользователь | `petrova` | `ChangeMe123!` |
| 👤 Пользователь | `sidorov` | `ChangeMe123!` |
| 👤 Пользователь | `smirnova` | `ChangeMe123!` |

> ⚠️ **При первом входе система попросит сменить пароль!**

### Полезные команды

```bash
npm start                 # Запустить сервер
npm run dev               # Режим разработки
npm run migrate           # Создать структуру БД
npm run seed              # Заполнить тестовыми данными
npm run seed -- --force   # Перезаписать данные
npm run setup             # Установка + миграция + seed
npm run reset             # migrate + seed --force
npm run check-db          # Проверить структуру БД
npm run check-catalog     # Проверить справочник
npm run create-admin      # Создать администратора
npm run reset-admin       # Сбросить пароль админа
```

---

## 🎭 Роли и права

### 👤 Пользователь (role: user)

| Возможность | Доступ |
|-------------|--------|
| Личный кабинет /profile | ✅ |
| Своя техника и история | ✅ |
| Редактирование профиля | ✅ |
| Смена пароля | ✅ |
| Просмотр техники /equipment | ✅ |
| **Фильтры на /equipment** | ✅ |
| Просмотр пользователей | ✅ |
| PDF-инструкции | ✅ |
| Дашборд / | ❌ |
| Админ-панель /admin | ❌ |
| Справочник /admin/catalog | ❌ |
| Управление техникой | ❌ |
| Управление пользователями | ❌ |
| Просмотр логов | ❌ |

### 👑 Администратор (role: admin)

| Возможность | Доступ |
|-------------|--------|
| Всё, что доступно пользователю | ✅ |
| Дашборд / | ✅ |
| Админ-панель /admin | ✅ |
| **Справочник /admin/catalog** | ✅ |
| Управление техникой (CRUD) | ✅ |
| **Управление категориями и типами** | ✅ |
| Управление пользователями (CRUD) | ✅ |
| Назначение и возврат техники | ✅ |
| Сброс паролей | ✅ |
| Блокировка пользователей | ✅ |
| Просмотр логов | ✅ |

### 🚫 Ограничения
- ❌ Нельзя заблокировать или удалить себя
- ❌ Нельзя заблокировать или удалить последнего админа
- ❌ Нельзя удалить технику со статусом assigned
- ❌ Нельзя удалить категорию с типами
- ❌ Нельзя удалить тип с привязанной техникой
- ❌ Заблокированный пользователь не может войти
- ❌ Устаревшие сессии автоматически уничтожаются

---

## 🔌 API

### 🔐 Аутентификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/auth/login | Вход |
| POST | /api/auth/logout | Выход |
| POST | /api/auth/change-password | Смена пароля |
| GET | /api/auth/me | Текущий пользователь |
| GET | /api/version | Версия приложения |

### 👤 Профиль

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/profile/update | Обновление профиля |

### 🔧 Техника (только админ)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | /api/admin/equipment | Список техники |
| GET | /api/admin/equipment/:id | Техника по ID |
| GET | /api/admin/equipment/:id/details | Детали + история |
| GET | /api/admin/equipment/filtered | Фильтр + пагинация |
| GET | /api/admin/equipment/counts | Счётчики |
| POST | /api/admin/equipment | Создать |
| PUT | /api/admin/equipment/:id | Обновить |
| DELETE | /api/admin/equipment/:id | Удалить |

### 📚 Справочник (только админ)

**Категории:**

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | /api/admin/categories | Все категории |
| GET | /api/admin/categories/:id | По ID |
| POST | /api/admin/categories | Создать |
| PUT | /api/admin/categories/:id | Обновить |
| DELETE | /api/admin/categories/:id | Удалить |
| POST | /api/admin/categories/reorder | Порядок |

**Типы:**

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | /api/admin/types | Все типы (?category_id=X) |
| GET | /api/admin/types/:id | По ID |
| POST | /api/admin/types | Создать |
| PUT | /api/admin/types/:id | Обновить |
| DELETE | /api/admin/types/:id | Удалить |
| POST | /api/admin/types/reorder | Порядок |

### 👥 Пользователи (только админ)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | /api/admin/users | Все пользователи |
| GET | /api/admin/users/:id | По ID |
| GET | /api/admin/users/:id/details | Детали + техника |
| POST | /api/admin/users | Создать |
| PUT | /api/admin/users/:id | Обновить |
| DELETE | /api/admin/users/:id | Удалить |
| POST | /api/admin/users/:id/reset-password | Сброс пароля |
| POST | /api/admin/users/:id/block | Заблокировать |
| POST | /api/admin/users/:id/unblock | Разблокировать |

### 📊 Логи (только админ)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | /api/admin/logs | Список логов |
| GET | /api/admin/logs/stats | Статистика |
| POST | /api/admin/logs/clean | Очистка старых |

---

## 📁 Структура проекта

```
myapp1/
│
├── data/                          # База данных (не в Git)
│   ├── database.db
│   └── sessions.db
│
├── database/
│   ├── db.js                      # Точка входа (~110 строк)
│   └── modules/                   # Модули БД
│       ├── users.js               # CRUD пользователей
│       ├── equipment.js           # Техника + назначения + фильтры
│       ├── catalog.js             # Категории и типы
│       ├── auth.js                # Пароли, роли, сессии
│       ├── profile.js             # Личный кабинет
│       ├── logs.js                # Логи активности
│       ├── dashboard.js           # Дашборд + статистика
│       ├── stats.js               # Общая статистика
│       └── meta.js                # app_meta
│
├── middleware/
│   └── auth.js                    # requireAuth, requireAdmin, syncSession
│
├── utils/
│   ├── auth.js                    # Хеширование, пароли
│   └── logger.js                  # Логирование
│
├── routes/
│   ├── admin.js                   # Админ-панель + API
│   ├── auth.js                    # Вход, выход, смена пароля
│   ├── catalog.js                 # Справочник
│   ├── dashboard.js               # Дашборд
│   ├── equipment.js               # Просмотр + фильтры
│   ├── pdf.js                     # PDF-инструкции
│   ├── profile.js                 # Личный кабинет
│   └── users.js                   # Список пользователей
│
├── scripts/
│   ├── migrate.js                 # Миграция БД
│   ├── seed.js                    # Тестовые данные
│   ├── check-db.js                # Проверка структуры
│   ├── check-catalog.js           # Проверка справочника
│   ├── create-admin.js            # Создание админа
│   ├── reset-admin-password.js    # Сброс пароля
│   └── fix-double-assignments.js  # Исправление дублей
│
├── public/
│   ├── css/
│   │   ├── style.css              # Общие стили
│   │   ├── auth.css               # Вход, смена пароля
│   │   ├── dashboard.css          # Дашборд + статистика
│   │   ├── profile.css            # Личный кабинет
│   │   ├── admin.css              # Админ-панель
│   │   ├── catalog.css            # Справочник
│   │   ├── equipment.css          # Страница /equipment
│   │   ├── logs.css               # Логи
│   │   └── help.css               # Футер, помощь
│   └── js/
│       ├── main.js
│       ├── login.js
│       ├── change-password.js
│       ├── dashboard.js
│       ├── profile.js
│       ├── admin.js
│       ├── admin-add.js
│       ├── admin-edit.js
│       ├── catalog.js             # Логика справочника
│       ├── equipment-filter.js    # Фильтры /equipment
│       ├── logs.js
│       ├── help.js
│       └── footer.js
│
├── views/
│   ├── login.html
│   ├── change-password.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── equipment.html
│   ├── users.html
│   ├── pdf.html
│   ├── admin.html
│   ├── admin-catalog.html
│   ├── admin-logs.html
│   ├── admin-add.html
│   ├── admin-edit.html
│   ├── admin-user-add.html
│   └── admin-user-edit.html
│
├── .env
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── server.js
├── README.md
└── CHANGELOG.md
```

---

## 📝 История версий

### [1.9.0] - 2026-09-22 — Текущая

**Интеграция справочника + статистика**
- Формы техники с категориями и типами
- Фильтры на /equipment
- Статистика по категориям на дашборде
- Отображение категорий/типов в списках

### [1.8.0] - 2026-09-22

**Справочник техники**
- CRUD категорий и типов
- Таблица техники в справочнике
- Поиск по 6 полям
- Пагинация

### [1.7.1] - 2026-09-22

**Рефакторинг database/db.js**
- Разбит на 9 модулей (~110 строк вместо 1500+)

### [1.7.0] - 2026-09-22

**Справочник — этап 1 (БД)**
- Таблицы equipment_categories, equipment_types

### [1.6.0] - 2026-09-21

**Seed + централизация версии + безопасность**

### [1.5.0] - 2026-09-21

**Дашборд для админов**

### [1.4.0] - 2026-09-18

**Авторизация с ролями**

> 📋 Полный changelog — [CHANGELOG.md](CHANGELOG.md)

---

## 🗺️ Roadmap

### v2.0.0
- [ ] 📤 Экспорт в Excel/CSV
- [ ] 🖨️ Печать актов приёма-передачи
- [ ] 📧 Email-уведомления
- [ ] 🎨 Тёмная тема
- [ ] 🌐 Многоязычность (RU/EN)
- [ ] 📱 REST API + JWT
- [ ] 📎 Вложения (фото техники, документы)

---

## 🤝 Вклад

Pull request'ы приветствуются! Для крупных изменений сначала откройте issue.

### Процесс
1. Fork репозитория
2. Создайте ветку (`git checkout -b feature/AmazingFeature`)
3. Закоммитьте (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

### Стиль кода
- **JS**: 2 пробела, одинарные кавычки, точки с запятой
- **CSS**: 4 пробела, kebab-case
- **HTML**: 4 пробела
- **Комментарии**: на русском

---

## 🐛 Известные проблемы

- ⚠️ PDF-файлы демонстрационные (не генерируются реально)
- ⚠️ Нет восстановления пароля по email
- ⚠️ Сессии в SQLite (для production — Redis)
- ⚠️ Нет rate limiting на `/api/auth/login`

---

## 🔒 Безопасность

### Реализовано

- ✅ **Хеширование паролей** — bcryptjs, 10 раундов
- ✅ **Сессии** — httpOnly cookies, SameSite=Lax
- ✅ **Проверка на каждом запросе** — `syncSession`:
  - Пользователь существует
  - Активен (is_active = 1)
  - Роль совпадает
  - Логин совпадает
  - Версия БД совпадает
- ✅ **Транзакции** при удалении пользователя
- ✅ **Защита от self-delete**
- ✅ **Защита последнего админа**
- ✅ **Защита связанных данных** (категории/типы)
- ✅ **XSS-экранирование** — escapeHtml/escapeAttr
- ✅ **Логирование** всех действий
- ✅ **Валидация** логина, email, пароля

### Рекомендации для production

1. **Смените SESSION_SECRET** в .env:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. **Включите HTTPS** и установите `cookie.secure = true`
3. **Настройте reverse proxy** (nginx, Caddy)
4. **Ограничьте доступ к БД**
5. **Регулярные бэкапы** `data/database.db`
6. **Rate limiting** для `/api/auth/login`
7. **Обновляйте зависимости** — `npm audit fix`

---

## 📸 Скриншоты

> Скриншоты будут добавлены позже. Создайте папку `docs/screenshots/` и добавьте:

- 🔐 **Вход** — `docs/screenshots/login.png`
- 📊 **Дашборд** — `docs/screenshots/dashboard.png`
- 📚 **Справочник** — `docs/screenshots/catalog.png`
- 👤 **Профиль** — `docs/screenshots/profile.png`
- ⚙️ **Админ-панель** — `docs/screenshots/admin.png`

---

## 📄 Лицензия

Этот проект распространяется под лицензией **MIT**.

```
MIT License

Copyright (c) 2026 Дмитрий Хлюпин

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👨‍💻 Автор

**Дмитрий Хлюпин**
- GitHub: [@dmhlupin](https://github.com/dmhlupin)
- Email: dmhlupin@gmail.com

---

## 🙏 Благодарности

**Особая благодарность:**

- **Никите** — самому объективному тестировщику 🧪
- **Никите и Ульяне** — за то, что они у меня есть ❤️
- **Ирине** — за любовь и заботу 💖

**Технологии:**

- [Express.js](https://expressjs.com/) — веб-фреймворк
- [SQLite](https://www.sqlite.org/) — база данных
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — хеширование паролей
- [express-session](https://github.com/expressjs/session) — сессии
- [connect-sqlite3](https://github.com/rawberg/connect-sqlite3) — хранилище сессий
- [Node.js](https://nodejs.org/) — runtime

---

## 📞 Поддержка

- 🐛 **Нашли баг?** [Создайте issue](https://github.com/dmhlupin/myapp1/issues)
- 💡 **Есть идея?** [Откройте discussion](https://github.com/dmhlupin/myapp1/discussions)
- 📧 **Email:** dmhlupin@gmail.com

---

<div align="center">

**⭐ Если проект полезен — поставьте звезду! ⭐**

Сделано с ❤️ на Node.js

**MoveIT service** © 2026 Дмитрий Хлюпин

[⬆ Наверх](#-moveit-service)

</div>
