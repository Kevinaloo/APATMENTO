/* Kitchen, laundry, shower room and the separate vanity alcove, from
   the listing photographs (kitchen 6, 7, 12, 13; laundry 10; bath 9, 14).
   Ported unchanged from the Kileleshwa viewer. Authored coordinates. */
import type {Model} from './scene-model';

/** Furnishings reconstructed from the listing's kitchen, laundry and bathroom photos. */
export function furnishServices(model:Model){
 const {contents,walls,m,box,sphere,cyl,tube,group,obstacle,torus}=model;
 const mint=m.green.clone();mint.color.set('#a6bca5');
 const burgundy=m.green.clone();burgundy.color.set('#752e34');

 // The pale oak kitchen: its open foreground and the utility doorway stay clear.
 const kitchen=group(0,0);
 box(kitchen,2.1,.12,.66,1.68,.08,-2.2,m.steel);
 box(kitchen,2.1,.7,.61,1.68,.48,-2.2,m.oak);
 box(kitchen,2.13,.045,.68,1.68,.85,-2.17,m.marble,.012);
 // Thin door reveals are more legible than heavy handles on this handleless joinery.
 for(const x of [.67,1.69,2.13,2.7])box(kitchen,.008,.66,.014,x,.48,-1.887,m.taupe);
 box(kitchen,1.46,.014,.012,1.98,.792,-1.881,m.taupe);
 box(kitchen,.64,.73,1.19,2.54,.465,-1.59,m.oak);
 box(kitchen,.66,.045,1.26,2.55,.852,-1.59,m.marble,.012);
 box(kitchen,.015,.64,.011,2.211,.48,-1.09,m.taupe);
 box(kitchen,.012,.012,1.16,2.21,.795,-1.59,m.taupe);
 box(kitchen,.64,.1,1.19,2.54,.075,-1.59,m.steel);
 obstacle(1.68,-2.2,2.1,.67);
 obstacle(2.54,-1.59,.66,1.26);

 // Tall fridge niche, with a real toe gap, split doors and brushed handles.
 box(kitchen,.69,2.32,.63,.38,1.16,-2.215,m.oak);
 box(kitchen,.63,1.77,.655,.38,.913,-2.19,m.steel,.023);
 box(kitchen,.58,.54,.035,.38,1.496,-1.846,m.steel,.012);
 box(kitchen,.58,1.08,.035,.38,.672,-1.846,m.steel,.012);
 box(kitchen,.587,.015,.046,.38,1.213,-1.841,m.black);
 box(kitchen,.40,.018,.024,.39,1.237,-1.816,m.chrome,.006);
 box(kitchen,.40,.018,.024,.39,1.183,-1.816,m.chrome,.006);
 box(kitchen,.63,.41,.64,.38,2.115,-2.21,m.oak);
 box(kitchen,.009,.38,.015,.38,2.11,-1.882,m.taupe);
 box(kitchen,.64,.025,.68,.38,1.882,-2.2,m.oak);
 obstacle(.38,-2.2,.71,.7);

 // Upper cabinets, pale stone backsplash and slim black extractor.
 const upper=group(0,0);contents.remove(upper);walls.add(upper);
 box(upper,2.05,.91,.027,1.685,1.329,-2.532,m.marble);
 box(upper,2.08,.51,.36,1.685,2.043,-2.375,m.oak);
 for(const x of [.99,1.34,1.69,2.04,2.39])box(upper,.007,.48,.014,x,2.043,-2.187,m.taupe);
 box(upper,.69,.073,.45,1.205,1.757,-2.32,m.black,.009);
 box(upper,.65,.019,.40,1.205,1.713,-2.304,m.steel);
 for(const x of [.966,1.446])cyl(upper,.028,.028,.007,x,1.701,-2.175,m.glow);
 for(let i=0;i<7;i++)box(upper,.38,.002,.007,1.205,1.7,-2.41+i*.034,m.taupe);

 // Oven, inset cooktop, burners, cast-iron pan supports and dials.
 box(kitchen,.585,.607,.052,1.195,.456,-1.866,m.black,.013);
 box(kitchen,.49,.343,.017,1.195,.396,-1.83,m.glass,.012);
 box(kitchen,.43,.005,.01,1.195,.281,-1.817,m.chrome);
 box(kitchen,.43,.005,.01,1.195,.322,-1.817,m.chrome);
 box(kitchen,.435,.031,.054,1.195,.635,-1.809,m.chrome,.012);
 for(const x of [1.01,1.195,1.38]){
   const dial=cyl(kitchen,.026,.026,.014,x,.733,-1.826,m.chrome);dial.rotation.x=Math.PI/2;
   box(kitchen,.002,.013,.004,x,.745,-1.816,m.black);
 }
 box(kitchen,.63,.021,.48,1.195,.884,-2.188,m.black,.018);
 for(const [x,z,r] of [[1.025,-2.31,.065],[1.38,-2.31,.056],[1.025,-2.085,.08],[1.38,-2.085,.061]]){
   cyl(kitchen,r+.009,r+.009,.013,x,.90,z,m.chrome);
   cyl(kitchen,r,r,.026,x,.917,z,m.black);
   box(kitchen,.023,.022,.21,x,.936,z,m.black);
   box(kitchen,.21,.022,.021,x,.937,z,m.black);
   for(const sign of [-1,1]){
     box(kitchen,.027,.048,.025,x+sign*.093,.924,z,m.black);
   }
 }
 for(const x of [1.078,1.153,1.228,1.303])cyl(kitchen,.02,.023,.022,x,.907,-1.995,m.steel);

 // The countertop microwave, kettle, wall socket and two deliberately restrained cords.
 box(kitchen,.46,.286,.335,1.9,1.013,-2.205,m.black,.018);
 box(kitchen,.33,.202,.018,1.865,1.016,-2.029,m.glass,.008);
 box(kitchen,.011,.177,.025,2.044,1.012,-2.018,m.chrome,.003);
 for(const y of [.956,1.074]){
   const dial=cyl(kitchen,.024,.024,.012,2.08,y,-2.02,m.chrome);dial.rotation.x=Math.PI/2;
 }
 cyl(kitchen,.065,.08,.19,2.315,.978,-2.21,m.black);
 cyl(kitchen,.08,.08,.013,2.315,.879,-2.21,m.black);
 cyl(kitchen,.064,.064,.014,2.315,1.083,-2.21,m.steel);
 sphere(kitchen,2.315,1.1,-2.21,.018,.015,.018,m.black);
 tube(kitchen,[[2.375,1.065,-2.21],[2.428,1.065,-2.21],[2.44,.934,-2.21],[2.382,.928,-2.21]],.012,m.black);
 tube(kitchen,[[2.258,1.055,-2.21],[2.24,1.018,-2.21],[2.255,.984,-2.21]],.02,m.black);
 box(upper,.19,.105,.018,1.932,1.395,-2.506,m.steel,.003);
 for(const x of [1.88,1.979]){
   box(upper,.036,.034,.024,x,1.395,-2.488,m.black,.005);
   box(upper,.007,.016,.004,x,1.431,-2.489,m.black);
 }
 tube(kitchen,[[1.88,1.382,-2.474],[1.81,1.225,-2.46],[1.925,1.163,-2.36],[2.04,1.07,-2.32]],.006,m.black);
 tube(kitchen,[[1.978,1.382,-2.474],[2.085,1.242,-2.46],[2.2,1.16,-2.39],[2.318,.893,-2.3]],.006,m.black);

 // Stainless sink on the return. A dark inset reads as depth without an expensive boolean.
 box(kitchen,.47,.012,.45,2.548,.881,-1.53,m.steel,.035);
 box(kitchen,.376,.013,.34,2.548,.888,-1.53,m.black,.055);
 box(kitchen,.332,.014,.29,2.548,.89,-1.53,m.steel,.046);
 cyl(kitchen,.031,.031,.003,2.548,.899,-1.53,m.chrome);
 tube(kitchen,[[2.55,.889,-1.855],[2.55,1.14,-1.855],[2.55,1.19,-1.77],[2.55,1.11,-1.655]],.012,m.chrome);
 cyl(kitchen,.033,.035,.015,2.55,.899,-1.855,m.chrome);
 tube(kitchen,[[2.604,.908,-1.849],[2.622,.949,-1.849],[2.631,.997,-1.849]],.008,m.chrome);
 // White dish drainer shown beside the sink.
 box(kitchen,.34,.052,.2,2.55,.925,-1.126,m.white,.03);
 for(let i=0;i<6;i++)box(kitchen,.011,.013,.17,2.412+i*.05,.958,-1.126,m.ceramic);
 for(let i=0;i<3;i++){
   const plate=cyl(kitchen,.071,.071,.012,2.462+i*.048,1.01,-1.118,m.ceramic);plate.rotation.z=Math.PI/2;
 }
 // Two simple black kitchen mats, as in the source photograph.
 box(kitchen,.81,.007,.34,1.24,.009,-1.653,m.black,.018);
 box(kitchen,.37,.007,.56,2.081,.009,-1.368,m.black,.018);
 for(const z of [-1.806,-1.5])box(kitchen,.75,.003,.005,1.24,.014,z,m.gold);
 for(const x of [.869,1.611])box(kitchen,.005,.003,.302,x,.014,-1.653,m.gold);

 // A black-framed glazed kitchen window, separate from the clear utility opening.
 box(upper,.88,.95,.03,2.453,1.853,-2.516,m.glass);
 for(const x of [2.013,2.893])box(upper,.034,1.0,.045,x,1.853,-2.491,m.black);
 for(const y of [1.355,2.351])box(upper,.91,.032,.045,2.453,y,-2.491,m.black);
 box(upper,.034,.97,.047,2.453,1.853,-2.487,m.black);

 // Silver front-load washer in the tiled service space. Its front faces the utility landing.
 const laundry=group(.58,-3.31);
 box(laundry,.64,.86,.62,0,.445,0,m.steel,.025);
 box(laundry,.603,.168,.027,0,.773,.32,m.black,.013);
 box(laundry,.164,.067,.018,-.19,.775,.343,m.steel,.006);
 box(laundry,.126,.01,.007,-.19,.786,.355,m.chrome);
 const programme=cyl(laundry,.064,.064,.018,.011,.774,.343,m.chrome);programme.rotation.x=Math.PI/2;
 box(laundry,.097,.043,.009,.208,.79,.342,m.screen,.005);
 for(let i=0;i<4;i++)sphere(laundry,.15+i*.025,.733,.35,.005,.005,.003,m.chrome);
 torus(laundry,.214,.027,0,.4,.324,m.chrome);
 torus(laundry,.184,.011,0,.4,.342,m.black);
 sphere(laundry,0,.4,.324,.182,.182,.021,m.glass);
 sphere(laundry,0,.395,.311,.164,.164,.014,m.black);
 // A restrained curved reflection and rubber gasket keep the door recognisable.
 tube(laundry,[[-.126,.52,.349],[-.162,.428,.353],[-.122,.299,.349]],.009,m.steel);
 box(laundry,.043,.085,.02,.191,.438,.352,m.chrome,.008);
 const filter=cyl(laundry,.055,.055,.007,.2,.12,.322,m.steel);filter.rotation.x=Math.PI/2;
 torus(laundry,.055,.002,.2,.12,.328,m.black);
 box(laundry,.61,.024,.037,0,.035,.303,m.taupe);
 obstacle(.58,-3.31,.69,.69);
 // Water connection and a compact folded drying rack, both shown in the listing.
 tube(laundry,[[0,.888,-.1],[0,1.16,-.15],[0,1.17,-.28]],.013,m.chrome);
 box(laundry,.075,.025,.035,0,1.18,-.287,m.blue,.005);
 const rack=group(1.62,-3.61);
 for(const x of [-.35,.35])tube(rack,[[x,.05,.13],[x,1.12,.055],[x,1.17,-.06],[x,.03,-.1]],.009,m.chrome);
 for(let n=0;n<5;n++)tube(rack,[[-.35,.39+n*.15,.049],[.35,.39+n*.15,.049]],.007,m.chrome);
 obstacle(1.62,-3.61,.76,.25);

 // Bathroom shower runs across the east end, leaving a generous landing at 5.45 / -1.3.
 const bath=group(0,0);
 box(bath,.85,.035,2.32,6.827,.026,-1.3,m.marble,.012);
 box(bath,.024,.017,2.34,6.406,.052,-1.3,m.chrome);
 const showerGlass=box(bath,.013,2.1,2.22,6.408,1.104,-1.3,m.glass);showerGlass.castShadow=false;
 box(bath,.045,.045,2.3,6.408,2.163,-1.3,m.chrome,.006);
 for(const z of [-2.436,-.165])box(bath,.032,2.13,.034,6.408,1.103,z,m.chrome);
 box(bath,.018,2.064,.02,6.418,1.099,-1.415,m.chrome);
 tube(bath,[[6.377,.905,-1.493],[6.349,.93,-1.493],[6.349,1.215,-1.493],[6.377,1.24,-1.493]],.012,m.chrome);
 tube(bath,[[6.387,.817,-2.218],[6.375,.817,-1.7]],.011,m.chrome);
 obstacle(6.827,-1.3,.91,2.43);
 // Chrome hand shower, riser and mixer on the east wall.
 tube(bath,[[7.193,.83,-1.861],[7.193,2.005,-1.861]],.012,m.chrome);
 for(const y of [.88,1.938]){
   const mount=cyl(bath,.029,.029,.048,7.217,y,-1.861,m.chrome);mount.rotation.z=Math.PI/2;
 }
 tube(bath,[[7.184,1.745,-1.86],[7.106,1.973,-1.858]],.018,m.chrome);
 const head=cyl(bath,.049,.049,.017,7.084,1.985,-1.858,m.chrome);head.rotation.z=.75;
 tube(bath,[[7.18,1.755,-1.86],[7.07,1.175,-1.862],[7.075,.564,-1.783],[7.184,.751,-1.706]],.008,m.chrome);
 const mixer=cyl(bath,.055,.055,.045,7.208,.775,-1.712,m.chrome);mixer.rotation.z=Math.PI/2;
 tube(bath,[[7.18,.788,-1.716],[7.15,.828,-1.716],[7.149,.88,-1.716]],.009,m.chrome);
 // Two slim glass shelves and a wall towel rail.
 for(const y of [1.125,1.435]){
   box(bath,.22,.012,.28,7.12,y,-2.265,m.glass,.016);
   tube(bath,[[7.016,y+.024,-2.401],[7.016,y+.024,-2.13]],.006,m.chrome);
 }
 tube(bath,[[7.205,1.899,-.814],[7.16,1.899,-.814],[7.16,1.899,-.283],[7.205,1.899,-.283]],.014,m.chrome);
 tube(bath,[[7.205,1.812,-.814],[7.16,1.812,-.814],[7.16,1.812,-.283],[7.205,1.812,-.283]],.01,m.chrome);
 box(bath,.09,.003,.09,7.032,.049,-2.22,m.steel);
 for(let i=0;i<4;i++)box(bath,.003,.003,.073,7.007+i*.017,.052,-2.22,m.black);

 // Compact white close-coupled toilet, set against the north wall.
 const wc=group(5.65,-.42);
 box(wc,.357,.456,.178,0,.536,0,m.ceramic,.047);
 box(wc,.374,.037,.188,0,.778,0,m.white,.024);
 cyl(wc,.033,.033,.008,0,.8,-.005,m.chrome);
 sphere(wc,0,.37,-.205,.218,.17,.276,m.ceramic);
 box(wc,.244,.296,.22,0,.186,-.16,m.ceramic,.072);
 sphere(wc,0,.504,-.212,.222,.025,.272,m.white);
 sphere(wc,0,.515,-.226,.149,.006,.192,m.ceramic);
 obstacle(5.65,-.56,.49,.7);
 // Narrow white open towel shelf next to the WC.
 const shelf=group(6.122,-.307);
 for(const x of [-.135,.135])for(const z of [-.105,.105])box(shelf,.023,1.3,.023,x,.65,z,m.white);
 for(const y of [.08,.445,.806,1.177])box(shelf,.29,.024,.242,0,y,0,m.white);
 for(const y of [.26,.624,.986]){
   tube(shelf,[[-.123,y-.157,-.11],[.123,y+.157,-.11]],.009,m.white);
   tube(shelf,[[.123,y-.157,-.11],[-.123,y+.157,-.11]],.009,m.white);
 }
 box(shelf,.245,.095,.195,0,1.237,0,m.linen,.025);
 box(shelf,.235,.075,.19,0,1.316,0,m.linen,.025);
 cyl(shelf,.033,.033,.075,-.035,.859,.006,m.white);
 cyl(shelf,.012,.012,.002,-.035,.898,.006,m.taupe);
 obstacle(6.122,-.307,.33,.28);
 // Small patterned bath mat outside the glass.
 box(bath,.49,.009,.84,6.056,.011,-1.74,m.linen,.045);
 for(const [x,z] of [[5.92,-2.02],[6.13,-1.86],[5.92,-1.69],[6.13,-1.51]]){
   const shape=cyl(bath,.103,.103,.002,x,.018,z,m.black);shape.scale.z=.73;
 }

 // Open vanity alcove outside the shower room, as in photo 14.
 const vanity=group(4.3,-2.337);
 box(vanity,.89,.395,.37,0,.615,0,m.oak);
 box(vanity,.846,.154,.026,0,.665,.192,m.taupe);
 box(vanity,.48,.118,.05,-.175,.7,.209,m.oak);
 box(vanity,.846,.15,.04,0,.502,.201,m.oak);
 box(vanity,.011,.368,.041,.217,.607,.216,m.taupe);
 box(vanity,.872,.01,.022,0,.8,.222,m.gold);
 box(vanity,.94,.031,.403,0,.828,.005,m.black,.012);
 box(vanity,.91,.06,.025,0,.874,-.181,m.black);
 sphere(vanity,-.103,.846,.019,.2,.014,.124,m.steel);
 sphere(vanity,-.103,.852,.019,.169,.011,.099,m.black);
 cyl(vanity,.029,.03,.006,-.103,.862,.028,m.chrome);
 tube(vanity,[[-.106,.848,-.117],[-.106,1.015,-.117],[-.106,1.039,-.047],[-.106,1.012,-.019]],.012,m.chrome);
 box(vanity,.038,.013,.028,-.106,1.04,-.12,m.chrome,.005);
 obstacle(4.3,-2.337,.96,.43);
 const mirror=group(4.3,-2.337);contents.remove(mirror);walls.add(mirror);
 box(mirror,.95,.57,.057,0,1.71,-.158,m.steel,.005);
 box(mirror,.92,.54,.013,0,1.712,-.122,m.glass);
 box(mirror,.94,.106,.092,0,1.372,-.137,m.oak);
 box(mirror,.016,.52,.018,-.449,1.712,-.113,m.glow);
 box(mirror,.016,.52,.018,.449,1.712,-.113,m.glow);
 for(const x of [-.229,.231])box(mirror,.006,.533,.024,x,1.712,-.113,m.taupe);
 // Mint accessories and the small red-leaf plant visible on the real counter.
 cyl(vanity,.043,.038,.105,.265,.899,.021,mint);
 cyl(vanity,.028,.028,.004,.265,.954,.021,m.black);
 cyl(vanity,.079,.072,.285,.298,.151,.056,mint);
 cyl(vanity,.081,.081,.018,.298,.303,.056,mint);
 box(vanity,.073,.024,.028,.298,.035,.14,m.steel,.007);
 cyl(vanity,.011,.011,.007,.298,.316,.056,m.black);
 cyl(vanity,.045,.037,.063,.383,.879,-.069,m.black);
 for(const [dx,dy,dz] of [[-.022,.053,-.013],[.018,.086,-.008],[-.004,.123,.003],[.032,.078,.018]]){
   tube(vanity,[[.383,.915,-.069],[.383+dx,1+dy,-.069+dz]],.003,m.taupe);
   const leaf=sphere(vanity,.383+dx,1+dy,-.069+dz,.012,.039,.006,burgundy);leaf.rotation.z=dx*18;
 }
 box(contents,.72,.007,.41,4.3,.011,-1.91,m.linen,.047);
 for(const [x,z] of [[4.05,-2.0],[4.3,-1.8],[4.54,-2.0]]){
   const oval=cyl(contents,.102,.102,.003,x,.017,z,m.black);oval.scale.z=.68;
 }
}
