# Philippine Eagles Membership System

![Philippine Eagles Logo](logo.png)

**The Fraternal Order of Eagles (Philippine Eagles)**  
*First Philippine-Born Socio-Civic Organization*  
**"ANG MALAYANG AGILA"**

## 🦅 About

A comprehensive web-based membership application and management system for The Fraternal Order of Eagles (Philippine Eagles). This system allows members to apply for membership and ID cards online with digital signatures and photo uploads, while providing administrators with full management capabilities.

### Features

#### For Members
- ✅ **Online Membership Application** - Complete membership form with photo upload
- ✅ **ID Card Application** - Simplified ID card request form
- ✅ **Digital Signature** - Sign applications digitally using touch or mouse
- ✅ **Photo Upload** - Upload 2x2 photos directly
- ✅ **Mobile Responsive** - Works seamlessly on all devices
- ✅ **PWA Support** - Install on mobile and desktop as an app
- ✅ **Offline Capable** - Basic functionality works offline

#### For Administrators
- ✅ **Secure Login** - Firebase Authentication
- ✅ **View Applications** - See all membership and ID applications
- ✅ **Edit Records** - Update application information
- ✅ **Delete Records** - Remove applications
- ✅ **Change Password** - Update admin password
- ✅ **Real-time Updates** - Firestore database sync

## 🚀 Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase
  - Firestore (Database)
  - Firebase Authentication (Admin Login)
  - Firebase Storage (Photos & Signatures)
- **PWA**: Service Workers, Web Manifest
- **Hosting**: Vercel (recommended)

## 📋 Prerequisites

- Node.js (v16 or higher)
- Firebase Account (free tier is sufficient)
- Git
- Vercel Account (for deployment)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd eagles-membership-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable the following services:
   - **Firestore Database** (Start in production mode)
   - **Authentication** (Enable Email/Password)
   - **Storage** (Start in production mode)

4. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click the web icon (</>)
   - Copy the configuration object

5. Update `app.js` with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 4. Create Firebase Admin User

In Firebase Console:
1. Go to Authentication > Users
2. Click "Add user"
3. Enter admin email and password
4. Save the credentials (you'll use these to login)

### 5. Set Firestore Security Rules

Go to Firestore Database > Rules and set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read/write for applications (submissions)
    match /membershipApplications/{document=**} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    
    match /idApplications/{document=**} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

### 6. Set Storage Security Rules

Go to Storage > Rules and set:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

### 7. Run Locally

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 8. Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Your app will be live at: `https://your-app-name.vercel.app`

## 📱 Installing as PWA

### On Mobile (Android/iOS)
1. Open the website in your browser
2. Tap the menu (⋮ or share icon)
3. Select "Add to Home Screen" or "Install App"
4. Follow the prompts

### On Desktop (Chrome/Edge)
1. Open the website
2. Look for the install icon (⊕) in the address bar
3. Click "Install"
4. The app will open in its own window

## 👨‍💼 Admin Access

**Default Login**: Use the email and password you created in Firebase Authentication

**Admin Features**:
- View all applications
- Edit application details
- Delete applications
- Change admin password
- Export/Print records

## 📂 Project Structure

```
eagles-membership-system/
├── index.html              # Main HTML file
├── styles.css              # Styles
├── app.js                  # Main JavaScript with Firebase
├── sw.js                   # Service Worker
├── manifest.json           # PWA Manifest
├── logo.png                # Eagles logo
├── favicon.ico             # Favicon
├── icons/                  # App icons
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── package.json            # Dependencies
├── vercel.json             # Vercel config
└── README.md               # This file
```

## 🔒 Security Notes

- Never commit your Firebase config with real API keys to public repositories
- Use environment variables for sensitive data in production
- Regularly update Firebase security rules
- Review and monitor Firebase usage
- Keep dependencies updated

## 🐛 Troubleshooting

### Photos not uploading
- Check Firebase Storage rules
- Verify file size is under 5MB
- Ensure proper internet connection

### Can't login as admin
- Verify the email/password in Firebase Authentication
- Check browser console for errors
- Ensure Firebase Auth is enabled

### PWA not installing
- Must be served over HTTPS (localhost or deployed)
- Check that manifest.json and sw.js are accessible
- Clear browser cache and try again

## 📞 Support

For issues or questions:
- Check the Firebase Console for errors
- Review browser console logs
- Contact: Godmisoft Development Team

## 📄 License

© 2024 Godmisoft. All rights reserved.

Developed by **Godmisoft - Hebz**

---

**THE FRATERNAL ORDER OF EAGLES (Philippine Eagles)**  
*Service Through Strong Brotherhood*  
**"ANG MALAYANG AGILA"**  
*Deo et Patria*
