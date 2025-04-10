from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import tempfile
import os

from aimakerspace.text_utils import CharacterTextSplitter, TextFileLoader, PDFLoader
from aimakerspace.openai_utils.prompts import (
    UserRolePrompt,
    SystemRolePrompt,
)
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.openai_utils.chatmodel import ChatOpenAI

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
text_splitter = CharacterTextSplitter()
system_template = """\
Use the following context to answer a users question. If you cannot find the answer in the context, say you don't know the answer."""
system_role_prompt = SystemRolePrompt(system_template)

user_prompt_template = """\
Context:
{context}

Question:
{question}
"""
user_role_prompt = UserRolePrompt(user_prompt_template)

# Global variables to store the current session's data
vector_db = None
chat_openai = None


class QuestionRequest(BaseModel):
    question: str


class QuestionResponse(BaseModel):
    answer: str
    context: List[tuple]


def process_file(file: UploadFile) -> List[str]:
    suffix = f".{file.filename.split('.')[-1]}"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        content = file.file.read()
        temp_file.write(content)
        temp_file.flush()

        if file.filename.lower().endswith(".pdf"):
            loader = PDFLoader(temp_file.name)
        else:
            loader = TextFileLoader(temp_file.name)

        try:
            documents = loader.load_documents()
            texts = text_splitter.split_texts(documents)
            return texts
        finally:
            try:
                os.unlink(temp_file.name)
            except Exception as e:
                print(f"Error cleaning up temporary file: {e}")


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global vector_db, chat_openai

    if not file.filename.lower().endswith((".txt", ".pdf")):
        raise HTTPException(
            status_code=400, detail="Only .txt and .pdf files are supported"
        )

    try:
        texts = process_file(file)
        vector_db = VectorDatabase()
        vector_db = await vector_db.abuild_from_list(texts)
        chat_openai = ChatOpenAI()

        return {"message": "File processed successfully", "chunks": len(texts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest):
    global vector_db, chat_openai

    if not vector_db or not chat_openai:
        raise HTTPException(status_code=400, detail="Please upload a document first")

    try:
        context_list = vector_db.search_by_text(request.question, k=4)
        context_prompt = "\n".join([context[0] for context in context_list])

        formatted_system_prompt = system_role_prompt.create_message()
        formatted_user_prompt = user_role_prompt.create_message(
            question=request.question, context=context_prompt
        )

        response = await chat_openai.acomplete(
            [formatted_system_prompt, formatted_user_prompt]
        )

        return QuestionResponse(answer=response, context=context_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
