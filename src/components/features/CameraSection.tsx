import { useEffect } from 'react';
import { SensorCard } from '@/components/features/SensorCard';
import { useCamera } from '@/hooks/useCamera';
import { Camera, CameraOff, RefreshCw, Aperture, Download, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CameraSection() {
  const { stream, hasPermission, error, facing, capturedImage, videoRef, startCamera, stopCamera, switchCamera, captureImage, clearCapture } = useCamera();

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const handleDownload = () => {
    if (!capturedImage) return;
    const a = document.createElement('a');
    a.href = capturedImage;
    a.download = `capture-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-500" /> Camera Tools
        </h2>
        <div className="flex gap-2">
          {!stream ? (
            <>
              <Button size="sm" variant="outline" onClick={() => startCamera('user')} className="text-xs h-7">
                Front
              </Button>
              <Button size="sm" onClick={() => startCamera('environment')} className="text-xs h-7">
                <Camera className="h-3.5 w-3.5 mr-1" />
                Rear
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={switchCamera} className="text-xs h-7">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Flip ({facing === 'user' ? 'Front' : 'Rear'})
              </Button>
              <Button size="sm" onClick={captureImage} className="text-xs h-7">
                <Aperture className="h-3.5 w-3.5 mr-1" />
                Capture
              </Button>
              <Button size="sm" variant="outline" onClick={stopCamera} className="text-xs h-7">
                <CameraOff className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SensorCard title="Camera Preview" icon={<Camera className="h-4 w-4 text-blue-500" />} live={!!stream}>
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <CameraOff className="h-12 w-12 text-white/20" />
                <p className="text-white/40 text-sm">Camera inactive</p>
                <Button size="sm" onClick={() => startCamera()} className="text-xs h-7">
                  Start Camera
                </Button>
              </div>
            )}
            {stream && (
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 rounded text-[10px] text-white font-medium">
                {facing === 'user' ? 'Front Camera' : 'Rear Camera'}
              </div>
            )}
          </div>
        </SensorCard>

        <SensorCard title="Captured Image" icon={<Aperture className="h-4 w-4 text-blue-400" />}>
          <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
            {capturedImage ? (
              <>
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={handleDownload}
                    className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    onClick={clearCapture}
                    className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                    aria-label="Clear"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Aperture className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No image captured yet</p>
              </div>
            )}
          </div>
        </SensorCard>
      </div>
    </div>
  );
}
