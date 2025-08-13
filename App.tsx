
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, INRLog, WeatherData, NewsItem, QueuedImage, ChatMessage } from './types';
import { generateValuation, getChatResponse } from './services/geminiService';
import { getWeather, getNews } from './services/feedService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';

// --- ICONS --- //
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ToolsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1-1v-1a2 2 0 10-4 0v1a1 1 0 00-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>;
const NewsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-1-5h.01" /></svg>;
const HealthIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- HELPER HOOKS --- //
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.log(error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.log(error);
        }
    };
    return [storedValue, setValue];
};

const useOnlineStatus = () => {
    const [online, setOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    return online;
};


// --- UI COMPONENTS --- //
const Spinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-builder-blue-500"></div>;

interface CardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    color: string;
}
const Card: React.FC<CardProps> = ({ title, description, icon, onClick, color }) => (
    <button onClick={onClick} className={`group flex flex-col justify-between p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 text-white ${color}`}>
        <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-left">{title}</h3>
            <div className="text-white opacity-80 group-hover:scale-110 transition-transform">{icon}</div>
        </div>
        <p className="text-left mt-2 text-base font-light">{description}</p>
    </button>
);


// --- PAGE COMPONENTS --- //

const HomeScreen: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => (
    <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Photo Price Check" description="Value items with AI" icon={<CameraIcon />} onClick={() => setPage(Page.PhotoPriceCheck)} color="bg-builder-blue-600 hover:bg-builder-blue-700" />
            <Card title="Builder's Tools" description="Bubble level & ruler" icon={<ToolsIcon />} onClick={() => setPage(Page.Tools)} color="bg-slate-700 hover:bg-slate-800" />
            <Card title="News & Weather" description="Melbourne updates" icon={<NewsIcon />} onClick={() => setPage(Page.News)} color="bg-teal-600 hover:bg-teal-700" />
            <Card title="Heart Health" description="Log INR & diet tips" icon={<HealthIcon />} onClick={() => setPage(Page.Health)} color="bg-red-600 hover:bg-red-700" />
            <Card title="AI Seller Coach" description="Chat about selling" icon={<ChatIcon />} onClick={() => setPage(Page.Chat)} color="bg-purple-600 hover:bg-purple-700" />
            <Card title="Info Pages" description="Tips & Legacy" icon={<InfoIcon />} onClick={() => setPage(Page.Info)} color="bg-gray-500 hover:bg-gray-600" />
        </div>
    </div>
);

const PhotoPriceCheckScreen: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [valuation, setValuation] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [queuedImages, setQueuedImages] = useLocalStorage<QueuedImage[]>('photoQueue', []);
    const isOnline = useOnlineStatus();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processQueue = useCallback(async () => {
        if (isOnline && queuedImages.length > 0) {
            const nextImage = queuedImages[0];
            try {
                const valuationResult = await generateValuation(nextImage.dataUrl);
                alert(`Valuation for queued item "${nextImage.fileName}":\n\n${valuationResult}`);
                setQueuedImages(q => q.slice(1));
            } catch (e: any) {
                alert(`Failed to process queued item "${nextImage.fileName}". It will be retried later.`);
                console.error("Queue processing error:", e);
            }
        }
    }, [isOnline, queuedImages, setQueuedImages]);

    useEffect(() => {
        processQueue();
    }, [isOnline, processQueue]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setImageFile(file);
                setValuation('');
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetValuation = async () => {
        if (!image || !imageFile) return;

        setIsLoading(true);
        setError('');
        setValuation('');

        if (!isOnline) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newQueuedImage: QueuedImage = {
                    id: Date.now().toString(),
                    dataUrl: reader.result as string,
                    fileName: imageFile.name,
                };
                setQueuedImages(q => [...q, newQueuedImage]);
                setError('No internet. Item queued and will be sent automatically when online.');
                setIsLoading(false);
                setImage(null);
            };
            reader.readAsDataURL(imageFile);
            return;
        }

        try {
            const result = await generateValuation(image);
            setValuation(result);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-builder-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-builder-blue-700 transition-colors flex items-center justify-center space-x-2">
                <CameraIcon />
                <span>{image ? "Change Photo" : "Take or Pick Photo"}</span>
            </button>
            {image && (
                <div className="p-2 border-2 border-dashed border-slate-300 rounded-lg">
                    <img src={image} alt="Selected item" className="rounded-md max-h-64 w-auto mx-auto" />
                </div>
            )}
            {image && (
                <button onClick={handleGetValuation} disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-slate-400 flex justify-center items-center">
                    {isLoading ? <Spinner /> : "Get Price Check"}
                </button>
            )}
            {isLoading && <p className="text-center text-slate-600">Getting valuation... this may take a moment.</p>}
            {error && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
            {queuedImages.length > 0 && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md" role="alert">
                    <p className="font-bold">Offline Queue</p>
                    <p>{queuedImages.length} item(s) waiting to be sent.</p>
                </div>
            )}
            {valuation && (
                <div className="p-4 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-2 text-slate-800">Valuation Result</h3>
                    <div className="prose prose-slate max-w-none">
                       <ReactMarkdown>{valuation}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

const ToolsScreen: React.FC = () => {
    const [angle, setAngle] = useState(0);

    useEffect(() => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            const beta = event.beta; // x-axis rotation in degrees, range [-180, 180]
            if (beta !== null) {
                setAngle(beta);
            }
        };

        window.addEventListener('deviceorientation', handleOrientation);

        const checkHaptic = () => {
            if(Math.abs(angle) < 0.3 && 'vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }
        const intervalId = setInterval(checkHaptic, 200);

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            clearInterval(intervalId);
        };
    }, [angle]);

    const isLevel = Math.abs(angle) < 0.3;

    return (
        <div className="p-4 space-y-6">
            <h3 className="text-2xl font-bold text-slate-800 text-center">Builder's Tools</h3>
            {/* Bubble Level */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-inner text-white space-y-4">
                <h4 className="text-lg font-semibold text-center text-slate-300">Bubble Level</h4>
                <div className={`relative w-full h-16 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-2 ${isLevel ? 'border-green-400' : 'border-slate-500'}`}>
                    <div className="absolute w-2 h-full bg-white/20 left-1/2 -ml-1"></div>
                    <div className="absolute w-2 h-full bg-white/20 left-1/4 -ml-1"></div>
                    <div className="absolute w-2 h-full bg-white/20 left-3/4 -ml-1"></div>
                    <div
                        className="absolute h-14 w-14 bg-green-400/80 rounded-full border-2 border-green-200 transition-transform duration-100"
                        style={{ transform: `translateX(${-angle * 2.5}px)` }}
                    ></div>
                </div>
                <p className={`text-center text-5xl font-mono font-bold ${isLevel ? 'text-green-400' : 'text-white'}`}>
                    {angle.toFixed(1)}°
                </p>
            </div>
            {/* Camera Ruler */}
            <div className="bg-slate-200 p-6 rounded-lg text-slate-700">
                <h4 className="text-lg font-semibold text-center mb-2">Camera Ruler</h4>
                <p className="text-center text-sm">This feature requires advanced device capabilities not fully supported in web browsers. For accurate AR measurements, a native app is recommended.</p>
            </div>
        </div>
    );
};


const NewsScreen: React.FC = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const weatherIcons: { [key: number]: string } = {
        0: '☀️', 1: '🌤️', 2: '⛅️', 3: '☁️', 45: '🌫️', 48: '🌫️',
        51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
        80: '🌧️', 81: '⛈️', 82: '⛈️', 95: '⛈️', 96: '🌪️', 99: '🌪️'
    };

    const timeAgo = (dateStr: string) => {
        const days = differenceInDays(new Date(), new Date(dateStr));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [weatherData, newsData] = await Promise.all([getWeather(), getNews()]);
                setWeather(weatherData);
                setNews(newsData);
            } catch (e: any) {
                setError('Could not fetch updates. Showing cached data if available.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading && !weather && !news.length) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="p-4 space-y-6">
            {error && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
            {/* Weather */}
            {weather && (
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Melbourne Weather</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
                        {weather.daily.map(day => (
                            <div key={day.time} className="bg-white p-2 rounded-lg shadow">
                                <p className="font-bold text-sm">{format(parseISO(day.time), 'EEE')}</p>
                                <p className="text-3xl my-1">{weatherIcons[day.weathercode] || '❓'}</p>
                                <p className="text-sm">
                                    <span className="font-semibold text-red-500">{Math.round(day.temperature_2m_max)}°</span> / <span className="text-blue-500">{Math.round(day.temperature_2m_min)}°</span>
                                </p>
                                <p className="text-xs text-slate-500">{day.precipitation_sum > 0 ? `${day.precipitation_sum}mm` : ''}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* News */}
            {news.length > 0 && (
                 <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Top Headlines</h3>
                    <div className="space-y-3 h-[50vh] overflow-y-auto bg-white p-2 rounded-lg shadow">
                        {news.map((item, index) => (
                            <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="block p-3 bg-slate-50 hover:bg-slate-100 rounded-lg shadow-sm">
                                <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-white text-xs ${item.source.includes('Cricket') ? 'bg-green-600' : item.source.includes('SBS') ? 'bg-blue-600' : 'bg-red-600'}`}>{item.source}</span>
                                    <span>{timeAgo(item.pubDate)}</span>
                                </div>
                                <h4 className="font-semibold text-slate-800">{item.title}</h4>
                                <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const HealthScreen: React.FC = () => {
    const [logs, setLogs] = useLocalStorage<INRLog[]>('inrLogs', []);
    const [inrValue, setInrValue] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [showForm, setShowForm] = useState<boolean>(false);

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(inrValue);
        if (!value || value <= 0) {
            alert('Please enter a valid INR value.');
            return;
        }
        const newLog: INRLog = {
            id: Date.now(),
            date: new Date().toISOString(),
            value,
            notes,
        };
        setLogs(prevLogs => [...prevLogs, newLog].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setInrValue('');
        setNotes('');
        setShowForm(false);
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notification");
        } else if (Notification.permission === "granted") {
            alert("Notifications already enabled!");
            new Notification("Hensgen Helper", { body: "Test notification successful!" });
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                new Notification("Hensgen Helper", { body: "Notifications are now enabled!" });
            }
        }
    }
    
    const last12WeeksLogs = logs.slice(-84); // Approx 12 weeks of daily logs. Let's just take last 12 entries.
    const chartData = logs.slice(-12).map(log => ({
        ...log,
        date: format(parseISO(log.date), 'dd/MM'),
    }));

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-800">INR Log</h3>
                <button onClick={() => setShowForm(!showForm)} className="bg-builder-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-builder-blue-700 transition-colors">
                    {showForm ? 'Cancel' : '+ Log INR'}
                </button>
            </div>
            
            {showForm && (
                <form onSubmit={handleAddLog} className="p-4 bg-white rounded-lg shadow-md space-y-3">
                    <input type="number" step="0.1" placeholder="INR Value (e.g., 2.5)" value={inrValue} onChange={e => setInrValue(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
                    <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"></textarea>
                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors">Save Log</button>
                </form>
            )}

            {chartData.length > 1 && (
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h4 className="font-bold text-lg mb-4 text-center">Last 12 Entries</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Legend />
                            <ReferenceLine y={2.0} label={{ value: 'Min', position: 'insideLeft' }} stroke="orange" strokeDasharray="3 3" />
                            <ReferenceLine y={3.0} label={{ value: 'Max', position: 'insideLeft' }} stroke="orange" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="value" stroke="#1d4ed8" strokeWidth={2} name="INR" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
            
            <div className="bg-white p-4 rounded-lg shadow-md space-y-2">
                 <h4 className="text-xl font-bold text-slate-800">Warfarin Diet Tips</h4>
                 <ul className="list-disc list-inside text-slate-700 space-y-1">
                    <li>Aim for consistent (not zero!) intake of greens like spinach and broccoli.</li>
                    <li>Be cautious with cranberry juice and grapefruit, as they can interfere.</li>
                    <li>Moderate alcohol consumption is key.</li>
                    <li>Many antibiotics and other medications can affect your INR. Tell your doctor you're on Warfarin.</li>
                 </ul>
                 <p className="text-xs text-slate-500 pt-2 border-t mt-2"><b>Disclaimer:</b> This is for informational purposes only and is not medical advice. Always consult with your doctor or pharmacist.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="text-xl font-bold text-slate-800 mb-2">Reminders</h4>
                <p className="text-slate-700 mb-3">Enable notifications to get a weekly reminder to log your INR.</p>
                <button onClick={requestNotificationPermission} className="w-full bg-slate-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-slate-700 transition-colors">
                    Setup Weekly Reminders
                </button>
            </div>
        </div>
    );
};

const ChatScreen: React.FC = () => {
    const [history, setHistory] = useLocalStorage<{ role: 'user' | 'model', parts: { text: string }[] }[]>('chatHistory', []);
    const [messages, setMessages] = useState<ChatMessage[]>(history.map(h => ({ role: h.role, text: h.parts[0].text })));
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const isOnline = useOnlineStatus();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(m => [...m, userMessage]);
        setInput('');
        setIsLoading(true);
        setError('');

        try {
            const responseText = await getChatResponse(history, input);
            const modelMessage: ChatMessage = { role: 'model', text: responseText };
            setMessages(m => [...m, modelMessage]);
            setHistory(h => [...h, { role: 'user', parts: [{ text: input }] }, { role: 'model', parts: [{ text: responseText }] }]);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="h-full flex flex-col p-4 bg-slate-100">
            {!isOnline && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-4" role="alert">
                    <p className="font-bold">You're Offline</p>
                    <p>Chat is unavailable. Here are some quick tips:</p>
                    <ul className="list-disc list-inside mt-2 text-sm">
                        <li>Take clear, well-lit photos.</li>
                        <li>Write honest and detailed descriptions.</li>
                        <li>Price competitively by checking similar items.</li>
                    </ul>
                </div>
            )}
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto space-y-4 mb-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.role === 'user' ? 'bg-builder-blue-600 text-white rounded-br-lg' : 'bg-white text-slate-800 shadow-sm rounded-bl-lg'}`}>
                            <p className="text-base">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-xs p-3 rounded-2xl bg-white text-slate-800 shadow-sm rounded-bl-lg">
                           <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                           </div>
                        </div>
                    </div>
                )}
            </div>
             {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 rounded-md my-2" role="alert"><p className="text-sm">{error}</p></div>}
            <form onSubmit={handleSend} className="flex space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isOnline ? "Ask for selling advice..." : "Chat is offline"}
                    disabled={!isOnline || isLoading}
                    className="flex-grow p-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-builder-blue-500 focus:outline-none"
                />
                <button type="submit" disabled={!isOnline || isLoading || !input.trim()} className="bg-builder-blue-600 text-white rounded-full p-3 shadow-md hover:bg-builder-blue-700 disabled:bg-slate-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </button>
            </form>
        </div>
    );
};

const InfoScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'universe' | 'legacy'>('universe');
    const [legacyContent, setLegacyContent] = useLocalStorage<string>('legacyContent', `
# A Master Builder's Journey

Adrian Hensgen's story is one of dedication, skill, and a passion for creation. From his early days as an apprentice to becoming a master builder in Ringwood, his hands have shaped countless homes and structures.

This is a space to celebrate that legacy.
    `);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(legacyContent);
    
    const dailyTips = [
        "Measure twice, cut once. It's less embarrassing.",
        "A tidy worksite is a safe worksite. And you can find your pencil.",
        "Don't blame the tool. Unless it's a cheap one. Then blame the tool.",
        "Respect the wood grain. It has a story to tell.",
        "Coffee first, safety second. Just kidding. Mostly.",
        "The best tool you have is your brain. Use it.",
    ];
    const todayTip = dailyTips[new Date().getDate() % dailyTips.length];

    const handleSaveLegacy = () => {
        setLegacyContent(editContent);
        setIsEditing(false);
    }
    
    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-center bg-slate-200 rounded-full p-1">
                <button onClick={() => setActiveTab('universe')} className={`w-1/2 py-2 px-4 rounded-full text-lg font-semibold transition-colors ${activeTab === 'universe' ? 'bg-white text-builder-blue-700 shadow' : 'text-slate-600'}`}>Adrian's Universe</button>
                <button onClick={() => setActiveTab('legacy')} className={`w-1/2 py-2 px-4 rounded-full text-lg font-semibold transition-colors ${activeTab === 'legacy' ? 'bg-white text-builder-blue-700 shadow' : 'text-slate-600'}`}>Builder's Legacy</button>
            </div>
            
            {activeTab === 'universe' && (
                <div className="bg-white p-6 rounded-xl shadow-lg text-center space-y-4">
                    <h3 className="text-xl font-bold text-slate-800">Tip of the Day</h3>
                    <p className="text-2xl italic text-slate-600">"{todayTip}"</p>
                </div>
            )}

            {activeTab === 'legacy' && (
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                    {isEditing ? (
                        <div className="space-y-4">
                            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-64 p-2 border border-slate-300 rounded-md font-mono text-sm" />
                            <div className="flex space-x-2">
                                <button onClick={handleSaveLegacy} className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="prose prose-slate max-w-none">
                                <ReactMarkdown>{legacyContent}</ReactMarkdown>
                            </div>
                            <button onClick={() => { setEditContent(legacyContent); setIsEditing(true); }} className="w-full bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg">Edit</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- APP CONTAINER --- //

const Header: React.FC<{ page: Page }> = ({ page }) => {
    const pageTitles: { [key in Page]: string } = {
        [Page.Home]: "Hensgen Helper",
        [Page.PhotoPriceCheck]: "Photo Price Check",
        [Page.Tools]: "Builder's Tools",
        [Page.News]: "News & Weather",
        [Page.Health]: "Heart Health",
        [Page.Chat]: "AI Seller Coach",
        [Page.Info]: "Information"
    };

    return (
        <header className="bg-builder-blue-800 bg-wood-grain text-white p-4 shadow-lg sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-center tracking-wide">{pageTitles[page]}</h1>
            <p className="text-center text-xs text-builder-blue-200">For Adrian Hensgen, Master Builder</p>
        </header>
    );
};

interface BottomNavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}
const BottomNavItem: React.FC<BottomNavItemProps> = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-builder-blue-500' : 'text-slate-500 hover:text-builder-blue-400'}`}>
        {icon}
        <span className="text-xs mt-1">{label}</span>
    </button>
);

const BottomNav: React.FC<{ activePage: Page; setPage: (page: Page) => void }> = ({ activePage, setPage }) => (
    <nav className="bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-t-lg fixed bottom-0 left-0 right-0 z-10 flex justify-around">
        <BottomNavItem label="Home" icon={<HomeIcon />} isActive={activePage === Page.Home} onClick={() => setPage(Page.Home)} />
        <BottomNavItem label="Price" icon={<CameraIcon />} isActive={activePage === Page.PhotoPriceCheck} onClick={() => setPage(Page.PhotoPriceCheck)} />
        <BottomNavItem label="Tools" icon={<ToolsIcon />} isActive={activePage === Page.Tools} onClick={() => setPage(Page.Tools)} />
        <BottomNavItem label="Health" icon={<HealthIcon />} isActive={activePage === Page.Health} onClick={() => setPage(Page.Health)} />
        <BottomNavItem label="Chat" icon={<ChatIcon />} isActive={activePage === Page.Chat} onClick={() => setPage(Page.Chat)} />
    </nav>
);

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>(Page.Home);

    const renderPage = () => {
        switch (currentPage) {
            case Page.Home: return <HomeScreen setPage={setCurrentPage} />;
            case Page.PhotoPriceCheck: return <PhotoPriceCheckScreen />;
            case Page.Tools: return <ToolsScreen />;
            case Page.News: return <NewsScreen />;
            case Page.Health: return <HealthScreen />;
            case Page.Chat: return <ChatScreen />;
            case Page.Info: return <InfoScreen />;
            default: return <HomeScreen setPage={setCurrentPage} />;
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <Header page={currentPage} />
            <main className="flex-grow pb-20">
                {renderPage()}
            </main>
            <BottomNav activePage={currentPage} setPage={setCurrentPage} />
        </div>
    );
};

export default App;
