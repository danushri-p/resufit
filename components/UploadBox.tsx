"use client";

import { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { readApiResponse } from "@/lib/apiResponse";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface ResumeUploadResult {
  fileName: string;
  text: string;
  wordCount: number;
}

interface UploadBoxProps {
  onTextExtracted: (result: ResumeUploadResult) => void;
}

function isResumeUploadResult(value: unknown): value is ResumeUploadResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "fileName" in value &&
    typeof value.fileName === "string" &&
    "text" in value &&
    typeof value.text === "string" &&
    "wordCount" in value &&
    typeof value.wordCount === "number"
  );
}

function getApiError(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return undefined;
}

export function UploadBox({ onTextExtracted }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();

  async function uploadFile(file: File) {
    if (isUploading) {
      return;
    }

    const extension = file.name.toLowerCase().split(".").pop();

    setError(undefined);

    if (extension !== "pdf" && extension !== "docx") {
      setError("Unsupported file type. Please upload a PDF or DOCX file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The file is too large. Maximum file size is 5 MB.");
      return;
    }

    setFileName(file.name);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });
      const payload = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiError(payload) ?? "The resume could not be uploaded.",
        );
      }

      if (!isResumeUploadResult(payload)) {
        throw new Error("The server returned an invalid resume response.");
      }

      onTextExtracted(payload);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The resume could not be uploaded. Please try again.",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void uploadFile(file);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload your resume</CardTitle>
        <CardDescription>PDF or DOCX, up to 5 MB</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a PDF or DOCX resume"
          aria-disabled={isUploading}
          aria-describedby={error ? "resume-upload-error" : undefined}
          onClick={() => {
            if (!isUploading) {
              inputRef.current?.click();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!isUploading) {
                inputRef.current?.click();
              }
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isUploading) {
              setIsDragging(true);
            }
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-stone-300 bg-stone-50 hover:border-indigo-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                void uploadFile(file);
              }
            }}
            aria-label="Select resume file"
          />
          <p className="font-medium text-stone-800">
            {isDragging
              ? "Drop your resume here"
              : "Drag your resume here or click to browse"}
          </p>
          {fileName && (
            <p className="text-sm text-stone-700" aria-live="polite">
              {isUploading ? "Uploading" : "Selected"}: {fileName}
            </p>
          )}
          {isUploading && (
            <p className="text-sm text-indigo-700" role="status">
              Extracting resume text…
            </p>
          )}
        </div>
        {error && (
          <p
            id="resume-upload-error"
            className="mt-3 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
