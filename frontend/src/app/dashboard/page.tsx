"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Plus, Play, Trash2, Search, Globe, Loader2, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getMyStories, deleteStory } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { worldFor } from "@/lib/worlds";
import type { CharacterState } from "@/store/useStoryStore";
import NexusHeader from "@/components/NexusHeader";
import StorySettingsModal from "@/components/StorySettingsModal";

type LibraryStory = { story_id: string; title: string; genre: string; current_chapter: number; total_turns?: number; is_ended?: boolean; is_god_mode?: boolean; cover_image?: string; character?: CharacterState; created_at?: string; updated_at?: string; world_description?: string };
const storyLink = (story: LibraryStory) => `/${story.current_chapter > 0 ? 'play' : 'customize'}?id=${encodeURIComponent(story.story_id)}`;
const dateLabel = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('vi-VN', { day:'2-digit', month:'short', year:'numeric' }) : 'Chưa có thời gian';

function StoryCover({ story, priority = false }: { story: LibraryStory; priority?: boolean }) {
  // User-provided cover URLs remain supported without adding remote hosts to Image config.
  return story.cover_image ? <div className="library-cover-custom" style={{backgroundImage:`url(${JSON.stringify(story.cover_image)})`}}/> : <Image src={worldFor(story.genre).image} alt="" fill sizes="(max-width:680px) 100vw, (max-width:1000px) 50vw, 40vw" priority={priority}/>;
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [stories, setStories] = useState<LibraryStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingsStory, setSettingsStory] = useState<LibraryStory | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getMyStories().then(data => { if (!cancelled) { setStories(data.stories || []); setLoadError(''); } }).catch(() => { if (!cancelled) setLoadError('Không thể tải thư viện. Kiểm tra kết nối và thử lại.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision]);
  const refresh = () => { setLoading(true); setRevision(r => r + 1); };
  const handleDelete = async (story: LibraryStory) => {
    if (!confirm(`Xóa vĩnh viễn “${story.title}”? Câu chuyện và tiến trình sẽ không thể khôi phục.`)) return;
    setDeletingId(story.story_id);
    try { await deleteStory(story.story_id); setStories(prev => prev.filter(s => s.story_id !== story.story_id)); }
    catch { setLoadError('Chưa thể xóa hành trình. Vui lòng thử lại.'); }
    finally { setDeletingId(null); }
  };
  const active = stories.filter(s => !s.is_ended);
  const featured = active[0];
  const visible = stories.filter(s => (filter === 'all' || (filter === 'ended' ? s.is_ended : !s.is_ended)) && `${s.title} ${s.character?.name || ''}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <div className="nexus-evolved nexus-library"><NexusHeader library/>
    <main id="main-content" className="evo-container library-main">
      <div className="library-heading"><div><span className="evo-eyebrow">NEXUS ARCHIVE / KHÔNG GIAN CỦA BẠN</span><h1>Những thế giới<br /><span>mang dấu ấn của bạn.</span></h1><p>Chào {user?.username || 'bạn'}. Một chương mới đang chờ được viết tiếp.</p></div><Link className="evo-button evo-button-primary" href="/create"><Plus size={17}/>Hành trình mới</Link></div>
      {loadError && <div className="cyber-alert" role="alert">{loadError}<button className="evo-button evo-button-glass" onClick={refresh}>Thử lại</button></div>}
      {loading ? <div className="library-skeleton" role="status" aria-label="Đang tải thư viện"><div/><div/><div/></div> : (!loadError || stories.length > 0) ? <>
        {featured && <section className="library-featured"><div className="library-featured-art"><StoryCover story={featured} priority/></div><div className="library-featured-shade"/><div className="library-featured-copy"><span className="evo-eyebrow"><span className="signal-dot"/>HÀNH TRÌNH GẦN NHẤT</span><span className="library-genre">{worldFor(featured.genre).name} <i/> CHƯƠNG {featured.current_chapter}</span><h2>{featured.title}</h2><p>{featured.character?.name ? `Tiếp bước ${featured.character.name}. ` : ''}{featured.current_chapter ? 'Thế giới vẫn còn những điều bạn chưa khám phá.' : 'Hoàn thiện nhân vật để mở chương đầu tiên.'}</p><Link href={storyLink(featured)} className="evo-button evo-button-primary"><Play size={16}/>{featured.current_chapter ? 'Tiếp tục hành trình' : 'Hoàn thiện nhân vật'}<ArrowRight size={17}/></Link></div><div className="featured-record"><BookOpen size={18}/><span>{featured.current_chapter}<small>CHƯƠNG ĐÃ MỞ</small></span></div></section>}
        {stories.length > 0 && <div className="library-stats"><span><b>{stories.length.toString().padStart(2,'0')}</b>Thế giới đã tạo</span><span><b>{active.length.toString().padStart(2,'0')}</b>Đang tiếp diễn</span><span><b>{stories.reduce((n,s) => n + s.current_chapter,0).toString().padStart(2,'0')}</b>Chương đã viết</span><p>Mỗi hành trình là một phiên bản khác của bạn.</p></div>}
        <section aria-label="Thư viện hành trình"><div className="library-toolbar"><div className="library-filters" aria-label="Lọc hành trình">{[['all','Tất cả'],['active','Đang chơi'],['ended','Đã kết thúc']].map(([value,label]) => <button key={value} aria-pressed={filter===value} onClick={() => setFilter(value)}>{label}<span>{value==='all' ? stories.length : value==='active' ? active.length : stories.length-active.length}</span></button>)}</div><label className="library-search"><Search size={16}/><input aria-label="Tìm câu chuyện" placeholder="Tìm truyện hoặc nhân vật…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}>×</button>}</label></div>
          {visible.length > 0 ? <div className="library-grid">{visible.map((story,index) => <motion.article key={story.story_id} className="universe-card" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.3,delay:Math.min(index*.05,.25)}}><Link href={storyLink(story)} className="universe-cover" aria-label={`Mở ${story.title}`}><StoryCover story={story}/><div className="universe-cover-shade"/><span className={`universe-status ${story.is_ended?'ended':''}`}><span/>{story.is_ended?'Đã kết thúc':story.current_chapter?'Đang tiếp diễn':'Chưa bắt đầu'}</span><span className="universe-genre">{worldFor(story.genre).name}</span><span className="universe-open"><ArrowUpRight size={20}/></span></Link><div className="universe-info"><div className="universe-meta"><span>CHƯƠNG {String(story.current_chapter).padStart(2,'0')}</span><span>{dateLabel(story.updated_at || story.created_at)}</span></div><h3><Link href={storyLink(story)}>{story.title}</Link></h3><p>{story.character?.name || 'Nhân vật đang được kiến tạo'}{story.is_god_mode && <span className="god-label">GOD MODE</span>}</p><div className="universe-footer"><Link href={storyLink(story)}>{story.is_ended?'Đọc lại':story.current_chapter?'Viết tiếp':'Tùy chỉnh'}<ArrowRight size={15}/></Link><div><button onClick={() => setSettingsStory(story)} aria-label={`Cài đặt ${story.title}`}><Settings size={16}/></button><button onClick={() => handleDelete(story)} disabled={deletingId===story.story_id} aria-label={`Xóa ${story.title}`}>{deletingId===story.story_id?<Loader2 size={16} className="animate-spin"/>:<Trash2 size={16}/>}</button></div></div></div></motion.article>)}<Link href="/create" className="universe-create"><span><Plus size={25}/></span><h3>Một thế giới chưa được kể.</h3><p>Và chỉ bạn mới biết<br />nó sẽ bắt đầu như thế nào.</p><b>Kiến tạo hành trình <ArrowUpRight size={16}/></b></Link></div> : <div className="library-empty"><Globe size={38}/><h2>{stories.length?'Chưa tìm thấy hành trình phù hợp.':'Vũ trụ đầu tiên đang chờ bạn.'}</h2><p>{stories.length?'Thử tên khác hoặc đổi bộ lọc.':'Chọn một thế giới, tạo nhân vật và bước vào câu chuyện của riêng mình.'}</p>{stories.length ? <button className="evo-button evo-button-glass" onClick={() => {setQuery('');setFilter('all');}}>Xem tất cả</button> : !loadError && <Link className="evo-button evo-button-primary" href="/create">Bắt đầu hành trình <ArrowUpRight size={18}/></Link>}</div>}
        </section>
      </> : null}
    </main>
    {settingsStory && <StorySettingsModal isOpen onClose={() => setSettingsStory(null)} storyId={settingsStory.story_id} initialTitle={settingsStory.title} initialCoverImage={settingsStory.cover_image} characterData={settingsStory.character} storyData={settingsStory} onSettingsUpdated={() => {setSettingsStory(null);refresh();}}/>}
  </div>;
}
