# ⚡ Bilboleh: Smart LHDN e-Invoicing System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/fastapi-109989?style=for-the-badge&logo=FASTAPI&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

**Bilboleh** is an AI-powered, end-to-end e-Invoicing platform designed to help Malaysian MSMEs seamlessly transition to the **LHDN MyInvois System**. By leveraging Multimodal AI, it transforms messy, handwritten, or faded receipts into compliant, structured LHDN JSON payloads in seconds.

## 🖼️ User Interface Showcase

<table border="0">
  <tr>
    <td align="center" width="40%">
      <b>🔐 The Login Page</b><br />
      <img src="https://github.com/user-attachments/assets/13dc7c57-90d7-41d3-82ed-6734e31c70b9" width="100%" />
    </td>
    <td align="center" width="40%">
      <b>📊 Dashboard Page</b><br />
      <img src="https://github.com/user-attachments/assets/d296fc9d-4d7e-47ab-a5cd-7655a278bad6" width="100%" />
    </td>
  </tr>
  <tr>
    <td align="center" width="40%">
      <b>🌗 Different Colour Mode</b><br />
      <img src="https://github.com/user-attachments/assets/47046405-bd7c-4c15-990b-7c587f153811" width="100%" />
    </td>
    <td align="center" width="40%">
      <b>📝 MyInvois Status Page</b><br />
      <img alt="{BF21645E-8235-4753-8414-69DCFCCB64F5}" src="https://github.com/user-attachments/assets/d33d7606-a5b6-4a70-b8de-d0f35a34b70d" />
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <b>⚡ Bilboleh Process</b><br />
      <img src="https://github.com/user-attachments/assets/e9f35bed-32f6-4341-b25d-f85921bcd18a" width=100%" />
    </td>
  </tr>
</table>

## ✨ Key Features

* **🤖 Smart Multimodal Extraction**: Powered by Google Gemini 2.5 Flash to accurately read and extract financial data from raw images and PDFs.
* **🔄 Automated LHDN Mapping**: Python FastAPI backend automatically maps unstructured data into the strict official LHDN MyInvois JSON schema.
* **📊 Real-time Dashboard**: Live synchronization with Firebase Firestore to track invoice statuses (Pending, Validated, Rejected, Cancelled) in real-time.
* **🛍️ Consumer QR Portal**: A dedicated modal for buyers to submit their TIN and NRIC to request validated e-invoices from merchants.
* **🛠️ Resolution Center**: Easily edit, correct, and resubmit invoices that were rejected by the LHDN APIs due to TIN/validation errors.
* **🌙 Dynamic UI/UX**: Fluid animations (Framer Motion), dark/light mode toggles, and multi-language support (English, Malay, Chinese).

---

## 🏗️ Core Tech Stack

### Frontend
* **Framework**: React 18 + Vite
* **Styling**: Tailwind CSS + Glassmorphism / Neumorphism UI
* **Animations**: Framer Motion
* **Icons**: Lucide React

### Backend & Cloud
* **Microservice**: Python FastAPI (Optimized for Google Cloud Run)
* **Database**: Firebase Firestore (Real-time NoSQL)
* **Authentication**: Firebase Auth

### Artificial Intelligence
* **Vision & Extraction**: Google Gemini API (Gemini 2.5 Flash Model)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and Python installed on your machine.

### 1. Clone the Repository
```Bash
git clone [https://github.com/yourusername/Bilboleh.git](https://github.com/yourusername/Bilboleh.git)
cd Bilboleh
```

### 2. Frontend Setup (React)
Install the required NPM packages and set up your environment variables.
```Bash
npm install
```
Create a .env file in the root directory and add your keys:
```代码段
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FASTAPI_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 3. Backend Setup (FastAPI)
Open a new terminal window. Install the required Python dependencies:
```Bash
pip install fastapi uvicorn pydantic
```

Run the FastAPI microservice:
```Bash
python -m uvicorn main:app --reload
```
The backend will be live at `http://127.0.0.1:8000`.


## 🎯 How to Use (Demo Flow)
**Login:** Authenticate using the secure login portal.

**Upload:** Navigate to the Bilboleh Process tab and upload a receipt image.

**Extract:** Click Process Invoice to let Gemini AI extract the data and generate the JSON payload. This saves the draft to Firebase as Pending.

**Sync:** Click the Merchant Auto-Sync button. Watch the FastAPI backend process the data, mock the LHDN digital signature, and update the Firebase status to Validated in real-time!

**Monitor:** Check the Dashboard and MyInvois Status tabs to see the financial summary and invoice logs update instantly.

## 👨‍💻 Developed By
Built with ❤️ for the Gemini Hackathon with Google DeepMind.
