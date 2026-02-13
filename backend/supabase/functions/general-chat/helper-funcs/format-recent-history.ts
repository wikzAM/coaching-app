/* A type formatting to format things the way gemini likes it
    without having the code be much longer visually
*/

import { ChatMessage } from "../../types.ts";

export const createMsg = (
  role: "user" | "model" | "system",
  text: string
) => ({
  role,
  parts: [{ text }],
});

/**
 * Converts an array of chatMessage objects into Gemini history format.
 * Assumes every 2 messages = 1 conversation turn: user then model.
 */
export const formatRecentHistory = (messages: ChatMessage[]) => {
  const history: ReturnType<typeof createMsg>[] = [];

  for (let i = 0; i < messages.length; i += 2) {
    const userMsg = messages[i];
    const modelMsg = messages[i + 1];

    if (userMsg) history.push(createMsg("user", userMsg.text));
    if (modelMsg) history.push(createMsg("model", modelMsg.text));
  }

  return history;
};
