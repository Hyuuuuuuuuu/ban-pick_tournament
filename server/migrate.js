const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Kết nối tới MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || MONGODB_URI.includes('<password>')) {
    console.error("❌ LỖI: Bạn chưa cấu hình MONGODB_URI đúng trong file .env");
    process.exit(1);
}

// 2. Định nghĩa cấu trúc dữ liệu để MongoDB hiểu
const SongSchema = new mongoose.Schema({
    id: String, sort_id: Number, title: String, display_title: String,
    artist: String, genre: String, image_hash: String,
    type: String, difficulty: String, level: String, version: String
});
const Song = mongoose.model('Song', SongSchema);

const RosterSchema = new mongoose.Schema({ names: [String] });
const Roster = mongoose.model('Roster', RosterSchema);

const PoolSchema = new mongoose.Schema({
    round_8: [String], round_4: [String], final: [String]
});
const Pool = mongoose.model('Pool', PoolSchema);

async function startMigration() {
    try {
        console.log("⏳ Đang kết nối tới MongoDB Atlas...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Kết nối thành công!");

        // --- CHUYỂN DỮ LIỆU NHẠC (SONGS) ---
        console.log("⏳ Đang chuyển dữ liệu Songs...");
        const songsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/songs.json'), 'utf8'));
        await Song.deleteMany({}); // Xóa dữ liệu cũ trên DB để làm mới
        await Song.insertMany(songsData);
        console.log(`✅ Đã đẩy ${songsData.length} bài hát lên MongoDB.`);

        // --- CHUYỂN DỮ LIỆU TUYỂN THỦ (ROSTER) ---
        console.log("⏳ Đang chuyển dữ liệu Tuyển thủ...");
        const rosterData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/roster.json'), 'utf8'));
        await Roster.deleteMany({});
        await Roster.create({ names: rosterData });
        console.log("✅ Đã đẩy danh sách tuyển thủ lên MongoDB.");

        // --- CHUYỂN DỮ LIỆU POOL CÁC VÒNG ---
        console.log("⏳ Đang chuyển dữ liệu Pools...");
        const poolsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/pools.json'), 'utf8'));
        await Pool.deleteMany({});
        await Pool.create(poolsData);
        console.log("✅ Đã đẩy cấu hình Pool các vòng lên MongoDB.");

        console.log("\n-----------------------------------------");
        console.log("🎉 TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC ĐƯA LÊN CLOUD!");
        console.log("-----------------------------------------");
        process.exit(0);

    } catch (err) {
        console.error("❌ LỖI TRONG QUÁ TRÌNH MIGRATE:", err);
        process.exit(1);
    }
}
startMigration();