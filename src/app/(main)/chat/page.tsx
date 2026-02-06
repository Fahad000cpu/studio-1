
'use client';

import { useState, useMemo, useEffect, FormEvent, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  serverTimestamp,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  GeoPoint,
  updateDoc,
  increment,
  setDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  useUser,
  useFirestore,
  addDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { cn } from '@/lib/utils';
import {
  Search,
  Paperclip,
  Mic,
  SendHorizonal,
  ArrowLeft,
  ImageIcon,
  Square,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UserProfile } from '@/types';
import type { Message, ChatMetadata } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { WithId, type CollectionOptions } from '@/firebase/firestore/use-collection';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { sendFcmNotification } from '@/ai/flows/send-fcm-notification';
import { Badge } from '@/components/ui/badge';

function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join('_');
}

const getMessageTimestamp = (timestamp: Timestamp | Date | undefined | null) => {
  if (!timestamp) return '';
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : (timestamp as Date);
  
  if (isToday(date)) {
    // e.g., "2:30 PM"
    return format(date, 'p'); 
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  // e.g., "24/05/2024"
  return format(date, 'dd/MM/yyyy');
};


export default function ChatPage() {
  const isMobile = useIsMobile();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const searchParams = useSearchParams();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch chat metadata, sorted by last message time
  const chatMetadataCollection = useMemoFirebase(
    () => (user ? query(
        collection(firestore, 'chat_metadata'),
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc')
    ) : null),
    [firestore, user]
  );
  const { data: chatMetadatas, isLoading: metadataLoading } = useCollection<ChatMetadata>(chatMetadataCollection);

  // 2. Fetch all users to get their details (name, avatar)
  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<UserProfile>(usersCollection);

  // 3. Create a map of users for quick lookups
  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<string, UserProfile>();
    return new Map(allUsers.map(u => [u.id, u]));
  }, [allUsers]);

  const selectedChat = useMemo(() => {
    if (!selectedChatId || !usersMap) return null;
    return usersMap.get(selectedChatId) ?? null;
  }, [selectedChatId, usersMap]);
  
  const handleSelectChat = useCallback((contact: UserProfile) => {
    setSelectedChatId(contact.id);
  }, []);

  const isLoading = metadataLoading || allUsersLoading;

  // Handles both initial chat from URL and default selection on desktop
  useEffect(() => {
    if (isLoading || selectedChatId || !usersMap.size) return;

    const chatWithId = searchParams.get('chatWith');
    if (chatWithId) {
        const userToChatWith = usersMap.get(chatWithId);
        if (userToChatWith) {
            handleSelectChat(userToChatWith);
            return;
        }
    }
    
    if (!isMobile && chatMetadatas && chatMetadatas.length > 0 && user) {
        const firstChat = chatMetadatas[0];
        const otherUserId = firstChat.participants.find(p => p !== user.uid);
        const firstContact = otherUserId ? usersMap.get(otherUserId) : null;
        if (firstContact) {
            handleSelectChat(firstContact);
        }
    }
  }, [chatMetadatas, usersMap, selectedChatId, searchParams, isMobile, user, handleSelectChat, isLoading]);

  const filteredChats = useMemo(() => {
    if (!chatMetadatas || !user) return [];
    
    return chatMetadatas.filter(metadata => {
        const otherUserId = metadata.participants.find(p => p !== user.uid);
        if (!otherUserId) return false;
        
        const contact = usersMap.get(otherUserId);
        if (!contact) return false;

        if (!searchTerm) return true;

        const searchTermLower = searchTerm.toLowerCase();
        const nameMatch = (contact.name || '').toLowerCase().includes(searchTermLower);
        const emailMatch = (contact.email || '').toLowerCase().includes(searchTermLower);
        return nameMatch || emailMatch;
    });
  }, [chatMetadatas, user, searchTerm, usersMap]);


  const chatId = useMemo(() => {
    if (!user || !selectedChatId) return null;
    return getChatId(user.uid, selectedChatId);
  }, [user, selectedChatId]);

  const messagesCollection = useMemoFirebase(() => {
    if (!firestore || !chatId) return null;
    return collection(firestore, 'chats', chatId, 'messages');
  }, [firestore, chatId]);

  const messageCollectionOptions = useMemo<CollectionOptions>(() => ({
    orderBy: ['timestamp', 'asc']
  }), []);

  const { data: messagesData } = useCollection<Message>(messagesCollection, messageCollectionOptions);

  const messages: Message[] = useMemo(() => {
    if (!messagesData) return [];
    return messagesData.map(msg => ({
      ...msg,
      own: msg.senderId === user?.uid,
    }));
  }, [messagesData, user?.uid]);


  // Reset unread count when a chat is opened
  useEffect(() => {
    if (!user || !selectedChatId) return;
    const currentChatId = getChatId(user.uid, selectedChatId);
    const metadataRef = doc(firestore, 'chat_metadata', currentChatId);

    updateDoc(metadataRef, {
        [`unreadCount.${user.uid}`]: 0
    }).catch(() => {
        // Silently ignore if doc doesn't exist. It will be created on first message.
    });
  }, [selectedChatId, user, firestore]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('div:first-child');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);


  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const updateChatMetadata = async (text: string) => {
    if (!user || !selectedChat || !chatId) return;

    const metadataRef = doc(firestore, 'chat_metadata', chatId);
    const recipientId = selectedChat.id;

    const updatePayload = {
      lastMessageText: text,
      lastMessageTimestamp: serverTimestamp(),
      participants: [user.uid, recipientId],
      [`unreadCount.${recipientId}`]: increment(1),
    };

    try {
      await updateDoc(metadataRef, updatePayload);
    } catch (error: any) {
      if (error.code === 'not-found') {
        const createPayload = {
          lastMessageText: text,
          lastMessageTimestamp: serverTimestamp(),
          participants: [user.uid, recipientId],
          unreadCount: { [recipientId]: 1, [user.uid]: 0 },
        };
        await setDoc(metadataRef, createPayload);
      } else {
        console.error("Failed to update chat metadata:", error);
      }
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user || !messagesCollection || !chatId) return;

    const messageText = newMessage;
    setNewMessage('');

    const isLink = urlRegex.test(messageText.trim());
    
    // 1. Add the message to the database
    addDocumentNonBlocking(messagesCollection, {
      text: messageText,
      senderId: user.uid,
      recipientId: selectedChat.id,
      timestamp: serverTimestamp(),
      messageType: isLink ? 'link' : 'text',
      mediaUrl: null,
      chatId: chatId,
    });

    // 2. Update chat metadata for sorting and unread count
    await updateChatMetadata(messageText);

    // 3. Directly trigger the notification
    const recipientTokens = selectedChat.fcmTokens?.filter(Boolean) ?? [];
    
    console.log('[ConnectSphere Chat] Attempting to send notification.');
    console.log(`[ConnectSphere Chat] Recipient: ${selectedChat.name}, Found tokens:`, recipientTokens);

    if (recipientTokens.length > 0) {
      sendFcmNotification({
        tokens: recipientTokens,
        title: user.displayName || 'New Message',
        body: messageText,
        url: `/chat?chatWith=${user.uid}`,
        icon: user.photoURL || undefined,
      }).catch(err => console.error("[ConnectSphere Chat] Failed to send text message notification:", err));
    } else {
        console.log("[ConnectSphere Chat] No valid FCM tokens found for recipient. Skipping notification.");
    }
};

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const uploadMedia = async (file: Blob, type: 'image' | 'audio' | 'video') => {
    if (!user || !messagesCollection || !chatId || !selectedChat) {
      return;
    }
    setIsUploading(true);
    try {
      const downloadURL = await uploadToCloudinary(file);

      // 1. Add the media message to the database
      addDocumentNonBlocking(messagesCollection, {
        text: '',
        senderId: user.uid,
        recipientId: selectedChat.id,
        timestamp: serverTimestamp(),
        messageType: type,
        mediaUrl: downloadURL,
        chatId: chatId,
      });

      // 2. Determine notification body and update metadata
      let body = 'Sent a file';
      if (type === 'image') body = '📷 Photo';
      if (type === 'video') body = '🎥 Video';
      if (type === 'audio') body = '🎤 Voice Message';
      await updateChatMetadata(body);
      
      // 3. Directly trigger the notification for the media message
      const recipientTokens = selectedChat.fcmTokens?.filter(Boolean) ?? [];
      
      console.log('[ConnectSphere Chat] Attempting to send media notification.');
      console.log(`[ConnectSphere Chat] Recipient: ${selectedChat.name}, Found tokens:`, recipientTokens);

      if (recipientTokens.length > 0) {
        sendFcmNotification({
          tokens: recipientTokens,
          title: user.displayName || 'New Message',
          body: body,
          url: `/chat?chatWith=${user.uid}`,
          icon: user.photoURL || undefined,
        }).catch(err => console.error("[ConnectSphere Chat] Failed to send media message notification:", err));
      } else {
         console.log("[ConnectSphere Chat] No valid FCM tokens found for recipient to send media notification.");
      }

    } catch (error) {
      console.error("File upload failed:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your file. Please try again.",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    let fileType: 'image' | 'video' | null = null;
    
    if (file.type.startsWith('image/')) {
        fileType = 'image';
    } else if (file.type.startsWith('video/')) {
        fileType = 'video';
    } else {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select an image or video file."
        });
        return;
    }
    
    if (fileType) {
        await uploadMedia(file, fileType);
    }
  };

  const handleStartRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadMedia(audioBlob, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Could not start recording:", error);
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions."
      })
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
    const handleDeleteMessage = (messageId: string) => {
    if (!chatId) return;
    const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
    deleteDocumentNonBlocking(messageRef);
  };


  const renderMessageContent = (msg: Message) => {
    switch (msg.messageType) {
      case 'image':
        return msg.mediaUrl ? (
          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
            <Image src={msg.mediaUrl} alt="Sent image" width={200} height={200} className="rounded-md object-cover"/>
          </a>
        ) : null;
      case 'video':
        return msg.mediaUrl ? (
            <video src={msg.mediaUrl} controls className="rounded-md max-w-xs" />
        ) : null;
      case 'audio':
        return msg.mediaUrl ? (
          <audio controls src={msg.mediaUrl} className="max-w-full h-10" />
        ) : null;
      case 'link':
         return (
          <a href={msg.text} target="_blank" rel="noopener noreferrer" className="underline text-blue-500 hover:text-blue-700">
            {msg.text}
          </a>
        );
      case 'text':
      default:
        const parts = msg.text.split(urlRegex);
        return (
          <p>
            {parts.map((part, i) =>
              urlRegex.test(part) ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-500 hover:text-blue-700">
                  {part}
                </a>
              ) : (
                part
              )
            )}
          </p>
        );
    }
  };

  const ChatList = (
    <div className="flex flex-col border-r bg-muted/20 h-full">
      <div className="p-4">
        <h1 className="text-2xl font-bold font-headline">Chats</h1>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-grow">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={`skeleton-${i}`} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted-foreground/20 animate-pulse" />
                <div className="flex-grow space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted-foreground/20 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted-foreground/20 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          filteredChats?.map((metadata) => {
            if (!user) return null;
            const otherUserId = metadata.participants.find(p => p !== user.uid);
            if (!otherUserId) return null;
    
            const contact = usersMap.get(otherUserId);
            if (!contact) {
              // This can happen if a user is deleted but chat metadata remains.
              // We'll just skip rendering them.
              return null;
            }

            const unreadCount = metadata.unreadCount?.[user.uid] || 0;
            const lastMessageText = metadata.lastMessageText || 'Click to start chatting!';
            const lastMessageTime = getMessageTimestamp(metadata.lastMessageTimestamp);

            return (
              <div
                key={contact.id}
                className={cn(
                  'flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50',
                  selectedChatId === contact.id && 'bg-accent/80'
                )}
                onClick={() => handleSelectChat(contact)}
              >
                <Avatar>
                  <AvatarImage
                    src={contact.profilePictureUrl || `https://picsum.photos/seed/${contact.id}/200`}
                  />
                  <AvatarFallback>{(contact.name || contact.email || '?').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow overflow-hidden">
                  <p className="font-semibold truncate">{contact.name || contact.email}</p>
                  <p className={cn(
                      "text-sm truncate",
                      unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>
                    {lastMessageText}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap flex flex-col items-end gap-1.5 self-start">
                    <span className={cn(unreadCount > 0 && "text-accent-foreground font-bold")}>{lastMessageTime}</span>
                    {unreadCount > 0 && (
                        <Badge className="h-5 min-w-[1.25rem] p-1 flex items-center justify-center rounded-full bg-accent text-accent-foreground">
                          {unreadCount}
                        </Badge>
                    )}
                </div>
              </div>
            );
        })
        )}
      </ScrollArea>
    </div>
  );

  const ChatWindow = selectedChat && (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center p-3 border-b">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => setSelectedChatId(null)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}
        <Avatar>
          <AvatarImage
             src={selectedChat.profilePictureUrl || `https://picsum.photos/seed/${selectedChat.id}/200`}
          />
          <AvatarFallback>{(selectedChat.name || selectedChat.email || '?').charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="ml-4">
          <p className="font-semibold text-lg font-headline">
            {selectedChat.name || selectedChat.email}
          </p>
          <p className="text-sm text-muted-foreground">Online</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-grow p-4 bg-background/30" ref={scrollAreaRef}>
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => {
             const avatarSrc = msg.own
                ? user?.photoURL || `https://picsum.photos/seed/${user?.uid}/200`
                : selectedChat.profilePictureUrl || `https://picsum.photos/seed/${selectedChat.id}/200`;
            const avatarFallback = msg.own
                ? (user?.displayName || '?').charAt(0)
                : (selectedChat.name || '?').charAt(0);
            return (
              <div
                key={msg.id || index}
                className={cn(
                  'flex items-start max-w-[75%] gap-2 group',
                  msg.own ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'flex flex-col gap-1',
                    msg.own ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg',
                      msg.messageType !== 'audio' &&
                        msg.messageType !== 'video' &&
                        'p-3',
                      (msg.messageType === 'audio' ||
                        msg.messageType === 'video') &&
                        'p-2',
                      msg.own
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    )}
                  >
                    {renderMessageContent(msg)}
                  </div>
                  <span className="text-xs text-muted-foreground px-1">
                    {getMessageTimestamp(msg.timestamp)}
                  </span>
                </div>
                {msg.own && (
                  <div className="self-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
           {isUploading && (
             <div className="flex max-w-[75%] gap-2 ml-auto flex-row-reverse opacity-50">
               <Avatar className="w-8 h-8">
                 <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200`} />
                 <AvatarFallback>{(user?.displayName || '?').charAt(0)}</AvatarFallback>
               </Avatar>
               <div className="flex flex-col">
                 <div className="rounded-lg p-3 text-sm bg-primary text-primary-foreground rounded-br-none">
                   <div className="flex items-center gap-2">
                     <ImageIcon className="w-4 h-4 animate-pulse" />
                     <p>Uploading...</p>
                   </div>
                 </div>
               </div>
             </div>
           )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            placeholder={isRecording ? "Recording..." : "Type a message..."}
            className="pr-28"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!selectedChat || isUploading || isRecording}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
            <Button variant="ghost" size="icon" type="button" onClick={handleAttachmentClick} disabled={!selectedChat || isUploading || isRecording}>
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              className={cn(isRecording && "text-red-500")}
              disabled={!selectedChat || isUploading}
            >
               {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              size="icon"
              className="bg-accent hover:bg-accent/90"
              type="submit"
              disabled={!selectedChat || !newMessage.trim() || isUploading || isRecording}
            >
              <SendHorizonal className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] border rounded-lg overflow-hidden glass h-full">
        {isMobile ? (
          selectedChat ? (
            ChatWindow
          ) : (
            ChatList
          )
        ) : (
          <>
            {ChatList}
            {ChatWindow ? (
              ChatWindow
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-center p-8 bg-background/30">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent to-primary flex items-center justify-center mb-6">
                  <SendHorizonal className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold font-headline">
                  Welcome to ConnectSphere Chat
                </h2>
                <p className="text-muted-foreground mt-2">
                  Select a conversation from the list to start messaging.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
