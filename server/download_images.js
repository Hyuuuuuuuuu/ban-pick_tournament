// download_images_v2.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const songs = require('./data/songs.json');

// Lưu vào thư mục public của Client
const SAVE_DIR = path.join(__dirname, '../client', 'public', 'assets', 'jackets');
if (!fs.existsSync(SAVE_DIR)){
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

console.log(`🎯 Đang tìm ảnh cho ${songs.length} bài hát...`);
console.log(`📂 Lưu tại: ${SAVE_DIR}`);

// ĐỔI NGUỒN: Dùng kho ảnh cộng đồng (ổn định hơn SEGA)
const BASE_URL = "https://shama.me/maimai-jacket/";

const downloadImage = (filename, savePath) => {
    return new Promise((resolve, reject) => {
        // Đảm bảo hash có đuôi .png
        const fileUrl = BASE_URL + (filename.endsWith('.png') ? filename : filename + '.png');

        https.get(fileUrl, (res) => {
            if (res.statusCode === 200) {
                const stream = fs.createWriteStream(savePath);
                res.pipe(stream);
                stream.on('finish', () => {
                    stream.close();
                    resolve();
                });
            } else {
                // Nếu mirror này cũng lỗi thì bỏ qua
                res.resume(); 
                reject(new Error(`Lỗi ${res.statusCode}`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
};

const processDownloads = async () => {
    let success = 0;
    let fail = 0;
    const BATCH_SIZE = 10; // Tăng tốc độ tải lên

    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
        const batch = songs.slice(i, i + BATCH_SIZE);
        
        const promises = batch.map(async (song) => {
            const fileName = `${song.image_hash}.png`; 
            const savePath = path.join(SAVE_DIR, fileName);

            if (fs.existsSync(savePath)) return; // Có rồi thì thôi

            try {
                await downloadImage(song.image_hash, savePath);
                console.log(`✅ Tải xong: ${song.title}`);
                success++;
            } catch (err) {
                console.error(`❌ Không tìm thấy ảnh: ${song.title}`);
                fail++;
            }
        });

        await Promise.all(promises);
    }

    console.log(`\n🎉 KẾT QUẢ: Thành công ${success} | Thất bại ${fail}`);
};

processDownloads();