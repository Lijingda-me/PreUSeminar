import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, CheckCheck, ChevronLeft, Copy, CornerUpLeft, Edit3, Flag, Forward, LogOut, Pin, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const showToast = useToastStore((state) => state.showToast);
  const [data, setData] = useState(null);
  const [body, setBody] = useState('');
  const [editText, setEditText] = useState({});
  const [newOwnerId, setNewOwnerId] = useState('');
  const [activeMessage, setActiveMessage] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const longPressRef = useRef(null);
  const messageRefs = useRef({});

  async function load() {
    const { data: detail } = await api.get(`/community/groups/${groupId}`);
    setData(detail);
    setNewOwnerId(detail.members.find((member) => member.id !== user.id)?.id || '');
  }

  useEffect(() => { load(); }, [groupId]);
  if (!data) return <AppShell hideBottomNav><div className="rounded-[32px] bg-white/80 p-6 shadow-soft">Loading group...</div></AppShell>;

  const { group, members, messages } = data;
  const isMember = group.members.includes(user.id);
  const isOwner = group.ownerId === user.id;
  const isModerator = group.moderators.includes(user.id);
  const canModerate = isOwner || isModerator;
  const memberCount = group.memberCount ?? group.members.length;
  const pinnedMessages = messages.filter((message) => message.pinned && !message.deleted);

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

  async function join() { await api.post(`/community/groups/${group.id}/join`); await load(); showToast('Joined group'); }

  async function send(event) {
    event.preventDefault();
    await api.post(`/community/groups/${group.id}/messages`, { body, replyToId: replyTarget?.id || null });
    setBody('');
    setReplyTarget(null);
    await load();
    showToast('Message sent');
  }

  async function edit(message) {
    await api.patch(`/community/groups/messages/${message.id}`, { body: editText[message.id] || message.body });
    setEditText({ ...editText, [message.id]: '' });
    setActiveMessage(null);
    await load();
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
    await api.delete(`/community/groups/messages/${message.id}`);
    setActiveMessage(null);
    await load();
    showToast('Message deleted');
  }

  async function togglePin(message) {
    const { data } = await api.patch(`/community/groups/messages/${message.id}/pin`, { pinned: !message.pinned });
    setData((current) => ({
      ...current,
      messages: current.messages.map((item) => item.id === message.id ? { ...item, ...data.message, sender: item.sender } : item)
    }));
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
      setBody(`Forwarded: ${text}`);
      setActiveMessage(null);
      showToast('Forward draft ready');
    }
    if (action === 'pin') await togglePin(message);
    if (action === 'save') {
      setActiveMessage(null);
      showToast('Message saved');
    }
    if (action === 'report') {
      await api.post('/safety/reports', { reportedUserId: message.senderId, reason: 'Message concern', details: `Community group ${group.name}: ${text}` });
      setActiveMessage(null);
      showToast('Message report sent');
    }
    if (action === 'details') {
      setActiveMessage(null);
      showToast(`Sent ${messageTime(message) || 'recently'} · Delivered`, 'info');
    }
  }

  async function leave() { await api.post(`/community/groups/${group.id}/leave`, { newOwnerId }); showToast('Left group'); navigate('/search'); }
  async function report() { await api.post(`/safety/reports/group/${group.id}`, { reason: 'Group concern', details: 'Reported from group page.' }); showToast('Group report sent'); }
  async function removeGroup() { await api.delete(`/community/groups/${group.id}`); showToast('Group deleted'); navigate('/search'); }

  return (
    <AppShell hideBottomNav>
      <div className="sticky top-0 z-20 -mx-5 -mt-5 border-b border-slate-100 bg-white/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/search" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-cream text-brand-text" aria-label="Back to search">
            <ChevronLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-black">{group.name}</h1>
            <p className="truncate text-xs font-semibold text-brand-muted">{group.topic} - {memberCount} members</p>
          </div>
        </div>
      </div>

      <section className="mt-4 rounded-[32px] bg-white/80 p-5 shadow-soft">
        <h1 className="text-3xl font-black">{group.name}</h1>
        <p className="mt-1 font-semibold text-brand-muted">{group.topic} - {memberCount} members</p>
        <p className="mt-3 text-brand-muted">{group.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!isMember && <Button onClick={join}>Join group</Button>}
          <Button variant="secondary" onClick={report}><Flag className="mr-2 inline" size={18} /> Report</Button>
          {isOwner && <Button variant="danger" onClick={removeGroup}><Trash2 className="mr-2 inline" size={18} /> Delete group</Button>}
        </div>
      </section>

      {isOwner && members.length > 1 && (
        <section className="mt-4 rounded-[28px] bg-brand-yellow/40 p-4 shadow">
          <h2 className="font-black">Owner tools</h2>
          <select className="touch mt-3 w-full rounded-2xl bg-white px-4" onChange={(event) => api.post(`/community/groups/${group.id}/moderators`, { userId: event.target.value }).then(() => { showToast('Moderator tools granted'); load(); })} defaultValue="">
            <option value="" disabled>Grant moderator tools</option>
            {members.filter((member) => member.id !== user.id).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <select className="touch rounded-2xl bg-white px-4" value={newOwnerId} onChange={(event) => setNewOwnerId(event.target.value)}>
              {members.filter((member) => member.id !== user.id).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
            <button onClick={leave} className="touch rounded-2xl bg-white px-4 font-black text-brand-coral" aria-label="Leave and pass ownership"><LogOut /></button>
          </div>
        </section>
      )}

      {canModerate && members.length > 0 && (
        <section className="mt-4 rounded-[28px] bg-white/80 p-4 shadow">
          <h2 className="font-black">Members</h2>
          <div className="mt-3 grid gap-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl bg-brand-cream p-3 text-sm">
                <b>{member.name}</b>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-brand-muted">
                  {group.ownerId === member.id ? 'Owner' : group.moderators.includes(member.id) ? 'Moderator' : 'Member'}
                </span>
              </div>
            ))}
          </div>
        </section>
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

      <section className="mt-4 pb-28">
        <h2 className="mb-3 text-xl font-black">Messages</h2>
        <div className="space-y-3">
          {messages.filter((message) => !hiddenMessageIds.includes(message.id)).map((message) => {
            const mine = message.senderId === user.id;
            const replied = message.replyToId ? messageById(message.replyToId) : null;
            return (
              <button
                key={message.id}
                ref={(node) => { messageRefs.current[message.id] = node; }}
                type="button"
                onClick={(event) => !message.deleted && openMessageMenu(event, message)}
                onContextMenu={(event) => !message.deleted && openMessageMenu(event, message)}
                onPointerDown={(event) => !message.deleted && beginLongPress(event, message)}
                onPointerUp={endLongPress}
                onPointerLeave={endLongPress}
                className={`flex w-full items-end gap-2 text-left ${mine ? 'justify-end' : 'justify-start'}`}
              >
                {!mine && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-blue text-sm font-black text-white">{(message.sender?.name || 'M').slice(0, 1)}</div>}
                <div className="min-w-0 max-w-[78%]">
                  <p className={`mb-1 px-1 text-xs font-bold text-brand-muted ${mine ? 'text-right' : ''}`}>{message.sender?.name || 'Member'} {group.moderators.includes(message.senderId) && <ShieldCheck className="inline" size={13} />}</p>
                  <div data-message-bubble className={`rounded-[24px] px-4 py-3 text-[15px] font-semibold leading-6 shadow-[0_10px_28px_rgba(20,28,45,0.08)] transition ${activeMessage?.message.id === message.id ? 'ring-4 ring-brand-blue/25 scale-[1.01]' : ''} ${mine ? 'rounded-br-md bg-brand-blue text-white' : 'rounded-bl-md bg-white text-brand-text'}`}>
                    {message.forwarded && <p className="mb-1 text-xs font-black opacity-75">Forwarded</p>}
                    {replied && <div className={`mb-2 rounded-2xl border-l-4 px-3 py-2 text-xs ${mine ? 'border-white/70 bg-white/15' : 'border-brand-blue bg-brand-cream'}`}>{replied.sender?.name || 'Member'}: {replied.body}</div>}
                    <p>{message.deleted ? message.deletedNotice : message.body}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] font-bold ${mine ? 'text-white/75' : 'text-brand-muted'}`}>
                      {message.edited && !message.deleted && <span>Edited</span>}
                      <span>{messageTime(message)}</span>
                      {mine && <CheckCheck size={14} />}
                    </div>
                  </div>
                </div>
                {mine && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-blue text-sm font-black text-white">{(user.name || 'Y').slice(0, 1)}</div>}
              </button>
            );
          })}
        </div>
      </section>

      {activeMessage && (
        <MessageContextMenu
          menu={activeMessage}
          mine={activeMessage.message.senderId === user.id}
          canDelete={activeMessage.message.senderId === user.id || canModerate}
          canReport={activeMessage.message.senderId !== user.id}
          pinned={Boolean(activeMessage.message.pinned)}
          editValue={editText[activeMessage.message.id] ?? activeMessage.message.body}
          onEditValue={(value) => setEditText({ ...editText, [activeMessage.message.id]: value })}
          onSaveEdit={() => edit(activeMessage.message)}
          onAction={handleMessageAction}
          onClose={() => setActiveMessage(null)}
        />
      )}

      {isMember && (
        <form onSubmit={send} className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md gap-2 px-5 pb-4">
          <div className="flex flex-1 flex-col gap-2">
            {replyTarget && (
              <div className="flex items-center gap-3 rounded-[20px] border-l-4 border-brand-blue bg-white/95 p-3 shadow-soft backdrop-blur">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-brand-blue">Replying to {replyTarget.sender?.name || 'Member'}</p>
                  <p className="truncate text-sm font-semibold">{replyTarget.body}</p>
                </div>
                <button type="button" onClick={() => setReplyTarget(null)} className="grid h-9 w-9 place-items-center rounded-full bg-brand-cream text-brand-muted"><X size={16} /></button>
              </div>
            )}
            <div className="flex gap-2 rounded-full bg-white p-2 shadow-soft">
              <input className="min-w-0 flex-1 rounded-full bg-transparent px-4 font-semibold outline-none" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message the group" required />
              <button className="grid h-12 w-12 place-items-center rounded-full bg-brand-blue text-white"><Send size={20} /></button>
            </div>
          </div>
        </form>
      )}
    </AppShell>
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
    { id: 'details', label: 'Message Details', icon: ShieldCheck }
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
              <button key={id} disabled={disabled} onClick={() => onAction(id)} className={`flex h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-sm font-black transition active:scale-[0.98] ${danger ? 'text-brand-coral' : 'text-brand-text'} ${disabled ? 'opacity-35' : 'hover:bg-white'}`}>
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
