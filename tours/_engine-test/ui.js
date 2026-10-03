var Vi={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Gi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},ru=0,Rc=1,ou=2;var ds=1,au=2,js=3,Si=0,rn=1,ci=2,Xe=0,os=1,Pc=2,Ic=3,Lc=4,Pa=5;var En=100,lu=101,cu=102,hu=103,uu=104,fs=200,du=201,fu=202,pu=203,ea=204,na=205,to=206,mu=207,eo=208,gu=209,xu=210,vu=211,_u=212,yu=213,bu=214,ia=0,sa=1,ra=2,as=3,oa=4,aa=5,la=6,ca=7,Ia=0,Mu=1,Su=2,Yn=0,no=1,Dc=2,Nc=3,ps=4,Uc=5,io=6,so=7;var Fc=300,Hi=301,ms=302,La=303,Da=304,ro=306,Ln=1e3,ri=1001,ha=1002,De=1003,wu=1004;var oo=1005;var en=1006,Na=1007;var Wi=1008;var Qe=1009,Oc=1010,Bc=1011,Qs=1012,Ua=1013,Zn=1014,Un=1015,qe=1016,Fa=1017,Oa=1018,Xi=1020,kc=35902,zc=35899,Vc=1021,Gc=1022,yn=1023,oi=1026,hi=1027,Ba=1028,ka=1029,qi=1030,za=1031;var Va=1033,ao=33776,lo=33777,co=33778,ho=33779,Ga=35840,Ha=35841,Wa=35842,Xa=35843,qa=36196,Ya=37492,Za=37496,$a=37488,Ka=37489,uo=37490,Ja=37491,ja=37808,Qa=37809,tl=37810,el=37811,nl=37812,il=37813,sl=37814,rl=37815,ol=37816,al=37817,ll=37818,cl=37819,hl=37820,ul=37821,dl=36492,fl=36494,pl=36495,ml=36283,gl=36284,fo=36285,xl=36286;var Rr=2300,ua=2301,ta=2302,vc=2303,_c=2400,yc=2401,bc=2402;var Tu=3200;var tr=0,Eu=1,Ti="",Ge="srgb",Pr="srgb-linear",Ir="linear",_e="srgb";var ss=7680;var Mc=519,Au=512,Cu=513,Ru=514,vl=515,Pu=516,Iu=517,_l=518,Lu=519,Sc=35044;var Hc="300 es",Hn=2e3,Vs=2001;function Rf(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Pf(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Lr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Du(){let i=Lr("canvas");return i.style.display="block",i}var Nh={},Gs=null;function Wc(...i){let t="THREE."+i.shift();Gs?Gs("log",t,...i):console.log(t,...i)}function Nu(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Kt(...i){i=Nu(i);let t="THREE."+i.shift();if(Gs)Gs("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Jt(...i){i=Nu(i);let t="THREE."+i.shift();if(Gs)Gs("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function rs(...i){let t=i.join(" ");t in Nh||(Nh[t]=!0,Kt(...i))}function Uu(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var Fu={[ia]:sa,[ra]:la,[oa]:ca,[as]:aa,[sa]:ia,[la]:ra,[ca]:oa,[aa]:as},Wn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},ln=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Uh=1234567,Ar=Math.PI/180,Hs=180/Math.PI;function er(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(ln[i&255]+ln[i>>8&255]+ln[i>>16&255]+ln[i>>24&255]+"-"+ln[t&255]+ln[t>>8&255]+"-"+ln[t>>16&15|64]+ln[t>>24&255]+"-"+ln[e&63|128]+ln[e>>8&255]+"-"+ln[e>>16&255]+ln[e>>24&255]+ln[n&255]+ln[n>>8&255]+ln[n>>16&255]+ln[n>>24&255]).toLowerCase()}function le(i,t,e){return Math.max(t,Math.min(e,i))}function Xc(i,t){return(i%t+t)%t}function If(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function Lf(i,t,e){return i!==t?(e-i)/(t-i):0}function Cr(i,t,e){return(1-e)*i+e*t}function Df(i,t,e,n){return Cr(i,t,1-Math.exp(-e*n))}function Nf(i,t=1){return t-Math.abs(Xc(i,t*2)-t)}function Uf(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function Ff(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function Of(i,t){return i+Math.floor(Math.random()*(t-i+1))}function Bf(i,t){return i+Math.random()*(t-i)}function kf(i){return i*(.5-Math.random())}function zf(i){i!==void 0&&(Uh=i);let t=Uh+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Vf(i){return i*Ar}function Gf(i){return i*Hs}function Hf(i){return(i&i-1)===0&&i!==0}function Wf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Xf(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function qf(i,t,e,n,s){let r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+n)/2),h=o((t+n)/2),d=r((t-n)/2),u=o((t-n)/2),f=r((n-t)/2),g=o((n-t)/2);switch(s){case"XYX":i.set(a*h,l*d,l*u,a*c);break;case"YZY":i.set(l*u,a*h,l*d,a*c);break;case"ZXZ":i.set(l*d,l*u,a*h,a*c);break;case"XZX":i.set(a*h,l*g,l*f,a*c);break;case"YXY":i.set(l*f,a*h,l*g,a*c);break;case"ZYZ":i.set(l*g,l*f,a*h,a*c);break;default:Kt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function ks(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function mn(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var qc={DEG2RAD:Ar,RAD2DEG:Hs,generateUUID:er,clamp:le,euclideanModulo:Xc,mapLinear:If,inverseLerp:Lf,lerp:Cr,damp:Df,pingpong:Nf,smoothstep:Uf,smootherstep:Ff,randInt:Of,randFloat:Bf,randFloatSpread:kf,seededRandom:zf,degToRad:Vf,radToDeg:Gf,isPowerOfTwo:Hf,ceilPowerOfTwo:Wf,floorPowerOfTwo:Xf,setQuaternionFromProperEuler:qf,normalize:mn,denormalize:ks},Yt=class i{static{i.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=le(this.x,t.x,e.x),this.y=le(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=le(this.x,t,e),this.y=le(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(le(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(le(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},nn=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],d=n[s+3],u=r[o+0],f=r[o+1],g=r[o+2],b=r[o+3];if(d!==b||l!==u||c!==f||h!==g){let m=l*u+c*f+h*g+d*b;m<0&&(u=-u,f=-f,g=-g,b=-b,m=-m);let p=1-a;if(m<.9995){let S=Math.acos(m),C=Math.sin(S);p=Math.sin(p*S)/C,a=Math.sin(a*S)/C,l=l*p+u*a,c=c*p+f*a,h=h*p+g*a,d=d*p+b*a}else{l=l*p+u*a,c=c*p+f*a,h=h*p+g*a,d=d*p+b*a;let S=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=S,c*=S,h*=S,d*=S}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],d=r[o],u=r[o+1],f=r[o+2],g=r[o+3];return t[e]=a*g+h*d+l*f-c*u,t[e+1]=l*g+h*u+c*d-a*f,t[e+2]=c*g+h*f+a*u-l*d,t[e+3]=h*g-a*d-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),d=a(r/2),u=l(n/2),f=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=u*h*d+c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d-u*f*g;break;case"YXZ":this._x=u*h*d+c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d+u*f*g;break;case"ZXY":this._x=u*h*d-c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d-u*f*g;break;case"ZYX":this._x=u*h*d-c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d+u*f*g;break;case"YZX":this._x=u*h*d+c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d-u*f*g;break;case"XZY":this._x=u*h*d-c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d+u*f*g;break;default:Kt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>d){let f=2*Math.sqrt(1+n-a-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>d){let f=2*Math.sqrt(1+a-n-d);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+d-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(le(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},F=class i{static{i.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Fh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Fh.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),d=2*(r*n-o*e);return this.x=e+l*c+o*d-a*h,this.y=n+l*h+a*c-r*d,this.z=s+l*d+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=le(this.x,t.x,e.x),this.y=le(this.y,t.y,e.y),this.z=le(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=le(this.x,t,e),this.y=le(this.y,t,e),this.z=le(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(le(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Kl.copy(this).projectOnVector(t),this.sub(Kl)}reflect(t){return this.sub(Kl.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(le(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Kl=new F,Fh=new nn,Qt=class i{static{i.prototype.isMatrix3=!0}constructor(t,e,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],g=n[8],b=s[0],m=s[3],p=s[6],S=s[1],C=s[4],_=s[7],M=s[2],T=s[5],w=s[8];return r[0]=o*b+a*S+l*M,r[3]=o*m+a*C+l*T,r[6]=o*p+a*_+l*w,r[1]=c*b+h*S+d*M,r[4]=c*m+h*C+d*T,r[7]=c*p+h*_+d*w,r[2]=u*b+f*S+g*M,r[5]=u*m+f*C+g*T,r[8]=u*p+f*_+g*w,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=h*o-a*c,u=a*l-h*r,f=c*r-o*l,g=e*d+n*u+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let b=1/g;return t[0]=d*b,t[1]=(s*c-h*n)*b,t[2]=(a*n-s*o)*b,t[3]=u*b,t[4]=(h*e-s*l)*b,t[5]=(s*r-a*e)*b,t[6]=f*b,t[7]=(n*l-c*e)*b,t[8]=(o*e-n*r)*b,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return rs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Jl.makeScale(t,e)),this}rotate(t){return rs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Jl.makeRotation(-t)),this}translate(t,e){return rs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Jl.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},Jl=new Qt,Oh=new Qt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Bh=new Qt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Yf(){let i={enabled:!0,workingColorSpace:Pr,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===_e&&(s.r=Mi(s.r),s.g=Mi(s.g),s.b=Mi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===_e&&(s.r=zs(s.r),s.g=zs(s.g),s.b=zs(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Ti?Ir:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return rs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return rs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Pr]:{primaries:t,whitePoint:n,transfer:Ir,toXYZ:Oh,fromXYZ:Bh,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ge},outputColorSpaceConfig:{drawingBufferColorSpace:Ge}},[Ge]:{primaries:t,whitePoint:n,transfer:_e,toXYZ:Oh,fromXYZ:Bh,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ge}}}),i}var ue=Yf();function Mi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function zs(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Es,da=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Es===void 0&&(Es=Lr("canvas")),Es.width=t.width,Es.height=t.height;let s=Es.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Es}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Lr("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Mi(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Mi(e[n]/255)*255):e[n]=Mi(e[n]);return{data:e,width:t.width,height:t.height}}else return Kt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Zf=0,Ws=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Zf++}),this.uuid=er(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(jl(s[o].image)):r.push(jl(s[o]))}else r=jl(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function jl(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?da.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Kt("Texture: Unable to serialize Texture."),{})}var $f=0,Ql=new F,sn=class i extends Wn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=ri,s=ri,r=en,o=Wi,a=yn,l=Qe,c=i.DEFAULT_ANISOTROPY,h=Ti){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:$f++}),this.uuid=er(),this.name="",this.source=new Ws(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Yt(0,0),this.repeat=new Yt(1,1),this.center=new Yt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Qt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Ql).x}get height(){return this.source.getSize(Ql).y}get depth(){return this.source.getSize(Ql).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Kt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Kt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Fc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Ln:t.x=t.x-Math.floor(t.x);break;case ri:t.x=t.x<0?0:1;break;case ha:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Ln:t.y=t.y-Math.floor(t.y);break;case ri:t.y=t.y<0?0:1;break;case ha:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};sn.DEFAULT_IMAGE=null;sn.DEFAULT_MAPPING=Fc;sn.DEFAULT_ANISOTROPY=1;var Te=class i{static{i.prototype.isVector4=!0}constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],g=l[9],b=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-b)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+b)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let C=(c+1)/2,_=(f+1)/2,M=(p+1)/2,T=(h+u)/4,w=(d+b)/4,x=(g+m)/4;return C>_&&C>M?C<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(C),s=T/n,r=w/n):_>M?_<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(_),n=T/s,r=x/s):M<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(M),n=w/r,s=x/r),this.set(n,s,r,e),this}let S=Math.sqrt((m-g)*(m-g)+(d-b)*(d-b)+(u-h)*(u-h));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(d-b)/S,this.z=(u-h)/S,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=le(this.x,t.x,e.x),this.y=le(this.y,t.y,e.y),this.z=le(this.z,t.z,e.z),this.w=le(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=le(this.x,t,e),this.y=le(this.y,t,e),this.z=le(this.z,t,e),this.w=le(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(le(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},fa=class extends Wn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:en,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new Te(0,0,t,e),this.scissorTest=!1,this.viewport=new Te(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new sn(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:en,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ws(s)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ie=class extends fa{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Dr=class extends sn{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=De,this.minFilter=De,this.wrapR=ri,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var pa=class extends sn{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=De,this.minFilter=De,this.wrapR=ri,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var ne=class i{static{i.prototype.isMatrix4=!0}constructor(t,e,n,s,r,o,a,l,c,h,d,u,f,g,b,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,d,u,f,g,b,m)}set(t,e,n,s,r,o,a,l,c,h,d,u,f,g,b,m){let p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=g,p[11]=b,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/As.setFromMatrixColumn(t,0).length(),r=1/As.setFromMatrixColumn(t,1).length(),o=1/As.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){let u=o*h,f=o*d,g=a*h,b=a*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=f+g*c,e[5]=u-b*c,e[9]=-a*l,e[2]=b-u*c,e[6]=g+f*c,e[10]=o*l}else if(t.order==="YXZ"){let u=l*h,f=l*d,g=c*h,b=c*d;e[0]=u+b*a,e[4]=g*a-f,e[8]=o*c,e[1]=o*d,e[5]=o*h,e[9]=-a,e[2]=f*a-g,e[6]=b+u*a,e[10]=o*l}else if(t.order==="ZXY"){let u=l*h,f=l*d,g=c*h,b=c*d;e[0]=u-b*a,e[4]=-o*d,e[8]=g+f*a,e[1]=f+g*a,e[5]=o*h,e[9]=b-u*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let u=o*h,f=o*d,g=a*h,b=a*d;e[0]=l*h,e[4]=g*c-f,e[8]=u*c+b,e[1]=l*d,e[5]=b*c+u,e[9]=f*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let u=o*l,f=o*c,g=a*l,b=a*c;e[0]=l*h,e[4]=b-u*d,e[8]=g*d+f,e[1]=d,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*d+g,e[10]=u-b*d}else if(t.order==="XZY"){let u=o*l,f=o*c,g=a*l,b=a*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+b,e[5]=o*h,e[9]=f*d-g,e[2]=g*d-f,e[6]=a*h,e[10]=b*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Kf,t,Jf)}lookAt(t,e,n){let s=this.elements;return wn.subVectors(t,e),wn.lengthSq()===0&&(wn.z=1),wn.normalize(),Pi.crossVectors(n,wn),Pi.lengthSq()===0&&(Math.abs(n.z)===1?wn.x+=1e-4:wn.z+=1e-4,wn.normalize(),Pi.crossVectors(n,wn)),Pi.normalize(),Do.crossVectors(wn,Pi),s[0]=Pi.x,s[4]=Do.x,s[8]=wn.x,s[1]=Pi.y,s[5]=Do.y,s[9]=wn.y,s[2]=Pi.z,s[6]=Do.z,s[10]=wn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],g=n[2],b=n[6],m=n[10],p=n[14],S=n[3],C=n[7],_=n[11],M=n[15],T=s[0],w=s[4],x=s[8],y=s[12],R=s[1],P=s[5],D=s[9],z=s[13],W=s[2],N=s[6],k=s[10],U=s[14],X=s[3],K=s[7],lt=s[11],at=s[15];return r[0]=o*T+a*R+l*W+c*X,r[4]=o*w+a*P+l*N+c*K,r[8]=o*x+a*D+l*k+c*lt,r[12]=o*y+a*z+l*U+c*at,r[1]=h*T+d*R+u*W+f*X,r[5]=h*w+d*P+u*N+f*K,r[9]=h*x+d*D+u*k+f*lt,r[13]=h*y+d*z+u*U+f*at,r[2]=g*T+b*R+m*W+p*X,r[6]=g*w+b*P+m*N+p*K,r[10]=g*x+b*D+m*k+p*lt,r[14]=g*y+b*z+m*U+p*at,r[3]=S*T+C*R+_*W+M*X,r[7]=S*w+C*P+_*N+M*K,r[11]=S*x+C*D+_*k+M*lt,r[15]=S*y+C*z+_*U+M*at,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],f=t[14],g=t[3],b=t[7],m=t[11],p=t[15],S=l*f-c*u,C=a*f-c*d,_=a*u-l*d,M=o*f-c*h,T=o*u-l*h,w=o*d-a*h;return e*(b*S-m*C+p*_)-n*(g*S-m*M+p*T)+s*(g*C-b*M+p*w)-r*(g*_-b*T+m*w)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],f=t[11],g=t[12],b=t[13],m=t[14],p=t[15],S=e*a-n*o,C=e*l-s*o,_=e*c-r*o,M=n*l-s*a,T=n*c-r*a,w=s*c-r*l,x=h*b-d*g,y=h*m-u*g,R=h*p-f*g,P=d*m-u*b,D=d*p-f*b,z=u*p-f*m,W=S*z-C*D+_*P+M*R-T*y+w*x;if(W===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let N=1/W;return t[0]=(a*z-l*D+c*P)*N,t[1]=(s*D-n*z-r*P)*N,t[2]=(b*w-m*T+p*M)*N,t[3]=(u*T-d*w-f*M)*N,t[4]=(l*R-o*z-c*y)*N,t[5]=(e*z-s*R+r*y)*N,t[6]=(m*_-g*w-p*C)*N,t[7]=(h*w-u*_+f*C)*N,t[8]=(o*D-a*R+c*x)*N,t[9]=(n*R-e*D-r*x)*N,t[10]=(g*T-b*_+p*S)*N,t[11]=(d*_-h*T-f*S)*N,t[12]=(a*y-o*P-l*x)*N,t[13]=(e*P-n*y+s*x)*N,t[14]=(b*C-g*M-m*S)*N,t[15]=(h*M-d*C+u*S)*N,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,d=a+a,u=r*c,f=r*h,g=r*d,b=o*h,m=o*d,p=a*d,S=l*c,C=l*h,_=l*d,M=n.x,T=n.y,w=n.z;return s[0]=(1-(b+p))*M,s[1]=(f+_)*M,s[2]=(g-C)*M,s[3]=0,s[4]=(f-_)*T,s[5]=(1-(u+p))*T,s[6]=(m+S)*T,s[7]=0,s[8]=(g+C)*w,s[9]=(m-S)*w,s[10]=(1-(u+b))*w,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=As.set(s[0],s[1],s[2]).length(),a=As.set(s[4],s[5],s[6]).length(),l=As.set(s[8],s[9],s[10]).length();r<0&&(o=-o),zn.copy(this);let c=1/o,h=1/a,d=1/l;return zn.elements[0]*=c,zn.elements[1]*=c,zn.elements[2]*=c,zn.elements[4]*=h,zn.elements[5]*=h,zn.elements[6]*=h,zn.elements[8]*=d,zn.elements[9]*=d,zn.elements[10]*=d,e.setFromRotationMatrix(zn),n.x=o,n.y=a,n.z=l,this}makePerspective(t,e,n,s,r,o,a=Hn,l=!1){let c=this.elements,h=2*r/(e-t),d=2*r/(n-s),u=(e+t)/(e-t),f=(n+s)/(n-s),g,b;if(l)g=r/(o-r),b=o*r/(o-r);else if(a===Hn)g=-(o+r)/(o-r),b=-2*o*r/(o-r);else if(a===Vs)g=-o/(o-r),b=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=b,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=Hn,l=!1){let c=this.elements,h=2/(e-t),d=2/(n-s),u=-(e+t)/(e-t),f=-(n+s)/(n-s),g,b;if(l)g=1/(o-r),b=o/(o-r);else if(a===Hn)g=-2/(o-r),b=-(o+r)/(o-r);else if(a===Vs)g=-1/(o-r),b=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=b,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},As=new F,zn=new ne,Kf=new F(0,0,0),Jf=new F(1,1,1),Pi=new F,Do=new F,wn=new F,kh=new ne,zh=new nn,Dn=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(le(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-le(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(le(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-le(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(le(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-le(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Kt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return kh.makeRotationFromQuaternion(t),this.setFromRotationMatrix(kh,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return zh.setFromEuler(this),this.setFromQuaternion(zh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Dn.DEFAULT_ORDER="XYZ";var Xs=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},jf=0,Vh=new F,Cs=new nn,xi=new ne,No=new F,br=new F,Qf=new F,tp=new nn,Gh=new F(1,0,0),Hh=new F(0,1,0),Wh=new F(0,0,1),Xh={type:"added"},ep={type:"removed"},Rs={type:"childadded",child:null},tc={type:"childremoved",child:null},je=class i extends Wn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:jf++}),this.uuid=er(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new F,e=new Dn,n=new nn,s=new F(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ne},normalMatrix:{value:new Qt}}),this.matrix=new ne,this.matrixWorld=new ne,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Xs,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Cs.setFromAxisAngle(t,e),this.quaternion.multiply(Cs),this}rotateOnWorldAxis(t,e){return Cs.setFromAxisAngle(t,e),this.quaternion.premultiply(Cs),this}rotateX(t){return this.rotateOnAxis(Gh,t)}rotateY(t){return this.rotateOnAxis(Hh,t)}rotateZ(t){return this.rotateOnAxis(Wh,t)}translateOnAxis(t,e){return Vh.copy(t).applyQuaternion(this.quaternion),this.position.add(Vh.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Gh,t)}translateY(t){return this.translateOnAxis(Hh,t)}translateZ(t){return this.translateOnAxis(Wh,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(xi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?No.copy(t):No.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),br.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?xi.lookAt(br,No,this.up):xi.lookAt(No,br,this.up),this.quaternion.setFromRotationMatrix(xi),s&&(xi.extractRotation(s.matrixWorld),Cs.setFromRotationMatrix(xi),this.quaternion.premultiply(Cs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Jt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Xh),Rs.child=t,this.dispatchEvent(Rs),Rs.child=null):Jt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(ep),tc.child=t,this.dispatchEvent(tc),tc.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),xi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),xi.multiply(t.parent.matrixWorld)),t.applyMatrix4(xi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Xh),Rs.child=t,this.dispatchEvent(Rs),Rs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(br,t,Qf),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(br,tp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];r(t.shapes,d)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),d=o(t.shapes),u=o(t.skeletons),f=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}};je.DEFAULT_UP=new F(0,1,0);je.DEFAULT_MATRIX_AUTO_UPDATE=!0;je.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var un=class extends je{constructor(){super(),this.isGroup=!0,this.type="Group"}},np={type:"move"},qs=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new un,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new un,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new F,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new F),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new un,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new F,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new F,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let b of t.hand.values()){let m=e.getJointPose(b,n),p=this._getHandJoint(c,b);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,g=.005;c.inputState.pinching&&u>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(np)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new un;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Ou={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ii={h:0,s:0,l:0},Uo={h:0,s:0,l:0};function ec(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var Dt=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ge){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ue.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=ue.workingColorSpace){return this.r=t,this.g=e,this.b=n,ue.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=ue.workingColorSpace){if(t=Xc(t,1),e=le(e,0,1),n=le(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=ec(o,r,t+1/3),this.g=ec(o,r,t),this.b=ec(o,r,t-1/3)}return ue.colorSpaceToWorking(this,s),this}setStyle(t,e=Ge){function n(r){r!==void 0&&parseFloat(r)<1&&Kt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Kt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Kt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ge){let n=Ou[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Kt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Mi(t.r),this.g=Mi(t.g),this.b=Mi(t.b),this}copyLinearToSRGB(t){return this.r=zs(t.r),this.g=zs(t.g),this.b=zs(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ge){return ue.workingToColorSpace(cn.copy(this),t),Math.round(le(cn.r*255,0,255))*65536+Math.round(le(cn.g*255,0,255))*256+Math.round(le(cn.b*255,0,255))}getHexString(t=Ge){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ue.workingColorSpace){ue.workingToColorSpace(cn.copy(this),e);let n=cn.r,s=cn.g,r=cn.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let d=o-a;switch(c=h<=.5?d/(o+a):d/(2-o-a),o){case n:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-n)/d+2;break;case r:l=(n-s)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=ue.workingColorSpace){return ue.workingToColorSpace(cn.copy(this),e),t.r=cn.r,t.g=cn.g,t.b=cn.b,t}getStyle(t=Ge){ue.workingToColorSpace(cn.copy(this),t);let e=cn.r,n=cn.g,s=cn.b;return t!==Ge?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Ii),this.setHSL(Ii.h+t,Ii.s+e,Ii.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Ii),t.getHSL(Uo);let n=Cr(Ii.h,Uo.h,e),s=Cr(Ii.s,Uo.s,e),r=Cr(Ii.l,Uo.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},cn=new Dt;Dt.NAMES=Ou;var ls=class extends je{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Dn,this.environmentIntensity=1,this.environmentRotation=new Dn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}},Vn=new F,vi=new F,nc=new F,_i=new F,Ps=new F,Is=new F,qh=new F,ic=new F,sc=new F,rc=new F,oc=new Te,ac=new Te,lc=new Te,Fi=class i{constructor(t=new F,e=new F,n=new F){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),Vn.subVectors(t,e),s.cross(Vn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){Vn.subVectors(s,e),vi.subVectors(n,e),nc.subVectors(t,e);let o=Vn.dot(Vn),a=Vn.dot(vi),l=Vn.dot(nc),c=vi.dot(vi),h=vi.dot(nc),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;let u=1/d,f=(c*l-a*h)*u,g=(o*h-a*l)*u;return r.set(1-f-g,g,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,_i)===null?!1:_i.x>=0&&_i.y>=0&&_i.x+_i.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,_i)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,_i.x),l.addScaledVector(o,_i.y),l.addScaledVector(a,_i.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return oc.setScalar(0),ac.setScalar(0),lc.setScalar(0),oc.fromBufferAttribute(t,e),ac.fromBufferAttribute(t,n),lc.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(oc,r.x),o.addScaledVector(ac,r.y),o.addScaledVector(lc,r.z),o}static isFrontFacing(t,e,n,s){return Vn.subVectors(n,e),vi.subVectors(t,e),Vn.cross(vi).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Vn.subVectors(this.c,this.b),vi.subVectors(this.a,this.b),Vn.cross(vi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,o,a;Ps.subVectors(s,n),Is.subVectors(r,n),ic.subVectors(t,n);let l=Ps.dot(ic),c=Is.dot(ic);if(l<=0&&c<=0)return e.copy(n);sc.subVectors(t,s);let h=Ps.dot(sc),d=Is.dot(sc);if(h>=0&&d<=h)return e.copy(s);let u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(Ps,o);rc.subVectors(t,r);let f=Ps.dot(rc),g=Is.dot(rc);if(g>=0&&f<=g)return e.copy(r);let b=f*c-l*g;if(b<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(n).addScaledVector(Is,a);let m=h*g-f*d;if(m<=0&&d-h>=0&&f-g>=0)return qh.subVectors(r,s),a=(d-h)/(d-h+(f-g)),e.copy(s).addScaledVector(qh,a);let p=1/(m+b+u);return o=b*p,a=u*p,e.copy(n).addScaledVector(Ps,o).addScaledVector(Is,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},gn=class{constructor(t=new F(1/0,1/0,1/0),e=new F(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Gn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Gn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=Gn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Gn):Gn.fromBufferAttribute(r,o),Gn.applyMatrix4(t.matrixWorld),this.expandByPoint(Gn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Fo.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Fo.copy(n.boundingBox)),Fo.applyMatrix4(t.matrixWorld),this.union(Fo)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Gn),Gn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Mr),Oo.subVectors(this.max,Mr),Ls.subVectors(t.a,Mr),Ds.subVectors(t.b,Mr),Ns.subVectors(t.c,Mr),Li.subVectors(Ds,Ls),Di.subVectors(Ns,Ds),ts.subVectors(Ls,Ns);let e=[0,-Li.z,Li.y,0,-Di.z,Di.y,0,-ts.z,ts.y,Li.z,0,-Li.x,Di.z,0,-Di.x,ts.z,0,-ts.x,-Li.y,Li.x,0,-Di.y,Di.x,0,-ts.y,ts.x,0];return!cc(e,Ls,Ds,Ns,Oo)||(e=[1,0,0,0,1,0,0,0,1],!cc(e,Ls,Ds,Ns,Oo))?!1:(Bo.crossVectors(Li,Di),e=[Bo.x,Bo.y,Bo.z],cc(e,Ls,Ds,Ns,Oo))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Gn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Gn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(yi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),yi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),yi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),yi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),yi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),yi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),yi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),yi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(yi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},yi=[new F,new F,new F,new F,new F,new F,new F,new F],Gn=new F,Fo=new gn,Ls=new F,Ds=new F,Ns=new F,Li=new F,Di=new F,ts=new F,Mr=new F,Oo=new F,Bo=new F,es=new F;function cc(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){es.fromArray(i,r);let a=s.x*Math.abs(es.x)+s.y*Math.abs(es.y)+s.z*Math.abs(es.z),l=t.dot(es),c=e.dot(es),h=n.dot(es);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Oe=new F,ko=new Yt,ip=0,Be=class extends Wn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:ip++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Sc,this.updateRanges=[],this.gpuType=Un,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)ko.fromBufferAttribute(this,e),ko.applyMatrix3(t),this.setXY(e,ko.x,ko.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Oe.fromBufferAttribute(this,e),Oe.applyMatrix3(t),this.setXYZ(e,Oe.x,Oe.y,Oe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Oe.fromBufferAttribute(this,e),Oe.applyMatrix4(t),this.setXYZ(e,Oe.x,Oe.y,Oe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Oe.fromBufferAttribute(this,e),Oe.applyNormalMatrix(t),this.setXYZ(e,Oe.x,Oe.y,Oe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Oe.fromBufferAttribute(this,e),Oe.transformDirection(t),this.setXYZ(e,Oe.x,Oe.y,Oe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=ks(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=mn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=ks(e,this.array)),e}setX(t,e){return this.normalized&&(e=mn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=ks(e,this.array)),e}setY(t,e){return this.normalized&&(e=mn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=ks(e,this.array)),e}setZ(t,e){return this.normalized&&(e=mn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=ks(e,this.array)),e}setW(t,e){return this.normalized&&(e=mn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=mn(e,this.array),n=mn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=mn(e,this.array),n=mn(n,this.array),s=mn(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=mn(e,this.array),n=mn(n,this.array),s=mn(s,this.array),r=mn(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Sc&&(t.usage=this.usage),t}dispose(){this.dispatchEvent({type:"dispose"})}};var Nr=class extends Be{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Ur=class extends Be{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var Ce=class extends Be{constructor(t,e,n){super(new Float32Array(t),e,n)}},sp=new gn,Sr=new F,hc=new F,Oi=class{constructor(t=new F,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):sp.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Sr.subVectors(t,this.center);let e=Sr.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Sr,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(hc.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Sr.copy(t.center).add(hc)),this.expandByPoint(Sr.copy(t.center).sub(hc))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},rp=0,In=new ne,uc=new je,Us=new F,Tn=new gn,wr=new gn,Je=new F,We=class i extends Wn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:rp++}),this.uuid=er(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Rf(t)?Ur:Nr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Qt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return In.makeRotationFromQuaternion(t),this.applyMatrix4(In),this}rotateX(t){return In.makeRotationX(t),this.applyMatrix4(In),this}rotateY(t){return In.makeRotationY(t),this.applyMatrix4(In),this}rotateZ(t){return In.makeRotationZ(t),this.applyMatrix4(In),this}translate(t,e,n){return In.makeTranslation(t,e,n),this.applyMatrix4(In),this}scale(t,e,n){return In.makeScale(t,e,n),this.applyMatrix4(In),this}lookAt(t){return uc.lookAt(t),uc.updateMatrix(),this.applyMatrix4(uc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Us).negate(),this.translate(Us.x,Us.y,Us.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ce(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Kt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new gn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Jt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new F(-1/0,-1/0,-1/0),new F(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Tn.setFromBufferAttribute(r),this.morphTargetsRelative?(Je.addVectors(this.boundingBox.min,Tn.min),this.boundingBox.expandByPoint(Je),Je.addVectors(this.boundingBox.max,Tn.max),this.boundingBox.expandByPoint(Je)):(this.boundingBox.expandByPoint(Tn.min),this.boundingBox.expandByPoint(Tn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Jt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Oi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Jt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new F,1/0);return}if(t){let n=this.boundingSphere.center;if(Tn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];wr.setFromBufferAttribute(a),this.morphTargetsRelative?(Je.addVectors(Tn.min,wr.min),Tn.expandByPoint(Je),Je.addVectors(Tn.max,wr.max),Tn.expandByPoint(Je)):(Tn.expandByPoint(wr.min),Tn.expandByPoint(wr.max))}Tn.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)Je.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Je));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Je.fromBufferAttribute(a,c),l&&(Us.fromBufferAttribute(t,c),Je.add(Us)),s=Math.max(s,n.distanceToSquared(Je))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Jt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Jt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new Be(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let x=0;x<n.count;x++)a[x]=new F,l[x]=new F;let c=new F,h=new F,d=new F,u=new Yt,f=new Yt,g=new Yt,b=new F,m=new F;function p(x,y,R){c.fromBufferAttribute(n,x),h.fromBufferAttribute(n,y),d.fromBufferAttribute(n,R),u.fromBufferAttribute(r,x),f.fromBufferAttribute(r,y),g.fromBufferAttribute(r,R),h.sub(c),d.sub(c),f.sub(u),g.sub(u);let P=1/(f.x*g.y-g.x*f.y);isFinite(P)&&(b.copy(h).multiplyScalar(g.y).addScaledVector(d,-f.y).multiplyScalar(P),m.copy(d).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(P),a[x].add(b),a[y].add(b),a[R].add(b),l[x].add(m),l[y].add(m),l[R].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:t.count}]);for(let x=0,y=S.length;x<y;++x){let R=S[x],P=R.start,D=R.count;for(let z=P,W=P+D;z<W;z+=3)p(t.getX(z+0),t.getX(z+1),t.getX(z+2))}let C=new F,_=new F,M=new F,T=new F;function w(x){M.fromBufferAttribute(s,x),T.copy(M);let y=a[x];C.copy(y),C.sub(M.multiplyScalar(M.dot(y))).normalize(),_.crossVectors(T,y);let P=_.dot(l[x])<0?-1:1;o.setXYZW(x,C.x,C.y,C.z,P)}for(let x=0,y=S.length;x<y;++x){let R=S[x],P=R.start,D=R.count;for(let z=P,W=P+D;z<W;z+=3)w(t.getX(z+0)),w(t.getX(z+1)),w(t.getX(z+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new Be(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let s=new F,r=new F,o=new F,a=new F,l=new F,c=new F,h=new F,d=new F;if(t)for(let u=0,f=t.count;u<f;u+=3){let g=t.getX(u+0),b=t.getX(u+1),m=t.getX(u+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,b),o.fromBufferAttribute(e,m),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,b),c.fromBufferAttribute(n,m),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(b,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),o.fromBufferAttribute(e,u+2),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Je.fromBufferAttribute(t,e),Je.normalize(),t.setXYZ(e,Je.x,Je.y,Je.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h),f=0,g=0;for(let b=0,m=l.length;b<m;b++){a.isInterleavedBufferAttribute?f=l[b]*a.data.stride+a.offset:f=l[b]*h;for(let p=0;p<h;p++)u[g++]=c[f++]}return new Be(u,h,d)}if(this.index===null)return Kt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=t(l,n);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,d=c.length;h<d;h++){let u=c[h],f=t(u,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){let f=c[d];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],d=r[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var op=0,ai=class extends Wn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:op++}),this.uuid=er(),this.name="",this.type="Material",this.blending=os,this.side=Si,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ea,this.blendDst=na,this.blendEquation=En,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Dt(0,0,0),this.blendAlpha=0,this.depthFunc=as,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Mc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ss,this.stencilZFail=ss,this.stencilZPass=ss,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Kt(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Kt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==os&&(n.blending=this.blending),this.side!==Si&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==ea&&(n.blendSrc=this.blendSrc),this.blendDst!==na&&(n.blendDst=this.blendDst),this.blendEquation!==En&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==as&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Mc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ss&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ss&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ss&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Dt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Yt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Yt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var bi=new F,dc=new F,zo=new F,Ni=new F,fc=new F,Vo=new F,pc=new F,cs=class{constructor(t=new F,e=new F(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,bi)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=bi.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(bi.copy(this.origin).addScaledVector(this.direction,e),bi.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){dc.copy(t).add(e).multiplyScalar(.5),zo.copy(e).sub(t).normalize(),Ni.copy(this.origin).sub(dc);let r=t.distanceTo(e)*.5,o=-this.direction.dot(zo),a=Ni.dot(this.direction),l=-Ni.dot(zo),c=Ni.lengthSq(),h=Math.abs(1-o*o),d,u,f,g;if(h>0)if(d=o*l-a,u=o*a-l,g=r*h,d>=0)if(u>=-g)if(u<=g){let b=1/h;d*=b,u*=b,f=d*(d+o*u+2*a)+u*(o*d+u+2*l)+c}else u=r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u<=-g?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c):u<=g?(d=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(dc).addScaledVector(zo,u),f}intersectSphere(t,e){bi.subVectors(t.center,this.origin);let n=bi.dot(this.direction),s=bi.dot(bi)-n*n,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,bi)!==null}intersectTriangle(t,e,n,s,r){fc.subVectors(e,t),Vo.subVectors(n,t),pc.crossVectors(fc,Vo);let o=this.direction.dot(pc),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Ni.subVectors(this.origin,t);let l=a*this.direction.dot(Vo.crossVectors(Ni,Vo));if(l<0)return null;let c=a*this.direction.dot(fc.cross(Ni));if(c<0||l+c>o)return null;let h=-a*Ni.dot(pc);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Fr=class extends ai{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Dt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Dn,this.combine=Ia,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Yh=new ne,ns=new cs,Go=new Oi,Zh=new F,Ho=new F,Wo=new F,Xo=new F,mc=new F,qo=new F,$h=new F,Yo=new F,me=class extends je{constructor(t=new We,e=new Fr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){qo.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],d=r[l];h!==0&&(mc.fromBufferAttribute(d,t),o?qo.addScaledVector(mc,h):qo.addScaledVector(mc.sub(e),h))}e.add(qo)}return e}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Go.copy(n.boundingSphere),Go.applyMatrix4(r),ns.copy(t.ray).recast(t.near),!(Go.containsPoint(ns.origin)===!1&&(ns.intersectSphere(Go,Zh)===null||ns.origin.distanceToSquared(Zh)>(t.far-t.near)**2))&&(Yh.copy(r).invert(),ns.copy(t.ray).applyMatrix4(Yh),!(n.boundingBox!==null&&ns.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,ns)))}_computeIntersections(t,e,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,b=u.length;g<b;g++){let m=u[g],p=o[m.materialIndex],S=Math.max(m.start,f.start),C=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let _=S,M=C;_<M;_+=3){let T=a.getX(_),w=a.getX(_+1),x=a.getX(_+2);s=Zo(this,p,t,n,c,h,d,T,w,x),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let g=Math.max(0,f.start),b=Math.min(a.count,f.start+f.count);for(let m=g,p=b;m<p;m+=3){let S=a.getX(m),C=a.getX(m+1),_=a.getX(m+2);s=Zo(this,o,t,n,c,h,d,S,C,_),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,b=u.length;g<b;g++){let m=u[g],p=o[m.materialIndex],S=Math.max(m.start,f.start),C=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let _=S,M=C;_<M;_+=3){let T=_,w=_+1,x=_+2;s=Zo(this,p,t,n,c,h,d,T,w,x),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let g=Math.max(0,f.start),b=Math.min(l.count,f.start+f.count);for(let m=g,p=b;m<p;m+=3){let S=m,C=m+1,_=m+2;s=Zo(this,o,t,n,c,h,d,S,C,_),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}};function ap(i,t,e,n,s,r,o,a){let l;if(t.side===rn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===Si,a),l===null)return null;Yo.copy(a),Yo.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(Yo);return c<e.near||c>e.far?null:{distance:c,point:Yo.clone(),object:i}}function Zo(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,Ho),i.getVertexPosition(l,Wo),i.getVertexPosition(c,Xo);let h=ap(i,t,e,n,Ho,Wo,Xo,$h);if(h){let d=new F;Fi.getBarycoord($h,Ho,Wo,Xo,d),s&&(h.uv=Fi.getInterpolatedAttribute(s,a,l,c,d,new Yt)),r&&(h.uv1=Fi.getInterpolatedAttribute(r,a,l,c,d,new Yt)),o&&(h.normal=Fi.getInterpolatedAttribute(o,a,l,c,d,new F),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new F,materialIndex:0};Fi.getNormal(Ho,Wo,Xo,u.normal),h.face=u,h.barycoord=d}return h}var Xn=class extends sn{constructor(t=null,e=1,n=1,s,r,o,a,l,c=De,h=De,d,u){super(null,o,a,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ys=class extends Be{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},Fs=new ne,Kh=new ne,$o=[],Jh=new gn,lp=new ne,Tr=new me,Er=new Oi,Or=class extends me{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new Ys(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,lp)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new gn),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Fs),Jh.copy(t.boundingBox).applyMatrix4(Fs),this.boundingBox.union(Jh)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Oi),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Fs),Er.copy(t.boundingSphere).applyMatrix4(Fs),this.boundingSphere.union(Er)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=t*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(t,e){let n=this.matrixWorld,s=this.count;if(Tr.geometry=this.geometry,Tr.material=this.material,Tr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Er.copy(this.boundingSphere),Er.applyMatrix4(n),t.ray.intersectsSphere(Er)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Fs),Kh.multiplyMatrices(n,Fs),Tr.matrixWorld=Kh,Tr.raycast(t,$o);for(let o=0,a=$o.length;o<a;o++){let l=$o[o];l.instanceId=r,l.object=this,e.push(l)}$o.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new Ys(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Xn(new Float32Array(s*this.count),s,this.count,Ba,Un));let r=this.morphTexture.source.data.data,o=0;for(let c=0;c<n.length;c++)o+=n[c];let a=this.geometry.morphTargetsRelative?1:1-o,l=s*t;return r[l]=a,r.set(n,l+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},gc=new F,cp=new F,hp=new Qt,hn=class{constructor(t=new F(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=gc.subVectors(n,e).cross(cp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(gc),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||hp.getNormalMatrix(t),s=this.coplanarPoint(gc).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}},is=new Oi,up=new Yt(.5,.5),Ko=new F,Zs=class{constructor(t=new hn,e=new hn,n=new hn,s=new hn,r=new hn,o=new hn){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Hn,n=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],f=r[7],g=r[8],b=r[9],m=r[10],p=r[11],S=r[12],C=r[13],_=r[14],M=r[15];if(s[0].setComponents(c-o,f-h,p-g,M-S).normalize(),s[1].setComponents(c+o,f+h,p+g,M+S).normalize(),s[2].setComponents(c+a,f+d,p+b,M+C).normalize(),s[3].setComponents(c-a,f-d,p-b,M-C).normalize(),n)s[4].setComponents(l,u,m,_).normalize(),s[5].setComponents(c-l,f-u,p-m,M-_).normalize();else if(s[4].setComponents(c-l,f-u,p-m,M-_).normalize(),e===Hn)s[5].setComponents(c+l,f+u,p+m,M+_).normalize();else if(e===Vs)s[5].setComponents(l,u,m,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),is.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),is.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(is)}intersectsSprite(t){is.center.set(0,0,0);let e=up.distanceTo(t.center);return is.radius=.7071067811865476+e,is.applyMatrix4(t.matrixWorld),this.intersectsSphere(is)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(Ko.x=s.normal.x>0?t.max.x:t.min.x,Ko.y=s.normal.y>0?t.max.y:t.min.y,Ko.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ko)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Br=class extends sn{constructor(t=[],e=Hi,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},kr=class extends sn{constructor(t,e,n,s,r,o,a,l,c){super(t,e,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var qn=class extends sn{constructor(t,e,n=Zn,s,r,o,a=De,l=De,c,h=oi,d=1){if(h!==oi&&h!==hi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:d};super(u,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ws(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}},ma=class extends qn{constructor(t,e=Zn,n=Hi,s,r,o=De,a=De,l,c=oi){let h={width:t,height:t,depth:1},d=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},zr=class extends sn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},li=class i extends We{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],d=[],u=0,f=0;g("z","y","x",-1,-1,n,e,t,o,r,0),g("z","y","x",1,-1,n,e,-t,o,r,1),g("x","z","y",1,1,t,n,e,s,o,2),g("x","z","y",1,-1,t,n,-e,s,o,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Ce(c,3)),this.setAttribute("normal",new Ce(h,3)),this.setAttribute("uv",new Ce(d,2));function g(b,m,p,S,C,_,M,T,w,x,y){let R=_/w,P=M/x,D=_/2,z=M/2,W=T/2,N=w+1,k=x+1,U=0,X=0,K=new F;for(let lt=0;lt<k;lt++){let at=lt*P-z;for(let gt=0;gt<N;gt++){let yt=gt*R-D;K[b]=yt*S,K[m]=at*C,K[p]=W,c.push(K.x,K.y,K.z),K[b]=0,K[m]=0,K[p]=T>0?1:-1,h.push(K.x,K.y,K.z),d.push(gt/w),d.push(1-lt/x),U+=1}}for(let lt=0;lt<x;lt++)for(let at=0;at<w;at++){let gt=u+at+N*lt,yt=u+at+N*(lt+1),jt=u+(at+1)+N*(lt+1),Pt=u+(at+1)+N*lt;l.push(gt,yt,Pt),l.push(yt,jt,Pt),X+=6}a.addGroup(f,X,y),f+=X,u+=U}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var Vr=class i extends We{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);let r=[],o=[],a=[],l=[],c=new F,h=new Yt;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){let f=n+d/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[u]/t+1)/2,h.y=(o[u+1]/t+1)/2,l.push(h.x,h.y)}for(let d=1;d<=e;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new Ce(o,3)),this.setAttribute("normal",new Ce(a,3)),this.setAttribute("uv",new Ce(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.segments,t.thetaStart,t.thetaLength)}},Gr=class i extends We{constructor(t=1,e=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],d=[],u=[],f=[],g=0,b=[],m=n/2,p=0;S(),o===!1&&(t>0&&C(!0),e>0&&C(!1)),this.setIndex(h),this.setAttribute("position",new Ce(d,3)),this.setAttribute("normal",new Ce(u,3)),this.setAttribute("uv",new Ce(f,2));function S(){let _=new F,M=new F,T=0,w=(e-t)/n;for(let x=0;x<=r;x++){let y=[],R=x/r,P=R*(e-t)+t;for(let D=0;D<=s;D++){let z=D/s,W=z*l+a,N=Math.sin(W),k=Math.cos(W);M.x=P*N,M.y=-R*n+m,M.z=P*k,d.push(M.x,M.y,M.z),_.set(N,w,k).normalize(),u.push(_.x,_.y,_.z),f.push(z,1-R),y.push(g++)}b.push(y)}for(let x=0;x<s;x++)for(let y=0;y<r;y++){let R=b[y][x],P=b[y+1][x],D=b[y+1][x+1],z=b[y][x+1];(t>0||y!==0)&&(h.push(R,P,z),T+=3),(e>0||y!==r-1)&&(h.push(P,D,z),T+=3)}c.addGroup(p,T,0),p+=T}function C(_){let M=g,T=new Yt,w=new F,x=0,y=_===!0?t:e,R=_===!0?1:-1;for(let D=1;D<=s;D++)d.push(0,m*R,0),u.push(0,R,0),f.push(.5,.5),g++;let P=g;for(let D=0;D<=s;D++){let W=D/s*l+a,N=Math.cos(W),k=Math.sin(W);w.x=y*k,w.y=m*R,w.z=y*N,d.push(w.x,w.y,w.z),u.push(0,R,0),T.x=N*.5+.5,T.y=k*.5*R+.5,f.push(T.x,T.y),g++}for(let D=0;D<s;D++){let z=M+D,W=P+D;_===!0?h.push(W,W+1,z):h.push(W+1,W,z),x+=3}c.addGroup(p,x,_===!0?1:2),p+=x}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var wi=class i extends We{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,d=t/a,u=e/l,f=[],g=[],b=[],m=[];for(let p=0;p<h;p++){let S=p*u-o;for(let C=0;C<c;C++){let _=C*d-r;g.push(_,-S,0),b.push(0,0,1),m.push(C/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let S=0;S<a;S++){let C=S+c*p,_=S+c*(p+1),M=S+1+c*(p+1),T=S+1+c*p;f.push(C,_,T),f.push(_,M,T)}this.setIndex(f),this.setAttribute("position",new Ce(g,3)),this.setAttribute("normal",new Ce(b,3)),this.setAttribute("uv",new Ce(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var Hr=class i extends We{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],d=new F,u=new F,f=[],g=[],b=[],m=[];for(let p=0;p<=n;p++){let S=[],C=p/n,_=o+C*a,M=t*Math.cos(_),T=Math.sqrt(t*t-M*M),w=0;p===0&&o===0?w=.5/e:p===n&&l===Math.PI&&(w=-.5/e);for(let x=0;x<=e;x++){let y=x/e,R=s+y*r;d.x=-T*Math.cos(R),d.y=M,d.z=T*Math.sin(R),g.push(d.x,d.y,d.z),u.copy(d).normalize(),b.push(u.x,u.y,u.z),m.push(y+w,1-C),S.push(c++)}h.push(S)}for(let p=0;p<n;p++)for(let S=0;S<e;S++){let C=h[p][S+1],_=h[p][S],M=h[p+1][S],T=h[p+1][S+1];(p!==0||o>0)&&f.push(C,_,T),(p!==n-1||l<Math.PI)&&f.push(_,M,T)}this.setIndex(f),this.setAttribute("position",new Ce(g,3)),this.setAttribute("normal",new Ce(b,3)),this.setAttribute("uv",new Ce(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function gs(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(jh(s))s.isRenderTargetTexture?(Kt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(jh(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function dn(i){let t={};for(let e=0;e<i.length;e++){let n=gs(i[e]);for(let s in n)t[s]=n[s]}return t}function jh(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function dp(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Yc(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ue.workingColorSpace}var ui={clone:gs,merge:dn},fp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,pp=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Ne=class extends ai{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=fp,this.fragmentShader=pp,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=gs(t.uniforms),this.uniformsGroups=dp(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new Dt().setHex(s.value);break;case"v2":this.uniforms[n].value=new Yt().fromArray(s.value);break;case"v3":this.uniforms[n].value=new F().fromArray(s.value);break;case"v4":this.uniforms[n].value=new Te().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Qt().fromArray(s.value);break;case"m4":this.uniforms[n].value=new ne().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},$s=class extends Ne{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},ke=class extends ai{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Dt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Dt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=tr,this.normalScale=new Yt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Dn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},Wr=class extends ke{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Yt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return le(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Dt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Dt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Dt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var Xr=class extends ai{constructor(t){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=tr,this.normalScale=new Yt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.flatShading=t.flatShading,this}},qr=class extends ai{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Dt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Dt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=tr,this.normalScale=new Yt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Dn,this.combine=Ia,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},ga=class extends ai{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Tu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},xa=class extends ai{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Jo(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}var Bi=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let o;e:{i:if(!(t<s)){for(let a=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=e[++n],t<s)break t}o=e.length;break e}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}o=n,n=0;break e}break n}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},va=class extends Bi{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:_c,endingEnd:_c}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case yc:r=t,a=2*e-n;break;case bc:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case yc:o=t,l=2*n-e;break;case bc:o=1,l=n+s[1]-s[0];break;default:o=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,g=(n-e)/(s-e),b=g*g,m=b*g,p=-u*m+2*u*b-u*g,S=(1+u)*m+(-1.5-2*u)*b+(-.5+u)*g+1,C=(-1-f)*m+(1.5+f)*b+.5*g,_=f*m-f*b;for(let M=0;M!==a;++M)r[M]=p*o[h+M]+S*o[c+M]+C*o[l+M]+_*o[d+M];return r}},_a=class extends Bi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(n-e)/(s-e),d=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*d+o[l+u]*h;return r}},ya=class extends Bi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},ba=class extends Bi{interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,d=this.outTangents;if(!h||!d){let g=(n-e)/(s-e),b=1-g;for(let m=0;m!==a;++m)r[m]=o[c+m]*b+o[l+m]*g;return r}let u=a*2,f=t-1;for(let g=0;g!==a;++g){let b=o[c+g],m=o[l+g],p=f*u+g*2,S=d[p],C=d[p+1],_=t*u+g*2,M=h[_],T=h[_+1],w=(n-e)/(s-e),x,y,R,P,D;for(let z=0;z<8;z++){x=w*w,y=x*w,R=1-w,P=R*R,D=P*R;let N=D*e+3*P*w*S+3*R*x*M+y*s-n;if(Math.abs(N)<1e-10)break;let k=3*P*(S-e)+6*R*w*(M-S)+3*x*(s-M);if(Math.abs(k)<1e-10)break;w=w-N/k,w=Math.max(0,Math.min(1,w))}r[g]=D*b+3*P*w*C+3*R*x*T+y*m}return r}},An=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Jo(e,this.TimeBufferType),this.values=Jo(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Jo(t.times,Array),values:Jo(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s)}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new ya(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new _a(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new va(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new ba(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Rr:e=this.InterpolantFactoryMethodDiscrete;break;case ua:e=this.InterpolantFactoryMethodLinear;break;case ta:e=this.InterpolantFactoryMethodSmooth;break;case vc:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Kt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Rr;case this.InterpolantFactoryMethodLinear:return ua;case this.InterpolantFactoryMethodSmooth:return ta;case this.InterpolantFactoryMethodBezier:return vc}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t}return this}trim(t,e){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Jt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Jt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Jt("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){Jt("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(s!==void 0&&Pf(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Jt("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===ta,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(s)l=!0;else{let d=a*n,u=d-n,f=d+n;for(let g=0;g!==n;++g){let b=e[d+g];if(b!==e[u+g]||b!==e[f+g]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let d=a*n,u=o*n;for(let f=0;f!==n;++f)e[u+f]=e[d+f]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,s}};An.prototype.ValueTypeName="";An.prototype.TimeBufferType=Float32Array;An.prototype.ValueBufferType=Float32Array;An.prototype.DefaultInterpolation=ua;var ki=class extends An{constructor(t,e,n){super(t,e,n)}};ki.prototype.ValueTypeName="bool";ki.prototype.ValueBufferType=Array;ki.prototype.DefaultInterpolation=Rr;ki.prototype.InterpolantFactoryMethodLinear=void 0;ki.prototype.InterpolantFactoryMethodSmooth=void 0;var Ma=class extends An{constructor(t,e,n,s){super(t,e,n,s)}};Ma.prototype.ValueTypeName="color";var Sa=class extends An{constructor(t,e,n,s){super(t,e,n,s)}};Sa.prototype.ValueTypeName="number";var wa=class extends Bi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-e)/(s-e),c=t*a;for(let h=c+a;c!==h;c+=4)nn.slerpFlat(r,0,o,c-a,o,c,l);return r}},Yr=class extends An{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new wa(this.times,this.values,this.getValueSize(),t)}};Yr.prototype.ValueTypeName="quaternion";Yr.prototype.InterpolantFactoryMethodSmooth=void 0;var zi=class extends An{constructor(t,e,n){super(t,e,n)}};zi.prototype.ValueTypeName="string";zi.prototype.ValueBufferType=Array;zi.prototype.DefaultInterpolation=Rr;zi.prototype.InterpolantFactoryMethodLinear=void 0;zi.prototype.InterpolantFactoryMethodSmooth=void 0;var Ta=class extends An{constructor(t,e,n,s){super(t,e,n,s)}};Ta.prototype.ValueTypeName="vector";var Ks=class{constructor(t,e,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){let f=c[d],g=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Bu=new Ks,Ea=class{constructor(t){this.manager=t!==void 0?t:Bu,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Ea.DEFAULT_MATERIAL_NAME="__DEFAULT";var hs=class extends je{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Dt(t),this.intensity=e}dispose(){this.dispatchEvent({type:"dispose"})}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},Zr=class extends hs{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(je.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Dt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},xc=new ne,Qh=new F,tu=new F,Aa=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Yt(512,512),this.mapType=Qe,this.map=null,this.mapPass=null,this.matrix=new ne,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Zs,this._frameExtents=new Yt(1,1),this._viewportCount=1,this._viewports=[new Te(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera,n=this.matrix;Qh.setFromMatrixPosition(t.matrixWorld),e.position.copy(Qh),tu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(tu),e.updateMatrixWorld(),xc.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(xc,e.coordinateSystem,e.reversedDepth),e.coordinateSystem===Vs||e.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(xc)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},jo=new F,Qo=new nn,si=new F,$r=class extends je{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ne,this.projectionMatrix=new ne,this.projectionMatrixInverse=new ne,this.coordinateSystem=Hn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(jo,Qo,si),si.x===1&&si.y===1&&si.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(jo,Qo,si.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(jo,Qo,si),si.x===1&&si.y===1&&si.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(jo,Qo,si.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ui=new F,eu=new Yt,nu=new Yt,He=class extends $r{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Hs*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Ar*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Hs*2*Math.atan(Math.tan(Ar*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Ui.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Ui.x,Ui.y).multiplyScalar(-t/Ui.z),Ui.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ui.x,Ui.y).multiplyScalar(-t/Ui.z)}getViewSize(t,e){return this.getViewBounds(t,eu,nu),e.subVectors(nu,eu)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Ar*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var wc=class extends Aa{constructor(){super(new He(90,1,.5,500)),this.isPointLightShadow=!0}},us=class extends hs{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new wc}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Nn=class extends $r{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Tc=class extends Aa{constructor(){super(new Nn(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Kr=class extends hs{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(je.DEFAULT_UP),this.updateMatrix(),this.target=new je,this.shadow=new Tc}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},Jr=class extends hs{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Os=-90,Bs=1,Ca=class extends je{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new He(Os,Bs,t,e);s.layers=this.layers,this.add(s);let r=new He(Os,Bs,t,e);r.layers=this.layers,this.add(r);let o=new He(Os,Bs,t,e);o.layers=this.layers,this.add(o);let a=new He(Os,Bs,t,e);a.layers=this.layers,this.add(a);let l=new He(Os,Bs,t,e);l.layers=this.layers,this.add(l);let c=new He(Os,Bs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Hn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Vs)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;let b=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=b,t.setRenderTarget(n,5,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},Ra=class extends He{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var Zc="\\[\\]\\.:\\/",mp=new RegExp("["+Zc+"]","g"),$c="[^"+Zc+"]",gp="[^"+Zc.replace("\\.","")+"]",xp=/((?:WC+[\/:])*)/.source.replace("WC",$c),vp=/(WCOD+)?/.source.replace("WCOD",gp),_p=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",$c),yp=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",$c),bp=new RegExp("^"+xp+vp+_p+yp+"$"),Mp=["material","materials","bones","map"],Ec=class{constructor(t,e,n){let s=n||Ae.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},Ae=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(mp,"")}static parseTrackName(t){let e=bp.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Mp.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=n(a.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Kt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){Jt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Jt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Jt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Jt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Jt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Jt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){Jt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[s];if(o===void 0){let c=e.nodeName;Jt("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Jt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Jt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ae.Composite=Ec;Ae.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ae.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ae.prototype.GetterByBindingType=[Ae.prototype._getValue_direct,Ae.prototype._getValue_array,Ae.prototype._getValue_arrayElement,Ae.prototype._getValue_toArray];Ae.prototype.SetterByBindingTypeAndVersioning=[[Ae.prototype._setValue_direct,Ae.prototype._setValue_direct_setNeedsUpdate,Ae.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ae.prototype._setValue_array,Ae.prototype._setValue_array_setNeedsUpdate,Ae.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ae.prototype._setValue_arrayElement,Ae.prototype._setValue_arrayElement_setNeedsUpdate,Ae.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ae.prototype._setValue_fromArray,Ae.prototype._setValue_fromArray_setNeedsUpdate,Ae.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var I_=new Float32Array(1);var iu=new ne,jr=class{constructor(t,e,n=0,s=1/0){this.ray=new cs(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Xs,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Jt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return iu.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(iu),this}intersectObject(t,e=!0,n=[]){return Ac(t,this,n,e),n.sort(su),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Ac(t[s],this,n,e);return n.sort(su),n}};function su(i,t){return i.distance-t.distance}function Ac(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let o=0,a=r.length;o<a;o++)Ac(r[o],t,e,!0)}}var Js=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=le(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(le(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Cc=class i{static{i.prototype.isMatrix2=!0}constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};var Qr=class extends Wn{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){Kt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function Kc(i,t,e,n){let s=Sp(n);switch(e){case Vc:return i*t;case Ba:return i*t/s.components*s.byteLength;case ka:return i*t/s.components*s.byteLength;case qi:return i*t*2/s.components*s.byteLength;case za:return i*t*2/s.components*s.byteLength;case Gc:return i*t*3/s.components*s.byteLength;case yn:return i*t*4/s.components*s.byteLength;case Va:return i*t*4/s.components*s.byteLength;case ao:case lo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case co:case ho:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Ha:case Xa:return Math.max(i,16)*Math.max(t,8)/4;case Ga:case Wa:return Math.max(i,8)*Math.max(t,8)/2;case qa:case Ya:case $a:case Ka:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Za:case uo:case Ja:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case ja:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Qa:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case tl:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case el:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case nl:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case il:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case sl:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case rl:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case ol:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case al:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case ll:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case cl:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case hl:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case ul:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case dl:case fl:case pl:return Math.ceil(i/4)*Math.ceil(t/4)*16;case ml:case gl:return Math.ceil(i/4)*Math.ceil(t/4)*8;case fo:case xl:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Sp(i){switch(i){case Qe:case Oc:return{byteLength:1,components:1};case Qs:case Bc:case qe:return{byteLength:2,components:1};case Fa:case Oa:return{byteLength:2,components:4};case Zn:case Ua:case Un:return{byteLength:4,components:1};case kc:case zc:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"185"}}));typeof window<"u"&&(window.__THREE__?Kt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="185");function ad(){let i=null,t=!1,e=null,n=null;function s(r,o){e(r,o),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function Pp(i){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,d=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){let h=l.array,d=l.updateRanges;if(i.bindBuffer(c,a),d.length===0)i.bufferSubData(c,0,h);else{d.sort((f,g)=>f.start-g.start);let u=0;for(let f=1;f<d.length;f++){let g=d[u],b=d[f];b.start<=g.start+g.count+1?g.count=Math.max(g.count,b.start+b.count-g.start):(++u,d[u]=b)}d.length=u+1;for(let f=0,g=d.length;f<g;f++){let b=d[f];i.bufferSubData(c,b.start*h.BYTES_PER_ELEMENT,h,b.start,b.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Ip=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Lp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Dp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Np=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Up=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Fp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Op=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Bp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,kp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,zp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Vp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Gp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Hp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Wp=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Xp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,qp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Yp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Zp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,$p=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Kp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Jp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,jp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Qp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,tm=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,em=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,nm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,im=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,sm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,rm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,om=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,am="gl_FragColor = linearToOutputTexel( gl_FragColor );",lm=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,cm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,hm=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,um=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,dm=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,fm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,pm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,mm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,gm=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,xm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,vm=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,_m=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ym=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,bm=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Mm=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Sm=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,wm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Tm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Em=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Am=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Cm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Rm=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Pm=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Im=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Lm=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Dm=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Nm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Um=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Fm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Om=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Bm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,km=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,zm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Vm=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Gm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Hm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Wm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Xm=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,qm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ym=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Zm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,$m=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Km=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Jm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,jm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Qm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,tg=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,eg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,ng=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ig=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,sg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,rg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,og=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,ag=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,lg=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,cg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,ug=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,dg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,fg=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,pg=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,mg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,gg=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,xg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,vg=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,_g=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,yg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,bg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Mg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Sg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,wg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Tg=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Eg=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Ag=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Cg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Rg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Pg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Ig=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Lg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ng=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ug=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Fg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Og=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Bg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,kg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,zg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Vg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Gg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Hg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Wg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Xg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,qg=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Yg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Zg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$g=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Kg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Jg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,jg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Qg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,t0=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,e0=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,n0=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,i0=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,s0=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,r0=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,o0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,a0=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,l0=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,c0=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,h0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ae={alphahash_fragment:Ip,alphahash_pars_fragment:Lp,alphamap_fragment:Dp,alphamap_pars_fragment:Np,alphatest_fragment:Up,alphatest_pars_fragment:Fp,aomap_fragment:Op,aomap_pars_fragment:Bp,batching_pars_vertex:kp,batching_vertex:zp,begin_vertex:Vp,beginnormal_vertex:Gp,bsdfs:Hp,iridescence_fragment:Wp,bumpmap_pars_fragment:Xp,clipping_planes_fragment:qp,clipping_planes_pars_fragment:Yp,clipping_planes_pars_vertex:Zp,clipping_planes_vertex:$p,color_fragment:Kp,color_pars_fragment:Jp,color_pars_vertex:jp,color_vertex:Qp,common:tm,cube_uv_reflection_fragment:em,defaultnormal_vertex:nm,displacementmap_pars_vertex:im,displacementmap_vertex:sm,emissivemap_fragment:rm,emissivemap_pars_fragment:om,colorspace_fragment:am,colorspace_pars_fragment:lm,envmap_fragment:cm,envmap_common_pars_fragment:hm,envmap_pars_fragment:um,envmap_pars_vertex:dm,envmap_physical_pars_fragment:Sm,envmap_vertex:fm,fog_vertex:pm,fog_pars_vertex:mm,fog_fragment:gm,fog_pars_fragment:xm,gradientmap_pars_fragment:vm,lightmap_pars_fragment:_m,lights_lambert_fragment:ym,lights_lambert_pars_fragment:bm,lights_pars_begin:Mm,lights_toon_fragment:wm,lights_toon_pars_fragment:Tm,lights_phong_fragment:Em,lights_phong_pars_fragment:Am,lights_physical_fragment:Cm,lights_physical_pars_fragment:Rm,lights_fragment_begin:Pm,lights_fragment_maps:Im,lights_fragment_end:Lm,lightprobes_pars_fragment:Dm,logdepthbuf_fragment:Nm,logdepthbuf_pars_fragment:Um,logdepthbuf_pars_vertex:Fm,logdepthbuf_vertex:Om,map_fragment:Bm,map_pars_fragment:km,map_particle_fragment:zm,map_particle_pars_fragment:Vm,metalnessmap_fragment:Gm,metalnessmap_pars_fragment:Hm,morphinstance_vertex:Wm,morphcolor_vertex:Xm,morphnormal_vertex:qm,morphtarget_pars_vertex:Ym,morphtarget_vertex:Zm,normal_fragment_begin:$m,normal_fragment_maps:Km,normal_pars_fragment:Jm,normal_pars_vertex:jm,normal_vertex:Qm,normalmap_pars_fragment:tg,clearcoat_normal_fragment_begin:eg,clearcoat_normal_fragment_maps:ng,clearcoat_pars_fragment:ig,iridescence_pars_fragment:sg,opaque_fragment:rg,packing:og,premultiplied_alpha_fragment:ag,project_vertex:lg,dithering_fragment:cg,dithering_pars_fragment:hg,roughnessmap_fragment:ug,roughnessmap_pars_fragment:dg,shadowmap_pars_fragment:fg,shadowmap_pars_vertex:pg,shadowmap_vertex:mg,shadowmask_pars_fragment:gg,skinbase_vertex:xg,skinning_pars_vertex:vg,skinning_vertex:_g,skinnormal_vertex:yg,specularmap_fragment:bg,specularmap_pars_fragment:Mg,tonemapping_fragment:Sg,tonemapping_pars_fragment:wg,transmission_fragment:Tg,transmission_pars_fragment:Eg,uv_pars_fragment:Ag,uv_pars_vertex:Cg,uv_vertex:Rg,worldpos_vertex:Pg,background_vert:Ig,background_frag:Lg,backgroundCube_vert:Dg,backgroundCube_frag:Ng,cube_vert:Ug,cube_frag:Fg,depth_vert:Og,depth_frag:Bg,distance_vert:kg,distance_frag:zg,equirect_vert:Vg,equirect_frag:Gg,linedashed_vert:Hg,linedashed_frag:Wg,meshbasic_vert:Xg,meshbasic_frag:qg,meshlambert_vert:Yg,meshlambert_frag:Zg,meshmatcap_vert:$g,meshmatcap_frag:Kg,meshnormal_vert:Jg,meshnormal_frag:jg,meshphong_vert:Qg,meshphong_frag:t0,meshphysical_vert:e0,meshphysical_frag:n0,meshtoon_vert:i0,meshtoon_frag:s0,points_vert:r0,points_frag:o0,shadow_vert:a0,shadow_frag:l0,sprite_vert:c0,sprite_frag:h0},Ct={common:{diffuse:{value:new Dt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Qt},alphaMap:{value:null},alphaMapTransform:{value:new Qt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Qt}},envmap:{envMap:{value:null},envMapRotation:{value:new Qt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Qt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Qt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Qt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Qt},normalScale:{value:new Yt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Qt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Qt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Qt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Qt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Dt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new F},probesMax:{value:new F},probesResolution:{value:new F}},points:{diffuse:{value:new Dt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Qt},alphaTest:{value:0},uvTransform:{value:new Qt}},sprite:{diffuse:{value:new Dt(16777215)},opacity:{value:1},center:{value:new Yt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Qt},alphaMap:{value:null},alphaMapTransform:{value:new Qt},alphaTest:{value:0}}},fi={basic:{uniforms:dn([Ct.common,Ct.specularmap,Ct.envmap,Ct.aomap,Ct.lightmap,Ct.fog]),vertexShader:ae.meshbasic_vert,fragmentShader:ae.meshbasic_frag},lambert:{uniforms:dn([Ct.common,Ct.specularmap,Ct.envmap,Ct.aomap,Ct.lightmap,Ct.emissivemap,Ct.bumpmap,Ct.normalmap,Ct.displacementmap,Ct.fog,Ct.lights,{emissive:{value:new Dt(0)},envMapIntensity:{value:1}}]),vertexShader:ae.meshlambert_vert,fragmentShader:ae.meshlambert_frag},phong:{uniforms:dn([Ct.common,Ct.specularmap,Ct.envmap,Ct.aomap,Ct.lightmap,Ct.emissivemap,Ct.bumpmap,Ct.normalmap,Ct.displacementmap,Ct.fog,Ct.lights,{emissive:{value:new Dt(0)},specular:{value:new Dt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:ae.meshphong_vert,fragmentShader:ae.meshphong_frag},standard:{uniforms:dn([Ct.common,Ct.envmap,Ct.aomap,Ct.lightmap,Ct.emissivemap,Ct.bumpmap,Ct.normalmap,Ct.displacementmap,Ct.roughnessmap,Ct.metalnessmap,Ct.fog,Ct.lights,{emissive:{value:new Dt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ae.meshphysical_vert,fragmentShader:ae.meshphysical_frag},toon:{uniforms:dn([Ct.common,Ct.aomap,Ct.lightmap,Ct.emissivemap,Ct.bumpmap,Ct.normalmap,Ct.displacementmap,Ct.gradientmap,Ct.fog,Ct.lights,{emissive:{value:new Dt(0)}}]),vertexShader:ae.meshtoon_vert,fragmentShader:ae.meshtoon_frag},matcap:{uniforms:dn([Ct.common,Ct.bumpmap,Ct.normalmap,Ct.displacementmap,Ct.fog,{matcap:{value:null}}]),vertexShader:ae.meshmatcap_vert,fragmentShader:ae.meshmatcap_frag},points:{uniforms:dn([Ct.points,Ct.fog]),vertexShader:ae.points_vert,fragmentShader:ae.points_frag},dashed:{uniforms:dn([Ct.common,Ct.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ae.linedashed_vert,fragmentShader:ae.linedashed_frag},depth:{uniforms:dn([Ct.common,Ct.displacementmap]),vertexShader:ae.depth_vert,fragmentShader:ae.depth_frag},normal:{uniforms:dn([Ct.common,Ct.bumpmap,Ct.normalmap,Ct.displacementmap,{opacity:{value:1}}]),vertexShader:ae.meshnormal_vert,fragmentShader:ae.meshnormal_frag},sprite:{uniforms:dn([Ct.sprite,Ct.fog]),vertexShader:ae.sprite_vert,fragmentShader:ae.sprite_frag},background:{uniforms:{uvTransform:{value:new Qt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ae.background_vert,fragmentShader:ae.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Qt}},vertexShader:ae.backgroundCube_vert,fragmentShader:ae.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ae.cube_vert,fragmentShader:ae.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ae.equirect_vert,fragmentShader:ae.equirect_frag},distance:{uniforms:dn([Ct.common,Ct.displacementmap,{referencePosition:{value:new F},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ae.distance_vert,fragmentShader:ae.distance_frag},shadow:{uniforms:dn([Ct.lights,Ct.fog,{color:{value:new Dt(0)},opacity:{value:1}}]),vertexShader:ae.shadow_vert,fragmentShader:ae.shadow_frag}};fi.physical={uniforms:dn([fi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Qt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Qt},clearcoatNormalScale:{value:new Yt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Qt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Qt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Qt},sheen:{value:0},sheenColor:{value:new Dt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Qt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Qt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Qt},transmissionSamplerSize:{value:new Yt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Qt},attenuationDistance:{value:0},attenuationColor:{value:new Dt(0)},specularColor:{value:new Dt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Qt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Qt},anisotropyVector:{value:new Yt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Qt}}]),vertexShader:ae.meshphysical_vert,fragmentShader:ae.meshphysical_frag};var yl={r:0,b:0,g:0},u0=new ne,ld=new Qt;ld.set(-1,0,0,0,1,0,0,0,1);function d0(i,t,e,n,s,r){let o=new Dt(0),a=s===!0?0:1,l,c,h=null,d=0,u=null;function f(S){let C=S.isScene===!0?S.background:null;if(C&&C.isTexture){let _=S.backgroundBlurriness>0;C=t.get(C,_)}return C}function g(S){let C=!1,_=f(S);_===null?m(o,a):_&&_.isColor&&(m(_,1),C=!0);let M=i.xr.getEnvironmentBlendMode();M==="additive"?e.buffers.color.setClear(0,0,0,1,r):M==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||C)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function b(S,C){let _=f(C);_&&(_.isCubeTexture||_.mapping===ro)?(c===void 0&&(c=new me(new li(1,1,1),new Ne({name:"BackgroundCubeMaterial",uniforms:gs(fi.backgroundCube.uniforms),vertexShader:fi.backgroundCube.vertexShader,fragmentShader:fi.backgroundCube.fragmentShader,side:rn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(M,T,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=_,c.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(u0.makeRotationFromEuler(C.backgroundRotation)).transpose(),_.isCubeTexture&&_.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(ld),c.material.toneMapped=ue.getTransfer(_.colorSpace)!==_e,(h!==_||d!==_.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=_,d=_.version,u=i.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)):_&&_.isTexture&&(l===void 0&&(l=new me(new wi(2,2),new Ne({name:"BackgroundMaterial",uniforms:gs(fi.background.uniforms),vertexShader:fi.background.vertexShader,fragmentShader:fi.background.fragmentShader,side:Si,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=_,l.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,l.material.toneMapped=ue.getTransfer(_.colorSpace)!==_e,_.matrixAutoUpdate===!0&&_.updateMatrix(),l.material.uniforms.uvTransform.value.copy(_.matrix),(h!==_||d!==_.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=_,d=_.version,u=i.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null))}function m(S,C){S.getRGB(yl,Yc(i)),e.buffers.color.setClear(yl.r,yl.g,yl.b,C,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(S,C=1){o.set(S),a=C,m(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(S){a=S,m(o,a)},render:g,addToRenderList:b,dispose:p}}function f0(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,o=!1;function a(P,D,z,W,N){let k=!1,U=d(P,W,z,D);r!==U&&(r=U,c(r.object)),k=f(P,W,z,N),k&&g(P,W,z,N),N!==null&&t.update(N,i.ELEMENT_ARRAY_BUFFER),(k||o)&&(o=!1,_(P,D,z,W),N!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(N).buffer))}function l(){return i.createVertexArray()}function c(P){return i.bindVertexArray(P)}function h(P){return i.deleteVertexArray(P)}function d(P,D,z,W){let N=W.wireframe===!0,k=n[D.id];k===void 0&&(k={},n[D.id]=k);let U=P.isInstancedMesh===!0?P.id:0,X=k[U];X===void 0&&(X={},k[U]=X);let K=X[z.id];K===void 0&&(K={},X[z.id]=K);let lt=K[N];return lt===void 0&&(lt=u(l()),K[N]=lt),lt}function u(P){let D=[],z=[],W=[];for(let N=0;N<e;N++)D[N]=0,z[N]=0,W[N]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:z,attributeDivisors:W,object:P,attributes:{},index:null}}function f(P,D,z,W){let N=r.attributes,k=D.attributes,U=0,X=z.getAttributes();for(let K in X)if(X[K].location>=0){let at=N[K],gt=k[K];if(gt===void 0&&(K==="instanceMatrix"&&P.instanceMatrix&&(gt=P.instanceMatrix),K==="instanceColor"&&P.instanceColor&&(gt=P.instanceColor)),at===void 0||at.attribute!==gt||gt&&at.data!==gt.data)return!0;U++}return r.attributesNum!==U||r.index!==W}function g(P,D,z,W){let N={},k=D.attributes,U=0,X=z.getAttributes();for(let K in X)if(X[K].location>=0){let at=k[K];at===void 0&&(K==="instanceMatrix"&&P.instanceMatrix&&(at=P.instanceMatrix),K==="instanceColor"&&P.instanceColor&&(at=P.instanceColor));let gt={};gt.attribute=at,at&&at.data&&(gt.data=at.data),N[K]=gt,U++}r.attributes=N,r.attributesNum=U,r.index=W}function b(){let P=r.newAttributes;for(let D=0,z=P.length;D<z;D++)P[D]=0}function m(P){p(P,0)}function p(P,D){let z=r.newAttributes,W=r.enabledAttributes,N=r.attributeDivisors;z[P]=1,W[P]===0&&(i.enableVertexAttribArray(P),W[P]=1),N[P]!==D&&(i.vertexAttribDivisor(P,D),N[P]=D)}function S(){let P=r.newAttributes,D=r.enabledAttributes;for(let z=0,W=D.length;z<W;z++)D[z]!==P[z]&&(i.disableVertexAttribArray(z),D[z]=0)}function C(P,D,z,W,N,k,U){U===!0?i.vertexAttribIPointer(P,D,z,N,k):i.vertexAttribPointer(P,D,z,W,N,k)}function _(P,D,z,W){b();let N=W.attributes,k=z.getAttributes(),U=D.defaultAttributeValues;for(let X in k){let K=k[X];if(K.location>=0){let lt=N[X];if(lt===void 0&&(X==="instanceMatrix"&&P.instanceMatrix&&(lt=P.instanceMatrix),X==="instanceColor"&&P.instanceColor&&(lt=P.instanceColor)),lt!==void 0){let at=lt.normalized,gt=lt.itemSize,yt=t.get(lt);if(yt===void 0)continue;let jt=yt.buffer,Pt=yt.type,j=yt.bytesPerElement,ut=Pt===i.INT||Pt===i.UNSIGNED_INT||lt.gpuType===Ua;if(lt.isInterleavedBufferAttribute){let ct=lt.data,zt=ct.stride,St=lt.offset;if(ct.isInstancedInterleavedBuffer){for(let xt=0;xt<K.locationSize;xt++)p(K.location+xt,ct.meshPerAttribute);P.isInstancedMesh!==!0&&W._maxInstanceCount===void 0&&(W._maxInstanceCount=ct.meshPerAttribute*ct.count)}else for(let xt=0;xt<K.locationSize;xt++)m(K.location+xt);i.bindBuffer(i.ARRAY_BUFFER,jt);for(let xt=0;xt<K.locationSize;xt++)C(K.location+xt,gt/K.locationSize,Pt,at,zt*j,(St+gt/K.locationSize*xt)*j,ut)}else{if(lt.isInstancedBufferAttribute){for(let ct=0;ct<K.locationSize;ct++)p(K.location+ct,lt.meshPerAttribute);P.isInstancedMesh!==!0&&W._maxInstanceCount===void 0&&(W._maxInstanceCount=lt.meshPerAttribute*lt.count)}else for(let ct=0;ct<K.locationSize;ct++)m(K.location+ct);i.bindBuffer(i.ARRAY_BUFFER,jt);for(let ct=0;ct<K.locationSize;ct++)C(K.location+ct,gt/K.locationSize,Pt,at,gt*j,gt/K.locationSize*ct*j,ut)}}else if(U!==void 0){let at=U[X];if(at!==void 0)switch(at.length){case 2:i.vertexAttrib2fv(K.location,at);break;case 3:i.vertexAttrib3fv(K.location,at);break;case 4:i.vertexAttrib4fv(K.location,at);break;default:i.vertexAttrib1fv(K.location,at)}}}}S()}function M(){y();for(let P in n){let D=n[P];for(let z in D){let W=D[z];for(let N in W){let k=W[N];for(let U in k)h(k[U].object),delete k[U];delete W[N]}}delete n[P]}}function T(P){if(n[P.id]===void 0)return;let D=n[P.id];for(let z in D){let W=D[z];for(let N in W){let k=W[N];for(let U in k)h(k[U].object),delete k[U];delete W[N]}}delete n[P.id]}function w(P){for(let D in n){let z=n[D];for(let W in z){let N=z[W];if(N[P.id]===void 0)continue;let k=N[P.id];for(let U in k)h(k[U].object),delete k[U];delete N[P.id]}}}function x(P){for(let D in n){let z=n[D],W=P.isInstancedMesh===!0?P.id:0,N=z[W];if(N!==void 0){for(let k in N){let U=N[k];for(let X in U)h(U[X].object),delete U[X];delete N[k]}delete z[W],Object.keys(z).length===0&&delete n[D]}}}function y(){R(),o=!0,r!==s&&(r=s,c(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:y,resetDefaultState:R,dispose:M,releaseStatesOfGeometry:T,releaseStatesOfObject:x,releaseStatesOfProgram:w,initAttributes:b,enableAttribute:m,disableUnusedAttributes:S}}function p0(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function m0(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let w=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(w){return!(w!==yn&&n.convert(w)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(w){let x=w===qe&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(w!==Qe&&n.convert(w)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==Un&&!x)}function l(w){if(w==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Kt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let d=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&Kt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),b=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),S=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),C=i.getParameter(i.MAX_VARYING_VECTORS),_=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),M=i.getParameter(i.MAX_SAMPLES),T=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:g,maxTextureSize:b,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:S,maxVaryings:C,maxFragmentUniforms:_,maxSamples:M,samples:T}}function g0(i){let t=this,e=null,n=0,s=!1,r=!1,o=new hn,a=new Qt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||n!==0||s;return s=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){let g=d.clippingPlanes,b=d.clipIntersection,m=d.clipShadows,p=i.get(d);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{let S=r?0:n,C=S*4,_=p.clippingState||null;l.value=_,_=h(g,u,C,f);for(let M=0;M!==C;++M)_[M]=e[M];p.clippingState=_,this.numIntersection=b?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,g){let b=d!==null?d.length:0,m=null;if(b!==0){if(m=l.value,g!==!0||m===null){let p=f+b*4,S=u.matrixWorldInverse;a.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let C=0,_=f;C!==b;++C,_+=4)o.copy(d[C]).applyMatrix4(S,a),o.normal.toArray(m,_),m[_+3]=o.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=b,t.numIntersection=0,m}}var Yi=4,ku=[.125,.215,.35,.446,.526,.582],xs=20,x0=256,po=new Nn,zu=new Dt,Jc=null,jc=0,Qc=0,th=!1,v0=new F,sr=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:o=256,position:a=v0}=r;Jc=this._renderer.getRenderTarget(),jc=this._renderer.getActiveCubeFace(),Qc=this._renderer.getActiveMipmapLevel(),th=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Hu(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Gu(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Jc,jc,Qc),this._renderer.xr.enabled=th,t.scissorTest=!1,nr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Hi||t.mapping===ms?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Jc=this._renderer.getRenderTarget(),jc=this._renderer.getActiveCubeFace(),Qc=this._renderer.getActiveMipmapLevel(),th=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:en,minFilter:en,generateMipmaps:!1,type:qe,format:yn,colorSpace:Pr,depthBuffer:!1},s=Vu(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Vu(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=_0(r)),this._blurMaterial=b0(r,t,e),this._ggxMaterial=y0(r,t,e)}return s}_compileMaterial(t){let e=new me(new We,t);this._renderer.compile(e,po)}_sceneToCubeUV(t,e,n,s,r){let l=new He(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(zu),d.toneMapping=Yn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new me(new li,new Fr({name:"PMREM.Background",side:rn,depthWrite:!1,depthTest:!1})));let b=this._backgroundBox,m=b.material,p=!1,S=t.background;S?S.isColor&&(m.color.copy(S),t.background=null,p=!0):(m.color.copy(zu),p=!0);for(let C=0;C<6;C++){let _=C%3;_===0?(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[C],r.y,r.z)):_===1?(l.up.set(0,0,c[C]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[C],r.z)):(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[C]));let M=this._cubeSize;nr(s,_*M,C>2?M:0,M,M),d.setRenderTarget(s),p&&d.render(b,l),d.render(t,l)}d.toneMapping=f,d.autoClear=u,t.background=S}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===Hi||t.mapping===ms;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Hu()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Gu());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;nr(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,po)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=0+c*1.25,f=d*u,{_lodMax:g}=this,b=this._sizeLods[n],m=3*b*(n>g-Yi?n-g+Yi:0),p=4*(this._cubeSize-b);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=g-e,nr(r,m,p,3*b,2*b),s.setRenderTarget(r),s.render(a,po),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,nr(t,m,p,3*b,2*b),s.setRenderTarget(t),s.render(a,po)}_blur(t,e,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,s,"latitudinal",r),this._halfBlur(o,t,n,n,s,"longitudinal",r)}_halfBlur(t,e,n,s,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Jt("blur direction must be either latitudinal or longitudinal!");let h=3,d=this._lodMeshes[s];d.material=c;let u=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*xs-1),b=r/g,m=isFinite(r)?1+Math.floor(h*b):xs;m>xs&&Kt(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${xs}`);let p=[],S=0;for(let w=0;w<xs;++w){let x=w/b,y=Math.exp(-x*x/2);p.push(y),w===0?S+=y:w<m&&(S+=2*y)}for(let w=0;w<p.length;w++)p[w]=p[w]/S;u.envMap.value=t.texture,u.samples.value=m,u.weights.value=p,u.latitudinal.value=o==="latitudinal",a&&(u.poleAxis.value=a);let{_lodMax:C}=this;u.dTheta.value=g,u.mipInt.value=C-n;let _=this._sizeLods[s],M=3*_*(s>C-Yi?s-C+Yi:0),T=4*(this._cubeSize-_);nr(e,M,T,3*_,2*_),l.setRenderTarget(e),l.render(d,po)}};function _0(i){let t=[],e=[],n=[],s=i,r=i-Yi+1+ku.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);t.push(a);let l=1/a;o>i-Yi?l=ku[o-i+Yi-1]:o===0&&(l=0),e.push(l);let c=1/(a-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,g=6,b=3,m=2,p=1,S=new Float32Array(b*g*f),C=new Float32Array(m*g*f),_=new Float32Array(p*g*f);for(let T=0;T<f;T++){let w=T%3*2/3-1,x=T>2?0:-1,y=[w,x,0,w+2/3,x,0,w+2/3,x+1,0,w,x,0,w+2/3,x+1,0,w,x+1,0];S.set(y,b*g*T),C.set(u,m*g*T);let R=[T,T,T,T,T,T];_.set(R,p*g*T)}let M=new We;M.setAttribute("position",new Be(S,b)),M.setAttribute("uv",new Be(C,m)),M.setAttribute("faceIndex",new Be(_,p)),n.push(new me(M,null)),s>Yi&&s--}return{lodMeshes:n,sizeLods:t,sigmas:e}}function Vu(i,t,e){let n=new Ie(i,t,e);return n.texture.mapping=ro,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function nr(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function y0(i,t,e){return new Ne({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:x0,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:wl(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Xe,depthTest:!1,depthWrite:!1})}function b0(i,t,e){let n=new Float32Array(xs),s=new F(0,1,0);return new Ne({name:"SphericalGaussianBlur",defines:{n:xs,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:wl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Xe,depthTest:!1,depthWrite:!1})}function Gu(){return new Ne({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:wl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Xe,depthTest:!1,depthWrite:!1})}function Hu(){return new Ne({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:wl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Xe,depthTest:!1,depthWrite:!1})}function wl(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var Ml=class extends Ie{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Br(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new li(5,5,5),r=new Ne({name:"CubemapFromEquirect",uniforms:gs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:rn,blending:Xe});r.uniforms.tEquirect.value=e;let o=new me(s,r),a=e.minFilter;return e.minFilter===Wi&&(e.minFilter=en),new Ca(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}};function M0(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?o(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===La||f===Da)if(t.has(u)){let g=t.get(u).texture;return a(g,u.mapping)}else{let g=u.image;if(g&&g.height>0){let b=new Ml(g.height);return b.fromEquirectangularTexture(i,u),t.set(u,b),u.addEventListener("dispose",c),a(b.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){let f=u.mapping,g=f===La||f===Da,b=f===Hi||f===ms;if(g||b){let m=e.get(u),p=m!==void 0?m.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new sr(i)),m=g?n.fromEquirectangular(u,m):n.fromCubemap(u,m),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),m.texture;if(m!==void 0)return m.texture;{let S=u.image;return g&&S&&S.height>0||b&&S&&l(S)?(n===null&&(n=new sr(i)),m=g?n.fromEquirectangular(u):n.fromCubemap(u),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),u.addEventListener("dispose",h),m.texture):null}}}return u}function a(u,f){return f===La?u.mapping=Hi:f===Da&&(u.mapping=ms),u}function l(u){let f=0,g=6;for(let b=0;b<g;b++)u[b]!==void 0&&f++;return f===g}function c(u){let f=u.target;f.removeEventListener("dispose",c);let g=t.get(f);g!==void 0&&(t.delete(f),g.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let g=e.get(f);g!==void 0&&(e.delete(f),g.dispose())}function d(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function S0(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&rs("WebGLRenderer: "+n+" extension not supported."),s}}}function w0(i,t,e,n){let s={},r=new WeakMap;function o(d){let u=d.target;u.index!==null&&t.remove(u.index);for(let g in u.attributes)t.remove(u.attributes[g]);u.removeEventListener("dispose",o),delete s[u.id];let f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,e.memory.geometries++),u}function l(d){let u=d.attributes;for(let f in u)t.update(u[f],i.ARRAY_BUFFER)}function c(d){let u=[],f=d.index,g=d.attributes.position,b=0;if(g===void 0)return;if(f!==null){let S=f.array;b=f.version;for(let C=0,_=S.length;C<_;C+=3){let M=S[C+0],T=S[C+1],w=S[C+2];u.push(M,T,T,w,w,M)}}else{let S=g.array;b=g.version;for(let C=0,_=S.length/3-1;C<_;C+=3){let M=C+0,T=C+1,w=C+2;u.push(M,T,T,w,w,M)}}let m=new(g.count>=65535?Ur:Nr)(u,1);m.version=b;let p=r.get(d);p&&t.remove(p),r.set(d,m)}function h(d){let u=r.get(d);if(u){let f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function T0(i,t,e){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*o),e.update(u,n,1)}function c(d,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,d*o,f),e.update(u,n,f))}function h(d,u,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,f);let b=0;for(let m=0;m<f;m++)b+=u[m];e.update(b,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function E0(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:Jt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function A0(i,t,e){let n=new WeakMap,s=new Te;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==d){let y=function(){w.dispose(),n.delete(a),a.removeEventListener("dispose",y)};u!==void 0&&u.texture.dispose();let f=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,b=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],S=a.morphAttributes.color||[],C=0;f===!0&&(C=1),g===!0&&(C=2),b===!0&&(C=3);let _=a.attributes.position.count*C,M=1;_>t.maxTextureSize&&(M=Math.ceil(_/t.maxTextureSize),_=t.maxTextureSize);let T=new Float32Array(_*M*4*d),w=new Dr(T,_,M,d);w.type=Un,w.needsUpdate=!0;let x=C*4;for(let R=0;R<d;R++){let P=m[R],D=p[R],z=S[R],W=_*M*4*R;for(let N=0;N<P.count;N++){let k=N*x;f===!0&&(s.fromBufferAttribute(P,N),T[W+k+0]=s.x,T[W+k+1]=s.y,T[W+k+2]=s.z,T[W+k+3]=0),g===!0&&(s.fromBufferAttribute(D,N),T[W+k+4]=s.x,T[W+k+5]=s.y,T[W+k+6]=s.z,T[W+k+7]=0),b===!0&&(s.fromBufferAttribute(z,N),T[W+k+8]=s.x,T[W+k+9]=s.y,T[W+k+10]=s.z,T[W+k+11]=z.itemSize===4?s.w:1)}}u={count:d,texture:w,size:new Yt(_,M)},n.set(a,u),a.addEventListener("dispose",y)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let f=0;for(let b=0;b<c.length;b++)f+=c[b];let g=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function C0(i,t,e,n,s){let r=new WeakMap;function o(c){let h=s.render.frame,d=c.geometry,u=t.get(c,d);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var R0={[no]:"LINEAR_TONE_MAPPING",[Dc]:"REINHARD_TONE_MAPPING",[Nc]:"CINEON_TONE_MAPPING",[ps]:"ACES_FILMIC_TONE_MAPPING",[io]:"AGX_TONE_MAPPING",[so]:"NEUTRAL_TONE_MAPPING",[Uc]:"CUSTOM_TONE_MAPPING"};function P0(i,t,e,n,s,r){let o=new Ie(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new qn(t,e):void 0}),a=new Ie(t,e,{type:qe,depthBuffer:!1,stencilBuffer:!1}),l=new We;l.setAttribute("position",new Ce([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new Ce([0,2,0,0,2,0],2));let c=new $s({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),h=new me(l,c),d=new Nn(-1,1,1,-1,0,1),u=null,f=null,g=!1,b,m=null,p=[],S=!1;this.setSize=function(C,_){o.setSize(C,_),a.setSize(C,_);for(let M=0;M<p.length;M++){let T=p[M];T.setSize&&T.setSize(C,_)}},this.setEffects=function(C){p=C,S=p.length>0&&p[0].isRenderPass===!0;let _=o.width,M=o.height;for(let T=0;T<p.length;T++){let w=p[T];w.setSize&&w.setSize(_,M)}},this.begin=function(C,_){if(g||C.toneMapping===Yn&&p.length===0)return!1;if(m=_,_!==null){let M=_.width,T=_.height;(o.width!==M||o.height!==T)&&this.setSize(M,T)}return S===!1&&C.setRenderTarget(o),b=C.toneMapping,C.toneMapping=Yn,!0},this.hasRenderPass=function(){return S},this.end=function(C,_){C.toneMapping=b,g=!0;let M=o,T=a;for(let w=0;w<p.length;w++){let x=p[w];if(x.enabled!==!1&&(x.render(C,T,M,_),x.needsSwap!==!1)){let y=M;M=T,T=y}}if(u!==C.outputColorSpace||f!==C.toneMapping){u=C.outputColorSpace,f=C.toneMapping,c.defines={},ue.getTransfer(u)===_e&&(c.defines.SRGB_TRANSFER="");let w=R0[f];w&&(c.defines[w]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=M.texture,C.setRenderTarget(m),C.render(h,d),m=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),a.dispose(),l.dispose(),c.dispose()}}var cd=new sn,ih=new qn(1,1),hd=new Dr,ud=new pa,dd=new Br,Wu=[],Xu=[],qu=new Float32Array(16),Yu=new Float32Array(9),Zu=new Float32Array(4);function rr(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Wu[s];if(r===void 0&&(r=new Float32Array(s),Wu[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function Ye(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ze(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Tl(i,t){let e=Xu[t];e===void 0&&(e=new Int32Array(t),Xu[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function I0(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function L0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ye(e,t))return;i.uniform2fv(this.addr,t),Ze(e,t)}}function D0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ye(e,t))return;i.uniform3fv(this.addr,t),Ze(e,t)}}function N0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ye(e,t))return;i.uniform4fv(this.addr,t),Ze(e,t)}}function U0(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ye(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ze(e,t)}else{if(Ye(e,n))return;Zu.set(n),i.uniformMatrix2fv(this.addr,!1,Zu),Ze(e,n)}}function F0(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ye(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ze(e,t)}else{if(Ye(e,n))return;Yu.set(n),i.uniformMatrix3fv(this.addr,!1,Yu),Ze(e,n)}}function O0(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ye(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ze(e,t)}else{if(Ye(e,n))return;qu.set(n),i.uniformMatrix4fv(this.addr,!1,qu),Ze(e,n)}}function B0(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function k0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ye(e,t))return;i.uniform2iv(this.addr,t),Ze(e,t)}}function z0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ye(e,t))return;i.uniform3iv(this.addr,t),Ze(e,t)}}function V0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ye(e,t))return;i.uniform4iv(this.addr,t),Ze(e,t)}}function G0(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function H0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ye(e,t))return;i.uniform2uiv(this.addr,t),Ze(e,t)}}function W0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ye(e,t))return;i.uniform3uiv(this.addr,t),Ze(e,t)}}function X0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ye(e,t))return;i.uniform4uiv(this.addr,t),Ze(e,t)}}function q0(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ih.compareFunction=e.isReversedDepthBuffer()?_l:vl,r=ih):r=cd,e.setTexture2D(t||r,s)}function Y0(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||ud,s)}function Z0(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||dd,s)}function $0(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||hd,s)}function K0(i){switch(i){case 5126:return I0;case 35664:return L0;case 35665:return D0;case 35666:return N0;case 35674:return U0;case 35675:return F0;case 35676:return O0;case 5124:case 35670:return B0;case 35667:case 35671:return k0;case 35668:case 35672:return z0;case 35669:case 35673:return V0;case 5125:return G0;case 36294:return H0;case 36295:return W0;case 36296:return X0;case 35678:case 36198:case 36298:case 36306:case 35682:return q0;case 35679:case 36299:case 36307:return Y0;case 35680:case 36300:case 36308:case 36293:return Z0;case 36289:case 36303:case 36311:case 36292:return $0}}function J0(i,t){i.uniform1fv(this.addr,t)}function j0(i,t){let e=rr(t,this.size,2);i.uniform2fv(this.addr,e)}function Q0(i,t){let e=rr(t,this.size,3);i.uniform3fv(this.addr,e)}function tx(i,t){let e=rr(t,this.size,4);i.uniform4fv(this.addr,e)}function ex(i,t){let e=rr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function nx(i,t){let e=rr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function ix(i,t){let e=rr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function sx(i,t){i.uniform1iv(this.addr,t)}function rx(i,t){i.uniform2iv(this.addr,t)}function ox(i,t){i.uniform3iv(this.addr,t)}function ax(i,t){i.uniform4iv(this.addr,t)}function lx(i,t){i.uniform1uiv(this.addr,t)}function cx(i,t){i.uniform2uiv(this.addr,t)}function hx(i,t){i.uniform3uiv(this.addr,t)}function ux(i,t){i.uniform4uiv(this.addr,t)}function dx(i,t,e){let n=this.cache,s=t.length,r=Tl(e,s);Ye(n,r)||(i.uniform1iv(this.addr,r),Ze(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=ih:o=cd;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function fx(i,t,e){let n=this.cache,s=t.length,r=Tl(e,s);Ye(n,r)||(i.uniform1iv(this.addr,r),Ze(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||ud,r[o])}function px(i,t,e){let n=this.cache,s=t.length,r=Tl(e,s);Ye(n,r)||(i.uniform1iv(this.addr,r),Ze(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||dd,r[o])}function mx(i,t,e){let n=this.cache,s=t.length,r=Tl(e,s);Ye(n,r)||(i.uniform1iv(this.addr,r),Ze(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||hd,r[o])}function gx(i){switch(i){case 5126:return J0;case 35664:return j0;case 35665:return Q0;case 35666:return tx;case 35674:return ex;case 35675:return nx;case 35676:return ix;case 5124:case 35670:return sx;case 35667:case 35671:return rx;case 35668:case 35672:return ox;case 35669:case 35673:return ax;case 5125:return lx;case 36294:return cx;case 36295:return hx;case 36296:return ux;case 35678:case 36198:case 36298:case 36306:case 35682:return dx;case 35679:case 36299:case 36307:return fx;case 35680:case 36300:case 36308:case 36293:return px;case 36289:case 36303:case 36311:case 36292:return mx}}var sh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=K0(e.type)}},rh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=gx(e.type)}},oh=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],n)}}},eh=/(\w+)(\])?(\[|\.)?/g;function $u(i,t){i.seq.push(t),i.map[t.id]=t}function xx(i,t,e){let n=i.name,s=n.length;for(eh.lastIndex=0;;){let r=eh.exec(n),o=eh.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){$u(e,c===void 0?new sh(a,i,t):new rh(a,i,t));break}else{let d=e.map[a];d===void 0&&(d=new oh(a),$u(e,d)),e=d}}}var ir=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);xx(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&n.push(o)}return n}};function Ku(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var vx=37297,_x=0;function yx(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}var Ju=new Qt;function bx(i){ue._getMatrix(Ju,ue.workingColorSpace,i);let t=`mat3( ${Ju.elements.map(e=>e.toFixed(4))} )`;switch(ue.getTransfer(i)){case Ir:return[t,"LinearTransferOETF"];case _e:return[t,"sRGBTransferOETF"];default:return Kt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function ju(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+yx(i.getShaderSource(t),a)}else return r}function Mx(i,t){let e=bx(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var Sx={[no]:"Linear",[Dc]:"Reinhard",[Nc]:"Cineon",[ps]:"ACESFilmic",[io]:"AgX",[so]:"Neutral",[Uc]:"Custom"};function wx(i,t){let e=Sx[t];return e===void 0?(Kt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var bl=new F;function Tx(){ue.getLuminanceCoefficients(bl);let i=bl.x.toFixed(4),t=bl.y.toFixed(4),e=bl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ex(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(go).join(`
`)}function Ax(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Cx(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function go(i){return i!==""}function Qu(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function td(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Rx=/^[ \t]*#include +<([\w\d./]+)>/gm;function ah(i){return i.replace(Rx,Ix)}var Px=new Map;function Ix(i,t){let e=ae[t];if(e===void 0){let n=Px.get(t);if(n!==void 0)e=ae[n],Kt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return ah(e)}var Lx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ed(i){return i.replace(Lx,Dx)}function Dx(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function nd(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var Nx={[ds]:"SHADOWMAP_TYPE_PCF",[js]:"SHADOWMAP_TYPE_VSM"};function Ux(i){return Nx[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Fx={[Hi]:"ENVMAP_TYPE_CUBE",[ms]:"ENVMAP_TYPE_CUBE",[ro]:"ENVMAP_TYPE_CUBE_UV"};function Ox(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Fx[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var Bx={[ms]:"ENVMAP_MODE_REFRACTION"};function kx(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Bx[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var zx={[Ia]:"ENVMAP_BLENDING_MULTIPLY",[Mu]:"ENVMAP_BLENDING_MIX",[Su]:"ENVMAP_BLENDING_ADD"};function Vx(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":zx[i.combine]||"ENVMAP_BLENDING_NONE"}function Gx(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Hx(i,t,e,n){let s=i.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=Ux(e),c=Ox(e),h=kx(e),d=Vx(e),u=Gx(e),f=Ex(e),g=Ax(r),b=s.createProgram(),m,p,S=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(go).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(go).join(`
`),p.length>0&&(p+=`
`)):(m=[nd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(go).join(`
`),p=[nd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Yn?"#define TONE_MAPPING":"",e.toneMapping!==Yn?ae.tonemapping_pars_fragment:"",e.toneMapping!==Yn?wx("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",ae.colorspace_pars_fragment,Mx("linearToOutputTexel",e.outputColorSpace),Tx(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(go).join(`
`)),o=ah(o),o=Qu(o,e),o=td(o,e),a=ah(a),a=Qu(a,e),a=td(a,e),o=ed(o),a=ed(a),e.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===Hc?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Hc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let C=S+m+o,_=S+p+a,M=Ku(s,s.VERTEX_SHADER,C),T=Ku(s,s.FRAGMENT_SHADER,_);s.attachShader(b,M),s.attachShader(b,T),e.index0AttributeName!==void 0?s.bindAttribLocation(b,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(b,0,"position"),s.linkProgram(b);function w(P){if(i.debug.checkShaderErrors){let D=s.getProgramInfoLog(b)||"",z=s.getShaderInfoLog(M)||"",W=s.getShaderInfoLog(T)||"",N=D.trim(),k=z.trim(),U=W.trim(),X=!0,K=!0;if(s.getProgramParameter(b,s.LINK_STATUS)===!1)if(X=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,b,M,T);else{let lt=ju(s,M,"vertex"),at=ju(s,T,"fragment");Jt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(b,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+N+`
`+lt+`
`+at)}else N!==""?Kt("WebGLProgram: Program Info Log:",N):(k===""||U==="")&&(K=!1);K&&(P.diagnostics={runnable:X,programLog:N,vertexShader:{log:k,prefix:m},fragmentShader:{log:U,prefix:p}})}s.deleteShader(M),s.deleteShader(T),x=new ir(s,b),y=Cx(s,b)}let x;this.getUniforms=function(){return x===void 0&&w(this),x};let y;this.getAttributes=function(){return y===void 0&&w(this),y};let R=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(b,vx)),R},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(b),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=_x++,this.cacheKey=t,this.usedTimes=1,this.program=b,this.vertexShader=M,this.fragmentShader=T,this}var Wx=0,lh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new ch(t),e.set(t,n)),n}},ch=class{constructor(t){this.id=Wx++,this.code=t,this.usedTimes=0}};function Xx(i){return i===qi||i===uo||i===fo}function qx(i,t,e,n,s,r){let o=new Xs,a=new lh,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(x){return l.add(x),x===0?"uv":`uv${x}`}function b(x,y,R,P,D,z){let W=P.fog,N=D.geometry,k=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?P.environment:null,U=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,X=t.get(x.envMap||k,U),K=X&&X.mapping===ro?X.image.height:null,lt=f[x.type];x.precision!==null&&(u=n.getMaxPrecision(x.precision),u!==x.precision&&Kt("WebGLProgram.getParameters:",x.precision,"not supported, using",u,"instead."));let at=N.morphAttributes.position||N.morphAttributes.normal||N.morphAttributes.color,gt=at!==void 0?at.length:0,yt=0;N.morphAttributes.position!==void 0&&(yt=1),N.morphAttributes.normal!==void 0&&(yt=2),N.morphAttributes.color!==void 0&&(yt=3);let jt,Pt,j,ut;if(lt){let Ut=fi[lt];jt=Ut.vertexShader,Pt=Ut.fragmentShader}else{jt=x.vertexShader,Pt=x.fragmentShader;let Ut=a.getVertexShaderStage(x),xe=a.getFragmentShaderStage(x);a.update(x,Ut,xe),j=Ut.id,ut=xe.id}let ct=i.getRenderTarget(),zt=i.state.buffers.depth.getReversed(),St=D.isInstancedMesh===!0,xt=D.isBatchedMesh===!0,he=!!x.map,Xt=!!x.matcap,Wt=!!X,V=!!x.aoMap,ot=!!x.lightMap,nt=!!x.bumpMap&&x.wireframe===!1,Zt=!!x.normalMap,oe=!!x.displacementMap,st=!!x.emissiveMap,Ot=!!x.metalnessMap,It=!!x.roughnessMap,O=x.anisotropy>0,Ee=x.clearcoat>0,Rt=x.dispersion>0,A=x.iridescence>0,v=x.sheen>0,H=x.transmission>0,q=O&&!!x.anisotropyMap,et=Ee&&!!x.clearcoatMap,dt=Ee&&!!x.clearcoatNormalMap,vt=Ee&&!!x.clearcoatRoughnessMap,J=A&&!!x.iridescenceMap,rt=A&&!!x.iridescenceThicknessMap,tt=v&&!!x.sheenColorMap,kt=v&&!!x.sheenRoughnessMap,_t=!!x.specularMap,mt=!!x.specularColorMap,Bt=!!x.specularIntensityMap,Ht=H&&!!x.transmissionMap,$t=H&&!!x.thicknessMap,B=!!x.gradientMap,Mt=!!x.alphaMap,Q=x.alphaTest>0,Tt=!!x.alphaHash,Et=!!x.extensions,ht=Yn;x.toneMapped&&(ct===null||ct.isXRRenderTarget===!0)&&(ht=i.toneMapping);let ft={shaderID:lt,shaderType:x.type,shaderName:x.name,vertexShader:jt,fragmentShader:Pt,defines:x.defines,customVertexShaderID:j,customFragmentShaderID:ut,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:u,batching:xt,batchingColor:xt&&D._colorsTexture!==null,instancing:St,instancingColor:St&&D.instanceColor!==null,instancingMorph:St&&D.morphTexture!==null,outputColorSpace:ct===null?i.outputColorSpace:ct.isXRRenderTarget===!0?ct.texture.colorSpace:ue.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:he,matcap:Xt,envMap:Wt,envMapMode:Wt&&X.mapping,envMapCubeUVHeight:K,aoMap:V,lightMap:ot,bumpMap:nt,normalMap:Zt,displacementMap:oe,emissiveMap:st,normalMapObjectSpace:Zt&&x.normalMapType===Eu,normalMapTangentSpace:Zt&&x.normalMapType===tr,packedNormalMap:Zt&&x.normalMapType===tr&&Xx(x.normalMap.format),metalnessMap:Ot,roughnessMap:It,anisotropy:O,anisotropyMap:q,clearcoat:Ee,clearcoatMap:et,clearcoatNormalMap:dt,clearcoatRoughnessMap:vt,dispersion:Rt,iridescence:A,iridescenceMap:J,iridescenceThicknessMap:rt,sheen:v,sheenColorMap:tt,sheenRoughnessMap:kt,specularMap:_t,specularColorMap:mt,specularIntensityMap:Bt,transmission:H,transmissionMap:Ht,thicknessMap:$t,gradientMap:B,opaque:x.transparent===!1&&x.blending===os&&x.alphaToCoverage===!1,alphaMap:Mt,alphaTest:Q,alphaHash:Tt,combine:x.combine,mapUv:he&&g(x.map.channel),aoMapUv:V&&g(x.aoMap.channel),lightMapUv:ot&&g(x.lightMap.channel),bumpMapUv:nt&&g(x.bumpMap.channel),normalMapUv:Zt&&g(x.normalMap.channel),displacementMapUv:oe&&g(x.displacementMap.channel),emissiveMapUv:st&&g(x.emissiveMap.channel),metalnessMapUv:Ot&&g(x.metalnessMap.channel),roughnessMapUv:It&&g(x.roughnessMap.channel),anisotropyMapUv:q&&g(x.anisotropyMap.channel),clearcoatMapUv:et&&g(x.clearcoatMap.channel),clearcoatNormalMapUv:dt&&g(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:vt&&g(x.clearcoatRoughnessMap.channel),iridescenceMapUv:J&&g(x.iridescenceMap.channel),iridescenceThicknessMapUv:rt&&g(x.iridescenceThicknessMap.channel),sheenColorMapUv:tt&&g(x.sheenColorMap.channel),sheenRoughnessMapUv:kt&&g(x.sheenRoughnessMap.channel),specularMapUv:_t&&g(x.specularMap.channel),specularColorMapUv:mt&&g(x.specularColorMap.channel),specularIntensityMapUv:Bt&&g(x.specularIntensityMap.channel),transmissionMapUv:Ht&&g(x.transmissionMap.channel),thicknessMapUv:$t&&g(x.thicknessMap.channel),alphaMapUv:Mt&&g(x.alphaMap.channel),vertexTangents:!!N.attributes.tangent&&(Zt||O),vertexNormals:!!N.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!N.attributes.color&&N.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!N.attributes.uv&&(he||Mt),fog:!!W,useFog:x.fog===!0,fogExp2:!!W&&W.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||N.attributes.normal===void 0&&Zt===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:zt,skinning:D.isSkinnedMesh===!0,hasPositionAttribute:N.attributes.position!==void 0,morphTargets:N.morphAttributes.position!==void 0,morphNormals:N.morphAttributes.normal!==void 0,morphColors:N.morphAttributes.color!==void 0,morphTargetsCount:gt,morphTextureStride:yt,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numLightProbeGrids:z.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:ht,decodeVideoTexture:he&&x.map.isVideoTexture===!0&&ue.getTransfer(x.map.colorSpace)===_e,decodeVideoTextureEmissive:st&&x.emissiveMap.isVideoTexture===!0&&ue.getTransfer(x.emissiveMap.colorSpace)===_e,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===ci,flipSided:x.side===rn,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:Et&&x.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Et&&x.extensions.multiDraw===!0||xt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return ft.vertexUv1s=l.has(1),ft.vertexUv2s=l.has(2),ft.vertexUv3s=l.has(3),l.clear(),ft}function m(x){let y=[];if(x.shaderID?y.push(x.shaderID):(y.push(x.customVertexShaderID),y.push(x.customFragmentShaderID)),x.defines!==void 0)for(let R in x.defines)y.push(R),y.push(x.defines[R]);return x.isRawShaderMaterial===!1&&(p(y,x),S(y,x),y.push(i.outputColorSpace)),y.push(x.customProgramCacheKey),y.join()}function p(x,y){x.push(y.precision),x.push(y.outputColorSpace),x.push(y.envMapMode),x.push(y.envMapCubeUVHeight),x.push(y.mapUv),x.push(y.alphaMapUv),x.push(y.lightMapUv),x.push(y.aoMapUv),x.push(y.bumpMapUv),x.push(y.normalMapUv),x.push(y.displacementMapUv),x.push(y.emissiveMapUv),x.push(y.metalnessMapUv),x.push(y.roughnessMapUv),x.push(y.anisotropyMapUv),x.push(y.clearcoatMapUv),x.push(y.clearcoatNormalMapUv),x.push(y.clearcoatRoughnessMapUv),x.push(y.iridescenceMapUv),x.push(y.iridescenceThicknessMapUv),x.push(y.sheenColorMapUv),x.push(y.sheenRoughnessMapUv),x.push(y.specularMapUv),x.push(y.specularColorMapUv),x.push(y.specularIntensityMapUv),x.push(y.transmissionMapUv),x.push(y.thicknessMapUv),x.push(y.combine),x.push(y.fogExp2),x.push(y.sizeAttenuation),x.push(y.morphTargetsCount),x.push(y.morphAttributeCount),x.push(y.numDirLights),x.push(y.numPointLights),x.push(y.numSpotLights),x.push(y.numSpotLightMaps),x.push(y.numHemiLights),x.push(y.numRectAreaLights),x.push(y.numDirLightShadows),x.push(y.numPointLightShadows),x.push(y.numSpotLightShadows),x.push(y.numSpotLightShadowsWithMaps),x.push(y.numLightProbes),x.push(y.shadowMapType),x.push(y.toneMapping),x.push(y.numClippingPlanes),x.push(y.numClipIntersection),x.push(y.depthPacking)}function S(x,y){o.disableAll(),y.instancing&&o.enable(0),y.instancingColor&&o.enable(1),y.instancingMorph&&o.enable(2),y.matcap&&o.enable(3),y.envMap&&o.enable(4),y.normalMapObjectSpace&&o.enable(5),y.normalMapTangentSpace&&o.enable(6),y.clearcoat&&o.enable(7),y.iridescence&&o.enable(8),y.alphaTest&&o.enable(9),y.vertexColors&&o.enable(10),y.vertexAlphas&&o.enable(11),y.vertexUv1s&&o.enable(12),y.vertexUv2s&&o.enable(13),y.vertexUv3s&&o.enable(14),y.vertexTangents&&o.enable(15),y.anisotropy&&o.enable(16),y.alphaHash&&o.enable(17),y.batching&&o.enable(18),y.dispersion&&o.enable(19),y.batchingColor&&o.enable(20),y.gradientMap&&o.enable(21),y.packedNormalMap&&o.enable(22),y.vertexNormals&&o.enable(23),x.push(o.mask),o.disableAll(),y.fog&&o.enable(0),y.useFog&&o.enable(1),y.flatShading&&o.enable(2),y.logarithmicDepthBuffer&&o.enable(3),y.reversedDepthBuffer&&o.enable(4),y.skinning&&o.enable(5),y.morphTargets&&o.enable(6),y.morphNormals&&o.enable(7),y.morphColors&&o.enable(8),y.premultipliedAlpha&&o.enable(9),y.shadowMapEnabled&&o.enable(10),y.doubleSided&&o.enable(11),y.flipSided&&o.enable(12),y.useDepthPacking&&o.enable(13),y.dithering&&o.enable(14),y.transmission&&o.enable(15),y.sheen&&o.enable(16),y.opaque&&o.enable(17),y.pointsUvs&&o.enable(18),y.decodeVideoTexture&&o.enable(19),y.decodeVideoTextureEmissive&&o.enable(20),y.alphaToCoverage&&o.enable(21),y.numLightProbeGrids>0&&o.enable(22),y.hasPositionAttribute&&o.enable(23),x.push(o.mask)}function C(x){let y=f[x.type],R;if(y){let P=fi[y];R=ui.clone(P.uniforms)}else R=x.uniforms;return R}function _(x,y){let R=h.get(y);return R!==void 0?++R.usedTimes:(R=new Hx(i,y,x,s),c.push(R),h.set(y,R)),R}function M(x){if(--x.usedTimes===0){let y=c.indexOf(x);c[y]=c[c.length-1],c.pop(),h.delete(x.cacheKey),x.destroy()}}function T(x){a.remove(x)}function w(){a.dispose()}return{getParameters:b,getProgramCacheKey:m,getUniforms:C,acquireProgram:_,releaseProgram:M,releaseShaderCache:T,programs:c,dispose:w}}function Yx(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Zx(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function id(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function sd(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function a(u,f,g,b,m,p){let S=i[t];return S===void 0?(S={id:u.id,object:u,geometry:f,material:g,materialVariant:o(u),groupOrder:b,renderOrder:u.renderOrder,z:m,group:p},i[t]=S):(S.id=u.id,S.object=u,S.geometry=f,S.material=g,S.materialVariant=o(u),S.groupOrder=b,S.renderOrder=u.renderOrder,S.z=m,S.group=p),t++,S}function l(u,f,g,b,m,p){let S=a(u,f,g,b,m,p);g.transmission>0?n.push(S):g.transparent===!0?s.push(S):e.push(S)}function c(u,f,g,b,m,p){let S=a(u,f,g,b,m,p);g.transmission>0?n.unshift(S):g.transparent===!0?s.unshift(S):e.unshift(S)}function h(u,f,g){e.length>1&&e.sort(u||Zx),n.length>1&&n.sort(f||id),s.length>1&&s.sort(f||id),g&&(e.reverse(),n.reverse(),s.reverse())}function d(){for(let u=t,f=i.length;u<f;u++){let g=i[u];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function $x(){let i=new WeakMap;function t(n,s){let r=i.get(n),o;return r===void 0?(o=new sd,i.set(n,[o])):s>=r.length?(o=new sd,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function Kx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new F,color:new Dt};break;case"SpotLight":e={position:new F,direction:new F,color:new Dt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new F,color:new Dt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new F,skyColor:new Dt,groundColor:new Dt};break;case"RectAreaLight":e={color:new Dt,position:new F,halfWidth:new F,halfHeight:new F};break}return i[t.id]=e,e}}}function Jx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Yt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Yt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Yt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var jx=0;function Qx(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function tv(i){let t=new Kx,e=Jx(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new F);let s=new F,r=new ne,o=new ne;function a(c){let h=0,d=0,u=0;for(let y=0;y<9;y++)n.probe[y].set(0,0,0);let f=0,g=0,b=0,m=0,p=0,S=0,C=0,_=0,M=0,T=0,w=0;c.sort(Qx);for(let y=0,R=c.length;y<R;y++){let P=c[y],D=P.color,z=P.intensity,W=P.distance,N=null;if(P.shadow&&P.shadow.map&&(P.shadow.map.texture.format===qi?N=P.shadow.map.texture:N=P.shadow.map.depthTexture||P.shadow.map.texture),P.isAmbientLight)h+=D.r*z,d+=D.g*z,u+=D.b*z;else if(P.isLightProbe){for(let k=0;k<9;k++)n.probe[k].addScaledVector(P.sh.coefficients[k],z);w++}else if(P.isDirectionalLight){let k=t.get(P);if(k.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let U=P.shadow,X=e.get(P);X.shadowIntensity=U.intensity,X.shadowBias=U.bias,X.shadowNormalBias=U.normalBias,X.shadowRadius=U.radius,X.shadowMapSize=U.mapSize,n.directionalShadow[f]=X,n.directionalShadowMap[f]=N,n.directionalShadowMatrix[f]=P.shadow.matrix,S++}n.directional[f]=k,f++}else if(P.isSpotLight){let k=t.get(P);k.position.setFromMatrixPosition(P.matrixWorld),k.color.copy(D).multiplyScalar(z),k.distance=W,k.coneCos=Math.cos(P.angle),k.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),k.decay=P.decay,n.spot[b]=k;let U=P.shadow;if(P.map&&(n.spotLightMap[M]=P.map,M++,U.updateMatrices(P),P.castShadow&&T++),n.spotLightMatrix[b]=U.matrix,P.castShadow){let X=e.get(P);X.shadowIntensity=U.intensity,X.shadowBias=U.bias,X.shadowNormalBias=U.normalBias,X.shadowRadius=U.radius,X.shadowMapSize=U.mapSize,n.spotShadow[b]=X,n.spotShadowMap[b]=N,_++}b++}else if(P.isRectAreaLight){let k=t.get(P);k.color.copy(D).multiplyScalar(z),k.halfWidth.set(P.width*.5,0,0),k.halfHeight.set(0,P.height*.5,0),n.rectArea[m]=k,m++}else if(P.isPointLight){let k=t.get(P);if(k.color.copy(P.color).multiplyScalar(P.intensity),k.distance=P.distance,k.decay=P.decay,P.castShadow){let U=P.shadow,X=e.get(P);X.shadowIntensity=U.intensity,X.shadowBias=U.bias,X.shadowNormalBias=U.normalBias,X.shadowRadius=U.radius,X.shadowMapSize=U.mapSize,X.shadowCameraNear=U.camera.near,X.shadowCameraFar=U.camera.far,n.pointShadow[g]=X,n.pointShadowMap[g]=N,n.pointShadowMatrix[g]=P.shadow.matrix,C++}n.point[g]=k,g++}else if(P.isHemisphereLight){let k=t.get(P);k.skyColor.copy(P.color).multiplyScalar(z),k.groundColor.copy(P.groundColor).multiplyScalar(z),n.hemi[p]=k,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ct.LTC_FLOAT_1,n.rectAreaLTC2=Ct.LTC_FLOAT_2):(n.rectAreaLTC1=Ct.LTC_HALF_1,n.rectAreaLTC2=Ct.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let x=n.hash;(x.directionalLength!==f||x.pointLength!==g||x.spotLength!==b||x.rectAreaLength!==m||x.hemiLength!==p||x.numDirectionalShadows!==S||x.numPointShadows!==C||x.numSpotShadows!==_||x.numSpotMaps!==M||x.numLightProbes!==w)&&(n.directional.length=f,n.spot.length=b,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=C,n.pointShadowMap.length=C,n.spotShadow.length=_,n.spotShadowMap.length=_,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=C,n.spotLightMatrix.length=_+M-T,n.spotLightMap.length=M,n.numSpotLightShadowsWithMaps=T,n.numLightProbes=w,x.directionalLength=f,x.pointLength=g,x.spotLength=b,x.rectAreaLength=m,x.hemiLength=p,x.numDirectionalShadows=S,x.numPointShadows=C,x.numSpotShadows=_,x.numSpotMaps=M,x.numLightProbes=w,n.version=jx++)}function l(c,h){let d=0,u=0,f=0,g=0,b=0,m=h.matrixWorldInverse;for(let p=0,S=c.length;p<S;p++){let C=c[p];if(C.isDirectionalLight){let _=n.directional[d];_.direction.setFromMatrixPosition(C.matrixWorld),s.setFromMatrixPosition(C.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(m),d++}else if(C.isSpotLight){let _=n.spot[f];_.position.setFromMatrixPosition(C.matrixWorld),_.position.applyMatrix4(m),_.direction.setFromMatrixPosition(C.matrixWorld),s.setFromMatrixPosition(C.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(m),f++}else if(C.isRectAreaLight){let _=n.rectArea[g];_.position.setFromMatrixPosition(C.matrixWorld),_.position.applyMatrix4(m),o.identity(),r.copy(C.matrixWorld),r.premultiply(m),o.extractRotation(r),_.halfWidth.set(C.width*.5,0,0),_.halfHeight.set(0,C.height*.5,0),_.halfWidth.applyMatrix4(o),_.halfHeight.applyMatrix4(o),g++}else if(C.isPointLight){let _=n.point[u];_.position.setFromMatrixPosition(C.matrixWorld),_.position.applyMatrix4(m),u++}else if(C.isHemisphereLight){let _=n.hemi[b];_.direction.setFromMatrixPosition(C.matrixWorld),_.direction.transformDirection(m),b++}}}return{setup:a,setupView:l,state:n}}function rd(i){let t=new tv(i),e=[],n=[],s=[];function r(u){d.camera=u,e.length=0,n.length=0,s.length=0}function o(u){e.push(u)}function a(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let d={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function ev(i){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new rd(i),t.set(s,[a])):r>=o.length?(a=new rd(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}var nv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,iv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,sv=[new F(1,0,0),new F(-1,0,0),new F(0,1,0),new F(0,-1,0),new F(0,0,1),new F(0,0,-1)],rv=[new F(0,-1,0),new F(0,-1,0),new F(0,0,1),new F(0,0,-1),new F(0,-1,0),new F(0,-1,0)],od=new ne,mo=new F,nh=new F;function ov(i,t,e){let n=new Zs,s=new Yt,r=new Yt,o=new Te,a=new ga,l=new xa,c={},h=e.maxTextureSize,d={[Si]:rn,[rn]:Si,[ci]:ci},u=new Ne({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Yt},radius:{value:4}},vertexShader:nv,fragmentShader:iv}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let g=new We;g.setAttribute("position",new Be(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let b=new me(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ds;let p=this.type;this.render=function(T,w,x){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;this.type===au&&(Kt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=ds);let y=i.getRenderTarget(),R=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),D=i.state;D.setBlending(Xe),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);let z=p!==this.type;z&&w.traverse(function(W){W.material&&(Array.isArray(W.material)?W.material.forEach(N=>N.needsUpdate=!0):W.material.needsUpdate=!0)});for(let W=0,N=T.length;W<N;W++){let k=T[W],U=k.shadow;if(U===void 0){Kt("WebGLShadowMap:",k,"has no shadow.");continue}if(U.autoUpdate===!1&&U.needsUpdate===!1)continue;s.copy(U.mapSize);let X=U.getFrameExtents();s.multiply(X),r.copy(U.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/X.x),s.x=r.x*X.x,U.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/X.y),s.y=r.y*X.y,U.mapSize.y=r.y));let K=i.state.buffers.depth.getReversed();if(U.camera._reversedDepth=K,U.map===null||z===!0){if(U.map!==null&&(U.map.depthTexture!==null&&(U.map.depthTexture.dispose(),U.map.depthTexture=null),U.map.dispose()),this.type===js){if(k.isPointLight){Kt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}U.map=new Ie(s.x,s.y,{format:qi,type:qe,minFilter:en,magFilter:en,generateMipmaps:!1}),U.map.texture.name=k.name+".shadowMap",U.map.depthTexture=new qn(s.x,s.y,Un),U.map.depthTexture.name=k.name+".shadowMapDepth",U.map.depthTexture.format=oi,U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=De,U.map.depthTexture.magFilter=De}else k.isPointLight?(U.map=new Ml(s.x),U.map.depthTexture=new ma(s.x,Zn)):(U.map=new Ie(s.x,s.y),U.map.depthTexture=new qn(s.x,s.y,Zn)),U.map.depthTexture.name=k.name+".shadowMap",U.map.depthTexture.format=oi,this.type===ds?(U.map.depthTexture.compareFunction=K?_l:vl,U.map.depthTexture.minFilter=en,U.map.depthTexture.magFilter=en):(U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=De,U.map.depthTexture.magFilter=De);U.camera.updateProjectionMatrix()}let lt=U.map.isWebGLCubeRenderTarget?6:1;for(let at=0;at<lt;at++){if(U.map.isWebGLCubeRenderTarget)i.setRenderTarget(U.map,at),i.clear();else{at===0&&(i.setRenderTarget(U.map),i.clear());let gt=U.getViewport(at);o.set(r.x*gt.x,r.y*gt.y,r.x*gt.z,r.y*gt.w),D.viewport(o)}if(k.isPointLight){let gt=U.camera,yt=U.matrix,jt=k.distance||gt.far;jt!==gt.far&&(gt.far=jt,gt.updateProjectionMatrix()),mo.setFromMatrixPosition(k.matrixWorld),gt.position.copy(mo),nh.copy(gt.position),nh.add(sv[at]),gt.up.copy(rv[at]),gt.lookAt(nh),gt.updateMatrixWorld(),yt.makeTranslation(-mo.x,-mo.y,-mo.z),od.multiplyMatrices(gt.projectionMatrix,gt.matrixWorldInverse),U._frustum.setFromProjectionMatrix(od,gt.coordinateSystem,gt.reversedDepth)}else U.updateMatrices(k);n=U.getFrustum(),_(w,x,U.camera,k,this.type)}U.isPointLightShadow!==!0&&this.type===js&&S(U,x),U.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(y,R,P)};function S(T,w){let x=t.update(b);u.defines.VSM_SAMPLES!==T.blurSamples&&(u.defines.VSM_SAMPLES=T.blurSamples,f.defines.VSM_SAMPLES=T.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new Ie(s.x,s.y,{format:qi,type:qe})),u.uniforms.shadow_pass.value=T.map.depthTexture,u.uniforms.resolution.value=T.mapSize,u.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(w,null,x,u,b,null),f.uniforms.shadow_pass.value=T.mapPass.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(w,null,x,f,b,null)}function C(T,w,x,y){let R=null,P=x.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(P!==void 0)R=P;else if(R=x.isPointLight===!0?l:a,i.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){let D=R.uuid,z=w.uuid,W=c[D];W===void 0&&(W={},c[D]=W);let N=W[z];N===void 0&&(N=R.clone(),W[z]=N,w.addEventListener("dispose",M)),R=N}if(R.visible=w.visible,R.wireframe=w.wireframe,y===js?R.side=w.shadowSide!==null?w.shadowSide:w.side:R.side=w.shadowSide!==null?w.shadowSide:d[w.side],R.alphaMap=w.alphaMap,R.alphaTest=w.alphaToCoverage===!0?.5:w.alphaTest,R.map=w.map,R.clipShadows=w.clipShadows,R.clippingPlanes=w.clippingPlanes,R.clipIntersection=w.clipIntersection,R.displacementMap=w.displacementMap,R.displacementScale=w.displacementScale,R.displacementBias=w.displacementBias,R.wireframeLinewidth=w.wireframeLinewidth,R.linewidth=w.linewidth,x.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let D=i.properties.get(R);D.light=x}return R}function _(T,w,x,y,R){if(T.visible===!1)return;if(T.layers.test(w.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&R===js)&&(!T.frustumCulled||n.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,T.matrixWorld);let z=t.update(T),W=T.material;if(Array.isArray(W)){let N=z.groups;for(let k=0,U=N.length;k<U;k++){let X=N[k],K=W[X.materialIndex];if(K&&K.visible){let lt=C(T,K,y,R);T.onBeforeShadow(i,T,w,x,z,lt,X),i.renderBufferDirect(x,null,z,lt,T,X),T.onAfterShadow(i,T,w,x,z,lt,X)}}}else if(W.visible){let N=C(T,W,y,R);T.onBeforeShadow(i,T,w,x,z,N,null),i.renderBufferDirect(x,null,z,N,T,null),T.onAfterShadow(i,T,w,x,z,N,null)}}let D=T.children;for(let z=0,W=D.length;z<W;z++)_(D[z],w,x,y,R)}function M(T){T.target.removeEventListener("dispose",M);for(let x in c){let y=c[x],R=T.target.uuid;R in y&&(y[R].dispose(),delete y[R])}}}function av(i,t){function e(){let B=!1,Mt=new Te,Q=null,Tt=new Te(0,0,0,0);return{setMask:function(Et){Q!==Et&&!B&&(i.colorMask(Et,Et,Et,Et),Q=Et)},setLocked:function(Et){B=Et},setClear:function(Et,ht,ft,Ut,xe){xe===!0&&(Et*=Ut,ht*=Ut,ft*=Ut),Mt.set(Et,ht,ft,Ut),Tt.equals(Mt)===!1&&(i.clearColor(Et,ht,ft,Ut),Tt.copy(Mt))},reset:function(){B=!1,Q=null,Tt.set(-1,0,0,0)}}}function n(){let B=!1,Mt=!1,Q=null,Tt=null,Et=null;return{setReversed:function(ht){if(Mt!==ht){let ft=t.get("EXT_clip_control");ht?ft.clipControlEXT(ft.LOWER_LEFT_EXT,ft.ZERO_TO_ONE_EXT):ft.clipControlEXT(ft.LOWER_LEFT_EXT,ft.NEGATIVE_ONE_TO_ONE_EXT),Mt=ht;let Ut=Et;Et=null,this.setClear(Ut)}},getReversed:function(){return Mt},setTest:function(ht){ht?ct(i.DEPTH_TEST):zt(i.DEPTH_TEST)},setMask:function(ht){Q!==ht&&!B&&(i.depthMask(ht),Q=ht)},setFunc:function(ht){if(Mt&&(ht=Fu[ht]),Tt!==ht){switch(ht){case ia:i.depthFunc(i.NEVER);break;case sa:i.depthFunc(i.ALWAYS);break;case ra:i.depthFunc(i.LESS);break;case as:i.depthFunc(i.LEQUAL);break;case oa:i.depthFunc(i.EQUAL);break;case aa:i.depthFunc(i.GEQUAL);break;case la:i.depthFunc(i.GREATER);break;case ca:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Tt=ht}},setLocked:function(ht){B=ht},setClear:function(ht){Et!==ht&&(Et=ht,Mt&&(ht=1-ht),i.clearDepth(ht))},reset:function(){B=!1,Q=null,Tt=null,Et=null,Mt=!1}}}function s(){let B=!1,Mt=null,Q=null,Tt=null,Et=null,ht=null,ft=null,Ut=null,xe=null;return{setTest:function(ie){B||(ie?ct(i.STENCIL_TEST):zt(i.STENCIL_TEST))},setMask:function(ie){Mt!==ie&&!B&&(i.stencilMask(ie),Mt=ie)},setFunc:function(ie,xn,fe){(Q!==ie||Tt!==xn||Et!==fe)&&(i.stencilFunc(ie,xn,fe),Q=ie,Tt=xn,Et=fe)},setOp:function(ie,xn,fe){(ht!==ie||ft!==xn||Ut!==fe)&&(i.stencilOp(ie,xn,fe),ht=ie,ft=xn,Ut=fe)},setLocked:function(ie){B=ie},setClear:function(ie){xe!==ie&&(i.clearStencil(ie),xe=ie)},reset:function(){B=!1,Mt=null,Q=null,Tt=null,Et=null,ht=null,ft=null,Ut=null,xe=null}}}let r=new e,o=new n,a=new s,l=new WeakMap,c=new WeakMap,h={},d={},u={},f=new WeakMap,g=[],b=null,m=!1,p=null,S=null,C=null,_=null,M=null,T=null,w=null,x=new Dt(0,0,0),y=0,R=!1,P=null,D=null,z=null,W=null,N=null,k=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),U=!1,X=0,K=i.getParameter(i.VERSION);K.indexOf("WebGL")!==-1?(X=parseFloat(/^WebGL (\d)/.exec(K)[1]),U=X>=1):K.indexOf("OpenGL ES")!==-1&&(X=parseFloat(/^OpenGL ES (\d)/.exec(K)[1]),U=X>=2);let lt=null,at={},gt=i.getParameter(i.SCISSOR_BOX),yt=i.getParameter(i.VIEWPORT),jt=new Te().fromArray(gt),Pt=new Te().fromArray(yt);function j(B,Mt,Q,Tt){let Et=new Uint8Array(4),ht=i.createTexture();i.bindTexture(B,ht),i.texParameteri(B,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(B,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ft=0;ft<Q;ft++)B===i.TEXTURE_3D||B===i.TEXTURE_2D_ARRAY?i.texImage3D(Mt,0,i.RGBA,1,1,Tt,0,i.RGBA,i.UNSIGNED_BYTE,Et):i.texImage2D(Mt+ft,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Et);return ht}let ut={};ut[i.TEXTURE_2D]=j(i.TEXTURE_2D,i.TEXTURE_2D,1),ut[i.TEXTURE_CUBE_MAP]=j(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ut[i.TEXTURE_2D_ARRAY]=j(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ut[i.TEXTURE_3D]=j(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ct(i.DEPTH_TEST),o.setFunc(as),nt(!1),Zt(Rc),ct(i.CULL_FACE),V(Xe);function ct(B){h[B]!==!0&&(i.enable(B),h[B]=!0)}function zt(B){h[B]!==!1&&(i.disable(B),h[B]=!1)}function St(B,Mt){return u[B]!==Mt?(i.bindFramebuffer(B,Mt),u[B]=Mt,B===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=Mt),B===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=Mt),!0):!1}function xt(B,Mt){let Q=g,Tt=!1;if(B){Q=f.get(Mt),Q===void 0&&(Q=[],f.set(Mt,Q));let Et=B.textures;if(Q.length!==Et.length||Q[0]!==i.COLOR_ATTACHMENT0){for(let ht=0,ft=Et.length;ht<ft;ht++)Q[ht]=i.COLOR_ATTACHMENT0+ht;Q.length=Et.length,Tt=!0}}else Q[0]!==i.BACK&&(Q[0]=i.BACK,Tt=!0);Tt&&i.drawBuffers(Q)}function he(B){return b!==B?(i.useProgram(B),b=B,!0):!1}let Xt={[En]:i.FUNC_ADD,[lu]:i.FUNC_SUBTRACT,[cu]:i.FUNC_REVERSE_SUBTRACT};Xt[hu]=i.MIN,Xt[uu]=i.MAX;let Wt={[fs]:i.ZERO,[du]:i.ONE,[fu]:i.SRC_COLOR,[ea]:i.SRC_ALPHA,[xu]:i.SRC_ALPHA_SATURATE,[eo]:i.DST_COLOR,[to]:i.DST_ALPHA,[pu]:i.ONE_MINUS_SRC_COLOR,[na]:i.ONE_MINUS_SRC_ALPHA,[gu]:i.ONE_MINUS_DST_COLOR,[mu]:i.ONE_MINUS_DST_ALPHA,[vu]:i.CONSTANT_COLOR,[_u]:i.ONE_MINUS_CONSTANT_COLOR,[yu]:i.CONSTANT_ALPHA,[bu]:i.ONE_MINUS_CONSTANT_ALPHA};function V(B,Mt,Q,Tt,Et,ht,ft,Ut,xe,ie){if(B===Xe){m===!0&&(zt(i.BLEND),m=!1);return}if(m===!1&&(ct(i.BLEND),m=!0),B!==Pa){if(B!==p||ie!==R){if((S!==En||M!==En)&&(i.blendEquation(i.FUNC_ADD),S=En,M=En),ie)switch(B){case os:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Pc:i.blendFunc(i.ONE,i.ONE);break;case Ic:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Lc:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Jt("WebGLState: Invalid blending: ",B);break}else switch(B){case os:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Pc:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Ic:Jt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Lc:Jt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Jt("WebGLState: Invalid blending: ",B);break}C=null,_=null,T=null,w=null,x.set(0,0,0),y=0,p=B,R=ie}return}Et=Et||Mt,ht=ht||Q,ft=ft||Tt,(Mt!==S||Et!==M)&&(i.blendEquationSeparate(Xt[Mt],Xt[Et]),S=Mt,M=Et),(Q!==C||Tt!==_||ht!==T||ft!==w)&&(i.blendFuncSeparate(Wt[Q],Wt[Tt],Wt[ht],Wt[ft]),C=Q,_=Tt,T=ht,w=ft),(Ut.equals(x)===!1||xe!==y)&&(i.blendColor(Ut.r,Ut.g,Ut.b,xe),x.copy(Ut),y=xe),p=B,R=!1}function ot(B,Mt){B.side===ci?zt(i.CULL_FACE):ct(i.CULL_FACE);let Q=B.side===rn;Mt&&(Q=!Q),nt(Q),B.blending===os&&B.transparent===!1?V(Xe):V(B.blending,B.blendEquation,B.blendSrc,B.blendDst,B.blendEquationAlpha,B.blendSrcAlpha,B.blendDstAlpha,B.blendColor,B.blendAlpha,B.premultipliedAlpha),o.setFunc(B.depthFunc),o.setTest(B.depthTest),o.setMask(B.depthWrite),r.setMask(B.colorWrite);let Tt=B.stencilWrite;a.setTest(Tt),Tt&&(a.setMask(B.stencilWriteMask),a.setFunc(B.stencilFunc,B.stencilRef,B.stencilFuncMask),a.setOp(B.stencilFail,B.stencilZFail,B.stencilZPass)),st(B.polygonOffset,B.polygonOffsetFactor,B.polygonOffsetUnits),B.alphaToCoverage===!0?ct(i.SAMPLE_ALPHA_TO_COVERAGE):zt(i.SAMPLE_ALPHA_TO_COVERAGE)}function nt(B){P!==B&&(B?i.frontFace(i.CW):i.frontFace(i.CCW),P=B)}function Zt(B){B!==ru?(ct(i.CULL_FACE),B!==D&&(B===Rc?i.cullFace(i.BACK):B===ou?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):zt(i.CULL_FACE),D=B}function oe(B){B!==z&&(U&&i.lineWidth(B),z=B)}function st(B,Mt,Q){B?(ct(i.POLYGON_OFFSET_FILL),(W!==Mt||N!==Q)&&(W=Mt,N=Q,o.getReversed()&&(Mt=-Mt),i.polygonOffset(Mt,Q))):zt(i.POLYGON_OFFSET_FILL)}function Ot(B){B?ct(i.SCISSOR_TEST):zt(i.SCISSOR_TEST)}function It(B){B===void 0&&(B=i.TEXTURE0+k-1),lt!==B&&(i.activeTexture(B),lt=B)}function O(B,Mt,Q){Q===void 0&&(lt===null?Q=i.TEXTURE0+k-1:Q=lt);let Tt=at[Q];Tt===void 0&&(Tt={type:void 0,texture:void 0},at[Q]=Tt),(Tt.type!==B||Tt.texture!==Mt)&&(lt!==Q&&(i.activeTexture(Q),lt=Q),i.bindTexture(B,Mt||ut[B]),Tt.type=B,Tt.texture=Mt)}function Ee(){let B=at[lt];B!==void 0&&B.type!==void 0&&(i.bindTexture(B.type,null),B.type=void 0,B.texture=void 0)}function Rt(){try{i.compressedTexImage2D(...arguments)}catch(B){Jt("WebGLState:",B)}}function A(){try{i.compressedTexImage3D(...arguments)}catch(B){Jt("WebGLState:",B)}}function v(){try{i.texSubImage2D(...arguments)}catch(B){Jt("WebGLState:",B)}}function H(){try{i.texSubImage3D(...arguments)}catch(B){Jt("WebGLState:",B)}}function q(){try{i.compressedTexSubImage2D(...arguments)}catch(B){Jt("WebGLState:",B)}}function et(){try{i.compressedTexSubImage3D(...arguments)}catch(B){Jt("WebGLState:",B)}}function dt(){try{i.texStorage2D(...arguments)}catch(B){Jt("WebGLState:",B)}}function vt(){try{i.texStorage3D(...arguments)}catch(B){Jt("WebGLState:",B)}}function J(){try{i.texImage2D(...arguments)}catch(B){Jt("WebGLState:",B)}}function rt(){try{i.texImage3D(...arguments)}catch(B){Jt("WebGLState:",B)}}function tt(B){return d[B]!==void 0?d[B]:i.getParameter(B)}function kt(B,Mt){d[B]!==Mt&&(i.pixelStorei(B,Mt),d[B]=Mt)}function _t(B){jt.equals(B)===!1&&(i.scissor(B.x,B.y,B.z,B.w),jt.copy(B))}function mt(B){Pt.equals(B)===!1&&(i.viewport(B.x,B.y,B.z,B.w),Pt.copy(B))}function Bt(B,Mt){let Q=c.get(Mt);Q===void 0&&(Q=new WeakMap,c.set(Mt,Q));let Tt=Q.get(B);Tt===void 0&&(Tt=i.getUniformBlockIndex(Mt,B.name),Q.set(B,Tt))}function Ht(B,Mt){let Tt=c.get(Mt).get(B);l.get(Mt)!==Tt&&(i.uniformBlockBinding(Mt,Tt,B.__bindingPointIndex),l.set(Mt,Tt))}function $t(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},lt=null,at={},u={},f=new WeakMap,g=[],b=null,m=!1,p=null,S=null,C=null,_=null,M=null,T=null,w=null,x=new Dt(0,0,0),y=0,R=!1,P=null,D=null,z=null,W=null,N=null,jt.set(0,0,i.canvas.width,i.canvas.height),Pt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ct,disable:zt,bindFramebuffer:St,drawBuffers:xt,useProgram:he,setBlending:V,setMaterial:ot,setFlipSided:nt,setCullFace:Zt,setLineWidth:oe,setPolygonOffset:st,setScissorTest:Ot,activeTexture:It,bindTexture:O,unbindTexture:Ee,compressedTexImage2D:Rt,compressedTexImage3D:A,texImage2D:J,texImage3D:rt,pixelStorei:kt,getParameter:tt,updateUBOMapping:Bt,uniformBlockBinding:Ht,texStorage2D:dt,texStorage3D:vt,texSubImage2D:v,texSubImage3D:H,compressedTexSubImage2D:q,compressedTexSubImage3D:et,scissor:_t,viewport:mt,reset:$t}}function lv(i,t,e,n,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Yt,h=new WeakMap,d=new Set,u,f=new WeakMap,g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function b(A,v){return g?new OffscreenCanvas(A,v):Lr("canvas")}function m(A,v,H){let q=1,et=Rt(A);if((et.width>H||et.height>H)&&(q=H/Math.max(et.width,et.height)),q<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let dt=Math.floor(q*et.width),vt=Math.floor(q*et.height);u===void 0&&(u=b(dt,vt));let J=v?b(dt,vt):u;return J.width=dt,J.height=vt,J.getContext("2d").drawImage(A,0,0,dt,vt),Kt("WebGLRenderer: Texture has been resized from ("+et.width+"x"+et.height+") to ("+dt+"x"+vt+")."),J}else return"data"in A&&Kt("WebGLRenderer: Image in DataTexture is too big ("+et.width+"x"+et.height+")."),A;return A}function p(A){return A.generateMipmaps}function S(A){i.generateMipmap(A)}function C(A){return A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?i.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function _(A,v,H,q,et,dt=!1){if(A!==null){if(i[A]!==void 0)return i[A];Kt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let vt;q&&(vt=t.get("EXT_texture_norm16"),vt||Kt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let J=v;if(v===i.RED&&(H===i.FLOAT&&(J=i.R32F),H===i.HALF_FLOAT&&(J=i.R16F),H===i.UNSIGNED_BYTE&&(J=i.R8),H===i.UNSIGNED_SHORT&&vt&&(J=vt.R16_EXT),H===i.SHORT&&vt&&(J=vt.R16_SNORM_EXT)),v===i.RED_INTEGER&&(H===i.UNSIGNED_BYTE&&(J=i.R8UI),H===i.UNSIGNED_SHORT&&(J=i.R16UI),H===i.UNSIGNED_INT&&(J=i.R32UI),H===i.BYTE&&(J=i.R8I),H===i.SHORT&&(J=i.R16I),H===i.INT&&(J=i.R32I)),v===i.RG&&(H===i.FLOAT&&(J=i.RG32F),H===i.HALF_FLOAT&&(J=i.RG16F),H===i.UNSIGNED_BYTE&&(J=i.RG8),H===i.UNSIGNED_SHORT&&vt&&(J=vt.RG16_EXT),H===i.SHORT&&vt&&(J=vt.RG16_SNORM_EXT)),v===i.RG_INTEGER&&(H===i.UNSIGNED_BYTE&&(J=i.RG8UI),H===i.UNSIGNED_SHORT&&(J=i.RG16UI),H===i.UNSIGNED_INT&&(J=i.RG32UI),H===i.BYTE&&(J=i.RG8I),H===i.SHORT&&(J=i.RG16I),H===i.INT&&(J=i.RG32I)),v===i.RGB_INTEGER&&(H===i.UNSIGNED_BYTE&&(J=i.RGB8UI),H===i.UNSIGNED_SHORT&&(J=i.RGB16UI),H===i.UNSIGNED_INT&&(J=i.RGB32UI),H===i.BYTE&&(J=i.RGB8I),H===i.SHORT&&(J=i.RGB16I),H===i.INT&&(J=i.RGB32I)),v===i.RGBA_INTEGER&&(H===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),H===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),H===i.UNSIGNED_INT&&(J=i.RGBA32UI),H===i.BYTE&&(J=i.RGBA8I),H===i.SHORT&&(J=i.RGBA16I),H===i.INT&&(J=i.RGBA32I)),v===i.RGB&&(H===i.UNSIGNED_SHORT&&vt&&(J=vt.RGB16_EXT),H===i.SHORT&&vt&&(J=vt.RGB16_SNORM_EXT),H===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),H===i.UNSIGNED_INT_10F_11F_11F_REV&&(J=i.R11F_G11F_B10F)),v===i.RGBA){let rt=dt?Ir:ue.getTransfer(et);H===i.FLOAT&&(J=i.RGBA32F),H===i.HALF_FLOAT&&(J=i.RGBA16F),H===i.UNSIGNED_BYTE&&(J=rt===_e?i.SRGB8_ALPHA8:i.RGBA8),H===i.UNSIGNED_SHORT&&vt&&(J=vt.RGBA16_EXT),H===i.SHORT&&vt&&(J=vt.RGBA16_SNORM_EXT),H===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),H===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&t.get("EXT_color_buffer_float"),J}function M(A,v){let H;return A?v===null||v===Zn||v===Xi?H=i.DEPTH24_STENCIL8:v===Un?H=i.DEPTH32F_STENCIL8:v===Qs&&(H=i.DEPTH24_STENCIL8,Kt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===Zn||v===Xi?H=i.DEPTH_COMPONENT24:v===Un?H=i.DEPTH_COMPONENT32F:v===Qs&&(H=i.DEPTH_COMPONENT16),H}function T(A,v){return p(A)===!0||A.isFramebufferTexture&&A.minFilter!==De&&A.minFilter!==en?Math.log2(Math.max(v.width,v.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?v.mipmaps.length:1}function w(A){let v=A.target;v.removeEventListener("dispose",w),y(v),v.isVideoTexture&&h.delete(v),v.isHTMLTexture&&d.delete(v)}function x(A){let v=A.target;v.removeEventListener("dispose",x),P(v)}function y(A){let v=n.get(A);if(v.__webglInit===void 0)return;let H=A.source,q=f.get(H);if(q){let et=q[v.__cacheKey];et.usedTimes--,et.usedTimes===0&&R(A),Object.keys(q).length===0&&f.delete(H)}n.remove(A)}function R(A){let v=n.get(A);i.deleteTexture(v.__webglTexture);let H=A.source,q=f.get(H);delete q[v.__cacheKey],o.memory.textures--}function P(A){let v=n.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),n.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(v.__webglFramebuffer[q]))for(let et=0;et<v.__webglFramebuffer[q].length;et++)i.deleteFramebuffer(v.__webglFramebuffer[q][et]);else i.deleteFramebuffer(v.__webglFramebuffer[q]);v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer[q])}else{if(Array.isArray(v.__webglFramebuffer))for(let q=0;q<v.__webglFramebuffer.length;q++)i.deleteFramebuffer(v.__webglFramebuffer[q]);else i.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&i.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let q=0;q<v.__webglColorRenderbuffer.length;q++)v.__webglColorRenderbuffer[q]&&i.deleteRenderbuffer(v.__webglColorRenderbuffer[q]);v.__webglDepthRenderbuffer&&i.deleteRenderbuffer(v.__webglDepthRenderbuffer)}let H=A.textures;for(let q=0,et=H.length;q<et;q++){let dt=n.get(H[q]);dt.__webglTexture&&(i.deleteTexture(dt.__webglTexture),o.memory.textures--),n.remove(H[q])}n.remove(A)}let D=0;function z(){D=0}function W(){return D}function N(A){D=A}function k(){let A=D;return A>=s.maxTextures&&Kt("WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),D+=1,A}function U(A){let v=[];return v.push(A.wrapS),v.push(A.wrapT),v.push(A.wrapR||0),v.push(A.magFilter),v.push(A.minFilter),v.push(A.anisotropy),v.push(A.internalFormat),v.push(A.format),v.push(A.type),v.push(A.generateMipmaps),v.push(A.premultiplyAlpha),v.push(A.flipY),v.push(A.unpackAlignment),v.push(A.colorSpace),v.join()}function X(A,v){let H=n.get(A);if(A.isVideoTexture&&O(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&H.__version!==A.version){let q=A.image;if(q===null)Kt("WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)Kt("WebGLRenderer: Texture marked for update but image is incomplete");else{zt(H,A,v);return}}else A.isExternalTexture&&(H.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,H.__webglTexture,i.TEXTURE0+v)}function K(A,v){let H=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&H.__version!==A.version){zt(H,A,v);return}else A.isExternalTexture&&(H.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,H.__webglTexture,i.TEXTURE0+v)}function lt(A,v){let H=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&H.__version!==A.version){zt(H,A,v);return}e.bindTexture(i.TEXTURE_3D,H.__webglTexture,i.TEXTURE0+v)}function at(A,v){let H=n.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&H.__version!==A.version){St(H,A,v);return}e.bindTexture(i.TEXTURE_CUBE_MAP,H.__webglTexture,i.TEXTURE0+v)}let gt={[Ln]:i.REPEAT,[ri]:i.CLAMP_TO_EDGE,[ha]:i.MIRRORED_REPEAT},yt={[De]:i.NEAREST,[wu]:i.NEAREST_MIPMAP_NEAREST,[oo]:i.NEAREST_MIPMAP_LINEAR,[en]:i.LINEAR,[Na]:i.LINEAR_MIPMAP_NEAREST,[Wi]:i.LINEAR_MIPMAP_LINEAR},jt={[Au]:i.NEVER,[Lu]:i.ALWAYS,[Cu]:i.LESS,[vl]:i.LEQUAL,[Ru]:i.EQUAL,[_l]:i.GEQUAL,[Pu]:i.GREATER,[Iu]:i.NOTEQUAL};function Pt(A,v){if(v.type===Un&&t.has("OES_texture_float_linear")===!1&&(v.magFilter===en||v.magFilter===Na||v.magFilter===oo||v.magFilter===Wi||v.minFilter===en||v.minFilter===Na||v.minFilter===oo||v.minFilter===Wi)&&Kt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,gt[v.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,gt[v.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,gt[v.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,yt[v.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,yt[v.minFilter]),v.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,jt[v.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===De||v.minFilter!==oo&&v.minFilter!==Wi||v.type===Un&&t.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){let H=t.get("EXT_texture_filter_anisotropic");i.texParameterf(A,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function j(A,v){let H=!1;A.__webglInit===void 0&&(A.__webglInit=!0,v.addEventListener("dispose",w));let q=v.source,et=f.get(q);et===void 0&&(et={},f.set(q,et));let dt=U(v);if(dt!==A.__cacheKey){et[dt]===void 0&&(et[dt]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,H=!0),et[dt].usedTimes++;let vt=et[A.__cacheKey];vt!==void 0&&(et[A.__cacheKey].usedTimes--,vt.usedTimes===0&&R(v)),A.__cacheKey=dt,A.__webglTexture=et[dt].texture}return H}function ut(A,v,H){return Math.floor(Math.floor(A/H)/v)}function ct(A,v,H,q){let dt=A.updateRanges;if(dt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,v.width,v.height,H,q,v.data);else{dt.sort((kt,_t)=>kt.start-_t.start);let vt=0;for(let kt=1;kt<dt.length;kt++){let _t=dt[vt],mt=dt[kt],Bt=_t.start+_t.count,Ht=ut(mt.start,v.width,4),$t=ut(_t.start,v.width,4);mt.start<=Bt+1&&Ht===$t&&ut(mt.start+mt.count-1,v.width,4)===Ht?_t.count=Math.max(_t.count,mt.start+mt.count-_t.start):(++vt,dt[vt]=mt)}dt.length=vt+1;let J=e.getParameter(i.UNPACK_ROW_LENGTH),rt=e.getParameter(i.UNPACK_SKIP_PIXELS),tt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,v.width);for(let kt=0,_t=dt.length;kt<_t;kt++){let mt=dt[kt],Bt=Math.floor(mt.start/4),Ht=Math.ceil(mt.count/4),$t=Bt%v.width,B=Math.floor(Bt/v.width),Mt=Ht,Q=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,$t),e.pixelStorei(i.UNPACK_SKIP_ROWS,B),e.texSubImage2D(i.TEXTURE_2D,0,$t,B,Mt,Q,H,q,v.data)}A.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,J),e.pixelStorei(i.UNPACK_SKIP_PIXELS,rt),e.pixelStorei(i.UNPACK_SKIP_ROWS,tt)}}function zt(A,v,H){let q=i.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(q=i.TEXTURE_2D_ARRAY),v.isData3DTexture&&(q=i.TEXTURE_3D);let et=j(A,v),dt=v.source;e.bindTexture(q,A.__webglTexture,i.TEXTURE0+H);let vt=n.get(dt);if(dt.version!==vt.__version||et===!0){if(e.activeTexture(i.TEXTURE0+H),(typeof ImageBitmap<"u"&&v.image instanceof ImageBitmap)===!1){let Q=ue.getPrimaries(ue.workingColorSpace),Tt=v.colorSpace===Ti?null:ue.getPrimaries(v.colorSpace),Et=v.colorSpace===Ti||Q===Tt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Et)}e.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment);let rt=m(v.image,!1,s.maxTextureSize);rt=Ee(v,rt);let tt=r.convert(v.format,v.colorSpace),kt=r.convert(v.type),_t=_(v.internalFormat,tt,kt,v.normalized,v.colorSpace,v.isVideoTexture);Pt(q,v);let mt,Bt=v.mipmaps,Ht=v.isVideoTexture!==!0,$t=vt.__version===void 0||et===!0,B=dt.dataReady,Mt=T(v,rt);if(v.isDepthTexture)_t=M(v.format===hi,v.type),$t&&(Ht?e.texStorage2D(i.TEXTURE_2D,1,_t,rt.width,rt.height):e.texImage2D(i.TEXTURE_2D,0,_t,rt.width,rt.height,0,tt,kt,null));else if(v.isDataTexture)if(Bt.length>0){Ht&&$t&&e.texStorage2D(i.TEXTURE_2D,Mt,_t,Bt[0].width,Bt[0].height);for(let Q=0,Tt=Bt.length;Q<Tt;Q++)mt=Bt[Q],Ht?B&&e.texSubImage2D(i.TEXTURE_2D,Q,0,0,mt.width,mt.height,tt,kt,mt.data):e.texImage2D(i.TEXTURE_2D,Q,_t,mt.width,mt.height,0,tt,kt,mt.data);v.generateMipmaps=!1}else Ht?($t&&e.texStorage2D(i.TEXTURE_2D,Mt,_t,rt.width,rt.height),B&&ct(v,rt,tt,kt)):e.texImage2D(i.TEXTURE_2D,0,_t,rt.width,rt.height,0,tt,kt,rt.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){Ht&&$t&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Mt,_t,Bt[0].width,Bt[0].height,rt.depth);for(let Q=0,Tt=Bt.length;Q<Tt;Q++)if(mt=Bt[Q],v.format!==yn)if(tt!==null)if(Ht){if(B)if(v.layerUpdates.size>0){let Et=Kc(mt.width,mt.height,v.format,v.type);for(let ht of v.layerUpdates){let ft=mt.data.subarray(ht*Et/mt.data.BYTES_PER_ELEMENT,(ht+1)*Et/mt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,ht,mt.width,mt.height,1,tt,ft)}v.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,0,mt.width,mt.height,rt.depth,tt,mt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Q,_t,mt.width,mt.height,rt.depth,0,mt.data,0,0);else Kt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ht?B&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,0,mt.width,mt.height,rt.depth,tt,kt,mt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,Q,_t,mt.width,mt.height,rt.depth,0,tt,kt,mt.data)}else{Ht&&$t&&e.texStorage2D(i.TEXTURE_2D,Mt,_t,Bt[0].width,Bt[0].height);for(let Q=0,Tt=Bt.length;Q<Tt;Q++)mt=Bt[Q],v.format!==yn?tt!==null?Ht?B&&e.compressedTexSubImage2D(i.TEXTURE_2D,Q,0,0,mt.width,mt.height,tt,mt.data):e.compressedTexImage2D(i.TEXTURE_2D,Q,_t,mt.width,mt.height,0,mt.data):Kt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ht?B&&e.texSubImage2D(i.TEXTURE_2D,Q,0,0,mt.width,mt.height,tt,kt,mt.data):e.texImage2D(i.TEXTURE_2D,Q,_t,mt.width,mt.height,0,tt,kt,mt.data)}else if(v.isDataArrayTexture)if(Ht){if($t&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Mt,_t,rt.width,rt.height,rt.depth),B)if(v.layerUpdates.size>0){let Q=Kc(rt.width,rt.height,v.format,v.type);for(let Tt of v.layerUpdates){let Et=rt.data.subarray(Tt*Q/rt.data.BYTES_PER_ELEMENT,(Tt+1)*Q/rt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Tt,rt.width,rt.height,1,tt,kt,Et)}v.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,rt.width,rt.height,rt.depth,tt,kt,rt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,_t,rt.width,rt.height,rt.depth,0,tt,kt,rt.data);else if(v.isData3DTexture)Ht?($t&&e.texStorage3D(i.TEXTURE_3D,Mt,_t,rt.width,rt.height,rt.depth),B&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,rt.width,rt.height,rt.depth,tt,kt,rt.data)):e.texImage3D(i.TEXTURE_3D,0,_t,rt.width,rt.height,rt.depth,0,tt,kt,rt.data);else if(v.isFramebufferTexture){if($t)if(Ht)e.texStorage2D(i.TEXTURE_2D,Mt,_t,rt.width,rt.height);else{let Q=rt.width,Tt=rt.height;for(let Et=0;Et<Mt;Et++)e.texImage2D(i.TEXTURE_2D,Et,_t,Q,Tt,0,tt,kt,null),Q>>=1,Tt>>=1}}else if(v.isHTMLTexture){if("texElementImage2D"in i){let Q=i.canvas;if(Q.hasAttribute("layoutsubtree")||Q.setAttribute("layoutsubtree","true"),rt.parentNode!==Q){Q.appendChild(rt),d.add(v),Q.onpaint=Tt=>{let Et=Tt.changedElements;for(let ht of d)Et.includes(ht.image)&&(ht.needsUpdate=!0)},Q.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,rt);else{let Et=i.RGBA,ht=i.RGBA,ft=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Et,ht,ft,rt)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Bt.length>0){if(Ht&&$t){let Q=Rt(Bt[0]);e.texStorage2D(i.TEXTURE_2D,Mt,_t,Q.width,Q.height)}for(let Q=0,Tt=Bt.length;Q<Tt;Q++)mt=Bt[Q],Ht?B&&e.texSubImage2D(i.TEXTURE_2D,Q,0,0,tt,kt,mt):e.texImage2D(i.TEXTURE_2D,Q,_t,tt,kt,mt);v.generateMipmaps=!1}else if(Ht){if($t){let Q=Rt(rt);e.texStorage2D(i.TEXTURE_2D,Mt,_t,Q.width,Q.height)}B&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,tt,kt,rt)}else e.texImage2D(i.TEXTURE_2D,0,_t,tt,kt,rt);p(v)&&S(q),vt.__version=dt.version,v.onUpdate&&v.onUpdate(v)}A.__version=v.version}function St(A,v,H){if(v.image.length!==6)return;let q=j(A,v),et=v.source;e.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+H);let dt=n.get(et);if(et.version!==dt.__version||q===!0){e.activeTexture(i.TEXTURE0+H);let vt=ue.getPrimaries(ue.workingColorSpace),J=v.colorSpace===Ti?null:ue.getPrimaries(v.colorSpace),rt=v.colorSpace===Ti||vt===J?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,rt);let tt=v.isCompressedTexture||v.image[0].isCompressedTexture,kt=v.image[0]&&v.image[0].isDataTexture,_t=[];for(let ht=0;ht<6;ht++)!tt&&!kt?_t[ht]=m(v.image[ht],!0,s.maxCubemapSize):_t[ht]=kt?v.image[ht].image:v.image[ht],_t[ht]=Ee(v,_t[ht]);let mt=_t[0],Bt=r.convert(v.format,v.colorSpace),Ht=r.convert(v.type),$t=_(v.internalFormat,Bt,Ht,v.normalized,v.colorSpace),B=v.isVideoTexture!==!0,Mt=dt.__version===void 0||q===!0,Q=et.dataReady,Tt=T(v,mt);Pt(i.TEXTURE_CUBE_MAP,v);let Et;if(tt){B&&Mt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Tt,$t,mt.width,mt.height);for(let ht=0;ht<6;ht++){Et=_t[ht].mipmaps;for(let ft=0;ft<Et.length;ft++){let Ut=Et[ft];v.format!==yn?Bt!==null?B?Q&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft,0,0,Ut.width,Ut.height,Bt,Ut.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft,$t,Ut.width,Ut.height,0,Ut.data):Kt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):B?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft,0,0,Ut.width,Ut.height,Bt,Ht,Ut.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft,$t,Ut.width,Ut.height,0,Bt,Ht,Ut.data)}}}else{if(Et=v.mipmaps,B&&Mt){Et.length>0&&Tt++;let ht=Rt(_t[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Tt,$t,ht.width,ht.height)}for(let ht=0;ht<6;ht++)if(kt){B?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,0,0,_t[ht].width,_t[ht].height,Bt,Ht,_t[ht].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,$t,_t[ht].width,_t[ht].height,0,Bt,Ht,_t[ht].data);for(let ft=0;ft<Et.length;ft++){let xe=Et[ft].image[ht].image;B?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft+1,0,0,xe.width,xe.height,Bt,Ht,xe.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft+1,$t,xe.width,xe.height,0,Bt,Ht,xe.data)}}else{B?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,0,0,Bt,Ht,_t[ht]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,$t,Bt,Ht,_t[ht]);for(let ft=0;ft<Et.length;ft++){let Ut=Et[ft];B?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft+1,0,0,Bt,Ht,Ut.image[ht]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,ft+1,$t,Bt,Ht,Ut.image[ht])}}}p(v)&&S(i.TEXTURE_CUBE_MAP),dt.__version=et.version,v.onUpdate&&v.onUpdate(v)}A.__version=v.version}function xt(A,v,H,q,et,dt){let vt=r.convert(H.format,H.colorSpace),J=r.convert(H.type),rt=_(H.internalFormat,vt,J,H.normalized,H.colorSpace),tt=n.get(v),kt=n.get(H);if(kt.__renderTarget=v,!tt.__hasExternalTextures){let _t=Math.max(1,v.width>>dt),mt=Math.max(1,v.height>>dt);et===i.TEXTURE_3D||et===i.TEXTURE_2D_ARRAY?e.texImage3D(et,dt,rt,_t,mt,v.depth,0,vt,J,null):e.texImage2D(et,dt,rt,_t,mt,0,vt,J,null)}e.bindFramebuffer(i.FRAMEBUFFER,A),It(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,q,et,kt.__webglTexture,0,Ot(v)):(et===i.TEXTURE_2D||et>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&et<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,q,et,kt.__webglTexture,dt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function he(A,v,H){if(i.bindRenderbuffer(i.RENDERBUFFER,A),v.depthBuffer){let q=v.depthTexture,et=q&&q.isDepthTexture?q.type:null,dt=M(v.stencilBuffer,et),vt=v.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;It(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ot(v),dt,v.width,v.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ot(v),dt,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,dt,v.width,v.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,vt,i.RENDERBUFFER,A)}else{let q=v.textures;for(let et=0;et<q.length;et++){let dt=q[et],vt=r.convert(dt.format,dt.colorSpace),J=r.convert(dt.type),rt=_(dt.internalFormat,vt,J,dt.normalized,dt.colorSpace);It(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ot(v),rt,v.width,v.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ot(v),rt,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,rt,v.width,v.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Xt(A,v,H){let q=v.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,A),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let et=n.get(v.depthTexture);if(et.__renderTarget=v,(!et.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),q){if(et.__webglInit===void 0&&(et.__webglInit=!0,v.depthTexture.addEventListener("dispose",w)),et.__webglTexture===void 0){et.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,et.__webglTexture),Pt(i.TEXTURE_CUBE_MAP,v.depthTexture);let tt=r.convert(v.depthTexture.format),kt=r.convert(v.depthTexture.type),_t;v.depthTexture.format===oi?_t=i.DEPTH_COMPONENT24:v.depthTexture.format===hi&&(_t=i.DEPTH24_STENCIL8);for(let mt=0;mt<6;mt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+mt,0,_t,v.width,v.height,0,tt,kt,null)}}else X(v.depthTexture,0);let dt=et.__webglTexture,vt=Ot(v),J=q?i.TEXTURE_CUBE_MAP_POSITIVE_X+H:i.TEXTURE_2D,rt=v.depthTexture.format===hi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(v.depthTexture.format===oi)It(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,rt,J,dt,0,vt):i.framebufferTexture2D(i.FRAMEBUFFER,rt,J,dt,0);else if(v.depthTexture.format===hi)It(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,rt,J,dt,0,vt):i.framebufferTexture2D(i.FRAMEBUFFER,rt,J,dt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Wt(A){let v=n.get(A),H=A.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==A.depthTexture){let q=A.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),q){let et=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,q.removeEventListener("dispose",et)};q.addEventListener("dispose",et),v.__depthDisposeCallback=et}v.__boundDepthTexture=q}if(A.depthTexture&&!v.__autoAllocateDepthBuffer)if(H)for(let q=0;q<6;q++)Xt(v.__webglFramebuffer[q],A,q);else{let q=A.texture.mipmaps;q&&q.length>0?Xt(v.__webglFramebuffer[0],A,0):Xt(v.__webglFramebuffer,A,0)}else if(H){v.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(e.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[q]),v.__webglDepthbuffer[q]===void 0)v.__webglDepthbuffer[q]=i.createRenderbuffer(),he(v.__webglDepthbuffer[q],A,!1);else{let et=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,dt=v.__webglDepthbuffer[q];i.bindRenderbuffer(i.RENDERBUFFER,dt),i.framebufferRenderbuffer(i.FRAMEBUFFER,et,i.RENDERBUFFER,dt)}}else{let q=A.texture.mipmaps;if(q&&q.length>0?e.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=i.createRenderbuffer(),he(v.__webglDepthbuffer,A,!1);else{let et=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,dt=v.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,dt),i.framebufferRenderbuffer(i.FRAMEBUFFER,et,i.RENDERBUFFER,dt)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function V(A,v,H){let q=n.get(A);v!==void 0&&xt(q.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),H!==void 0&&Wt(A)}function ot(A){let v=A.texture,H=n.get(A),q=n.get(v);A.addEventListener("dispose",x);let et=A.textures,dt=A.isWebGLCubeRenderTarget===!0,vt=et.length>1;if(vt||(q.__webglTexture===void 0&&(q.__webglTexture=i.createTexture()),q.__version=v.version,o.memory.textures++),dt){H.__webglFramebuffer=[];for(let J=0;J<6;J++)if(v.mipmaps&&v.mipmaps.length>0){H.__webglFramebuffer[J]=[];for(let rt=0;rt<v.mipmaps.length;rt++)H.__webglFramebuffer[J][rt]=i.createFramebuffer()}else H.__webglFramebuffer[J]=i.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){H.__webglFramebuffer=[];for(let J=0;J<v.mipmaps.length;J++)H.__webglFramebuffer[J]=i.createFramebuffer()}else H.__webglFramebuffer=i.createFramebuffer();if(vt)for(let J=0,rt=et.length;J<rt;J++){let tt=n.get(et[J]);tt.__webglTexture===void 0&&(tt.__webglTexture=i.createTexture(),o.memory.textures++)}if(A.samples>0&&It(A)===!1){H.__webglMultisampledFramebuffer=i.createFramebuffer(),H.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let J=0;J<et.length;J++){let rt=et[J];H.__webglColorRenderbuffer[J]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,H.__webglColorRenderbuffer[J]);let tt=r.convert(rt.format,rt.colorSpace),kt=r.convert(rt.type),_t=_(rt.internalFormat,tt,kt,rt.normalized,rt.colorSpace,A.isXRRenderTarget===!0),mt=Ot(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,mt,_t,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+J,i.RENDERBUFFER,H.__webglColorRenderbuffer[J])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(H.__webglDepthRenderbuffer=i.createRenderbuffer(),he(H.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(dt){e.bindTexture(i.TEXTURE_CUBE_MAP,q.__webglTexture),Pt(i.TEXTURE_CUBE_MAP,v);for(let J=0;J<6;J++)if(v.mipmaps&&v.mipmaps.length>0)for(let rt=0;rt<v.mipmaps.length;rt++)xt(H.__webglFramebuffer[J][rt],A,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,rt);else xt(H.__webglFramebuffer[J],A,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0);p(v)&&S(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(vt){for(let J=0,rt=et.length;J<rt;J++){let tt=et[J],kt=n.get(tt),_t=i.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(_t=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(_t,kt.__webglTexture),Pt(_t,tt),xt(H.__webglFramebuffer,A,tt,i.COLOR_ATTACHMENT0+J,_t,0),p(tt)&&S(_t)}e.unbindTexture()}else{let J=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(J=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(J,q.__webglTexture),Pt(J,v),v.mipmaps&&v.mipmaps.length>0)for(let rt=0;rt<v.mipmaps.length;rt++)xt(H.__webglFramebuffer[rt],A,v,i.COLOR_ATTACHMENT0,J,rt);else xt(H.__webglFramebuffer,A,v,i.COLOR_ATTACHMENT0,J,0);p(v)&&S(J),e.unbindTexture()}A.depthBuffer&&Wt(A)}function nt(A){let v=A.textures;for(let H=0,q=v.length;H<q;H++){let et=v[H];if(p(et)){let dt=C(A),vt=n.get(et).__webglTexture;e.bindTexture(dt,vt),S(dt),e.unbindTexture()}}}let Zt=[],oe=[];function st(A){if(A.samples>0){if(It(A)===!1){let v=A.textures,H=A.width,q=A.height,et=i.COLOR_BUFFER_BIT,dt=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,vt=n.get(A),J=v.length>1;if(J)for(let tt=0;tt<v.length;tt++)e.bindFramebuffer(i.FRAMEBUFFER,vt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+tt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,vt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+tt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,vt.__webglMultisampledFramebuffer);let rt=A.texture.mipmaps;rt&&rt.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,vt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,vt.__webglFramebuffer);for(let tt=0;tt<v.length;tt++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(et|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(et|=i.STENCIL_BUFFER_BIT)),J){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,vt.__webglColorRenderbuffer[tt]);let kt=n.get(v[tt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,kt,0)}i.blitFramebuffer(0,0,H,q,0,0,H,q,et,i.NEAREST),l===!0&&(Zt.length=0,oe.length=0,Zt.push(i.COLOR_ATTACHMENT0+tt),A.depthBuffer&&A.resolveDepthBuffer===!1&&(Zt.push(dt),oe.push(dt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,oe)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Zt))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),J)for(let tt=0;tt<v.length;tt++){e.bindFramebuffer(i.FRAMEBUFFER,vt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+tt,i.RENDERBUFFER,vt.__webglColorRenderbuffer[tt]);let kt=n.get(v[tt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,vt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+tt,i.TEXTURE_2D,kt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,vt.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){let v=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[v])}}}function Ot(A){return Math.min(s.maxSamples,A.samples)}function It(A){let v=n.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function O(A){let v=o.render.frame;h.get(A)!==v&&(h.set(A,v),A.update())}function Ee(A,v){let H=A.colorSpace,q=A.format,et=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||H!==Pr&&H!==Ti&&(ue.getTransfer(H)===_e?(q!==yn||et!==Qe)&&Kt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Jt("WebGLTextures: Unsupported texture color space:",H)),v}function Rt(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=k,this.resetTextureUnits=z,this.getTextureUnits=W,this.setTextureUnits=N,this.setTexture2D=X,this.setTexture2DArray=K,this.setTexture3D=lt,this.setTextureCube=at,this.rebindTextures=V,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=nt,this.updateMultisampleRenderTarget=st,this.setupDepthRenderbuffer=Wt,this.setupFrameBufferTexture=xt,this.useMultisampledRTT=It,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function cv(i,t){function e(n,s=Ti){let r,o=ue.getTransfer(s);if(n===Qe)return i.UNSIGNED_BYTE;if(n===Fa)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Oa)return i.UNSIGNED_SHORT_5_5_5_1;if(n===kc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===zc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Oc)return i.BYTE;if(n===Bc)return i.SHORT;if(n===Qs)return i.UNSIGNED_SHORT;if(n===Ua)return i.INT;if(n===Zn)return i.UNSIGNED_INT;if(n===Un)return i.FLOAT;if(n===qe)return i.HALF_FLOAT;if(n===Vc)return i.ALPHA;if(n===Gc)return i.RGB;if(n===yn)return i.RGBA;if(n===oi)return i.DEPTH_COMPONENT;if(n===hi)return i.DEPTH_STENCIL;if(n===Ba)return i.RED;if(n===ka)return i.RED_INTEGER;if(n===qi)return i.RG;if(n===za)return i.RG_INTEGER;if(n===Va)return i.RGBA_INTEGER;if(n===ao||n===lo||n===co||n===ho)if(o===_e)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ao)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===lo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===co)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ho)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ao)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===lo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===co)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ho)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ga||n===Ha||n===Wa||n===Xa)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Ga)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ha)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Wa)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Xa)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===qa||n===Ya||n===Za||n===$a||n===Ka||n===uo||n===Ja)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===qa||n===Ya)return o===_e?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Za)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===$a)return r.COMPRESSED_R11_EAC;if(n===Ka)return r.COMPRESSED_SIGNED_R11_EAC;if(n===uo)return r.COMPRESSED_RG11_EAC;if(n===Ja)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===ja||n===Qa||n===tl||n===el||n===nl||n===il||n===sl||n===rl||n===ol||n===al||n===ll||n===cl||n===hl||n===ul)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===ja)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Qa)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===tl)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===el)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===nl)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===il)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===sl)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===rl)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ol)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===al)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===ll)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===cl)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===hl)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ul)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===dl||n===fl||n===pl)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===dl)return o===_e?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===fl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===pl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===ml||n===gl||n===fo||n===xl)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===ml)return r.COMPRESSED_RED_RGTC1_EXT;if(n===gl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===fo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===xl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Xi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var hv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,uv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,hh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new zr(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Ne({vertexShader:hv,fragmentShader:uv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new me(new wi(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},uh=class extends Wn{constructor(t,e){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,g=null,b=typeof XRWebGLBinding<"u",m=new hh,p={},S=e.getContextAttributes(),C=null,_=null,M=[],T=[],w=new Yt,x=null,y=new He;y.viewport=new Te;let R=new He;R.viewport=new Te;let P=[y,R],D=new Ra,z=null,W=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let ut=M[j];return ut===void 0&&(ut=new qs,M[j]=ut),ut.getTargetRaySpace()},this.getControllerGrip=function(j){let ut=M[j];return ut===void 0&&(ut=new qs,M[j]=ut),ut.getGripSpace()},this.getHand=function(j){let ut=M[j];return ut===void 0&&(ut=new qs,M[j]=ut),ut.getHandSpace()};function N(j){let ut=T.indexOf(j.inputSource);if(ut===-1)return;let ct=M[ut];ct!==void 0&&(ct.update(j.inputSource,j.frame,c||o),ct.dispatchEvent({type:j.type,data:j.inputSource}))}function k(){s.removeEventListener("select",N),s.removeEventListener("selectstart",N),s.removeEventListener("selectend",N),s.removeEventListener("squeeze",N),s.removeEventListener("squeezestart",N),s.removeEventListener("squeezeend",N),s.removeEventListener("end",k),s.removeEventListener("inputsourceschange",U);for(let j=0;j<M.length;j++){let ut=T[j];ut!==null&&(T[j]=null,M[j].disconnect(ut))}z=null,W=null,m.reset();for(let j in p)delete p[j];t.setRenderTarget(C),f=null,u=null,d=null,s=null,_=null,Pt.stop(),n.isPresenting=!1,t.setPixelRatio(x),t.setSize(w.width,w.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){r=j,n.isPresenting===!0&&Kt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){a=j,n.isPresenting===!0&&Kt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(j){c=j},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&b&&(d=new XRWebGLBinding(s,e)),d},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(j){if(s=j,s!==null){if(C=t.getRenderTarget(),s.addEventListener("select",N),s.addEventListener("selectstart",N),s.addEventListener("selectend",N),s.addEventListener("squeeze",N),s.addEventListener("squeezestart",N),s.addEventListener("squeezeend",N),s.addEventListener("end",k),s.addEventListener("inputsourceschange",U),S.xrCompatible!==!0&&await e.makeXRCompatible(),x=t.getPixelRatio(),t.getSize(w),b&&"createProjectionLayer"in XRWebGLBinding.prototype){let ct=null,zt=null,St=null;S.depth&&(St=S.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,ct=S.stencil?hi:oi,zt=S.stencil?Xi:Zn);let xt={colorFormat:e.RGBA8,depthFormat:St,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(xt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),_=new Ie(u.textureWidth,u.textureHeight,{format:yn,type:Qe,depthTexture:new qn(u.textureWidth,u.textureHeight,zt,void 0,void 0,void 0,void 0,void 0,void 0,ct),stencilBuffer:S.stencil,colorSpace:t.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{let ct={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,ct),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),_=new Ie(f.framebufferWidth,f.framebufferHeight,{format:yn,type:Qe,colorSpace:t.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Pt.setContext(s),Pt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function U(j){for(let ut=0;ut<j.removed.length;ut++){let ct=j.removed[ut],zt=T.indexOf(ct);zt>=0&&(T[zt]=null,M[zt].disconnect(ct))}for(let ut=0;ut<j.added.length;ut++){let ct=j.added[ut],zt=T.indexOf(ct);if(zt===-1){for(let xt=0;xt<M.length;xt++)if(xt>=T.length){T.push(ct),zt=xt;break}else if(T[xt]===null){T[xt]=ct,zt=xt;break}if(zt===-1)break}let St=M[zt];St&&St.connect(ct)}}let X=new F,K=new F;function lt(j,ut,ct){X.setFromMatrixPosition(ut.matrixWorld),K.setFromMatrixPosition(ct.matrixWorld);let zt=X.distanceTo(K),St=ut.projectionMatrix.elements,xt=ct.projectionMatrix.elements,he=St[14]/(St[10]-1),Xt=St[14]/(St[10]+1),Wt=(St[9]+1)/St[5],V=(St[9]-1)/St[5],ot=(St[8]-1)/St[0],nt=(xt[8]+1)/xt[0],Zt=he*ot,oe=he*nt,st=zt/(-ot+nt),Ot=st*-ot;if(ut.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(Ot),j.translateZ(st),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),St[10]===-1)j.projectionMatrix.copy(ut.projectionMatrix),j.projectionMatrixInverse.copy(ut.projectionMatrixInverse);else{let It=he+st,O=Xt+st,Ee=Zt-Ot,Rt=oe+(zt-Ot),A=Wt*Xt/O*It,v=V*Xt/O*It;j.projectionMatrix.makePerspective(Ee,Rt,A,v,It,O),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function at(j,ut){ut===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(ut.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(s===null)return;let ut=j.near,ct=j.far;m.texture!==null&&(m.depthNear>0&&(ut=m.depthNear),m.depthFar>0&&(ct=m.depthFar)),D.near=R.near=y.near=ut,D.far=R.far=y.far=ct,(z!==D.near||W!==D.far)&&(s.updateRenderState({depthNear:D.near,depthFar:D.far}),z=D.near,W=D.far),D.layers.mask=j.layers.mask|6,y.layers.mask=D.layers.mask&-5,R.layers.mask=D.layers.mask&-3;let zt=j.parent,St=D.cameras;at(D,zt);for(let xt=0;xt<St.length;xt++)at(St[xt],zt);St.length===2?lt(D,y,R):D.projectionMatrix.copy(y.projectionMatrix),gt(j,D,zt)};function gt(j,ut,ct){ct===null?j.matrix.copy(ut.matrixWorld):(j.matrix.copy(ct.matrixWorld),j.matrix.invert(),j.matrix.multiply(ut.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(ut.projectionMatrix),j.projectionMatrixInverse.copy(ut.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=Hs*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(j){l=j,u!==null&&(u.fixedFoveation=j),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=j)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(D)},this.getCameraTexture=function(j){return p[j]};let yt=null;function jt(j,ut){if(h=ut.getViewerPose(c||o),g=ut,h!==null){let ct=h.views;f!==null&&(t.setRenderTargetFramebuffer(_,f.framebuffer),t.setRenderTarget(_));let zt=!1;ct.length!==D.cameras.length&&(D.cameras.length=0,zt=!0);for(let Xt=0;Xt<ct.length;Xt++){let Wt=ct[Xt],V=null;if(f!==null)V=f.getViewport(Wt);else{let nt=d.getViewSubImage(u,Wt);V=nt.viewport,Xt===0&&(t.setRenderTargetTextures(_,nt.colorTexture,nt.depthStencilTexture),t.setRenderTarget(_))}let ot=P[Xt];ot===void 0&&(ot=new He,ot.layers.enable(Xt),ot.viewport=new Te,P[Xt]=ot),ot.matrix.fromArray(Wt.transform.matrix),ot.matrix.decompose(ot.position,ot.quaternion,ot.scale),ot.projectionMatrix.fromArray(Wt.projectionMatrix),ot.projectionMatrixInverse.copy(ot.projectionMatrix).invert(),ot.viewport.set(V.x,V.y,V.width,V.height),Xt===0&&(D.matrix.copy(ot.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),zt===!0&&D.cameras.push(ot)}let St=s.enabledFeatures;if(St&&St.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&b){d=n.getBinding();let Xt=d.getDepthInformation(ct[0]);Xt&&Xt.isValid&&Xt.texture&&m.init(Xt,s.renderState)}if(St&&St.includes("camera-access")&&b){t.state.unbindTexture(),d=n.getBinding();for(let Xt=0;Xt<ct.length;Xt++){let Wt=ct[Xt].camera;if(Wt){let V=p[Wt];V||(V=new zr,p[Wt]=V);let ot=d.getCameraImage(Wt);V.sourceTexture=ot}}}}for(let ct=0;ct<M.length;ct++){let zt=T[ct],St=M[ct];zt!==null&&St!==void 0&&St.update(zt,ut,c||o)}yt&&yt(j,ut),ut.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ut}),g=null}let Pt=new ad;Pt.setAnimationLoop(jt),this.setAnimationLoop=function(j){yt=j},this.dispose=function(){}}},dv=new ne,fd=new Qt;fd.set(-1,0,0,0,1,0,0,0,1);function fv(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Yc(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,S,C,_){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(m,p):p.isMeshLambertMaterial?(r(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(m,p),d(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(m,p),u(m,p),p.isMeshPhysicalMaterial&&f(m,p,_)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),b(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,S,C):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===rn&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===rn&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let S=t.get(p),C=S.envMap,_=S.envMapRotation;C&&(m.envMap.value=C,m.envMapRotation.value.setFromMatrix4(dv.makeRotationFromEuler(_)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(fd),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,S,C){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=C*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function d(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===rn&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function b(m,p){let S=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function pv(i,t,e,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,M){let T=M.program;n.uniformBlockBinding(_,T)}function c(_,M){let T=s[_.id];T===void 0&&(m(_),T=h(_),s[_.id]=T,_.addEventListener("dispose",S));let w=M.program;n.updateUBOMapping(_,w);let x=t.render.frame;r[_.id]!==x&&(u(_),r[_.id]=x)}function h(_){let M=d();_.__bindingPointIndex=M;let T=i.createBuffer(),w=_.__size,x=_.usage;return i.bindBuffer(i.UNIFORM_BUFFER,T),i.bufferData(i.UNIFORM_BUFFER,w,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,M,T),T}function d(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return Jt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(_){let M=s[_.id],T=_.uniforms,w=_.__cache;i.bindBuffer(i.UNIFORM_BUFFER,M);for(let x=0,y=T.length;x<y;x++){let R=T[x];if(Array.isArray(R))for(let P=0,D=R.length;P<D;P++)f(R[P],x,P,w);else f(R,x,0,w)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(_,M,T,w){if(b(_,M,T,w)===!0){let x=_.__offset,y=_.value;if(Array.isArray(y)){let R=0;for(let P=0;P<y.length;P++){let D=y[P],z=p(D);g(D,_.__data,R),typeof D!="number"&&typeof D!="boolean"&&!D.isMatrix3&&!ArrayBuffer.isView(D)&&(R+=z.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(y,_.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,_.__data)}}function g(_,M,T){typeof _=="number"||typeof _=="boolean"?M[0]=_:_.isMatrix3?(M[0]=_.elements[0],M[1]=_.elements[1],M[2]=_.elements[2],M[3]=0,M[4]=_.elements[3],M[5]=_.elements[4],M[6]=_.elements[5],M[7]=0,M[8]=_.elements[6],M[9]=_.elements[7],M[10]=_.elements[8],M[11]=0):ArrayBuffer.isView(_)?M.set(new _.constructor(_.buffer,_.byteOffset,M.length)):_.toArray(M,T)}function b(_,M,T,w){let x=_.value,y=M+"_"+T;if(w[y]===void 0)return typeof x=="number"||typeof x=="boolean"?w[y]=x:ArrayBuffer.isView(x)?w[y]=x.slice():w[y]=x.clone(),!0;{let R=w[y];if(typeof x=="number"||typeof x=="boolean"){if(R!==x)return w[y]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(R.equals(x)===!1)return R.copy(x),!0}}return!1}function m(_){let M=_.uniforms,T=0,w=16;for(let y=0,R=M.length;y<R;y++){let P=Array.isArray(M[y])?M[y]:[M[y]];for(let D=0,z=P.length;D<z;D++){let W=P[D],N=Array.isArray(W.value)?W.value:[W.value];for(let k=0,U=N.length;k<U;k++){let X=N[k],K=p(X),lt=T%w,at=lt%K.boundary,gt=lt+at;T+=at,gt!==0&&w-gt<K.storage&&(T+=w-gt),W.__data=new Float32Array(K.storage/Float32Array.BYTES_PER_ELEMENT),W.__offset=T,T+=K.storage}}}let x=T%w;return x>0&&(T+=w-x),_.__size=T,_.__cache={},this}function p(_){let M={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(M.boundary=4,M.storage=4):_.isVector2?(M.boundary=8,M.storage=8):_.isVector3||_.isColor?(M.boundary=16,M.storage=12):_.isVector4?(M.boundary=16,M.storage=16):_.isMatrix3?(M.boundary=48,M.storage=48):_.isMatrix4?(M.boundary=64,M.storage=64):_.isTexture?Kt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(_)?(M.boundary=16,M.storage=_.byteLength):Kt("WebGLRenderer: Unsupported uniform value type.",_),M}function S(_){let M=_.target;M.removeEventListener("dispose",S);let T=o.indexOf(M.__bindingPointIndex);o.splice(T,1),i.deleteBuffer(s[M.id]),delete s[M.id],delete r[M.id]}function C(){for(let _ in s)i.deleteBuffer(s[_]);o=[],s={},r={}}return{bind:l,update:c,dispose:C}}var mv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),di=null;function gv(){return di===null&&(di=new Xn(mv,16,16,qi,qe),di.name="DFG_LUT",di.minFilter=en,di.magFilter=en,di.wrapS=ri,di.wrapT=ri,di.generateMipmaps=!1,di.needsUpdate=!0),di}var Sl=class{constructor(t={}){let{canvas:e=Du(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=Qe}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;let b=f,m=new Set([Va,za,ka]),p=new Set([Qe,Zn,Qs,Xi,Fa,Oa]),S=new Uint32Array(4),C=new Int32Array(4),_=new F,M=null,T=null,w=[],x=[],y=null;this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Yn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,P=!1,D=null,z=null,W=null,N=null;this._outputColorSpace=Ge;let k=0,U=0,X=null,K=-1,lt=null,at=new Te,gt=new Te,yt=null,jt=new Dt(0),Pt=0,j=e.width,ut=e.height,ct=1,zt=null,St=null,xt=new Te(0,0,j,ut),he=new Te(0,0,j,ut),Xt=!1,Wt=new Zs,V=!1,ot=!1,nt=new ne,Zt=new F,oe=new Te,st={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ot=!1;function It(){return X===null?ct:1}let O=n;function Ee(E,G){return e.getContext(E,G)}try{let E={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"185"}`),e.addEventListener("webglcontextlost",xe,!1),e.addEventListener("webglcontextrestored",ie,!1),e.addEventListener("webglcontextcreationerror",xn,!1),O===null){let G="webgl2";if(O=Ee(G,E),O===null)throw Ee(G)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(E){throw Jt("WebGLRenderer: "+E.message),E}let Rt,A,v,H,q,et,dt,vt,J,rt,tt,kt,_t,mt,Bt,Ht,$t,B,Mt,Q,Tt,Et,ht;function ft(){Rt=new S0(O),Rt.init(),Tt=new cv(O,Rt),A=new m0(O,Rt,t,Tt),v=new av(O,Rt),A.reversedDepthBuffer&&u&&v.buffers.depth.setReversed(!0),z=O.createFramebuffer(),W=O.createFramebuffer(),N=O.createFramebuffer(),H=new E0(O),q=new Yx,et=new lv(O,Rt,v,q,A,Tt,H),dt=new M0(R),vt=new Pp(O),Et=new f0(O,vt),J=new w0(O,vt,H,Et),rt=new C0(O,J,vt,Et,H),B=new A0(O,A,et),Bt=new g0(q),tt=new qx(R,dt,Rt,A,Et,Bt),kt=new fv(R,q),_t=new $x,mt=new ev(Rt),$t=new d0(R,dt,v,rt,g,l),Ht=new ov(R,rt,A),ht=new pv(O,H,A,v),Mt=new p0(O,Rt,H),Q=new T0(O,Rt,H),H.programs=tt.programs,R.capabilities=A,R.extensions=Rt,R.properties=q,R.renderLists=_t,R.shadowMap=Ht,R.state=v,R.info=H}ft(),b!==Qe&&(y=new P0(b,e.width,e.height,a,s,r));let Ut=new uh(R,O);this.xr=Ut,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let E=Rt.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){let E=Rt.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return ct},this.setPixelRatio=function(E){E!==void 0&&(ct=E,this.setSize(j,ut,!1))},this.getSize=function(E){return E.set(j,ut)},this.setSize=function(E,G,$=!0){if(Ut.isPresenting){Kt("WebGLRenderer: Can't change size while VR device is presenting.");return}j=E,ut=G,e.width=Math.floor(E*ct),e.height=Math.floor(G*ct),$===!0&&(e.style.width=E+"px",e.style.height=G+"px"),y!==null&&y.setSize(e.width,e.height),this.setViewport(0,0,E,G)},this.getDrawingBufferSize=function(E){return E.set(j*ct,ut*ct).floor()},this.setDrawingBufferSize=function(E,G,$){j=E,ut=G,ct=$,e.width=Math.floor(E*$),e.height=Math.floor(G*$),this.setViewport(0,0,E,G)},this.setEffects=function(E){if(b===Qe){Jt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(E){for(let G=0;G<E.length;G++)if(E[G].isOutputPass===!0){Kt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}y.setEffects(E||[])},this.getCurrentViewport=function(E){return E.copy(at)},this.getViewport=function(E){return E.copy(xt)},this.setViewport=function(E,G,$,Z){E.isVector4?xt.set(E.x,E.y,E.z,E.w):xt.set(E,G,$,Z),v.viewport(at.copy(xt).multiplyScalar(ct).round())},this.getScissor=function(E){return E.copy(he)},this.setScissor=function(E,G,$,Z){E.isVector4?he.set(E.x,E.y,E.z,E.w):he.set(E,G,$,Z),v.scissor(gt.copy(he).multiplyScalar(ct).round())},this.getScissorTest=function(){return Xt},this.setScissorTest=function(E){v.setScissorTest(Xt=E)},this.setOpaqueSort=function(E){zt=E},this.setTransparentSort=function(E){St=E},this.getClearColor=function(E){return E.copy($t.getClearColor())},this.setClearColor=function(){$t.setClearColor(...arguments)},this.getClearAlpha=function(){return $t.getClearAlpha()},this.setClearAlpha=function(){$t.setClearAlpha(...arguments)},this.clear=function(E=!0,G=!0,$=!0){let Z=0;if(E){let Y=!1;if(X!==null){let At=X.texture.format;Y=m.has(At)}if(Y){let At=X.texture.type,Nt=p.has(At),bt=$t.getClearColor(),Vt=$t.getClearAlpha(),Gt=bt.r,te=bt.g,se=bt.b;Nt?(S[0]=Gt,S[1]=te,S[2]=se,S[3]=Vt,O.clearBufferuiv(O.COLOR,0,S)):(C[0]=Gt,C[1]=te,C[2]=se,C[3]=Vt,O.clearBufferiv(O.COLOR,0,C))}else Z|=O.COLOR_BUFFER_BIT}G&&(Z|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),$&&(Z|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),Z!==0&&O.clear(Z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(E){E.setRenderer(this),D=E},this.dispose=function(){e.removeEventListener("webglcontextlost",xe,!1),e.removeEventListener("webglcontextrestored",ie,!1),e.removeEventListener("webglcontextcreationerror",xn,!1),$t.dispose(),_t.dispose(),mt.dispose(),q.dispose(),dt.dispose(),rt.dispose(),Et.dispose(),ht.dispose(),tt.dispose(),Ut.dispose(),Ut.removeEventListener("sessionstart",fr),Ut.removeEventListener("sessionend",Ms),gi.stop()};function xe(E){E.preventDefault(),Wc("WebGLRenderer: Context Lost."),P=!0}function ie(){Wc("WebGLRenderer: Context Restored."),P=!1;let E=H.autoReset,G=Ht.enabled,$=Ht.autoUpdate,Z=Ht.needsUpdate,Y=Ht.type;ft(),H.autoReset=E,Ht.enabled=G,Ht.autoUpdate=$,Ht.needsUpdate=Z,Ht.type=Y}function xn(E){Jt("WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function fe(E){let G=E.target;G.removeEventListener("dispose",fe),ti(G)}function ti(E){ys(E),q.remove(E)}function ys(E){let G=q.get(E).programs;G!==void 0&&(G.forEach(function($){tt.releaseProgram($)}),E.isShaderMaterial&&tt.releaseShaderCache(E))}this.renderBufferDirect=function(E,G,$,Z,Y,At){G===null&&(G=st);let Nt=Y.isMesh&&Y.matrixWorld.determinantAffine()<0,bt=Io(E,G,$,Z,Y);v.setMaterial(Z,Nt);let Vt=$.index,Gt=1;if(Z.wireframe===!0){if(Vt=J.getWireframeAttribute($),Vt===void 0)return;Gt=2}let te=$.drawRange,se=$.attributes.position,qt=te.start*Gt,ve=(te.start+te.count)*Gt;At!==null&&(qt=Math.max(qt,At.start*Gt),ve=Math.min(ve,(At.start+At.count)*Gt)),Vt!==null?(qt=Math.max(qt,0),ve=Math.min(ve,Vt.count)):se!=null&&(qt=Math.max(qt,0),ve=Math.min(ve,se.count));let Le=ve-qt;if(Le<0||Le===1/0)return;Et.setup(Y,Z,bt,$,Vt);let ge,ye=Mt;if(Vt!==null&&(ge=vt.get(Vt),ye=Q,ye.setIndex(ge)),Y.isMesh)Z.wireframe===!0?(v.setLineWidth(Z.wireframeLinewidth*It()),ye.setMode(O.LINES)):ye.setMode(O.TRIANGLES);else if(Y.isLine){let Ke=Z.linewidth;Ke===void 0&&(Ke=1),v.setLineWidth(Ke*It()),Y.isLineSegments?ye.setMode(O.LINES):Y.isLineLoop?ye.setMode(O.LINE_LOOP):ye.setMode(O.LINE_STRIP)}else Y.isPoints?ye.setMode(O.POINTS):Y.isSprite&&ye.setMode(O.TRIANGLES);if(Y.isBatchedMesh)if(Rt.get("WEBGL_multi_draw"))ye.renderMultiDraw(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount);else{let Ke=Y._multiDrawStarts,Lt=Y._multiDrawCounts,an=Y._multiDrawCount,pe=Vt?vt.get(Vt).bytesPerElement:1,ze=q.get(Z).currentProgram.getUniforms();for(let Sn=0;Sn<an;Sn++)ze.setValue(O,"_gl_DrawID",Sn),ye.render(Ke[Sn]/pe,Lt[Sn])}else if(Y.isInstancedMesh)ye.renderInstances(qt,Le,Y.count);else if($.isInstancedBufferGeometry){let Ke=$._maxInstanceCount!==void 0?$._maxInstanceCount:1/0,Lt=Math.min($.instanceCount,Ke);ye.renderInstances(qt,Le,Lt)}else ye.render(qt,Le)};function Ue(E,G,$){E.transparent===!0&&E.side===ci&&E.forceSinglePass===!1?(E.side=rn,E.needsUpdate=!0,ei(E,G,$),E.side=Si,E.needsUpdate=!0,ei(E,G,$),E.side=ci):ei(E,G,$)}this.compile=function(E,G,$=null){$===null&&($=E),T=mt.get($),T.init(G),x.push(T),$.traverseVisible(function(Y){Y.isLight&&Y.layers.test(G.layers)&&(T.pushLight(Y),Y.castShadow&&T.pushShadow(Y))}),E!==$&&E.traverseVisible(function(Y){Y.isLight&&Y.layers.test(G.layers)&&(T.pushLight(Y),Y.castShadow&&T.pushShadow(Y))}),T.setupLights();let Z=new Set;return E.traverse(function(Y){if(!(Y.isMesh||Y.isPoints||Y.isLine||Y.isSprite))return;let At=Y.material;if(At)if(Array.isArray(At))for(let Nt=0;Nt<At.length;Nt++){let bt=At[Nt];Ue(bt,$,Y),Z.add(bt)}else Ue(At,$,Y),Z.add(At)}),T=x.pop(),Z},this.compileAsync=function(E,G,$=null){let Z=this.compile(E,G,$);return new Promise(Y=>{function At(){if(Z.forEach(function(Nt){q.get(Nt).currentProgram.isReady()&&Z.delete(Nt)}),Z.size===0){Y(E);return}setTimeout(At,10)}Rt.get("KHR_parallel_shader_compile")!==null?At():setTimeout(At,10)})};let bs=null;function $l(E){bs&&bs(E)}function fr(){gi.stop()}function Ms(){gi.start()}let gi=new ad;gi.setAnimationLoop($l),typeof self<"u"&&gi.setContext(self),this.setAnimationLoop=function(E){bs=E,Ut.setAnimationLoop(E),E===null?gi.stop():gi.start()},Ut.addEventListener("sessionstart",fr),Ut.addEventListener("sessionend",Ms),this.render=function(E,G){if(G!==void 0&&G.isCamera!==!0){Jt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;D!==null&&D.renderStart(E,G);let $=Ut.enabled===!0&&Ut.isPresenting===!0,Z=y!==null&&(X===null||$)&&y.begin(R,X);if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),G.parent===null&&G.matrixWorldAutoUpdate===!0&&G.updateMatrixWorld(),Ut.enabled===!0&&Ut.isPresenting===!0&&(y===null||y.isCompositing()===!1)&&(Ut.cameraAutoUpdate===!0&&Ut.updateCamera(G),G=Ut.getCamera()),E.isScene===!0&&E.onBeforeRender(R,E,G,X),T=mt.get(E,x.length),T.init(G),T.state.textureUnits=et.getTextureUnits(),x.push(T),nt.multiplyMatrices(G.projectionMatrix,G.matrixWorldInverse),Wt.setFromProjectionMatrix(nt,Hn,G.reversedDepth),ot=this.localClippingEnabled,V=Bt.init(this.clippingPlanes,ot),M=_t.get(E,w.length),M.init(),w.push(M),Ut.enabled===!0&&Ut.isPresenting===!0){let Nt=R.xr.getDepthSensingMesh();Nt!==null&&pr(Nt,G,-1/0,R.sortObjects)}pr(E,G,0,R.sortObjects),M.finish(),R.sortObjects===!0&&M.sort(zt,St,G.reversedDepth),Ot=Ut.enabled===!1||Ut.isPresenting===!1||Ut.hasDepthSensing()===!1,Ot&&$t.addToRenderList(M,E),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),V===!0&&Bt.beginShadows();let Y=T.state.shadowsArray;if(Ht.render(Y,E,G),V===!0&&Bt.endShadows(),(Z&&y.hasRenderPass())===!1){let Nt=M.opaque,bt=M.transmissive;if(T.setupLights(),G.isArrayCamera){let Vt=G.cameras;if(bt.length>0)for(let Gt=0,te=Vt.length;Gt<te;Gt++){let se=Vt[Gt];mr(Nt,bt,E,se)}Ot&&$t.render(E);for(let Gt=0,te=Vt.length;Gt<te;Gt++){let se=Vt[Gt];Ki(M,E,se,se.viewport)}}else bt.length>0&&mr(Nt,bt,E,G),Ot&&$t.render(E),Ki(M,E,G)}X!==null&&U===0&&(et.updateMultisampleRenderTarget(X),et.updateRenderTargetMipmap(X)),Z&&y.end(R),E.isScene===!0&&E.onAfterRender(R,E,G),Et.resetDefaultState(),K=-1,lt=null,x.pop(),x.length>0?(T=x[x.length-1],et.setTextureUnits(T.state.textureUnits),V===!0&&Bt.setGlobalState(R.clippingPlanes,T.state.camera)):T=null,w.pop(),w.length>0?M=w[w.length-1]:M=null,D!==null&&D.renderEnd()};function pr(E,G,$,Z){if(E.visible===!1)return;if(E.layers.test(G.layers)){if(E.isGroup)$=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(G);else if(E.isLightProbeGrid)T.pushLightProbeGrid(E);else if(E.isLight)T.pushLight(E),E.castShadow&&T.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||Wt.intersectsSprite(E)){Z&&oe.setFromMatrixPosition(E.matrixWorld).applyMatrix4(nt);let Nt=rt.update(E),bt=E.material;bt.visible&&M.push(E,Nt,bt,$,oe.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||Wt.intersectsObject(E))){let Nt=rt.update(E),bt=E.material;if(Z&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),oe.copy(E.boundingSphere.center)):(Nt.boundingSphere===null&&Nt.computeBoundingSphere(),oe.copy(Nt.boundingSphere.center)),oe.applyMatrix4(E.matrixWorld).applyMatrix4(nt)),Array.isArray(bt)){let Vt=Nt.groups;for(let Gt=0,te=Vt.length;Gt<te;Gt++){let se=Vt[Gt],qt=bt[se.materialIndex];qt&&qt.visible&&M.push(E,Nt,qt,$,oe.z,se)}}else bt.visible&&M.push(E,Nt,bt,$,oe.z,null)}}let At=E.children;for(let Nt=0,bt=At.length;Nt<bt;Nt++)pr(At[Nt],G,$,Z)}function Ki(E,G,$,Z){let{opaque:Y,transmissive:At,transparent:Nt}=E;T.setupLightsView($),V===!0&&Bt.setGlobalState(R.clippingPlanes,$),Z&&v.viewport(at.copy(Z)),Y.length>0&&Ji(Y,G,$),At.length>0&&Ji(At,G,$),Nt.length>0&&Ji(Nt,G,$),v.buffers.depth.setTest(!0),v.buffers.depth.setMask(!0),v.buffers.color.setMask(!0),v.setPolygonOffset(!1)}function mr(E,G,$,Z){if(($.isScene===!0?$.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[Z.id]===void 0){let qt=Rt.has("EXT_color_buffer_half_float")||Rt.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[Z.id]=new Ie(1,1,{generateMipmaps:!0,type:qt?qe:Qe,minFilter:Wi,samples:Math.max(4,A.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ue.workingColorSpace})}let At=T.state.transmissionRenderTarget[Z.id],Nt=Z.viewport||at;At.setSize(Nt.z*R.transmissionResolutionScale,Nt.w*R.transmissionResolutionScale);let bt=R.getRenderTarget(),Vt=R.getActiveCubeFace(),Gt=R.getActiveMipmapLevel();R.setRenderTarget(At),R.getClearColor(jt),Pt=R.getClearAlpha(),Pt<1&&R.setClearColor(16777215,.5),R.clear(),Ot&&$t.render($);let te=R.toneMapping;R.toneMapping=Yn;let se=Z.viewport;if(Z.viewport!==void 0&&(Z.viewport=void 0),T.setupLightsView(Z),V===!0&&Bt.setGlobalState(R.clippingPlanes,Z),Ji(E,$,Z),et.updateMultisampleRenderTarget(At),et.updateRenderTargetMipmap(At),Rt.has("WEBGL_multisampled_render_to_texture")===!1){let qt=!1;for(let ve=0,Le=G.length;ve<Le;ve++){let ge=G[ve],{object:ye,geometry:Ke,material:Lt,group:an}=ge;if(Lt.side===ci&&ye.layers.test(Z.layers)){let pe=Lt.side;Lt.side=rn,Lt.needsUpdate=!0,Ss(ye,$,Z,Ke,Lt,an),Lt.side=pe,Lt.needsUpdate=!0,qt=!0}}qt===!0&&(et.updateMultisampleRenderTarget(At),et.updateRenderTargetMipmap(At))}R.setRenderTarget(bt,Vt,Gt),R.setClearColor(jt,Pt),se!==void 0&&(Z.viewport=se),R.toneMapping=te}function Ji(E,G,$){let Z=G.isScene===!0?G.overrideMaterial:null;for(let Y=0,At=E.length;Y<At;Y++){let Nt=E[Y],{object:bt,geometry:Vt,group:Gt}=Nt,te=Nt.material;te.allowOverride===!0&&Z!==null&&(te=Z),bt.layers.test($.layers)&&Ss(bt,G,$,Vt,te,Gt)}}function Ss(E,G,$,Z,Y,At){E.onBeforeRender(R,G,$,Z,Y,At),E.modelViewMatrix.multiplyMatrices($.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),Y.onBeforeRender(R,G,$,Z,E,At),Y.transparent===!0&&Y.side===ci&&Y.forceSinglePass===!1?(Y.side=rn,Y.needsUpdate=!0,R.renderBufferDirect($,G,Z,Y,E,At),Y.side=Si,Y.needsUpdate=!0,R.renderBufferDirect($,G,Z,Y,E,At),Y.side=ci):R.renderBufferDirect($,G,Z,Y,E,At),E.onAfterRender(R,G,$,Z,Y,At)}function ei(E,G,$){G.isScene!==!0&&(G=st);let Z=q.get(E),Y=T.state.lights,At=T.state.shadowsArray,Nt=Y.state.version,bt=tt.getParameters(E,Y.state,At,G,$,T.state.lightProbeGridArray),Vt=tt.getProgramCacheKey(bt),Gt=Z.programs;Z.environment=E.isMeshStandardMaterial||E.isMeshLambertMaterial||E.isMeshPhongMaterial?G.environment:null,Z.fog=G.fog;let te=E.isMeshStandardMaterial||E.isMeshLambertMaterial&&!E.envMap||E.isMeshPhongMaterial&&!E.envMap;Z.envMap=dt.get(E.envMap||Z.environment,te),Z.envMapRotation=Z.environment!==null&&E.envMap===null?G.environmentRotation:E.envMapRotation,Gt===void 0&&(E.addEventListener("dispose",fe),Gt=new Map,Z.programs=Gt);let se=Gt.get(Vt);if(se!==void 0){if(Z.currentProgram===se&&Z.lightsStateVersion===Nt)return gr(E,bt),se}else bt.uniforms=tt.getUniforms(E),D!==null&&E.isNodeMaterial&&D.build(E,$,bt),E.onBeforeCompile(bt,R),se=tt.acquireProgram(bt,Vt),Gt.set(Vt,se),Z.uniforms=bt.uniforms;let qt=Z.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(qt.clippingPlanes=Bt.uniform),gr(E,bt),Z.needsLights=ni(E),Z.lightsStateVersion=Nt,Z.needsLights&&(qt.ambientLightColor.value=Y.state.ambient,qt.lightProbe.value=Y.state.probe,qt.directionalLights.value=Y.state.directional,qt.directionalLightShadows.value=Y.state.directionalShadow,qt.spotLights.value=Y.state.spot,qt.spotLightShadows.value=Y.state.spotShadow,qt.rectAreaLights.value=Y.state.rectArea,qt.ltc_1.value=Y.state.rectAreaLTC1,qt.ltc_2.value=Y.state.rectAreaLTC2,qt.pointLights.value=Y.state.point,qt.pointLightShadows.value=Y.state.pointShadow,qt.hemisphereLights.value=Y.state.hemi,qt.directionalShadowMatrix.value=Y.state.directionalShadowMatrix,qt.spotLightMatrix.value=Y.state.spotLightMatrix,qt.spotLightMap.value=Y.state.spotLightMap,qt.pointShadowMatrix.value=Y.state.pointShadowMatrix),Z.lightProbeGrid=T.state.lightProbeGridArray.length>0,Z.currentProgram=se,Z.uniformsList=null,se}function Ri(E){if(E.uniformsList===null){let G=E.currentProgram.getUniforms();E.uniformsList=ir.seqWithValue(G.seq,E.uniforms)}return E.uniformsList}function gr(E,G){let $=q.get(E);$.outputColorSpace=G.outputColorSpace,$.batching=G.batching,$.batchingColor=G.batchingColor,$.instancing=G.instancing,$.instancingColor=G.instancingColor,$.instancingMorph=G.instancingMorph,$.skinning=G.skinning,$.morphTargets=G.morphTargets,$.morphNormals=G.morphNormals,$.morphColors=G.morphColors,$.morphTargetsCount=G.morphTargetsCount,$.numClippingPlanes=G.numClippingPlanes,$.numIntersection=G.numClipIntersection,$.vertexAlphas=G.vertexAlphas,$.vertexTangents=G.vertexTangents,$.toneMapping=G.toneMapping}function Po(E,G){if(E.length===0)return null;if(E.length===1)return E[0].texture!==null?E[0]:null;_.setFromMatrixPosition(G.matrixWorld);for(let $=0,Z=E.length;$<Z;$++){let Y=E[$];if(Y.texture!==null&&Y.boundingBox.containsPoint(_))return Y}return null}function Io(E,G,$,Z,Y){G.isScene!==!0&&(G=st),et.resetTextureUnits();let At=G.fog,Nt=Z.isMeshStandardMaterial||Z.isMeshLambertMaterial||Z.isMeshPhongMaterial?G.environment:null,bt=X===null?R.outputColorSpace:X.isXRRenderTarget===!0?X.texture.colorSpace:ue.workingColorSpace,Vt=Z.isMeshStandardMaterial||Z.isMeshLambertMaterial&&!Z.envMap||Z.isMeshPhongMaterial&&!Z.envMap,Gt=dt.get(Z.envMap||Nt,Vt),te=Z.vertexColors===!0&&!!$.attributes.color&&$.attributes.color.itemSize===4,se=!!$.attributes.tangent&&(!!Z.normalMap||Z.anisotropy>0),qt=!!$.morphAttributes.position,ve=!!$.morphAttributes.normal,Le=!!$.morphAttributes.color,ge=Yn;Z.toneMapped&&(X===null||X.isXRRenderTarget===!0)&&(ge=R.toneMapping);let ye=$.morphAttributes.position||$.morphAttributes.normal||$.morphAttributes.color,Ke=ye!==void 0?ye.length:0,Lt=q.get(Z),an=T.state.lights;if(V===!0&&(ot===!0||E!==lt)){let Me=E===lt&&Z.id===K;Bt.setState(Z,E,Me)}let pe=!1;Z.version===Lt.__version?(Lt.needsLights&&Lt.lightsStateVersion!==an.state.version||Lt.outputColorSpace!==bt||Y.isBatchedMesh&&Lt.batching===!1||!Y.isBatchedMesh&&Lt.batching===!0||Y.isBatchedMesh&&Lt.batchingColor===!0&&Y.colorTexture===null||Y.isBatchedMesh&&Lt.batchingColor===!1&&Y.colorTexture!==null||Y.isInstancedMesh&&Lt.instancing===!1||!Y.isInstancedMesh&&Lt.instancing===!0||Y.isSkinnedMesh&&Lt.skinning===!1||!Y.isSkinnedMesh&&Lt.skinning===!0||Y.isInstancedMesh&&Lt.instancingColor===!0&&Y.instanceColor===null||Y.isInstancedMesh&&Lt.instancingColor===!1&&Y.instanceColor!==null||Y.isInstancedMesh&&Lt.instancingMorph===!0&&Y.morphTexture===null||Y.isInstancedMesh&&Lt.instancingMorph===!1&&Y.morphTexture!==null||Lt.envMap!==Gt||Z.fog===!0&&Lt.fog!==At||Lt.numClippingPlanes!==void 0&&(Lt.numClippingPlanes!==Bt.numPlanes||Lt.numIntersection!==Bt.numIntersection)||Lt.vertexAlphas!==te||Lt.vertexTangents!==se||Lt.morphTargets!==qt||Lt.morphNormals!==ve||Lt.morphColors!==Le||Lt.toneMapping!==ge||Lt.morphTargetsCount!==Ke||!!Lt.lightProbeGrid!=T.state.lightProbeGridArray.length>0)&&(pe=!0):(pe=!0,Lt.__version=Z.version);let ze=Lt.currentProgram;pe===!0&&(ze=ei(Z,G,Y),D&&Z.isNodeMaterial&&D.onUpdateProgram(Z,ze,Lt));let Sn=!1,vn=!1,_n=!1,be=ze.getUniforms(),Re=Lt.uniforms;if(v.useProgram(ze.program)&&(Sn=!0,vn=!0,_n=!0),Z.id!==K&&(K=Z.id,vn=!0),Lt.needsLights){let Me=Po(T.state.lightProbeGridArray,Y);Lt.lightProbeGrid!==Me&&(Lt.lightProbeGrid=Me,vn=!0)}if(Sn||lt!==E){v.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),be.setValue(O,"projectionMatrix",E.projectionMatrix),be.setValue(O,"viewMatrix",E.matrixWorldInverse);let kn=be.map.cameraPosition;kn!==void 0&&kn.setValue(O,Zt.setFromMatrixPosition(E.matrixWorld)),A.logarithmicDepthBuffer&&be.setValue(O,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(Z.isMeshPhongMaterial||Z.isMeshToonMaterial||Z.isMeshLambertMaterial||Z.isMeshBasicMaterial||Z.isMeshStandardMaterial||Z.isShaderMaterial)&&be.setValue(O,"isOrthographic",E.isOrthographicCamera===!0),lt!==E&&(lt=E,vn=!0,_n=!0)}if(Lt.needsLights&&(an.state.directionalShadowMap.length>0&&be.setValue(O,"directionalShadowMap",an.state.directionalShadowMap,et),an.state.spotShadowMap.length>0&&be.setValue(O,"spotShadowMap",an.state.spotShadowMap,et),an.state.pointShadowMap.length>0&&be.setValue(O,"pointShadowMap",an.state.pointShadowMap,et)),Y.isSkinnedMesh){be.setOptional(O,Y,"bindMatrix"),be.setOptional(O,Y,"bindMatrixInverse");let Me=Y.skeleton;Me&&(Me.boneTexture===null&&Me.computeBoneTexture(),be.setValue(O,"boneTexture",Me.boneTexture,et))}Y.isBatchedMesh&&(be.setOptional(O,Y,"batchingTexture"),be.setValue(O,"batchingTexture",Y._matricesTexture,et),be.setOptional(O,Y,"batchingIdTexture"),be.setValue(O,"batchingIdTexture",Y._indirectTexture,et),be.setOptional(O,Y,"batchingColorTexture"),Y._colorsTexture!==null&&be.setValue(O,"batchingColorTexture",Y._colorsTexture,et));let Bn=$.morphAttributes;if((Bn.position!==void 0||Bn.normal!==void 0||Bn.color!==void 0)&&B.update(Y,$,ze),(vn||Lt.receiveShadow!==Y.receiveShadow)&&(Lt.receiveShadow=Y.receiveShadow,be.setValue(O,"receiveShadow",Y.receiveShadow)),(Z.isMeshStandardMaterial||Z.isMeshLambertMaterial||Z.isMeshPhongMaterial)&&Z.envMap===null&&G.environment!==null&&(Re.envMapIntensity.value=G.environmentIntensity),Re.dfgLUT!==void 0&&(Re.dfgLUT.value=gv()),vn){if(be.setValue(O,"toneMappingExposure",R.toneMappingExposure),Lt.needsLights&&xr(Re,_n),At&&Z.fog===!0&&kt.refreshFogUniforms(Re,At),kt.refreshMaterialUniforms(Re,Z,ct,ut,T.state.transmissionRenderTarget[E.id]),Lt.needsLights&&Lt.lightProbeGrid){let Me=Lt.lightProbeGrid;Re.probesSH.value=Me.texture,Re.probesMin.value.copy(Me.boundingBox.min),Re.probesMax.value.copy(Me.boundingBox.max),Re.probesResolution.value.copy(Me.resolution)}ir.upload(O,Ri(Lt),Re,et)}if(Z.isShaderMaterial&&Z.uniformsNeedUpdate===!0&&(ir.upload(O,Ri(Lt),Re,et),Z.uniformsNeedUpdate=!1),Z.isSpriteMaterial&&be.setValue(O,"center",Y.center),be.setValue(O,"modelViewMatrix",Y.modelViewMatrix),be.setValue(O,"normalMatrix",Y.normalMatrix),be.setValue(O,"modelMatrix",Y.matrixWorld),Z.uniformsGroups!==void 0){let Me=Z.uniformsGroups;for(let kn=0,ii=Me.length;kn<ii;kn++){let vr=Me[kn];ht.update(vr,ze),ht.bind(vr,ze)}}return ze}function xr(E,G){E.ambientLightColor.needsUpdate=G,E.lightProbe.needsUpdate=G,E.directionalLights.needsUpdate=G,E.directionalLightShadows.needsUpdate=G,E.pointLights.needsUpdate=G,E.pointLightShadows.needsUpdate=G,E.spotLights.needsUpdate=G,E.spotLightShadows.needsUpdate=G,E.rectAreaLights.needsUpdate=G,E.hemisphereLights.needsUpdate=G}function ni(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return k},this.getActiveMipmapLevel=function(){return U},this.getRenderTarget=function(){return X},this.setRenderTargetTextures=function(E,G,$){let Z=q.get(E);Z.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,Z.__autoAllocateDepthBuffer===!1&&(Z.__useRenderToTexture=!1),q.get(E.texture).__webglTexture=G,q.get(E.depthTexture).__webglTexture=Z.__autoAllocateDepthBuffer?void 0:$,Z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,G){let $=q.get(E);$.__webglFramebuffer=G,$.__useDefaultFramebuffer=G===void 0},this.setRenderTarget=function(E,G=0,$=0){X=E,k=G,U=$;let Z=null,Y=!1,At=!1;if(E){let bt=q.get(E);if(bt.__useDefaultFramebuffer!==void 0){v.bindFramebuffer(O.FRAMEBUFFER,bt.__webglFramebuffer),at.copy(E.viewport),gt.copy(E.scissor),yt=E.scissorTest,v.viewport(at),v.scissor(gt),v.setScissorTest(yt),K=-1;return}else if(bt.__webglFramebuffer===void 0)et.setupRenderTarget(E);else if(bt.__hasExternalTextures)et.rebindTextures(E,q.get(E.texture).__webglTexture,q.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){let te=E.depthTexture;if(bt.__boundDepthTexture!==te){if(te!==null&&q.has(te)&&(E.width!==te.image.width||E.height!==te.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");et.setupDepthRenderbuffer(E)}}let Vt=E.texture;(Vt.isData3DTexture||Vt.isDataArrayTexture||Vt.isCompressedArrayTexture)&&(At=!0);let Gt=q.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Gt[G])?Z=Gt[G][$]:Z=Gt[G],Y=!0):E.samples>0&&et.useMultisampledRTT(E)===!1?Z=q.get(E).__webglMultisampledFramebuffer:Array.isArray(Gt)?Z=Gt[$]:Z=Gt,at.copy(E.viewport),gt.copy(E.scissor),yt=E.scissorTest}else at.copy(xt).multiplyScalar(ct).floor(),gt.copy(he).multiplyScalar(ct).floor(),yt=Xt;if($!==0&&(Z=z),v.bindFramebuffer(O.FRAMEBUFFER,Z)&&v.drawBuffers(E,Z),v.viewport(at),v.scissor(gt),v.setScissorTest(yt),Y){let bt=q.get(E.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+G,bt.__webglTexture,$)}else if(At){let bt=G;for(let Vt=0;Vt<E.textures.length;Vt++){let Gt=q.get(E.textures[Vt]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+Vt,Gt.__webglTexture,$,bt)}}else if(E!==null&&$!==0){let bt=q.get(E.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,bt.__webglTexture,$)}K=-1},this.readRenderTargetPixels=function(E,G,$,Z,Y,At,Nt,bt=0){if(!(E&&E.isWebGLRenderTarget)){Jt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Vt=q.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&Nt!==void 0&&(Vt=Vt[Nt]),Vt){v.bindFramebuffer(O.FRAMEBUFFER,Vt);try{let Gt=E.textures[bt],te=Gt.format,se=Gt.type;if(E.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+bt),!A.textureFormatReadable(te)){Jt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!A.textureTypeReadable(se)){Jt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}G>=0&&G<=E.width-Z&&$>=0&&$<=E.height-Y&&O.readPixels(G,$,Z,Y,Tt.convert(te),Tt.convert(se),At)}finally{let Gt=X!==null?q.get(X).__webglFramebuffer:null;v.bindFramebuffer(O.FRAMEBUFFER,Gt)}}},this.readRenderTargetPixelsAsync=async function(E,G,$,Z,Y,At,Nt,bt=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Vt=q.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&Nt!==void 0&&(Vt=Vt[Nt]),Vt)if(G>=0&&G<=E.width-Z&&$>=0&&$<=E.height-Y){v.bindFramebuffer(O.FRAMEBUFFER,Vt);let Gt=E.textures[bt],te=Gt.format,se=Gt.type;if(E.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+bt),!A.textureFormatReadable(te))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!A.textureTypeReadable(se))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let qt=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,qt),O.bufferData(O.PIXEL_PACK_BUFFER,At.byteLength,O.STREAM_READ),O.readPixels(G,$,Z,Y,Tt.convert(te),Tt.convert(se),0);let ve=X!==null?q.get(X).__webglFramebuffer:null;v.bindFramebuffer(O.FRAMEBUFFER,ve);let Le=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Uu(O,Le,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,qt),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,At),O.deleteBuffer(qt),O.deleteSync(Le),At}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,G=null,$=0){let Z=Math.pow(2,-$),Y=Math.floor(E.image.width*Z),At=Math.floor(E.image.height*Z),Nt=G!==null?G.x:0,bt=G!==null?G.y:0;et.setTexture2D(E,0),O.copyTexSubImage2D(O.TEXTURE_2D,$,0,0,Nt,bt,Y,At),v.unbindTexture()},this.copyTextureToTexture=function(E,G,$=null,Z=null,Y=0,At=0){let Nt,bt,Vt,Gt,te,se,qt,ve,Le,ge=E.isCompressedTexture?E.mipmaps[At]:E.image;if($!==null)Nt=$.max.x-$.min.x,bt=$.max.y-$.min.y,Vt=$.isBox3?$.max.z-$.min.z:1,Gt=$.min.x,te=$.min.y,se=$.isBox3?$.min.z:0;else{let Re=Math.pow(2,-Y);Nt=Math.floor(ge.width*Re),bt=Math.floor(ge.height*Re),E.isDataArrayTexture?Vt=ge.depth:E.isData3DTexture?Vt=Math.floor(ge.depth*Re):Vt=1,Gt=0,te=0,se=0}Z!==null?(qt=Z.x,ve=Z.y,Le=Z.z):(qt=0,ve=0,Le=0);let ye=Tt.convert(G.format),Ke=Tt.convert(G.type),Lt;G.isData3DTexture?(et.setTexture3D(G,0),Lt=O.TEXTURE_3D):G.isDataArrayTexture||G.isCompressedArrayTexture?(et.setTexture2DArray(G,0),Lt=O.TEXTURE_2D_ARRAY):(et.setTexture2D(G,0),Lt=O.TEXTURE_2D),v.activeTexture(O.TEXTURE0),v.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,G.flipY),v.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,G.premultiplyAlpha),v.pixelStorei(O.UNPACK_ALIGNMENT,G.unpackAlignment);let an=v.getParameter(O.UNPACK_ROW_LENGTH),pe=v.getParameter(O.UNPACK_IMAGE_HEIGHT),ze=v.getParameter(O.UNPACK_SKIP_PIXELS),Sn=v.getParameter(O.UNPACK_SKIP_ROWS),vn=v.getParameter(O.UNPACK_SKIP_IMAGES);v.pixelStorei(O.UNPACK_ROW_LENGTH,ge.width),v.pixelStorei(O.UNPACK_IMAGE_HEIGHT,ge.height),v.pixelStorei(O.UNPACK_SKIP_PIXELS,Gt),v.pixelStorei(O.UNPACK_SKIP_ROWS,te),v.pixelStorei(O.UNPACK_SKIP_IMAGES,se);let _n=E.isDataArrayTexture||E.isData3DTexture,be=G.isDataArrayTexture||G.isData3DTexture;if(E.isDepthTexture){let Re=q.get(E),Bn=q.get(G),Me=q.get(Re.__renderTarget),kn=q.get(Bn.__renderTarget);v.bindFramebuffer(O.READ_FRAMEBUFFER,Me.__webglFramebuffer),v.bindFramebuffer(O.DRAW_FRAMEBUFFER,kn.__webglFramebuffer);for(let ii=0;ii<Vt;ii++)_n&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,q.get(E).__webglTexture,Y,se+ii),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,q.get(G).__webglTexture,At,Le+ii)),O.blitFramebuffer(Gt,te,Nt,bt,qt,ve,Nt,bt,O.DEPTH_BUFFER_BIT,O.NEAREST);v.bindFramebuffer(O.READ_FRAMEBUFFER,null),v.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(Y!==0||E.isRenderTargetTexture||q.has(E)){let Re=q.get(E),Bn=q.get(G);v.bindFramebuffer(O.READ_FRAMEBUFFER,W),v.bindFramebuffer(O.DRAW_FRAMEBUFFER,N);for(let Me=0;Me<Vt;Me++)_n?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Re.__webglTexture,Y,se+Me):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Re.__webglTexture,Y),be?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Bn.__webglTexture,At,Le+Me):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Bn.__webglTexture,At),Y!==0?O.blitFramebuffer(Gt,te,Nt,bt,qt,ve,Nt,bt,O.COLOR_BUFFER_BIT,O.NEAREST):be?O.copyTexSubImage3D(Lt,At,qt,ve,Le+Me,Gt,te,Nt,bt):O.copyTexSubImage2D(Lt,At,qt,ve,Gt,te,Nt,bt);v.bindFramebuffer(O.READ_FRAMEBUFFER,null),v.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else be?E.isDataTexture||E.isData3DTexture?O.texSubImage3D(Lt,At,qt,ve,Le,Nt,bt,Vt,ye,Ke,ge.data):G.isCompressedArrayTexture?O.compressedTexSubImage3D(Lt,At,qt,ve,Le,Nt,bt,Vt,ye,ge.data):O.texSubImage3D(Lt,At,qt,ve,Le,Nt,bt,Vt,ye,Ke,ge):E.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,At,qt,ve,Nt,bt,ye,Ke,ge.data):E.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,At,qt,ve,ge.width,ge.height,ye,ge.data):O.texSubImage2D(O.TEXTURE_2D,At,qt,ve,Nt,bt,ye,Ke,ge);v.pixelStorei(O.UNPACK_ROW_LENGTH,an),v.pixelStorei(O.UNPACK_IMAGE_HEIGHT,pe),v.pixelStorei(O.UNPACK_SKIP_PIXELS,ze),v.pixelStorei(O.UNPACK_SKIP_ROWS,Sn),v.pixelStorei(O.UNPACK_SKIP_IMAGES,vn),At===0&&G.generateMipmaps&&O.generateMipmap(Lt),v.unbindTexture()},this.initRenderTarget=function(E){q.get(E).__webglFramebuffer===void 0&&et.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?et.setTextureCube(E,0):E.isData3DTexture?et.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?et.setTexture2DArray(E,0):et.setTexture2D(E,0),v.unbindTexture()},this.resetState=function(){k=0,U=0,X=null,v.reset(),Et.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Hn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=ue._getDrawingBufferColorSpace(t),e.unpackColorSpace=ue._getUnpackColorSpace()}};var pi=8.5,bn=4,xo=2.8,fn=5,Ei=i=>pi-i;function xv(){let i=document.createElement("canvas");i.width=i.height=256;let t=i.getContext("2d");t.fillStyle="#c4a677",t.fillRect(0,0,256,256);for(let n=0;n<256;n+=2)t.strokeStyle=`rgba(70,45,20,${.04+n*7919%13/100})`,t.beginPath(),t.moveTo(n,0),t.lineTo(n+Math.sin(n)*3,256),t.stroke();t.strokeStyle="#8f7a5c";for(let n=0;n<256;n+=64)t.strokeRect(n,0,64,256);let e=new kr(i);return e.colorSpace=Ge,e.wrapS=e.wrapT=Ln,e}function vv(i,t){let e=new un,n=new un,s=new un,r=new un,o=new un;e.add(n,s,r,o);let a=t==="low"?16:32,l={plaster:new ke({color:"#e5e3db",roughness:.94}),oak:new ke({color:"#d8c39b",roughness:.5}),floor:new ke({map:xv(),roughness:.55}),cream:new ke({color:"#c5beaf",roughness:.9}),velvet:new ke({color:"#1d2428",roughness:.85}),black:new ke({color:"#141919",roughness:.4}),white:new ke({color:"#efeee4",roughness:.35}),gold:new ke({color:"#cfad53",roughness:.26,metalness:.82}),rug:new ke({color:"#a39d90",roughness:1}),glass:new Wr({color:"#b8d2d0",transparent:!0,opacity:.25,roughness:.1,depthWrite:!1}),glow:new ke({color:"#fff1cd",emissive:"#ffe3a2",emissiveIntensity:2.2,roughness:.24})},c=[],h=(p,S,C,_,M,T,w,x)=>{let y=new me(new li(S,C,_),x);return y.position.set(M,T,w),y.castShadow=y.receiveShadow=!0,p.add(y),y},d=(p,S,C,_,M,T,w)=>{let x=new me(new Gr(S,S,C,a),w);return x.position.set(_,M,T),x.castShadow=x.receiveShadow=!0,p.add(x),x},u=(p,S,C,_,M,T)=>{let w=new me(new Hr(S,a,Math.round(a*.6)),T);return w.position.set(C,_,M),p.add(w),w},f=(p,S,C,_)=>c.push({x1:p-C/2,x2:p+C/2,z1:S-_/2,z2:S+_/2}),g=(p,S,C,_)=>{let M=Math.hypot(C-p,_-S),T=(p+C)/2,w=(S+_)/2,x=-Math.atan2(_-S,C-p);h(s,M+.1,xo,.1,T,xo/2,w,l.plaster).rotation.y=x,h(o,M+.1,.2,.11,T,.1,w,l.plaster).rotation.y=x,c.push({x1:Math.min(p,C)-.05,x2:Math.max(p,C)+.05,z1:Math.min(S,_)-.05,z2:Math.max(S,_)+.05})};for(let[p,S]of[[0,fn],[fn,pi]]){let C=new me(new wi(S-p,bn),l.floor);C.rotation.x=-Math.PI/2,C.position.set((p+S)/2,.002,bn/2),C.receiveShadow=!0,n.add(C),h(r,S-p,.06,bn,(p+S)/2,xo+.03,bn/2,l.plaster)}g(0,0,pi,0),g(0,bn,pi,bn),g(0,0,0,bn),g(pi,0,pi,bn),g(fn,0,fn,1.4),g(fn,2.4,fn,bn),h(s,.1,xo-2.1,1,fn,2.1+(xo-2.1)/2,1.9,l.plaster);let b=new un;b.position.set(1.6,0,3.45),n.add(b),h(b,2.2,.42,.9,0,.21,0,l.cream),h(b,2.2,.5,.2,0,.65,.35,l.cream);for(let p of[-1,1])h(b,.18,.6,.9,p*1.1,.3,0,l.cream);f(1.6,3.45,2.4,.95),h(n,1.1,.06,.6,1.6,.42,2.35,l.oak);for(let[p,S]of[[-.48,-.24],[.48,-.24],[-.48,.24],[.48,.24]])h(n,.05,.4,.05,1.6+p,.2,2.35+S,l.black);f(1.6,2.35,1.1,.6),h(n,2.6,.012,1.8,1.6,.008,2.6,l.rug),h(n,1.2,.04,.8,3.7,.74,3,l.white),d(n,.05,.72,3.7,.36,3,l.gold),f(3.7,3,1.2,.8);for(let p of[-1,1])h(n,.44,.06,.44,3.7,.46,3+p*.62,l.velvet),h(n,.44,.45,.05,3.7,.7,3+p*.82,l.velvet),f(3.7,3+p*.62,.44,.44);d(n,.015,1.4,.4,.7,3.6,l.gold),u(n,.17,.4,1.5,3.6,l.glow),f(.4,3.6,.3,.3),u(r,.22,2.5,2.5,2,l.glow),d(r,.01,.3,2.5,2.65,2,l.black),h(s,.05,.7,1.25,.06,1.5,1.6,l.black);let m=d(n,.08,.3,3.7,.92,3,l.glass);m.castShadow=!1,m.userData.keep=!0,h(n,1.8,.45,2,7.3,.23,2.4,l.white),h(n,1.7,.18,1.9,7.3,.54,2.35,l.velvet),h(n,.12,1.1,2,8.3,.55,2.4,l.oak),f(7.3,2.4,1.85,2.05),h(n,.45,.5,.4,8.1,.25,.95,l.oak),u(n,.12,8.1,.7,.95,l.glow),f(8.1,.95,.45,.4),h(n,1.4,2.2,.6,6.2,1.1,.35,l.oak),f(6.2,.35,1.4,.6),u(r,.18,6.75,2.45,2.2,l.glow),e.scale.x=-1,e.position.x=pi;for(let p of c){let S=p.x1;p.x1=Ei(p.x2),p.x2=Ei(S)}return{root:e,contents:n,walls:s,ceilings:r,lowWalls:o,materials:l,collisions:c}}var vo=(i,t,e,n)=>({position:[Ei(i),t,e],intensity:n}),pd=(i,t)=>({position:[Ei(i[0]),i[1],i[2]],target:[Ei(t[0]),t[1],t[2]]}),_v={slug:"_engine-test",listing:{id:"00000000-0000-0000-0000-000000000000",title:"Engine test flat",area:"Kileleshwa",city:"Nairobi",country:"Kenya",lat:-1.28535,lng:36.77497,tzOffsetHours:3,guests:2,bedrooms:1,bathrooms:1,tagline:"A box model for engine checks.",description:"Two rooms, a few boxes of furniture."},theme:{accent:"#c9a24a",accentInk:"#1c1a14",night:"#1d2420",paper:"#f6f2e8",collection:"ENGINE TEST"},rooms:[{id:"living",name:"Living room",detail:"Sofa, dining for two.",image:1,photos:[1]},{id:"bedroom",name:"Bedroom",detail:"Bed, wardrobe, mirror.",image:2,photos:[2]}],photoUrl:i=>`/tours/_engine-test/photos/${i}.jpg`,plan:{bounds:{minX:0,maxX:pi,minZ:0,maxZ:bn},rooms:[{id:"living",x:Ei(fn),z:0,w:fn,d:bn,label:"LIVING"},{id:"bedroom",x:0,z:0,w:pi-fn,d:bn,label:"BEDROOM"}]},views:{living:pd([4.2,1.6,.8],[1.6,1,3.2]),bedroom:pd([5.75,1.6,3.3],[7.4,.9,2.2])},start:"living",inside(i,t){let e=Ei(i);return e>.06&&e<fn-.06&&t>.06&&t<bn-.06||e>fn+.06&&e<pi-.06&&t>.06&&t<bn-.06||e>fn-.1&&e<fn+.1&&t>1.45&&t<2.35},roomAt:(i,t)=>Ei(i)<fn?"living":"bedroom",build:vv,lights:{lamps:[vo(2.5,2.4,2,14),vo(.4,1.5,3.6,6),vo(3.7,2.3,3,8),vo(6.75,2.3,2.2,12),vo(8.1,.9,.95,4)],background:"#d7dbd5",exposure:.98,ambient:.46,hemi:1.05},mirror:{shape:"circle",size:[.6,.6],position:[Ei(fn+.06),1.55,3.2],rotationY:-Math.PI/2,scaleY:1.3,tint:13358023},accuracyNote:"A test model, not a real apartment."},md=_v;var gd={type:"change"},fh={type:"start"},vd={type:"end"},El=new cs,xd=new hn,yv=Math.cos(70*qc.DEG2RAD),$e=new F,Mn=2*Math.PI,Se={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},dh=1e-6,_o=class extends Qr{constructor(t,e=null){super(t,e),this.state=Se.NONE,this.target=new F,this.cursor=new F,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Vi.ROTATE,MIDDLE:Vi.DOLLY,RIGHT:Vi.PAN},this.touches={ONE:Gi.ROTATE,TWO:Gi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new F,this._lastQuaternion=new nn,this._lastTargetPosition=new F,this._quat=new nn().setFromUnitVectors(t.up,new F(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Js,this._sphericalDelta=new Js,this._scale=1,this._panOffset=new F,this._rotateStart=new Yt,this._rotateEnd=new Yt,this._rotateDelta=new Yt,this._panStart=new Yt,this._panEnd=new Yt,this._panDelta=new Yt,this._dollyStart=new Yt,this._dollyEnd=new Yt,this._dollyDelta=new Yt,this._dollyDirection=new F,this._mouse=new Yt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Mv.bind(this),this._onPointerDown=bv.bind(this),this._onPointerUp=Sv.bind(this),this._onContextMenu=Pv.bind(this),this._onMouseWheel=Ev.bind(this),this._onKeyDown=Av.bind(this),this._onTouchStart=Cv.bind(this),this._onTouchMove=Rv.bind(this),this._onMouseDown=wv.bind(this),this._onMouseMove=Tv.bind(this),this._interceptControlDown=Iv.bind(this),this._interceptControlUp=Lv.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(gd),this.update(),this.state=Se.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;$e.copy(e).sub(this.target),$e.applyQuaternion(this._quat),this._spherical.setFromVector3($e),this.autoRotate&&this.state===Se.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=Mn:n>Math.PI&&(n-=Mn),s<-Math.PI?s+=Mn:s>Math.PI&&(s-=Mn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if($e.setFromSpherical(this._spherical),$e.applyQuaternion(this._quatInverse),e.copy(this.target).add($e),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=$e.length();o=this._clampDistance(a*this._scale);let l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let a=new F(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new F(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=$e.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(El.origin.copy(this.object.position),El.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(El.direction))<yv?this.object.lookAt(this.target):(xd.setFromNormalAndCoplanarPoint(this.object.up,this.target),El.intersectPlane(xd,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>dh||8*(1-this._lastQuaternion.dot(this.object.quaternion))>dh||this._lastTargetPosition.distanceToSquared(this.target)>dh?(this.dispatchEvent(gd),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Mn/60*this.autoRotateSpeed*t:Mn/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){$e.setFromMatrixColumn(e,0),$e.multiplyScalar(-t),this._panOffset.add($e)}_panUp(t,e){this.screenSpacePanning===!0?$e.setFromMatrixColumn(e,1):($e.setFromMatrixColumn(e,0),$e.crossVectors(this.object.up,$e)),$e.multiplyScalar(t),this._panOffset.add($e)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;$e.copy(s).sub(this.target);let r=$e.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Mn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Mn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Mn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Mn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Mn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new Yt,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function bv(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function Mv(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function Sv(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(vd),this.state=Se.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function wv(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Vi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Se.DOLLY;break;case Vi.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Se.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Se.ROTATE}break;case Vi.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Se.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Se.PAN}break;default:this.state=Se.NONE}this.state!==Se.NONE&&this.dispatchEvent(fh)}function Tv(i){switch(this.state){case Se.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Se.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Se.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function Ev(i){this.enabled===!1||this.enableZoom===!1||this.state!==Se.NONE||(i.preventDefault(),this.dispatchEvent(fh),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(vd))}function Av(i){this.enabled!==!1&&this._handleKeyDown(i)}function Cv(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Gi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Se.TOUCH_ROTATE;break;case Gi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Se.TOUCH_PAN;break;default:this.state=Se.NONE}break;case 2:switch(this.touches.TWO){case Gi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Se.TOUCH_DOLLY_PAN;break;case Gi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Se.TOUCH_DOLLY_ROTATE;break;default:this.state=Se.NONE}break;default:this.state=Se.NONE}this.state!==Se.NONE&&this.dispatchEvent(fh)}function Rv(i){switch(this._trackPointer(i),this.state){case Se.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Se.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Se.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Se.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Se.NONE}}function Pv(i){this.enabled!==!1&&i.preventDefault()}function Iv(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Lv(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Al=class extends ls{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let t=new li;t.deleteAttribute("uv");let e=new ke({side:rn}),n=new ke,s=new us(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let r=new me(t,e);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let o=new Or(t,n,6),a=new je;a.position.set(-10.906,2.009,1.846),a.rotation.set(0,-.195,0),a.scale.set(2.328,7.905,4.651),a.updateMatrix(),o.setMatrixAt(0,a.matrix),a.position.set(-5.607,-.754,-.758),a.rotation.set(0,.994,0),a.scale.set(1.97,1.534,3.955),a.updateMatrix(),o.setMatrixAt(1,a.matrix),a.position.set(6.167,.857,7.803),a.rotation.set(0,.561,0),a.scale.set(3.927,6.285,3.687),a.updateMatrix(),o.setMatrixAt(2,a.matrix),a.position.set(-2.017,.018,6.124),a.rotation.set(0,.333,0),a.scale.set(2.002,4.566,2.064),a.updateMatrix(),o.setMatrixAt(3,a.matrix),a.position.set(2.291,-.756,-2.621),a.rotation.set(0,-.286,0),a.scale.set(1.546,1.552,1.496),a.updateMatrix(),o.setMatrixAt(4,a.matrix),a.position.set(-2.193,-.369,-5.547),a.rotation.set(0,.516,0),a.scale.set(3.875,3.487,2.986),a.updateMatrix(),o.setMatrixAt(5,a.matrix),this.add(o);let l=new me(t,or(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);let c=new me(t,or(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let h=new me(t,or(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);let d=new me(t,or(43));d.position.set(-.462,8.89,14.52),d.scale.set(4.38,5.441,.088),this.add(d);let u=new me(t,or(20));u.position.set(3.235,11.486,-12.541),u.scale.set(2.5,2,.1),this.add(u);let f=new me(t,or(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){let t=new Set;this.traverse(e=>{e.isMesh&&(t.add(e.geometry),t.add(e.material))});for(let e of t)e.dispose()}};function or(i){return new qr({color:0,emissive:16777215,emissiveIntensity:i})}var we=(i,t,e)=>i<t?t:i>e?e:i,Ai=(i,t,e)=>i+(t-i)*e;function on(i,t,e){let n=we((e-i)/(t-i),0,1);return n*n*(3-2*n)}var vs=(i,t)=>1-Math.exp(-i*t),ar=(i,t)=>Math.atan2(Math.sin(t-i),Math.cos(t-i)),_d=i=>i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2,yo=(i,t)=>(i%t+t)%t,yd=()=>/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname),mi=()=>new Promise(i=>setTimeout(i)),bd=1.6,ph=.16;var Dv=.1,Md=1.5,Nv={city:.55,birds:.32,crickets:.5,rain:.75},Uv=["city","birds","crickets","rain"],Rl=class{constructor(){this.ctx=null;this.master=null;this.layers=null;this.pulses=[];this.nextChirp=[0,0];this.nextPhrase=0;this.sources=[];this.timer=0;this.sleepTimer=0;this.on=!1;this.held=!1;this.level={city:0,birds:0,crickets:0,rain:0}}setOn(t){this.on=t,!(t&&!this.ctx&&!this.create())&&this.apply()}setHeld(t){this.held!==t&&(this.held=t,this.apply())}setScene(t){let e=t.elevation,n=t.hour<12,s=on(-9,-2,e)*(1-on(12,32,e))*(n?1:.2);if(this.level.birds=we(s+on(2,12,e)*.22,0,1)*(t.rain?.25:1),this.level.city=(.3+.7*on(-6,8,e))*(t.rain?.7:1),this.level.crickets=(1-on(-5,5,e))*(t.rain?.2:1),this.level.rain=t.rain?1:0,this.ctx&&this.layers){let r=this.ctx.currentTime;for(let o of Uv)this.layers[o].gain.setTargetAtTime(this.level[o]*Nv[o],r,.8)}}dispose(){clearInterval(this.timer),clearTimeout(this.sleepTimer);for(let t of this.sources)try{t.stop()}catch{}this.sources=[],this.ctx&&this.ctx.close().catch(()=>{}),this.ctx=null,this.master=null,this.layers=null}create(){let t=window.AudioContext||window.webkitAudioContext;if(!t)return!1;let e=new t({latencyHint:"playback"});this.ctx=e;let n=e.createGain();n.gain.value=0,n.connect(e.destination),this.master=n;let s=Sd(e,6,!0),r=Sd(e,3,!1),o=()=>{let u=e.createGain();return u.gain.value=0,u.connect(n),u},a={city:o(),birds:o(),crickets:o(),rain:o()};this.layers=a;let l=e.createGain();l.gain.value=.75;let c=e.createOscillator(),h=e.createGain();c.frequency.value=.031,h.gain.value=.25,c.connect(h).connect(l.gain),this.loop(s).connect(Cl(e,"lowpass",340,.6)).connect(l).connect(a.city),c.start(),this.sources.push(c),this.loop(r).connect(Cl(e,"highpass",650,.5)).connect(Cl(e,"lowpass",6200,.4)).connect(a.rain);for(let u of[4350,5150]){let f=e.createGain();f.gain.value=0,this.loop(r).connect(Cl(e,"bandpass",u,24)).connect(f).connect(a.crickets),this.pulses.push(f)}let d=e.currentTime;return this.nextChirp=[d+.2,d+.5],this.nextPhrase=d+.4,!0}loop(t){let n=this.ctx.createBufferSource();return n.buffer=t,n.loop=!0,n.loopStart=wd(t.length)/t.sampleRate,n.loopEnd=t.duration,n.start(0,n.loopStart+Math.random()*(t.duration-n.loopStart)),this.sources.push(n),n}apply(){let t=this.ctx,e=this.master;if(!t||!e)return;let n=this.on&&!this.held,s=t.currentTime;if(e.gain.cancelScheduledValues(s),e.gain.setValueAtTime(e.gain.value,s),clearTimeout(this.sleepTimer),n)t.resume().catch(()=>{}),e.gain.linearRampToValueAtTime(Dv,s+Md),this.timer||(this.timer=window.setInterval(()=>this.schedule(),200)),this.schedule();else{let r=this.on?.35:Md;e.gain.linearRampToValueAtTime(0,s+r),this.sleepTimer=window.setTimeout(()=>{clearInterval(this.timer),this.timer=0,this.ctx&&!(this.on&&!this.held)&&this.ctx.suspend().catch(()=>{})},r*1e3+120)}}schedule(){let t=this.ctx;if(!t||!this.layers||t.state!=="running")return;let e=t.currentTime+.5;for(let n=0;n<this.pulses.length;n++)for(this.nextChirp[n]<t.currentTime&&(this.nextChirp[n]=t.currentTime+.05);this.nextChirp[n]<e;){let s=this.nextChirp[n],r=this.pulses[n].gain,o=3+(Math.random()<.4?1:0);for(let a=0;a<o;a++){let l=s+a*.034;r.setValueAtTime(0,l),r.linearRampToValueAtTime(1,l+.005),r.setValueAtTime(1,l+.013),r.linearRampToValueAtTime(0,l+.019)}this.nextChirp[n]=s+.5+Math.random()*.55}if(this.level.birds>.02)for(this.nextPhrase<t.currentTime&&(this.nextPhrase=t.currentTime+.1);this.nextPhrase<e;)this.phrase(this.nextPhrase),this.nextPhrase+=(1.2+Math.random()*4.5)/(.35+this.level.birds)}phrase(t){let e=this.ctx,n=this.layers.birds,s=e.createStereoPanner?e.createStereoPanner():null;s&&(s.pan.value=Math.random()*1.6-.8,s.connect(n));let r=s||n,o=Math.random()<.5,a=2+Math.floor(Math.random()*4),l=t,c=s?[s]:[],h=null;for(let d=0;d<a;d++){let u=.05+Math.random()*.11,f=(o?3600:2300)+Math.random()*1500,g=f*(Math.random()<.6?.72+Math.random()*.2:1.12+Math.random()*.25),b=e.createOscillator(),m=e.createOscillator(),p=e.createGain(),S=e.createGain();b.frequency.setValueAtTime(f,l),b.frequency.exponentialRampToValueAtTime(g,l+u),m.frequency.value=28+Math.random()*60,p.gain.value=90+Math.random()*320,m.connect(p).connect(b.frequency),S.gain.setValueAtTime(0,l),S.gain.linearRampToValueAtTime(.5+Math.random()*.5,l+.012),S.gain.exponentialRampToValueAtTime(.001,l+u),b.connect(S).connect(r),b.start(l),m.start(l),b.stop(l+u+.02),m.stop(l+u+.02),c.push(b,m,p,S),h=b,l+=u+.035+Math.random()*.1}h&&(h.onended=()=>c.forEach(d=>d.disconnect()))}},wd=i=>Math.min(2048,i>>2);function Cl(i,t,e,n){let s=i.createBiquadFilter();return s.type=t,s.frequency.value=e,s.Q.value=n,s}function Sd(i,t,e){let n=i.createBuffer(1,Math.floor(i.sampleRate*t),i.sampleRate),s=n.getChannelData(0),r=0;for(let a=0;a<s.length;a++){let l=Math.random()*2-1;e?(r=(r+.02*l)/1.02,s[a]=r*3.5):s[a]=l*.5}let o=wd(s.length);for(let a=0;a<o;a++){let l=a/o,c=s.length-o+a;s[c]=s[c]*(1-l)+s[a]*l}return n}var Pl=class{constructor(){this.active=!1;this.t=0;this.duration=.9;this.p0=new F;this.c0=new F;this.c1=new F;this.p1=new F;this.a0=new F;this.a1=new F;this.look=new F;this.fov0=60;this.fov1=60}start(t,e,n,s,r,o,a,l,c=.9){this.p0.copy(t),this.p1.copy(s),this.c0.copy(t).y+=a,this.c1.copy(s).y+=l,a||this.c0.lerpVectors(t,s,.33),l||this.c1.lerpVectors(t,s,.66),this.a0.copy(e),this.a1.copy(r),this.fov0=n,this.fov1=o,this.duration=c,this.t=0,this.active=!0}step(t,e){if(!this.active)return!1;this.t=Math.min(1,this.t+t/this.duration);let n=_d(this.t),s=1-n,r=s*s*s,o=3*s*s*n,a=3*s*n*n,l=n*n*n;e.position.set(r*this.p0.x+o*this.c0.x+a*this.c1.x+l*this.p1.x,r*this.p0.y+o*this.c0.y+a*this.c1.y+l*this.p1.y,r*this.p0.z+o*this.c0.z+a*this.c1.z+l*this.p1.z),this.look.lerpVectors(this.a0,this.a1,n),e.lookAt(this.look);let c=this.fov0+(this.fov1-this.fov0)*n;return e.fov!==c&&(e.fov=c,e.updateProjectionMatrix()),e.updateMatrixWorld(),this.t>=1?(this.active=!1,!0):!1}cancel(){this.active=!1}};var lr=160,mh=.5,Fv=.012,Il=class{constructor(t,e,n){this.x=0;this.z=0;this.shown=!1;this.pulse=null;this.el=document.createElement("div"),this.el.style.cssText=`position:absolute;left:0;top:0;width:${lr}px;height:${lr}px;transform-origin:0 0;pointer-events:none;visibility:hidden;will-change:transform`,this.face=document.createElement("div");let s=n?e:"rgba(255,255,255,.95)";this.face.style.cssText=`position:absolute;inset:0;border-radius:50%;opacity:0;transition:opacity .22s ease;background:radial-gradient(circle,rgba(255,255,255,${n?".16":".1"}) 0 38%,transparent 43%),radial-gradient(circle,transparent 0 50%,${s} 55%,${s} 58%,transparent 64%),radial-gradient(circle,transparent 0 58%,rgba(0,0,0,.2) 63%,transparent 72%)`,this.el.appendChild(this.face),t.appendChild(this.el)}place(t,e){this.x=t,this.z=e}show(t){this.shown!==t&&(this.shown=t,this.face.style.opacity=t?"1":"0",t&&(this.el.style.visibility="visible"))}breathe(t,e){t&&!this.pulse&&!e&&this.face.animate?this.pulse=this.face.animate([{transform:"scale(.86)"},{transform:"scale(1.04)"},{transform:"scale(.86)"}],{duration:1400,iterations:1/0,easing:"ease-in-out"}):!t&&this.pulse&&(this.pulse.cancel(),this.pulse=null)}shake(t){t||!this.el.animate||this.face.animate([{transform:"translateX(0)"},{transform:"translateX(-12%)"},{transform:"translateX(10%)"},{transform:"translateX(-6%)"},{transform:"translateX(3%)"},{transform:"translateX(0)"}],{duration:420,easing:"ease-out"})}hide(){this.el.style.visibility="hidden"}},Ll=class{constructor(t,e){this.model=new ne;this.m=new ne;this.screen=new ne;this.layer=document.createElement("div"),this.layer.setAttribute("aria-hidden","true"),this.layer.style.cssText="position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict",t.appendChild(this.layer),this.cursor=new Il(this.layer,e,!1),this.target=new Il(this.layer,e,!0)}get visible(){return this.cursor.shown||this.target.shown}update(t,e,n){this.project(this.cursor,t,e,n),this.project(this.target,t,e,n)}project(t,e,n,s){if(!t.shown)return;let r=mh/lr;this.model.set(r,0,0,t.x-mh/2,0,0,1,Fv,0,r,0,t.z-mh/2,0,0,0,1),this.screen.set(n/2,0,0,n/2,0,-s/2,0,s/2,0,0,1,0,0,0,0,1),this.m.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse).multiply(this.model).premultiply(this.screen);let o=this.m.elements;if(o[15]<.05||o[3]*lr+o[15]<.05||o[7]*lr+o[15]<.05||(o[3]+o[7])*lr+o[15]<.05){t.hide();return}t.el.style.visibility="visible",t.el.style.transform=`matrix3d(${o[0]},${o[1]},${o[2]},${o[3]},${o[4]},${o[5]},${o[6]},${o[7]},${o[8]},${o[9]},${o[10]},${o[11]},${o[12]},${o[13]},${o[14]},${o[15]})`}dispose(){this.layer.remove()}};var Td={KeyW:[0,1],ArrowUp:[0,1],KeyS:[0,-1],ArrowDown:[0,-1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]},Ov=new Set(["KeyQ","KeyE","KeyR","KeyF"]),Dl=new Set(["ShiftLeft","ShiftRight"]),Bv=/^(text|search|email|url|tel|password|number|date|datetime-local|month|time|week)$/;function kv(i){return i instanceof HTMLElement?i.isContentEditable||i.tagName==="TEXTAREA"||i.tagName==="SELECT"?!0:i.tagName==="INPUT"&&Bv.test(i.type||"text"):!1}function zv(i){return i instanceof HTMLElement&&!!i.closest("input,select,[role=slider],[role=tab],[role=tablist],[role=radio],[role=radiogroup],[role=menu],[role=menuitem],[role=listbox],[role=option],[role=spinbutton]")}var Nl=i=>Math.abs(i)<.15?0:(i-Math.sign(i)*.15)/.85,Ul=class{constructor(t,e){this.canvas=t;this.sink=e;this.keys=new Set;this.padX=0;this.padZ=0;this.runHeld=!1;this.locked=!1;this.gamepads=0;this.pointers=new Map;this.pinch=null;this.gp={x:0,z:0,lookX:0,lookY:0,run:!1,a:!1,live:!1};this.gyroOn=!1;this.gyroFresh=!1;this.gyroPrimed=!1;this.gyroSeen=!1;this.gyroWaiter=null;this.orientation={alpha:0,beta:0,gamma:0};this.gyroYaw=0;this.gyroPitch=0;this.euler=new Dn;this.q=new nn;this.q0=new nn;this.q1=new nn(-Math.sqrt(.5),0,0,Math.sqrt(.5));this.zee=new F(0,0,1);this.forward=new F;this.listeners=[];this.held={strafe:0,forward:0,turn:0,pitch:0,run:!1};this.down=t=>{if(!this.sink.ready()||this.sink.paused())return;if(this.locked){if(t.button===0){let n=this.canvas.getBoundingClientRect();this.sink.tap(n.left+n.width/2,n.top+n.height/2,!1)}return}if(t.pointerType==="mouse"&&t.button!==0)return;let e=t.pointerType!=="mouse";if(e||this.canvas.focus({preventScroll:!0}),this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY,sx:t.clientX,sy:t.clientY,t:performance.now(),touch:e,moved:!1}),this.sink.mode()==="walk"){try{this.canvas.setPointerCapture(t.pointerId)}catch{}if(this.pointers.size===2){let n=0,s=0,r=0,o=!0;for(let a of this.pointers.values())a.moved=!0,o?(s=a.x,r=a.y,o=!1):n=Math.hypot(a.x-s,a.y-r);this.pinch={d0:Math.max(20,n),fov0:this.sink.fov()}}}};this.move=t=>{if(this.locked)return;let e=this.pointers.get(t.pointerId);if(!e){t.pointerType==="mouse"&&this.sink.ready()&&!this.sink.paused()&&this.sink.hover(t.clientX,t.clientY);return}let n=t.clientX-e.x,s=t.clientY-e.y;if(e.x=t.clientX,e.y=t.clientY,!e.moved&&Math.hypot(t.clientX-e.sx,t.clientY-e.sy)>(e.touch?10:5)&&(e.moved=!0,this.sink.mode()==="walk"&&this.sink.dragStart()),this.sink.mode()!=="walk"||!e.moved)return;if(this.pinch&&this.pointers.size>=2){let o=0,a=0,l=0,c=!0;for(let h of this.pointers.values())c?(a=h.x,l=h.y,c=!1):o=Math.hypot(h.x-a,h.y-l);o>0&&this.sink.setFov(this.pinch.fov0*this.pinch.d0/o);return}let r=this.sink.fov();if(e.touch){let o=r*Math.PI/180/Math.max(1,this.canvas.clientHeight);this.sink.look(n*o,s*o)}else{let o=.0034*r/60;this.sink.look(-n*o,-s*o*.85)}};this.up=t=>{let e=this.pointers.get(t.pointerId);e&&(this.pointers.delete(t.pointerId),this.pointers.size<2&&(this.pinch=null),t.type==="pointerup"&&!e.moved&&performance.now()-e.t<700&&!this.sink.paused()&&this.sink.tap(t.clientX,t.clientY,e.touch))};this.leave=t=>{t.pointerType==="mouse"&&!this.pointers.has(t.pointerId)&&this.sink.hoverEnd()};this.wheel=t=>{if(this.sink.mode()!=="walk"||!this.sink.ready()||this.sink.paused())return;t.preventDefault();let e=t.deltaMode===1?16:t.deltaMode===2?400:1;this.sink.setFov(this.sink.fov()+t.deltaY*e*.03)};this.keydown=t=>{if(!this.sink.ready()||this.sink.paused()||t.ctrlKey||t.metaKey||t.altKey||kv(t.target)||this.sink.mode()!=="walk")return;let e=t.code;if(!(e.startsWith("Arrow")&&zv(t.target))){if(Td[e]||Ov.has(e)||Dl.has(e)){Dl.has(e)||t.preventDefault(),this.keys.has(e)||(this.keys.add(e),this.recount(),Dl.has(e)||this.sink.manual(),this.sink.wake());return}t.key==="+"||t.key==="="||e==="NumpadAdd"?(t.preventDefault(),this.sink.setFov(this.sink.fov()-5)):(t.key==="-"||t.key==="_"||e==="NumpadSubtract")&&(t.preventDefault(),this.sink.setFov(this.sink.fov()+5))}};this.keyup=t=>{this.keys.delete(t.code)&&(this.recount(),this.sink.wake())};this.lockChange=()=>{let t=document.pointerLockElement===this.canvas;t!==this.locked&&(this.locked=t,this.pointers.clear(),this.sink.lockChanged(t))};this.lockedMove=t=>{if(!this.locked||this.sink.paused())return;let e=.0023*this.sink.fov()/60;this.sink.look(-t.movementX*e,-t.movementY*e)};this.padsChanged=()=>{let t=navigator.getGamepads?navigator.getGamepads():[],e=0;for(let n=0;n<t.length;n++)t[n]&&e++;this.gamepads=e,e||(this.gp.x=this.gp.z=this.gp.lookX=this.gp.lookY=0,this.gp.run=this.gp.live=!1),this.sink.wake()};this.orient=t=>{t.alpha==null||t.beta==null||t.gamma==null||(this.orientation.alpha=t.alpha,this.orientation.beta=t.beta,this.orientation.gamma=t.gamma,this.gyroFresh=!0,this.gyroSeen||(this.gyroSeen=!0,this.gyroWaiter?.(!0)),this.sink.wake())};let n=(s,r,o,a)=>{s.addEventListener(r,o,a),this.listeners.push([s,r,o,a])};n(t,"pointerdown",this.down),n(t,"pointermove",this.move),n(t,"pointerup",this.up),n(t,"pointercancel",this.up),n(t,"pointerleave",this.leave),n(t,"wheel",this.wheel,{passive:!1}),n(t,"contextmenu",s=>s.preventDefault()),n(window,"keydown",this.keydown),n(window,"keyup",this.keyup),n(window,"blur",()=>this.clear()),n(document,"pointerlockchange",this.lockChange),n(document,"mousemove",this.lockedMove),n(window,"gamepadconnected",this.padsChanged),n(window,"gamepaddisconnected",this.padsChanged),this.padsChanged()}recount(){let t=this.held;t.strafe=t.forward=t.turn=t.pitch=0,t.run=!1,this.keys.forEach(e=>{let n=Td[e];n?(t.strafe+=n[0],t.forward+=n[1]):e==="KeyQ"?t.turn+=1:e==="KeyE"?t.turn-=1:e==="KeyR"?t.pitch+=1:e==="KeyF"?t.pitch-=1:Dl.has(e)&&(t.run=!0)})}read(t){let e=this.held;return t.strafe=Math.max(-1,Math.min(1,e.strafe+this.padX+this.gp.x)),t.forward=Math.max(-1,Math.min(1,e.forward+this.padZ+this.gp.z)),t.turn=e.turn-this.gp.lookX*1.6,t.pitch=e.pitch-this.gp.lookY*1.1,t.run=this.runHeld||this.gp.run||e.run,t}get active(){return this.keys.size>0||this.padX!==0||this.padZ!==0||this.gp.live||this.gamepads>0||this.gyroOn}clear(){this.keys.clear(),this.recount(),this.padX=this.padZ=0,this.runHeld=!1,this.pointers.clear(),this.pinch=null}requestLock(t){if(t){if(document.pointerLockElement===this.canvas||!this.canvas.requestPointerLock)return;try{let e=this.canvas.requestPointerLock();e&&typeof e.catch=="function"&&e.catch(()=>this.sink.lockChanged(!1))}catch{this.sink.lockChanged(!1)}}else document.pointerLockElement===this.canvas&&document.exitPointerLock()}pollGamepad(){if(!this.gamepads||!navigator.getGamepads)return;let t=navigator.getGamepads(),e=null;for(let a=0;a<t.length;a++){let l=t[a];if(l&&l.connected){e=l;break}}if(!e||this.sink.paused()||this.sink.mode()!=="walk"){this.gp.live=!1;return}let n=e.axes;this.gp.x=Nl(n[0]||0),this.gp.z=-Nl(n[1]||0),this.gp.lookX=Nl(n[2]||0),this.gp.lookY=Nl(n[3]||0);let s=e.buttons[7];this.gp.run=!!s&&(s.pressed||s.value>.3);let r=this.gp.x!==0||this.gp.z!==0||this.gp.lookX!==0||this.gp.lookY!==0;r&&!this.gp.live&&this.sink.manual(),this.gp.live=r;let o=!!e.buttons[0]&&e.buttons[0].pressed;o&&!this.gp.a&&this.sink.nextRoom(),this.gp.a=o}async enableGyro(){let t=window.DeviceOrientationEvent;if(!t)return!1;if(typeof t.requestPermission=="function")try{if(await t.requestPermission()!=="granted")return!1}catch{return!1}this.gyroOn=!0,this.gyroPrimed=!1,this.gyroSeen=!1,window.addEventListener("deviceorientation",this.orient);let e=await new Promise(n=>{this.gyroWaiter=n,setTimeout(()=>n(this.gyroSeen),1e3)});return this.gyroWaiter=null,e||this.disableGyro(),e}disableGyro(){this.gyroOn=!1,window.removeEventListener("deviceorientation",this.orient)}gyroDelta(t){if(!this.gyroOn||!this.gyroFresh)return!1;this.gyroFresh=!1;let e=Math.PI/180,n=this.orientation,s=screen.orientation&&screen.orientation.angle||0;this.euler.set(n.beta*e,n.alpha*e,-n.gamma*e,"YXZ"),this.q.setFromEuler(this.euler).multiply(this.q1).multiply(this.q0.setFromAxisAngle(this.zee,-s*e)),this.forward.set(0,0,-1).applyQuaternion(this.q);let r=Math.atan2(this.forward.x,this.forward.z),o=Math.asin(Math.max(-1,Math.min(1,this.forward.y)));return this.gyroPrimed?(t.yaw=ar(this.gyroYaw,r),t.pitch=o-this.gyroPitch,this.gyroYaw=r,this.gyroPitch=o,t.yaw!==0||t.pitch!==0):(this.gyroPrimed=!0,this.gyroYaw=r,this.gyroPitch=o,!1)}dispose(){this.disableGyro(),document.pointerLockElement===this.canvas&&document.exitPointerLock();for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners.length=0,this.clear()}};var pn=3,Vv=3.2,Gv=.6,Fl=class{constructor(t,e){this.lights=[];this.slots=[];this.wanted=new Int32Array(pn);this.wantedDist=new Float32Array(pn);this.brightest=new Int32Array(pn).fill(-1);this.level=1;this.positions=new Float32Array(t.length*3),this.power=new Float32Array(t.length),t.forEach((s,r)=>{this.positions.set(s.position,r*3),this.power[r]=s.intensity});for(let s=0;s<pn;s++){let r=new us("#fff1d8",0,9,2);r.castShadow=!1,e.add(r),this.lights.push(r),this.slots.push({lamp:-1,fade:0})}let n=Array.from(this.power.keys()).sort((s,r)=>this.power[r]-this.power[s]);for(let s=0;s<pn&&s<n.length;s++)this.brightest[s]=n[s]}coverage(){let t=0,e=0;for(let n=0;n<this.power.length;n++)t+=this.power[n];for(let n=0;n<pn;n++){let s=this.slots[n];s.lamp>=0&&(e+=this.power[s.lamp]*s.fade)}return t>0?e/t:1}setLevel(t){this.level=t}setColor(t){for(let e=0;e<pn;e++)this.lights[e].color.copy(t)}update(t,e,n){if(!this.power.length)return!1;if(e)this.pickNearest(e);else for(let o=0;o<pn;o++)this.wanted[o]=this.brightest[o];let r=!1;for(let o=0;o<pn;o++){let a=this.slots[o],l=a.lamp>=0&&this.isWanted(a.lamp),c=l?1:0;if(!l&&(a.fade<=.001||n)){let u=this.unassigned();u!==a.lamp&&(a.lamp=u,r=!0),c=u>=0?1:0,n&&(a.fade=0)}let h=n?1:Vv*t,d=a.fade<c?Math.min(c,a.fade+h):Math.max(c,a.fade-h);d!==a.fade&&(a.fade=d,r=!0)}for(let o=0;o<pn;o++){let a=this.slots[o],l=this.lights[o],c=a.lamp>=0?this.power[a.lamp]*this.level*a.fade:0;if(l.intensity!==c&&(l.intensity=c,r=!0),a.lamp>=0){let h=a.lamp*3;l.position.set(this.positions[h],this.positions[h+1],this.positions[h+2])}}return r}isWanted(t){for(let e=0;e<pn;e++)if(this.wanted[e]===t)return!0;return!1}unassigned(){for(let t=0;t<pn;t++){let e=this.wanted[t];if(e<0)continue;let n=!1;for(let s=0;s<pn;s++)if(this.slots[s].lamp===e){n=!0;break}if(!n)return e}return-1}pickNearest(t){this.wanted.fill(-1),this.wantedDist.fill(1/0);for(let e=0;e<this.power.length;e++){let n=e*3,s=Math.hypot(this.positions[n]-t.x,this.positions[n+1]-t.y,this.positions[n+2]-t.z);for(let r=0;r<pn;r++)if(this.slots[r].lamp===e&&this.slots[r].fade>0){s-=Gv;break}for(let r=0;r<pn;r++)if(s<this.wantedDist[r]){for(let o=pn-1;o>r;o--)this.wanted[o]=this.wanted[o-1],this.wantedDist[o]=this.wantedDist[o-1];this.wanted[r]=e,this.wantedDist[r]=s;break}}}};var Kn=Math.PI/180;function bo(i){let[t,e,n]=i.split("-").map(Number);return Date.UTC(t,e-1,n)/864e5+24405875e-1}function Ed(i,t,e,n,s,r){let a=(i+(t-e)/24-2451545)/36525,l=yo(280.46646+a*(36000.76983+a*3032e-7),360),c=(357.52911+a*(35999.05029-1537e-7*a))*Kn,h=.016708634-a*(42037e-9+1267e-10*a),d=Math.sin(c)*(1.914602-a*(.004817+14e-6*a))+Math.sin(2*c)*(.019993-101e-6*a)+Math.sin(3*c)*289e-6,u=(125.04-1934.136*a)*Kn,f=(l+d-.00569-.00478*Math.sin(u))*Kn,b=(23+(26+(21.448-a*(46.815+a*(59e-5-a*.001813)))/60)/60+.00256*Math.cos(u))*Kn,m=Math.asin(Math.sin(b)*Math.sin(f)),p=Math.tan(b/2)**2,S=l*Kn,C=4/Kn*(p*Math.sin(2*S)-2*h*Math.sin(c)+4*h*p*Math.sin(c)*Math.cos(2*S)-.5*p*p*Math.sin(4*S)-1.25*h*h*Math.sin(2*c)),M=(yo(t*60+C+4*s-60*e,1440)/4-180)*Kn,T=n*Kn,w=we(Math.sin(T)*Math.sin(m)+Math.cos(T)*Math.cos(m)*Math.cos(M),-1,1),x=Math.acos(w),y=Math.cos(T)*Math.sin(x),R=n>0?180:0;if(Math.abs(y)>1e-9){let z=Math.acos(we((Math.sin(T)*w-Math.sin(m))/y,-1,1))/Kn;R=M>0?yo(z+180,360):yo(540-z,360)}let P=90-x/Kn,D=0;if(P<=85){let z=Math.tan(P*Kn);P>5?D=58.1/z-.07/z**3+86e-6/z**5:P>-.575?D=1735+P*(-518.2+P*(103.4+P*(-12.79+P*.711))):D=-20.772/z,D/=3600}return r.azimuthDeg=R,r.elevationDeg=P+D,r}function Ad(i,t){let e=we(i,1e3,4e4)/100,n,s,r;return e<=66?(n=255,s=99.4708025861*Math.log(e)-161.1195681661,r=e<=19?0:138.5177312231*Math.log(e-10)-305.0447927307):(n=329.698727446*Math.pow(e-60,-.1332047592),s=288.1221695283*Math.pow(e-60,-.0755148492),r=255),t.r=we(n,0,255)/255,t.g=we(s,0,255)/255,t.b=we(r,0,255)/255,t}var Cd=Math.PI/180,Ol=class{constructor(t,e,n,s){this.background=new Dt;this.centre=new F;this.dir=new F;this.lastDir=new F(0,-1,0);this.corner=new F;this.rgb={r:1,g:1,b:1};this.ambientNow=0;this.lampLevel=1;this.c={daySky:new Dt("#f5f9ff"),goldSky:new Dt("#ffd9b3"),nightSky:new Dt("#3a5182"),overcast:new Dt("#dde2e8"),rainSky:new Dt("#c3cfdc"),dayGround:new Dt("#b3a695"),nightGround:new Dt("#25252b"),dayAmbient:new Dt("#fff6e9"),goldAmbient:new Dt("#ffd2a1"),nightAmbient:new Dt("#ffe3c2"),lampDay:new Dt("#fff1d8"),lampNight:new Dt("#ffcf94"),cool:new Dt("#c9d4e2"),dayBg:new Dt,duskBg:new Dt("#c9a68c"),nightBg:new Dt,lamp:new Dt};let r=e.lights,o=r.hemi??1;this.base={hemi:o,ambient:r.ambient??.5,sun:r.sun??o*1.72,exposure:r.exposure??1,env:.26,glow:0},this.hemi=new Zr(this.c.daySky,this.c.dayGround,o),this.ambient=new Jr(this.c.dayAmbient,this.base.ambient),this.sun=new Kr("#fff3d9",this.base.sun),this.sun.castShadow=!0,this.sun.shadow.bias=-4e-4,this.sun.shadow.normalBias=.024,this.sun.shadow.autoUpdate=!0,t.add(this.hemi,this.ambient,this.sun,this.sun.target),this.lamps=new Fl(e.lights.lamps,t);let a=n.materials.glow;this.glow=a&&a.isMeshStandardMaterial?a:null,this.glow&&(this.base.glow=this.glow.emissiveIntensity),this.c.dayBg.set(r.background),this.c.nightBg.set(e.theme.night).lerp(new Dt("#1b2633"),.5),this.box=s.clone(),this.box.getCenter(this.centre)}setShadowSize(t){let e=this.sun.shadow;e.mapSize.x!==t&&(e.mapSize.set(t,t),e.map&&(e.map.dispose(),e.map=null))}apply(t,e,n,s,r){let o=t.elevationDeg,a=on(-2,20,o),l=on(-9,4,o),c=1-l,h=on(-3,3,o)*(1-on(6,22,o)),d=e?e.cloud:0,u=!!(e&&e.rain),f=this.c,g=o<20?Ai(1800,3600,on(-1,20,o)):Ai(3600,5600,on(20,50,o));Ad(g,this.rgb),this.sun.color.setRGB(this.rgb.r,this.rgb.g,this.rgb.b,Ge),u&&this.sun.color.lerp(f.cool,.35),this.sun.intensity=this.base.sun*Math.sqrt(a)*(1-.8*d)*(u?.75:1),this.hemi.color.copy(f.daySky).lerp(f.goldSky,h*.85).lerp(f.nightSky,c),d&&this.hemi.color.lerp(f.overcast,.55*d*l),u&&this.hemi.color.lerp(f.rainSky,.5*l),this.hemi.groundColor.copy(f.dayGround).lerp(f.nightGround,c),this.hemi.intensity=this.base.hemi*Ai(.18,1,l)*(1-.32*h)*(1+.15*d*l),this.ambient.color.copy(f.dayAmbient).lerp(f.goldAmbient,h*.55).lerp(f.nightAmbient,c),this.ambientNow=this.base.ambient*Ai(.55,1,l)*(1-.15*h)*(1+.1*d*l),this.ambient.intensity=this.ambientNow,this.lampLevel=Ai(1,1.45,c)+.25*d*l,this.lamps.setLevel(this.lampLevel),this.lamps.setColor(f.lamp.copy(f.lampDay).lerp(f.lampNight,c)),this.glow&&(this.glow.emissiveIntensity=this.base.glow*Ai(1,1.5,c)),r.environmentIntensity=this.base.env*Ai(.25,1,l)*(1-.25*d),s.toneMappingExposure=this.base.exposure*Ai(1,1.07,c)*(u?.97:1),this.background.copy(f.dayBg).lerp(f.duskBg,h*.6).lerp(f.nightBg,c);let b=Math.max(o,3)*Cd,m=(t.azimuthDeg-n)*Cd;return this.dir.set(Math.sin(m)*Math.cos(b),Math.sin(b),-Math.cos(m)*Math.cos(b)),this.sun.position.copy(this.centre).addScaledVector(this.dir,20),this.sun.target.position.copy(this.centre),this.sun.updateMatrixWorld(),this.sun.target.updateMatrixWorld(),this.dir.angleTo(this.lastDir)<.002?!1:(this.lastDir.copy(this.dir),this.fitShadow(),!0)}compensate(t,e){this.ambient.intensity=this.ambientNow+(e?this.base.ambient*.3*(1-t)*this.lampLevel:0)}fitShadow(){let t=this.sun.shadow.camera;t.position.copy(this.sun.position),t.lookAt(this.centre),t.updateMatrixWorld();let e=1/0,n=-1/0,s=1/0,r=-1/0,o=1/0,a=-1/0,l=this.box;for(let h=0;h<8;h++)this.corner.set(h&1?l.max.x:l.min.x,h&2?l.max.y:l.min.y,h&4?l.max.z:l.min.z).applyMatrix4(t.matrixWorldInverse),e=Math.min(e,this.corner.x),n=Math.max(n,this.corner.x),s=Math.min(s,this.corner.y),r=Math.max(r,this.corner.y),o=Math.min(o,this.corner.z),a=Math.max(a,this.corner.z);let c=.25;t.left=e-c,t.right=n+c,t.bottom=s-c,t.top=r+c,t.near=Math.max(.05,-a-c),t.far=-o+c,t.updateProjectionMatrix()}};function Pd(i,t=!1){let e=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),s=new Set(Object.keys(i[0].morphAttributes)),r={},o={},a=i[0].morphTargetsRelative,l=new We,c=0;for(let h=0;h<i.length;++h){let d=i[h],u=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let f in d.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;r[f]===void 0&&(r[f]=[]),r[f].push(d.attributes[f]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let f in d.morphAttributes){if(!s.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[f]===void 0&&(o[f]=[]),o[f].push(d.morphAttributes[f])}if(t){let f;if(e)f=d.index.count;else if(d.attributes.position!==void 0)f=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,f,h),c+=f}}if(e){let h=0,d=[];for(let u=0;u<i.length;++u){let f=i[u].index;for(let g=0;g<f.count;++g)d.push(f.getX(g)+h);h+=i[u].attributes.position.count}l.setIndex(d)}for(let h in r){let d=Rd(r[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,d)}for(let h in o){let d=o[h][0].length;if(d!==0){l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let u=0;u<d;++u){let f=[];for(let b=0;b<o[h].length;++b)f.push(o[h][b][u]);let g=Rd(f);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(g)}}}return l}function Rd(i){let t,e,n,s=-1,r=0;for(let c=0;c<i.length;++c){let h=i[c];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(s===-1&&(s=h.gpuType),s!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*e}let o=new t(r),a=new Be(o,e,n),l=0;for(let c=0;c<i.length;++c){let h=i[c];if(h.isInterleavedBufferAttribute){let d=l/e;for(let u=0,f=h.count;u<f;u++)for(let g=0;g<e;g++){let b=h.getComponent(u,g);a.setComponent(u+d,g,b)}}else o.set(h.array,l);l+=h.count*e}return s!==void 0&&(a.gpuType=s),a}var Hv=new Set(["position","normal","uv"]);function Wv(i,t){let e=i;if(!e.isMesh||e.isInstancedMesh||e.isSkinnedMesh||Array.isArray(e.material)||e.renderOrder!==0||e.geometry.morphAttributes.position||!e.geometry.attributes.position)return!1;for(let n=i;n&&n!==t;n=n.parent)if(n.userData.keep||!n.visible)return!1;return!0}function Xv(i,t){let e=i.geometry,n=new We;for(let a of Object.keys(e.attributes)){if(!Hv.has(a))continue;let l=e.attributes[a],c=new Be(new Float32Array(l.count*l.itemSize),l.itemSize);for(let h=0;h<l.count;h++)for(let d=0;d<l.itemSize;d++)c.array[h*l.itemSize+d]=l.getComponent(h,d);n.setAttribute(a,c)}n.attributes.normal||n.computeVertexNormals(),n.attributes.uv||n.setAttribute("uv",new Be(new Float32Array(n.attributes.position.count*2),2));let s=n.attributes.position.count,r=e.index?e.index.count:s,o=s>65535?new Uint32Array(r):new Uint16Array(r);for(let a=0;a<r;a++)o[a]=e.index?e.index.getX(a):a;if(t.determinant()<0)for(let a=0;a+2<o.length;a+=3){let l=o[a+1];o[a+1]=o[a+2],o[a+2]=l}return n.setIndex(new Be(o,1)),n.applyMatrix4(t),n}function Id(i,t){let e=new gn,n=new F,s=new ne,r=new ne,o=0,a=0;for(let l of i){l.updateWorldMatrix(!0,!0),r.copy(l.matrixWorld).invert();let c=new Map,h=[],d=new Set;l.traverse(f=>{if(f.isMesh&&o++,!Wv(f,l)){f.isMesh&&d.add(f.geometry);return}let g=f,b=g.material;g.geometry.boundingBox||g.geometry.computeBoundingBox(),e.copy(g.geometry.boundingBox).applyMatrix4(g.matrixWorld).getCenter(n);let m=t(n.x,n.z)||"hall",p=m+"|"+b.uuid+"|"+g.castShadow+"|"+g.receiveShadow,S=c.get(p);S||(S={material:b,cast:g.castShadow,receive:g.receiveShadow,room:m,parts:[]},c.set(p,S)),s.multiplyMatrices(r,g.matrixWorld),S.parts.push(Xv(g,s)),h.push(g)});let u=new Set;for(let f of h)f.removeFromParent(),d.has(f.geometry)||u.add(f.geometry);u.forEach(f=>f.dispose());for(let f of c.values()){let g=f.parts.length===1?f.parts[0]:Pd(f.parts,!1);if(f.parts.length>1&&f.parts.forEach(m=>m.dispose()),!g)continue;g.computeBoundingBox(),g.computeBoundingSphere();let b=new me(g,f.material);b.name=f.room+":"+(f.material.name||f.material.type),b.userData.room=f.room,b.castShadow=f.cast,b.receiveShadow=f.receive,b.matrixAutoUpdate=!1,l.add(b)}Ld(l),l.traverse(f=>{f.isMesh&&a++})}return{meshesBefore:o,meshesAfter:a}}function Ld(i){for(let t=i.children.length-1;t>=0;t--){let e=i.children[t];Ld(e),e.children.length===0&&(e.type==="Group"||e.type==="Object3D")&&!e.userData.keep&&i.remove(e)}}var Mo=class i extends me{constructor(t,e={}){super(t),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this._reflectionCameras=new WeakMap;let n=this,s=e.color!==void 0?new Dt(e.color):new Dt(8355711),r=e.textureWidth||512,o=e.textureHeight||512,a=e.clipBias||0,l=e.shader||i.ReflectorShader,c=e.multisample!==void 0?e.multisample:4,h=new hn,d=new F,u=new F,f=new F,g=new ne,b=new F(0,0,-1),m=new Te,p=new F,S=new F,C=new Te,_=new ne,M=new Ie(r,o,{samples:c,type:qe}),T=new Ne({name:l.name!==void 0?l.name:"unspecified",uniforms:ui.clone(l.uniforms),fragmentShader:l.fragmentShader,vertexShader:l.vertexShader});T.uniforms.tDiffuse.value=M.texture,T.uniforms.color.value=s,T.uniforms.textureMatrix.value=_,this.material=T,this.onBeforeRender=function(w,x,y){let R=this.getReflectionCamera(y);if(u.setFromMatrixPosition(n.matrixWorld),f.setFromMatrixPosition(y.matrixWorld),g.extractRotation(n.matrixWorld),d.set(0,0,1),d.applyMatrix4(g),p.subVectors(u,f),p.dot(d)>0===!0&&this.forceUpdate===!1)return;p.reflect(d).negate(),p.add(u),g.extractRotation(y.matrixWorld),b.set(0,0,-1),b.applyMatrix4(g),b.add(f),S.subVectors(u,b),S.reflect(d).negate(),S.add(u),R.position.copy(p),R.up.set(0,1,0),R.up.applyMatrix4(g),R.up.reflect(d),R.lookAt(S),R.far=y.far,R.updateMatrixWorld(),R.projectionMatrix.copy(y.projectionMatrix),_.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),_.multiply(R.projectionMatrix),_.multiply(R.matrixWorldInverse),_.multiply(n.matrixWorld),h.setFromNormalAndCoplanarPoint(d,u),h.applyMatrix4(R.matrixWorldInverse),m.set(h.normal.x,h.normal.y,h.normal.z,h.constant);let D=R.projectionMatrix;R.isOrthographicCamera?(C.x=(Math.sign(m.x)+D.elements[8])/D.elements[0],C.y=(Math.sign(m.y)+D.elements[9])/D.elements[5],C.z=-y.far,C.w=1):(C.x=(Math.sign(m.x)+D.elements[8])/D.elements[0],C.y=(Math.sign(m.y)+D.elements[9])/D.elements[5],C.z=-1,C.w=(1+D.elements[10])/D.elements[14]),m.multiplyScalar(2/m.dot(C)),D.elements[2]=m.x,D.elements[6]=m.y,R.isOrthographicCamera?(D.elements[10]=m.z-a,D.elements[14]=m.w-1):(D.elements[10]=m.z+1-a,D.elements[14]=m.w),n.visible=!1;let z=w.getRenderTarget(),W=w.xr.enabled,N=w.shadowMap.autoUpdate;w.xr.enabled=!1,w.shadowMap.autoUpdate=!1,w.setRenderTarget(M),w.state.buffers.depth.setMask(!0),w.autoClear===!1&&w.clear(),w.render(x,R),w.xr.enabled=W,w.shadowMap.autoUpdate=N,w.setRenderTarget(z);let k=y.viewport;k!==void 0&&w.state.viewport(k),n.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return M},this.dispose=function(){M.dispose(),n.material.dispose()},this.getReflectionCamera=function(w){let x=this._reflectionCameras.get(w);return x===void 0&&(x=w.clone(),this._reflectionCameras.set(w,x)),x}}};Mo.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};var qv=6,Bl=class{constructor(t,e){this.group=new un;this.position=new F;this.armed=!1;this.live=!0;this.stale=!0;let[n,s]=t.size;this.geometry=t.shape==="circle"?new Vr(n/2,48):new wi(n,s);let r=(t.shape==="circle"?s/n:1)*(t.scaleY??1),o=t.tint??13226184;this.reflector=new Mo(this.geometry,{textureWidth:Math.max(1,e),textureHeight:Math.max(1,e),color:o,clipBias:.003,multisample:0}),this.reflector.name="mirror",this.fallbackMaterial=new ke({color:o,metalness:1,roughness:.08}),this.fallback=new me(this.geometry,this.fallbackMaterial),this.fallback.name="mirror-fallback",this.group.add(this.reflector,this.fallback),this.group.position.set(t.position[0],t.position[1],t.position[2]),this.group.rotation.y=t.rotationY,this.group.scale.y=r,this.group.updateMatrixWorld(!0),this.position.copy(this.group.position);let a=this.reflector.onBeforeRender;this.reflector.onBeforeRender=(l,c,h,d,u,f)=>{this.armed&&(this.armed=!1,this.stale=!1,a.call(this.reflector,l,c,h,d,u,f))},this.setResolution(e)}setResolution(t){this.live=t>0,this.reflector.visible=this.live,this.fallback.visible=!this.live,this.live&&this.reflector.getRenderTarget().setSize(t,t),this.stale=!0}setVisible(t){this.group.visible=t}warmup(t){this.reflector.visible=t||this.live,this.fallback.visible=t||!this.live}arm(t,e,n){let s=t.position.distanceTo(this.position)<qv;s||(this.stale=!0),this.armed=this.live&&this.group.visible&&s&&(!e||this.stale||n%3===0)}force(){this.armed=this.live&&this.group.visible}disarm(){this.armed&&(this.stale=!0),this.armed=!1}dispose(){this.reflector.dispose(),this.geometry.dispose(),this.fallbackMaterial.dispose()}};function Dd(i,t,e){let n=t.slice(),s=ph*ph;function r(_,M){if(!i(_,M))return!0;for(let T=0;T<n.length;T++){let w=n[T],x=_<w.x1?w.x1:_>w.x2?w.x2:_,y=M<w.z1?w.z1:M>w.z2?w.z2:M,R=_-x,P=M-y;if(R*R+P*P<s)return!0}return!1}function o(_,M,T,w){let x=Math.ceil(Math.hypot(T-_,w-M)/.045);for(let y=0;y<=x;y++){let R=x?y/x:0;if(r(_+(T-_)*R,M+(w-M)*R))return!1}return!0}function a(_,M,T,w){let x=Math.ceil(Math.hypot(T-_,w-M)/.04);for(let y=1;y<=x;y++){let R=y/x;if(!i(_+(T-_)*R,M+(w-M)*R))return!1}return!0}let l=.12,c=e.minX,h=e.minZ,d=Math.ceil((e.maxX-c)/l)+1,u=Math.ceil((e.maxZ-h)/l)+1,f=_=>c+_%d*l,g=_=>h+Math.floor(_/d)*l,b=(_,M)=>Math.max(0,Math.min(u-1,Math.round((M-h)/l)))*d+Math.max(0,Math.min(d-1,Math.round((_-c)/l))),m=new Uint8Array(d*u);for(let _=0;_<m.length;_++)m[_]=r(f(_),g(_))?0:1;function p(_,M,T){let w=r(_,M)?a:o,x=b(_,M);if(m[x]&&w(_,M,f(x),g(x)))return x;let y=-1,R=1/0,P=Math.ceil(T/l)+1,D=x%d,z=Math.floor(x/d);for(let W=Math.max(0,z-P);W<=Math.min(u-1,z+P);W++)for(let N=Math.max(0,D-P);N<=Math.min(d-1,D+P);N++){let k=W*d+N;if(!m[k])continue;let U=Math.hypot(f(k)-_,g(k)-M);U<R&&U<T&&w(_,M,f(k),g(k))&&(R=U,y=k)}return y}function S(_,M,T,w){if(r(T,w))return null;if(r(_,M)){let U=p(_,M,.5);if(U<0)return null;_=f(U),M=g(U)}if(o(_,M,T,w))return[[_,M],[T,w]];let x=p(_,M,.65),y=p(T,w,.65);if(x<0||y<0)return null;let R=new Int32Array(m.length).fill(-1),P=new Int32Array(m.length),D=0,z=0;for(P[z++]=x,R[x]=x;D<z&&R[y]===-1;){let U=P[D++],X=U%d,K=(U-X)/d;X>0&&m[U-1]&&R[U-1]===-1&&(R[U-1]=U,P[z++]=U-1),X<d-1&&m[U+1]&&R[U+1]===-1&&(R[U+1]=U,P[z++]=U+1),K>0&&m[U-d]&&R[U-d]===-1&&(R[U-d]=U,P[z++]=U-d),K<u-1&&m[U+d]&&R[U+d]===-1&&(R[U+d]=U,P[z++]=U+d)}if(R[y]===-1)return null;let W=[[T,w]];for(let U=y;U!==x;U=R[U])W.push([f(U),g(U)]);W.push([f(x),g(x)],[_,M]),W.reverse();let N=[W[0]],k=0;for(;k<W.length-1;){let U=k+1;for(let X=W.length-1;X>k+1;X--)if(o(W[k][0],W[k][1],W[X][0],W[X][1])){U=X;break}N.push(W[U]),k=U}return N}function C(_,M,T=.65){if(!r(_,M))return[_,M];let w=p(_,M,T);return w<0?null:[f(w),g(w)]}return{blocked:r,clear:o,sightline:a,path:S,nearestFree:C}}var cr=["battery","balanced","high","ultra"];function Yv(i){let t=Math.max(.5,i||1);return{ultra:{dpr:Math.min(t,2),floor:1.5,shadow:2048,ao:!0,mirror:512},high:{dpr:Math.min(t,1.5),floor:1,shadow:2048,ao:!0,mirror:512},balanced:{dpr:we(t,1,1.25),floor:.85,shadow:1024,ao:!1,mirror:256},battery:{dpr:.75,floor:.6,shadow:1024,ao:!1,mirror:0}}}var Nd=.15,Ud=i=>Math.round(i*100)/100,kl=class{constructor(t,e){this.auto=!0;this.frameMs=16.7;this.workMs=4;this.slowFor=0;this.fastFor=0;this.holdUntil=0;this.lastUpAt=-1e9;this.lastUpFromDpr=0;this.lastUpFromTier="battery";this.ceilingDpr=1/0;this.ceilingTier=3;this.table=Yv(t),this.maxTier=t>1.5&&!e?3:2,this.startTier=e?"balanced":"high",this.tier=this.startTier,this.dpr=this.table[this.tier].dpr}get spec(){return this.table[this.tier]}set(t){t==="auto"?(this.auto=!0,this.tier=this.startTier,this.ceilingDpr=1/0,this.ceilingTier=this.maxTier):(this.auto=!1,this.tier=t),this.dpr=this.table[this.tier].dpr,this.slowFor=this.fastFor=0}sample(t,e,n){return e<=0||(e=Math.min(e,250),this.frameMs+=(e-this.frameMs)*.1,this.workMs+=(n-this.workMs)*.1,!this.auto||t<this.holdUntil)?!1:(this.frameMs>20?(this.slowFor+=e,this.fastFor=0):this.frameMs<12||this.frameMs<18.5&&this.workMs<6?(this.fastFor+=e,this.slowFor=0):(this.slowFor=Math.max(0,this.slowFor-e),this.fastFor=Math.max(0,this.fastFor-e)),this.slowFor>1e3?this.stepDown(t):this.fastFor>3e3?this.stepUp(t):!1)}stepDown(t){this.slowFor=this.fastFor=0,this.holdUntil=t+800,t-this.lastUpAt<5e3&&(this.ceilingDpr=this.lastUpFromDpr,this.ceilingTier=cr.indexOf(this.lastUpFromTier));let e=Ud(this.dpr-Nd),n=cr.indexOf(this.tier);if(e<this.table[this.tier].floor-.001)if(n===0){if(e=this.table.battery.floor,e>=this.dpr)return!1}else n--,e=Math.min(e,this.table[cr[n]].dpr);return this.tier=cr[n],this.dpr=e,!0}stepUp(t){this.fastFor=0,this.holdUntil=t+800;let e=this.table[this.tier],n=cr.indexOf(this.tier),s=this.dpr,r=this.tier,o=Ud(this.dpr+Nd);if(o<=Math.min(e.dpr,this.ceilingDpr)+.001)this.dpr=o;else if(this.dpr<e.dpr-.001&&e.dpr<=this.ceilingDpr)this.dpr=e.dpr;else if(n<Math.min(this.maxTier,this.ceilingTier))this.tier=cr[n+1];else return!1;return this.lastUpAt=t,this.lastUpFromDpr=s,this.lastUpFromTier=r,!0}};var zl=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},Zv=new Nn(-1,1,1,-1,0,1),gh=class extends We{constructor(){super(),this.setAttribute("position",new Ce([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ce([0,2,0,0,2,0],2))}},$v=new gh,hr=class{constructor(t){this._mesh=new me($v,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,Zv)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var So={name:"GTAOShader",defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new Yt},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new ne},cameraProjectionMatrixInverse:{value:new ne},cameraWorldMatrix:{value:new ne},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new F(-1,-1,-1)},sceneBoxMax:{value:new F(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);

			#ifdef USE_REVERSED_DEPTH_BUFFER
				if (depth <= 0.0) {
					discard;
					return;
				}
			#else
				if (depth >= 1.0) {
					discard;
					return;
				}
			#endif
			
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				vec3 viewDir = normalize(-viewPos.xyz);
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},wo={name:"GTAODepthShader",defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},Vl={name:"GTAOBlendShader",uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`};function Fd(i=5){let t=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),e=Kv(t),n=e.length,s=new Uint8Array(n*4);for(let o=0;o<n;++o){let a=e[o],l=2*Math.PI*a/n,c=new F(Math.cos(l),Math.sin(l),0).normalize();s[o*4]=(c.x*.5+.5)*255,s[o*4+1]=(c.y*.5+.5)*255,s[o*4+2]=127,s[o*4+3]=255}let r=new Xn(s,t,t);return r.wrapS=Ln,r.wrapT=Ln,r.needsUpdate=!0,r}function Kv(i){let t=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),e=t*t,n=Array(e).fill(0),s=Math.floor(t/2),r=t-1;for(let o=1;o<=e;){if(s===-1&&r===t?(r=t-2,s=0):(r===t&&(r=0),s<0&&(s=t-1)),n[s*t+r]!==0){r-=2,s++;continue}else n[s*t+r]=o++;r++,s--}return n}var To={name:"PoissonDenoiseShader",defines:{SAMPLES:16,SAMPLE_VECTORS:xh(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new Yt},cameraProjectionMatrixInverse:{value:new ne},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
		#if DEPTH_VALUE_SOURCE == 1
			return textureLod(tDepth, uv.xy, 0.0).a;
		#else
			return textureLod(tDepth, uv.xy, 0.0).r;
		#endif
		}

		float fetchDepth(const ivec2 uv) {
			#if DEPTH_VALUE_SOURCE == 1
				return texelFetch(tDepth, uv.xy, 0).a;
			#else
				return texelFetch(tDepth, uv.xy, 0).r;
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function xh(i,t,e){let n=Jv(i,t,e),s="vec3[SAMPLES](";for(let r=0;r<i;r++){let o=n[r];s+=`vec3(${o.x}, ${o.y}, ${o.z})${r<i-1?",":")"}`}return s}function Jv(i,t,e){let n=[];for(let s=0;s<i;s++){let r=2*Math.PI*t*s/i,o=Math.pow(s/(i-1),e);n.push(new F(Math.cos(r),Math.sin(r),o))}return n}var Gl={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var Hl=class{constructor(t=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let e=0;e<256;e++)this.p[e]=Math.floor(t.random()*256);this.perm=[];for(let e=0;e<512;e++)this.perm[e]=this.p[e&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(t,e){let n,s,r,o=.5*(Math.sqrt(3)-1),a=(t+e)*o,l=Math.floor(t+a),c=Math.floor(e+a),h=(3-Math.sqrt(3))/6,d=(l+c)*h,u=l-d,f=c-d,g=t-u,b=e-f,m,p;g>b?(m=1,p=0):(m=0,p=1);let S=g-m+h,C=b-p+h,_=g-1+2*h,M=b-1+2*h,T=l&255,w=c&255,x=this.perm[T+this.perm[w]]%12,y=this.perm[T+m+this.perm[w+p]]%12,R=this.perm[T+1+this.perm[w+1]]%12,P=.5-g*g-b*b;P<0?n=0:(P*=P,n=P*P*this._dot(this.grad3[x],g,b));let D=.5-S*S-C*C;D<0?s=0:(D*=D,s=D*D*this._dot(this.grad3[y],S,C));let z=.5-_*_-M*M;return z<0?r=0:(z*=z,r=z*z*this._dot(this.grad3[R],_,M)),70*(n+s+r)}noise3d(t,e,n){let s,r,o,a,c=(t+e+n)*.3333333333333333,h=Math.floor(t+c),d=Math.floor(e+c),u=Math.floor(n+c),f=1/6,g=(h+d+u)*f,b=h-g,m=d-g,p=u-g,S=t-b,C=e-m,_=n-p,M,T,w,x,y,R;S>=C?C>=_?(M=1,T=0,w=0,x=1,y=1,R=0):S>=_?(M=1,T=0,w=0,x=1,y=0,R=1):(M=0,T=0,w=1,x=1,y=0,R=1):C<_?(M=0,T=0,w=1,x=0,y=1,R=1):S<_?(M=0,T=1,w=0,x=0,y=1,R=1):(M=0,T=1,w=0,x=1,y=1,R=0);let P=S-M+f,D=C-T+f,z=_-w+f,W=S-x+2*f,N=C-y+2*f,k=_-R+2*f,U=S-1+3*f,X=C-1+3*f,K=_-1+3*f,lt=h&255,at=d&255,gt=u&255,yt=this.perm[lt+this.perm[at+this.perm[gt]]]%12,jt=this.perm[lt+M+this.perm[at+T+this.perm[gt+w]]]%12,Pt=this.perm[lt+x+this.perm[at+y+this.perm[gt+R]]]%12,j=this.perm[lt+1+this.perm[at+1+this.perm[gt+1]]]%12,ut=.6-S*S-C*C-_*_;ut<0?s=0:(ut*=ut,s=ut*ut*this._dot3(this.grad3[yt],S,C,_));let ct=.6-P*P-D*D-z*z;ct<0?r=0:(ct*=ct,r=ct*ct*this._dot3(this.grad3[jt],P,D,z));let zt=.6-W*W-N*N-k*k;zt<0?o=0:(zt*=zt,o=zt*zt*this._dot3(this.grad3[Pt],W,N,k));let St=.6-U*U-X*X-K*K;return St<0?a=0:(St*=St,a=St*St*this._dot3(this.grad3[j],U,X,K)),32*(s+r+o+a)}noise4d(t,e,n,s){let r=this.grad4,o=this.simplex,a=this.perm,l=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20,h,d,u,f,g,b=(t+e+n+s)*l,m=Math.floor(t+b),p=Math.floor(e+b),S=Math.floor(n+b),C=Math.floor(s+b),_=(m+p+S+C)*c,M=m-_,T=p-_,w=S-_,x=C-_,y=t-M,R=e-T,P=n-w,D=s-x,z=y>R?32:0,W=y>P?16:0,N=R>P?8:0,k=y>D?4:0,U=R>D?2:0,X=P>D?1:0,K=z+W+N+k+U+X,lt=o[K][0]>=3?1:0,at=o[K][1]>=3?1:0,gt=o[K][2]>=3?1:0,yt=o[K][3]>=3?1:0,jt=o[K][0]>=2?1:0,Pt=o[K][1]>=2?1:0,j=o[K][2]>=2?1:0,ut=o[K][3]>=2?1:0,ct=o[K][0]>=1?1:0,zt=o[K][1]>=1?1:0,St=o[K][2]>=1?1:0,xt=o[K][3]>=1?1:0,he=y-lt+c,Xt=R-at+c,Wt=P-gt+c,V=D-yt+c,ot=y-jt+2*c,nt=R-Pt+2*c,Zt=P-j+2*c,oe=D-ut+2*c,st=y-ct+3*c,Ot=R-zt+3*c,It=P-St+3*c,O=D-xt+3*c,Ee=y-1+4*c,Rt=R-1+4*c,A=P-1+4*c,v=D-1+4*c,H=m&255,q=p&255,et=S&255,dt=C&255,vt=a[H+a[q+a[et+a[dt]]]]%32,J=a[H+lt+a[q+at+a[et+gt+a[dt+yt]]]]%32,rt=a[H+jt+a[q+Pt+a[et+j+a[dt+ut]]]]%32,tt=a[H+ct+a[q+zt+a[et+St+a[dt+xt]]]]%32,kt=a[H+1+a[q+1+a[et+1+a[dt+1]]]]%32,_t=.6-y*y-R*R-P*P-D*D;_t<0?h=0:(_t*=_t,h=_t*_t*this._dot4(r[vt],y,R,P,D));let mt=.6-he*he-Xt*Xt-Wt*Wt-V*V;mt<0?d=0:(mt*=mt,d=mt*mt*this._dot4(r[J],he,Xt,Wt,V));let Bt=.6-ot*ot-nt*nt-Zt*Zt-oe*oe;Bt<0?u=0:(Bt*=Bt,u=Bt*Bt*this._dot4(r[rt],ot,nt,Zt,oe));let Ht=.6-st*st-Ot*Ot-It*It-O*O;Ht<0?f=0:(Ht*=Ht,f=Ht*Ht*this._dot4(r[tt],st,Ot,It,O));let $t=.6-Ee*Ee-Rt*Rt-A*A-v*v;return $t<0?g=0:($t*=$t,g=$t*$t*this._dot4(r[kt],Ee,Rt,A,v)),27*(h+d+u+f+g)}_dot(t,e,n){return t[0]*e+t[1]*n}_dot3(t,e,n,s){return t[0]*e+t[1]*n+t[2]*s}_dot4(t,e,n,s,r){return t[0]*e+t[1]*n+t[2]*s+t[3]*r}};var ur=class i extends zl{constructor(t,e,n=512,s=512,r,o,a){super(),this.width=n,this.height=s,this.clear=!0,this.camera=e,this.scene=t,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=Fd(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new Ie(this.width,this.height,{type:qe}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new Ne({defines:Object.assign({},So.defines),uniforms:ui.clone(So.uniforms),vertexShader:So.vertexShader,fragmentShader:So.fragmentShader,blending:Xe,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new Xr,this.normalMaterial.blending=Xe,this.pdMaterial=new Ne({defines:Object.assign({},To.defines),uniforms:ui.clone(To.uniforms),vertexShader:To.vertexShader,fragmentShader:To.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new Ne({defines:Object.assign({},wo.defines),uniforms:ui.clone(wo.uniforms),vertexShader:wo.vertexShader,fragmentShader:wo.fragmentShader,blending:Xe}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new Ne({uniforms:ui.clone(Gl.uniforms),vertexShader:Gl.vertexShader,fragmentShader:Gl.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:eo,blendDst:fs,blendEquation:En,blendSrcAlpha:to,blendDstAlpha:fs,blendEquationAlpha:En}),this.blendMaterial=new Ne({uniforms:ui.clone(Vl.uniforms),vertexShader:Vl.vertexShader,fragmentShader:Vl.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:Pa,blendSrc:eo,blendDst:fs,blendEquation:En,blendSrcAlpha:to,blendDstAlpha:fs,blendEquationAlpha:En}),this._fsQuad=new hr(null),this._originalClearColor=new Dt,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),o!==void 0&&this.updateGtaoMaterial(o),a!==void 0&&this.updatePdMaterial(a)}setSize(t,e){this.width=t,this.height=e,this.gtaoRenderTarget.setSize(t,e),this.normalRenderTarget.setSize(t,e),this.pdRenderTarget.setSize(t,e),this.gtaoMaterial.uniforms.resolution.value.set(t,e),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(t,e),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(t,e){t!==void 0?(this.depthTexture=t,this.normalTexture=e,this._renderGBuffer=!1):(this.depthTexture=new qn,this.depthTexture.format=hi,this.depthTexture.type=Xi,this.normalRenderTarget=new Ie(this.width,this.height,{minFilter:De,magFilter:De,type:qe,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);let n=this.normalTexture?1:0,s=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.defines.DEPTH_SWIZZLING=s,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.defines.DEPTH_SWIZZLING=s,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(t){t?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(t.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(t.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(t){t.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=t.radius),t.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=t.distanceExponent),t.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=t.thickness),t.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=t.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),t.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=t.scale),t.samples!==void 0&&t.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=t.samples,this.gtaoMaterial.needsUpdate=!0),t.screenSpaceRadius!==void 0&&(t.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=t.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(t){let e=!1;t.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=t.lumaPhi),t.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=t.depthPhi),t.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=t.normalPhi),t.radius!==void 0&&t.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=t.radius),t.radiusExponent!==void 0&&t.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=t.radiusExponent,e=!0),t.rings!==void 0&&t.rings!==this.pdRings&&(this.pdRings=t.rings,e=!0),t.samples!==void 0&&t.samples!==this.pdSamples&&(this.pdSamples=t.samples,e=!0),e&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=xh(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(t,e,n){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(t,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(t,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(t,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case i.OUTPUT.Off:break;case i.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=Xe,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=Xe,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=Xe,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(t,this.depthRenderMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=Xe,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=Xe,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(t,this.blendMaterial,this.renderToScreen?null:e);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(t,e,n,s,r){t.getClearColor(this._originalClearColor);let o=t.getClearAlpha(),a=t.autoClear;t.setRenderTarget(n),t.autoClear=!1,s!=null&&(t.setClearColor(s),t.setClearAlpha(r||0),t.clear()),this._fsQuad.material=e,this._fsQuad.render(t),t.autoClear=a,t.setClearColor(this._originalClearColor),t.setClearAlpha(o)}_renderOverride(t,e,n,s,r){t.getClearColor(this._originalClearColor);let o=t.getClearAlpha(),a=t.autoClear;t.setRenderTarget(n),t.autoClear=!1,s=e.clearColor||s,r=e.clearAlpha||r,s!=null&&(t.setClearColor(s),t.setClearAlpha(r||0),t.clear()),this.scene.overrideMaterial=e,t.render(this.scene,this.camera),this.scene.overrideMaterial=null,t.autoClear=a,t.setClearColor(this._originalClearColor),t.setClearAlpha(o)}_overrideVisibility(){let t=this.scene,e=this._visibilityCache;t.traverse(function(n){(n.isPoints||n.isLine||n.isLine2)&&n.visible&&(n.visible=!1,e.push(n))})}_restoreVisibility(){let t=this._visibilityCache;for(let e=0;e<t.length;e++)t[e].visible=!0;t.length=0}_generateNoise(t=64){let e=new Hl,n=t*t*4,s=new Uint8Array(n);for(let o=0;o<t;o++)for(let a=0;a<t;a++){let l=o,c=a;s[(o*t+a)*4]=(e.noise(l,c)*.5+.5)*255,s[(o*t+a)*4+1]=(e.noise(l+t,c)*.5+.5)*255,s[(o*t+a)*4+2]=(e.noise(l,c+t)*.5+.5)*255,s[(o*t+a)*4+3]=(e.noise(l+t,c+t)*.5+.5)*255}let r=new Xn(s,t,t,yn,Qe);return r.wrapS=Ln,r.wrapT=Ln,r.needsUpdate=!0,r}};ur.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};var jv=`
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Qv=`
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tAO;
uniform float intensity;
uniform vec3 background;
varying vec2 vUv;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
void main() {
  vec4 scene = texture2D(tScene, vUv);
  vec3 ao = texture2D(tAO, vUv).rgb;
  vec4 color = vec4(scene.rgb * mix(vec3(1.0), ao, intensity), 1.0);
  #ifdef ACES_FILMIC_TONE_MAPPING
    color.rgb = ACESFilmicToneMapping(color.rgb);
  #elif defined(NEUTRAL_TONE_MAPPING)
    color.rgb = NeutralToneMapping(color.rgb);
  #elif defined(AGX_TONE_MAPPING)
    color.rgb = AgXToneMapping(color.rgb);
  #elif defined(LINEAR_TONE_MAPPING)
    color.rgb = LinearToneMapping(color.rgb);
  #endif
  color = sRGBTransferOETF(color);
  gl_FragColor = vec4(mix(background, color.rgb, clamp(scene.a, 0.0, 1.0)), 1.0);
}`,dr=class{constructor(t,e,n,s,r){this.scene=t;this.gtao=null;this.bg=new Dt;this.toneMapping=-1;this.target=new Ie(n,s,{type:qe,samples:r.samples}),this.white=new Xn(new Uint8Array([255,255,255,255]),1,1),this.white.needsUpdate=!0,r.ao&&(this.gtao=new ur(t,e,n,s),this.gtao.updateGtaoMaterial({radius:.22,distanceExponent:1.4,thickness:.5,scale:1}),this.gtao.output=ur.OUTPUT.Off),this.material=new $s({name:"TourComposite",uniforms:{tScene:{value:this.target.texture},tAO:{value:this.gtao?this.gtao.gtaoMap:this.white},intensity:{value:0},background:{value:new F},toneMappingExposure:{value:1}},vertexShader:jv,fragmentShader:Qv,depthTest:!1,depthWrite:!1}),this.quad=new hr(this.material)}get hasAO(){return this.gtao!==null}setSize(t,e){this.target.setSize(t,e),this.gtao&&this.gtao.setSize(t,e)}renderScene(t,e,n,s){t.setRenderTarget(this.target),t.setClearColor(0,0),n(),t.render(this.scene,e),s(),this.gtao&&(this.gtao.camera=e,this.gtao.render(t,this.target,this.target,0,!1)),t.setRenderTarget(null)}composite(t,e,n,s){let r=this.material.uniforms;r.intensity.value=this.gtao?e:0,this.bg.copy(n).convertLinearToSRGB(),r.background.value.set(this.bg.r,this.bg.g,this.bg.b),r.toneMappingExposure.value=t.toneMappingExposure,this.syncDefines(t),t.setRenderTarget(s),this.quad.render(t),t.setRenderTarget(null)}syncDefines(t){if(this.toneMapping===t.toneMapping)return;this.toneMapping=t.toneMapping;let e={};t.toneMapping===ps?e.ACES_FILMIC_TONE_MAPPING="":t.toneMapping===so?e.NEUTRAL_TONE_MAPPING="":t.toneMapping===io?e.AGX_TONE_MAPPING="":t.toneMapping===no&&(e.LINEAR_TONE_MAPPING=""),this.material.defines=e,this.material.needsUpdate=!0}dispose(){this.target.dispose(),this.gtao?.dispose(),this.quad.dispose(),this.material.dispose(),this.white.dispose()}};async function Bd(i){let t=Math.max(320,Math.min(1600,Math.round(i.screenWidth))),e=Math.round(t*9/16),n=t_(i.camera,t/e),s=i.ao&&n.isPerspectiveCamera,r=new dr(i.scene,n,t,e,{samples:4,ao:s}),o=new Ie(t,e,{type:Qe}),a=new Uint8Array(t*e*4);try{let u=i.mirror;r.renderScene(i.renderer,n,()=>u?.force(),()=>{u&&(u.disarm(),u.stale=!0)}),r.composite(i.renderer,1,i.background,o);try{await i.renderer.readRenderTargetPixelsAsync(o,0,0,t,e,a)}catch{i.renderer.readRenderTargetPixels(o,0,0,t,e,a)}}finally{r.dispose(),o.dispose()}let l=document.createElement("canvas");l.width=t,l.height=e;let c=l.getContext("2d");if(!c)return null;let h=c.createImageData(t,e),d=t*4;for(let u=0;u<e;u++)h.data.set(a.subarray((e-1-u)*d,(e-u)*d),u*d);return c.putImageData(h,0,0),e_(c,t,e,i.caption),new Promise(u=>l.toBlob(f=>u(f),"image/jpeg",.9))}function t_(i,t){if(i.isPerspectiveCamera){let a=i,l=new He(a.fov,t,a.near,a.far),c=2*Math.atan(Math.tan(92*Math.PI/180/2)/t)*180/Math.PI;return l.fov=Math.min(a.fov,c),l.position.copy(a.position),l.quaternion.copy(a.quaternion),l.updateProjectionMatrix(),l.updateMatrixWorld(!0),l}let e=i,n=(e.top-e.bottom)/2/e.zoom,s=(e.left+e.right)/2/e.zoom,r=(e.top+e.bottom)/2/e.zoom,o=new Nn(s-n*t,s+n*t,r+n,r-n,e.near,e.far);return o.position.copy(e.position),o.quaternion.copy(e.quaternion),o.updateProjectionMatrix(),o.updateMatrixWorld(!0),o}function e_(i,t,e,n){let s=Math.round(Math.max(54,e*.085)),r=e-s,o=Math.round(s*.42);i.save(),i.globalAlpha=.9,i.fillStyle=n.night,i.fillRect(0,r,t,s),i.globalAlpha=1,i.fillStyle=n.accent,i.fillRect(0,r,t,Math.max(2,Math.round(s*.035)));let a=n.hour?n.hour:"";i.textBaseline="alphabetic",i.font=`500 ${Math.round(s*.3)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;let l=a?i.measureText(a).width:0;a&&(i.fillStyle=n.paper,i.textAlign="right",i.fillText(a,t-o,r+s*.62)),i.textAlign="left",i.fillStyle=n.paper,i.font=`600 ${Math.round(s*.31)}px Georgia, 'Times New Roman', serif`,i.fillText(Od(i,n.title,t-o*3-l),o,r+s*.48),i.globalAlpha=.72,i.font=`500 ${Math.round(s*.19)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;let c=[n.area,"Cabana 3D tour"].filter(Boolean).join("  \xB7  ").toUpperCase();"letterSpacing"in i&&(i.letterSpacing=`${Math.round(s*.02)}px`),i.fillText(Od(i,c,t-o*3-l),o,r+s*.8),i.restore()}function Od(i,t,e){if(i.measureText(t).width<=e)return t;let n=t;for(;n.length>1&&i.measureText(n+"\u2026").width>e;)n=n.slice(0,-1);return n.trimEnd()+"\u2026"}var kd=1.35,zd=2.5,Vd=1.3,n_=1.9,i_=1.5,s_=1.7,r_=1.1,Jn=1.2,Wl=class{constructor(){this.x=0;this.z=0;this.yaw=0;this.pitch=0;this.eye=bd;this.speed=0;this.journey=null;this.arrived=null;this.vx=0;this.vz=0;this.turnV=0;this.pitchV=0;this.bobPhase=0;this.bobAmp=0;this.bob=0;this.last={x:NaN,z:NaN,yaw:NaN,pitch:NaN,bob:NaN,eye:NaN};this.tmp=[0,0]}place(t,e,n,s){this.x=t,this.z=e,this.yaw=n,this.pitch=we(s,-Jn,Jn),this.vx=this.vz=this.turnV=this.pitchV=this.speed=0,this.bobAmp=this.bob=0,this.journey=null}get busy(){return this.journey!==null||this.speed>.001||this.turnV!==0||this.pitchV!==0||this.bobAmp>2e-4}walk(t,e,n,s){let r=[0];for(let a=1;a<t.length;a++)r.push(r[a-1]+Math.hypot(t[a][0]-t[a-1][0],t[a][1]-t[a-1][1]));let o=Math.min(Vd,Math.hypot(this.vx,this.vz));this.journey={points:t,cum:r,length:r[r.length-1],s:0,v:o,seg:0,yaw:e,pitch:n,freeLook:!1,room:s,settling:!1}}cancelJourney(){let t=this.journey;if(t){if(!t.settling&&t.v>0&&t.points.length>1){let e=t.points[t.seg],n=t.points[Math.min(t.seg+1,t.points.length-1)],s=Math.hypot(n[0]-e[0],n[1]-e[1])||1;this.vx=(n[0]-e[0])/s*t.v,this.vz=(n[1]-e[1])/s*t.v}this.journey=null}}step(t,e,n,s){this.journey?this.followJourney(t,e.run):this.moveFree(t,e,n);let r=e.turn*s_,o=e.pitch*r_;this.turnV+=(r-this.turnV)*vs(12,t),this.pitchV+=(o-this.pitchV)*vs(12,t),!r&&Math.abs(this.turnV)<.001&&(this.turnV=0),!o&&Math.abs(this.pitchV)<.001&&(this.pitchV=0),this.yaw+=this.turnV*t,this.pitch=we(this.pitch+this.pitchV*t,-Jn,Jn);let a=s?0:Math.min(1.2,this.speed/kd)*.011;this.bobAmp+=(a-this.bobAmp)*vs(6,t),this.bobAmp<2e-4&&!a&&(this.bobAmp=0),this.bobPhase=(this.bobPhase+t*(4.2+this.speed*2.2))%(Math.PI*2),this.bob=Math.sin(this.bobPhase*2)*this.bobAmp;let l=this.last,c=l.x!==this.x||l.z!==this.z||l.yaw!==this.yaw||l.pitch!==this.pitch||l.bob!==this.bob||l.eye!==this.eye;return l.x=this.x,l.z=this.z,l.yaw=this.yaw,l.pitch=this.pitch,l.bob=this.bob,l.eye=this.eye,c}apply(t){t.position.set(this.x,this.eye+this.bob,this.z),t.rotation.set(this.pitch,this.yaw+Math.PI,0),t.updateMatrixWorld()}moveFree(t,e,n){let s=e.strafe,r=e.forward,o=Math.hypot(s,r);o>1&&(s/=o,r/=o);let a=e.run?zd:kd,l=Math.sin(this.yaw),c=Math.cos(this.yaw),h=(-c*s+l*r)*a,d=(l*s+c*r)*a,u=h*h+d*d>this.vx*this.vx+this.vz*this.vz,f=vs(u?7:10,t);if(this.vx+=(h-this.vx)*f,this.vz+=(d-this.vz)*f,!h&&Math.abs(this.vx)<.005&&(this.vx=0),!d&&Math.abs(this.vz)<.005&&(this.vz=0),!this.vx&&!this.vz){this.speed=0;return}let g=this.vx*t,b=this.vz*t,m=Math.max(1,Math.ceil(Math.max(Math.abs(g),Math.abs(b))/.035)),p=n.blocked(this.x,this.z),S=this.x,C=this.z;for(let _=0;_<m;_++){let M=this.x+g/m;p||!n.blocked(M,this.z)?this.x=M:this.vx=0;let T=this.z+b/m;p||!n.blocked(this.x,T)?this.z=T:this.vz=0}this.speed=Math.hypot(this.x-S,this.z-C)/Math.max(t,1e-4)}followJourney(t,e){let n=this.journey;if(!n.settling){let s=n.length-n.s,r=Math.max(.16,Math.sqrt(2*i_*s));n.v=Math.min(e?zd:Vd,n.v+n_*t,r),n.s=Math.min(n.length,n.s+n.v*t),this.pointAt(n,n.s),this.x=this.tmp[0],this.z=this.tmp[1],this.speed=n.v,this.vx=this.vz=0,n.s>=n.length-1e-4&&(n.settling=!0,n.v=0,this.speed=0)}if(n.freeLook)n.settling&&this.finish();else{let s=n.length-n.s,r=n.yaw===null?0:n.length<.3?1:1-on(0,1.2,s),o=this.yaw;if(!n.settling){this.pointAt(n,Math.min(n.length,n.s+.9));let l=this.tmp[0]-this.x,c=this.tmp[1]-this.z;l*l+c*c>.0025&&(o=Math.atan2(l,c))}n.yaw!==null&&(o+=ar(o,n.yaw)*r),this.yaw+=ar(this.yaw,o)*vs(n.settling?5:3.2,t);let a=n.pitch!==null?-.06+(n.pitch+.06)*r:-.06;this.pitch+=(a-this.pitch)*vs(n.settling?5:3,t),n.settling&&Math.abs(ar(this.yaw,o))<.002&&Math.abs(a-this.pitch)<.002&&(this.yaw=o,this.pitch=a,this.finish())}}finish(){this.arrived=this.journey,this.journey=null}pointAt(t,e){let n=t.seg;for(;n<t.points.length-2&&t.cum[n+1]<e;)n++;e===t.s&&(t.seg=n);let s=t.points[n],r=t.points[Math.min(n+1,t.points.length-1)],o=t.cum[Math.min(n+1,t.cum.length-1)]-t.cum[n],a=o>1e-6?we((e-t.cum[n])/o,0,1):1;this.tmp[0]=s[0]+(r[0]-s[0])*a,this.tmp[1]=s[1]+(r[1]-s[1])*a}};function o_(i,t){return i===0?0:i===1?.2:i===2?.45:i===3?.85:i===45||i===48?.8:i>=51&&i<=57?.75:i>=61&&i<=67||i>=71&&i<=77?.88:i>=80&&i<=82?.7:i>=95?.95:/cloud|overcast|fog/.test(t)?.6:.25}function a_(i,t){return i>=51&&i<=67||i>=80&&i<=82||i>=95||/rain|drizzle|shower|thunder/.test(t)}function l_(i){let t=i.trim().toLowerCase();return t?t[0].toUpperCase()+t.slice(1):""}async function Gd(i,t,e){let n=`/api/utilities?action=weather&lat=${i.toFixed(5)}&lng=${t.toFixed(5)}`,s=await fetch(n,{signal:e,credentials:"same-origin",headers:{accept:"application/json"}});if(!s.ok)return null;let r=await s.json(),o=r&&r.current;if(!o||!Number.isFinite(Number(o.temp)))return null;let a=Number(o.wmoCode)||0,l=String(o.condition||"").toLowerCase();return{temp:Math.round(Number(o.temp)),label:l_(String(o.label||"")),cloud:o_(a,l),rain:a_(a,l),isDay:o.isDay!==!1&&o.isDay!==0}}var c_=180,h_=200,Hd=5.5,vh=22,u_=24,d_=35,f_=80,_h=45,yh=40,Wd="That spot can\u2019t be reached from here",Xd=(i,t,e)=>{let n;try{n=new Sl({antialias:!0,alpha:!1,stencil:!1,powerPreference:"high-performance"})}catch{return setTimeout(()=>e.onError("This device could not start the 3D view. The original photographs are all here.")),g_(t)}return p_(i,t,e,n)};function p_(i,t,e,n){let s=matchMedia("(pointer: coarse)").matches,r=matchMedia("(prefers-reduced-motion: reduce)"),o=r.matches,a=yd(),l=t.listing.tzOffsetHours,c=t.northDeg??0,h=!1,d=!1,u=!1,f=!1,g=!1,b=document.hidden,m=0,p=!1,S=!1,C=0,_=0,M=!1,T=0,w=!0,x=0,y=!0,R=0,P=0,D=!1,z="idle",W=0,N=0,k={calls:0,triangles:0},U=new kl(window.devicePixelRatio||1,s),X=n.domElement;n.setPixelRatio(U.dpr),n.outputColorSpace=Ge,n.toneMapping=ps,n.toneMappingExposure=t.lights.exposure??1,n.shadowMap.enabled=!0,n.shadowMap.type=ds,n.shadowMap.autoUpdate=!1,n.info.autoReset=!1,getComputedStyle(i).position==="static"&&(i.style.position="relative"),X.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent",X.className="tour-canvas",m_(t.theme.accent),X.tabIndex=0,X.setAttribute("role","application"),X.setAttribute("aria-roledescription","3D tour"),X.setAttribute("aria-label",`${t.listing.title}, 3D view. Move with W A S D or the arrow keys, turn with Q and E, drag to look, click the floor to walk there.`),i.appendChild(X);let K=Math.max(1,i.clientWidth),lt=Math.max(1,i.clientHeight);n.setSize(K,lt,!1);let at=new ls;at.matrixWorldAutoUpdate=!0;let gt=K/lt<.8?70:62,yt=new He(gt,K/lt,.05,80);yt.rotation.order="YXZ";let jt=new Nn(-1,1,1,-1,.1,100);jt.up.set(0,0,-1);let Pt=yt,j=t.plan.bounds,ut=(j.minX+j.maxX)/2,ct=(j.minZ+j.maxZ)/2,zt=Math.hypot(j.maxX-j.minX,j.maxZ-j.minZ)/2,St=new _o(yt,X);St.enabled=!1,St.enableDamping=!o,St.dampingFactor=.085,St.rotateSpeed=.75,St.minPolarAngle=.12,St.maxPolarAngle=Math.PI/2-.1,St.screenSpacePanning=!0;let xt=new _o(jt,X);xt.enabled=!1,xt.enableRotate=!1,xt.enableDamping=!1,xt.minZoom=.8,xt.maxZoom=4,xt.screenSpacePanning=!0;let he=()=>{Rt.active||Ue()};St.addEventListener("change",he),xt.addEventListener("change",he),St.addEventListener("start",ys),xt.addEventListener("start",ys);let Xt=null,Wt=null,V=null,ot=null,nt=null,Zt=null,oe=2.6,st=new Wl,Ot={x:0,z:0,yaw:0,pitch:0},It="walk",O=null,Ee=!0,Rt=new Pl,A={playing:!1,index:0,phase:"walk",dwell:0,baseYaw:0,progress:0,dirty:!1,lastAt:0},v=t.start,H=!0,q=0,et=!0,dt={strafe:0,forward:0,turn:0,pitch:0,run:!1},vt={yaw:0,pitch:0},J={},rt={azimuthDeg:0,elevationDeg:0},tt={live:!1,date:Le(),hour:10.5,jd0:0,weather:null,playing:!1};tt.jd0=bo(tt.date);let kt=!0,_t=0,mt=0,Bt=0,Ht=0,$t=null,B=new Rl,Mt=!1,Q=new Ll(i,t.theme.accent),Tt=new jr,Et=new Yt,ht=new hn(new F(0,1,0),0),ft=new F,Ut=new F,xe=new F,ie={on:!1,x:0,y:0,quiet:!1},xn={ready:()=>u&&!d,paused:()=>g,mode:()=>Rt.active?O??It:It,look(L,it){It!=="walk"||Rt.active||(st.yaw+=L,st.pitch=we(st.pitch+it,-Jn,Jn),Vt(),Ue())},fov:()=>gt,setFov:L=>ji.setFov(L),hover:(L,it)=>{ie.on=!0,ie.quiet=!1,ie.x=L,ie.y=it,se()},hoverEnd:()=>{ie.on=!1,Q.cursor.show(!1),X.style.cursor=""},tap:qt,dragStart:()=>{Q.cursor.show(!1),Vt()},manual:()=>{bt(),st.cancelJourney(),Q.target.show(!1)},wake:ti,lockChanged(L){e.onHint?.(L?"Mouse look on \xB7 press Esc to release":"Mouse look off"),ie.on=!1,Q.cursor.show(!1),L&&Ue()},nextRoom(){let L=t.rooms.map(pt=>pt.id),it=L.indexOf(Z());ji.goRoom(L[(it+1)%L.length])}},fe=new Ul(X,xn);function ti(){m||p||!u||h||d||b||(S=!1,m=requestAnimationFrame(bs))}function ys(){ti()}function Ue(){w=!0,ti()}function bs(L){if(m=0,!(h||d||b)){p=!0;try{$l(L)}catch(it){a&&console.error(it),ii("The 3D view stopped unexpectedly. Reopen the tour, or browse the original photographs.")}finally{p=!1}}}function $l(L){let it=S,pt=it?Math.min(.1,Math.max(0,L-C)/1e3):1/60;C=L,_++;let wt=performance.now(),re=!1;if(u){if(!g){if(fe.pollGamepad(),fe.gyroDelta(vt)&&It==="walk"&&!Rt.active&&(st.yaw+=vt.yaw,st.pitch=we(st.pitch+vt.pitch,-Jn,Jn),re=!0),Rt.active){let Pn=Rt.step(pt,yt);re=!0,O==="walk"&&!Ee&&yt.position.y<oe-.05&&ei(!0),Pn&&E()}else It==="walk"?(fe.read(dt),st.step(pt,dt,Wt,o)&&(re=!0),st.arrived&&At(st.arrived),Nt(pt)&&(re=!0)):It==="dollhouse"?(St.update()&&(re=!0),G()):xt.update()&&(re=!0);tt.playing&&Ke(pt,L)}re&&fr();let Pe=It==="walk"&&!Rt.active?yt.position:null;D=V.lamps.update(pt,Pe,et||o),D&&(V.compensate(V.lamps.coverage(),It!=="walk"),w=!0),et=!1,y&&L-R>=100&&(w=!0)}re&&(w=!0);let ee=!1;w&&u?(gi(L),ee=!0,w=!1,x=L,z="pending",f||(f=!0,e.onReady())):z!=="idle"&&u&&pr(L),ee&&(M&&it&&U.sample(L,L-T,performance.now()-wt)&&mr(),T=L,U.auto&&_%60===0&&Ss()),M=ee,Sn(L,!1),vn(L,!1),_n(L,!1),(w||z!=="idle"||Rt.active||It==="walk"&&st.busy||A.playing||tt.playing||fe.active||D||y)&&!(g&&!w&&z==="idle"&&!Rt.active)?(S=!0,m=requestAnimationFrame(bs)):(Sn(L,!0),vn(L,!0),_n(L,!0))}function fr(){if(It==="walk"&&!Rt.active){st.apply(yt),H=!0;let L=t.roomAt(st.x,st.z);L!==v&&(v=L,e.onRoom(L))}(Q.visible||ie.on)&&((ie.on&&!ie.quiet||fe.locked)&&se(),Q.update(Pt,K,lt))}function Ms(L){Math.abs(n.getPixelRatio()-L)>.001&&n.setPixelRatio(L)}function gi(L){let it=U.spec;Ms(U.auto?Math.min(U.dpr,it.dpr):it.dpr);let pt=tt.playing||L-P<120;y&&(!pt||L-R>=100)&&(n.shadowMap.needsUpdate=!0,y=!1,R=L),n.setRenderTarget(null),n.setClearColor(V.background,1),n.info.reset(),ot?.arm(Pt,!0,_),n.render(at,Pt),ot?.disarm(),k.calls=n.info.render.calls,k.triangles=n.info.render.triangles}function pr(L){if(z==="pending"){if(L-x<c_)return;let pt=U.spec;pt.ao&&It!=="plan"&&!Rt.active?(Ms(pt.dpr),Ki(),y&&(n.shadowMap.needsUpdate=!0,y=!1),nt.renderScene(n,Pt,()=>ot?.arm(Pt,!1,_),()=>ot?.disarm()),N=o?1:.25,nt.composite(n,N,V.background,null),W=L,z=N>=1?"idle":"fading"):(Math.abs(n.getPixelRatio()-pt.dpr)>.001&&(Ms(pt.dpr),n.setRenderTarget(null),n.setClearColor(V.background,1),ot?.arm(Pt,!1,_),n.render(at,Pt),ot?.disarm()),z="idle");return}if(!nt){z="idle";return}let it=Math.min(1,.25+.75*(L-W)/h_);(it-N>=.18||it>=1)&&(N=it,nt.composite(n,it,V.background,null)),it>=1&&(z="idle")}function Ki(){let L=U.spec,it=Math.floor(K*L.dpr),pt=Math.floor(lt*L.dpr);nt?(nt.target.width!==it||nt.target.height!==pt)&&nt.setSize(it,pt):nt=new dr(at,yt,it,pt,{samples:2,ao:!0})}function mr(){let L=U.spec;V&&(V.setShadowSize(L.shadow),y=!0),ot?.setResolution(L.mirror),!L.ao&&nt&&(nt.dispose(),nt=null),nt&&Ki(),Ss(),Ue()}function Ji(){let L=U.spec;return{tier:U.tier,auto:U.auto,dpr:U.auto?Math.min(U.dpr,L.dpr):L.dpr,fps:Math.round(1e3/Math.max(1,U.frameMs)),ao:L.ao}}function Ss(){e.onQuality?.(Ji())}function ei(L){Ee=L,Xt&&(Xt.walls.visible=L,Xt.ceilings.visible=L,Xt.lowWalls.visible=!L,ot?.setVisible(L))}function Ri(){Ot.x=st.x,Ot.z=st.z,Ot.yaw=st.yaw,Ot.pitch=st.pitch}function gr(L,it,pt){let wt=_h*Math.PI/180,re=2*Math.atan(Math.tan(wt/2)*yt.aspect),ee=zt/Math.sin(Math.min(wt,re)/2)*1.02,Ve=52*Math.PI/180;return pt.set(ut,.35,ct),it.set(ut-Math.sin(L)*Math.sin(Ve)*ee,.35+Math.cos(Ve)*ee,ct-Math.cos(L)*Math.sin(Ve)*ee),ee}function Po(L,it){let wt=jt.top/jt.zoom/Math.tan(yh/2*Math.PI/180),re=xt.target.x,ee=xt.target.z;it.set(re,0,ee),L.set(re,wt,ee+wt*1e-4)}function Io(L,it,pt,wt,re){return re.set(L+Math.sin(pt)*Math.cos(wt)*2,st.eye+Math.sin(wt)*2,it+Math.cos(pt)*Math.cos(wt)*2)}function xr(){let L=(j.maxX-j.minX)/2*1.1+.3,it=(j.maxZ-j.minZ)/2*1.1+.3,pt=K/lt,wt=Math.max(it,L/pt);jt.top=wt,jt.bottom=-wt,jt.right=wt*pt,jt.left=-wt*pt,jt.updateProjectionMatrix()}function ni(L,it={}){if(!u){J.mode=L;return}let pt=Rt.active?O??It:It;if(L===pt&&!it.walkTo)return;pt==="walk"&&!Rt.active&&Ri(),it.walkTo&&Object.assign(Ot,it.walkTo),st.cancelJourney(),fe.clear(),fe.locked&&L!=="walk"&&fe.requestLock(!1),Q.cursor.show(!1),Q.target.show(!1),St.enabled=xt.enabled=!1,y=!0;let wt=it.instant||o;Pt===jt?(Po(Ut,xe),yt.position.copy(Ut),yt.lookAt(xe),yt.fov=yh,yt.updateProjectionMatrix(),Pt=yt):Rt.active?xe.set(0,0,-1).applyQuaternion(yt.quaternion).add(yt.position):It==="walk"?Io(st.x,st.z,st.yaw,st.pitch,xe):xe.copy(St.target);let re=Ut.copy(yt.position),ee=xe,Ve=yt.fov,Pe=new F,Pn=new F,Qi=gt,_r=0;if(L==="walk")Pe.set(Ot.x,st.eye,Ot.z),Io(Ot.x,Ot.z,Ot.yaw,Ot.pitch,Pn),_r=2.4;else if(L==="dollhouse"){let ws=gr(Ot.yaw,Pe,Pn);St.minDistance=ws*.45,St.maxDistance=ws*1.7,Qi=_h}else xt.target.set(ut,0,ct),jt.zoom=1,xr(),Po(Pe,Pn),Qi=yh;let yr=pt==="walk";yr&&ei(!1),It=L,O=L,e.onMode(L),wt?(Rt.cancel(),yt.position.copy(Pe),yt.lookAt(Pn),E()):Rt.start(re,ee,Ve,Pe,Pn,Qi,yr?2.4:0,_r,.9),Ue()}function E(){let L=O??It;if(O=null,L==="walk"){st.place(Ot.x,Ot.z,Ot.yaw,Ot.pitch),yt.fov=gt,yt.updateProjectionMatrix(),st.apply(yt),ei(!0),Pt=yt,et=!0,H=!0;let it=t.roomAt(st.x,st.z);it!==v&&(v=it,e.onRoom(it)),A.playing&&A.phase==="walk"&&(A.phase="dwell",A.dwell=0,A.baseYaw=st.yaw)}else L==="dollhouse"?(ei(!1),yt.fov=_h,yt.updateProjectionMatrix(),gr(Ot.yaw,Ut,xe),St.target.copy(xe),Rt.active||yt.position.copy(Ut),St.update(),St.enabled=!g,Pt=yt,et=!0):(ei(!1),jt.position.set(xt.target.x,40,xt.target.z),jt.lookAt(xt.target.x,0,xt.target.z),jt.updateProjectionMatrix(),xt.update(),xt.enabled=!g,Pt=jt,et=!0);y=!0,Ue()}function G(){let L=St.target,it=we(L.x,j.minX,j.maxX),pt=we(L.z,j.minZ,j.maxZ),wt=we(L.y,0,2);(it!==L.x||wt!==L.y||pt!==L.z)&&(L.set(it,wt,pt),St.update())}function $(L){let it=t.views[L],[pt,,wt]=it.position,[re,ee,Ve]=it.target;return{x:pt,z:wt,yaw:Math.atan2(re-pt,Ve-wt),pitch:Math.atan2(ee-st.eye,Math.hypot(re-pt,Ve-wt))}}function Z(){return It==="walk"&&!Rt.active?t.roomAt(st.x,st.z):t.roomAt(Ot.x,Ot.z)}function Y(L){if(!t.views[L]||!Wt)return;let it=$(L);if(It!=="walk"||Rt.active){ni("walk",{walkTo:it});return}Q.target.show(!1);let pt=o?null:Wt.path(st.x,st.z,it.x,it.z);pt?st.walk(pt,it.yaw,it.pitch,L):(st.place(it.x,it.z,it.yaw,it.pitch),et=!0,st.arrived={room:L}),Ue()}function At(L){st.arrived=null,L.room||(Q.target.show(!1),Q.target.breathe(!1,o)),A.playing&&A.phase==="walk"&&(A.phase="dwell",A.dwell=0,A.baseYaw=st.yaw),H=!0}function Nt(L){if(!A.playing)return!1;let it=t.rooms.length,pt=!1;if(A.phase==="walk"){let wt=st.journey;A.progress=(A.index+(wt?.6*(wt.length?wt.s/wt.length:1):0))/it,!wt&&!Rt.active&&!st.arrived&&(A.phase="dwell",A.dwell=0,A.baseYaw=st.yaw)}else A.dwell+=L,o||(st.yaw=A.baseYaw+Math.sin(A.dwell*.42)*.17*on(0,1.5,A.dwell),pt=!0),A.progress=(A.index+.6+.4*Math.min(1,A.dwell/5))/it,A.dwell>5&&(A.index++,A.index>=it?(A.playing=!1,A.progress=1):(A.phase="walk",Y(t.rooms[A.index].id)));return A.dirty=!0,pt}function bt(){A.playing&&(A.playing=!1,A.phase==="dwell"&&(A.index=Math.min(t.rooms.length-1,A.index+1)),A.dirty=!0,vn(performance.now(),!0))}function Vt(){let L=st.journey;A.playing?(bt(),st.cancelJourney()):L&&(L.freeLook=!0)}function Gt(L,it,pt){let wt=X.getBoundingClientRect();return Et.set((L-wt.left)/wt.width*2-1,1-(it-wt.top)/wt.height*2),Tt.setFromCamera(Et,Pt),Tt.ray.intersectPlane(ht,pt)!==null}function te(L,it){return!!Wt&&Math.hypot(L-st.x,it-st.z)<12&&!Wt.blocked(L,it)&&Wt.sightline(st.x,st.z,L,it)}function se(){if(!u||g||Rt.active)return;if(It!=="walk"){let wt=ie.on&&Gt(ie.x,ie.y,ft)&&t.inside(ft.x,ft.z)&&!!t.views[t.roomAt(ft.x,ft.z)];X.style.cursor=wt?"pointer":"";return}let L=ie.x,it=ie.y;if(fe.locked){let wt=X.getBoundingClientRect();L=wt.left+wt.width/2,it=wt.top+wt.height/2}let pt=Gt(L,it,ft)&&te(ft.x,ft.z);pt&&Q.cursor.place(ft.x,ft.z),Q.cursor.show(pt),fe.locked||(X.style.cursor=pt?"pointer":"grab"),pt&&Q.update(Pt,K,lt)}function qt(L,it,pt){if(!u||g||Rt.active||!Wt||!Gt(L,it,ft))return;if(It!=="walk"){if(!t.inside(ft.x,ft.z))return;let Ve=t.roomAt(ft.x,ft.z);bt(),t.views[Ve]?Y(Ve):Wt.blocked(ft.x,ft.z)||ni("walk",{walkTo:{x:ft.x,z:ft.z,yaw:Ot.yaw,pitch:0}});return}if(bt(),Math.hypot(ft.x-st.x,ft.z-st.z)>14||!Wt.sightline(st.x,st.z,ft.x,ft.z)){e.onHint?.(Wd);return}let wt=Wt.blocked(ft.x,ft.z)?Wt.nearestFree(ft.x,ft.z,.6):[ft.x,ft.z],re=wt&&Wt.path(st.x,st.z,wt[0],wt[1]),ee=Q.target;if(!wt||!re){ee.place(ft.x,ft.z),ee.show(!0),Q.update(Pt,K,lt),ee.shake(o),setTimeout(()=>{st.journey||ee.show(!1)},650),e.onHint?.(Wd);return}ee.place(wt[0],wt[1]),ee.show(!0),ee.breathe(!0,o),Q.update(Pt,K,lt),Q.cursor.show(!1),ie.quiet=!pt,o?(st.place(wt[0],wt[1],st.yaw,st.pitch),et=!0,st.arrived={room:null}):st.walk(re,null,null,null),Ue()}function ve(){let L=new Date(Date.now()+l*36e5);return{date:L.toISOString().slice(0,10),hour:L.getUTCHours()+L.getUTCMinutes()/60}}function Le(){return new Date(Date.now()+t.listing.tzOffsetHours*36e5).toISOString().slice(0,10)}function ge(){P=performance.now(),Ed(tt.jd0,tt.hour,l,t.listing.lat,t.listing.lng,rt),V&&(V.apply(rt,tt.live?tt.weather:null,c,n,at)&&(y=!0),V.compensate(V.lamps.coverage(),It!=="walk"),w=!0),kt=!0;let L=performance.now();Mt&&(!tt.playing||L-mt>250)&&(mt=L,B.setScene({hour:tt.hour,elevation:rt.elevationDeg,rain:tt.live&&!!tt.weather?.rain})),ti()}function ye(){return{live:tt.live,date:tt.date,hour:tt.hour,sun:{azimuthDeg:rt.azimuthDeg,elevationDeg:rt.elevationDeg},weather:tt.live?tt.weather:null,playing:tt.playing}}function Ke(L,it){tt.hour=Math.min(vh,tt.hour+L*(vh-Hd)/u_),tt.hour>=vh&&(tt.playing=!1,y=!0,R=0),ge(),tt.playing||_n(it,!0)}function Lt(){let L=ve();L.date!==tt.date&&(tt.date=L.date,tt.jd0=bo(L.date)),tt.hour=L.hour}function an(){$t?.abort();let L=new AbortController;$t=L,Gd(t.listing.lat,t.listing.lng,L.signal).then(it=>{!h&&tt.live&&it&&(tt.weather=it,ge())}).catch(()=>{})}function pe(){ze(),Lt();let L=6e4-Date.now()%6e4+50;Bt=window.setTimeout(function it(){!tt.live||h||(Lt(),ge(),Bt=window.setTimeout(it,6e4-Date.now()%6e4+50))},L),an(),Ht=window.setInterval(an,15*6e4)}function ze(){clearTimeout(Bt),clearInterval(Ht),Bt=Ht=0,$t?.abort(),$t=null}function Sn(L,it){!H||!u||!it&&L-q<100||(H=!1,q=L,e.onPose({x:st.x,z:st.z,yaw:st.yaw,pitch:st.pitch,room:t.roomAt(st.x,st.z)}))}function vn(L,it){!A.dirty||!it&&L-A.lastAt<100||(A.dirty=!1,A.lastAt=L,e.onTour({playing:A.playing,index:Math.min(A.index,t.rooms.length-1),progress:A.progress}))}function _n(L,it){!kt||!it&&tt.playing&&L-_t<100||(kt=!1,_t=L,e.onLight(ye()))}function be(){let L=Math.max(1,i.clientWidth),it=Math.max(1,i.clientHeight);L===K&&it===lt||(K=L,lt=it,n.setSize(L,it,!1),yt.aspect=L/it,yt.updateProjectionMatrix(),xr(),nt&&Ki(),It==="plan"&&!Rt.active&&xt.update(),Ue())}let Re=new ResizeObserver(be);Re.observe(i);let Bn=()=>{b=document.hidden,B.setHeld(g||b),b?(m&&cancelAnimationFrame(m),m=0,fe.clear()):(tt.live&&(Lt(),ge()),Ue())};document.addEventListener("visibilitychange",Bn);let Me=L=>{o=L.matches,St.enableDamping=!o};r.addEventListener?.("change",Me);let kn=L=>{L.preventDefault(),ii("The browser paused the 3D view to save memory. Reopen the tour, or browse the original photographs.")};X.addEventListener("webglcontextlost",kn);function ii(L){d||h||(d=!0,m&&cancelAnimationFrame(m),m=0,fe.clear(),B.setHeld(!0),e.onError(L))}let vr=0;function Rn(L,it){h||L<vr||(vr=L,e.onLoad?.(L,it))}async function Sf(){if(Rn(.03,"Preparing the 3D view"),await mi(),h)return;let L=navigator.deviceMemory??8,it=s||L<=4?"low":"high",pt=new Ks,wt=0,re=!1,ee=()=>{},Ve=new Promise(Fe=>{ee=Fe});if(pt.onStart=()=>{wt++},pt.onLoad=()=>{re=!0,ee()},pt.onProgress=(Fe,Ts,Cf)=>Rn(.6+.08*(Ts/Math.max(1,Cf)),"Loading surfaces"),pt.onError=Fe=>{a&&console.warn("Tour texture failed to load:",Fe)},Rn(.08,"Building the apartment"),await mi(),h)return;let Pe=t.build(pt,it);Xt=Pe;let Pn=[];Pe.root.traverse(Fe=>{Fe.isLight&&Pn.push(Fe)}),Pn.forEach(Fe=>Fe.removeFromParent()),Pn.length&&a&&console.warn(`Tour model contained ${Pn.length} light(s); the engine removed them.`);for(let Fe of[Pe.walls,Pe.ceilings,Pe.lowWalls])Fe.traverse(Ts=>{Ts.castShadow=!1});if(at.add(Pe.root),h)return;Rn(.32,"Arranging the rooms"),await mi();let Qi=[Pe.contents,Pe.walls,Pe.ceilings,Pe.lowWalls],_r=0,yr=0;for(let Fe=0;Fe<Qi.length;Fe++){let Ts=Id([Qi[Fe]],t.roomAt);if(_r+=Ts.meshesBefore,yr+=Ts.meshesAfter,Rn(.32+.06*(Fe+1),"Arranging the rooms"),await mi(),h)return}a&&console.info(`Tour merge: ${_r} meshes \u2192 ${yr}`),Pe.root.updateMatrixWorld(!0);for(let Fe of[Pe.root,...Qi])Fe.matrixAutoUpdate=!1;Rn(.56,"Mapping the floor"),await mi(),Wt=Dd(t.inside,Pe.collisions,t.plan.bounds);let ws=new gn().setFromObject(Pe.ceilings);!ws.isEmpty()&&ws.min.y>1.8&&(oe=ws.min.y);let Ef=new gn(new F(j.minX,0,j.minZ),new F(j.maxX,oe+.15,j.maxZ));Rn(.6,"Lighting the rooms"),await mi();let Lh=new sr(n),Dh=new Al;Zt=Lh.fromScene(Dh,.04),at.environment=Zt.texture,Dh.dispose(),Lh.dispose(),V=new Ol(at,t,Pe,Ef),t.mirror&&(ot=new Bl(t.mirror,U.spec.mirror),at.add(ot.group)),V.setShadowSize(U.spec.shadow),ge(),Pe.lowWalls.visible=!1;let Af=t.views[t.start]?t.start:Object.keys(t.views)[0],Lo=$(Af);st.place(Lo.x,Lo.z,Lo.yaw,Lo.pitch),Ri(),st.apply(yt),v=t.roomAt(st.x,st.z),xr(),wt&&!re&&await Promise.race([Ve,new Promise(Fe=>setTimeout(Fe,1e4))]),!h&&(Rn(.7,"Preparing shaders"),await wf(),!(h||d)&&(u=!0,Rn(1,"Ready"),V.lamps.update(0,yt.position,!0),e.onRoom(v),e.onMode(It),Ss(),Tf(),kt=H=A.dirty=!0,Ue()))}async function wf(){let L=Xt,it=[L.walls,L.ceilings,L.lowWalls],pt=it.map(ee=>ee.visible);it.forEach(ee=>{ee.visible=!0}),ot?.warmup(!0);let wt=[];at.traverse(ee=>{ee.frustumCulled&&(wt.push(ee),ee.frustumCulled=!1)});let re=new Ie(64,64,{type:qe});try{if(n.setRenderTarget(null),await Ih(),Rn(.8,"Preparing shaders"),n.setRenderTarget(re),await Ih(),Rn(.88,"Warming up"),await mi(),h)return;n.shadowMap.needsUpdate=!0,y=!1,n.setRenderTarget(re),n.setClearColor(0,0),ot?.force(),n.render(at,yt),ot?.disarm(),n.setRenderTarget(null),n.setClearColor(V.background,1),n.render(at,yt),await mi(),U.spec.ao&&(Ki(),nt.renderScene(n,yt,()=>{},()=>{}),nt.composite(n,1,V.background,null)),Rn(.96,"Warming up")}finally{re.dispose(),wt.forEach(ee=>{ee.frustumCulled=!0}),it.forEach((ee,Ve)=>{ee.visible=pt[Ve]}),ot?.warmup(!1),ot&&(ot.stale=!0),n.setRenderTarget(null)}await mi()}async function Ih(){try{await n.compileAsync(at,yt)}catch{n.compile(at,yt)}}function Tf(){if(J.view){let L=J.view;J.view=void 0,ji.setView(L)}if(J.room){let L=J.room;J.room=void 0;let it=$(L);st.place(it.x,it.z,it.yaw,it.pitch),st.apply(yt),Ri()}if(J.mode){let L=J.mode;J.mode=void 0,ni(L,{instant:!0})}J.tour&&(J.tour=void 0,ji.setTour(!0))}let ji={goRoom(L){if(t.views[L]){if(!u){J.room=L;return}bt(),Y(L)}},walkTo(L,it){if(!u||!Wt||g)return!1;let pt=Wt.nearestFree(L,it,.8),wt=pt&&Wt.path(st.x,st.z,pt[0],pt[1]);return!pt||!wt?!1:(bt(),It!=="walk"||Rt.active?(ni("walk",{walkTo:{x:pt[0],z:pt[1],yaw:Ot.yaw,pitch:0}}),!0):(Q.target.place(pt[0],pt[1]),Q.target.show(!0),Q.target.breathe(!0,o),Q.update(Pt,K,lt),o?(st.place(pt[0],pt[1],st.yaw,st.pitch),st.arrived={room:null}):st.walk(wt,null,null,null),Ue(),!0))},move(L,it){L=we(L||0,-1,1),it=we(it||0,-1,1),(L||it)&&!fe.padX&&!fe.padZ&&xn.manual(),fe.padX=L,fe.padZ=it,ti()},look(L,it){u&&!g&&xn.look(L,it)},setRun(L){fe.runHeld=L,ti()},setEyeHeight(L){st.eye=we(L,1,1.9),It==="walk"&&!Rt.active&&u&&(st.apply(yt),Ue())},setFov(L){gt=we(L,d_,f_),It==="walk"&&!Rt.active&&(yt.fov=gt,yt.updateProjectionMatrix(),Q.visible&&Q.update(Pt,K,lt),Ue())},setPointerLock(L){L&&(It!=="walk"||!u)||fe.requestLock(L)},async setGyro(L){if(!L)return fe.disableGyro(),!1;let it=await fe.enableGyro();return it||e.onHint?.("Motion sensors aren\u2019t available on this device"),ti(),it},setMode(L){bt(),ni(L)},setTour(L){if(!u){J.tour=L;return}if(!L){bt();return}(A.index>=t.rooms.length||A.progress>=1)&&(A.index=0),A.playing=!0,A.phase="walk",A.dirty=!0,Y(t.rooms[A.index].id),vn(performance.now(),!0),ti()},reset(){if(!u){J.view=void 0,J.mode=void 0,J.room=void 0;return}A.playing=!1,A.index=0,A.progress=0,A.dirty=!0,st.cancelJourney(),Rt.cancel();let L=$(t.views[t.start]?t.start:Object.keys(t.views)[0]);ni("walk",{instant:!0,walkTo:L}),vn(performance.now(),!0)},setLive(L){tt.live=L,L?(tt.playing=!1,pe()):(ze(),tt.weather=null),ge(),_n(performance.now(),!0)},setDate(L){!/^\d{4}-\d{2}-\d{2}$/.test(L)||!Number.isFinite(bo(L))||(tt.live&&(tt.live=!1,ze(),tt.weather=null),tt.date=L,tt.jd0=bo(L),ge(),_n(performance.now(),!0))},setHour(L){Number.isFinite(L)&&(tt.live&&(tt.live=!1,ze(),tt.weather=null),tt.playing=!1,tt.hour=we(L,0,24),ge(),_n(performance.now(),!0))},playDay(L){L?(tt.live&&(tt.live=!1,ze(),tt.weather=null),tt.hour=Hd,tt.playing=!0):tt.playing=!1,y=!0,ge(),_n(performance.now(),!0)},setAmbience(L){Mt=L,L&&B.setScene({hour:tt.hour,elevation:rt.elevationDeg,rain:tt.live&&!!tt.weather?.rain}),B.setOn(L),B.setHeld(g||b)},setQuality(L){U.set(L),mr()},quality:Ji,getView(){let it=It==="walk"&&!Rt.active?st:Ot,pt={room:t.roomAt(it.x,it.z),x:it.x,z:it.z,yaw:it.yaw,pitch:it.pitch,mode:It};return tt.live||(pt.hour=tt.hour,pt.date=tt.date),pt},setView(L){if(!u||!Wt){J.view=L;return}let it=Number(L.x),pt=Number(L.z);if(!Number.isFinite(it)||!Number.isFinite(pt)||Wt.blocked(it,pt)){let ee=Number.isFinite(it)&&Number.isFinite(pt)?Wt.nearestFree(it,pt,.6):null;if(ee)[it,pt]=ee;else{let Ve=$(t.views[L.room]?L.room:t.start);it=Ve.x,pt=Ve.z}}let wt={x:it,z:pt,yaw:Number(L.yaw)||0,pitch:we(Number(L.pitch)||0,-Jn,Jn)};L.date&&/^\d{4}-\d{2}-\d{2}$/.test(L.date)&&ji.setDate(L.date),L.hour!=null&&Number.isFinite(L.hour)&&ji.setHour(L.hour),A.playing=!1,A.dirty=!0,st.cancelJourney(),Rt.cancel(),O=null,It!=="walk"?ni("walk",{instant:!0,walkTo:wt}):(st.place(wt.x,wt.z,wt.yaw,wt.pitch),Ri(),et=!0,fr());let re=L.mode==="dollhouse"||L.mode==="plan"?L.mode:"walk";re!=="walk"&&(Ri(),ni(re,{instant:!0})),Ue()},async snapshot(){if(!u||d||h||!V)return null;y&&(n.shadowMap.needsUpdate=!0,y=!1),Pt.updateMatrixWorld();let L=Math.floor(tt.hour),it=Math.round((tt.hour-L)*60),pt=`${String(it===60?L+1:L).padStart(2,"0")}:${String(it===60?0:it).padStart(2,"0")}`;try{return await Bd({renderer:n,scene:at,camera:Pt,screenWidth:K*(window.devicePixelRatio||1),ao:U.spec.ao&&It!=="plan",background:V.background,mirror:ot,caption:{title:t.listing.title,area:t.listing.area,hour:tt.live?null:pt,accent:t.theme.accent,night:t.theme.night,paper:t.theme.paper}})}catch(wt){return a&&console.warn("Postcard failed",wt),null}finally{Ue()}},setPaused(L){g!==L&&(g=L,fe.clear(),L&&fe.locked&&fe.requestLock(!1),St.enabled=!L&&It==="dollhouse"&&!Rt.active,xt.enabled=!L&&It==="plan"&&!Rt.active,B.setHeld(g||b),Ue())},dispose(){if(h)return;h=!0,m&&cancelAnimationFrame(m),m=0,ze(),Re.disconnect(),document.removeEventListener("visibilitychange",Bn),r.removeEventListener?.("change",Me),X.removeEventListener("webglcontextlost",kn),fe.dispose(),St.removeEventListener("change",he),xt.removeEventListener("change",he),St.removeEventListener("start",ys),xt.removeEventListener("start",ys),St.dispose(),xt.dispose(),Q.dispose(),B.dispose(),nt?.dispose(),ot?.dispose(),V?.sun.shadow.dispose();let L=new Set,it=new Set,pt=new Set;at.traverse(wt=>{let re=wt;re.isMesh&&(L.add(re.geometry),(Array.isArray(re.material)?re.material:[re.material]).forEach(ee=>it.add(ee)))}),Xt&&Object.values(Xt.materials).forEach(wt=>it.add(wt)),it.forEach(wt=>{for(let re of Object.values(wt))re instanceof sn&&pt.add(re);wt.dispose()}),L.forEach(wt=>wt.dispose()),pt.forEach(wt=>wt.dispose()),Zt?.dispose(),at.clear(),n.renderLists.dispose(),n.dispose(),n.forceContextLoss(),X.remove(),a&&delete i.tourSnapshot}};return a&&Object.defineProperty(i,"tourSnapshot",{configurable:!0,value:()=>({mode:It,ready:u,paused:g,position:{x:Pt.position.x,y:Pt.position.y,z:Pt.position.z},walker:{x:st.x,z:st.z},yaw:st.yaw,pitch:st.pitch,eye:st.eye,fov:gt,room:Z(),blocked:Wt?Wt.blocked(st.x,st.z):!1,drawCalls:k.calls,triangles:k.triangles,programs:n.info.programs?.length??0,dpr:n.getPixelRatio(),tier:U.tier,auto:U.auto,fps:Math.round(1e3/Math.max(1,U.frameMs)),sun:{azimuthDeg:rt.azimuthDeg,elevationDeg:rt.elevationDeg},light:{live:tt.live,hour:tt.hour,date:tt.date,playing:tt.playing},refine:z,flying:Rt.active,journey:st.journey?{length:st.journey.length,s:st.journey.s}:null,touring:A.playing,tourIndex:A.index,looping:m!==0,lamps:V?V.lamps.lights.map(L=>+L.intensity.toFixed(2)):[],footprint:{cursor:Q.cursor.shown,target:Q.target.shown}})}),Sf().catch(L=>{a&&console.error(L),ii("The 3D view could not be built on this device. The original photographs are all here.")}),ji}function m_(i){if(document.getElementById("tour-engine-style"))return;let t=new Dt(i),e=document.createElement("style");e.id="tour-engine-style",e.textContent=`.tour-canvas:focus{outline:none}.tour-canvas:focus-visible{outline:2px solid rgba(${Math.round(t.r*255)},${Math.round(t.g*255)},${Math.round(t.b*255)},.75);outline-offset:-2px}`,document.head.appendChild(e)}function g_(i){let t=i.views[i.start];return{goRoom(){},walkTo:()=>!1,move(){},look(){},setRun(){},setEyeHeight(){},setFov(){},setPointerLock(){},setGyro:async()=>!1,setMode(){},setTour(){},reset(){},setLive(){},setDate(){},setHour(){},playDay(){},setAmbience(){},setQuality(){},quality:()=>({tier:"battery",auto:!0,dpr:1,fps:0,ao:!1}),getView:()=>({room:i.start,x:t?t.position[0]:0,z:t?t.position[2]:0,yaw:0,pitch:0,mode:"walk"}),setView(){},snapshot:async()=>null,setPaused(){},dispose(){}}}var x_={walk:"w",dollhouse:"d",plan:"p"},v_={w:"walk",d:"dollhouse",p:"plan"},qd=/^[a-z0-9-]{1,32}$/;function Yd(i){let t=(e,n=2)=>(Math.round(e*10**n)/10**n).toFixed(n).replace(/\.?0+$/,"")||"0";return[qd.test(i.room)?i.room:"start",t(i.x),t(i.z),Math.round(i.yaw*180/Math.PI),Math.round(i.pitch*180/Math.PI),x_[i.mode]||"w",i.hour==null?"":t(i.hour),i.date?i.date.replace(/-/g,""):""].join("~")}function Zd(i){if(!i||i==="1"||i.length>120)return null;let t=i.split("~");if(t.length<6)return null;let e=c=>c===""?NaN:Number(c),n=e(t[1]),s=e(t[2]),r=e(t[3]),o=e(t[4]);if(![n,s,r,o].every(Number.isFinite)||Math.abs(n)>500||Math.abs(s)>500)return null;let a={room:qd.test(t[0])?t[0]:"start",x:n,z:s,yaw:r*Math.PI/180,pitch:Math.max(-80,Math.min(80,o))*Math.PI/180,mode:v_[t[5]]||"walk"},l=e(t[6]||"");return Number.isFinite(l)&&l>=0&&l<=24&&(a.hour=l),/^\d{8}$/.test(t[7]||"")&&(a.date=t[7].slice(0,4)+"-"+t[7].slice(4,6)+"-"+t[7].slice(6,8)),a}function I(i,t,...e){let n=document.createElement(i);if(t)for(let s in t){let r=t[s];r==null||r===!1||(typeof r=="function"?n.addEventListener(s.slice(2),r):n.setAttribute(s,r===!0?"":String(r)))}return $d(n,e),n}function $d(i,t){for(let e of t)e==null||e===!1||(Array.isArray(e)?$d(i,e):i.appendChild(typeof e=="object"?e:document.createTextNode(String(e))))}function ce(i,t){i.textContent!==t&&(i.textContent=t)}function de(i,t,e){if(e===!1||e==null){i.hasAttribute(t)&&i.removeAttribute(t);return}let n=e===!0?"":e;i.getAttribute(t)!==n&&i.setAttribute(t,n)}var tn=i=>String(i).padStart(2,"0");function Fn(i){let t=(Math.round(i*60)%1440+1440)%1440;return tn(Math.floor(t/60))+":"+tn(t%60)}var __=0,Kd=i=>`ct-${i}-${++__}`,y_='a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';function bh(i){return Array.from(i.querySelectorAll(y_)).filter(t=>!t.closest("[hidden]")&&t.getClientRects().length>0)}function Jd(i,t){if(i.key!=="Tab")return;let e=bh(t);if(!e.length)return;let n=e[0],s=e[e.length-1],r=document.activeElement;i.shiftKey&&(r===n||!t.contains(r))?(i.preventDefault(),s.focus()):!i.shiftKey&&r===s&&(i.preventDefault(),n.focus())}var Xl=i=>i instanceof HTMLElement&&(i.isContentEditable||i instanceof HTMLInputElement&&!["button","checkbox","radio","range"].includes(i.type)||i instanceof HTMLTextAreaElement||i instanceof HTMLSelectElement);var jd={walk:'<circle cx="13.2" cy="4.4" r="1.7"/><path d="M10.6 21l1.9-5.4-2.4-2.6.9-4.6 3.6 3.2 3 .7M11 8.4 8 9.7l-1.4 3M14.2 15.4l2.3 2.5L17 21"/>',dollhouse:'<path d="M3 10.6 12 4l9 6.6"/><path d="M5 9.2V20h14V9.2M5 14.6h14M12 9.6V20"/>',plan:'<rect x="3.5" y="3.5" width="17" height="17" rx="1.6"/><path d="M3.5 12.5h6.5v8M10 3.5v5M14 12.5h6.5M14 12.5v3.5"/>',share:'<path d="M12 3.5v11.5M7.8 7.6 12 3.5l4.2 4.1"/><path d="M8.5 10.5H6.4A1.4 1.4 0 0 0 5 11.9v7.2a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4v-7.2a1.4 1.4 0 0 0-1.4-1.4h-2.1"/>',photos:'<rect x="3" y="6" width="14.5" height="12.5" rx="1.8"/><path d="m3.4 16 3.9-3.9 3.6 3.6 2.4-2.4 3.8 3.8"/><circle cx="12.6" cy="10" r="1.2"/><path d="M6.5 3.5h11.7A2.3 2.3 0 0 1 20.5 5.8V15"/>',sun:'<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M2.8 12h2M19.2 12h2M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',sunset:'<path d="M7 16.5a5 5 0 0 1 10 0"/><path d="M3 16.5h18M6.5 20h11M12 4.5V8M4.9 9.4l1.9 1.5M19.1 9.4l-1.9 1.5"/>',moon:'<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1Z"/>',sound:'<path d="M4 9.6v4.8h3.4l4.6 4.1V5.5L7.4 9.6Z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6M18 6.6a7.6 7.6 0 0 1 0 10.8"/>',mute:'<path d="M4 9.6v4.8h3.4l4.6 4.1V5.5L7.4 9.6Z"/><path d="m15.8 9.8 4.4 4.4M20.2 9.8l-4.4 4.4"/>',sliders:'<path d="M4 7.5h9.5M18.5 7.5H20M4 16.5h1.5M10.5 16.5H20"/><circle cx="16" cy="7.5" r="2.2"/><circle cx="8" cy="16.5" r="2.2"/>',expand:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',shrink:'<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>',close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',info:'<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.7v.2"/>',play:'<path d="M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.7-6.2a.6.6 0 0 0 0-1L9.4 5.3a.6.6 0 0 0-.9.5Z" fill="currentColor" stroke="none"/>',pause:'<rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none"/>',left:'<path d="m14.5 6-6 6 6 6"/>',right:'<path d="m9.5 6 6 6-6 6"/>',up:'<path d="m6 14.5 6-6 6 6"/>',down:'<path d="m6 9.5 6 6 6-6"/>',out:'<path d="M7.5 16.5l9-9M9 7.5h7.5V15"/>',arrow:'<path d="M4.5 12h14.5M13.5 6.5 19 12l-5.5 5.5"/>',check:'<path d="m5 12.6 4.4 4.4L19 7.4"/>',link:'<path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',chat:'<path d="M4.2 20.2 5.4 16.6A8.3 8.3 0 1 1 8 19.1Z"/><path d="M9.2 8.6c0 3.4 2.8 6.2 6.2 6.2l1-1.7-2-1-1 .9a5 5 0 0 1-2.4-2.4l.9-1-1-2Z" fill="currentColor" stroke="none"/>',download:'<path d="M12 3.5v11.5M7.2 10.4 12 15.2l4.8-4.8M4.5 20.5h15"/>',gyro:'<rect x="8.2" y="3.5" width="7.6" height="17" rx="2"/><path d="M4.6 7.6a8.8 8.8 0 0 0 0 8.8M19.4 7.6a8.8 8.8 0 0 1 0 8.8M11 17.6h2"/>',run:'<circle cx="15" cy="4.3" r="1.8"/><path d="M4.5 20.5 8 16l3.4 1.6 1.6-4.9M7.6 10.4l3-2.6c.7-.6 1.7-.7 2.4-.2l2.2 1.8 1.4 3 3 .9M13 12.7l3.4 2.6-.7 5.2"/>',mouse:'<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 6.8v3.4"/>',map:'<path d="M9 4.6 3.6 6.4v13l5.4-1.8 6 2 5.4-1.8v-13L15 6.6Z"/><path d="M9 4.6v13M15 6.6v13"/>',more:'<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',reset:'<path d="M4.4 12.5a7.6 7.6 0 1 0 2.2-5.9L4.4 8.8"/><path d="M4.4 4.4v4.4h4.4"/>',calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',spark:'<path d="M12 3.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5Z"/><path d="M18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z"/>',cube:'<path d="M12 3 3.8 7.5v9L12 21l8.2-4.5v-9Z"/><path d="M3.8 7.5 12 12l8.2-4.5M12 12v9"/>',person:'<circle cx="12" cy="4.6" r="2"/><path d="M12 8.2v6.6M12 14.8l-2.8 5.8M12 14.8l2.8 5.8M7.4 10.8h9.2"/>',compass:'<circle cx="12" cy="12" r="8.6"/><path d="m14.9 9.1-1.6 4.2-4.2 1.6 1.6-4.2Z"/>',feet:'<path d="M8.6 3.4c-2 0-3 2.2-3 4.7 0 2.2.9 3.5 1.1 5.4h3.8c.2-1.9 1.1-3.2 1.1-5.4 0-2.5-1-4.7-3-4.7ZM6.8 16h3.8v1.2a1.9 1.9 0 0 1-3.8 0Z"/><path d="M15.4 7.4c2 0 3 2.2 3 4.7 0 2.2-.9 3.5-1.1 5.4h-3.8c-.2-1.9-1.1-3.2-1.1-5.4 0-2.5 1-4.7 3-4.7ZM13.5 20.1h3.8v.4a1.9 1.9 0 0 1-3.8 0Z"/>',copy:'<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>'};function Ft(i,t=""){let e=document.createElementNS("http://www.w3.org/2000/svg","svg");return e.setAttribute("viewBox","0 0 24 24"),e.setAttribute("aria-hidden","true"),e.setAttribute("focusable","false"),e.setAttribute("class",t?"ct-i "+t:"ct-i"),e.innerHTML=jd[i],e}function Qd(){let i=document.createElementNS("http://www.w3.org/2000/svg","svg");return i.setAttribute("viewBox","0 0 32 38"),i.setAttribute("aria-hidden","true"),i.setAttribute("class","ct-mark"),i.innerHTML='<path d="M25 10C22 3 9 3 6 11C1 24 12 36 25 28M9 24L24 9M14 21C11 13 16 8 24 9C25 16 22 21 14 21Z"/>',i}var p1=Object.keys(jd);function tf(i){let{def:t}=i,e=t.listing,n=t.photoUrl((t.rooms.find(a=>a.id===t.start)||t.rooms[0]).image),s=["","one","two","three","four","five","six"],r=e.bedrooms===0?"studio":`${s[e.bedrooms]||e.bedrooms}-bedroom home`,o=(a,l,c)=>I("li",null,Ft(a),I("div",null,I("b",null,l),I("span",null,c)));return I("div",{class:"ct-about"},I("figure",{class:"ct-about-img"},I("img",{src:n,alt:`${e.title}, from the original listing photographs`,loading:"lazy"}),I("figcaption",{class:"ct-kicker"},t.theme.collection)),I("div",{class:"ct-about-body"},I("header",{class:"ct-g-head"},I("div",null,I("span",{class:"ct-kicker"},"About this view"),I("h2",{id:"ct-about-title"},"A home, rebuilt from its photographs.")),I("button",{class:"ct-round ct-g-close",type:"button","aria-label":"Close",onclick:()=>i.closeDialog()},Ft("close"))),I("p",{class:"ct-about-lede"},`An interactive interpretation of this ${r} in ${e.area}, ${e.city}, modelled by hand from the original listing photographs. Walk through it, step back into the dollhouse, or watch the sun move across the rooms.`),I("h3",{class:"ct-kicker"},"How to move"),I("ul",{class:"ct-howto"},o("walk","Walk","W A S D or the arrow keys. On a phone, hold the lower left of the screen and steer with your thumb."),o("mouse","Look","Drag anywhere. Mouse look follows the mouse until you press Esc. On a phone, swipe, or turn on motion look."),o("feet","Go somewhere","Click or tap the floor, choose a room below, or use the map."),o("sunset","Live Light",`The real sun over ${e.area} at any hour, on any date, or live with today\u2019s weather.`)),I("div",{class:"ct-note"},Ft("info"),I("p",null,I("b",null,"Honest limits. "),t.accuracyNote)),I("p",{class:"ct-fine"},"Lighting is a simulation of the sun\u2019s position at the property, not a photograph. The original photographs show the actual apartment."),I("div",{class:"ct-about-actions"},I("a",{class:"ct-btn ct-btn-primary",href:i.listingUrl,target:"_top"},"View the listing",Ft("out")),I("button",{class:"ct-btn ct-btn-quiet",type:"button",onclick:()=>{i.closeDialog(),i.openPhotos()}},Ft("photos"),"See the original photographs"))))}function ef(i){let{def:t,store:e}=i,n=I("span",{class:"ct-kicker"}),s=I("h2",{class:"ct-cap-title"}),r=I("p",{class:"ct-cap-detail"}),o=I("i"),a=I("div",{class:"ct-cap-bar",role:"progressbar","aria-label":"Guided tour progress","aria-valuemin":"0","aria-valuemax":"100"},o),l=I("section",{class:"ct-caption","aria-label":"Where you are"},n,s,r,a),c=t.rooms.length;return e.on((h,d)=>{if(!(d.has("room")||d.has("mode")||d.has("tour")||d.has("phase")))return;let u,f,g,b=h.tour.playing&&h.mode==="walk";if(b){let p=t.rooms[Math.min(c-1,Math.max(0,h.tour.index))];u=`Guided tour \xB7 ${tn(h.tour.index+1)} / ${tn(c)}`,f=p.name,g=p.detail}else if(h.mode==="dollhouse")u="The whole residence",f="The whole picture.",g="Turn it in your hands. Choose a room to step inside.";else if(h.mode==="plan")u="Floor plan",f="Room to explore.",g="A view from above. Choose a room to walk there.";else{let p=t.rooms.findIndex(C=>C.id===h.room),S=t.rooms[p];u=S?`Room ${tn(p+1)} of ${tn(c)}`:"Between the rooms",f=S?S.name:i.roomName(h.room),g=S?S.detail:"A quiet passage from one room to the next."}s.textContent!==f&&(l.classList.remove("is-new"),l.offsetWidth,l.classList.add("is-new")),ce(n,u),ce(s,f),ce(r,g),l.classList.toggle("is-touring",b);let m=Math.round(Math.max(0,Math.min(1,h.tour.progress))*100);o.style.transform=`scaleX(${m/100})`,de(a,"aria-valuenow",String(m))}),l}var Mh=2*Math.PI*16;function nf(i){let{def:t,store:e}=i,n=t.rooms.length,s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 36 36"),s.setAttribute("class","ct-ring"),s.setAttribute("aria-hidden","true"),s.innerHTML=`<circle cx="18" cy="18" r="16"/><circle class="ct-ring-p" cx="18" cy="18" r="16" stroke-dasharray="${Mh}" stroke-dashoffset="${Mh}"/>`;let r=s.lastElementChild,o=I("span",{class:"ct-tour-ico"},Ft("play")),a=I("small",null,`${n} rooms`),l=I("button",{class:"ct-tourbtn",type:"button","aria-pressed":"false",onclick:()=>i.toggleTour()},I("span",{class:"ct-tour-dial"},s,o),I("span",{class:"ct-tourbtn-text"},I("b",null,"Guided tour"),a)),c=t.rooms.map((p,S)=>I("button",{class:"ct-room",type:"button","data-room":p.id,"aria-label":`${p.name}. ${p.detail}`,onclick:()=>i.chooseRoom(p.id)},I("span",{class:"ct-room-img"},I("img",{src:t.photoUrl(p.image),alt:"",loading:"lazy",decoding:"async"})),I("span",{class:"ct-room-name"},I("i",null,tn(S+1)),p.name))),h=I("div",{class:"ct-rooms"},c),d=I("span",{class:"ct-kicker"}),u=I("b"),f=I("span",{class:"ct-pill-chev"},Ft("up")),g=I("button",{class:"ct-dock-pill",type:"button","aria-expanded":"true","aria-label":"Show or hide the rooms",onclick:()=>e.set({dockOpen:!e.get().dockOpen})},I("span",{class:"ct-pill-text"},d,u),f),b=I("nav",{class:"ct-dock","aria-label":"Rooms"},I("div",{class:"ct-dock-bar"},l,g),h),m=matchMedia("(prefers-reduced-motion: reduce)");return e.on((p,S)=>{if(S.has("room")||S.has("mode")){let C=t.rooms.findIndex(M=>M.id===p.room);c.forEach(M=>{let T=M.dataset.room===p.room;de(M,"aria-current",T?"location":!1),M.classList.toggle("is-here",T&&p.mode==="walk")}),ce(d,C>=0?`${tn(C+1)} / ${tn(n)}`:"Rooms"),ce(u,p.mode==="walk"?i.roomName(p.room):p.mode==="plan"?"Floor plan":"Dollhouse");let _=c[C];_&&h.scrollWidth>h.clientWidth&&h.scrollTo({left:_.offsetLeft-(h.clientWidth-_.offsetWidth)/2,behavior:m.matches?"auto":"smooth"})}if(S.has("tour")){let{playing:C,index:_,progress:M}=p.tour;de(l,"aria-pressed",C?"true":"false"),de(l,"aria-label",C?"Pause the guided tour":"Start the guided tour"),o.replaceChildren(Ft(C?"pause":"play")),r.setAttribute("stroke-dashoffset",String(Mh*(1-Math.max(0,Math.min(1,C?M:0))))),ce(a,C?`${tn(_+1)} of ${tn(n)} \xB7 ${t.rooms[Math.min(n-1,_)]?.name??""}`:`${n} rooms`),b.classList.toggle("is-touring",C)}S.has("dockOpen")&&(b.classList.toggle("is-folded",!p.dockOpen),de(g,"aria-expanded",p.dockOpen?"true":"false"),f.replaceChildren(Ft(p.dockOpen?"down":"up")))}),b}function Zi(i,t,e,n,...s){let r=Kd(t);return I("section",{class:`ct-panel ct-glass-deep ct-panel-${t}`,role:"dialog","aria-modal":"false","aria-labelledby":r,hidden:!0},I("header",{class:"ct-ph"},I("div",null,I("span",{class:"ct-kicker"},e),I("h2",{id:r},n)),I("button",{class:"ct-x",type:"button","aria-label":`Close ${n}`,onclick:()=>i.closePanel()},Ft("close"))),...s)}function Eo(i,t,e=""){return I("button",{class:"ct-switch "+e,type:"button",role:"switch","aria-checked":"false",onclick:t},I("span",{class:"ct-switch-label"},i),I("span",{class:"ct-switch-track","aria-hidden":"true"},I("i")))}var Ao=(i,t)=>de(i,"aria-checked",t?"true":"false");function Sh(i,t,e){let n=t.map(s=>I("button",{type:"button","aria-pressed":"false",title:s.hint,onclick:()=>e(s.value)},s.label));return{el:I("div",{class:"ct-seg",role:"group","aria-label":i},n),set(s){n.forEach((r,o)=>de(r,"aria-pressed",t[o].value===s?"true":"false"))}}}var ql=(i,...t)=>I("div",{class:"ct-row"},I("span",{class:"ct-row-label"},i),...t);var Yl=Math.PI/180;function Co(i,t,e){let[n,s,r]=t.split("-").map(Number),o=Math.round((Date.UTC(n,s-1,r)-Date.UTC(n,0,1))/864e5)+1,a=n%4===0&&n%100!==0||n%400===0,l=2*Math.PI/(a?366:365)*(o-1+(e-i.tz-12)/24),c=229.18*(75e-6+.001868*Math.cos(l)-.032077*Math.sin(l)-.014615*Math.cos(2*l)-.040849*Math.sin(2*l)),h=.006918-.399912*Math.cos(l)+.070257*Math.sin(l)-.006758*Math.cos(2*l)+907e-6*Math.sin(2*l)-.002697*Math.cos(3*l)+.00148*Math.sin(3*l),u=((e*60+c+4*i.lng-60*i.tz)/4-180)*Yl,f=i.lat*Yl,g=Math.sin(f)*Math.sin(h)+Math.cos(f)*Math.cos(h)*Math.cos(u),b=Math.acos(Math.max(-1,Math.min(1,g))),m=Math.atan2(Math.sin(u),Math.cos(u)*Math.sin(f)-Math.tan(h)*Math.cos(f))/Yl+180;return{elevationDeg:90-b/Yl,azimuthDeg:(m+360)%360}}function wh(i,t,e,n,s,r){let o=Co(i,t,s).elevationDeg;for(let a=s+1/30;a<r;a+=1/30){let l=Co(i,t,a).elevationDeg;if(n?o<e&&l>=e:o>e&&l<=e)return a;o=l}return null}var Th=i=>Math.round(i*12)/12;function Eh(i,t){let e=wh(i,t,-.833,!0,0,12),n=wh(i,t,-.833,!1,12,24),s=wh(i,t,7,!1,12,24);return{rise:e,set:n,morning:Th(e==null?8:Math.max(7,e+1.5)),golden:Th(s??(n==null?17.5:n-.7)),evening:Th(Math.min(21.5,n==null?19.5:n+1.1))}}function Ro(i,t=Date.now()){let e=new Date(t+i*36e5);return{date:e.toISOString().slice(0,10),hour:e.getUTCHours()+e.getUTCMinutes()/60}}function Ah(i,t){let[e,n,s]=i.split("-").map(Number);return new Date(Date.UTC(e,n-1,s+t)).toISOString().slice(0,10)}function sf(i,t){return t<-6?"Night":t<0?i<12?"Dawn":"Blue hour":t<10?i<12?"Early light":"Golden hour":i<11?"Morning":i<14.5?"Midday":"Afternoon"}function rf(i){return i==="Night"||i==="Blue hour"||i==="Dawn"?"moon":i==="Early light"||i==="Golden hour"?"sunset":"sun"}var b_="http://www.w3.org/2000/svg",Qn=5,Ci=22,_s=320,jn=92,$i=i=>14+(i-Qn)/(Ci-Qn)*(_s-28),of=i=>Math.max(8,Math.min(112,jn-Math.sin(i*Math.PI/180)*78)),M_=i=>Qn+(i-14)/(_s-28)*(Ci-Qn),Cn=(i,t={})=>{let e=document.createElementNS(b_,i);for(let n in t)e.setAttribute(n,String(t[n]));return e},af=i=>{let[t,e,n]=i.split("-").map(Number);return new Date(Date.UTC(t,e-1,n)).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"})};function lf(i){let{def:t,store:e}=i,n=t.listing,s={lat:n.lat,lng:n.lng,tz:n.tzOffsetHours},r=()=>i.api(),o=()=>{e.get().light?.live&&r()?.setLive(!1)},a=I("span",{class:"ct-lc-ico"},Ft("sun")),l=I("span",{class:"ct-lc-time"},"\u2014"),c=I("span",{class:"ct-lc-phase"},"Live Light"),h=I("span",{class:"ct-live"},I("i"),"Live"),d=I("button",{class:"ct-lightchip ct-glass",type:"button","data-panel":"light","aria-expanded":"false","aria-label":"Live Light: change the time of day",onclick:nt=>i.togglePanel("light",nt.currentTarget)},a,I("span",{class:"ct-lc-text"},l,c),h),u=Cn("svg",{viewBox:`0 0 ${_s} 132`,class:"ct-arc","aria-hidden":"true"});u.innerHTML=`<defs><linearGradient id="ct-arc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hi);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--hi);stop-opacity:0"/></linearGradient><clipPath id="ct-arc-day"><rect x="0" y="0" width="${_s}" height="${jn}"/></clipPath><clipPath id="ct-arc-night"><rect x="0" y="${jn}" width="${_s}" height="60"/></clipPath><radialGradient id="ct-sun-glow"><stop offset="0" style="stop-color:var(--hi);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--hi);stop-opacity:0"/></radialGradient></defs>`;let f=Cn("path",{class:"ct-arc-area","clip-path":"url(#ct-arc-day)",fill:"url(#ct-arc-fill)"}),g=Cn("path",{class:"ct-arc-day","clip-path":"url(#ct-arc-day)"}),b=Cn("path",{class:"ct-arc-night","clip-path":"url(#ct-arc-night)"}),m=Cn("line",{class:"ct-arc-horizon",x1:6,x2:_s-6,y1:jn,y2:jn}),p=Cn("g",{class:"ct-arc-ticks"});for(let nt of[6,9,12,15,18,21]){p.append(Cn("line",{x1:$i(nt),x2:$i(nt),y1:jn-3,y2:jn+3}));let Zt=Cn("text",{x:$i(nt),y:126,"text-anchor":"middle"});Zt.textContent=String(nt).padStart(2,"0"),p.append(Zt)}let S=Cn("text",{class:"ct-arc-mark","text-anchor":"end"}),C=Cn("text",{class:"ct-arc-mark","text-anchor":"start"}),_=Cn("line",{class:"ct-arc-stem"}),M=Cn("circle",{r:18,fill:"url(#ct-sun-glow)"}),T=Cn("circle",{r:6.5,class:"ct-arc-sun"});u.append(f,m,p,b,g,S,C,_,M,T);let w=0,x=-1,y=!1,R=nt=>{x=Math.round(Math.max(Qn,Math.min(Ci,nt))*12)/12,!w&&(w=requestAnimationFrame(()=>{w=0,o(),r()?.setHour(x)}))},P=nt=>{let Zt=u.getBoundingClientRect();R(M_((nt.clientX-Zt.left)/Zt.width*_s))};u.addEventListener("pointerdown",nt=>{u.setPointerCapture(nt.pointerId),y=!0,P(nt)}),u.addEventListener("pointermove",nt=>{u.hasPointerCapture(nt.pointerId)&&P(nt)});let D=()=>{y=!1};u.addEventListener("pointerup",D),u.addEventListener("pointercancel",D);let z=I("span",{class:"ct-lp-time"},"\u2014"),W=I("span",{class:"ct-lp-phase"}),N=I("span",{class:"ct-lp-day"}),k=I("input",{class:"ct-range","data-autofocus":!0,type:"range",min:Qn,max:Ci,step:1/12,value:12,"aria-label":"Time of day at the property"});k.addEventListener("input",()=>R(Number(k.value))),k.addEventListener("pointerdown",()=>{y=!0}),k.addEventListener("pointerup",()=>{y=!1}),k.addEventListener("blur",()=>{y=!1});let U=[{key:"morning",label:"Morning",ico:"sun"},{key:"golden",label:"Golden hour",ico:"sunset"},{key:"evening",label:"Evening",ico:"moon"}],X=Eh(s,Ro(s.tz).date),K=[],lt=[],at=I("div",{class:"ct-presets",role:"group","aria-label":"Moments"},U.map(nt=>{let Zt=I("small");K.push(Zt);let oe=I("button",{type:"button","data-preset":nt.key,"aria-pressed":"false",onclick:()=>{o(),r()?.setHour(X[nt.key])}},Ft(nt.ico),I("span",null,nt.label,Zt));return lt.push(oe),oe})),gt=I("button",{class:"ct-chip",type:"button","aria-pressed":"false",onclick:()=>ut(Ro(s.tz).date)},"Today"),yt=I("button",{class:"ct-chip",type:"button","aria-pressed":"false",onclick:()=>ut(Ah(Ro(s.tz).date,1))},"Tomorrow"),jt=I("span",null,"Check-in day"),Pt=I("input",{type:"date","aria-label":"See it on your check-in day"});Pt.addEventListener("change",()=>{/^\d{4}-\d{2}-\d{2}$/.test(Pt.value)&&ut(Pt.value)}),Pt.addEventListener("click",()=>{try{Pt.showPicker?.()}catch{}});let j=I("label",{class:"ct-chip ct-chip-date"},Ft("calendar"),jt,Pt);function ut(nt){o(),r()?.setDate(nt)}let ct=I("small"),zt=Eo([I("b",null,I("span",{class:"ct-live"},I("i")),"Live"),ct],()=>{let nt=!e.get().light?.live;r()?.setLive(nt)},"ct-live-switch"),St=I("span",null,"Play the day"),xt=I("span",null,Ft("play")),he=I("button",{class:"ct-btn ct-btn-line ct-play",type:"button","aria-pressed":"false",onclick:()=>r()?.playDay(!e.get().light?.playing)},xt,St),Xt=Zi(i,"light","Live Light","The light here",I("div",{class:"ct-lp-read"},z,I("span",{class:"ct-lp-meta"},W,N)),u,k,at,I("div",{class:"ct-dates",role:"group","aria-label":"Date"},gt,yt,j),zt,he,I("p",{class:"ct-fine"},`A simulation of the real sun over ${n.area}. Not a photograph.`));i.registerPanel("light",{el:Xt,keepOnScene:!0,onOpen:()=>ot(e.get().light,!0)});let Wt="";function V(nt){if(nt===Wt)return;Wt=nt,X=Eh(s,nt);let Zt=[];for(let Ot=Qn;Ot<=Ci+1e-6;Ot+=1/6)Zt.push(`${$i(Ot).toFixed(1)} ${of(Co(s,nt,Ot).elevationDeg).toFixed(1)}`);let oe="M"+Zt.join("L");g.setAttribute("d",oe),b.setAttribute("d",oe),f.setAttribute("d",`${oe}L${$i(Ci)} ${jn}L${$i(Qn)} ${jn}Z`);let st=(Ot,It,O)=>{if(It==null||It<Qn||It>Ci){Ot.textContent="";return}Ot.setAttribute("x",String($i(It)+O)),Ot.setAttribute("y",String(jn-7)),Ot.textContent=Fn(It)};st(S,X.rise,-6),st(C,X.set,6),K.forEach((Ot,It)=>ce(Ot,Fn(X[U[It].key])))}function ot(nt,Zt=!1){let oe=Ro(s.tz);if(!nt){V(oe.date);return}if(!Xt.hidden||Zt){V(nt.date);let Rt=$i(Math.max(Qn,Math.min(Ci,nt.hour))),A=of(Co(s,nt.date,nt.hour).elevationDeg);T.setAttribute("cx",Rt.toFixed(1)),T.setAttribute("cy",A.toFixed(1)),M.setAttribute("cx",Rt.toFixed(1)),M.setAttribute("cy",A.toFixed(1)),_.setAttribute("x1",Rt.toFixed(1)),_.setAttribute("x2",Rt.toFixed(1)),_.setAttribute("y1",A.toFixed(1)),_.setAttribute("y2",String(jn)),u.classList.toggle("is-night",nt.sun.elevationDeg<0)}let st=sf(nt.hour,nt.sun.elevationDeg);ce(z,Fn(nt.hour)),ce(W,st);let Ot=Ah(oe.date,1);ce(N,nt.date===oe.date?"Today":nt.date===Ot?"Tomorrow":af(nt.date)),y||(k.value=String(Math.max(Qn,Math.min(Ci,nt.hour)))),lt.forEach((Rt,A)=>de(Rt,"aria-pressed",!nt.live&&!nt.playing&&Math.abs(X[U[A].key]-nt.hour)<.05?"true":"false")),de(k,"aria-valuetext",`${Fn(nt.hour)}, ${st}`),de(gt,"aria-pressed",nt.date===oe.date?"true":"false"),de(yt,"aria-pressed",nt.date===Ot?"true":"false");let It=nt.date!==oe.date&&nt.date!==Ot;j.classList.toggle("is-on",It),ce(jt,It?af(nt.date):"Check-in day"),de(Pt,"min",oe.date),It&&Pt.value!==nt.date&&(Pt.value=nt.date),Ao(zt,nt.live);let O=nt.weather;ce(ct,nt.live?[`Now in ${n.area}`,Fn(nt.hour),O?`${Math.round(O.temp)}\xB0`:"",O?O.label:""].filter(Boolean).join(" \xB7 "):"Follow the real time and weather there"),de(he,"aria-pressed",nt.playing?"true":"false"),ce(St,nt.playing?"Pause the day":"Play the day"),xt.replaceChildren(Ft(nt.playing?"pause":"play"));let Ee=rf(st);a.dataset.ico!==Ee&&(a.dataset.ico=Ee,a.replaceChildren(Ft(Ee))),ce(l,Fn(nt.hour)),ce(c,nt.playing?"Playing the day":st),d.classList.toggle("is-live",nt.live),d.classList.toggle("is-night",nt.sun.elevationDeg<-2),de(d,"aria-label",`Live Light: ${Fn(nt.hour)}, ${st}${nt.live?", live":""}. Change the time of day`)}return e.on((nt,Zt)=>{Zt.has("light")&&ot(nt.light)}),{chip:d,panel:Xt}}var S_="http://www.w3.org/2000/svg",On=(i,t={})=>{let e=document.createElementNS(S_,i);for(let n in t)e.setAttribute(n,String(t[n]));return e};function cf(i){let{def:t,store:e}=i,n=t.plan.bounds,s=n.maxX-n.minX,r=n.maxZ-n.minZ,o=Math.max(s,r),a=o*.04,l=On("svg",{viewBox:`${n.minX-a} ${n.minZ-a} ${s+a*2} ${r+a*2}`,class:"ct-plan",role:"group","aria-label":"Floor plan. Choose a room to walk there."});l.style.setProperty("--u",String(o/100));let c=new Map;for(let S of t.plan.rooms){let C=On("g",{class:S.hall||!t.views[S.id]?"ct-pr is-hall":"ct-pr"});C.append(On("rect",{x:S.x,y:S.z,width:S.w,height:S.d,rx:o*.006}));let _=S.x+S.w/2,M=S.z+S.d/2,T=On("text",{x:_,y:M,"text-anchor":"middle","dominant-baseline":"central","font-size":o*.035});if(S.d>S.w*1.6&&S.w<o*.18&&T.setAttribute("transform",`rotate(-90 ${_} ${M})`),T.textContent=S.label,C.append(T),!S.hall&&t.views[S.id]){let w=()=>{i.chooseRoom(S.id),e.get().panel==="map"&&i.closePanel()};C.setAttribute("role","button"),C.setAttribute("tabindex","0"),C.setAttribute("aria-label",`Walk to the ${i.roomName(S.id).toLowerCase()}`),C.addEventListener("click",w),C.addEventListener("keydown",x=>{(x.key==="Enter"||x.key===" ")&&(x.preventDefault(),w())})}c.set(S.id,C),l.append(C)}let h=o*.085,d=On("defs"),u=On("radialGradient",{id:"ct-cone",cx:0,cy:0,r:h,gradientUnits:"userSpaceOnUse"});u.append(On("stop",{offset:0,style:"stop-color:var(--hi);stop-opacity:.6"}),On("stop",{offset:1,style:"stop-color:var(--hi);stop-opacity:0"})),d.append(u),l.prepend(d);let f=On("g",{class:"ct-me","aria-hidden":"true"}),g=On("path",{d:`M0 0L${-h*.66} ${-h}Q0 ${-h*1.28} ${h*.66} ${-h}Z`,fill:"url(#ct-cone)"});f.append(g,On("circle",{r:o*.03,class:"ct-me-halo"}),On("circle",{r:o*.016,class:"ct-me-dot"})),l.append(f);let b=I("button",{class:"ct-x",type:"button","aria-label":"Open the floor plan",onclick:()=>{i.setMode(e.get().mode==="plan"?"walk":"plan"),i.closePanel()}},Ft("out")),m=I("aside",{class:"ct-map ct-glass","aria-label":"Map of the apartment"},I("header",null,I("span",{class:"ct-kicker"},Ft("compass"),"The residence"),b),l,I("footer",null,I("span",null,I("i"),"You are here"),I("small",null,"Illustrative plan"))),p=I("button",{class:"ct-round ct-glass ct-mapbtn",type:"button","aria-label":"Show the map","data-panel":"map","aria-expanded":"false",onclick:S=>i.togglePanel("map",S.currentTarget)},Ft("map"));return i.registerPanel("map",{el:m,cssOnly:!0}),e.on((S,C)=>{if(C.has("pose")&&S.pose){let _=S.pose;f.setAttribute("transform",`translate(${_.x.toFixed(3)} ${_.z.toFixed(3)})`),g.setAttribute("transform",`rotate(${(180-_.yaw*180/Math.PI).toFixed(1)})`)}(C.has("room")||C.has("mode"))&&c.forEach((_,M)=>_.classList.toggle("is-here",M===S.room)),C.has("mode")&&m.classList.toggle("is-away",S.mode!=="walk")}),{card:m,button:p}}var w_={w:[0,1],a:[-1,0],s:[0,-1],d:[1,0]},T_={KeyW:"w",ArrowUp:"w",KeyA:"a",ArrowLeft:"a",KeyS:"s",ArrowDown:"s",KeyD:"d",ArrowRight:"d"};function hf(i){let{store:t}=i,e=()=>i.api(),n=["w","a","s","d"].map(N=>{let[k,U]=w_[N],X={w:"Walk forward",a:"Step left",s:"Step back",d:"Step right"}[N],K=I("button",{type:"button",class:"ct-cap","data-k":N,"aria-label":X},N.toUpperCase()),lt=()=>{K.classList.contains("is-down")&&(K.classList.remove("is-down"),e()?.move(0,0))};return K.addEventListener("pointerdown",at=>{at.preventDefault(),K.setPointerCapture(at.pointerId),K.classList.add("is-down"),e()?.move(k,U)}),K.addEventListener("pointerup",lt),K.addEventListener("pointercancel",lt),K.addEventListener("lostpointercapture",lt),K.addEventListener("keydown",at=>{(at.key==="Enter"||at.key===" ")&&!at.repeat&&(at.preventDefault(),K.classList.add("is-down"),e()?.move(k,U))}),K.addEventListener("keyup",at=>{(at.key==="Enter"||at.key===" ")&&lt()}),K.addEventListener("blur",lt),K}),s=I("p",{class:"ct-keys-text"}),r=I("span",null,"Mouse look"),o=I("button",{class:"ct-mlook",type:"button","aria-pressed":"false",onclick:()=>i.toggleMouseLook()},Ft("mouse"),r),a=I("div",{class:"ct-keys ct-glass",role:"group","aria-label":"Walking"},I("div",{class:"ct-pad"},n),s,o),l=(N,k)=>{let U=T_[N.code];!U||Xl(N.target)||n.find(X=>X.dataset.k===U)?.classList.toggle("is-lit",k)};window.addEventListener("keydown",N=>l(N,!0)),window.addEventListener("keyup",N=>l(N,!1)),window.addEventListener("blur",()=>n.forEach(N=>N.classList.remove("is-lit")));let c=I("i",{class:"ct-stick-knob"}),h=I("div",{class:"ct-stick","aria-hidden":"true"},c),d=I("div",{class:"ct-stick-zone","aria-hidden":"true"}),u=I("div",{class:"ct-stick-ghost","aria-hidden":"true"},I("i"),I("span",null,"Hold here",I("br"),"to walk")),f=48,g=-1,b=0,m=0,p=0,S=0,C=0,_=0,M=0,T=()=>{C=0,e()?.move(_,M)};d.addEventListener("pointerdown",N=>{g===-1&&(g=N.pointerId,b=N.clientX,m=N.clientY,p=performance.now(),S=0,d.setPointerCapture(N.pointerId),h.style.transform=`translate(${b}px, ${m}px)`,c.style.transform="",h.classList.add("is-on"))}),d.addEventListener("pointermove",N=>{if(N.pointerId!==g)return;let k=N.clientX-b,U=N.clientY-m,X=Math.hypot(k,U);S=Math.max(S,X),X>f&&(k*=f/X,U*=f/X),c.style.transform=`translate(${k}px, ${U}px)`;let K=Math.min(1,X/f),lt=K<.14?0:(K-.14)/.86;_=X?k/Math.min(X,f)*lt:0,M=X?-U/Math.min(X,f)*lt:0,C||(C=requestAnimationFrame(T)),S>10&&!i.el.classList.contains("stick-used")&&(i.el.classList.add("stick-used"),t.set({dockOpen:!1}))});let w=N=>{N.pointerId===g&&(g=-1,h.classList.remove("is-on"),C&&cancelAnimationFrame(C),C=0,_=M=0,e()?.move(0,0),N.type==="pointerup"&&S<8&&performance.now()-p<320&&x(N.clientX,N.clientY))};d.addEventListener("pointerup",w),d.addEventListener("pointercancel",w);function x(N,k){d.style.pointerEvents="none";let U=document.elementFromPoint(N,k);if(d.style.pointerEvents="",!U||!i.scene.contains(U))return;let X={bubbles:!0,cancelable:!0,composed:!0,clientX:N,clientY:k,screenX:N,screenY:k,button:0,pointerId:9001,pointerType:"touch",isPrimary:!0};U.dispatchEvent(new PointerEvent("pointerdown",{...X,buttons:1})),U.dispatchEvent(new PointerEvent("pointerup",{...X,buttons:0})),U.dispatchEvent(new MouseEvent("click",X))}let y=I("button",{class:"ct-runbtn ct-glass",type:"button","aria-label":"Hold to run"},Ft("run"),I("span",null,"Run")),R=()=>{y.classList.contains("is-down")&&(y.classList.remove("is-down"),e()?.setRun(!1))};y.addEventListener("pointerdown",N=>{N.preventDefault(),y.setPointerCapture(N.pointerId),y.classList.add("is-down"),e()?.setRun(!0)}),y.addEventListener("pointerup",R),y.addEventListener("pointercancel",R),y.addEventListener("lostpointercapture",R),y.addEventListener("contextmenu",N=>N.preventDefault()),y.addEventListener("keydown",N=>{(N.key==="Enter"||N.key===" ")&&!N.repeat&&(N.preventDefault(),y.classList.add("is-down"),e()?.setRun(!0))}),y.addEventListener("keyup",R);let P=I("button",{class:"ct-round ct-glass ct-gyro",type:"button","aria-pressed":"false","aria-label":"Look by moving your phone",onclick:z},Ft("gyro"));"DeviceOrientationEvent"in window||(P.hidden=!0);let D=!1;async function z(){let N=e();if(!N||D)return;let k=!t.get().gyro;D=!0;let U=!1;try{U=await N.setGyro(k)}catch{U=!1}D=!1,t.set({gyro:k&&U}),k&&i.toast(U?"Move your phone to look around":"Motion look is not available on this device",U?"ok":"warn")}let W=I("div",{class:"ct-touchcol"},P,y);return t.on((N,k)=>{(k.has("mode")||k.has("input"))&&(ce(s,""),s.append(...N.mode==="walk"?[I("span",null,I("b",null,"Drag")," to look around"),I("span",null,I("b",null,"Click the floor")," to walk there")]:[I("span",null,I("b",null,"Drag")," to turn \xB7 ",I("b",null,"scroll")," to zoom"),I("span",null,I("b",null,"Click a room")," to step inside")])),k.has("pointerLock")&&(de(o,"aria-pressed",N.pointerLock?"true":"false"),ce(r,N.pointerLock?"Esc to release":"Mouse look")),k.has("gyro")&&de(P,"aria-pressed",N.gyro?"true":"false")}),[a,d,h,u,W]}function Ch(i,t){let{def:e}=i,n=e.rooms.map(y=>({id:y.id,name:y.name,detail:y.detail,room:!0,photos:y.photos.map(R=>({id:R,name:y.name}))}));e.extraPhotos?.photos.length&&n.push({...e.extraPhotos,room:!1});let s=0,r=0,o=t?"ct-fb-title":"ct-ph-title",a=I("span",{class:"ct-kicker"},t?"The residence in photographs":"The original photographs"),l=I("h2",{id:o}),c=I("p",{class:"ct-g-detail"}),h=n.map((y,R)=>I("button",{type:"button","aria-pressed":"false",onclick:()=>{s=R,r=0,x()}},y.name)),d=I("img",{alt:"",decoding:"async"});d.addEventListener("load",()=>d.classList.remove("is-loading"));let u=I("span",{class:"ct-count"}),f=I("button",{class:"ct-arrow is-prev",type:"button","aria-label":"Previous photograph",onclick:()=>w(-1)},Ft("left")),g=I("button",{class:"ct-arrow is-next",type:"button","aria-label":"Next photograph",onclick:()=>w(1)},Ft("right")),b=I("div",{class:"ct-stage"},d,f,g,u),m=I("div",{class:"ct-thumbs",role:"group","aria-label":"Choose a photograph"}),p=I("p",{class:"ct-g-caption"}),S=I("button",{class:"ct-btn ct-btn-line ct-g-walk",type:"button",onclick:()=>{let y=n[s];i.closeDialog(),i.chooseRoom(y.id)}},Ft("walk"),I("span")),C=0,_=0,M=-1;b.addEventListener("pointerdown",y=>{y.pointerType!=="mouse"&&(M=y.pointerId,C=y.clientX,_=y.clientY)}),b.addEventListener("pointerup",y=>{if(y.pointerId!==M)return;M=-1;let R=y.clientX-C,P=y.clientY-_;Math.abs(R)>44&&Math.abs(R)>Math.abs(P)*1.4&&w(R<0?1:-1)});let T=I("div",{class:t?"ct-gallery is-page":"ct-gallery"},I("header",{class:"ct-g-head"},I("div",null,a,l,c),t?null:I("button",{class:"ct-round ct-g-close",type:"button","aria-label":"Close the photographs",onclick:()=>i.closeDialog()},Ft("close"))),I("div",{class:"ct-tabs",role:"group","aria-label":"Rooms"},h),b,I("div",{class:"ct-g-foot"},p,m,t?null:S));function w(y){let R=n[s];r=(r+y+R.photos.length)%R.photos.length,x()}function x(){let y=n[s],R=y.photos[r];ce(l,y.name),ce(c,y.detail),h.forEach((z,W)=>de(z,"aria-pressed",W===s?"true":"false"));let P=e.photoUrl(R.id);d.getAttribute("src")!==P&&(d.classList.add("is-loading"),d.src=P),d.alt=`${R.name}: original listing photograph ${r+1} of ${y.photos.length}`,ce(u,`${tn(r+1)} / ${tn(y.photos.length)}`),ce(p,y.room?`Photograph ${r+1} of ${y.photos.length}`:R.name);let D=y.photos.length<2;f.hidden=D,g.hidden=D,m.replaceChildren(...y.photos.map((z,W)=>I("button",{type:"button","aria-label":`${z.name}, photograph ${W+1}`,"aria-pressed":W===r?"true":"false",onclick:()=>{r=W,x()}},I("img",{src:e.photoUrl(z.id),alt:"",loading:"lazy",decoding:"async"})))),S.hidden=!y.room||!!i.store.get().error,ce(S.lastElementChild,`Walk into the ${y.name.toLowerCase()}`);for(let z of[1,-1]){let W=y.photos[(r+z+y.photos.length)%y.photos.length];W&&(new Image().src=e.photoUrl(W.id))}}return{el:T,step:w,show(y){let R=y?n.findIndex(P=>P.id===y):-1;R>=0&&(s=R,r=0),x()}}}var E_={ultra:"Ultra",high:"High",balanced:"Balanced",battery:"Battery"};function uf(i){let{store:t}=i,e=()=>i.api(),n=Sh("Picture quality",[{value:"auto",label:"Auto",hint:"Adjusts to keep movement smooth"},{value:"ultra",label:"Ultra"},{value:"high",label:"High"},{value:"balanced",label:"Balanced"},{value:"battery",label:"Battery",hint:"Lighter on your battery"}],d=>e()?.setQuality(d)),s=I("p",{class:"ct-stats","aria-live":"off"}),r=Sh("Eye height",[{value:1.1,label:[I("b",null,"Child"),I("small",null,"1.1 m")]},{value:1.6,label:[I("b",null,"Adult"),I("small",null,"1.6 m")]},{value:1.8,label:[I("b",null,"Tall"),I("small",null,"1.8 m")]}],d=>{e()?.setEyeHeight(d),t.set({eye:d})}),o=I("output",{class:"ct-out"}),a=I("input",{class:"ct-range",type:"range",min:35,max:80,step:1,"aria-label":"Field of view in degrees"});a.addEventListener("input",()=>{let d=Number(a.value);e()?.setFov(d),t.set({fov:d})});let l=Eo([I("b",null,"Neighbourhood sound"),I("small",null,"Birdsong, the city, evening crickets")],()=>i.toggleAmbience()),c=Eo([I("b",null,"Mouse look"),I("small",null,"Move the mouse to look. Esc releases it.")],()=>i.toggleMouseLook(),"ct-only-mouse"),h=Zi(i,"settings","Settings","Your view",ql("Picture quality",n.el,s),ql("Eye height",r.el),ql("Field of view",I("div",{class:"ct-fov"},I("small",null,"Narrow"),a,I("small",null,"Wide"),o)),I("div",{class:"ct-switches"},l,c),I("button",{class:"ct-btn ct-btn-quiet ct-reset",type:"button",onclick:()=>{e()?.reset(),i.closePanel()}},Ft("reset"),"Back to the start"));return i.registerPanel("settings",{el:h,keepOnScene:!0,onOpen:()=>{let d=e()?.quality();d&&t.set({quality:d})}}),t.on((d,u)=>{if(u.has("quality")&&d.quality){let f=d.quality;n.set(f.auto?"auto":f.tier),ce(s,`${Math.round(f.fps)} fps \xB7 ${f.dpr.toFixed(2)}\xD7 pixels \xB7 ${E_[f.tier]}${f.auto?" (auto)":""}${f.ao?" \xB7 soft shadows":""}`)}u.has("eye")&&r.set(d.eye),u.has("fov")&&(document.activeElement!==a&&(a.value=String(d.fov)),ce(o,`${Math.round(d.fov)}\xB0`)),u.has("ambience")&&Ao(l,d.ambience),u.has("pointerLock")&&Ao(c,d.pointerLock),(u.has("ready")||u.has("error"))&&de(h,"data-off",!d.ready||!!d.error)}),h}var A_={walk:"Walk",dollhouse:"Dollhouse",plan:"Floor plan"};function df(i){let{def:t,store:e}=i,n=t.listing,s="",r=null,o="",a=0,l=I("img",{alt:""});l.addEventListener("load",()=>{let M=l.naturalWidth,T=l.naturalHeight;M&&(c.style.aspectRatio=`${M} / ${T}`,c.style.width=T>M?`min(100%, calc(36vh * ${(M/T).toFixed(3)}))`:"")});let c=I("figure",{class:"ct-postcard is-loading"},l,I("figcaption")),h=c.lastElementChild,d=I("input",{class:"ct-link-field",type:"text",readonly:!0,"aria-label":"Link to this view",onfocus:M=>M.target.select()}),u=I("span",null,"Copy link"),f=I("button",{class:"ct-btn ct-btn-line","data-autofocus":!0,type:"button",onclick:_},Ft("copy"),u),g=I("button",{class:"ct-btn ct-btn-primary",type:"button",onclick:C},Ft("share"),"Share");typeof navigator.share!="function"&&(g.hidden=!0);let b=I("a",{class:"ct-btn ct-btn-line",target:"_blank",rel:"noopener",href:"#"},Ft("chat"),"WhatsApp"),m=I("a",{class:"ct-btn ct-btn-line",href:"#",download:`${t.slug}-view.jpg`,"aria-disabled":"true"},Ft("download"),"Postcard");m.addEventListener("click",M=>{s||M.preventDefault()});let p=Zi(i,"share","Share","Share this exact view",c,I("div",{class:"ct-link"},Ft("link"),d),I("div",{class:"ct-share-actions"},g,b,f,m),I("p",{class:"ct-fine"},"Whoever opens the link steps in right here, at this hour."));i.registerPanel("share",{el:p,onOpen:S,onClose:()=>{a++}});async function S(){let M=i.api(),T=++a,w=t.rooms.find(P=>P.id===e.get().room)?.image??t.rooms[0].image,x=n.title;if(M){let P=M.getView();o=`${location.origin}/apartments?open=${encodeURIComponent(n.id)}&tour=${Yd(P)}`;let D=e.get().light;x=[P.mode==="walk"?i.roomName(P.room):A_[P.mode],P.hour!=null?Fn(P.hour):D?.live?"Live":""].filter(Boolean).join(" \xB7 ")}else o=`${location.origin}/apartments?open=${encodeURIComponent(n.id)}&tour=1`;d.value=o,ce(h,x);let y=`Step inside ${n.title} in ${n.area} \u2014 a Cabana 3D tour.`;b.href="https://wa.me/?text="+encodeURIComponent(`${y} ${o}`),c.classList.add("is-loading"),de(m,"aria-disabled","true");let R=null;try{R=M?await M.snapshot():null}catch{R=null}T===a&&(s&&URL.revokeObjectURL(s),s="",r=null,R?(s=URL.createObjectURL(R),r=new File([R],`${t.slug}-view.jpg`,{type:R.type||"image/jpeg"}),l.src=s,m.href=s,de(m,"aria-disabled",!1)):l.src=t.photoUrl(w),l.decode?.().catch(()=>{}).finally(()=>{T===a&&c.classList.remove("is-loading")}))}async function C(){let M={title:`${n.title} \xB7 Cabana 3D tour`,text:`Step inside ${n.title} in ${n.area}.`,url:o};r&&navigator.canShare?.({files:[r]})&&(M.files=[r]);try{await navigator.share(M)}catch(T){T?.name!=="AbortError"&&i.toast("Sharing is not available here. Copy the link instead.","warn")}}async function _(){let M=!1;try{await navigator.clipboard.writeText(o),M=!0}catch{d.focus(),d.select();try{M=document.execCommand("copy")}catch{M=!1}}M?(ce(u,"Copied"),f.classList.add("is-done"),i.toast("Link copied","ok"),setTimeout(()=>{ce(u,"Copy link"),f.classList.remove("is-done")},2200)):i.toast("Select the link and copy it","warn")}return p}function ff(i){let t=i,e=[];return{get:()=>t,set(n){let s=new Set;for(let r of Object.keys(n))Object.is(t[r],n[r])||s.add(r);if(s.size){t={...t,...n};for(let r of e)r(t,s)}},on(n){e.push(n),n(t,new Set(Object.keys(t)))}}}function Zl(i,t){let e=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(i||"").trim());if(!e)return t;let n=e[1].length===3?e[1].replace(/./g,s=>s+s):e[1];return[0,2,4].map(s=>parseInt(n.slice(s,s+2),16))}var pf=(i,t,e)=>i.map((n,s)=>Math.round(n+(t[s]-n)*e));function Rh(i){let t=e=>(e/=255,e<=.03928?e/12.92:((e+.055)/1.055)**2.4);return .2126*t(i[0])+.7152*t(i[1])+.0722*t(i[2])}function mf(i,t){let e=Zl(t.night,[20,35,29]),n=Zl(t.paper,[246,242,233]),s=Zl(t.accent,[196,164,107]),r=Zl(t.accentInk,Rh(s)>.4?e:[255,255,255]),o=s;for(let h=0;h<8&&Rh(o)<.32;h++)o=pf(o,n,.22);let a=s;for(let h=0;h<8&&Rh(a)>.16;h++)a=pf(a,e,.22);let l=h=>h.join(","),c={"--accent":`rgb(${l(s)})`,"--ink":`rgb(${l(r)})`,"--hi":`rgb(${l(o)})`,"--hr":l(o),"--lo":`rgb(${l(a)})`,"--night":`rgb(${l(e)})`,"--nr":l(e),"--paper":`rgb(${l(n)})`};for(let h in c)i.style.setProperty(h,c[h])}function gf(){let i=I("div",{class:"ct-toasts",role:"status","aria-live":"polite"}),t=0,e="",n=0;return{el:i,show(s,r){let o=performance.now();if(s===e&&o-n<2500)return;e=s,n=o;let a=I("div",{class:`ct-toast ct-glass${r?" is-"+r:""}`},r==="ok"?Ft("check"):r==="warn"?Ft("info"):Ft("spark"),I("span",null,s));i.replaceChildren(a),clearTimeout(t),t=window.setTimeout(()=>{a.classList.add("is-out"),setTimeout(()=>a.remove(),400)},Math.min(6e3,2200+s.length*45))}}}var xf=[{id:"walk",label:"Walk",icon:"walk"},{id:"dollhouse",label:"Dollhouse",icon:"dollhouse"},{id:"plan",label:"Floor plan",icon:"plan"}],vf=()=>!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen);function _f(i){let{def:t,store:e}=i,n=xf.map(f=>I("button",{type:"button","data-mode":f.id,"aria-label":f.label,"data-tip":f.label,"aria-pressed":"false",onclick:()=>i.setMode(f.id)},Ft(f.icon),I("span",null,f.label))),s=I("nav",{class:"ct-modes ct-glass","aria-label":"How to view the apartment"},I("span",{class:"ct-modes-thumb","aria-hidden":"true"}),n),r=(f,g,b,m,p)=>I("button",{class:"ct-tool",type:"button","data-act":f,"data-tip":g,"aria-label":g,"data-panel":p,"aria-expanded":p?"false":null,onclick:m},Ft(b)),o=f=>g=>i.togglePanel(f,g.currentTarget),a=r("sound","Neighbourhood sound","mute",()=>i.toggleAmbience()),l=r("fullscreen","Full screen","expand",()=>i.toggleFullscreen());vf()||(l.hidden=!0);let c=I("div",{class:"ct-tools ct-glass"},r("share","Share this view","share",o("share"),"share"),r("photos","Original photographs","photos",()=>i.openPhotos()),r("light","Live Light","sunset",o("light"),"light"),a,r("settings","Settings","sliders",o("settings"),"settings"),r("about","About this view","info",()=>i.openDialog("about")),l),h=I("button",{class:"ct-round ct-glass ct-more",type:"button","aria-label":"More","data-panel":"more","aria-expanded":"false",onclick:o("more")},Ft("more")),d=I("button",{class:"ct-round ct-glass ct-close",type:"button","aria-label":"Close the 3D tour","data-tip":"Close",onclick:()=>i.requestClose()},Ft("close")),u=I("header",{class:"ct-top"},I("div",{class:"ct-brand"},Qd(),I("div",{class:"ct-brand-text"},I("span",{class:"ct-kicker"},"Cabana",I("i",{"aria-hidden":"true"}),"3D residence"),I("strong",{class:"ct-brand-title",title:t.listing.title},t.listing.title),I("a",{class:"ct-brand-area",href:i.listingUrl,target:"_top"},`${t.listing.area}, ${t.listing.city}`,I("span",null,"View listing",Ft("out"))))),s,I("div",{class:"ct-actions"},c,h,d));return e.on((f,g)=>{g.has("mode")&&(n.forEach(b=>de(b,"aria-pressed",b.dataset.mode===f.mode?"true":"false")),s.dataset.at=String(xf.findIndex(b=>b.id===f.mode))),(g.has("ready")||g.has("error"))&&n.forEach(b=>de(b,"disabled",!f.ready||!!f.error)),g.has("ambience")&&(a.replaceChildren(Ft(f.ambience?"sound":"mute")),de(a,"aria-pressed",f.ambience?"true":"false"),a.dataset.tip=f.ambience?"Sound on":"Neighbourhood sound"),g.has("fullscreen")&&(l.replaceChildren(Ft(f.fullscreen?"shrink":"expand")),de(l,"aria-label",f.fullscreen?"Leave full screen":"Full screen"),l.dataset.tip=f.fullscreen?"Leave full screen":"Full screen")}),u}function yf(i){let{store:t}=i,e=(l,c,h,d)=>I("button",{class:"ct-menu-item",type:"button",onclick:h},Ft(c),I("span",null,l),d),n=l=>()=>{i.closePanel(),i.togglePanel(l,i.el.querySelector(".ct-more"))},s=I("small"),r=e("Neighbourhood sound","sound",()=>i.toggleAmbience(),s),o=e("Full screen","expand",()=>{i.closePanel(),i.toggleFullscreen()});vf()||(o.hidden=!0);let a=Zi(i,"more","Cabana 3D","More",I("div",{class:"ct-menu"},e("Original photographs","photos",()=>{i.closePanel(),i.openPhotos()}),e("Live Light","sunset",n("light")),r,e("Settings","sliders",n("settings")),o,e("About this view","info",()=>{i.closePanel(),i.openDialog("about")}),e("Back to the start","reset",()=>{i.closePanel(),i.api()?.reset()}),I("a",{class:"ct-menu-item",href:i.listingUrl,target:"_top"},Ft("out"),I("span",null,"View the listing"))));return i.registerPanel("more",{el:a}),t.on((l,c)=>{c.has("ambience")&&(s.textContent=l.ambience?"On":"Off",de(r,"aria-pressed",l.ambience?"true":"false"))}),a}function bf(i,t,e,n,s){let{def:r,store:o}=i,a=r.listing,l=/^(.+?[.!?])\s+(.+)$/.exec(a.tagline.trim()),c=I("h1",{class:"ct-w-title",id:"ct-w-title"},l?[l[1]," ",I("em",null,l[2])]:a.tagline),h=I("img",{src:t,alt:"",decoding:"async",fetchpriority:"high"});h.addEventListener("error",()=>{h.src!==new URL(e,location.href).href&&(h.src=e)},{once:!1});let d=(w,x)=>`${w} ${x}${w===1?"":"s"}`,u=[d(a.guests,"guest"),d(a.bedrooms,"bedroom"),d(a.bathrooms,"bath")].join(" \xB7 "),f=I("span",{class:"ct-w-load-label"},"Preparing your private viewing"),g=I("span",{class:"ct-w-load-pct"},"0%"),b=I("i"),m=I("div",{class:"ct-w-load",role:"status","aria-live":"polite"},I("div",{class:"ct-w-load-row"},f,g),I("div",{class:"ct-w-bar"},b)),p=I("span",null,n?"Step into the shared view":"Enter the apartment"),S=I("button",{class:"ct-btn ct-btn-primary ct-w-enter",type:"button",disabled:!0,onclick:s},p,Ft("arrow")),C=I("button",{class:"ct-btn ct-btn-quiet",type:"button",onclick:()=>i.openPhotos()},Ft("photos"),"See the original photographs"),_=null;if(n){let w=[n.mode==="walk"?i.roomName(n.room):n.mode==="dollhouse"?"The dollhouse view":"The floor plan"];if(n.hour!=null&&w.push(Fn(n.hour)),n.date){let[x,y,R]=n.date.split("-").map(Number);w.push(new Date(Date.UTC(x,y-1,R)).toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}))}_=I("p",{class:"ct-w-shared"},Ft("link"),I("span",null,"A view was shared with you",I("b",null,w.join(" \xB7 "))))}let M=I("ol",{class:"ct-w-index","aria-label":"Rooms in this tour"},r.rooms.map((w,x)=>I("li",null,I("span",null,tn(x+1)),w.name))),T=I("section",{class:"ct-welcome","aria-labelledby":"ct-w-title"},I("div",{class:"ct-w-bg","aria-hidden":"true"},h),I("div",{class:"ct-w-shade","aria-hidden":"true"}),I("div",{class:"ct-w-body"},I("p",{class:"ct-kicker ct-w-kicker"},I("i",{"aria-hidden":"true"}),r.theme.collection),c,I("p",{class:"ct-w-listing"},a.title,I("span",null,`${a.area}, ${a.city}`)),I("p",{class:"ct-w-desc"},a.description),I("ul",{class:"ct-w-chips","aria-label":"In this tour"},I("li",null,Ft("cube"),"Walk every room"),I("li",null,Ft("sunset"),"Live Light"),I("li",null,Ft("person"),u)),_,m,I("div",{class:"ct-w-actions"},S,C)),M,I("p",{class:"ct-w-foot"},I("span",null,"Photo-based reconstruction \xB7 Estimated dimensions \xB7 Simulated light"),I("span",null,`${a.city}, ${a.country}`)));return o.on((w,x)=>{if(x.has("load")||x.has("ready")||x.has("error")){let y=Math.round(w.load.progress*100);b.style.transform=`scaleX(${w.ready?1:w.load.progress})`,ce(g,w.ready||w.error?"":y+"%"),ce(f,w.error||(w.ready?"Ready when you are":w.load.label||"Preparing your private viewing")),T.classList.toggle("is-ready",w.ready),T.classList.toggle("is-error",!!w.error),de(S,"disabled",!w.ready&&!w.error),ce(p,w.error?"Explore the photographs":n?"Step into the shared view":"Enter the apartment")}if(x.has("phase")){let y=w.phase==="welcome";T.inert=!y,T.classList.toggle("is-gone",!y)}}),T}var C_="This device can\u2019t show the 3D view, so here is the apartment in its original photographs.",Ph="The 3D view stopped on this device. Here is the apartment in its original photographs.";function R_(){try{let i=document.createElement("canvas"),t=i.getContext("webgl2")||i.getContext("webgl");return t?.getExtension("WEBGL_lose_context")?.loseContext(),!!t}catch{return!1}}var P_=i=>i.toLowerCase().replace(/(^|\s)\S/g,t=>t.toUpperCase());function Mf(i,t,e){let n=Zd(new URLSearchParams(location.search).get("v")),s=matchMedia("(pointer: coarse)").matches,r=window.parent!==window,o="/apartments?open="+encodeURIComponent(t.listing.id),a=ff({phase:"welcome",ready:!1,load:{progress:0,label:""},error:null,mode:"walk",room:t.start,pose:null,tour:{playing:!1,index:0,progress:0},light:null,quality:null,ambience:!1,gyro:!1,pointerLock:!1,fullscreen:!!document.fullscreenElement,eye:1.6,fov:61,input:s?"touch":"mouse",dockOpen:!0,panel:null,dialog:null}),l=I("div",{class:"ct"});mf(l,t.theme);let c=I("div",{class:"ct-scene",tabindex:"0",role:"application","aria-roledescription":"3D view","aria-label":`${t.listing.title} in 3D. Drag to look around. W A S D or the arrow keys walk; Q and E turn.`}),h=null,d={},u=null,f=gf(),g=I("div",{class:"ct-sr","aria-live":"polite"});function b(V){let ot=t.rooms.find(Zt=>Zt.id===V);if(ot)return ot.name;let nt=t.plan.rooms.find(Zt=>Zt.id===V);return nt?P_(nt.label):V==="hall"?"Hallway":"The apartment"}function m(V,ot){p(!1);let nt=d[V];if(!nt)return;u=ot||document.activeElement,nt.cssOnly||(nt.el.hidden=!1),a.set({panel:V}),nt.onOpen?.();let Zt=bh(nt.el);(Zt.find(st=>st.hasAttribute("data-autofocus"))||Zt.find(st=>!st.classList.contains("ct-x"))||Zt[0])?.focus({preventScroll:!0})}function p(V=!0){let ot=a.get().panel;if(!ot)return;let nt=d[ot],Zt=nt.el.contains(document.activeElement);nt.cssOnly||(nt.el.hidden=!0),a.set({panel:null}),nt.onClose?.(),V&&Zt&&u?.isConnected&&u.focus({preventScroll:!0})}let S={};function C(V){p(!1);let ot=S[V];a.get().dialog&&a.get().dialog!==V&&S[a.get().dialog].close(),ot.open||ot.showModal(),a.set({dialog:V})}function _(){let V=a.get().dialog;V&&(S[V].open&&S[V].close(),a.set({dialog:null}))}let M,T=null,w={def:t,el:l,scene:c,store:a,listingUrl:o,roomName:b,api:()=>h,toast:(V,ot)=>f.show(V,ot),announce:V=>{g.textContent="",requestAnimationFrame(()=>{g.textContent=V})},registerPanel(V,ot){d[V]=ot,ot.el.addEventListener("keydown",nt=>{nt.key!=="Escape"&&nt.stopPropagation()})},togglePanel:(V,ot)=>a.get().panel===V?p():m(V,ot),closePanel:()=>p(),openDialog:C,closeDialog:_,openPhotos(V){if(a.get().phase==="fallback"){T?.show(V);return}M.show(V||a.get().room),C("photos")},chooseRoom(V){let ot=a.get();if(ot.error||!h){w.openPhotos(V);return}ot.tour.playing&&h.setTour(!1),ot.mode!=="walk"&&(h.setMode("walk"),a.set({mode:"walk"})),h.goRoom(V)},setMode(V){h&&(a.get().tour.playing&&h.setTour(!1),h.setMode(V),a.set({mode:V}))},toggleTour(){if(!h)return;let V=a.get();if(V.tour.playing){h.setTour(!1);return}V.mode!=="walk"&&(h.setMode("walk"),a.set({mode:"walk"})),h.setTour(!0)},toggleAmbience(){let V=!a.get().ambience;h?.setAmbience(V),a.set({ambience:V}),V&&f.show("The sound follows the hour and the weather","ok")},async toggleFullscreen(){try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch{}},toggleMouseLook(){if(!h)return;let V=!a.get().pointerLock;h.setPointerLock(V),V&&c.focus({preventScroll:!0})},requestClose(){r?window.parent.postMessage({type:"cabana-tour-close"},location.origin):location.href=o}};function x(V,ot){if(console.error("Cabana tour:",V),a.get().error)return;let nt=h;h=null;try{nt?.dispose()}catch{}p(!1),a.set({error:ot,ready:!1}),a.get().phase==="tour"&&D(!0)}let y={onLoad:(V,ot)=>a.set({load:{progress:Math.max(0,Math.min(1,V||0)),label:ot}}),onReady:()=>{a.set({ready:!0}),R()},onPose:V=>a.set({pose:V}),onRoom:V=>a.set({room:V}),onMode:V=>a.set({mode:V}),onTour:V=>a.set({tour:V}),onLight:V=>a.set({light:V}),onQuality:V=>a.set({quality:V}),onHint:V=>f.show(V),onError:V=>x(V,Ph)};function R(){let V=a.get();h&&V.ready&&h.setPaused(V.phase!=="tour"||V.dialog!==null)}function P(){let V=a.get();if(V.error||!h){D(!1);return}if(V.ready){if(a.set({phase:"tour"}),R(),n)try{h.setView(n)}catch(ot){console.warn("Shared view could not be applied",ot)}requestAnimationFrame(()=>c.focus({preventScroll:!0}))}}function D(V){p(!1),_(),T||(T=Ch(w,!0),Xt.insertBefore(T.el,xt)),a.set({phase:"fallback"}),T.show(a.get().room),V&&w.announce(a.get().error||Ph),requestAnimationFrame(()=>Xt.focus({preventScroll:!0}))}let z=t.rooms.find(V=>V.id===t.start)||t.rooms[0],W=t.photoUrl(z.image),N=i.querySelector("[data-boot]"),k=N?/url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(N).backgroundImage)?.[1]:null,U=bf(w,k||W,W,n,P),X=_f(w),K=ef(w),lt=nf(w),at=cf(w),gt=lf(w),[yt,jt,Pt,j,ut]=hf(w),ct=I("p",{class:"ct-foot"},I("span",null,"Photo-based reconstruction \xB7 Estimated dimensions \xB7 Simulated light"),I("button",{type:"button",onclick:()=>C("about")},"About this view",Ft("info"))),zt=I("div",{class:"ct-hud"},K,at.card,at.button,lt,I("div",{class:"ct-br"},ut,yt,gt.chip),ct),St=I("div",{class:"ct-panels"},gt.panel,df(w),uf(w),yf(w));M=Ch(w,!1),S.photos=I("dialog",{class:"ct-dialog ct-dialog-photos","aria-labelledby":"ct-ph-title"},M.el),S.about=I("dialog",{class:"ct-dialog ct-dialog-about","aria-labelledby":"ct-about-title"},tf(w));for(let V of Object.values(S))V.addEventListener("cancel",ot=>{ot.preventDefault(),_()}),V.addEventListener("close",()=>{a.get().dialog&&!Object.values(S).some(ot=>ot.open)&&a.set({dialog:null})}),V.addEventListener("keydown",ot=>{Jd(ot,V),ot.key!=="Escape"&&ot.stopPropagation()}),V.addEventListener("click",ot=>{ot.target===V&&_()});let xt=I("p",{class:"ct-foot is-page"},I("span",null,"Photo-based reconstruction \xB7 Estimated dimensions"),I("button",{type:"button",onclick:()=>C("about")},"About this view",Ft("info"))),he=I("p",{class:"ct-fb-note"},Ft("info"),I("span")),Xt=I("main",{class:"ct-fallback",tabindex:"-1","aria-labelledby":"ct-fb-title"},he,xt);l.append(c,I("div",{class:"ct-shade","aria-hidden":"true"}),jt,Pt,j,zt,Xt,U,X,St,f.el,g,S.photos,S.about),i.replaceChildren(l);let Wt=0;if(a.on((V,ot)=>{ot.has("phase")&&(l.dataset.phase=V.phase,zt.inert=V.phase!=="tour",Xt.inert=V.phase!=="fallback",R()),ot.has("mode")&&(l.dataset.mode=V.mode),ot.has("input")&&(l.dataset.input=V.input),ot.has("panel")&&(l.dataset.panel=V.panel||"",l.querySelectorAll("[data-panel]").forEach(nt=>nt.setAttribute("aria-expanded",nt.dataset.panel===V.panel?"true":"false"))),ot.has("dockOpen")&&(l.dataset.dock=V.dockOpen?"open":"folded"),ot.has("tour")&&l.classList.toggle("is-touring",V.tour.playing),ot.has("dialog")&&R(),ot.has("error")&&V.error&&(he.lastElementChild.textContent=V.error),ot.has("room")&&V.phase==="tour"&&V.mode==="walk"&&t.rooms.some(nt=>nt.id===V.room)&&(clearTimeout(Wt),Wt=window.setTimeout(()=>w.announce(b(a.get().room)),700))}),window.addEventListener("pointerdown",V=>{let ot=V.pointerType==="mouse"?"mouse":"touch";a.get().input!==ot&&a.set({input:ot})},!0),document.addEventListener("pointerdown",V=>{let ot=a.get().panel;if(!ot)return;let nt=d[ot],Zt=V.target;nt.el.contains(Zt)||Zt.closest?.(`[data-panel="${ot}"]`)||nt.keepOnScene&&c.contains(Zt)||p(!1)},!0),document.addEventListener("keydown",V=>{let ot=a.get();if(V.key==="Escape"){if(ot.dialog){V.preventDefault(),V.stopPropagation(),_();return}if(ot.panel){V.preventDefault(),V.stopPropagation(),p();return}if(document.pointerLockElement||document.fullscreenElement)return;r&&(V.preventDefault(),w.requestClose());return}(V.key==="ArrowLeft"||V.key==="ArrowRight")&&!Xl(V.target)&&(ot.dialog==="photos"||ot.phase==="fallback")&&(V.preventDefault(),V.stopImmediatePropagation(),(ot.dialog==="photos"?M:T)?.step(V.key==="ArrowLeft"?-1:1))},!0),document.addEventListener("pointerlockchange",()=>a.set({pointerLock:!!document.pointerLockElement})),document.addEventListener("fullscreenchange",()=>a.set({fullscreen:!!document.fullscreenElement})),!R_())a.set({error:C_});else{try{let V=e(c,t,y);if(a.get().error)try{V.dispose()}catch{}else h=V}catch(V){x(V instanceof Error?V.message:String(V),Ph)}h&&a.get().ready&&R()}}Mf(document.getElementById("root"),md,Xd);
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
