import { NextResponse } from "next/server";
import { parseDocx } from "@/lib/parse/docx";
import { parsePdf } from "@/lib/parse/pdf";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Could not read the uploaded form data.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("Please choose a PDF or DOCX file to upload.", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse("The file is too large. Maximum file size is 5 MB.", 413);
  }

  const extension = file.name.toLowerCase().split(".").pop();
  const mimeType = file.type.toLowerCase();
  const isPdf =
    extension === "pdf" &&
    (!mimeType || mimeType === "application/pdf" || mimeType === "application/octet-stream");
  const isDocx =
    extension === "docx" &&
    (!mimeType ||
      mimeType === DOCX_MIME_TYPE ||
      mimeType === "application/octet-stream");

  if (!isPdf && !isDocx) {
    return errorResponse("Unsupported file type. Please upload a PDF or DOCX file.", 415);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = isPdf ? await parsePdf(buffer) : await parseDocx(buffer);
    const text = extractedText
      .replace(/^--\s*\d+\s+of\s+\d+\s*--$/gm, "")
      .trim();

    if (!text) {
      return errorResponse(
        "No selectable text was found. This may be a scanned PDF; please upload a text-based resume.",
        422,
      );
    }

    const wordCount = text.split(/\s+/).length;

    return NextResponse.json({
      fileName: file.name,
      text,
      wordCount,
    });
  } catch (error) {
    console.error("Resume text extraction failed:", error);
    return errorResponse(
      "Could not extract text from this file. Please check that it is a valid, readable PDF or DOCX.",
      422,
    );
  }
}
