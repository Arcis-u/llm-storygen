"use client";

import { Type, Minus, Plus, Volume2, VolumeX, ImageIcon, RotateCcw, Check } from "lucide-react";
import NexusDialog from "@/components/NexusDialog";
import { useReaderPreferences } from "@/store/useReaderPreferences";

export default function ReaderSettings({ open, onClose, muted, onMute }: {
  open: boolean;
  onClose: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  const preferences = useReaderPreferences();
  return <NexusDialog open={open} onClose={onClose} title="Góc đọc của bạn" eyebrow="MAKE YOURSELF AT HOME" className="reader-customizer">
    <div className="reading-preview" style={{ fontFamily: preferences.typeface === "serif" ? "var(--font-story)" : "var(--font-display)" }}><span>XEM TRƯỚC KIỂU CHỮ</span><p style={{ fontSize: preferences.fontSize }}>Ánh đèn cuối phố vừa sáng. Bạn khép lại trang cũ, để ngỏ một câu chuyện mới.</p><div><i/><span>NEXUS TALE</span><i/></div></div>
    <div className="reading-options">
      <fieldset><legend><Type size={15}/>Kiểu chữ</legend><div className="reading-segments">{([['serif','Văn chương'],['sans','Hiện đại']] as const).map(([value,label]) => <button key={value} aria-pressed={preferences.typeface === value} onClick={() => preferences.setTypeface(value)}><span style={{fontFamily:value === 'serif'?'var(--font-story)':'var(--font-display)'}}>Aa</span>{label}{preferences.typeface === value && <Check size={13}/>}</button>)}</div></fieldset>
      <div className="reading-size"><label htmlFor="reader-font-size">Cỡ chữ <b>{preferences.fontSize}px</b></label><div><button aria-label="Giảm cỡ chữ" disabled={preferences.fontSize <= 16} onClick={() => preferences.setFontSize(preferences.fontSize - 1)}><Minus size={16}/></button><input id="reader-font-size" type="range" min="16" max="24" value={preferences.fontSize} onChange={event => preferences.setFontSize(Number(event.target.value))}/><button aria-label="Tăng cỡ chữ" disabled={preferences.fontSize >= 24} onClick={() => preferences.setFontSize(preferences.fontSize + 1)}><Plus size={16}/></button></div></div>
      <fieldset><legend>Độ rộng trang đọc</legend><div className="reading-segments reading-measure">{([['comfortable','Vừa mắt'],['wide','Rộng thoáng']] as const).map(([value,label]) => <button key={value} aria-pressed={preferences.measure === value} onClick={() => preferences.setMeasure(value)}><span className={`measure-symbol ${value}`} aria-hidden="true"><i/><i/><i/></span>{label}{preferences.measure === value && <Check size={13}/>}</button>)}</div></fieldset>
      <button className="reading-toggle" role="switch" aria-checked={preferences.illustrations} onClick={() => preferences.setIllustrations(!preferences.illustrations)}><ImageIcon size={18}/><span>Minh họa mở chương<small>Không gian thị giác trước mỗi trang truyện</small></span><i className={preferences.illustrations ? "on" : ""}/></button>
      <button className="reading-toggle" role="switch" aria-checked={!muted} onClick={onMute}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}<span>Âm thanh<small>Nhạc nền và phản hồi khi thao tác</small></span><i className={!muted ? "on" : ""}/></button>
    </div>
    <footer className="nexus-dialog-footer"><button onClick={preferences.restore}><RotateCcw size={13}/>Khôi phục giao diện đọc</button><span>Tự lưu giao diện trên thiết bị này</span></footer>
  </NexusDialog>;
}
