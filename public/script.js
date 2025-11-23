document.getElementById("btnSaveUser").addEventListener("click", async () => {
    const firstname = document.getElementById("firstname").value;
    const lastname = document.getElementById("lastname").value;
    const email = document.getElementById("email").value;

    // ===== API KEY ID HARUS ADA =====
    // Ambil ID API KEY dari server
    // Karena API Key yang tampil di layar hanyalah TEXT,
    // kita harus ambil ID-nya lewat endpoint GET /api/keys

    const apiKeyText = document.getElementById("result").value; 
    const keyOnly = apiKeyText.replace("API-", ""); 

    // CARI API KEY DI DATABASE BERDASARKAN TEKS KEY
    const check = await fetch("/api/keys");
    const list = await check.json();

    const found = list.find(k => k.key === apiKeyText);

    if (!found) {
        alert("API Key tidak ditemukan di database! Simpan API Key dulu.");
        return;
    }

    const apiKeyId = found.id;

    // KIRIM USER KE BACKEND
    const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            firstname,
            lastname,
            email,
            apiKeyId
        })
    });

    const data = await res.json();
    alert("User berhasil disimpan!");
});
