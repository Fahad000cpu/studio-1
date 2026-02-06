'use client';

import { useState, useMemo, useEffect, FormEvent, useRef } from 'react';
import {
  serverTimestamp,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  GeoPoint,
} from 'firebase/firestore';
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
import type { ChatContact, Message } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { WithId, type CollectionOptions } from '@/firebase/firestore/use-collection';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { sendFcmNotification } from '@/ai/flows/send-fcm-notification';

function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join('_');
}

// Haversine distance formula to calculate distance between two points on Earth
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (lat1 === lat2 && lon1 === lon2) {
        return 0;
    }
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}


export default function ChatPage() {
  const isMobile = useIsMobile();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatContact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<UserProfile>(usersCollection);

  useEffect(() => {
    const fetchAndSortUsers = (latitude?: number, longitude?: number) => {
        if (allUsersLoading || !allUsers || !user) return;
        setUsersLoading(true);

        try {
            const otherUsers = allUsers.filter((u) => u.id !== user.uid);
            
            const sortedUsers = otherUsers.sort((a, b) => {
                if (latitude && longitude) {
                    const locationA = a.coordinates;
                    const locationB = b.coordinates;
                    if (locationA && locationB) {
                        const distanceA = getDistance(latitude, longitude, locationA.latitude, locationA.longitude);
                        const distanceB = getDistance(latitude, longitude, locationB.latitude, locationB.longitude);
                        return distanceA - distanceB;
                    }
                    if (locationA) return -1;
                    if (locationB) return 1;
                }
                // Fallback sort by name (or email)
                const nameA = a.name || a.email || '';
                const nameB = b.name || b.email || '';
                return nameA.localeCompare(nameB);
            });
            setContacts(sortedUsers);
        } catch (error) {
            console.error("Failed to process users:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load user contacts for chat.",
            });
        } finally {
            setUsersLoading(false);
        }
    };

    if (user) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchAndSortUsers(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    fetchAndSortUsers(); // Sort alphabetically on geo error
                }
            );
        } else {
            fetchAndSortUsers(); // Sort alphabetically if geo is not supported
        }
    }
  }, [user, toast, allUsers, allUsersLoading]);

    const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(contact =>
      (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);


  const chatId = useMemo(() => {
    if (!user || !selectedChat) return null;
    return getChatId(user.uid, selectedChat.id);
  }, [user, selectedChat]);

  const messagesCollection = useMemoFirebase(() => {
    if (!firestore || !chatId) return null;
    return collection(firestore, 'chats', chatId, 'messages');
  }, [firestore, chatId]);

  const messageCollectionOptions = useMemo<CollectionOptions>(() => ({
    orderBy: ['timestamp', 'asc']
  }), []);

  const { data: messagesData, isLoading: messagesLoading } = useCollection<Message>(messagesCollection, messageCollectionOptions);

  const messages: Message[] = useMemo(() => {
    if (!messagesData) return [];
    return messagesData.map(msg => ({
      ...msg,
      own: msg.senderId === user?.uid,
    }));
  }, [messagesData, user?.uid]);

  const getLastMessage = (contactId: string): { text: string; time: string } => {
    // This is a placeholder. A real implementation would require fetching 
    // the last message for each contact, which can be complex and inefficient 
    // without denormalizing data. For now, we return a generic message.
    return { text: 'Click to start chatting!', time: '' };
  };


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('div:first-child');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!isMobile && contacts && contacts.length > 0 && !selectedChat) {
      const firstContact = contacts.find(c => c.id !== user?.uid);
      if (firstContact) {
        handleSelectChat(firstContact);
      }
    }
  }, [contacts, isMobile, selectedChat, user]);

  const handleSelectChat = (contact: UserProfile) => {
    setSelectedChat({
      ...contact,
      lastMessage: 'Click to start chatting!',
    });
  };

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user || !messagesCollection) return;

    const messageText = newMessage;
    const isLink = urlRegex.test(messageText.trim());

    addDocumentNonBlocking(messagesCollection, {
      text: messageText,
      senderId: user.uid,
      recipientId: selectedChat.id,
      timestamp: serverTimestamp(),
      messageType: isLink ? 'link' : 'text',
      mediaUrl: null,
    });
    setNewMessage('');
    
    // Send FCM notification to the recipient
    const recipientTokens = selectedChat.fcmTokens?.filter(Boolean);
    if (recipientTokens && recipientTokens.length > 0) {
      sendFcmNotification({
        tokens: recipientTokens,
        title: `New message from ${user.displayName || 'Someone'}`,
        body: messageText,
        icon: user.photoURL || undefined,
      }).catch(error => {
          console.error("Failed to send chat notification:", error);
      });
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

      addDocumentNonBlocking(messagesCollection, {
        text: '',
        senderId: user.uid,
        recipientId: selectedChat.id,
        timestamp: serverTimestamp(),
        messageType: type,
        mediaUrl: downloadURL,
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
        uploadMedia(file, fileType);
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

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        uploadMedia(audioBlob, 'audio');
        // Stop all tracks to release microphone
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


  const getTimeString = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return '';
    const date =
      timestamp instanceof Timestamp ? timestamp.toDate() : (timestamp as Date);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        // Match URLs in the text and wrap them in anchor tags
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
        {usersLoading ? (
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
          filteredContacts?.map((contact) => {
             const lastMessageInfo = getLastMessage(contact.id);
            return (
              <div
                key={contact.id}
                className={cn(
                  'flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50',
                  selectedChat?.id === contact.id && 'bg-accent/80'
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
                  <p className="text-sm text-muted-foreground truncate">
                    {lastMessageInfo.text}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {lastMessageInfo.time}
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
            onClick={() => setSelectedChat(null)}
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
                'flex max-w-[75%] gap-2 group',
                msg.own ? 'ml-auto flex-row-reverse' : 'mr-auto',
              )}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="flex items-end gap-2">
                <div
                  className={cn(
                    'rounded-lg',
                     (msg.messageType !== 'audio' && msg.messageType !== 'video') && 'p-3',
                     (msg.messageType === 'audio' || msg.messageType === 'video') && 'p-2',
                    msg.own
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted rounded-bl-none'
                  )}
                >
                   {renderMessageContent(msg)}
                </div>
                 {msg.own && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            </div>
          )})}
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
