import { useState } from 'react';

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
    <div className="min-h-screen bg-linear-to-br from-[#0F0F0F] via-[#1a1a1a] to-[#2A2A2A] text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#0F0F0F]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-[#3B82F6] to-[#2563EB] rounded-lg" />
            <span className="text-xl font-bold">InterviewAI</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#10B981]/20 text-[#10B981] rounded-full text-sm mb-4">
            <span>📄</span>
            <span>Optional</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Add Your Documents</h1>
          <p className="text-[#9CA3AF]">
            Upload or paste your resume and job description for personalized questions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Resume Upload */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>📝</span> Your Resume
              </h3>
              {resumeUpload.status === 'success' && (
                <span className="text-xs bg-[#10B981]/20 text-[#10B981] px-2 py-1 rounded-full">
                  ✓ {resumeUpload.chunksIndexed} sections indexed
                </span>
              )}
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block">
                <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-4 text-center cursor-pointer hover:border-[#3B82F6]/50 transition-colors">
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
                  <svg className="w-8 h-8 mx-auto mb-2 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-[#9CA3AF]">
                    Drop a file or click to upload
                  </p>
                  <p className="text-xs text-[#6B7280] mt-1">.txt or .pdf</p>
                </div>
              </label>
            </div>

            {/* Or Divider */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-[#2A2A2A]" />
              <span className="text-xs text-[#6B7280]">or paste below</span>
              <div className="flex-1 h-px bg-[#2A2A2A]" />
            </div>

            {/* Text Area */}
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              onBlur={() => handlePasteAndUpload(resumeText, 'resume', setResumeUpload)}
              placeholder="Paste your resume text here..."
              className="w-full h-32 px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg focus:border-[#3B82F6] focus:outline-none transition-colors resize-none text-sm"
              disabled={resumeUpload.status === 'uploading'}
            />

            {/* Status */}
            {resumeUpload.status === 'uploading' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#3B82F6]">
                <div className="w-4 h-4 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
                {resumeUpload.message}
              </div>
            )}
            {resumeUpload.status === 'error' && (
              <div className="mt-3 text-sm text-[#EF4444]">
                ✗ {resumeUpload.message}
              </div>
            )}
          </div>

          {/* Job Description Upload */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>💼</span> Job Description
              </h3>
              {jdUpload.status === 'success' && (
                <span className="text-xs bg-[#10B981]/20 text-[#10B981] px-2 py-1 rounded-full">
                  ✓ {jdUpload.chunksIndexed} sections indexed
                </span>
              )}
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block">
                <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-4 text-center cursor-pointer hover:border-[#3B82F6]/50 transition-colors">
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
                  <svg className="w-8 h-8 mx-auto mb-2 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-[#9CA3AF]">
                    Drop a file or click to upload
                  </p>
                  <p className="text-xs text-[#6B7280] mt-1">.txt or .pdf</p>
                </div>
              </label>
            </div>

            {/* Or Divider */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-[#2A2A2A]" />
              <span className="text-xs text-[#6B7280]">or paste below</span>
              <div className="flex-1 h-px bg-[#2A2A2A]" />
            </div>

            {/* Text Area */}
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              onBlur={() => handlePasteAndUpload(jdText, 'jd', setJdUpload)}
              placeholder="Paste the job description here..."
              className="w-full h-32 px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg focus:border-[#3B82F6] focus:outline-none transition-colors resize-none text-sm"
              disabled={jdUpload.status === 'uploading'}
            />

            {/* Status */}
            {jdUpload.status === 'uploading' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#3B82F6]">
                <div className="w-4 h-4 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
                {jdUpload.message}
              </div>
            )}
            {jdUpload.status === 'error' && (
              <div className="mt-3 text-sm text-[#EF4444]">
                ✗ {jdUpload.message}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        {hasAnyDocument && (
          <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-xl">✨</span>
              <div>
                <p className="font-medium text-[#10B981]">Documents Ready!</p>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  Your AI interviewer will now ask personalized questions based on your background and the job requirements.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={onContinue}
            disabled={isUploading}
            className="text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors disabled:opacity-50"
          >
            Skip for now →
          </button>
          <button
            onClick={onContinue}
            disabled={isUploading}
            className="px-8 py-4 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#2A2A2A] disabled:cursor-not-allowed rounded-lg text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-[#3B82F6]/20"
          >
            {isUploading ? 'Processing...' : 'Start Interview'}
          </button>
        </div>
      </main>
    </div>
  );
}
