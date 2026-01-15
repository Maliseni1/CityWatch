# 🏙️ CityWatch - Crowd-Sourced Incident Reporter

**CityWatch** is a full-stack real-time application that allows communities to report local issues (like potholes, broken streetlights, or fires) and track them on a live feed.

Built as part of the **Full-Stack Development Internship at Codveda**.

![MERN Stack](https://img.shields.io/badge/MERN-Stack-green) ![Status](https://img.shields.io/badge/Status-Completed-blue)

---

## 🚀 Features

* **Real-Time Updates:** New incidents appear instantly on all connected clients using **Socket.io** (no page refresh needed).
* **User Authentication:** Secure Login and Registration system using **JWT (JSON Web Tokens)**.
* **Incident Reporting:** Users can post titles, descriptions, and locations of incidents.
* **Live Dashboard:** View all reported incidents with their status (Open/Resolved).
* **Responsive UI:** Clean, modern interface built with **React** and **CSS Flexbox**.

---

## 🛠️ Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React.js (Vite), Axios, Socket.io-Client, CSS3 |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Real-Time** | Socket.io |
| **Authentication** | JWT, Bcrypt.js |

---

## 📂 Project Structure

This project follows a Monorepo structure:

```bash
CityWatch/
├── client/           # React Frontend Application
│   ├── src/
│   │   ├── App.jsx   # Main Logic (Auth + Real-time Sockets)
│   │   └── App.css   # Styling
├── models/           # Mongoose Database Models (User, Incident)
├── routes/           # Express API Routes
├── server.js         # Backend Entry Point (Express + Socket.io)
└── .env              # Environment Variables (Not included in repo)


⚙️ How to Run Locally

Follow these steps to set up the project on your machine.
1. Clone the Repository
Bash

git clone [https://github.com/Maliseni1/CityWatch.git](https://github.com/Maliseni1/CityWatch.git)
cd CityWatch

2. Setup Backend

Install server dependencies and start the backend.
Bash

# Install dependencies
npm install

# Create a .env file in the root directory and add:
# MONGO_URI=mongodb://localhost:27017/citywatch
# PORT=5000
# JWT_SECRET=your_secret_key

# Start the server
Bash
npx nodemon server.js

3. Setup Frontend

Open a new terminal, navigate to the client folder, and start React.
Bash

cd client
npm install
npm run dev

Visit http://localhost:5173 in your browser.


📝 Internship Tasks Completed

This project satisfies 3 Tasks across all levels of the Codveda Internship Task List:

    ✅ Level 1 (Basic): Built a REST API with Node.js/Express & MongoDB CRUD operations.

    ✅ Level 2 (Intermediate): Created a Frontend with React and implemented JWT Authentication.

    ✅ Level 3 (Advanced): Implemented WebSockets for real-time bidirectional communication.



📬 Contact

Developer: [MALISENI CHAVULA]

Internship: Codveda Full-Stack Development

LinkedIn: [https://www.linkedin.com/in/maliseni-chavula-b162953a0]