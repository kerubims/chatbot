### 1. Gunakan *"Sliding Window"* + *Summary*, Jangan Di-cut Bersih

Saat melakukan *auto-summary* setiap 20 chat, pastikan sistem tidak memotong 20 chat lama dan menggantinya mentah-mentah dengan teks ringkasan.

* **Optimasi:** Gunakan metode tumpang-tindih (*overlapping*). Misalnya, simpan 5-7 chat terakhir secara utuh (*raw text*), lalu gabungkan dengan hasil *summary* dari 15 chat sebelumnya. Hal ini berguna untuk menjaga agar aliran emosi (*vibe*) dan gaya bicara instan di pesan terakhir tidak hilang akibat formalitas bahasa ringkasan.

### 2. Strategi Pembaruan *State Memory*

Untuk variabel dinamis seperti waktu, tempat, dan postur tubuh, bagaimana sistem Anda memperbaruinya? Jika Anda meminta LLM utama untuk memperbarui *state* tersebut sekaligus menghasilkan respons chat dalam satu kali jalan (*single-call inference*), akurasinya bisa menurun.

* **Optimasi:** Gunakan teknik *Function Calling (Tools)* atau LLM penilai sekunder yang lebih kecil/murah (seperti Llama 3 8B) di latar belakang. Tugasnya dikhususkan untuk mendeteksi apakah di chat terakhir terdapat perubahan waktu atau postur. Jika ada, perbarui *database state* Anda. Jika tidak ada, pertahankan *state* lama.

### 3. Integrasikan Vector DB untuk *"Long-Term Memory"* (RAG)

*Auto-summary* 20 chat sangat bagus untuk ingatan jangka pendek hingga menengah. Namun, jika pengguna sudah bertukar pesan hingga 500 chat, ringkasan dari ringkasan dari ringkasan (efek *compounding summary*) akan membuat detail penting di awal chat hilang (misalnya: nama hewan peliharaan rahasia milik karakter).

* **Optimasi:** Setiap kali *auto-summary* dijalankan, simpan juga potongan-potongan info penting atau momen krusial ke dalam *Vector Database* (seperti Pinecone, Chroma, atau pgvector). Gunakan teknik *Semantic Search* (RAG) untuk memanggil kembali ingatan spesifik tersebut hanya jika pengguna mengungkit topik yang relevan di kemudian hari.

---

### Contoh Implementasi Struktur Prompt

**[1. Core Persona Card / Skenario]**

> ... *(Detail karakter Anda)* ...

**[2. Rolling Summary / Cerita Sejauh Ini]**

> ... *(Sinopsis chat lama Anda)* ...

**[3. State Memory Aktif]**

> *toilet stall, 12.00, karakter wear skirt*

**[4. Sliding Window (Chat Utuh Terakhir)]**

> **Karakter:** "Aku tidak tahu harus berbuat apa lagi." **bersandar di dinding**
> **User:** "Tenang saja, kita cari jalan keluar bersama."

**[5. SYSTEM MESSAGE ANCHOR (Disisipkan di sini!)]**

> **[System Note:** Tanggapi user dengan memprioritaskan dialog verbal langsung. Batasi teks aksi (*) maksimal 1 kalimat pendek saja.**]**