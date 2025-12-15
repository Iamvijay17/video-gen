import { useState, useEffect } from 'react';
import axios from 'axios';
import * as Select from '@radix-ui/react-select';
import * as Progress from '@radix-ui/react-progress';
import * as Toast from '@radix-ui/react-toast';
import { ChevronDown, Play, Loader2, CheckCircle, XCircle, Eye, Mic, Video } from 'lucide-react';
import { cn } from '../lib/utils';

const AudioVideoGenerator = () => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [titleText, setTitleText] = useState('Welcome to My Video');
  const [titleColor, setTitleColor] = useState('#000000');
  const [logoColor1, setLogoColor1] = useState('#91EAE4');
  const [logoColor2, setLogoColor2] = useState('#86A8E7');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationJob, setGenerationJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ru', label: 'Russian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
  ];

  // Poll for progress updates
  useEffect(() => {
    let interval;
    if (generationJob && generationJob.status === 'processing') {
      interval = setInterval(async() => {
        try {
          const response = await axios.get(`http://localhost:8000/api/video/jobs/${generationJob._id}`);
          const job = response.data.data;
          setGenerationJob(job);
          setProgress(job.progress);

          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            setToastMessage(
              job.status === 'completed'
                ? 'Audio-video generation completed successfully!'
                : `Audio-video generation failed: ${job.error}`
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
  }, [generationJob]);

  const handleGenerate = async() => {
    if (!text.trim()) {
      setToastMessage('Please enter some text to generate audio and video');
      setShowToast(true);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('http://localhost:8000/api/video/generate-with-audio', {
        text: text.trim(),
        lang: language,
        inputProps: {
          titleText,
          titleColor,
          logoColor1,
          logoColor2,
        },
      });

      setGenerationJob(response.data);
      setProgress(0);
      setToastMessage('Audio-video generation started!');
      setShowToast(true);
    } catch (error) {
      console.error('Error starting audio-video generation:', error);
      setToastMessage('Failed to start audio-video generation. Please try again.');
      setShowToast(true);
    } finally {
      setIsGenerating(false);
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
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
          <Mic className="w-5 h-5" />
          <Video className="w-5 h-5" />
          Audio-Video Generator
        </h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="text" className="block text-sm font-medium mb-2 text-gray-900">
              Text to Convert to Speech & Video
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to convert to speech and include in your video..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Language
              </label>
              <Select.Root value={language} onValueChange={setLanguage} disabled={isGenerating}>
                <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between">
                  <Select.Value />
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-200 rounded-md shadow-md">
                    <Select.Viewport className="p-1">
                      {languages.map((lang) => (
                        <Select.Item
                          key={lang.value}
                          value={lang.value}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-sm outline-none focus:bg-gray-100"
                        >
                          <Select.ItemText>{lang.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            <div>
              <label htmlFor="titleText" className="block text-sm font-medium mb-2 text-gray-900">
                Video Title
              </label>
              <input
                id="titleText"
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                disabled={isGenerating}
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
                disabled={isGenerating}
              />
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
                disabled={isGenerating}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className={cn(
              "w-full px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2",
              isGenerating || !text.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Audio-Video...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Audio-Video
              </>
            )}
          </button>

          {generationJob && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                {getStatusIcon(generationJob.status)}
                <h3 className="font-medium text-gray-900">Generation Job</h3>
                <span className={cn("text-sm font-medium", getStatusColor(generationJob.status))}>
                  {generationJob.status.charAt(0).toUpperCase() + generationJob.status.slice(1)}
                </span>
              </div>

              {generationJob.status === 'processing' && (
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
                  <div className="text-xs text-gray-500 mt-1">
                    This process generates TTS audio and renders video with synchronized audio playback.
                  </div>
                </div>
              )}

              {generationJob.status === 'completed' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Audio-video generation completed successfully! File saved to: {generationJob.outputPath}
                  </p>
                  <button
                    onClick={() => window.open(generationJob.url, '_blank')}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Video
                  </button>
                </div>
              )}

              {generationJob.status === 'failed' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600">Generation failed</p>
                  {generationJob.error && (
                    <p className="text-sm text-gray-600 bg-red-50 p-2 rounded">
                      {generationJob.error}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 text-sm text-gray-600">
                <p>Job ID: {generationJob._id}</p>
                <p>Started: {new Date(generationJob.createdAt).toLocaleString()}</p>
                {generationJob.completedAt && (
                  <p>Completed: {new Date(generationJob.completedAt).toLocaleString()}</p>
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

export default AudioVideoGenerator;
