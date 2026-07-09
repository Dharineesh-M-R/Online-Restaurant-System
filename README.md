# 🍽️ Smart Restaurant Management System (SRMS)

A comprehensive, real-time, full-stack **Restaurant Management System** designed to streamline restaurant operations including **Dine-in**, **Takeaway (Parcel)**, **Kitchen Display System (KDS)**, **Waiter Dashboard**, and **Cashier POS**.

Built with **Next.js**, **Express.js**, and **Supabase (PostgreSQL)**, the system ensures synchronized communication between customers and restaurant staff, reducing wait times and minimizing order errors.

---

## 🚀 Features

### 📱 Customer Self-Service (Dine-In & Takeaway)

- 📷 Table-specific QR code scanning for secure dine-in sessions.
- 🎫 Virtual takeaway token system for parcel customers.
- 📍 GPS Geofencing (100m radius) to allow ordering only within restaurant premises.
- 📊 Live order tracking:
  - Waiting
  - Preparing
  - Ready
  - Served
- 💳 Digital bill request with payment options:
  - Cash
  - Card
  - UPI

---

### 🤵 Waiter Dashboard

- 🪑 Live restaurant floor plan
- 🎨 Color-coded table status
- 📦 Parcel token monitoring
- ✅ Verify customer orders before sending to kitchen
- ✏️ Edit quantity or remove incorrect items
- 🧹 One-click Ghost Session Cleanup
- 🔔 Kitchen ready notifications

---

### 👨‍🍳 Kitchen Display System (KDS)

- 📑 Chronological order tickets
- ⏱️ Time-based color indicators
  - 🟢 Normal
  - 🟡 Warning
  - 🔴 Critical
- 🍽️ Station filtering
  - Veg Starters
  - Main Course
  - Breads
  - Desserts
- ❌ One-click "Out of Stock"
- 📦 Dedicated Parcel Order UI

---

### 💻 Cashier & Billing POS

- 🧾 Dynamic subtotal calculation
- 💰 Automatic GST (5%)
- ➕ Platform fee calculation
- ✏️ Edit quantities
- 🗑️ Delete items
- 🎁 Apply discounts
  - Flat ₹ Discount
  - Percentage Discount
- 💳 Payment recording
- 🔄 Automatic table/token release after payment

---

# 🏗️ System Modules

- Customer Ordering Portal
- QR Code Table Management
- Parcel Token Management
- Waiter Dashboard
- Kitchen Display System
- Billing & POS
- Inventory Status
- Payment Management

---

# 🛠️ Tech Stack

## Frontend

- Next.js (App Router)
- React 18
- Tailwind CSS
- Lucide React
- React Context API

## Backend

- Node.js
- Express.js
- REST APIs

## Database

- PostgreSQL
- Supabase

## Communication

- REST APIs
- 3-second polling for real-time synchronization

---

# 📂 Project Structure

```
restaurant-management-system/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── server.js
│   └── package.json
│
├── db/
│   ├── schema.sql
│   └── seed.sql
│
├── screenshots/
│
├── README.md
└── LICENSE
```

---

# ⚙️ Prerequisites

Before starting, install:

- Node.js (v18 or later)
- Git
- Supabase Account

---

# 🚀 Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/restaurant-management-system.git

cd restaurant-management-system
```

---

## 2️⃣ Database Setup

Create a new Supabase project.

Run:

```
db/schema.sql
```

Create the following tables:

- categories
- menu_items
- tables
- table_sessions
- orders
- order_serves
- order_items
- payments
- staff

Insert parcel tables:

```sql
INSERT INTO public.tables (table_number, qr_code, status)
VALUES
(101,'parcel_101','available'),
(102,'parcel_102','available'),
(103,'parcel_103','available'),
(104,'parcel_104','available');
```

---

## 3️⃣ Backend Setup

```bash
cd backend

npm install
```

Create **.env**

```env
PORT=5000

SUPABASE_URL=your_supabase_project_url

SUPABASE_KEY=your_supabase_anon_key
```

Start server

```bash
npm run dev
```

or

```bash
node server.js
```

---

## 4️⃣ Frontend Setup

```bash
cd frontend

npm install
```

Create **.env.local**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000

NEXT_PUBLIC_LATITUDE=11.4962

NEXT_PUBLIC_LONGITUDE=77.9972
```

Run

```bash
npm run dev
```

---

# 🧪 Testing Workflow

## Takeaway Flow

Visit

```
http://localhost:3000/customer/parcel
```

1. Select an available token
2. Place order
3. Open Waiter Dashboard
4. Send to Kitchen
5. Cook & Serve
6. Generate Bill
7. Complete Payment
8. Verify token becomes available again

---

# 🗺️ System Architecture

## Session Management

- Shared live table sessions
- Automatic ghost session cleanup
- Multi-device synchronization

---

## Customer Context API

Responsible for:

- GPS Validation
- Table Verification
- Cart Management
- Session Synchronization

---

## Database Design

Database is normalized into:

```
Orders
      │
      ├── Order Serves
      │         │
      │         └── Order Items
```

This enables:

- Multiple food batches
- Independent item tracking
- Kitchen workflow optimization

---

# 📸 Screenshots

Add screenshots inside the `screenshots` folder.

Example:

```
screenshots/

login.png

customer-menu.png

waiter-dashboard.png

kitchen-display.png

billing-dashboard.png
```

Then display them:

```markdown
## Customer Menu

![Customer Menu](screenshots/customer-menu.png)

## Waiter Dashboard

![Waiter Dashboard](screenshots/waiter-dashboard.png)

## Kitchen Display

![Kitchen Display](screenshots/kitchen-display.png)

## Billing

![Billing](screenshots/billing-dashboard.png)
```

---

# 💡 Developer Tip

To bypass GPS during local development, temporarily modify the geolocation check:

```javascript
setIsLocationValid(true);
return;
```

Place this at the beginning of the geolocation `useEffect` in:

```
frontend/src/app/component/cartContext.tsx
```

⚠️ Remove this before deploying to production.

---

# 🔮 Future Enhancements

- 📱 Mobile Application
- 🔔 Push Notifications
- 🤖 AI-based Sales Prediction
- 📈 Analytics Dashboard
- 🍕 Online Delivery Integration
- 📊 Restaurant Performance Reports

---

# 👨‍💻 Author

**Dharineesh M R**

- GitHub: https://github.com/Dharineesh-M-R
- LinkedIn: https://linkedin.com/in/dharineesh-m-r-4627a9343
- Email: dharineeshmagudeswaran@gmail.com


