"use client";
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, X, Loader2 } from 'lucide-react';
export default function DiceRoller({isOpen, riskLevel, result, rolling, onConfirm, onCancel}: {
  isOpen:boolean; riskLevel:'risky'|'crucial'; result:number|null; rolling:boolean; onConfirm:()=>void; onCancel:()=>void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (isOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [isOpen]);
  const outcome = result === 1 ? 'THẤT BẠI NGHIÊM TRỌNG' : result === 20 ? 'THÀNH CÔNG XUẤT SẮC' : result && result >= 10 ? 'THÀNH CÔNG' : 'THẤT BẠI';
  return <dialog ref={dialog} className="nexus-dice-dialog" onCancel={e => {e.preventDefault(); onCancel();}} aria-labelledby="dice-heading">
    <button className="cyber-icon-button dice-close" onClick={onCancel} aria-label="Đóng xúc xắc"><X size={18}/></button>
    <AnimatePresence><motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="dice-inner">
      <span className="cyber-kicker">D20 // {riskLevel === 'crucial' ? 'BƯỚC NGOẶT' : 'MẠO HIỂM'}</span>
      <h2 id="dice-heading">Thử thách vận mệnh</h2>
      <p>{result ? 'Kết quả đã được ghi nhận cho hành động này.' : '1: thất bại nghiêm trọng · 2–9: thất bại · 10–19: thành công · 20: thành công xuất sắc.'}</p>
      <div className={`dice-result ${result ? result >= 10 ? 'success' : 'failure' : ''}`}>{result ?? (rolling ? <Loader2 size={55} className="animate-spin"/> : <Dices size={58}/>)}</div>
      {result ? <><strong>{outcome}</strong><button className="btn-primary" onClick={onCancel}>Trở về câu chuyện</button></> : <button className="btn-primary" disabled={rolling} onClick={onConfirm}>{rolling ? 'Đang gieo xúc xắc…' : 'Chấp nhận & gieo xúc xắc'}</button>}
      <small>Kết quả do máy chủ xác định. Đóng cửa sổ sau khi gieo không hủy lượt chơi.</small>
    </motion.div></AnimatePresence>
  </dialog>;
}
