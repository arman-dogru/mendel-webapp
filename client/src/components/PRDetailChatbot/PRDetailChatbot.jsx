import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPRComments, sendChatMessage } from "../../utils/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const PRDetailChatbot = ({ open, onClose, pr }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [comment, setComment] = useState("");
  const [prComments, setPRComments] = useState([]);
  const [error, setError] = useState(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatContainerRef = useRef(null);
  const [owner, repoName] = pr?.html_url
    ? pr.html_url.split("/").slice(3, 5)
    : ["", ""];

  useEffect(() => {
    if (open) {
      setIsBotTyping(false);
      setChatHistory([
        {
          sender: "bot",
          message:
            "Hello! I'm here to help with this pull request. What would you like to discuss?",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setPRComments([]);
      setError(null);
    }
  }, [open]);

  // Fetch PR comments
  useEffect(() => {
    const fetchComments = async () => {
      if (!open || !owner || !repoName || !pr?.number) {
        // setError("Missing repository or PR information."); // This can be noisy, let's keep it silent.
        return;
      }

      try {
        const comments = await getPRComments(owner, repoName, pr.number);
        const formattedComments = comments.map((c) => ({
          ...c,
          timestamp: new Date(c.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setPRComments(formattedComments);
        setError(null);
        // Cleaned up the noisy console.log
        // console.log(`Fetched ${formattedComments.length} comments.`);
      } catch (error) {
        console.error("Error fetching PR comments:", error);
        setError("Failed to load comments. Please try again later.");
        setPRComments([]);
      }
    };

    if (open) {
      fetchComments();
    }
  }, [open, owner, repoName, pr?.number]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [chatHistory, prComments]);

  if (!pr) return null;

  const handleSendMessage = async () => {
    if (!comment.trim() || isBotTyping) return;

    const userMessage = {
      sender: "user",
      message: comment,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newChatHistory = [...chatHistory, userMessage];
    setChatHistory(newChatHistory);
    const userQuestion = comment;
    setComment("");
    setIsBotTyping(true);

    try {
      const response = await sendChatMessage({
        contextType: "pr",
        contextData: { pr },
        chatHistory: newChatHistory,
        userMessage: userQuestion,
      });

      const botResponse = {
        sender: "bot",
        message: response.message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatHistory((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Chat API error:", error);
      const errorResponse = {
        sender: "bot",
        message: "Sorry, I encountered an error. Please try again later.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatHistory((prev) => [...prev, errorResponse]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const modalVariants = {
    hidden: { x: "100%", opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 25 } },
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <motion.div
        className="h-full w-full md:w-1/2 bg-[var(--card-bg)] shadow-xl flex flex-col rounded-l-lg overflow-hidden"
        variants={modalVariants}
        initial="hidden"
        animate={open ? "visible" : "hidden"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--card-bg-hover)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-primary)] font-bold">
              #{pr.number}
            </span>
            <h2 className="text-[var(--text-primary)] font-semibold truncate">
              {pr.title || "Update authentication flow"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors p-1 rounded-full hover:bg-[var(--card-bg-hover)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto chat-container">
          <div className="mb-4">
            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              Created by {pr.user?.login || "johndoe"} on{" "}
              {new Date(pr.createdAt || "2023-05-15").toLocaleDateString()}
              {pr.html_url && (
                <a
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </p>
          </div>

          {/* Labels */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(pr.labels || ["feature", "authentication", "security"]).map(
              (label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="px-2 py-1 text-xs rounded-full bg-[var(--card-bg-hover)] text-[var(--text-primary)]"
                >
                  {label}
                </span>
              ),
            )}
            {pr.mergedAt && (
              <span className="px-2 py-1 text-xs rounded-full bg-[var(--card-bg-hover)] text-[var(--text-primary)]">
                Merged on {new Date(pr.mergedAt).toLocaleDateString()}
              </span>
            )}
            <span className="px-2 py-1 text-xs rounded-full bg-[var(--card-bg-hover)] text-[var(--text-primary)]">
              {prComments.length} 💬
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description
            </h3>
            <p className="text-[var(--text-primary)] whitespace-pre-wrap">
              {" "}
              {/* <-- Add whitespace-pre-wrap */}
              {pr.body || "This PR has no description"}
            </p>
          </div>

          {/* PR Comments */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 border-b border-[var(--text-secondary)] border-opacity-20 pb-1">
              PR Comments
            </h3>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!error && prComments.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">
                No comments yet.
              </p>
            )}
            <div className="space-y-4">
              <AnimatePresence>
                {prComments.map((cmt) => (
                  <motion.div
                    key={cmt.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="flex justify-start"
                  >
                    <div className="relative max-w-[75%]">
                      <div className="px-4 py-2 rounded-lg bg-gray-700 text-[var(--text-primary)] rounded-bl-none">
                        <p className="text-sm font-semibold">{cmt.author}</p>
                        <p className="text-sm">{cmt.body}</p>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] mt-1 block">
                        {cmt.timestamp}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Chat Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 border-b border-[var(--text-secondary)] border-opacity-20 pb-1">
              Chat with AI
            </h3>
            <div className="space-y-4">
              <AnimatePresence>
                {chatHistory.map((msg, index) => (
                  <motion.div
                    key={index}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[75%] ${
                        msg.sender === "user" ? "order-1" : "order-0"
                      }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          msg.sender === "user"
                            ? "bg-[var(--button-bg)] text-black rounded-br-none"
                            : "bg-gray-700 text-[var(--text-primary)] rounded-bl-none"
                        }`}
                      >
                        <div className="markdown-container">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({
                                node,
                                inline,
                                className,
                                children,
                                ...props
                              }) {
                                const match = /language-(\w+)/.exec(
                                  className || "",
                                );
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {msg.message}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] mt-1 block">
                        {msg.timestamp}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {isBotTyping && (
                  <motion.div
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex justify-start"
                  >
                    <div className="relative max-w-[75%]">
                      <div className="px-4 py-2 rounded-lg bg-gray-700 text-[var(--text-primary)] rounded-bl-none">
                        <p className="text-sm italic">AI is typing...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div ref={chatContainerRef} />
          </div>
        </div>

        {/* Input Section */}
        <div className="border-t border-[var(--text-secondary)] border-opacity-20 p-4 bg-[var(--card-bg)]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 bg-[var(--card-bg-hover)] text-[var(--text-primary)] p-3 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-[var(--button-bg)] transition-all"
              placeholder="Chat with AI about this pull request..."
              value={comment}
              disabled={isBotTyping}
              onChange={(e) => setComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isBotTyping && comment.trim()) {
                  handleSendMessage();
                }
              }}
            />
            <button
              className={`bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-black px-4 py-2 rounded-lg transition-colors ${
                !comment.trim() || isBotTyping
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={handleSendMessage}
              disabled={!comment.trim() || isBotTyping}
            >
              {isBotTyping ? "..." : "Send"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PRDetailChatbot;