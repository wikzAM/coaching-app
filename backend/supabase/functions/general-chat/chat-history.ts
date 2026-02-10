import { ChatMessage } from "../types.ts";
import { createRow } from "../user-mem/create-row.ts";

const chatBuffers = new Map<string, ChatMessage[]>();
const BUFFER_LIMIT = 15;

// Will be called before starting the chat
export function getBuffer(userID: string, coachID: string): ChatMessage[] {
  const key = `${userID}:${coachID}`;
  return chatBuffers.get(key) || [];
}

// Will be calld after call to Gemini API to update local history
export function updateBuffer(
  userID: string, 
  coachID: string, 
  userMsg: string, 
  agentMsg: string
): void {
  const key = `${userID}:${coachID}`;
  const buffer = chatBuffers.get(key) || [];
  
  /* Add new messages, each message of user query and agent response takes 1 space
    so array is of length 30
  */
  buffer.push({ role: "user", text: userMsg });
  buffer.push({ role: "agent", text: agentMsg });

  // If the buffer is full, remove the first 10 messages and flush it to long term
  if (buffer.length > BUFFER_LIMIT * 2) {
    const toFlush: ChatMessage[] = buffer.splice(0, 20);
    createRow(userID, coachID, toFlush);
  }
  
  chatBuffers.set(key, buffer);
}