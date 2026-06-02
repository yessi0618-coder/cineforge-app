import { useState, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PROXY = "https://cineforge-proxy.vercel.app/api/pexels";

const EL_VOICES = [
  { id:"21m00Tcm4TlvDq8ikWAM", name:"Rachel",  desc:"Calm · Narration"      },
  { id:"TxGEqnHWrfWFTfGW9XjX", name:"Josh",    desc:"Deep · Documentary"    },
  { id:"pNInz6obpgDQGcFmaJgB", name:"Adam",    desc:"Warm · Professional"   },
  { id:"AZnzlk1XvdvUeBnXmlld", name:"Domi",    desc:"Strong · Confident"    },
  { id:"EXAVITQu4vr4xnSDxMaL", name:"Bella",   desc:"Soft · Warm"           },
  { id:"VR6AewLTigWG4xSOukaG", name:"Arnold",  desc:"Crisp · Authoritative" },
  { id:"yoZ06aMxZJJ28mfd3POQ", name:"Sam",     desc:"Raspy · Bold"          },
  { id:"ErXwobaYiN019PkySvjV", name:"Antoni",  desc:"Well-Rounded"          },
];

const SUBTITLE_STYLES = [
  { id:"bold",    label:"Bold Yellow", color:"#FFE600", bg:"transparent",      font:"900 28px Arial Black",    stroke:"#000",    strokeW:4 },
  { id:"minimal", label:"Minimal",     color:"#ffffff", bg:"rgba(0,0,0,0.6)",  font:"700 24px Arial",          stroke:null,      strokeW:0 },
  { id:"cinema",  label:"Cinema",      color:"#ffffff", bg:"rgba(0,0,0,0.75)", font:"italic 700 24px Georgia", stroke:null,      strokeW:0 },
  { id:"neon",    label:"Neon",        color:"#00FFCC", bg:"transparent",      font:"700 24px Courier New",    stroke:"#003d30", strokeW:3 },
  { id:"clean",   label:"Clean",       color:"#ffffff", bg:"transparent",      font:"700 26px Helvetica",      stroke:"#111",    strokeW:3 },
];

const OVERLAY_STYLES = [
  { id:"none",  label:"None"           },
  { id:"dark",  label:"Dark Vignette"  },
  { id:"bars",  label:"Cinematic Bars" },
  { id:"grain", label:"Film Grain"     },
];

const STEP_LABELS = ["Setup","Scenes & Voice","Style","Build","Export"];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = s => { const m=Math.floor(s/60),sec=Math.floor(s%60); return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };

// ── Image / video helpers ─────────────────────────────────────────────────────
function loadImg(url) {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
    setTimeout(() => res(null), 10000);
  });
}

async function searchPexels(query) {
  const qs = [query, query.split(" ")[0], "nature landscape"];
  for (const q of qs) {
    try {
      const r = await fetch(`${PROXY}?query=${encodeURIComponent(q)}&per_page=6&orientation=landscape&size=large`);
      if (!r.ok) continue;
      const d = await r.json();
      for (const p of (d.photos||[])) {
        const src = p.src?.large2x || p.src?.large || p.src?.medium;
        if (!src) continue;
        const img = await loadImg(src);
        if (img?.naturalWidth > 0) return { kind:"pexels", img, src, credit:p.photographer };
      }
    } catch(e) { continue; }
  }
  return null;
}

// Load local uploaded file as image — NO crossOrigin on blob URLs (causes taint)
function loadLocalImage(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = URL.createObjectURL(file);
  });
}

// ── Canvas helpers ────────────────────────────────────────────────────────────
function roundRect(ctx,x,y,w,h,r=6){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawSub(ctx,text,style,bars){
  if(!text) return;
  ctx.save(); ctx.font=style.font; ctx.textAlign="center";
  const w=ctx.measureText(text).width+48,h=44,y=bars?618:660;
  if(style.bg!=="transparent"){ ctx.fillStyle=style.bg; roundRect(ctx,640-w/2,y-h+10,w,h,8); ctx.fill(); }
  if(style.stroke){ ctx.lineWidth=style.strokeW; ctx.strokeStyle=style.stroke; ctx.lineJoin="round"; ctx.strokeText(text,640,y); }
  ctx.fillStyle=style.color; ctx.fillText(text,640,y); ctx.restore();
}

function drawOverlay(ctx,type,frame){
  if(type==="dark"){ const g=ctx.createRadialGradient(640,360,180,640,360,760); g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,0.55)"); ctx.fillStyle=g; ctx.fillRect(0,0,1280,720); }
  if(type==="bars"){ ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,1280,88); ctx.fillRect(0,632,1280,88); }
  if(type==="grain"){ for(let i=0;i<300;i++){ const x=((Math.sin(i*127.1+frame*311.7)*.5+.5))*1280,y=((Math.sin(i*311.7+frame*74.7)*.5+.5))*720; ctx.fillStyle=`rgba(255,255,255,${.02+Math.sin(i+frame)*.015})`; ctx.fillRect(x,y,1.5,1.5); } }
}

function drawGradient(ctx,idx){
  const h=[210,230,195,250,200,220,240,215,205][idx%9];
  const g=ctx.createLinearGradient(0,0,1280,720);
  g.addColorStop(0,`hsl(${h},35%,8%)`); g.addColorStop(1,`hsl(${h+20},28%,14%)`);
  ctx.fillStyle=g; ctx.fillRect(0,0,1280,720);
  const glow=ctx.createRadialGradient(640,360,0,640,360,500);
  glow.addColorStop(0,`hsla(${h+20},50%,40%,.1)`); glow.addColorStop(1,"transparent");
  ctx.fillStyle=glow; ctx.fillRect(0,0,1280,720);
}

function drawImgCover(ctx,img,pan=0){
  const cw=1280,ch=720,iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  if(!iw||!ih) return;
  const sc=Math.max(cw/iw,ch/ih)*1.06;
  ctx.drawImage(img,(cw-iw*sc)/2+pan,(ch-ih*sc)/2,iw*sc,ih*sc);
}

function buildChunks(text,dur){
  const words=text.split(/\s+/).filter(Boolean); const chunks=[];
  for(let i=0;i<words.length;i+=5) chunks.push(words.slice(i,i+5).join(" "));
  const d=dur/Math.max(chunks.length,1);
  return chunks.map((t,i)=>({text:t,start:i*d,end:(i+1)*d}));
}

// ── Small UI atoms ────────────────────────────────────────────────────────────
const iStyle = (ex={}) => ({width:"100%",background:"#0d0d10",border:"1px solid #1e1e2a",borderRadius:10,padding:"11px 14px",color:"#d0d0e0",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",...ex});
const modeBtn = (on,color="#4f8ef7") => ({flex:1,padding:"10px 14px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,background:on?color+"22":"#0d0d10",border:`1.5px solid ${on?color:"#1e1e2a"}`,color:on?color:"#445",fontFamily:"inherit",transition:"all .2s"});

function Lbl({children}){ return <div style={{color:"#556",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:7,fontWeight:700}}>{children}</div>; }
function Info({icon="ℹ️",color="#4f8ef7",children}){ return <div style={{background:color+"12",border:`1px solid ${color}28`,borderRadius:10,padding:"10px 14px",display:"flex",gap:10,marginBottom:12}}><span style={{flexShrink:0}}>{icon}</span><span style={{color:"#8090a0",fontSize:12,lineHeight:1.65}}>{children}</span></div>; }
function Err({children}){ return <div style={{background:"#2a0808",border:"1px solid #f8717140",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginTop:10}}>⚠ {children}</div>; }
function Btn({onClick,disabled,children,variant="primary"}){
  const p=variant==="primary";
  return <button onClick={onClick} disabled={disabled} style={{flex:p?1:undefined,padding:"12px 20px",background:disabled?"#0d0d10":p?"linear-gradient(135deg,#1a2040,#28103a)":"#0d0d10",border:`1px solid ${disabled?"#1a1a22":p?"#5060c060":"#1e1e2a"}`,borderRadius:10,cursor:disabled?"not-allowed":"pointer",color:disabled?"#333":p?"#90a8f0":"#556",fontWeight:700,fontSize:14,fontFamily:"inherit",transition:"all .2s"}}>{children}</button>;
}
function ProgBar({pct,color="#4f8ef7"}){ return <div style={{background:"#111118",borderRadius:4,height:6,overflow:"hidden",marginTop:6}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color},${color}80)`,borderRadius:4,transition:"width .4s ease"}}/></div>; }
function KeyField({label,link,hint,value,onChange,show,onToggle,placeholder}){
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{color:"#556",fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>{label}</div>
        {link&&<a href={link.url} target="_blank" rel="noreferrer" style={{color:"#4f8ef7",fontSize:11}}>{link.label} ↗</a>}
      </div>
      <div style={{position:"relative"}}>
        <input type={show?"text":"password"} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Paste key here"}
          style={{...iStyle(),paddingRight:48}}/>
        <button onClick={onToggle} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#445",cursor:"pointer",fontSize:14}}>{show?"🙈":"👁"}</button>
      </div>
      {hint&&<div style={{color:"#2a3a4a",fontSize:11,marginTop:4}}>{hint}</div>}
    </div>
  );
}

// ── Scene Card (Step 1) ───────────────────────────────────────────────────────
function SceneCard({ scene, idx, total, onChange, onRemove, onAdd }) {
  const [searching, setSearching] = useState(false);
  const [searchQ, setSearchQ]     = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [searchErr, setSearchErr] = useState("");
  const [panel, setPanel]         = useState(null); // null | "upload" | "search"
  const [fetching, setFetching]   = useState(false);

  const med = scene.media; // { kind, img, src, credit, videoUrl, videoFile, thumbUrl }

  // Auto-search Pexels when visual direction is set and no media yet
  const autoSearch = async (query) => {
    if (!query.trim() || med) return;
    setFetching(true);
    const result = await searchPexels(query);
    if (result) onChange(idx, { ...scene, media: result });
    setFetching(false);
  };

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true); setSearchErr(""); setSearchRes([]);
    try {
      const r = await fetch(`${PROXY}?query=${encodeURIComponent(searchQ)}&per_page=9&orientation=landscape&size=large`);
      if (!r.ok) throw new Error("Search failed");
      const d = await r.json();
      setSearchRes(d.photos||[]);
      if (!(d.photos||[]).length) setSearchErr("No results — try different keywords");
    } catch(e) { setSearchErr(e.message); }
    setSearching(false);
  };

  const pickPhoto = async (p) => {
    const src = p.src?.large2x||p.src?.large||p.src?.medium;
    if (!src) return;
    const img = await loadImg(src);
    if (img) onChange(idx, { ...scene, media:{ kind:"pexels", img, src, credit:p.photographer } });
    setPanel(null); setSearchRes([]); setSearchQ("");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      onChange(idx, { ...scene, media:{ kind:"video", img:null, src:null, credit:`📁 ${file.name}`, videoUrl:url, videoFile:file } });
    } else {
      // No crossOrigin on blob URLs — it breaks canvas drawing
      const img = new Image();
      img.onload = () => onChange(idx, { ...scene, media:{ kind:"image", img, src:url, credit:`📁 ${file.name}`, isLocal:true } });
      img.onerror = () => console.warn("Image load failed");
      img.src = url;
    }
    setPanel(null);
  };

  const thumbSrc = med?.kind==="video" ? null : med?.src || null;
  const wordCount = scene.narration.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{background:"#09090f",border:"1px solid #1a1a28",borderRadius:14,overflow:"hidden",marginBottom:12}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#0d0d16",borderBottom:"1px solid #141420"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{background:"#a259ff22",color:"#a259ff",border:"1px solid #a259ff40",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>Scene {idx+1}</span>
          {wordCount>0&&<span style={{color:"#334",fontSize:10}}>{wordCount} words</span>}
        </div>
        {total>1&&<button onClick={()=>onRemove(idx)} style={{background:"none",border:"none",color:"#334",cursor:"pointer",fontSize:14,padding:"2px 6px"}}>✕</button>}
      </div>

      {/* Three columns: Media | Narration | Visual */}
      <div style={{display:"grid",gridTemplateColumns:"140px 1fr 1fr",minHeight:160}}>

        {/* LEFT — Media */}
        <div style={{borderRight:"1px solid #141420",display:"flex",flexDirection:"column"}}>
          {/* Thumbnail */}
          <div style={{flex:1,background:"#060610",position:"relative",minHeight:110,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            {fetching&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{width:18,height:18,border:"2px solid #4f8ef740",borderTop:"2px solid #4f8ef7",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                <span style={{color:"#334",fontSize:9}}>Searching...</span>
              </div>
            )}
            {!fetching&&med?.kind==="video"&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:24}}>🎬</div>
                <div style={{color:"#FB923C",fontSize:9,marginTop:4,padding:"0 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{med.credit}</div>
              </div>
            )}
            {!fetching&&thumbSrc&&(
              <img src={thumbSrc} alt="" crossOrigin="anonymous" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.9}} onError={e=>e.target.style.display="none"}/>
            )}
            {!fetching&&!med&&!fetching&&(
              <div style={{textAlign:"center",color:"#223",fontSize:11}}>
                <div style={{fontSize:20,marginBottom:4}}>🖼</div>
                <div style={{fontSize:9}}>No media yet</div>
              </div>
            )}
            {med&&<div style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.75)",borderRadius:4,padding:"1px 5px",fontSize:9,color:"#00C896"}}>✓</div>}
          </div>
          {/* Media buttons */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,borderTop:"1px solid #141420"}}>
            <button onClick={()=>setPanel(panel==="upload"?null:"upload")} style={{background:panel==="upload"?"#FB923C22":"transparent",border:"none",borderRight:"1px solid #141420",color:"#FB923C",fontSize:10,padding:"6px 4px",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>⬆ Upload</button>
            <button onClick={()=>setPanel(panel==="search"?null:"search")} style={{background:panel==="search"?"#4f8ef722":"transparent",border:"none",color:"#4f8ef7",fontSize:10,padding:"6px 4px",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>🔍 Pexels</button>
          </div>
        </div>

        {/* MIDDLE — Narration */}
        <div style={{padding:"10px 12px",borderRight:"1px solid #141420",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
            <span style={{fontSize:11}}>🎙</span>
            <span style={{color:"#667",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>Narration</span>
          </div>
          <textarea
            value={scene.narration}
            onChange={e=>onChange(idx,{...scene,narration:e.target.value})}
            placeholder="Write what will be spoken and shown as subtitles..."
            style={{flex:1,width:"100%",background:"transparent",border:"none",color:"#d0d0e0",fontSize:13,lineHeight:1.7,fontFamily:"inherit",resize:"none",outline:"none",minHeight:120}}
            rows={6}
          />
        </div>

        {/* RIGHT — Visual Direction */}
        <div style={{padding:"10px 12px",background:"#07070d",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
            <span style={{fontSize:11}}>🖼</span>
            <span style={{color:"#667",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>Visual Direction</span>
          </div>
          <textarea
            value={scene.visual}
            onChange={e=>onChange(idx,{...scene,visual:e.target.value})}
            onBlur={e=>autoSearch(e.target.value)}
            placeholder={"Describe what you want to see...\ne.g. aerial city skyline at sunset\nneuron synapse blue glow\nocean waves crashing on rocks"}
            style={{flex:1,width:"100%",background:"transparent",border:"none",color:"#a0b4c8",fontSize:12,lineHeight:1.7,fontFamily:"inherit",resize:"none",outline:"none",minHeight:120}}
            rows={6}
          />
          {scene.visual.trim()&&!med&&(
            <button onClick={()=>autoSearch(scene.visual)} disabled={fetching} style={{marginTop:6,background:"#1a2040",border:"1px solid #4f8ef750",borderRadius:6,padding:"4px 10px",color:"#90a8f0",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {fetching?"Searching...":"🔍 Search Pexels"}
            </button>
          )}
          {scene.visual.trim()&&med&&(
            <div style={{marginTop:4,color:"#334",fontSize:9}}>🔍 searched: "{scene.visual.trim().slice(0,30)}{scene.visual.trim().length>30?"...":""}"</div>
          )}
        </div>
      </div>

      {/* Upload panel */}
      {panel==="upload"&&(
        <div style={{borderTop:"1px solid #141420",padding:"12px 14px",background:"#06060c"}}>
          <div style={{color:"#778",fontSize:11,fontWeight:600,marginBottom:10}}>Upload your own media for Scene {idx+1}:</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"#0d0d14",border:"2px dashed #FB923C30",borderRadius:10,padding:"16px 8px",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:24}}>🖼</span>
              <span style={{color:"#FB923C",fontSize:12,fontWeight:700}}>Image</span>
              <span style={{color:"#334",fontSize:11}}>JPG · PNG · WEBP</span>
              <span style={{color:"#556",fontSize:10}}>Replaces Pexels photo</span>
              <input type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
            </label>
            <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"#0d0d14",border:"2px dashed #FB923C30",borderRadius:10,padding:"16px 8px",cursor:"pointer",textAlign:"center"}}>
              <span style={{fontSize:24}}>🎬</span>
              <span style={{color:"#FB923C",fontSize:12,fontWeight:700}}>Video Clip</span>
              <span style={{color:"#334",fontSize:11}}>MP4 · MOV · WEBM</span>
              <span style={{color:"#556",fontSize:10}}>Plays during this scene</span>
              <input type="file" accept="video/*" onChange={handleFile} style={{display:"none"}}/>
            </label>
          </div>
          <button onClick={()=>setPanel(null)} style={{marginTop:10,background:"none",border:"none",color:"#445",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕ Cancel</button>
        </div>
      )}

      {/* Pexels search panel */}
      {panel==="search"&&(
        <div style={{borderTop:"1px solid #141420",padding:"12px 14px",background:"#06060c"}}>
          <div style={{color:"#778",fontSize:11,fontWeight:600,marginBottom:8}}>Search Pexels for Scene {idx+1}:</div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
              placeholder="e.g. ocean sunset, busy city, space galaxy..."
              style={{flex:1,background:"#0d0d14",border:"1px solid #1e1e2a",borderRadius:8,padding:"8px 12px",color:"#d0d0e0",fontSize:13,fontFamily:"inherit"}}/>
            <button onClick={doSearch} disabled={searching||!searchQ.trim()} style={{background:"#1a2040",border:"1px solid #4f8ef750",borderRadius:8,padding:"8px 14px",color:"#90a8f0",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{searching?"...":"Search"}</button>
          </div>
          {searchErr&&<div style={{color:"#f59e0b",fontSize:11,marginBottom:8}}>{searchErr}</div>}
          {searchRes.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:8}}>
              {searchRes.map(p=>(
                <div key={p.id} onClick={()=>pickPhoto(p)} style={{height:70,borderRadius:8,overflow:"hidden",cursor:"pointer",border:"2px solid transparent",transition:"border-color .15s",position:"relative"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#4f8ef7"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
                  <img src={p.src?.medium||p.src?.small} alt={p.photographer} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,.65)",padding:"2px 5px",fontSize:9,color:"#ccc",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{p.photographer}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>{setPanel(null);setSearchRes([]);setSearchQ("");}} style={{background:"none",border:"none",color:"#445",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕ Close</button>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function CineForge() {
  // Setup
  const [anthropicKey, setAnthropicKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [showAK, setShowAK] = useState(false);
  const [showEK, setShowEK] = useState(false);
  const [scriptMode, setScriptMode]   = useState("own");
  const [voiceMode, setVoiceMode]     = useState("upload");

  // Scenes — each: { narration, visual, media }
  const [scenes, setScenes] = useState([
    { narration:"", visual:"", media:null },
  ]);
  const [videoTitle, setVideoTitle] = useState("");
  const [voiceId, setVoiceId]       = useState(EL_VOICES[0].id);
  const [genLoading, setGenLoading] = useState(false);
  const [aiBrief, setAiBrief]       = useState({topic:"",audience:"General",tone:"Educational"});

  // Audio
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL]   = useState(null);
  const [audioDur, setAudioDur]   = useState(null);
  const [splitPts, setSplitPts]   = useState([]);
  const [playingScene, setPlayingScene] = useState(null);
  const audioPreviewRef = useRef(null);

  // Style
  const [subStyle, setSubStyle]   = useState("bold");
  const [overlay, setOverlay]     = useState("dark");
  const [showTitle, setShowTitle] = useState(true);

  // Build
  const [step, setStep]           = useState(0);
  const [building, setBuilding]   = useState(false);
  const [buildLog, setBuildLog]   = useState([]);
  const [buildPct, setBuildPct]   = useState(0);
  const [outputURL, setOutputURL] = useState(null);
  const [outputMB, setOutputMB]   = useState(null);
  const [error, setError]         = useState("");

  const canvasRef = useRef(null);
  const logRef    = useRef(null);

  const log = msg => setBuildLog(l=>[...l,{t:new Date().toLocaleTimeString("en",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"}),msg}]);

  // Derived
  const fullScript    = scenes.filter(s=>s.narration.trim()).map(s=>s.narration.trim()).join("\n\n");
  const validScenes   = scenes.filter(s=>s.narration.trim());
  const totalWords    = fullScript.split(/\s+/).filter(Boolean).length;
  const setupValid    = (scriptMode==="own"||anthropicKey.trim()) && (voiceMode==="upload"||elevenlabsKey.trim());

  // Scene helpers
  const updateScene = (idx, updated) => setScenes(s=>s.map((x,i)=>i===idx?updated:x));
  const removeScene = (idx) => setScenes(s=>s.filter((_,i)=>i!==idx));
  const addScene    = ()    => setScenes(s=>[...s,{narration:"",visual:"",media:null}]);

  // Audio
  const handleAudioDrop = useCallback(e=>{
    e.preventDefault();
    const file=e.dataTransfer?.files?.[0]||e.target?.files?.[0];
    if(!file||!file.type.startsWith("audio/")) return;
    setAudioFile(file); const url=URL.createObjectURL(file); setAudioURL(url);
    const tmp=new Audio(url); tmp.onloadedmetadata=()=>setAudioDur(tmp.duration);
  },[]);

  // AI script gen
  const generateScript = async () => {
    if(!anthropicKey.trim()||!aiBrief.topic.trim()) return;
    setGenLoading(true); setError("");
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":anthropicKey.trim(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,messages:[{role:"user",content:`Write a compelling educational video narration script.\n\nTitle: "${videoTitle||aiBrief.topic}"\nTopic: ${aiBrief.topic}\nAudience: ${aiBrief.audience}\nTone: ${aiBrief.tone}\nTarget: 5-7 minutes (~700-900 words)\n\nRules:\n- 6-9 paragraphs separated by blank lines\n- Each paragraph = one visual scene\n- Conversational tone, no stage directions\n- Return ONLY the narration text.`}]})});
      if(!res.ok) throw new Error((await res.json().catch(()=>{}))?.error?.message||`HTTP ${res.status}`);
      const d=await res.json();
      const paras=d.content[0].text.trim().split(/\n{2,}/).map(p=>p.trim()).filter(p=>p.length>10);
      setScenes(paras.map(p=>({narration:p,visual:"",media:null})));
    } catch(e){ setError("Script generation failed: "+e.message); }
    setGenLoading(false);
  };

  // ElevenLabs
  const generateELAudio = async () => {
    log("🎙 Generating AI voice with ElevenLabs...");
    log(`  Sending ${fullScript.length} characters...`);
    const res=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,{method:"POST",
      headers:{"Accept":"audio/mpeg","xi-api-key":elevenlabsKey.trim(),"Content-Type":"application/json"},
      body:JSON.stringify({text:fullScript,model_id:"eleven_flash_v2_5",voice_settings:{stability:.5,similarity_boost:.75,style:.3,use_speaker_boost:true}})});
    if(!res.ok){ const t=await res.text(); let m=t.slice(0,200); try{const j=JSON.parse(t);m=j?.detail?.message||j?.detail||m;}catch(e){} throw new Error(`ElevenLabs: ${m}`); }
    const blob=await res.blob();
    log(`  ✓ Voice ready — ${(blob.size/1024).toFixed(0)} KB`);
    return blob;
  };

  // Scene time ranges
  const getSceneRanges = (totalDur, sceneList) => {
    if(splitPts.length===sceneList.length) {
      return splitPts.map((s,i)=>({start:s,end:i<sceneList.length-1?splitPts[i+1]:totalDur,dur:(i<sceneList.length-1?splitPts[i+1]:totalDur)-s}));
    }
    const wc=sceneList.map(s=>s.narration.trim().split(/\s+/).filter(Boolean).length);
    const tw=wc.reduce((a,b)=>a+b,0)||1;
    let cursor=0;
    return wc.map(w=>{ const dur=(w/tw)*totalDur; const r={start:cursor,end:cursor+dur,dur}; cursor+=dur; return r; });
  };

  // Build
  const buildVideo = async () => {
    setBuilding(true); setOutputURL(null); setError(""); setBuildLog([]); setBuildPct(0);
    const sl=validScenes; const total=sl.length;
    if(!total){ setError("Add at least one scene with narration."); setBuilding(false); return; }
    const subSt=SUBTITLE_STYLES.find(s=>s.id===subStyle);
    const bars=overlay==="bars";

    // Preload uploaded videos
    log(`📋 ${total} scenes ready`);
    for(let i=0;i<sl.length;i++){
      const m=sl[i].media;
      if(m?.kind==="video"&&m.videoUrl&&!m.videoEl){
        const vel=document.createElement("video");
        vel.src=m.videoUrl; vel.muted=true; vel.loop=true; vel.crossOrigin="anonymous";
        await new Promise(res=>{vel.oncanplay=res;vel.onerror=res;vel.load();setTimeout(res,5000);});
        m.videoEl=vel;
      }
    }

    // Audio
    setBuildPct(8);
    const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    let decoded=null;
    if(voiceMode==="elevenlabs"){
      try{ const blob=await generateELAudio(); decoded=await audioCtx.decodeAudioData(await blob.arrayBuffer()); log(`  ✓ ${decoded.duration.toFixed(1)}s`); }
      catch(e){ log(`  ✗ ${e.message}`); setError(e.message); setBuilding(false); await audioCtx.close(); return; }
    } else {
      log("🔊 Decoding voiceover...");
      try{ decoded=await audioCtx.decodeAudioData(await audioFile.arrayBuffer()); log(`  ✓ ${decoded.duration.toFixed(1)}s`); }
      catch(e){ log(`  ✗ ${e.message}`); setError("Could not decode audio — try MP3 or WAV."); setBuilding(false); await audioCtx.close(); return; }
    }

    const totalDur=decoded.duration;
    const ranges=getSceneRanges(totalDur,sl);
    setBuildPct(18);
    log("⏱ Scene timing:");
    ranges.forEach((r,i)=>log(`  Scene ${i+1}: ${fmt(r.start)} → ${fmt(r.end)} (${r.dur.toFixed(1)}s)`));

    // Setup recorder
    log("🎞 Setting up recorder...");
    setBuildPct(22);
    const canvas=canvasRef.current;
    canvas.width=1280; canvas.height=720;
    const ctx=canvas.getContext("2d");
    const dest=audioCtx.createMediaStreamDestination();
    const src=audioCtx.createBufferSource(); src.buffer=decoded; src.connect(dest);
    const combined=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
    const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
    const rec=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:6_000_000});
    const chunks=[]; rec.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
    rec.start(250); src.start(0);
    log(`▶ Recording (${mime})`);

    // Render using real-time RAF loop — synced to actual audio playback
    // This is MUCH faster than frame-by-frame sleep and never stalls
    log("🎨 Rendering scenes in real time...");

    await new Promise(resolve => {
      let sceneIdx = 0;
      let sceneStartTime = null;

      // Start playing uploaded videos for first scene
      const startScene = (si) => {
        const m = sl[si]?.media;
        if(m?.videoEl){ try{m.videoEl.currentTime=0;m.videoEl.play();}catch(e){} }
        sceneStartTime = null; // will be set on first frame of this scene
      };
      startScene(0);

      const render = (timestamp) => {
        if(sceneIdx >= sl.length){ resolve(); return; }

        if(sceneStartTime===null) sceneStartTime = timestamp;
        const elapsed = (timestamp - sceneStartTime) / 1000; // seconds into current scene
        const si = sceneIdx;
        const sc = sl[si];
        const dur = ranges[si].dur;
        const m = sc.media;
        const prog = Math.min(elapsed / dur, 1);

        // Draw background
        ctx.clearRect(0,0,1280,720);
        if(m?.videoEl&&m.videoEl.readyState>=2){
          const v=m.videoEl,vw=v.videoWidth,vh=v.videoHeight,sc2=Math.max(1280/vw,720/vh);
          ctx.drawImage(v,(1280-vw*sc2)/2,(720-vh*sc2)/2,vw*sc2,vh*sc2);
        } else if(m?.img){
          // For local images (no crossOrigin), catch any taint errors
          try {
            drawImgCover(ctx,m.img,(prog-.5)*50);
          } catch(e) {
            drawGradient(ctx,si); // fallback if tainted
          }
        } else {
          drawGradient(ctx,si);
        }

        drawOverlay(ctx,overlay,0);

        // Title card on first scene
        if(showTitle&&si===0&&elapsed<3){
          const a=elapsed<.6?elapsed/.6:elapsed>2.4?1-(elapsed-2.4)/.6:1;
          ctx.save(); ctx.globalAlpha=a;
          ctx.fillStyle="rgba(0,0,0,.65)"; roundRect(ctx,80,270,1120,180,12); ctx.fill();
          ctx.font="bold 48px Georgia"; ctx.fillStyle="#fff"; ctx.textAlign="center";
          ctx.fillText(videoTitle||"Your Video",640,360,1060); ctx.restore();
        }

        // Subtitles
        const sub=buildChunks(sc.narration,dur).find(ch=>elapsed>=ch.start&&elapsed<ch.end);
        if(sub) drawSub(ctx,sub.text,subSt,bars);

        // Progress update
        const overallProg = (si + prog) / sl.length;
        setBuildPct(22 + Math.round(overallProg * 68));

        // Advance scene when done
        if(elapsed >= dur){
          log(`  ✓ Scene ${si+1}/${sl.length} complete`);
          if(m?.videoEl) try{m.videoEl.pause();}catch(e){}
          sceneIdx++;
          if(sceneIdx < sl.length){ startScene(sceneIdx); }
          else{ resolve(); return; }
        }

        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);
    });

    // Outro card — 2 seconds
    ctx.fillStyle="#050508"; ctx.fillRect(0,0,1280,720);
    if(videoTitle){ ctx.font="bold 40px Georgia"; ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.fillText(videoTitle,640,340,1100); }
    ctx.font="22px Arial"; ctx.fillStyle="#4f8ef7"; ctx.textAlign="center"; ctx.fillText("Like · Share · Subscribe",640,400);
    await sleep(2200);

    rec.stop(); log("⏹ Finalizing..."); setBuildPct(96);
    await new Promise(res=>{rec.onstop=res;});
    await audioCtx.close();
    const blob=new Blob(chunks,{type:mime});
    setOutputURL(URL.createObjectURL(blob)); setOutputMB((blob.size/1024/1024).toFixed(1));
    setBuildPct(100); log(`✅ Done! ${(blob.size/1024/1024).toFixed(1)} MB`);
    setBuilding(false); setStep(4);
  };

  const reset = () => { setStep(0);setScenes([{narration:"",visual:"",media:null}]);setVideoTitle("");setAudioFile(null);setAudioURL(null);setAudioDur(null);setSplitPts([]);setOutputURL(null);setBuildLog([]);setBuildPct(0);setError(""); };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#07070b",color:"#ccd0e0",fontFamily:"'Inter','Helvetica Neue',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 24px #4f8ef728}50%{box-shadow:0 0 48px #4f8ef750}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d12}::-webkit-scrollbar-thumb{background:#222230;border-radius:2px}
        input,textarea,select,button{font-family:inherit}
        textarea:focus,input:focus{outline:1px solid #2a2a4a}
      `}</style>

      <canvas ref={canvasRef} style={{display:"none"}}/>

      {/* Header */}
      <header style={{position:"sticky",top:0,zIndex:200,background:"#07070bee",backdropFilter:"blur(14px)",borderBottom:"1px solid #12121e",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#1a2040,#28103a)",border:"1px solid #4f8ef740",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎬</div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:16,color:"#f0f0f8",letterSpacing:-.3}}>CineForge</div>
            <div style={{fontSize:10,color:"#30304a",letterSpacing:1.5,textTransform:"uppercase"}}>AI Video Studio</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {STEP_LABELS.map((lbl,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
              <div style={{display:"flex",alignItems:"center",gap:5,opacity:i<=step?1:.3,transition:"opacity .3s"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:i<step?"#00C896":i===step?"linear-gradient(135deg,#4f8ef7,#a259ff)":"#14141e",border:i===step?"none":"1px solid #22223a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:i<=step?"#fff":"#444"}}>{i<step?"✓":i+1}</div>
                <span style={{fontSize:11,color:i===step?"#ccd0e0":"#334",display:window.innerWidth<700?"none":"block"}}>{lbl}</span>
              </div>
              {i<STEP_LABELS.length-1&&<div style={{width:12,height:1,background:i<step?"#00C89640":"#181828",margin:"0 2px"}}/>}
            </div>
          ))}
        </div>
      </header>

      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px"}}>

        {/* ── STEP 0: SETUP ── */}
        {step===0&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>Setup</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 24px"}}>Choose your workflow and add any required API keys.</p>

            <Lbl>How will you create your script?</Lbl>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <button onClick={()=>setScriptMode("own")} style={modeBtn(scriptMode==="own","#00C896")}>✏️ Write my own</button>
              <button onClick={()=>setScriptMode("ai")} style={modeBtn(scriptMode==="ai","#4f8ef7")}>✨ AI generates it</button>
            </div>

            <Lbl>How will you add the voiceover?</Lbl>
            <div style={{display:"flex",gap:8,marginBottom:24}}>
              <button onClick={()=>setVoiceMode("upload")} style={modeBtn(voiceMode==="upload","#00C896")}>🎙 Upload my own audio</button>
              <button onClick={()=>setVoiceMode("elevenlabs")} style={modeBtn(voiceMode==="elevenlabs","#a259ff")}>🤖 AI voice (ElevenLabs)</button>
            </div>

            {scriptMode==="ai"&&<KeyField label="Anthropic API Key" link={{url:"https://console.anthropic.com",label:"Get key"}} value={anthropicKey} onChange={setAnthropicKey} show={showAK} onToggle={()=>setShowAK(s=>!s)} hint="AI script generation — ~$0.01 per script" placeholder="sk-ant-..."/>}
            {voiceMode==="elevenlabs"&&<KeyField label="ElevenLabs API Key" link={{url:"https://elevenlabs.io",label:"Get key"}} value={elevenlabsKey} onChange={setElevenlabsKey} show={showEK} onToggle={()=>setShowEK(s=>!s)} hint="Free tier: 10,000 characters/month" placeholder="Paste your ElevenLabs key"/>}

            <Info icon="🔒">All keys stay in your browser only — never stored or shared. Background images come from Pexels via your proxy (no extra key needed).</Info>
            {error&&<Err>{error}</Err>}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn disabled={!setupValid} onClick={()=>{setError("");setStep(1);}}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 1: SCENES & VOICE ── */}
        {step===1&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>Scenes & Voice</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>Build your video scene by scene. Each scene has narration, a visual direction for image search, and optional custom media.</p>

            {/* Title */}
            <div style={{marginBottom:16}}>
              <Lbl>Video Title</Lbl>
              <input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} placeholder="e.g. The Science of Black Holes" style={iStyle()}/>
            </div>

            {/* AI brief */}
            {scriptMode==="ai"&&(
              <div style={{background:"#0d0d14",border:"1px solid #14142a",borderRadius:12,padding:"14px 18px",marginBottom:16}}>
                <Lbl>AI Script Brief</Lbl>
                <div style={{display:"grid",gap:10}}>
                  <div><div style={{color:"#445",fontSize:11,marginBottom:4}}>Topic *</div><input value={aiBrief.topic} onChange={e=>setAiBrief(b=>({...b,topic:e.target.value}))} placeholder="e.g. How the immune system fights viruses" style={iStyle()}/></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><div style={{color:"#445",fontSize:11,marginBottom:4}}>Audience</div><select value={aiBrief.audience} onChange={e=>setAiBrief(b=>({...b,audience:e.target.value}))} style={iStyle()}>{["General","Students","Professionals","Kids","Experts"].map(a=><option key={a}>{a}</option>)}</select></div>
                    <div><div style={{color:"#445",fontSize:11,marginBottom:4}}>Tone</div><select value={aiBrief.tone} onChange={e=>setAiBrief(b=>({...b,tone:e.target.value}))} style={iStyle()}>{["Educational","Inspiring","Professional","Casual","Documentary"].map(t=><option key={t}>{t}</option>)}</select></div>
                  </div>
                  <button onClick={generateScript} disabled={!aiBrief.topic.trim()||genLoading} style={{padding:"10px",background:aiBrief.topic?"linear-gradient(135deg,#1a2040,#28103a)":"#0d0d10",border:`1px solid ${aiBrief.topic?"#4f8ef750":"#1e1e2a"}`,borderRadius:10,color:aiBrief.topic?"#90a8f0":"#334",fontWeight:700,fontSize:14,cursor:aiBrief.topic?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    {genLoading?<><span style={{width:16,height:16,border:"2px solid #4f8ef740",borderTop:"2px solid #4f8ef7",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>Generating...</>:"✨ Generate Script"}
                  </button>
                </div>
              </div>
            )}

            {/* Legend */}
            <div style={{display:"flex",gap:16,marginBottom:12,padding:"8px 14px",background:"#0a0a12",border:"1px solid #1a1a2a",borderRadius:8}}>
              {[["🎙 Narration","What gets spoken & shown as subtitles","#d0d0e0"],["🖼 Visual Direction","Describes the image to search for (not spoken)","#a0b4c8"],["⬆ Upload / 🔍 Pexels","Add your own media or search Pexels","#FB923C"]].map(([icon,desc,color])=>(
                <div key={icon} style={{flex:1}}>
                  <div style={{color,fontSize:11,fontWeight:700,marginBottom:2}}>{icon}</div>
                  <div style={{color:"#334",fontSize:10}}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Scene cards */}
            {scenes.map((sc,i)=>(
              <SceneCard key={i} scene={sc} idx={i} total={scenes.length}
                onChange={updateScene} onRemove={removeScene} onAdd={addScene}/>
            ))}

            <button onClick={addScene} style={{width:"100%",background:"#0a0a12",border:"2px dashed #1e1e2a",borderRadius:12,padding:"12px",color:"#445",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:20,transition:"all .2s"}}
              onMouseEnter={e=>{e.target.style.borderColor="#a259ff40";e.target.style.color="#a259ff";}}
              onMouseLeave={e=>{e.target.style.borderColor="#1e1e2a";e.target.style.color="#445";}}>
              + Add Scene
            </button>

            {/* Stats */}
            {totalWords>0&&(
              <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
                {[{l:`${totalWords} words`,c:"#4f8ef7"},{l:`${validScenes.length} scenes`,c:"#a259ff"},{l:`~${Math.round(totalWords/140)} min`,c:"#00C896"},{l:`${scenes.filter(s=>s.media).length} media set`,c:"#FB923C"}].map(({l,c})=>(
                  <span key={l} style={{background:c+"18",color:c,border:`1px solid ${c}30`,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:600}}>{l}</span>
                ))}
              </div>
            )}

            {/* Voice section */}
            {voiceMode==="upload"?(
              <div style={{marginBottom:16}}>
                <Lbl>Voiceover Audio</Lbl>
                <div onDrop={handleAudioDrop} onDragOver={e=>e.preventDefault()} onClick={()=>!audioFile&&document.getElementById("audioInput").click()}
                  style={{border:`2px dashed ${audioFile?"#00C896":"#1e1e2a"}`,borderRadius:12,padding:audioFile?"14px 18px":"28px 20px",textAlign:"center",cursor:audioFile?"default":"pointer",background:"#0d0d10",marginBottom:audioFile&&audioDur&&validScenes.length>1?10:0}}>
                  {audioFile?(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:22}}>🎙</span>
                        <div style={{textAlign:"left"}}>
                          <div style={{color:"#00C896",fontWeight:700,fontSize:13}}>{audioFile.name}</div>
                          <div style={{color:"#445",fontSize:11}}>{(audioFile.size/1024/1024).toFixed(1)} MB{audioDur?` · ${fmt(audioDur)}`:""}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <audio src={audioURL} controls style={{height:30,maxWidth:200}}/>
                        <button onClick={e=>{e.stopPropagation();setAudioFile(null);setAudioURL(null);setAudioDur(null);setSplitPts([]);}} style={{background:"none",border:"1px solid #2a2a3a",borderRadius:6,color:"#556",padding:"3px 9px",cursor:"pointer",fontSize:12}}>✕</button>
                      </div>
                    </div>
                  ):(
                    <><div style={{fontSize:28,marginBottom:8}}>🎙</div><div style={{color:"#778",fontSize:14,marginBottom:3}}>Drop your audio here</div><div style={{color:"#334",fontSize:12}}>MP3 · WAV · M4A · AAC</div></>
                  )}
                  <input id="audioInput" type="file" accept="audio/*" onChange={handleAudioDrop} style={{display:"none"}}/>
                </div>

                {/* Audio timeline */}
                {audioFile&&audioDur&&validScenes.length>0&&(()=>{
                  const ranges=getSceneRanges(audioDur,validScenes);
                  const colors=["#4f8ef7","#a259ff","#00C896","#FB923C","#F472B6","#2DD4BF","#FBBF24","#E879F9"];
                  return (
                    <div style={{background:"#0a0a12",border:"1px solid #1a1a2a",borderRadius:12,overflow:"hidden"}}>
                      <div style={{padding:"10px 14px",borderBottom:"1px solid #141420",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{color:"#778",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>🎵 Scene Audio Map</span>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          {splitPts.length>0&&<button onClick={()=>setSplitPts([])} style={{background:"none",border:"1px solid #2a2a3a",borderRadius:5,color:"#556",fontSize:10,padding:"2px 7px",cursor:"pointer"}}>↺ Auto</button>}
                          <span style={{color:"#334",fontSize:10}}>Total: {fmt(audioDur)}</span>
                        </div>
                      </div>
                      {/* Timeline bar */}
                      <div style={{padding:"10px 14px 6px"}}>
                        <div style={{position:"relative",height:20,borderRadius:4,overflow:"hidden",background:"#111118",marginBottom:4}}>
                          {ranges.map((r,i)=>(<div key={i} style={{position:"absolute",top:0,left:`${(r.start/audioDur)*100}%`,width:`${(r.dur/audioDur)*100}%`,height:"100%",background:colors[i%colors.length]+"40",borderRight:`1px solid ${colors[i%colors.length]}60`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:colors[i%colors.length],fontSize:8,fontWeight:700}}>S{i+1}</span></div>))}
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",color:"#334",fontSize:9,marginBottom:8}}><span>0:00</span><span>{fmt(audioDur/2)}</span><span>{fmt(audioDur)}</span></div>
                      </div>
                      {/* Scene rows */}
                      <div style={{padding:"0 14px 12px",display:"grid",gap:5}}>
                        {ranges.map((r,i)=>{
                          const color=colors[i%colors.length];
                          const isP=playingScene===i;
                          const preview=validScenes[i]?.narration.split(/\s+/).slice(0,7).join(" ")+"...";
                          const play=()=>{
                            if(isP){audioPreviewRef.current?.pause();setPlayingScene(null);return;}
                            const a=audioPreviewRef.current; if(!a) return;
                            a.src=audioURL; a.currentTime=r.start; a.play(); setPlayingScene(i);
                            const check=()=>{if(a.currentTime>=r.end){a.pause();setPlayingScene(null);a.removeEventListener("timeupdate",check);}};
                            a.addEventListener("timeupdate",check);
                          };
                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:isP?color+"12":"#0d0d14",border:`1px solid ${isP?color+"40":"#141420"}`,borderRadius:7,transition:"all .2s"}}>
                              <span style={{background:color+"20",color,border:`1px solid ${color}40`,borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700,flexShrink:0}}>S{i+1}</span>
                              <button onClick={play} style={{width:24,height:24,borderRadius:"50%",background:isP?color+"30":"#111",border:`1px solid ${isP?color:"#1e1e2a"}`,color:isP?color:"#556",fontSize:10,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{isP?"⏸":"▶"}</button>
                              <span style={{color:color,fontSize:10,fontFamily:"monospace",flexShrink:0,minWidth:80}}>{fmt(r.start)} → {fmt(r.end)}</span>
                              <span style={{color:"#445",fontSize:10,flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>"{preview}"</span>
                              {i>0&&(<div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                                <span style={{color:"#334",fontSize:9}}>Start:</span>
                                <input type="number" step="0.5" min="0" max={audioDur} value={(splitPts.length===validScenes.length?splitPts[i]:r.start).toFixed(1)}
                                  onChange={e=>{const v=parseFloat(e.target.value)||0;setSplitPts(prev=>{const base=ranges.map(r=>r.start);const pts=prev.length===validScenes.length?[...prev]:[...base];pts[i]=Math.max(pts[i-1]+.5,Math.min(v,i<validScenes.length-1?(pts[i+1]||audioDur)-.5:audioDur-.5));return pts;});}}
                                  style={{width:50,background:"#0d0d10",border:"1px solid #1e1e2a",borderRadius:4,padding:"2px 4px",color:"#90a8f0",fontSize:10,fontFamily:"monospace",textAlign:"center"}}/>
                                <span style={{color:"#334",fontSize:9}}>s</span>
                              </div>)}
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
                <Lbl>AI Voice (ElevenLabs)</Lbl>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
                  {EL_VOICES.map(v=>(
                    <div key={v.id} onClick={()=>setVoiceId(v.id)} style={{background:voiceId===v.id?"#111a2a":"#0d0d10",border:`1.5px solid ${voiceId===v.id?"#a259ff":"#1a1a2a"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",transition:"all .2s"}}>
                      <div style={{color:voiceId===v.id?"#c0a0ff":"#d0d0e0",fontWeight:700,fontSize:13,marginBottom:2}}>{v.name}</div>
                      <div style={{color:"#445",fontSize:10}}>{v.desc}</div>
                    </div>
                  ))}
                </div>
                <Info icon="ℹ️" color="#a259ff">Free tier: 10,000 chars/month. Uses eleven_flash_v2_5.</Info>
              </div>
            )}

            {error&&<Err>{error}</Err>}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <Btn variant="back" onClick={()=>setStep(0)}>← Back</Btn>
              <Btn disabled={!validScenes.length||(voiceMode==="upload"&&!audioFile)} onClick={()=>setStep(2)}>Continue to Style →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 2: STYLE ── */}
        {step===2&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>Visual Style</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 24px"}}>Subtitles, overlays, and finishing touches.</p>
            <Lbl>Subtitle Style</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:24}}>
              {SUBTITLE_STYLES.map(s=>(
                <div key={s.id} onClick={()=>setSubStyle(s.id)} style={{background:subStyle===s.id?"#111128":"#0d0d12",border:`1.5px solid ${subStyle===s.id?"#5060c0":"#14142a"}`,borderRadius:10,padding:"10px 8px",cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
                  <div style={{background:"#1a1a24",borderRadius:6,padding:"6px 4px",marginBottom:6,fontSize:11,fontWeight:700,color:s.color}}>{s.label}</div>
                  <div style={{color:subStyle===s.id?"#8090f0":"#334",fontSize:10}}>{subStyle===s.id?"✓ Active":"Select"}</div>
                </div>
              ))}
            </div>
            <Lbl>Visual Overlay</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24}}>
              {OVERLAY_STYLES.map(o=>(
                <div key={o.id} onClick={()=>setOverlay(o.id)} style={{background:overlay===o.id?"#0d1a12":"#0d0d12",border:`1.5px solid ${overlay===o.id?"#00C896":"#14142a"}`,borderRadius:10,padding:"12px",cursor:"pointer",textAlign:"center",color:overlay===o.id?"#00C896":"#445",fontSize:13,fontWeight:600,transition:"all .2s"}}>{o.label}</div>
              ))}
            </div>
            <Lbl>Extras</Lbl>
            <div onClick={()=>setShowTitle(v=>!v)} style={{display:"flex",alignItems:"center",gap:10,background:showTitle?"#111128":"#0d0d12",border:`1.5px solid ${showTitle?"#5060c0":"#14142a"}`,borderRadius:10,padding:"11px 16px",cursor:"pointer",width:"fit-content",marginBottom:20}}>
              <div style={{width:17,height:17,borderRadius:4,background:showTitle?"#5060c0":"#1a1a24",border:`1.5px solid ${showTitle?"#5060c0":"#2a2a3a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{showTitle?"✓":""}</div>
              <span style={{color:showTitle?"#a0b0f0":"#556",fontSize:13}}>Show title intro card (first 3 seconds)</span>
            </div>
            <Info icon="📐" color="#445">Output: 1280×720 HD WebM. Convert free at <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer" style={{color:"#4f8ef7"}}>CloudConvert ↗</a></Info>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <Btn variant="back" onClick={()=>setStep(1)}>← Back</Btn>
              <Btn onClick={()=>setStep(3)}>Continue to Build →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 3: BUILD ── */}
        {step===3&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>{building?"Building…":"Ready to Build"}</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>{building?"Keep this tab open and visible.":"Review and start production."}</p>

            {!building&&(
              <>
                <div style={{background:"#0d0d12",border:"1px solid #14142a",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
                  <div style={{color:"#334",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Production Summary</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>
                    {[["Scenes",validScenes.length],["Words",totalWords],["Media set",`${scenes.filter(s=>s.media).length}/${scenes.length} scenes`],["Voice",voiceMode==="elevenlabs"?`ElevenLabs · ${EL_VOICES.find(v=>v.id===voiceId)?.name}`:audioFile?.name?.slice(0,22)+"…"],["Subtitles",SUBTITLE_STYLES.find(s=>s.id===subStyle)?.label],["Resolution","1280 × 720 HD"]].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #10101a"}}>
                        <span style={{color:"#445",fontSize:12}}>{k}</span><span style={{color:"#a0a8c0",fontSize:12,fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Info icon="⚡" color="#f59e0b">Keep this tab <strong style={{color:"#f59e0b"}}>visible</strong> during production for accurate frame timing.</Info>
              </>
            )}

            {building&&(
              <div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",color:"#556",fontSize:12,marginBottom:4}}><span>Progress</span><span>{buildPct}%</span></div>
                  <ProgBar pct={buildPct}/>
                </div>
                <div ref={logRef} style={{background:"#050508",border:"1px solid #10101c",borderRadius:10,padding:"12px 14px",height:260,overflowY:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
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

            {error&&<Err>{error}</Err>}
            {!building&&(
              <div style={{display:"flex",gap:10,marginTop:18}}>
                <Btn variant="back" onClick={()=>setStep(2)}>← Back</Btn>
                <button onClick={buildVideo} style={{flex:1,padding:"15px 24px",background:"linear-gradient(135deg,#0a2010,#162808)",border:"1px solid #00C89640",borderRadius:12,color:"#00C896",fontWeight:800,fontSize:17,fontFamily:"'Playfair Display',serif",fontStyle:"italic",cursor:"pointer",animation:"glow 2.5s ease infinite"}}>
                  🚀 Start Production
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: EXPORT ── */}
        {step===4&&outputURL&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>Your Video is Ready 🎉</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>{outputMB} MB · 1280×720 HD · WebM</p>
            <div style={{background:"#000",borderRadius:14,overflow:"hidden",border:"1px solid #14142a",marginBottom:18,boxShadow:"0 20px 60px rgba(0,0,0,0.9)"}}>
              <video src={outputURL} controls style={{width:"100%",display:"block",maxHeight:440}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              <a href={outputURL} download={`${(videoTitle||"video").replace(/\s+/g,"-")}.webm`} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"linear-gradient(135deg,#0f2030,#0a1828)",border:"1px solid #4f8ef750",borderRadius:12,padding:"13px",color:"#4f8ef7",fontWeight:700,fontSize:14,textDecoration:"none"}}>⬇ Download WebM</a>
              <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#0d0d12",border:"1px solid #14142a",borderRadius:12,padding:"13px",color:"#556",fontSize:13,textDecoration:"none"}}>🔄 Convert to MP4 (free) ↗</a>
            </div>
            <div style={{background:"#0d0d12",border:"1px solid #14142a",borderRadius:12,padding:"16px 18px",marginBottom:14}}>
              <div style={{color:"#334",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Next Steps</div>
              {[["1","Download your .webm above"],["2","Convert to .mp4 via CloudConvert (free)"],["3","Use VidLaunch to generate optimized titles, hashtags & descriptions per platform"],["4","Upload natively to YouTube, TikTok, Instagram, Facebook, LinkedIn & Pinterest"]].map(([n,t])=>(
                <div key={n} style={{display:"flex",gap:10,marginBottom:7}}>
                  <span style={{background:"#4f8ef720",color:"#4f8ef7",width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{n}</span>
                  <span style={{color:"#778",fontSize:13,lineHeight:1.6}}>{t}</span>
                </div>
              ))}
            </div>
            <button onClick={reset} style={{background:"#0d0d12",border:"1px solid #14142a",color:"#445",borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:13}}>← Make Another Video</button>
          </div>
        )}
      </div>
    </div>
  );
}
