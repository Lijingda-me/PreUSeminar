import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, Check, CheckCheck, Copy, CornerUpLeft, Download, Edit3, Flag, Forward, Mic, MicOff, Phone, PhoneOff, Pin, Send, Shield, Smile, Trash2, UsersRound, Video, VideoOff, Volume2, X, ChevronLeft, Crown, Info, Plus } from 'lucide-react';
import AppShell from '../components/AppShell';
import Avatar from '../components/Avatar';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

const quickEmojis = ['🙂', '😊', '👍', '❤️', '🙏', '🎉', '💡', '✨'];

export default function Messages() {
  const { matchId, groupChatId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const showToast = useToastStore((state) => state.showToast);
  const [matches, setMatches] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [connected, setConnected] = useState([]);
  const [messages, setMessages] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [body, setBody] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [activeMessage, setActiveMessage] = useState(null);
  const [editText, setEditText] = useState({});
  const [replyTarget, setReplyTarget] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardSelection, setForwardSelection] = useState([]);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const longPressRef = useRef(null);
  const messageRefs = useRef({});
  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerRef = useRef(null);
  const signalCursorRef = useRef(0);
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingCanvasRef = useRef(null);
  const recordingFrameRef = useRef(null);
  const recordingAudioContextRef = useRef(null);
  const callStartedAtRef = useRef(null);
  const activeCallRef = useRef(null);
  const ringTimerRef = useRef(null);
  const audioContextRef = useRef(null);

  async function loadInbox() {
    try {
      const [matchRes, groupRes, connectedRes] = await Promise.all([
        api.get('/matching/matches'),
        api.get('/messages/group-chats'),
        api.get('/messages/connected/people')
      ]);
      setMatches(matchRes.data.matches || []);
      setGroupChats(groupRes.data.chats || []);
      setConnected(connectedRes.data.people || []);
    } catch {
      setMatches([]);
      setGroupChats([]);
      setConnected([]);
    }
  }

  useEffect(() => { loadInbox(); }, []);

  const refreshActiveChat = useCallback(async () => {
    if (matchId) {
      const { data } = await api.get(`/messages/${matchId}`);
      setMessages(data.messages || []);
      setCallLogs(data.calls || []);
      setParticipants(data.participants || []);
      setActiveChat({
        type: 'match',
        title: data.other?.name || 'Mentorship chat',
        about: `${data.match?.score || 0}% compatibility`
      });
      return;
    }
    if (groupChatId) {
      const { data } = await api.get(`/messages/group-chats/${groupChatId}`);
      setMessages(data.messages || []);
      setCallLogs(data.calls || []);
      setParticipants(data.participants || []);
      const about = data.chat?.about || 'A private group chat for connected BridgeUp members.';
      setActiveChat({
        type: 'group',
        title: data.chat?.name || 'BridgeUp group chat',
        about,
        ownerId: data.chat?.ownerId,
        moderators: data.chat?.moderators || []
      });
      setAboutDraft(about);
    }
  }, [matchId, groupChatId]);

  useEffect(() => {
    setShowGroupInfo(false);
    setShowEmojiPicker(false);
    setActiveMessage(null);
    setReplyTarget(null);
    if (!matchId && !groupChatId) return;

    refreshActiveChat().catch(() => showToast('Messages could not load right now.', 'error'));
    const id = setInterval(() => {
      refreshActiveChat().catch(() => {});
    }, 2500);
    return () => clearInterval(id);
  }, [matchId, groupChatId, refreshActiveChat, showToast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useEffect(() => () => {
    stopRingTone();
    stopLocalMedia();
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { data } = await api.get('/messages/calls/active');
        const incoming = (data.calls || []).find((call) => call.callerId !== user.id && call.status === 'ringing');
        if (incoming && !activeCall) setIncomingCall(incoming);
        const current = activeCall && (data.calls || []).find((call) => call.id === activeCall.id);
        if (current) {
          setActiveCall(current);
          setCallStatus(current.status === 'connected' ? 'Connected' : 'Ringing');
        }
      } catch {
        // Polling should never interrupt the chat.
      }
    }, 2500);
    return () => clearInterval(id);
  }, [activeCall, user.id]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    const token = localStorage.getItem('bridgeup_token');
    if (!token) return;
    const stream = new EventSource(`${api.defaults.baseURL}/messages/calls/stream?token=${encodeURIComponent(token)}`);
    stream.onmessage = async (event) => {
      const payload = JSON.parse(event.data || '{}');
      if (payload.event === 'call:start' && payload.call?.callerId !== user.id) {
        setIncomingCall(payload.call);
        startRingTone();
      }
      if (payload.event === 'call:accept' && payload.call?.id === activeCallRef.current?.id) {
        setActiveCall(payload.call);
        setCallStatus('Connected');
        callStartedAtRef.current = payload.call.acceptedAt || new Date().toISOString();
      }
      if (payload.event === 'call:end' && payload.call?.id === activeCallRef.current?.id) {
        stopRingTone();
        setCallStatus('Ended');
        setActiveCall(payload.call);
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
        stopLocalMedia();
        setTimeout(() => setActiveCall(null), 900);
        refreshActiveChat().catch(() => {});
      }
      if (payload.event === 'call:decline') {
        stopRingTone();
        if (payload.call?.id === activeCallRef.current?.id) {
          setCallStatus(payload.call.status === 'declined' ? 'Declined' : 'Missed');
          stopLocalMedia();
          setTimeout(() => setActiveCall(null), 900);
        }
        if (payload.call?.id === incomingCall?.id) setIncomingCall(null);
        refreshActiveChat().catch(() => {});
      }
      if (payload.event === 'call:signal' && payload.callId === activeCallRef.current?.id && payload.signal?.fromUserId !== user.id) {
        handleSignal(payload.signal).catch(() => {});
      }
      if (payload.event === 'call:recording') refreshActiveChat().catch(() => {});
    };
    return () => stream.close();
  }, [incomingCall?.id, refreshActiveChat, user.id]);

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    if (!callStartedAtRef.current) callStartedAtRef.current = activeCall.acceptedAt || new Date().toISOString();
    if (!recorderRef.current && localStreamRef.current) startRecording(activeCall);
    const id = setInterval(() => {
      const start = callStartedAtRef.current || activeCall.acceptedAt || activeCall.startedAt;
      setCallSeconds(Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [activeCall]);

  function callScope() {
    if (matchId) return { scopeType: 'match', scopeId: matchId };
    if (groupChatId) return { scopeType: 'group', scopeId: groupChatId };
    return null;
  }

  function stopLocalMedia() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (recordingFrameRef.current) cancelAnimationFrame(recordingFrameRef.current);
    recordingFrameRef.current = null;
    recordingAudioContextRef.current?.close?.();
    recordingAudioContextRef.current = null;
    recordingCanvasRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
  }

  function playRingPulse() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const context = audioContextRef.current || new AudioCtx();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  }

  function startRingTone() {
    if (ringTimerRef.current) return;
    playRingPulse();
    ringTimerRef.current = setInterval(playRingPulse, 1400);
  }

  function stopRingTone() {
    clearInterval(ringTimerRef.current);
    ringTimerRef.current = null;
  }

  async function sendSignal(callId, type, payload) {
    await api.post(`/messages/calls/${callId}/signals`, { type, payload });
  }

  function createVideoElement(stream, muted = true) {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = muted;
    video.playsInline = true;
    video.autoplay = true;
    video.play().catch(() => {});
    return video;
  }

  function buildRecordedStream(call) {
    const local = localStreamRef.current;
    const remote = remoteStreamRef.current;
    if (!local) return null;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioContext = AudioCtx ? new AudioCtx() : null;
    let audioStream = null;
    if (audioContext) {
      const destination = audioContext.createMediaStreamDestination();
      [local, remote].filter(Boolean).forEach((stream) => {
        if (!stream.getAudioTracks().length) return;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(destination);
      });
      recordingAudioContextRef.current = audioContext;
      audioStream = destination.stream;
    }

    if (call.callType !== 'video') {
      return new MediaStream(audioStream?.getAudioTracks() || local.getAudioTracks());
    }

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    recordingCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    const localVideo = createVideoElement(local);
    const remoteVideo = createVideoElement(remote || new MediaStream());

    function draw() {
      ctx.fillStyle = '#080b18';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (remoteVideo.videoWidth) {
        ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#1f2a44';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 34px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Remote video', canvas.width / 2, canvas.height / 2);
      }
      const insetW = 210;
      const insetH = 300;
      const insetX = canvas.width - insetW - 28;
      const insetY = 34;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(insetX - 4, insetY - 4, insetW + 8, insetH + 8);
      if (localVideo.videoWidth) ctx.drawImage(localVideo, insetX, insetY, insetW, insetH);
      recordingFrameRef.current = requestAnimationFrame(draw);
    }
    draw();

    const canvasStream = canvas.captureStream(24);
    return new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(audioStream?.getAudioTracks() || local.getAudioTracks())
    ]);
  }

  function startRecording(call) {
    const stream = buildRecordedStream(call);
    if (!window.MediaRecorder || !stream) return;
    recordingChunksRef.current = [];
    const preferred = call.callType === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
    const fallback = call.callType === 'video' ? 'video/webm' : 'audio/webm';
    const mimeType = MediaRecorder.isTypeSupported(preferred) ? preferred : MediaRecorder.isTypeSupported(fallback) ? fallback : '';
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data?.size) recordingChunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      if (!recordingChunksRef.current.length) return;
      const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await api.post(`/messages/calls/${call.id}/recording`, { dataUrl: reader.result, mimeType: blob.type });
          await refreshActiveChat();
        } catch {
          showToast('Recording could not be saved.', 'error');
        }
      };
      reader.readAsDataURL(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
  }

  async function createPeer(call, stream, initiator) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerRef.current = peer;
    remoteStreamRef.current = new MediaStream();
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remoteStreamRef.current.addTrack(track));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) sendSignal(call.id, 'ice-candidate', event.candidate).catch(() => {});
    };
    if (initiator) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(call.id, 'offer', offer);
    }
    return peer;
  }

  async function handleSignal(signal) {
    const peer = peerRef.current;
    if (!peer) return;
    if (signal.type === 'offer') {
      await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(activeCallRef.current.id, 'answer', answer);
    }
    if (signal.type === 'answer' && !peer.currentRemoteDescription) await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
    if (signal.type === 'ice-candidate') await peer.addIceCandidate(new RTCIceCandidate(signal.payload));
  }

  async function handleSignals(call) {
    const { data } = await api.get(`/messages/calls/${call.id}/signals`, { params: { since: signalCursorRef.current } });
    signalCursorRef.current = data.next;
    for (const signal of data.signals || []) {
      await handleSignal(signal);
    }
  }

  useEffect(() => {
    if (!activeCall) return;
    const id = setInterval(() => handleSignals(activeCall).catch(() => {}), 1200);
    return () => clearInterval(id);
  }, [activeCall]);

  async function beginCall(callType) {
    const scope = callScope();
    if (!scope) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const { data } = await api.post('/messages/calls', { ...scope, callType });
      signalCursorRef.current = 0;
      setActiveCall(data.call);
      setCallStatus('Calling');
      setCallSeconds(0);
      startRingTone();
      await createPeer(data.call, stream, true);
    } catch {
      stopLocalMedia();
      showToast('Call could not be started. Check camera or microphone permission.', 'error');
    }
  }

  async function acceptIncomingCall(call) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.callType === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const { data } = await api.post(`/messages/calls/${call.id}/accept`);
      signalCursorRef.current = 0;
      setIncomingCall(null);
      stopRingTone();
      setActiveCall(data.call);
      setCallStatus('Connected');
      callStartedAtRef.current = data.call.acceptedAt || new Date().toISOString();
      await createPeer(data.call, stream, false);
      startRecording(data.call);
    } catch {
      showToast('Call could not be accepted.', 'error');
    }
  }

  async function declineIncomingCall(call) {
    await api.post(`/messages/calls/${call.id}/decline`);
    stopRingTone();
    setIncomingCall(null);
    await refreshActiveChat();
  }

  async function endActiveCall() {
    if (!activeCall) return;
    try {
      const { data } = await api.post(`/messages/calls/${activeCall.id}/end`);
      stopRingTone();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      setCallStatus('Ended');
      setActiveCall(data.call);
      setTimeout(() => setActiveCall(null), 900);
      await refreshActiveChat();
    } catch {
      showToast('Call could not be ended cleanly.', 'error');
      setActiveCall(null);
    } finally {
      stopLocalMedia();
    }
  }

  async function switchCallType() {
    if (!activeCall || activeCall.callType === 'video') return;
    await endActiveCall();
    beginCall('video');
  }

  function toggleMic() {
    const enabled = micMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    setMicMuted(!micMuted);
  }

  function toggleCamera() {
    const enabled = cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
    setCameraOff(!cameraOff);
  }

  function formatDuration(seconds = 0) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  async function downloadRecording(call) {
    try {
      const { data } = await api.get(`/messages/calls/${call.id}/recording`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = call.recording?.filename || `bridgeup-${call.callType}-call.webm`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Recording is not ready or cannot be downloaded.', 'error');
    }
  }

  async function refreshGroupChat() {
    if (!groupChatId) return;
    const { data } = await api.get(`/messages/group-chats/${groupChatId}`);
    setMessages(data.messages);
    setParticipants(data.participants || []);
    const about = data.chat?.about || 'A private group chat for connected BridgeUp members.';
    setActiveChat({
      type: 'group',
      title: data.chat?.name || 'BridgeUp group chat',
      about,
      ownerId: data.chat?.ownerId,
      moderators: data.chat?.moderators || []
    });
    setAboutDraft(about);
  }

  function participantFor(message) {
    return participants.find((person) => person.id === message.senderId);
  }

  function senderName(message) {
    return message.sender?.name || participantFor(message)?.name || (message.senderId === user.id ? user.name : 'BridgeUp member');
  }

  function senderPhoto(message) {
    return message.senderProfile?.photo || participantFor(message)?.photo || participantFor(message)?.profile?.photo || '';
  }

  function messageById(id) {
    return messages.find((message) => message.id === id);
  }

  function messageTime(message) {
    const raw = message.createdAt || message.deliveredAt;
    if (!raw) return '';
    return new Date(raw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToMessage(id) {
    messageRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const pinnedMessages = messages.filter((message) => message.pinned && !message.deleted);
  const timelineItems = useMemo(() => [
    ...callLogs.map((call) => ({
      kind: 'call',
      id: `call-${call.id}`,
      timestamp: call.endedAt || call.startedAt || call.createdAt,
      call
    })),
    ...messages
      .filter((message) => !hiddenMessageIds.includes(message.id))
      .map((message) => ({
        kind: 'message',
        id: `message-${message.id}`,
        timestamp: message.createdAt || message.deliveredAt,
        message
      }))
  ].sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || ''))), [callLogs, messages, hiddenMessageIds]);

  const isGroupOwner = activeChat?.ownerId === user.id;
  const isGroupModerator = (activeChat?.moderators || []).includes(user.id);
  const canEditAbout = isGroupOwner || isGroupModerator;

  function roleLabel(person) {
    if (person.groupRole === 'owner') return 'Owner';
    if (person.groupRole === 'moderator') return 'Moderator';
    return 'Member';
  }

  async function saveAbout(event) {
    event.preventDefault();
    const { data } = await api.patch(`/messages/group-chats/${groupChatId}`, { about: aboutDraft });
    setActiveChat((chat) => ({ ...chat, about: data.chat.about }));
    showToast('Group about updated');
    await refreshGroupChat();
  }

  async function toggleModerator(person) {
    if (!isGroupOwner || person.id === user.id || person.groupRole === 'owner') return;
    const { data } = await api.post(`/messages/group-chats/${groupChatId}/moderators/${person.id}`);
    showToast(data.promoted ? `${person.name} is now a moderator` : `${person.name} is now a member`);
    await refreshGroupChat();
  }

  async function leaveGroup() {
    await api.post(`/messages/group-chats/${groupChatId}/leave`);
    showToast('You left the group chat');
    navigate('/messages');
  }

  async function editMessage(message) {
    const url = groupChatId ? `/messages/group-chats/messages/${message.id}` : `/messages/items/${message.id}`;
    const { data } = await api.patch(url, { body: editText[message.id] || message.body });
    setMessages((items) => items.map((item) => item.id === message.id ? data.message : item));
    setEditText({ ...editText, [message.id]: '' });
    setActiveMessage(null);
    showToast('Message edited');
  }

  async function deleteMessage(message) {
    const scope = window.prompt('Delete message: type "me" for Delete for Me, or "everyone" for Delete for Everyone.', 'everyone');
    if (!scope) return;
    if (scope.toLowerCase() === 'me') {
      setHiddenMessageIds((items) => [...items, message.id]);
      setActiveMessage(null);
      showToast('Message deleted for you');
      return;
    }
    if (scope.toLowerCase() !== 'everyone') return;
    const url = groupChatId ? `/messages/group-chats/messages/${message.id}` : `/messages/items/${message.id}`;
    const { data } = await api.delete(url);
    setMessages((items) => items.map((item) => item.id === message.id ? data.message : item));
    setActiveMessage(null);
    showToast('Message deleted');
  }

  async function togglePin(message) {
    const url = groupChatId ? `/messages/group-chats/messages/${message.id}/pin` : `/messages/items/${message.id}/pin`;
    const { data } = await api.patch(url, { pinned: !message.pinned });
    setMessages((items) => items.map((item) => item.id === message.id ? data.message : item));
    setActiveMessage(null);
    showToast(data.message.pinned ? 'Message pinned' : 'Message unpinned');
  }

  function placeMessageMenu(message, rect) {
    const viewportPadding = 10;
    const gap = 8;
    const shellWidth = Math.min(448, window.innerWidth);
    const shellLeft = Math.max(0, (window.innerWidth - shellWidth) / 2);
    const shellRight = shellLeft + shellWidth;
    const menuWidth = Math.min(224, shellWidth - viewportPadding * 2);
    const menuHeight = 6 * 44 + 16;
    const belowSpace = window.innerHeight - rect.bottom - viewportPadding;
    const aboveSpace = rect.top - viewportPadding;
    const mine = message.senderId === user.id;
    let x = mine ? rect.right - menuWidth : rect.left;
    x = Math.min(shellRight - menuWidth - viewportPadding, Math.max(shellLeft + viewportPadding, x));
    let y;
    let vertical = 'below';
    if (belowSpace >= menuHeight + gap || belowSpace >= aboveSpace) {
      y = Math.min(window.innerHeight - menuHeight - viewportPadding, rect.bottom + gap);
    } else {
      y = Math.max(viewportPadding, rect.top - menuHeight - gap);
      vertical = 'above';
    }
    const arrowX = mine ? Math.min(menuWidth - 20, Math.max(20, rect.right - x - 22)) : Math.min(menuWidth - 20, Math.max(20, rect.left - x + 22));
    setEditText((items) => ({ ...items, [message.id]: items[message.id] ?? message.body }));
    setActiveMessage({ message, x, y, width: menuWidth, vertical, arrowX, editing: false });
  }

  function openMessageMenu(event, message) {
    event.preventDefault();
    const bubble = event.currentTarget.querySelector('[data-message-bubble]') || event.currentTarget;
    placeMessageMenu(message, bubble.getBoundingClientRect());
  }

  function beginLongPress(event, message) {
    const bubble = event.currentTarget.querySelector('[data-message-bubble]') || event.currentTarget;
    const rect = bubble.getBoundingClientRect();
    clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => placeMessageMenu(message, rect), 420);
  }

  function endLongPress() {
    clearTimeout(longPressRef.current);
  }

  async function handleMessageAction(action) {
    const message = activeMessage?.message;
    if (!message) return;
    const text = message.body || message.deletedNotice || '';
    if (action === 'reply') {
      setReplyTarget(message);
      setActiveMessage(null);
      showToast('Reply started');
    }
    if (action === 'edit') setActiveMessage((item) => ({ ...item, editing: true }));
    if (action === 'delete') await deleteMessage(message);
    if (action === 'copy') {
      await navigator.clipboard?.writeText(text);
      setActiveMessage(null);
      showToast('Message copied');
    }
    if (action === 'forward') {
      setForwardMessage(message);
      setForwardSelection([]);
      setActiveMessage(null);
    }
    if (action === 'pin') await togglePin(message);
    if (action === 'save') {
      setActiveMessage(null);
      showToast('Message saved');
    }
    if (action === 'report') {
      await api.post('/safety/reports', { reportedUserId: message.senderId, reason: 'Message concern', details: text });
      setActiveMessage(null);
      showToast('Message report sent');
    }
    if (action === 'details') {
      setActiveMessage(null);
      showToast(`Sent ${messageTime(message) || 'recently'} · ${message.deliveredAt ? 'Delivered' : 'Sending'}`, 'info');
    }
  }

  async function send(event) {
    event.preventDefault();
    if (!body.trim()) return;
    const url = groupChatId ? `/messages/group-chats/${groupChatId}` : `/messages/${matchId}`;
    const { data } = await api.post(url, { body, replyToId: replyTarget?.id || null });
    setMessages((items) => [...items, data.message]);
    setBody('');
    setReplyTarget(null);
    setShowEmojiPicker(false);
    showToast('Message sent');
  }

  async function forwardSelected(event) {
    event.preventDefault();
    if (!forwardMessage || !forwardSelection.length) return;
    await Promise.all(forwardSelection.map((target) => {
      const [type, id] = target.split(':');
      const url = type === 'group' ? `/messages/group-chats/${id}` : `/messages/${id}`;
      return api.post(url, { body: forwardMessage.body, forwarded: true, forwardedFromId: forwardMessage.id });
    }));
    setForwardMessage(null);
    setForwardSelection([]);
    showToast('Message forwarded');
  }

  async function createGroupChat(event) {
    event.preventDefault();
    if (!selectedPeople.length) {
      showToast('Choose at least one connected person.', 'error');
      return;
    }
    setCreatingGroup(true);
    try {
      const { data } = await api.post('/messages/group-chats', { name: groupName.trim(), participantIds: selectedPeople });
      showToast('Group chat created');
      setShowGroupForm(false);
      setGroupName('');
      setSelectedPeople([]);
      await loadInbox();
      navigate(`/messages/group/${data.chat.id}`);
    } catch {
      showToast('Group chat could not be created.', 'error');
    } finally {
      setCreatingGroup(false);
    }
  }

  if (!matchId && !groupChatId) {
    return (
      <AppShell>
        <header className="flex items-center justify-between">
          <h1 className="text-[28px] font-black tracking-tight">Messages</h1>
          <button onClick={() => setShowGroupForm(true)} className="grid h-12 w-12 place-items-center rounded-full bg-brand-blue text-white shadow-soft" aria-label="Add group chat">
            <Plus />
          </button>
        </header>

        {showGroupForm && (
          <section className="ios-card mt-5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black">New group chat</h2>
              <button onClick={() => setShowGroupForm(false)} className="text-brand-muted"><X /></button>
            </div>
            <form onSubmit={createGroupChat} className="space-y-3">
              <input className="ios-input touch w-full px-4" placeholder="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} required />
              <div className="space-y-2">
                {connected.map((person) => {
                  const selected = selectedPeople.includes(person.id);
                  return (
                    <button type="button" key={person.id} onClick={() => setSelectedPeople(selected ? selectedPeople.filter((id) => id !== person.id) : [...selectedPeople, person.id])} className="flex w-full items-center justify-between rounded-2xl bg-brand-cream p-3 text-left">
                      <span>
                        <b>{person.name}</b>
                        <p className="text-xs text-brand-muted">{person.email}</p>
                      </span>
                      <span className={`h-6 w-6 rounded-full border ${selected ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`} />
                    </button>
                  );
                })}
                {!connected.length && <p className="rounded-2xl bg-brand-cream p-3 text-sm font-semibold text-brand-muted">Connect with someone first to add them to a group chat.</p>}
              </div>
              <button
                disabled={creatingGroup || !selectedPeople.length}
                className={`touch w-full rounded-[22px] font-black ${creatingGroup || !selectedPeople.length ? 'bg-brand-cream text-brand-muted' : 'bg-brand-blue text-white'}`}
              >
                {creatingGroup ? 'Creating...' : selectedPeople.length ? 'Create group chat' : 'Select someone first'}
              </button>
            </form>
          </section>
        )}

        <div className="mt-6 grid gap-3">
          {groupChats.map((chat) => (
            <Link key={chat.id} to={`/messages/group/${chat.id}`} className="ios-card flex items-center gap-3 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-blue text-white"><UsersRound /></div>
              <div className="min-w-0 flex-1">
                <b className="block truncate">{chat.name}</b>
                <p className="truncate text-sm text-brand-muted">{chat.participants?.map((person) => person.name).join(', ')}</p>
              </div>
            </Link>
          ))}
          {matches.map((match) => (
            <Link key={match.id} to={`/messages/${match.id}`} className="ios-card block p-4">
              <b>{match.other?.name}</b>
              <p className="text-sm text-brand-muted">Mutual match - {match.score}% compatibility</p>
            </Link>
          ))}
          {!matches.length && !groupChats.length && <div className="ios-card p-6 text-center">Match first, then message.</div>}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideBottomNav>
      <div className="sticky top-0 z-20 -mx-5 -mt-5 border-b border-slate-100 bg-white/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/messages" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-cream text-brand-text" aria-label="Back to messages">
            <ChevronLeft />
          </Link>
          <button
            type="button"
            onClick={() => groupChatId && setShowGroupInfo(true)}
            className="min-w-0 flex-1 text-left"
            aria-label={groupChatId ? 'View group details' : undefined}
          >
            <h1 className="truncate text-[20px] font-black">{activeChat?.title || 'Messages'}</h1>
            <p className="truncate text-xs font-semibold text-brand-muted">{groupChatId ? `${participants.length} members` : activeChat?.about}</p>
          </button>
          <button onClick={() => beginCall('voice')} className="grid h-11 w-11 place-items-center rounded-full bg-brand-cream text-brand-blue" aria-label="Start voice call">
            <Phone size={19} />
          </button>
          <button onClick={() => beginCall('video')} className="grid h-11 w-11 place-items-center rounded-full bg-brand-blue text-white" aria-label="Start video call">
            <Video size={19} />
          </button>
          {groupChatId && (
            <button onClick={() => setShowGroupInfo(true)} className="grid h-11 w-11 place-items-center rounded-full bg-brand-blue text-white" aria-label="View group info">
              <Info size={20} />
            </button>
          )}
        </div>
      </div>

      {showGroupInfo && (
        <div className="fixed inset-0 z-50 bg-black/30 px-5 py-6 backdrop-blur-sm">
          <section className="mx-auto flex max-h-full max-w-md flex-col rounded-[34px] bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-muted">Group chat</p>
                <h2 className="mt-1 text-[24px] font-black">{activeChat?.title}</h2>
              </div>
              <button onClick={() => setShowGroupInfo(false)} className="grid h-11 w-11 place-items-center rounded-full bg-brand-cream text-brand-muted" aria-label="Close group details">
                <X />
              </button>
            </div>
            <div className="mt-4 rounded-[24px] bg-brand-cream p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-muted">About</p>
                {canEditAbout && <span className="text-xs font-black text-brand-blue">Editable</span>}
              </div>
              {canEditAbout ? (
                <form onSubmit={saveAbout} className="mt-3 space-y-3">
                  <textarea className="min-h-24 w-full resize-none rounded-[18px] bg-white p-3 text-sm font-semibold leading-6 outline-brand-blue" value={aboutDraft} onChange={(event) => setAboutDraft(event.target.value)} />
                  <button className="h-11 rounded-full bg-brand-blue px-5 text-sm font-black text-white">Save about</button>
                </form>
              ) : (
                <p className="mt-2 text-sm font-semibold leading-6">{activeChat?.about}</p>
              )}
            </div>
            <div className="sleek-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <button onClick={leaveGroup} className="mb-4 h-12 w-full rounded-full border border-brand-coral/30 bg-brand-coral/10 text-sm font-black text-brand-coral">
                Leave group chat
              </button>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-muted">Members</p>
                {isGroupOwner && <p className="text-xs font-bold text-brand-muted">Tap a member to promote</p>}
              </div>
              <div className="space-y-2">
                {participants.map((person) => (
                  <button
                    type="button"
                    key={person.id}
                    onClick={() => toggleModerator(person)}
                    className="flex w-full items-center gap-3 rounded-[22px] bg-white p-2 text-left shadow-[0_8px_24px_rgba(20,28,45,0.08)]"
                    disabled={!isGroupOwner || person.id === user.id || person.groupRole === 'owner'}
                  >
                    <Avatar name={person.name} src={person.photo || person.profile?.photo} className="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{person.name}</b>
                      <p className="truncate text-xs text-brand-muted">{person.email}</p>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${person.groupRole === 'owner' ? 'bg-brand-yellow/40 text-brand-text' : person.groupRole === 'moderator' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-cream text-brand-muted'}`}>
                      {person.groupRole === 'owner' && <Crown size={12} />}
                      {person.groupRole === 'moderator' && <Shield size={12} />}
                      {roleLabel(person)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <button
          type="button"
          onClick={() => scrollToMessage(pinnedMessages[pinnedIndex % pinnedMessages.length].id)}
          className="sticky top-[74px] z-10 -mx-1 mt-3 flex items-center gap-3 rounded-[20px] border border-brand-blue/10 bg-white/90 p-3 text-left shadow-soft backdrop-blur"
        >
          <Pin className="shrink-0 text-brand-blue" size={18} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-brand-blue">Pinned message {pinnedIndex + 1} of {pinnedMessages.length}</p>
            <p className="truncate text-sm font-semibold">{pinnedMessages[pinnedIndex % pinnedMessages.length].body}</p>
          </div>
          {pinnedMessages.length > 1 && (
            <span onClick={(event) => { event.stopPropagation(); setPinnedIndex((value) => (value + 1) % pinnedMessages.length); }} className="rounded-full bg-brand-cream px-3 py-2 text-xs font-black text-brand-muted">Next</span>
          )}
        </button>
      )}

      <div className="mt-4 flex min-h-[72vh] flex-col pb-28">
        <div className="sleek-scrollbar max-h-[calc(100vh-210px)] flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
          {timelineItems.map((item) => {
            if (item.kind === 'call') {
              return <CallLogCard key={item.id} call={item.call} participants={participants} onDownload={() => downloadRecording(item.call)} formatDuration={formatDuration} />;
            }
            const message = item.message;
            const mine = message.senderId === user.id;
            const replied = message.replyToId ? messageById(message.replyToId) : null;
            return (
              <button
                key={item.id}
                ref={(node) => { messageRefs.current[message.id] = node; }}
                type="button"
                onClick={(event) => !message.deleted && openMessageMenu(event, message)}
                onContextMenu={(event) => !message.deleted && openMessageMenu(event, message)}
                onPointerDown={(event) => !message.deleted && beginLongPress(event, message)}
                onPointerUp={endLongPress}
                onPointerLeave={endLongPress}
                className={`flex w-full items-end gap-2 text-left ${mine ? 'justify-end' : 'justify-start'}`}
              >
                {!mine && <Avatar name={senderName(message)} src={senderPhoto(message)} className="h-9 w-9 shrink-0 text-sm" />}
                <div className="min-w-0 max-w-[78%]">
                  <p className={`mb-1 px-1 text-xs font-bold text-brand-muted ${mine ? 'text-right' : ''}`}>{senderName(message)}</p>
                  <div data-message-bubble className={`rounded-[24px] px-4 py-3 text-[15px] font-semibold leading-6 shadow-[0_10px_28px_rgba(20,28,45,0.08)] transition ${activeMessage?.message.id === message.id ? 'ring-4 ring-brand-blue/25 scale-[1.01]' : ''} ${mine ? 'rounded-br-md bg-brand-blue text-white' : 'rounded-bl-md bg-white text-brand-text'}`}>
                    {message.forwarded && <p className="mb-1 text-xs font-black opacity-75">Forwarded</p>}
                    {replied && <div className={`mb-2 rounded-2xl border-l-4 px-3 py-2 text-xs ${mine ? 'border-white/70 bg-white/15' : 'border-brand-blue bg-brand-cream'}`}>{senderName(replied)}: {replied.body}</div>}
                    <p>{message.deleted ? message.deletedNotice : message.body}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] font-bold ${mine ? 'text-white/75' : 'text-brand-muted'}`}>
                      {message.edited && !message.deleted && <span>Edited</span>}
                      <span>{messageTime(message)}</span>
                      {mine && (message.readAt ? <CheckCheck size={14} /> : message.deliveredAt ? <CheckCheck size={14} /> : <Check size={14} />)}
                    </div>
                  </div>
                </div>
                {mine && <Avatar name={senderName(message)} src={senderPhoto(message)} className="h-9 w-9 shrink-0 text-sm" />}
              </button>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {activeMessage && (
        <MessageContextMenu
          menu={activeMessage}
          mine={activeMessage.message.senderId === user.id}
          canDelete={activeMessage.message.senderId === user.id || (groupChatId && canEditAbout)}
          canReport={activeMessage.message.senderId !== user.id}
          pinned={Boolean(activeMessage.message.pinned)}
          editValue={editText[activeMessage.message.id] ?? activeMessage.message.body}
          onEditValue={(value) => setEditText({ ...editText, [activeMessage.message.id]: value })}
          onSaveEdit={() => editMessage(activeMessage.message)}
          onAction={handleMessageAction}
          onClose={() => setActiveMessage(null)}
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-5 pb-4">
        {showEmojiPicker && (
          <div className="mb-2 grid grid-cols-8 gap-1 rounded-[24px] bg-white p-3 shadow-soft">
            {quickEmojis.map((emoji) => (
              <button key={emoji} type="button" onClick={() => setBody((value) => `${value}${emoji}`)} className="grid h-9 w-full place-items-center rounded-full bg-brand-cream text-lg">
                {emoji}
              </button>
            ))}
          </div>
        )}
        {replyTarget && (
          <div className="mb-2 flex items-center gap-3 rounded-[20px] border-l-4 border-brand-blue bg-white/95 p-3 shadow-soft backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-brand-blue">Replying to {senderName(replyTarget)}</p>
              <p className="truncate text-sm font-semibold">{replyTarget.body}</p>
            </div>
            <button onClick={() => setReplyTarget(null)} className="grid h-9 w-9 place-items-center rounded-full bg-brand-cream text-brand-muted"><X size={16} /></button>
          </div>
        )}
        <form onSubmit={send} className="flex gap-2 rounded-full bg-white p-2 shadow-soft">
          <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-cream text-brand-muted" aria-label="Add emoji">
            <Smile size={21} />
          </button>
          <input className="min-w-0 flex-1 rounded-full bg-transparent px-2 font-semibold outline-none" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a kind message" />
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-blue text-white" aria-label="Send message"><Send size={20} /></button>
        </form>
      </div>
      {forwardMessage && (
        <ForwardSheet
          matches={matches}
          groupChats={groupChats}
          selection={forwardSelection}
          setSelection={setForwardSelection}
          onClose={() => setForwardMessage(null)}
          onSubmit={forwardSelected}
        />
      )}
      {incomingCall && (
        <IncomingCallSheet
          call={incomingCall}
          user={user}
          participants={participants}
          onAccept={() => acceptIncomingCall(incomingCall)}
          onDecline={() => declineIncomingCall(incomingCall)}
        />
      )}
      {activeCall && (
        <CallOverlay
          call={activeCall}
          status={callStatus}
          seconds={callSeconds}
          micMuted={micMuted}
          cameraOff={cameraOff}
          speakerOn={speakerOn}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          remoteAudioRef={remoteAudioRef}
          localStreamRef={localStreamRef}
          remoteStreamRef={remoteStreamRef}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleSpeaker={() => setSpeakerOn((value) => !value)}
          onSwitchToVideo={switchCallType}
          onEnd={endActiveCall}
          formatDuration={formatDuration}
          participants={participants}
        />
      )}
    </AppShell>
  );
}

function CallLogCard({ call, participants, onDownload, formatDuration }) {
  const statusLabel = call.status === 'completed' ? 'Completed' : call.status === 'declined' ? 'Declined' : call.status === 'missed' ? 'Missed' : 'Ended';
  const date = new Date(call.endedAt || call.startedAt || call.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const participantNames = (call.participantIds || [])
    .map((id) => participants.find((person) => person.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  return (
    <article className="mx-auto w-[92%] rounded-[22px] border border-brand-blue/10 bg-white p-4 text-center shadow-soft">
      <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-brand-blue/10 text-brand-blue">
        {call.callType === 'video' ? <Video size={19} /> : <Phone size={19} />}
      </div>
      <p className="text-sm font-black">{call.callType === 'video' ? 'Video' : 'Voice'} call - {statusLabel}</p>
      <p className="mt-1 text-xs font-semibold text-brand-muted">{date} - {formatDuration(call.durationSeconds || 0)}</p>
      {participantNames && <p className="mt-1 truncate text-xs font-semibold text-brand-muted">With {participantNames}</p>}
      {call.status === 'completed' && (
        <button
          onClick={onDownload}
          disabled={call.recording?.status !== 'ready'}
          className={`mt-3 inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-black ${call.recording?.status === 'ready' ? 'bg-brand-blue text-white' : 'bg-brand-cream text-brand-muted'}`}
        >
          <Download size={15} />
          {call.recording?.status === 'ready' ? 'Download Recording' : call.recording?.status === 'failed' ? 'Recording failed' : 'Recording processing...'}
        </button>
      )}
    </article>
  );
}

function IncomingCallSheet({ call, participants, onAccept, onDecline }) {
  const caller = participants.find((person) => person.id === call.callerId) || call.caller;
  return (
    <div className="fixed inset-y-0 left-1/2 z-[70] grid w-full max-w-md -translate-x-1/2 place-items-end bg-black/50 p-5 backdrop-blur-sm">
      <section className="w-full rounded-[34px] bg-white p-6 text-center shadow-soft">
        <Avatar name={caller?.name || 'BridgeUp member'} src={caller?.photo || caller?.profile?.photo} className="mx-auto h-24 w-24 text-3xl" />
        <p className="mt-4 text-sm font-black uppercase text-brand-blue">Incoming {call.callType} call</p>
        <h2 className="mt-1 text-2xl font-black">{caller?.name || 'BridgeUp member'}</h2>
        <p className="mt-2 text-sm font-semibold text-brand-muted">Ringing...</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onDecline} className="h-14 rounded-full bg-brand-coral text-sm font-black text-white">Decline</button>
          <button onClick={onAccept} className="h-14 rounded-full bg-brand-green text-sm font-black text-white">Accept</button>
        </div>
      </section>
    </div>
  );
}

function CallOverlay({ call, status, seconds, micMuted, cameraOff, speakerOn, localVideoRef, remoteVideoRef, remoteAudioRef, localStreamRef, remoteStreamRef, onToggleMic, onToggleCamera, onToggleSpeaker, onSwitchToVideo, onEnd, formatDuration, participants }) {
  useEffect(() => {
    function bindStreams() {
      if (localVideoRef.current && localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (remoteVideoRef.current && remoteStreamRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      if (remoteAudioRef.current && remoteStreamRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
    }
    bindStreams();
    const id = setInterval(bindStreams, 500);
    return () => clearInterval(id);
  }, [localStreamRef, remoteStreamRef, localVideoRef, remoteVideoRef, remoteAudioRef]);

  const other = participants.find((person) => person.id !== call.callerId) || call.caller;
  const connected = call.status === 'connected' || call.status === 'completed';
  return (
    <div className="fixed inset-y-0 left-1/2 z-[80] flex w-full max-w-md -translate-x-1/2 flex-col bg-brand-text text-white shadow-soft">
      <div className="relative min-h-0 flex-1">
        {call.callType === 'video' ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
            <video ref={localVideoRef} autoPlay muted playsInline className="absolute right-4 top-5 h-36 w-24 rounded-[22px] border-2 border-white/70 object-cover shadow-soft" />
          </>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <Avatar name={other?.name || 'BridgeUp member'} src={other?.photo || other?.profile?.photo} className="mx-auto h-32 w-32 text-5xl" />
              <h2 className="mt-5 text-3xl font-black">{other?.name || 'BridgeUp call'}</h2>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.16em] text-white/65">{status || 'Calling'}</p>
              <p className="mt-3 text-xl font-black">{connected ? formatDuration(seconds) : 'Ringing...'}</p>
            </div>
          </div>
        )}
        <audio ref={remoteAudioRef} autoPlay muted={!speakerOn} />
        {call.callType === 'video' && (
          <div className="absolute inset-x-0 top-5 px-5">
            <h2 className="truncate text-2xl font-black drop-shadow">{other?.name || 'BridgeUp call'}</h2>
            <p className="text-sm font-bold text-white/80 drop-shadow">{status || 'Calling'} - {connected ? formatDuration(seconds) : 'Ringing...'}</p>
          </div>
        )}
      </div>
      <div className="rounded-t-[34px] bg-white px-5 pb-7 pt-5 text-brand-text">
        <div className="grid grid-cols-5 gap-2">
          <CallControl active={micMuted} icon={micMuted ? MicOff : Mic} label={micMuted ? 'Muted' : 'Mute'} onClick={onToggleMic} />
          <CallControl active={!speakerOn} icon={Volume2} label="Speaker" onClick={onToggleSpeaker} />
          <button onClick={onEnd} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-coral text-white shadow-soft" aria-label="End call">
            <PhoneOff />
          </button>
          <CallControl active={cameraOff} icon={cameraOff ? VideoOff : Video} label={cameraOff ? 'Camera off' : 'Camera'} onClick={onToggleCamera} disabled={call.callType !== 'video'} />
          <CallControl icon={Video} label="Video" onClick={onSwitchToVideo} disabled={call.callType === 'video'} />
        </div>
      </div>
    </div>
  );
}

function CallControl({ icon: Icon, label, active, disabled, onClick }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`flex flex-col items-center gap-1 text-[11px] font-black ${disabled ? 'text-brand-muted/40' : active ? 'text-brand-coral' : 'text-brand-muted'}`}>
      <span className={`grid h-12 w-12 place-items-center rounded-full ${active ? 'bg-brand-coral/10' : 'bg-brand-cream'}`}>
        <Icon size={19} />
      </span>
      {label}
    </button>
  );
}

function MessageContextMenu({ menu, mine, canDelete, canReport, pinned, editValue, onEditValue, onSaveEdit, onAction, onClose }) {
  const [more, setMore] = useState(false);
  const actions = [
    { id: 'reply', label: 'Reply', icon: CornerUpLeft },
    { id: 'edit', label: 'Edit', icon: Edit3, disabled: !mine },
    { id: 'delete', label: 'Delete', icon: Trash2, danger: true, disabled: !canDelete },
    { id: 'copy', label: 'Copy', icon: Copy },
    { id: 'forward', label: 'Forward', icon: Forward },
    { id: 'pin', label: pinned ? 'Unpin' : 'Pin', icon: Pin }
  ];
  const moreActions = [
    { id: 'save', label: 'Save', icon: Bookmark },
    { id: 'report', label: 'Report', icon: Flag, danger: true, disabled: !canReport },
    { id: 'details', label: 'Message Details', icon: Info }
  ];

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="animate-[menuIn_160ms_ease-out] rounded-[24px] border border-white/60 bg-white/90 p-2 shadow-soft backdrop-blur-xl"
        style={{ position: 'fixed', left: menu.x, top: menu.y, width: menu.width, transformOrigin: menu.vertical === 'above' ? 'bottom center' : 'top center' }}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className={`absolute h-3 w-3 rotate-45 border border-white/60 bg-white/85 backdrop-blur-xl ${menu.vertical === 'above' ? '-bottom-1.5' : '-top-1.5'}`}
          style={{ left: menu.arrowX - 6 }}
        />
        {menu.editing ? (
          <div className="space-y-2 p-2">
            <input className="h-11 w-full rounded-2xl bg-brand-cream px-3 text-sm font-semibold outline-brand-blue" value={editValue} onChange={(event) => onEditValue(event.target.value)} autoFocus />
            <button onClick={onSaveEdit} className="h-11 w-full rounded-2xl bg-brand-blue text-sm font-black text-white">Save edit</button>
          </div>
        ) : (
          <>
            {(more ? moreActions : actions).map(({ id, label, icon: Icon, danger, disabled }) => (
              <button key={id} disabled={disabled} onClick={() => id === 'details' ? onAction('details') : onAction(id)} className={`flex h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-sm font-black transition active:scale-[0.98] ${danger ? 'text-brand-coral' : 'text-brand-text'} ${disabled ? 'opacity-35' : 'hover:bg-white'}`}>
                <Icon size={18} />
                {label}
              </button>
            ))}
            <button onClick={() => setMore((value) => !value)} className="mt-1 h-10 w-full rounded-[18px] bg-brand-cream text-sm font-black text-brand-muted">{more ? 'Back' : 'More'}</button>
          </>
        )}
      </div>
    </div>
  );
}

function ForwardSheet({ matches, groupChats, selection, setSelection, onClose, onSubmit }) {
  function toggle(value) {
    setSelection(selection.includes(value) ? selection.filter((item) => item !== value) : [...selection, value]);
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/30 px-5 py-6 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="mx-auto mt-auto max-w-md rounded-[30px] bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">Forward to</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-brand-cream text-brand-muted"><X /></button>
        </div>
        <div className="sleek-scrollbar max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {matches.map((match) => (
            <button type="button" key={match.id} onClick={() => toggle(`match:${match.id}`)} className="flex w-full items-center justify-between rounded-2xl bg-brand-cream p-3 text-left">
              <span className="font-bold">{match.other?.name}</span>
              <span className={`h-6 w-6 rounded-full border ${selection.includes(`match:${match.id}`) ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`} />
            </button>
          ))}
          {groupChats.map((chat) => (
            <button type="button" key={chat.id} onClick={() => toggle(`group:${chat.id}`)} className="flex w-full items-center justify-between rounded-2xl bg-brand-cream p-3 text-left">
              <span className="font-bold">{chat.name}</span>
              <span className={`h-6 w-6 rounded-full border ${selection.includes(`group:${chat.id}`) ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`} />
            </button>
          ))}
        </div>
        <button className="mt-4 h-12 w-full rounded-full bg-brand-blue font-black text-white">Forward message</button>
      </form>
    </div>
  );
}
