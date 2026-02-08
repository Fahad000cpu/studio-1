
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
  arrayUnion,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useUser,
  useFirestore,
  addDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
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
  MoreVertical,
  Trash,
  Trash2,
  Undo2,
  Check,
  CheckCheck,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UserProfile } from '@/types';
import type { Message, ChatMetadata } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { WithId, type CollectionOptions } from '@/firebase/firestore/use-collection';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { sendChatNotification } from '@/lib/chat-notifications';

function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join('_');
}

const getMessageTimestamp = (timestamp: Timestamp | Date | undefined | null) => {
  if (!timestamp) return '';
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : (timestamp as Date);
  
  if (isToday(date)) {
    return format(date, 'p'); 
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
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

  // Fetch all users to display in the chat list
  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<UserProfile>(usersCollection);

  const usersMap = useMemo(() => {
    if (!allUsers) return new Map<string, UserProfile>();
    return new Map(allUsers.map(u => [u.id, u]));
  }, [allUsers]);

  // The chat list now shows all users except the current one, filterable by search
  const filteredUsers = useMemo(() => {
    if (!allUsers || !user) return [];
    
    return allUsers.filter(u => {
        if (u.id === user.uid) return false; // Exclude self

        if (!searchTerm) return true;

        const searchTermLower = searchTerm.toLowerCase();
        const nameMatch = (u.name || '').toLowerCase().includes(searchTermLower);
        const emailMatch = (u.email || '').toLowerCase().includes(searchTermLower);
        return nameMatch || emailMatch;
    });
  }, [allUsers, user, searchTerm]);


  const selectedChat = useMemo(() => {
    if (!selectedChatId || !usersMap) return null;
    return usersMap.get(selectedChatId) ?? null;
  }, [selectedChatId, usersMap]);
  
  const handleSelectChat = useCallback((contact: UserProfile) => {
    setSelectedChatId(contact.id);
  }, []);

  const isLoading = allUsersLoading;

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
    
    if (!isMobile && filteredUsers && filteredUsers.length > 0) {
        const firstContact = filteredUsers[0];
        if (firstContact) {
            handleSelectChat(firstContact);
        }
    }
  }, [filteredUsers, usersMap, selectedChatId, searchParams, isMobile, handleSelectChat, isLoading]);


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
    if (!messagesData || !user?.uid) return [];
    return messagesData
        .map(msg => ({
            ...msg,
            own: msg.senderId === user?.uid,
        }))
        .filter(msg => !msg.deletedFor?.includes(user.uid!));
  }, [messagesData, user?.uid]);

  // This logic is now simplified as we don't have chat metadata from the problematic query
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('div:first-child');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);


  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const updateChatMetadata = (text: string) => {
    if (!user || !selectedChat) return;

    const recipientId = selectedChat.id;
    const senderId = user.uid;

    const timestamp = serverTimestamp();

    // Update sender's metadata (this should succeed)
    const senderChatRef = doc(firestore, 'users', senderId, 'chats', recipientId);
    const senderPayload = {
        id: recipientId,
        lastMessageText: text,
        lastMessageTimestamp: timestamp,
    };
    setDoc(senderChatRef, senderPayload, { merge: true }).catch(error => {
        console.error("Failed to update sender's chat metadata:", error);
    });

    // Attempt to update recipient's metadata. This will fail due to security rules,
    // which is expected. We will move this logic to a Cloud Function in the future.
    // For now, we catch the error to prevent the "Upload Failed" toast.
    const recipientChatRef = doc(firestore, 'users', recipientId, 'chats', senderId);
    const recipientPayload = {
        id: senderId,
        lastMessageText: text,
        lastMessageTimestamp: timestamp,
        unreadCount: increment(1),
    };
    setDoc(recipientChatRef, recipientPayload, { merge: true }).catch(error => {
        if (error.code === 'permission-denied') {
            console.log("Note: Recipient unread count update failed as expected on client. This should be a Cloud Function.");
        } else {
            console.error("Failed to update recipient's chat metadata:", error);
        }
    });
  };


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user || !messagesCollection || !chatId) return;

    const messageText = newMessage;
    setNewMessage('');

    const isLink = urlRegex.test(messageText.trim());
    
    addDocumentNonBlocking(messagesCollection, {
      text: messageText,
      senderId: user.uid,
      recipientId: selectedChat.id,
      timestamp: serverTimestamp(),
      messageType: isLink ? 'link' : 'text',
      mediaUrl: null,
      chatId: chatId,
    });
    
    // Fire-and-forget the push notification
    sendChatNotification({
        recipientId: selectedChat.id,
        senderId: user.uid,
        senderName: user.displayName || 'A new message',
        messageText: messageText,
    });

    const metadataText = isLink ? '🔗 Link' : messageText;
    updateChatMetadata(metadataText);
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const uploadMedia = async (file: Blob, type: 'image' | 'video' | 'audio') => {
    if (!user || !messagesCollection || !chatId || !selectedChat) {
      return;
    }
    setIsUploading(true);
    try {
      const downloadURL = await uploadToCloudinary(file);

      addDocumentNonBlocking(messagesCollection, {
        text: '',
        senderId: user.uid,
        recipientId: selectedChat.id,
        timestamp: serverTimestamp(),
        messageType: type,
        mediaUrl: downloadURL,
        chatId: chatId,
      });

      let body = 'Sent a file';
      if (type === 'image') body = '📷 Photo';
      if (type === 'video') body = '🎥 Video';
      if (type === 'audio') body = '🎤 Voice Message';
      updateChatMetadata(body);

      // Fire-and-forget the push notification for media
      sendChatNotification({
        recipientId: selectedChat.id,
        senderId: user.uid,
        senderName: user.displayName || 'A new message',
        messageText: body,
      });

    } catch (error) {
      console.error("File upload failed:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your file. Please try again.",
      });
    } finally {
      setIsUploading(false);
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
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
            console.warn("No audio chunks recorded, skipping upload.");
            return;
        }

        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size === 0) {
            console.warn("Recorded audio blob is empty, skipping upload.");
            return;
        }

        await uploadMedia(audioBlob, 'audio');
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
  
  const handleDeleteForMe = (messageId: string) => {
    if (!chatId || !user) return;
    const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
    updateDocumentNonBlocking(messageRef, {
        deletedFor: arrayUnion(user.uid)
    });
  };

  const handleDeleteForEveryone = (messageId: string) => {
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
            placeholder="Search users..." 
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
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((contact) => {
            if (!user || !contact) return null;
            
            return (
              <div
                key={contact.id}
                className={cn(
                  'group relative flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50',
                  selectedChatId === contact.id && 'bg-accent/80'
                )}
                onClick={() => handleSelectChat(contact)}
              >
                <Avatar>
                  <AvatarImage
                    src={contact.profilePictureUrl || `https://picsum.photos/seed/${contact.id}/200`}
                  />
                  <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow overflow-hidden">
                  <p className="font-semibold truncate">{contact.name || contact.email}</p>
                  <p className="text-sm truncate text-muted-foreground">
                    Start a conversation
                  </p>
                </div>
              </div>
            );
        })
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-4" />
            <h3 className="font-semibold text-lg text-foreground">No users found</h3>
            <p className="text-sm mt-1">
              Find someone in Discover to start a conversation.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const ChatWindow = selectedChat && user && (
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
          <AvatarFallback>{getInitials(selectedChat.name)}</AvatarFallback>
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
        <div className="flex flex-col gap-1">
          {messages.map((msg, index) => {
             const avatarSrc = msg.own
                ? user.photoURL || `https://picsum.photos/seed/${user?.uid}/200`
                : selectedChat.profilePictureUrl || `https://picsum.photos/seed/${selectedChat.id}/200`;
            const avatarFallback = msg.own
                ? getInitials(user.displayName)
                : getInitials(selectedChat.name);
            
            const isRead = true; 

            return (
              <div
                key={msg.id || index}
                className={cn(
                  'group flex items-end max-w-[75%] gap-2 py-2',
                  msg.own ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={msg.own ? "end" : "start"}>
                        <DropdownMenuItem onClick={() => handleDeleteForMe(msg.id)}>
                            <Trash className="mr-2 h-4 w-4" />
                            <span>Delete for me</span>
                        </DropdownMenuItem>
                        {msg.own && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteForEveryone(msg.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete for everyone</span>
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <Avatar className="w-8 h-8 self-start">
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
                       msg.messageType !== 'audio' && msg.messageType !== 'video' && 'p-3',
                       (msg.messageType === 'audio' || msg.messageType === 'video') && 'p-2',
                      msg.own
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    )}
                  >
                    {renderMessageContent(msg)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                    <span>{getMessageTimestamp(msg.timestamp)}</span>
                    {msg.own && (
                      isRead ? (
                          <CheckCheck className="h-4 w-4 text-blue-500" />
                      ) : (
                          <Check className="h-4 w-4" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
           {isUploading && (
             <div className="flex max-w-[75%] gap-2 ml-auto flex-row-reverse opacity-50">
               <Avatar className="w-8 h-8">
                 <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200`} />
                 <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
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
              className="bg-primary hover:bg-primary/90"
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
                  Select a user from the list to start messaging.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
