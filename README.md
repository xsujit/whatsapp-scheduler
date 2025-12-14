# whatsapp-scheduler
Schedule messages on WhatsApp

# Client
npm i
npm run build
rm -rf node_modules
npm install --omit=dev

# Server
npx @better-auth/cli@latest migrate
npm install --omit=dev
npm run start

# Project Structure
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
│       │   ├── auth-client.js
│       │   └── schemas.js
│       └── services/
│           ├── collectionService.js
│           ├── groupService.js
│           └── scheduleService.js
├── docs/
│   ├── dragonfly-db.md
│   ├── pm2.md
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
        │   ├── validation.js
        │   └── validation/
        │       ├── collection.schema.js
        │       └── schedule.schema.js
        ├── middleware/
        │   └── auth.middleware.js
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
        └── types/
            └── enums.js
# Upcoming features
View In memory schedules
Automated Scheduled Message