"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Minimize2,
  UtensilsCrossed,
} from "lucide-react";

interface QuickSuggestion {
  label: string;
  prompt: string;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { label: "🍱 What's on the menu?", prompt: "Can you tell me about your menu and popular bento boxes?" },
  { label: "🌱 Vegetarian options?", prompt: "What vegetarian dishes do you have available?" },
  { label: "🛵 Check delivery zone", prompt: "How does delivery work and how can I check if you deliver to my area?" },
  { label: "🥣 How to eat Bibimbap?", prompt: "What is the 5-step ritual for eating a Bap?" },
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    setMessages,
    append,
  } = useChat({
    api: "/api/chat",
    onError: (err) => {
      console.error("[ChatWidget Error]:", err);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSuggestionClick = (prompt: string) => {
    append({
      role: "user",
      content: prompt,
    });
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {/* Floating Toggle Button (when chat is closed) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open AI Assistant"
          className="group flex items-center gap-3 bg-[#445916] hover:bg-[#354611] text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-[#9da613]/30"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white transition-transform group-hover:rotate-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9da613] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9da613]"></span>
            </span>
          </div>
          <div className="flex flex-col items-start pr-1 text-left">
            <span className="text-xs uppercase tracking-wider text-[#e2e894] font-bold">
              AI Assistant
            </span>
            <span className="text-sm font-semibold leading-tight">
              Order with Daily Bap
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Container */}
      {isOpen && (
        <div
          className={`bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimized
              ? "w-80 h-16"
              : "w-[92vw] sm:w-[410px] h-[580px] max-h-[82vh]"
          }`}
        >
          {/* Header */}
          <div className="bg-[#445916] text-white px-4 py-3 flex items-center justify-between border-b border-[#354611] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#354611] border border-[#9da613]/50 flex items-center justify-center text-[#9da613]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide text-white font-display">
                    Daily Bap AI
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#9da613]/30 text-[#e9ed95]">
                    Gemini 3.6
                  </span>
                </div>
                <p className="text-[11px] text-gray-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  Korean Cloud Kitchen Assistant
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              {messages.length > 0 && !isMinimized && (
                <button
                  onClick={clearChat}
                  title="Clear Conversation"
                  aria-label="Clear chat"
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-[#354611] rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                aria-label="Minimize or expand chat"
                className="p-1.5 text-gray-300 hover:text-white hover:bg-[#354611] rounded-lg transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close chat"
                className="p-1.5 text-gray-300 hover:text-white hover:bg-[#354611] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body (Messages & Input) */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/60 text-sm">
                {/* Welcome Message if chat is empty */}
                {messages.length === 0 && (
                  <div className="space-y-4 py-2">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm text-gray-700 space-y-2">
                      <div className="flex items-center gap-2 text-[#445916] font-semibold">
                        <UtensilsCrossed className="w-4 h-4 text-[#9da613]" />
                        <span>Annyeonghaseyo! Welcome to Daily Bap.</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        I am your AI assistant for 100% fresh, pre-ordered Korean comfort food in Guwahati.
                        Ask me about our bentos, check delivery radius, or place an order!
                      </p>
                    </div>

                    {/* Starter Prompts */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#9da613]" /> Suggested questions
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {QUICK_SUGGESTIONS.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(item.prompt)}
                            className="text-left text-xs bg-white hover:bg-[#445916]/5 text-gray-700 hover:text-[#445916] border border-gray-200 hover:border-[#445916]/30 px-3 py-2 rounded-lg transition-all shadow-xs"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Messages */}
                {messages.map((m) => {
                  const isUser = m.role === "user";

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-[#445916] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs">
                          <Bot className="w-4 h-4 text-[#9da613]" />
                        </div>
                      )}

                      <div
                        className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                          isUser
                            ? "bg-[#445916] text-white rounded-tr-xs"
                            : "bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs"
                        }`}
                      >
                        {/* Message text content */}
                        {m.content && (
                          <div className="whitespace-pre-wrap break-words">
                            {m.content}
                          </div>
                        )}

                        {/* Tool Invocations Display */}
                        {m.toolInvocations?.map((toolInvocation) => {
                          const { toolName, toolCallId, state } = toolInvocation;

                          // 1. checkDeliveryZone Tool UI
                          if (toolName === "checkDeliveryZone") {
                            if (state !== "result") {
                              return (
                                <div
                                  key={toolCallId}
                                  className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs"
                                >
                                  <MapPin className="w-4 h-4 animate-bounce text-amber-600" />
                                  <span>Checking delivery zone in Guwahati...</span>
                                </div>
                              );
                            }

                            const result = toolInvocation.result as {
                              isDeliverable?: boolean;
                              distanceKm?: number;
                              message?: string;
                            };

                            return (
                              <div
                                key={toolCallId}
                                className={`mt-2 p-2.5 rounded-lg border text-xs ${
                                  result?.isDeliverable
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                    : "bg-rose-50 border-rose-200 text-rose-900"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-semibold">
                                  {result?.isDeliverable ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                  )}
                                  <span>
                                    {result?.isDeliverable
                                      ? "Within Delivery Zone"
                                      : "Outside Delivery Zone"}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] opacity-90">
                                  {result?.message || `Distance: ${result?.distanceKm} km`}
                                </p>
                              </div>
                            );
                          }

                          // 2. createOrderRecord Tool UI
                          if (toolName === "createOrderRecord") {
                            if (state !== "result") {
                              return (
                                <div
                                  key={toolCallId}
                                  className="mt-2 p-2.5 rounded-lg bg-[#445916]/10 border border-[#445916]/20 text-[#445916] flex items-center gap-2 text-xs"
                                >
                                  <div className="w-4 h-4 border-2 border-[#445916] border-t-transparent rounded-full animate-spin"></div>
                                  <span>Saving your pre-order to database...</span>
                                </div>
                              );
                            }

                            const result = toolInvocation.result as {
                              success?: boolean;
                              orderId?: string;
                              total?: number;
                              deliveryFee?: number;
                              whatsappUrl?: string;
                              message?: string;
                              error?: string;
                            };

                            if (result?.success && result?.whatsappUrl) {
                              return (
                                <div
                                  key={toolCallId}
                                  className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 text-xs"
                                >
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Pre-Order Created Successfully!</span>
                                  </div>
                                  <div className="text-[11px] text-emerald-800 space-y-0.5 bg-white/70 p-2 rounded-lg border border-emerald-100">
                                    <div>Order ID: <span className="font-mono font-medium">{result.orderId}</span></div>
                                    <div>Total Amount: <span className="font-bold">₹{result.total}</span> (Delivery: ₹{result.deliveryFee})</div>
                                  </div>
                                  <a
                                    href={result.whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-2 px-3 rounded-lg shadow-sm transition-all duration-200 text-xs"
                                  >
                                    <span>Confirm on WhatsApp</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={toolCallId}
                                className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2"
                              >
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{result?.message || result?.error || "Could not complete order."}</span>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator while streaming */}
                {isLoading && (
                  <div className="flex gap-2.5 justify-start items-center">
                    <div className="w-7 h-7 rounded-full bg-[#445916] text-white flex items-center justify-center shrink-0 text-xs">
                      <Bot className="w-4 h-4 text-[#9da613]" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs px-3.5 py-2 text-xs text-gray-500 flex items-center gap-1.5 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#445916] animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9da613] animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#445916] animate-bounce [animation-delay:0.4s]"></span>
                      <span className="ml-1 text-[11px]">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Stream Error</span>
                    </div>
                    <p className="text-[11px] text-rose-700 break-words font-mono bg-rose-100/60 p-1.5 rounded">
                      {error.message || String(error)}
                    </p>
                    <button
                      type="button"
                      onClick={() => reload()}
                      className="text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1 rounded transition-colors"
                    >
                      Retry Response
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Box */}
              <form
                onSubmit={handleSubmit}
                className="p-3 bg-white border-t border-gray-200 shrink-0"
              >
                <div className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask about menu, delivery, or place an order..."
                    disabled={isLoading}
                    className="w-full bg-gray-100 focus:bg-white text-gray-800 placeholder-gray-400 text-xs sm:text-sm pl-3.5 pr-11 py-2.5 rounded-xl border border-transparent focus:border-[#445916] focus:outline-none transition-all duration-200 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input?.trim()}
                    aria-label="Send message"
                    className="absolute right-1.5 p-2 bg-[#445916] hover:bg-[#354611] disabled:bg-gray-300 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-gray-400">
                  <span>100% Fresh Pre-Orders in Guwahati</span>
                  <span>Powered by Gemini 3.6 Flash</span>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
