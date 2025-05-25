import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPRComments } from "../../utils/api";

const PRDetailChatbot = ({ open, onClose, pr }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [comment, setComment] = useState("");
  const [prComments, setPRComments] = useState([]);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);
  const [owner, repoName] = pr?.url ? pr.url.split("/").slice(3, 5) : ["", ""];
  useEffect(() => {
    if (open) {
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
      if (!open || !owner || !repoName || !pr?.id) {
        setError("Missing repository or PR information.");
        return;
      }

      try {
        const comments = await getPRComments(owner, repoName, pr.id);
        const formattedComments = comments.map((c) => ({
          ...c,
          timestamp: new Date(c.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setPRComments(formattedComments);
        setError(null);
        console.log(
          `Fetched ${formattedComments.length} comments, PR object reports ${pr.comments} comments`
        );
      } catch (error) {
        console.error("Error fetching PR comments:", error);
        setError("Failed to load comments. Please try again later.");
        setPRComments([]);
      }
    };

    fetchComments();
  }, [open, owner, repoName, pr?.id]);

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

  const handleSendMessage = () => {
    if (!comment.trim()) return;

    const userMessage = {
      sender: "user",
      message: comment,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatHistory((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const botResponse = {
        sender: "bot",
        message:
          "Thanks for your message! I'm analyzing the pull request. Could you provide more details about what specific aspect you'd like me to focus on?",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatHistory((prev) => [...prev, botResponse]);
    }, 1000);

    setComment("");
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
              #{pr.id}
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
              Created by {pr.author || "johndoe"} on{" "}
              {new Date(pr.createdAt || "2023-05-15").toLocaleDateString()}
              {pr.url && (
                <a
                  href={pr.url}
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
              )
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
            <p className="text-[var(--text-primary)]">
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
                            ? "bg-[var(--button-bg)] text-[var(--text-primary)] rounded-br-none"
                            : "bg-gray-700 text-[var(--text-primary)] rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] mt-1 block">
                        {msg.timestamp}
                      </span>
                    </div>
                  </motion.div>
                ))}
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
              onChange={(e) => setComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && comment.trim()) {
                  handleSendMessage();
                }
              }}
            />
            <button
              className={`bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--text-primary)] px-4 py-2 rounded-lg transition-colors ${
                !comment.trim() ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={handleSendMessage}
              disabled={!comment.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PRDetailChatbot;
