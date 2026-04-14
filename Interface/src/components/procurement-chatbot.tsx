"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDataService } from "@/services/sample-data-service";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DashboardContext {
  alerts: unknown[];
  purchase_orders: unknown[];
  inventory: unknown[];
  invoices: unknown[];
  vendors: unknown[];
}

const SUGGESTED_QUESTIONS = [
  "What are the critical alerts?",
  "Which POs need approval?",
  "Show low stock items",
  "Koji dobavljači imaju loše ocjene?",
];

export function ProcurementChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<DashboardContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !context) {
      const ds = getDataService();
      Promise.all([
        ds.getAlerts(),
        ds.getPurchaseOrders(),
        ds.getInventory(),
        ds.getInvoices(),
        ds.getVendors(),
      ]).then(([alerts, pos, inventory, invoices, vendors]) => {
        setContext({
          alerts: alerts.slice(0, 12),
          purchase_orders: pos.slice(0, 25),
          inventory: inventory.slice(0, 30),
          invoices: invoices.slice(0, 15),
          vendors: vendors.slice(0, 20),
        });
      });
    }
  }, [open, context]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(id);
    }
  }, [open]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, context }),
      });

      const data = await res.json();
      const reply = data.content ?? "Došlo je do greške. / An error occurred.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, context]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open procurement assistant"
        className={cn(
          "fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full",
          "bg-violet-600 hover:bg-violet-700 active:scale-95",
          "shadow-lg shadow-violet-900/60",
          "flex items-center justify-center transition-all duration-200",
          open && "opacity-0 pointer-events-none scale-90"
        )}
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 flex flex-col",
          "w-[420px] h-[600px] max-h-[85vh]",
          "bg-zinc-900 border border-zinc-700 rounded-tl-2xl",
          "shadow-2xl shadow-black/70",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700 flex-shrink-0 rounded-tl-2xl bg-zinc-900/95 backdrop-blur-sm">
          <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100">Procurement Assistant</p>
            <p className="text-[10px] text-zinc-500">Kimi K2.5 · Hotel Jadran</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-sm font-medium text-zinc-200 mb-1">How can I help?</p>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                Ask me about purchase orders, inventory, vendors, invoices, or alerts.
              </p>
              <div className="space-y-2 text-left">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn("flex gap-2.5 items-end", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center",
                  msg.role === "user"
                    ? "bg-violet-600"
                    : "bg-zinc-800 border border-zinc-700"
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-3 h-3 text-white" />
                ) : (
                  <Bot className="w-3 h-3 text-zinc-400" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-zinc-800 border border-zinc-700/80 text-zinc-200 rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5 items-end">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center">
                <Bot className="w-3 h-3 text-zinc-400" />
              </div>
              <div className="bg-zinc-800 border border-zinc-700/80 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-3 border-t border-zinc-700 bg-zinc-900">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about procurement data..."
              disabled={loading}
              className={cn(
                "flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm",
                "text-zinc-200 placeholder:text-zinc-600",
                "focus:outline-none focus:border-violet-500",
                "transition-colors disabled:opacity-60"
              )}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                "bg-violet-600 hover:bg-violet-700 active:scale-95",
                "disabled:opacity-40 disabled:pointer-events-none",
                "transition-all"
              )}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
