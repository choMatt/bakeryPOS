# Bakery POS

A simple, offline-first Point of Sale (POS) system built specifically for a small bakery business.

The system is designed to manage bakery products, process orders, track sales, and work as a Progressive Web App (PWA).

## Tech Stack

* React
* Vite
* JavaScript
* IndexedDB
* Dexie
* PWA
* Thermal Printer Support

## Features

* Product management
* Create customer orders
* Calculate totals
* Track sales
* Offline functionality
* Local data storage with IndexedDB
* PWA support
* Thermal receipt printing
* Simple interface designed for bakery operations

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
```

### 2. Open the project

```bash
cd bakery-pos
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

## Build for Production

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Data Storage

The application uses **IndexedDB** for local data storage.

Dexie is used to make working with IndexedDB easier.

Example data stored locally may include:

* Products
* Orders
* Sales
* Settings

Because the data is stored locally in the browser, the POS can continue working without an internet connection.

## Project Structure

```text
bakery-pos/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── db/
│   │   └── database.js
│   ├── App.jsx
│   └── main.jsx
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## Development

This project is currently customized for a small bakery business that sells products such as:

* Cookies
* Crinkles
* Brownies
* Boxed products

The POS can be expanded as the business grows.

## Future Improvements

* Inventory tracking
* Low-stock notifications
* Daily and monthly sales reports
* Customer records
* Product variants
* Discount system
* Receipt customization
* Thermal printer integration
* Backup and restore
* Multi-device synchronization
* User accounts and permissions

## License

This project is intended for private business use.
