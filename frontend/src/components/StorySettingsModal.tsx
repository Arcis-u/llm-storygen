import React, { useState } from "react";
import { X, Settings, User, Save, Loader2, Link } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { updateStorySettings } from "@/lib/api";

interface StorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  initialTitle: string;
  initialCoverImage?: string;
  characterData: any; // Using any for brevity here, should ideally be CharacterState
  storyData: any; // Added for world description, tone, etc.
  onSettingsUpdated: () => void;
}

export default function StorySettingsModal({
  isOpen,
  onClose,
  storyId,
  initialTitle,
  initialCoverImage,
  characterData,
  storyData,
  onSettingsUpdated,
}: StorySettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"character" | "settings">("character");
  const [title, setTitle] = useState(initialTitle);
  const [coverImage, setCoverImage] = useState(initialCoverImage || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateStorySettings(storyId, { title, cover_image: coverImage });
      onSettingsUpdated();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật cài đặt");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(8px)",
      zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem"
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-panel"
        style={{ width: "100%", maxWidth: "800px", height: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={20} className="text-cyan-400" /> Cài đặt Truyện
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <button 
            onClick={() => setActiveTab("character")}
            style={{ flex: 1, padding: "1rem", background: activeTab === "character" ? "rgba(255,255,255,0.05)" : "transparent", border: "none", color: activeTab === "character" ? "#fff" : "var(--text-muted)", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            <User size={18} /> Sổ tay Nhân vật
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            style={{ flex: 1, padding: "1rem", background: activeTab === "settings" ? "rgba(255,255,255,0.05)" : "transparent", border: "none", color: activeTab === "settings" ? "#fff" : "var(--text-muted)", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            <Settings size={18} /> Cài đặt chung
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
          {activeTab === "character" && characterData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div>
                <h3 className="text-xl font-bold mb-4">{characterData.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{characterData.backstory}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                <div>
                  <h4 className="font-bold mb-3 text-cyan-400">Chỉ số ẩn (Traits)</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {characterData.traits?.map((t: any, i: number) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.85rem" }}>
                          <span>{t.name}</span>
                          <span className="text-cyan-400">{t.current_value}/{t.max_value}</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }}>
                          <div style={{ height: "100%", background: "var(--accent-primary)", width: `${(t.current_value / t.max_value) * 100}%`, borderRadius: "2px" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold mb-3 text-cyan-400">Tâm lý & Ý định</h4>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="mb-2"><span className="text-gray-400 text-sm">Trạng thái:</span> <span className="font-bold">{characterData.psychology?.mood}</span></div>
                    <div className="mb-4"><span className="text-gray-400 text-sm">Stress:</span> {characterData.psychology?.stress_level}/100</div>
                    
                    <h5 className="text-sm font-bold text-gray-300 mb-2">Ý định đang nung nấu:</h5>
                    <ul className="list-disc pl-4 text-sm text-gray-400 space-y-1">
                      {characterData.psychology?.desires?.length > 0 
                        ? characterData.psychology.desires.map((d: string, i: number) => <li key={i}>{d}</li>)
                        : <li>Không có ý định cụ thể.</li>
                      }
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3 text-cyan-400">Túi đồ & Tiền bạc</h4>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-wrap gap-4">
                  {Object.entries(characterData.economy?.currencies || {}).map(([c, v]: any) => (
                    <div key={c} className="bg-black/30 px-3 py-2 rounded border border-white/10 flex flex-col">
                      <span className="text-xs text-gray-500 uppercase">{c}</span>
                      <span className="font-bold text-lg">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {characterData.economy?.inventory?.map((item: any, i: number) => (
                    <div key={i} className="bg-white/5 p-3 rounded flex justify-between items-center border border-white/10">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {/* Truyện Info (Read Only) */}
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <h4 className="font-bold mb-3 text-cyan-400">Thông tin Khởi tạo (Read-only)</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase block mb-1">Thể loại</span>
                    <span className="font-medium text-sm bg-black/30 px-2 py-1 rounded capitalize">{storyData?.genre?.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase block mb-1">Tone & Vibe</span>
                    <span className="font-medium text-sm bg-black/30 px-2 py-1 rounded">{storyData?.tone}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase block mb-1">Mô tả Thế giới</span>
                  <p className="text-sm text-gray-400 leading-relaxed bg-black/30 p-3 rounded">{storyData?.world_description}</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label className="text-sm font-bold text-gray-400">Tên Truyện</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Nhập tên truyện..."
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                  <Link size={14} /> Đường dẫn Ảnh bìa (Cover Image URL)
                </label>
                <input 
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Do hệ thống chưa có máy chủ lưu trữ ảnh, vui lòng sử dụng link ảnh từ Discord, Imgur, v.v.
                </p>
                {coverImage && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-white/10 relative" style={{ height: "200px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverImage} alt="Cover Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.currentTarget.src = "")} />
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  LƯU CÀI ĐẶT
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
