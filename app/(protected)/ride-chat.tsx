import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
    bg: '#000000',
    primary: '#4FD1C5',
    accent: '#A3e635',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.7)',
    chatBubbleSelf: '#174A4C',
    chatBubbleOther: '#122E2F',
    inputBg: 'rgba(255,255,255,0.05)',
    border: 'rgba(79, 209, 197, 0.2)'
};

interface ChatMessage {
    id: string;
    text: string;
    userId: string;
    userName: string;
    createdAt: any;
}

export default function RideChatScreen() {
    const { ride_id, dest } = useLocalSearchParams<{ ride_id: string; dest: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [realName, setRealName] = useState(user?.full_name || 'Rider');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!user?.full_name) {
            profileService.getMyProfile().then(p => {
                if (p.full_name) setRealName(p.full_name);
            }).catch(() => { });
        }
    }, [user?.full_name]);

    useEffect(() => {
        if (!ride_id) return;

        const q = query(
            collection(db, 'ride_chats', ride_id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];

            setMessages(loadedMessages);
            setLoading(false);

            // Scroll to bottom after new message
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

        return () => unsubscribe();
    }, [ride_id]);

    const handleSend = async () => {
        if (!newMessage.trim() || !user || !ride_id) return;

        const text = newMessage.trim();
        setNewMessage(''); // optimistic clear

        try {
            await addDoc(collection(db, 'ride_chats', ride_id, 'messages'), {
                text,
                userId: user.user_id,
                userName: realName,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isMe = item.userId === user?.user_id;

        return (
            <View style={[s.messageWrapper, isMe ? s.messageWrapperRight : s.messageWrapperLeft]}>
                {!isMe && <Text style={s.senderName}>{item.userName}</Text>}
                <View style={[s.messageBubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                    <Text style={s.messageText}>{item.text}</Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={s.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <LinearGradient colors={['#174A4C', '#0B2728']} style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <View style={s.headerTitleWrap}>
                    <Text style={s.headerTitle} numberOfLines={1}>{dest || 'Ride Chat'}</Text>
                    <Text style={s.headerSubtitle}>Group Chat</Text>
                </View>
                <View style={s.placeholderRight} />
            </LinearGradient>

            {/* Chat List */}
            {loading ? (
                <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color={C.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <Ionicons name="chatbubbles-outline" size={48} color={C.border} />
                            <Text style={s.emptyText}>No messages yet.</Text>
                            <Text style={s.emptySubText}>Be the first to say hello!</Text>
                        </View>
                    }
                />
            )}

            {/* Input Area */}
            <View style={s.inputContainer}>
                <TextInput
                    style={s.input}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message..."
                    placeholderTextColor={C.textSecondary}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[s.sendBtn, !newMessage.trim() && s.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!newMessage.trim()}
                >
                    <Ionicons name="send" size={20} color={!newMessage.trim() ? C.textSecondary : '#0B1416'} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 40,
        justifyContent: 'center',
    },
    headerTitleWrap: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: C.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: C.primary,
        fontSize: 12,
        marginTop: 2,
    },
    placeholderRight: {
        width: 40,
    },
    listContent: {
        padding: 16,
        paddingBottom: 24,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: C.text,
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubText: {
        color: C.textSecondary,
        fontSize: 14,
        marginTop: 8,
    },
    messageWrapper: {
        marginBottom: 16,
        maxWidth: '80%',
    },
    messageWrapperLeft: {
        alignSelf: 'flex-start',
    },
    messageWrapperRight: {
        alignSelf: 'flex-end',
    },
    senderName: {
        color: C.textSecondary,
        fontSize: 12,
        marginBottom: 4,
        marginLeft: 4,
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    bubbleMe: {
        backgroundColor: C.chatBubbleSelf,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: C.chatBubbleOther,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: C.border,
    },
    messageText: {
        color: C.text,
        fontSize: 15,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 12,
        backgroundColor: '#0A1213',
        borderTopWidth: 1,
        borderColor: C.border,
    },
    input: {
        flex: 1,
        backgroundColor: C.inputBg,
        color: C.text,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        maxHeight: 100,
        fontSize: 15,
        minHeight: 40,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        marginBottom: 2,
    },
    sendBtnDisabled: {
        backgroundColor: C.inputBg,
    },
});
