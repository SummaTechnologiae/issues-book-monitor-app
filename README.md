# Issues by Vince Aletti - Book Tracker & Explorer

**Live Application:** [https://issues-book-monitor.onrender.com](https://issues-book-monitor.onrender.com)

A beautiful web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that tracks Vince Aletti's landmark book *Issues: A History of Photography in Fashion Magazines* from the Amazon Store. 

It allows you to explore the 100 historical fashion magazine issues selected in the book, track store updates, export data, and subscribe to receive real-time email alerts.

---

## Features
- **Live Amazon Scraping**: Fetches live data (title, current price, rating, reviews, stock availability) from Amazon.
- **Resilient Fallback System**: Integrates a highly detailed local database of the book's curated content in case of Amazon CAPTCHAs, bot protection blocks, or offline use.
- **Chronological Magazine Catalog**: Browse through iconic fashion magazine covers (Vogue, Harper's Bazaar, i-D, The Face) from 1925 to 2018 with photography credits, significance, and Vince Aletti's critique.
- **Dynamic Light/Dark Mode**: Instantly swap the application theme with a switch in the header, keeping the premium glassmorphism aesthetic.
- **Copy to Clipboard & CSV Export**:
  - **Copy to Clipboard**: Quick-copy card details (magazine, date, photographer, significance) directly from any issue card.
  - **Export to CSV**: Download the currently active/filtered list of magazine issues as a CSV sheet.
- **User Subscription & Unsubscribe System**:
  - Enter your email in the sidebar to subscribe to updates. Subscriptions are stored in a local database (`data/subscribers.json`).
  - An initial confirmation email is sent to the subscriber.
  - Subscribers can unsubscribe at any time using the one-click unsubscribe button inside the emails.
- **Dynamic Email Alerts**: Send updates to your configured recipient. Includes a **Simulation Mode** (which renders a rich preview client if SMTP is unconfigured) and a fully functioning **SMTP Mode** for live emails.
- **Interactive Editorial Design**: High-fidelity dark mode styling, custom CSS gradients, glassmorphism cards, micro-animations, filters, and search.

---

## Installation & Setup

1. **Clone/Navigate to the workspace**:
   Make sure you are in the directory containing the project:
   ```bash
   cd /path/to/issues-book-monitor-app
   ```

2. **Activate the Virtual Environment**:
   - On **PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - On **CMD**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - On **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure SMTP Email Settings (Optional)**:
   By default, the application runs in **Simulation Mode** where you can click to "Email" any update and view a preview of the email client showing the subject, body, and warnings.
   
   To enable real email dispatch, copy `.env.example` to `.env` (or open the existing `.env` file) and fill in your details:
   ```env
   # Email Configuration (SMTP)
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your_gmail_address@gmail.com
   SMTP_PASSWORD=your_gmail_app_password
   SENDER_EMAIL=your_gmail_address@gmail.com
   RECIPIENT_EMAIL=your_email@example.com
   ```
   *Note: For Gmail, you will need to generate an **App Password** from your Google account settings.*

---

## Running the Application

1. Run the Flask development server:
   ```bash
   python app.py
   ```
   
2. Open your web browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

3. Click the **Refresh Details** button to fetch live data from Amazon. The spinner will indicate the active scraping cycle.
4. Click the **Envelope icon** on any magazine card or the **Email Update** button on any store alert to email it.
5. Use the subscription box in the sidebar to test confirmation emails and unsubscription actions.
