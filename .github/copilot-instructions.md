<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
  - Vietnamese order management system with customer, product, and order tracking
  - Multiple products per order with per-customer-per-product pricing
  - Toast notifications for user feedback
  - Image upload for invoices

- [x] Scaffold the Project
  - Created Node.js + Express backend with MongoDB
  - Created HTML + TailwindCSS frontend
  - Set up Multer for image uploads
  - Established API routes for customers, products, orders

- [x] Customize the Project
  - Implemented full CRUD for customers and products
  - Redesigned order system to support multiple items per order
  - Updated Customer schema: `productPrices` Map for per-customer per-product pricing
  - Updated Order schema: `items` array with product refs and pricing
  - Rewrote createOrder to handle items array and auto-save latest prices
  - Redesigned orders.html with dynamic item adding/removal
  - Updated dashboard to aggregate across items array

- [x] Install Required Extensions
  - No extensions required for this project

- [x] Compile the Project
  - Server running on http://localhost:3001
  - MongoDB connected to order_internal_db
  - All routes tested and functional
  - No compilation errors

- [x] Create and Run Task
  - Backend running via npm start in /server
  - Frontend served statically via Express

- [x] Launch the Project
  - Application running at http://localhost:3001
  - All features ready for testing

- [x] Ensure Documentation is Complete
  - README.md updated with new multi-product architecture
  - API documentation included
  - Setup instructions provided

## Architecture Summary

**Database Models:**
- Customer: name, phone, productPrices (Map<productId, price>)
- Product: name, description
- Order: customer (ref), items (array), grandTotal, invoiceImage, exportDate
- Order Item: product (ref), productName, price, quantity, total

**Features:**
- Create orders with 1-N products
- Auto-fill prices from customer's history
- Save new prices as defaults for customer+product
- Dynamic item adding/removal in form
- Real-time total calculation
- Toast notifications for all operations
- Image upload for invoices
- Dashboard with revenue tracking

**Frontend Pages:**
- index.html: Dashboard with totals and order history
- customers.html: Customer CRUD
- products.html: Product CRUD
- orders.html: Multi-item order creation

**API Endpoints:**
- `/api/customers` - CRUD operations
- `/api/products` - CRUD operations
- `/api/orders` - CRUD operations (POST accepts items array)
- `/api/orders/dashboard/summary` - Dashboard data

