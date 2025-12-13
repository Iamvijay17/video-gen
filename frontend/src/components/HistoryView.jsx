import { useState, useEffect } from 'react';
import axios from 'axios';
import * as Tabs from '@radix-ui/react-tabs';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Mic, Video, Play, Download, Trash2, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

const HistoryView = () => {
  const [ttsHistory, setTtsHistory] = useState([]);
  const [videoHistory, setVideoHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tts');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async() => {
    setLoading(true);
    try {
      const [ttsResponse, videoResponse] = await Promise.all([
        axios.get('http://localhost:8000/api/tts/history'),
        axios.get('http://localhost:8000/api/video/jobs'),
      ]);

      setTtsHistory(ttsResponse.data.data);
      setVideoHistory(videoResponse.data.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTTS = (ttsItem) => {
    if (ttsItem.url) {
      const audio = new Audio(`http://localhost:5050${ttsItem.url}`);
      audio.play();
    }
  };

  const handleDownloadTTS = (ttsItem) => {
    if (ttsItem.url) {
      const link = document.createElement('a');
      link.href = `http://localhost:5050${ttsItem.url}`;
      link.download = ttsItem.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteTTS = async(fileId) => {
    try {
      await axios.delete(`http://localhost:8000/api/tts/${fileId}`);
      setTtsHistory(ttsHistory.filter(item => item.fileId !== fileId));
    } catch (error) {
      console.error('Error deleting TTS item:', error);
    }
  };

  const handleDeleteVideo = async(jobId) => {
    try {
      await axios.delete(`http://localhost:8000/api/video/jobs/${jobId}`);
      setVideoHistory(videoHistory.filter(item => item._id !== jobId));
    } catch (error) {
      console.error('Error deleting video job:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading history...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="grid w-full grid-cols-2 border-b border-gray-200">
            <Tabs.Trigger
              value="tts"
              className="flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <Mic className="w-4 h-4" />
              TTS History ({ttsHistory.length})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="video"
              className="flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <Video className="w-4 h-4" />
              Video Jobs ({videoHistory.length})
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="tts" className="p-6">
            <ScrollArea.Root className="h-96">
              <ScrollArea.Viewport className="w-full h-full">
                {ttsHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No TTS history found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ttsHistory.map((item) => (
                      <div key={item.fileId} className="bg-muted/50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-card-foreground mb-1">
                              {item.text.length > 100 ? `${item.text.substring(0, 100)}...` : item.text}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Language: {item.lang.toUpperCase()}</span>
                              <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                              <span className={cn("flex items-center gap-1", getStatusColor(item.status))}>
                                {getStatusIcon(item.status)}
                                {item.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {item.status === 'completed' && (
                              <>
                                <button
                                  onClick={() => handlePlayTTS(item)}
                                  className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                                  title="Play"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadTTS(item)}
                                  className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteTTS(item.fileId)}
                              className="p-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/80 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="vertical" className="w-2 bg-muted rounded-full">
                <ScrollArea.Thumb className="bg-muted-foreground/30 rounded-full" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Tabs.Content>

          <Tabs.Content value="video" className="p-6">
            <ScrollArea.Root className="h-96">
              <ScrollArea.Viewport className="w-full h-full">
                {videoHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No video jobs found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {videoHistory.map((job) => (
                      <div key={job._id} className="bg-muted/50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-card-foreground mb-1">
                              {job.inputProps?.titleText || 'Untitled Video'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Composition: {job.compositionId}</span>
                              <span>Started: {new Date(job.createdAt).toLocaleString()}</span>
                              {job.completedAt && (
                                <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>
                              )}
                              <span className={cn("flex items-center gap-1", getStatusColor(job.status))}>
                                {getStatusIcon(job.status)}
                                {job.status}
                              </span>
                            </div>
                            {job.status === 'failed' && job.error && (
                              <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                                Error: {job.error}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {job.status === 'completed' && (
                              <button
                                onClick={() => window.open(`file://${job.outputPath}`, '_blank')}
                                className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                                title="View Video"
                              >
                                <Video className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteVideo(job._id)}
                              className="p-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/80 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="vertical" className="w-2 bg-muted rounded-full">
                <ScrollArea.Thumb className="bg-muted-foreground/30 rounded-full" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
};

export default HistoryView;
