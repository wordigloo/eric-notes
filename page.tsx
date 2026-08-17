"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Post = { id: string; title: string; excerpt: string; body: string; date: string; tag: string; color: "peach" | "mint" | "lavender" | "blue" };
type Photo = { id: string; src: string; alt: string };
type Album = { id: string; title: string; note: string; date: string; photos: Photo[] };
type SiteData = { intro: string; posts: Post[]; albums: Album[] };

const seedData: SiteData = {
  intro: "I’m Eric. This is where I keep the things I notice, the ideas I’m working through, and the moments I don’t want to lose.",
  posts: [
    { id: "slow-sunday", title: "The case for a slow Sunday", excerpt: "On toast, half-read books, and leaving a little room in the day.", body: "This morning, the sunlight moved across the kitchen table more slowly than I expected. I made toast, read the same paragraph twice, and decided that was enough progress for a Sunday.\n\nThere is a particular kind of clarity that appears when the day is not packed too tightly. I would like to leave more room for it.", date: "10 August 2026", tag: "Everyday", color: "peach" },
    { id: "blue-hour", title: "Notes from the blue hour", excerpt: "A walk at dusk, when the familiar street briefly became somewhere else.", body: "At dusk the whole street seemed to pause between colours. Porch lights came on one by one. A magpie finished its song.\n\nI took the long way home, mostly so the evening would last a little longer.", date: "3 August 2026", tag: "Wandering", color: "blue" },
    { id: "small-things", title: "A list of small, good things", excerpt: "Cold oranges, clean sheets, messages that arrive at exactly the right time.", body: "Cold oranges. Clean sheets. The first sip of tea. Finding a forgotten note in a coat pocket. A message that arrives at exactly the right time.\n\nA life is made of very small things, repeated with care.", date: "24 July 2026", tag: "Lists", color: "mint" }
  ],
  albums: [
    { id: "coast", title: "Along the coast", note: "Windy afternoons, salt in the air, nowhere else to be.", date: "July 2026", photos: [] },
    { id: "home", title: "At home lately", note: "Quiet evidence of an ordinary week.", date: "June 2026", photos: [] }
  ]
};

const STORAGE_KEY = "pastel-pages-data-v1";
const palette: Post["color"][] = ["peach", "mint", "lavender", "blue"];
const slugify = (value: string) => `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
const formatDate = (value: string) => value ? new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`)) : new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(new Date());
const previewText = (post: Post) => {
  const sentences = post.body.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return sentences.slice(0, 3).join(" ").trim() || post.excerpt;
};

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image"));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [data, setData] = useState<SiteData>(() => {
    if (typeof window === "undefined") return seedData;
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") || seedData; }
    catch { return seedData; }
  });
  const [studioOpen, setStudioOpen] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activeCategory, setActiveCategory] = useState("All writing");
  const [editorTab, setEditorTab] = useState<"write" | "photos" | "settings">("write");
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState({ title: "", excerpt: "", body: "", tag: "Journal", date: "" });
  const [albumDraft, setAlbumDraft] = useState({ title: "", note: "", date: "" });
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const local = window.localStorage.getItem(STORAGE_KEY);
      if (local) return;
    } catch { /* use bundled content */ }
    fetch("./content.json").then((r) => r.ok ? r.json() : Promise.reject()).then((content: SiteData) => {
      if (content.posts.length || content.albums.length) setData(content);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!studioOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setStudioOpen(false); };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [studioOpen]);

  const updateData = (next: SiteData) => {
    setData(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSaved(true); window.setTimeout(() => setSaved(false), 1800); }
    catch { window.alert("Your browser is out of local storage. Download a backup, then remove a few large photos."); }
  };

  const addPost = () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    const post: Post = { id: slugify(draft.title), title: draft.title.trim(), excerpt: draft.excerpt.trim() || draft.body.trim().slice(0, 120), body: draft.body.trim(), date: formatDate(draft.date), tag: draft.tag.trim() || "Journal", color: palette[data.posts.length % palette.length] };
    updateData({ ...data, posts: [post, ...data.posts] });
    setDraft({ title: "", excerpt: "", body: "", tag: "Journal", date: "" });
  };

  const selectPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const photos = await Promise.all(Array.from(event.target.files ?? []).slice(0, 8).map(async (file) => ({ id: slugify(file.name), src: await resizeImage(file), alt: file.name.replace(/\.[^.]+$/, "") })));
    setPendingPhotos((current) => [...current, ...photos].slice(0, 8)); event.target.value = "";
  };

  const addAlbum = () => {
    if (!albumDraft.title.trim() || !pendingPhotos.length) return;
    const album: Album = { id: slugify(albumDraft.title), title: albumDraft.title.trim(), note: albumDraft.note.trim(), date: albumDraft.date ? formatDate(albumDraft.date) : "Recently", photos: pendingPhotos };
    updateData({ ...data, albums: [album, ...data.albums] }); setAlbumDraft({ title: "", note: "", date: "" }); setPendingPhotos([]);
  };

  const exportContent = () => {
    const href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = href; link.download = "content.json"; link.click(); URL.revokeObjectURL(href);
  };

  const importContent = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const imported = JSON.parse(String(reader.result)) as SiteData; if (!Array.isArray(imported.posts) || !Array.isArray(imported.albums)) throw new Error(); updateData(imported); } catch { window.alert("That file does not look like Pastel Pages content."); } };
    reader.readAsText(file); event.target.value = "";
  };

  const categories = useMemo(() => {
    const counts = data.posts.reduce<Record<string, number>>((all, post) => ({ ...all, [post.tag]: (all[post.tag] ?? 0) + 1 }), {});
    return [{ name: "All writing", count: data.posts.length }, ...Object.entries(counts).map(([name, count]) => ({ name, count }))];
  }, [data.posts]);
  const posts = useMemo(() => activeCategory === "All writing" ? data.posts : data.posts.filter((post) => post.tag === activeCategory), [activeCategory, data.posts]);

  return <main id="top">
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Eric Pan home"><span className="mark">e</span><span>Eric Pan</span></a>
      <nav aria-label="Main navigation"><a href="#writing">Writing</a><a href="#albums">Photos</a></nav>
      <button className="studio-button" onClick={() => setStudioOpen(true)}><span aria-hidden="true">✦</span> Open studio</button>
    </header>

    <section className="journal-home" id="writing">
      <div className="writing-column">
        <div className="personal-intro">
          <p className="eyebrow">Eric’s notebook</p>
          <h1>Writing</h1>
          <p>{data.intro}</p>
        </div>
        <div className="writing-list" aria-live="polite">
          {posts.map((post) => <article className="writing-item" key={post.id}>
            <button onClick={() => setActivePost(post)} aria-label={`Read ${post.title}`}>
              <span className="published-date">{post.date}</span>
              <h2>{post.title}</h2>
              <p>{previewText(post)}</p>
              <span className="entry-footer"><span>{post.tag}</span><span>Continue reading →</span></span>
            </button>
          </article>)}
          {posts.length === 0 && <p className="empty-state">No writing in this category yet.</p>}
        </div>
      </div>
      <aside className="category-sidebar" aria-label="Writing categories">
        <div className="sidebar-card">
          <p className="sidebar-label">Categories</p>
          <div className="category-list">
            {categories.map((category) => <button key={category.name} className={activeCategory === category.name ? "active" : ""} onClick={() => setActiveCategory(category.name)}><span>{category.name}</span><small>{category.count}</small></button>)}
          </div>
        </div>
        <div className="sidebar-note">
          <span className="sidebar-monogram">E</span>
          <div><strong>I’m Eric.</strong><p>I write here about ordinary days, things I notice, and ideas I want to remember.</p></div>
        </div>
        <button className="sidebar-write" onClick={() => { setEditorTab("write"); setStudioOpen(true); }}>✦ Write a new entry</button>
      </aside>
    </section>

    <section className="section album-section" id="albums">
      <div className="section-heading"><div><p className="eyebrow">Away from the page</p><h2>Photographs</h2></div><button className="quiet-button" onClick={() => { setEditorTab("photos"); setStudioOpen(true); }}>Add an album</button></div>
      <div className="album-grid">{data.albums.map((album, albumIndex) => <article className="album-card" key={album.id}><div className={`album-cover cover-${albumIndex % 4}`}>{album.photos.length ? <div className="photo-mosaic">{album.photos.slice(0, 4).map((photo) => <img key={photo.id} src={photo.src} alt={photo.alt} />)}</div> : <div className="placeholder-scene"><span className="sun" /><span className="hill one" /><span className="hill two" /></div>}<span className="photo-count">{album.photos.length || "Add"} {album.photos.length === 1 ? "photo" : "photos"}</span></div><div className="album-copy"><span>{album.date}</span><h3>{album.title}</h3><p>{album.note}</p></div></article>)}</div>
    </section>

    {activePost && <div className="modal-backdrop" role="presentation" onMouseDown={() => setActivePost(null)}><article className="reading-modal" role="dialog" aria-modal="true" aria-labelledby="reading-title" onMouseDown={(event) => event.stopPropagation()}><button className="close-button" onClick={() => setActivePost(null)} aria-label="Close post">×</button><p className="eyebrow">{activePost.tag} · {activePost.date}</p><h2 id="reading-title">{activePost.title}</h2><div className="post-body">{activePost.body.split("\n").map((line, index) => line ? <p key={index}>{line}</p> : <br key={index} />)}</div></article></div>}

    {studioOpen && <div className="studio-shell" role="dialog" aria-modal="true" aria-labelledby="studio-title">
      <div className="studio-topbar"><div><span className="studio-dot" /><strong id="studio-title">Eric’s Studio</strong><span className="save-state">{saved ? "Saved on this device" : "Private editing space"}</span></div><button className="close-button" onClick={() => setStudioOpen(false)} aria-label="Close studio">×</button></div>
      <div className="studio-layout"><aside><button className={editorTab === "write" ? "active" : ""} onClick={() => setEditorTab("write")}><span>✎</span> New writing</button><button className={editorTab === "photos" ? "active" : ""} onClick={() => setEditorTab("photos")}><span>▧</span> Photo album</button><button className={editorTab === "settings" ? "active" : ""} onClick={() => setEditorTab("settings")}><span>↥</span> Publish &amp; backup</button><p>Your edits stay in this browser until you download and publish your content file.</p></aside>
        <div className="studio-content">
          {editorTab === "write" && <div className="editor-panel"><p className="eyebrow">New journal entry</p><h2>What’s on your mind?</h2><label>Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="A title for this thought" /></label><div className="field-row"><label>Topic<input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} /></label><label>Date<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label></div><label>Short introduction<input value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} placeholder="One or two lines for the journal card" /></label><label>Your writing<textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Begin wherever you are…" /></label><div className="editor-actions"><span>{draft.body.length} characters</span><button onClick={addPost} disabled={!draft.title.trim() || !draft.body.trim()}>Save entry</button></div></div>}
          {editorTab === "photos" && <div className="editor-panel"><p className="eyebrow">New collection</p><h2>Make a photo album</h2><div className="field-row"><label>Album title<input value={albumDraft.title} onChange={(e) => setAlbumDraft({ ...albumDraft, title: e.target.value })} placeholder="A weekend away" /></label><label>Date<input type="date" value={albumDraft.date} onChange={(e) => setAlbumDraft({ ...albumDraft, date: e.target.value })} /></label></div><label>A small note<input value={albumDraft.note} onChange={(e) => setAlbumDraft({ ...albumDraft, note: e.target.value })} placeholder="What would you like to remember?" /></label><input ref={fileInput} hidden type="file" accept="image/*" multiple onChange={selectPhotos} /><button className="drop-zone" onClick={() => fileInput.current?.click()}><span>＋</span><strong>Choose photographs</strong><small>Up to 8 images at a time · resized gently for the web</small></button>{pendingPhotos.length > 0 && <div className="pending-grid">{pendingPhotos.map((photo) => <img key={photo.id} src={photo.src} alt={photo.alt} />)}</div>}<div className="editor-actions"><span>{pendingPhotos.length} selected</span><button onClick={addAlbum} disabled={!albumDraft.title.trim() || !pendingPhotos.length}>Save album</button></div></div>}
          {editorTab === "settings" && <div className="editor-panel publish-panel"><p className="eyebrow">Take it with you</p><h2>Publish &amp; backup</h2><p>Download one <code>content.json</code> file containing your writing and compressed photographs. Keep it as a backup, or replace the file in your GitHub repository to publish the changes for everyone.</p><div className="publish-card"><span>↓</span><div><strong>Download current content</strong><small>Includes {data.posts.length} entries and {data.albums.length} albums</small></div><button onClick={exportContent}>Download</button></div><div className="publish-card"><span>↑</span><div><strong>Restore a content file</strong><small>Import a previous backup on this device</small></div><button onClick={() => importInput.current?.click()}>Import</button></div><input ref={importInput} hidden type="file" accept="application/json" onChange={importContent} /><div className="github-note"><strong>For GitHub Pages</strong><ol><li>Download the content file.</li><li>Replace <code>public/content.json</code> in your repository.</li><li>Commit the change; the included workflow republishes the site.</li></ol></div></div>}
        </div>
      </div>
    </div>}
  </main>;
}
