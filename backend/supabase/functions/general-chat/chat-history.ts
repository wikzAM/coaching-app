import { ChatMessage } from "../types.ts";
import { createRow } from "../user-mem/create-row.ts";

const kv = await Deno.openKv();
const BUFFER_LIMIT = 15;

// Will be called before starting the chat
export async function getBuffer(userID: string, coachID: string): Promise<ChatMessage[]> {
  const key = ["chat_buffer", userID, coachID];
  const result = await kv.get<ChatMessage[]>(key);
  return result.value || [];
}

// Will be calld after call to Gemini API to update local history
export async function updateBuffer(
  userID: string, 
  coachID: string, 
  userMsg: string, 
  agentMsg: string
): Promise<void> {
  const key = ["chat_buffer", userID, coachID];
  const buffer = await getBuffer(userID, coachID);
  
  /* Add new messages, each message of user query and agent response takes 1 space
    so array is of length 30
  */
  buffer.push({ role: "user", text: userMsg });
  buffer.push({ role: "agent", text: agentMsg });

  // If the buffer is full, remove the first 10 messages and flush it to long term
  if (buffer.length > BUFFER_LIMIT * 2) {
    const toFlush: ChatMessage[] = buffer.splice(0, 20);
    await createRow(userID, coachID, toFlush);
  }
  
  await kv.set(key, buffer);
}