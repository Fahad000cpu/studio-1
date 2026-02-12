
'use client';

import { useState, useMemo, useEffect, FormEvent, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  serverTimestamp,
  Timestamp,
  collection,
  doc,
  query as firestoreQuery,
  where,
  orderBy,
  arrayUnion,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Search, Paperclip, Mic, SendHorizonal, ArrowLeft, ImageIcon, Square, MoreVertical, Trash, Trash2, Check, MessageSquare, Plus, Users, Palette, X, Settings } from 'lucide-react';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UserProfile, ChatGroup } from '@/types';
import type { Message, ChatMetadata, ChatListItem } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { sendChatNotification } from '@/lib/chat-notifications';
import { CreateGroupDialog } from '@/components/create-group-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GroupInfoSheet } from '@/components/group-info-sheet';


function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join('_');
}

const getMessageTimestamp = (timestamp: Timestamp | Date | undefined | null): string => {
  if (!timestamp) return '';
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : (timestamp as Date);
  if (isToday(date)) return format(date, 'p');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yyyy');
};

const getPresenceStatus = (lastActive?: Timestamp | Date): string => {
  if (!lastActive) return 'Offline';

  const lastActiveDate = lastActive instanceof Timestamp ? lastActive.toDate() : lastActive;
  const now = new Date();
  // Difference in minutes
  const diffInMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);

  if (diffInMinutes < 2) {
    return 'Online';
  }

  return `Last seen ${formatDistanceToNow(lastActiveDate, { addSuffix: true })}`;
};

const colorPresets = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];


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

  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [textColor, setTextColor] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);
  
  const chatWithId = searchParams.get('chatWith');

  // 1. Fetch all users
  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsersData, isLoading: allUsersLoading } = useCollection<UserProfile>(usersCollection);

  // 2. Fetch 1-on-1 chat metadata from the user's private subcollection
  const chatMetadataQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'chats');
  }, [firestore, user]);
  const { data: chatMetadata, isLoading: chatMetadataLoading } = useCollection<ChatMetadata>(chatMetadataQuery);

  // 3. Fetch group chats
  const groupsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return firestoreQuery(collection(firestore, 'groups'), where('memberIds', 'array-contains', user.uid));
  }, [firestore, user]);
  const { data: groups, isLoading: groupsLoading } = useCollection<ChatGroup>(groupsQuery);


  // 4. Combine all users, active chats, and groups into a single, sorted, searchable list
  const displayedChats = useMemo(() => {
    if (!user || !allUsersData) return [];

    const chatMetaMap = new Map<string, ChatMetadata>();
    (chatMetadata || []).forEach(meta => {
        if (meta && Array.isArray(meta.participants)) {
            const contactId = meta.participants.find(p => p !== user.uid);
            if (contactId) {
                chatMetaMap.set(contactId, meta);
            }
        }
    });

    const combinedUserChats: ChatListItem[] = allUsersData
        .filter(u => u.id !== user.uid) // Exclude self
        .map(contact => {
            const existingChatMeta = chatMetaMap.get(contact.id);
            return {
                id: existingChatMeta ? existingChatMeta.id : getChatId(user.uid, contact.id),
                type: 'user',
                name: contact.name,
                avatarUrl: contact.profilePictureUrl,
                lastMessageText: existingChatMeta ? existingChatMeta.lastMessageText : "Start a conversation",
                lastMessageTimestamp: existingChatMeta ? existingChatMeta.lastMessageTimestamp : undefined,
                contact: contact,
            };
        });

    const groupChats: ChatListItem[] = (groups || []).map(group => ({
        id: group.id,
        type: 'group',
        name: group.name,
        avatarUrl: group.groupPhotoUrl,
        lastMessageText: group.lastMessageText,
        lastMessageTimestamp: group.lastMessageTimestamp,
        group: group,
    }));

    let combined = [...combinedUserChats, ...groupChats];

    // Sort by last message time (chats with messages first), then by name
    combined.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.toMillis() || 0;
        const timeB = b.lastMessageTimestamp?.toMillis() || 0;
        if (timeA !== timeB) {
            return timeB - timeA;
        }
        return a.name.localeCompare(b.name);
    });

    // Filter by search term
    if (!searchTerm) return combined;
    const termLower = searchTerm.toLowerCase();
    return combined.filter(item => item.name.toLowerCase().includes(termLower));

  }, [user, allUsersData, chatMetadata, groups, searchTerm]);
  

  const handleSelectChat = useCallback((chat: ChatListItem) => {
    setSelectedChat(chat);
    if(isMobile) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('chatWith');
      window.history.replaceState({}, '', newUrl);
    }
  }, [isMobile]);

  const isLoading = chatMetadataLoading || groupsLoading || allUsersLoading;

  useEffect(() => {
    if (isLoading || selectedChat) return;

    if (chatWithId) {
        const chatToSelect = displayedChats.find(c => c.type === 'user' && c.contact?.id === chatWithId);
        if (chatToSelect) {
            handleSelectChat(chatToSelect);
            return;
        }
    }
    
    if (!isMobile && displayedChats.length > 0) {
        handleSelectChat(displayedChats[0]);
    }
  }, [displayedChats, selectedChat, chatWithId, isMobile, handleSelectChat, isLoading]);


  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedChat || !user) return null;
  
    if (selectedChat.type === 'user' && selectedChat.contact) {
      const collectionPath = `chats/${selectedChat.id}/messages`;
      return firestoreQuery(
        collection(firestore, collectionPath),
        where('memberIds', 'array-contains', user.uid)
      );
    } else if (selectedChat.type === 'group') {
      const collectionPath = `groups/${selectedChat.id}/messages`;
      return firestoreQuery(
        collection(firestore, collectionPath), 
        where('memberIds', 'array-contains', user.uid)
      );
    }
    return null;
  
  }, [firestore, selectedChat, user]);


  const { data: messagesData } = useCollection<Message>(messagesQuery);


  const allUsersMap = useMemo(() => {
    if (!allUsersData) return new Map<string, UserProfile>();
    return new Map(allUsersData.map(u => [u.id, u]));
  }, [allUsersData]);
  
  const [messages, setMessages] = useState<(Message & { sender?: UserProfile })[]>([]);

  useEffect(() => {
    if (!messagesData || !user?.uid) {
        setMessages([]);
        return;
    };
    
    const filteredMessages = messagesData.filter(msg => !msg.deletedFor?.includes(user.uid!));

    const sortedMessages = filteredMessages.sort((a, b) => {
      const timeA = a.timestamp ? (a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime()) : 0;
      const timeB = b.timestamp ? (b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime()) : 0;
      return timeA - timeB;
    });
    
    const enrichedMessages = sortedMessages.map(msg => ({
        ...msg,
        own: msg.senderId === user?.uid,
        sender: allUsersMap.get(msg.senderId),
    }));

    setMessages(enrichedMessages);

  }, [messagesData, user?.uid, allUsersMap]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('div:first-child');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user || !firestore) return;

    const messageText = newMessage;
    setNewMessage('');
    setTextColor('');
    const isLink = /(https?:\/\/[^\s]+)/g.test(messageText.trim());
    
    const basePayload = {
      text: messageText,
      senderId: user.uid,
      timestamp: serverTimestamp(),
      messageType: isLink ? 'link' : 'text',
      mediaUrl: null,
      textColor: textColor || null,
      deletedFor: [],
    };
    
    let finalPayload: any;
    let collectionPath: string;

    if (selectedChat.type === 'user' && selectedChat.contact) {
      collectionPath = `chats/${selectedChat.id}/messages`;
      finalPayload = { 
          ...basePayload, 
          chatId: selectedChat.id,
          memberIds: [user.uid, selectedChat.contact.id] 
      };
    } else if (selectedChat.type === 'group' && selectedChat.group) {
      collectionPath = `groups/${selectedChat.id}/messages`;
      finalPayload = { 
          ...basePayload, 
          groupId: selectedChat.id,
          memberIds: selectedChat.group.memberIds
      };
    } else {
      return;
    }

    const messagesCollection = collection(firestore, collectionPath);
    await addDoc(messagesCollection, finalPayload);
    
    const notificationText = isLink ? '🔗 Link' : messageText;
    sendChatNotification({
        recipientId: selectedChat.type === 'user' ? selectedChat.contact?.id : undefined,
        groupId: selectedChat.type === 'group' ? selectedChat.id : undefined,
        senderId: user.uid,
        senderName: user.displayName || 'A new message',
        messageText: notificationText,
    });
  };

  const handleAttachmentClick = () => fileInputRef.current?.click();

  const uploadMedia = async (file: Blob, type: 'image' | 'video' | 'audio') => {
    if (!user || !firestore || !selectedChat) return;
    setIsUploading(true);
    try {
      const downloadURL = await uploadToCloudinary(file);

      const basePayload = {
        text: '',
        senderId: user.uid,
        timestamp: serverTimestamp(),
        messageType: type,
        mediaUrl: downloadURL,
        deletedFor: [],
      };
      
      let finalPayload: any;
      let collectionPath: string;

      if (selectedChat.type === 'user' && selectedChat.contact) {
        collectionPath = `chats/${selectedChat.id}/messages`;
        finalPayload = {
            ...basePayload,
            chatId: selectedChat.id,
            memberIds: [user.uid, selectedChat.contact.id] 
        };
      } else if (selectedChat.type === 'group' && selectedChat.group) {
        collectionPath = `groups/${selectedChat.id}/messages`;
        finalPayload = {
            ...basePayload,
            groupId: selectedChat.id,
            memberIds: selectedChat.group.memberIds
        };
      } else {
        setIsUploading(false);
        return;
      }
      
      const messagesCollection = collection(firestore, collectionPath);
      await addDoc(messagesCollection, finalPayload);

      let body = 'Sent a file';
      if (type === 'image') body = '📷 Photo';
      if (type === 'video') body = '🎥 Video';
      if (type === 'audio') body = '🎤 Voice Message';

      sendChatNotification({
        recipientId: selectedChat.type === 'user' ? selectedChat.contact?.id : undefined,
        groupId: selectedChat.type === 'group' ? selectedChat.id : undefined,
        senderId: user.uid,
        senderName: user.displayName || 'A new message',
        messageText: body,
      });

    } catch (error: any) {
      console.error("File upload failed:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload your file. Please try again." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    const file = event.target.files[0];
    let fileType: 'image' | 'video' | null = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (fileType) await uploadMedia(file, fileType);
    else toast({ variant: "destructive", title: "Invalid File Type", description: "Please select an image or video file." });
  };

  const handleStartRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length === 0) return;
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) await uploadMedia(audioBlob, 'audio');
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Could not start recording:", error);
      toast({ variant: "destructive", title: "Recording Error", description: "Could not access microphone. Please check permissions." });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleDeleteForMe = async (message: Message) => {
    if (!selectedChat || !user || !firestore) return;
    
    let collectionPath: string | undefined;
    if (selectedChat.type === 'group') {
        collectionPath = `groups/${selectedChat.id}/messages`;
    } else if (selectedChat.type === 'user') {
        collectionPath = `chats/${selectedChat.id}/messages`;
    }
    
    if (!collectionPath) {
        console.error("Could not determine collection path for deletion.");
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete this message.' });
        return;
    }

    const messageRef = doc(firestore, collectionPath, message.id);
    
    try {
        await updateDoc(messageRef, { deletedFor: arrayUnion(user.uid) });
    } catch (error) {
        console.error("Error deleting message for me:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete this message for you.'
        });
    }
  };

  const handleDeleteForEveryone = async (message: Message) => {
    if (!selectedChat || !firestore || !user) return;
    
    let collectionPath: string | undefined;
    if (selectedChat.type === 'group') {
        collectionPath = `groups/${selectedChat.id}/messages`;
    } else if (selectedChat.type === 'user') {
        collectionPath = `chats/${selectedChat.id}/messages`;
    }

    if (!collectionPath) {
        console.error("Could not determine collection path for deletion.");
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete this message.' });
        return;
    }

    const messageRef = doc(firestore, collectionPath, message.id);
    
    try {
        await updateDoc(messageRef, {
            text: '🚫 This message was deleted',
            messageType: 'deleted',
            mediaUrl: null,
            textColor: null
        });
    } catch (error) {
        console.error("Error deleting message for everyone:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete this message. You may not have permission or the time limit has expired.'
        });
    }
  };

  const renderMessageContent = (msg: Message) => {
    const messageStyle = msg.textColor && msg.messageType !== 'deleted' ? { color: msg.textColor } : {};

    switch (msg.messageType) {
      case 'deleted':
        return <p className="italic text-muted-foreground">{msg.text}</p>;
      case 'image': return msg.mediaUrl ? <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"><Image src={msg.mediaUrl} alt="Sent image" width={200} height={200} className="rounded-md object-cover"/></a> : null;
      case 'video': return msg.mediaUrl ? <video src={msg.mediaUrl} controls className="rounded-md max-w-xs" /> : null;
      case 'audio': return msg.mediaUrl ? <audio controls src={msg.mediaUrl} className="max-w-full h-10" /> : null;
      case 'link': 
        return (
            <a 
                href={msg.text} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={cn("underline", !msg.textColor && "text-blue-500 hover:text-blue-700")} 
                style={messageStyle}
            >
                {msg.text}
            </a>
        );
      case 'text':
      default:
        const parts = msg.text.split(/(https?:\/\/[^\s]+)/g);
        return (
            <p style={messageStyle}>
                {parts.map((part, i) => 
                    /(https?:\/\/[^\s]+)/g.test(part) ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={cn("underline", !msg.textColor && "text-blue-500 hover:text-blue-700")}>
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
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold font-headline">Chats</h1>
            <CreateGroupDialog>
                <Button variant="ghost" size="icon">
                    <Plus className="h-5 w-5" />
                </Button>
            </CreateGroupDialog>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users or groups..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-grow">
        {isLoading ? (
          <div className="p-4 space-y-4">{[...Array(5)].map((_, i) => (<div key={i} className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-muted-foreground/20 animate-pulse" /><div className="flex-grow space-y-2"><div className="h-4 w-3/4 rounded bg-muted-foreground/20 animate-pulse" /><div className="h-3 w-1/2 rounded bg-muted-foreground/20 animate-pulse" /></div></div>))}</div>
        ) : displayedChats.length > 0 ? (
          displayedChats.map((chat) => (
            <div key={chat.id} className={cn('group relative flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50', selectedChat?.id === chat.id && 'bg-accent/80')} onClick={() => handleSelectChat(chat)}>
              <Avatar className="w-12 h-12">
                {chat.type === 'group' ? (
                  <>
                    <AvatarImage src={chat.avatarUrl} />
                    <AvatarFallback>
                        <Users className="w-6 h-6 text-muted-foreground" />
                    </AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src={chat.avatarUrl || `https://picsum.photos/seed/${chat.id}/200`} />
                    <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="flex-grow overflow-hidden"><p className="font-semibold truncate">{chat.name}</p><p className="text-sm truncate text-muted-foreground">{chat.lastMessageText}</p></div>
              <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground whitespace-nowrap"><span>{getMessageTimestamp(chat.lastMessageTimestamp)}</span></div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground"><MessageSquare className="w-10 h-10 mb-4" /><h3 className="font-semibold text-lg text-foreground">No Users Found</h3><p className="text-sm mt-1">Try a different search, or find people on the Discover page.</p></div>
        )}
      </ScrollArea>
    </div>
  );

  const ChatWindow = selectedChat && user && (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-3 border-b">
        {isMobile && <Button variant="ghost" size="icon" className="mr-2" onClick={() => setSelectedChat(null)}><ArrowLeft className="h-6 w-6" /></Button>}
         <Avatar className="w-10 h-10">
            {selectedChat.type === 'group' ? (
                <>
                    <AvatarImage src={selectedChat.group?.groupPhotoUrl} />
                    <AvatarFallback>
                        <Users className="w-5 h-5 text-muted-foreground" />
                    </AvatarFallback>
                </>
            ) : (
                <>
                <AvatarImage src={selectedChat.avatarUrl || `https://picsum.photos/seed/${selectedChat.id}/200`} />
                <AvatarFallback>{getInitials(selectedChat.name)}</AvatarFallback>
                </>
            )}
        </Avatar>
        <div className="ml-4 flex-grow">
            <p className="font-semibold text-lg font-headline">{selectedChat.name}</p>
            {selectedChat.type === 'group' && <p className="text-sm text-muted-foreground">{selectedChat.group?.memberIds.length} members</p>}
             {selectedChat.type === 'user' && <p className="text-sm text-muted-foreground">{getPresenceStatus(selectedChat.contact?.lastActive)}</p>}
        </div>
        {selectedChat.type === 'group' && (
          <Button variant="ghost" size="icon" onClick={() => setIsGroupSheetOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-grow p-4 bg-background/30" ref={scrollAreaRef}>
        <div className="flex flex-col gap-1">
          {messages.map((msg) => {
            const avatarSrc = msg.sender?.profilePictureUrl || `https://picsum.photos/seed/${msg.senderId}/200`;
            const avatarFallback = getInitials(msg.sender?.name);
            const isDeletableForEveryone = msg.own && msg.timestamp && (Date.now() - (msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : msg.timestamp).getTime()) < 15 * 60 * 1000;
            
            return (
              <div key={msg.id} className={cn('group flex items-end gap-2 py-2 max-w-[85%]', msg.own ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                {!msg.own && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('flex-1 min-w-0 flex flex-col gap-1', msg.own ? 'items-end' : 'items-start')}>
                  {!msg.own && selectedChat.type === 'group' && <p className="text-xs text-muted-foreground px-1">{msg.sender?.name || 'Unknown'}</p>}
                  <div className={cn('rounded-lg p-3 break-words', msg.own ? 'glass text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none')}>
                    {renderMessageContent(msg)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                    <span>{getMessageTimestamp(msg.timestamp)}</span>
                    {msg.own && msg.messageType !== 'deleted' && <Check className="h-4 w-4" />}
                  </div>
                </div>
                {msg.messageType !== 'deleted' && (
                  <div className="shrink-0 z-10 self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Message options</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={msg.own ? 'end' : 'start'}>
                        <DropdownMenuItem onSelect={() => handleDeleteForMe(msg)}>
                          <Trash className="mr-2 h-4 w-4" />
                          <span>Delete for me</span>
                        </DropdownMenuItem>
                        {isDeletableForEveryone && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onSelect={() => handleDeleteForEveryone(msg)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete for everyone</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            );
          })}
           {isUploading && (
             <div className="flex max-w-[75%] gap-2 ml-auto flex-row-reverse opacity-50"><Avatar className="w-8 h-8"><AvatarImage src={user?.photoURL || ''} /><AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback></Avatar><div className="flex flex-col"><div className="rounded-lg p-3 text-sm bg-primary text-primary-foreground rounded-br-none"><div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 animate-pulse" /><p>Uploading...</p></div></div></div></div>
           )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="relative">
          <Input 
            placeholder={isRecording ? "Recording..." : "Type a message..."} 
            className="pr-40" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            disabled={!selectedChat || isUploading || isRecording}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
            <Button variant="ghost" size="icon" type="button" onClick={handleAttachmentClick} disabled={!selectedChat || isUploading || isRecording}><Paperclip className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" type="button" onMouseDown={handleStartRecording} onMouseUp={handleStopRecording} onTouchStart={handleStartRecording} onTouchEnd={handleStopRecording} className={cn(isRecording && "text-red-500")} disabled={!selectedChat || isUploading}>{isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</Button>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" type="button" disabled={!selectedChat || isUploading || isRecording}>
                        <Palette className="w-5 h-5" style={{ color: textColor || undefined }} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-4 gap-2">
                        {colorPresets.map(color => (
                            <button key={color} onClick={() => setTextColor(color)} className="h-6 w-6 rounded-full border" style={{ backgroundColor: color }} />
                        ))}
                        <button onClick={() => setTextColor('#FFFFFF')} className="h-6 w-6 rounded-full border bg-white" />
                        <button onClick={() => setTextColor('')} className="h-6 w-6 rounded-full border flex items-center justify-center bg-background" title="Default color">
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </PopoverContent>
            </Popover>

            <Button size="icon" className="bg-primary hover:bg-primary/90" type="submit" disabled={!selectedChat || !newMessage.trim() || isUploading || isRecording}><SendHorizonal className="w-5 h-5" /></Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] border rounded-lg overflow-hidden glass h-full">
        {isMobile ? (selectedChat ? ChatWindow : ChatList) : (<>{ChatList}{ChatWindow ? ChatWindow : <div className="flex flex-col h-full items-center justify-center text-center p-8 bg-background/30"><div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent to-primary flex items-center justify-center mb-6"><SendHorizonal className="w-10 h-10 text-primary-foreground" /></div><h2 className="text-2xl font-bold font-headline">Welcome to ConnectSphere Chat</h2><p className="text-muted-foreground mt-2">Select a chat or create a group to start messaging.</p></div>}</>)}
      </div>
      {selectedChat?.type === 'group' && selectedChat.group && (
        <GroupInfoSheet
          group={selectedChat.group}
          allUsersMap={allUsersMap}
          open={isGroupSheetOpen}
          onOpenChange={setIsGroupSheetOpen}
          onGroupDeleted={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
}
