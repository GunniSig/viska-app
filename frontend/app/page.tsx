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
  const hasUserSentMessage = useRef(false);
  const hasInitialMessagesLoaded = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const handleLogin = async () => {
    setAuthLoading(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
  }

  setAuthLoading(false);
};

  const handleQuickAction = async (selectedQuestion: string) => {
  setQuestion(selectedQuestion);

  if (!user) {
    setLoginMessage(
      "Skráðu þig inn til að senda spurninguna til Visku."
    );

    setTimeout(() => {
      emailRef.current?.focus();
    }, 100);

    return;
  }

  await askBackend(selectedQuestion);

  setTimeout(() => {
    textareaRef.current?.focus();
  }, 100);
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
  if (!navigator.geolocation) {
    setLocationError("Vafrinn styður ekki staðsetningu.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setLocationError("");
    },
    (error) => {
      console.error("GPS villa:", error);
      setLocationError("Ekki tókst að sækja staðsetningu. Athugaðu leyfi í vafranum.");
    }
  );
}, []);

{locationError && (
  <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
    {locationError}
  </div>
)}

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
  setUser(data.session?.user || null);
  setAuthReady(true);
});

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user || null);
    setAuthReady(true);

    if (!session?.user) {
      setMessages([]);
    }
  });
  
  return () => {
    subscription.unsubscribe();
  };

}, []);



 useEffect(() => {
  if (!hasUserSentMessage.current) return;

  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages.length]);

  const askBackend = async (customQuestion?: string) => {
  const questionToSend = customQuestion || question;

  if (!questionToSend.trim()) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    alert("Þú þarft að vera innskráður.");
    return;
  }

  hasUserSentMessage.current = true;

  const userMessage: Message = {
    role: "user",
    content: questionToSend,
  };

  setMessages((prev) => [...prev, userMessage]);
  const submittedQuestion = questionToSend;
  setQuestion("");
  setLoading(true);

  try {
    const res = await fetch(`${API_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
      question: submittedQuestion,
      lat: location?.lat,
      lng: location?.lng,
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

if (!authReady) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-6 text-blue-900 text-xl font-semibold">
        Sæki Visku...
      </div>
    </main>
  );
}

  return (
  <main className="h-screen bg-gradient-to-b from-blue-50 to-white overflow-hidden">
    <div className="max-w-3xl mx-auto h-full px-4 py-4 flex flex-col">
      <div className="shrink-0">
        <h1 className="text-6xl font-extrabold text-blue-900 tracking-tight">
          Viska
        </h1>

        <p className="text-xl mt-4 text-gray-600 leading-relaxed max-w-xl">
          Stafræn hjálparaðstoð á mannamáli fyrir daglegt líf.
        </p>

        <QuickActions onSelect={handleQuickAction} />

        {location && (
          <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4 text-green-800">
            <p>Staðsetning virk ✅</p>
            <p className="text-sm mt-2">
              {location.lat}, {location.lng}
            </p>
          </div>
        )}

        {!location && !locationError && (
          <div className="mt-4 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-yellow-800">
            Sæki staðsetningu...
          </div>
        )}

        {locationError && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
            {locationError}
          </div>
        )}
      </div>

      {!user && (
        <div className="bg-white rounded-2xl shadow p-6 mt-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">
            Innskráning
          </h2>

          {loginMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 mb-4">
              {loginMessage}
            </div>
          )}

          <input
            ref={emailRef}
            type="email"
            placeholder="Netfang"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
              }
            }}
            className="w-full border rounded-xl p-4 mb-4"
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
              type="button"
              onClick={handleLogin}
              disabled={authLoading}
              className="bg-blue-600 text-white px-4 py-3 rounded-xl disabled:bg-gray-400"
            >
              {authLoading ? "Skrái inn..." : "Innskrá"}
            </button>
          </div>
        </div>
      )}

      {user && (
        <div className="flex-1 min-h-0 flex flex-col mt-4">
          <div className="shrink-0 flex justify-between items-center bg-white rounded-2xl shadow p-4">
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
            className="shrink-0 mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl"
          >
            Hreinsa samtal
          </button>

          <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-2xl shadow p-6 mt-4 space-y-4">
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
              <div className="flex items-center gap-2 text-gray-500 text-lg">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                <span className="ml-2">Viska er að hugsa...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 bg-white rounded-2xl shadow p-4 mt-4">
            <textarea
              ref={textareaRef}
              className="w-full border rounded-xl p-4 text-lg"
              rows={3}
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
              onClick={() => askBackend()}
              disabled={loading}
              className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl text-lg"
            >
              {loading ? "Viska hugsar..." : "Spyrja Visku"}
            </button>
          </div>
        </div>
      )}
    </div>
  </main>
);
}