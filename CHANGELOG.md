# История изменений

## [1.19.0] - 2026-10-02

**Шаг 1.8: /admin/catalog на новом layout**

Справочник техники переведён на новый layout через `renderPage()`:
sidebar + header + footer через партиалы, тёмная тема, общие
компоненты из `components.css`. Страница собрана из трёх
подшагов — шаблон, CSS, роут. JS не трогали — логика работает
без изменений.

### Шаг 1.8.1 — views/admin-catalog.html → контент-шаблон

**views/admin-catalog.html:**
- Убраны `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`
- Убраны `<link>` на `style.css`, `admin.css`, `catalog.css`, `help.css`
- Убраны `<script>` на `main.js`, `help.js`, `footer.js`, `catalog.js`
- Убран `#footer-container` (футер в партиале)
- Убран `.toast-container` (в layout)
- `.header` с 4 кнопками (Админ-панель / Дашборд / Профиль / Выйти) →
  `.page-header` + `.page-actions` с одной кнопкой «← Админ-панель»
  (остальные ссылки уже есть в sidebar + header)
- `.stats` → `.stats-grid` (общий компонент из `components.css`)
- `.number green` → `.number success`,
  `.number orange` → `.number warning` (модификаторы из `components.css`)
- Inline `style="font-size: 20px; text-align: center;"` на инпутах
  иконок → класс `.input-emoji`
- `.btn-back` → `.btn-ghost` (во всех кнопках «Отмена»)
- `.modal-body` в `#viewEquipmentModal` — убран (класс не стилизован),
  `id` сохранён для JS
- Все `id` и inline-обработчики (`onclick`, `onsubmit`, `onchange`)
  сохранены — `public/js/catalog.js` работает без правок

### Шаг 1.8.2 — public/css/catalog.css → тёмная тема + чистка дублей

**public/css/catalog.css:**
- Полностью переписан под тёмную тему (переменные `theme.css`)
- Убраны дубли, которые уже есть в `components.css`:
  - `.modal-overlay` / `.modal` / `.modal-header` / `.modal-close`
    / `.modal-actions` / `.modal-body`
  - `.form-group` / `.form-row` / `.form-actions`
  - `.btn-back` (заменён на `.btn-ghost` в шаблоне)
  - `.stats` / `.stat-card` / `.icon` / `.number` / `.label`
    (шаблон теперь на `.stats-grid`)
  - `.badge` / `.badge-*`
- Убраны светлые цвета: `background: white`, `#2d3748`, `#667eea`,
  `#e2e8f0`, `#f7fafc`, `#a0aec0`, `#48bb78` и т.д.
- Все цвета переведены на `var(--*)` из `theme.css`:
  - `--bg-primary` / `--bg-secondary` / `--bg-tertiary` / `--bg-hover`
  - `--border` / `--border-light`
  - `--text-primary` / `--text-secondary` / `--text-muted`
  - `--accent` / `--success` / `--warning` / `--danger` / `--info` / `--purple`
- Оставлена специфика страницы:
  - `.catalog-layout` (2-колоночная сетка)
  - `.catalog-panel` / `.panel-header`
  - `.types-filter`
  - `.catalog-list` + скроллбар
  - `.category-item` / `.type-item` (+ `:hover`, `.selected`)
  - `.btn-action` (локальный 32×32, `.btn-edit` / `.btn-delete`)
  - `.equipment-section` / `.equipment-table` / `.eq-*`
  - `.equipment-pagination` / `.equipment-pagination-btn`
  - `.catalog-empty` / `.catalog-loading` / `.catalog-empty .empty-*`
  - `.category-filter-badge`
- Оставлены классы карточки техники (используются в `public/js/catalog.js`):
  - `.view-user-modal`
  - `.equipment-header-card` / `.equipment-header-icon` / `.equipment-header-info`
    / `.equipment-header-inv` / `.equipment-header-badges`
  - `.user-stats` / `.user-stat` / `.user-stat-number` (+ `.active`,
    `.total`, `.returned`) / `.user-stat-label`
  - `.user-detail-section` / `.detail-grid` / `.detail-item`
  - `.current-user-card` / `.current-user-avatar` / `.current-user-info`
    / `.current-user-name` / `.current-user-dept` / `.current-user-date`
    / `.current-user-status`
  - `.empty-equipment`
  - `.history-table` / `.history-user` / `.history-user-avatar`
  - `.status-badge` + модификаторы `.status-available` / `.status-assigned`
    / `.status-maintenance` / `.status-retired`
- Добавлен `.input-emoji` (был inline-стиль в шаблоне)
- Адаптивность сохранена и адаптирована под тёмную тему

### Шаг 1.8.3 — routes/catalog.js → renderPage

**routes/catalog.js:**
- Импортирован `renderPage` из `utils/layout.js`
- `renderCatalog`:
  - `fs.readFile` + `res.send` заменены на `renderPage`
  - `pageCss: '/css/catalog.css'`
  - `pageJs: '/js/catalog.js'`
  - `title: 'Справочник техники – MoveIT service'`
  - Автоматически подключаются партиалы header/sidebar/footer
    и общие CSS/JS (`theme.css`, `layout.css`, `components.css`,
    `help.css`, `main.js`, `help.js`, `layout.js`)
  - Подстановка `{{total_categories}}` / `{{total_types}}` /
    `{{total_equipment}}` сохранена
- API-функции (14 штук: категории, типы, техника) — без изменений
- `public/js/catalog.js` — без изменений

### Проверено

- `/admin/catalog` открывается через `renderPage`, партиалы
  (sidebar + header + footer) подгружаются, тёмная тема применяется
- Статистика (3 карточки: категории / типы / техника) на `.stats-grid`
- Панели категорий и типов загружаются (8 / 35 записей из seed)
- CRUD категорий и типов работает: модалки, тосты, обновление списка
- Фильтр типов по категории, подсветка `.selected`
- Секция техники: таблица, статус-бейджи, аватары владельцев, пагинация
- Поиск техники: Enter / кнопка / Escape / сброс
- Карточка техники (просмотр): шапка, статистика, детали, владелец,
  история
- Все модалки: закрытие по ✕ / Escape / клику на overlay
- Sidebar подсвечивает активный пункт, Ctrl+K / Ctrl+B работают
- Адаптивность сохранена
- В консоли браузера ошибок нет
- `node scripts/check-css.js` — все переменные `catalog.css` объявлены
  в `theme.css`

### Файлы

**Изменены:**
- `views/admin-catalog.html`
- `public/css/catalog.css`
- `routes/catalog.js`
- `package.json`
- `CHANGELOG.md`

**Не тронуты:**
- `public/js/catalog.js` (логика работает как есть)
- `utils/layout.js`
- API-функции в `routes/catalog.js`

## [1.18.0] - 2026-10-02

**Шаг 1.7: /admin/user/add + /admin/user/edit/:id на новом layout**

Завершён перевод форм пользователя. Страницы `/admin/user/add`
и `/admin/user/edit/:id` собраны через `renderPage()`
(sidebar + header + footer через партиалы), тёмная тема,
общие компоненты из `components.css`. У страниц нет собственного
CSS-файла — только общие слои (`theme.css`, `layout.css`,
`components.css`, `help.css`).

### Шаг 1.7.1 — views/admin-user-add.html → контент-шаблон

**public/css/components.css:**
- Добавлен `.info-box` + `.info-box-icon` + `.info-box p` +
  `.info-box strong` (общий информационный блок для форм)
- Добавлен `.password-warning` (+ `strong`, `p`) — предупреждение
  в модалке временного пароля
- Добавлен `.password-display` (+ `code`) — крупный показ пароля
- Добавлен `.password-username` (+ `strong`, `span`) — логин в модалке
- Все цвета — на переменных `theme.css` (`--info`, `--warning`,
  `--success`, `--bg-*`, `--text-*`, `--font-mono`, `--text-2xl`)

**views/admin-user-add.html:**
- Убраны `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`
- Убраны `<link rel="stylesheet" href="/css/style.css">` и inline `<style>`
- Убран `<script src="/js/main.js">` и inline `<script>`
- Убран `<div class="toast-container">` (он в layout)
- `.header` + `.back-link` → `.page-header` + `.page-actions`
  с `.btn.btn-ghost.btn-sm`
- `.info-box` — общий из `components.css` (inline-стили убраны)
- Форма обёрнута в `.card` с `.card-header` / `.card-body`
- Кнопка «Отмена» → `.btn.btn-ghost`
- Модалка пароля переведена на `.modal-overlay` + `.modal` +
  `.modal-header` (с `<h3>`) + `.modal-actions`
- Inline-стили модалки (`style="..."`) полностью убраны
- Открытие модалки через `.classList.add('active')`
  (в `components.css` управление через `.modal-overlay.active`)
- Все `id` сохранены: `addUserForm`, `username`, `email`,
  `full_name`, `department`, `phone`, `role`, `submitBtn`,
  `passwordModal`, `tempPasswordValue`, `passwordUsername`

**public/js/admin-user-add.js (новый):**
- Вынесена inline-логика из `<script>` шаблона
- `submitForm(event)` — POST `/api/admin/users`
- `finishCreate()` — редирект на `/admin`
- При успехе — заполняет `#tempPasswordValue` и `#passwordUsername`,
  открывает `#passwordModal` через `.classList.add('active')`
- `console.error` для диагностики ошибок
- Подключается через `pageJs` в `renderPage`

### Шаг 1.7.2 — views/admin-user-edit.html → контент-шаблон

**views/admin-user-edit.html:**
- Убраны `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`
- Убраны `<link rel="stylesheet" href="/css/style.css">` и inline `<style>`
- Убран `<script src="/js/main.js">` и inline `<script>`
- Убран `<div class="toast-container">` (он в layout)
- `.header` + `.back-link` → `.page-header` + `.page-actions`
- `.id-badge` → `.page-subtitle` «ID: N»
- `.info-box` — общий из `components.css`
- Форма обёрнута в `.card` с `.card-header` / `.card-body`
- Кнопка «Отмена» → `.btn.btn-ghost`
- Роль передаётся через `<input type="hidden" id="currentRole" value="{{role}}">`
  (вместо `{{role}}` внутри `<option selected>`)
- `#userId` — hidden-input, как раньше
- Все `id` сохранены: `editUserForm`, `userId`, `currentRole`,
  `username`, `email`, `full_name`, `department`, `phone`,
  `role`, `submitBtn`
- Плейсхолдеры сохранены: `{{id}}`, `{{role}}`, `{{username}}`,
  `{{email}}`, `{{full_name}}`, `{{department}}`, `{{phone}}`

**public/js/admin-user-edit.js (новый):**
- Вынесена inline-логика
- `userId` и `currentRole` читаются из hidden-inputs
- `roleSelect.value = currentRole` при загрузке
- `submitForm(event)` — PUT `/api/admin/users/:id`
- Валидация: если `userId` нет — тост с ошибкой
- `showToast` на успех / ошибку, редирект на `/admin`
  через 1 секунду после успеха
- Подключается через `pageJs` в `renderPage`

### Шаг 1.7.3 — routes/admin.js → renderPage

**routes/admin.js:**
- `renderAddUser`:
  - `fs.readFile` + `res.send` заменены на `renderPage`
  - `pageJs: '/js/admin-user-add.js'`
  - `pageCss` не передаётся (своего CSS у страницы нет)
  - `title: 'Добавить пользователя – MoveIT service'`
- `renderEditUser`:
  - Подстановка плейсхолдеров сохранена
  - Скаляры экранированы через локальный `escapeHtml`
  - `pageJs: '/js/admin-user-edit.js'`
  - `pageCss` не передаётся
  - `title: 'Редактировать пользователя – MoveIT service'`
  - Убран `{{is_active}}` (в шаблоне не используется)
- API-функции (`addUserAPI`, `updateUserAPI` и т.д.) без изменений

### Проверено

- `/admin/user/add` открывается через `renderPage`, партиалы
  (sidebar + header + footer) подгружаются, тёмная тема применяется
- Форма добавления: все поля работают, сабмит → тост → модалка
  с паролем, кнопка «Понятно, перейти к списку» → редирект на `/admin`
- `/admin/user/edit/:id` открывается через `renderPage`
- Все поля заполнены, роль подставляется в `<select>` из
  `#currentRole`, сабмит → тост → редирект на `/admin`
- Обе страницы: sidebar подсвечивает «Админ-панель», Ctrl+K / Ctrl+B
  работают, dropdown профиля работает, версия в футере — v1.18.0
- Адаптивность сохранена
- В консоли браузера ошибок нет
- `node scripts/check-css.js` — все проверки зелёные
  (объявленные переменные, классы, плейсхолдеры)

### Файлы

**Изменены:**
- `public/css/components.css`
- `routes/admin.js`
- `package.json`
- `CHANGELOG.md`

**Новые:**
- `views/admin-user-add.html` (был отдельный HTML — стал контент-шаблон)
- `views/admin-user-edit.html` (то же)
- `public/js/admin-user-add.js`
- `public/js/admin-user-edit.js`

**Не тронуты:**
- `utils/layout.js` — проверили, `pageCss: null` обрабатывается корректно
- API-функции в `routes/admin.js`

## [1.17.5] - 2026-10-02

**Шаг 1.6: /admin/add + /admin/edit/:id переведены на новый layout**

Этап 1.5 (/admin) закрыт в v1.17.0. Шаг 1.6 завершает перевод
форм техники. Страницы `/admin/add` и `/admin/edit/:id` собраны
через `renderPage()` (sidebar + header + footer через партиалы),
CSS переведён на переменные `theme.css`.

### Шаг 1.6.1 — views/admin-add.html → контент-шаблон

**views/admin-add.html:**
- Убраны `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`
- Убраны подключения `style.css`, `admin-add.css`, `help.css`,
  `main.js`, `help.js`, `footer.js`, `admin-add.js`
  (всё это подключает `utils/layout.js` через `renderPage`)
- Убран `#footer-container` (футер теперь в партиале)
- Убран `.toast-container` (в layout)
- `.header` + `.back-link` заменены на `.page-header` + `.page-actions`
- Форма обёрнута в `.card` с `.card-header` / `.card-body`
- Секция «Место хранения» — отдельный `.card`
- Кнопки формы — в `.form-actions`
- Убран inline-style у `.help-text` (класс переехал в `components.css`)
- Все `id` элементов сохранены — `admin-add.js` их ждёт
- Функционал не менялся

### Шаг 1.6.2 — views/admin-edit.html → контент-шаблон

**views/admin-edit.html:**
- Убраны `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`
- Убраны подключения `style.css`, `admin-edit.css`, `help.css`,
  `main.js`, `help.js`, `footer.js`, `admin-edit.js`
- Убран `#footer-container` и `.toast-container`
- Вынесен inline `<style>` (`status-warning`, `status-info`,
  `assign-section`, `id-badge`, `location-section`, `location-title`,
  `location-preview`, `location-preview-icon`, `help-text`) —
  стили переехали в `admin-edit.css`
- `.header` + `.back-link` заменены на `.page-header` + `.page-actions`
- `.id-badge` заменён на `.page-subtitle` «ID: N»
- Форма обёрнута в `.card`
- Секция «Место хранения» — отдельный `.card`
- Контекстные блоки (`status-warning`, `status-info`, `assign-section`)
  оставлены внутри основного `.card`
- Скрытые поля (`equipmentId`, `currentStatus`, `currentCategoryId`,
  `currentTypeId`, `currentCellId`) сохранены — `admin-edit.js` их ждёт
- Плейсхолдеры `{{...}}` сохранены (`{{status_options}}`, `{{user_options}}`)
- Функционал не менялся

### Шаг 1.6.3 — CSS: тёмная тема + components.css

**public/css/components.css:**
- Добавлен `.required` (красная звёздочка, `var(--danger)`)
- Добавлен `.help-text` (`var(--text-xs)`, `var(--text-muted)`)
- Понадобятся в 1.7 (`/admin/user/add`, `/admin/user/edit`)

**public/css/admin-add.css:**
- Полностью переписан: убраны `body`, `.container`, `.back-link`
  (светлая тема)
- Оставлена только специфика: `.location-preview`,
  `.location-preview-icon`
- Все цвета — на переменных `theme.css`

**public/css/admin-edit.css:**
- Полностью переписан: убраны `body`, `.container`, `.back-link`
- Оставлена специфика: `.status-warning`, `.status-info`,
  `.assign-section`, `.location-preview`, `.location-preview-icon`
- Уведомления переведены на `rgba`-фон + `var(--warning)` / `var(--info)`
- Секция назначения: `var(--bg-tertiary)` + `border-left var(--accent)`
- Все цвета — на переменных `theme.css`
- Inline `<style>` из `views/admin-edit.html` полностью переехал сюда
- Дубли с `components.css` (`.btn`, `.card`, `.form-group`, `.form-row`,
  `.form-actions`, `.help-text`, `.required`) не создавались

### Шаг 1.6.4 — routes/admin.js → renderPage

**routes/admin.js:**
- `renderAddEquipment`:
  - `fs.readFile` + `res.send` заменены на `renderPage`
  - `pageCss: /css/admin-add.css`, `pageJs: /js/admin-add.js`
  - `title: 'Добавить технику – MoveIT service'`
  - Автоматически подключаются партиалы header/sidebar/footer
    и общие CSS/JS (`theme.css`, `layout.css`, `components.css`,
    `help.css`, `main.js`, `help.js`, `layout.js`)
- `renderEditEquipment`:
  - Подстановка плейсхолдеров сохранена
  - Скалярные значения экранированы через локальный `escapeHtml`
  - Многострочные вставки (`{{status_options}}`, `{{user_options}}`)
    заменяются без флага `/g`
  - `status_options` переведены на русские подписи:
    `✅ Доступна` / `👤 Назначена` / `🔧 В ремонте` / `📦 Списана`
  - В `user_options` строка «— Выберите пользователя —» убрана
    (опция теперь в шаблоне `admin-edit.html`)
  - Финальная сборка через `renderPage`
  - `pageCss: /css/admin-edit.css`, `pageJs: /js/admin-edit.js`
  - `title: 'Редактировать технику – MoveIT service'`
- API-функции не затронуты

### Шаг 1.6.5 — public/js/admin-add.js → чистка

**public/js/admin-add.js:**
- Два обработчика `DOMContentLoaded` объединены в один
  (было: `loadCategories` + плейсхолдер в первом, `loadWarehouses`
  во втором; стало: категории → плейсхолдер → склады в одном)
- Убраны `console.log` (успешные сценарии)
- `console.error` / `console.warn` сохранены для реальных проблем
- Функционал не менялся: каскады склад→зона→стеллаж→ячейка,
  превью адреса, валидация формы, `submitForm` — без изменений
- `escapeHtml` и `generateInventoryNumber` оставлены локально
  (позже уедут в `utils/escape.js` вместе с другими роутами)

**public/js/admin-edit.js:**
- Не трогали — работает как есть

### Проверено

- `/admin/add` открывается через `renderPage`, партиалы
  (sidebar + header + footer) подгружаются, тёмная тема применяется
- Форма добавления: категории загружаются, типы подгружаются
  при выборе категории, каскады места хранения работают,
  превью адреса обновляется, сабмит → тост → редирект на `/admin`
- `/admin/edit/:id` открывается через `renderPage`, поля заполнены,
  место хранения предзаполнено, статус — русские подписи,
  контекстные блоки (`status-warning` / `status-info` /
  `assign-section`) показываются по сценарию
- Обе страницы: sidebar подсвечивает «Админ-панель», Ctrl+K / Ctrl+B
  работают, dropdown профиля в хедере работает, версия в футере — v1.17.5
- Адаптивность сохранена
- В консоли браузера ошибок нет

### Файлы

**Изменены:**
- `views/admin-add.html`
- `views/admin-edit.html`
- `public/css/components.css`
- `public/css/admin-add.css`
- `public/css/admin-edit.css`
- `routes/admin.js`
- `public/js/admin-add.js`

**Не тронуты:**
- `public/js/admin-edit.js`
- API-функции в `routes/admin.js`

### Связанные теги

- v1.17.0 — Этап 1.5: /admin на новом layout (закрыт ранее)
- v1.17.1 — 1.6.1: views/admin-add.html → контент-шаблон
- v1.17.2 — 1.6.2: views/admin-edit.html → контент-шаблон
- v1.17.3 — 1.6.3: CSS admin-add/admin-edit → тёмная тема
- v1.17.4 — 1.6.4: renderAddEquipment/renderEditEquipment → renderPage
- v1.17.5 — 1.6.5: admin-add.js — чистка

## [1.17.0] - 2026-10-02

**🎉 Этап 1.5 завершён: админ-панель (/admin) полностью переведена
на новый layout**

### Итоги:

**Что сделано:**
- Компонент табов (.tabs / .tab-btn / .tab-content) вынесен
  в components.css (v1.16.2)
- views/admin.html переписан в контент-шаблон:
  - Убраны html/head/body, подключения CSS/JS, header-навигация,
    footer-container
  - thead таблицы пользователей приведён к 9 колонкам
    (соответствие renderAdmin — раньше было 6)
  - .btn-back заменён на .btn-ghost
  - Inline-обработчики пока оставлены (рефакторинг на 1.5.6)
  (v1.16.3)
- public/css/admin.css переписан на переменные theme.css:
  - Убраны дубли (.stats, .stat-card, .table-container,
    .table-header, .badge, .modal-*, table/th/td)
  - Все цвета → var(--*)
  - .btn-icon переопределён в .action-buttons (28×28)
  - Цветные модификаторы .btn-icon сохранены
  - .badge-active/-inactive → .badge-count.has-items/.no-items
  (v1.16.4)
- В components.css добавлены стили .table-search (v1.16.4)
- routes/admin.js: renderAdmin переведён на renderPage:
  - Автоматически подключаются партиалы header/sidebar/footer
  - Общие CSS: theme.css, layout.css, components.css, help.css
  - Общие JS: main.js, help.js, layout.js
  - pageCss: /css/admin.css, pageJs: /js/admin.js
  (v1.16.5)
- Проверена совместимость admin.js с новым layout (v1.16.6)
  - Правок не потребовалось

**Файлы, затронутые в Этапе 1.5:**
- public/css/components.css (+ .tabs, + .table-search)
- public/css/admin.css (переписан на переменные)
- views/admin.html (контент-шаблон)
- routes/admin.js (renderAdmin → renderPage)
- public/js/admin.js (проверено, правок не потребовалось)
- CHANGELOG.md

**Что НЕ сделано (отложено на следующие шаги):**
- Inline-обработчики (onclick / onkeyup) → addEventListener
  (шаг 1.5.6)
- Дубли getInitials и formatDate → utils/escape.js и utils/format.js
  (отдельный шаг)
- /admin/add, /admin/edit/:id — на новом layout (шаг 1.6)
- /admin/user/add, /admin/user/edit/:id (шаг 1.7)
- /admin/catalog (шаг 1.8)
- /admin/logs (шаг 1.9)
- /admin/warehouses, /admin/warehouse-details (шаг 1.10)
- /admin/inventory (шаг 1.11)
- /pdf (шаг 1.12)
- Финальная навигация + адаптивность (шаг 1.13)

**Статистика Этапа 1.5:**
- Тегов: 5 (v1.16.2 — v1.16.6) + финальный v1.17.0
- Файлов изменено: 6 (components.css, admin.css, admin.html,
  admin.js routes, admin.js client, CHANGELOG.md)
- CSS-строк удалено (дубли): ~150
- CSS-строк добавлено (components + admin): ~200

Проверено: /admin полностью работает на новом layout,
все модалки, таблицы, поиск, табы, адаптивность — без ошибок.
/admin/add и /admin/edit/:id пока в старом дизайне — это ожидаемо,
они в шаге 1.6.

## [1.16.6] - 2026-10-02

**Админ-панель: проверка совместимости admin.js с новым layout**

### Изменения:

**public/js/admin.js:**
- Правок не потребовалось — файл полностью совместим с новым layout.

### Проверено на совместимость:

**Конфликты глобальных имён (main.js, layout.js vs admin.js):**
- showToast — из main.js, используется в admin.js (без переопределения) ✓
- getInitials — определён и в layout.js, и в admin.js (идентичные
  реализации, перезапись безопасна, дополнительной логики нет) ✓
- formatDate — определён и в main.js (длинный формат), и в admin.js
  (относительное время). На /admin подключается admin.js — побеждает
  его версия. Так как admin.js работает только на /admin,
  конфликта нет. Оставлено намеренно: на /admin нужно относительное
  время («5 мин назад»), а не длинная дата. ✓

**Глобальные обработчики событий:**
- Escape: и main.js, и admin.js вешают обработчик на keydown.
  Оба срабатывают — main.js снимает .active со всех модалок,
  admin.js дополнительно сбрасывает переменные (deleteId,
  currentTempPassword и т.д.). Дублирование безопасное, дополнительная
  логика admin.js полезна. ✓
- Клик на .modal-overlay: аналогично — main.js снимает .active,
  admin.js вызывает свои close-функции. ✓

**Inline-обработчики (onclick / onkeyup):**
- switchTab использует event.target — доступен, т.к. inline onclick
  сохраняет глобальный event. ✓
- searchTable — работает. ✓
- Все кнопки действий (viewEquipment, editEquipment, deleteUser и т.д.)
  — работают. ✓

**Модалки:**
- .modal-overlay.active — из components.css, совместимо. ✓

### Примечание:
- Микро-рефакторинг (вынос getInitials и formatDate в utils/escape.js
  и utils/format.js) отложен до отдельного шага.
- Удаление inline-обработчиков (onclick → addEventListener)
  запланировано на 1.5.6.

Проверено: /admin работает, все модалки открываются и закрываются,
toast-уведомления показываются, поиск в таблицах работает,
горячие клавиши Ctrl+K / Ctrl+B — работают.

## [1.16.5] - 2026-10-02

**Админ-панель: renderAdmin переведён на renderPage**

### Изменения:

**routes/admin.js:**
- Импортирован renderPage из utils/layout.js:
  `const { renderPage } = require('../utils/layout');`
- В renderAdmin финальный res.send(html) заменён на renderPage({...})
- Страница /admin теперь собирается через общий layout:
  - Автоматически подключаются партиалы header / sidebar / footer
  - Общие CSS: theme.css, layout.css, components.css, help.css
  - Общие JS: main.js, help.js, layout.js
  - pageCss: /css/admin.css
  - pageJs: /js/admin.js
- title: 'Админ-панель – MoveIT service'

**Не тронуто в этом шаге:**
- renderAddEquipment, renderEditEquipment — отдельные шаги (1.6)
- renderAddUser, renderEditUser — отдельные шаги (1.7)
- renderLogs — отдельный шаг (1.9)
- Локальные хелперы escapeHtml / escapeAttr / getInitials оставлены
  в routes/admin.js (позже уедут в utils/escape.js)
- API-функции (addEquipmentAPI, updateUserAPI и т.д.) без изменений

Проверено: /admin открывается, партиалы (sidebar + header + footer)
подгружаются, тёмная тема применяется, табы переключаются,
таблицы техники (10 колонок) и пользователей (9 колонок) отрисованы,
модалки (удаление, пароль, просмотр, перемещение) работают,
поиск в таблицах работает, адаптивность сохранена.

## [1.16.4] - 2026-10-02

**Админ-панель: перевод CSS на тёмную тему и общие компоненты**

### Изменения:

**public/css/admin.css:**
- Полностью переписан под тёмную тему (переменные theme.css)
- Убраны дубли, которые уже есть в components.css:
  - .stats / .stat-card / .number / .label / .icon
  - .tabs / .tab-btn / .tab-content (перенесены в components.css)
  - .table-container / .table-header / table / th / td
  - .badge / .badge-active / .badge-inactive
  - .modal-header / .modal-close
  - .table-search input (перенесено в components.css)
- Все цвета переведены на var(--*) из theme.css
- .btn-icon переопределён локально в .action-buttons (28×28) —
  глобальный .btn-icon в components.css остаётся 36×36
- Цветные модификаторы .btn-icon (.btn-info, .btn-edit, .btn-warning,
  .btn-success, .btn-delete, .btn-move) сохранены как специфика /admin
- .badge-active / .badge-inactive заменены на
  .badge-count.has-items / .badge-count.no-items
- Свои стили оставлены: .assigned-cell, .location-cell, .catalog-badge,
  .user-cell, .role-badge, .status-badge, .action-buttons,
  .password-modal, .view-user-modal, .user-header-card,
  .equipment-header-card, .user-stats, .detail-grid, .equipment-cards,
  .current-user-card, .empty-equipment, .history-table, .delete-warning,
  .move-modal, .move-equipment-info, .move-current-location,
  .move-preview, .location-detail-item, .btn-move-inline, .id-badge,
  .row-blocked
- Адаптивность сохранена и адаптирована под новые размеры

**public/css/components.css:**
- Добавлена секция "Поиск в таблицах" (.table-search и input):
  - Раньше стили были только в admin.css (светлые)
  - Теперь общие на переменных theme.css
  - Понадобится на /users, /admin/catalog и других страницах

**routes/admin.js:**
- В renderAdmin заменён класс счётчика ТМЦ:
  - было: .badge .badge-active / .badge-inactive
  - стало: .badge-count.has-items / .badge-count.no-items
- Причина: классы .badge-active / .badge-inactive удалены вместе с дублями,
  счётчик ТМЦ теперь использует новый компонент .badge-count

Связанные подшаги Этапа 1.5 (без отдельных тегов):
- v1.16.2 — .tabs / .tab-btn / .tab-content вынесены в components.css
- v1.16.3 — views/admin.html переведён в контент-шаблон
  (thead таблицы пользователей приведён к 9 колонкам,
  .btn-back заменён на .btn-ghost, убраны html/head/body
  и подключения CSS/JS)

Проверено: админ-панель открывается, табы переключаются,
таблицы техники и пользователей отображаются,
модалки (удаление, пароль, просмотр, перемещение) работают,
поиск в таблицах стилизован, адаптивность сохранена.

## [1.16.1] - 2026-10-02

**Личный кабинет полностью переведён на новый дизайн**

### Изменения: ###

**views/profile.html:**
- Превращён в контент-шаблон без `<html>/<head>/<body>`
- Убраны inline `<style>` и старые подключения CSS/JS
- Убраны кнопки 'Сменить пароль'/'Выйти' — теперь в хедере
- Убран блок #adminLinks — в новом layout админ-ссылки
  видны в sidebar
- Профиль, техника, история обёрнуты в .card из components.css
- Бейджи статусов через .badge-*

**routes/profile.js:**
- Использован renderPage() из utils/layout.js
- Локальные хелперы escapeHtml/formatDate/emptyRow
- Параллельная загрузка данных через Promise.all
- Логика updateProfileAPI не изменилась

**public/css/profile.css:**
- Полностью переписан под тёмную тему (переменные theme.css)
- Свои стили: только .profile-card, .profile-grid, .profile-item
- Всё остальное — из components.css
- Адаптивность для узких экранов

**public/js/profile.js:**
- Убран блок DOMContentLoaded с adminLinks (не нужен)
- Логика toggleEditProfile/saveProfile сохранена

Проверено: layout, редактирование профиля, сохранение,
таблицы, пустые состояния, адаптивность."

## [1.16.0] - 2026-10-02

### Изменения:
**Полностью переработана страница пользователей под новый дизайн**
- (sidebar + header + footer через utils/layout.js).

**views/users.html:**
- Превращён в контент-шаблон без `<html>/<head>/<body>`
- Убраны inline `<style>` и старые подключения CSS/JS
- Убраны кнопки навигации (Главная / Профиль / Выйти) — теперь
  они в хедере и sidebar
- Добавлен плейсхолдер {{admin_actions}} для кнопки
  'Добавить пользователя' (только для админов)
- Добавлено пустое состояние для случая, когда пользователей нет

**routes/users.js:**
- Использован renderPage() из utils/layout.js
- Добавлены локальные хелперы escapeHtml/escapeAttr/getInitials
- Условное отображение кнопки добавления по роли пользователя
- Атрибут data-search на строке — для быстрой клиентской фильтрации
- Обработка пустого списка пользователей

**public/css/users.css (новый):**
- Только специфичные для страницы стили (.user-cell,
  .user-avatar, .id-badge, .text-mono, .equipment-list-cell)
- Всё остальное берётся из theme.css и components.css
- Адаптивность: скрытие неважных колонок на узких экранах

**public/js/users.js (новый):**
- Поиск по таблице через data-search
- Автофокус на поле поиска при загрузке

Проверено: layout, sidebar-подсветка, поиск, адаптивность."

## [1.15.1] - 2026-10-01

### Добавлено

**Новые стили отображения**
- **Полностью переработан дизайн страниц**
  - В новом чтиле переработаны главная страница и страница техники
  - Добавлен layuot для отрисовки страниц
  - добавлены партиалы для футера, хедера и сайдбара
  - сборка страниц единоообразно


## [1.15.0] - 2026-10-01

**🎉 Финальный релиз: полная система учёта техники с адресным хранением**

### Добавлено

**Финальная документация (этап 8):**
- Полностью обновлён `README.md`:
  - Актуальное описание проекта "MoveIT service"
  - Раздел "Склады и адресное хранение" (7 подразделов)
  - Обновлённая структура проекта (10+ новых файлов)
  - API-раздел (35+ endpoints)
  - История версий (1.4.0 — 1.15.0)
  - Roadmap
- Обновлён `CHANGELOG.md`:
  - Полная история всех изменений
  - Категории "Добавлено", "Изменено", "Исправлено", "Удалено"
- Создан `VERSION.md`:
  - Полное описание версии 1.15.0
  - Итоги работы по складам
  - Список файлов и функций

### Итоги разработки

**Полностью реализовано:**

1. **Аутентификация и авторизация** (v1.4.0)
   - Вход/выход, смена пароля
   - Роли: админ/пользователь
   - Сессии в SQLite
   - Блокировка пользователей
   - Синхронизация сессии с БД

2. **Дашборд** (v1.5.0)
   - 6 карточек статистики
   - SVG-график активности
   - Последние действия
   - "Требует внимания"
   - Топ пользователей
   - Статистика по категориям

3. **Справочник техники** (v1.7.0 — v1.8.0)
   - 8 категорий, 35 типов
   - CRUD в админке
   - Фильтрация и поиск
   - Карточка техники с историей

4. **Склады и адресное хранение** (v1.10.0 — v1.14.0)
   - 4-уровневая иерархия: Склад → Зона → Стеллаж → Ячейка
   - CRUD всех уровней
   - Привязка техники к ячейкам
   - Логика "назначение обнуляет cell_id"
   - Инвентаризация по складам
   - Экспорт в CSV
   - Перемещение техники

5. **Логирование** (v1.4.0+)
   - 25+ типов действий
   - Фильтры, поиск, пагинация
   - Красивые бейджи
   - Статистика

### Статистика проекта

| Метрика | Значение |
|---------|----------|
| **Всего версий** | 21+ |
| **Файлов в проекте** | 80+ |
| **Строк кода** | 20000+ |
| **Таблиц в БД** | 11 |
| **API endpoints** | 60+ |
| **Функций БД** | 80+ |
| **Функций JS** | 100+ |
| **CSS-классов** | 500+ |

### Файлы

**Новые в v1.15.0:**
- `VERSION.md` — полное описание версии

**Обновлены:**
- `README.md` — полностью актуализирован
- `CHANGELOG.md` — добавлен раздел [1.15.0]
- `package.json` — версия 1.15.0, автор, keywords

### Проверено
- Все страницы работают
- Все API endpoints отвечают
- Все функции БД выполняются
- Документация соответствует реальности
- Версии синхронизированы

## [1.14.0] - 2026-10-01

### Добавлено

**Перемещение техники между ячейками (этап 7):**
- **Кнопка "🔄 Переместить"** в таблице `/admin` — для техники не в статусе `assigned`
- **Модальное окно перемещения**:
  - Информация о технике (название, инв. номер)
  - Текущее место хранения
  - 4 каскадных селекта: Склад → Зона → Стеллаж → Ячейка
  - Опция "Убрать из ячейки" (склад = пусто)
  - Превью нового адреса
  - Поле "Комментарий" (логируется)
  - Валидация: запрет перемещения назначенной техники
  - Валидация: проверка capacity ячейки
- **Кнопка "🔄 Переместить"** в карточке техники (модалка просмотра):
  - Если есть ячейка — "Переместить"
  - Если нет — "Разместить"
- **История перемещений** логируется в `activity_log`
- **Красивый бейдж "🔄 Перемещение техники"** в логах (фиолетовый)

### API (2 новых endpoints)
- `POST /api/admin/equipment/:id/move` — переместить технику
- `GET /api/admin/equipment/:id/moves` — история перемещений

### Функции БД (2 новых)
- `moveEquipmentToCellDetailed(equipmentId, cellId, userId, userName)` — перемещение с валидацией
- `getEquipmentMoves(equipmentId)` — история из activity_log

### Логика перемещения
- **Нельзя переместить** назначенную технику (`status === 'assigned'`)
- **Проверка capacity**: ячейка не должна быть переполнена
- **Не перемещает** в ту же ячейку (сообщение "уже в этой ячейке")
- **Логирует** с полной информацией:
  - `inventory_number`, `equipment_name`
  - `from_cell`, `to_cell`
  - `to_warehouse`, `to_zone`, `to_rack`
  - `notes`

### Файлы (изменено)
- `database/modules/equipment.js` — 2 новые функции
- `routes/admin.js` — 2 API + обновление `actionNames` + кнопка в таблице
- `server.js` — 2 роута
- `views/admin.html` — модалка `moveEquipmentModal`
- `public/js/admin.js` — 9 функций перемещения + кнопка в карточке
- `public/css/admin.css` — стили `.btn-move`, `.move-modal`, `.btn-move-inline`
- `public/css/logs.css` — `.log-action-move`
- `package.json`, `CHANGELOG.md`, `README.md`

### Проверено
- Перемещение через таблицу работает
- Перемещение через карточку работает
- Каскадные селекты работают
- Превью обновляется
- Валидация срабатывает
- Логирование корректное
- Назначенная техника не перемещается
- Никаких ошибок в консоли

## [1.13.0] - 2026-10-01

### Добавлено

**Инвентаризация по складам (этап 6):**
- **Страница `/admin/inventory`** — обзор всех складов:
  - 6 карточек общих итогов (складов, зон, стеллажей, ячеек, техники на складах, назначено)
  - Warning-блок если есть техника без ячейки
  - Сводка по складам: карточки с прогресс-барами заполненности
  - Мини-статистика по каждому складу (зоны, стеллажи, ячейки, техника)
  - Кнопки "📋 Открыть инвентаризацию" и "🏢 Дерево склада"
- **Модалка деталей склада**:
  - Заголовок с иконкой и адресом
  - 2 вкладки:
    - 🔧 **Техника** — таблица всех единиц на складе с полным адресом
    - 📍 **Заполненность** — список ячеек с процентами
  - Кнопки "🏢 Дерево склада" и "📥 Экспорт в CSV"

**Фильтр по складу на `/equipment`:**
- Новый селект "Склад" (4-й фильтр)
- Опции: "Все склады", "— Не на складе —", конкретные склады
- Комбинируется с другими фильтрами

**Экспорт в CSV:**
- `GET /api/admin/warehouses/:id/inventory/export`
- Формат CSV с BOM (UTF-8) для Excel
- Заголовки: Инв. номер, Название, Модель, Производитель, Категория, Тип, Место хранения, Статус
- Итоговая строка с количеством

### API (7 новых endpoints)
- `GET /api/admin/inventory/summary` — сводка по складам
- `GET /api/admin/inventory/totals` — общие итоги
- `GET /api/admin/warehouses/:id/inventory` — техника на складе
- `GET /api/admin/warehouses/:id/occupancy` — заполненность ячеек
- `GET /api/admin/warehouses/:id/inventory/export` — экспорт в CSV
- `GET /admin/inventory` — страница инвентаризации

### Функции БД (4 новых)
- `getInventorySummary()` — сводка по складам с процентами
- `getWarehouseInventory(warehouseId)` — техника на складе
- `getCellOccupancy(warehouseId)` — заполненность ячеек
- `getInventoryTotals()` — общие итоги

### Файлы (новые)
- `views/admin-inventory.html` — страница инвентаризации
- `public/css/inventory.css` — стили (534 строки)
- `public/js/inventory.js` — логика (12 функций)

### Изменено
- `server.js` — 6 роутов инвентаризации
- `views/admin.html` — кнопка "📊 Инвентаризация"
- `views/dashboard.html` — quick-action
- `routes/equipment.js` — 4-й фильтр (склад)
- `views/equipment.html` — селект "Склад"
- `public/js/equipment-filter.js` — фильтр по складу
- `package.json`, `CHANGELOG.md`, `README.md`

### Проверено
- Страница инвентаризации работает
- 6 карточек итогов
- Warning-блок
- 2 карточки складов с прогресс-барами
- Модалка с 2 вкладками
- Экспорт в CSV работает
- Фильтр по складу работает
- Комбинация фильтров работает
- Никаких ошибок в консоли

## [1.12.0] - 2026-10-01

### Добавлено

**Привязка техники к ячейкам (этап 5):**
- **Форма создания/редактирования техники** — блок "📍 Место хранения":
  - 4 каскадных селекта: Склад → Зона → Стеллаж → Ячейка
  - Предзаполнение при редактировании
  - Превью адреса
- **Отображение места хранения**:
  - В таблице `/admin` — колонка "Место хранения"
  - В таблице `/equipment` — колонка "Место хранения"
  - В карточке техники (модалка) — блок "📍 Место хранения"
- **Логика "назначение обнуляет cell_id"**:
  - При назначении пользователю → `cell_id = NULL`
  - При возврате → `cell_id = NULL`
  - При смене статуса `assigned → available` → `cell_id = NULL`
- **API** `getEquipmentWithLocation`:
  - Полный адрес (склад, зона, стеллаж, ячейка)
  - Фильтры (category_id, type_id, status, warehouse_id, search)
  - Пагинация
  - Поиск по `cell.code`

### Изменено
- `database/modules/equipment.js`:
  - `getEquipmentById` — JOIN с cells/racks/zones/warehouses
  - `getEquipmentWithLocation` — новая функция
  - `addEquipment`, `updateEquipment` — принимают `cell_id`
  - `assignEquipment`, `returnEquipmentByEquipmentId` — обнуляют `cell_id`
  - `updateEquipment` — при `assigned → available` принудительно `cell_id = NULL`
- `routes/admin.js`:
  - `renderAdmin` — использует `getEquipmentWithLocation`
  - `addEquipmentAPI`, `updateEquipmentAPI` — принимают `cell_id`
  - `updateEquipmentAPI` — `finalCellId` для логики назначения
  - `renderEditEquipment` — передаёт `cell_id`
  - `getEquipmentDetailsAPI` — для карточки техники
- `routes/equipment.js` — использует `getEquipmentWithLocation`
- `public/js/admin-add.js`, `admin-edit.js` — каскадные селекты
- `public/js/admin.js` — место хранения в карточке
- `views/admin-add.html`, `admin-edit.html` — блок "Место хранения"
- `views/admin.html`, `equipment.html` — колонка "Место хранения"
- `public/css/admin.css`, `equipment.css` — стили `.location-cell`
- `public/js/equipment-filter.js` — `colspan="8"`

### Проверено
- Техника сохраняется с `cell_id`
- Место хранения отображается везде
- Назначение обнуляет `cell_id`
- Возврат обнуляет `cell_id`
- Прямое назначение через форму работает
- История использования показывает владельца
- Таблица админки корректно отображается

## [1.11.0] - 2026-10-01

### Добавлено

**Иерархия складов (этап 4):**
- **Страница деталей склада** `/admin/warehouses/:id`:
  - Информация о складе (название, адрес, описание, бейджи)
  - Кнопки "✏️ Редактировать" и "➕ Добавить зону"
  - **Дерево структуры**: Зоны → Стеллажи → Ячейки
  - Разворачивание / сворачивание (по клику или кнопкам "Развернуть всё" / "Свернуть всё")
  - Обновление структуры
- **CRUD для всех уровней иерархии**:
  - Зоны: создание, редактирование, удаление
  - Стеллажи: создание, редактирование, удаление
  - Ячейки: создание, редактирование, удаление
- **Просмотр ячейки** — модальное окно с:
  - Информацией о ячейке (вместимость, склад, зона, стеллаж)
  - Списком техники в ячейке
  - Цветными бейджами статусов
- **Кнопка "📦 Открыть"** в карточке склада — переход к деталям
- **Полный API** для иерархии (17 новых endpoints):
  - Зоны: `getZonesAPI`, `createZoneAPI`, `updateZoneAPI`, `deleteZoneAPI`
  - Стеллажи: `getRacksAPI`, `createRackAPI`, `updateRackAPI`, `deleteRackAPI`
  - Ячейки: `getCellsAPI`, `getCellAPI`, `getCellEquipmentAPI`, `createCellAPI`, `updateCellAPI`, `deleteCellAPI`

### Изменено
- `routes/warehouses.js`: расширен с 10 до **25 функций**
- `server.js`: добавлены 17 роутов для иерархии
- `public/js/warehouses.js`: кнопка "📦 Открыть" в карточке склада
- `views/admin-warehouse-details.html`: подключён новый CSS

### Файлы

**Новые:**
- `views/admin-warehouse-details.html` — страница деталей склада
- `public/css/warehouse-details.css` — стили дерева (609 строк)
- `public/js/warehouse-details.js` — логика дерева (30 функций)

**Изменённые:**
- `routes/warehouses.js`: +15 функций (зоны, стеллажи, ячейки, страница деталей)
- `server.js`: +17 роутов
- `public/js/warehouses.js`: кнопка "📦 Открыть"
- `public/css/warehouses.css`: стиль `<a>` в actions
- `package.json`: версия 1.11.0
- `CHANGELOG.md`: раздел [1.11.0]

### Проверено
- Страница деталей открывается
- Дерево отображается корректно
- Разворачивание / сворачивание работает
- CRUD для зон, стеллажей, ячеек работает
- Просмотр ячейки с техникой
- Никаких ошибок в консоли
- Все 30 функций JS на месте

## [1.10.0] - 2026-10-01

### Добавлено

**Склады и адресное хранение (этап 1):**
- **4 новые таблицы**:
  - `warehouses` — склады
  - `zones` — зоны внутри склада
  - `racks` — стеллажи внутри зоны
  - `cells` — ячейки внутри стеллажа
- **Поле `cell_id` в `equipment`** — ссылка на ячейку хранения
- **28 функций** в модуле `database/modules/warehouses.js`:
  - CRUD для всех 4 уровней иерархии
  - `getWarehouseTree` — дерево для UI
  - `moveEquipmentToCell` — перемещение с проверкой capacity
  - `getCellFullPath` — полный адрес
  - `getWarehouseStats` — статистика
- **Страница `/admin/warehouses`** — управление складами:
  - Карточки с иконкой, адресом, описанием
  - Счётчики: зоны, стеллажи, ячейки, техника
  - Бейджи: "⭐ По умолчанию", "✅ Активен" / "🚫 Неактивен"
  - CRUD через модальные окна
  - Установка склада по умолчанию (⭐)
  - Удаление с предупреждением о связанных данных
- **API** (10 endpoints):
  - `/api/admin/warehouses` — CRUD
  - `/api/admin/warehouses/:id/set-default`
  - `/api/admin/warehouses/tree`
  - `/api/admin/warehouses/stats`
- **Навигация**: кнопка "🏢 Склады" в админке и на дашборде

**Начальные данные (seed в migrate):**
- 2 склада: "Основной офис" (default) + "Удалённый офис"
- 3 зоны: A, B, Основная
- 4 стеллажа
- 17 ячеек с кодами (A-01-01, A-02-01, B-01-01, C-01-01...)

### Защита данных
- Нельзя удалить склад по умолчанию
- Нельзя удалить склад с зонами
- Нельзя удалить зону со стеллажами
- Нельзя удалить стеллаж с ячейками
- Нельзя удалить ячейку с техникой
- Проверка capacity при перемещении техники
- `ON DELETE CASCADE` для иерархии
- `ON DELETE SET NULL` для `equipment.cell_id`
- Транзакции при смене склада по умолчанию

### Файлы

**Новые:**
- `database/modules/warehouses.js` — 28 функций
- `routes/warehouses.js` — 10 функций
- `views/admin-warehouses.html` — страница
- `public/css/warehouses.css` — стили (384 строки)
- `public/js/warehouses.js` — логика (12 функций)

**Изменённые:**
- `database/db.js` — импорт модуля warehouses
- `scripts/migrate.js`:
  - +4 таблицы (warehouses, zones, racks, cells)
  - +поле cell_id в equipment
  - +9 индексов
  - функция `seedWarehouses` (полный seed)
  - обновлена итоговая статистика
- `server.js` — 10 роутов
- `views/admin.html` — кнопка "🏢 Склады"
- `views/dashboard.html` — quick-action
- `package.json` — версия 1.10.0

### Проверено
- Миграция проходит чисто
- Seed создаёт 2/3/4/17 элементов
- Все 28 функций модуля работают
- Страница открывается корректно
- CRUD работает
- Счётчики заполнены
- Всё через API


## [1.9.0] - 2026-09-22

### Добавлено
- **Интеграция справочника в формы техники**:
  - Форма создания `/admin/add`: селекты "Категория → Тип"
  - Форма редактирования `/admin/edit/:id`: те же селекты + предзаполнение
  - Динамическая загрузка типов при смене категории
  - Автосброс типа при смене категории
  - Валидация: категория и тип обязательны

- **Отображение категорий и типов в списках**:
  - `/equipment`: колонки "Категория" и "Тип" с бейджами
  - `/admin`: то же в таблице техники

- **Фильтры на странице `/equipment`** (для всех пользователей):
  - Фильтр по категории
  - Фильтр по типу (динамический)
  - Фильтр по статусу (через CSS-класс)
  - Кнопка "Сбросить"
  - Пустое состояние
  - Отдельные CSS/JS файлы

- **Статистика на дашборде**:
  - Блок "📚 Техника по категориям":
    - Список категорий с количеством и процентом
    - Цветные полосы-диаграммы
    - Клик → переход в справочник
  - Блок "🏷️ Техника без категории":
    - Список единиц без категории
    - Или "✅ Вся техника имеет категорию"

### Изменено
- `getAllEquipment` в `database/modules/equipment.js` — добавлены JOIN-ы для категорий и типов
- `addEquipmentAPI`, `updateEquipmentAPI` — принимают `category_id`, `type_id`
- `renderEditEquipment` — передаёт `category_id`, `type_id` в шаблон
- `routes/equipment.js` — рендер с фильтрами
- Дашборд-карточки: top-users выровнены через CSS Grid

### Добавлено в БД
- `getCategoryStats()` — статистика по категориям
- `getEquipmentWithoutCategory()` — техника без категории

### Файлы
- `public/css/equipment.css` — новый (стили страницы /equipment)
- `public/js/equipment-filter.js` — новый (логика фильтрации)
- `public/js/admin-add.js` — обновлён
- `public/js/admin-edit.js` — обновлён
- `views/admin-add.html`, `views/admin-edit.html` — обновлены
- `views/admin.html`, `views/equipment.html` — обновлены
- `views/dashboard.html` — новые блоки
- `public/css/dashboard.css` — стили статистики + grid-выравнивание

### Проверено
- Все формы работают со справочником
- Списки показывают категории и типы
- Фильтры на /equipment работают
- Дашборд показывает статистику по категориям
- seed корректно заполняет category_id и type_id

...

## [1.8.0] - 2026-09-22

### Добавлено
- **Справочник техники** — полная реализация:
  - Страница `/admin/catalog` с двумя панелями (категории + типы)
  - 8 категорий и 35 типов в начальных данных
  - CRUD категорий и типов через модальные окна
  - Защита от удаления: нельзя удалить категорию с типами,
    нельзя удалить тип с привязанной техникой
  - Фильтр типов по категории
  - Клик по категории/типу — фильтрация + подсветка

- **Таблица техники в справочнике**:
  - Автозагрузка при выборе категории или типа
  - Колонки: инв. номер, название, модель, статус, владелец, действия
  - **Поиск по 6 полям**: инв. номер, название, модель, серийный номер,
    ФИО владельца, логин владельца
  - Кнопка "🔍 Найти" + Enter для запуска поиска
  - Кнопка "✕" + Escape для сброса
  - Пагинация по 20 записей
  - Кнопки действий: 👁️ (карточка техники) и ✏️ (редактирование)
  - Счётчики техники по категориям и типам

- **Карточка техники** (модальное окно):
  - Полная информация (модель, производитель, S/N, гарантия)
  - Категория и тип
  - Текущий владелец с аватаром
  - История использования с пользователями

- **API** (15 endpoints):
  - CRUD категорий (6 endpoints)
  - CRUD типов (6 endpoints)
  - Фильтр техники `GET /api/admin/equipment/filtered`
  - Счётчики `GET /api/admin/equipment/counts`

### Изменено
- `getEquipmentWithUsers` в `database/modules/equipment.js`:
  - Поддержка фильтров `category_id`, `type_id`, `search`
  - Поддержка пагинации (`limit`, `offset`)
  - Опциональный `include_total` для счётчика
  - Поиск теперь ищет и по владельцу
  - Обратная совместимость: без аргументов — массив

- `views/admin.html`: добавлена кнопка "📚 Справочник" в шапке
- `views/dashboard.html`: добавлена quick-action "Справочник"
- `views/admin-catalog.html`: 
  - Убрана передача данных через `window.categoriesData`
  - Данные загружаются через API (fetch)
  - Добавлена секция таблицы техники

### Технические детали
- Поиск в таблице: debounce убран, вместо него — кнопка "Найти"
- Данные загружаются через `fetch` — меньше проблем с IDE
- Модалки закрываются по Escape и клику на оверлей
- Адаптивность на 992px и 640px
- Прогрессивная загрузка с индикатором

### Файлы
- `routes/catalog.js` — новый (15 функций)
- `views/admin-catalog.html` — новый
- `public/css/catalog.css` — новый (770 строк)
- `public/js/catalog.js` — новый (27 функций)
- `database/modules/equipment.js` — расширено
- `server.js` — подключены роуты
- `views/admin.html`, `views/dashboard.html` — ссылки


## [1.7.1] - 2026-09-22

### Изменено
- **Рефакторинг `database/db.js`** — разбит на 9 модулей:
  - `modules/users.js` — CRUD пользователей
  - `modules/equipment.js` — техника + назначения
  - `modules/catalog.js` — категории и типы
  - `modules/auth.js` — пароли, роли, сессии
  - `modules/profile.js` — личный кабинет
  - `modules/logs.js` — логи активности
  - `modules/dashboard.js` — дашборд
  - `modules/stats.js` — общая статистика
  - `modules/meta.js` — app_meta
- `db.js` теперь **~110 строк** вместо ~1500
- Все функции разбиты по доменам, легко найти нужную

### Удалено
- 14 функций мёртвого кода:
  - `initDatabase`, `insertTestData` (заменены на `migrate.js` и `seed.js`)
  - `getUserByUsername`, `addUser`, `updateUser`, `deleteUser`
  - `getUsersWithActiveEquipment`, `getEquipmentByInventory`
  - `returnEquipment`, `getUserEquipment`
  - `getUserByEmailWithPassword`, `getAvailableEquipment`
  - `setUserRole`, `checkDataIntegrity`

### Исправлено
- `server.js`: убран вызов `initDatabase()` (заменён на `migrate.js`)
- Добавлена проверка подключения к БД с понятным сообщением

### Добавлено
- `.gitignore`: правила для бэкапов (`*.backup`, `*.bak`, `*.old`)
- Единый стиль JSDoc во всех модулях

## [1.7.0] - 2026-09-22
...
## [1.6.0] - 2026-09-21

### Добавлено
- **Скрипт seed** для заполнения БД тестовыми данными:
  - 16 пользователей (2 админа + 14 обычных)
  - 40 единиц техники разных категорий
  - ~24 активных назначений + ~15 возвращённых
  - 150 записей логов активности
  - `npm run seed` — заполнить
  - `npm run seed -- --force` — перезаписать
  - `npm run setup` — миграция + заполнение
- **API `/api/version`** — публичный эндпоинт версии
- **Централизованная версия** — только в package.json
- **Футер на всех страницах** через `<div id="footer-container">`
- **Таблица `app_meta`** — служебные данные (версия БД)
- **Синхронизация сессий с БД** — `syncSession` middleware

### Безопасность
- Проверка существования пользователя на каждом запросе
- Проверка активности, роли, логина
- Проверка версии БД (защита от seed --force с активной сессией)
- Очистка файла `sessions.db` при seed --force

### Исправлено
- Дашборд: список просроченной гарантии (было только число)
- Профиль: кнопки "Дашборд" и "Админ-панель" для админа
- Страница смены пароля: карточка текущего пользователя

### Изменено
- `middleware/auth.js`: `syncSession` + `destroySession`
- `routes/auth.js`: сохранение `dbVersion` при логине
- `public/js/footer.js`: загрузка версии с сервера
- `views/profile.html`: `data-is-admin` + `adminLinks`

...

## [1.5.5] - 2026-09-21

### Добавлено
- **Скрипт seed** (`scripts/seed.js`) — заполняет БД тестовыми данными:
  - 16 пользователей (2 админа + 14 обычных)
  - 40 единиц техники (разные категории)
  - ~24 активных назначения
  - ~15 возвращённых (история)
  - 150 записей логов
- **npm run seed** — заполнить БД
- **npm run seed -- --force** — перезаписать данные
- **npm run setup** — миграция + заполнение одной командой

### Изменено
- package.json: добавлен скрипт `seed`, обновлён `setup`
- README.md: инструкция по быстрому старту

### Как использовать
bash
# Первый запуск (структура + данные)
npm run setup

# Только заполнить данными
npm run seed

# Перезаписать всё
npm run seed -- --force

...

## [1.5.4] - 2026-09-21

### Добавлено
- **Футер на дашборде** — теперь отображается на всех страницах проекта
- **API `/api/version`** — публичный эндпоинт для получения актуальной версии
- **Централизованное управление версией** — версия хранится только в `package.json`

### Изменено
- `footer.js` — загружает версию с сервера, кеширует
- Все HTML-шаблоны — используется `<div id="footer-container"></div>` вместо статичного `.help-footer`
- `views/dashboard.html` — добавлен футер + подключён `help.css`

### Как обновлять версию
1. Изменить поле `version` в `package.json`
2. Перезапустить сервер
3. Все страницы автоматически показывают новую версию

## [1.5.2] - 2026-09-21
...

## [1.5.2] - 2026-09-21

### Исправлено
- **Дашборд, раздел "Требует внимания"**: список техники с истёкшей
  гарантией теперь отображается (раньше было только число)
- **Профиль админа**: добавлены кнопки "Дашборд" и "Админ-панель"
  для быстрого возврата в административный раздел
- Роль передаётся через `data-is-admin` атрибут (без inline-скрипта) —
  устранено предупреждение IDE "property assignment detected"

### Изменено
- `getEquipmentNeedingAttention` возвращает массив `warrantyExpired`
  вместо числа `warrantyExpiredCount`
- `routes/dashboard.js` — рендер списка с днями просрочки
- `views/profile.html` — атрибут `data-is-admin` на контейнере
- `public/js/profile.js` — чтение роли из data-атрибута

## [1.5.1] - 2026-09-21
**Дашборд как главная для админов**
- Новая страница `/` — дашборд (только админы)
- Статистика, график активности, последние действия
- Раздел "Требует внимания"
- Топ-5 активных пользователей
- Удалена старая главная
...

## [1.4.5] - 2026-09-18

### Добавлено
- **Карточка просмотра техники** (кнопка 👁️ в таблице админ-панели):
  - Заголовок с иконкой, названием, инв. номером и статусом
  - Статистика: назначено / всего выдач / возвращено
  - Полная информация о технике
  - Текущий владелец с аватаром
  - История использования с пользователями
- **Колонка "Назначена"** в таблице техники — показывает пользователя
- **Улучшенная карточка пользователя**:
  - Красивый заголовок с аватаром и градиентом
  - Сетка контактов
  - Карточки активной техники
  - Таблица истории

### Исправлено
- `assignEquipment` не закрывал предыдущее назначение при переназначении
- `getInitials is not defined` — функция добавлена в клиентский JS
- `assignmentResult is not defined` — переменная объявлена в API
- История техники показывала `undefined` в поле "Пользователь"
- Сортировка истории техники работала некорректно при сбоях системного времени

### Изменено
- `getEquipmentHistory` — сортировка по `id DESC` (устойчива к сбоям часов)
- Маркер ⚠️ для аномальных дат (returned_date < assigned_date)
- Убрана колонка "Производитель" из таблицы техники (менее важна)

### Новые файлы
- `scripts/fix-double-assignments.js` — очистка дубликатов
- `scripts/normalize-dates.js` — нормализация форматов дат

## [1.4.2] - 2026-09-18

### Добавлено
- **Таблица техники**: колонка "Назначена" — показывает пользователя,
  которому выдана техника (аватар + ФИО + отдел)
- **Карточка пользователя**: красивое модальное окно с:
  - Заголовком с аватаром и градиентом
  - Статистикой (активная / всего / возвращено)
  - Контактной информацией в сетке
  - Карточками активной техники
  - Компактной таблицей истории

### Исправлено
- **ReferenceError: getInitials is not defined** — функция была
  определена только в `routes/admin.js` (сервер), но использовалась
  в `public/js/admin.js` (клиент). Добавлена в клиентский файл.

### Изменено
- Убрана колонка "Производитель" из таблицы техники (менее важна)
- Расширен API `/api/admin/users/:id/details` — добавлена статистика
- Улучшена адаптивность модальных окон

## [1.4.1] - 2026-09-18

### Исправлено
- **Двойное назначение техники**: при переназначении техники другому пользователю
  старое назначение не закрывалось, из-за чего техника отображалась у двух пользователей
  одновременно
- **`assignmentResult is not defined`**: переменная не была объявлена в updateEquipmentAPI

### Добавлено
- Автоматическое закрытие предыдущего назначения при переназначении
- Логирование операций назначения и возврата техники
- Скрипт `scripts/fix-double-assignments.js` для очистки существующих дубликатов
- npm-скрипт `npm run fix-assignments`

### Изменено
- `assignEquipment` в `database/db.js` — добавлена проверка активных назначений
- `updateEquipmentAPI` в `routes/admin.js` — полная переработка логики смены статусов

## [1.4.0] - 2026-09-18
...
# История изменений

## [1.3.1] - 2026-07-03

### Добавлено
- Универсальный футер с ссылками на инструкции и помощь на всех страницах
- Красивое модальное окно со справкой
- Отдельные CSS и JS файлы для главной страницы
- Анимации при открытии модального окна

### Изменено
- Реорганизована главная страница
- Справочные материалы вынесены в отдельный блок
- Улучшена визуальная иерархия
- Код разделен на логические компоненты

### Исправлено
- Унифицирован стиль кнопок на всех страницах
- Исправлены мелкие баги в адаптивности

## [1.3.0] - 2026-07-01

### Добавлено
- Возможность назначать технику пользователю при редактировании
- Автоматический возврат техники при смене статуса
- Выбор пользователя из списка при назначении
- Интерактивные подсказки при смене статуса
- Подробное логирование всех операций

### Исправлено
- Ошибка "Техника не найдена" при изменении статуса
- Проблема с передачей ID при редактировании
- Корректная обработка статусов техники

## [1.2.0] - 2026-07-01

### Добавлено
- Полноценная админ-панель
- Управление пользователями (CRUD)
- Вкладки для переключения между разделами
- Статистика на главной странице админки

### Изменено
- Рефакторинг структуры проекта
- Разделение CSS и JS на отдельные файлы

## [1.1.0] - 2026-07-01

### Добавлено
- Страница учета пользователей
- Отображение техники у пользователей
- Поиск по таблицам

## [1.0.0] - 2026-07-01

### Добавлено
- Базовая структура проекта
- SQLite база данных
- Управление техникой
- PDF инструкции
- Главная страница с навигацией