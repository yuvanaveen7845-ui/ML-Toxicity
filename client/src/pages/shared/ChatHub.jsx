import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { chatAPI } from '../../services/api';
import { format } from 'date-fns';
import { HiOutlineUserCircle, HiOutlinePaperAirplane, HiOutlineSpeakerphone, HiOutlineChatAlt2 } from 'react-icons/hi';
import './ChatHub.css';

const ChatHub = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Initialize Socket.io
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('setup', user._id);
        });

        return () => newSocket.disconnect();
    }, [user._id]);

    // Load directory
    useEffect(() => {
        const fetchDirectory = async () => {
            try {
                const res = await chatAPI.getDirectory();
                setContacts(res.data.data);
            } catch (error) {
                console.error("Failed to load directory", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDirectory();
    }, []);

    // Load active chat history
    useEffect(() => {
        if (!activeChat) return;

        const loadHistory = async () => {
            try {
                if (activeChat._id === 'broadcast') {
                    const res = await chatAPI.getBroadcasts();
                    setMessages(res.data.data.reverse()); // Oldest first
                } else {
                    const res = await chatAPI.getHistory(activeChat._id);
                    setMessages(res.data.data);
                }
                scrollToBottom();
            } catch (error) {
                console.error("Failed to load history", error);
            }
        };

        loadHistory();
    }, [activeChat]);

    // Listen for incoming socket messages
    useEffect(() => {
        if (!socket) return;

        socket.on('message received', (newMessageReceived) => {
            // Only append if we are currently looking at the chat with the sender
            if (activeChat && (
                activeChat._id === newMessageReceived.sender._id ||
                (newMessageReceived.isBroadcast && activeChat._id === 'broadcast')
            )) {
                setMessages(prev => [...prev, newMessageReceived]);
                scrollToBottom();
            } else {
                // Show a notification badge (simplistic implementation for now)
                console.log("New message from", newMessageReceived.sender.name);
            }
        });

        return () => socket.off('message received');
    }, [socket, activeChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        try {
            if (activeChat._id === 'broadcast') {
                const res = await chatAPI.sendBroadcast({
                    targetAudience: 'all', // Simplify to 'all' for MVP
                    content: newMessage
                });
                setMessages(prev => [...prev, res.data.data]);
                // Emit to all via socket in a full prod app
            } else {
                const res = await chatAPI.sendMessage({
                    receiverId: activeChat._id,
                    content: newMessage
                });
                setMessages(prev => [...prev, res.data.data]);
                socket.emit('new message', res.data.data);
            }
            setNewMessage('');
            scrollToBottom();
        } catch (error) {
            console.error(error);
        }
    };

    const isAdminAuth = user.role === 'hr' || user.role === 'ceo';

    return (
        <div className="chat-container">
            {/* Sidebar / Directory */}
            <div className="chat-sidebar">
                <div className="chat-header">
                    <h2><HiOutlineChatAlt2 /> Communication Hub</h2>
                </div>

                <div className="contact-list">
                    {isAdminAuth && (
                        <div
                            className={`contact-item ${activeChat?._id === 'broadcast' ? 'active' : ''}`}
                            onClick={() => setActiveChat({ _id: 'broadcast', name: 'Company Announcements' })}
                        >
                            <div className="contact-avatar broadcast"><HiOutlineSpeakerphone /></div>
                            <div className="contact-info">
                                <span className="contact-name">Company Announcements</span>
                                <span className="contact-role">Broadcast</span>
                            </div>
                        </div>
                    )}

                    <div className="contact-section-label">Direct Messages</div>
                    {loading ? (
                        <div className="p-4 text-slate-400">Loading contacts...</div>
                    ) : contacts.map(contact => (
                        <div
                            key={contact._id}
                            className={`contact-item ${activeChat?._id === contact._id ? 'active' : ''}`}
                            onClick={() => setActiveChat(contact)}
                        >
                            <div className="contact-avatar">
                                {contact.avatar ? <img src={contact.avatar} alt="" /> : <HiOutlineUserCircle />}
                            </div>
                            <div className="contact-info">
                                <span className="contact-name">{contact.name}</span>
                                <span className="contact-role">{contact.role.replace('_', ' ')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Panel */}
            <div className="chat-main">
                {activeChat ? (
                    <>
                        <div className="chat-header">
                            <h3>{activeChat.name}</h3>
                            <span className="chat-subtitle">
                                {activeChat._id === 'broadcast' ? 'Company-wide channel' : activeChat.role.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="chat-messages">
                            {messages.map((msg, i) => {
                                const isMine = msg.sender._id === user._id;
                                return (
                                    <div key={msg._id || i} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                                        {!isMine && (
                                            <div className="message-avatar">
                                                <HiOutlineUserCircle />
                                            </div>
                                        )}
                                        <div className="message-bubble-container">
                                            {!isMine && <span className="message-sender-name">{msg.sender.name}</span>}
                                            <div className={`message-bubble ${isMine ? 'primary' : 'secondary'}`}>
                                                {msg.content}
                                            </div>
                                            <span className="message-time">
                                                {format(new Date(msg.createdAt), 'h:mm a')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {(!activeChat.isBroadcast || isAdminAuth) && (
                            <form className="chat-input-area" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder={activeChat._id === 'broadcast' ? "Draft a company-wide announcement..." : `Message ${activeChat.name}...`}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary btn-icon" disabled={!newMessage.trim()}>
                                    <HiOutlinePaperAirplane className="rotate-90" />
                                </button>
                            </form>
                        )}
                    </>
                ) : (
                    <div className="chat-empty-state">
                        <HiOutlineChatAlt2 size={48} className="text-slate-500 mb-4" />
                        <h3>Select a conversation</h3>
                        <p>Choose a contact from the sidebar to start messaging.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatHub;
