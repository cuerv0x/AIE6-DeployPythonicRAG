import { useState, useRef } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: false,
      });
      setIsFileUploaded(true);
      setMessages([
        {
          role: "assistant",
          content: `File "${file.name}" uploaded successfully! You can now ask questions about it.`,
        },
      ]);
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessages([
        {
          role: "assistant",
          content: "Error uploading file. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/ask`,
        { question },
        {
          withCredentials: false,
        }
      );
      const assistantMessage = {
        role: "assistant" as const,
        content: response.data.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error asking question:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error processing your question. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow p-6">
        {!isFileUploaded ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-blue-500 hover:text-blue-700"
            >
              Upload a file (PDF or TXT)
            </label>
          </div>
        ) : (
          <>
            <div className="mb-4 h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-2 p-2 rounded ${
                    message.role === "user"
                      ? "bg-blue-100 ml-auto max-w-[80%]"
                      : "bg-gray-100 max-w-[80%]"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 p-2 border rounded"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                disabled={isLoading}
              >
                Send
              </button>
            </form>
          </>
        )}
        {isLoading && <div className="text-center mt-4">Loading...</div>}
      </div>
    </div>
  );
}

export default App;
