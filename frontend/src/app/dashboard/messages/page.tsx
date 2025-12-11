'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';
import {Send, User, Loader2, MessageSquare} from 'lucide-react';
import { format } from 'date-fns';

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

export default function MessagesPage() {
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

                // Check URL for "to" parameter (e.g., from Assigned Clients page)
                const toId = searchParams.get('to');
                if (toId) {
                    const { data: recipient } = await supabase
                        .from('profiles')
                        .select('id, full_name, role')
                        .eq('id', toId)
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
    }, [supabase, searchParams]);

    // 2. Real-time Subscription & Message Fetching
    useEffect(() => {
        if (!myProfile || !activeChatUser) return;

        // Fetch initial history
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${myProfile.id},receiver_id.eq.${activeChatUser.id}),and(sender_id.eq.${activeChatUser.id},receiver_id.eq.${myProfile.id})`)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
        };

        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel('chat_room')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${myProfile.id}`, // Listen for messages sent TO me
                },
                (payload) => {
                    // Only add if it's from the person I'm currently looking at
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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !myProfile || !activeChatUser) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage(''); // Clear input immediately for better UX

        try {
            // Optimistic update (show message immediately before server confirms)
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
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (!activeChatUser) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center text-center p-4">
                <div className="bg-gray-100 p-6 rounded-full mb-4">
                    <MessageSquare size={48} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">No Conversation Selected</h2>
                <p className="text-gray-600 max-w-md">
                    Go back to "My Assigned Clients" or "Find a Pro" to start a conversation with someone.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[85vh] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            {/* Chat Header */}
            <div className="bg-white border-b p-4 flex items-center gap-3 shadow-sm z-10">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={20} />
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
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === myProfile?.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] p-3 rounded-2xl px-4 shadow-sm ${
                                        isMe
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                    }`}
                                >
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <p
                                        className={`text-[10px] mt-1 text-right ${
                                            isMe ? 'text-blue-100' : 'text-gray-400'
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
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-gray-50"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
}
