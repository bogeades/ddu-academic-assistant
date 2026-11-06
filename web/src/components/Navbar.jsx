import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { LogOut, Bell, Check, CheckCheck, AlertTriangle, ExternalLink, Clock } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, downtimeAlert } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications?limit=10');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      // Quiet fail if not yet authenticated
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {downtimeAlert && (
        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #fde68a' }}>
          <AlertTriangle size={18} />
          <span>Notice: {downtimeAlert}</span>
        </div>
      )}
      <header style={{
        backgroundColor: '#0b3954',
        color: '#ffffff',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/ddu-logo.png"
            alt="DDU Logo"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'contain',
              backgroundColor: '#ffffff',
              padding: '2px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          />
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', margin: 0, letterSpacing: '0.3px' }}>
              DIRE DAWA UNIVERSITY
            </h1>
            <p style={{ fontSize: '11px', margin: 0, opacity: 0.85 }}>
              Institute of Technology • Computer Science Dept
            </p>
          </div>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notification Bell with Dropdown (FR-S06, FR-L03) */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                aria-label={`Notifications: ${unreadCount} unread`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '1px 5px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      minWidth: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '46px',
                    width: '320px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    color: '#0f172a',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0b3954' }}>
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: notif.read ? '#ffffff' : '#f0f9ff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: notif.read ? '500' : 'bold', color: '#0b3954' }}>
                              {notif.title}
                            </div>
                            <div style={{ color: '#475569', marginTop: '2px', lineHeight: '1.4' }}>
                              {notif.message}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '10px', marginTop: '4px' }}>
                              <Clock size={10} />
                              <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {notif.link && (
                                <Link
                                  to={notif.link}
                                  onClick={() => setShowDropdown(false)}
                                  style={{ color: '#0284c7', marginLeft: '6px', textDecoration: 'none' }}
                                >
                                  View &rarr;
                                </Link>
                              )}
                            </div>
                          </div>

                          {!notif.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(notif._id, e)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{user.name}</div>
              <span className={`badge badge-${user.role}`}>{user.role}</span>
            </div>
            <button
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label="Logout from portal"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>
    </>
  );
};
