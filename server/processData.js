// server/processData.js
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'data/datasong_raw.json');
const OUTPUT_FILE = path.join(__dirname, 'data/songs.json');

try {
    console.log(" Đang đọc file datasong_raw.json...");
    
    if (!fs.existsSync(INPUT_FILE)) {
        throw new Error("Không tìm thấy file datasong_raw.json!");
    }

    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

    const cleanData = rawData.flatMap(song => {
        const playableCharts = [];
        const sortId = parseInt(song.sort);

        // --- HÀM TẠO OBJECT CHART ĐỂ DÙNG CHUNG ---
        const createChart = (type, difficulty, level, suffixId, label) => {
            return {
                // ID duy nhất
                id: `${song.sort}_${suffixId}`,
                sort_id: sortId,
                
                title: song.title,
                // Tên hiển thị kèm nhãn:
                display_title: `[${type}] ${song.title} [${label}]`,
                
                artist: song.artist,
                genre: song.catcode,
                image_hash: song.image_url,
                
                type: type,             // 'STD' hoặc 'DX'
                difficulty: difficulty, // 'EXP', 'MAS', 'REMAS'
                level: level            // Level của chart đó 
            };
        };

        // ==========================================
        // 1. XỬ LÝ STANDARD (STD)
        // ==========================================
        
        // Lấy EXPERT (STD)
        if (song.lev_exp) {
            playableCharts.push(createChart('STD', 'EXP', song.lev_exp, 'std_exp', 'EXP'));
        }

        // Lấy MASTER (STD)
        if (song.lev_mas) {
            playableCharts.push(createChart('STD', 'MAS', song.lev_mas, 'std_mas', 'MAS'));
        }

        // Lấy RE:MASTER (STD)
        if (song.lev_remas) {
            playableCharts.push(createChart('STD', 'REMAS', song.lev_remas, 'std_remas', 'Re:MAS'));
        }

        // ==========================================
        // 2. XỬ LÝ DX
        // ==========================================

        // Lấy EXPERT (DX)
        if (song.dx_lev_exp) {
            playableCharts.push(createChart('DX', 'EXP', song.dx_lev_exp, 'dx_exp', 'EXP'));
        }

        // Lấy MASTER (DX)
        if (song.dx_lev_mas) {
            playableCharts.push(createChart('DX', 'MAS', song.dx_lev_mas, 'dx_mas', 'MAS'));
        }

        // Lấy RE:MASTER (DX)
        if (song.dx_lev_remas) {
            playableCharts.push(createChart('DX', 'REMAS', song.dx_lev_remas, 'dx_remas', 'Re:MAS'));
        }

        return playableCharts;
    });

    // Sắp xếp theo ID gốc -> Sau đó ưu tiên Master lên trước Expert (nếu muốn)
    cleanData.sort((a, b) => a.sort_id - b.sort_id);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanData, null, 2));
    console.log(` Xong! Đã tạo file songs.json với ${cleanData.length} chart (Bao gồm cả Exp, Mas, ReMas).`);

} catch (error) {
    console.error(" LỖI:", error.message);
}