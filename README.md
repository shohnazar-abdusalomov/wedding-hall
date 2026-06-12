# To‘yxona Loyihasi — Onlayn Bron Qilish Tizimi

Toshkent shahridagi to‘yxonalarni onlayn bron qilish uchun fullstack veb-ilova.

## Texnologiyalar

- **Backend:** Node.js, Express, NeDB (embedded DB), JWT, bcryptjs
- **Email/OTP:** Resend (console fallback, kalitsiz ham ishlaydi)
- **Frontend:** React, React Router, Axios, Vite
- **Design:** Custom CSS (framework-free)

## O'rnatish va ishga tushirish

```bash
# 1. Dependencies o‘rnatish
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. (Ixtiyoriy) Email/OTP sozlamalari
cd server && cp .env.example .env   # va RESEND_API_KEY ni kiriting (yoki bo‘sh qoldiring)
cd ..

# 3. Ma'lumotlar bazasini seed qilish (namuna ma'lumotlar)
npm run seed

# 4. Ishga tushirish (server + client bir vaqtda)
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api

## OTP autentifikatsiya (Resend)

Tizim email orqali bir martalik tasdiqlash kodlari (OTP) ishlatadi:

- **To‘yxona egalari** — har safar kirishda emailga kod yuboriladi.
- **Foydalanuvchilar** — ro‘yxatdan o‘tishda email tasdiqlanadi; kirishda esa
  "Email orqali kod bilan kirish" katagini belgilab 2-bosqichli kirishdan
  foydalanish mumkin.

Kodlar: 6 xonali, **5 daqiqa** amal qiladi, ko‘pi bilan **5 marta** xato
kiritish mumkin, qayta yuborish orasida **60 soniya** kutiladi. Kodlar bazada
bcrypt bilan hash qilib saqlanadi.

**Email yetkazib berish:**

- `RESEND_API_KEY` o‘rnatilgan bo‘lsa — kod haqiqiy email orqali yuboriladi
  ([resend.com](https://resend.com) dan bepul kalit oling).
- Kalit bo‘lmasa (yoki dev rejimida) — kod **server konsoliga** chiqariladi va
  test qulayligi uchun API javobida `devCode` sifatida qaytariladi
  (`NODE_ENV=production` da bu o‘chiriladi).

## Demo login ma'lumotlari

| Rol | Login | Parol |
|-----|-------|-------|
| Admin | admin | admin123 |
| To‘yxona egasi 1 | jamshid | owner123 |
| To‘yxona egasi 2 | nilufar | owner123 |
| Foydalanuvchi | +998901234567 | user123 |

## Tizim rollari

### Admin
- Statistikani ko‘rish (to‘yxonalar, bronlar, foydalanuvchilar soni)
- To‘yxona qo‘shish, tahrirlash, o‘chirish, tasdiqlash
- To‘yxona egalarini qo‘shish, o‘chirish, boshqarish
- Egani to‘yxonaga biriktirish
- Barcha bronlarni ko‘rish va bekor qilish
- Filtrlash: rayon, status, qidiruv

### To‘yxona egasi
- Har kirishda email OTP tasdiqlash
- O'z to‘yxonasini ro‘yxatdan o‘tkazish (admin tasdiqlashi kerak)
- Rasm yuklash (drag emas, tugma orqali; tartiblash va asosiy rasm tanlash)
- To‘yxonani tahrirlash (xizmatlar, narx, sig'im)
- O'z to‘yxonasidagi bronlarni ko‘rish va bekor qilish
- Kalendar orqali band kunlarni ko‘rish

### Foydalanuvchi
- Tasdiqlangan to‘yxonalarni ko‘rish
- Qidiruv, rayon bo‘yicha filtr, narx/sig'im bo‘yicha tartiblash
- Kalendardan bo‘sh kunni tanlash va bron qilish
- Qo‘shimcha xizmatlarni tanlash (honandalar, karnay-surnay, mashina)
- Narx kalkulyatsiyasi va 20% avans to‘lovi
- O'z bronlarini ko‘rish va bekor qilish

## Loyiha tuzilishi

```
toyxona/
├── server/
│   ├── server.js          # Asosiy server
│   ├── seed.js            # Ma'lumotlarni seed qilish
│   ├── middleware/
│   │   └── auth.js        # JWT autentifikatsiya
│   ├── routes/
│   │   ├── auth.js        # Login/Register
│   │   ├── venues.js      # To‘yxona CRUD
│   │   ├── bookings.js    # Bron CRUD
│   │   ├── owners.js      # Egalar boshqaruvi
│   │   └── admin.js       # Admin statistika
│   └── data/              # NeDB fayllar
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── index.css
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Calendar.jsx
│       │   └── Modal.jsx
│       └── pages/
│           ├── VenueList.jsx
│           ├── VenueDetail.jsx
│           ├── LoginPage.jsx
│           ├── MyBookings.jsx
│           ├── AdminDashboard.jsx
│           └── OwnerDashboard.jsx
└── package.json
```

## API Endpointlari

### Auth
- `POST /api/auth/register` - Ro‘yxatdan o‘tish (1-bosqich: emailga OTP yuborish)
- `POST /api/auth/register/verify` - Ro‘yxatdan o‘tish (2-bosqich: OTP + akkaunt yaratish)
- `POST /api/auth/login` - Foydalanuvchi kirish (`otpLogin: true` bilan 2FA)
- `POST /api/auth/login/verify` - Foydalanuvchi 2FA OTP tasdiqlash
- `POST /api/auth/admin-login` - Admin kirish
- `POST /api/auth/owner-login` - Egasi kirish (emailga OTP yuborish)
- `POST /api/auth/owner-login/verify` - Egasi OTP tasdiqlash
- `POST /api/auth/resend-otp` - Kodni qayta yuborish
- `GET  /api/auth/me` - Joriy foydalanuvchi ma'lumoti

### To‘yxonalar
- `GET /api/venues` - Ro‘yxat (qidiruv, filtr, tartiblash)
- `GET /api/venues/:id` - Batafsil
- `POST /api/venues` - Qo‘shish
- `PUT /api/venues/:id` - Tahrirlash
- `DELETE /api/venues/:id` - O'chirish
- `PATCH /api/venues/:id/approve` - Tasdiqlash
- `PATCH /api/venues/:id/assign-owner` - Egani biriktirish

### Bronlar
- `GET /api/bookings` - Ro‘yxat (rol bo‘yicha filtrlangan)
- `POST /api/bookings` - Bron qilish
- `GET /api/bookings/venue/:venueId` - Kalendar uchun
- `PATCH /api/bookings/:id/cancel` - Bekor qilish

### Egalar
- `GET /api/owners` - Ro‘yxat
- `POST /api/owners` - Qo‘shish
- `DELETE /api/owners/:id` - O'chirish
