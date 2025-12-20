# Project Structure

```text
Project Structure
├── .gitignore
├── AI_INSTRUCTIONS.md
├── LICENSE
├── README.md
├── tree-md.ps1
├── client/
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── public/
│   │   └── vite.svg
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── metadata.json
│       ├── assets/
│       │   └── react.svg
│       ├── components/
│       │   ├── Admin.jsx
│       │   ├── AuthForm.jsx
│       │   ├── Button.jsx
│       │   ├── CollectionManager.jsx
│       │   ├── Input.jsx
│       │   ├── JobsHistory.jsx
│       │   ├── Layout.jsx
│       │   ├── Navbar.jsx
│       │   ├── Scheduler.jsx
│       │   ├── collections/
│       │   │   ├── CollectionForm.jsx
│       │   │   └── CollectionList.jsx
│       │   ├── common/
│       │   │   └── StatusBadge.jsx
│       │   ├── History/
│       │   │   ├── HistoryStats.jsx
│       │   │   └── HistoryTable.jsx
│       │   └── Scheduler/
│       │       ├── RecurringRulesList.jsx
│       │       └── ScheduleForm.jsx
│       ├── context/
│       │   ├── CollectionContext.jsx
│       │   └── ScheduleContext.jsx
│       ├── hooks/
│       │   └── useJobHistory.js
│       ├── lib/
│       │   ├── api.js
│       │   ├── auth-client.js
│       │   ├── logger.js
│       │   └── schemas.js
│       └── services/
│           ├── collectionService.js
│           ├── groupService.js
│           └── scheduleService.js
├── docs/
│   ├── dragonfly-db.md
│   ├── maintainence.md
│   ├── pm2.md
│   ├── project-structure.md
│   ├── server.md
│   └── ssh-setup.md
└── server/
    ├── .env
    ├── app.db
    ├── app.db-shm
    ├── app.db-wal
    ├── docker-compose.yml
    ├── ecosystem.config.cjs
    ├── jsconfig.json
    ├── nodemon.json
    ├── package.json
    ├── package-lock.json
    └── src/
        ├── app.js
        ├── bin/
        │   ├── server.js
        │   └── worker.js
        ├── config/
        │   └── index.js
        ├── controllers/
        │   ├── collection.controller.js
        │   ├── group.controller.js
        │   ├── schedule.controller.js
        │   └── system.controller.js
        ├── db/
        │   ├── collection.dao.js
        │   ├── index.js
        │   └── schedule.dao.js
        ├── lib/
        │   ├── auth.js
        │   ├── date-utils.js
        │   ├── logger.js
        │   ├── queue-dashboard.js
        │   ├── status.bridge.js
        │   ├── errors/
        │   │   └── AppError.js
        │   └── validation/
        │       ├── collection.schema.js
        │       ├── registration.schema.js
        │       └── schedule.schema.js
        ├── middleware/
        │   ├── auth.middleware.js
        │   ├── error.middleware.js
        │   └── requestLogger.js
        ├── queues/
        │   ├── connection.js
        │   ├── whatsapp.queue.js
        │   └── whatsapp.worker.js
        ├── routes/
        │   ├── schedule.routes.js
        │   └── system.routes.js
        ├── services/
        │   ├── collection.service.js
        │   ├── group.service.js
        │   ├── schedule.service.js
        │   ├── scheduler.service.js
        │   └── whatsapp.service.js
        ├── types/
        │   └── enums.js
        └── utils/
            └── asyncHandler.js
```

Controllers: Use asyncHandler and do not manually send error responses.

Middleware: Uses asyncHandler and AppError.

Services: Throw AppError for logic failures (4xx) and standard Error for system failures (5xx).

Global Handler: Catches everything and returns the JSON format the frontend expects.
