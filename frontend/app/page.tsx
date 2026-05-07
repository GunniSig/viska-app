"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);
  const askBackend = async () => {
    if (!question.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer || data.error,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setQuestion("");
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Villa kom upp. Reyndu aftur.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold text-blue-900">
          Viska
        </h1>

        <p className="text-xl mt-4 text-gray-700">
          AI hjálp fyrir eldri borgara á Íslandi
        </p>

        <div className="bg-white rounded-2xl shadow p-6 mt-8 space-y-4">
          {messages.length === 0 && (
            <p className="text-gray-500 text-lg">
              Spyrðu Visku um lífeyri, réttindi eða þjónustu.
            </p>
          )}

          {messages.map((message, index) => (

            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div
                className={`max-w-[80%] p-4 rounded-2xl shadow ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >

                <p className="text-sm font-bold mb-2">
                  {message.role === "user"
                    ? "Þú"
                    : "Viska"}
                </p>

                <p className="whitespace-pre-line leading-8">
                  {message.content}
                </p>

              </div>

            </div>
          ))}

          {loading && (
            <p className="text-gray-500 text-lg">
              Viska er að hugsa...
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mt-6">

        <textarea
          className="w-full border rounded-xl p-4 text-lg"
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              askBackend();
            }
          }}
          placeholder="Spyrðu Visku..."
        />

        <button
          onClick={askBackend}
          disabled={loading}
          className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl text-lg"
        >
          {loading ? "Viska hugsar..." : "Spyrja Visku"}
        </button>

        <div ref={messagesEndRef} />

      </div>
      </div>
    </main>
  );
}