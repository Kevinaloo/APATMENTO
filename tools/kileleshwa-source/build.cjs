const fs=require('node:fs/promises'),path=require('node:path'),esbuild=require('esbuild');
(async()=>{
 const root=__dirname,slug='kileleshwa-elegant',out=path.resolve(root,'../../tours/'+slug);
 await fs.mkdir(path.join(out,'assets'),{recursive:true});
 const result=await esbuild.build({entryPoints:[path.join(root,'entry.tsx')],outdir:path.join(out,'assets'),bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minify:true,jsx:'automatic',entryNames:'viewer-[hash]',chunkNames:'chunk-[hash]',define:{'process.env.NODE_ENV':'"production"'},metafile:true});
 const entry=Object.entries(result.metafile.outputs).find(([,value])=>value.entryPoint?.endsWith('entry.tsx'))[0];
 const entryURL='/tours/'+slug+'/assets/'+path.basename(entry);
 await fs.copyFile(path.join(root,'viewer.css'),path.join(out,'viewer.css'));
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#172c27"><meta name="description" content="Explore the fully furnished elegant one-bedroom residence in Kileleshwa. An interactive photo-based 3D reconstruction by Cabana."><title>Elegant Kileleshwa · Cabana 3D Residence</title><link rel="stylesheet" href="/tours/${slug}/viewer.css"><link rel="preload" href="/tours/${slug}/photos/1.jpg" as="image"></head><body><div id="root"><div style="min-height:100dvh;display:grid;place-items:center;background:#172c27;color:#f7f1e7;font:18px Georgia,serif">Opening the Kileleshwa residence…</div></div><noscript><p>Enable JavaScript for the walkthrough. <a href="/apartments.html?open=2d488e1a-3582-409f-ac3c-5f67adc90c74">View this apartment on Cabana</a>.</p></noscript><script type="module">import(${JSON.stringify(entryURL)}).catch(error=>{console.error('Cabana tour failed',error);document.getElementById('root').innerHTML='<main style="padding:32px;background:#172c27;color:#f7f1e7;min-height:100dvh;font:16px/1.6 Arial"><h1>Explore the apartment in photos</h1><p>The interactive view could not start. Refresh to retry or open the listing.</p><img src="/tours/${slug}/photos/1.jpg" alt="Kileleshwa living and dining room" style="max-height:65vh;max-width:100%"><p><a style="color:inherit" href="/apartments.html?open=2d488e1a-3582-409f-ac3c-5f67adc90c74">View listing</a></p></main>'})</script></body></html>`;
 await fs.writeFile(path.join(out,'index.html'),html);
 // Remove only stale bundles generated for this tour, never other property assets.
 const keep=new Set(Object.keys(result.metafile.outputs).map(p=>path.basename(p)));
 for(const file of await fs.readdir(path.join(out,'assets')))if(/^(viewer|chunk)-[\w-]+\.js$/.test(file)&&!keep.has(file))await fs.unlink(path.join(out,'assets',file));
 console.log('Built Kileleshwa residence:',path.basename(entry));
})().catch(error=>{console.error(error);process.exit(1)});
