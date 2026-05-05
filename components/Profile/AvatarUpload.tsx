import { useState, useRef } from 'react';
import styles from '@/styles/effects.module.css';
import animations from '@/styles/animations.module.css';

interface AvatarUploadProps {
  currentAvatar: string | null;
  onUploadSuccess: (avatarUrl: string) => void;
}

export default function AvatarUpload({ currentAvatar, onUploadSuccess }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      setPreview(data.avatar_url);
      onUploadSuccess(data.avatar_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(currentAvatar);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {/* Avatar Display */}
        <div className={`${animations.scaleBounce} relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg`}>
          {preview ? (
            <img
              src={preview}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              ?
            </div>
          )}

          {/* Upload Overlay */}
          <div
            onClick={handleClick}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {uploading ? (
              <div className={animations.shimmer}>
                <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-white text-sm font-medium">Change</span>
              </div>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Upload Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className={`mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${animations.glowPulse}`}
      >
        {uploading ? 'Uploading...' : 'Upload Avatar'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="mt-3 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Info Text */}
      <p className="mt-2 text-sm text-gray-500 text-center">
        Max size: 5MB • JPG, PNG, GIF, WebP
      </p>
    </div>
  );
}
