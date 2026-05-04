# **Product Requirements Document (PRD)**

**Proyek:** Personal AI Roleplay Platform (Web-based)

**Status:** Perencanaan Fase 1

**Target Pengguna:** Penggunaan Pribadi (Single-Tenant)

## **1\. Ringkasan Eksekutif**

Aplikasi ini adalah platform *chat roleplay* berbasis web yang di-host secara mandiri (self-hosted). Aplikasi ini memungkinkan pengguna untuk berinteraksi dengan karakter AI yang memiliki kepribadian, latar belakang, dan memori percakapan yang konsisten. Terinspirasi oleh Kindroid, sistem ini dirancang untuk memberikan pengalaman *chat* yang imersif, respons cepat (streaming), dan kontrol penuh atas data pribadi.

## **2\. Tujuan & Sasaran**

* **Fokus Privasi:** Menjaga semua riwayat percakapan secara lokal di *server* pribadi (MySQL).  
* **Imersif:** Menyediakan UI/UX yang modern, responsif, dan mendukung format *roleplay* (membedakan narasi aksi dengan dialog).  
* **Memori Kontekstual:** Memastikan AI mengingat kepribadiannya dan konteks obrolan terakhir tanpa *break character*.  
* **Efisien:** Memanfaatkan ekosistem Next.js dan Vercel AI SDK untuk performa *frontend* dan *backend* yang mulus dalam satu *codebase*.

## **3\. Arsitektur Teknis & Tech Stack**

* **Framework Utama:** Next.js 14/15 (App Router). Menangani Frontend (React) dan Backend (Route Handlers/Server Actions).  
* **Styling:** Tailwind CSS \+ Shadcn UI (opsional, untuk komponen UI yang cepat dan elegan).  
* **Database:** MySQL 8.x (berjalan di dalam Docker container).  
* **ORM (Object-Relational Mapping):** Prisma. Digunakan untuk berinteraksi dengan MySQL menggunakan TypeScript secara aman.  
* **AI Engine Integrator:** Vercel AI SDK.  
* **Provider AI:** Google Gemini API (via Google AI Studio \- Tier Gratis) atau Groq.  
* **Deployment:** Docker Compose di CentOS Home Server, diekspos melalui Cloudflare Tunnels.

## **4\. Fitur Utama (Core Features)**

### **4.1. Manajemen Karakter (Character Hub)**

* **Daftar Karakter:** Menampilkan kartu karakter yang telah dibuat.  
* **Buat/Edit Karakter:**  
  * **Nama:** Nama karakter.  
  * **Avatar:** URL gambar atau unggah gambar profil.  
  * **Persona (System Prompt):** Instruksi rahasia (inti karakter) yang mendefinisikan sifat, latar belakang, dan gaya bicara. Tidak terlihat di UI *chat*.  
  * **Greeting Message:** Pesan pembuka atau skenario awal saat *chat* pertama kali dimulai.  
* **Hapus Karakter:** Menghapus karakter beserta seluruh riwayat percakapannya.

### **4.2. Antarmuka Percakapan (Chat Interface)**

* **Real-time Streaming:** Teks balasan AI muncul kata per kata, tidak menunggu seluruh teks selesai di-*generate*.  
* **Markdown Support:** Mendukung huruf miring (italic) menggunakan tanda \*aksi fisik\* untuk memperjelas narasi *roleplay*.  
* **Typing Indicator:** Menampilkan status animasi saat AI sedang "berpikir".  
* **Regenerate / Edit:** Kemampuan untuk meminta AI merespons ulang pesan terakhir (jika balasannya kurang pas), atau mengedit pesan pengguna.

### **4.3. Sistem Memori (Context Management)**

Sistem otomatis yang berjalan di *backend* sebelum pesan dikirim ke API LLM:

* **Persona Injection:** Selalu menyisipkan "Persona" ke dalam system *role*.  
* **Sliding Window Memory:** Mengambil maksimal 20-30 pesan terakhir dari *database* MySQL untuk menghemat kuota token namun tetap menjaga konteks percakapan.

## **5\. Struktur Database (Prisma Schema Plan)**

Sistem ini membutuhkan tiga tabel utama di MySQL:

**Tabel Character**

Menyimpan profil AI.

* id (String/UUID, Primary Key)  
* name (String)  
* avatar\_url (String, opsional)  
* persona (Text \- menyimpan *system prompt* lengkap)  
* greeting (Text \- pesan pertama dari AI)  
* created\_at (DateTime)  
* updated\_at (DateTime)

**Tabel ChatSession**

(Opsional tapi disarankan). Memisahkan percakapan. Anda bisa memiliki beberapa alur cerita (sesi) yang berbeda dengan satu karakter yang sama.

* id (String/UUID, Primary Key)  
* character\_id (Foreign Key \-\> Character.id)  
* title (String, nama sesi cerita)  
* created\_at (DateTime)

**Tabel Message**

Menyimpan riwayat obrolan secara berurutan.

* id (String/UUID, Primary Key)  
* session\_id (Foreign Key \-\> ChatSession.id)  
* role (Enum: 'user', 'assistant', 'system')  
* content (Text \- isi pesan)  
* created\_at (DateTime)

## **6\. Logika Prompting & Integrasi AI (The Secret Sauce)**

Ketika pengguna mengetik pesan dan menekan "Kirim", inilah yang terjadi di Next.js *Backend*:

1. **Fetch Data:** *Server* mengambil Persona karakter dari DB, dan mengambil 20 pesan terakhir dari tabel Message.  
2. **Rakit Payload Array:**  
   const messages \= \[  
     { role: "system", content: character.persona }, // Selalu di atas  
     ...last20MessagesFromDB, // Riwayat obrolan (user & assistant)  
     { role: "user", content: newMessage } // Pesan terbaru  
   \]

3. **Kirim ke API:** Payload dikirim ke Gemini/Groq menggunakan Vercel AI SDK streamText().  
4. **Simpan ke DB:** Pesan *user* (newMessage) disimpan ke MySQL. Saat *streaming* balasan AI selesai, balasan penuh tersebut juga disimpan ke MySQL dengan *role* assistant.

## **7\. Fase Pengembangan (Roadmap)**

### **Fase 1: Setup & Konfigurasi Dasar**

* Inisialisasi Next.js (npx create-next-app@latest).  
* Inisialisasi Prisma & koneksi ke MySQL.  
* Membuat *schema* Prisma dan melakukan migrasi awal (prisma db push).

### **Fase 2: CRUD Karakter**

* Membuat halaman daftar karakter.  
* Membuat form tambah/edit karakter (menyimpan Nama, Persona, Greeting).

### **Fase 3: Integrasi Chat & AI**

* Membuat UI Chat Room (Input teks, area pesan).  
* Mengatur Vercel AI SDK dan mendapatkan API Key (Gemini/Groq).  
* Menyambungkan logika POST /api/chat untuk menerima pesan, menarik riwayat dari Prisma, dan mengembalikan *streaming response*.

### **Fase 4: Polishing & Deployment**

* Memperbaiki styling UI/UX (Markdown untuk \*tindakan\*).  
* Menyiapkan Dockerfile dan docker-compose.yml (memasukkan Next.js dan MySQL image).  
* *Deploy* ke CentOS server dan *routing* via Cloudflare.