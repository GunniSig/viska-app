"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import QuickActions from "@/components/QuickActions"

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
  }
};
  const handleQuickAction = (selectedQuestion: string) => {
    setQuestion(selectedQuestion);

    if (!user) {
      alert("Skráðu þig inn til að spyrja Visku. Spurningin bíður tilbúin fyrir þig.");
    }
  };

useEffect(() => {
  const loadMessages = async () => {
    if (!user) {
      setMessages([]);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setMessages([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/messages`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        setMessages([]);
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setMessages([]);
        return;
      }

      setMessages(
        data.map((message: Message) => ({
          role: message.role,
          content: message.content,
        }))
      );
    } catch (error) {
      console.error("Tókst ekki að sækja skilaboð", error);
      setMessages([]);
    }
  };

  loadMessages();
}, [API_URL, user]);

useEffect(() => {

  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user || null);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user || null);
    if (!session?.user) {
      setMessages([]);
    }
  });

  return () => {
    subscription.unsubscribe();
  };

}, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);
  const askBackend = async () => {
  if (!question.trim()) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    alert("Þú þarft að vera innskráður.");
    return;
  }

  const userMessage: Message = {
    role: "user",
    content: question,
  };

  setMessages((prev) => [...prev, userMessage]);
  setLoading(true);

  try {
    const res = await fetch(`${API_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
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
  <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-6xl font-extrabold text-blue-900 tracking-tight">
        Viska
      </h1>

      <p className="text-xl mt-4 text-gray-600 leading-relaxed max-w-xl">
        Stafræn hjálparaðstoð á mannamáli fyrir daglegt líf.
      </p>

      <QuickActions onSelect={handleQuickAction} />

      {!user && (
        <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleLogin();
            }}
            className="bg-white rounded-2xl shadow p-6 mt-8"
          >
          {question && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 mb-4">
              <p className="font-semibold">Valin spurning:</p>
              <p>{question}</p>
              <p className="text-sm mt-2">
                Skráðu þig inn til að senda spurninguna til Visku.
              </p>
            </div>
          )}
          <h2 className="text-2xl font-bold mb-4">
            Innskráning
          </h2>

          <input
            type="email"
            placeholder="Netfang"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl p-4 mb-4"
            onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleLogin();
            }
          }}
          />

          <input
            type="password"
            placeholder="Lykilorð"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
              }
            }}
            className="w-full border rounded-xl p-4 mb-4"
          />

          <div className="flex gap-4">
            <button
                type="button"
                onClick={async () => {
                setMessages([]);

                const { data, error } = await supabase.auth.signUp({
                  email,
                  password,
                });

                if (error) {
                  alert(error.message);
                  return;
                }

                setUser(data.user || null);
                setMessages([]);

                alert("Aðgangur búinn til!");
              }}
              className="bg-green-600 text-white px-4 py-3 rounded-xl"
            >
              Nýskrá
            </button>

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-3 rounded-xl"
            >
              Innskrá
            </button>
          </div>
        </form>
      )}

      {user && (
        <>
          <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow p-4">
            <p className="text-sm text-gray-500">
              Innskráður sem: {user.email}
            </p>

            <button
              onClick={async () => {
               await supabase.auth.signOut();

                setUser(null);
                setMessages([]);

                window.location.reload();
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-xl"
            >
              Útskrá
            </button>
          </div>

          <button
            onClick={async () => {
              const {
              data: { session },
            } = await supabase.auth.getSession();

            await fetch(`${API_URL}/messages`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
              },
            });

              setMessages([]);
            }}
            className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl"
          >
            Hreinsa samtal
          </button>

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
                  message.role === "user" ? "justify-end" : "justify-start"
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
                    {message.role === "user" ? "Þú" : "Viska"}
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

            <div ref={messagesEndRef} />
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
          </div>
        </>
      )}
    </div>
  </main>
);
}