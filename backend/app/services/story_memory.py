"""Summary discovery plus overlapping passages, including the end of each chapter."""
from uuid import NAMESPACE_URL, uuid5


def split_passages(text: str, size: int = 1800, overlap: int = 180) -> list[str]:
    if not 0 <= overlap < size:
        raise ValueError("Passage overlap must be smaller than its size")
    passages = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            boundary = text.rfind("\n\n", start + size // 2, end)
            if boundary < 0:
                boundary = text.rfind(" ", start + size // 2, end)
            if boundary > start:
                end = boundary
        passage = text[start:end].strip()
        if passage:
            passages.append(passage)
        if end == len(text):
            break
        start = end - overlap
    return passages


def chapter_memories(chapter) -> list[dict]:
    entries = []
    if chapter.summary.strip():
        entries.append({"text": chapter.summary.strip(), "kind": "summary", "index": 0})
    entries.extend({"text": text, "kind": "passage", "index": index}
                   for index, text in enumerate(split_passages(chapter.content)))
    return entries


def memory_point_id(story_id: str, chapter_number: int, kind: str, index: int) -> str:
    # Stable IDs make retries and migration resumable without duplicate memories.
    return str(uuid5(NAMESPACE_URL, f"nexus-tale:{story_id}:{chapter_number}:{kind}:{index}"))


def select_memories(hits, max_characters: int = 8000) -> list[str]:
    selected = []
    seen = set()
    per_chapter = {}
    for hit in hits:
        payload = hit.payload or {}
        text = payload.get("text", "")
        chapter = payload.get("chapter_number", 0)
        if hit.score <= .3 or not text or text in seen or per_chapter.get(chapter, 0) >= 2:
            continue
        remaining = max_characters - sum(len(item[2]) for item in selected)
        if remaining <= 0 or len(selected) >= 6:
            break
        seen.add(text)
        per_chapter[chapter] = per_chapter.get(chapter, 0) + 1
        selected.append((chapter, payload.get("chunk_index", 0), f"[Ch.{chapter}] {text}"[:remaining]))
    # Evidence stays in chronological order after selecting the relevant passages.
    return [text for _, _, text in sorted(selected, key=lambda item: (item[0], item[1]))]
