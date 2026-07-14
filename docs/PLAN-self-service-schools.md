# План перехода Karpix Skool к самостоятельному запуску школ

## 1. Цель

Новый владелец должен без участия суперадмина:

1. войти через Telegram;
2. создать школу или принять приглашение владельца;
3. активировать пробный или вручную оплаченный тариф;
4. заполнить профиль школы;
5. подключить Telegram-группу;
6. создать и опубликовать курс и урок;
7. проверить школу в режиме ученика;
8. пригласить первых учеников.

Суперадмин наблюдает воронку, меняет тариф и срок доступа, помогает при ошибках и блокирует школу. Первая коммерческая версия остается Karpix-branded: один общий бот, ручное подтверждение оплаты и фиксированные лимиты.

## 2. Границы первой версии

### Входит в v1

- самостоятельное создание школы и owner claim;
- безопасная изоляция школ;
- доступ владельца к профилю, Telegram и команде;
- пробный период и ручная активация фиксированного тарифа;
- лимиты на учеников, курсы, хранилище и AI-операции;
- режим read-only после окончания доступа;
- мастер запуска и серверный статус его шагов;
- реальная воронка школ в суперадминке;
- offsite-бэкап, восстановление, мониторинг и канал поддержки;
- базовые коммерческие документы.

### Не входит в v1

- отдельный Telegram-бот для каждой школы;
- кастомный домен и полный white-label;
- автоматический эквайринг, возвраты и рекуррентные платежи;
- оплата за каждый AI-токен;
- кастомный конструктор ролей;
- корпоративные SSO, SLA и отдельная инфраструктура на клиента;
- полноценная внутренняя социальная сеть вместо Telegram.

## 3. Целевые состояния школы

Жизненный цикл должен быть явным и проверяться backend:

`draft -> trialing -> active -> past_due -> suspended -> canceled`

- `draft`: школа создана, но owner/setup не завершены;
- `trialing`: работает пробный период с лимитами;
- `active`: ручная оплата подтверждена суперадмином;
- `past_due`: ученики видят экран оплаты, владелец работает read-only;
- `suspended`: доступ остановлен суперадмином;
- `canceled`: школа закрыта, данные хранятся по политике retention.

Удаление не должно быть мгновенным hard-delete из UI. Сначала архивирование, экспорт и период восстановления.

## 4. Потоки реализации

### Поток A — tenant security и права

Владение: `backend/app/services/tenant_access.py`, `backend/app/utils/security.py`, `backend/app/utils/tenant.py`, затронутые routes и security-тесты.

Задачи:

- убрать выбор первой школы при отсутствии tenant context;
- требовать deep-link, явный выбор школы или существующее membership;
- закрыть `/webapp/me?tenant_id=...` без membership;
- при передаче школы атомарно отозвать старую owner membership;
- демотировать удаленных Telegram-администраторов;
- разделить права owner, admin и student;
- разрешить owner управлять настройками и командой своей школы;
- запретить admin менять владельца, тариф и критические настройки;
- добавить audit events для ролей, команды, публикаций и настроек;
- отказаться от reusable legacy setup code после миграционного периода.

Приемка:

- пользователь школы A не получает данные школы B ни через один проверяемый route;
- бывший owner и удаленный Telegram-admin теряют управление немедленно;
- owner управляет своей школой, но не чужими школами и не тарифом;
- все отрицательные сценарии покрыты backend-тестами.

### Поток B — тарифы, entitlement и лимиты

Владение: новые небольшие domain-модули для plan/entitlement/usage, модели и миграции; существующий payment webhook не расширять монолитно.

Минимальные сущности:

- `Plan`: код, название, фиксированные лимиты;
- `TenantSubscription`: plan, status, trial/paid periods, источник активации;
- `TenantUsage`: ученики, курсы, storage, AI jobs за период;
- `SubscriptionEvent`: кто и почему изменил состояние;
- durable `PaymentEvent` оставить для будущего эквайринга.

Задачи:

- единый entitlement service для student, admin, uploads и AI;
- trial создается по серверным правилам, а не из frontend;
- `past_due/expired` блокирует новые расходы до вызова AI-провайдера;
- admin получает read-only, но может экспортировать данные и открыть оплату;
- фиксированные квоты проверяются backend;
- суперадмин вручную назначает план, срок и причину изменения;
- состояние подписки валидируется enum/state machine.

Приемка:

- изменение статуса действует на все поверхности без рассинхронизации;
- ни один запрещенный AI-запрос не достигает внешнего провайдера;
- лимиты нельзя обойти прямым API-запросом;
- повторная ручная активация идемпотентна и журналируется.

### Поток C — onboarding владельца

Владение: `frontend-webapp/src/pages/admin`, routing/navigation, небольшие onboarding-компоненты и hooks; backend-контракт согласуется с потоками A и B.

Экраны мастера:

1. создание/получение школы;
2. профиль: название, описание, логотип, accent color, support contact;
3. тариф: trial или инструкция по ручной оплате;
4. подключение Telegram-группы;
5. создание первого курса;
6. проверка опубликованного урока;
7. test-as-student;
8. приглашение учеников и завершение запуска.

Задачи:

- открыть owner маршруты `/settings` и `/team` по реальным permissions;
- заменить локальный чек-лист серверным readiness endpoint;
- показывать выполненные шаги после повторного входа и на другом устройстве;
- добавить recovery для просроченного setup token и неверно подключенной группы;
- дать явный support action, а не текст «напишите саппорту»;
- не считать школу запущенной без опубликованного урока и тестового входа.

Приемка:

- новый owner проходит happy path без суперадмина;
- refresh/relogin не сбрасывает прогресс;
- каждый сбой дает понятное действие восстановления;
- мобильный Telegram WebApp проходит отдельный E2E smoke test.

### Поток D — суперадминская операционная панель

Владение: `frontend-webapp/src/pages/super-admin` и отдельные superadmin API/service-модули.

Задачи:

- мастер «Новая школа»: название, владелец, token, copy/send, claim status;
- таблица воронки: lead, registered, tenant_created, group_connected, lesson_published, first_student;
- owner, тариф, срок, usage, last activity, ошибки и readiness на карточке школы;
- resend/rotate/revoke приглашения;
- ручная активация тарифа с причиной и audit trail;
- реальные health/activity данные;
- удалить fake uptime, fake activity и неработающую broadcast-кнопку;
- безопасный режим поддержки без выдачи постоянных прав суперадмина владельцу.

Приемка:

- суперадмин видит точное место остановки клиента;
- любой статус подтверждается серверными событиями;
- операции изменения доступа требуют подтверждения и журналируются;
- в интерфейсе нет фиктивных данных или неработающих действий.

### Поток E — надежность, поддержка и legal

Владение: deployment/runbooks/monitoring/backup scripts; юридические тексты проходят проверку человеком.

Задачи:

- encrypted offsite Postgres backups и отдельная политика для object storage;
- restore script и регулярный restore drill на чистом окружении;
- определить RPO/RTO для пилота;
- Sentry release/environment/tenant context без утечки персональных данных;
- алерты: API, DB, Redis, bot, worker queue, onboarding failures, AI provider failures;
- staging, smoke, rollback и migration runbooks;
- канал поддержки с ожидаемым временем ответа;
- оферта, privacy policy, consent, refund/cancellation, retention/deletion/export и DPA.

Приемка:

- восстановление подтверждено, а не только описано;
- критичный сбой создает реальное уведомление;
- release можно откатить по инструкции;
- юридические документы указывают оператора, контакты, процессоры и права клиента.

### Поток F — QA и коммерческая приемка

Владение: новые test helpers/fixtures и E2E-сценарии; production-код меняется только через владельца соответствующего потока.

Матрица:

- школа A / школа B;
- owner / admin / student / anonymous / superadmin;
- active / trialing / past_due / suspended / expired;
- API / webapp / bot / worker / AI / uploads;
- create / read / update / delete / publish / invite / export.

Обязательные сценарии:

- полная регистрация новой школы;
- owner claim и повторное использование token;
- owner transfer и отзыв старых прав;
- Telegram admin removal;
- чужой `tenant_id` во всех критичных routes;
- окончание trial во время открытой сессии;
- лимит AI до обращения к провайдеру;
- test-as-student и первый реальный student join;
- backup restore smoke test.

## 5. Порядок выполнения

### Фаза 0 — продуктовые решения

До кода зафиксировать:

- общий Karpix-бот в v1;
- состав тарифов и точные лимиты;
- длительность trial;
- поведение read-only и retention;
- кто может приглашать admin;
- канал и часы поддержки;
- критерий «школа запущена».

### Фаза 1 — security foundation

Параллельно:

- A: tenant isolation, owner transfer, permissions;
- B: subscription domain и общий entitlement contract;
- E: backup/restore foundation.

Gate: security regression suite и Antigravity review.

### Фаза 2 — основной self-service путь

После стабилизации API:

- C: owner onboarding и settings/team;
- D: superadmin invite и onboarding funnel;
- B: quotas/read-only enforcement во всех сервисах.

Gate: новый owner запускает школу на staging без ручного исправления данных.

### Фаза 3 — коммерческая эксплуатация

- D: activity/health/support operations;
- E: alerting, legal, release/rollback;
- F: полная cross-tenant и lifecycle матрица.

Gate: три последовательных тестовых запуска школ проходят без вмешательства разработчика.

### Фаза 4 — закрытый пилот

- подключить 3–5 школ;
- измерять время до первой публикации и первого ученика;
- фиксировать каждый запрос помощи как onboarding defect;
- не расширять функциональность до закрытия повторяющихся блокеров.

Gate: не менее 80% владельцев завершают базовый запуск без ручной технической настройки.

## 6. Команда субагентов

Одновременно работают максимум три пишущих субагента плюс root-интегратор. Полная команда используется волнами, а не запускается вся сразу.

### Root — оркестратор и интегратор

- владеет контрактами между потоками;
- раздает непересекающиеся file scopes;
- проверяет каждый diff, миграции и обратную совместимость;
- запускает общие тесты и принимает итоговые решения;
- один делает commits/push после интеграции.

### `tenant_security_agent`

- tenant context, authorization, roles, owner transfer;
- Telegram admin revocation вместе с четко согласованным service scope;
- негативные backend-тесты своей области.

### `subscription_agent`

- plan/subscription/usage models и migrations;
- entitlement service, expiry/read-only и AI guards;
- ручная активация и audit events.

### `owner_onboarding_agent`

- owner routes/navigation, wizard, readiness UI;
- settings/team/profile UX;
- frontend tests без изменения backend authorization.

### `superadmin_agent`

- invite wizard, funnel, plan/status operations;
- real activity/health UI;
- удаление фиктивных контролов.

### `ops_agent`

- backup/restore, monitoring, alerts, runbooks и staging smoke;
- не меняет product routes.

### `qa_isolation_agent`

- независимая cross-tenant/lifecycle test matrix;
- E2E happy path и failure recovery;
- не исправляет найденные дефекты, а возвращает их владельцу потока.

### Antigravity — независимый reviewer

Antigravity работает только в `--mode plan` и не пишет код:

- архитектурный review перед Фазой 1;
- review authorization и entitlement после Фазы 1;
- review onboarding/API consistency после Фазы 2;
- финальный release-readiness review перед пилотом.

Root принимает или отклоняет его рекомендации на основании реального кода и тестов.

## 7. Правила параллельной работы

- один файл имеет только одного владельца в текущей волне;
- backend-контракт утверждается до frontend-интеграции;
- migrations создаются только `subscription_agent` или назначенным root владельцем;
- общий `models.py` и центральные access helpers не редактируются параллельно;
- QA не вносит скрытые исправления;
- Antigravity не получает write ownership;
- после каждой волны: targeted tests, полный backend/frontend suite, build, migration smoke и diff review.

## 8. Финальный коммерческий gate

Запуск разрешен, когда одновременно выполнено:

- нет известных cross-tenant утечек;
- owner самостоятельно проходит весь onboarding;
- чужой, просроченный и отозванный доступ блокируется backend;
- AI и uploads соблюдают entitlement и лимиты;
- суперадмин видит реальную воронку и может помочь клиенту;
- нет фиктивных операционных данных;
- backup восстановлен на чистой среде за согласованное RTO;
- мониторинг реально доставляет алерты;
- support и legal опубликованы;
- 3 тестовые школы подряд запущены без ручного изменения БД;
- полный backend suite, frontend suite и production build проходят.
