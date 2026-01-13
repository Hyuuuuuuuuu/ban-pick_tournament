import React from 'react';

const SmartImage = ({ song, style }) => {
  // Nguồn ảnh từ Repo zvuc/otoge-db mà bạn tìm được
  const GH_BASE_URL = "https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/";
  
  // Nguồn dự phòng 1: shama.me (phòng trường hợp GitHub bị limit hoặc bài quá mới)
  const MIRROR_URL = "https://shama.me/maimai-jacket/";

  let rawHash = song.image_hash ? song.image_hash.trim() : "";
  
  // Đảm bảo tên file luôn có đuôi .png để khớp với repo GitHub
  let fileName = rawHash;
  if (!fileName.endsWith('.png') && !fileName.endsWith('.jpg')) {
      fileName = fileName + ".png";
  }

  const primarySrc = `${GH_BASE_URL}${fileName}`;
  const backupSrc = `${MIRROR_URL}${fileName}`;

  return (
    <img 
      src={primarySrc} 
      alt={song.title} 
      style={{ 
        ...style, 
        objectFit: 'cover', 
        display: 'block', 
        backgroundColor: '#1a1a1a', // Nền tối khi chưa load xong ảnh
      }}
      onError={(e) => {
         // Nếu GitHub lỗi (primarySrc), thử nhảy sang Mirror (backupSrc)
         if (e.target.src !== backupSrc) {
             console.log(`GitHub image missing, trying mirror for: ${song.title}`);
             e.target.src = backupSrc;
         } else {
             // Nếu cả hai đều lỗi, hiện ảnh logo mặc định của SEGA
             e.target.src = "https://maimai.sega.jp/assets/net/images/common/img_logo.png";
         }
      }}
    />
  );
};

export default SmartImage;