"use client";

import { useState } from "react";
import { UploadBox, type ResumeUploadResult } from "@/components/UploadBox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function AnalyzePage() {
  const [resume, setResume] = useState<ResumeUploadResult>();

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Analyze your resume
          </h1>
          <p className="text-stone-600">
            Upload your resume and add the job description you have in mind.
          </p>
        </header>

        <UploadBox onTextExtracted={setResume} />

        <Card>
          <CardHeader>
            <CardTitle>Extracted resume text</CardTitle>
            <CardDescription>
              {resume
                ? `${resume.fileName} · ${resume.wordCount} words`
                : "Your resume text will appear here after upload."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre
              aria-live="polite"
              className="max-h-80 min-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-stone-100 p-4 font-sans text-sm leading-6 text-stone-800"
            >
              {resume?.text ?? "No resume text to preview yet."}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job description</CardTitle>
            <CardDescription>
              Paste the job description you want to compare your resume with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste the job description here..."
              rows={8}
              aria-label="Job description"
            />
            <Button type="button" disabled>
              Analyze
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
