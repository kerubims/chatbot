# Roleplay AI - System Page Design Documentation

Dokumen ini berisi rincian lengkap mengenai semua halaman (pages), tombol (buttons), dan input yang tersedia pada sistem Roleplay AI berdasarkan struktur *codebase* saat ini (Next.js App Router).

---

## 1. Halaman Utama / Home Page (`/`)
Halaman pertama yang dilihat pengguna saat membuka aplikasi, berfungsi sebagai *landing page*.

**Elemen & Teks:**
- Logo Emoticon: 🎭
- Judul Utama: "Roleplay AI" (dengan efek gradient)
- Deskripsi: Penjelasan singkat tentang fitur sistem (membuat karakter, memori kontekstual, dll).

**Tombol & Tautan (Links):**
- `Enter Character Hub →` : Tautan utama (tombol primary) untuk masuk ke halaman daftar karakter (`/characters`).
- `👤 Edit Your Profile` : Tautan sekunder untuk menuju halaman pengaturan profil pengguna (`/profile`).

---

## 2. Halaman Character Hub (`/characters`)
Halaman utama yang menampilkan daftar karakter AI yang telah dibuat oleh pengguna.

**Elemen & Teks:**
- *Header*: Menampilkan judul "🎭 Character Hub" dan teks pendukung.
- *Loading State*: Menampilkan teks "Loading characters..." saat mengambil data.
- *Empty State*: Jika tidak ada karakter, menampilkan kotak berisi ikon 🎭, teks "No characters yet", dan deskripsi.
- *Grid Karakter*: Menampilkan daftar kartu karakter (Character Card) jika data karakter tersedia.

**Tombol & Tautan (Links):**
- `← Home` : Tautan kembali ke Halaman Utama (`/`).
- `👤 Profile` : Tombol tautan ke halaman profil pengguna (`/profile`).
- `+ New Character` : Tombol tautan utama untuk membuat karakter baru (`/characters/new`).
- `+ Create Character` : Tombol tautan yang muncul secara khusus saat daftar karakter kosong (di area *empty state*).

*(Pada komponen `CharacterCard` secara umum terdapat interaksi untuk memilih karakter (masuk ke halaman chat), tombol/ikon `Edit` (`/characters/[id]/edit`), dan tombol `Delete` untuk menghapus karakter).*

---

## 3. Halaman Profile (`/profile`)
Halaman bagi pengguna untuk mengatur identitas dan preferensi peran (persona) mereka sendiri yang akan dibaca oleh AI.

**Elemen & Teks:**
- *Header*: Judul "👤 Your Profile" beserta penjelasan singkat.
- *Info Card*: Kotak di bagian bawah berlabel "💡 Pro Tip" berisi saran pengisian persona.
- *Notifikasi Sukses*: Teks "✓ Profile saved successfully!" (muncul sesaat setelah berhasil menyimpan).

**Input & Form:**
- **Display Name** (`input type="text"`): Nama panggilan pengguna yang akan disapa oleh AI.
- **Gender** (*Button Group*): Pilihan jenis kelamin pengguna. Tersedia opsi: `Not specified`, `Male`, `Female`, `Non-binary`, `Other`.
- **Your Persona** (`textarea`): Area teks opsional untuk mendeskripsikan siapa pengguna di dunia *roleplay*.
- **Response Style Preference** (`textarea`): Area teks opsional berisi instruksi global bagaimana AI harus merespons (contoh: gaya bahasa, panjang paragraf).

**Tombol & Tautan (Links):**
- `← Back to Characters` : Tautan kembali ke Halaman Character Hub.
- `Pilihan Gender (5 tombol)` : Untuk memilih gender pada form input.
- `💾 Save Profile` (atau `Saving...`) : Tombol aksi utama untuk menyimpan data ke database.

---

## 4. Halaman Create New Character (`/characters/new`)
Halaman berisi formulir pembuatan karakter AI baru. Menggunakan sistem *Tab* (Basic dan Advanced).

**Elemen & Teks:**
- *Header*: Judul "✨ Create New Character".
- *Preview Card*: Muncul secara *real-time* di bagian bawah form jika pengguna sudah mulai mengisi nama karakter. Menampilkan avatar, nama karakter, keterangan gender, dan teks sapaan awal (Greeting).

**Input & Form (Berdasarkan Tab):**

*Tab 🎭 Basic:*
- **Character Name \*** (`input type="text"`): Nama karakter AI. (Wajib)
- **Avatar URL** (`input type="text"`): Tautan URL langsung menuju gambar avatar.
- **Input File Tersembunyi** (`input type="file" accept="image/*"`): Input file asli yang ditrigger oleh tombol Upload.
- **Gender** (*Button Group*): Pilihan jenis kelamin karakter (`Not specified`, `Male`, `Female`, `Non-binary`, `Other`).
- **Backstory \*** (`textarea`): Sejarah, kepribadian, dan sifat dasar karakter. (Wajib)
- **Greeting Message \*** (`textarea`): Pesan sapaan pertama yang akan dikirim AI saat percakapan baru dimulai. (Wajib)

*Tab ⚙️ Advanced:*
- **Key Memories** (`textarea`): Fakta-fakta penting yang selalu diingat karakter secara permanen.
- **Current Scenario** (`textarea`): Latar, tempat, atau situasi *roleplay* saat ini terjadi.
- **Response Directives** (`textarea`): Aturan/instruksi spesifik tentang bagaimana AI tersebut menulis (format, gaya bahasa, batasan).
- **Example Dialogue** (`textarea`): Contoh percakapan untuk mengajari AI pola dan nada bicara karakter.

**Tombol & Tautan (Links):**
- `← Back to Characters` : Tautan di atas form untuk kembali tanpa menyimpan.
- `🎭 Basic` & `⚙️ Advanced` : Tombol Tab untuk berpindah mode isian form.
- `📁 Upload Image` (atau `Uploading...`) : Tombol untuk membuka jendela *file explorer* PC/HP guna mengunggah gambar avatar.
- `Pilihan Gender (5 tombol)` : Untuk memilih gender karakter.
- `🎭 Create Character` (atau `Creating...`) : Tombol aksi (submit) utama untuk menyimpan karakter baru.
- `Cancel` : Tautan sekunder di bawah tombol Submit untuk membatalkan pembuatan karakter.

---

## 5. Halaman Edit Character (`/characters/[id]/edit`)
Memiliki tampilan dan fungsi yang hampir identik dengan halaman Create New Character, namun digunakan untuk memodifikasi data karakter yang sudah ada.

**Perbedaan Utama dengan Halaman Create:**
- Judul halaman berubah menjadi "✏️ Edit Character".
- Tombol Submit (aksi utama) berubah menjadi `💾 Save Changes` (atau `Saving...`).
- Saat pertama kali dimuat, semua input form secara otomatis terisi dengan data karakter yang ada di *database* (melalui *fetch API*).

---

## 6. Halaman Chat Interface (`/chat/[characterId]`)
Halaman inti dari aplikasi untuk berinteraksi (*roleplay*) dengan karakter AI. Halaman ini memiliki tata letak terbagi (*sidebar* dan *chat area*) serta dilengkapi fitur *overlay/modal*.

### A. Sidebar Session (`SessionSidebar.tsx`)
Berada di sisi kiri (desktop) atau sebagai *overlay/drawer* (mobile).
- **Elemen:** Nama karakter yang sedang diajak *chat*. Label teks kecil untuk bagian Settings dan Usage Stats.
- **Tombol & Input:**
  - `Tombol Tutup (✕)` : Hanya di mobile, menutup *sidebar*.
  - `+ New Session` (Tombol) : Memulai ruang obrolan (sesi) baru dengan karakter tersebut.
  - **Daftar Sesi (Session List)** : Tombol berisi riwayat sesi (contoh: "New Chat", "Perjalanan ke Hutan", dll) untuk berpindah percakapan.
  - `✕ (Delete Session)` : Ikon tombol hapus (muncul saat kursor di-hover ke daftar sesi).
  - **Creativity (Temp)** (`input type="range"`) : *Slider* untuk mengatur *temperature* AI (kadar kreativitas respon) dengan rentang `0.1` hingga `1.5`.
  - `← Back to Characters` : Tautan untuk kembali ke menu daftar karakter.

### B. Chat Header & Affinity Bar
- **Tombol Hamburger (Menu)** : (Ikon di kiri atas) Membuka *sidebar* (khusus saat layar berukuran kecil/mobile) dan menutup *sidebar* di layar desktop.
- **Nama & Status** : Nama karakter dan status indikator (*online* atau *typing...*).
- **Affinity Bar** : Indikator garis progres visual yang menunjukkan level kedekatan (Affinity Level) dan poin *experience* (EXP) dengan karakter.

### C. Chat Actions (Horizontal Button Bar)
Area dengan tombol berbentuk pil (*pill buttons*) yang bisa digeser mendatar, tepat di atas area pengetikan.
- `📖 Story Journal` (Tombol) : Membuka Modal Story Viewer untuk melihat rangkuman cerita sesi ini.
- `🪙 Token Usage` (Tombol) : Membuka Modal Token Usage.
- `🖼️ Photo` (Tombol) : Tombol untuk fitur meminta foto (saat ini tampaknya masih berupa visual saja/placeholder).
- `👕 Dress up` (Tombol) : Tombol untuk fitur ganti pakaian (placeholder).
- `🎁 Gift` (Tombol) : Tombol untuk fitur memberi hadiah (placeholder).

### D. Chat Input Area (`ChatInput.tsx`)
- **Textarea Pengetikan (`textarea`)** : Area teks yang dapat memanjang otomatis (auto-resize) ke bawah untuk mengetik pesan. 
- **Tombol Aksi Bintang (`*`)** : Tombol ungu kecil untuk secara otomatis membungkus teks yang sedang di-blok dengan tanda bintang (`*teks*`) yang dalam RP biasanya menandakan sebuah aksi gerak tubuh.
- **Tombol Kirim (Send)** : Ikon panah/kertas terbang untuk mengirim teks ke AI. Akan menjadi *disabled* (tidak bisa diklik) jika pesan kosong atau AI masih memproses (*streaming*).

### E. Modal & Overlay
- **Token Usage Modal** : Sebuah jendela *pop-up* yang menampilkan rincian penggunaan token:
  - Teks: Prompt Tokens, Completion Tokens, Total Cost (Harga estimasi USD).
  - Tombol: `✕` (Tutup).
- **Story Viewer Modal** : (Dipanggil lewat tombol Story Journal) Menampilkan UI rangkuman memori cerita.
- **Level Up Overlay** : Muncul mendadak dengan efek animasi jika Affinity level meningkat (naik level).
- **Exp Toast Notification** : Pemberitahuan singkat (*toast*) yang muncul lalu menghilang untuk menunjukkan perubahan poin EXP setelah chat.
- **Error & Rate Limit Warning** : Kotak pesan yang muncul di ruang *chat* jika koneksi terputus atau batas limit kirim pesan tercapai.
