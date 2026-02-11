
'use client';

import { useState, useMemo, useEffect, FormEvent, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  serverTimestamp,
  Timestamp,
  collection,
  doc,
  query,
  where,
  orderBy,
  arrayUnion,
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
  addDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { cn, uploadToCloudinary } from '@/lib/utils';
import { Search, Paperclip, Mic, SendHorizonal, ArrowLeft, ImageIcon, Square, MoreVertical, Trash, Trash2, Check, MessageSquare, Plus, Users } from 'lucide-react';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UserProfile, ChatGroup } from '@/types';
import type { Message, ChatMetadata, ChatListItem } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import type { CollectionOptions } from '@/firebase/firestore/use-collection';
import { getInitials } from '@/lib/utils';
import { sendChatNotification } from '@/lib/chat-notifications';
import { CreateGroupDialog } from '@/components/create-group-dialog';


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
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
      return query(collection(firestore, 'groups'), where('memberIds', 'array-contains', user.uid));
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


  const messagesCollection = useMemoFirebase(() => {
    if (!firestore || !selectedChat) return null;
    const path = selectedChat.type === 'user' ? `chats/${selectedChat.id}/messages` : `groups/${selectedChat.id}/messages`;
    return collection(firestore, path);
  }, [firestore, selectedChat]);

  const messageCollectionOptions = useMemo<CollectionOptions>(() => ({ orderBy: ['timestamp', 'asc'] }), []);

  const { data: messagesData } = useCollection<Message>(messagesCollection, messageCollectionOptions);

  const allUsersMap = useMemo(() => {
    if (!allUsersData) return new Map<string, UserProfile>();
    return new Map(allUsersData.map(u => [u.id, u]));
  }, [allUsersData]);
  
  const messages: (Message & { sender?: UserProfile })[] = useMemo(() => {
    if (!messagesData || !user?.uid) return [];
    return messagesData
        .map(msg => ({
            ...msg,
            own: msg.senderId === user?.uid,
            sender: allUsersMap.get(msg.senderId),
        }))
        .filter(msg => !msg.deletedFor?.includes(user.uid!));
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
    if (!newMessage.trim() || !selectedChat || !user || !messagesCollection) return;

    const messageText = newMessage;
    setNewMessage('');
    const isLink = /(https?:\/\/[^\s]+)/g.test(messageText.trim());
    
    const basePayload = {
      text: messageText,
      senderId: user.uid,
      timestamp: serverTimestamp(),
      messageType: isLink ? 'link' : 'text',
      mediaUrl: null,
    };
    
    let finalPayload: any = basePayload;
    if (selectedChat.type === 'user') {
      finalPayload = { ...basePayload, recipientId: selectedChat.contact?.id, chatId: selectedChat.id };
    } else {
      finalPayload = { ...basePayload, memberIds: selectedChat.group?.memberIds };
    }

    addDocumentNonBlocking(messagesCollection, finalPayload);
    
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
    if (!user || !messagesCollection || !selectedChat) return;
    setIsUploading(true);
    try {
      const downloadURL = await uploadToCloudinary(file);

      const basePayload = {
        text: '',
        senderId: user.uid,
        timestamp: serverTimestamp(),
        messageType: type,
        mediaUrl: downloadURL,
      };
      
      let finalPayload: any = basePayload;
      if (selectedChat.type === 'user') {
        finalPayload = { ...basePayload, recipientId: selectedChat.contact?.id, chatId: selectedChat.id };
      } else {
        finalPayload = { ...basePayload, memberIds: selectedChat.group?.memberIds };
      }

      addDocumentNonBlocking(messagesCollection, finalPayload);

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

    } catch (error) {
      console.error("File upload failed:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload your file. Please try again." });
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
  
  const handleDeleteForMe = (messageId: string) => {
    if (!selectedChat || !user) return;
    const collectionPath = selectedChat.type === 'user' ? `chats/${selectedChat.id}/messages` : `groups/${selectedChat.id}/messages`;
    const messageRef = doc(firestore, collectionPath, messageId);
    updateDocumentNonBlocking(messageRef, { deletedFor: arrayUnion(user.uid) });
  };

  const handleDeleteForEveryone = (messageId: string) => {
    if (!selectedChat) return;
    const collectionPath = selectedChat.type === 'user' ? `chats/${selectedChat.id}/messages` : `groups/${selectedChat.id}/messages`;
    const messageRef = doc(firestore, collectionPath, messageId);
    deleteDocumentNonBlocking(messageRef);
  };

  const renderMessageContent = (msg: Message) => {
    switch (msg.messageType) {
      case 'image': return msg.mediaUrl ? <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"><Image src={msg.mediaUrl} alt="Sent image" width={200} height={200} className="rounded-md object-cover"/></a> : null;
      case 'video': return msg.mediaUrl ? <video src={msg.mediaUrl} controls className="rounded-md max-w-xs" /> : null;
      case 'audio': return msg.mediaUrl ? <audio controls src={msg.mediaUrl} className="max-w-full h-10" /> : null;
      case 'link': return <a href={msg.text} target="_blank" rel="noopener noreferrer" className="underline text-blue-500 hover:text-blue-700">{msg.text}</a>;
      case 'text':
      default:
        const parts = msg.text.split(/(https?:\/\/[^\s]+)/g);
        return <p>{parts.map((part, i) => /(https?:\/\/[^\s]+)/g.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-500 hover:text-blue-700">{part}</a> : part)}</p>;
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
                  <div className="w-full h-full flex items-center justify-center bg-muted rounded-full"><Users className="w-6 h-6 text-muted-foreground" /></div>
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
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-full"><Users className="w-5 h-5 text-muted-foreground" /></div>
            ) : (
                <>
                <AvatarImage src={selectedChat.avatarUrl || `https://picsum.photos/seed/${selectedChat.id}/200`} />
                <AvatarFallback>{getInitials(selectedChat.name)}</AvatarFallback>
                </>
            )}
        </Avatar>
        <div className="ml-4">
            <p className="font-semibold text-lg font-headline">{selectedChat.name}</p>
            {selectedChat.type === 'group' && <p className="text-sm text-muted-foreground">{selectedChat.group?.memberIds.length} members</p>}
             {selectedChat.type === 'user' && <p className="text-sm text-muted-foreground">{getPresenceStatus(selectedChat.contact?.lastActive)}</p>}
        </div>
      </div>

      <ScrollArea className="flex-grow p-4 bg-background/30" ref={scrollAreaRef}>
        <div className="flex flex-col gap-1">
          {messages.map((msg, index) => {
            const avatarSrc = msg.sender?.profilePictureUrl || `https://picsum.photos/seed/${msg.senderId}/200`;
            const avatarFallback = getInitials(msg.sender?.name);
            return (
              <div key={msg.id || index} className={cn('group flex items-start max-w-[75%] gap-2 py-2', msg.own ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                 <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align={msg.own ? "end" : "start"}><DropdownMenuItem onClick={() => handleDeleteForMe(msg.id)}><Trash className="mr-2 h-4 w-4" /><span>Delete for me</span></DropdownMenuItem>{msg.own && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteForEveryone(msg.id)}><Trash2 className="mr-2 h-4 w-4" /><span>Delete for everyone</span></DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>
                
                <Avatar className="w-8 h-8">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>

                <div className={cn('flex flex-col gap-1', msg.own ? 'items-end' : 'items-start')}>
                  {!msg.own && selectedChat.type === 'group' && <p className="text-xs text-muted-foreground px-1">{msg.sender?.name || 'Unknown'}</p>}
                  <div className={cn('rounded-lg', msg.messageType !== 'audio' && msg.messageType !== 'video' && 'p-3', (msg.messageType === 'audio' || msg.messageType === 'video') && 'p-2', msg.own ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none')}>
                    {renderMessageContent(msg)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                    <span>{getMessageTimestamp(msg.timestamp)}</span>
                    {msg.own && (<Check className="h-4 w-4" />)}
                  </div>
                </div>
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
          <Input placeholder={isRecording ? "Recording..." : "Type a message..."} className="pr-28" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={!selectedChat || isUploading || isRecording} />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
            <Button variant="ghost" size="icon" type="button" onClick={handleAttachmentClick} disabled={!selectedChat || isUploading || isRecording}><Paperclip className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" type="button" onMouseDown={handleStartRecording} onMouseUp={handleStopRecording} onTouchStart={handleStartRecording} onTouchEnd={handleStopRecording} className={cn(isRecording && "text-red-500")} disabled={!selectedChat || isUploading}>{isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</Button>
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
    </div>
  );
}
