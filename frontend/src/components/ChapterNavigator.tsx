"use client";

import { useState } from "react";
import { Search, ArrowUpRight, BookOpen, Check, X } from "lucide-react";
import NexusDialog from "@/components/NexusDialog";
import type { ChapterContent } from "@/store/useStoryStore";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLocaleLowerCase('vi');

export default function ChapterNavigator({ open, onClose, chapters, current, onSelect }: {
  open: boolean;
  onClose: () => void;
  chapters: ChapterContent[];
  current: number | null;
  onSelect: (chapter: number) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = chapters.filter(chapter => normalize(`${chapter.chapter_number} ${chapter.chapter_title || ''}`).includes(normalize(query.trim())));
  return <NexusDialog open={open} onClose={onClose} title="Các chương của bạn" eyebrow="CHAPTER ARCHIVE" className="chapter-navigator">
    <div className="navigator-intro"><span><BookOpen size={15} />{chapters.length} chương đã mở</span><p>Tìm lại một khoảnh khắc. Tiếp tục nơi bạn dừng lại.</p></div>
    <label className="navigator-search"><Search size={18} /><input aria-label="Tìm chương" placeholder="Tên chương hoặc số chương…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Xóa tìm chương" onClick={() => setQuery("")}><X size={15}/></button>}</label>
    <ol className="navigator-list">{visible.map(chapter => <li key={chapter.chapter_number}><button aria-current={chapter.chapter_number === current ? "page" : undefined} onClick={() => { onSelect(chapter.chapter_number); onClose(); }}>
      <span className="navigator-chapter-number">{String(chapter.chapter_number).padStart(2, '0')}</span>
      <span className="navigator-chapter-copy"><strong>{chapter.chapter_title || `Chương ${chapter.chapter_number}`}</strong><small>{chapter.chapter_number === current ? "Đang đọc" : chapter.chapter_number === chapters.at(-1)?.chapter_number ? "Chương mới nhất" : "Đọc lại chương"}</small></span>
      {chapter.chapter_number === current ? <Check size={17}/> : <ArrowUpRight size={17}/>}
    </button></li>)}</ol>
    {!visible.length && <div className="navigator-empty"><Search size={25}/><p>Không tìm thấy chương phù hợp.</p><button onClick={() => setQuery("")}>Hiện tất cả chương</button></div>}
    <footer className="nexus-dialog-footer"><span>Chỉ các chương đã diễn ra trong hành trình.</span><span><kbd>Esc</kbd> Đóng</span></footer>
  </NexusDialog>;
}
