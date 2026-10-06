import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api, type ChatReply } from "../lib/api";

interface Message {
  id: number;
  from: "user" | "bot";
  text: string;
  action?: ChatReply["action"];
}

const WELCOME: Message = {
  id: 0,
  from: "bot",
  text: "Hi! I'm the FixMyCity assistant. Ask me how to report an issue, check your reports, or describe a problem and I'll suggest the right category.",
};

const ChatBot: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [suggestions, setSuggestions] = useState<string[]>(["How do I report an issue?", "Status of my reports", "How do points work?"]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setMessages((m) => [...m, { id: Date.now(), from: "user", text: t }]);
    setBusy(true);
    try {
      const r = await api.chat(t);
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", text: r.reply, action: r.action }]);
      setSuggestions(r.suggestions);
    } catch {
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", text: "Sorry, I couldn't reach the server. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-24 md:bottom-6 right-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full p-3.5 shadow-lg z-[1001]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle size={24} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="FixMyCity assistant"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed z-[1100] inset-x-0 bottom-0 h-[75vh] md:inset-auto md:bottom-6 md:right-4 md:w-96 md:h-[520px] bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                <Bot size={18} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex-1">FixMyCity Assistant</h3>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                      m.from === "user"
                        ? "bg-primary-600 text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                    {m.action && (
                      <button
                        onClick={() => {
                          setOpen(false);
                          navigate(m.action!.to);
                        }}
                        className="mt-2 block w-full text-center bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-300 font-medium text-xs py-1.5 rounded-lg border border-primary-200 dark:border-primary-800"
                      >
                        {m.action.label} →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="text-xs text-gray-400 px-1">Assistant is typing…</div>}
            </div>

            <div className="px-3 pt-2 flex gap-2 overflow-x-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="p-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask or describe a problem…"
                maxLength={500}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg px-3">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
