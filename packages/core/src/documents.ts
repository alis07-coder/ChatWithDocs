// Document types the knowledge base accepts.
// The upload page and the text extractors will both use this list.

export const SUPPORTED_DOCUMENT_TYPES = [
  { label: "PDF", extension: ".pdf", mimeType: "application/pdf" },
  {
    label: "Word",
    extension: ".docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  { label: "Text", extension: ".txt", mimeType: "text/plain" },
  { label: "Markdown", extension: ".md", mimeType: "text/markdown" },
] as const;

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];
