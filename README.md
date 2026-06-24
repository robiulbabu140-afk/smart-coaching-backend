# Smart Coaching Backend — Phase 1

## শুরু করার ধাপ

### ১. Dependencies ইনস্টল করুন
```bash
cd smart-coaching-backend
npm install
```

### ২. Environment variables সেট করুন
```bash
cp .env.example .env
# .env ফাইলে DATABASE_URL, JWT secrets ইত্যাদি দিন
```

### ৩. Database মাইগ্রেশন চালান
```bash
npm run db:generate
npm run db:migrate
```

### ৪. Development সার্ভার চালু করুন
```bash
npm run dev
```

## API Endpoints

### Auth
| Method | URL | বর্ণনা |
|--------|-----|---------|
| POST | `/v1/auth/otp/request` | OTP পাঠান |
| POST | `/v1/auth/otp/verify` | OTP যাচাই করে লগইন |
| POST | `/v1/auth/refresh` | Access token রিনিউ |
| POST | `/v1/auth/logout` | লগআউট |
| POST | `/v1/auth/logout/all` | সব ডিভাইস থেকে লগআউট |
| GET | `/v1/auth/me` | নিজের তথ্য দেখুন |

### Example Requests

**OTP Request:**
```json
POST /v1/auth/otp/request
{ "phone": "8801712345678" }
```

**OTP Verify:**
```json
POST /v1/auth/otp/verify
{ "phone": "8801712345678", "otp": "123456", "deviceInfo": "Android 14" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    },
    "user": { "id": "uuid", "fullName": "...", "role": "student" },
    "isNewUser": false
  }
}
```

## Project Structure
```
src/
├── config/         — DB, Redis, env config
├── middleware/     — auth, roles, rate limit, error handler
├── modules/
│   ├── auth/       — OTP, JWT, login/logout
│   └── users/      — user serializer (privacy layer)
└── utils/          — logger, apiResponse, errors
prisma/
└── schema.prisma   — সম্পূর্ণ DB schema
```
