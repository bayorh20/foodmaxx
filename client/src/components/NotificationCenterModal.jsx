import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCheck, Trash2, ChevronRight, ShieldCheck, Volume2, Sparkles, HelpCircle } from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  syncNotificationPermission,
  markInAppNotificationAsRead,
  markAllInAppNotificationsAsRead,
  clearAllInAppNotifications
} from '../services/webNotificationService';
import { 
  installPushNotifications, 
  sendTestPushNotification 
} from '../services/pushNotificationService';
import { playOrderNotificationSound } from '../services/nativeMobile';

export default function NotificationCenterModal({
  open,
  onClose,
  notifications = [],
  onSelectOrder,
  onRefresh
}) {
  const [permission, setPermission] = useState(getNotificationPermission);
  const [showUnblockGuide, setShowUnblockGuide] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState(null);
  const [isInstallingPush, setIsInstallingPush] = useState(false);
  const [testSentFeedback, setTestSentFeedback] = useState(false);

  useEffect(() => {
    const update = () => setPermission(getNotificationPermission());
    update();
    const handler = (e) => {
      setPermission(e.detail || getNotificationPermission());
      if (e.detail === 'granted') setShowUnblockGuide(false);
    };
    window.addEventListener('fmx_notification_permission_changed', handler);
    return () => window.removeEventListener('fmx_notification_permission_changed', handler);
  }, [open]);

  if (!open) return null;

  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;

  const handleInstallPush = async () => {
    setIsInstallingPush(true);
    try {
      const res = await installPushNotifications();
      setPermission(res.permission);
      if (res.success) {
        setTestSentFeedback(true);
        setTimeout(() => setTestSentFeedback(false), 3000);
      }
    } finally {
      setIsInstallingPush(false);
    }
  };

  const handleSendTestPush = async () => {
    const res = await sendTestPushNotification();
    if (res.success) {
      setTestSentFeedback(true);
      setTimeout(() => setTestSentFeedback(false), 2500);
    }
  };

  const handleVerifyPermission = async () => {
    const current = await syncNotificationPermission();
    setPermission(current);
    if (current === 'granted') {
      setVerificationFeedback('success');
      setTimeout(() => {
        setVerificationFeedback(null);
        setShowUnblockGuide(false);
      }, 1800);
    } else {
      setVerificationFeedback('still_blocked');
      setTimeout(() => setVerificationFeedback(null), 3500);
    }
  };

  const handleTestAlertSound = () => {
    playOrderNotificationSound();
  };

  const handleItemClick = (notif) => {
    markInAppNotificationAsRead(notif.id);
    if (onRefresh) onRefresh();
    if (notif.orderRef || notif.orderId) {
      if (onSelectOrder) {
        onSelectOrder(notif.orderRef || notif.orderId);
      }
      onClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllInAppNotificationsAsRead();
    if (onRefresh) onRefresh();
  };

  const handleClearAll = () => {
    clearAllInAppNotifications();
    if (onRefresh) onRefresh();
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#12141A] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white rounded-[28px] w-full max-w-md max-h-[85vh] shadow-2xl flex flex-col relative animate-scale-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Clean Minimalist Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EA4C2A] text-white">
                {unreadCount}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                ({notifications.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Discreet Push Notification Installation & Test Strip */}
        {permission === 'denied' && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 min-w-0">
              <span className="text-sm shrink-0">🔔</span>
              <span className="truncate text-[11.5px] font-semibold">
                Push alerts paused · Sounds active
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUnblockGuide(true)}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              Unblock 🔓
            </button>
          </div>
        )}

        {permission === 'default' && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-rose-500/10 border border-orange-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 min-w-0">
              <span className="text-sm shrink-0">🚀</span>
              <div className="min-w-0">
                <span className="block truncate text-[11.5px] font-bold text-slate-900 dark:text-white">
                  Push Notifications
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  Instant lock-screen updates on order status
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={isInstallingPush}
              onClick={handleInstallPush}
              className="px-3 py-1.5 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isInstallingPush ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <span>Turn On 🚀</span>
              )}
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 min-w-0">
              <span className="text-xs">✓</span>
              <span className="truncate text-[11px] font-semibold">
                Push Notifications Active
              </span>
            </div>
            <button
              type="button"
              onClick={handleSendTestPush}
              className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-200 font-bold text-[10.5px] shrink-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
            >
              {testSentFeedback ? 'Sent! 🚀' : 'Test Push 🔔'}
            </button>
          </div>
        )}

        {/* Clean Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {notifications && notifications.length > 0 ? (
            notifications.map((n) => {
              const isUnread = !n.read && !n.is_read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative group ${
                    isUnread
                      ? 'bg-white dark:bg-[#181B24] border-orange-200/80 dark:border-[#EA4C2A]/30 shadow-xs hover:border-[#EA4C2A]'
                      : 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-100 dark:border-white/6 opacity-80 hover:opacity-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Icon Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    isUnread
                      ? 'bg-orange-500/15 text-[#EA4C2A]'
                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-500'
                  }`}>
                    {n.icon || '🛍️'}
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {formatTime(n.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                      {n.message}
                    </p>

                    {(n.orderRef || n.orderId) && (
                      <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-[#EA4C2A] group-hover:underline">
                        <span>Track Order #{n.orderRef || n.orderId?.slice(0, 8)}</span>
                        <ChevronRight size={11} />
                      </div>
                    )}
                  </div>

                  {/* Subtle Unread Dot */}
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-[#EA4C2A] shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          ) : (
            /* Clean Empty State */
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#EA4C2A] flex items-center justify-center text-xl mx-auto mb-2.5">
                🔔
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                All caught up!
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                Live order milestones, kitchen updates, and dispatch alerts will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Dedicated Clean Unblock Walkthrough Dialog (Modal-in-Modal) */}
        {showUnblockGuide && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#181B24] border border-slate-200 dark:border-white/10 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3.5 animate-scale-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔓</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Unblock Browser Alerts
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUnblockGuide(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                  <span className="w-5 h-5 rounded-full bg-[#EA4C2A] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Click the <strong>Lock 🔒</strong> or <strong>Tune 🎚️</strong> icon in your browser URL bar.</span>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                  <span className="w-5 h-5 rounded-full bg-[#EA4C2A] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Set <strong>Notifications</strong> to <strong>Allow</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                  <span className="w-5 h-5 rounded-full bg-[#EA4C2A] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Click verify below to instantly activate alerts.</span>
                </div>
              </div>

              {verificationFeedback === 'success' && (
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                  🎉 Alerts unblocked and active!
                </div>
              )}

              {verificationFeedback === 'still_blocked' && (
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold text-center">
                  Still blocked. Switch to "Allow" in the URL bar 🔒 menu.
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestAlertSound}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  🔊 Test Chime
                </button>
                <button
                  type="button"
                  onClick={handleVerifyPermission}
                  className="flex-2 py-2 bg-[#EA4C2A] hover:bg-[#d83f1d] text-white font-bold rounded-xl text-xs shadow-md shadow-[#EA4C2A]/20 transition-all active:scale-95 cursor-pointer"
                >
                  Verify & Activate 🚀
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
