import { useState, useEffect } from 'react';
import axios from 'axios';
import * as Progress from '@radix-ui/react-progress';
import * as Toast from '@radix-ui/react-toast';
import { Play, Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { cn } from '../lib/utils';

const VideoRenderer = () => {
  const [titleText, setTitleText] = useState('Welcome to My Video');
  const [titleColor, setTitleColor] = useState('#000000');
  const [logoColor1, setLogoColor1] = useState('#91EAE4');
  const [logoColor2, setLogoColor2] = useState('#86A8E7');
  const [isRendering, setIsRendering] = useState(false);
  const [renderJob, setRenderJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Poll for progress updates
  useEffect(() => {
    let interval;
    if (renderJob && renderJob.status === 'processing') {
      interval = setInterval(async() => {
        try {
          const response = await axios.get(`http://localhost:8000/api/video/jobs/${renderJob._id}`);
          const job = response.data.data;
          setRenderJob(job);
          setProgress(job.progress);

          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            setToastMessage(
              job.status === 'completed'
                ? 'Video rendered successfully!'
                : `Video rendering failed: ${job.error}`
            );
            setShowToast(true);
          }
        } catch (error) {
          console.error('Error fetching job status:', error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [renderJob]);

  const handleRender = async() => {
    setIsRendering(true);
    try {
      const response = await axios.post('http://localhost:8000/api/video/render', {
        inputProps: {
          titleText,
          titleColor,
          logoColor1,
          logoColor2,
        },
      });

      setRenderJob(response.data);
      setProgress(0);
      setToastMessage('Video rendering started!');
      setShowToast(true);
    } catch (error) {
      console.error('Error starting video render:', error);
      setToastMessage('Failed to start video rendering. Please try again.');
      setShowToast(true);
    } finally {
      setIsRendering(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
    case 'pending':
      return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
    case 'pending':
      return 'text-yellow-600';
    case 'processing':
      return 'text-blue-600';
    case 'completed':
      return 'text-green-600';
    case 'failed':
      return 'text-red-600';
    default:
      return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">
          Video Renderer
        </h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="titleText" className="block text-sm font-medium mb-2 text-gray-900">
              Title Text
            </label>
            <input
              id="titleText"
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              disabled={isRendering}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="titleColor" className="block text-sm font-medium mb-2 text-gray-900">
                Title Color
              </label>
              <input
                id="titleColor"
                type="color"
                value={titleColor}
                onChange={(e) => setTitleColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                disabled={isRendering}
              />
            </div>
            <div>
              <label htmlFor="logoColor1" className="block text-sm font-medium mb-2 text-gray-900">
                Logo Color 1
              </label>
              <input
                id="logoColor1"
                type="color"
                value={logoColor1}
                onChange={(e) => setLogoColor1(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                disabled={isRendering}
              />
            </div>
          </div>

          <div>
            <label htmlFor="logoColor2" className="block text-sm font-medium mb-2 text-gray-900">
              Logo Color 2
            </label>
            <input
              id="logoColor2"
              type="color"
              value={logoColor2}
              onChange={(e) => setLogoColor2(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
              disabled={isRendering}
            />
          </div>

          <button
            onClick={handleRender}
            disabled={isRendering}
            className={cn(
              "w-full px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2",
              isRendering
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {isRendering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting Render...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Render Video
              </>
            )}
          </button>

          {renderJob && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                {getStatusIcon(renderJob.status)}
                <h3 className="font-medium text-gray-900">Render Job</h3>
                <span className={cn("text-sm font-medium", getStatusColor(renderJob.status))}>
                  {renderJob.status.charAt(0).toUpperCase() + renderJob.status.slice(1)}
                </span>
              </div>

              {renderJob.status === 'processing' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress.Root className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <Progress.Indicator
                      className="h-full w-full flex-1 bg-blue-600 transition-all"
                      style={{ transform: `translateX(-${100 - progress}%)` }}
                    />
                  </Progress.Root>
                </div>
              )}

              {renderJob.status === 'completed' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Video rendered successfully! File saved to: {renderJob.outputPath}
                  </p>
                  <button
                    onClick={() => window.open(`file://${renderJob.outputPath}`, '_blank')}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Video
                  </button>
                </div>
              )}

              {renderJob.status === 'failed' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600">Rendering failed</p>
                  {renderJob.error && (
                    <p className="text-sm text-gray-600 bg-red-50 p-2 rounded">
                      {renderJob.error}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 text-sm text-gray-600">
                <p>Job ID: {renderJob._id}</p>
                <p>Started: {new Date(renderJob.createdAt).toLocaleString()}</p>
                {renderJob.completedAt && (
                  <p>Completed: {new Date(renderJob.completedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast.Provider>
        <Toast.Root
          open={showToast}
          onOpenChange={setShowToast}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg"
        >
          <Toast.Description className="text-gray-900">
            {toastMessage}
          </Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed top-4 right-4 z-50" />
      </Toast.Provider>
    </div>
  );
};

export default VideoRenderer;
