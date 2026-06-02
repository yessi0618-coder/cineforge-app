import { useState, useRef, useCallback, useEffect } from "react";

const STEP_LABELS = ["Setup", "Script & Voice", "Style", "Build", "Export"];

const EL_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",  desc: "Calm · Narration"      },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",    desc: "Deep · Documentary"    },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",    desc: "Warm · Professional"   },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",    desc: "Strong · Confident"    },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",   desc: "Soft · Warm"           },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold",  desc: "Crisp · Authoritative" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli",    desc: "Emotional · Young"     },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam",     desc: "Raspy · Bold"          },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni",  desc: "Well-Rounded · Clear"  },
];

const SUBTITLE_STYLES = [
  { id:"bold",    label:"Bold Yellow", color:"#FFE600", bg:"transparent",      font:"900 28px Arial Black",    stroke:"#000",    strokeW:4 },
  { id:"minimal", label:"Minimal",     color:"#ffffff", bg:"rgba(0,0,0,0.6)",  font:"700 24px Arial",          stroke:null,      strokeW:0 },
  { id:"cinema",  label:"Cinema",      color:"#ffffff", bg:"rgba(0,0,0,0.72)", font:"italic 700 24px Georgia", stroke:null,      strokeW:0 },
  { id:"neon",    label:"Neon",        color:"#00FFCC", bg:"transparent",      font:"700 24px Courier New",    stroke:"#003d30", strokeW:3 },
  { id:"clean",   label:"Clean",       color:"#ffffff", bg:"transparent",      font:"700 26px Helvetica",      stroke:"#111",    strokeW:3 },
];

const OVERLAY_STYLES = [
  { id:"none",  label:"None"           },
  { id:"dark",  label:"Dark Vignette"  },
  { id:"bars",  label:"Cinematic Bars" },
  { id:"grain", label:"Film Grain"     },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseScenes(script) {
  const stopWords = new Set(["the","and","that","this","with","from","have","will","what","when","they","their","there","been","were","your","into","about","which","more","also","than","then","some","over","just","like","these","those","such","very","well","would","could","should","after","before","through","because","while","both","each","most","other","many","only","even","back","still","being","make","made","take","come","get","one","two","three","four","five","its","our","for","are","but","not","was","all","can","had","has","you","it","we","in","of","to","a","an","is","as","at","be","by","do","if","no","on","or","so","up"]);
  return script.split(/\n{2,}/).map(p=>p.trim()).filter(p=>p.length>15).map((text,i)=>{
    const words = text.replace(/[^a-zA-Z ]/g," ").split(/\s+/).filter(w=>w.length>4&&!stopWords.has(w.toLowerCase()));
    const query = [...new Set(words)].slice(0,3).join(" ") || "nature landscape";
    return { id:i, text, query };
  });
}

function buildSubChunks(text, duration) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for(let i=0;i<words.length;i+=5) chunks.push(words.slice(i,i+5).join(" "));
  const dur = duration / Math.max(chunks.length,1);
  return chunks.map((t,i)=>({ text:t, start:i*dur, end:(i+1)*dur }));
}

// ── Pexels Image Fetcher via Vercel Proxy ────────────────────────────────────
const PROXY_BASE = "https://cineforge-proxy.vercel.app/api/pexels";

async function loadImageForCanvas(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => resolve(null), 10000);
  });
}

// Load a local file (user-uploaded image or video) as object URL
function loadLocalMedia(file) {
  return URL.createObjectURL(file);
}

async function fetchSceneImage(query) {
  const queries = [
    query,
    query.split(" ").slice(0, 2).join(" "),
    "nature landscape background",
  ];
  for (const q of queries) {
    try {
      const url = `${PROXY_BASE}?query=${encodeURIComponent(q)}&per_page=8&orientation=landscape&size=large`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) continue;
      const data = await r.json();
      const photos = data.photos || [];
      for (const p of photos) {
        const src = p.src?.large2x || p.src?.large || p.src?.medium;
        if (!src) continue;
        const img = await loadImageForCanvas(src);
        if (img && img.naturalWidth > 0) {
          return { type:"pexels", img, url: src, photographer: p.photographer };
        }
      }
    } catch (e) { continue; }
  }
  return null;
}

// Fallback cinematic background when no image is available
function drawCinematicBg(ctx, sceneIdx) {
  const W = 1280, H = 720;
  const hues = [210, 230, 195, 250, 200, 220, 240, 215, 205, 235, 190, 260];
  const h = hues[sceneIdx % hues.length];
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, `hsl(${h},35%,8%)`);
  g.addColorStop(0.5, `hsl(${h+15},30%,13%)`);
  g.addColorStop(1, `hsl(${h+30},25%,10%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Subtle radial glow
  const glow = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.4, 480);
  glow.addColorStop(0, `hsla(${h+20},60%,40%,0.12)`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
}

// Compute scene time ranges from split points or word-count distribution
function computeSceneRanges(totalDur, sceneTexts, customSplits) {
  const n = sceneTexts.length;
  if (!n || !totalDur) return [];
  // Use custom splits if provided and valid
  if (customSplits && customSplits.length === n) {
    return customSplits.map((start, i) => ({
      start,
      end: i < n - 1 ? customSplits[i + 1] : totalDur,
      dur: (i < n - 1 ? customSplits[i + 1] : totalDur) - start,
    }));
  }
  // Auto: distribute by word count
  const wc = sceneTexts.map(t => t.split(/\s+/).filter(Boolean).length);
  const tw = wc.reduce((a, b) => a + b, 0) || 1;
  let cursor = 0;
  return wc.map(w => {
    const dur = (w / tw) * totalDur;
    const range = { start: cursor, end: cursor + dur, dur };
    cursor += dur;
    return range;
  });
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${ms}`;
}

function roundRect(ctx,x,y,w,h,r=6){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawImageCover(ctx, img, pan=0) {
  const cw=1280,ch=720,iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  if(!iw||!ih) return;
  const scale=Math.max(cw/iw,ch/ih)*1.06;
  const sw=iw*scale,sh=ih*scale;
  const ox=(cw-sw)/2 + pan;
  const oy=(ch-sh)/2;
  ctx.drawImage(img,ox,oy,sw,sh);
}

function drawSubtitle(ctx, text, style, hasBars) {
  if(!text) return;
  ctx.save(); ctx.font=style.font; ctx.textAlign="center";
  const w=ctx.measureText(text).width+48; const h=44;
  const y=hasBars?618:660;
  if(style.bg!=="transparent"){ ctx.fillStyle=style.bg; roundRect(ctx,640-w/2,y-h+10,w,h,8); ctx.fill(); }
  if(style.stroke){ ctx.lineWidth=style.strokeW; ctx.strokeStyle=style.stroke; ctx.lineJoin="round"; ctx.strokeText(text,640,y); }
  ctx.fillStyle=style.color; ctx.fillText(text,640,y); ctx.restore();
}

function applyOverlay(ctx,type,frame){
  if(type==="dark"){ const g=ctx.createRadialGradient(640,360,180,640,360,760); g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,0.55)"); ctx.fillStyle=g; ctx.fillRect(0,0,1280,720); }
  if(type==="bars"){ ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,1280,88); ctx.fillRect(0,632,1280,88); }
  if(type==="grain"){ for(let i=0;i<300;i++){ const x=((Math.sin(i*127.1+frame*311.7)*0.5+0.5))*1280,y=((Math.sin(i*311.7+frame*74.7)*0.5+0.5))*720; ctx.fillStyle=`rgba(255,255,255,${0.02+Math.sin(i+frame)*0.015})`; ctx.fillRect(x,y,1.5,1.5); } }
}

function drawGradientBg(ctx, idx) {
  const hues = [210,230,200,250,195,220,240,215,205];
  const h = hues[idx % hues.length];
  const g = ctx.createLinearGradient(0,0,1280,720);
  g.addColorStop(0,`hsl(${h},35%,10%)`); g.addColorStop(1,`hsl(${h+20},30%,18%)`);
  ctx.fillStyle=g; ctx.fillRect(0,0,1280,720);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Label({children}){ return <div style={{color:"#556",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:7,fontWeight:700}}>{children}</div>; }
function InfoBox({icon="ℹ️",color="#4f8ef7",children}){ return <div style={{background:color+"12",border:`1px solid ${color}28`,borderRadius:10,padding:"11px 15px",display:"flex",gap:10,marginBottom:14}}><span>{icon}</span><span style={{color:"#8090a0",fontSize:12,lineHeight:1.65}}>{children}</span></div>; }
function ErrBox({children}){ return <div style={{background:"#2a0808",border:"1px solid #f8717140",borderRadius:10,padding:"10px 15px",color:"#f87171",fontSize:13,marginTop:10}}>⚠ {children}</div>; }
function NavBtn({onClick,disabled,children,variant="primary"}){
  const p=variant==="primary";
  return <button onClick={onClick} disabled={disabled} style={{flex:p?1:undefined,padding:"13px 20px",background:disabled?"#0d0d10":p?"linear-gradient(135deg,#1a2040,#28103a)":"#0d0d10",border:`1px solid ${disabled?"#1a1a22":p?"#5060c060":"#1e1e2a"}`,borderRadius:10,cursor:disabled?"not-allowed":"pointer",color:disabled?"#333":p?"#90a8f0":"#556",fontWeight:700,fontSize:14,fontFamily:"inherit",transition:"all .2s"}}>{children}</button>;
}
function ProgBar({pct,color="#4f8ef7"}){ return <div style={{background:"#111118",borderRadius:4,height:6,overflow:"hidden",marginTop:6}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color},${color}80)`,borderRadius:4,transition:"width .5s ease"}}/></div>; }
function KeyField({label,link,linkLabel,value,onChange,hint,show,onToggle,placeholder}){
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{color:"#556",fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>{label}</div>
        {link&&<a href={link} target="_blank" rel="noreferrer" style={{color:"#4f8ef7",fontSize:11}}>{linkLabel} ↗</a>}
      </div>
      <div style={{position:"relative"}}>
        <input type={show?"text":"password"} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Paste your key"}
          style={{width:"100%",background:"#0d0d10",border:"1px solid #1e1e2a",borderRadius:10,padding:"11px 48px 11px 14px",color:"#d0d0e0",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
        <button onClick={onToggle} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#445",cursor:"pointer",fontSize:14}}>{show?"🙈":"👁"}</button>
      </div>
      {hint&&<div style={{color:"#2a3a4a",fontSize:11,marginTop:5}}>{hint}</div>}
    </div>
  );
}

const iStyle = (ex={}) => ({width:"100%",background:"#0d0d10",border:"1px solid #1e1e2a",borderRadius:10,padding:"11px 14px",color:"#d0d0e0",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",...ex});
const modeBtn = (active,color="#4f8ef7") => ({flex:1,padding:"11px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,background:active?color+"22":"#0d0d10",border:`1.5px solid ${active?color:"#1e1e2a"}`,color:active?color:"#445",fontFamily:"inherit",transition:"all .2s"});

// ── Scene preview card with image swap + upload ──────────────────────────────
function ScenePreviewCard({ scene, idx, result, onSwap }) {
  const [searching, setSearching]       = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [showSearch, setShowSearch]     = useState(false);
  const [showUpload, setShowUpload]     = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError]   = useState("");

  const isWaiting  = !result;
  const isUpload   = result?.type === "upload";
  const isFallback = result?.type === "fallback";
  const hasMedia   = result?.img || result?.videoUrl;
  const statusColor = isWaiting ? "#4f8ef7" : isUpload ? "#FB923C" : hasMedia ? "#00C896" : "#f59e0b";

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchError(""); setSearchResults([]);
    try {
      const url = `${PROXY_BASE}?query=${encodeURIComponent(searchQuery)}&per_page=9&orientation=landscape&size=large`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Search failed — check proxy");
      const data = await r.json();
      setSearchResults(data.photos || []);
      if ((data.photos||[]).length === 0) setSearchError("No results — try different keywords");
    } catch(e) { setSearchError(e.message); }
    setSearching(false);
  };

  const pickPhoto = async (photo) => {
    const src = photo.src?.large2x || photo.src?.large || photo.src?.medium;
    if (!src) return;
    const img = await loadImageForCanvas(src);
    if (img) {
      onSwap(idx, { type:"pexels", img, url: src, photographer: photo.photographer });
      setShowSearch(false); setSearchResults([]); setSearchQuery("");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return;
    const url = URL.createObjectURL(file);
    if (isVideo) {
      onSwap(idx, { type:"upload", img:null, videoUrl:url, videoFile:file, photographer:`📁 ${file.name}` });
    } else {
      const img = new Image();
      img.onload = () => onSwap(idx, { type:"upload", img, url, videoUrl:null, photographer:`📁 ${file.name}` });
      img.src = url;
    }
    setShowUpload(false);
  };

  // Thumbnail to show
  const thumbSrc = isUpload && result.videoUrl
    ? null  // video — show icon
    : result?.url || null;

  return (
    <div style={{background:"#0d0d12",border:`1px solid ${statusColor}30`,borderRadius:12,overflow:"hidden",transition:"border-color .3s"}}>
      {/* Thumbnail */}
      <div style={{height:100,background:"#0a0a10",position:"relative",overflow:"hidden"}}>
        {isWaiting && (
          <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
            <div style={{width:20,height:20,border:"2px solid #4f8ef740",borderTop:"2px solid #4f8ef7",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            <span style={{color:"#334",fontSize:10}}>Fetching...</span>
          </div>
        )}
        {!isWaiting && isUpload && result.videoUrl && (
          <div style={{width:"100%",height:"100%",background:"#0a0a18",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
            <span style={{fontSize:28}}>🎬</span>
            <span style={{color:"#FB923C",fontSize:10,fontWeight:600}}>Custom Video</span>
          </div>
        )}
        {!isWaiting && thumbSrc && (
          <img src={thumbSrc} alt="" crossOrigin="anonymous"
            style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.9}}
            onError={e=>{e.target.style.display="none";}}/>
        )}
        {!isWaiting && isFallback && !thumbSrc && (
          <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,hsl(${210+idx*20},35%,10%),hsl(${230+idx*20},30%,18%))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#334"}}>🎨</div>
        )}
        {/* Badge */}
        <div style={{position:"absolute",top:6,left:6,background:"rgba(0,0,0,0.78)",borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:700,color:"#ccc"}}>SC{String(idx+1).padStart(2,"0")}</div>
        {/* Action buttons */}
        {!isWaiting && (
          <div style={{position:"absolute",top:6,right:6,display:"flex",gap:4}}>
            <button onClick={()=>{setShowUpload(s=>!s);setShowSearch(false);}} title="Upload your own image or video"
              style={{background:"rgba(0,0,0,0.78)",border:"1px solid #FB923C60",borderRadius:5,padding:"3px 7px",fontSize:10,color:"#FB923C",cursor:"pointer",fontFamily:"inherit"}}>⬆ Upload</button>
            <button onClick={()=>{setShowSearch(s=>!s);setShowUpload(false);}} title="Search Pexels"
              style={{background:"rgba(0,0,0,0.78)",border:"1px solid #ffffff30",borderRadius:5,padding:"3px 7px",fontSize:10,color:"#ccc",cursor:"pointer",fontFamily:"inherit"}}>🔄 Swap</button>
          </div>
        )}
        {hasMedia && !isWaiting && <div style={{position:"absolute",bottom:0,left:0,right:0,height:22,background:"linear-gradient(transparent,rgba(0,0,0,0.7))"}}/>}
      </div>

      {/* Info row */}
      <div style={{padding:"7px 10px"}}>
        <div style={{color:"#445",fontSize:10,fontFamily:"monospace",marginBottom:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>"{scene.query}"</div>
        <div style={{color:statusColor,fontSize:10,fontWeight:600,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
          {isWaiting ? "⏳ Fetching from Pexels..." : isUpload ? `✓ ${result.photographer}` : hasMedia ? `✓ ${result.photographer}` : "~ gradient fallback"}
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div style={{borderTop:"1px solid #1a1a2a",padding:"10px",background:"#080810"}}>
          <div style={{color:"#778",fontSize:11,fontWeight:600,marginBottom:8}}>Upload your own media for this scene:</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"#0d0d14",border:"1px dashed #FB923C40",borderRadius:8,padding:"12px 8px",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:20}}>🖼</span>
              <span style={{color:"#FB923C",fontSize:11,fontWeight:600}}>Image</span>
              <span style={{color:"#334",fontSize:10}}>JPG, PNG, WEBP</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{display:"none"}}/>
            </label>
            <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"#0d0d14",border:"1px dashed #FB923C40",borderRadius:8,padding:"12px 8px",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:20}}>🎬</span>
              <span style={{color:"#FB923C",fontSize:11,fontWeight:600}}>Video</span>
              <span style={{color:"#334",fontSize:10}}>MP4, MOV, WEBM</span>
              <input type="file" accept="video/*" onChange={handleFileUpload} style={{display:"none"}}/>
            </label>
          </div>
          <button onClick={()=>setShowUpload(false)} style={{background:"none",border:"none",color:"#445",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕ Cancel</button>
        </div>
      )}

      {/* Search panel */}
      {showSearch && (
        <div style={{borderTop:"1px solid #1a1a2a",padding:"10px",background:"#080810"}}>
          <div style={{color:"#778",fontSize:11,fontWeight:600,marginBottom:7}}>Search Pexels for a different image:</div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
              placeholder="e.g. ocean sunset, city night..." style={{flex:1,background:"#0d0d14",border:"1px solid #1e1e2a",borderRadius:7,padding:"7px 10px",color:"#d0d0e0",fontSize:12,fontFamily:"inherit"}}/>
            <button onClick={doSearch} disabled={searching||!searchQuery.trim()} style={{background:"#1a2040",border:"1px solid #4f8ef750",borderRadius:7,padding:"7px 12px",color:"#90a8f0",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>{searching?"...":"Search"}</button>
          </div>
          {searchError && <div style={{color:"#f59e0b",fontSize:11,marginBottom:6}}>{searchError}</div>}
          {searchResults.length > 0 && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
              {searchResults.map(p=>(
                <div key={p.id} onClick={()=>pickPhoto(p)} style={{height:60,borderRadius:6,overflow:"hidden",cursor:"pointer",border:"1px solid #1a1a2a",position:"relative"}}>
                  <img src={p.src?.medium||p.src?.small} alt={p.photographer} style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.85}}/>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.65)",padding:"2px 4px",fontSize:9,color:"#aaa",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{p.photographer}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>{setShowSearch(false);setSearchResults([]);setSearchQuery("");}} style={{marginTop:8,background:"none",border:"none",color:"#445",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕ Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CineForge() {
  const [step, setStep]       = useState(0);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [showAK, setShowAK]   = useState(false);
  const [showEK, setShowEK]   = useState(false);
  const [scriptMode, setScriptMode] = useState("own");
  const [voiceMode, setVoiceMode]   = useState("upload");
  const [voiceId, setVoiceId] = useState(EL_VOICES[0].id);
  const [title, setTitle]     = useState("");
  const [script, setScript]   = useState("");
  // Structured scenes: [{narration, visual}]
  const [structuredScenes, setStructuredScenes] = useState([{narration:"",visual:""}]);
  const [scriptInputMode, setScriptInputMode] = useState("structured"); // "structured" | "plain"
  const [aiBrief, setAiBrief] = useState({topic:"",audience:"General",tone:"Educational"});
  const [genLoading, setGenLoading] = useState(false);
  const [audioFile, setAudioFile]   = useState(null);
  const [audioURL, setAudioURL]     = useState(null);
  const [audioDur, setAudioDur]     = useState(null);
  // Custom audio split points per scene (in seconds). null = auto by word count
  const [splitPoints, setSplitPoints] = useState([]); // array of start times, length = scenes
  const [playingScene, setPlayingScene] = useState(null); // idx of scene being previewed
  const audioPreviewRef = useRef(null);
  const [subStyle, setSubStyle]     = useState("bold");
  const [overlay, setOverlay]       = useState("dark");
  const [showTitleCard, setShowTitleCard] = useState(true);
  // Image prefetch state — shown in build step BEFORE recording starts
  const [sceneImages, setSceneImages]     = useState([]); // array of {img,url,photographer} | null per scene
  const [imagesFetching, setImagesFetching] = useState(false);
  const [imagesFetched, setImagesFetched]   = useState(false);
  const [building, setBuilding]     = useState(false);
  const [buildLog, setBuildLog]     = useState([]);
  const [buildPct, setBuildPct]     = useState(0);
  const [outputURL, setOutputURL]   = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [error, setError]           = useState("");

  const canvasRef = useRef(null);
  const logRef    = useRef(null);
  // Derive final script from structured scenes or plain text
  const derivedScript = scriptInputMode === "structured"
    ? structuredScenes.filter(s=>s.narration.trim()).map(s=>s.narration.trim()).join("\n\n")
    : script;
  const scenes = parseScenes(derivedScript);
  // Build visual queries: use visual field if set, else auto-extract from narration
  const sceneVisuals = scriptInputMode === "structured"
    ? structuredScenes.filter(s=>s.narration.trim()).map(s=>s.visual.trim()||null)
    : scenes.map(()=>null);

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=9999; },[buildLog]);
  const log = msg => setBuildLog(l=>[...l,{t:new Date().toLocaleTimeString("en",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"}),msg}]);

  const setupValid = (scriptMode==="own"||anthropicKey.trim())
    && (voiceMode==="upload"||elevenlabsKey.trim());

  // ── Pre-fetch images when entering build step ──────────────────────────────
  const prefetchImages = async (sceneList) => {
    setImagesFetching(true); setImagesFetched(false);
    // Init with null — cards show spinner immediately
    setSceneImages(new Array(sceneList.length).fill(null));

    // Fetch ALL scenes in parallel — much faster
    const promises = sceneList.map(async (sc, i) => {
      // If user already uploaded media for this scene, keep it
      const existing = sceneImages[i];
      if (existing?.type === "upload") return { idx: i, result: existing };
      const visualQuery = sceneVisuals[i] || sc.query;
      try {
        const result = await fetchSceneImage(visualQuery);
        return { idx: i, result: result || { type:"fallback", img:null, url:null, photographer:"gradient" } };
      } catch(e) {
        return { idx: i, result: { type:"fallback", img:null, url:null, photographer:"error: "+e.message } };
      }
    });

    // Update state as each resolves
    for (const p of promises) {
      p.then(({ idx, result }) => {
        setSceneImages(prev => { const n=[...prev]; n[idx]=result; return n; });
      });
    }
    // Wait for all to finish
    await Promise.all(promises);
    setImagesFetching(false); setImagesFetched(true);
  };

  const goToBuild = async () => {
    setStep(3);
    setError("");
    const sceneList = parseScenes(script);
    if(sceneList.length>0) await prefetchImages(sceneList);
  };

  // ── AI script generation ───────────────────────────────────────────────────
  const generateScript = async () => {
    if(!anthropicKey.trim()){ setError("Anthropic API key required."); return; }
    if(!aiBrief.topic.trim()){ setError("Please enter a topic."); return; }
    setGenLoading(true); setError("");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":anthropicKey.trim(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,messages:[{role:"user",content:`Write a compelling educational video narration script.\n\nTitle: "${title||aiBrief.topic}"\nTopic: ${aiBrief.topic}\nAudience: ${aiBrief.audience}\nTone: ${aiBrief.tone}\nTarget: 5-7 minutes (~700-900 words)\n\nRules:\n- 6-9 paragraphs separated by blank lines\n- Each paragraph = one visual scene (4-8 sentences)\n- Start with a gripping hook\n- Conversational tone, no stage directions or brackets\n- End with a memorable conclusion and CTA\n\nReturn ONLY the narration text, nothing else.`}]})});
      if(!res.ok){ const e=await res.json().catch(()=>{}); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
      const d=await res.json();
      const generatedText = d.content[0].text.trim();
      if (scriptInputMode === "structured") {
        // Parse generated text into structured scenes
        const paras = generatedText.split(/\n{2,}/).map(p=>p.trim()).filter(p=>p.length>10);
        setStructuredScenes(paras.map(p=>({narration:p, visual:""})));
      } else {
        setScript(generatedText);
      }
    }catch(e){ setError("Script generation failed: "+e.message); }
    setGenLoading(false);
  };

  // ── Audio upload ───────────────────────────────────────────────────────────
  const handleAudioDrop = useCallback(e=>{
    e.preventDefault();
    const file=e.dataTransfer?.files?.[0]||e.target?.files?.[0];
    if(!file) return;
    if(!file.type.startsWith("audio/")){ setError("Please upload an audio file (MP3, WAV, M4A, AAC)"); return; }
    setAudioFile(file); const url=URL.createObjectURL(file); setAudioURL(url); setError("");
    const tmp=new Audio(url); tmp.onloadedmetadata=()=>setAudioDur(tmp.duration);
  },[]);

  // ── ElevenLabs TTS ─────────────────────────────────────────────────────────
  const generateElevenLabsAudio = async () => {
    log("🎙 Generating AI voice with ElevenLabs...");
    const fullText=parseScenes(derivedScript).map(s=>s.text).join(" ");
    log(`  Sending ${fullText.length} characters to ElevenLabs...`);
    const res=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,{method:"POST",headers:{"Accept":"audio/mpeg","xi-api-key":elevenlabsKey.trim(),"Content-Type":"application/json"},body:JSON.stringify({text:fullText,model_id:"eleven_flash_v2_5",voice_settings:{stability:0.5,similarity_boost:0.75,style:0.3,use_speaker_boost:true}})});
    if(!res.ok){ const t=await res.text(); let msg=t.slice(0,200); try{const j=JSON.parse(t);msg=j?.detail?.message||j?.detail||msg;}catch(e){} throw new Error(`ElevenLabs: ${msg}`); }
    const blob=await res.blob();
    log(`  ✓ Voice ready — ${(blob.size/1024).toFixed(0)} KB MP3`);
    return blob;
  };

  // ── Main build ─────────────────────────────────────────────────────────────
  const buildVideo = async () => {
    setBuilding(true); setOutputURL(null); setError(""); setBuildLog([]); setBuildPct(0);
    const sceneList=parseScenes(derivedScript);
    if(sceneList.length===0){ setError("No scenes — separate paragraphs with blank lines."); setBuilding(false); return; }
    const total=sceneList.length;
    const subStyleObj=SUBTITLE_STYLES.find(s=>s.id===subStyle);
    const hasBars=overlay==="bars";

    // Use pre-generated canvas backgrounds
    log(`📋 ${total} scenes — backgrounds ready`);
    log(`🖼 Using pre-fetched Pexels images...`);
    const loadedCount2 = sceneImages.filter(r=>r?.img).length;
    log(`  ✓ ${loadedCount2}/${total} Pexels photos ready`);

    // Audio
    setBuildPct(20);
    const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    let decodedAudio=null;
    if(voiceMode==="elevenlabs"){
      try{ const blob=await generateElevenLabsAudio(); const ab=await blob.arrayBuffer(); decodedAudio=await audioCtx.decodeAudioData(ab); log(`  ✓ Audio decoded: ${decodedAudio.duration.toFixed(1)}s`); }
      catch(e){ log(`  ✗ ${e.message}`); setError(e.message); setBuilding(false); await audioCtx.close(); return; }
    } else {
      log("🔊 Decoding voiceover...");
      try{ const ab=await audioFile.arrayBuffer(); decodedAudio=await audioCtx.decodeAudioData(ab); log(`  ✓ Decoded: ${decodedAudio.duration.toFixed(1)}s`); }
      catch(e){ log(`  ✗ ${e.message}`); setError("Could not decode audio. Try MP3 or WAV."); setBuilding(false); await audioCtx.close(); return; }
    }

    const totalDur=decodedAudio.duration;
    log("⏱ Distributing audio across scenes...");
    setBuildPct(28);
    const ranges = computeSceneRanges(totalDur, sceneList.map(s=>s.text), splitPoints.length===sceneList.length?splitPoints:null);
    const sceneDurs = ranges.map(r=>r.dur);
    sceneDurs.forEach((d,i)=>log(`  Scene ${i+1}: ${ranges[i].start.toFixed(1)}s → ${ranges[i].end.toFixed(1)}s (${d.toFixed(1)}s)`));

    // Setup recorder
    log("🎞 Setting up recorder...");
    setBuildPct(34);
    const canvas=canvasRef.current;
    canvas.width=1280; canvas.height=720;
    const ctx=canvas.getContext("2d");
    const dest=audioCtx.createMediaStreamDestination();
    const srcNode=audioCtx.createBufferSource();
    srcNode.buffer=decodedAudio; srcNode.connect(dest);
    const combined=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
    const mimeType=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
    const recorder=new MediaRecorder(combined,{mimeType,videoBitsPerSecond:6_000_000});
    const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
    recorder.start(250); srcNode.start(0);
    log(`▶ Recording started (${mimeType})`);

    // Render frames
    let globalFrame=0;
    for(let si=0;si<sceneList.length;si++){
      const sc=sceneList[si]; const dur=sceneDurs[si];
      const subChunks=buildSubChunks(sc.text,dur);
      setBuildPct(34+Math.round((si/total)*58));
      log(`  🎨 Scene ${si+1}/${total}: rendering · ${dur.toFixed(1)}s`);
      const frameCount=Math.ceil(dur*30);
      const frameDurMs=(dur/frameCount)*1000;
      for(let f=0;f<frameCount;f++){
        const tScene=f/30; const progress=f/frameCount;
        ctx.clearRect(0,0,1280,720);
        if(img){
          // Ken Burns pan effect
          const pan = (progress - 0.5) * 40;
          drawImageCover(ctx,img,pan);
        } else {
          drawGradientBg(ctx,si);
        }
        applyOverlay(ctx,overlay,globalFrame);
        if(showTitleCard&&si===0&&tScene<3.0){
          const a=tScene<0.6?tScene/0.6:tScene>2.4?1-(tScene-2.4)/0.6:1;
          ctx.save(); ctx.globalAlpha=a;
          ctx.fillStyle="rgba(0,0,0,0.62)"; roundRect(ctx,80,270,1120,180,12); ctx.fill();
          ctx.font="bold 48px Georgia"; ctx.fillStyle="#ffffff"; ctx.textAlign="center";
          ctx.fillText(title||"Your Video",640,360,1060); ctx.restore();
        }
        const sub=subChunks.find(c=>tScene>=c.start&&tScene<c.end);
        if(sub) drawSubtitle(ctx,sub.text,subStyleObj,hasBars);
        globalFrame++; await sleep(Math.max(1,frameDurMs*0.7));
      }
    }

    // Outro
    ctx.fillStyle="#050508"; ctx.fillRect(0,0,1280,720);
    if(title){ ctx.font="bold 40px Georgia"; ctx.fillStyle="#ffffff"; ctx.textAlign="center"; ctx.fillText(title,640,340,1100); }
    ctx.font="22px Arial"; ctx.fillStyle="#4f8ef7"; ctx.textAlign="center"; ctx.fillText("Like · Share · Subscribe",640,395);
    await sleep(2200);

    recorder.stop(); log("⏹ Finalizing..."); setBuildPct(96);
    await new Promise(res=>{recorder.onstop=res;});
    await audioCtx.close();
    const blob=new Blob(chunks,{type:mimeType});
    setOutputURL(URL.createObjectURL(blob));
    setOutputSize((blob.size/1024/1024).toFixed(1));
    setBuildPct(100); log(`✅ Done! ${(blob.size/1024/1024).toFixed(1)} MB`);
    setBuilding(false); setStep(4);
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#07070b",color:"#ccd0e0",fontFamily:"'Inter','Helvetica Neue',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 24px #4f8ef728}50%{box-shadow:0 0 48px #4f8ef750}}
        @keyframes shimmer{0%,100%{opacity:.6}50%{opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d12}::-webkit-scrollbar-thumb{background:#222230;border-radius:2px}
        input,textarea,select,button{font-family:inherit}
        .cc:hover{border-color:#5060c060!important}
      `}</style>

      <canvas ref={canvasRef} style={{display:"none"}}/>

      {/* Header */}
      <header style={{position:"sticky",top:0,zIndex:200,background:"#07070bee",backdropFilter:"blur(14px)",borderBottom:"1px solid #12121e",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",height:58}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#1a2040,#28103a)",border:"1px solid #4f8ef740",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🎬</div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:17,color:"#f0f0f8",letterSpacing:-0.3}}>CineForge</div>
            <div style={{fontSize:10,color:"#30304a",letterSpacing:1.5,textTransform:"uppercase"}}>AI Video Studio</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {STEP_LABELS.map((lbl,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{display:"flex",alignItems:"center",gap:5,opacity:i<=step?1:0.3,transition:"opacity .3s"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:i<step?"#00C896":i===step?"linear-gradient(135deg,#4f8ef7,#a259ff)":"#14141e",border:i===step?"none":"1px solid #22223a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i<=step?"#fff":"#444"}}>{i<step?"✓":i+1}</div>
                <span style={{fontSize:11,color:i===step?"#ccd0e0":"#334",display:"none"}}>{lbl}</span>
              </div>
              {i<STEP_LABELS.length-1&&<div style={{width:14,height:1,background:i<step?"#00C89640":"#181828"}}/>}
            </div>
          ))}
        </div>
      </header>

      <div style={{maxWidth:780,margin:"0 auto",padding:"36px 20px"}}>

        {/* ── STEP 0: SETUP ── */}
        {step===0&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:30,color:"#f0f0f8",margin:"0 0 7px",letterSpacing:-0.5}}>Setup</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 24px"}}>Choose your workflow and add the required API keys.</p>
            <Label>How will you create your script?</Label>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <button onClick={()=>setScriptMode("own")} style={modeBtn(scriptMode==="own","#00C896")}>✏️ Write my own</button>
              <button onClick={()=>setScriptMode("ai")} style={modeBtn(scriptMode==="ai","#4f8ef7")}>✨ AI generates it</button>
            </div>
            <Label>How will you add the voiceover?</Label>
            <div style={{display:"flex",gap:10,marginBottom:24}}>
              <button onClick={()=>setVoiceMode("upload")} style={modeBtn(voiceMode==="upload","#00C896")}>🎙 Upload my own audio</button>
              <button onClick={()=>setVoiceMode("elevenlabs")} style={modeBtn(voiceMode==="elevenlabs","#a259ff")}>🤖 AI voice (ElevenLabs)</button>
            </div>

            {scriptMode==="ai"&&<KeyField label="Anthropic API Key" link="https://console.anthropic.com" linkLabel="Get key" value={anthropicKey} onChange={setAnthropicKey} show={showAK} onToggle={()=>setShowAK(s=>!s)} hint="Generates your script — ~$0.01 per script" placeholder="sk-ant-..."/>}
            {voiceMode==="elevenlabs"&&<KeyField label="ElevenLabs API Key" link="https://elevenlabs.io" linkLabel="Get key" value={elevenlabsKey} onChange={setElevenlabsKey} show={showEK} onToggle={()=>setShowEK(s=>!s)} hint="Free tier: 10,000 characters/month" placeholder="Paste your ElevenLabs key"/>}
            <InfoBox icon="🔒" color="#4f8ef7">Keys stay in your browser only — never stored or shared.</InfoBox>
            {error&&<ErrBox>{error}</ErrBox>}
            <NavBtn disabled={!setupValid} onClick={()=>{setError("");setStep(1);}}>Continue →</NavBtn>
          </div>
        )}

        {/* ── STEP 1: SCRIPT & VOICE ── */}
        {step===1&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:30,color:"#f0f0f8",margin:"0 0 7px"}}>Script & Voice</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 24px"}}>{scriptMode==="ai"?"Generate your script with AI, then review it.":"Paste your narration script below."}</p>
            <div style={{marginBottom:16}}>
              <Label>Video Title</Label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. The Science of Black Holes" style={iStyle()}/>
            </div>
            {scriptMode==="ai"&&(
              <div style={{background:"#0d0d14",border:"1px solid #14142a",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                <Label>AI Brief</Label>
                <div style={{display:"grid",gap:10}}>
                  <div><div style={{color:"#445",fontSize:11,marginBottom:5}}>Topic *</div><input value={aiBrief.topic} onChange={e=>setAiBrief(b=>({...b,topic:e.target.value}))} placeholder="e.g. How the immune system fights viruses" style={iStyle()}/></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><div style={{color:"#445",fontSize:11,marginBottom:5}}>Audience</div><select value={aiBrief.audience} onChange={e=>setAiBrief(b=>({...b,audience:e.target.value}))} style={iStyle()}>{["General","Students","Professionals","Kids","Experts"].map(a=><option key={a}>{a}</option>)}</select></div>
                    <div><div style={{color:"#445",fontSize:11,marginBottom:5}}>Tone</div><select value={aiBrief.tone} onChange={e=>setAiBrief(b=>({...b,tone:e.target.value}))} style={iStyle()}>{["Educational","Inspiring","Professional","Casual","Documentary"].map(t=><option key={t}>{t}</option>)}</select></div>
                  </div>
                  <button onClick={generateScript} disabled={!aiBrief.topic.trim()||genLoading} style={{padding:"11px 20px",background:aiBrief.topic?"linear-gradient(135deg,#1a2040,#28103a)":"#0d0d10",border:`1px solid ${aiBrief.topic?"#4f8ef750":"#1e1e2a"}`,borderRadius:10,color:aiBrief.topic?"#90a8f0":"#334",fontWeight:700,fontSize:14,cursor:aiBrief.topic?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    {genLoading?<><span style={{width:16,height:16,border:"2px solid #4f8ef740",borderTop:"2px solid #4f8ef7",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>Generating...</>:"✨ Generate Script"}
                  </button>
                </div>
              </div>
            )}
            {/* Script input mode toggle */}
            <div style={{marginBottom:16}}>
              <Label>Script Input Mode</Label>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <button onClick={()=>setScriptInputMode("structured")} style={modeBtn(scriptInputMode==="structured","#a259ff")}>📋 Scene-by-Scene Editor</button>
                <button onClick={()=>setScriptInputMode("plain")} style={modeBtn(scriptInputMode==="plain","#4f8ef7")}>📝 Plain Text</button>
              </div>
            </div>

            {/* Structured scene editor */}
            {scriptInputMode==="structured"&&(
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <Label>Scene Editor</Label>
                  <button onClick={()=>setStructuredScenes(s=>[...s,{narration:"",visual:""}])} style={{background:"#1a2040",border:"1px solid #4f8ef750",borderRadius:8,padding:"5px 12px",color:"#90a8f0",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>+ Add Scene</button>
                </div>
                <InfoBox icon="🎬" color="#a259ff">Write your narration and describe the visual separately for each scene. The visual description is used to search for the best matching image — it never appears in the video.</InfoBox>
                <div style={{display:"grid",gap:12}}>
                  {structuredScenes.map((sc,i)=>(
                    <div key={i} style={{background:"#0a0a12",border:"1px solid #1a1a2a",borderRadius:12,overflow:"hidden"}}>
                      {/* Scene header */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #141420",background:"#0d0d16"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{background:"#a259ff22",color:"#a259ff",border:"1px solid #a259ff40",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>Scene {i+1}</span>
                          {sc.narration.trim()&&<span style={{color:"#334",fontSize:10}}>{sc.narration.trim().split(/\s+/).length} words</span>}
                        </div>
                        {structuredScenes.length>1&&(
                          <button onClick={()=>setStructuredScenes(s=>s.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#334",cursor:"pointer",fontSize:13,padding:"2px 6px"}}>✕</button>
                        )}
                      </div>
                      {/* Two-column layout */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                        {/* Narration */}
                        <div style={{padding:"12px 14px",borderRight:"1px solid #141420"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                            <span style={{fontSize:12}}>🎙</span>
                            <span style={{color:"#778",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8}}>Narration</span>
                          </div>
                          <textarea
                            value={sc.narration}
                            onChange={e=>setStructuredScenes(s=>s.map((x,j)=>j===i?{...x,narration:e.target.value}:x))}
                            placeholder="Write what will be spoken and shown as subtitles..."
                            style={{width:"100%",background:"transparent",border:"none",color:"#d0d0e0",fontSize:13,lineHeight:1.7,fontFamily:"inherit",resize:"none",outline:"none",minHeight:100}}
                            rows={5}
                          />
                        </div>
                        {/* Visual */}
                        <div style={{padding:"12px 14px",background:"#08080f"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                            <span style={{fontSize:12}}>🖼</span>
                            <span style={{color:"#778",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8}}>Visual Direction</span>
                          </div>
                          <textarea
                            value={sc.visual}
                            onChange={e=>setStructuredScenes(s=>s.map((x,j)=>j===i?{...x,visual:e.target.value}:x))}
                            placeholder="Describe the image you want...&#10;e.g. close-up neuron synapse firing blue glow, aerial view ocean waves at sunset, busy city street time-lapse night"
                            style={{width:"100%",background:"transparent",border:"none",color:"#a0b0c0",fontSize:12,lineHeight:1.7,fontFamily:"inherit",resize:"none",outline:"none",minHeight:100}}
                            rows={5}
                          />
                          {sc.visual.trim()&&(
                            <div style={{marginTop:4,fontSize:10,color:"#334"}}>
                              🔍 Will search: <span style={{color:"#4f8ef7",fontFamily:"monospace"}}>"{sc.visual.trim().slice(0,40)}{sc.visual.trim().length>40?"...":""}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Stats */}
                {structuredScenes.some(s=>s.narration.trim())&&(
                  <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    {[
                      {label:`${derivedScript.split(/\s+/).filter(Boolean).length} words`,color:"#4f8ef7"},
                      {label:`${scenes.length} scenes`,color:"#a259ff"},
                      {label:`~${Math.round(derivedScript.split(/\s+/).filter(Boolean).length/140)} min`,color:"#00C896"},
                      {label:`${structuredScenes.filter(s=>s.visual.trim()).length} visuals set`,color:"#FB923C"},
                    ].map(({label,color})=>(
                      <span key={label} style={{background:color+"18",color,border:`1px solid ${color}30`,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:600}}>{label}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Plain text editor */}
            {scriptInputMode==="plain"&&(
              <div style={{marginBottom:16}}>
                <Label>Paste Your Script</Label>
                <InfoBox icon="💡" color="#a259ff">Separate each scene with a <strong style={{color:"#a259ff"}}>blank line</strong>. Each paragraph = one scene. Images are auto-matched from your text keywords.</InfoBox>
                <textarea value={script} onChange={e=>setScript(e.target.value)}
                  placeholder={"Scene 1 — introduce your topic here. 4–8 sentences per scene.\n\nScene 2 — continue your story here.\n\nScene 3 — keep going for as many scenes as needed."}
                  style={iStyle({resize:"vertical",lineHeight:1.75,fontFamily:"'JetBrains Mono',monospace",fontSize:13})} rows={14}/>
                {script.trim()&&(
                  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    {[{label:`${script.trim().split(/\s+/).length} words`,color:"#4f8ef7"},{label:`${scenes.length} scenes`,color:"#a259ff"},{label:`~${Math.round(script.trim().split(/\s+/).length/140)} min`,color:"#00C896"}].map(({label,color})=>(
                      <span key={label} style={{background:color+"18",color,border:`1px solid ${color}30`,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:600}}>{label}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {voiceMode==="upload"?(
              <div style={{marginBottom:16}}>
                <Label>Upload Your Voiceover Audio</Label>
                {/* Drop zone */}
                <div onDrop={handleAudioDrop} onDragOver={e=>e.preventDefault()} onClick={()=>!audioFile&&document.getElementById("audioInput").click()}
                  style={{border:`2px dashed ${audioFile?"#00C896":"#1e1e2a"}`,borderRadius:12,padding:audioFile?"16px 20px":"32px 20px",textAlign:"center",cursor:audioFile?"default":"pointer",background:"#0d0d10",transition:"border-color .2s",marginBottom:audioFile?12:0}}>
                  {audioFile?(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:24}}>🎙</span>
                        <div style={{textAlign:"left"}}>
                          <div style={{color:"#00C896",fontWeight:700,fontSize:14}}>{audioFile.name}</div>
                          <div style={{color:"#445",fontSize:12}}>{(audioFile.size/1024/1024).toFixed(1)} MB{audioDur?` · ${Math.floor(audioDur/60)}:${String(Math.floor(audioDur%60)).padStart(2,"0")}`:""}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <audio src={audioURL} controls style={{height:32,maxWidth:200}}/>
                        <button onClick={e=>{e.stopPropagation();setAudioFile(null);setAudioURL(null);setAudioDur(null);setSplitPoints([]);}} style={{background:"none",border:"1px solid #2a2a3a",borderRadius:6,color:"#556",padding:"4px 10px",cursor:"pointer",fontSize:12}}>✕</button>
                      </div>
                    </div>
                  ):(
                    <><div style={{fontSize:32,marginBottom:10}}>🎙</div><div style={{color:"#778",fontSize:14,marginBottom:4}}>Drop your audio here</div><div style={{color:"#334",fontSize:12}}>MP3 · WAV · M4A · AAC</div></>
                  )}
                  <input id="audioInput" type="file" accept="audio/*" onChange={handleAudioDrop} style={{display:"none"}}/>
                </div>

                {/* Scene audio timeline — shown when audio is loaded and scenes exist */}
                {audioFile&&audioDur&&scenes.length>0&&(()=>{
                  const ranges = computeSceneRanges(audioDur, scenes.map(s=>s.text), splitPoints.length===scenes.length?splitPoints:null);
                  return (
                    <div style={{background:"#0a0a12",border:"1px solid #1a1a2a",borderRadius:12,overflow:"hidden"}}>
                      {/* Header */}
                      <div style={{padding:"10px 14px",borderBottom:"1px solid #141420",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{color:"#00C896",fontSize:12}}>🎵</span>
                          <span style={{color:"#778",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Scene Audio Preview</span>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          {splitPoints.length===scenes.length&&(
                            <button onClick={()=>setSplitPoints([])} style={{background:"none",border:"1px solid #2a2a3a",borderRadius:6,color:"#556",fontSize:10,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>↺ Auto-split</button>
                          )}
                          <span style={{color:"#334",fontSize:11}}>Total: {fmtTime(audioDur)}</span>
                        </div>
                      </div>

                      {/* Timeline bar */}
                      <div style={{padding:"10px 14px 4px"}}>
                        <div style={{position:"relative",height:24,borderRadius:6,overflow:"hidden",background:"#111118",marginBottom:8}}>
                          {ranges.map((r,i)=>{
                            const colors=["#4f8ef7","#a259ff","#00C896","#FB923C","#F472B6","#2DD4BF","#FBBF24","#E879F9"];
                            const color=colors[i%colors.length];
                            const leftPct=(r.start/audioDur)*100;
                            const widthPct=(r.dur/audioDur)*100;
                            return (
                              <div key={i} style={{position:"absolute",top:0,left:`${leftPct}%`,width:`${widthPct}%`,height:"100%",background:color+"40",borderRight:"1px solid "+color+"60",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                                <span style={{color:color,fontSize:9,fontWeight:700}}>SC{i+1}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",color:"#334",fontSize:9,marginBottom:8}}>
                          <span>0:00</span><span>{fmtTime(audioDur/2)}</span><span>{fmtTime(audioDur)}</span>
                        </div>
                      </div>

                      {/* Scene rows */}
                      <div style={{padding:"0 14px 12px",display:"grid",gap:6}}>
                        {ranges.map((r,i)=>{
                          const colors=["#4f8ef7","#a259ff","#00C896","#FB923C","#F472B6","#2DD4BF","#FBBF24","#E879F9"];
                          const color=colors[i%colors.length];
                          const isPlaying=playingScene===i;
                          const sceneText = scenes[i]?.text||"";
                          const preview = sceneText.split(/\s+/).slice(0,8).join(" ")+(sceneText.split(/\s+/).length>8?"...":"");

                          const playSegment = () => {
                            if(isPlaying){ audioPreviewRef.current?.pause(); setPlayingScene(null); return; }
                            const a = audioPreviewRef.current;
                            if(!a) return;
                            a.src = audioURL;
                            a.currentTime = r.start;
                            a.play();
                            setPlayingScene(i);
                            // Stop at end of segment
                            const checkStop = () => {
                              if(a.currentTime>=r.end){ a.pause(); setPlayingScene(null); a.removeEventListener("timeupdate",checkStop); }
                            };
                            a.addEventListener("timeupdate",checkStop);
                          };

                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:isPlaying?color+"12":"#0d0d14",border:`1px solid ${isPlaying?color+"40":"#141420"}`,borderRadius:8,transition:"all .2s"}}>
                              {/* Scene badge */}
                              <div style={{background:color+"20",color,border:`1px solid ${color+"40"}`,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,flexShrink:0}}>SC{i+1}</div>
                              {/* Play button */}
                              <button onClick={playSegment} style={{width:28,height:28,borderRadius:"50%",background:isPlaying?color+"30":"#111118",border:`1px solid ${isPlaying?color:"#1e1e2a"}`,color:isPlaying?color:"#556",fontSize:12,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>
                                {isPlaying?"⏸":"▶"}
                              </button>
                              {/* Time range */}
                              <div style={{color:color,fontSize:10,fontFamily:"monospace",flexShrink:0,minWidth:90}}>
                                {fmtTime(r.start)} → {fmtTime(r.end)}
                              </div>
                              {/* Narration preview */}
                              <div style={{color:"#445",fontSize:11,flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>"{preview}"</div>
                              {/* Manual start time adjuster */}
                              {i>0&&(
                                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                                  <span style={{color:"#334",fontSize:10}}>Start:</span>
                                  <input
                                    type="number"
                                    step="0.1" min="0" max={audioDur}
                                    value={splitPoints.length===scenes.length?splitPoints[i].toFixed(1):r.start.toFixed(1)}
                                    onChange={e=>{
                                      const val=parseFloat(e.target.value)||0;
                                      setSplitPoints(prev=>{
                                        const base = ranges.map(r=>r.start);
                                        const pts = prev.length===scenes.length?[...prev]:[...base];
                                        pts[i]=Math.max(pts[i-1]+0.5,Math.min(val,i<scenes.length-1?pts[i+1]-0.5:audioDur-0.5));
                                        return pts;
                                      });
                                    }}
                                    style={{width:52,background:"#0d0d10",border:"1px solid #1e1e2a",borderRadius:5,padding:"2px 5px",color:"#90a8f0",fontSize:10,fontFamily:"monospace",textAlign:"center"}}
                                  />
                                  <span style={{color:"#334",fontSize:10}}>s</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <audio ref={audioPreviewRef} style={{display:"none"}} onEnded={()=>setPlayingScene(null)}/>
                    </div>
                  );
                })()}
              </div>
            ):(
              <div style={{marginBottom:16}}>
                <Label>Choose AI Voice</Label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
                  {EL_VOICES.map(v=>(
                    <div key={v.id} className="cc" onClick={()=>setVoiceId(v.id)} style={{background:voiceId===v.id?"#111a2a":"#0d0d10",border:`1.5px solid ${voiceId===v.id?"#a259ff":"#1a1a2a"}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .2s"}}>
                      <div style={{color:voiceId===v.id?"#c0a0ff":"#d0d0e0",fontWeight:700,fontSize:13,marginBottom:2}}>{v.name}</div>
                      <div style={{color:"#445",fontSize:11}}>{v.desc}</div>
                      {voiceId===v.id&&<div style={{color:"#a259ff",fontSize:10,marginTop:4}}>✓ Selected</div>}
                    </div>
                  ))}
                </div>
                <InfoBox icon="ℹ️" color="#a259ff">Free tier: 10,000 characters/month. Uses <strong style={{color:"#a259ff"}}>eleven_flash_v2_5</strong> — fastest ElevenLabs model.</InfoBox>
              </div>
            )}
            {error&&<ErrBox>{error}</ErrBox>}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <NavBtn variant="back" onClick={()=>setStep(0)}>← Back</NavBtn>
              <NavBtn disabled={!derivedScript.trim()||(voiceMode==="upload"&&!audioFile)} onClick={()=>setStep(2)}>Continue to Style →</NavBtn>
            </div>
          </div>
        )}

        {/* ── STEP 2: STYLE ── */}
        {step===2&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:30,color:"#f0f0f8",margin:"0 0 7px"}}>Visual Style</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 24px"}}>Subtitles, overlays, and finishing touches.</p>
            <Label>Subtitle Style</Label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:24}}>
              {SUBTITLE_STYLES.map(s=>(
                <div key={s.id} className="cc" onClick={()=>setSubStyle(s.id)} style={{background:subStyle===s.id?"#111128":"#0d0d12",border:`1.5px solid ${subStyle===s.id?"#5060c0":"#14142a"}`,borderRadius:10,padding:"10px 8px",cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
                  <div style={{background:"#1a1a24",borderRadius:6,padding:"7px 4px",marginBottom:6,fontSize:11,fontWeight:700,color:s.color}}>{s.label}</div>
                  <div style={{color:subStyle===s.id?"#8090f0":"#334",fontSize:10}}>{subStyle===s.id?"✓ Active":"Select"}</div>
                </div>
              ))}
            </div>
            <Label>Visual Overlay</Label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24}}>
              {OVERLAY_STYLES.map(o=>(
                <div key={o.id} className="cc" onClick={()=>setOverlay(o.id)} style={{background:overlay===o.id?"#0d1a12":"#0d0d12",border:`1.5px solid ${overlay===o.id?"#00C896":"#14142a"}`,borderRadius:10,padding:"12px",cursor:"pointer",textAlign:"center",color:overlay===o.id?"#00C896":"#445",fontSize:13,fontWeight:600,transition:"all .2s"}}>{o.label}</div>
              ))}
            </div>
            <Label>Extras</Label>
            <div onClick={()=>setShowTitleCard(v=>!v)} style={{display:"flex",alignItems:"center",gap:10,background:showTitleCard?"#111128":"#0d0d12",border:`1.5px solid ${showTitleCard?"#5060c0":"#14142a"}`,borderRadius:10,padding:"12px 16px",cursor:"pointer",width:"fit-content",marginBottom:20}}>
              <div style={{width:18,height:18,borderRadius:4,background:showTitleCard?"#5060c0":"#1a1a24",border:`1.5px solid ${showTitleCard?"#5060c0":"#2a2a3a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{showTitleCard?"✓":""}</div>
              <span style={{color:showTitleCard?"#a0b0f0":"#556",fontSize:13}}>Show title intro card (first 3 seconds)</span>
            </div>
            <InfoBox icon="📐" color="#445">Output: 1280×720 HD WebM. Convert to MP4 at <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer" style={{color:"#4f8ef7"}}>CloudConvert ↗</a> (free)</InfoBox>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <NavBtn variant="back" onClick={()=>setStep(1)}>← Back</NavBtn>
              <NavBtn onClick={goToBuild}>Continue to Build →</NavBtn>
            </div>
          </div>
        )}

        {/* ── STEP 3: BUILD ── */}
        {step===3&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:30,color:"#f0f0f8",margin:"0 0 7px"}}>{building?"Building your video…":imagesFetching?"Fetching scene images…":"Ready to Build"}</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>{building?"Keep this tab open and visible.":imagesFetching?"Fetching Pexels images for each scene…":"Review images below then start production."}</p>

            {/* Image preview grid — shown before AND during build */}
            {!building&&(
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{color:"#556",fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Scene Backgrounds</div>
                  {imagesFetching&&<div style={{display:"flex",alignItems:"center",gap:8,color:"#4f8ef7",fontSize:12}}>
                    <span style={{width:12,height:12,border:"2px solid #4f8ef740",borderTop:"2px solid #4f8ef7",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>
                    Fetching images...
                  </div>}
                  {imagesFetched&&<div style={{color:"#00C896",fontSize:12}}>✓ {sceneImages.filter(r=>r?.img).length}/{scenes.length} Pexels photos ready</div>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                  {scenes.map((sc,i)=>(
                    <ScenePreviewCard key={i} scene={sc} idx={i} result={sceneImages[i]} onSwap={(idx,newResult)=>{ setSceneImages(prev=>{ const n=[...prev]; n[idx]=newResult; return n; }); }}/>
                  ))}
                </div>
                
              </div>
            )}

            {!building&&imagesFetched&&(
              <div style={{background:"#0d0d12",border:"1px solid #14142a",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                <div style={{color:"#334",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Production Summary</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>
                  {[["Scenes",scenes.length],["Images",`${sceneImages.filter(r=>r?.img).length}/${scenes.length} Pexels photos`],["Voice",voiceMode==="elevenlabs"?`ElevenLabs · ${EL_VOICES.find(v=>v.id===voiceId)?.name}`:audioFile?.name?.slice(0,22)+"…"],["Subtitles",SUBTITLE_STYLES.find(s=>s.id===subStyle)?.label],["Overlay",OVERLAY_STYLES.find(o=>o.id===overlay)?.label],["Resolution","1280 × 720 HD"]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #10101a"}}>
                      <span style={{color:"#445",fontSize:12}}>{k}</span><span style={{color:"#a0a8c0",fontSize:12,fontWeight:600}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {building&&(
              <div>
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",color:"#556",fontSize:12,marginBottom:4}}><span>Progress</span><span>{buildPct}%</span></div>
                  <ProgBar pct={buildPct}/>
                </div>
                <div ref={logRef} style={{background:"#050508",border:"1px solid #10101c",borderRadius:10,padding:"14px 16px",height:260,overflowY:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
                  {buildLog.map((l,i)=>(
                    <div key={i} style={{marginBottom:3,display:"flex",gap:10}}>
                      <span style={{color:"#22223a",flexShrink:0}}>{l.t}</span>
                      <span style={{color:l.msg.startsWith("✅")?"#00C896":l.msg.startsWith("✗")?"#f87171":l.msg.includes("✓")?"#4f8ef7":l.msg.includes("⚠")?"#f59e0b":"#44506a"}}>{l.msg}</span>
                    </div>
                  ))}
                  {building&&<span style={{color:"#4f8ef7",animation:"pulse 1s infinite"}}>▌</span>}
                </div>
              </div>
            )}

            {error&&<ErrBox>{error}</ErrBox>}
            {!building&&imagesFetched&&(
              <div style={{display:"flex",gap:10,marginTop:20}}>
                <NavBtn variant="back" onClick={()=>setStep(2)}>← Back</NavBtn>
                <button onClick={buildVideo} style={{flex:1,padding:"16px 24px",background:"linear-gradient(135deg,#0a2010,#162808)",border:"1px solid #00C89640",borderRadius:12,color:"#00C896",fontWeight:800,fontSize:17,fontFamily:"'Playfair Display',serif",fontStyle:"italic",cursor:"pointer",animation:"glow 2.5s ease infinite"}}>
                  🚀 Start Production
                </button>
              </div>
            )}
            {!building&&imagesFetching&&(
              <div style={{display:"flex",gap:10,marginTop:20}}>
                <NavBtn variant="back" onClick={()=>setStep(2)}>← Back</NavBtn>
                <NavBtn disabled>⏳ Fetching images…</NavBtn>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: EXPORT ── */}
        {step===4&&outputURL&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:30,color:"#f0f0f8",margin:"0 0 7px"}}>Your Video is Ready 🎉</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>{outputSize} MB · 1280×720 HD · WebM</p>
            <div style={{background:"#000",borderRadius:14,overflow:"hidden",border:"1px solid #14142a",marginBottom:20,boxShadow:"0 20px 60px rgba(0,0,0,0.9)"}}>
              <video src={outputURL} controls style={{width:"100%",display:"block",maxHeight:440}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <a href={outputURL} download={`${(title||"video").replace(/\s+/g,"-")}.webm`} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"linear-gradient(135deg,#0f2030,#0a1828)",border:"1px solid #4f8ef750",borderRadius:12,padding:"14px",color:"#4f8ef7",fontWeight:700,fontSize:14,textDecoration:"none"}}>⬇ Download WebM</a>
              <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#0d0d12",border:"1px solid #14142a",borderRadius:12,padding:"14px",color:"#556",fontSize:13,textDecoration:"none"}}>🔄 Convert to MP4 (free) ↗</a>
            </div>
            <div style={{background:"#0d0d12",border:"1px solid #14142a",borderRadius:12,padding:"18px 20px",marginBottom:16}}>
              <div style={{color:"#334",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Next Steps</div>
              {[["1","Download your .webm above"],["2","Convert to .mp4 via CloudConvert (free)"],["3","Use VidLaunch to generate optimized titles, hashtags & descriptions per platform"],["4","Upload natively to YouTube, TikTok, Instagram, Facebook, LinkedIn & Pinterest"]].map(([n,t])=>(
                <div key={n} style={{display:"flex",gap:12,marginBottom:8}}>
                  <span style={{background:"#4f8ef720",color:"#4f8ef7",width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{n}</span>
                  <span style={{color:"#778",fontSize:13,lineHeight:1.6}}>{t}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>{setStep(0);setScript("");setStructuredScenes([{narration:"",visual:""}]);setScriptInputMode("structured");setSplitPoints([]);setPlayingScene(null);setAudioFile(null);setAudioURL(null);setAudioDur(null);setTitle("");setOutputURL(null);setBuildLog([]);setBuildPct(0);setError("");setSceneImages([]);setImagesFetched(false);}} style={{background:"#0d0d12",border:"1px solid #14142a",color:"#445",borderRadius:10,padding:"10px 20px",cursor:"pointer",fontSize:13}}>← Make Another Video</button>
          </div>
        )}

      </div>
    </div>
  );
}
