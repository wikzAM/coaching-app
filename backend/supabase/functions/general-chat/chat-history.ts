import { ChatMessage } from "../types.ts";
import { supabase } from "../../supabase-setup.ts";
import { createRow } from "../user-mem/create-row.ts";

const BUFFER_LIMIT = 15;

export async function getBuffer(userID: string, coachID: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_buffer')
    .select('messages')
    .eq('user_id', userID)
    .eq('coach_id', coachID)
    .single();

  if (error || !data) return [];
  return data.messages as ChatMessage[];
}

export async function updateBuffer(
  userID: string,
  coachID: string,
  userMsg: string,
  agentMsg: string
): Promise<void> {
  const buffer = await getBuffer(userID, coachID);

  buffer.push({ role: "user", text: userMsg });
  buffer.push({ role: "agent", text: agentMsg });

  if (buffer.length > BUFFER_LIMIT * 2) {
    const toFlush: ChatMessage[] = buffer.splice(0, 20);
    await createRow(userID, coachID, toFlush);
  }

  await supabase
    .from('chat_buffer')
    .upsert({
      user_id: userID,
      coach_id: coachID,
      messages: buffer,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,coach_id'
    });
}