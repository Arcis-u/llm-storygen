import type { ChapterContent, StoryConfig } from '../store/useStoryStore';

type Handlers = { token: (text:string) => void; replace: (text:string) => void; status: (text:string) => void; roll?: (value:number) => void; done: (chapter:ChapterContent, config:StoryConfig) => void };
/** Decode SSE frames across arbitrary network/UTF-8 boundaries. EOF is not success. */
export async function consumeStoryStream(stream: ReadableStream<Uint8Array>, handlers: Handlers) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;
  function dispatch(frame:string) {
    const payload = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!payload) return;
    const data = JSON.parse(payload);
    if (data.type === 'token') handlers.token(data.text);
    else if (data.type === 'replace') handlers.replace(data.text);
    else if (data.type === 'status') handlers.status(data.message);
    else if (data.type === 'roll') handlers.roll?.(data.value);
    else if (data.type === 'error') throw new Error(data.message);
    else if (data.type === 'done') {
      if (!data.chapter || !data.config) throw new Error('Kết quả lượt chơi không đầy đủ.');
      handlers.done(data.chapter, data.config);
      completed = true;
    }
  }
  try {
    while (!completed) {
      const {value, done} = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, {stream:true});
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer)) !== null && !completed) {
        dispatch(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary[0].length);
      }
      if (done) {
        if (!completed && buffer.trim()) dispatch(buffer);
        if (!completed) throw new Error('Kết nối đã ngắt trước khi lưu xong lượt chơi. Tải lại để kiểm tra tiến trình.');
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
