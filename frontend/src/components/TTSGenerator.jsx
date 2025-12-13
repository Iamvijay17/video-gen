import { useState } from 'react';
import axios from 'axios';
import * as Select from '@radix-ui/react-select';
import * as Toast from '@radix-ui/react-toast';
import { ChevronDown, Play, Download, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const TTSGenerator = () => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);
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

  const handleGenerate = async() => {
    if (!text.trim()) {
      setToastMessage('Please enter some text to generate speech');
      setShowToast(true);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('http://localhost:8000/api/tts/generate', {
        text: text.trim(),
        lang: language,
      });

      setGeneratedAudio(response.data.data);
      setToastMessage('Audio generated successfully!');
      setShowToast(true);
    } catch (error) {
      console.error('Error generating TTS:', error);
      setToastMessage('Failed to generate audio. Please try again.');
      setShowToast(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlay = () => {
    if (generatedAudio?.url) {
      const audio = new Audio(`http://localhost:5050${generatedAudio.url}`);
      audio.play();
    }
  };

  const handleDownload = () => {
    if (generatedAudio?.url) {
      const link = document.createElement('a');
      link.href = `http://localhost:5050${generatedAudio.url}`;
      link.download = generatedAudio.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">
          Text-to-Speech Generator
        </h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="text" className="block text-sm font-medium mb-2 text-gray-900">
              Text to Convert
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to convert to speech..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              disabled={isGenerating}
            />
          </div>

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
                Generating Audio...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Speech
              </>
            )}
          </button>

          {generatedAudio && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium mb-3 text-gray-900">Generated Audio</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePlay}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Play
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <p>File ID: {generatedAudio.fileId}</p>
                <p>Language: {languages.find(l => l.value === generatedAudio.lang)?.label}</p>
                <p>Created: {new Date(generatedAudio.createdAt).toLocaleString()}</p>
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

export default TTSGenerator;
