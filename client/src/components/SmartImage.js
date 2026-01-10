import React from 'react';

const SmartImage = ({ song, style }) => {
  const origin = window.location.origin;
  let rawHash = song.image_hash ? song.image_hash.trim() : "";
  let fileName = (rawHash.endsWith('.png') || rawHash.endsWith('.jpg')) ? rawHash : rawHash + ".png";
  const SERVER_URL = "http://localhost:3001";
  const fullSrc = `${SERVER_URL}/assets/jackets/${fileName}`;

  return (
    <img 
      src={fullSrc} alt={song.title} 
      style={{ ...style, objectFit: 'cover', display: 'block', backgroundColor: '#333' }}
      onError={(e) => {
         if (fullSrc.endsWith('.png')) {
             e.target.src = `${SERVER_URL}/assets/jackets/${fileName.replace('.png', '.jpg')}`;
         } else {
             e.target.src = "https://maimai.sega.jp/assets/net/images/common/img_logo.png";
         }
      }}
    />
  );
};
export default SmartImage;