const fs=require('node:fs/promises'),path=require('node:path'),esbuild=require('esbuild');
(async()=>{
 const root=__dirname,out=path.resolve(root,'../../tours/jets-nest');
 const result=await esbuild.build({entryPoints:[path.join(root,'entry.tsx')],outdir:path.join(out,'assets'),bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minify:true,jsx:'automatic',entryNames:'viewer-[hash]',chunkNames:'chunk-[hash]',alias:{'@':root},define:{'process.env.NODE_ENV':'"production"'},metafile:true,plugins:[{name:'photo-paths',setup(b){b.onLoad({filter:/(?:page\.tsx|scene-model\.ts)$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replaceAll('/photos/','/tours/jets-nest/photos/'),loader:a.path.endsWith('.tsx')?'tsx':'ts'}))}}]});
 const entry=Object.entries(result.metafile.outputs).find(([,v])=>v.entryPoint?.endsWith('entry.tsx'))[0];
 await fs.copyFile(path.join(root,'viewer.css'),path.join(out,'viewer.css'));
 let html=await fs.readFile(path.join(out,'index.html'),'utf8');
 html=html.replace(/(?:\.\/|\/tours\/jets-nest\/)assets\/viewer-[^"']+\.js(?:\?[^"']*)?/g,'/tours/jets-nest/assets/'+path.basename(entry));
 html=html.replace(/href="\.\/viewer\.css[^" ]*"/g,'href="/tours/jets-nest/viewer.css"');
 await fs.writeFile(path.join(out,'index.html'),html);
 console.log('Built Jets Nest viewer:',path.basename(entry));
})().catch(e=>{console.error(e);process.exit(1)});

