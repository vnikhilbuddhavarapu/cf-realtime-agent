import { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/Card";

interface DocumentUploadProps {
  roleplayId: string;
  onContinue: () => void;
  onBack: () => void;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  chunksIndexed?: number;
}

export function DocumentUpload({ roleplayId, onContinue, onBack }: DocumentUploadProps) {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [resumeUpload, setResumeUpload] = useState<UploadState>({ status: 'idle' });
  const [jdUpload, setJdUpload] = useState<UploadState>({ status: 'idle' });

  const handleFileUpload = async (
    file: File,
    type: 'resume' | 'jd',
    setUploadState: (state: UploadState) => void,
    setText: (text: string) => void
  ) => {
    setUploadState({ status: 'uploading', message: 'Reading file...' });

    try {
      // For text files, read directly
      if (file.type === 'text/plain') {
        const text = await file.text();
        setText(text);
        await uploadDocument(text, type, setUploadState);
      } 
      // For PDFs, we'll send to the backend which uses unpdf
      else if (file.type === 'application/pdf') {
        setUploadState({ status: 'uploading', message: 'Processing PDF...' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('roleplayId', roleplayId);

        const endpoint = type === 'resume' ? '/api/rag/resume' : '/api/rag/job-description';
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          setUploadState({ 
            status: 'success', 
            message: 'Document processed!',
            chunksIndexed: result.data?.chunksIndexed 
          });
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } else {
        throw new Error('Please upload a .txt or .pdf file');
      }
    } catch (error) {
      setUploadState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Upload failed' 
      });
    }
  };

  const uploadDocument = async (
    content: string,
    type: 'resume' | 'jd',
    setUploadState: (state: UploadState) => void
  ) => {
    if (!content.trim()) {
      setUploadState({ status: 'idle' });
      return;
    }

    setUploadState({ status: 'uploading', message: 'Analyzing document...' });

    try {
      const endpoint = type === 'resume' ? '/api/rag/resume' : '/api/rag/job-description';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleplayId, content }),
      });

      const result = await response.json();
      if (result.success) {
        setUploadState({ 
          status: 'success', 
          message: 'Document analyzed!',
          chunksIndexed: result.data?.chunksIndexed 
        });
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      setUploadState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Processing failed' 
      });
    }
  };

  const handlePasteAndUpload = async (
    text: string,
    type: 'resume' | 'jd',
    setUploadState: (state: UploadState) => void
  ) => {
    if (text.trim().length > 100) {
      await uploadDocument(text, type, setUploadState);
    }
  };

  const hasAnyDocument = resumeUpload.status === 'success' || jdUpload.status === 'success';
  const isUploading = resumeUpload.status === 'uploading' || jdUpload.status === 'uploading';

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <img src="/icon.png" className="w-7 h-7 rounded-xl bg-black" />
            <span className="text-xl font-semibold tracking-tight">InterviewAI</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Badge variant="subtle">Optional</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            Add your documents
          </h1>
          <p className="text-zinc-400">
            Upload or paste your resume and job description for personalized questions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Resume Upload */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-300" />
                    Resume
                  </CardTitle>
                  <CardDescription>Used to personalize questions and feedback.</CardDescription>
                </div>
                {resumeUpload.status === 'success' && (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {resumeUpload.chunksIndexed} indexed
                  </Badge>
                )}
              </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block">
                <div className="border border-dashed border-zinc-800 rounded-2xl p-4 text-center hover:border-zinc-700 transition-colors">
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'resume', setResumeUpload, setResumeText);
                    }}
                    disabled={resumeUpload.status === 'uploading'}
                  />
                  <UploadCloud className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                  <p className="text-sm text-zinc-200">Drop a file or click to upload</p>
                  <p className="text-xs text-zinc-500 mt-1">.txt or .pdf</p>
                </div>
              </label>
            </div>

            {/* Or Divider */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-500">or paste below</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Text Area */}
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              onBlur={() => handlePasteAndUpload(resumeText, 'resume', setResumeUpload)}
              placeholder="Paste your resume text here..."
              className="w-full h-32 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:outline-none transition-colors resize-none text-sm"
              disabled={resumeUpload.status === 'uploading'}
            />

            {/* Status */}
            {resumeUpload.status === 'uploading' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-200">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                {resumeUpload.message}
              </div>
            )}
            {resumeUpload.status === 'error' && (
              <div className="mt-3 text-sm text-red-300 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {resumeUpload.message}
              </div>
            )}
            </CardContent>
          </Card>

          {/* Job Description Upload */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-zinc-300" />
                    Job description
                  </CardTitle>
                  <CardDescription>Align questions to your target role.</CardDescription>
                </div>
                {jdUpload.status === 'success' && (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {jdUpload.chunksIndexed} indexed
                  </Badge>
                )}
              </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block">
                <div className="border border-dashed border-zinc-800 rounded-2xl p-4 text-center hover:border-zinc-700 transition-colors">
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'jd', setJdUpload, setJdText);
                    }}
                    disabled={jdUpload.status === 'uploading'}
                  />
                  <UploadCloud className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                  <p className="text-sm text-zinc-200">Drop a file or click to upload</p>
                  <p className="text-xs text-zinc-500 mt-1">.txt or .pdf</p>
                </div>
              </label>
            </div>

            {/* Or Divider */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-500">or paste below</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Text Area */}
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              onBlur={() => handlePasteAndUpload(jdText, 'jd', setJdUpload)}
              placeholder="Paste job description text here..."
              className="w-full h-32 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:outline-none transition-colors resize-none text-sm"
              disabled={jdUpload.status === 'uploading'}
            />

            {/* Status */}
            {jdUpload.status === 'uploading' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-200">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                {jdUpload.message}
              </div>
            )}
            {jdUpload.status === 'error' && (
              <div className="mt-3 text-sm text-red-300 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {jdUpload.message}
              </div>
            )}
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        {hasAnyDocument && (
          <div className="mb-8">
            <Card>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-zinc-200" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">Documents ready</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Your interviewer will ask more personalized questions based on your background and the role.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-zinc-500">
            {hasAnyDocument
              ? 'Documents uploaded successfully!'
              : 'You can skip this step if you want'}
          </p>
          <Button onClick={onContinue} disabled={isUploading} size="lg">
            {isUploading ? 'Uploading...' : 'Continue to interview'}
          </Button>
        </div>
      </main>
    </div>
  );
}
