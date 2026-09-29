"use client";
import { useMemo, useState } from 'react';
import { BookOpen, Dices, Search, Download, Target } from 'lucide-react';
import { useStoryStore } from '@/store/useStoryStore';
const approaches = {balanced:'Cân bằng',careful:'Thận trọng',bold:'Táo bạo'};
export default function DecisionJournal() {
  const chapters = useStoryStore(s => s.chapters);
  const quests = useStoryStore(s => s.quests);
  const character = useStoryStore(s => s.character);
  const [query, setQuery] = useState('');
  const [onlyDecisions, setOnlyDecisions] = useState(false);
  const visible = useMemo(() => [...chapters].reverse().filter(c => (!onlyDecisions || c.decision?.label) && `${c.chapter_title} ${c.summary} ${c.decision?.label || ''}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))), [chapters, query, onlyDecisions]);
  function exportJournal() {
    const text = `# Hành trình của ${character.name}\n\n` + chapters.map(c => `## Chương ${c.chapter_number}: ${c.chapter_title || ''}\n\n${c.decision?.label ? `> Quyết định: ${c.decision.label}\n> Cách tiếp cận: ${approaches[c.decision.approach]}${c.decision.dice_result ? ` · D20: ${c.decision.dice_result}` : ''}\n\n` : ''}${c.content}`).join('\n\n---\n\n');
    const url = URL.createObjectURL(new Blob([text], {type:'text/markdown;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='nexus-tale-journal.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="decision-journal"><div className="journal-heading"><div><span className="cyber-kicker">MEMORY ARCHIVE // {chapters.length} CHƯƠNG</span><h2>Dấu ấn hành trình</h2><p>Những lựa chọn đã trở thành một phần câu chuyện của bạn.</p></div><button className="btn-secondary" onClick={exportJournal} disabled={!chapters.length}><Download size={16}/> Lưu hành trình</button></div>
    <div className="journal-toolbar"><label className="journal-search"><Search size={16}/><input aria-label="Tìm trong nhật ký" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm chương, quyết định, ký ức…"/></label><label><input type="checkbox" checked={onlyDecisions} onChange={e => setOnlyDecisions(e.target.checked)}/> Chỉ các quyết định</label></div>
    {quests.filter(q => q.status==='active').length > 0 && <div className="journal-quests"><Target size={17}/><div><strong>Điều bạn đang theo đuổi</strong>{quests.filter(q => q.status==='active').map(q => <p key={q.quest_id}>{q.title}{q.deadline_chapter != null && <span> · Hạn: chương {q.deadline_chapter}</span>}</p>)}</div></div>}
    <ol className="journal-timeline">{visible.map(c => <li key={c.chapter_number}><span className="journal-node"><BookOpen size={15}/></span><div className="journal-entry"><span className="cyber-kicker">CHƯƠNG {String(c.chapter_number).padStart(2,'0')}</span><h3>{c.chapter_title || `Chương ${c.chapter_number}`}</h3>{c.decision?.label && <div className="journal-decision"><span>BẠN ĐÃ CHỌN</span><strong>{c.decision.label}</strong><div>{approaches[c.decision.approach]}{c.decision.dice_result && <span className={`dice-badge ${c.decision.dice_result>=10?'success':'failure'}`}><Dices size={14}/> {c.decision.dice_result}/20</span>}</div></div>}<p>{c.summary || 'Chương này chưa có tóm tắt.'}</p></div></li>)}</ol>
    {!visible.length && <div className="cyber-empty">Không tìm thấy ký ức phù hợp.</div>}
  </section>;
}
