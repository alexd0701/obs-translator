"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SessionControls from "./SessionControls";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [_, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [translation, setTranslation] = useState("");
  const [charLimit, setChatLimit] = useState(
    Number(localStorage?.getItem("charLimit") || "200")
  );
  const [targetLanguage, setTargetLanguage] = useState(
    localStorage?.getItem("targetLanguage") || "english"
  );
  const [apiKey, setApiKey] = useState(localStorage?.getItem("apiKey") || "");
  const [obsConfig, setObsConfig] = useState({
    websocketUrl: localStorage?.getItem("websocketUrl") || "",
    password: localStorage?.getItem("websocketPassword") || "",
    sourceName: localStorage?.getItem("sourceName") || "",
  });
  const [isActivating, setIsActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [ws, setWs] = useState(null);
  const [obsConnected, setObsConnected] = useState(false);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  const isError = useMemo(() => {
    return (
      !apiKey ||
      !obsConfig.websocketUrl ||
      !obsConfig.password ||
      !obsConfig.sourceName ||
      !targetLanguage ||
      !charLimit
    );
  }, [apiKey, obsConfig, targetLanguage, charLimit]);

  console.log(translation);

  const fetchToken = async () => {
    try {
      if (!apiKey) {
        throw new Error("API Key is missing");
      }
      const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
          modalities: ["text"],
          instructions: `You are a translator, translating everything you hear into ${targetLanguage}`,
        }),
      });

      if (!r.ok) {
        throw new Error(`HTTP Error: ${r.status}`);
      }
      const result = await r.json();
      return result;
    } catch (error) {
      setErrorMessage(error.message);
      console.error("Error fetching token:", error);
      throw error;
    }
  };

  async function startSession() {
    if (isError) {
      setErrorMessage("Please fill in all configuration fields");
      return;
    }

    try {
      setIsActivating(true);
      setErrorMessage("");
      const data = await fetchToken();
      const EPHEMERAL_KEY = data.client_secret.value;

      const pc = new RTCPeerConnection();
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;
      setModelConnected(true);
      connectOBS();
    } catch (e) {
      console.log(e);
    } finally {
      setIsActivating(false);
    }
  }

  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  const setFreetypeText = (newText) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          op: 6,
          d: {
            requestType: "SetInputSettings",
            requestId: "updateText",
            requestData: {
              inputName: obsConfig.sourceName,
              inputSettings: { text: newText },
            },
          },
        })
      );
    }
  };

  useEffect(() => {
    setFreetypeText(translation);
  }, [translation]);

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "response.text.delta") {
          setTranslation((prev) => (prev + data.delta).slice(-charLimit));
        }
        setEvents((prev) => [JSON.parse(e.data), ...prev]);
      });
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  const connectOBS = () => {
    socket = new WebSocket(obsConfig.websocketUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ op: 1, d: { rpcVersion: 1 } }));
    };

    socket.onmessage = async (event) => {
      const response = JSON.parse(event.data);

      if (response.op === 2 && response.d.authentication) {
        const { salt, challenge } = response.d.authentication;
        const secret = await sha256(OBS_PASSWORD + salt);
        const combined = new Uint8Array([
          ...secret,
          ...new TextEncoder().encode(challenge),
        ]);
        const authHashBuffer = await crypto.subtle.digest("SHA-256", combined);
        const authToken = btoa(
          String.fromCharCode(...new Uint8Array(authHashBuffer))
        );

        socket.send(
          JSON.stringify({ op: 2, d: { authentication: authToken } })
        );
      }

      if (
        response.op === 5 &&
        response.d.hasOwnProperty("negotiatedRpcVersion")
      ) {
        setWs(socket);
        setObsConnected(true);
      }
    };

    socket.onerror = () => {
      socket.close();
      setObsConnected(false);
    };

    socket.onclose = () => {
      setTimeout(connectOBS, 5000);
      setObsConnected(false);
    };
  };

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">Realtime OBS Translator</h1>
        <div className="ml-auto flex items-center space-x-4">
          <div className="flex items-center">
            <span className="mr-2 text-sm">OBS</span>
            <div
              className={`w-3 h-3 rounded-full ${
                obsConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-sm">AI Model</span>
            <div
              className={`w-3 h-3 rounded-full ${
                isSessionActive ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0 p-4">
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        <div className="mb-4">
          <label className="block">OpenAI API Key</label>
          <input
            className="border p-2 w-full rounded-2xl"
            type="password"
            value={apiKey}
            onChange={(e) => {
              localStorage.setItem("apiKey", e.target.value);
              setApiKey(e.target.value);
            }}
          />
        </div>
        <div className="mb-4">
          <label className="block">Target Language</label>
          <select
            className="border p-2 rounded-2xl"
            value={targetLanguage}
            onChange={(e) => {
              localStorage.setItem("targetLanguage", e.target.value);
              setTargetLanguage(e.target.value);
            }}
          >
            <option value="english">English</option>
            <option value="korean">Korean</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block">OBS WebSocket URL</label>
          <input
            placeholder="ws://localhost:4455"
            className="border p-2 w-full rounded-2xl"
            value={obsConfig.websocketUrl}
            onChange={(e) => {
              localStorage.setItem("websocketUrl", e.target.value);
              setObsConfig({ ...obsConfig, websocketUrl: e.target.value });
            }}
          />
        </div>
        <div className="mb-4">
          <label className="block">OBS Password</label>
          <input
            className="border p-2 w-full rounded-2xl"
            type="password"
            value={obsConfig.password}
            onChange={(e) => {
              localStorage.setItem("websocketPassword", e.target.value);
              setObsConfig({ ...obsConfig, password: e.target.value });
            }}
          />
        </div>
        <div className="mb-4">
          <label className="block">OBS Source Name</label>
          <input
            className="border p-2 w-full rounded-2xl"
            value={obsConfig.sourceName}
            onChange={(e) => {
              localStorage.setItem("sourceName", e.target.value);
              setObsConfig({ ...obsConfig, sourceName: e.target.value });
            }}
          />
        </div>
        <div className="mb-4">
          <label className="block">Character limit</label>
          <input
            type="number"
            min={1}
            className="border p-2 w-full rounded-2xl"
            value={charLimit}
            onChange={(e) => {
              localStorage.setItem("charLimit", e.target.value);
              setChatLimit(e.target.value);
            }}
          />
        </div>
        <SessionControls
          isActivating={isActivating}
          startSession={startSession}
          stopSession={stopSession}
          isSessionActive={isSessionActive}
        />
      </main>
    </>
  );
}
