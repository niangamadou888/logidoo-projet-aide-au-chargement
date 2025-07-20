# Logidoo

This repository contains a **MEAN** (MongoDB, Express, Angular, Node.js) application split into two main directories:

```
root/
├── backend/      # API server (Node.js, Express, MongoDB)
└── front-end/    # Single Page App (Angular)
```

---

## 🚀 Project Overview

* **Backend**: RESTful API built with **Express** and **Mongoose**, connecting to MongoDB for data persistence.
* **Frontend**: Angular application using **Angular Universal** for optional SSR, communicating with the backend via a proxy.

---

## 📋 Prerequisites

* Node.js v14+ and npm
* MongoDB instance (local or cloud)
* Angular CLI (`npm install -g @angular/cli`)

---

## 🗂 Directory Structure

```
backend/
├── .env                # Environment variables (MONGO_URI, PORT)
├── server.js           # Entry point for Express server
├── package.json        # Backend dependencies & scripts
└── src/                # Models, routes, controllers

front-end/
├── proxy.conf.json     # Proxy for API calls
├── src/                # Angular source code (app/, assets/, etc.)
├── server.ts           # SSR entry (if using Angular Universal)
├── package.json        # Frontend dependencies & scripts
└── angular.json        # Angular CLI configuration
```

---

## 🛠️ Backend Setup

1. Navigate to the backend folder:

   ```bash
   cd backend
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Create a `.env` file with:

   ```env
   MONGO_URI=mongodb://localhost:27017/your_db_name
   PORT=3000
   ```
4. Run in development mode:

   ```bash
   npm run dev       # uses nodemon
   ```
5. Available scripts in `package.json`:

   * `start`: Runs `node server.js`
   * `dev`: Runs `nodemon server.js`

---

## 🎨 Frontend Setup

1. Navigate to the front-end folder:

   ```bash
   cd front-end
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Run the development server with proxy to backend:

   ```bash
   npm start         # uses ng serve --proxy-config proxy.conf.json
   ```
4. Available scripts in `package.json`:

   * `start`: `ng serve --proxy-config proxy.conf.json`
   * `build`: Production build
   * `build:ssr`: Build both browser and server bundles
   * `serve:ssr`: Serve the SSR bundle on Node.js

---

## 🌐 Server-Side Rendering (SSR)

This project supports SSR via Angular Universal:

1. Generate SSR setup (already included) via `@nguniversal/express-engine`.
2. Build SSR bundles:

   ```bash
   npm run build:ssr
   ```
3. Serve SSR:

   ```bash
   npm run serve:ssr
   ```
4. By default, SSR runs on port `4000` (configurable in server.ts).

---

## ▶️ Running the Full Stack Locally

1. Start MongoDB.
2. In one terminal:

   ```bash
   cd backend
   npm run dev
   ```
3. In a second terminal:

   ```bash
   cd front-end
   npm start
   ```
4. Open your browser at `http://localhost:4200`.

---

## 📦 Deployment

* **Backend**: Deploy to any Node.js host (Heroku, AWS, DigitalOcean) with environment variables set.
* **Frontend (Static)**: Build with `ng build --prod` and serve via CDN or static host (Netlify, Vercel).
* **SSR**: Deploy both bundles together via Node.js host.

---

## 🤝 Contributing

1. Fork this repository.
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add some feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
