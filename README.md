# CityWatch 🇿🇲 - Citizen Reporting Platform

CityWatch is a real-time civic engagement platform designed for Zambia. It empowers citizens to report public issues (sanitation, infrastructure, traffic, water) directly to community leaders and track the resolution status in real-time.

## ✨ Key Features

- **📍 Geolocation Tagging**: Reports automatically include location data.
- **📸 Photo Evidence**: Integration with Cloudinary for secure image uploads.
- **🌗 Dark/Light Mode**: Fully responsive theme toggle (System, Dark, Light) for better accessibility.
- **⚡ Real-Time Updates**: Powered by **Socket.io**, new reports and status changes appear instantly without refreshing.
- **👍 Community Validation**: Upvote system ("Verify") to highlight urgent issues.
- **🚦 Status Tracking**: Admins can update status (Open → In Progress → Resolved) with color-coded badges.

## 🛠️ Tech Stack

**MERN Stack + Real-time capabilities**

- **Frontend**: React (Vite), CSS Variables (Theming), Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Atlas)
- **Real-Time**: Socket.io
- **Storage**: Cloudinary (Image hosting)
- **Authentication**: JWT (JSON Web Tokens)

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Connection URI
- Cloudinary Account (for images)

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/Maliseni1/citywatch.git](https://github.com/your-username/citywatch.git)
   cd citywatch-zambia

*Install Server Dependencies*
Bash

    cd server
    npm install

*Install Client Dependencies*
Bash

    cd ../client
    npm install

**🔐 Environment Variables**

Create a .env file in the root folder:
Code snippet

    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key

Create a .env file in the client folder:
Code snippet

VITE_API_URL=http://localhost:5000

**🏃‍♂️ Running the App**

    Start the Backend (Terminal 1, in the root folder)
    Bash

    cd ..
    npm run dev

    Start the Frontend (Terminal 2)
    Bash

    cd client
    npm run dev

**📱 Usage**

    Register/Login to start reporting.

    Click "Report Incident", fill in the details, and upload a photo.

    Watch the feed update automatically!

    Switch themes using the Menu (☰) button.

**🤝 Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.