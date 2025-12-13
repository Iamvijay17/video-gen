import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Mic, Video, History, Settings } from 'lucide-react';
import TTSGenerator from './components/TTSGenerator';
import VideoRenderer from './components/VideoRenderer';
import HistoryView from './components/HistoryView';

function App() {
  const [activeTab, setActiveTab] = useState('tts');

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Video Generation Studio
          </h1>
          <p className="text-gray-600">
            Create videos with AI-powered text-to-speech and rendering
          </p>
        </div>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="grid w-full grid-cols-3 mb-8">
            <Tabs.Trigger
              value="tts"
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <Mic className="w-4 h-4" />
              Text-to-Speech
            </Tabs.Trigger>
            <Tabs.Trigger
              value="video"
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <Video className="w-4 h-4" />
              Video Rendering
            </Tabs.Trigger>
            <Tabs.Trigger
              value="history"
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <History className="w-4 h-4" />
              History & Logs
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="tts" className="space-y-6">
            <TTSGenerator />
          </Tabs.Content>

          <Tabs.Content value="video" className="space-y-6">
            <VideoRenderer />
          </Tabs.Content>

          <Tabs.Content value="history" className="space-y-6">
            <HistoryView />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

export default App;
