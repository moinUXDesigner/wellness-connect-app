import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { Camera, Check, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { UserAvatar, type UserAvatarUser } from './UserAvatar';

type ProfileAvatarUploaderProps = {
  user?: UserAvatarUser | null;
  src?: string | null;
  sizeClassName?: string;
  onUpload: (file: Blob) => Promise<void>;
  disabled?: boolean;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to prepare cropped profile photo.'));
    }, 'image/jpeg', 0.9);
  });
}

export function ProfileAvatarUploader({
  user,
  src,
  sizeClassName = 'h-20 w-20 border border-slate-200',
  onUpload,
  disabled = false,
}: ProfileAvatarUploaderProps) {
  const inputId = useId();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [source, setSource] = useState<{ name: string; previewUrl: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => { cropperRef.current?.destroy(); }, []);

  function closeEditor() {
    cropperRef.current?.destroy();
    cropperRef.current = null;
    setIsReady(false);
    setSource(null);
    setError('');
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image under 5MB.');
      return;
    }

    cropperRef.current?.destroy();
    cropperRef.current = null;
    setIsReady(false);
    setError('');
    setSource({
      name: file.name.replace(/\.[^.]+$/, '') || 'profile-avatar',
      previewUrl: await readFileAsDataUrl(file),
    });
  }

  function initialiseCropper() {
    if (!imageRef.current) return;

    cropperRef.current?.destroy();
    cropperRef.current = new Cropper(imageRef.current, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.92,
      background: false,
      center: true,
      cropBoxMovable: false,
      cropBoxResizable: false,
      guides: false,
      modal: true,
      responsive: true,
      restore: false,
      toggleDragModeOnDblclick: false,
      preview: previewRef.current ?? undefined,
      ready: () => setIsReady(true),
    });
  }

  async function saveCrop() {
    const canvas = cropperRef.current?.getCroppedCanvas({
      width: 512,
      height: 512,
      fillColor: '#ffffff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (!canvas) return;

    setIsSaving(true);
    setError('');
    try {
      const blob = await canvasToBlob(canvas);
      await onUpload(new File([blob], `${source?.name ?? 'profile-avatar'}.jpg`, { type: 'image/jpeg' }));
      closeEditor();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Unable to upload profile photo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="relative inline-flex">
        <UserAvatar user={user} src={src} size="xl" className={sizeClassName} />
        <label
          htmlFor={inputId}
          className={`absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-indigo-600 shadow-sm transition hover:bg-indigo-50 ${disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
          title="Change profile photo"
        >
          <Camera size={17} />
          <span className="sr-only">Change profile photo</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void handleFileChange(event)}
          disabled={disabled}
        />
      </div>

      {!source && error ? <p className="mt-2 max-w-xs text-sm font-medium text-rose-600">{error}</p> : null}

      {source ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Crop profile photo</h2>
                <p className="text-sm text-slate-500">Move and zoom the image until it fits the circular preview.</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Cancel crop">
                <X size={18} />
              </button>
            </header>

            <div className="grid min-h-0 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="h-[360px] overflow-hidden rounded-2xl bg-slate-950 sm:h-[480px]">
                <img
                  ref={imageRef}
                  src={source.previewUrl}
                  alt="Crop profile photo"
                  className="block max-w-full"
                  onLoad={initialiseCropper}
                />
              </div>

              <aside className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                  <div className="mt-3 flex justify-center">
                    <div ref={previewRef} className="h-36 w-36 overflow-hidden rounded-full border border-slate-200 bg-slate-100" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2" aria-label="Crop controls">
                  <button type="button" title="Zoom out" onClick={() => cropperRef.current?.zoom(-0.1)} className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50">
                    <Minus size={16} />
                  </button>
                  <button type="button" title="Reset crop" onClick={() => cropperRef.current?.reset()} className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50">
                    <RotateCcw size={16} />
                  </button>
                  <button type="button" title="Zoom in" onClick={() => cropperRef.current?.zoom(0.1)} className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50">
                    <Plus size={16} />
                  </button>
                </div>

                {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

                <button
                  type="button"
                  onClick={() => void saveCrop()}
                  disabled={!isReady || isSaving}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={16} />
                  {isSaving ? 'Uploading...' : 'Save photo'}
                </button>
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
