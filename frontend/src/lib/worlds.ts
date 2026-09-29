export const worlds = [
  { id: 'dark_fantasy', name: 'Dark Fantasy', subtitle: 'Lời nguyền dưới tro tàn', image: '/images/dark_fantasy.png', tag: 'MA THUẬT · SINH TỒN', description: 'Khi những vị thần im lặng, ai sẽ trả lời lời cầu nguyện cuối cùng?' },
  { id: 'cyberpunk', name: 'Cyberpunk', subtitle: 'Thành phố không ngủ', image: '/images/cyberpunk.png', tag: 'CÔNG NGHỆ · ÂM MƯU', description: 'Giữa triệu ánh đèn neon, một ký ức bị đánh cắp có thể thay đổi tất cả.' },
  { id: 'wuxia', name: 'Kiếm hiệp', subtitle: 'Một kiếm, một giang hồ', image: '/images/wuxia.png', tag: 'GIANG HỒ · PHIÊU LƯU', description: 'Danh tiếng, ân oán và con đường chỉ mình bạn có thể bước.' },
  { id: 'sci_fi', name: 'Viễn tưởng', subtitle: 'Bên kia những vì sao', image: '/images/scifi.png', tag: 'KHÁM PHÁ · VŨ TRỤ', description: 'Một tín hiệu xa lạ. Một phi hành đoàn. Không có đường quay lại.' },
  { id: 'horror', name: 'Kinh dị', subtitle: 'Đừng ngoảnh lại', image: '/images/horror.png', tag: 'BÍ ẨN · TÂM LÝ', description: 'Cánh cửa ấy đã mở. Và có thứ gì đó biết tên bạn.' },
  { id: 'romance', name: 'Tình cảm', subtitle: 'Những điều chưa nói', image: '/images/romance.png', tag: 'CẢM XÚC · KẾT NỐI', description: 'Đôi khi, quyết định khó nhất là để một người bước vào cuộc đời.' },
];
export function worldFor(genre: string) {
  const key = genre.toLowerCase().replaceAll(' ', '_');
  return worlds.find(w => w.id === key || (key === 'scifi' && w.id === 'sci_fi')) || worlds[0];
}
