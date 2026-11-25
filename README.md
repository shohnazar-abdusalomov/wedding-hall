# 🏛️ Wedding Hall — Venue Booking & Event Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/shohnazar-abdusalomov/wedding-hall/pulls)
[![GitHub stars](https://img.shields.io/github/stars/shohnazar-abdusalomov/wedding-hall?style=social)](https://github.com/shohnazar-abdusalomov/wedding-hall)

An open-source web application designed to simplify browsing, booking, and managing wedding venues and event halls. Built with modern web technologies, **Wedding Hall** provides both a practical solution for event organizers and a clean, extensible full-stack reference architecture for service-booking platforms.

---

## ✨ Key Features

- **Venue Discovery & Showcase:** Explore wedding halls with rich descriptions, guest capacities, pricing tiers, and photo galleries.
- **Smart Search & Filtering:** Filter venues by location, guest count, budget range, and available amenities.
- **Real-Time Availability & Booking:** Check open dates and submit reservation requests with conflict-free scheduling.
- **Admin & Venue Management:** Manage hall listings, review and approve incoming bookings, and update availability calendars.
- **Fully Responsive UI:** Optimized for seamless use across desktop, tablet, and mobile devices.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, Tailwind CSS |
| **State Management** | Redux Toolkit / Context API |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL / MongoDB |
| **Tooling** | Vite, ESLint, Git |

---

## 🚀 Getting Started

Follow these steps to run the project locally on your machine.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` or `yarn`

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/shohnazar-abdusalomov/wedding-hall.git](https://github.com/shohnazar-abdusalomov/wedding-hall.git)
   cd wedding-hall
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and configure your keys:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The app will be running at `http://localhost:5173`.

---

## 📁 Project Structure

```text
wedding-hall/
├── public/              # Static assets (images, icons)
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route-level page views
│   ├── store/           # Global state management
│   ├── services/        # API clients and data fetching
│   ├── types/           # TypeScript interfaces and types
│   └── main.tsx         # Application entry point
├── .env.example         # Sample environment configuration
├── package.json         # Project metadata and scripts
├── LICENSE              # MIT License
└── README.md            # Project documentation
```

---

## 🗺️ Roadmap

- [x] Core venue listing and detail views
- [x] Responsive UI layout
- [ ] Automated unit and integration tests
- [ ] Multi-language support (Uzbek, English, Russian)
- [ ] Online payment gateway integration

---

## 🤝 Contributing

Contributions are what make the open-source community thrive. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 👤 Author

**Shohnazar Abdusalomov**
- GitHub: [@shohnazar-abdusalomov](https://github.com/shohnazar-abdusalomov)
