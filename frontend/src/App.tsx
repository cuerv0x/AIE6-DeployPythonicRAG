import { useState, useRef } from "react";
import axios from "axios";
import { ArrowUpTrayIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import "./App.css";

const API_URL =
  process.env.NODE_ENV === "production"
    ? "/api" // In production, use relative path
    : "http://localhost:8000"; // In development, use full URL

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Log the file details for debugging
      console.log("Uploading file:", file.name, file.size, file.type);
      console.log("FormData:", Array.from(formData.entries()));

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          // Add Accept header to handle response type
          Accept: "application/json",
        },
        // Enable credentials and timeout
        withCredentials: true,
        timeout: 30000,
        // Log upload progress
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
          console.log("Upload progress:", percentCompleted, "%");
        },
      });

      console.log("Upload response:", response.data);

      setIsFileUploaded(true);
      setMessages([
        {
          role: "assistant",
          content: `File "${file.name}" uploaded successfully! You can now ask questions about it.`,
        },
      ]);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      // More detailed error handling
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error uploading file. Please try again.";

      setMessages([
        {
          role: "assistant",
          content: errorMessage,
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
      scrollToBottom();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                {!isFileUploaded && (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ArrowUpTrayIcon className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF or TXT files
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".txt,.pdf"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                )}

                <div className="space-y-4">
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
                        className={`max-w-sm rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {isFileUploaded && (
                  <form onSubmit={handleSubmit} className="mt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question about your document..."
                        className="input-primary"
                        disabled={isLoading}
                      />
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                        aria-label="Send message"
                      >
                        <PaperAirplaneIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                )}

                {isLoading && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
