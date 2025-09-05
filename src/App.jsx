import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8080";

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} - ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

export default function App() {
  const [email, setEmail] = useState("you@example.com");
  const [password, setPassword] = useState("pass123");
  const [token, setToken] = useState(localStorage.getItem("jwt") || "");
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!token) return;
    refresh();
  }, [token]);

  async function loginOrRegister(type) {
    try {
      const data = await api(`/auth/${type}`, {
        method: "POST",
        body: { email, password },
      });
      localStorage.setItem("jwt", data.access_token);
      setToken(data.access_token);
      setInfo(`${type} success`);
    } catch (e) {
      setInfo(e.message);
    }
  }

  async function refresh() {
    try {
      const data = await api("/notes", { token });
      setNotes(data);
      setInfo(`loaded ${data.length} note(s)`);
    } catch (e) {
      setInfo(e.message);
    }
  }

  async function createNote() {
    if (!title.trim()) return;
    try {
      const n = await api("/notes", { method: "POST", token, body: { title, content } });
      setTitle(""); setContent("");
      setNotes([n, ...notes]);
    } catch (e) { setInfo(e.message); }
  }

  async function updateNote(id, patch) {
    try {
      const n = await api(`/notes/${id}`, { method: "PATCH", token, body: patch });
      setNotes(notes.map(x => x.id === id ? n : x));
    } catch (e) { setInfo(e.message); }
  }

  async function deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    try {
      await api(`/notes/${id}`, { method: "DELETE", token });
      setNotes(notes.filter(x => x.id !== id));
    } catch (e) { setInfo(e.message); }
  }

  async function publish(id) {
    try {
      const n = await api(`/notes/${id}/share`, { method: "POST", token });
      setNotes(notes.map(x => x.id === id ? n : x));
      const link = `${API}/share/${n.share_token}`;
      await navigator.clipboard?.writeText(link).catch(() => {});
      alert(`Public link copied:\n${link}`);
    } catch (e) { setInfo(e.message); }
  }

  function logout() {
    localStorage.removeItem("jwt"); setToken(""); setNotes([]); setInfo("logged out");
  }

  const styles = {
    page: { fontFamily: "system-ui, Arial", maxWidth: 900, margin: "20px auto", padding: 16 },
    card: { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 12 },
    row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
    input: { padding: 8, borderRadius: 8, border: "1px solid #ccc" },
    ta: { padding: 8, borderRadius: 8, border: "1px solid #ccc", width: "100%", minHeight: 80 },
    btn: { padding: "8px 12px", border: "1px solid #333", borderRadius: 10, background: "white", cursor: "pointer" },
    small: { color: "#666", fontSize: 12 },
    h: { margin: "16px 0 8px" }
  };

  return (
    <div style={styles.page}>
      <h1>Notes App</h1>
      <p style={styles.small}>API: {API}</p>

      {!token ? (
        <div style={styles.card}>
          <h3>Login / Register</h3>
          <div style={styles.row}>
            <input style={styles.input} placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input style={styles.input} placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            <button style={styles.btn} onClick={()=>loginOrRegister("login")}>Login</button>
            <button style={styles.btn} onClick={()=>loginOrRegister("register")}>Register</button>
          </div>
          <div style={{marginTop:8}}>{info}</div>
        </div>
      ) : (
        <>
          <div style={styles.card}>
            <div style={styles.row}>
              <button style={styles.btn} onClick={logout}>Logout</button>
              <button style={styles.btn} onClick={refresh}>Refresh</button>
              <span>{info}</span>
            </div>
            <h3 style={styles.h}>Create Note</h3>
            <div style={{display:"grid", gap:8}}>
              <input style={styles.input} placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
              <textarea style={styles.ta} placeholder="Content" value={content} onChange={e=>setContent(e.target.value)} />
              <div style={styles.row}>
                <button style={styles.btn} onClick={createNote}>Create</button>
              </div>
            </div>
          </div>

          {notes.map(n => (
            <div key={n.id} style={styles.card}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <h3 style={{margin:0}}>{n.title}</h3>
                <div style={styles.row}>
                  <button style={styles.btn} onClick={()=>publish(n.id)}>Publish</button>
                  <button style={styles.btn} onClick={()=>updateNote(n.id, { is_public: false })}>Unpublish</button>
                  <button style={styles.btn} onClick={()=>deleteNote(n.id)}>Delete</button>
                </div>
              </div>
              <p>{n.content}</p>
              <div style={styles.small}>
                {n.is_public ? (
                  <>
                    Public • <a href={`${API}/share/${n.share_token}`} target="_blank">Open share link</a>
                  </>
                ) : "Private"}
              </div>
              <div style={styles.row}>
                <button style={styles.btn} onClick={()=>{
                  const newTitle = prompt("New title", n.title);
                  if (newTitle!=null) updateNote(n.id, { title: newTitle });
                }}>Rename</button>
                <button style={styles.btn} onClick={()=>{
                  const newContent = prompt("New content", n.content ?? "");
                  if (newContent!=null) updateNote(n.id, { content: newContent });
                }}>Edit Content</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
