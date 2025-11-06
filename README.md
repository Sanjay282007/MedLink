# 🩺 MedLink — Smart Medicine Tracker

**MedLink** is a modern, responsive web application that helps users manage their daily medicines, prescriptions, reminders, and health summaries.  
Built with **HTML, Tailwind CSS, and JavaScript**, it features user authentication, reminder notifications (with alarm sound), PDF prescription preview, and dark mode support.

---

## 🚀 Features

### ✅ Authentication System
- Email + password sign-in / sign-up  
- Each user has their own personal medicine data stored locally

### 💊 Medicine Management
- Add, edit, or delete medicines  
- Record dosage, stock, expiry, and notes  
- Choose dose time: Morning / Noon / Night / Custom  
- Choose schedule: Today Only / Daily

### 📄 Health Summary & PDF Preview
- Generates a professional, doctor-style PDF summary  
- Includes patient info, medicine details, and prescriptions  
- Opens live preview before download  
- Copy summary text to clipboard

### 🔔 Smart Reminders
- Automatic alerts for upcoming doses  
- Loud alarm sound (`preview.mp3` from Envato)  
- In-app modal + optional browser notifications  
- Snooze and “I Took It” actions

### 📊 Dashboard Overview
- Real-time count of medicines, stock levels, and expiry warnings  
- Highlights low-stock and expiring medicines

### ⚙️ Settings & Preferences
- Notification preferences (in-app or browser)  
- Dark / Light mode toggle  
- Reminder permission management

---

## 🧩 Tech Stack

- **Frontend:** HTML5, CSS3 (TailwindCSS), JavaScript (ES6)
- **Styling:** External `style.css` with glassmorphism and smooth transitions
- **PDF Export:** [jsPDF](https://github.com/parallax/jsPDF)
- **Audio:** HTML5 `<audio>` + Envato preview alarm
- **Notifications:** Web Notifications API
- **Storage:** Browser LocalStorage

---

## 📁 Folder Structure

