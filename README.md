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
├── LICENSE
├── README.md
├── tree-md.ps1
├── client/
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
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
│       │   ├── AuthForm.jsx
│       │   ├── Button.jsx
│       │   ├── Input.jsx
│       │   └── Scheduler.jsx
│       ├── lib/
│       │   └── auth-client.js
│       └── services/
│           └── scheduleService.js
└── server/
    ├── .env
    ├── app.db
    ├── app.db-shm
    ├── app.db-wal
    ├── auth.js
    ├── config.js
    ├── nodemon.json
    ├── package.json
    ├── package-lock.json
    ├── server.js