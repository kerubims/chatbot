# 🤖 AI Roleplay Chat App

Aplikasi chat interaktif berbasis AI yang memungkinkan pengguna untuk berinteraksi dengan berbagai karakter AI dengan persona yang unik. Dibangun menggunakan **Next.js**, **Prisma**, dan **AI SDK**.

## 🚀 Fitur Utama
- **Persona Karakter**: Chat dengan karakter yang memiliki kepribadian unik.
- **Streaming Response**: Respon AI yang muncul secara real-time.
- **Persistent Chat**: Riwayat percakapan tersimpan dengan aman di database.
- **Multi-Model Support**: Integrasi dengan Gemini, Novita AI, dan Custom Colab Backend.

---

## 🛠️ Prasyarat
Pastikan Anda sudah menginstal perangkat lunak berikut:
- **Node.js** (v18 atau lebih baru)
- **npm** atau **yarn**
- **MariaDB** atau **MySQL** (untuk database)

---

## 📥 Instalasi

Ikuti langkah-langkah berikut untuk menjalankan project di lokal:

### 1. Clone Repository
```bash
git clone <repository-url>
cd chat
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan lengkapi API Key yang dibutuhkan:
```bash
cp .env.example .env
```
Edit file `.env`:
- `DATABASE_URL`: Sesuaikan dengan kredensial database lokal Anda.
- `GEMINI_API_KEY`: Masukkan API Key dari Google AI Studio.
- `NOVITA_API_KEY`: Masukkan API Key dari Novita AI.

### 4. Setup Database
Pastikan database dengan nama `ai_roleplay_db` sudah dibuat di MariaDB/MySQL Anda, lalu jalankan migrasi Prisma:
```bash
npx prisma migrate dev --name init
```

(Opsional) Isi database dengan data awal (karakter):
```bash
npx prisma db seed
```

### 5. Jalankan Aplikasi
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 📱 Menjalankan di Device Lain (Akses Jaringan)

Untuk mengakses aplikasi ini dari smartphone atau laptop lain dalam satu jaringan WiFi:

### 1. Jalankan Server dengan Host Flag
Secara default, Next.js hanya menerima koneksi dari `localhost`. Untuk membuka akses ke jaringan, jalankan dengan:
```bash
npm run dev -- -H 0.0.0.0
```

### 2. Cek IP Lokal Komputer Anda
Di Windows (Command Prompt):
```cmd
ipconfig
```
Cari bagian **IPv4 Address**, contoh: `192.168.1.15`.

### 3. Akses dari Device Lain
Di browser smartphone/laptop lain, masukkan alamat IP tersebut dengan port 3000:
`http://192.168.1.15:3000`

> [!TIP]
> Pastikan firewall di komputer Anda memberikan izin akses untuk Node.js atau port 3000.

---

## 🐳 Deployment (Docker)

Untuk mendeploy aplikasi ini ke production server menggunakan Docker, ikuti langkah-langkah berikut:

### 1. Build Docker Image
Jalankan perintah berikut di direktori project untuk mem-build image Docker dengan nama `uchat`:
```bash
docker build -t uchat .
```

### 2. Jalankan Container
Jalankan container dari image yang telah dibuat. Karena aplikasi akan berjalan di port **9010**, gunakan flag `-p 9010:9010` dan jangan lupa menyertakan file `.env`:
```bash
docker run -d -p 9010:9010 --env-file .env --name chat-app uchat
```
> [!IMPORTANT]
> Pastikan `DATABASE_URL` di dalam file `.env` Anda dapat diakses dari dalam container Docker. Jika database Anda berada di server yang sama, gunakan alamat IP mesin tersebut (bukan `localhost`).

### 3. Akses Aplikasi
Aplikasi sekarang dapat diakses melalui browser di alamat:
`http://<IP_SERVER>:9010`

---

## 🏗️ Struktur Project
- `/app`: Routing dan UI Next.js (App Router).
- `/prisma`: Schema database dan file migrasi.
- `/lib`: Utilitas dan konfigurasi shared (Prisma client, AI setup).
- `/public`: Aset statis seperti gambar dan icon.

---

## 📄 Lisensi
Project ini dibuat untuk keperluan pengembangan dan pembelajaran.

---

