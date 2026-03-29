import React from "react";

export default function ChatBox({
  isLocalGame,
  displayedChat,
  myIdx,
  chatInput,
  setChatInput,
  sendChat,
  chatEndRef,
  isMobile = false,
}) {
  return (
    <div className={isMobile ? "chat-mobile-sheet" : "chat-box"}>
      <div className="chat-header">
        {isLocalGame ? "🤖 AI CHAT" : "💬 CHAT"}
      </div>
      <div className="chat-messages-scroll">
        {displayedChat.length === 0 && (
          <div className="chart-desc text-center margin-top-12">Say hi! 👋</div>
        )}
        {displayedChat.map((msg, i) => {
          const isMe = msg.id === myIdx;
          return (
            <div
              key={i}
              className={`flex gap-3 align-end ${isMe ? "flex-reverse" : "flex-row"}`}
            >
              <span className="text-sm flex-shrink-0">{msg.token}</span>
              <div className={`chat-bubble ${isMe ? "chat-me" : "chat-them"}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendChat();
          }}
          placeholder={isLocalGame ? "Ask AI for strategy..." : "Type..."}
          maxLength={120}
          className="chat-input-field"
        />
        <button
          onClick={sendChat}
          disabled={!chatInput.trim()}
          className={`btn-chat-go ${chatInput.trim() ? "btn-success" : "btn-dim"}`}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
