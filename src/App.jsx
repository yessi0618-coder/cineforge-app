import { useState, useRef, useCallback } from "react";

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = {
  motivation: {
    id: "motivation",
    label: "Psychology & Finance",
    emoji: "🧠",
    desc: "Clean, professional, authoritative",
    colorGrade: "clean",
    accentColor: "#E2E8F0",
    accentLine: "#64748B",
    titleFont: "700 54px 'Helvetica Neue',Arial",
    titleColor: "#ffffff",
    subtitleTextColor: "rgba(255,255,255,0.75)",
    subtitleTextFont: "300 22px 'Helvetica Neue',Arial",
    introBg: "rgba(0,0,0,0.58)",
    outroBg: "rgba(8,12,24,0.92)",
    progressColor: "#94A3B8",
    lowerBg: "#1E293B",
    lowerAccent: "#64748B",
    particles: false,
    defaultBars: false,
  },
  bedtime: {
    id: "bedtime",
    label: "Bedtime & Ambient",
    emoji: "🌙",
    desc: "Dark, dreamy, deeply calming",
    colorGrade: "dark",
    accentColor: "#DDD6FE",
    accentLine: "#7C3AED",
    titleFont: "300 54px Georgia,serif",
    titleColor: "#EDE9FE",
    subtitleTextColor: "rgba(237,233,254,0.7)",
    subtitleTextFont: "300 20px Georgia,serif",
    introBg: "rgba(0,0,0,0.72)",
    outroBg: "rgba(4,0,16,0.94)",
    progressColor: "#7C3AED",
    lowerBg: "#1E1B4B",
    lowerAccent: "#A78BFA",
    particles: true,
    defaultBars: true,
  },
};

const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(Math.floor(s%60)).padStart(2,"0")}`;

// ── Canvas Drawing ────────────────────────────────────────────────────────────
function roundRect(ctx,x,y,w,h,r=6){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function applyColorGrade(ctx, preset) {
  if (preset.colorGrade === "dark") {
    // Deep cinematic vignette with purple tint
    const g = ctx.createRadialGradient(640,360,100,640,360,800);
    g.addColorStop(0,"rgba(5,0,20,0.08)");
    g.addColorStop(0.5,"rgba(5,0,20,0.22)");
    g.addColorStop(1,"rgba(2,0,10,0.72)");
    ctx.fillStyle=g; ctx.fillRect(0,0,1280,720);
    ctx.fillStyle="rgba(40,10,80,0.07)";
    ctx.fillRect(0,0,1280,720);
  } else {
    // Clean lift: subtle brightness + soft vignette
    ctx.fillStyle="rgba(255,255,255,0.03)";
    ctx.fillRect(0,0,1280,720);
    const g=ctx.createRadialGradient(640,360,200,640,360,780);
    g.addColorStop(0,"rgba(0,0,0,0)");
    g.addColorStop(1,"rgba(0,0,0,0.25)");
    ctx.fillStyle=g; ctx.fillRect(0,0,1280,720);
  }
}

function drawParticles(ctx, t) {
  ctx.save();
  for(let i=0;i<70;i++){
    const x=((Math.sin(i*127.1+t*.25)*.5+.5))*1280;
    const y=((Math.sin(i*311.7+t*.18)*.5+.5))*720;
    const flicker=.25+Math.sin(t*1.8+i*.7)*.2;
    const size=.6+Math.sin(i*43.7)*.5;
    ctx.globalAlpha=flicker*.55;
    ctx.fillStyle="#C4B5FD";
    ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();
}

function drawProgressBar(ctx, progress, color) {
  ctx.fillStyle="rgba(0,0,0,0.3)";ctx.fillRect(0,714,1280,6);
  ctx.fillStyle=color;ctx.fillRect(0,714,1280*Math.min(progress,1),6);
}

function drawLowerThird(ctx, config, elapsed, preset) {
  if(!config.show||!config.line1) return;
  if(elapsed<2||elapsed>8) return;
  const a=elapsed<3?(elapsed-2):elapsed>7?1-(elapsed-7):1;
  if(a<=0) return;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(a,1));
  ctx.font="700 15px 'Helvetica Neue',Arial";
  const w1=ctx.measureText(config.line1).width;
  const w2=config.line2?ctx.measureText(config.line2).width:0;
  const barW=Math.max(w1,w2)+56;
  const x=48,y=610,h=54;
  ctx.fillStyle=preset.lowerBg+"ee"; roundRect(ctx,x,y,barW,h,5);ctx.fill();
  ctx.fillStyle=preset.lowerAccent; ctx.fillRect(x,y,4,h);
  ctx.fillStyle="#fff"; ctx.textAlign="left";
  ctx.font="700 15px 'Helvetica Neue',Arial";
  ctx.fillText(config.line1,x+14,y+22);
  if(config.line2){
    ctx.font="400 12px 'Helvetica Neue',Arial";
    ctx.fillStyle="rgba(255,255,255,0.72)";
    ctx.fillText(config.line2,x+14,y+40);
  }
  ctx.restore();
}

function drawWatermark(ctx, text, preset) {
  if(!text) return;
  ctx.save();
  ctx.globalAlpha=0.45;
  ctx.font="600 13px 'Helvetica Neue',Arial";
  ctx.fillStyle=preset.accentColor;
  ctx.textAlign="right";
  ctx.fillText(text,1252,32);
  ctx.restore();
}

function drawIntroCard(ctx, preset, cfg, elapsed, dur) {
  const fadeIn=0.8, fadeOut=0.6;
  const a=elapsed<fadeIn?elapsed/fadeIn:elapsed>dur-fadeOut?1-(elapsed-(dur-fadeOut))/fadeOut:1;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(a,1));
  // Dark overlay
  ctx.fillStyle=preset.introBg; ctx.fillRect(0,0,1280,720);
  if(preset.particles) drawParticles(ctx,elapsed);
  // Animated accent line
  const lp=Math.min((elapsed-.4)/.6,1);
  if(lp>0){
    const lw=Math.round(240*lp);
    ctx.fillStyle=preset.accentLine;
    ctx.fillRect(640-lw/2,300,lw,2);
  }
  // Title
  if(elapsed>.5){
    const ta=Math.min((elapsed-.5)/.5,1);
    ctx.globalAlpha=Math.min(a,ta);
    ctx.font=preset.titleFont;
    ctx.fillStyle=preset.titleColor;
    ctx.textAlign="center";
    ctx.shadowColor="rgba(0,0,0,0.7)";ctx.shadowBlur=28;
    ctx.fillText(cfg.title||"",640,368,1100);
    ctx.shadowBlur=0;
    if(cfg.subtitle){
      ctx.font=preset.subtitleTextFont;
      ctx.fillStyle=preset.subtitleTextColor;
      ctx.fillText(cfg.subtitle,640,416,900);
    }
  }
  ctx.restore();
}

function drawOutroCard(ctx, preset, cfg, elapsed) {
  const a=elapsed<.8?elapsed/.8:1;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(a,1));
  ctx.fillStyle=preset.outroBg;ctx.fillRect(0,0,1280,720);
  if(preset.particles) drawParticles(ctx,elapsed+100);
  // Animated ring
  const rp=Math.min(elapsed*.8,1);
  ctx.beginPath();ctx.arc(640,268,56*rp,0,Math.PI*2);
  ctx.strokeStyle=preset.accentLine;ctx.lineWidth=2;ctx.stroke();
  // Top label
  ctx.font=`${preset.id==="bedtime"?"300 italic":"600"} 17px ${preset.id==="bedtime"?"Georgia":"'Helvetica Neue',Arial"}`;
  ctx.fillStyle=preset.accentColor;ctx.textAlign="center";
  ctx.fillText(preset.id==="bedtime"?"Sweet dreams 🌙":"Thank you for watching",640,274);
  // Main title
  ctx.font=preset.titleFont.replace("54px","38px");
  ctx.fillStyle="#ffffff";
  ctx.shadowColor="rgba(0,0,0,0.6)";ctx.shadowBlur=20;
  ctx.fillText(cfg.title||"",640,358,1100);ctx.shadowBlur=0;
  // CTA
  if(cfg.cta){
    ctx.font="600 17px 'Helvetica Neue',Arial";
    ctx.fillStyle=preset.accentColor;
    ctx.fillText(cfg.cta,640,420);
  }
  ctx.restore();
}

// ── UI helpers ────────────────────────────────────────────────────────────────
const iStyle=(ex={})=>({width:"100%",background:"#0a0a10",border:"1px solid #1e1e2a",borderRadius:10,padding:"10px 14px",color:"#d0d0e0",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",...ex});
function Lbl({children}){return <div style={{color:"#556",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:700}}>{children}</div>;}
function Info({icon="ℹ️",color="#4f8ef7",children}){return <div style={{background:color+"14",border:`1px solid ${color}28`,borderRadius:10,padding:"10px 14px",display:"flex",gap:10,marginBottom:12}}><span style={{flexShrink:0}}>{icon}</span><span style={{color:"#8090a0",fontSize:12,lineHeight:1.65}}>{children}</span></div>;}
function ErrBox({children}){return <div style={{background:"#2a0808",border:"1px solid #f8717140",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginTop:10}}>⚠ {children}</div>;}
function ProgBar({pct,color,label}){return(<div><div style={{display:"flex",justifyContent:"space-between",color:"#556",fontSize:12,marginBottom:4}}><span>{label}</span><span>{pct}%</span></div><div style={{background:"#111",borderRadius:4,height:6,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:4,transition:"width .4s"}}/></div></div>);}

function Toggle({on,onChange,label,desc,color}){
  return(
    <div onClick={()=>onChange(!on)} style={{display:"flex",gap:12,background:on?color+"14":"#0a0a10",border:`1.5px solid ${on?color:"#1e1e2a"}`,borderRadius:10,padding:"11px 14px",cursor:"pointer",marginBottom:8,transition:"all .2s",alignItems:"center"}}>
      <div style={{width:20,height:20,borderRadius:4,background:on?color:"#111",border:`1.5px solid ${on?color:"#2a2a3a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{on?"✓":""}</div>
      <div><div style={{color:on?"#e0e8f0":"#888",fontWeight:600,fontSize:13}}>{label}</div>{desc&&<div style={{color:"#445",fontSize:11,marginTop:1}}>{desc}</div>}</div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function VideoPolish() {
  const [step,setStep]             = useState(0);
  const [presetId,setPresetId]     = useState(null);
  // Video
  const [videoFile,setVideoFile]   = useState(null);
  const [videoURL,setVideoURL]     = useState(null);
  const [videoDur,setVideoDur]     = useState(null);
  // Config
  const [title,setTitle]           = useState("");
  const [subtitle,setSubtitle]     = useState("");
  const [cta,setCta]               = useState("");
  const [watermark,setWatermark]   = useState("");
  // Elements
  const [showIntro,setShowIntro]   = useState(true);
  const [showOutro,setShowOutro]   = useState(true);
  const [showProgress,setShowProgress] = useState(true);
  const [showBars,setShowBars]     = useState(false);
  const [lowerShow,setLowerShow]   = useState(false);
  const [lowerLine1,setLowerLine1] = useState("");
  const [lowerLine2,setLowerLine2] = useState("");
  // Build
  const [building,setBuilding]     = useState(false);
  const [buildLog,setBuildLog]     = useState([]);
  const [buildPct,setBuildPct]     = useState(0);
  const [outputURL,setOutputURL]   = useState(null);
  const [outputMB,setOutputMB]     = useState(null);
  const [error,setError]           = useState("");

  const canvasRef = useRef(null);
  const logRef    = useRef(null);
  const log = msg => setBuildLog(l=>[...l,{t:new Date().toLocaleTimeString("en",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"}),msg}]);

  const preset = presetId ? PRESETS[presetId] : null;
  const ac = preset?.accentLine||"#4f8ef7";

  const selectPreset = id => {
    setPresetId(id);
    setShowBars(PRESETS[id].defaultBars);
    setCta(id==="bedtime"?"Follow for more calming content":"Like · Subscribe · Share");
    setStep(1);
  };

  // Video upload
  const handleDrop = useCallback(e=>{
    e.preventDefault();
    const file=e.dataTransfer?.files?.[0]||e.target?.files?.[0];
    if(!file||!file.type.startsWith("video/")) return;
    setVideoFile(file);
    const url=URL.createObjectURL(file); setVideoURL(url);
    const tmp=document.createElement("video");
    tmp.onloadedmetadata=()=>setVideoDur(tmp.duration); tmp.src=url;
  },[]);

  // Build
  const buildVideo = async () => {
    if(!videoFile||!preset){ setError("Please complete all steps."); return; }
    setBuilding(true);setOutputURL(null);setError("");setBuildLog([]);setBuildPct(0);

    const INTRO_DUR = showIntro ? 5 : 0;
    const OUTRO_DUR = showOutro ? 5 : 0;
    const cfg = { title, subtitle, cta };
    const lowerCfg = { show:lowerShow, line1:lowerLine1, line2:lowerLine2 };

    log("🎬 Loading video...");
    const canvas=canvasRef.current;
    canvas.width=1280; canvas.height=720;
    const ctx=canvas.getContext("2d");

    // Load video element
    const vid=document.createElement("video");
    vid.src=videoURL;
    await new Promise(res=>{vid.oncanplay=res;vid.onerror=res;vid.load();setTimeout(res,8000);});
    const duration=vid.duration||videoDur||60;
    log(`  ✓ Loaded: ${fmt(duration)} (${duration.toFixed(1)}s)`);
    setBuildPct(6);

    // Audio
    log("🔊 Capturing audio...");
    const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const dest=audioCtx.createMediaStreamDestination();
    try{
      const vs=vid.captureStream?vid.captureStream():null;
      if(vs?.getAudioTracks().length>0){
        audioCtx.createMediaStreamSource(vs).connect(dest);
        log("  ✓ Audio captured");
      } else log("  ⚠ No audio stream detected");
    }catch(e){log("  ⚠ Audio capture unavailable: "+e.message);}
    setBuildPct(10);

    // Recorder
    log("🎞 Starting recorder...");
    const combined=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
    const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
    const rec=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:8_000_000});
    const chunks=[]; rec.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
    rec.start(250);
    log(`▶ Recording`);

    // Helper: render a timed segment
    const renderSeg = (drawFn, durSec, p0, p1) => new Promise(res=>{
      const t0=performance.now();
      const frame=()=>{
        const el=Math.min((performance.now()-t0)/1000,durSec);
        drawFn(el);
        setBuildPct(Math.round(p0+(el/durSec)*(p1-p0)));
        el<durSec ? requestAnimationFrame(frame) : res();
      };
      requestAnimationFrame(frame);
    });

    // ── INTRO ────────────────────────────────────────────────────────────────
    if(showIntro){
      log("✨ Rendering intro...");
      vid.currentTime=0;
      await new Promise(r=>{vid.onseeked=r;setTimeout(r,500);});
      await renderSeg(el=>{
        if(vid.readyState>=2) ctx.drawImage(vid,0,0,1280,720);
        else{ctx.fillStyle="#050508";ctx.fillRect(0,0,1280,720);}
        applyColorGrade(ctx,preset);
        if(showBars){ctx.fillStyle="#000";ctx.fillRect(0,0,1280,88);ctx.fillRect(0,632,1280,88);}
        drawIntroCard(ctx,preset,cfg,el,INTRO_DUR);
        drawWatermark(ctx,watermark,preset);
      }, INTRO_DUR, 10, 18);
      log("  ✓ Intro done");
    }

    // ── MAIN VIDEO ───────────────────────────────────────────────────────────
    log("🎥 Rendering main video...");
    vid.currentTime=0;
    await new Promise(r=>{vid.onseeked=r;setTimeout(r,1000);});
    vid.play().catch(()=>{});
    const audioStart=audioCtx.currentTime;

    await new Promise(res=>{
      const frame=()=>{
        const el=Math.min(audioCtx.currentTime-audioStart,duration);
        const prog=el/duration;
        if(el>=duration||vid.ended){vid.pause();res();return;}
        // Draw video frame
        if(vid.readyState>=2) ctx.drawImage(vid,0,0,1280,720);
        else{ctx.fillStyle="#080808";ctx.fillRect(0,0,1280,720);}
        // Polish layers
        applyColorGrade(ctx,preset);
        if(preset.particles) drawParticles(ctx,el);
        if(showBars){ctx.fillStyle="#000";ctx.fillRect(0,0,1280,88);ctx.fillRect(0,632,1280,88);}
        if(showProgress) drawProgressBar(ctx,prog,preset.progressColor);
        drawLowerThird(ctx,lowerCfg,el,preset);
        drawWatermark(ctx,watermark,preset);
        setBuildPct(Math.round(18+prog*70));
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    log("  ✓ Main video done");
    setBuildPct(88);

    // ── OUTRO ────────────────────────────────────────────────────────────────
    if(showOutro){
      log("✨ Rendering outro...");
      await renderSeg(el=>{
        if(vid.readyState>=2) ctx.drawImage(vid,0,0,1280,720);
        else{ctx.fillStyle="#050508";ctx.fillRect(0,0,1280,720);}
        applyColorGrade(ctx,preset);
        drawOutroCard(ctx,preset,cfg,el);
        drawWatermark(ctx,watermark,preset);
      }, OUTRO_DUR, 88, 96);
      log("  ✓ Outro done");
    }

    // Finish
    rec.stop(); log("⏹ Finalizing..."); setBuildPct(97);
    await new Promise(r=>{rec.onstop=r;});
    await audioCtx.close();
    const blob=new Blob(chunks,{type:mime});
    setOutputURL(URL.createObjectURL(blob));
    setOutputMB((blob.size/1024/1024).toFixed(1));
    setBuildPct(100); log(`✅ Done — ${(blob.size/1024/1024).toFixed(1)} MB`);
    setBuilding(false); setStep(4);
  };

  const reset=()=>{setStep(0);setPresetId(null);setVideoFile(null);setVideoURL(null);setVideoDur(null);setOutputURL(null);setBuildLog([]);setBuildPct(0);setError("");setTitle("");setSubtitle("");};

  // ── RENDER ───────────────────────────────────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:"#07070b",color:"#ccd0e0",fontFamily:"'Inter','Helvetica Neue',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,300;0,700;0,900;1,300;1,700&family=JetBrains+Mono:wght@400&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px ${ac}30}50%{box-shadow:0 0 44px ${ac}60}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d12}::-webkit-scrollbar-thumb{background:#222230;border-radius:2px}
        input,textarea,select,button{font-family:inherit}
        .card:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.4)!important;}
      `}</style>

      <canvas ref={canvasRef} style={{display:"none"}}/>

      {/* Header */}
      <header style={{position:"sticky",top:0,zIndex:200,background:"#07070bee",backdropFilter:"blur(14px)",borderBottom:"1px solid #12121e",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:9,background:presetId==="bedtime"?"linear-gradient(135deg,#1e1b4b,#4c1d95)":"linear-gradient(135deg,#1e293b,#334155)",border:`1px solid ${ac}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
            {preset?.emoji||"✨"}
          </div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:17,color:"#f0f0f8",letterSpacing:-.3}}>VideoPolish</div>
            <div style={{fontSize:10,color:"#30304a",letterSpacing:1.5,textTransform:"uppercase"}}>{preset?.label||"Professional Video Finisher"}</div>
          </div>
        </div>
        {/* Steps */}
        {presetId&&(
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {["Video","Polish","Build","Export"].map((lbl,i)=>{
              const si=i+1;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,opacity:si<=step?1:.3,transition:"opacity .3s",cursor:si<step?"pointer":"default"}} onClick={()=>si<step&&setStep(si)}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:si<step?"#00C896":si===step?`linear-gradient(135deg,${ac},${preset.lowerAccent})`:"#14141e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:si<=step?"#fff":"#444"}}>{si<step?"✓":si}</div>
                    <span style={{fontSize:11,color:si===step?"#ccc":"#334"}}>{lbl}</span>
                  </div>
                  {i<3&&<div style={{width:10,height:1,background:si<step?ac+"60":"#181828",margin:"0 2px"}}/>}
                </div>
              );
            })}
          </div>
        )}
      </header>

      <div style={{maxWidth:820,margin:"0 auto",padding:"32px 20px"}}>

        {/* STEP 0 — Choose Category */}
        {step===0&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:30,color:"#f0f0f8",margin:"0 0 8px"}}>What kind of video are you polishing?</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 32px"}}>Each category has a distinct visual style and mood tailored for that audience.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

              {/* Motivation */}
              <div className="card" onClick={()=>selectPreset("motivation")}
                style={{background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",border:"1px solid #2d3748",borderRadius:18,padding:"32px 26px",cursor:"pointer",transition:"all .25s",boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
                <div style={{fontSize:44,marginBottom:16}}>🧠</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:22,color:"#f0f0f8",marginBottom:8}}>Psychology & Finance</div>
                <div style={{color:"#64748b",fontSize:13,lineHeight:1.7,marginBottom:20}}>Motivational and educational content. Clean, professional look that builds credibility and keeps viewers engaged.</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {["Clean grade","Neutral tones","Topic label","Progress bar","Bold titles"].map(t=>(
                    <span key={t} style={{background:"rgba(255,255,255,0.05)",border:"1px solid #334155",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#94A3B8"}}>{t}</span>
                  ))}
                </div>
                <div style={{marginTop:20,color:"#64748B",fontSize:13,fontWeight:600}}>Select →</div>
              </div>

              {/* Bedtime */}
              <div className="card" onClick={()=>selectPreset("bedtime")}
                style={{background:"linear-gradient(135deg,#0a0518 0%,#1e1b4b 100%)",border:"1px solid #312e81",borderRadius:18,padding:"32px 26px",cursor:"pointer",transition:"all .25s",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
                <div style={{fontSize:44,marginBottom:16}}>🌙</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontWeight:300,fontStyle:"italic",fontSize:22,color:"#EDE9FE",marginBottom:8}}>Bedtime & Ambient</div>
                <div style={{color:"#6d6a9c",fontSize:13,lineHeight:1.7,marginBottom:20}}>Calming stories and soothing sounds. Deep dark atmosphere with soft glowing particles and dreamy transitions.</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {["Dark vignette","Lavender tones","Star particles","Cinematic bars","Soft serif titles"].map(t=>(
                    <span key={t} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #312e81",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#A78BFA"}}>{t}</span>
                  ))}
                </div>
                <div style={{marginTop:20,color:"#6d6a9c",fontSize:13,fontWeight:600}}>Select →</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 — Upload & Info */}
        {step===1&&preset&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:presetId==="bedtime"?300:700,fontStyle:presetId==="bedtime"?"italic":"normal",fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>{preset.emoji} Upload Your Video</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>Drop your {presetId==="bedtime"?"bedtime or ambient":"psychology or finance"} video — we'll handle the polish.</p>

            {/* Drop zone */}
            <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()}
              onClick={()=>!videoFile&&document.getElementById("vInput").click()}
              style={{border:`2px dashed ${videoFile?ac:"#1e1e2a"}`,borderRadius:16,overflow:"hidden",background:"#0a0a10",cursor:videoFile?"default":"pointer",marginBottom:18,transition:"border-color .2s"}}>
              {videoFile?(
                <div>
                  <video src={videoURL} controls style={{width:"100%",maxHeight:320,display:"block"}}/>
                  <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:18}}>🎬</span>
                      <div>
                        <div style={{color:"#00C896",fontWeight:700,fontSize:13}}>{videoFile.name}</div>
                        <div style={{color:"#445",fontSize:11}}>{(videoFile.size/1024/1024).toFixed(1)} MB{videoDur?` · ${fmt(videoDur)}`:""}</div>
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setVideoFile(null);setVideoURL(null);setVideoDur(null);}} style={{background:"none",border:"1px solid #2a2a3a",borderRadius:6,color:"#556",padding:"4px 10px",cursor:"pointer",fontSize:12}}>✕ Remove</button>
                  </div>
                </div>
              ):(
                <div style={{padding:"48px 20px",textAlign:"center"}}>
                  <div style={{fontSize:44,marginBottom:12}}>{preset.emoji}</div>
                  <div style={{color:"#778",fontSize:15,marginBottom:5}}>Drop your video here</div>
                  <div style={{color:"#334",fontSize:12,marginBottom:14}}>MP4 · MOV · WEBM · AVI</div>
                  <div style={{display:"inline-block",background:"#111",border:"1px solid #1e1e2a",borderRadius:8,padding:"7px 18px",color:"#556",fontSize:13}}>Browse files</div>
                </div>
              )}
              <input id="vInput" type="file" accept="video/*" onChange={handleDrop} style={{display:"none"}}/>
            </div>

            {/* Titles */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><Lbl>{presetId==="bedtime"?"Story Title":"Video Title"}</Lbl>
                <input value={title} onChange={e=>setTitle(e.target.value)}
                  placeholder={presetId==="bedtime"?"e.g. The Moonlit Forest":"e.g. 5 Habits of the Wealthy"}
                  style={iStyle()}/></div>
              <div><Lbl>{presetId==="bedtime"?"Tagline (optional)":"Series / Episode"}</Lbl>
                <input value={subtitle} onChange={e=>setSubtitle(e.target.value)}
                  placeholder={presetId==="bedtime"?"e.g. A calming bedtime story":"e.g. Personal Finance · Ep. 3"}
                  style={iStyle()}/></div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setStep(0)} style={{padding:"11px 18px",background:"#0a0a10",border:"1px solid #1e1e2a",borderRadius:10,color:"#556",fontWeight:700,cursor:"pointer"}}>← Back</button>
              <button onClick={()=>setStep(2)} disabled={!videoFile}
                style={{flex:1,padding:"12px",background:videoFile?`linear-gradient(135deg,${preset.lowerBg},${ac})`:"#0a0a10",border:`1px solid ${videoFile?ac+"60":"#1e1e2a"}`,borderRadius:10,color:videoFile?preset.accentColor:"#334",fontWeight:700,fontSize:15,cursor:videoFile?"pointer":"not-allowed",transition:"all .2s"}}>
                Continue to Polish Options →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Polish Options */}
        {step===2&&preset&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:presetId==="bedtime"?300:700,fontStyle:presetId==="bedtime"?"italic":"normal",fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>Polish Options</h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>Customize every element of your {preset.label} video.</p>

            <Lbl>Elements to Add</Lbl>
            <Toggle on={showIntro} onChange={setShowIntro} color={ac}
              label={`${preset.emoji} Animated intro card`}
              desc={`Cinematic title card with "${title||"your title"}" over the first 5 seconds`}/>
            <Toggle on={showOutro} onChange={setShowOutro} color={ac}
              label="🎬 Outro / end card"
              desc={presetId==="bedtime"?"Soft fade-out with sweet dreams message":"Professional end card with your CTA"}/>
            <Toggle on={showProgress} onChange={setShowProgress} color={ac}
              label="📊 Progress bar"
              desc="Thin progress bar at the very bottom — keeps viewers watching"/>
            <Toggle on={showBars} onChange={setShowBars} color={ac}
              label="🎞 Cinematic bars"
              desc="Black bars top & bottom — film-like, premium feel"/>

            {/* Lower third — motivation only */}
            {presetId==="motivation"&&(
              <>
                <div style={{marginTop:4}}>
                  <Toggle on={lowerShow} onChange={setLowerShow} color={ac}
                    label="📌 Topic lower third label"
                    desc="Appears in the first 8 seconds to establish your topic"/>
                </div>
                {lowerShow&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4,paddingLeft:8,marginTop:8}}>
                    <div><Lbl>Topic / Series</Lbl><input value={lowerLine1} onChange={e=>setLowerLine1(e.target.value)} placeholder="e.g. Personal Finance" style={iStyle()}/></div>
                    <div><Lbl>Episode / Detail</Lbl><input value={lowerLine2} onChange={e=>setLowerLine2(e.target.value)} placeholder="e.g. Ep. 3 · Building Wealth" style={iStyle()}/></div>
                  </div>
                )}
              </>
            )}

            {/* Watermark */}
            <div style={{marginTop:12,marginBottom:12}}>
              <Lbl>Watermark / Channel Name (optional)</Lbl>
              <input value={watermark} onChange={e=>setWatermark(e.target.value)}
                placeholder={presetId==="bedtime"?"e.g. @DreamScapes":"e.g. @YourChannel"}
                style={iStyle()}/>
            </div>

            {/* CTA */}
            {showOutro&&(
              <div style={{marginBottom:4}}>
                <Lbl>Outro call-to-action</Lbl>
                <input value={cta} onChange={e=>setCta(e.target.value)}
                  placeholder="e.g. Like · Subscribe · Share"
                  style={iStyle()}/>
              </div>
            )}

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>setStep(1)} style={{padding:"11px 18px",background:"#0a0a10",border:"1px solid #1e1e2a",borderRadius:10,color:"#556",fontWeight:700,cursor:"pointer"}}>← Back</button>
              <button onClick={()=>setStep(3)}
                style={{flex:1,padding:"13px",background:`linear-gradient(135deg,${preset.lowerBg},${ac})`,border:`1px solid ${ac}60`,borderRadius:10,color:preset.accentColor,fontWeight:700,fontSize:15,cursor:"pointer"}}>
                Continue to Build →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Build */}
        {step===3&&preset&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:presetId==="bedtime"?300:700,fontStyle:presetId==="bedtime"?"italic":"normal",fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>
              {building?"Polishing your video…":"Ready to Polish"}
            </h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 20px"}}>{building?"Keep this tab visible — do not switch away.":"Review and start the polish process."}</p>

            {!building&&(
              <>
                <div style={{background:"#0a0a10",border:"1px solid #1a1a2a",borderRadius:14,padding:"16px 20px",marginBottom:14}}>
                  <div style={{color:"#334",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Polish Summary</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>
                    {[
                      ["Category",preset.label],
                      ["Video",videoFile?.name?.slice(0,26)+(videoFile?.name?.length>26?"…":"")],
                      ["Duration",videoDur?fmt(videoDur):"—"],
                      ["Intro card",showIntro?"✓":"—"],
                      ["Outro card",showOutro?"✓":"—"],
                      ["Progress bar",showProgress?"✓":"—"],
                      ["Cinematic bars",showBars?"✓":"—"],
                      ["Watermark",watermark||"—"],
                    ].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #10101a"}}>
                        <span style={{color:"#445",fontSize:12}}>{k}</span>
                        <span style={{color:"#a0a8c0",fontSize:12,fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Info icon="⚡" color="#f59e0b">Keep this tab <strong style={{color:"#f59e0b"}}>visible and in focus</strong> the entire time — the canvas renderer needs the tab active for accurate rendering.</Info>
              </>
            )}

            {building&&(
              <div>
                <ProgBar pct={buildPct} color={ac} label="Polishing..."/>
                <div ref={logRef} style={{background:"#050508",border:"1px solid #101018",borderRadius:10,padding:"12px 14px",height:220,overflowY:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:11,marginTop:14}}>
                  {buildLog.map((l,i)=>(
                    <div key={i} style={{marginBottom:3,display:"flex",gap:10}}>
                      <span style={{color:"#22223a",flexShrink:0}}>{l.t}</span>
                      <span style={{color:l.msg.startsWith("✅")?"#00C896":l.msg.startsWith("✗")?"#f87171":l.msg.includes("✓")?ac:"#44506a"}}>{l.msg}</span>
                    </div>
                  ))}
                  {building&&<span style={{color:ac,animation:"pulse 1s infinite"}}>▌</span>}
                </div>
              </div>
            )}

            {error&&<ErrBox>{error}</ErrBox>}
            {!building&&(
              <div style={{display:"flex",gap:10,marginTop:18}}>
                <button onClick={()=>setStep(2)} style={{padding:"11px 18px",background:"#0a0a10",border:"1px solid #1e1e2a",borderRadius:10,color:"#556",fontWeight:700,cursor:"pointer"}}>← Back</button>
                <button onClick={buildVideo}
                  style={{flex:1,padding:"16px",background:`linear-gradient(135deg,${preset.lowerBg},${ac})`,border:`1px solid ${ac}60`,borderRadius:12,color:"#fff",fontWeight:800,fontSize:18,fontFamily:"'Playfair Display',serif",fontStyle:"italic",cursor:"pointer",animation:"glow 2.5s ease infinite"}}>
                  ✨ Polish My Video
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Export */}
        {step===4&&outputURL&&(
          <div style={{animation:"fadeUp .4s ease"}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:presetId==="bedtime"?300:700,fontStyle:presetId==="bedtime"?"italic":"normal",fontSize:28,color:"#f0f0f8",margin:"0 0 6px"}}>
              {presetId==="bedtime"?"Your video is ready 🌙":"Your polished video is ready ✨"}
            </h2>
            <p style={{color:"#445",fontSize:14,margin:"0 0 18px"}}>{outputMB} MB · 1280×720 HD · WebM</p>

            <div style={{background:"#000",borderRadius:14,overflow:"hidden",border:"1px solid #14142a",marginBottom:18,boxShadow:"0 24px 64px rgba(0,0,0,0.9)"}}>
              <video src={outputURL} controls style={{width:"100%",display:"block",maxHeight:440}}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              <a href={outputURL} download={`${(title||"polished-video").replace(/\s+/g,"-")}.webm`}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:`linear-gradient(135deg,${preset.lowerBg},${ac})`,border:`1px solid ${ac}60`,borderRadius:12,padding:"13px",color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none"}}>
                ⬇ Download Polished Video
              </a>
              <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#0a0a10",border:"1px solid #1a1a2a",borderRadius:12,padding:"13px",color:"#556",fontSize:13,textDecoration:"none"}}>
                🔄 Convert to MP4 (free) ↗
              </a>
            </div>

            {/* What was added */}
            <div style={{background:"#0a0a10",border:"1px solid #1a1a2a",borderRadius:12,padding:"14px 18px",marginBottom:16}}>
              <div style={{color:"#334",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>What was added</div>
              {[
                showIntro&&`${preset.emoji} Animated intro title card`,
                showOutro&&"🎬 Professional outro end card",
                showProgress&&"📊 Progress bar to retain viewers",
                showBars&&"🎞 Cinematic top & bottom bars",
                (lowerShow&&lowerLine1)&&`📌 Topic lower third: "${lowerLine1}"`,
                watermark&&`💧 Watermark: "${watermark}"`,
                `🎨 ${preset.label} color grade & vignette`,
              ].filter(Boolean).map((t,i)=>(
                <div key={i} style={{color:"#778",fontSize:13,marginBottom:5,display:"flex",gap:8}}>
                  <span style={{color:ac}}>✓</span>{t}
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={reset} style={{background:"#0a0a10",border:"1px solid #1a1a2a",color:"#445",borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:13}}>
                ← Start Over
              </button>
              <button onClick={()=>{setStep(1);setVideoFile(null);setVideoURL(null);setVideoDur(null);setOutputURL(null);setBuildLog([]);setBuildPct(0);setError("");}}
                style={{background:"#0a0a10",border:`1px solid ${ac}40`,color:preset.accentColor,borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:600}}>
                ↑ Polish Another {preset.label} Video
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
