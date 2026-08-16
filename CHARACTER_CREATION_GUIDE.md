# 🎭 Panduan Lengkap Pembuatan Karakter Roleplay

Dokumen ini berisi panduan dan *best practices* untuk mengisi data karakter saat Anda membuat karakter baru di aplikasi ini. Karena aplikasi ini menggunakan **Novita AI (Llama 3 8B Stheno)** dan memiliki sistem memori khusus (Real-Time State Tracking), pengisian karakter yang tepat akan menghasilkan pengalaman *roleplay* yang jauh lebih cerdas dan natural.

---

## 1. Name (Nama Karakter)
Isi dengan nama panggilan karakter. Nama ini akan digunakan oleh AI untuk mengenali dirinya sendiri dalam narasi.
* **Tips:** Gunakan nama pendek atau panggilan akrab. Hindari menyertakan gelar panjang kecuali memang wajib diucapkan setiap saat (contoh: *Mrs. Maya* lebih baik daripada *Mrs. Maya The Strict Teacher*).

## 2. Avatar URL (Foto Profil)
Masukkan URL atau *link* gambar langsung (diakhiri dengan `.jpg` atau `.png`).
* **Tips:** Cari gambar di Imgur atau Discord, lalu klik kanan *Copy Image Address*.

## 3. Backstory / Persona (Latar Belakang & Kepribadian)
Ini adalah "Otak Utama" dari karakter. Bagian ini memberitahu AI siapa dirinya, bagaimana sifatnya, dan apa kelemahannya.
* **Format Terbaik:** Gunakan sudut pandang orang ketiga (Third Person) atau format *Trait List*.
* **Contoh (Buruk):** "Saya adalah guru yang galak dan suka menghukum murid." *(Terlalu dangkal)*
* **Contoh (Bagus):**
  ```text
  [Personality: Strict, secretly caring, easily flustered when complimented, professional but harbors dark desires.]
  [Background: A 35-year-old biology teacher who has been teaching for 10 years. She wears glasses and tight pencil skirts.]
  [Quirks: Always taps her pen when annoyed. Sighs deeply when frustrated.]
  ```

## 4. Scenario (Skenario Awal)
Menentukan **konteks tempat dan situasi** saat *roleplay* baru saja dimulai. Karena aplikasi kita memiliki *Real-Time State Tracker* (pelacak lokasi dan baju), skenario ini menjadi fondasi awal sebelum pelacak menyala.
* **Contoh:** 
  ```text
  User and Maya are currently alone in the classroom after school hours. The classroom is quiet, and the sun is setting outside. Maya is sitting at her desk, grading papers, wearing her usual tight blazer and glasses.
  ```

## 5. Key Memories (Ingatan Kunci / Lore)
Fakta-fakta absolut yang tidak boleh dilupakan oleh AI sepanjang cerita, seberapa panjang pun obrolannya.
* **Tips:** Jangan isi dengan cerita panjang. Isi dengan poin-poin singkat yang penting.
* **Contoh:**
  ```text
  - Maya and User have known each other for 2 semesters.
  - Maya secretly confiscated User's phone yesterday.
  - User is the worst-performing student in her class.
  ```

## 6. Example Dialogue (Contoh Gaya Bicara)
**Sangat Krusial!** LLM (terutama model 8B) sangat bergantung pada contoh untuk menentukan gaya penulisan mereka. Di sinilah Anda "mengajari" AI untuk seimbang antara berdialog (omongan) dan bernarasi (tindakan dengan tanda `*`).
* **Tips:** Berikan 2-3 percakapan pendek yang menunjukkan *tone* suara mereka. Pastikan menggunakan tanda `*` untuk aksi.
* **Contoh:**
  ```text
  User: "I'm sorry I'm late, Miss."
  {{char}}: *She sighs heavily and adjusts her glasses, glaring at you.* "Late again? That's the third time this week. Sit down before I give you detention."
  
  User: "You look beautiful today."
  {{char}}: *A faint blush creeps up her neck, but she quickly crosses her arms to maintain her stern posture.* "F-flattery won't improve your grades. Open your textbook to page 42, immediately."
  ```

## 7. Response Directives (Aturan Perilaku Khusus)
Aplikasi ini sudah dipasangi aturan bawaan *(System Prompt)* yang mencegah AI mendikte/mengontrol User (*Anti-Godmoding*). Namun, di kolom ini, Anda bisa menambahkan aturan spesifik untuk karakter ini saja.
* **Contoh:**
  ```text
  - NEVER break character.
  - Always speak in a cold, authoritative tone until Affinity Level 5.
  - Frequently use the word "Naughty student".
  ```

---

## 💡 Pro-Tips Ekstra untuk Pengguna Aplikasi Ini:

1. **Aturan "Tektokan" (Ping-Pong Rule):**
   Aplikasi Anda sudah disetel agar AI tidak melompat (*fast-forward*) cerita. Jadi, jangan menulis 3 aksi berbeda dalam 1 chat. Tulislah satu aksi, biarkan AI merespons aksi tersebut, lalu balas lagi.
   
2. **Real-Time State Tracker (Baju & Lokasi):**
   Anda tidak perlu terus-menerus mengingatkan AI bahwa ia sedang telanjang atau sedang berada di kasur. Aplikasi akan melacak status fisik karakter secara otomatis di latar belakang (*background*). AI tidak akan "lupa" bajunya.

3. **Panjang Pesan AI:**
   Saat ini, AI sudah diinstruksikan untuk membalas secara padat (1-2 paragraf) dengan fokus pada dialog ketimbang narasi puitis yang bertele-tele. Jika Anda ingin AI bercerita lebih panjang suatu saat, cukup beri tahu dia di kolom *chat*: `(OOC: Tolong deskripsikan ruangan ini dengan sangat detail)`.
