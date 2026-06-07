"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  limit, doc, updateDoc
} from "firebase/firestore";
import { Bell, X, Heart, UserPlus, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function NotificationDisplay() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", user.uid),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      const sorted = fetched.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate()?.getTime() || 0;
        const dateB = b.createdAt?.toDate()?.getTime() || 0;
        return dateB - dateA;
      });

      setNotifications(sorted);
      setUnreadCount(sorted.filter((n: any) => !n.isRead).length);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string, path: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { isRead: true });
      if (path) router.push(path);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  /* ─── icon helper ─── */
  const iconFor = (type: string) => {
    if (type === "follow") return <UserPlus className="w-5 h-5" />;
    if (type === "like")   return <Heart    className="w-5 h-5" />;
    return                        <MessageCircle className="w-5 h-5" />;
  };

  const bgFor = (type: string) => {
    if (type === "follow") return { background: "#dbeafe", color: "#2563eb" };
    if (type === "like")   return { background: "#fee2e2", color: "#dc2626" };
    return                        { background: "#dcfce7", color: "#16a34a" };
  };

  /* ─── styles (all !important via inline style objects) ─── */
  const wrapperStyle: React.CSSProperties = {
    position:        "fixed",
    top:             "80px",
    right:           "20px",
    width:           "350px",
    maxWidth:        "90vw",
    background:      "white",
    border:          "1px solid #ddd",
    boxShadow:       "0 10px 25px rgba(0,0,0,0.2)",
    zIndex:          99999,
    display:         "flex",
    flexDirection:   "column",
    height:          "auto",
    maxHeight:       "70vh",
    overflowY:       "auto",
    padding:         "20px",
    borderRadius:    "20px",
  };

  const textStyle: React.CSSProperties = {
    whiteSpace: "pre-wrap",
    wordWrap:   "break-word",
    overflowWrap: "break-word",
    color:      "#111",
    fontSize:   "14px",
    fontWeight: "600",
    lineHeight: "1.5",
    textAlign:  "right",
    margin:     0,
  };

  const subTextStyle: React.CSSProperties = {
    whiteSpace: "pre-wrap",
    wordWrap:   "break-word",
    overflowWrap: "break-word",
    color:      "#9ca3af",
    fontSize:   "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin:     0,
    marginTop:  "2px",
  };

  return (
    <>
      {/* ── Bell trigger ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{ position: "relative", padding: "12px", cursor: "pointer", background: "none", border: "none" }}
      >
        <Bell
          className="w-6 h-6"
          style={{ color: unreadCount > 0 ? "var(--primary, #a855f7)" : "rgba(255,255,255,0.4)" }}
        />
        {unreadCount > 0 && (
          <span style={{
            position:       "absolute",
            top:            "8px",
            right:          "8px",
            minWidth:       "20px",
            height:         "20px",
            background:     "var(--primary, #a855f7)",
            color:          "white",
            fontSize:       "10px",
            fontWeight:     "900",
            borderRadius:   "999px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            border:         "2px solid #0a0a0a",
            padding:        "0 3px",
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* ── Floating panel ── */}
      {isOpen && (
        <>
          {/* backdrop (mobile) */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 99998,
            }}
          />

          {/* panel */}
          <div style={wrapperStyle}>

            {/* header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.08em", color: "#111" }}>
                الإشعارات
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                style={{ padding: "6px", borderRadius: "999px", border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X className="w-4 h-4" style={{ color: "#6b7280" }} />
              </button>
            </div>

            {/* list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id, n.link)}
                    style={{
                      display:         "flex",
                      alignItems:      "flex-start",
                      gap:             "12px",
                      padding:         "14px",
                      borderRadius:    "14px",
                      border:          n.isRead ? "1px solid #f3f4f6" : "1px solid #e5e7eb",
                      background:      n.isRead ? "#fafafa" : "white",
                      opacity:         n.isRead ? 0.5 : 1,
                      cursor:          "pointer",
                      textAlign:       "right",
                      width:           "100%",
                      boxShadow:       n.isRead ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* icon */}
                    <div style={{
                      width:           "40px",
                      height:          "40px",
                      borderRadius:    "12px",
                      display:         "flex",
                      alignItems:      "center",
                      justifyContent:  "center",
                      flexShrink:      0,
                      ...bgFor(n.type),
                    }}>
                      {iconFor(n.type)}
                    </div>

                    {/* text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={textStyle}>
                        {n.senderName}&nbsp;{n.text}
                      </p>
                      <p style={subTextStyle}>
                        {n.createdAt?.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    {/* unread badge */}
                    {!n.isRead && (
                      <span style={{
                        flexShrink:     0,
                        fontSize:       "9px",
                        fontWeight:     "900",
                        textTransform:  "uppercase",
                        color:          "var(--primary, #a855f7)",
                        background:     "rgba(168,85,247,0.1)",
                        padding:        "2px 8px",
                        borderRadius:   "999px",
                        whiteSpace:     "nowrap",
                      }}>
                        جديد
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div style={{ padding: "48px 0", textAlign: "center", opacity: 0.3 }}>
                  <Bell className="w-10 h-10" style={{ margin: "0 auto 8px", display: "block" }} />
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    لا توجد إشعارات
                  </p>
                </div>
              )}
            </div>

            {/* footer */}
            <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "9px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.2em", color: "#d1d5db" }}>
                Snakket Academy OS
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
