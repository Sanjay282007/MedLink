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

```
MedLink/
│
├── index.html       # Main application
├── style.css        # External styling (UI & dark mode)
├── script.js        # Core logic, auth, reminders, PDF preview
└── README.md        # Documentation
```

---

## 🖥️ How to Run

1. **Download or Clone**
   ```bash
   git clone https://github.com/yourusername/medlink.git
   cd medlink
   ```

2. **Open `index.html`** in any browser  
   → No setup or server needed  
   → Works offline (uses local storage)

3. **Create an account**
   - Click **Sign Up**
   - Enter email, password, and username
   - Add medicines and schedules

---

## 🔊 Notifications & Reminders

> **💡 MedLink automatically checks for scheduled doses every minute and reminds users with loud alerts.**

**🔹 Browser Notifications**
- 💬 Uses the **Web Notifications API**
- 🔔 Appears even if the MedLink tab is inactive (once permission is granted)
- 📱 Includes vibration feedback on supported devices
- 🕹️ Click the notification to open MedLink instantly

**🔹 In-App Reminders**
- 💡 Works when the app is open
- Displays a **popup modal** with medicine details and instructions
- Plays a **loud looping alarm sound**
- Includes options to:
  - **✅ “I Took It”** → Stops alarm and updates stock  
  - **⏰ Snooze (5 minutes)** → Temporarily delay reminder  
  - **🛑 Stop Alarm** → Stops sound without marking as taken

**🔹 Sound Alerts**
- 🔊 Short ping (Base64 embedded) + loud looping alarm (`preview.mp3`)
- 🔈 Alarm plays until the user clicks *Stop* or *I Took It*
- 🔇 Works both in in-app modal and browser notifications

**🔹 Daily vs. Today Only**
- **Daily:** Repeats at the same time every day  
- **Today Only:** Works only for the selected date (useful for short-term medication)

---

## 📄 PDF Summary Example

```
1. Paracetamol — 500mg   Schedule: Daily @ 13:00
   Dose: 1 | Stock: 30 | Expires: 2025-12-30   Notes: Fever relief

1. Paracetamol Prescription:
   • Take after meals
   • Avoid alcohol
```

---

## 🌙 Dark Mode

Switch between light and dark themes with the ☀ / 🌙 button.  
Preference is saved locally for the next session.

---

## 🔔 Audio & Notification Assets

- **Notification Ping:** Embedded Base64 sound  
- **Alarm Sound:** [Envato Beeping Alarm Preview](https://elements.envato.com/beeping-alarm-Z5N2G7Y)  
  (Uses preview.mp3 from Envato CDN — replace with your own if preferred)

---

## 🧠 Future Enhancements

- Cloud sync (Firebase or Supabase)
- Cross-device login  
- Medicine adherence analytics  
- Doctor portal or patient report sharing

---

## 👨‍💻 Developed By

**Sanjay Theretipally (CSE - AI&ML, Vignan Institute of Technology and Science)**  
**Guide:** P. M. Naidu  
**Subject:** Web Programming (B.Tech III Year - I Sem, B Section)

---

## 🌐 Host on GitHub Pages (Optional)

1. Commit your project to a GitHub repo  
2. Go to **Settings → Pages → Deploy from branch**  
3. Select branch: `main`, folder: `/root`  
4. Your MedLink app will be live at  
   ```
   https://<your-username>.github.io/medlink/
   ```

---

> 🩵 *MedLink — Smart Medicine Tracker helps you stay on schedule, stay healthy, and stay organized.*
