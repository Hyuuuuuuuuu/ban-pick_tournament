const fs = require('fs');
const path = require('path');

// ĐƯỜNG DẪN FILE
const oldPath = path.join(__dirname, 'data/songs.json');       // Dữ liệu cũ (Cần thêm version)
const refPath = path.join(__dirname, 'data/songs_ref.json');   // Dữ liệu mới (Có version)
const outPath = path.join(__dirname, 'data/songs_updated.json'); // Kết quả

try {
    console.log("⏳ Đang đọc dữ liệu...");
    
    let oldData = require(oldPath);
    let refDataRaw = require(refPath);
    let refList = [];

    // --- 1. XỬ LÝ DỮ LIỆU ĐẦU VÀO (AUTO DETECT) ---
    // Kiểm tra xem file mới là Array [...] hay Object {...}
    if (Array.isArray(refDataRaw)) {
        refList = refDataRaw;
    } else if (refDataRaw.songs && Array.isArray(refDataRaw.songs)) {
        refList = refDataRaw.songs;
    } else if (refDataRaw.items && Array.isArray(refDataRaw.items)) {
        refList = refDataRaw.items;
    } else {
        // Nếu là dạng Object Dictionary { "id": {data}, "id2": {data} }
        console.log("ℹ️ Dữ liệu dạng Object. Đang chuyển đổi...");
        refList = Object.values(refDataRaw);
    }

    console.log(`📊 Dữ liệu gốc: ${oldData.length} charts`);
    console.log(`📊 Dữ liệu mới (Tham khảo): ${refList.length} bài hát`);

    // --- 2. TẠO TỪ ĐIỂN TRA CỨU (MAPPING) ---
    // Key = Tên bài hát (viết thường, bỏ dấu câu để khớp chính xác hơn)
    const versionMap = new Map();

    refList.forEach(song => {
        // Lấy tên và version từ mẫu dữ liệu bạn gửi
        const title = song.title; 
        const version = song.version; 

        if (title && version) {
            // Chuẩn hóa tên: "Mr. Wonderland" -> "mr.wonderland" (để dễ so sánh)
            const cleanTitle = title.toLowerCase().trim();
            versionMap.set(cleanTitle, version);
        }
    });

    console.log(`📝 Đã học được Version của ${versionMap.size} bài hát.`);

    // --- 3. GHÉP VERSION VÀO DỮ LIỆU CŨ ---
    let matchCount = 0;
    
    const newData = oldData.map(song => {
        // Lấy tên bài hát từ dữ liệu cũ
        // Lưu ý: Dữ liệu cũ có thể có tên "[DX] Title [Re:MAS]" -> Cần lấy "Title" gốc nếu có thể
        // Nhưng thường field "title" gốc sẽ giống nhau.
        if (!song.title) return { ...song, version: "Unknown" };

        const key = song.title.toLowerCase().trim();
        
        let foundVersion = "Unknown";

        if (versionMap.has(key)) {
            foundVersion = versionMap.get(key);
            matchCount++;
        } 

        return {
            ...song,      // Giữ nguyên toàn bộ thông tin cũ (id, level, difficulty...)
            version: foundVersion // Thêm dòng này vào
        };
    });

    // --- 4. LƯU FILE ---
    fs.writeFileSync(outPath, JSON.stringify(newData, null, 2), 'utf8');

    console.log("\n---------------------------------------------------");
    console.log(`✅ HOÀN TẤT!`);
    console.log(`✅ Đã tìm thấy Version cho: ${matchCount} / ${oldData.length} chart.`);
    console.log(`💾 File mới nằm tại: ${outPath}`);
    console.log("👉 BƯỚC CUỐI: Xóa file 'songs.json' cũ và đổi tên 'songs_updated.json' thành 'songs.json'.");
    console.log("---------------------------------------------------");

} catch (err) {
    console.error("\n❌ LỖI:", err.message);
    console.log("Gợi ý: Kiểm tra xem file songs_ref.json có đúng cú pháp JSON không.");
}