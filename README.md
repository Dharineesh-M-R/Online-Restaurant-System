# Online Restaurant System
🍽️ Smart Restaurant Management System (SRMS)
A comprehensive, real-time, full-stack Online Restaurant Management System designed to handle Dine-in, Takeaway (Parcel), Kitchen Display Systems (KDS), Waiter Routing, and Cashier POS operations seamlessly.

Built with Next.js, Express.js, and Supabase (PostgreSQL), this system ensures perfectly synchronized communication between customers and staff, minimizing wait times and eliminating order errors.

✨ Key Features
📱 1. Customer Self-Service (Dine-In & Takeaway)
QR-Code Dine-in: Customers scan a table-specific QR code to securely open a live session.

Virtual Takeaway Tokens: Walk-in customers scan a Waiting Area QR code to claim an available Parcel Token (e.g., Token 1, 2) without interfering with dine-in tables.

GPS Geofencing: HTML5 Geolocation ensures customers must be physically within a 100-meter radius of the restaurant to view the menu and place orders.

Live Status Tracking: Customers see the exact state of their food in real-time (Waiting ➡️ Preparing ➡️ Ready ➡️ Served).

Digital Bill Request: Customers can trigger a table-side alert for the Waiter/Cashier with their preferred payment method (Cash, Card, UPI).

🤵 2. Waiter Dashboard
Live Floor Plan: A real-time, color-coded grid of all tables and takeaway tokens showing occupancy, new orders, and bill requests.

Order Verification: Waiters intercept "New Orders" to review, edit quantities, or delete items before sending them to the kitchen (preventing spam or mistakes).

Ghost Session Management: 1-click "Clear Empty Table" functionality to instantly wipe abandoned sessions.

Service Tasks: Dedicated alerts for when food is ready in the kitchen to be run to the tables.

👨‍🍳 3. Kitchen Display System (KDS)
Chronological Ticket View: Color-coded tickets (Normal, Warning, Critical) based on time elapsed.

Station Filtering: Chefs can filter the feed to only see their specific station (e.g., Veg Starters, Breads).

Inventory Control: 1-click "Out of Stock" button that instantly deletes the item from the queue and alerts the waiter.

Takeaway UI: Clear visual distinction (Purple badging & icons) for Parcel orders so expo chefs know to pack them in bags instead of plates.

💻 4. Cashier & Billing POS
Dynamic Cart Subtotaling: Real-time calculation of Grand Totals including dynamic 5% GST and Platform Fees based on surviving items.

Live Editing & Discounts: Cashiers can delete items, modify quantities, and apply percentage (%) or flat (₹) discounts directly at checkout.

Payment Finalization: Logs the exact payment method to the database and instantly frees the table/token for the next customer.

🛠️ Tech Stack
Frontend:

Framework: React 18 / Next.js 14+ (App Router)

Styling: Tailwind CSS

Icons: Lucide React

State Management: React Context API

Backend:

Runtime: Node.js (v18+)

Framework: Express.js

Database: PostgreSQL (Hosted on Supabase)

Communication: RESTful APIs with aggressive 3-second polling for real-time synchronization.

⚙️ Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v18.0.0 or higher)

Git

A free Supabase account.

🚀 Installation & Setup
1. Clone the Repository
Bash
git clone https://github.com/your-username/restaurant-management-system.git
cd restaurant-management-system
2. Database Setup (Supabase)
Create a new project in Supabase.

Open the SQL Editor and execute the schema scripts (found in /db/schema.sql). Ensure the following tables are created:

categories, menu_items, tables, table_sessions, orders, order_serves, order_items, payments, staff.

Run the following command to insert the "Virtual Parcel Tables" for the Takeaway system:

SQL
INSERT INTO public.tables (table_number, qr_code, status) VALUES 
(101, 'parcel_101', 'available'), (102, 'parcel_102', 'available'),
(103, 'parcel_103', 'available'), (104, 'parcel_104', 'available');
3. Backend Setup
Bash
cd backend
npm install
Create a .env file in the backend directory:

Code snippet
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_public_key
Start the server:

Bash
node server.js 
# Or use nodemon: npm run dev
4. Frontend Setup
Bash
cd frontend
npm install
Create a .env.local file in the frontend directory:

Code snippet
NEXT_PUBLIC_API_URL=http://localhost:5000
# Coordinates for GPS Geofencing (Set to your testing location)
NEXT_PUBLIC_LATITUDE=11.4962
NEXT_PUBLIC_LONGITUDE=77.9972
Start the development server:

Bash
npm run dev
🧪 Testing the Workflows
To effectively test the system locally without cache collisions, it is recommended to open the Customer View in a standard browser tab, and the Staff Dashboards in an Incognito/Private window.

Takeaway (Parcel) Flow:

Navigate to http://localhost:3000/customer/parcel

Select an available token.

Observe how the token is instantly locked for other users.

Place an order and try to access the cart again (you will be blocked, as takeaway is single-serve).

Open the Waiter Dashboard (/waiter) to verify the purple Parcel order.

Send it to the Kitchen (/kitchen), cook it, and serve it.

Request the bill and finalize it in the Cashier Dashboard (/billing).

Notice the Token is instantly released back to the Parcel Landing Page!

💡 Developer Tip (Bypassing GPS): > If you are testing off-site, you can bypass the GPS lock by adding setIsLocationValid(true); return; at the very top of the geolocation useEffect block in frontend/src/app/component/cartContext.tsx.

🗺️ System Architecture Overview
/sessions (API): Manages the core lifecycle of a table. Ensures ghost sessions are dropped and multiple devices at the same table share the exact same cart state.

Context API (Frontend): Wraps all /customer routes. Serves as a strict gatekeeper, verifying table numbers and GPS coordinates before granting menu access.

Database Normalization: Orders are split into orders (the Master Bill), order_serves (Batch 1, Batch 2), and order_items (Individual food statuses) to allow hyper-granular kitchen tracking without locking the entire bill.

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
