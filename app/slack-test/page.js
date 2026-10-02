'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, query, limitToLast } from 'firebase/database';
import { firebaseConfig } from '@/lib/firebase-config';

const SlackTestPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let db;
        try {
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
            db = getDatabase(app);
        } catch (error) {
            console.error('Firebase initialization error:', error);
            setLoading(false);
            return;
        }

        const eventsRef = query(ref(db, 'slack_events'), limitToLast(50));
        
        onValue(eventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array and sort by receivedAt descending
                const eventsList = Object.entries(data).map(([id, value]) => ({
                    id,
                    ...value
                })).sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
                
                setEvents(eventsList);
            } else {
                setEvents([]);
            }
            setLoading(false);
        }, (error) => {
            console.error('Data fetch error:', error);
            setLoading(false);
        });

        // Cleanup subscription
        return () => {
             const cleanupRef = ref(db, 'slack_events');
             off(cleanupRef);
        };
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            padding: '40px 20px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                <header style={{
                    marginBottom: '40px',
                    borderBottom: '1px solid #1e293b',
                    paddingBottom: '20px'
                }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '800',
                        margin: '0',
                        background: 'linear-gradient(to right, #38bdf8, #818cf8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Slack Event Monitor
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '10px' }}>
                        Real-time feed of events received at <code>/slack/action-endpint</code>
                    </p>
                </header>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid rgba(56, 189, 248, 0.2)',
                            borderTopColor: '#38bdf8',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 20px'
                        }} />
                        <style>{`
                            @keyframes spin { to { transform: rotate(360deg); } }
                        `}</style>
                        <p>Loading events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '100px 0',
                        background: '#1e293b',
                        borderRadius: '16px',
                        border: '1px dashed #334155'
                    }}>
                        <p style={{ color: '#94a3b8' }}>No events received yet.</p>
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Events will appear here automatically when Slack sends a POST request.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {events.map((event) => (
                            <div key={event.id} style={{
                                background: '#1e293b',
                                borderRadius: '16px',
                                padding: '24px',
                                border: '1px solid #334155',
                                transition: 'transform 0.2s ease, border-color 0.2s ease',
                                cursor: 'default'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    marginBottom: '16px'
                                }}>
                                    <span style={{
                                        background: 'rgba(56, 189, 248, 0.15)',
                                        color: '#38bdf8',
                                        padding: '4px 12px',
                                        borderRadius: '999px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {event.type || 'Unknown Type'}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        {event.receivedAt ? new Date(event.receivedAt).toLocaleString() : 'Just now'}
                                    </span>
                                </div>
                                
                                <div style={{
                                    fontSize: '0.9rem',
                                    color: '#cbd5e1',
                                    marginBottom: '16px'
                                }}>
                                    {event.event?.type && (
                                        <strong>Inner Event: {event.event.type}</strong>
                                    )}
                                </div>

                                <details style={{ cursor: 'pointer' }}>
                                    <summary style={{
                                        fontSize: '0.85rem',
                                        color: '#94a3b8',
                                        userSelect: 'none',
                                        outline: 'none',
                                        padding: '8px 0'
                                    }}>
                                        View Raw Payload
                                    </summary>
                                    <pre style={{
                                        marginTop: '12px',
                                        padding: '16px',
                                        backgroundColor: '#0f172a',
                                        borderRadius: '8px',
                                        overflow: 'auto',
                                        fontSize: '0.8rem',
                                        color: '#e2e8f0',
                                        border: '1px solid #1e293b'
                                    }}>
                                        {JSON.stringify(event, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlackTestPage;
