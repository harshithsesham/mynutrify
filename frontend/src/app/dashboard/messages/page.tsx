'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';
import { Send, User, Loader2, MessageSquare, ArrowLeft, Users, CornerUpRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

type Message = {
    id: string;
    content: string;
    sender_id: string;
    receiver_id: string;
    created_at: string;
};

type ChatProfile = {
    id: string;
    full_name: string;
    role: string;
};

// MOCK CONVERSATION LIST DATA (In a real app, this would be fetched from the server/API)
const mockConversations = [
    { id: 'pro_1', full_name: 'Dr. Jane Smith (Nutritionist)', role: 'nutritionist', last_message: 'Your new plan is ready.', last_time: '1:45 PM' },
    { id: 'client_1', full_name: 'John Doe (Client)', role: 'client', last_message: 'When is our next session?', last_time: '10:30 AM' },
    { id: 'coach_1', full_name: 'Alex Lee (Health Coach)', role: 'health_coach', last_message: 'New consultation request assigned.', last_time: 'Yesterday' },
];

interface ConversationListProps {
    myProfile: ChatProfile;
    activeChatUser: ChatProfile | null;
    setActiveChatUser: (user: ChatProfile) => void;
    currentToId: string | null;
}

const ConversationList = ({ myProfile, activeChatUser, setActiveChatUser, currentToId }: ConversationListProps) => {
    // Determine which profile is the current user's contact in the mock data
    const list = mockConversations.filter(c => c.id !== myProfile.id);

    return (
        <div className="h-full border-r border-gray-200 flex flex-col bg-white">
            <h3 className="text-xl font-bold p-4 border-b text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-teal-600" /> Conversations
            </h3>
            <div className="flex-1 overflow-y-auto">
                {list.length === 0 ? (
                    <p className="p-4 text-gray-500 text-sm">No active conversations yet.</p>
                ) : (
                    list.map((contact) => (
                        <button
                            key={contact.id}
                            onClick={() => setActiveChatUser(contact as ChatProfile)}
                            className={`w-full text-left p-4 flex items-center gap-4 border-b hover:bg-gray-50 transition-colors ${
                                (activeChatUser?.id === contact.id || currentToId === contact.id) ? 'bg-teal-50 border-l-4 border-teal-600' : ''
                            }`}
                        >
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <User size={20} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-gray-900 truncate">{contact.full_name}</p>
                                    <p className="text-xs text-gray-500 flex-shrink-0">{contact.last_time}</p>
                                </div>
                                <p className="text-sm text-gray-600 truncate">{contact.last_message}</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};


function MessagesContent() {
    const supabase = createClientComponentClient();
    const searchParams = useSearchParams();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // State
    const [myProfile, setMyProfile] = useState<ChatProfile | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<ChatProfile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Extracted ID from URL for initial load
    const initialToId = searchParams.get('to');
    const [currentToId, setCurrentToId] = useState<string | null>(initialToId);

    // 1. Initialize: Get my profile and the person we want to talk to
    useEffect(() => {
        const init = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Get my profile ID
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, full_name, role')
                    .eq('user_id', user.id)
                    .single();

                setMyProfile(profile);

                // If initial 'to' ID exists, fetch their profile
                if (currentToId) {
                    const { data: recipient } = await supabase
                        .from('profiles')
                        .select('id, full_name, role')
                        .eq('id', currentToId)
                        .single();

                    if (recipient) {
                        setActiveChatUser(recipient);
                    }
                }
            } catch (error) {
                console.error('Error initializing chat:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [supabase, currentToId]);

    // 2. Message Fetching and Subscription (Runs when activeChatUser changes)
    useEffect(() => {
        if (!myProfile || !activeChatUser) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${myProfile.id},receiver_id.eq.${activeChatUser.id}),and(sender_id.eq.${activeChatUser.id},receiver_id.eq.${myProfile.id})`)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
        };

        fetchMessages();

        // Real-time Subscription logic (similar to previous version)
        const channel = supabase
            .channel(`chat_room_${myProfile.id}_${activeChatUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${myProfile.id}`,
                },
                (payload) => {
                    const newMessage = payload.new as Message;
                    if (newMessage.sender_id === activeChatUser.id) {
                        setMessages((prev) => [...prev, newMessage]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [myProfile, activeChatUser, supabase]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Simplified message sending logic
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !myProfile || !activeChatUser) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage('');

        try {
            // Optimistic update
            const optimisticMsg: Message = {
                id: 'temp-' + Date.now(),
                content: content,
                sender_id: myProfile.id,
                receiver_id: activeChatUser.id,
                created_at: new Date().toISOString()
            };
            setMessages((prev) => [...prev, optimisticMsg]);

            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: myProfile.id,
                    receiver_id: activeChatUser.id,
                    content: content
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
            setNewMessage(content);
        } finally {
            setSending(false);
        }
    };

    if (loading || !myProfile) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-white rounded-xl shadow-xl">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        );
    }

    return (
        <div className="h-[85vh] grid grid-cols-1 md:grid-cols-[280px_1fr] bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
            {/* Left Pane: Conversation List */}
            <ConversationList
                myProfile={myProfile}
                activeChatUser={activeChatUser}
                setActiveChatUser={setActiveChatUser}
                currentToId={currentToId}
            />

            {/* Right Pane: Active Chat Window */}
            <div className="flex flex-col h-full border-l border-gray-200">
                {activeChatUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white border-b p-4 flex items-center gap-3 shadow-sm z-10">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="text-teal-600" size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-gray-900">{activeChatUser.full_name}</h2>
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    {activeChatUser.role === 'client' ? 'Client' : 'Health Professional'}
                                </p>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 text-sm">
                                    Start a conversation with {activeChatUser.full_name}!
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === myProfile.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] p-3 rounded-xl px-4 shadow-md ${
                                                    isMe
                                                        ? 'bg-teal-600 text-white rounded-br-none'
                                                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                                }`}
                                            >
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                <p
                                                    className={`text-[10px] mt-1 text-right ${
                                                        isMe ? 'text-teal-100' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {format(new Date(msg.created_at), 'h:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 bg-gray-50 transition-shadow duration-200"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className="bg-teal-600 text-white p-3 rounded-full hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                                    title="Send Message"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    // Default message when no chat is selected
                    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                        <div className="bg-teal-50 p-6 rounded-full mb-4 shadow-inner">
                            <MessageSquare size={48} className="text-teal-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Conversation</h2>
                        <p className="text-gray-600 max-w-md">
                            Choose a user from the left panel to view message history and begin chatting.
                        </p>
                        <Link
                            href="/dashboard/my-clients"
                            className="mt-6 text-sm font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 transition-colors"
                        >
                            <CornerUpRight size={16} />
                            Go to Clients/Nutritionists
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}