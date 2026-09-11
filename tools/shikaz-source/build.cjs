const fs=require('node:fs/promises'),path=require('node:path'),{createRequire}=require('node:module');
const deps=process.env.CABANA_VIEWER_DEPS;const esbuild=deps?createRequire(path.join(deps,'package.json'))('esbuild'):require('esbuild');
(async()=>{
 const root=__dirname,slug='shikaz-homes',title='Shikaz Homes',out=path.resolve(root,'../../tours/'+slug);
 const result=await esbuild.build({entryPoints:[path.join(root,'entry.tsx')],outdir:path.join(out,'assets'),bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minify:true,jsx:'automatic',entryNames:'viewer-[hash]',chunkNames:'chunk-[hash]',alias:{'@':root},nodePaths:deps?[path.join(deps,'node_modules')]:[],define:{'process.env.NODE_ENV':'"production"'},metafile:true});
 const entry=Object.entries(result.metafile.outputs).find(([,v])=>v.entryPoint?.endsWith('entry.tsx'))[0];
 await fs.copyFile(path.join(root,'viewer.css'),path.join(out,'viewer.css'));
 // Absolute paths survive Vercel cleanUrls and every direct/deep-link entry route.
 const entryURL='/tours/'+slug+'/assets/'+path.basename(entry);
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#242a36"><title>'+title+' · Cabana 3D Tour</title><link rel="stylesheet" href="/tours/'+slug+'/viewer.css?v=1"></head><body><div id="root"><div style="height:100dvh;display:grid;place-items:center;background:#242a36;color:#fff;font:16px Arial">Opening '+title+'…</div></div><noscript>Enable JavaScript to explore this interactive apartment.</noscript><script type="module">import('+JSON.stringify(entryURL)+').catch(error=>{console.error("Cabana tour failed",error);document.getElementById("root").innerHTML=\'<div style="height:100dvh;display:grid;place-items:center;padding:24px;background:#242a36;color:white;font:16px/1.6 Arial;text-align:center"><div><h1>The 3D view could not start</h1><p>Please close the view and reopen it. The original listing photos are also available.</p><button onclick="location.reload()">Try again</button></div></div>\'})</script></body></html>';
 await fs.writeFile(path.join(out,'index.html'),html);
 await fs.writeFile(path.join(root,'build-meta.json'),JSON.stringify(result.metafile,null,2));
 console.log('Built '+title+': '+path.basename(entry));
})().catch(e=>{console.error(e);process.exit(1)});
