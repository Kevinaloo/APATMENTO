/* Real Natural Earth geography, drawn on an orthographic sphere with D3.
   Local, pinned assets; see assets/location-flight/NOTICE.txt. */
(function () {
  'use strict';
  if (window.CabanaLocationGlobe) return;
  const ROOT = '/assets/location-flight/';
  let ready;
  function script(file) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = ROOT + file;
      tag.onload = resolve;
      tag.onerror = () => { tag.remove(); reject(new Error('Globe asset unavailable')); };
      document.head.appendChild(tag);
    });
  }
  function preload() {
    if (!ready) {
      const libraries = (async () => {
        if (!window.d3?.Adder) await script('vendor-d3-array-3.2.4.min.js');
        if (!window.d3?.geoOrthographic) await script('vendor-d3-geo-3.1.1.min.js');
        if (!window.topojson?.feature) await script('vendor-topojson-client-3.1.0.min.js');
      })();
      ready = Promise.all([libraries, fetch(ROOT + 'countries-110m.json').then(r => {
        if (!r.ok) throw new Error('World geography unavailable');
        return r.json();
      })]).then(([,world]) => ({
        land: window.topojson.feature(world, world.objects.land),
        borders: window.topojson.mesh(world, world.objects.countries, (a,b) => a !== b)
      })).catch(error => { ready = null; throw error; });
    }
    return ready;
  }
  async function create(canvas) {
    const geography = await preload();
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    const d3 = window.d3, projection = d3.geoOrthographic().clipAngle(90).precision(.5);
    const path = d3.geoPath(projection, context), sphere = {type:'Sphere'}, grid = d3.geoGraticule10();
    let dead = false, width = 0, height = 0, dpr = 1, previous;
    function resize() {
      width = canvas.clientWidth; height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      previous = null;
    }
    resize();
    const observer = window.ResizeObserver ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    return {
      draw({lat = 0, lng = 0, scale = 1}) {
        if (dead || !width || !height) return;
        const key = [lat,lng,scale,width,height].join(',');
        if (key === previous) return;
        previous = key;
        const radius = Math.min(width * .43, height * .42) * scale;
        const cx = width / 2, cy = height / 2 + Math.min(20, height * .025);
        context.setTransform(dpr,0,0,dpr,0,0);
        context.clearRect(0,0,width,height);
        projection.translate([cx,cy]).scale(radius).rotate([-lng,-lat,0]);
        const glow = context.createRadialGradient(cx,cy,radius*.97,cx,cy,radius*1.14);
        glow.addColorStop(0,'#a4e8e866');glow.addColorStop(.25,'#56c4dc25');glow.addColorStop(1,'#56c4dc00');
        context.fillStyle=glow;context.fillRect(0,0,width,height);
        const ocean = context.createRadialGradient(cx-radius*.4,cy-radius*.5,0,cx,cy,radius*1.15);
        ocean.addColorStop(0,'#367c89');ocean.addColorStop(.6,'#174e63');ocean.addColorStop(1,'#082731');
        context.beginPath();path(sphere);context.fillStyle=ocean;context.fill();
        context.beginPath();path(grid);context.strokeStyle='#9fd4d328';context.lineWidth=.6;context.stroke();
        const land = context.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);
        land.addColorStop(0,'#c9d9ad');land.addColorStop(.45,'#95b99d');land.addColorStop(1,'#428183');
        context.beginPath();path(geography.land);context.fillStyle=land;context.fill();
        context.strokeStyle='#d9ecd160';context.lineWidth=.65;context.stroke();
        context.beginPath();path(geography.borders);context.strokeStyle='#173f4b55';context.lineWidth=.55;context.stroke();
        context.save();context.beginPath();path(sphere);context.clip();
        const shade=context.createRadialGradient(cx-radius*.35,cy-radius*.4,radius*.2,cx+radius*.08,cy+radius*.07,radius*1.03);
        shade.addColorStop(0,'#001a2700');shade.addColorStop(.66,'#001a2707');shade.addColorStop(1,'#000e248c');
        context.fillStyle=shade;context.fillRect(0,0,width,height);context.restore();
        context.beginPath();path(sphere);context.lineWidth=1.1;context.strokeStyle='#a4e3e988';context.stroke();
      },
      destroy() { dead = true; observer?.disconnect(); context.clearRect(0,0,canvas.width,canvas.height); }
    };
  }
  window.CabanaLocationGlobe = {create,preload};
})();
