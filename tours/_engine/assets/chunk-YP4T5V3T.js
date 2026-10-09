var ki={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},zi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},id=0,ph=1,sd=2;var ds=1,rd=2,or=3,Mi=0,rn=1,ai=2,We=0,ss=1,mh=2,gh=3,xh=4,tl=5;var Sn=100,od=101,ad=102,ld=103,cd=104,fs=200,hd=201,ud=202,dd=203,xa=204,va=205,mo=206,fd=207,go=208,pd=209,md=210,gd=211,xd=212,vd=213,_d=214,_a=0,ya=1,ba=2,rs=3,Ma=4,Sa=5,wa=6,Ta=7,el=0,yd=1,bd=2,Xn=0,xo=1,vh=2,_h=3,ps=4,yh=5,vo=6,_o=7;var bh=300,Vi=301,ms=302,nl=303,il=304,yo=306,ii=1e3,ni=1001,Ea=1002,Ue=1003,Md=1004;var bo=1005;var nn=1006,sl=1007;var Gi=1008;var Qe=1009,Mh=1010,Sh=1011,ar=1012,rl=1013,qn=1014,Ln=1015,Xe=1016,ol=1017,al=1018,Hi=1020,wh=35902,Th=35899,Eh=1021,Ah=1022,vn=1023,si=1026,li=1027,ll=1028,cl=1029,Wi=1030,hl=1031;var ul=1033,Mo=33776,So=33777,wo=33778,To=33779,dl=35840,fl=35841,pl=35842,ml=35843,gl=36196,xl=37492,vl=37496,_l=37488,yl=37489,Eo=37490,bl=37491,Ml=37808,Sl=37809,wl=37810,Tl=37811,El=37812,Al=37813,Cl=37814,Rl=37815,Pl=37816,Il=37817,Ll=37818,Dl=37819,Nl=37820,Ul=37821,Fl=36492,Ol=36494,Bl=36495,kl=36283,zl=36284,Ao=36285,Vl=36286;var kr=2300,Aa=2301,ma=2302,Xc=2303,qc=2400,Yc=2401,Zc=2402;var Sd=3200;var lr=0,wd=1,wi="",en="srgb",zr="srgb-linear",Vr="linear",ye="srgb";var es=7680;var $c=519,Td=512,Ed=513,Ad=514,Gl=515,Cd=516,Rd=517,Hl=518,Pd=519,Kc=35044;var Ch="300 es",Vn=2e3,Xs=2001;function Lp(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Dp(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function qs(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Id(){let i=qs("canvas");return i.style.display="block",i}var Tu={},Ys=null;function Rh(...i){let t="THREE."+i.shift();Ys?Ys("log",t,...i):console.log(t,...i)}function Ld(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function jt(...i){i=Ld(i);let t="THREE."+i.shift();if(Ys)Ys("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Qt(...i){i=Ld(i);let t="THREE."+i.shift();if(Ys)Ys("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function is(...i){let t=i.join(" ");t in Tu||(Tu[t]=!0,jt(...i))}function Dd(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var Nd={[_a]:ya,[ba]:wa,[Ma]:Ta,[rs]:Sa,[ya]:_a,[wa]:ba,[Ta]:Ma,[Sa]:rs},Gn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},ln=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Eu=1234567,Ur=Math.PI/180,Zs=180/Math.PI;function gs(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(ln[i&255]+ln[i>>8&255]+ln[i>>16&255]+ln[i>>24&255]+"-"+ln[t&255]+ln[t>>8&255]+"-"+ln[t>>16&15|64]+ln[t>>24&255]+"-"+ln[e&63|128]+ln[e>>8&255]+"-"+ln[e>>16&255]+ln[e>>24&255]+ln[n&255]+ln[n>>8&255]+ln[n>>16&255]+ln[n>>24&255]).toLowerCase()}function ce(i,t,e){return Math.max(t,Math.min(e,i))}function Ph(i,t){return(i%t+t)%t}function Np(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function Up(i,t,e){return i!==t?(e-i)/(t-i):0}function Fr(i,t,e){return(1-e)*i+e*t}function Fp(i,t,e,n){return Fr(i,t,1-Math.exp(-e*n))}function Op(i,t=1){return t-Math.abs(Ph(i,t*2)-t)}function Bp(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function kp(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function zp(i,t){return i+Math.floor(Math.random()*(t-i+1))}function Vp(i,t){return i+Math.random()*(t-i)}function Gp(i){return i*(.5-Math.random())}function Hp(i){i!==void 0&&(Eu=i);let t=Eu+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Wp(i){return i*Ur}function Xp(i){return i*Zs}function qp(i){return(i&i-1)===0&&i!==0}function Yp(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Zp(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function $p(i,t,e,n,s){let r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+n)/2),h=o((t+n)/2),f=r((t-n)/2),u=o((t-n)/2),d=r((n-t)/2),g=o((n-t)/2);switch(s){case"XYX":i.set(a*h,l*f,l*u,a*c);break;case"YZY":i.set(l*u,a*h,l*f,a*c);break;case"ZXZ":i.set(l*f,l*u,a*h,a*c);break;case"XZX":i.set(a*h,l*g,l*d,a*c);break;case"YXY":i.set(l*d,a*h,l*g,a*c);break;case"ZYZ":i.set(l*g,l*d,a*h,a*c);break;default:jt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Hs(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function fn(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Ih={DEG2RAD:Ur,RAD2DEG:Zs,generateUUID:gs,clamp:ce,euclideanModulo:Ph,mapLinear:Np,inverseLerp:Up,lerp:Fr,damp:Fp,pingpong:Op,smoothstep:Bp,smootherstep:kp,randInt:zp,randFloat:Vp,randFloatSpread:Gp,seededRandom:Hp,degToRad:Wp,radToDeg:Xp,isPowerOfTwo:qp,ceilPowerOfTwo:Yp,floorPowerOfTwo:Zp,setQuaternionFromProperEuler:$p,normalize:fn,denormalize:Hs},Oh=class Oh{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=ce(this.x,t.x,e.x),this.y=ce(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=ce(this.x,t,e),this.y=ce(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ce(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(ce(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Oh.prototype.isVector2=!0;var ft=Oh,sn=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],f=n[s+3],u=r[o+0],d=r[o+1],g=r[o+2],y=r[o+3];if(f!==y||l!==u||c!==d||h!==g){let m=l*u+c*d+h*g+f*y;m<0&&(u=-u,d=-d,g=-g,y=-y,m=-m);let p=1-a;if(m<.9995){let M=Math.acos(m),E=Math.sin(M);p=Math.sin(p*M)/E,a=Math.sin(a*M)/E,l=l*p+u*a,c=c*p+d*a,h=h*p+g*a,f=f*p+y*a}else{l=l*p+u*a,c=c*p+d*a,h=h*p+g*a,f=f*p+y*a;let M=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=M,c*=M,h*=M,f*=M}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=f}static multiplyQuaternionsFlat(t,e,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],f=r[o],u=r[o+1],d=r[o+2],g=r[o+3];return t[e]=a*g+h*f+l*d-c*u,t[e+1]=l*g+h*u+c*f-a*d,t[e+2]=c*g+h*d+a*u-l*f,t[e+3]=h*g-a*f-l*u-c*d,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),f=a(r/2),u=l(n/2),d=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"YXZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"ZXY":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"ZYX":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"YZX":this._x=u*h*f+c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f-u*d*g;break;case"XZY":this._x=u*h*f-c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f+u*d*g;break;default:jt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],f=e[10],u=n+a+f;if(u>0){let d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-l)*d,this._y=(r-c)*d,this._z=(o-s)*d}else if(n>a&&n>f){let d=2*Math.sqrt(1+n-a-f);this._w=(h-l)/d,this._x=.25*d,this._y=(s+o)/d,this._z=(r+c)/d}else if(a>f){let d=2*Math.sqrt(1+a-n-f);this._w=(r-c)/d,this._x=(s+o)/d,this._y=.25*d,this._z=(l+h)/d}else{let d=2*Math.sqrt(1+f-n-a);this._w=(o-s)/d,this._x=(r+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ce(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},Bh=class Bh{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Au.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Au.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),f=2*(r*n-o*e);return this.x=e+l*c+o*f-a*h,this.y=n+l*h+a*c-r*f,this.z=s+l*f+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=ce(this.x,t.x,e.x),this.y=ce(this.y,t.y,e.y),this.z=ce(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=ce(this.x,t,e),this.y=ce(this.y,t,e),this.z=ce(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ce(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return yc.copy(this).projectOnVector(t),this.sub(yc)}reflect(t){return this.sub(yc.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(ce(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Bh.prototype.isVector3=!0;var L=Bh,yc=new L,Au=new sn,kh=class kh{constructor(t,e,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],f=n[7],u=n[2],d=n[5],g=n[8],y=s[0],m=s[3],p=s[6],M=s[1],E=s[4],x=s[7],w=s[2],S=s[5],T=s[8];return r[0]=o*y+a*M+l*w,r[3]=o*m+a*E+l*S,r[6]=o*p+a*x+l*T,r[1]=c*y+h*M+f*w,r[4]=c*m+h*E+f*S,r[7]=c*p+h*x+f*T,r[2]=u*y+d*M+g*w,r[5]=u*m+d*E+g*S,r[8]=u*p+d*x+g*T,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],f=h*o-a*c,u=a*l-h*r,d=c*r-o*l,g=e*f+n*u+s*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/g;return t[0]=f*y,t[1]=(s*c-h*n)*y,t[2]=(a*n-s*o)*y,t[3]=u*y,t[4]=(h*e-s*l)*y,t[5]=(s*r-a*e)*y,t[6]=d*y,t[7]=(n*l-c*e)*y,t[8]=(o*e-n*r)*y,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return is("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(bc.makeScale(t,e)),this}rotate(t){return is("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(bc.makeRotation(-t)),this}translate(t,e){return is("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(bc.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};kh.prototype.isMatrix3=!0;var ne=kh,bc=new ne,Cu=new ne().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ru=new ne().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Kp(){let i={enabled:!0,workingColorSpace:zr,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ye&&(s.r=bi(s.r),s.g=bi(s.g),s.b=bi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ye&&(s.r=Ws(s.r),s.g=Ws(s.g),s.b=Ws(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===wi?Vr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return is("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return is("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[zr]:{primaries:t,whitePoint:n,transfer:Vr,toXYZ:Cu,fromXYZ:Ru,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:en},outputColorSpaceConfig:{drawingBufferColorSpace:en}},[en]:{primaries:t,whitePoint:n,transfer:ye,toXYZ:Cu,fromXYZ:Ru,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:en}}}),i}var fe=Kp();function bi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ws(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Rs,Ca=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Rs===void 0&&(Rs=qs("canvas")),Rs.width=t.width,Rs.height=t.height;let s=Rs.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Rs}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=qs("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=bi(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(bi(e[n]/255)*255):e[n]=bi(e[n]);return{data:e,width:t.width,height:t.height}}else return jt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Jp=0,$s=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Jp++}),this.uuid=gs(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Mc(s[o].image)):r.push(Mc(s[o]))}else r=Mc(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function Mc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Ca.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(jt("Texture: Unable to serialize Texture."),{})}var jp=0,Sc=new L,Je=class i extends Gn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=ni,s=ni,r=nn,o=Gi,a=vn,l=Qe,c=i.DEFAULT_ANISOTROPY,h=wi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:jp++}),this.uuid=gs(),this.name="",this.source=new $s(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ft(0,0),this.repeat=new ft(1,1),this.center=new ft(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ne,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Sc).x}get height(){return this.source.getSize(Sc).y}get depth(){return this.source.getSize(Sc).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){jt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){jt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==bh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case ii:t.x=t.x-Math.floor(t.x);break;case ni:t.x=t.x<0?0:1;break;case Ea:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case ii:t.y=t.y-Math.floor(t.y);break;case ni:t.y=t.y<0?0:1;break;case Ea:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Je.DEFAULT_IMAGE=null;Je.DEFAULT_MAPPING=bh;Je.DEFAULT_ANISOTROPY=1;var zh=class zh{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],f=l[8],u=l[1],d=l[5],g=l[9],y=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(f-y)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(f+y)<.1&&Math.abs(g+m)<.1&&Math.abs(c+d+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let E=(c+1)/2,x=(d+1)/2,w=(p+1)/2,S=(h+u)/4,T=(f+y)/4,v=(g+m)/4;return E>x&&E>w?E<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(E),s=S/n,r=T/n):x>w?x<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(x),n=S/s,r=v/s):w<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(w),n=T/r,s=v/r),this.set(n,s,r,e),this}let M=Math.sqrt((m-g)*(m-g)+(f-y)*(f-y)+(u-h)*(u-h));return Math.abs(M)<.001&&(M=1),this.x=(m-g)/M,this.y=(f-y)/M,this.z=(u-h)/M,this.w=Math.acos((c+d+p-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=ce(this.x,t.x,e.x),this.y=ce(this.y,t.y,e.y),this.z=ce(this.z,t.z,e.z),this.w=ce(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=ce(this.x,t,e),this.y=ce(this.y,t,e),this.z=ce(this.z,t,e),this.w=ce(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ce(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};zh.prototype.isVector4=!0;var Ae=zh,Ra=class extends Gn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:nn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new Ae(0,0,t,e),this.scissorTest=!1,this.viewport=new Ae(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new Je(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:nn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new $s(s)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ie=class extends Ra{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Gr=class extends Je{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ue,this.minFilter=Ue,this.wrapR=ni,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Pa=class extends Je{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ue,this.minFilter=Ue,this.wrapR=ni,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Qa=class Qa{constructor(t,e,n,s,r,o,a,l,c,h,f,u,d,g,y,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,f,u,d,g,y,m)}set(t,e,n,s,r,o,a,l,c,h,f,u,d,g,y,m){let p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=f,p[14]=u,p[3]=d,p[7]=g,p[11]=y,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Qa().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/Ps.setFromMatrixColumn(t,0).length(),r=1/Ps.setFromMatrixColumn(t,1).length(),o=1/Ps.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),f=Math.sin(r);if(t.order==="XYZ"){let u=o*h,d=o*f,g=a*h,y=a*f;e[0]=l*h,e[4]=-l*f,e[8]=c,e[1]=d+g*c,e[5]=u-y*c,e[9]=-a*l,e[2]=y-u*c,e[6]=g+d*c,e[10]=o*l}else if(t.order==="YXZ"){let u=l*h,d=l*f,g=c*h,y=c*f;e[0]=u+y*a,e[4]=g*a-d,e[8]=o*c,e[1]=o*f,e[5]=o*h,e[9]=-a,e[2]=d*a-g,e[6]=y+u*a,e[10]=o*l}else if(t.order==="ZXY"){let u=l*h,d=l*f,g=c*h,y=c*f;e[0]=u-y*a,e[4]=-o*f,e[8]=g+d*a,e[1]=d+g*a,e[5]=o*h,e[9]=y-u*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let u=o*h,d=o*f,g=a*h,y=a*f;e[0]=l*h,e[4]=g*c-d,e[8]=u*c+y,e[1]=l*f,e[5]=y*c+u,e[9]=d*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let u=o*l,d=o*c,g=a*l,y=a*c;e[0]=l*h,e[4]=y-u*f,e[8]=g*f+d,e[1]=f,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=d*f+g,e[10]=u-y*f}else if(t.order==="XZY"){let u=o*l,d=o*c,g=a*l,y=a*c;e[0]=l*h,e[4]=-f,e[8]=c*h,e[1]=u*f+y,e[5]=o*h,e[9]=d*f-g,e[2]=g*f-d,e[6]=a*h,e[10]=y*f+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Qp,t,tm)}lookAt(t,e,n){let s=this.elements;return bn.subVectors(t,e),bn.lengthSq()===0&&(bn.z=1),bn.normalize(),Ci.crossVectors(n,bn),Ci.lengthSq()===0&&(Math.abs(n.z)===1?bn.x+=1e-4:bn.z+=1e-4,bn.normalize(),Ci.crossVectors(n,bn)),Ci.normalize(),qo.crossVectors(bn,Ci),s[0]=Ci.x,s[4]=qo.x,s[8]=bn.x,s[1]=Ci.y,s[5]=qo.y,s[9]=bn.y,s[2]=Ci.z,s[6]=qo.z,s[10]=bn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],f=n[5],u=n[9],d=n[13],g=n[2],y=n[6],m=n[10],p=n[14],M=n[3],E=n[7],x=n[11],w=n[15],S=s[0],T=s[4],v=s[8],b=s[12],R=s[1],P=s[5],O=s[9],V=s[13],q=s[2],F=s[6],z=s[10],U=s[14],Y=s[3],j=s[7],ht=s[11],ct=s[15];return r[0]=o*S+a*R+l*q+c*Y,r[4]=o*T+a*P+l*F+c*j,r[8]=o*v+a*O+l*z+c*ht,r[12]=o*b+a*V+l*U+c*ct,r[1]=h*S+f*R+u*q+d*Y,r[5]=h*T+f*P+u*F+d*j,r[9]=h*v+f*O+u*z+d*ht,r[13]=h*b+f*V+u*U+d*ct,r[2]=g*S+y*R+m*q+p*Y,r[6]=g*T+y*P+m*F+p*j,r[10]=g*v+y*O+m*z+p*ht,r[14]=g*b+y*V+m*U+p*ct,r[3]=M*S+E*R+x*q+w*Y,r[7]=M*T+E*P+x*F+w*j,r[11]=M*v+E*O+x*z+w*ht,r[15]=M*b+E*V+x*U+w*ct,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],f=t[6],u=t[10],d=t[14],g=t[3],y=t[7],m=t[11],p=t[15],M=l*d-c*u,E=a*d-c*f,x=a*u-l*f,w=o*d-c*h,S=o*u-l*h,T=o*f-a*h;return e*(y*M-m*E+p*x)-n*(g*M-m*w+p*S)+s*(g*E-y*w+p*T)-r*(g*x-y*S+m*T)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],f=t[9],u=t[10],d=t[11],g=t[12],y=t[13],m=t[14],p=t[15],M=e*a-n*o,E=e*l-s*o,x=e*c-r*o,w=n*l-s*a,S=n*c-r*a,T=s*c-r*l,v=h*y-f*g,b=h*m-u*g,R=h*p-d*g,P=f*m-u*y,O=f*p-d*y,V=u*p-d*m,q=M*V-E*O+x*P+w*R-S*b+T*v;if(q===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let F=1/q;return t[0]=(a*V-l*O+c*P)*F,t[1]=(s*O-n*V-r*P)*F,t[2]=(y*T-m*S+p*w)*F,t[3]=(u*S-f*T-d*w)*F,t[4]=(l*R-o*V-c*b)*F,t[5]=(e*V-s*R+r*b)*F,t[6]=(m*x-g*T-p*E)*F,t[7]=(h*T-u*x+d*E)*F,t[8]=(o*O-a*R+c*v)*F,t[9]=(n*R-e*O-r*v)*F,t[10]=(g*S-y*x+p*M)*F,t[11]=(f*x-h*S-d*M)*F,t[12]=(a*b-o*P-l*v)*F,t[13]=(e*P-n*b+s*v)*F,t[14]=(y*E-g*w-m*M)*F,t[15]=(h*w-f*E+u*M)*F,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,f=a+a,u=r*c,d=r*h,g=r*f,y=o*h,m=o*f,p=a*f,M=l*c,E=l*h,x=l*f,w=n.x,S=n.y,T=n.z;return s[0]=(1-(y+p))*w,s[1]=(d+x)*w,s[2]=(g-E)*w,s[3]=0,s[4]=(d-x)*S,s[5]=(1-(u+p))*S,s[6]=(m+M)*S,s[7]=0,s[8]=(g+E)*T,s[9]=(m-M)*T,s[10]=(1-(u+y))*T,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=Ps.set(s[0],s[1],s[2]).length(),a=Ps.set(s[4],s[5],s[6]).length(),l=Ps.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Bn.copy(this);let c=1/o,h=1/a,f=1/l;return Bn.elements[0]*=c,Bn.elements[1]*=c,Bn.elements[2]*=c,Bn.elements[4]*=h,Bn.elements[5]*=h,Bn.elements[6]*=h,Bn.elements[8]*=f,Bn.elements[9]*=f,Bn.elements[10]*=f,e.setFromRotationMatrix(Bn),n.x=o,n.y=a,n.z=l,this}makePerspective(t,e,n,s,r,o,a=Vn,l=!1){let c=this.elements,h=2*r/(e-t),f=2*r/(n-s),u=(e+t)/(e-t),d=(n+s)/(n-s),g,y;if(l)g=r/(o-r),y=o*r/(o-r);else if(a===Vn)g=-(o+r)/(o-r),y=-2*o*r/(o-r);else if(a===Xs)g=-o/(o-r),y=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=f,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=y,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=Vn,l=!1){let c=this.elements,h=2/(e-t),f=2/(n-s),u=-(e+t)/(e-t),d=-(n+s)/(n-s),g,y;if(l)g=1/(o-r),y=o/(o-r);else if(a===Vn)g=-2/(o-r),y=-(o+r)/(o-r);else if(a===Xs)g=-1/(o-r),y=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=f,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=g,c[14]=y,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};Qa.prototype.isMatrix4=!0;var se=Qa,Ps=new L,Bn=new se,Qp=new L(0,0,0),tm=new L(1,1,1),Ci=new L,qo=new L,bn=new L,Pu=new se,Iu=new sn,Pn=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],f=s[2],u=s[6],d=s[10];switch(e){case"XYZ":this._y=Math.asin(ce(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ce(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(ce(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-ce(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(ce(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-ce(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:jt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Pu.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Pu,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Iu.setFromEuler(this),this.setFromQuaternion(Iu,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Pn.DEFAULT_ORDER="XYZ";var Ks=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},em=0,Lu=new L,Is=new sn,mi=new se,Yo=new L,Cr=new L,nm=new L,im=new sn,Du=new L(1,0,0),Nu=new L(0,1,0),Uu=new L(0,0,1),Fu={type:"added"},sm={type:"removed"},Ls={type:"childadded",child:null},wc={type:"childremoved",child:null},je=class i extends Gn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:em++}),this.uuid=gs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new L,e=new Pn,n=new sn,s=new L(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new se},normalMatrix:{value:new ne}}),this.matrix=new se,this.matrixWorld=new se,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ks,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Is.setFromAxisAngle(t,e),this.quaternion.multiply(Is),this}rotateOnWorldAxis(t,e){return Is.setFromAxisAngle(t,e),this.quaternion.premultiply(Is),this}rotateX(t){return this.rotateOnAxis(Du,t)}rotateY(t){return this.rotateOnAxis(Nu,t)}rotateZ(t){return this.rotateOnAxis(Uu,t)}translateOnAxis(t,e){return Lu.copy(t).applyQuaternion(this.quaternion),this.position.add(Lu.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Du,t)}translateY(t){return this.translateOnAxis(Nu,t)}translateZ(t){return this.translateOnAxis(Uu,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(mi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Yo.copy(t):Yo.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Cr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?mi.lookAt(Cr,Yo,this.up):mi.lookAt(Yo,Cr,this.up),this.quaternion.setFromRotationMatrix(mi),s&&(mi.extractRotation(s.matrixWorld),Is.setFromRotationMatrix(mi),this.quaternion.premultiply(Is.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Qt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Fu),Ls.child=t,this.dispatchEvent(Ls),Ls.child=null):Qt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(sm),wc.child=t,this.dispatchEvent(wc),wc.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),mi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),mi.multiply(t.parent.matrixWorld)),t.applyMatrix4(mi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Fu),Ls.child=t,this.dispatchEvent(Ls),Ls.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cr,t,nm),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cr,im,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let f=l[c];r(t.shapes,f)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),f=o(t.shapes),u=o(t.skeletons),d=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),f.length>0&&(n.shapes=f),u.length>0&&(n.skeletons=u),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}};je.DEFAULT_UP=new L(0,1,0);je.DEFAULT_MATRIX_AUTO_UPDATE=!0;je.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var yi=class extends je{constructor(){super(),this.isGroup=!0,this.type="Group"}},rm={type:"move"},Js=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new yi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new yi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new yi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let y of t.hand.values()){let m=e.getJointPose(y,n),p=this._getHandJoint(c,y);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],u=h.position.distanceTo(f.position),d=.02,g=.005;c.inputState.pinching&&u>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(rm)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new yi;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Ud={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ri={h:0,s:0,l:0},Zo={h:0,s:0,l:0};function Tc(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var Bt=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=en){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,fe.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=fe.workingColorSpace){return this.r=t,this.g=e,this.b=n,fe.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=fe.workingColorSpace){if(t=Ph(t,1),e=ce(e,0,1),n=ce(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=Tc(o,r,t+1/3),this.g=Tc(o,r,t),this.b=Tc(o,r,t-1/3)}return fe.colorSpaceToWorking(this,s),this}setStyle(t,e=en){function n(r){r!==void 0&&parseFloat(r)<1&&jt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:jt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);jt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=en){let n=Ud[t.toLowerCase()];return n!==void 0?this.setHex(n,e):jt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=bi(t.r),this.g=bi(t.g),this.b=bi(t.b),this}copyLinearToSRGB(t){return this.r=Ws(t.r),this.g=Ws(t.g),this.b=Ws(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=en){return fe.workingToColorSpace(cn.copy(this),t),Math.round(ce(cn.r*255,0,255))*65536+Math.round(ce(cn.g*255,0,255))*256+Math.round(ce(cn.b*255,0,255))}getHexString(t=en){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=fe.workingColorSpace){fe.workingToColorSpace(cn.copy(this),e);let n=cn.r,s=cn.g,r=cn.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let f=o-a;switch(c=h<=.5?f/(o+a):f/(2-o-a),o){case n:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-n)/f+2;break;case r:l=(n-s)/f+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=fe.workingColorSpace){return fe.workingToColorSpace(cn.copy(this),e),t.r=cn.r,t.g=cn.g,t.b=cn.b,t}getStyle(t=en){fe.workingToColorSpace(cn.copy(this),t);let e=cn.r,n=cn.g,s=cn.b;return t!==en?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Ri),this.setHSL(Ri.h+t,Ri.s+e,Ri.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Ri),t.getHSL(Zo);let n=Fr(Ri.h,Zo.h,e),s=Fr(Ri.s,Zo.s,e),r=Fr(Ri.l,Zo.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},cn=new Bt;Bt.NAMES=Ud;var os=class extends je{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Pn,this.environmentIntensity=1,this.environmentRotation=new Pn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}},kn=new L,gi=new L,Ec=new L,xi=new L,Ds=new L,Ns=new L,Ou=new L,Ac=new L,Cc=new L,Rc=new L,Pc=new Ae,Ic=new Ae,Lc=new Ae,Ni=class i{constructor(t=new L,e=new L,n=new L){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),kn.subVectors(t,e),s.cross(kn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){kn.subVectors(s,e),gi.subVectors(n,e),Ec.subVectors(t,e);let o=kn.dot(kn),a=kn.dot(gi),l=kn.dot(Ec),c=gi.dot(gi),h=gi.dot(Ec),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;let u=1/f,d=(c*l-a*h)*u,g=(o*h-a*l)*u;return r.set(1-d-g,g,d)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,xi)===null?!1:xi.x>=0&&xi.y>=0&&xi.x+xi.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,xi)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,xi.x),l.addScaledVector(o,xi.y),l.addScaledVector(a,xi.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return Pc.setScalar(0),Ic.setScalar(0),Lc.setScalar(0),Pc.fromBufferAttribute(t,e),Ic.fromBufferAttribute(t,n),Lc.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(Pc,r.x),o.addScaledVector(Ic,r.y),o.addScaledVector(Lc,r.z),o}static isFrontFacing(t,e,n,s){return kn.subVectors(n,e),gi.subVectors(t,e),kn.cross(gi).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return kn.subVectors(this.c,this.b),gi.subVectors(this.a,this.b),kn.cross(gi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,o,a;Ds.subVectors(s,n),Ns.subVectors(r,n),Ac.subVectors(t,n);let l=Ds.dot(Ac),c=Ns.dot(Ac);if(l<=0&&c<=0)return e.copy(n);Cc.subVectors(t,s);let h=Ds.dot(Cc),f=Ns.dot(Cc);if(h>=0&&f<=h)return e.copy(s);let u=l*f-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(Ds,o);Rc.subVectors(t,r);let d=Ds.dot(Rc),g=Ns.dot(Rc);if(g>=0&&d<=g)return e.copy(r);let y=d*c-l*g;if(y<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(n).addScaledVector(Ns,a);let m=h*g-d*f;if(m<=0&&f-h>=0&&d-g>=0)return Ou.subVectors(r,s),a=(f-h)/(f-h+(d-g)),e.copy(s).addScaledVector(Ou,a);let p=1/(m+y+u);return o=y*p,a=u*p,e.copy(n).addScaledVector(Ds,o).addScaledVector(Ns,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},pn=class{constructor(t=new L(1/0,1/0,1/0),e=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(zn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(zn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=zn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,zn):zn.fromBufferAttribute(r,o),zn.applyMatrix4(t.matrixWorld),this.expandByPoint(zn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),$o.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),$o.copy(n.boundingBox)),$o.applyMatrix4(t.matrixWorld),this.union($o)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,zn),zn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Rr),Ko.subVectors(this.max,Rr),Us.subVectors(t.a,Rr),Fs.subVectors(t.b,Rr),Os.subVectors(t.c,Rr),Pi.subVectors(Fs,Us),Ii.subVectors(Os,Fs),Ji.subVectors(Us,Os);let e=[0,-Pi.z,Pi.y,0,-Ii.z,Ii.y,0,-Ji.z,Ji.y,Pi.z,0,-Pi.x,Ii.z,0,-Ii.x,Ji.z,0,-Ji.x,-Pi.y,Pi.x,0,-Ii.y,Ii.x,0,-Ji.y,Ji.x,0];return!Dc(e,Us,Fs,Os,Ko)||(e=[1,0,0,0,1,0,0,0,1],!Dc(e,Us,Fs,Os,Ko))?!1:(Jo.crossVectors(Pi,Ii),e=[Jo.x,Jo.y,Jo.z],Dc(e,Us,Fs,Os,Ko))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,zn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(zn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(vi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),vi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),vi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),vi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),vi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),vi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),vi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),vi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(vi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},vi=[new L,new L,new L,new L,new L,new L,new L,new L],zn=new L,$o=new pn,Us=new L,Fs=new L,Os=new L,Pi=new L,Ii=new L,Ji=new L,Rr=new L,Ko=new L,Jo=new L,ji=new L;function Dc(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){ji.fromArray(i,r);let a=s.x*Math.abs(ji.x)+s.y*Math.abs(ji.y)+s.z*Math.abs(ji.z),l=t.dot(ji),c=e.dot(ji),h=n.dot(ji);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var ke=new L,jo=new ft,om=0,ze=class extends Gn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:om++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Kc,this.updateRanges=[],this.gpuType=Ln,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)jo.fromBufferAttribute(this,e),jo.applyMatrix3(t),this.setXY(e,jo.x,jo.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.applyMatrix3(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.applyMatrix4(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.applyNormalMatrix(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.transformDirection(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Hs(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=fn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Hs(e,this.array)),e}setX(t,e){return this.normalized&&(e=fn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Hs(e,this.array)),e}setY(t,e){return this.normalized&&(e=fn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Hs(e,this.array)),e}setZ(t,e){return this.normalized&&(e=fn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Hs(e,this.array)),e}setW(t,e){return this.normalized&&(e=fn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=fn(e,this.array),n=fn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=fn(e,this.array),n=fn(n,this.array),s=fn(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=fn(e,this.array),n=fn(n,this.array),s=fn(s,this.array),r=fn(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Kc&&(t.usage=this.usage),t}dispose(){this.dispatchEvent({type:"dispose"})}};var Hr=class extends ze{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Wr=class extends ze{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var pe=class extends ze{constructor(t,e,n){super(new Float32Array(t),e,n)}},am=new pn,Pr=new L,Nc=new L,Ui=class{constructor(t=new L,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):am.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Pr.subVectors(t,this.center);let e=Pr.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Pr,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Nc.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Pr.copy(t.center).add(Nc)),this.expandByPoint(Pr.copy(t.center).sub(Nc))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},lm=0,Rn=new se,Uc=new je,Bs=new L,Mn=new pn,Ir=new pn,Ke=new L,Ne=class i extends Gn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:lm++}),this.uuid=gs(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Lp(t)?Wr:Hr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new ne().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Rn.makeRotationFromQuaternion(t),this.applyMatrix4(Rn),this}rotateX(t){return Rn.makeRotationX(t),this.applyMatrix4(Rn),this}rotateY(t){return Rn.makeRotationY(t),this.applyMatrix4(Rn),this}rotateZ(t){return Rn.makeRotationZ(t),this.applyMatrix4(Rn),this}translate(t,e,n){return Rn.makeTranslation(t,e,n),this.applyMatrix4(Rn),this}scale(t,e,n){return Rn.makeScale(t,e,n),this.applyMatrix4(Rn),this}lookAt(t){return Uc.lookAt(t),Uc.updateMatrix(),this.applyMatrix4(Uc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Bs).negate(),this.translate(Bs.x,Bs.y,Bs.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new pe(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&jt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new pn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Qt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Mn.setFromBufferAttribute(r),this.morphTargetsRelative?(Ke.addVectors(this.boundingBox.min,Mn.min),this.boundingBox.expandByPoint(Ke),Ke.addVectors(this.boundingBox.max,Mn.max),this.boundingBox.expandByPoint(Ke)):(this.boundingBox.expandByPoint(Mn.min),this.boundingBox.expandByPoint(Mn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Qt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ui);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Qt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new L,1/0);return}if(t){let n=this.boundingSphere.center;if(Mn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];Ir.setFromBufferAttribute(a),this.morphTargetsRelative?(Ke.addVectors(Mn.min,Ir.min),Mn.expandByPoint(Ke),Ke.addVectors(Mn.max,Ir.max),Mn.expandByPoint(Ke)):(Mn.expandByPoint(Ir.min),Mn.expandByPoint(Ir.max))}Mn.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)Ke.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Ke));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Ke.fromBufferAttribute(a,c),l&&(Bs.fromBufferAttribute(t,c),Ke.add(Bs)),s=Math.max(s,n.distanceToSquared(Ke))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Qt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Qt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new ze(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let v=0;v<n.count;v++)a[v]=new L,l[v]=new L;let c=new L,h=new L,f=new L,u=new ft,d=new ft,g=new ft,y=new L,m=new L;function p(v,b,R){c.fromBufferAttribute(n,v),h.fromBufferAttribute(n,b),f.fromBufferAttribute(n,R),u.fromBufferAttribute(r,v),d.fromBufferAttribute(r,b),g.fromBufferAttribute(r,R),h.sub(c),f.sub(c),d.sub(u),g.sub(u);let P=1/(d.x*g.y-g.x*d.y);isFinite(P)&&(y.copy(h).multiplyScalar(g.y).addScaledVector(f,-d.y).multiplyScalar(P),m.copy(f).multiplyScalar(d.x).addScaledVector(h,-g.x).multiplyScalar(P),a[v].add(y),a[b].add(y),a[R].add(y),l[v].add(m),l[b].add(m),l[R].add(m))}let M=this.groups;M.length===0&&(M=[{start:0,count:t.count}]);for(let v=0,b=M.length;v<b;++v){let R=M[v],P=R.start,O=R.count;for(let V=P,q=P+O;V<q;V+=3)p(t.getX(V+0),t.getX(V+1),t.getX(V+2))}let E=new L,x=new L,w=new L,S=new L;function T(v){w.fromBufferAttribute(s,v),S.copy(w);let b=a[v];E.copy(b),E.sub(w.multiplyScalar(w.dot(b))).normalize(),x.crossVectors(S,b);let P=x.dot(l[v])<0?-1:1;o.setXYZW(v,E.x,E.y,E.z,P)}for(let v=0,b=M.length;v<b;++v){let R=M[v],P=R.start,O=R.count;for(let V=P,q=P+O;V<q;V+=3)T(t.getX(V+0)),T(t.getX(V+1)),T(t.getX(V+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new ze(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,d=n.count;u<d;u++)n.setXYZ(u,0,0,0);let s=new L,r=new L,o=new L,a=new L,l=new L,c=new L,h=new L,f=new L;if(t)for(let u=0,d=t.count;u<d;u+=3){let g=t.getX(u+0),y=t.getX(u+1),m=t.getX(u+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,y),o.fromBufferAttribute(e,m),h.subVectors(o,r),f.subVectors(s,r),h.cross(f),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,y),c.fromBufferAttribute(n,m),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(y,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,d=e.count;u<d;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),o.fromBufferAttribute(e,u+2),h.subVectors(o,r),f.subVectors(s,r),h.cross(f),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Ke.fromBufferAttribute(t,e),Ke.normalize(),t.setXYZ(e,Ke.x,Ke.y,Ke.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,f=a.normalized,u=new c.constructor(l.length*h),d=0,g=0;for(let y=0,m=l.length;y<m;y++){a.isInterleavedBufferAttribute?d=l[y]*a.data.stride+a.offset:d=l[y]*h;for(let p=0;p<h;p++)u[g++]=c[d++]}return new ze(u,h,f)}if(this.index===null)return jt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=t(l,n);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,f=c.length;h<f;h++){let u=c[h],d=t(u,n);l.push(d)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let f=0,u=c.length;f<u;f++){let d=c[f];h.push(d.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],f=r[c];for(let u=0,d=f.length;u<d;u++)h.push(f[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var cm=0,ri=class extends Gn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:cm++}),this.uuid=gs(),this.name="",this.type="Material",this.blending=ss,this.side=Mi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=xa,this.blendDst=va,this.blendEquation=Sn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Bt(0,0,0),this.blendAlpha=0,this.depthFunc=rs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=$c,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=es,this.stencilZFail=es,this.stencilZPass=es,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){jt(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){jt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ss&&(n.blending=this.blending),this.side!==Mi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==xa&&(n.blendSrc=this.blendSrc),this.blendDst!==va&&(n.blendDst=this.blendDst),this.blendEquation!==Sn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==rs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==$c&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==es&&(n.stencilFail=this.stencilFail),this.stencilZFail!==es&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==es&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Bt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ft().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ft().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var _i=new L,Fc=new L,Qo=new L,Li=new L,Oc=new L,ta=new L,Bc=new L,as=class{constructor(t=new L,e=new L(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,_i)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=_i.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(_i.copy(this.origin).addScaledVector(this.direction,e),_i.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Fc.copy(t).add(e).multiplyScalar(.5),Qo.copy(e).sub(t).normalize(),Li.copy(this.origin).sub(Fc);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Qo),a=Li.dot(this.direction),l=-Li.dot(Qo),c=Li.lengthSq(),h=Math.abs(1-o*o),f,u,d,g;if(h>0)if(f=o*l-a,u=o*a-l,g=r*h,f>=0)if(u>=-g)if(u<=g){let y=1/h;f*=y,u*=y,d=f*(f+o*u+2*a)+u*(o*f+u+2*l)+c}else u=r,f=Math.max(0,-(o*u+a)),d=-f*f+u*(u+2*l)+c;else u=-r,f=Math.max(0,-(o*u+a)),d=-f*f+u*(u+2*l)+c;else u<=-g?(f=Math.max(0,-(-o*r+a)),u=f>0?-r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c):u<=g?(f=0,u=Math.min(Math.max(-r,-l),r),d=u*(u+2*l)+c):(f=Math.max(0,-(o*r+a)),u=f>0?r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c);else u=o>0?-r:r,f=Math.max(0,-(o*u+a)),d=-f*f+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(Fc).addScaledVector(Qo,u),d}intersectSphere(t,e){_i.subVectors(t.center,this.origin);let n=_i.dot(this.direction),s=_i.dot(_i)-n*n,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),f>=0?(a=(t.min.z-u.z)*f,l=(t.max.z-u.z)*f):(a=(t.max.z-u.z)*f,l=(t.min.z-u.z)*f),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,_i)!==null}intersectTriangle(t,e,n,s,r){Oc.subVectors(e,t),ta.subVectors(n,t),Bc.crossVectors(Oc,ta);let o=this.direction.dot(Bc),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Li.subVectors(this.origin,t);let l=a*this.direction.dot(ta.crossVectors(Li,ta));if(l<0)return null;let c=a*this.direction.dot(Oc.cross(Li));if(c<0||l+c>o)return null;let h=-a*Li.dot(Bc);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Xr=class extends ri{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Bt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.combine=el,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Bu=new se,Qi=new as,ea=new Ui,ku=new L,na=new L,ia=new L,sa=new L,kc=new L,ra=new L,zu=new L,oa=new L,be=class extends je{constructor(t=new Ne,e=new Xr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){ra.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],f=r[l];h!==0&&(kc.fromBufferAttribute(f,t),o?ra.addScaledVector(kc,h):ra.addScaledVector(kc.sub(e),h))}e.add(ra)}return e}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ea.copy(n.boundingSphere),ea.applyMatrix4(r),Qi.copy(t.ray).recast(t.near),!(ea.containsPoint(Qi.origin)===!1&&(Qi.intersectSphere(ea,ku)===null||Qi.origin.distanceToSquared(ku)>(t.far-t.near)**2))&&(Bu.copy(r).invert(),Qi.copy(t.ray).applyMatrix4(Bu),!(n.boundingBox!==null&&Qi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Qi)))}_computeIntersections(t,e,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,f=r.attributes.normal,u=r.groups,d=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,y=u.length;g<y;g++){let m=u[g],p=o[m.materialIndex],M=Math.max(m.start,d.start),E=Math.min(a.count,Math.min(m.start+m.count,d.start+d.count));for(let x=M,w=E;x<w;x+=3){let S=a.getX(x),T=a.getX(x+1),v=a.getX(x+2);s=aa(this,p,t,n,c,h,f,S,T,v),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let g=Math.max(0,d.start),y=Math.min(a.count,d.start+d.count);for(let m=g,p=y;m<p;m+=3){let M=a.getX(m),E=a.getX(m+1),x=a.getX(m+2);s=aa(this,o,t,n,c,h,f,M,E,x),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,y=u.length;g<y;g++){let m=u[g],p=o[m.materialIndex],M=Math.max(m.start,d.start),E=Math.min(l.count,Math.min(m.start+m.count,d.start+d.count));for(let x=M,w=E;x<w;x+=3){let S=x,T=x+1,v=x+2;s=aa(this,p,t,n,c,h,f,S,T,v),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let g=Math.max(0,d.start),y=Math.min(l.count,d.start+d.count);for(let m=g,p=y;m<p;m+=3){let M=m,E=m+1,x=m+2;s=aa(this,o,t,n,c,h,f,M,E,x),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}};function hm(i,t,e,n,s,r,o,a){let l;if(t.side===rn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===Mi,a),l===null)return null;oa.copy(a),oa.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(oa);return c<e.near||c>e.far?null:{distance:c,point:oa.clone(),object:i}}function aa(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,na),i.getVertexPosition(l,ia),i.getVertexPosition(c,sa);let h=hm(i,t,e,n,na,ia,sa,zu);if(h){let f=new L;Ni.getBarycoord(zu,na,ia,sa,f),s&&(h.uv=Ni.getInterpolatedAttribute(s,a,l,c,f,new ft)),r&&(h.uv1=Ni.getInterpolatedAttribute(r,a,l,c,f,new ft)),o&&(h.normal=Ni.getInterpolatedAttribute(o,a,l,c,f,new L),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new L,materialIndex:0};Ni.getNormal(na,ia,sa,u.normal),h.face=u,h.barycoord=f}return h}var Hn=class extends Je{constructor(t=null,e=1,n=1,s,r,o,a,l,c=Ue,h=Ue,f,u){super(null,o,a,l,c,h,s,r,f,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var js=class extends ze{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},ks=new se,Vu=new se,la=[],Gu=new pn,um=new se,Lr=new be,Dr=new Ui,qr=class extends be{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new js(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,um)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new pn),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,ks),Gu.copy(t.boundingBox).applyMatrix4(ks),this.boundingBox.union(Gu)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ui),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,ks),Dr.copy(t.boundingSphere).applyMatrix4(ks),this.boundingSphere.union(Dr)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=t*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(t,e){let n=this.matrixWorld,s=this.count;if(Lr.geometry=this.geometry,Lr.material=this.material,Lr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Dr.copy(this.boundingSphere),Dr.applyMatrix4(n),t.ray.intersectsSphere(Dr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,ks),Vu.multiplyMatrices(n,ks),Lr.matrixWorld=Vu,Lr.raycast(t,la);for(let o=0,a=la.length;o<a;o++){let l=la[o];l.instanceId=r,l.object=this,e.push(l)}la.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new js(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Hn(new Float32Array(s*this.count),s,this.count,ll,Ln));let r=this.morphTexture.source.data.data,o=0;for(let c=0;c<n.length;c++)o+=n[c];let a=this.geometry.morphTargetsRelative?1:1-o,l=s*t;return r[l]=a,r.set(n,l+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},zc=new L,dm=new L,fm=new ne,hn=class{constructor(t=new L(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=zc.subVectors(n,e).cross(dm.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(zc),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||fm.getNormalMatrix(t),s=this.coplanarPoint(zc).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}},ts=new Ui,pm=new ft(.5,.5),ca=new L,Qs=class{constructor(t=new hn,e=new hn,n=new hn,s=new hn,r=new hn,o=new hn){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Vn,n=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],f=r[5],u=r[6],d=r[7],g=r[8],y=r[9],m=r[10],p=r[11],M=r[12],E=r[13],x=r[14],w=r[15];if(s[0].setComponents(c-o,d-h,p-g,w-M).normalize(),s[1].setComponents(c+o,d+h,p+g,w+M).normalize(),s[2].setComponents(c+a,d+f,p+y,w+E).normalize(),s[3].setComponents(c-a,d-f,p-y,w-E).normalize(),n)s[4].setComponents(l,u,m,x).normalize(),s[5].setComponents(c-l,d-u,p-m,w-x).normalize();else if(s[4].setComponents(c-l,d-u,p-m,w-x).normalize(),e===Vn)s[5].setComponents(c+l,d+u,p+m,w+x).normalize();else if(e===Xs)s[5].setComponents(l,u,m,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ts.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),ts.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ts)}intersectsSprite(t){ts.center.set(0,0,0);let e=pm.distanceTo(t.center);return ts.radius=.7071067811865476+e,ts.applyMatrix4(t.matrixWorld),this.intersectsSphere(ts)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(ca.x=s.normal.x>0?t.max.x:t.min.x,ca.y=s.normal.y>0?t.max.y:t.min.y,ca.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(ca)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Yr=class extends Je{constructor(t=[],e=Vi,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Jc=class extends Je{constructor(t,e,n,s,r,o,a,l,c){super(t,e,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var Wn=class extends Je{constructor(t,e,n=qn,s,r,o,a=Ue,l=Ue,c,h=si,f=1){if(h!==si&&h!==li)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:f};super(u,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new $s(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}},Ia=class extends Wn{constructor(t,e=qn,n=Vi,s,r,o=Ue,a=Ue,l,c=si){let h={width:t,height:t,depth:1},f=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},Zr=class extends Je{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},oi=class i extends Ne{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],f=[],u=0,d=0;g("z","y","x",-1,-1,n,e,t,o,r,0),g("z","y","x",1,-1,n,e,-t,o,r,1),g("x","z","y",1,1,t,n,e,s,o,2),g("x","z","y",1,-1,t,n,-e,s,o,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new pe(c,3)),this.setAttribute("normal",new pe(h,3)),this.setAttribute("uv",new pe(f,2));function g(y,m,p,M,E,x,w,S,T,v,b){let R=x/T,P=w/v,O=x/2,V=w/2,q=S/2,F=T+1,z=v+1,U=0,Y=0,j=new L;for(let ht=0;ht<z;ht++){let ct=ht*P-V;for(let yt=0;yt<F;yt++){let xt=yt*R-O;j[y]=xt*M,j[m]=ct*E,j[p]=q,c.push(j.x,j.y,j.z),j[y]=0,j[m]=0,j[p]=S>0?1:-1,h.push(j.x,j.y,j.z),f.push(yt/T),f.push(1-ht/v),U+=1}}for(let ht=0;ht<v;ht++)for(let ct=0;ct<T;ct++){let yt=u+ct+F*ht,xt=u+ct+F*(ht+1),Kt=u+(ct+1)+F*(ht+1),kt=u+(ct+1)+F*ht;l.push(yt,xt,kt),l.push(xt,Kt,kt),Y+=6}a.addGroup(d,Y,b),d+=Y,u+=U}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var $r=class i extends Ne{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);let r=[],o=[],a=[],l=[],c=new L,h=new ft;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let f=0,u=3;f<=e;f++,u+=3){let d=n+f/e*s;c.x=t*Math.cos(d),c.y=t*Math.sin(d),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[u]/t+1)/2,h.y=(o[u+1]/t+1)/2,l.push(h.x,h.y)}for(let f=1;f<=e;f++)r.push(f,f+1,0);this.setIndex(r),this.setAttribute("position",new pe(o,3)),this.setAttribute("normal",new pe(a,3)),this.setAttribute("uv",new pe(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.segments,t.thetaStart,t.thetaLength)}},jc=class i extends Ne{constructor(t=1,e=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],f=[],u=[],d=[],g=0,y=[],m=n/2,p=0;M(),o===!1&&(t>0&&E(!0),e>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new pe(f,3)),this.setAttribute("normal",new pe(u,3)),this.setAttribute("uv",new pe(d,2));function M(){let x=new L,w=new L,S=0,T=(e-t)/n;for(let v=0;v<=r;v++){let b=[],R=v/r,P=R*(e-t)+t;for(let O=0;O<=s;O++){let V=O/s,q=V*l+a,F=Math.sin(q),z=Math.cos(q);w.x=P*F,w.y=-R*n+m,w.z=P*z,f.push(w.x,w.y,w.z),x.set(F,T,z).normalize(),u.push(x.x,x.y,x.z),d.push(V,1-R),b.push(g++)}y.push(b)}for(let v=0;v<s;v++)for(let b=0;b<r;b++){let R=y[b][v],P=y[b+1][v],O=y[b+1][v+1],V=y[b][v+1];(t>0||b!==0)&&(h.push(R,P,V),S+=3),(e>0||b!==r-1)&&(h.push(P,O,V),S+=3)}c.addGroup(p,S,0),p+=S}function E(x){let w=g,S=new ft,T=new L,v=0,b=x===!0?t:e,R=x===!0?1:-1;for(let O=1;O<=s;O++)f.push(0,m*R,0),u.push(0,R,0),d.push(.5,.5),g++;let P=g;for(let O=0;O<=s;O++){let q=O/s*l+a,F=Math.cos(q),z=Math.sin(q);T.x=b*z,T.y=m*R,T.z=b*F,f.push(T.x,T.y,T.z),u.push(0,R,0),S.x=F*.5+.5,S.y=z*.5*R+.5,d.push(S.x,S.y),g++}for(let O=0;O<s;O++){let V=w+O,q=P+O;x===!0?h.push(q,q+1,V):h.push(q+1,q,V),v+=3}c.addGroup(p,v,x===!0?1:2),p+=v}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var wn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){jt("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,s=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),s=0,r=n.length,o;e?o=e:o=t*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);let h=n[s],u=n[s+1]-h,d=(o-h)/u;return(s+d)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let o=this.getPoint(s),a=this.getPoint(r),l=e||(o.isVector2?new ft:new L);return l.copy(a).sub(o).normalize(),l}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new L,s=[],r=[],o=[],a=new L,l=new se;for(let d=0;d<=t;d++){let g=d/t;s[d]=this.getTangentAt(g,new L)}r[0]=new L,o[0]=new L;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),f=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),f<=c&&(c=f,n.set(0,1,0)),u<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let d=1;d<=t;d++){if(r[d]=r[d-1].clone(),o[d]=o[d-1].clone(),a.crossVectors(s[d-1],s[d]),a.length()>Number.EPSILON){a.normalize();let g=Math.acos(ce(s[d-1].dot(s[d]),-1,1));r[d].applyMatrix4(l.makeRotationAxis(a,g))}o[d].crossVectors(s[d],r[d])}if(e===!0){let d=Math.acos(ce(r[0].dot(r[t]),-1,1));d/=t,s[0].dot(a.crossVectors(r[0],r[t]))>0&&(d=-d);for(let g=1;g<=t;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],d*g)),o[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},tr=class extends wn{constructor(t=0,e=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new ft){let n=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);let a=this.aStartAngle+t*r,l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let h=Math.cos(this.aRotation),f=Math.sin(this.aRotation),u=l-this.aX,d=c-this.aY;l=u*h-d*f+this.aX,c=u*f+d*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},La=class extends tr{constructor(t,e,n,s,r,o){super(t,e,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}};function Lh(){let i=0,t=0,e=0,n=0;function s(r,o,a,l){i=r,t=a,e=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,f){let u=(o-r)/c-(a-r)/(c+h)+(a-o)/h,d=(a-o)/h-(l-o)/(h+f)+(l-a)/f;u*=h,d*=h,s(o,a,u,d)},calc:function(r){let o=r*r,a=o*r;return i+t*r+e*o+n*a}}}var Hu=new L,Wu=new L,Vc=new Lh,Gc=new Lh,Hc=new Lh,Da=class extends wn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new L){let n=e,s=this.points,r=s.length,o=(r-(this.closed?0:1))*t,a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=s[(a-1)%r]:(Wu.subVectors(s[0],s[1]).add(s[0]),c=Wu);let f=s[a%r],u=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(Hu.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Hu),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,g=Math.pow(c.distanceToSquared(f),d),y=Math.pow(f.distanceToSquared(u),d),m=Math.pow(u.distanceToSquared(h),d);y<1e-4&&(y=1),g<1e-4&&(g=y),m<1e-4&&(m=y),Vc.initNonuniformCatmullRom(c.x,f.x,u.x,h.x,g,y,m),Gc.initNonuniformCatmullRom(c.y,f.y,u.y,h.y,g,y,m),Hc.initNonuniformCatmullRom(c.z,f.z,u.z,h.z,g,y,m)}else this.curveType==="catmullrom"&&(Vc.initCatmullRom(c.x,f.x,u.x,h.x,this.tension),Gc.initCatmullRom(c.y,f.y,u.y,h.y,this.tension),Hc.initCatmullRom(c.z,f.z,u.z,h.z,this.tension));return n.set(Vc.calc(l),Gc.calc(l),Hc.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new L().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function Xu(i,t,e,n,s){let r=(n-t)*.5,o=(s-e)*.5,a=i*i,l=i*a;return(2*e-2*n+r+o)*l+(-3*e+3*n-2*r-o)*a+r*i+e}function mm(i,t){let e=1-i;return e*e*t}function gm(i,t){return 2*(1-i)*i*t}function xm(i,t){return i*i*t}function Or(i,t,e,n){return mm(i,t)+gm(i,e)+xm(i,n)}function vm(i,t){let e=1-i;return e*e*e*t}function _m(i,t){let e=1-i;return 3*e*e*i*t}function ym(i,t){return 3*(1-i)*i*i*t}function bm(i,t){return i*i*i*t}function Br(i,t,e,n,s){return vm(i,t)+_m(i,e)+ym(i,n)+bm(i,s)}var Kr=class extends wn{constructor(t=new ft,e=new ft,n=new ft,s=new ft){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new ft){let n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Br(t,s.x,r.x,o.x,a.x),Br(t,s.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Na=class extends wn{constructor(t=new L,e=new L,n=new L,s=new L){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new L){let n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Br(t,s.x,r.x,o.x,a.x),Br(t,s.y,r.y,o.y,a.y),Br(t,s.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Jr=class extends wn{constructor(t=new ft,e=new ft){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ft){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ft){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Ua=class extends wn{constructor(t=new L,e=new L){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new L){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new L){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},jr=class extends wn{constructor(t=new ft,e=new ft,n=new ft){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ft){let n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(Or(t,s.x,r.x,o.x),Or(t,s.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Qr=class extends wn{constructor(t=new L,e=new L,n=new L){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new L){let n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(Or(t,s.x,r.x,o.x),Or(t,s.y,r.y,o.y),Or(t,s.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},to=class extends wn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ft){let n=e,s=this.points,r=(s.length-1)*t,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],h=s[o>s.length-2?s.length-1:o+1],f=s[o>s.length-3?s.length-1:o+2];return n.set(Xu(a,l.x,c.x,h.x,f.x),Xu(a,l.y,c.y,h.y,f.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new ft().fromArray(s))}return this}},Fa=Object.freeze({__proto__:null,ArcCurve:La,CatmullRomCurve3:Da,CubicBezierCurve:Kr,CubicBezierCurve3:Na,EllipseCurve:tr,LineCurve:Jr,LineCurve3:Ua,QuadraticBezierCurve:jr,QuadraticBezierCurve3:Qr,SplineCurve:to}),Oa=class extends wn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Fa[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let o=s[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let s=0,r=this.curves;s<r.length;s++){let o=r[s],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(a);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(new Fa[s.type]().fromJSON(s))}return this}},eo=class extends Oa{constructor(t){super(),this.type="Path",this.currentPoint=new ft,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new Jr(this.currentPoint.clone(),new ft(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){let r=new jr(this.currentPoint.clone(),new ft(t,e),new ft(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,o){let a=new Kr(this.currentPoint.clone(),new ft(t,e),new ft(n,s),new ft(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new to(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,o){let a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,s,r,o),this}absarc(t,e,n,s,r,o){return this.absellipse(t,e,n,n,s,r,o),this}ellipse(t,e,n,s,r,o,a,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,o,a,l),this}absellipse(t,e,n,s,r,o,a,l){let c=new tr(t,e,n,s,r,o,a,l);if(this.curves.length>0){let f=c.getPoint(0);f.equals(this.currentPoint)||this.lineTo(f.x,f.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},Ba=class extends eo{constructor(t){super(t),this.uuid=gs(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(new eo().fromJSON(s))}return this}};function Mm(i,t,e=2){let n=t&&t.length,s=n?t[0]*e:i.length,r=Fd(i,0,s,e,!0),o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=Am(i,t,r,e)),i.length>80*e){a=i[0],l=i[1];let h=a,f=l;for(let u=e;u<s;u+=e){let d=i[u],g=i[u+1];d<a&&(a=d),g<l&&(l=g),d>h&&(h=d),g>f&&(f=g)}c=Math.max(h-a,f-l),c=c!==0?32767/c:0}return no(r,o,e,a,l,c,0),o}function Fd(i,t,e,n,s){let r;if(s===Bm(i,t,e,n)>0)for(let o=t;o<e;o+=n)r=qu(o/n|0,i[o],i[o+1],r);else for(let o=e-n;o>=t;o-=n)r=qu(o/n|0,i[o],i[o+1],r);return r&&er(r,r.next)&&(so(r),r=r.next),r}function ls(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(er(e,e.next)||De(e.prev,e,e.next)===0)){if(so(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function no(i,t,e,n,s,r,o){if(!i)return;!o&&r&&Lm(i,n,s,r);let a=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?wm(i,n,s,r):Sm(i)){t.push(l.i,i.i,c.i),so(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=Tm(ls(i),t),no(i,t,e,n,s,r,2)):o===2&&Em(i,t,e,n,s,r):no(ls(i),t,e,n,s,r,1);break}}}function Sm(i){let t=i.prev,e=i,n=i.next;if(De(t,e,n)>=0)return!1;let s=t.x,r=e.x,o=n.x,a=t.y,l=e.y,c=n.y,h=Math.min(s,r,o),f=Math.min(a,l,c),u=Math.max(s,r,o),d=Math.max(a,l,c),g=n.next;for(;g!==t;){if(g.x>=h&&g.x<=u&&g.y>=f&&g.y<=d&&Nr(s,a,r,l,o,c,g.x,g.y)&&De(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function wm(i,t,e,n){let s=i.prev,r=i,o=i.next;if(De(s,r,o)>=0)return!1;let a=s.x,l=r.x,c=o.x,h=s.y,f=r.y,u=o.y,d=Math.min(a,l,c),g=Math.min(h,f,u),y=Math.max(a,l,c),m=Math.max(h,f,u),p=Qc(d,g,t,e,n),M=Qc(y,m,t,e,n),E=i.prevZ,x=i.nextZ;for(;E&&E.z>=p&&x&&x.z<=M;){if(E.x>=d&&E.x<=y&&E.y>=g&&E.y<=m&&E!==s&&E!==o&&Nr(a,h,l,f,c,u,E.x,E.y)&&De(E.prev,E,E.next)>=0||(E=E.prevZ,x.x>=d&&x.x<=y&&x.y>=g&&x.y<=m&&x!==s&&x!==o&&Nr(a,h,l,f,c,u,x.x,x.y)&&De(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;E&&E.z>=p;){if(E.x>=d&&E.x<=y&&E.y>=g&&E.y<=m&&E!==s&&E!==o&&Nr(a,h,l,f,c,u,E.x,E.y)&&De(E.prev,E,E.next)>=0)return!1;E=E.prevZ}for(;x&&x.z<=M;){if(x.x>=d&&x.x<=y&&x.y>=g&&x.y<=m&&x!==s&&x!==o&&Nr(a,h,l,f,c,u,x.x,x.y)&&De(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function Tm(i,t){let e=i;do{let n=e.prev,s=e.next.next;!er(n,s)&&Bd(n,e,e.next,s)&&io(n,s)&&io(s,n)&&(t.push(n.i,e.i,s.i),so(e),so(e.next),e=i=s),e=e.next}while(e!==i);return ls(e)}function Em(i,t,e,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&Um(o,a)){let l=kd(o,a);o=ls(o,o.next),l=ls(l,l.next),no(o,t,e,n,s,r,0),no(l,t,e,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function Am(i,t,e,n){let s=[];for(let r=0,o=t.length;r<o;r++){let a=t[r]*n,l=r<o-1?t[r+1]*n:i.length,c=Fd(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Nm(c))}s.sort(Cm);for(let r=0;r<s.length;r++)e=Rm(s[r],e);return e}function Cm(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function Rm(i,t){let e=Pm(i,t);if(!e)return t;let n=kd(e,i);return ls(n,n.next),ls(e,e.next)}function Pm(i,t){let e=t,n=i.x,s=i.y,r=-1/0,o;if(er(i,e))return e;do{if(er(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let f=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=n&&f>r&&(r=f,o=e.x<e.next.x?e:e.next,f===n))return o}e=e.next}while(e!==t);if(!o)return null;let a=o,l=o.x,c=o.y,h=1/0;e=o;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Od(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){let f=Math.abs(s-e.y)/(n-e.x);io(e,i)&&(f<h||f===h&&(e.x>o.x||e.x===o.x&&Im(o,e)))&&(o=e,h=f)}e=e.next}while(e!==a);return o}function Im(i,t){return De(i.prev,i,t.prev)<0&&De(t.next,i,i.next)<0}function Lm(i,t,e,n){let s=i;do s.z===0&&(s.z=Qc(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Dm(s)}function Dm(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let o=n,a=0;for(let c=0;c<e&&(a++,o=o.nextZ,!!o);c++);let l=e;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,e*=2}while(t>1);return i}function Qc(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function Nm(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Od(i,t,e,n,s,r,o,a){return(s-o)*(t-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(e-o)*(t-a)&&(e-o)*(r-a)>=(s-o)*(n-a)}function Nr(i,t,e,n,s,r,o,a){return!(i===o&&t===a)&&Od(i,t,e,n,s,r,o,a)}function Um(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!Fm(i,t)&&(io(i,t)&&io(t,i)&&Om(i,t)&&(De(i.prev,i,t.prev)||De(i,t.prev,t))||er(i,t)&&De(i.prev,i,i.next)>0&&De(t.prev,t,t.next)>0)}function De(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function er(i,t){return i.x===t.x&&i.y===t.y}function Bd(i,t,e,n){let s=ua(De(i,t,e)),r=ua(De(i,t,n)),o=ua(De(e,n,i)),a=ua(De(e,n,t));return!!(s!==r&&o!==a||s===0&&ha(i,e,t)||r===0&&ha(i,n,t)||o===0&&ha(e,i,n)||a===0&&ha(e,t,n))}function ha(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function ua(i){return i>0?1:i<0?-1:0}function Fm(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&Bd(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function io(i,t){return De(i.prev,i,i.next)<0?De(i,t,i.next)>=0&&De(i,i.prev,t)>=0:De(i,t,i.prev)<0||De(i,i.next,t)<0}function Om(i,t){let e=i,n=!1,s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function kd(i,t){let e=th(i.i,i.x,i.y),n=th(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function qu(i,t,e,n){let s=th(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function so(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function th(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Bm(i,t,e,n){let s=0;for(let r=t,o=e-n;r<e;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}var eh=class{static triangulate(t,e,n=2){return Mm(t,e,n)}},ns=class i{static area(t){let e=t.length,n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return i.area(t)<0}static triangulateShape(t,e){let n=[],s=[],r=[];Yu(t),Zu(n,t);let o=t.length;e.forEach(Yu);for(let l=0;l<e.length;l++)s.push(o),o+=e[l].length,Zu(n,e[l]);let a=eh.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}};function Yu(i){let t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function Zu(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}var nh=class i extends Ne{constructor(t=new Ba([new ft(.5,.5),new ft(-.5,.5),new ft(-.5,-.5),new ft(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,s=[],r=[];for(let a=0,l=t.length;a<l;a++){let c=t[a];o(c)}this.setAttribute("position",new pe(s,3)),this.setAttribute("uv",new pe(r,2)),this.computeVertexNormals();function o(a){let l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,f=e.depth!==void 0?e.depth:1,u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,d=e.bevelThickness!==void 0?e.bevelThickness:.2,g=e.bevelSize!==void 0?e.bevelSize:d-.1,y=e.bevelOffset!==void 0?e.bevelOffset:0,m=e.bevelSegments!==void 0?e.bevelSegments:3,p=e.extrudePath,M=e.UVGenerator!==void 0?e.UVGenerator:km,E,x=!1,w,S,T,v;if(p){E=p.getSpacedPoints(h),x=!0,u=!1;let rt=p.isCatmullRomCurve3?p.closed:!1;w=p.computeFrenetFrames(h,rt),S=new L,T=new L,v=new L}u||(m=0,d=0,g=0,y=0);let b=a.extractPoints(c),R=b.shape,P=b.holes;if(!ns.isClockWise(R)){R=R.reverse();for(let rt=0,N=P.length;rt<N;rt++){let G=P[rt];ns.isClockWise(G)&&(P[rt]=G.reverse())}}function V(rt){let G=10000000000000001e-36,at=rt[0];for(let Z=1;Z<=rt.length;Z++){let Lt=Z%rt.length,X=rt[Lt],Et=X.x-at.x,pt=X.y-at.y,B=Et*Et+pt*pt,oe=Math.max(Math.abs(X.x),Math.abs(X.y),Math.abs(at.x),Math.abs(at.y)),It=G*oe*oe;if(B<=It){rt.splice(Lt,1),Z--;continue}at=X}}V(R),P.forEach(V);let q=P.length,F=R;for(let rt=0;rt<q;rt++){let N=P[rt];R=R.concat(N)}function z(rt,N,G){return N||Qt("ExtrudeGeometry: vec does not exist"),rt.clone().addScaledVector(N,G)}let U=R.length;function Y(rt,N,G){let at,Z,Lt,X=rt.x-N.x,Et=rt.y-N.y,pt=G.x-rt.x,B=G.y-rt.y,oe=X*X+Et*Et,It=X*B-Et*pt;if(Math.abs(It)>Number.EPSILON){let A=Math.sqrt(oe),_=Math.sqrt(pt*pt+B*B),H=N.x-Et/A,$=N.y+X/A,nt=G.x-B/_,gt=G.y+pt/_,bt=((nt-H)*B-(gt-$)*pt)/(X*B-Et*pt);at=H+X*bt-rt.x,Z=$+Et*bt-rt.y;let tt=at*at+Z*Z;if(tt<=2)return new ft(at,Z);Lt=Math.sqrt(tt/2)}else{let A=!1;X>Number.EPSILON?pt>Number.EPSILON&&(A=!0):X<-Number.EPSILON?pt<-Number.EPSILON&&(A=!0):Math.sign(Et)===Math.sign(B)&&(A=!0),A?(at=-Et,Z=X,Lt=Math.sqrt(oe)):(at=X,Z=Et,Lt=Math.sqrt(oe/2))}return new ft(at/Lt,Z/Lt)}let j=[];for(let rt=0,N=F.length,G=N-1,at=rt+1;rt<N;rt++,G++,at++)G===N&&(G=0),at===N&&(at=0),j[rt]=Y(F[rt],F[G],F[at]);let ht=[],ct,yt=j.concat();for(let rt=0,N=q;rt<N;rt++){let G=P[rt];ct=[];for(let at=0,Z=G.length,Lt=Z-1,X=at+1;at<Z;at++,Lt++,X++)Lt===Z&&(Lt=0),X===Z&&(X=0),ct[at]=Y(G[at],G[Lt],G[X]);ht.push(ct),yt=yt.concat(ct)}let xt;if(m===0)xt=ns.triangulateShape(F,P);else{let rt=[],N=[];for(let G=0;G<m;G++){let at=G/m,Z=d*Math.cos(at*Math.PI/2),Lt=g*Math.sin(at*Math.PI/2)+y;for(let X=0,Et=F.length;X<Et;X++){let pt=z(F[X],j[X],Lt);Ft(pt.x,pt.y,-Z),at===0&&rt.push(pt)}for(let X=0,Et=q;X<Et;X++){let pt=P[X];ct=ht[X];let B=[];for(let oe=0,It=pt.length;oe<It;oe++){let A=z(pt[oe],ct[oe],Lt);Ft(A.x,A.y,-Z),at===0&&B.push(A)}at===0&&N.push(B)}}xt=ns.triangulateShape(rt,N)}let Kt=xt.length,kt=g+y;for(let rt=0;rt<U;rt++){let N=u?z(R[rt],yt[rt],kt):R[rt];x?(T.copy(w.normals[0]).multiplyScalar(N.x),S.copy(w.binormals[0]).multiplyScalar(N.y),v.copy(E[0]).add(T).add(S),Ft(v.x,v.y,v.z)):Ft(N.x,N.y,0)}for(let rt=1;rt<=h;rt++)for(let N=0;N<U;N++){let G=u?z(R[N],yt[N],kt):R[N];x?(T.copy(w.normals[rt]).multiplyScalar(G.x),S.copy(w.binormals[rt]).multiplyScalar(G.y),v.copy(E[rt]).add(T).add(S),Ft(v.x,v.y,v.z)):Ft(G.x,G.y,f/h*rt)}for(let rt=m-1;rt>=0;rt--){let N=rt/m,G=d*Math.cos(N*Math.PI/2),at=g*Math.sin(N*Math.PI/2)+y;for(let Z=0,Lt=F.length;Z<Lt;Z++){let X=z(F[Z],j[Z],at);Ft(X.x,X.y,f+G)}for(let Z=0,Lt=P.length;Z<Lt;Z++){let X=P[Z];ct=ht[Z];for(let Et=0,pt=X.length;Et<pt;Et++){let B=z(X[Et],ct[Et],at);x?Ft(B.x,B.y+E[h-1].y,E[h-1].x+G):Ft(B.x,B.y,f+G)}}}Q(),mt();function Q(){let rt=s.length/3;if(u){let N=0,G=U*N;for(let at=0;at<Kt;at++){let Z=xt[at];Mt(Z[2]+G,Z[1]+G,Z[0]+G)}N=h+m*2,G=U*N;for(let at=0;at<Kt;at++){let Z=xt[at];Mt(Z[0]+G,Z[1]+G,Z[2]+G)}}else{for(let N=0;N<Kt;N++){let G=xt[N];Mt(G[2],G[1],G[0])}for(let N=0;N<Kt;N++){let G=xt[N];Mt(G[0]+U*h,G[1]+U*h,G[2]+U*h)}}n.addGroup(rt,s.length/3-rt,0)}function mt(){let rt=s.length/3,N=0;ut(F,N),N+=F.length;for(let G=0,at=P.length;G<at;G++){let Z=P[G];ut(Z,N),N+=Z.length}n.addGroup(rt,s.length/3-rt,1)}function ut(rt,N){let G=rt.length;for(;--G>=0;){let at=G,Z=G-1;Z<0&&(Z=rt.length-1);for(let Lt=0,X=h+m*2;Lt<X;Lt++){let Et=U*Lt,pt=U*(Lt+1),B=N+at+Et,oe=N+Z+Et,It=N+Z+pt,A=N+at+pt;St(B,oe,It,A)}}}function Ft(rt,N,G){l.push(rt),l.push(N),l.push(G)}function Mt(rt,N,G){te(rt),te(N),te(G);let at=s.length/3,Z=M.generateTopUV(n,s,at-3,at-2,at-1);Vt(Z[0]),Vt(Z[1]),Vt(Z[2])}function St(rt,N,G,at){te(rt),te(N),te(at),te(N),te(G),te(at);let Z=s.length/3,Lt=M.generateSideWallUV(n,s,Z-6,Z-3,Z-2,Z-1);Vt(Lt[0]),Vt(Lt[1]),Vt(Lt[3]),Vt(Lt[1]),Vt(Lt[2]),Vt(Lt[3])}function te(rt){s.push(l[rt*3+0]),s.push(l[rt*3+1]),s.push(l[rt*3+2])}function Vt(rt){r.push(rt.x),r.push(rt.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return zm(e,n,t)}static fromJSON(t,e){let n=[];for(let r=0,o=t.shapes.length;r<o;r++){let a=e[t.shapes[r]];n.push(a)}let s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new Fa[s.type]().fromJSON(s)),new i(n,t.options)}},km={generateTopUV:function(i,t,e,n,s){let r=t[e*3],o=t[e*3+1],a=t[n*3],l=t[n*3+1],c=t[s*3],h=t[s*3+1];return[new ft(r,o),new ft(a,l),new ft(c,h)]},generateSideWallUV:function(i,t,e,n,s,r){let o=t[e*3],a=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],f=t[n*3+2],u=t[s*3],d=t[s*3+1],g=t[s*3+2],y=t[r*3],m=t[r*3+1],p=t[r*3+2];return Math.abs(a-h)<Math.abs(o-c)?[new ft(o,1-l),new ft(c,1-f),new ft(u,1-g),new ft(y,1-p)]:[new ft(a,1-l),new ft(h,1-f),new ft(d,1-g),new ft(m,1-p)]}};function zm(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];e.shapes.push(r.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var ih=class i extends Ne{constructor(t=[new ft(0,-.5),new ft(.5,0),new ft(0,.5)],e=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:s},e=Math.floor(e),s=ce(s,0,Math.PI*2);let r=[],o=[],a=[],l=[],c=[],h=1/e,f=new L,u=new ft,d=new L,g=new L,y=new L,m=0,p=0;for(let M=0;M<=t.length-1;M++)switch(M){case 0:m=t[M+1].x-t[M].x,p=t[M+1].y-t[M].y,d.x=p*1,d.y=-m,d.z=p*0,y.copy(d),d.normalize(),l.push(d.x,d.y,d.z);break;case t.length-1:l.push(y.x,y.y,y.z);break;default:m=t[M+1].x-t[M].x,p=t[M+1].y-t[M].y,d.x=p*1,d.y=-m,d.z=p*0,g.copy(d),d.x+=y.x,d.y+=y.y,d.z+=y.z,d.normalize(),l.push(d.x,d.y,d.z),y.copy(g)}for(let M=0;M<=e;M++){let E=n+M*h*s,x=Math.sin(E),w=Math.cos(E);for(let S=0;S<=t.length-1;S++){f.x=t[S].x*x,f.y=t[S].y,f.z=t[S].x*w,o.push(f.x,f.y,f.z),u.x=M/e,u.y=S/(t.length-1),a.push(u.x,u.y);let T=l[3*S+0]*x,v=l[3*S+1],b=l[3*S+0]*w;c.push(T,v,b)}}for(let M=0;M<e;M++)for(let E=0;E<t.length-1;E++){let x=E+M*t.length,w=x,S=x+t.length,T=x+t.length+1,v=x+1;r.push(w,S,v),r.push(T,v,S)}this.setIndex(r),this.setAttribute("position",new pe(o,3)),this.setAttribute("uv",new pe(a,2)),this.setAttribute("normal",new pe(c,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.points,t.segments,t.phiStart,t.phiLength)}};var cs=class i extends Ne{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,f=t/a,u=e/l,d=[],g=[],y=[],m=[];for(let p=0;p<h;p++){let M=p*u-o;for(let E=0;E<c;E++){let x=E*f-r;g.push(x,-M,0),y.push(0,0,1),m.push(E/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let M=0;M<a;M++){let E=M+c*p,x=M+c*(p+1),w=M+1+c*(p+1),S=M+1+c*p;d.push(E,x,S),d.push(x,w,S)}this.setIndex(d),this.setAttribute("position",new pe(g,3)),this.setAttribute("normal",new pe(y,3)),this.setAttribute("uv",new pe(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var sh=class i extends Ne{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],f=new L,u=new L,d=[],g=[],y=[],m=[];for(let p=0;p<=n;p++){let M=[],E=p/n,x=o+E*a,w=t*Math.cos(x),S=Math.sqrt(t*t-w*w),T=0;p===0&&o===0?T=.5/e:p===n&&l===Math.PI&&(T=-.5/e);for(let v=0;v<=e;v++){let b=v/e,R=s+b*r;f.x=-S*Math.cos(R),f.y=w,f.z=S*Math.sin(R),g.push(f.x,f.y,f.z),u.copy(f).normalize(),y.push(u.x,u.y,u.z),m.push(b+T,1-E),M.push(c++)}h.push(M)}for(let p=0;p<n;p++)for(let M=0;M<e;M++){let E=h[p][M+1],x=h[p][M],w=h[p+1][M],S=h[p+1][M+1];(p!==0||o>0)&&d.push(E,x,S),(p!==n-1||l<Math.PI)&&d.push(x,w,S)}this.setIndex(d),this.setAttribute("position",new pe(g,3)),this.setAttribute("normal",new pe(y,3)),this.setAttribute("uv",new pe(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var rh=class i extends Ne{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],h=[],f=[],u=new L,d=new L,g=new L;for(let y=0;y<=n;y++){let m=o+y/n*a;for(let p=0;p<=s;p++){let M=p/s*r;d.x=(t+e*Math.cos(m))*Math.cos(M),d.y=(t+e*Math.cos(m))*Math.sin(M),d.z=e*Math.sin(m),c.push(d.x,d.y,d.z),u.x=t*Math.cos(M),u.y=t*Math.sin(M),g.subVectors(d,u).normalize(),h.push(g.x,g.y,g.z),f.push(p/s),f.push(y/n)}}for(let y=1;y<=n;y++)for(let m=1;m<=s;m++){let p=(s+1)*y+m-1,M=(s+1)*(y-1)+m-1,E=(s+1)*(y-1)+m,x=(s+1)*y+m;l.push(p,M,x),l.push(M,E,x)}this.setIndex(l),this.setAttribute("position",new pe(c,3)),this.setAttribute("normal",new pe(h,3)),this.setAttribute("uv",new pe(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}};var oh=class i extends Ne{constructor(t=new Qr(new L(-1,-1,0),new L(-1,1,0),new L(1,1,0)),e=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:s,closed:r};let o=t.computeFrenetFrames(e,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let a=new L,l=new L,c=new ft,h=new L,f=[],u=[],d=[],g=[];y(),this.setIndex(g),this.setAttribute("position",new pe(f,3)),this.setAttribute("normal",new pe(u,3)),this.setAttribute("uv",new pe(d,2));function y(){for(let E=0;E<e;E++)m(E);m(r===!1?e:0),M(),p()}function m(E){h=t.getPointAt(E/e,h);let x=o.normals[E],w=o.binormals[E];for(let S=0;S<=s;S++){let T=S/s*Math.PI*2,v=Math.sin(T),b=-Math.cos(T);l.x=b*x.x+v*w.x,l.y=b*x.y+v*w.y,l.z=b*x.z+v*w.z,l.normalize(),u.push(l.x,l.y,l.z),a.x=h.x+n*l.x,a.y=h.y+n*l.y,a.z=h.z+n*l.z,f.push(a.x,a.y,a.z)}}function p(){for(let E=1;E<=e;E++)for(let x=1;x<=s;x++){let w=(s+1)*(E-1)+(x-1),S=(s+1)*E+(x-1),T=(s+1)*E+x,v=(s+1)*(E-1)+x;g.push(w,S,v),g.push(S,T,v)}}function M(){for(let E=0;E<=e;E++)for(let x=0;x<=s;x++)c.x=E/e,c.y=x/s,d.push(c.x,c.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new i(new Fa[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function xs(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if($u(s))s.isRenderTargetTexture?(jt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if($u(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function un(i){let t={};for(let e=0;e<i.length;e++){let n=xs(i[e]);for(let s in n)t[s]=n[s]}return t}function $u(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Vm(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Dh(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:fe.workingColorSpace}var ci={clone:xs,merge:un},Gm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Hm=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Fe=class extends ri{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Gm,this.fragmentShader=Hm,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=xs(t.uniforms),this.uniformsGroups=Vm(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new Bt().setHex(s.value);break;case"v2":this.uniforms[n].value=new ft().fromArray(s.value);break;case"v3":this.uniforms[n].value=new L().fromArray(s.value);break;case"v4":this.uniforms[n].value=new Ae().fromArray(s.value);break;case"m3":this.uniforms[n].value=new ne().fromArray(s.value);break;case"m4":this.uniforms[n].value=new se().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},nr=class extends Fe{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Si=class extends ri{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Bt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Bt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=lr,this.normalScale=new ft(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},ah=class extends Si{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ft(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return ce(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Bt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Bt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Bt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var ro=class extends ri{constructor(t){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=lr,this.normalScale=new ft(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.flatShading=t.flatShading,this}},oo=class extends ri{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Bt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Bt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=lr,this.normalScale=new ft(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.combine=el,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},ka=class extends ri{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Sd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},za=class extends ri{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function da(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}var Fi=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let o;e:{i:if(!(t<s)){for(let a=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=e[++n],t<s)break t}o=e.length;break e}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}o=n,n=0;break e}break n}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Va=class extends Fi{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:qc,endingEnd:qc}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Yc:r=t,a=2*e-n;break;case Zc:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Yc:o=t,l=2*n-e;break;case Zc:o=1,l=n+s[1]-s[0];break;default:o=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,f=this._offsetNext,u=this._weightPrev,d=this._weightNext,g=(n-e)/(s-e),y=g*g,m=y*g,p=-u*m+2*u*y-u*g,M=(1+u)*m+(-1.5-2*u)*y+(-.5+u)*g+1,E=(-1-d)*m+(1.5+d)*y+.5*g,x=d*m-d*y;for(let w=0;w!==a;++w)r[w]=p*o[h+w]+M*o[c+w]+E*o[l+w]+x*o[f+w];return r}},Ga=class extends Fi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(n-e)/(s-e),f=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*f+o[l+u]*h;return r}},Ha=class extends Fi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},Wa=class extends Fi{interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,f=this.outTangents;if(!h||!f){let g=(n-e)/(s-e),y=1-g;for(let m=0;m!==a;++m)r[m]=o[c+m]*y+o[l+m]*g;return r}let u=a*2,d=t-1;for(let g=0;g!==a;++g){let y=o[c+g],m=o[l+g],p=d*u+g*2,M=f[p],E=f[p+1],x=t*u+g*2,w=h[x],S=h[x+1],T=(n-e)/(s-e),v,b,R,P,O;for(let V=0;V<8;V++){v=T*T,b=v*T,R=1-T,P=R*R,O=P*R;let F=O*e+3*P*T*M+3*R*v*w+b*s-n;if(Math.abs(F)<1e-10)break;let z=3*P*(M-e)+6*R*T*(w-M)+3*v*(s-w);if(Math.abs(z)<1e-10)break;T=T-F/z,T=Math.max(0,Math.min(1,T))}r[g]=O*y+3*P*T*E+3*R*v*S+b*m}return r}},Tn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=da(e,this.TimeBufferType),this.values=da(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:da(t.times,Array),values:da(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s)}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new Ha(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Ga(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Va(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new Wa(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case kr:e=this.InterpolantFactoryMethodDiscrete;break;case Aa:e=this.InterpolantFactoryMethodLinear;break;case ma:e=this.InterpolantFactoryMethodSmooth;break;case Xc:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return jt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return kr;case this.InterpolantFactoryMethodLinear:return Aa;case this.InterpolantFactoryMethodSmooth:return ma;case this.InterpolantFactoryMethodBezier:return Xc}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t}return this}trim(t,e){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Qt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Qt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Qt("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){Qt("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(s!==void 0&&Dp(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Qt("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===ma,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(s)l=!0;else{let f=a*n,u=f-n,d=f+n;for(let g=0;g!==n;++g){let y=e[f+g];if(y!==e[u+g]||y!==e[d+g]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let f=a*n,u=o*n;for(let d=0;d!==n;++d)e[u+d]=e[f+d]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,s}};Tn.prototype.ValueTypeName="";Tn.prototype.TimeBufferType=Float32Array;Tn.prototype.ValueBufferType=Float32Array;Tn.prototype.DefaultInterpolation=Aa;var Oi=class extends Tn{constructor(t,e,n){super(t,e,n)}};Oi.prototype.ValueTypeName="bool";Oi.prototype.ValueBufferType=Array;Oi.prototype.DefaultInterpolation=kr;Oi.prototype.InterpolantFactoryMethodLinear=void 0;Oi.prototype.InterpolantFactoryMethodSmooth=void 0;var Xa=class extends Tn{constructor(t,e,n,s){super(t,e,n,s)}};Xa.prototype.ValueTypeName="color";var qa=class extends Tn{constructor(t,e,n,s){super(t,e,n,s)}};qa.prototype.ValueTypeName="number";var Ya=class extends Fi{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-e)/(s-e),c=t*a;for(let h=c+a;c!==h;c+=4)sn.slerpFlat(r,0,o,c-a,o,c,l);return r}},ao=class extends Tn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Ya(this.times,this.values,this.getValueSize(),t)}};ao.prototype.ValueTypeName="quaternion";ao.prototype.InterpolantFactoryMethodSmooth=void 0;var Bi=class extends Tn{constructor(t,e,n){super(t,e,n)}};Bi.prototype.ValueTypeName="string";Bi.prototype.ValueBufferType=Array;Bi.prototype.DefaultInterpolation=kr;Bi.prototype.InterpolantFactoryMethodLinear=void 0;Bi.prototype.InterpolantFactoryMethodSmooth=void 0;var Za=class extends Tn{constructor(t,e,n,s){super(t,e,n,s)}};Za.prototype.ValueTypeName="vector";var ga={enabled:!1,files:{},add:function(i,t){this.enabled!==!1&&(Ku(i)||(this.files[i]=t))},get:function(i){if(this.enabled!==!1&&!Ku(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Ku(i){try{let t=i.slice(i.indexOf(":")+1);return new URL(t).protocol==="blob:"}catch{return!1}}var ir=class{constructor(t,e,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,f){return c.push(h,f),this},this.removeHandler=function(h){let f=c.indexOf(h);return f!==-1&&c.splice(f,2),this},this.getHandler=function(h){for(let f=0,u=c.length;f<u;f+=2){let d=c[f],g=c[f+1];if(d.global&&(d.lastIndex=0),d.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},zd=new ir,sr=class{constructor(t){this.manager=t!==void 0?t:zd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};sr.DEFAULT_MATERIAL_NAME="__DEFAULT";var zs=new WeakMap,$a=class extends sr{constructor(t){super(t)}load(t,e,n,s){this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);let r=this,o=ga.get(`image:${t}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(t),setTimeout(function(){e&&e(o),r.manager.itemEnd(t)},0);else{let f=zs.get(o);f===void 0&&(f=[],zs.set(o,f)),f.push({onLoad:e,onError:s})}return o}let a=qs("img");function l(){h(),e&&e(this);let f=zs.get(this)||[];for(let u=0;u<f.length;u++){let d=f[u];d.onLoad&&d.onLoad(this)}zs.delete(this),r.manager.itemEnd(t)}function c(f){h(),s&&s(f),ga.remove(`image:${t}`);let u=zs.get(this)||[];for(let d=0;d<u.length;d++){let g=u[d];g.onError&&g.onError(f)}zs.delete(this),r.manager.itemError(t),r.manager.itemEnd(t)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),t.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),ga.add(`image:${t}`,a),r.manager.itemStart(t),a.src=t,a}};var lh=class extends sr{constructor(t){super(t)}load(t,e,n,s){let r=new Je,o=new $a(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(t,function(a){r.image=a,r.needsUpdate=!0,e!==void 0&&e(r)},n,s),r}},hs=class extends je{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Bt(t),this.intensity=e}dispose(){this.dispatchEvent({type:"dispose"})}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},lo=class extends hs{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(je.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Bt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},Wc=new se,Ju=new L,ju=new L,Ka=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ft(512,512),this.mapType=Qe,this.map=null,this.mapPass=null,this.matrix=new se,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Qs,this._frameExtents=new ft(1,1),this._viewportCount=1,this._viewports=[new Ae(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera,n=this.matrix;Ju.setFromMatrixPosition(t.matrixWorld),e.position.copy(Ju),ju.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(ju),e.updateMatrixWorld(),Wc.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Wc,e.coordinateSystem,e.reversedDepth),e.coordinateSystem===Xs||e.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Wc)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},fa=new L,pa=new sn,ei=new L,co=class extends je{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new se,this.projectionMatrix=new se,this.projectionMatrixInverse=new se,this.coordinateSystem=Vn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(fa,pa,ei),ei.x===1&&ei.y===1&&ei.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(fa,pa,ei.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(fa,pa,ei),ei.x===1&&ei.y===1&&ei.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(fa,pa,ei.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Di=new L,Qu=new ft,td=new ft,He=class extends co{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Zs*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Ur*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Zs*2*Math.atan(Math.tan(Ur*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Di.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Di.x,Di.y).multiplyScalar(-t/Di.z),Di.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Di.x,Di.y).multiplyScalar(-t/Di.z)}getViewSize(t,e){return this.getViewBounds(t,Qu,td),e.subVectors(td,Qu)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Ur*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var ch=class extends Ka{constructor(){super(new He(90,1,.5,500)),this.isPointLightShadow=!0}},us=class extends hs{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new ch}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},In=class extends co{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},hh=class extends Ka{constructor(){super(new In(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ho=class extends hs{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(je.DEFAULT_UP),this.updateMatrix(),this.target=new je,this.shadow=new hh}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},uo=class extends hs{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Vs=-90,Gs=1,Ja=class extends je{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new He(Vs,Gs,t,e);s.layers=this.layers,this.add(s);let r=new He(Vs,Gs,t,e);r.layers=this.layers,this.add(r);let o=new He(Vs,Gs,t,e);o.layers=this.layers,this.add(o);let a=new He(Vs,Gs,t,e);a.layers=this.layers,this.add(a);let l=new He(Vs,Gs,t,e);l.layers=this.layers,this.add(l);let c=new He(Vs,Gs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Vn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Xs)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,f=t.getRenderTarget(),u=t.getActiveCubeFace(),d=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;let y=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=y,t.setRenderTarget(n,5,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(f,u,d),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},ja=class extends He{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var Nh="\\[\\]\\.:\\/",Wm=new RegExp("["+Nh+"]","g"),Uh="[^"+Nh+"]",Xm="[^"+Nh.replace("\\.","")+"]",qm=/((?:WC+[\/:])*)/.source.replace("WC",Uh),Ym=/(WCOD+)?/.source.replace("WCOD",Xm),Zm=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Uh),$m=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Uh),Km=new RegExp("^"+qm+Ym+Zm+$m+"$"),Jm=["material","materials","bones","map"],uh=class{constructor(t,e,n){let s=n||Ce.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},Ce=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Wm,"")}static parseTrackName(t){let e=Km.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Jm.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=n(a.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){jt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){Qt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Qt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Qt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Qt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Qt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Qt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){Qt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[s];if(o===void 0){let c=e.nodeName;Qt("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Qt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Qt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ce.Composite=uh;Ce.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ce.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ce.prototype.GetterByBindingType=[Ce.prototype._getValue_direct,Ce.prototype._getValue_array,Ce.prototype._getValue_arrayElement,Ce.prototype._getValue_toArray];Ce.prototype.SetterByBindingTypeAndVersioning=[[Ce.prototype._setValue_direct,Ce.prototype._setValue_direct_setNeedsUpdate,Ce.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ce.prototype._setValue_array,Ce.prototype._setValue_array_setNeedsUpdate,Ce.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ce.prototype._setValue_arrayElement,Ce.prototype._setValue_arrayElement_setNeedsUpdate,Ce.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ce.prototype._setValue_fromArray,Ce.prototype._setValue_fromArray_setNeedsUpdate,Ce.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var eb=new Float32Array(1);var ed=new se,fo=class{constructor(t,e,n=0,s=1/0){this.ray=new as(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Ks,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Qt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return ed.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(ed),this}intersectObject(t,e=!0,n=[]){return dh(t,this,n,e),n.sort(nd),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)dh(t[s],this,n,e);return n.sort(nd),n}};function nd(i,t){return i.distance-t.distance}function dh(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let o=0,a=r.length;o<a;o++)dh(r[o],t,e,!0)}}var rr=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=ce(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(ce(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Vh=class Vh{constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};Vh.prototype.isMatrix2=!0;var fh=Vh;var po=class extends Gn{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){jt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function Fh(i,t,e,n){let s=jm(n);switch(e){case Eh:return i*t;case ll:return i*t/s.components*s.byteLength;case cl:return i*t/s.components*s.byteLength;case Wi:return i*t*2/s.components*s.byteLength;case hl:return i*t*2/s.components*s.byteLength;case Ah:return i*t*3/s.components*s.byteLength;case vn:return i*t*4/s.components*s.byteLength;case ul:return i*t*4/s.components*s.byteLength;case Mo:case So:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case wo:case To:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case fl:case ml:return Math.max(i,16)*Math.max(t,8)/4;case dl:case pl:return Math.max(i,8)*Math.max(t,8)/2;case gl:case xl:case _l:case yl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case vl:case Eo:case bl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Ml:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Sl:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case wl:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Tl:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case El:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Al:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Cl:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Rl:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Pl:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Il:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Ll:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Dl:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Nl:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Ul:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Fl:case Ol:case Bl:return Math.ceil(i/4)*Math.ceil(t/4)*16;case kl:case zl:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Ao:case Vl:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function jm(i){switch(i){case Qe:case Mh:return{byteLength:1,components:1};case ar:case Sh:case Xe:return{byteLength:2,components:1};case ol:case al:return{byteLength:2,components:4};case qn:case rl:case Ln:return{byteLength:4,components:1};case wh:case Th:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"185"}}));typeof window<"u"&&(window.__THREE__?jt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="185");function hf(){let i=null,t=!1,e=null,n=null;function s(r,o){e(r,o),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function rg(i){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,f=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),a.onUploadCallback();let d;if(c instanceof Float32Array)d=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?d=i.HALF_FLOAT:d=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=i.SHORT;else if(c instanceof Uint32Array)d=i.UNSIGNED_INT;else if(c instanceof Int32Array)d=i.INT;else if(c instanceof Int8Array)d=i.BYTE;else if(c instanceof Uint8Array)d=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function n(a,l,c){let h=l.array,f=l.updateRanges;if(i.bindBuffer(c,a),f.length===0)i.bufferSubData(c,0,h);else{f.sort((d,g)=>d.start-g.start);let u=0;for(let d=1;d<f.length;d++){let g=f[u],y=f[d];y.start<=g.start+g.count+1?g.count=Math.max(g.count,y.start+y.count-g.start):(++u,f[u]=y)}f.length=u+1;for(let d=0,g=f.length;d<g;d++){let y=f[d];i.bufferSubData(c,y.start*h.BYTES_PER_ELEMENT,h,y.start,y.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var og=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ag=`#ifdef USE_ALPHAHASH
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
#endif`,lg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,cg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,hg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ug=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,dg=`#ifdef USE_AOMAP
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
#endif`,fg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,pg=`#ifdef USE_BATCHING
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
#endif`,mg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,gg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,xg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,vg=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,_g=`#ifdef USE_IRIDESCENCE
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
#endif`,yg=`#ifdef USE_BUMPMAP
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
#endif`,bg=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Mg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Sg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,wg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Tg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Eg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Ag=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Cg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,Rg=`#define PI 3.141592653589793
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
} // validated`,Pg=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Ig=`vec3 transformedNormal = objectNormal;
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
#endif`,Lg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Dg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Ng=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ug=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Fg="gl_FragColor = linearToOutputTexel( gl_FragColor );",Og=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Bg=`#ifdef USE_ENVMAP
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
#endif`,kg=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,zg=`#ifdef USE_ENVMAP
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
#endif`,Vg=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Gg=`#ifdef USE_ENVMAP
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
#endif`,Hg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Wg=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Xg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,qg=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Yg=`#ifdef USE_GRADIENTMAP
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
}`,Zg=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,$g=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Kg=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Jg=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,jg=`#ifdef USE_ENVMAP
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
#endif`,Qg=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,t0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,e0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,n0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,i0=`PhysicalMaterial material;
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
#endif`,s0=`uniform sampler2D dfgLUT;
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
}`,r0=`
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
#endif`,o0=`#if defined( RE_IndirectDiffuse )
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
#endif`,a0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,l0=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,c0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,h0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,u0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,d0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,f0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,p0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,m0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,g0=`#if defined( USE_POINTS_UV )
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
#endif`,x0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,v0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,_0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,y0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,b0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,M0=`#ifdef USE_MORPHTARGETS
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
#endif`,S0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,w0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,T0=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,E0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,A0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,C0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,R0=`#ifdef USE_NORMALMAP
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
#endif`,P0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,I0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,L0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,D0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,N0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,U0=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,F0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,O0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,B0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,k0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,z0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,V0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,G0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,H0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,W0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,X0=`float getShadowMask() {
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
}`,q0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Y0=`#ifdef USE_SKINNING
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
#endif`,Z0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,$0=`#ifdef USE_SKINNING
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
#endif`,K0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,J0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,j0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Q0=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,tx=`#ifdef USE_TRANSMISSION
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
#endif`,ex=`#ifdef USE_TRANSMISSION
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
#endif`,nx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,ix=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,sx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,rx=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,ox=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,ax=`uniform sampler2D t2D;
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
}`,lx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cx=`#ifdef ENVMAP_TYPE_CUBE
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
}`,hx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ux=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,dx=`#include <common>
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
}`,fx=`#if DEPTH_PACKING == 3200
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
}`,px=`#define DISTANCE
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
}`,mx=`#define DISTANCE
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
}`,gx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,xx=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,vx=`uniform float scale;
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
}`,_x=`uniform vec3 diffuse;
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
}`,yx=`#include <common>
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
}`,bx=`uniform vec3 diffuse;
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
}`,Mx=`#define LAMBERT
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
}`,Sx=`#define LAMBERT
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
}`,wx=`#define MATCAP
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
}`,Tx=`#define MATCAP
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
}`,Ex=`#define NORMAL
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
}`,Ax=`#define NORMAL
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
}`,Cx=`#define PHONG
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
}`,Rx=`#define PHONG
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
}`,Px=`#define STANDARD
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
}`,Ix=`#define STANDARD
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
}`,Lx=`#define TOON
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
}`,Dx=`#define TOON
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
}`,Nx=`uniform float size;
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
}`,Ux=`uniform vec3 diffuse;
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
}`,Fx=`#include <common>
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
}`,Ox=`uniform vec3 color;
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
}`,Bx=`uniform float rotation;
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
}`,kx=`uniform vec3 diffuse;
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
}`,he={alphahash_fragment:og,alphahash_pars_fragment:ag,alphamap_fragment:lg,alphamap_pars_fragment:cg,alphatest_fragment:hg,alphatest_pars_fragment:ug,aomap_fragment:dg,aomap_pars_fragment:fg,batching_pars_vertex:pg,batching_vertex:mg,begin_vertex:gg,beginnormal_vertex:xg,bsdfs:vg,iridescence_fragment:_g,bumpmap_pars_fragment:yg,clipping_planes_fragment:bg,clipping_planes_pars_fragment:Mg,clipping_planes_pars_vertex:Sg,clipping_planes_vertex:wg,color_fragment:Tg,color_pars_fragment:Eg,color_pars_vertex:Ag,color_vertex:Cg,common:Rg,cube_uv_reflection_fragment:Pg,defaultnormal_vertex:Ig,displacementmap_pars_vertex:Lg,displacementmap_vertex:Dg,emissivemap_fragment:Ng,emissivemap_pars_fragment:Ug,colorspace_fragment:Fg,colorspace_pars_fragment:Og,envmap_fragment:Bg,envmap_common_pars_fragment:kg,envmap_pars_fragment:zg,envmap_pars_vertex:Vg,envmap_physical_pars_fragment:jg,envmap_vertex:Gg,fog_vertex:Hg,fog_pars_vertex:Wg,fog_fragment:Xg,fog_pars_fragment:qg,gradientmap_pars_fragment:Yg,lightmap_pars_fragment:Zg,lights_lambert_fragment:$g,lights_lambert_pars_fragment:Kg,lights_pars_begin:Jg,lights_toon_fragment:Qg,lights_toon_pars_fragment:t0,lights_phong_fragment:e0,lights_phong_pars_fragment:n0,lights_physical_fragment:i0,lights_physical_pars_fragment:s0,lights_fragment_begin:r0,lights_fragment_maps:o0,lights_fragment_end:a0,lightprobes_pars_fragment:l0,logdepthbuf_fragment:c0,logdepthbuf_pars_fragment:h0,logdepthbuf_pars_vertex:u0,logdepthbuf_vertex:d0,map_fragment:f0,map_pars_fragment:p0,map_particle_fragment:m0,map_particle_pars_fragment:g0,metalnessmap_fragment:x0,metalnessmap_pars_fragment:v0,morphinstance_vertex:_0,morphcolor_vertex:y0,morphnormal_vertex:b0,morphtarget_pars_vertex:M0,morphtarget_vertex:S0,normal_fragment_begin:w0,normal_fragment_maps:T0,normal_pars_fragment:E0,normal_pars_vertex:A0,normal_vertex:C0,normalmap_pars_fragment:R0,clearcoat_normal_fragment_begin:P0,clearcoat_normal_fragment_maps:I0,clearcoat_pars_fragment:L0,iridescence_pars_fragment:D0,opaque_fragment:N0,packing:U0,premultiplied_alpha_fragment:F0,project_vertex:O0,dithering_fragment:B0,dithering_pars_fragment:k0,roughnessmap_fragment:z0,roughnessmap_pars_fragment:V0,shadowmap_pars_fragment:G0,shadowmap_pars_vertex:H0,shadowmap_vertex:W0,shadowmask_pars_fragment:X0,skinbase_vertex:q0,skinning_pars_vertex:Y0,skinning_vertex:Z0,skinnormal_vertex:$0,specularmap_fragment:K0,specularmap_pars_fragment:J0,tonemapping_fragment:j0,tonemapping_pars_fragment:Q0,transmission_fragment:tx,transmission_pars_fragment:ex,uv_pars_fragment:nx,uv_pars_vertex:ix,uv_vertex:sx,worldpos_vertex:rx,background_vert:ox,background_frag:ax,backgroundCube_vert:lx,backgroundCube_frag:cx,cube_vert:hx,cube_frag:ux,depth_vert:dx,depth_frag:fx,distance_vert:px,distance_frag:mx,equirect_vert:gx,equirect_frag:xx,linedashed_vert:vx,linedashed_frag:_x,meshbasic_vert:yx,meshbasic_frag:bx,meshlambert_vert:Mx,meshlambert_frag:Sx,meshmatcap_vert:wx,meshmatcap_frag:Tx,meshnormal_vert:Ex,meshnormal_frag:Ax,meshphong_vert:Cx,meshphong_frag:Rx,meshphysical_vert:Px,meshphysical_frag:Ix,meshtoon_vert:Lx,meshtoon_frag:Dx,points_vert:Nx,points_frag:Ux,shadow_vert:Fx,shadow_frag:Ox,sprite_vert:Bx,sprite_frag:kx},Ut={common:{diffuse:{value:new Bt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ne},alphaMap:{value:null},alphaMapTransform:{value:new ne},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ne}},envmap:{envMap:{value:null},envMapRotation:{value:new ne},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ne}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ne}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ne},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ne},normalScale:{value:new ft(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ne},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ne}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ne}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ne}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Bt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new L},probesMax:{value:new L},probesResolution:{value:new L}},points:{diffuse:{value:new Bt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ne},alphaTest:{value:0},uvTransform:{value:new ne}},sprite:{diffuse:{value:new Bt(16777215)},opacity:{value:1},center:{value:new ft(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ne},alphaMap:{value:null},alphaMapTransform:{value:new ne},alphaTest:{value:0}}},ui={basic:{uniforms:un([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.fog]),vertexShader:he.meshbasic_vert,fragmentShader:he.meshbasic_frag},lambert:{uniforms:un([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Bt(0)},envMapIntensity:{value:1}}]),vertexShader:he.meshlambert_vert,fragmentShader:he.meshlambert_frag},phong:{uniforms:un([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Bt(0)},specular:{value:new Bt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:he.meshphong_vert,fragmentShader:he.meshphong_frag},standard:{uniforms:un([Ut.common,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.roughnessmap,Ut.metalnessmap,Ut.fog,Ut.lights,{emissive:{value:new Bt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:he.meshphysical_vert,fragmentShader:he.meshphysical_frag},toon:{uniforms:un([Ut.common,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.gradientmap,Ut.fog,Ut.lights,{emissive:{value:new Bt(0)}}]),vertexShader:he.meshtoon_vert,fragmentShader:he.meshtoon_frag},matcap:{uniforms:un([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,{matcap:{value:null}}]),vertexShader:he.meshmatcap_vert,fragmentShader:he.meshmatcap_frag},points:{uniforms:un([Ut.points,Ut.fog]),vertexShader:he.points_vert,fragmentShader:he.points_frag},dashed:{uniforms:un([Ut.common,Ut.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:he.linedashed_vert,fragmentShader:he.linedashed_frag},depth:{uniforms:un([Ut.common,Ut.displacementmap]),vertexShader:he.depth_vert,fragmentShader:he.depth_frag},normal:{uniforms:un([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,{opacity:{value:1}}]),vertexShader:he.meshnormal_vert,fragmentShader:he.meshnormal_frag},sprite:{uniforms:un([Ut.sprite,Ut.fog]),vertexShader:he.sprite_vert,fragmentShader:he.sprite_frag},background:{uniforms:{uvTransform:{value:new ne},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:he.background_vert,fragmentShader:he.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ne}},vertexShader:he.backgroundCube_vert,fragmentShader:he.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:he.cube_vert,fragmentShader:he.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:he.equirect_vert,fragmentShader:he.equirect_frag},distance:{uniforms:un([Ut.common,Ut.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:he.distance_vert,fragmentShader:he.distance_frag},shadow:{uniforms:un([Ut.lights,Ut.fog,{color:{value:new Bt(0)},opacity:{value:1}}]),vertexShader:he.shadow_vert,fragmentShader:he.shadow_frag}};ui.physical={uniforms:un([ui.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ne},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ne},clearcoatNormalScale:{value:new ft(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ne},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ne},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ne},sheen:{value:0},sheenColor:{value:new Bt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ne},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ne},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ne},transmissionSamplerSize:{value:new ft},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ne},attenuationDistance:{value:0},attenuationColor:{value:new Bt(0)},specularColor:{value:new Bt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ne},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ne},anisotropyVector:{value:new ft},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ne}}]),vertexShader:he.meshphysical_vert,fragmentShader:he.meshphysical_frag};var Wl={r:0,b:0,g:0},zx=new se,uf=new ne;uf.set(-1,0,0,0,1,0,0,0,1);function Vx(i,t,e,n,s,r){let o=new Bt(0),a=s===!0?0:1,l,c,h=null,f=0,u=null;function d(M){let E=M.isScene===!0?M.background:null;if(E&&E.isTexture){let x=M.backgroundBlurriness>0;E=t.get(E,x)}return E}function g(M){let E=!1,x=d(M);x===null?m(o,a):x&&x.isColor&&(m(x,1),E=!0);let w=i.xr.getEnvironmentBlendMode();w==="additive"?e.buffers.color.setClear(0,0,0,1,r):w==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||E)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function y(M,E){let x=d(E);x&&(x.isCubeTexture||x.mapping===yo)?(c===void 0&&(c=new be(new oi(1,1,1),new Fe({name:"BackgroundCubeMaterial",uniforms:xs(ui.backgroundCube.uniforms),vertexShader:ui.backgroundCube.vertexShader,fragmentShader:ui.backgroundCube.fragmentShader,side:rn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(w,S,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(zx.makeRotationFromEuler(E.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(uf),c.material.toneMapped=fe.getTransfer(x.colorSpace)!==ye,(h!==x||f!==x.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=x,f=x.version,u=i.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new be(new cs(2,2),new Fe({name:"BackgroundMaterial",uniforms:xs(ui.background.uniforms),vertexShader:ui.background.vertexShader,fragmentShader:ui.background.fragmentShader,side:Mi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=fe.getTransfer(x.colorSpace)!==ye,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||f!==x.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=x,f=x.version,u=i.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function m(M,E){M.getRGB(Wl,Dh(i)),e.buffers.color.setClear(Wl.r,Wl.g,Wl.b,E,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(M,E=1){o.set(M),a=E,m(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(M){a=M,m(o,a)},render:g,addToRenderList:y,dispose:p}}function Gx(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,o=!1;function a(P,O,V,q,F){let z=!1,U=f(P,q,V,O);r!==U&&(r=U,c(r.object)),z=d(P,q,V,F),z&&g(P,q,V,F),F!==null&&t.update(F,i.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,x(P,O,V,q),F!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(F).buffer))}function l(){return i.createVertexArray()}function c(P){return i.bindVertexArray(P)}function h(P){return i.deleteVertexArray(P)}function f(P,O,V,q){let F=q.wireframe===!0,z=n[O.id];z===void 0&&(z={},n[O.id]=z);let U=P.isInstancedMesh===!0?P.id:0,Y=z[U];Y===void 0&&(Y={},z[U]=Y);let j=Y[V.id];j===void 0&&(j={},Y[V.id]=j);let ht=j[F];return ht===void 0&&(ht=u(l()),j[F]=ht),ht}function u(P){let O=[],V=[],q=[];for(let F=0;F<e;F++)O[F]=0,V[F]=0,q[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:O,enabledAttributes:V,attributeDivisors:q,object:P,attributes:{},index:null}}function d(P,O,V,q){let F=r.attributes,z=O.attributes,U=0,Y=V.getAttributes();for(let j in Y)if(Y[j].location>=0){let ct=F[j],yt=z[j];if(yt===void 0&&(j==="instanceMatrix"&&P.instanceMatrix&&(yt=P.instanceMatrix),j==="instanceColor"&&P.instanceColor&&(yt=P.instanceColor)),ct===void 0||ct.attribute!==yt||yt&&ct.data!==yt.data)return!0;U++}return r.attributesNum!==U||r.index!==q}function g(P,O,V,q){let F={},z=O.attributes,U=0,Y=V.getAttributes();for(let j in Y)if(Y[j].location>=0){let ct=z[j];ct===void 0&&(j==="instanceMatrix"&&P.instanceMatrix&&(ct=P.instanceMatrix),j==="instanceColor"&&P.instanceColor&&(ct=P.instanceColor));let yt={};yt.attribute=ct,ct&&ct.data&&(yt.data=ct.data),F[j]=yt,U++}r.attributes=F,r.attributesNum=U,r.index=q}function y(){let P=r.newAttributes;for(let O=0,V=P.length;O<V;O++)P[O]=0}function m(P){p(P,0)}function p(P,O){let V=r.newAttributes,q=r.enabledAttributes,F=r.attributeDivisors;V[P]=1,q[P]===0&&(i.enableVertexAttribArray(P),q[P]=1),F[P]!==O&&(i.vertexAttribDivisor(P,O),F[P]=O)}function M(){let P=r.newAttributes,O=r.enabledAttributes;for(let V=0,q=O.length;V<q;V++)O[V]!==P[V]&&(i.disableVertexAttribArray(V),O[V]=0)}function E(P,O,V,q,F,z,U){U===!0?i.vertexAttribIPointer(P,O,V,F,z):i.vertexAttribPointer(P,O,V,q,F,z)}function x(P,O,V,q){y();let F=q.attributes,z=V.getAttributes(),U=O.defaultAttributeValues;for(let Y in z){let j=z[Y];if(j.location>=0){let ht=F[Y];if(ht===void 0&&(Y==="instanceMatrix"&&P.instanceMatrix&&(ht=P.instanceMatrix),Y==="instanceColor"&&P.instanceColor&&(ht=P.instanceColor)),ht!==void 0){let ct=ht.normalized,yt=ht.itemSize,xt=t.get(ht);if(xt===void 0)continue;let Kt=xt.buffer,kt=xt.type,Q=xt.bytesPerElement,mt=kt===i.INT||kt===i.UNSIGNED_INT||ht.gpuType===rl;if(ht.isInterleavedBufferAttribute){let ut=ht.data,Ft=ut.stride,Mt=ht.offset;if(ut.isInstancedInterleavedBuffer){for(let St=0;St<j.locationSize;St++)p(j.location+St,ut.meshPerAttribute);P.isInstancedMesh!==!0&&q._maxInstanceCount===void 0&&(q._maxInstanceCount=ut.meshPerAttribute*ut.count)}else for(let St=0;St<j.locationSize;St++)m(j.location+St);i.bindBuffer(i.ARRAY_BUFFER,Kt);for(let St=0;St<j.locationSize;St++)E(j.location+St,yt/j.locationSize,kt,ct,Ft*Q,(Mt+yt/j.locationSize*St)*Q,mt)}else{if(ht.isInstancedBufferAttribute){for(let ut=0;ut<j.locationSize;ut++)p(j.location+ut,ht.meshPerAttribute);P.isInstancedMesh!==!0&&q._maxInstanceCount===void 0&&(q._maxInstanceCount=ht.meshPerAttribute*ht.count)}else for(let ut=0;ut<j.locationSize;ut++)m(j.location+ut);i.bindBuffer(i.ARRAY_BUFFER,Kt);for(let ut=0;ut<j.locationSize;ut++)E(j.location+ut,yt/j.locationSize,kt,ct,yt*Q,yt/j.locationSize*ut*Q,mt)}}else if(U!==void 0){let ct=U[Y];if(ct!==void 0)switch(ct.length){case 2:i.vertexAttrib2fv(j.location,ct);break;case 3:i.vertexAttrib3fv(j.location,ct);break;case 4:i.vertexAttrib4fv(j.location,ct);break;default:i.vertexAttrib1fv(j.location,ct)}}}}M()}function w(){b();for(let P in n){let O=n[P];for(let V in O){let q=O[V];for(let F in q){let z=q[F];for(let U in z)h(z[U].object),delete z[U];delete q[F]}}delete n[P]}}function S(P){if(n[P.id]===void 0)return;let O=n[P.id];for(let V in O){let q=O[V];for(let F in q){let z=q[F];for(let U in z)h(z[U].object),delete z[U];delete q[F]}}delete n[P.id]}function T(P){for(let O in n){let V=n[O];for(let q in V){let F=V[q];if(F[P.id]===void 0)continue;let z=F[P.id];for(let U in z)h(z[U].object),delete z[U];delete F[P.id]}}}function v(P){for(let O in n){let V=n[O],q=P.isInstancedMesh===!0?P.id:0,F=V[q];if(F!==void 0){for(let z in F){let U=F[z];for(let Y in U)h(U[Y].object),delete U[Y];delete F[z]}delete V[q],Object.keys(V).length===0&&delete n[O]}}}function b(){R(),o=!0,r!==s&&(r=s,c(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:b,resetDefaultState:R,dispose:w,releaseStatesOfGeometry:S,releaseStatesOfObject:v,releaseStatesOfProgram:T,initAttributes:y,enableAttribute:m,disableUnusedAttributes:M}}function Hx(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let d=0;d<h;d++)u+=c[d];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Wx(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let T=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(T){return!(T!==vn&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(T){let v=T===Xe&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(T!==Qe&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&T!==Ln&&!v)}function l(T){if(T==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(jt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let f=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&jt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let d=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),M=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),E=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),w=i.getParameter(i.MAX_SAMPLES),S=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:u,maxTextures:d,maxVertexTextures:g,maxTextureSize:y,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:M,maxVaryings:E,maxFragmentUniforms:x,maxSamples:w,samples:S}}function Xx(i){let t=this,e=null,n=0,s=!1,r=!1,o=new hn,a=new ne,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,u){let d=f.length!==0||u||n!==0||s;return s=u,n=f.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,u){e=h(f,u,0)},this.setState=function(f,u,d){let g=f.clippingPlanes,y=f.clipIntersection,m=f.clipShadows,p=i.get(f);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{let M=r?0:n,E=M*4,x=p.clippingState||null;l.value=x,x=h(g,u,E,d);for(let w=0;w!==E;++w)x[w]=e[w];p.clippingState=x,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(f,u,d,g){let y=f!==null?f.length:0,m=null;if(y!==0){if(m=l.value,g!==!0||m===null){let p=d+y*4,M=u.matrixWorldInverse;a.getNormalMatrix(M),(m===null||m.length<p)&&(m=new Float32Array(p));for(let E=0,x=d;E!==y;++E,x+=4)o.copy(f[E]).applyMatrix4(M,a),o.normal.toArray(m,x),m[x+3]=o.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=y,t.numIntersection=0,m}}var Xi=4,Vd=[.125,.215,.35,.446,.526,.582],vs=20,qx=256,Co=new In,Gd=new Bt,Gh=null,Hh=0,Wh=0,Xh=!1,Yx=new L,ur=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:o=256,position:a=Yx}=r;Gh=this._renderer.getRenderTarget(),Hh=this._renderer.getActiveCubeFace(),Wh=this._renderer.getActiveMipmapLevel(),Xh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Xd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Wd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Gh,Hh,Wh),this._renderer.xr.enabled=Xh,t.scissorTest=!1,cr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Vi||t.mapping===ms?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Gh=this._renderer.getRenderTarget(),Hh=this._renderer.getActiveCubeFace(),Wh=this._renderer.getActiveMipmapLevel(),Xh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:nn,minFilter:nn,generateMipmaps:!1,type:Xe,format:vn,colorSpace:zr,depthBuffer:!1},s=Hd(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Hd(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Zx(r)),this._blurMaterial=Kx(r,t,e),this._ggxMaterial=$x(r,t,e)}return s}_compileMaterial(t){let e=new be(new Ne,t);this._renderer.compile(e,Co)}_sceneToCubeUV(t,e,n,s,r){let l=new He(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],f=this._renderer,u=f.autoClear,d=f.toneMapping;f.getClearColor(Gd),f.toneMapping=Xn,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new be(new oi,new Xr({name:"PMREM.Background",side:rn,depthWrite:!1,depthTest:!1})));let y=this._backgroundBox,m=y.material,p=!1,M=t.background;M?M.isColor&&(m.color.copy(M),t.background=null,p=!0):(m.color.copy(Gd),p=!0);for(let E=0;E<6;E++){let x=E%3;x===0?(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[E],r.y,r.z)):x===1?(l.up.set(0,0,c[E]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[E],r.z)):(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[E]));let w=this._cubeSize;cr(s,x*w,E>2?w:0,w,w),f.setRenderTarget(s),p&&f.render(y,l),f.render(t,l)}f.toneMapping=d,f.autoClear=u,t.background=M}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===Vi||t.mapping===ms;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Xd()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Wd());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;cr(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,Co)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),f=Math.sqrt(c*c-h*h),u=0+c*1.25,d=f*u,{_lodMax:g}=this,y=this._sizeLods[n],m=3*y*(n>g-Xi?n-g+Xi:0),p=4*(this._cubeSize-y);l.envMap.value=t.texture,l.roughness.value=d,l.mipInt.value=g-e,cr(r,m,p,3*y,2*y),s.setRenderTarget(r),s.render(a,Co),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,cr(t,m,p,3*y,2*y),s.setRenderTarget(t),s.render(a,Co)}_blur(t,e,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,s,"latitudinal",r),this._halfBlur(o,t,n,n,s,"longitudinal",r)}_halfBlur(t,e,n,s,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Qt("blur direction must be either latitudinal or longitudinal!");let h=3,f=this._lodMeshes[s];f.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*d):2*Math.PI/(2*vs-1),y=r/g,m=isFinite(r)?1+Math.floor(h*y):vs;m>vs&&jt(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${vs}`);let p=[],M=0;for(let T=0;T<vs;++T){let v=T/y,b=Math.exp(-v*v/2);p.push(b),T===0?M+=b:T<m&&(M+=2*b)}for(let T=0;T<p.length;T++)p[T]=p[T]/M;u.envMap.value=t.texture,u.samples.value=m,u.weights.value=p,u.latitudinal.value=o==="latitudinal",a&&(u.poleAxis.value=a);let{_lodMax:E}=this;u.dTheta.value=g,u.mipInt.value=E-n;let x=this._sizeLods[s],w=3*x*(s>E-Xi?s-E+Xi:0),S=4*(this._cubeSize-x);cr(e,w,S,3*x,2*x),l.setRenderTarget(e),l.render(f,Co)}};function Zx(i){let t=[],e=[],n=[],s=i,r=i-Xi+1+Vd.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);t.push(a);let l=1/a;o>i-Xi?l=Vd[o-i+Xi-1]:o===0&&(l=0),e.push(l);let c=1/(a-2),h=-c,f=1+c,u=[h,h,f,h,f,f,h,h,f,f,h,f],d=6,g=6,y=3,m=2,p=1,M=new Float32Array(y*g*d),E=new Float32Array(m*g*d),x=new Float32Array(p*g*d);for(let S=0;S<d;S++){let T=S%3*2/3-1,v=S>2?0:-1,b=[T,v,0,T+2/3,v,0,T+2/3,v+1,0,T,v,0,T+2/3,v+1,0,T,v+1,0];M.set(b,y*g*S),E.set(u,m*g*S);let R=[S,S,S,S,S,S];x.set(R,p*g*S)}let w=new Ne;w.setAttribute("position",new ze(M,y)),w.setAttribute("uv",new ze(E,m)),w.setAttribute("faceIndex",new ze(x,p)),n.push(new be(w,null)),s>Xi&&s--}return{lodMeshes:n,sizeLods:t,sigmas:e}}function Hd(i,t,e){let n=new Ie(i,t,e);return n.texture.mapping=yo,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function cr(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function $x(i,t,e){return new Fe({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:qx,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Zl(),fragmentShader:`

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
		`,blending:We,depthTest:!1,depthWrite:!1})}function Kx(i,t,e){let n=new Float32Array(vs),s=new L(0,1,0);return new Fe({name:"SphericalGaussianBlur",defines:{n:vs,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Zl(),fragmentShader:`

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
		`,blending:We,depthTest:!1,depthWrite:!1})}function Wd(){return new Fe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Zl(),fragmentShader:`

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
		`,blending:We,depthTest:!1,depthWrite:!1})}function Xd(){return new Fe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Zl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:We,depthTest:!1,depthWrite:!1})}function Zl(){return`

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
	`}var ql=class extends Ie{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Yr(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new oi(5,5,5),r=new Fe({name:"CubemapFromEquirect",uniforms:xs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:rn,blending:We});r.uniforms.tEquirect.value=e;let o=new be(s,r),a=e.minFilter;return e.minFilter===Gi&&(e.minFilter=nn),new Ja(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}};function Jx(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,d=!1){return u==null?null:d?o(u):r(u)}function r(u){if(u&&u.isTexture){let d=u.mapping;if(d===nl||d===il)if(t.has(u)){let g=t.get(u).texture;return a(g,u.mapping)}else{let g=u.image;if(g&&g.height>0){let y=new ql(g.height);return y.fromEquirectangularTexture(i,u),t.set(u,y),u.addEventListener("dispose",c),a(y.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){let d=u.mapping,g=d===nl||d===il,y=d===Vi||d===ms;if(g||y){let m=e.get(u),p=m!==void 0?m.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new ur(i)),m=g?n.fromEquirectangular(u,m):n.fromCubemap(u,m),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),m.texture;if(m!==void 0)return m.texture;{let M=u.image;return g&&M&&M.height>0||y&&M&&l(M)?(n===null&&(n=new ur(i)),m=g?n.fromEquirectangular(u):n.fromCubemap(u),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),u.addEventListener("dispose",h),m.texture):null}}}return u}function a(u,d){return d===nl?u.mapping=Vi:d===il&&(u.mapping=ms),u}function l(u){let d=0,g=6;for(let y=0;y<g;y++)u[y]!==void 0&&d++;return d===g}function c(u){let d=u.target;d.removeEventListener("dispose",c);let g=t.get(d);g!==void 0&&(t.delete(d),g.dispose())}function h(u){let d=u.target;d.removeEventListener("dispose",h);let g=e.get(d);g!==void 0&&(e.delete(d),g.dispose())}function f(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:f}}function jx(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&is("WebGLRenderer: "+n+" extension not supported."),s}}}function Qx(i,t,e,n){let s={},r=new WeakMap;function o(f){let u=f.target;u.index!==null&&t.remove(u.index);for(let g in u.attributes)t.remove(u.attributes[g]);u.removeEventListener("dispose",o),delete s[u.id];let d=r.get(u);d&&(t.remove(d),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(f,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,e.memory.geometries++),u}function l(f){let u=f.attributes;for(let d in u)t.update(u[d],i.ARRAY_BUFFER)}function c(f){let u=[],d=f.index,g=f.attributes.position,y=0;if(g===void 0)return;if(d!==null){let M=d.array;y=d.version;for(let E=0,x=M.length;E<x;E+=3){let w=M[E+0],S=M[E+1],T=M[E+2];u.push(w,S,S,T,T,w)}}else{let M=g.array;y=g.version;for(let E=0,x=M.length/3-1;E<x;E+=3){let w=E+0,S=E+1,T=E+2;u.push(w,S,S,T,T,w)}}let m=new(g.count>=65535?Wr:Hr)(u,1);m.version=y;let p=r.get(f);p&&t.remove(p),r.set(f,m)}function h(f){let u=r.get(f);if(u){let d=f.index;d!==null&&u.version<d.version&&c(f)}else c(f);return r.get(f)}return{get:a,update:l,getWireframeAttribute:h}}function tv(i,t,e){let n;function s(f){n=f}let r,o;function a(f){r=f.type,o=f.bytesPerElement}function l(f,u){i.drawElements(n,u,r,f*o),e.update(u,n,1)}function c(f,u,d){d!==0&&(i.drawElementsInstanced(n,u,r,f*o,d),e.update(u,n,d))}function h(f,u,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,f,0,d);let y=0;for(let m=0;m<d;m++)y+=u[m];e.update(y,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function ev(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:Qt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function nv(i,t,e){let n=new WeakMap,s=new Ae;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==f){let b=function(){T.dispose(),n.delete(a),a.removeEventListener("dispose",b)};u!==void 0&&u.texture.dispose();let d=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,y=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],M=a.morphAttributes.color||[],E=0;d===!0&&(E=1),g===!0&&(E=2),y===!0&&(E=3);let x=a.attributes.position.count*E,w=1;x>t.maxTextureSize&&(w=Math.ceil(x/t.maxTextureSize),x=t.maxTextureSize);let S=new Float32Array(x*w*4*f),T=new Gr(S,x,w,f);T.type=Ln,T.needsUpdate=!0;let v=E*4;for(let R=0;R<f;R++){let P=m[R],O=p[R],V=M[R],q=x*w*4*R;for(let F=0;F<P.count;F++){let z=F*v;d===!0&&(s.fromBufferAttribute(P,F),S[q+z+0]=s.x,S[q+z+1]=s.y,S[q+z+2]=s.z,S[q+z+3]=0),g===!0&&(s.fromBufferAttribute(O,F),S[q+z+4]=s.x,S[q+z+5]=s.y,S[q+z+6]=s.z,S[q+z+7]=0),y===!0&&(s.fromBufferAttribute(V,F),S[q+z+8]=s.x,S[q+z+9]=s.y,S[q+z+10]=s.z,S[q+z+11]=V.itemSize===4?s.w:1)}}u={count:f,texture:T,size:new ft(x,w)},n.set(a,u),a.addEventListener("dispose",b)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let d=0;for(let y=0;y<c.length;y++)d+=c[y];let g=a.morphTargetsRelative?1:1-d;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function iv(i,t,e,n,s){let r=new WeakMap;function o(c){let h=s.render.frame,f=c.geometry,u=t.get(c,f);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let d=c.skeleton;r.get(d)!==h&&(d.update(),r.set(d,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var sv={[xo]:"LINEAR_TONE_MAPPING",[vh]:"REINHARD_TONE_MAPPING",[_h]:"CINEON_TONE_MAPPING",[ps]:"ACES_FILMIC_TONE_MAPPING",[vo]:"AGX_TONE_MAPPING",[_o]:"NEUTRAL_TONE_MAPPING",[yh]:"CUSTOM_TONE_MAPPING"};function rv(i,t,e,n,s,r){let o=new Ie(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new Wn(t,e):void 0}),a=new Ie(t,e,{type:Xe,depthBuffer:!1,stencilBuffer:!1}),l=new Ne;l.setAttribute("position",new pe([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new pe([0,2,0,0,2,0],2));let c=new nr({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),h=new be(l,c),f=new In(-1,1,1,-1,0,1),u=null,d=null,g=!1,y,m=null,p=[],M=!1;this.setSize=function(E,x){o.setSize(E,x),a.setSize(E,x);for(let w=0;w<p.length;w++){let S=p[w];S.setSize&&S.setSize(E,x)}},this.setEffects=function(E){p=E,M=p.length>0&&p[0].isRenderPass===!0;let x=o.width,w=o.height;for(let S=0;S<p.length;S++){let T=p[S];T.setSize&&T.setSize(x,w)}},this.begin=function(E,x){if(g||E.toneMapping===Xn&&p.length===0)return!1;if(m=x,x!==null){let w=x.width,S=x.height;(o.width!==w||o.height!==S)&&this.setSize(w,S)}return M===!1&&E.setRenderTarget(o),y=E.toneMapping,E.toneMapping=Xn,!0},this.hasRenderPass=function(){return M},this.end=function(E,x){E.toneMapping=y,g=!0;let w=o,S=a;for(let T=0;T<p.length;T++){let v=p[T];if(v.enabled!==!1&&(v.render(E,S,w,x),v.needsSwap!==!1)){let b=w;w=S,S=b}}if(u!==E.outputColorSpace||d!==E.toneMapping){u=E.outputColorSpace,d=E.toneMapping,c.defines={},fe.getTransfer(u)===ye&&(c.defines.SRGB_TRANSFER="");let T=sv[d];T&&(c.defines[T]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=w.texture,E.setRenderTarget(m),E.render(h,f),m=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),a.dispose(),l.dispose(),c.dispose()}}var df=new Je,Zh=new Wn(1,1),ff=new Gr,pf=new Pa,mf=new Yr,qd=[],Yd=[],Zd=new Float32Array(16),$d=new Float32Array(9),Kd=new Float32Array(4);function dr(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=qd[s];if(r===void 0&&(r=new Float32Array(s),qd[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function qe(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ye(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function $l(i,t){let e=Yd[t];e===void 0&&(e=new Int32Array(t),Yd[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function ov(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function av(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(qe(e,t))return;i.uniform2fv(this.addr,t),Ye(e,t)}}function lv(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(qe(e,t))return;i.uniform3fv(this.addr,t),Ye(e,t)}}function cv(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(qe(e,t))return;i.uniform4fv(this.addr,t),Ye(e,t)}}function hv(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(qe(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ye(e,t)}else{if(qe(e,n))return;Kd.set(n),i.uniformMatrix2fv(this.addr,!1,Kd),Ye(e,n)}}function uv(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(qe(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ye(e,t)}else{if(qe(e,n))return;$d.set(n),i.uniformMatrix3fv(this.addr,!1,$d),Ye(e,n)}}function dv(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(qe(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ye(e,t)}else{if(qe(e,n))return;Zd.set(n),i.uniformMatrix4fv(this.addr,!1,Zd),Ye(e,n)}}function fv(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function pv(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(qe(e,t))return;i.uniform2iv(this.addr,t),Ye(e,t)}}function mv(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(qe(e,t))return;i.uniform3iv(this.addr,t),Ye(e,t)}}function gv(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(qe(e,t))return;i.uniform4iv(this.addr,t),Ye(e,t)}}function xv(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function vv(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(qe(e,t))return;i.uniform2uiv(this.addr,t),Ye(e,t)}}function _v(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(qe(e,t))return;i.uniform3uiv(this.addr,t),Ye(e,t)}}function yv(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(qe(e,t))return;i.uniform4uiv(this.addr,t),Ye(e,t)}}function bv(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Zh.compareFunction=e.isReversedDepthBuffer()?Hl:Gl,r=Zh):r=df,e.setTexture2D(t||r,s)}function Mv(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||pf,s)}function Sv(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||mf,s)}function wv(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||ff,s)}function Tv(i){switch(i){case 5126:return ov;case 35664:return av;case 35665:return lv;case 35666:return cv;case 35674:return hv;case 35675:return uv;case 35676:return dv;case 5124:case 35670:return fv;case 35667:case 35671:return pv;case 35668:case 35672:return mv;case 35669:case 35673:return gv;case 5125:return xv;case 36294:return vv;case 36295:return _v;case 36296:return yv;case 35678:case 36198:case 36298:case 36306:case 35682:return bv;case 35679:case 36299:case 36307:return Mv;case 35680:case 36300:case 36308:case 36293:return Sv;case 36289:case 36303:case 36311:case 36292:return wv}}function Ev(i,t){i.uniform1fv(this.addr,t)}function Av(i,t){let e=dr(t,this.size,2);i.uniform2fv(this.addr,e)}function Cv(i,t){let e=dr(t,this.size,3);i.uniform3fv(this.addr,e)}function Rv(i,t){let e=dr(t,this.size,4);i.uniform4fv(this.addr,e)}function Pv(i,t){let e=dr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function Iv(i,t){let e=dr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function Lv(i,t){let e=dr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function Dv(i,t){i.uniform1iv(this.addr,t)}function Nv(i,t){i.uniform2iv(this.addr,t)}function Uv(i,t){i.uniform3iv(this.addr,t)}function Fv(i,t){i.uniform4iv(this.addr,t)}function Ov(i,t){i.uniform1uiv(this.addr,t)}function Bv(i,t){i.uniform2uiv(this.addr,t)}function kv(i,t){i.uniform3uiv(this.addr,t)}function zv(i,t){i.uniform4uiv(this.addr,t)}function Vv(i,t,e){let n=this.cache,s=t.length,r=$l(e,s);qe(n,r)||(i.uniform1iv(this.addr,r),Ye(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Zh:o=df;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function Gv(i,t,e){let n=this.cache,s=t.length,r=$l(e,s);qe(n,r)||(i.uniform1iv(this.addr,r),Ye(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||pf,r[o])}function Hv(i,t,e){let n=this.cache,s=t.length,r=$l(e,s);qe(n,r)||(i.uniform1iv(this.addr,r),Ye(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||mf,r[o])}function Wv(i,t,e){let n=this.cache,s=t.length,r=$l(e,s);qe(n,r)||(i.uniform1iv(this.addr,r),Ye(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||ff,r[o])}function Xv(i){switch(i){case 5126:return Ev;case 35664:return Av;case 35665:return Cv;case 35666:return Rv;case 35674:return Pv;case 35675:return Iv;case 35676:return Lv;case 5124:case 35670:return Dv;case 35667:case 35671:return Nv;case 35668:case 35672:return Uv;case 35669:case 35673:return Fv;case 5125:return Ov;case 36294:return Bv;case 36295:return kv;case 36296:return zv;case 35678:case 36198:case 36298:case 36306:case 35682:return Vv;case 35679:case 36299:case 36307:return Gv;case 35680:case 36300:case 36308:case 36293:return Hv;case 36289:case 36303:case 36311:case 36292:return Wv}}var $h=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Tv(e.type)}},Kh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Xv(e.type)}},Jh=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],n)}}},qh=/(\w+)(\])?(\[|\.)?/g;function Jd(i,t){i.seq.push(t),i.map[t.id]=t}function qv(i,t,e){let n=i.name,s=n.length;for(qh.lastIndex=0;;){let r=qh.exec(n),o=qh.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Jd(e,c===void 0?new $h(a,i,t):new Kh(a,i,t));break}else{let f=e.map[a];f===void 0&&(f=new Jh(a),Jd(e,f)),e=f}}}var hr=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);qv(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&n.push(o)}return n}};function jd(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var Yv=37297,Zv=0;function $v(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}var Qd=new ne;function Kv(i){fe._getMatrix(Qd,fe.workingColorSpace,i);let t=`mat3( ${Qd.elements.map(e=>e.toFixed(4))} )`;switch(fe.getTransfer(i)){case Vr:return[t,"LinearTransferOETF"];case ye:return[t,"sRGBTransferOETF"];default:return jt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function tf(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+$v(i.getShaderSource(t),a)}else return r}function Jv(i,t){let e=Kv(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var jv={[xo]:"Linear",[vh]:"Reinhard",[_h]:"Cineon",[ps]:"ACESFilmic",[vo]:"AgX",[_o]:"Neutral",[yh]:"Custom"};function Qv(i,t){let e=jv[t];return e===void 0?(jt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var Xl=new L;function t_(){fe.getLuminanceCoefficients(Xl);let i=Xl.x.toFixed(4),t=Xl.y.toFixed(4),e=Xl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function e_(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Po).join(`
`)}function n_(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function i_(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function Po(i){return i!==""}function ef(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function nf(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var s_=/^[ \t]*#include +<([\w\d./]+)>/gm;function jh(i){return i.replace(s_,o_)}var r_=new Map;function o_(i,t){let e=he[t];if(e===void 0){let n=r_.get(t);if(n!==void 0)e=he[n],jt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return jh(e)}var a_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function sf(i){return i.replace(a_,l_)}function l_(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function rf(i){let t=`precision ${i.precision} float;
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
#define LOW_PRECISION`),t}var c_={[ds]:"SHADOWMAP_TYPE_PCF",[or]:"SHADOWMAP_TYPE_VSM"};function h_(i){return c_[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var u_={[Vi]:"ENVMAP_TYPE_CUBE",[ms]:"ENVMAP_TYPE_CUBE",[yo]:"ENVMAP_TYPE_CUBE_UV"};function d_(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":u_[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var f_={[ms]:"ENVMAP_MODE_REFRACTION"};function p_(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":f_[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var m_={[el]:"ENVMAP_BLENDING_MULTIPLY",[yd]:"ENVMAP_BLENDING_MIX",[bd]:"ENVMAP_BLENDING_ADD"};function g_(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":m_[i.combine]||"ENVMAP_BLENDING_NONE"}function x_(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function v_(i,t,e,n){let s=i.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=h_(e),c=d_(e),h=p_(e),f=g_(e),u=x_(e),d=e_(e),g=n_(r),y=s.createProgram(),m,p,M=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Po).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Po).join(`
`),p.length>0&&(p+=`
`)):(m=[rf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Po).join(`
`),p=[rf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+f:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Xn?"#define TONE_MAPPING":"",e.toneMapping!==Xn?he.tonemapping_pars_fragment:"",e.toneMapping!==Xn?Qv("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",he.colorspace_pars_fragment,Jv("linearToOutputTexel",e.outputColorSpace),t_(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Po).join(`
`)),o=jh(o),o=ef(o,e),o=nf(o,e),a=jh(a),a=ef(a,e),a=nf(a,e),o=sf(o),a=sf(a),e.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===Ch?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Ch?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let E=M+m+o,x=M+p+a,w=jd(s,s.VERTEX_SHADER,E),S=jd(s,s.FRAGMENT_SHADER,x);s.attachShader(y,w),s.attachShader(y,S),e.index0AttributeName!==void 0?s.bindAttribLocation(y,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function T(P){if(i.debug.checkShaderErrors){let O=s.getProgramInfoLog(y)||"",V=s.getShaderInfoLog(w)||"",q=s.getShaderInfoLog(S)||"",F=O.trim(),z=V.trim(),U=q.trim(),Y=!0,j=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(Y=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,y,w,S);else{let ht=tf(s,w,"vertex"),ct=tf(s,S,"fragment");Qt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+F+`
`+ht+`
`+ct)}else F!==""?jt("WebGLProgram: Program Info Log:",F):(z===""||U==="")&&(j=!1);j&&(P.diagnostics={runnable:Y,programLog:F,vertexShader:{log:z,prefix:m},fragmentShader:{log:U,prefix:p}})}s.deleteShader(w),s.deleteShader(S),v=new hr(s,y),b=i_(s,y)}let v;this.getUniforms=function(){return v===void 0&&T(this),v};let b;this.getAttributes=function(){return b===void 0&&T(this),b};let R=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(y,Yv)),R},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Zv++,this.cacheKey=t,this.usedTimes=1,this.program=y,this.vertexShader=w,this.fragmentShader=S,this}var __=0,Qh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new tu(t),e.set(t,n)),n}},tu=class{constructor(t){this.id=__++,this.code=t,this.usedTimes=0}};function y_(i){return i===Wi||i===Eo||i===Ao}function b_(i,t,e,n,s,r){let o=new Ks,a=new Qh,l=new Set,c=[],h=new Map,f=n.logarithmicDepthBuffer,u=n.precision,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(v){return l.add(v),v===0?"uv":`uv${v}`}function y(v,b,R,P,O,V){let q=P.fog,F=O.geometry,z=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?P.environment:null,U=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,Y=t.get(v.envMap||z,U),j=Y&&Y.mapping===yo?Y.image.height:null,ht=d[v.type];v.precision!==null&&(u=n.getMaxPrecision(v.precision),u!==v.precision&&jt("WebGLProgram.getParameters:",v.precision,"not supported, using",u,"instead."));let ct=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,yt=ct!==void 0?ct.length:0,xt=0;F.morphAttributes.position!==void 0&&(xt=1),F.morphAttributes.normal!==void 0&&(xt=2),F.morphAttributes.color!==void 0&&(xt=3);let Kt,kt,Q,mt;if(ht){let Gt=ui[ht];Kt=Gt.vertexShader,kt=Gt.fragmentShader}else{Kt=v.vertexShader,kt=v.fragmentShader;let Gt=a.getVertexShaderStage(v),ve=a.getFragmentShaderStage(v);a.update(v,Gt,ve),Q=Gt.id,mt=ve.id}let ut=i.getRenderTarget(),Ft=i.state.buffers.depth.getReversed(),Mt=O.isInstancedMesh===!0,St=O.isBatchedMesh===!0,te=!!v.map,Vt=!!v.matcap,rt=!!Y,N=!!v.aoMap,G=!!v.lightMap,at=!!v.bumpMap&&v.wireframe===!1,Z=!!v.normalMap,Lt=!!v.displacementMap,X=!!v.emissiveMap,Et=!!v.metalnessMap,pt=!!v.roughnessMap,B=v.anisotropy>0,oe=v.clearcoat>0,It=v.dispersion>0,A=v.iridescence>0,_=v.sheen>0,H=v.transmission>0,$=B&&!!v.anisotropyMap,nt=oe&&!!v.clearcoatMap,gt=oe&&!!v.clearcoatNormalMap,bt=oe&&!!v.clearcoatRoughnessMap,tt=A&&!!v.iridescenceMap,lt=A&&!!v.iridescenceThicknessMap,st=_&&!!v.sheenColorMap,Xt=_&&!!v.sheenRoughnessMap,Tt=!!v.specularMap,wt=!!v.specularColorMap,Wt=!!v.specularIntensityMap,Zt=H&&!!v.transmissionMap,Jt=H&&!!v.thicknessMap,k=!!v.gradientMap,Ct=!!v.alphaMap,it=v.alphaTest>0,Pt=!!v.alphaHash,Dt=!!v.extensions,dt=Xn;v.toneMapped&&(ut===null||ut.isXRRenderTarget===!0)&&(dt=i.toneMapping);let vt={shaderID:ht,shaderType:v.type,shaderName:v.name,vertexShader:Kt,fragmentShader:kt,defines:v.defines,customVertexShaderID:Q,customFragmentShaderID:mt,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:u,batching:St,batchingColor:St&&O._colorsTexture!==null,instancing:Mt,instancingColor:Mt&&O.instanceColor!==null,instancingMorph:Mt&&O.morphTexture!==null,outputColorSpace:ut===null?i.outputColorSpace:ut.isXRRenderTarget===!0?ut.texture.colorSpace:fe.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:te,matcap:Vt,envMap:rt,envMapMode:rt&&Y.mapping,envMapCubeUVHeight:j,aoMap:N,lightMap:G,bumpMap:at,normalMap:Z,displacementMap:Lt,emissiveMap:X,normalMapObjectSpace:Z&&v.normalMapType===wd,normalMapTangentSpace:Z&&v.normalMapType===lr,packedNormalMap:Z&&v.normalMapType===lr&&y_(v.normalMap.format),metalnessMap:Et,roughnessMap:pt,anisotropy:B,anisotropyMap:$,clearcoat:oe,clearcoatMap:nt,clearcoatNormalMap:gt,clearcoatRoughnessMap:bt,dispersion:It,iridescence:A,iridescenceMap:tt,iridescenceThicknessMap:lt,sheen:_,sheenColorMap:st,sheenRoughnessMap:Xt,specularMap:Tt,specularColorMap:wt,specularIntensityMap:Wt,transmission:H,transmissionMap:Zt,thicknessMap:Jt,gradientMap:k,opaque:v.transparent===!1&&v.blending===ss&&v.alphaToCoverage===!1,alphaMap:Ct,alphaTest:it,alphaHash:Pt,combine:v.combine,mapUv:te&&g(v.map.channel),aoMapUv:N&&g(v.aoMap.channel),lightMapUv:G&&g(v.lightMap.channel),bumpMapUv:at&&g(v.bumpMap.channel),normalMapUv:Z&&g(v.normalMap.channel),displacementMapUv:Lt&&g(v.displacementMap.channel),emissiveMapUv:X&&g(v.emissiveMap.channel),metalnessMapUv:Et&&g(v.metalnessMap.channel),roughnessMapUv:pt&&g(v.roughnessMap.channel),anisotropyMapUv:$&&g(v.anisotropyMap.channel),clearcoatMapUv:nt&&g(v.clearcoatMap.channel),clearcoatNormalMapUv:gt&&g(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:bt&&g(v.clearcoatRoughnessMap.channel),iridescenceMapUv:tt&&g(v.iridescenceMap.channel),iridescenceThicknessMapUv:lt&&g(v.iridescenceThicknessMap.channel),sheenColorMapUv:st&&g(v.sheenColorMap.channel),sheenRoughnessMapUv:Xt&&g(v.sheenRoughnessMap.channel),specularMapUv:Tt&&g(v.specularMap.channel),specularColorMapUv:wt&&g(v.specularColorMap.channel),specularIntensityMapUv:Wt&&g(v.specularIntensityMap.channel),transmissionMapUv:Zt&&g(v.transmissionMap.channel),thicknessMapUv:Jt&&g(v.thicknessMap.channel),alphaMapUv:Ct&&g(v.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(Z||B),vertexNormals:!!F.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:O.isPoints===!0&&!!F.attributes.uv&&(te||Ct),fog:!!q,useFog:v.fog===!0,fogExp2:!!q&&q.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||F.attributes.normal===void 0&&Z===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:Ft,skinning:O.isSkinnedMesh===!0,hasPositionAttribute:F.attributes.position!==void 0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:yt,morphTextureStride:xt,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numLightProbeGrids:V.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:dt,decodeVideoTexture:te&&v.map.isVideoTexture===!0&&fe.getTransfer(v.map.colorSpace)===ye,decodeVideoTextureEmissive:X&&v.emissiveMap.isVideoTexture===!0&&fe.getTransfer(v.emissiveMap.colorSpace)===ye,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===ai,flipSided:v.side===rn,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:Dt&&v.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Dt&&v.extensions.multiDraw===!0||St)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return vt.vertexUv1s=l.has(1),vt.vertexUv2s=l.has(2),vt.vertexUv3s=l.has(3),l.clear(),vt}function m(v){let b=[];if(v.shaderID?b.push(v.shaderID):(b.push(v.customVertexShaderID),b.push(v.customFragmentShaderID)),v.defines!==void 0)for(let R in v.defines)b.push(R),b.push(v.defines[R]);return v.isRawShaderMaterial===!1&&(p(b,v),M(b,v),b.push(i.outputColorSpace)),b.push(v.customProgramCacheKey),b.join()}function p(v,b){v.push(b.precision),v.push(b.outputColorSpace),v.push(b.envMapMode),v.push(b.envMapCubeUVHeight),v.push(b.mapUv),v.push(b.alphaMapUv),v.push(b.lightMapUv),v.push(b.aoMapUv),v.push(b.bumpMapUv),v.push(b.normalMapUv),v.push(b.displacementMapUv),v.push(b.emissiveMapUv),v.push(b.metalnessMapUv),v.push(b.roughnessMapUv),v.push(b.anisotropyMapUv),v.push(b.clearcoatMapUv),v.push(b.clearcoatNormalMapUv),v.push(b.clearcoatRoughnessMapUv),v.push(b.iridescenceMapUv),v.push(b.iridescenceThicknessMapUv),v.push(b.sheenColorMapUv),v.push(b.sheenRoughnessMapUv),v.push(b.specularMapUv),v.push(b.specularColorMapUv),v.push(b.specularIntensityMapUv),v.push(b.transmissionMapUv),v.push(b.thicknessMapUv),v.push(b.combine),v.push(b.fogExp2),v.push(b.sizeAttenuation),v.push(b.morphTargetsCount),v.push(b.morphAttributeCount),v.push(b.numDirLights),v.push(b.numPointLights),v.push(b.numSpotLights),v.push(b.numSpotLightMaps),v.push(b.numHemiLights),v.push(b.numRectAreaLights),v.push(b.numDirLightShadows),v.push(b.numPointLightShadows),v.push(b.numSpotLightShadows),v.push(b.numSpotLightShadowsWithMaps),v.push(b.numLightProbes),v.push(b.shadowMapType),v.push(b.toneMapping),v.push(b.numClippingPlanes),v.push(b.numClipIntersection),v.push(b.depthPacking)}function M(v,b){o.disableAll(),b.instancing&&o.enable(0),b.instancingColor&&o.enable(1),b.instancingMorph&&o.enable(2),b.matcap&&o.enable(3),b.envMap&&o.enable(4),b.normalMapObjectSpace&&o.enable(5),b.normalMapTangentSpace&&o.enable(6),b.clearcoat&&o.enable(7),b.iridescence&&o.enable(8),b.alphaTest&&o.enable(9),b.vertexColors&&o.enable(10),b.vertexAlphas&&o.enable(11),b.vertexUv1s&&o.enable(12),b.vertexUv2s&&o.enable(13),b.vertexUv3s&&o.enable(14),b.vertexTangents&&o.enable(15),b.anisotropy&&o.enable(16),b.alphaHash&&o.enable(17),b.batching&&o.enable(18),b.dispersion&&o.enable(19),b.batchingColor&&o.enable(20),b.gradientMap&&o.enable(21),b.packedNormalMap&&o.enable(22),b.vertexNormals&&o.enable(23),v.push(o.mask),o.disableAll(),b.fog&&o.enable(0),b.useFog&&o.enable(1),b.flatShading&&o.enable(2),b.logarithmicDepthBuffer&&o.enable(3),b.reversedDepthBuffer&&o.enable(4),b.skinning&&o.enable(5),b.morphTargets&&o.enable(6),b.morphNormals&&o.enable(7),b.morphColors&&o.enable(8),b.premultipliedAlpha&&o.enable(9),b.shadowMapEnabled&&o.enable(10),b.doubleSided&&o.enable(11),b.flipSided&&o.enable(12),b.useDepthPacking&&o.enable(13),b.dithering&&o.enable(14),b.transmission&&o.enable(15),b.sheen&&o.enable(16),b.opaque&&o.enable(17),b.pointsUvs&&o.enable(18),b.decodeVideoTexture&&o.enable(19),b.decodeVideoTextureEmissive&&o.enable(20),b.alphaToCoverage&&o.enable(21),b.numLightProbeGrids>0&&o.enable(22),b.hasPositionAttribute&&o.enable(23),v.push(o.mask)}function E(v){let b=d[v.type],R;if(b){let P=ui[b];R=ci.clone(P.uniforms)}else R=v.uniforms;return R}function x(v,b){let R=h.get(b);return R!==void 0?++R.usedTimes:(R=new v_(i,b,v,s),c.push(R),h.set(b,R)),R}function w(v){if(--v.usedTimes===0){let b=c.indexOf(v);c[b]=c[c.length-1],c.pop(),h.delete(v.cacheKey),v.destroy()}}function S(v){a.remove(v)}function T(){a.dispose()}return{getParameters:y,getProgramCacheKey:m,getUniforms:E,acquireProgram:x,releaseProgram:w,releaseShaderCache:S,programs:c,dispose:T}}function M_(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function S_(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function of(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function af(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(u){let d=0;return u.isInstancedMesh&&(d+=2),u.isSkinnedMesh&&(d+=1),d}function a(u,d,g,y,m,p){let M=i[t];return M===void 0?(M={id:u.id,object:u,geometry:d,material:g,materialVariant:o(u),groupOrder:y,renderOrder:u.renderOrder,z:m,group:p},i[t]=M):(M.id=u.id,M.object=u,M.geometry=d,M.material=g,M.materialVariant=o(u),M.groupOrder=y,M.renderOrder=u.renderOrder,M.z=m,M.group=p),t++,M}function l(u,d,g,y,m,p){let M=a(u,d,g,y,m,p);g.transmission>0?n.push(M):g.transparent===!0?s.push(M):e.push(M)}function c(u,d,g,y,m,p){let M=a(u,d,g,y,m,p);g.transmission>0?n.unshift(M):g.transparent===!0?s.unshift(M):e.unshift(M)}function h(u,d,g){e.length>1&&e.sort(u||S_),n.length>1&&n.sort(d||of),s.length>1&&s.sort(d||of),g&&(e.reverse(),n.reverse(),s.reverse())}function f(){for(let u=t,d=i.length;u<d;u++){let g=i[u];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:f,sort:h}}function w_(){let i=new WeakMap;function t(n,s){let r=i.get(n),o;return r===void 0?(o=new af,i.set(n,[o])):s>=r.length?(o=new af,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function T_(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new L,color:new Bt};break;case"SpotLight":e={position:new L,direction:new L,color:new Bt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new L,color:new Bt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new L,skyColor:new Bt,groundColor:new Bt};break;case"RectAreaLight":e={color:new Bt,position:new L,halfWidth:new L,halfHeight:new L};break}return i[t.id]=e,e}}}function E_(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var A_=0;function C_(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function R_(i){let t=new T_,e=E_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new L);let s=new L,r=new se,o=new se;function a(c){let h=0,f=0,u=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let d=0,g=0,y=0,m=0,p=0,M=0,E=0,x=0,w=0,S=0,T=0;c.sort(C_);for(let b=0,R=c.length;b<R;b++){let P=c[b],O=P.color,V=P.intensity,q=P.distance,F=null;if(P.shadow&&P.shadow.map&&(P.shadow.map.texture.format===Wi?F=P.shadow.map.texture:F=P.shadow.map.depthTexture||P.shadow.map.texture),P.isAmbientLight)h+=O.r*V,f+=O.g*V,u+=O.b*V;else if(P.isLightProbe){for(let z=0;z<9;z++)n.probe[z].addScaledVector(P.sh.coefficients[z],V);T++}else if(P.isDirectionalLight){let z=t.get(P);if(z.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let U=P.shadow,Y=e.get(P);Y.shadowIntensity=U.intensity,Y.shadowBias=U.bias,Y.shadowNormalBias=U.normalBias,Y.shadowRadius=U.radius,Y.shadowMapSize=U.mapSize,n.directionalShadow[d]=Y,n.directionalShadowMap[d]=F,n.directionalShadowMatrix[d]=P.shadow.matrix,M++}n.directional[d]=z,d++}else if(P.isSpotLight){let z=t.get(P);z.position.setFromMatrixPosition(P.matrixWorld),z.color.copy(O).multiplyScalar(V),z.distance=q,z.coneCos=Math.cos(P.angle),z.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),z.decay=P.decay,n.spot[y]=z;let U=P.shadow;if(P.map&&(n.spotLightMap[w]=P.map,w++,U.updateMatrices(P),P.castShadow&&S++),n.spotLightMatrix[y]=U.matrix,P.castShadow){let Y=e.get(P);Y.shadowIntensity=U.intensity,Y.shadowBias=U.bias,Y.shadowNormalBias=U.normalBias,Y.shadowRadius=U.radius,Y.shadowMapSize=U.mapSize,n.spotShadow[y]=Y,n.spotShadowMap[y]=F,x++}y++}else if(P.isRectAreaLight){let z=t.get(P);z.color.copy(O).multiplyScalar(V),z.halfWidth.set(P.width*.5,0,0),z.halfHeight.set(0,P.height*.5,0),n.rectArea[m]=z,m++}else if(P.isPointLight){let z=t.get(P);if(z.color.copy(P.color).multiplyScalar(P.intensity),z.distance=P.distance,z.decay=P.decay,P.castShadow){let U=P.shadow,Y=e.get(P);Y.shadowIntensity=U.intensity,Y.shadowBias=U.bias,Y.shadowNormalBias=U.normalBias,Y.shadowRadius=U.radius,Y.shadowMapSize=U.mapSize,Y.shadowCameraNear=U.camera.near,Y.shadowCameraFar=U.camera.far,n.pointShadow[g]=Y,n.pointShadowMap[g]=F,n.pointShadowMatrix[g]=P.shadow.matrix,E++}n.point[g]=z,g++}else if(P.isHemisphereLight){let z=t.get(P);z.skyColor.copy(P.color).multiplyScalar(V),z.groundColor.copy(P.groundColor).multiplyScalar(V),n.hemi[p]=z,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ut.LTC_FLOAT_1,n.rectAreaLTC2=Ut.LTC_FLOAT_2):(n.rectAreaLTC1=Ut.LTC_HALF_1,n.rectAreaLTC2=Ut.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=f,n.ambient[2]=u;let v=n.hash;(v.directionalLength!==d||v.pointLength!==g||v.spotLength!==y||v.rectAreaLength!==m||v.hemiLength!==p||v.numDirectionalShadows!==M||v.numPointShadows!==E||v.numSpotShadows!==x||v.numSpotMaps!==w||v.numLightProbes!==T)&&(n.directional.length=d,n.spot.length=y,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.pointShadow.length=E,n.pointShadowMap.length=E,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=M,n.pointShadowMatrix.length=E,n.spotLightMatrix.length=x+w-S,n.spotLightMap.length=w,n.numSpotLightShadowsWithMaps=S,n.numLightProbes=T,v.directionalLength=d,v.pointLength=g,v.spotLength=y,v.rectAreaLength=m,v.hemiLength=p,v.numDirectionalShadows=M,v.numPointShadows=E,v.numSpotShadows=x,v.numSpotMaps=w,v.numLightProbes=T,n.version=A_++)}function l(c,h){let f=0,u=0,d=0,g=0,y=0,m=h.matrixWorldInverse;for(let p=0,M=c.length;p<M;p++){let E=c[p];if(E.isDirectionalLight){let x=n.directional[f];x.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),f++}else if(E.isSpotLight){let x=n.spot[d];x.position.setFromMatrixPosition(E.matrixWorld),x.position.applyMatrix4(m),x.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),d++}else if(E.isRectAreaLight){let x=n.rectArea[g];x.position.setFromMatrixPosition(E.matrixWorld),x.position.applyMatrix4(m),o.identity(),r.copy(E.matrixWorld),r.premultiply(m),o.extractRotation(r),x.halfWidth.set(E.width*.5,0,0),x.halfHeight.set(0,E.height*.5,0),x.halfWidth.applyMatrix4(o),x.halfHeight.applyMatrix4(o),g++}else if(E.isPointLight){let x=n.point[u];x.position.setFromMatrixPosition(E.matrixWorld),x.position.applyMatrix4(m),u++}else if(E.isHemisphereLight){let x=n.hemi[y];x.direction.setFromMatrixPosition(E.matrixWorld),x.direction.transformDirection(m),y++}}}return{setup:a,setupView:l,state:n}}function lf(i){let t=new R_(i),e=[],n=[],s=[];function r(u){f.camera=u,e.length=0,n.length=0,s.length=0}function o(u){e.push(u)}function a(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let f={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:f,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function P_(i){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new lf(i),t.set(s,[a])):r>=o.length?(a=new lf(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}var I_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,L_=`uniform sampler2D shadow_pass;
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
}`,D_=[new L(1,0,0),new L(-1,0,0),new L(0,1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1)],N_=[new L(0,-1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1),new L(0,-1,0),new L(0,-1,0)],cf=new se,Ro=new L,Yh=new L;function U_(i,t,e){let n=new Qs,s=new ft,r=new ft,o=new Ae,a=new ka,l=new za,c={},h=e.maxTextureSize,f={[Mi]:rn,[rn]:Mi,[ai]:ai},u=new Fe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ft},radius:{value:4}},vertexShader:I_,fragmentShader:L_}),d=u.clone();d.defines.HORIZONTAL_PASS=1;let g=new Ne;g.setAttribute("position",new ze(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new be(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ds;let p=this.type;this.render=function(S,T,v){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||S.length===0)return;this.type===rd&&(jt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=ds);let b=i.getRenderTarget(),R=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),O=i.state;O.setBlending(We),O.buffers.depth.getReversed()===!0?O.buffers.color.setClear(0,0,0,0):O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);let V=p!==this.type;V&&T.traverse(function(q){q.material&&(Array.isArray(q.material)?q.material.forEach(F=>F.needsUpdate=!0):q.material.needsUpdate=!0)});for(let q=0,F=S.length;q<F;q++){let z=S[q],U=z.shadow;if(U===void 0){jt("WebGLShadowMap:",z,"has no shadow.");continue}if(U.autoUpdate===!1&&U.needsUpdate===!1)continue;s.copy(U.mapSize);let Y=U.getFrameExtents();s.multiply(Y),r.copy(U.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/Y.x),s.x=r.x*Y.x,U.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/Y.y),s.y=r.y*Y.y,U.mapSize.y=r.y));let j=i.state.buffers.depth.getReversed();if(U.camera._reversedDepth=j,U.map===null||V===!0){if(U.map!==null&&(U.map.depthTexture!==null&&(U.map.depthTexture.dispose(),U.map.depthTexture=null),U.map.dispose()),this.type===or){if(z.isPointLight){jt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}U.map=new Ie(s.x,s.y,{format:Wi,type:Xe,minFilter:nn,magFilter:nn,generateMipmaps:!1}),U.map.texture.name=z.name+".shadowMap",U.map.depthTexture=new Wn(s.x,s.y,Ln),U.map.depthTexture.name=z.name+".shadowMapDepth",U.map.depthTexture.format=si,U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=Ue,U.map.depthTexture.magFilter=Ue}else z.isPointLight?(U.map=new ql(s.x),U.map.depthTexture=new Ia(s.x,qn)):(U.map=new Ie(s.x,s.y),U.map.depthTexture=new Wn(s.x,s.y,qn)),U.map.depthTexture.name=z.name+".shadowMap",U.map.depthTexture.format=si,this.type===ds?(U.map.depthTexture.compareFunction=j?Hl:Gl,U.map.depthTexture.minFilter=nn,U.map.depthTexture.magFilter=nn):(U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=Ue,U.map.depthTexture.magFilter=Ue);U.camera.updateProjectionMatrix()}let ht=U.map.isWebGLCubeRenderTarget?6:1;for(let ct=0;ct<ht;ct++){if(U.map.isWebGLCubeRenderTarget)i.setRenderTarget(U.map,ct),i.clear();else{ct===0&&(i.setRenderTarget(U.map),i.clear());let yt=U.getViewport(ct);o.set(r.x*yt.x,r.y*yt.y,r.x*yt.z,r.y*yt.w),O.viewport(o)}if(z.isPointLight){let yt=U.camera,xt=U.matrix,Kt=z.distance||yt.far;Kt!==yt.far&&(yt.far=Kt,yt.updateProjectionMatrix()),Ro.setFromMatrixPosition(z.matrixWorld),yt.position.copy(Ro),Yh.copy(yt.position),Yh.add(D_[ct]),yt.up.copy(N_[ct]),yt.lookAt(Yh),yt.updateMatrixWorld(),xt.makeTranslation(-Ro.x,-Ro.y,-Ro.z),cf.multiplyMatrices(yt.projectionMatrix,yt.matrixWorldInverse),U._frustum.setFromProjectionMatrix(cf,yt.coordinateSystem,yt.reversedDepth)}else U.updateMatrices(z);n=U.getFrustum(),x(T,v,U.camera,z,this.type)}U.isPointLightShadow!==!0&&this.type===or&&M(U,v),U.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(b,R,P)};function M(S,T){let v=t.update(y);u.defines.VSM_SAMPLES!==S.blurSamples&&(u.defines.VSM_SAMPLES=S.blurSamples,d.defines.VSM_SAMPLES=S.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new Ie(s.x,s.y,{format:Wi,type:Xe})),u.uniforms.shadow_pass.value=S.map.depthTexture,u.uniforms.resolution.value=S.mapSize,u.uniforms.radius.value=S.radius,i.setRenderTarget(S.mapPass),i.clear(),i.renderBufferDirect(T,null,v,u,y,null),d.uniforms.shadow_pass.value=S.mapPass.texture,d.uniforms.resolution.value=S.mapSize,d.uniforms.radius.value=S.radius,i.setRenderTarget(S.map),i.clear(),i.renderBufferDirect(T,null,v,d,y,null)}function E(S,T,v,b){let R=null,P=v.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(P!==void 0)R=P;else if(R=v.isPointLight===!0?l:a,i.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0||T.alphaToCoverage===!0){let O=R.uuid,V=T.uuid,q=c[O];q===void 0&&(q={},c[O]=q);let F=q[V];F===void 0&&(F=R.clone(),q[V]=F,T.addEventListener("dispose",w)),R=F}if(R.visible=T.visible,R.wireframe=T.wireframe,b===or?R.side=T.shadowSide!==null?T.shadowSide:T.side:R.side=T.shadowSide!==null?T.shadowSide:f[T.side],R.alphaMap=T.alphaMap,R.alphaTest=T.alphaToCoverage===!0?.5:T.alphaTest,R.map=T.map,R.clipShadows=T.clipShadows,R.clippingPlanes=T.clippingPlanes,R.clipIntersection=T.clipIntersection,R.displacementMap=T.displacementMap,R.displacementScale=T.displacementScale,R.displacementBias=T.displacementBias,R.wireframeLinewidth=T.wireframeLinewidth,R.linewidth=T.linewidth,v.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let O=i.properties.get(R);O.light=v}return R}function x(S,T,v,b,R){if(S.visible===!1)return;if(S.layers.test(T.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&R===or)&&(!S.frustumCulled||n.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,S.matrixWorld);let V=t.update(S),q=S.material;if(Array.isArray(q)){let F=V.groups;for(let z=0,U=F.length;z<U;z++){let Y=F[z],j=q[Y.materialIndex];if(j&&j.visible){let ht=E(S,j,b,R);S.onBeforeShadow(i,S,T,v,V,ht,Y),i.renderBufferDirect(v,null,V,ht,S,Y),S.onAfterShadow(i,S,T,v,V,ht,Y)}}}else if(q.visible){let F=E(S,q,b,R);S.onBeforeShadow(i,S,T,v,V,F,null),i.renderBufferDirect(v,null,V,F,S,null),S.onAfterShadow(i,S,T,v,V,F,null)}}let O=S.children;for(let V=0,q=O.length;V<q;V++)x(O[V],T,v,b,R)}function w(S){S.target.removeEventListener("dispose",w);for(let v in c){let b=c[v],R=S.target.uuid;R in b&&(b[R].dispose(),delete b[R])}}}function F_(i,t){function e(){let k=!1,Ct=new Ae,it=null,Pt=new Ae(0,0,0,0);return{setMask:function(Dt){it!==Dt&&!k&&(i.colorMask(Dt,Dt,Dt,Dt),it=Dt)},setLocked:function(Dt){k=Dt},setClear:function(Dt,dt,vt,Gt,ve){ve===!0&&(Dt*=Gt,dt*=Gt,vt*=Gt),Ct.set(Dt,dt,vt,Gt),Pt.equals(Ct)===!1&&(i.clearColor(Dt,dt,vt,Gt),Pt.copy(Ct))},reset:function(){k=!1,it=null,Pt.set(-1,0,0,0)}}}function n(){let k=!1,Ct=!1,it=null,Pt=null,Dt=null;return{setReversed:function(dt){if(Ct!==dt){let vt=t.get("EXT_clip_control");dt?vt.clipControlEXT(vt.LOWER_LEFT_EXT,vt.ZERO_TO_ONE_EXT):vt.clipControlEXT(vt.LOWER_LEFT_EXT,vt.NEGATIVE_ONE_TO_ONE_EXT),Ct=dt;let Gt=Dt;Dt=null,this.setClear(Gt)}},getReversed:function(){return Ct},setTest:function(dt){dt?ut(i.DEPTH_TEST):Ft(i.DEPTH_TEST)},setMask:function(dt){it!==dt&&!k&&(i.depthMask(dt),it=dt)},setFunc:function(dt){if(Ct&&(dt=Nd[dt]),Pt!==dt){switch(dt){case _a:i.depthFunc(i.NEVER);break;case ya:i.depthFunc(i.ALWAYS);break;case ba:i.depthFunc(i.LESS);break;case rs:i.depthFunc(i.LEQUAL);break;case Ma:i.depthFunc(i.EQUAL);break;case Sa:i.depthFunc(i.GEQUAL);break;case wa:i.depthFunc(i.GREATER);break;case Ta:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Pt=dt}},setLocked:function(dt){k=dt},setClear:function(dt){Dt!==dt&&(Dt=dt,Ct&&(dt=1-dt),i.clearDepth(dt))},reset:function(){k=!1,it=null,Pt=null,Dt=null,Ct=!1}}}function s(){let k=!1,Ct=null,it=null,Pt=null,Dt=null,dt=null,vt=null,Gt=null,ve=null;return{setTest:function(ae){k||(ae?ut(i.STENCIL_TEST):Ft(i.STENCIL_TEST))},setMask:function(ae){Ct!==ae&&!k&&(i.stencilMask(ae),Ct=ae)},setFunc:function(ae,mn,de){(it!==ae||Pt!==mn||Dt!==de)&&(i.stencilFunc(ae,mn,de),it=ae,Pt=mn,Dt=de)},setOp:function(ae,mn,de){(dt!==ae||vt!==mn||Gt!==de)&&(i.stencilOp(ae,mn,de),dt=ae,vt=mn,Gt=de)},setLocked:function(ae){k=ae},setClear:function(ae){ve!==ae&&(i.clearStencil(ae),ve=ae)},reset:function(){k=!1,Ct=null,it=null,Pt=null,Dt=null,dt=null,vt=null,Gt=null,ve=null}}}let r=new e,o=new n,a=new s,l=new WeakMap,c=new WeakMap,h={},f={},u={},d=new WeakMap,g=[],y=null,m=!1,p=null,M=null,E=null,x=null,w=null,S=null,T=null,v=new Bt(0,0,0),b=0,R=!1,P=null,O=null,V=null,q=null,F=null,z=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),U=!1,Y=0,j=i.getParameter(i.VERSION);j.indexOf("WebGL")!==-1?(Y=parseFloat(/^WebGL (\d)/.exec(j)[1]),U=Y>=1):j.indexOf("OpenGL ES")!==-1&&(Y=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),U=Y>=2);let ht=null,ct={},yt=i.getParameter(i.SCISSOR_BOX),xt=i.getParameter(i.VIEWPORT),Kt=new Ae().fromArray(yt),kt=new Ae().fromArray(xt);function Q(k,Ct,it,Pt){let Dt=new Uint8Array(4),dt=i.createTexture();i.bindTexture(k,dt),i.texParameteri(k,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(k,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let vt=0;vt<it;vt++)k===i.TEXTURE_3D||k===i.TEXTURE_2D_ARRAY?i.texImage3D(Ct,0,i.RGBA,1,1,Pt,0,i.RGBA,i.UNSIGNED_BYTE,Dt):i.texImage2D(Ct+vt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Dt);return dt}let mt={};mt[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),mt[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),mt[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),mt[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ut(i.DEPTH_TEST),o.setFunc(rs),at(!1),Z(ph),ut(i.CULL_FACE),N(We);function ut(k){h[k]!==!0&&(i.enable(k),h[k]=!0)}function Ft(k){h[k]!==!1&&(i.disable(k),h[k]=!1)}function Mt(k,Ct){return u[k]!==Ct?(i.bindFramebuffer(k,Ct),u[k]=Ct,k===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=Ct),k===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=Ct),!0):!1}function St(k,Ct){let it=g,Pt=!1;if(k){it=d.get(Ct),it===void 0&&(it=[],d.set(Ct,it));let Dt=k.textures;if(it.length!==Dt.length||it[0]!==i.COLOR_ATTACHMENT0){for(let dt=0,vt=Dt.length;dt<vt;dt++)it[dt]=i.COLOR_ATTACHMENT0+dt;it.length=Dt.length,Pt=!0}}else it[0]!==i.BACK&&(it[0]=i.BACK,Pt=!0);Pt&&i.drawBuffers(it)}function te(k){return y!==k?(i.useProgram(k),y=k,!0):!1}let Vt={[Sn]:i.FUNC_ADD,[od]:i.FUNC_SUBTRACT,[ad]:i.FUNC_REVERSE_SUBTRACT};Vt[ld]=i.MIN,Vt[cd]=i.MAX;let rt={[fs]:i.ZERO,[hd]:i.ONE,[ud]:i.SRC_COLOR,[xa]:i.SRC_ALPHA,[md]:i.SRC_ALPHA_SATURATE,[go]:i.DST_COLOR,[mo]:i.DST_ALPHA,[dd]:i.ONE_MINUS_SRC_COLOR,[va]:i.ONE_MINUS_SRC_ALPHA,[pd]:i.ONE_MINUS_DST_COLOR,[fd]:i.ONE_MINUS_DST_ALPHA,[gd]:i.CONSTANT_COLOR,[xd]:i.ONE_MINUS_CONSTANT_COLOR,[vd]:i.CONSTANT_ALPHA,[_d]:i.ONE_MINUS_CONSTANT_ALPHA};function N(k,Ct,it,Pt,Dt,dt,vt,Gt,ve,ae){if(k===We){m===!0&&(Ft(i.BLEND),m=!1);return}if(m===!1&&(ut(i.BLEND),m=!0),k!==tl){if(k!==p||ae!==R){if((M!==Sn||w!==Sn)&&(i.blendEquation(i.FUNC_ADD),M=Sn,w=Sn),ae)switch(k){case ss:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case mh:i.blendFunc(i.ONE,i.ONE);break;case gh:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case xh:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Qt("WebGLState: Invalid blending: ",k);break}else switch(k){case ss:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case mh:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case gh:Qt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case xh:Qt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Qt("WebGLState: Invalid blending: ",k);break}E=null,x=null,S=null,T=null,v.set(0,0,0),b=0,p=k,R=ae}return}Dt=Dt||Ct,dt=dt||it,vt=vt||Pt,(Ct!==M||Dt!==w)&&(i.blendEquationSeparate(Vt[Ct],Vt[Dt]),M=Ct,w=Dt),(it!==E||Pt!==x||dt!==S||vt!==T)&&(i.blendFuncSeparate(rt[it],rt[Pt],rt[dt],rt[vt]),E=it,x=Pt,S=dt,T=vt),(Gt.equals(v)===!1||ve!==b)&&(i.blendColor(Gt.r,Gt.g,Gt.b,ve),v.copy(Gt),b=ve),p=k,R=!1}function G(k,Ct){k.side===ai?Ft(i.CULL_FACE):ut(i.CULL_FACE);let it=k.side===rn;Ct&&(it=!it),at(it),k.blending===ss&&k.transparent===!1?N(We):N(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),o.setFunc(k.depthFunc),o.setTest(k.depthTest),o.setMask(k.depthWrite),r.setMask(k.colorWrite);let Pt=k.stencilWrite;a.setTest(Pt),Pt&&(a.setMask(k.stencilWriteMask),a.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),a.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),X(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?ut(i.SAMPLE_ALPHA_TO_COVERAGE):Ft(i.SAMPLE_ALPHA_TO_COVERAGE)}function at(k){P!==k&&(k?i.frontFace(i.CW):i.frontFace(i.CCW),P=k)}function Z(k){k!==id?(ut(i.CULL_FACE),k!==O&&(k===ph?i.cullFace(i.BACK):k===sd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Ft(i.CULL_FACE),O=k}function Lt(k){k!==V&&(U&&i.lineWidth(k),V=k)}function X(k,Ct,it){k?(ut(i.POLYGON_OFFSET_FILL),(q!==Ct||F!==it)&&(q=Ct,F=it,o.getReversed()&&(Ct=-Ct),i.polygonOffset(Ct,it))):Ft(i.POLYGON_OFFSET_FILL)}function Et(k){k?ut(i.SCISSOR_TEST):Ft(i.SCISSOR_TEST)}function pt(k){k===void 0&&(k=i.TEXTURE0+z-1),ht!==k&&(i.activeTexture(k),ht=k)}function B(k,Ct,it){it===void 0&&(ht===null?it=i.TEXTURE0+z-1:it=ht);let Pt=ct[it];Pt===void 0&&(Pt={type:void 0,texture:void 0},ct[it]=Pt),(Pt.type!==k||Pt.texture!==Ct)&&(ht!==it&&(i.activeTexture(it),ht=it),i.bindTexture(k,Ct||mt[k]),Pt.type=k,Pt.texture=Ct)}function oe(){let k=ct[ht];k!==void 0&&k.type!==void 0&&(i.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function It(){try{i.compressedTexImage2D(...arguments)}catch(k){Qt("WebGLState:",k)}}function A(){try{i.compressedTexImage3D(...arguments)}catch(k){Qt("WebGLState:",k)}}function _(){try{i.texSubImage2D(...arguments)}catch(k){Qt("WebGLState:",k)}}function H(){try{i.texSubImage3D(...arguments)}catch(k){Qt("WebGLState:",k)}}function $(){try{i.compressedTexSubImage2D(...arguments)}catch(k){Qt("WebGLState:",k)}}function nt(){try{i.compressedTexSubImage3D(...arguments)}catch(k){Qt("WebGLState:",k)}}function gt(){try{i.texStorage2D(...arguments)}catch(k){Qt("WebGLState:",k)}}function bt(){try{i.texStorage3D(...arguments)}catch(k){Qt("WebGLState:",k)}}function tt(){try{i.texImage2D(...arguments)}catch(k){Qt("WebGLState:",k)}}function lt(){try{i.texImage3D(...arguments)}catch(k){Qt("WebGLState:",k)}}function st(k){return f[k]!==void 0?f[k]:i.getParameter(k)}function Xt(k,Ct){f[k]!==Ct&&(i.pixelStorei(k,Ct),f[k]=Ct)}function Tt(k){Kt.equals(k)===!1&&(i.scissor(k.x,k.y,k.z,k.w),Kt.copy(k))}function wt(k){kt.equals(k)===!1&&(i.viewport(k.x,k.y,k.z,k.w),kt.copy(k))}function Wt(k,Ct){let it=c.get(Ct);it===void 0&&(it=new WeakMap,c.set(Ct,it));let Pt=it.get(k);Pt===void 0&&(Pt=i.getUniformBlockIndex(Ct,k.name),it.set(k,Pt))}function Zt(k,Ct){let Pt=c.get(Ct).get(k);l.get(Ct)!==Pt&&(i.uniformBlockBinding(Ct,Pt,k.__bindingPointIndex),l.set(Ct,Pt))}function Jt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},f={},ht=null,ct={},u={},d=new WeakMap,g=[],y=null,m=!1,p=null,M=null,E=null,x=null,w=null,S=null,T=null,v=new Bt(0,0,0),b=0,R=!1,P=null,O=null,V=null,q=null,F=null,Kt.set(0,0,i.canvas.width,i.canvas.height),kt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ut,disable:Ft,bindFramebuffer:Mt,drawBuffers:St,useProgram:te,setBlending:N,setMaterial:G,setFlipSided:at,setCullFace:Z,setLineWidth:Lt,setPolygonOffset:X,setScissorTest:Et,activeTexture:pt,bindTexture:B,unbindTexture:oe,compressedTexImage2D:It,compressedTexImage3D:A,texImage2D:tt,texImage3D:lt,pixelStorei:Xt,getParameter:st,updateUBOMapping:Wt,uniformBlockBinding:Zt,texStorage2D:gt,texStorage3D:bt,texSubImage2D:_,texSubImage3D:H,compressedTexSubImage2D:$,compressedTexSubImage3D:nt,scissor:Tt,viewport:wt,reset:Jt}}function O_(i,t,e,n,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ft,h=new WeakMap,f=new Set,u,d=new WeakMap,g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function y(A,_){return g?new OffscreenCanvas(A,_):qs("canvas")}function m(A,_,H){let $=1,nt=It(A);if((nt.width>H||nt.height>H)&&($=H/Math.max(nt.width,nt.height)),$<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let gt=Math.floor($*nt.width),bt=Math.floor($*nt.height);u===void 0&&(u=y(gt,bt));let tt=_?y(gt,bt):u;return tt.width=gt,tt.height=bt,tt.getContext("2d").drawImage(A,0,0,gt,bt),jt("WebGLRenderer: Texture has been resized from ("+nt.width+"x"+nt.height+") to ("+gt+"x"+bt+")."),tt}else return"data"in A&&jt("WebGLRenderer: Image in DataTexture is too big ("+nt.width+"x"+nt.height+")."),A;return A}function p(A){return A.generateMipmaps}function M(A){i.generateMipmap(A)}function E(A){return A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?i.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function x(A,_,H,$,nt,gt=!1){if(A!==null){if(i[A]!==void 0)return i[A];jt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let bt;$&&(bt=t.get("EXT_texture_norm16"),bt||jt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let tt=_;if(_===i.RED&&(H===i.FLOAT&&(tt=i.R32F),H===i.HALF_FLOAT&&(tt=i.R16F),H===i.UNSIGNED_BYTE&&(tt=i.R8),H===i.UNSIGNED_SHORT&&bt&&(tt=bt.R16_EXT),H===i.SHORT&&bt&&(tt=bt.R16_SNORM_EXT)),_===i.RED_INTEGER&&(H===i.UNSIGNED_BYTE&&(tt=i.R8UI),H===i.UNSIGNED_SHORT&&(tt=i.R16UI),H===i.UNSIGNED_INT&&(tt=i.R32UI),H===i.BYTE&&(tt=i.R8I),H===i.SHORT&&(tt=i.R16I),H===i.INT&&(tt=i.R32I)),_===i.RG&&(H===i.FLOAT&&(tt=i.RG32F),H===i.HALF_FLOAT&&(tt=i.RG16F),H===i.UNSIGNED_BYTE&&(tt=i.RG8),H===i.UNSIGNED_SHORT&&bt&&(tt=bt.RG16_EXT),H===i.SHORT&&bt&&(tt=bt.RG16_SNORM_EXT)),_===i.RG_INTEGER&&(H===i.UNSIGNED_BYTE&&(tt=i.RG8UI),H===i.UNSIGNED_SHORT&&(tt=i.RG16UI),H===i.UNSIGNED_INT&&(tt=i.RG32UI),H===i.BYTE&&(tt=i.RG8I),H===i.SHORT&&(tt=i.RG16I),H===i.INT&&(tt=i.RG32I)),_===i.RGB_INTEGER&&(H===i.UNSIGNED_BYTE&&(tt=i.RGB8UI),H===i.UNSIGNED_SHORT&&(tt=i.RGB16UI),H===i.UNSIGNED_INT&&(tt=i.RGB32UI),H===i.BYTE&&(tt=i.RGB8I),H===i.SHORT&&(tt=i.RGB16I),H===i.INT&&(tt=i.RGB32I)),_===i.RGBA_INTEGER&&(H===i.UNSIGNED_BYTE&&(tt=i.RGBA8UI),H===i.UNSIGNED_SHORT&&(tt=i.RGBA16UI),H===i.UNSIGNED_INT&&(tt=i.RGBA32UI),H===i.BYTE&&(tt=i.RGBA8I),H===i.SHORT&&(tt=i.RGBA16I),H===i.INT&&(tt=i.RGBA32I)),_===i.RGB&&(H===i.UNSIGNED_SHORT&&bt&&(tt=bt.RGB16_EXT),H===i.SHORT&&bt&&(tt=bt.RGB16_SNORM_EXT),H===i.UNSIGNED_INT_5_9_9_9_REV&&(tt=i.RGB9_E5),H===i.UNSIGNED_INT_10F_11F_11F_REV&&(tt=i.R11F_G11F_B10F)),_===i.RGBA){let lt=gt?Vr:fe.getTransfer(nt);H===i.FLOAT&&(tt=i.RGBA32F),H===i.HALF_FLOAT&&(tt=i.RGBA16F),H===i.UNSIGNED_BYTE&&(tt=lt===ye?i.SRGB8_ALPHA8:i.RGBA8),H===i.UNSIGNED_SHORT&&bt&&(tt=bt.RGBA16_EXT),H===i.SHORT&&bt&&(tt=bt.RGBA16_SNORM_EXT),H===i.UNSIGNED_SHORT_4_4_4_4&&(tt=i.RGBA4),H===i.UNSIGNED_SHORT_5_5_5_1&&(tt=i.RGB5_A1)}return(tt===i.R16F||tt===i.R32F||tt===i.RG16F||tt===i.RG32F||tt===i.RGBA16F||tt===i.RGBA32F)&&t.get("EXT_color_buffer_float"),tt}function w(A,_){let H;return A?_===null||_===qn||_===Hi?H=i.DEPTH24_STENCIL8:_===Ln?H=i.DEPTH32F_STENCIL8:_===ar&&(H=i.DEPTH24_STENCIL8,jt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===qn||_===Hi?H=i.DEPTH_COMPONENT24:_===Ln?H=i.DEPTH_COMPONENT32F:_===ar&&(H=i.DEPTH_COMPONENT16),H}function S(A,_){return p(A)===!0||A.isFramebufferTexture&&A.minFilter!==Ue&&A.minFilter!==nn?Math.log2(Math.max(_.width,_.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?_.mipmaps.length:1}function T(A){let _=A.target;_.removeEventListener("dispose",T),b(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&f.delete(_)}function v(A){let _=A.target;_.removeEventListener("dispose",v),P(_)}function b(A){let _=n.get(A);if(_.__webglInit===void 0)return;let H=A.source,$=d.get(H);if($){let nt=$[_.__cacheKey];nt.usedTimes--,nt.usedTimes===0&&R(A),Object.keys($).length===0&&d.delete(H)}n.remove(A)}function R(A){let _=n.get(A);i.deleteTexture(_.__webglTexture);let H=A.source,$=d.get(H);delete $[_.__cacheKey],o.memory.textures--}function P(A){let _=n.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),n.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let $=0;$<6;$++){if(Array.isArray(_.__webglFramebuffer[$]))for(let nt=0;nt<_.__webglFramebuffer[$].length;nt++)i.deleteFramebuffer(_.__webglFramebuffer[$][nt]);else i.deleteFramebuffer(_.__webglFramebuffer[$]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[$])}else{if(Array.isArray(_.__webglFramebuffer))for(let $=0;$<_.__webglFramebuffer.length;$++)i.deleteFramebuffer(_.__webglFramebuffer[$]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let $=0;$<_.__webglColorRenderbuffer.length;$++)_.__webglColorRenderbuffer[$]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[$]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let H=A.textures;for(let $=0,nt=H.length;$<nt;$++){let gt=n.get(H[$]);gt.__webglTexture&&(i.deleteTexture(gt.__webglTexture),o.memory.textures--),n.remove(H[$])}n.remove(A)}let O=0;function V(){O=0}function q(){return O}function F(A){O=A}function z(){let A=O;return A>=s.maxTextures&&jt("WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),O+=1,A}function U(A){let _=[];return _.push(A.wrapS),_.push(A.wrapT),_.push(A.wrapR||0),_.push(A.magFilter),_.push(A.minFilter),_.push(A.anisotropy),_.push(A.internalFormat),_.push(A.format),_.push(A.type),_.push(A.generateMipmaps),_.push(A.premultiplyAlpha),_.push(A.flipY),_.push(A.unpackAlignment),_.push(A.colorSpace),_.join()}function Y(A,_){let H=n.get(A);if(A.isVideoTexture&&B(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&H.__version!==A.version){let $=A.image;if($===null)jt("WebGLRenderer: Texture marked for update but no image data found.");else if($.complete===!1)jt("WebGLRenderer: Texture marked for update but image is incomplete");else{Ft(H,A,_);return}}else A.isExternalTexture&&(H.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,H.__webglTexture,i.TEXTURE0+_)}function j(A,_){let H=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&H.__version!==A.version){Ft(H,A,_);return}else A.isExternalTexture&&(H.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,H.__webglTexture,i.TEXTURE0+_)}function ht(A,_){let H=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&H.__version!==A.version){Ft(H,A,_);return}e.bindTexture(i.TEXTURE_3D,H.__webglTexture,i.TEXTURE0+_)}function ct(A,_){let H=n.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&H.__version!==A.version){Mt(H,A,_);return}e.bindTexture(i.TEXTURE_CUBE_MAP,H.__webglTexture,i.TEXTURE0+_)}let yt={[ii]:i.REPEAT,[ni]:i.CLAMP_TO_EDGE,[Ea]:i.MIRRORED_REPEAT},xt={[Ue]:i.NEAREST,[Md]:i.NEAREST_MIPMAP_NEAREST,[bo]:i.NEAREST_MIPMAP_LINEAR,[nn]:i.LINEAR,[sl]:i.LINEAR_MIPMAP_NEAREST,[Gi]:i.LINEAR_MIPMAP_LINEAR},Kt={[Td]:i.NEVER,[Pd]:i.ALWAYS,[Ed]:i.LESS,[Gl]:i.LEQUAL,[Ad]:i.EQUAL,[Hl]:i.GEQUAL,[Cd]:i.GREATER,[Rd]:i.NOTEQUAL};function kt(A,_){if(_.type===Ln&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===nn||_.magFilter===sl||_.magFilter===bo||_.magFilter===Gi||_.minFilter===nn||_.minFilter===sl||_.minFilter===bo||_.minFilter===Gi)&&jt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,yt[_.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,yt[_.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,yt[_.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,xt[_.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,xt[_.minFilter]),_.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,Kt[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Ue||_.minFilter!==bo&&_.minFilter!==Gi||_.type===Ln&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let H=t.get("EXT_texture_filter_anisotropic");i.texParameterf(A,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Q(A,_){let H=!1;A.__webglInit===void 0&&(A.__webglInit=!0,_.addEventListener("dispose",T));let $=_.source,nt=d.get($);nt===void 0&&(nt={},d.set($,nt));let gt=U(_);if(gt!==A.__cacheKey){nt[gt]===void 0&&(nt[gt]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,H=!0),nt[gt].usedTimes++;let bt=nt[A.__cacheKey];bt!==void 0&&(nt[A.__cacheKey].usedTimes--,bt.usedTimes===0&&R(_)),A.__cacheKey=gt,A.__webglTexture=nt[gt].texture}return H}function mt(A,_,H){return Math.floor(Math.floor(A/H)/_)}function ut(A,_,H,$){let gt=A.updateRanges;if(gt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,H,$,_.data);else{gt.sort((Xt,Tt)=>Xt.start-Tt.start);let bt=0;for(let Xt=1;Xt<gt.length;Xt++){let Tt=gt[bt],wt=gt[Xt],Wt=Tt.start+Tt.count,Zt=mt(wt.start,_.width,4),Jt=mt(Tt.start,_.width,4);wt.start<=Wt+1&&Zt===Jt&&mt(wt.start+wt.count-1,_.width,4)===Zt?Tt.count=Math.max(Tt.count,wt.start+wt.count-Tt.start):(++bt,gt[bt]=wt)}gt.length=bt+1;let tt=e.getParameter(i.UNPACK_ROW_LENGTH),lt=e.getParameter(i.UNPACK_SKIP_PIXELS),st=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let Xt=0,Tt=gt.length;Xt<Tt;Xt++){let wt=gt[Xt],Wt=Math.floor(wt.start/4),Zt=Math.ceil(wt.count/4),Jt=Wt%_.width,k=Math.floor(Wt/_.width),Ct=Zt,it=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,Jt),e.pixelStorei(i.UNPACK_SKIP_ROWS,k),e.texSubImage2D(i.TEXTURE_2D,0,Jt,k,Ct,it,H,$,_.data)}A.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,tt),e.pixelStorei(i.UNPACK_SKIP_PIXELS,lt),e.pixelStorei(i.UNPACK_SKIP_ROWS,st)}}function Ft(A,_,H){let $=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&($=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&($=i.TEXTURE_3D);let nt=Q(A,_),gt=_.source;e.bindTexture($,A.__webglTexture,i.TEXTURE0+H);let bt=n.get(gt);if(gt.version!==bt.__version||nt===!0){if(e.activeTexture(i.TEXTURE0+H),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let it=fe.getPrimaries(fe.workingColorSpace),Pt=_.colorSpace===wi?null:fe.getPrimaries(_.colorSpace),Dt=_.colorSpace===wi||it===Pt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Dt)}e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment);let lt=m(_.image,!1,s.maxTextureSize);lt=oe(_,lt);let st=r.convert(_.format,_.colorSpace),Xt=r.convert(_.type),Tt=x(_.internalFormat,st,Xt,_.normalized,_.colorSpace,_.isVideoTexture);kt($,_);let wt,Wt=_.mipmaps,Zt=_.isVideoTexture!==!0,Jt=bt.__version===void 0||nt===!0,k=gt.dataReady,Ct=S(_,lt);if(_.isDepthTexture)Tt=w(_.format===li,_.type),Jt&&(Zt?e.texStorage2D(i.TEXTURE_2D,1,Tt,lt.width,lt.height):e.texImage2D(i.TEXTURE_2D,0,Tt,lt.width,lt.height,0,st,Xt,null));else if(_.isDataTexture)if(Wt.length>0){Zt&&Jt&&e.texStorage2D(i.TEXTURE_2D,Ct,Tt,Wt[0].width,Wt[0].height);for(let it=0,Pt=Wt.length;it<Pt;it++)wt=Wt[it],Zt?k&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,wt.width,wt.height,st,Xt,wt.data):e.texImage2D(i.TEXTURE_2D,it,Tt,wt.width,wt.height,0,st,Xt,wt.data);_.generateMipmaps=!1}else Zt?(Jt&&e.texStorage2D(i.TEXTURE_2D,Ct,Tt,lt.width,lt.height),k&&ut(_,lt,st,Xt)):e.texImage2D(i.TEXTURE_2D,0,Tt,lt.width,lt.height,0,st,Xt,lt.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Zt&&Jt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Ct,Tt,Wt[0].width,Wt[0].height,lt.depth);for(let it=0,Pt=Wt.length;it<Pt;it++)if(wt=Wt[it],_.format!==vn)if(st!==null)if(Zt){if(k)if(_.layerUpdates.size>0){let Dt=Fh(wt.width,wt.height,_.format,_.type);for(let dt of _.layerUpdates){let vt=wt.data.subarray(dt*Dt/wt.data.BYTES_PER_ELEMENT,(dt+1)*Dt/wt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,dt,wt.width,wt.height,1,st,vt)}_.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,0,wt.width,wt.height,lt.depth,st,wt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,it,Tt,wt.width,wt.height,lt.depth,0,wt.data,0,0);else jt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Zt?k&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,0,wt.width,wt.height,lt.depth,st,Xt,wt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,it,Tt,wt.width,wt.height,lt.depth,0,st,Xt,wt.data)}else{Zt&&Jt&&e.texStorage2D(i.TEXTURE_2D,Ct,Tt,Wt[0].width,Wt[0].height);for(let it=0,Pt=Wt.length;it<Pt;it++)wt=Wt[it],_.format!==vn?st!==null?Zt?k&&e.compressedTexSubImage2D(i.TEXTURE_2D,it,0,0,wt.width,wt.height,st,wt.data):e.compressedTexImage2D(i.TEXTURE_2D,it,Tt,wt.width,wt.height,0,wt.data):jt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Zt?k&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,wt.width,wt.height,st,Xt,wt.data):e.texImage2D(i.TEXTURE_2D,it,Tt,wt.width,wt.height,0,st,Xt,wt.data)}else if(_.isDataArrayTexture)if(Zt){if(Jt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Ct,Tt,lt.width,lt.height,lt.depth),k)if(_.layerUpdates.size>0){let it=Fh(lt.width,lt.height,_.format,_.type);for(let Pt of _.layerUpdates){let Dt=lt.data.subarray(Pt*it/lt.data.BYTES_PER_ELEMENT,(Pt+1)*it/lt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Pt,lt.width,lt.height,1,st,Xt,Dt)}_.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,lt.width,lt.height,lt.depth,st,Xt,lt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Tt,lt.width,lt.height,lt.depth,0,st,Xt,lt.data);else if(_.isData3DTexture)Zt?(Jt&&e.texStorage3D(i.TEXTURE_3D,Ct,Tt,lt.width,lt.height,lt.depth),k&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,lt.width,lt.height,lt.depth,st,Xt,lt.data)):e.texImage3D(i.TEXTURE_3D,0,Tt,lt.width,lt.height,lt.depth,0,st,Xt,lt.data);else if(_.isFramebufferTexture){if(Jt)if(Zt)e.texStorage2D(i.TEXTURE_2D,Ct,Tt,lt.width,lt.height);else{let it=lt.width,Pt=lt.height;for(let Dt=0;Dt<Ct;Dt++)e.texImage2D(i.TEXTURE_2D,Dt,Tt,it,Pt,0,st,Xt,null),it>>=1,Pt>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in i){let it=i.canvas;if(it.hasAttribute("layoutsubtree")||it.setAttribute("layoutsubtree","true"),lt.parentNode!==it){it.appendChild(lt),f.add(_),it.onpaint=Pt=>{let Dt=Pt.changedElements;for(let dt of f)Dt.includes(dt.image)&&(dt.needsUpdate=!0)},it.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,lt);else{let Dt=i.RGBA,dt=i.RGBA,vt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Dt,dt,vt,lt)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Wt.length>0){if(Zt&&Jt){let it=It(Wt[0]);e.texStorage2D(i.TEXTURE_2D,Ct,Tt,it.width,it.height)}for(let it=0,Pt=Wt.length;it<Pt;it++)wt=Wt[it],Zt?k&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,st,Xt,wt):e.texImage2D(i.TEXTURE_2D,it,Tt,st,Xt,wt);_.generateMipmaps=!1}else if(Zt){if(Jt){let it=It(lt);e.texStorage2D(i.TEXTURE_2D,Ct,Tt,it.width,it.height)}k&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,st,Xt,lt)}else e.texImage2D(i.TEXTURE_2D,0,Tt,st,Xt,lt);p(_)&&M($),bt.__version=gt.version,_.onUpdate&&_.onUpdate(_)}A.__version=_.version}function Mt(A,_,H){if(_.image.length!==6)return;let $=Q(A,_),nt=_.source;e.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+H);let gt=n.get(nt);if(nt.version!==gt.__version||$===!0){e.activeTexture(i.TEXTURE0+H);let bt=fe.getPrimaries(fe.workingColorSpace),tt=_.colorSpace===wi?null:fe.getPrimaries(_.colorSpace),lt=_.colorSpace===wi||bt===tt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,lt);let st=_.isCompressedTexture||_.image[0].isCompressedTexture,Xt=_.image[0]&&_.image[0].isDataTexture,Tt=[];for(let dt=0;dt<6;dt++)!st&&!Xt?Tt[dt]=m(_.image[dt],!0,s.maxCubemapSize):Tt[dt]=Xt?_.image[dt].image:_.image[dt],Tt[dt]=oe(_,Tt[dt]);let wt=Tt[0],Wt=r.convert(_.format,_.colorSpace),Zt=r.convert(_.type),Jt=x(_.internalFormat,Wt,Zt,_.normalized,_.colorSpace),k=_.isVideoTexture!==!0,Ct=gt.__version===void 0||$===!0,it=nt.dataReady,Pt=S(_,wt);kt(i.TEXTURE_CUBE_MAP,_);let Dt;if(st){k&&Ct&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Pt,Jt,wt.width,wt.height);for(let dt=0;dt<6;dt++){Dt=Tt[dt].mipmaps;for(let vt=0;vt<Dt.length;vt++){let Gt=Dt[vt];_.format!==vn?Wt!==null?k?it&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt,0,0,Gt.width,Gt.height,Wt,Gt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt,Jt,Gt.width,Gt.height,0,Gt.data):jt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):k?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt,0,0,Gt.width,Gt.height,Wt,Zt,Gt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt,Jt,Gt.width,Gt.height,0,Wt,Zt,Gt.data)}}}else{if(Dt=_.mipmaps,k&&Ct){Dt.length>0&&Pt++;let dt=It(Tt[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Pt,Jt,dt.width,dt.height)}for(let dt=0;dt<6;dt++)if(Xt){k?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,0,0,Tt[dt].width,Tt[dt].height,Wt,Zt,Tt[dt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,Jt,Tt[dt].width,Tt[dt].height,0,Wt,Zt,Tt[dt].data);for(let vt=0;vt<Dt.length;vt++){let ve=Dt[vt].image[dt].image;k?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt+1,0,0,ve.width,ve.height,Wt,Zt,ve.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt+1,Jt,ve.width,ve.height,0,Wt,Zt,ve.data)}}else{k?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,0,0,Wt,Zt,Tt[dt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,Jt,Wt,Zt,Tt[dt]);for(let vt=0;vt<Dt.length;vt++){let Gt=Dt[vt];k?it&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt+1,0,0,Wt,Zt,Gt.image[dt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,vt+1,Jt,Wt,Zt,Gt.image[dt])}}}p(_)&&M(i.TEXTURE_CUBE_MAP),gt.__version=nt.version,_.onUpdate&&_.onUpdate(_)}A.__version=_.version}function St(A,_,H,$,nt,gt){let bt=r.convert(H.format,H.colorSpace),tt=r.convert(H.type),lt=x(H.internalFormat,bt,tt,H.normalized,H.colorSpace),st=n.get(_),Xt=n.get(H);if(Xt.__renderTarget=_,!st.__hasExternalTextures){let Tt=Math.max(1,_.width>>gt),wt=Math.max(1,_.height>>gt);nt===i.TEXTURE_3D||nt===i.TEXTURE_2D_ARRAY?e.texImage3D(nt,gt,lt,Tt,wt,_.depth,0,bt,tt,null):e.texImage2D(nt,gt,lt,Tt,wt,0,bt,tt,null)}e.bindFramebuffer(i.FRAMEBUFFER,A),pt(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,$,nt,Xt.__webglTexture,0,Et(_)):(nt===i.TEXTURE_2D||nt>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&nt<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,$,nt,Xt.__webglTexture,gt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function te(A,_,H){if(i.bindRenderbuffer(i.RENDERBUFFER,A),_.depthBuffer){let $=_.depthTexture,nt=$&&$.isDepthTexture?$.type:null,gt=w(_.stencilBuffer,nt),bt=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;pt(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Et(_),gt,_.width,_.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,Et(_),gt,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,gt,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,bt,i.RENDERBUFFER,A)}else{let $=_.textures;for(let nt=0;nt<$.length;nt++){let gt=$[nt],bt=r.convert(gt.format,gt.colorSpace),tt=r.convert(gt.type),lt=x(gt.internalFormat,bt,tt,gt.normalized,gt.colorSpace);pt(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Et(_),lt,_.width,_.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,Et(_),lt,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,lt,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Vt(A,_,H){let $=_.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,A),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let nt=n.get(_.depthTexture);if(nt.__renderTarget=_,(!nt.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),$){if(nt.__webglInit===void 0&&(nt.__webglInit=!0,_.depthTexture.addEventListener("dispose",T)),nt.__webglTexture===void 0){nt.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,nt.__webglTexture),kt(i.TEXTURE_CUBE_MAP,_.depthTexture);let st=r.convert(_.depthTexture.format),Xt=r.convert(_.depthTexture.type),Tt;_.depthTexture.format===si?Tt=i.DEPTH_COMPONENT24:_.depthTexture.format===li&&(Tt=i.DEPTH24_STENCIL8);for(let wt=0;wt<6;wt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,Tt,_.width,_.height,0,st,Xt,null)}}else Y(_.depthTexture,0);let gt=nt.__webglTexture,bt=Et(_),tt=$?i.TEXTURE_CUBE_MAP_POSITIVE_X+H:i.TEXTURE_2D,lt=_.depthTexture.format===li?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===si)pt(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,lt,tt,gt,0,bt):i.framebufferTexture2D(i.FRAMEBUFFER,lt,tt,gt,0);else if(_.depthTexture.format===li)pt(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,lt,tt,gt,0,bt):i.framebufferTexture2D(i.FRAMEBUFFER,lt,tt,gt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function rt(A){let _=n.get(A),H=A.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==A.depthTexture){let $=A.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),$){let nt=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,$.removeEventListener("dispose",nt)};$.addEventListener("dispose",nt),_.__depthDisposeCallback=nt}_.__boundDepthTexture=$}if(A.depthTexture&&!_.__autoAllocateDepthBuffer)if(H)for(let $=0;$<6;$++)Vt(_.__webglFramebuffer[$],A,$);else{let $=A.texture.mipmaps;$&&$.length>0?Vt(_.__webglFramebuffer[0],A,0):Vt(_.__webglFramebuffer,A,0)}else if(H){_.__webglDepthbuffer=[];for(let $=0;$<6;$++)if(e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[$]),_.__webglDepthbuffer[$]===void 0)_.__webglDepthbuffer[$]=i.createRenderbuffer(),te(_.__webglDepthbuffer[$],A,!1);else{let nt=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,gt=_.__webglDepthbuffer[$];i.bindRenderbuffer(i.RENDERBUFFER,gt),i.framebufferRenderbuffer(i.FRAMEBUFFER,nt,i.RENDERBUFFER,gt)}}else{let $=A.texture.mipmaps;if($&&$.length>0?e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),te(_.__webglDepthbuffer,A,!1);else{let nt=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,gt=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,gt),i.framebufferRenderbuffer(i.FRAMEBUFFER,nt,i.RENDERBUFFER,gt)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function N(A,_,H){let $=n.get(A);_!==void 0&&St($.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),H!==void 0&&rt(A)}function G(A){let _=A.texture,H=n.get(A),$=n.get(_);A.addEventListener("dispose",v);let nt=A.textures,gt=A.isWebGLCubeRenderTarget===!0,bt=nt.length>1;if(bt||($.__webglTexture===void 0&&($.__webglTexture=i.createTexture()),$.__version=_.version,o.memory.textures++),gt){H.__webglFramebuffer=[];for(let tt=0;tt<6;tt++)if(_.mipmaps&&_.mipmaps.length>0){H.__webglFramebuffer[tt]=[];for(let lt=0;lt<_.mipmaps.length;lt++)H.__webglFramebuffer[tt][lt]=i.createFramebuffer()}else H.__webglFramebuffer[tt]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){H.__webglFramebuffer=[];for(let tt=0;tt<_.mipmaps.length;tt++)H.__webglFramebuffer[tt]=i.createFramebuffer()}else H.__webglFramebuffer=i.createFramebuffer();if(bt)for(let tt=0,lt=nt.length;tt<lt;tt++){let st=n.get(nt[tt]);st.__webglTexture===void 0&&(st.__webglTexture=i.createTexture(),o.memory.textures++)}if(A.samples>0&&pt(A)===!1){H.__webglMultisampledFramebuffer=i.createFramebuffer(),H.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let tt=0;tt<nt.length;tt++){let lt=nt[tt];H.__webglColorRenderbuffer[tt]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,H.__webglColorRenderbuffer[tt]);let st=r.convert(lt.format,lt.colorSpace),Xt=r.convert(lt.type),Tt=x(lt.internalFormat,st,Xt,lt.normalized,lt.colorSpace,A.isXRRenderTarget===!0),wt=Et(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,wt,Tt,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+tt,i.RENDERBUFFER,H.__webglColorRenderbuffer[tt])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(H.__webglDepthRenderbuffer=i.createRenderbuffer(),te(H.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(gt){e.bindTexture(i.TEXTURE_CUBE_MAP,$.__webglTexture),kt(i.TEXTURE_CUBE_MAP,_);for(let tt=0;tt<6;tt++)if(_.mipmaps&&_.mipmaps.length>0)for(let lt=0;lt<_.mipmaps.length;lt++)St(H.__webglFramebuffer[tt][lt],A,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,lt);else St(H.__webglFramebuffer[tt],A,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0);p(_)&&M(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(bt){for(let tt=0,lt=nt.length;tt<lt;tt++){let st=nt[tt],Xt=n.get(st),Tt=i.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(Tt=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(Tt,Xt.__webglTexture),kt(Tt,st),St(H.__webglFramebuffer,A,st,i.COLOR_ATTACHMENT0+tt,Tt,0),p(st)&&M(Tt)}e.unbindTexture()}else{let tt=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(tt=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(tt,$.__webglTexture),kt(tt,_),_.mipmaps&&_.mipmaps.length>0)for(let lt=0;lt<_.mipmaps.length;lt++)St(H.__webglFramebuffer[lt],A,_,i.COLOR_ATTACHMENT0,tt,lt);else St(H.__webglFramebuffer,A,_,i.COLOR_ATTACHMENT0,tt,0);p(_)&&M(tt),e.unbindTexture()}A.depthBuffer&&rt(A)}function at(A){let _=A.textures;for(let H=0,$=_.length;H<$;H++){let nt=_[H];if(p(nt)){let gt=E(A),bt=n.get(nt).__webglTexture;e.bindTexture(gt,bt),M(gt),e.unbindTexture()}}}let Z=[],Lt=[];function X(A){if(A.samples>0){if(pt(A)===!1){let _=A.textures,H=A.width,$=A.height,nt=i.COLOR_BUFFER_BIT,gt=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,bt=n.get(A),tt=_.length>1;if(tt)for(let st=0;st<_.length;st++)e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+st,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+st,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,bt.__webglMultisampledFramebuffer);let lt=A.texture.mipmaps;lt&&lt.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglFramebuffer);for(let st=0;st<_.length;st++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(nt|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(nt|=i.STENCIL_BUFFER_BIT)),tt){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,bt.__webglColorRenderbuffer[st]);let Xt=n.get(_[st]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Xt,0)}i.blitFramebuffer(0,0,H,$,0,0,H,$,nt,i.NEAREST),l===!0&&(Z.length=0,Lt.length=0,Z.push(i.COLOR_ATTACHMENT0+st),A.depthBuffer&&A.resolveDepthBuffer===!1&&(Z.push(gt),Lt.push(gt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Lt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Z))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),tt)for(let st=0;st<_.length;st++){e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+st,i.RENDERBUFFER,bt.__webglColorRenderbuffer[st]);let Xt=n.get(_[st]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+st,i.TEXTURE_2D,Xt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){let _=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function Et(A){return Math.min(s.maxSamples,A.samples)}function pt(A){let _=n.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function B(A){let _=o.render.frame;h.get(A)!==_&&(h.set(A,_),A.update())}function oe(A,_){let H=A.colorSpace,$=A.format,nt=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||H!==zr&&H!==wi&&(fe.getTransfer(H)===ye?($!==vn||nt!==Qe)&&jt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Qt("WebGLTextures: Unsupported texture color space:",H)),_}function It(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=z,this.resetTextureUnits=V,this.getTextureUnits=q,this.setTextureUnits=F,this.setTexture2D=Y,this.setTexture2DArray=j,this.setTexture3D=ht,this.setTextureCube=ct,this.rebindTextures=N,this.setupRenderTarget=G,this.updateRenderTargetMipmap=at,this.updateMultisampleRenderTarget=X,this.setupDepthRenderbuffer=rt,this.setupFrameBufferTexture=St,this.useMultisampledRTT=pt,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function B_(i,t){function e(n,s=wi){let r,o=fe.getTransfer(s);if(n===Qe)return i.UNSIGNED_BYTE;if(n===ol)return i.UNSIGNED_SHORT_4_4_4_4;if(n===al)return i.UNSIGNED_SHORT_5_5_5_1;if(n===wh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Th)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Mh)return i.BYTE;if(n===Sh)return i.SHORT;if(n===ar)return i.UNSIGNED_SHORT;if(n===rl)return i.INT;if(n===qn)return i.UNSIGNED_INT;if(n===Ln)return i.FLOAT;if(n===Xe)return i.HALF_FLOAT;if(n===Eh)return i.ALPHA;if(n===Ah)return i.RGB;if(n===vn)return i.RGBA;if(n===si)return i.DEPTH_COMPONENT;if(n===li)return i.DEPTH_STENCIL;if(n===ll)return i.RED;if(n===cl)return i.RED_INTEGER;if(n===Wi)return i.RG;if(n===hl)return i.RG_INTEGER;if(n===ul)return i.RGBA_INTEGER;if(n===Mo||n===So||n===wo||n===To)if(o===ye)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Mo)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===So)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===wo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===To)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Mo)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===So)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===wo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===To)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===dl||n===fl||n===pl||n===ml)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===dl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===fl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===pl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ml)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===gl||n===xl||n===vl||n===_l||n===yl||n===Eo||n===bl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===gl||n===xl)return o===ye?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===vl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===_l)return r.COMPRESSED_R11_EAC;if(n===yl)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Eo)return r.COMPRESSED_RG11_EAC;if(n===bl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Ml||n===Sl||n===wl||n===Tl||n===El||n===Al||n===Cl||n===Rl||n===Pl||n===Il||n===Ll||n===Dl||n===Nl||n===Ul)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Ml)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Sl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===wl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Tl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===El)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Al)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Cl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Rl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Pl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Il)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ll)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Dl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Nl)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ul)return o===ye?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Fl||n===Ol||n===Bl)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Fl)return o===ye?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ol)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Bl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===kl||n===zl||n===Ao||n===Vl)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===kl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===zl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Ao)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Vl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Hi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var k_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,z_=`
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

}`,eu=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new Zr(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Fe({vertexShader:k_,fragmentShader:z_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new be(new cs(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},nu=class extends Gn{constructor(t,e){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,f=null,u=null,d=null,g=null,y=typeof XRWebGLBinding<"u",m=new eu,p={},M=e.getContextAttributes(),E=null,x=null,w=[],S=[],T=new ft,v=null,b=new He;b.viewport=new Ae;let R=new He;R.viewport=new Ae;let P=[b,R],O=new ja,V=null,q=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Q){let mt=w[Q];return mt===void 0&&(mt=new Js,w[Q]=mt),mt.getTargetRaySpace()},this.getControllerGrip=function(Q){let mt=w[Q];return mt===void 0&&(mt=new Js,w[Q]=mt),mt.getGripSpace()},this.getHand=function(Q){let mt=w[Q];return mt===void 0&&(mt=new Js,w[Q]=mt),mt.getHandSpace()};function F(Q){let mt=S.indexOf(Q.inputSource);if(mt===-1)return;let ut=w[mt];ut!==void 0&&(ut.update(Q.inputSource,Q.frame,c||o),ut.dispatchEvent({type:Q.type,data:Q.inputSource}))}function z(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",z),s.removeEventListener("inputsourceschange",U);for(let Q=0;Q<w.length;Q++){let mt=S[Q];mt!==null&&(S[Q]=null,w[Q].disconnect(mt))}V=null,q=null,m.reset();for(let Q in p)delete p[Q];t.setRenderTarget(E),d=null,u=null,f=null,s=null,x=null,kt.stop(),n.isPresenting=!1,t.setPixelRatio(v),t.setSize(T.width,T.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Q){r=Q,n.isPresenting===!0&&jt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Q){a=Q,n.isPresenting===!0&&jt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Q){c=Q},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return f===null&&y&&(f=new XRWebGLBinding(s,e)),f},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Q){if(s=Q,s!==null){if(E=t.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",z),s.addEventListener("inputsourceschange",U),M.xrCompatible!==!0&&await e.makeXRCompatible(),v=t.getPixelRatio(),t.getSize(T),y&&"createProjectionLayer"in XRWebGLBinding.prototype){let ut=null,Ft=null,Mt=null;M.depth&&(Mt=M.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,ut=M.stencil?li:si,Ft=M.stencil?Hi:qn);let St={colorFormat:e.RGBA8,depthFormat:Mt,scaleFactor:r};f=this.getBinding(),u=f.createProjectionLayer(St),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),x=new Ie(u.textureWidth,u.textureHeight,{format:vn,type:Qe,depthTexture:new Wn(u.textureWidth,u.textureHeight,Ft,void 0,void 0,void 0,void 0,void 0,void 0,ut),stencilBuffer:M.stencil,colorSpace:t.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{let ut={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(s,e,ut),s.updateRenderState({baseLayer:d}),t.setPixelRatio(1),t.setSize(d.framebufferWidth,d.framebufferHeight,!1),x=new Ie(d.framebufferWidth,d.framebufferHeight,{format:vn,type:Qe,colorSpace:t.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),kt.setContext(s),kt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function U(Q){for(let mt=0;mt<Q.removed.length;mt++){let ut=Q.removed[mt],Ft=S.indexOf(ut);Ft>=0&&(S[Ft]=null,w[Ft].disconnect(ut))}for(let mt=0;mt<Q.added.length;mt++){let ut=Q.added[mt],Ft=S.indexOf(ut);if(Ft===-1){for(let St=0;St<w.length;St++)if(St>=S.length){S.push(ut),Ft=St;break}else if(S[St]===null){S[St]=ut,Ft=St;break}if(Ft===-1)break}let Mt=w[Ft];Mt&&Mt.connect(ut)}}let Y=new L,j=new L;function ht(Q,mt,ut){Y.setFromMatrixPosition(mt.matrixWorld),j.setFromMatrixPosition(ut.matrixWorld);let Ft=Y.distanceTo(j),Mt=mt.projectionMatrix.elements,St=ut.projectionMatrix.elements,te=Mt[14]/(Mt[10]-1),Vt=Mt[14]/(Mt[10]+1),rt=(Mt[9]+1)/Mt[5],N=(Mt[9]-1)/Mt[5],G=(Mt[8]-1)/Mt[0],at=(St[8]+1)/St[0],Z=te*G,Lt=te*at,X=Ft/(-G+at),Et=X*-G;if(mt.matrixWorld.decompose(Q.position,Q.quaternion,Q.scale),Q.translateX(Et),Q.translateZ(X),Q.matrixWorld.compose(Q.position,Q.quaternion,Q.scale),Q.matrixWorldInverse.copy(Q.matrixWorld).invert(),Mt[10]===-1)Q.projectionMatrix.copy(mt.projectionMatrix),Q.projectionMatrixInverse.copy(mt.projectionMatrixInverse);else{let pt=te+X,B=Vt+X,oe=Z-Et,It=Lt+(Ft-Et),A=rt*Vt/B*pt,_=N*Vt/B*pt;Q.projectionMatrix.makePerspective(oe,It,A,_,pt,B),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert()}}function ct(Q,mt){mt===null?Q.matrixWorld.copy(Q.matrix):Q.matrixWorld.multiplyMatrices(mt.matrixWorld,Q.matrix),Q.matrixWorldInverse.copy(Q.matrixWorld).invert()}this.updateCamera=function(Q){if(s===null)return;let mt=Q.near,ut=Q.far;m.texture!==null&&(m.depthNear>0&&(mt=m.depthNear),m.depthFar>0&&(ut=m.depthFar)),O.near=R.near=b.near=mt,O.far=R.far=b.far=ut,(V!==O.near||q!==O.far)&&(s.updateRenderState({depthNear:O.near,depthFar:O.far}),V=O.near,q=O.far),O.layers.mask=Q.layers.mask|6,b.layers.mask=O.layers.mask&-5,R.layers.mask=O.layers.mask&-3;let Ft=Q.parent,Mt=O.cameras;ct(O,Ft);for(let St=0;St<Mt.length;St++)ct(Mt[St],Ft);Mt.length===2?ht(O,b,R):O.projectionMatrix.copy(b.projectionMatrix),yt(Q,O,Ft)};function yt(Q,mt,ut){ut===null?Q.matrix.copy(mt.matrixWorld):(Q.matrix.copy(ut.matrixWorld),Q.matrix.invert(),Q.matrix.multiply(mt.matrixWorld)),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.updateMatrixWorld(!0),Q.projectionMatrix.copy(mt.projectionMatrix),Q.projectionMatrixInverse.copy(mt.projectionMatrixInverse),Q.isPerspectiveCamera&&(Q.fov=Zs*2*Math.atan(1/Q.projectionMatrix.elements[5]),Q.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(!(u===null&&d===null))return l},this.setFoveation=function(Q){l=Q,u!==null&&(u.fixedFoveation=Q),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=Q)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(O)},this.getCameraTexture=function(Q){return p[Q]};let xt=null;function Kt(Q,mt){if(h=mt.getViewerPose(c||o),g=mt,h!==null){let ut=h.views;d!==null&&(t.setRenderTargetFramebuffer(x,d.framebuffer),t.setRenderTarget(x));let Ft=!1;ut.length!==O.cameras.length&&(O.cameras.length=0,Ft=!0);for(let Vt=0;Vt<ut.length;Vt++){let rt=ut[Vt],N=null;if(d!==null)N=d.getViewport(rt);else{let at=f.getViewSubImage(u,rt);N=at.viewport,Vt===0&&(t.setRenderTargetTextures(x,at.colorTexture,at.depthStencilTexture),t.setRenderTarget(x))}let G=P[Vt];G===void 0&&(G=new He,G.layers.enable(Vt),G.viewport=new Ae,P[Vt]=G),G.matrix.fromArray(rt.transform.matrix),G.matrix.decompose(G.position,G.quaternion,G.scale),G.projectionMatrix.fromArray(rt.projectionMatrix),G.projectionMatrixInverse.copy(G.projectionMatrix).invert(),G.viewport.set(N.x,N.y,N.width,N.height),Vt===0&&(O.matrix.copy(G.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),Ft===!0&&O.cameras.push(G)}let Mt=s.enabledFeatures;if(Mt&&Mt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&y){f=n.getBinding();let Vt=f.getDepthInformation(ut[0]);Vt&&Vt.isValid&&Vt.texture&&m.init(Vt,s.renderState)}if(Mt&&Mt.includes("camera-access")&&y){t.state.unbindTexture(),f=n.getBinding();for(let Vt=0;Vt<ut.length;Vt++){let rt=ut[Vt].camera;if(rt){let N=p[rt];N||(N=new Zr,p[rt]=N);let G=f.getCameraImage(rt);N.sourceTexture=G}}}}for(let ut=0;ut<w.length;ut++){let Ft=S[ut],Mt=w[ut];Ft!==null&&Mt!==void 0&&Mt.update(Ft,mt,c||o)}xt&&xt(Q,mt),mt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:mt}),g=null}let kt=new hf;kt.setAnimationLoop(Kt),this.setAnimationLoop=function(Q){xt=Q},this.dispose=function(){}}},V_=new se,gf=new ne;gf.set(-1,0,0,0,1,0,0,0,1);function G_(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Dh(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,M,E,x){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(m,p):p.isMeshLambertMaterial?(r(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(m,p),f(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(m,p),u(m,p),p.isMeshPhysicalMaterial&&d(m,p,x)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),y(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,M,E):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===rn&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===rn&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let M=t.get(p),E=M.envMap,x=M.envMapRotation;E&&(m.envMap.value=E,m.envMapRotation.value.setFromMatrix4(V_.makeRotationFromEuler(x)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(gf),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,M,E){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*M,m.scale.value=E*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,M){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===rn&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=M.texture,m.transmissionSamplerSize.value.set(M.width,M.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function y(m,p){let M=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(M.matrixWorld),m.nearDistance.value=M.shadow.camera.near,m.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function H_(i,t,e,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(x,w){let S=w.program;n.uniformBlockBinding(x,S)}function c(x,w){let S=s[x.id];S===void 0&&(m(x),S=h(x),s[x.id]=S,x.addEventListener("dispose",M));let T=w.program;n.updateUBOMapping(x,T);let v=t.render.frame;r[x.id]!==v&&(u(x),r[x.id]=v)}function h(x){let w=f();x.__bindingPointIndex=w;let S=i.createBuffer(),T=x.__size,v=x.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,T,v),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,w,S),S}function f(){for(let x=0;x<a;x++)if(o.indexOf(x)===-1)return o.push(x),x;return Qt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(x){let w=s[x.id],S=x.uniforms,T=x.__cache;i.bindBuffer(i.UNIFORM_BUFFER,w);for(let v=0,b=S.length;v<b;v++){let R=S[v];if(Array.isArray(R))for(let P=0,O=R.length;P<O;P++)d(R[P],v,P,T);else d(R,v,0,T)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function d(x,w,S,T){if(y(x,w,S,T)===!0){let v=x.__offset,b=x.value;if(Array.isArray(b)){let R=0;for(let P=0;P<b.length;P++){let O=b[P],V=p(O);g(O,x.__data,R),typeof O!="number"&&typeof O!="boolean"&&!O.isMatrix3&&!ArrayBuffer.isView(O)&&(R+=V.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(b,x.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,v,x.__data)}}function g(x,w,S){typeof x=="number"||typeof x=="boolean"?w[0]=x:x.isMatrix3?(w[0]=x.elements[0],w[1]=x.elements[1],w[2]=x.elements[2],w[3]=0,w[4]=x.elements[3],w[5]=x.elements[4],w[6]=x.elements[5],w[7]=0,w[8]=x.elements[6],w[9]=x.elements[7],w[10]=x.elements[8],w[11]=0):ArrayBuffer.isView(x)?w.set(new x.constructor(x.buffer,x.byteOffset,w.length)):x.toArray(w,S)}function y(x,w,S,T){let v=x.value,b=w+"_"+S;if(T[b]===void 0)return typeof v=="number"||typeof v=="boolean"?T[b]=v:ArrayBuffer.isView(v)?T[b]=v.slice():T[b]=v.clone(),!0;{let R=T[b];if(typeof v=="number"||typeof v=="boolean"){if(R!==v)return T[b]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(R.equals(v)===!1)return R.copy(v),!0}}return!1}function m(x){let w=x.uniforms,S=0,T=16;for(let b=0,R=w.length;b<R;b++){let P=Array.isArray(w[b])?w[b]:[w[b]];for(let O=0,V=P.length;O<V;O++){let q=P[O],F=Array.isArray(q.value)?q.value:[q.value];for(let z=0,U=F.length;z<U;z++){let Y=F[z],j=p(Y),ht=S%T,ct=ht%j.boundary,yt=ht+ct;S+=ct,yt!==0&&T-yt<j.storage&&(S+=T-yt),q.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),q.__offset=S,S+=j.storage}}}let v=S%T;return v>0&&(S+=T-v),x.__size=S,x.__cache={},this}function p(x){let w={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(w.boundary=4,w.storage=4):x.isVector2?(w.boundary=8,w.storage=8):x.isVector3||x.isColor?(w.boundary=16,w.storage=12):x.isVector4?(w.boundary=16,w.storage=16):x.isMatrix3?(w.boundary=48,w.storage=48):x.isMatrix4?(w.boundary=64,w.storage=64):x.isTexture?jt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(w.boundary=16,w.storage=x.byteLength):jt("WebGLRenderer: Unsupported uniform value type.",x),w}function M(x){let w=x.target;w.removeEventListener("dispose",M);let S=o.indexOf(w.__bindingPointIndex);o.splice(S,1),i.deleteBuffer(s[w.id]),delete s[w.id],delete r[w.id]}function E(){for(let x in s)i.deleteBuffer(s[x]);o=[],s={},r={}}return{bind:l,update:c,dispose:E}}var W_=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),hi=null;function X_(){return hi===null&&(hi=new Hn(W_,16,16,Wi,Xe),hi.name="DFG_LUT",hi.minFilter=nn,hi.magFilter=nn,hi.wrapS=ni,hi.wrapT=ni,hi.generateMipmaps=!1,hi.needsUpdate=!0),hi}var Yl=class{constructor(t={}){let{canvas:e=Id(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:u=!1,outputBufferType:d=Qe}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;let y=d,m=new Set([ul,hl,cl]),p=new Set([Qe,qn,ar,Hi,ol,al]),M=new Uint32Array(4),E=new Int32Array(4),x=new L,w=null,S=null,T=[],v=[],b=null;this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Xn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,P=!1,O=null,V=null,q=null,F=null;this._outputColorSpace=en;let z=0,U=0,Y=null,j=-1,ht=null,ct=new Ae,yt=new Ae,xt=null,Kt=new Bt(0),kt=0,Q=e.width,mt=e.height,ut=1,Ft=null,Mt=null,St=new Ae(0,0,Q,mt),te=new Ae(0,0,Q,mt),Vt=!1,rt=new Qs,N=!1,G=!1,at=new se,Z=new L,Lt=new Ae,X={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Et=!1;function pt(){return Y===null?ut:1}let B=n;function oe(C,W){return e.getContext(C,W)}try{let C={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"185"}`),e.addEventListener("webglcontextlost",ve,!1),e.addEventListener("webglcontextrestored",ae,!1),e.addEventListener("webglcontextcreationerror",mn,!1),B===null){let W="webgl2";if(B=oe(W,C),B===null)throw oe(W)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(C){throw Qt("WebGLRenderer: "+C.message),C}let It,A,_,H,$,nt,gt,bt,tt,lt,st,Xt,Tt,wt,Wt,Zt,Jt,k,Ct,it,Pt,Dt,dt;function vt(){It=new jx(B),It.init(),Pt=new B_(B,It),A=new Wx(B,It,t,Pt),_=new F_(B,It),A.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),V=B.createFramebuffer(),q=B.createFramebuffer(),F=B.createFramebuffer(),H=new ev(B),$=new M_,nt=new O_(B,It,_,$,A,Pt,H),gt=new Jx(R),bt=new rg(B),Dt=new Gx(B,bt),tt=new Qx(B,bt,H,Dt),lt=new iv(B,tt,bt,Dt,H),k=new nv(B,A,nt),Wt=new Xx($),st=new b_(R,gt,It,A,Dt,Wt),Xt=new G_(R,$),Tt=new w_,wt=new P_(It),Jt=new Vx(R,gt,_,lt,g,l),Zt=new U_(R,lt,A),dt=new H_(B,H,A,_),Ct=new Hx(B,It,H),it=new tv(B,It,H),H.programs=st.programs,R.capabilities=A,R.extensions=It,R.properties=$,R.renderLists=Tt,R.shadowMap=Zt,R.state=_,R.info=H}vt(),y!==Qe&&(b=new rv(y,e.width,e.height,a,s,r));let Gt=new nu(R,B);this.xr=Gt,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let C=It.get("WEBGL_lose_context");C&&C.loseContext()},this.forceContextRestore=function(){let C=It.get("WEBGL_lose_context");C&&C.restoreContext()},this.getPixelRatio=function(){return ut},this.setPixelRatio=function(C){C!==void 0&&(ut=C,this.setSize(Q,mt,!1))},this.getSize=function(C){return C.set(Q,mt)},this.setSize=function(C,W,et=!0){if(Gt.isPresenting){jt("WebGLRenderer: Can't change size while VR device is presenting.");return}Q=C,mt=W,e.width=Math.floor(C*ut),e.height=Math.floor(W*ut),et===!0&&(e.style.width=C+"px",e.style.height=W+"px"),b!==null&&b.setSize(e.width,e.height),this.setViewport(0,0,C,W)},this.getDrawingBufferSize=function(C){return C.set(Q*ut,mt*ut).floor()},this.setDrawingBufferSize=function(C,W,et){Q=C,mt=W,ut=et,e.width=Math.floor(C*et),e.height=Math.floor(W*et),this.setViewport(0,0,C,W)},this.setEffects=function(C){if(y===Qe){Qt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(C){for(let W=0;W<C.length;W++)if(C[W].isOutputPass===!0){jt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}b.setEffects(C||[])},this.getCurrentViewport=function(C){return C.copy(ct)},this.getViewport=function(C){return C.copy(St)},this.setViewport=function(C,W,et,J){C.isVector4?St.set(C.x,C.y,C.z,C.w):St.set(C,W,et,J),_.viewport(ct.copy(St).multiplyScalar(ut).round())},this.getScissor=function(C){return C.copy(te)},this.setScissor=function(C,W,et,J){C.isVector4?te.set(C.x,C.y,C.z,C.w):te.set(C,W,et,J),_.scissor(yt.copy(te).multiplyScalar(ut).round())},this.getScissorTest=function(){return Vt},this.setScissorTest=function(C){_.setScissorTest(Vt=C)},this.setOpaqueSort=function(C){Ft=C},this.setTransparentSort=function(C){Mt=C},this.getClearColor=function(C){return C.copy(Jt.getClearColor())},this.setClearColor=function(){Jt.setClearColor(...arguments)},this.getClearAlpha=function(){return Jt.getClearAlpha()},this.setClearAlpha=function(){Jt.setClearAlpha(...arguments)},this.clear=function(C=!0,W=!0,et=!0){let J=0;if(C){let K=!1;if(Y!==null){let Nt=Y.texture.format;K=m.has(Nt)}if(K){let Nt=Y.texture.type,zt=p.has(Nt),At=Jt.getClearColor(),qt=Jt.getClearAlpha(),Yt=At.r,ie=At.g,le=At.b;zt?(M[0]=Yt,M[1]=ie,M[2]=le,M[3]=qt,B.clearBufferuiv(B.COLOR,0,M)):(E[0]=Yt,E[1]=ie,E[2]=le,E[3]=qt,B.clearBufferiv(B.COLOR,0,E))}else J|=B.COLOR_BUFFER_BIT}W&&(J|=B.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),et&&(J|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),J!==0&&B.clear(J)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(C){C.setRenderer(this),O=C},this.dispose=function(){e.removeEventListener("webglcontextlost",ve,!1),e.removeEventListener("webglcontextrestored",ae,!1),e.removeEventListener("webglcontextcreationerror",mn,!1),Jt.dispose(),Tt.dispose(),wt.dispose(),$.dispose(),gt.dispose(),lt.dispose(),Dt.dispose(),dt.dispose(),st.dispose(),Gt.dispose(),Gt.removeEventListener("sessionstart",yr),Gt.removeEventListener("sessionend",ws),pi.stop()};function ve(C){C.preventDefault(),Rh("WebGLRenderer: Context Lost."),P=!0}function ae(){Rh("WebGLRenderer: Context Restored."),P=!1;let C=H.autoReset,W=Zt.enabled,et=Zt.autoUpdate,J=Zt.needsUpdate,K=Zt.type;vt(),H.autoReset=C,Zt.enabled=W,Zt.autoUpdate=et,Zt.needsUpdate=J,Zt.type=K}function mn(C){Qt("WebGLRenderer: A WebGL context could not be created. Reason: ",C.statusMessage)}function de(C){let W=C.target;W.removeEventListener("dispose",de),Jn(W)}function Jn(C){Ms(C),$.remove(C)}function Ms(C){let W=$.get(C).programs;W!==void 0&&(W.forEach(function(et){st.releaseProgram(et)}),C.isShaderMaterial&&st.releaseShaderCache(C))}this.renderBufferDirect=function(C,W,et,J,K,Nt){W===null&&(W=X);let zt=K.isMesh&&K.matrixWorld.determinantAffine()<0,At=Wo(C,W,et,J,K);_.setMaterial(J,zt);let qt=et.index,Yt=1;if(J.wireframe===!0){if(qt=tt.getWireframeAttribute(et),qt===void 0)return;Yt=2}let ie=et.drawRange,le=et.attributes.position,$t=ie.start*Yt,_e=(ie.start+ie.count)*Yt;Nt!==null&&($t=Math.max($t,Nt.start*Yt),_e=Math.min(_e,(Nt.start+Nt.count)*Yt)),qt!==null?($t=Math.max($t,0),_e=Math.min(_e,qt.count)):le!=null&&($t=Math.max($t,0),_e=Math.min(_e,le.count));let Le=_e-$t;if(Le<0||Le===1/0)return;Dt.setup(K,J,At,et,qt);let xe,Me=Ct;if(qt!==null&&(xe=bt.get(qt),Me=it,Me.setIndex(xe)),K.isMesh)J.wireframe===!0?(_.setLineWidth(J.wireframeLinewidth*pt()),Me.setMode(B.LINES)):Me.setMode(B.TRIANGLES);else if(K.isLine){let $e=J.linewidth;$e===void 0&&($e=1),_.setLineWidth($e*pt()),K.isLineSegments?Me.setMode(B.LINES):K.isLineLoop?Me.setMode(B.LINE_LOOP):Me.setMode(B.LINE_STRIP)}else K.isPoints?Me.setMode(B.POINTS):K.isSprite&&Me.setMode(B.TRIANGLES);if(K.isBatchedMesh)if(It.get("WEBGL_multi_draw"))Me.renderMultiDraw(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount);else{let $e=K._multiDrawStarts,Ot=K._multiDrawCounts,an=K._multiDrawCount,ge=qt?bt.get(qt).bytesPerElement:1,Ve=$.get(J).currentProgram.getUniforms();for(let yn=0;yn<an;yn++)Ve.setValue(B,"_gl_DrawID",yn),Me.render($e[yn]/ge,Ot[yn])}else if(K.isInstancedMesh)Me.renderInstances($t,Le,K.count);else if(et.isInstancedBufferGeometry){let $e=et._maxInstanceCount!==void 0?et._maxInstanceCount:1/0,Ot=Math.min(et.instanceCount,$e);Me.renderInstances($t,Le,Ot)}else Me.render($t,Le)};function Oe(C,W,et){C.transparent===!0&&C.side===ai&&C.forceSinglePass===!1?(C.side=rn,C.needsUpdate=!0,jn(C,W,et),C.side=Mi,C.needsUpdate=!0,jn(C,W,et),C.side=ai):jn(C,W,et)}this.compile=function(C,W,et=null){et===null&&(et=C),S=wt.get(et),S.init(W),v.push(S),et.traverseVisible(function(K){K.isLight&&K.layers.test(W.layers)&&(S.pushLight(K),K.castShadow&&S.pushShadow(K))}),C!==et&&C.traverseVisible(function(K){K.isLight&&K.layers.test(W.layers)&&(S.pushLight(K),K.castShadow&&S.pushShadow(K))}),S.setupLights();let J=new Set;return C.traverse(function(K){if(!(K.isMesh||K.isPoints||K.isLine||K.isSprite))return;let Nt=K.material;if(Nt)if(Array.isArray(Nt))for(let zt=0;zt<Nt.length;zt++){let At=Nt[zt];Oe(At,et,K),J.add(At)}else Oe(Nt,et,K),J.add(Nt)}),S=v.pop(),J},this.compileAsync=function(C,W,et=null){let J=this.compile(C,W,et);return new Promise(K=>{function Nt(){if(J.forEach(function(zt){$.get(zt).currentProgram.isReady()&&J.delete(zt)}),J.size===0){K(C);return}setTimeout(Nt,10)}It.get("KHR_parallel_shader_compile")!==null?Nt():setTimeout(Nt,10)})};let Ss=null;function _c(C){Ss&&Ss(C)}function yr(){pi.stop()}function ws(){pi.start()}let pi=new hf;pi.setAnimationLoop(_c),typeof self<"u"&&pi.setContext(self),this.setAnimationLoop=function(C){Ss=C,Gt.setAnimationLoop(C),C===null?pi.stop():pi.start()},Gt.addEventListener("sessionstart",yr),Gt.addEventListener("sessionend",ws),this.render=function(C,W){if(W!==void 0&&W.isCamera!==!0){Qt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;O!==null&&O.renderStart(C,W);let et=Gt.enabled===!0&&Gt.isPresenting===!0,J=b!==null&&(Y===null||et)&&b.begin(R,Y);if(C.matrixWorldAutoUpdate===!0&&C.updateMatrixWorld(),W.parent===null&&W.matrixWorldAutoUpdate===!0&&W.updateMatrixWorld(),Gt.enabled===!0&&Gt.isPresenting===!0&&(b===null||b.isCompositing()===!1)&&(Gt.cameraAutoUpdate===!0&&Gt.updateCamera(W),W=Gt.getCamera()),C.isScene===!0&&C.onBeforeRender(R,C,W,Y),S=wt.get(C,v.length),S.init(W),S.state.textureUnits=nt.getTextureUnits(),v.push(S),at.multiplyMatrices(W.projectionMatrix,W.matrixWorldInverse),rt.setFromProjectionMatrix(at,Vn,W.reversedDepth),G=this.localClippingEnabled,N=Wt.init(this.clippingPlanes,G),w=Tt.get(C,T.length),w.init(),T.push(w),Gt.enabled===!0&&Gt.isPresenting===!0){let zt=R.xr.getDepthSensingMesh();zt!==null&&br(zt,W,-1/0,R.sortObjects)}br(C,W,0,R.sortObjects),w.finish(),R.sortObjects===!0&&w.sort(Ft,Mt,W.reversedDepth),Et=Gt.enabled===!1||Gt.isPresenting===!1||Gt.hasDepthSensing()===!1,Et&&Jt.addToRenderList(w,C),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),N===!0&&Wt.beginShadows();let K=S.state.shadowsArray;if(Zt.render(K,C,W),N===!0&&Wt.endShadows(),(J&&b.hasRenderPass())===!1){let zt=w.opaque,At=w.transmissive;if(S.setupLights(),W.isArrayCamera){let qt=W.cameras;if(At.length>0)for(let Yt=0,ie=qt.length;Yt<ie;Yt++){let le=qt[Yt];Mr(zt,At,C,le)}Et&&Jt.render(C);for(let Yt=0,ie=qt.length;Yt<ie;Yt++){let le=qt[Yt];Ts(w,C,le,le.viewport)}}else At.length>0&&Mr(zt,At,C,W),Et&&Jt.render(C),Ts(w,C,W)}Y!==null&&U===0&&(nt.updateMultisampleRenderTarget(Y),nt.updateRenderTargetMipmap(Y)),J&&b.end(R),C.isScene===!0&&C.onAfterRender(R,C,W),Dt.resetDefaultState(),j=-1,ht=null,v.pop(),v.length>0?(S=v[v.length-1],nt.setTextureUnits(S.state.textureUnits),N===!0&&Wt.setGlobalState(R.clippingPlanes,S.state.camera)):S=null,T.pop(),T.length>0?w=T[T.length-1]:w=null,O!==null&&O.renderEnd()};function br(C,W,et,J){if(C.visible===!1)return;if(C.layers.test(W.layers)){if(C.isGroup)et=C.renderOrder;else if(C.isLOD)C.autoUpdate===!0&&C.update(W);else if(C.isLightProbeGrid)S.pushLightProbeGrid(C);else if(C.isLight)S.pushLight(C),C.castShadow&&S.pushShadow(C);else if(C.isSprite){if(!C.frustumCulled||rt.intersectsSprite(C)){J&&Lt.setFromMatrixPosition(C.matrixWorld).applyMatrix4(at);let zt=lt.update(C),At=C.material;At.visible&&w.push(C,zt,At,et,Lt.z,null)}}else if((C.isMesh||C.isLine||C.isPoints)&&(!C.frustumCulled||rt.intersectsObject(C))){let zt=lt.update(C),At=C.material;if(J&&(C.boundingSphere!==void 0?(C.boundingSphere===null&&C.computeBoundingSphere(),Lt.copy(C.boundingSphere.center)):(zt.boundingSphere===null&&zt.computeBoundingSphere(),Lt.copy(zt.boundingSphere.center)),Lt.applyMatrix4(C.matrixWorld).applyMatrix4(at)),Array.isArray(At)){let qt=zt.groups;for(let Yt=0,ie=qt.length;Yt<ie;Yt++){let le=qt[Yt],$t=At[le.materialIndex];$t&&$t.visible&&w.push(C,zt,$t,et,Lt.z,le)}}else At.visible&&w.push(C,zt,At,et,Lt.z,null)}}let Nt=C.children;for(let zt=0,At=Nt.length;zt<At;zt++)br(Nt[zt],W,et,J)}function Ts(C,W,et,J){let{opaque:K,transmissive:Nt,transparent:zt}=C;S.setupLightsView(et),N===!0&&Wt.setGlobalState(R.clippingPlanes,et),J&&_.viewport(ct.copy(J)),K.length>0&&Zi(K,W,et),Nt.length>0&&Zi(Nt,W,et),zt.length>0&&Zi(zt,W,et),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function Mr(C,W,et,J){if((et.isScene===!0?et.overrideMaterial:null)!==null)return;if(S.state.transmissionRenderTarget[J.id]===void 0){let $t=It.has("EXT_color_buffer_half_float")||It.has("EXT_color_buffer_float");S.state.transmissionRenderTarget[J.id]=new Ie(1,1,{generateMipmaps:!0,type:$t?Xe:Qe,minFilter:Gi,samples:Math.max(4,A.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:fe.workingColorSpace})}let Nt=S.state.transmissionRenderTarget[J.id],zt=J.viewport||ct;Nt.setSize(zt.z*R.transmissionResolutionScale,zt.w*R.transmissionResolutionScale);let At=R.getRenderTarget(),qt=R.getActiveCubeFace(),Yt=R.getActiveMipmapLevel();R.setRenderTarget(Nt),R.getClearColor(Kt),kt=R.getClearAlpha(),kt<1&&R.setClearColor(16777215,.5),R.clear(),Et&&Jt.render(et);let ie=R.toneMapping;R.toneMapping=Xn;let le=J.viewport;if(J.viewport!==void 0&&(J.viewport=void 0),S.setupLightsView(J),N===!0&&Wt.setGlobalState(R.clippingPlanes,J),Zi(C,et,J),nt.updateMultisampleRenderTarget(Nt),nt.updateRenderTargetMipmap(Nt),It.has("WEBGL_multisampled_render_to_texture")===!1){let $t=!1;for(let _e=0,Le=W.length;_e<Le;_e++){let xe=W[_e],{object:Me,geometry:$e,material:Ot,group:an}=xe;if(Ot.side===ai&&Me.layers.test(J.layers)){let ge=Ot.side;Ot.side=rn,Ot.needsUpdate=!0,Es(Me,et,J,$e,Ot,an),Ot.side=ge,Ot.needsUpdate=!0,$t=!0}}$t===!0&&(nt.updateMultisampleRenderTarget(Nt),nt.updateRenderTargetMipmap(Nt))}R.setRenderTarget(At,qt,Yt),R.setClearColor(Kt,kt),le!==void 0&&(J.viewport=le),R.toneMapping=ie}function Zi(C,W,et){let J=W.isScene===!0?W.overrideMaterial:null;for(let K=0,Nt=C.length;K<Nt;K++){let zt=C[K],{object:At,geometry:qt,group:Yt}=zt,ie=zt.material;ie.allowOverride===!0&&J!==null&&(ie=J),At.layers.test(et.layers)&&Es(At,W,et,qt,ie,Yt)}}function Es(C,W,et,J,K,Nt){C.onBeforeRender(R,W,et,J,K,Nt),C.modelViewMatrix.multiplyMatrices(et.matrixWorldInverse,C.matrixWorld),C.normalMatrix.getNormalMatrix(C.modelViewMatrix),K.onBeforeRender(R,W,et,J,C,Nt),K.transparent===!0&&K.side===ai&&K.forceSinglePass===!1?(K.side=rn,K.needsUpdate=!0,R.renderBufferDirect(et,W,J,K,C,Nt),K.side=Mi,K.needsUpdate=!0,R.renderBufferDirect(et,W,J,K,C,Nt),K.side=ai):R.renderBufferDirect(et,W,J,K,C,Nt),C.onAfterRender(R,W,et,J,K,Nt)}function jn(C,W,et){W.isScene!==!0&&(W=X);let J=$.get(C),K=S.state.lights,Nt=S.state.shadowsArray,zt=K.state.version,At=st.getParameters(C,K.state,Nt,W,et,S.state.lightProbeGridArray),qt=st.getProgramCacheKey(At),Yt=J.programs;J.environment=C.isMeshStandardMaterial||C.isMeshLambertMaterial||C.isMeshPhongMaterial?W.environment:null,J.fog=W.fog;let ie=C.isMeshStandardMaterial||C.isMeshLambertMaterial&&!C.envMap||C.isMeshPhongMaterial&&!C.envMap;J.envMap=gt.get(C.envMap||J.environment,ie),J.envMapRotation=J.environment!==null&&C.envMap===null?W.environmentRotation:C.envMapRotation,Yt===void 0&&(C.addEventListener("dispose",de),Yt=new Map,J.programs=Yt);let le=Yt.get(qt);if(le!==void 0){if(J.currentProgram===le&&J.lightsStateVersion===zt)return Sr(C,At),le}else At.uniforms=st.getUniforms(C),O!==null&&C.isNodeMaterial&&O.build(C,et,At),C.onBeforeCompile(At,R),le=st.acquireProgram(At,qt),Yt.set(qt,le),J.uniforms=At.uniforms;let $t=J.uniforms;return(!C.isShaderMaterial&&!C.isRawShaderMaterial||C.clipping===!0)&&($t.clippingPlanes=Wt.uniform),Sr(C,At),J.needsLights=Qn(C),J.lightsStateVersion=zt,J.needsLights&&($t.ambientLightColor.value=K.state.ambient,$t.lightProbe.value=K.state.probe,$t.directionalLights.value=K.state.directional,$t.directionalLightShadows.value=K.state.directionalShadow,$t.spotLights.value=K.state.spot,$t.spotLightShadows.value=K.state.spotShadow,$t.rectAreaLights.value=K.state.rectArea,$t.ltc_1.value=K.state.rectAreaLTC1,$t.ltc_2.value=K.state.rectAreaLTC2,$t.pointLights.value=K.state.point,$t.pointLightShadows.value=K.state.pointShadow,$t.hemisphereLights.value=K.state.hemi,$t.directionalShadowMatrix.value=K.state.directionalShadowMatrix,$t.spotLightMatrix.value=K.state.spotLightMatrix,$t.spotLightMap.value=K.state.spotLightMap,$t.pointShadowMatrix.value=K.state.pointShadowMatrix),J.lightProbeGrid=S.state.lightProbeGridArray.length>0,J.currentProgram=le,J.uniformsList=null,le}function Ai(C){if(C.uniformsList===null){let W=C.currentProgram.getUniforms();C.uniformsList=hr.seqWithValue(W.seq,C.uniforms)}return C.uniformsList}function Sr(C,W){let et=$.get(C);et.outputColorSpace=W.outputColorSpace,et.batching=W.batching,et.batchingColor=W.batchingColor,et.instancing=W.instancing,et.instancingColor=W.instancingColor,et.instancingMorph=W.instancingMorph,et.skinning=W.skinning,et.morphTargets=W.morphTargets,et.morphNormals=W.morphNormals,et.morphColors=W.morphColors,et.morphTargetsCount=W.morphTargetsCount,et.numClippingPlanes=W.numClippingPlanes,et.numIntersection=W.numClipIntersection,et.vertexAlphas=W.vertexAlphas,et.vertexTangents=W.vertexTangents,et.toneMapping=W.toneMapping}function Ho(C,W){if(C.length===0)return null;if(C.length===1)return C[0].texture!==null?C[0]:null;x.setFromMatrixPosition(W.matrixWorld);for(let et=0,J=C.length;et<J;et++){let K=C[et];if(K.texture!==null&&K.boundingBox.containsPoint(x))return K}return null}function Wo(C,W,et,J,K){W.isScene!==!0&&(W=X),nt.resetTextureUnits();let Nt=W.fog,zt=J.isMeshStandardMaterial||J.isMeshLambertMaterial||J.isMeshPhongMaterial?W.environment:null,At=Y===null?R.outputColorSpace:Y.isXRRenderTarget===!0?Y.texture.colorSpace:fe.workingColorSpace,qt=J.isMeshStandardMaterial||J.isMeshLambertMaterial&&!J.envMap||J.isMeshPhongMaterial&&!J.envMap,Yt=gt.get(J.envMap||zt,qt),ie=J.vertexColors===!0&&!!et.attributes.color&&et.attributes.color.itemSize===4,le=!!et.attributes.tangent&&(!!J.normalMap||J.anisotropy>0),$t=!!et.morphAttributes.position,_e=!!et.morphAttributes.normal,Le=!!et.morphAttributes.color,xe=Xn;J.toneMapped&&(Y===null||Y.isXRRenderTarget===!0)&&(xe=R.toneMapping);let Me=et.morphAttributes.position||et.morphAttributes.normal||et.morphAttributes.color,$e=Me!==void 0?Me.length:0,Ot=$.get(J),an=S.state.lights;if(N===!0&&(G===!0||C!==ht)){let we=C===ht&&J.id===j;Wt.setState(J,C,we)}let ge=!1;J.version===Ot.__version?(Ot.needsLights&&Ot.lightsStateVersion!==an.state.version||Ot.outputColorSpace!==At||K.isBatchedMesh&&Ot.batching===!1||!K.isBatchedMesh&&Ot.batching===!0||K.isBatchedMesh&&Ot.batchingColor===!0&&K.colorTexture===null||K.isBatchedMesh&&Ot.batchingColor===!1&&K.colorTexture!==null||K.isInstancedMesh&&Ot.instancing===!1||!K.isInstancedMesh&&Ot.instancing===!0||K.isSkinnedMesh&&Ot.skinning===!1||!K.isSkinnedMesh&&Ot.skinning===!0||K.isInstancedMesh&&Ot.instancingColor===!0&&K.instanceColor===null||K.isInstancedMesh&&Ot.instancingColor===!1&&K.instanceColor!==null||K.isInstancedMesh&&Ot.instancingMorph===!0&&K.morphTexture===null||K.isInstancedMesh&&Ot.instancingMorph===!1&&K.morphTexture!==null||Ot.envMap!==Yt||J.fog===!0&&Ot.fog!==Nt||Ot.numClippingPlanes!==void 0&&(Ot.numClippingPlanes!==Wt.numPlanes||Ot.numIntersection!==Wt.numIntersection)||Ot.vertexAlphas!==ie||Ot.vertexTangents!==le||Ot.morphTargets!==$t||Ot.morphNormals!==_e||Ot.morphColors!==Le||Ot.toneMapping!==xe||Ot.morphTargetsCount!==$e||!!Ot.lightProbeGrid!=S.state.lightProbeGridArray.length>0)&&(ge=!0):(ge=!0,Ot.__version=J.version);let Ve=Ot.currentProgram;ge===!0&&(Ve=jn(J,W,K),O&&J.isNodeMaterial&&O.onUpdateProgram(J,Ve,Ot));let yn=!1,gn=!1,xn=!1,Se=Ve.getUniforms(),Re=Ot.uniforms;if(_.useProgram(Ve.program)&&(yn=!0,gn=!0,xn=!0),J.id!==j&&(j=J.id,gn=!0),Ot.needsLights){let we=Ho(S.state.lightProbeGridArray,K);Ot.lightProbeGrid!==we&&(Ot.lightProbeGrid=we,gn=!0)}if(yn||ht!==C){_.buffers.depth.getReversed()&&C.reversedDepth!==!0&&(C._reversedDepth=!0,C.updateProjectionMatrix()),Se.setValue(B,"projectionMatrix",C.projectionMatrix),Se.setValue(B,"viewMatrix",C.matrixWorldInverse);let On=Se.map.cameraPosition;On!==void 0&&On.setValue(B,Z.setFromMatrixPosition(C.matrixWorld)),A.logarithmicDepthBuffer&&Se.setValue(B,"logDepthBufFC",2/(Math.log(C.far+1)/Math.LN2)),(J.isMeshPhongMaterial||J.isMeshToonMaterial||J.isMeshLambertMaterial||J.isMeshBasicMaterial||J.isMeshStandardMaterial||J.isShaderMaterial)&&Se.setValue(B,"isOrthographic",C.isOrthographicCamera===!0),ht!==C&&(ht=C,gn=!0,xn=!0)}if(Ot.needsLights&&(an.state.directionalShadowMap.length>0&&Se.setValue(B,"directionalShadowMap",an.state.directionalShadowMap,nt),an.state.spotShadowMap.length>0&&Se.setValue(B,"spotShadowMap",an.state.spotShadowMap,nt),an.state.pointShadowMap.length>0&&Se.setValue(B,"pointShadowMap",an.state.pointShadowMap,nt)),K.isSkinnedMesh){Se.setOptional(B,K,"bindMatrix"),Se.setOptional(B,K,"bindMatrixInverse");let we=K.skeleton;we&&(we.boneTexture===null&&we.computeBoneTexture(),Se.setValue(B,"boneTexture",we.boneTexture,nt))}K.isBatchedMesh&&(Se.setOptional(B,K,"batchingTexture"),Se.setValue(B,"batchingTexture",K._matricesTexture,nt),Se.setOptional(B,K,"batchingIdTexture"),Se.setValue(B,"batchingIdTexture",K._indirectTexture,nt),Se.setOptional(B,K,"batchingColorTexture"),K._colorsTexture!==null&&Se.setValue(B,"batchingColorTexture",K._colorsTexture,nt));let Fn=et.morphAttributes;if((Fn.position!==void 0||Fn.normal!==void 0||Fn.color!==void 0)&&k.update(K,et,Ve),(gn||Ot.receiveShadow!==K.receiveShadow)&&(Ot.receiveShadow=K.receiveShadow,Se.setValue(B,"receiveShadow",K.receiveShadow)),(J.isMeshStandardMaterial||J.isMeshLambertMaterial||J.isMeshPhongMaterial)&&J.envMap===null&&W.environment!==null&&(Re.envMapIntensity.value=W.environmentIntensity),Re.dfgLUT!==void 0&&(Re.dfgLUT.value=X_()),gn){if(Se.setValue(B,"toneMappingExposure",R.toneMappingExposure),Ot.needsLights&&wr(Re,xn),Nt&&J.fog===!0&&Xt.refreshFogUniforms(Re,Nt),Xt.refreshMaterialUniforms(Re,J,ut,mt,S.state.transmissionRenderTarget[C.id]),Ot.needsLights&&Ot.lightProbeGrid){let we=Ot.lightProbeGrid;Re.probesSH.value=we.texture,Re.probesMin.value.copy(we.boundingBox.min),Re.probesMax.value.copy(we.boundingBox.max),Re.probesResolution.value.copy(we.resolution)}hr.upload(B,Ai(Ot),Re,nt)}if(J.isShaderMaterial&&J.uniformsNeedUpdate===!0&&(hr.upload(B,Ai(Ot),Re,nt),J.uniformsNeedUpdate=!1),J.isSpriteMaterial&&Se.setValue(B,"center",K.center),Se.setValue(B,"modelViewMatrix",K.modelViewMatrix),Se.setValue(B,"normalMatrix",K.normalMatrix),Se.setValue(B,"modelMatrix",K.matrixWorld),J.uniformsGroups!==void 0){let we=J.uniformsGroups;for(let On=0,ti=we.length;On<ti;On++){let Tr=we[On];dt.update(Tr,Ve),dt.bind(Tr,Ve)}}return Ve}function wr(C,W){C.ambientLightColor.needsUpdate=W,C.lightProbe.needsUpdate=W,C.directionalLights.needsUpdate=W,C.directionalLightShadows.needsUpdate=W,C.pointLights.needsUpdate=W,C.pointLightShadows.needsUpdate=W,C.spotLights.needsUpdate=W,C.spotLightShadows.needsUpdate=W,C.rectAreaLights.needsUpdate=W,C.hemisphereLights.needsUpdate=W}function Qn(C){return C.isMeshLambertMaterial||C.isMeshToonMaterial||C.isMeshPhongMaterial||C.isMeshStandardMaterial||C.isShadowMaterial||C.isShaderMaterial&&C.lights===!0}this.getActiveCubeFace=function(){return z},this.getActiveMipmapLevel=function(){return U},this.getRenderTarget=function(){return Y},this.setRenderTargetTextures=function(C,W,et){let J=$.get(C);J.__autoAllocateDepthBuffer=C.resolveDepthBuffer===!1,J.__autoAllocateDepthBuffer===!1&&(J.__useRenderToTexture=!1),$.get(C.texture).__webglTexture=W,$.get(C.depthTexture).__webglTexture=J.__autoAllocateDepthBuffer?void 0:et,J.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(C,W){let et=$.get(C);et.__webglFramebuffer=W,et.__useDefaultFramebuffer=W===void 0},this.setRenderTarget=function(C,W=0,et=0){Y=C,z=W,U=et;let J=null,K=!1,Nt=!1;if(C){let At=$.get(C);if(At.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(B.FRAMEBUFFER,At.__webglFramebuffer),ct.copy(C.viewport),yt.copy(C.scissor),xt=C.scissorTest,_.viewport(ct),_.scissor(yt),_.setScissorTest(xt),j=-1;return}else if(At.__webglFramebuffer===void 0)nt.setupRenderTarget(C);else if(At.__hasExternalTextures)nt.rebindTextures(C,$.get(C.texture).__webglTexture,$.get(C.depthTexture).__webglTexture);else if(C.depthBuffer){let ie=C.depthTexture;if(At.__boundDepthTexture!==ie){if(ie!==null&&$.has(ie)&&(C.width!==ie.image.width||C.height!==ie.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");nt.setupDepthRenderbuffer(C)}}let qt=C.texture;(qt.isData3DTexture||qt.isDataArrayTexture||qt.isCompressedArrayTexture)&&(Nt=!0);let Yt=$.get(C).__webglFramebuffer;C.isWebGLCubeRenderTarget?(Array.isArray(Yt[W])?J=Yt[W][et]:J=Yt[W],K=!0):C.samples>0&&nt.useMultisampledRTT(C)===!1?J=$.get(C).__webglMultisampledFramebuffer:Array.isArray(Yt)?J=Yt[et]:J=Yt,ct.copy(C.viewport),yt.copy(C.scissor),xt=C.scissorTest}else ct.copy(St).multiplyScalar(ut).floor(),yt.copy(te).multiplyScalar(ut).floor(),xt=Vt;if(et!==0&&(J=V),_.bindFramebuffer(B.FRAMEBUFFER,J)&&_.drawBuffers(C,J),_.viewport(ct),_.scissor(yt),_.setScissorTest(xt),K){let At=$.get(C.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+W,At.__webglTexture,et)}else if(Nt){let At=W;for(let qt=0;qt<C.textures.length;qt++){let Yt=$.get(C.textures[qt]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+qt,Yt.__webglTexture,et,At)}}else if(C!==null&&et!==0){let At=$.get(C.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,At.__webglTexture,et)}j=-1},this.readRenderTargetPixels=function(C,W,et,J,K,Nt,zt,At=0){if(!(C&&C.isWebGLRenderTarget)){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let qt=$.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&zt!==void 0&&(qt=qt[zt]),qt){_.bindFramebuffer(B.FRAMEBUFFER,qt);try{let Yt=C.textures[At],ie=Yt.format,le=Yt.type;if(C.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+At),!A.textureFormatReadable(ie)){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!A.textureTypeReadable(le)){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}W>=0&&W<=C.width-J&&et>=0&&et<=C.height-K&&B.readPixels(W,et,J,K,Pt.convert(ie),Pt.convert(le),Nt)}finally{let Yt=Y!==null?$.get(Y).__webglFramebuffer:null;_.bindFramebuffer(B.FRAMEBUFFER,Yt)}}},this.readRenderTargetPixelsAsync=async function(C,W,et,J,K,Nt,zt,At=0){if(!(C&&C.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let qt=$.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&zt!==void 0&&(qt=qt[zt]),qt)if(W>=0&&W<=C.width-J&&et>=0&&et<=C.height-K){_.bindFramebuffer(B.FRAMEBUFFER,qt);let Yt=C.textures[At],ie=Yt.format,le=Yt.type;if(C.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+At),!A.textureFormatReadable(ie))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!A.textureTypeReadable(le))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let $t=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,$t),B.bufferData(B.PIXEL_PACK_BUFFER,Nt.byteLength,B.STREAM_READ),B.readPixels(W,et,J,K,Pt.convert(ie),Pt.convert(le),0);let _e=Y!==null?$.get(Y).__webglFramebuffer:null;_.bindFramebuffer(B.FRAMEBUFFER,_e);let Le=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await Dd(B,Le,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,$t),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,Nt),B.deleteBuffer($t),B.deleteSync(Le),Nt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(C,W=null,et=0){let J=Math.pow(2,-et),K=Math.floor(C.image.width*J),Nt=Math.floor(C.image.height*J),zt=W!==null?W.x:0,At=W!==null?W.y:0;nt.setTexture2D(C,0),B.copyTexSubImage2D(B.TEXTURE_2D,et,0,0,zt,At,K,Nt),_.unbindTexture()},this.copyTextureToTexture=function(C,W,et=null,J=null,K=0,Nt=0){let zt,At,qt,Yt,ie,le,$t,_e,Le,xe=C.isCompressedTexture?C.mipmaps[Nt]:C.image;if(et!==null)zt=et.max.x-et.min.x,At=et.max.y-et.min.y,qt=et.isBox3?et.max.z-et.min.z:1,Yt=et.min.x,ie=et.min.y,le=et.isBox3?et.min.z:0;else{let Re=Math.pow(2,-K);zt=Math.floor(xe.width*Re),At=Math.floor(xe.height*Re),C.isDataArrayTexture?qt=xe.depth:C.isData3DTexture?qt=Math.floor(xe.depth*Re):qt=1,Yt=0,ie=0,le=0}J!==null?($t=J.x,_e=J.y,Le=J.z):($t=0,_e=0,Le=0);let Me=Pt.convert(W.format),$e=Pt.convert(W.type),Ot;W.isData3DTexture?(nt.setTexture3D(W,0),Ot=B.TEXTURE_3D):W.isDataArrayTexture||W.isCompressedArrayTexture?(nt.setTexture2DArray(W,0),Ot=B.TEXTURE_2D_ARRAY):(nt.setTexture2D(W,0),Ot=B.TEXTURE_2D),_.activeTexture(B.TEXTURE0),_.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,W.flipY),_.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,W.premultiplyAlpha),_.pixelStorei(B.UNPACK_ALIGNMENT,W.unpackAlignment);let an=_.getParameter(B.UNPACK_ROW_LENGTH),ge=_.getParameter(B.UNPACK_IMAGE_HEIGHT),Ve=_.getParameter(B.UNPACK_SKIP_PIXELS),yn=_.getParameter(B.UNPACK_SKIP_ROWS),gn=_.getParameter(B.UNPACK_SKIP_IMAGES);_.pixelStorei(B.UNPACK_ROW_LENGTH,xe.width),_.pixelStorei(B.UNPACK_IMAGE_HEIGHT,xe.height),_.pixelStorei(B.UNPACK_SKIP_PIXELS,Yt),_.pixelStorei(B.UNPACK_SKIP_ROWS,ie),_.pixelStorei(B.UNPACK_SKIP_IMAGES,le);let xn=C.isDataArrayTexture||C.isData3DTexture,Se=W.isDataArrayTexture||W.isData3DTexture;if(C.isDepthTexture){let Re=$.get(C),Fn=$.get(W),we=$.get(Re.__renderTarget),On=$.get(Fn.__renderTarget);_.bindFramebuffer(B.READ_FRAMEBUFFER,we.__webglFramebuffer),_.bindFramebuffer(B.DRAW_FRAMEBUFFER,On.__webglFramebuffer);for(let ti=0;ti<qt;ti++)xn&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,$.get(C).__webglTexture,K,le+ti),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,$.get(W).__webglTexture,Nt,Le+ti)),B.blitFramebuffer(Yt,ie,zt,At,$t,_e,zt,At,B.DEPTH_BUFFER_BIT,B.NEAREST);_.bindFramebuffer(B.READ_FRAMEBUFFER,null),_.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(K!==0||C.isRenderTargetTexture||$.has(C)){let Re=$.get(C),Fn=$.get(W);_.bindFramebuffer(B.READ_FRAMEBUFFER,q),_.bindFramebuffer(B.DRAW_FRAMEBUFFER,F);for(let we=0;we<qt;we++)xn?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Re.__webglTexture,K,le+we):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Re.__webglTexture,K),Se?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Fn.__webglTexture,Nt,Le+we):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Fn.__webglTexture,Nt),K!==0?B.blitFramebuffer(Yt,ie,zt,At,$t,_e,zt,At,B.COLOR_BUFFER_BIT,B.NEAREST):Se?B.copyTexSubImage3D(Ot,Nt,$t,_e,Le+we,Yt,ie,zt,At):B.copyTexSubImage2D(Ot,Nt,$t,_e,Yt,ie,zt,At);_.bindFramebuffer(B.READ_FRAMEBUFFER,null),_.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else Se?C.isDataTexture||C.isData3DTexture?B.texSubImage3D(Ot,Nt,$t,_e,Le,zt,At,qt,Me,$e,xe.data):W.isCompressedArrayTexture?B.compressedTexSubImage3D(Ot,Nt,$t,_e,Le,zt,At,qt,Me,xe.data):B.texSubImage3D(Ot,Nt,$t,_e,Le,zt,At,qt,Me,$e,xe):C.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,Nt,$t,_e,zt,At,Me,$e,xe.data):C.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,Nt,$t,_e,xe.width,xe.height,Me,xe.data):B.texSubImage2D(B.TEXTURE_2D,Nt,$t,_e,zt,At,Me,$e,xe);_.pixelStorei(B.UNPACK_ROW_LENGTH,an),_.pixelStorei(B.UNPACK_IMAGE_HEIGHT,ge),_.pixelStorei(B.UNPACK_SKIP_PIXELS,Ve),_.pixelStorei(B.UNPACK_SKIP_ROWS,yn),_.pixelStorei(B.UNPACK_SKIP_IMAGES,gn),Nt===0&&W.generateMipmaps&&B.generateMipmap(Ot),_.unbindTexture()},this.initRenderTarget=function(C){$.get(C).__webglFramebuffer===void 0&&nt.setupRenderTarget(C)},this.initTexture=function(C){C.isCubeTexture?nt.setTextureCube(C,0):C.isData3DTexture?nt.setTexture3D(C,0):C.isDataArrayTexture||C.isCompressedArrayTexture?nt.setTexture2DArray(C,0):nt.setTexture2D(C,0),_.unbindTexture()},this.resetState=function(){z=0,U=0,Y=null,_.reset(),Dt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Vn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=fe._getDrawingBufferColorSpace(t),e.unpackColorSpace=fe._getUnpackColorSpace()}};var xf={type:"change"},su={type:"start"},_f={type:"end"},Kl=new as,vf=new hn,q_=Math.cos(70*Ih.DEG2RAD),Ze=new L,_n=2*Math.PI,Te={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},iu=1e-6,Io=class extends po{constructor(t,e=null){super(t,e),this.state=Te.NONE,this.target=new L,this.cursor=new L,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ki.ROTATE,MIDDLE:ki.DOLLY,RIGHT:ki.PAN},this.touches={ONE:zi.ROTATE,TWO:zi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new L,this._lastQuaternion=new sn,this._lastTargetPosition=new L,this._quat=new sn().setFromUnitVectors(t.up,new L(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new rr,this._sphericalDelta=new rr,this._scale=1,this._panOffset=new L,this._rotateStart=new ft,this._rotateEnd=new ft,this._rotateDelta=new ft,this._panStart=new ft,this._panEnd=new ft,this._panDelta=new ft,this._dollyStart=new ft,this._dollyEnd=new ft,this._dollyDelta=new ft,this._dollyDirection=new L,this._mouse=new ft,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Z_.bind(this),this._onPointerDown=Y_.bind(this),this._onPointerUp=$_.bind(this),this._onContextMenu=ny.bind(this),this._onMouseWheel=j_.bind(this),this._onKeyDown=Q_.bind(this),this._onTouchStart=ty.bind(this),this._onTouchMove=ey.bind(this),this._onMouseDown=K_.bind(this),this._onMouseMove=J_.bind(this),this._interceptControlDown=iy.bind(this),this._interceptControlUp=sy.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(xf),this.update(),this.state=Te.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;Ze.copy(e).sub(this.target),Ze.applyQuaternion(this._quat),this._spherical.setFromVector3(Ze),this.autoRotate&&this.state===Te.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=_n:n>Math.PI&&(n-=_n),s<-Math.PI?s+=_n:s>Math.PI&&(s-=_n),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Ze.setFromSpherical(this._spherical),Ze.applyQuaternion(this._quatInverse),e.copy(this.target).add(Ze),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=Ze.length();o=this._clampDistance(a*this._scale);let l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let a=new L(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new L(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Ze.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Kl.origin.copy(this.object.position),Kl.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Kl.direction))<q_?this.object.lookAt(this.target):(vf.setFromNormalAndCoplanarPoint(this.object.up,this.target),Kl.intersectPlane(vf,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>iu||8*(1-this._lastQuaternion.dot(this.object.quaternion))>iu||this._lastTargetPosition.distanceToSquared(this.target)>iu?(this.dispatchEvent(xf),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?_n/60*this.autoRotateSpeed*t:_n/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Ze.setFromMatrixColumn(e,0),Ze.multiplyScalar(-t),this._panOffset.add(Ze)}_panUp(t,e){this.screenSpacePanning===!0?Ze.setFromMatrixColumn(e,1):(Ze.setFromMatrixColumn(e,0),Ze.crossVectors(this.object.up,Ze)),Ze.multiplyScalar(t),this._panOffset.add(Ze)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Ze.copy(s).sub(this.target);let r=Ze.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(_n*this._rotateDelta.x/e.clientHeight),this._rotateUp(_n*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-_n*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(_n*this._rotateDelta.x/e.clientHeight),this._rotateUp(_n*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new ft,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function Y_(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function Z_(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function $_(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(_f),this.state=Te.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function K_(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case ki.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Te.DOLLY;break;case ki.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Te.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Te.ROTATE}break;case ki.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Te.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Te.PAN}break;default:this.state=Te.NONE}this.state!==Te.NONE&&this.dispatchEvent(su)}function J_(i){switch(this.state){case Te.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Te.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Te.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function j_(i){this.enabled===!1||this.enableZoom===!1||this.state!==Te.NONE||(i.preventDefault(),this.dispatchEvent(su),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(_f))}function Q_(i){this.enabled!==!1&&this._handleKeyDown(i)}function ty(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case zi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Te.TOUCH_ROTATE;break;case zi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Te.TOUCH_PAN;break;default:this.state=Te.NONE}break;case 2:switch(this.touches.TWO){case zi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Te.TOUCH_DOLLY_PAN;break;case zi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Te.TOUCH_DOLLY_ROTATE;break;default:this.state=Te.NONE}break;default:this.state=Te.NONE}this.state!==Te.NONE&&this.dispatchEvent(su)}function ey(i){switch(this._trackPointer(i),this.state){case Te.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Te.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Te.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Te.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Te.NONE}}function ny(i){this.enabled!==!1&&i.preventDefault()}function iy(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function sy(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Jl=class extends os{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let t=new oi;t.deleteAttribute("uv");let e=new Si({side:rn}),n=new Si,s=new us(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let r=new be(t,e);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let o=new qr(t,n,6),a=new je;a.position.set(-10.906,2.009,1.846),a.rotation.set(0,-.195,0),a.scale.set(2.328,7.905,4.651),a.updateMatrix(),o.setMatrixAt(0,a.matrix),a.position.set(-5.607,-.754,-.758),a.rotation.set(0,.994,0),a.scale.set(1.97,1.534,3.955),a.updateMatrix(),o.setMatrixAt(1,a.matrix),a.position.set(6.167,.857,7.803),a.rotation.set(0,.561,0),a.scale.set(3.927,6.285,3.687),a.updateMatrix(),o.setMatrixAt(2,a.matrix),a.position.set(-2.017,.018,6.124),a.rotation.set(0,.333,0),a.scale.set(2.002,4.566,2.064),a.updateMatrix(),o.setMatrixAt(3,a.matrix),a.position.set(2.291,-.756,-2.621),a.rotation.set(0,-.286,0),a.scale.set(1.546,1.552,1.496),a.updateMatrix(),o.setMatrixAt(4,a.matrix),a.position.set(-2.193,-.369,-5.547),a.rotation.set(0,.516,0),a.scale.set(3.875,3.487,2.986),a.updateMatrix(),o.setMatrixAt(5,a.matrix),this.add(o);let l=new be(t,fr(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);let c=new be(t,fr(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let h=new be(t,fr(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);let f=new be(t,fr(43));f.position.set(-.462,8.89,14.52),f.scale.set(4.38,5.441,.088),this.add(f);let u=new be(t,fr(20));u.position.set(3.235,11.486,-12.541),u.scale.set(2.5,2,.1),this.add(u);let d=new be(t,fr(100));d.position.set(0,20,0),d.scale.set(1,.1,1),this.add(d)}dispose(){let t=new Set;this.traverse(e=>{e.isMesh&&(t.add(e.geometry),t.add(e.material))});for(let e of t)e.dispose()}};function fr(i){return new oo({color:0,emissive:16777215,emissiveIntensity:i})}var Ee=(i,t,e)=>i<t?t:i>e?e:i,Ti=(i,t,e)=>i+(t-i)*e;function on(i,t,e){let n=Ee((e-i)/(t-i),0,1);return n*n*(3-2*n)}var _s=(i,t)=>1-Math.exp(-i*t),pr=(i,t)=>Math.atan2(Math.sin(t-i),Math.cos(t-i)),yf=i=>i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2,Lo=(i,t)=>(i%t+t)%t,bf=()=>/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname),fi=()=>new Promise(i=>setTimeout(i)),Mf=1.6,ru=.16;var ry=.1,Sf=1.5,wf={city:.55,birds:.32,crickets:.5,rain:.75},Tf=["city","birds","crickets","rain"],Ql=class{constructor(){this.ctx=null;this.master=null;this.layers=null;this.pulses=[];this.nextChirp=[0,0];this.nextPhrase=0;this.sources=[];this.timer=0;this.sleepTimer=0;this.on=!1;this.held=!1;this.level={city:0,birds:0,crickets:0,rain:0}}get state(){return this.ctx?`${this.ctx.state}:${this.master?this.master.gain.value.toFixed(3):0}`:"off"}setOn(t){this.on=t,!(t&&!this.ctx&&!this.create())&&this.apply()}setHeld(t){this.held!==t&&(this.held=t,this.apply())}setScene(t){let e=t.elevation,n=t.hour<12,s=on(-9,-2,e)*(1-on(12,32,e))*(n?1:.2);if(this.level.birds=Ee(s+on(2,12,e)*.22,0,1)*(t.rain?.25:1),this.level.city=(.3+.7*on(-6,8,e))*(t.rain?.7:1),this.level.crickets=(1-on(-5,5,e))*(t.rain?.2:1),this.level.rain=t.rain?1:0,this.ctx&&this.layers){let r=this.ctx.currentTime;for(let o of Tf)this.layers[o].gain.setTargetAtTime(this.level[o]*wf[o],r,.8)}}dispose(){clearInterval(this.timer),clearTimeout(this.sleepTimer);for(let t of this.sources)try{t.stop()}catch{}this.sources=[],this.ctx&&this.ctx.close().catch(()=>{}),this.ctx=null,this.master=null,this.layers=null}create(){let t=window.AudioContext||window.webkitAudioContext;if(!t)return!1;let e=new t({latencyHint:"playback"});this.ctx=e;let n=e.createGain();n.gain.value=0,n.connect(e.destination),this.master=n;let s=Ef(e,6,!0),r=Ef(e,3,!1),o=()=>{let u=e.createGain();return u.gain.value=0,u.connect(n),u},a={city:o(),birds:o(),crickets:o(),rain:o()};this.layers=a;let l=e.createGain();l.gain.value=.75;let c=e.createOscillator(),h=e.createGain();c.frequency.value=.031,h.gain.value=.25,c.connect(h).connect(l.gain),this.loop(s).connect(jl(e,"lowpass",340,.6)).connect(l).connect(a.city),c.start(),this.sources.push(c),this.loop(r).connect(jl(e,"highpass",650,.5)).connect(jl(e,"lowpass",6200,.4)).connect(a.rain);for(let u of[4350,5150]){let d=e.createGain();d.gain.value=0,this.loop(r).connect(jl(e,"bandpass",u,24)).connect(d).connect(a.crickets),this.pulses.push(d)}for(let u of Tf)a[u].gain.value=this.level[u]*wf[u];let f=e.currentTime;return this.nextChirp=[f+.2,f+.5],this.nextPhrase=f+.4,!0}loop(t){let n=this.ctx.createBufferSource();return n.buffer=t,n.loop=!0,n.loopStart=Af(t.length)/t.sampleRate,n.loopEnd=t.duration,n.start(0,n.loopStart+Math.random()*(t.duration-n.loopStart)),this.sources.push(n),n}apply(){let t=this.ctx,e=this.master;if(!t||!e)return;let n=this.on&&!this.held,s=t.currentTime;if(e.gain.cancelScheduledValues(s),e.gain.setValueAtTime(e.gain.value,s),clearTimeout(this.sleepTimer),n)t.resume().catch(()=>{}),e.gain.linearRampToValueAtTime(ry,s+Sf),this.timer||(this.timer=window.setInterval(()=>this.schedule(),200)),this.schedule();else{let r=this.on?.35:Sf;e.gain.linearRampToValueAtTime(0,s+r),this.sleepTimer=window.setTimeout(()=>{clearInterval(this.timer),this.timer=0,this.ctx&&!(this.on&&!this.held)&&this.ctx.suspend().catch(()=>{})},r*1e3+120)}}schedule(){let t=this.ctx;if(!t||!this.layers||t.state!=="running")return;let e=t.currentTime+.5;for(let n=0;n<this.pulses.length;n++)for(this.nextChirp[n]<t.currentTime&&(this.nextChirp[n]=t.currentTime+.05);this.nextChirp[n]<e;){let s=this.nextChirp[n],r=this.pulses[n].gain,o=3+(Math.random()<.4?1:0);for(let a=0;a<o;a++){let l=s+a*.034;r.setValueAtTime(0,l),r.linearRampToValueAtTime(1,l+.005),r.setValueAtTime(1,l+.013),r.linearRampToValueAtTime(0,l+.019)}this.nextChirp[n]=s+.5+Math.random()*.55}if(this.level.birds>.02)for(this.nextPhrase<t.currentTime&&(this.nextPhrase=t.currentTime+.1);this.nextPhrase<e;)this.phrase(this.nextPhrase),this.nextPhrase+=(1.2+Math.random()*4.5)/(.35+this.level.birds)}phrase(t){let e=this.ctx,n=this.layers.birds,s=e.createStereoPanner?e.createStereoPanner():null;s&&(s.pan.value=Math.random()*1.6-.8,s.connect(n));let r=s||n,o=Math.random()<.5,a=2+Math.floor(Math.random()*4),l=t,c=s?[s]:[],h=null;for(let f=0;f<a;f++){let u=.05+Math.random()*.11,d=(o?3600:2300)+Math.random()*1500,g=d*(Math.random()<.6?.72+Math.random()*.2:1.12+Math.random()*.25),y=e.createOscillator(),m=e.createOscillator(),p=e.createGain(),M=e.createGain();y.frequency.setValueAtTime(d,l),y.frequency.exponentialRampToValueAtTime(g,l+u),m.frequency.value=28+Math.random()*60,p.gain.value=90+Math.random()*320,m.connect(p).connect(y.frequency),M.gain.setValueAtTime(0,l),M.gain.linearRampToValueAtTime(.5+Math.random()*.5,l+.012),M.gain.exponentialRampToValueAtTime(.001,l+u),y.connect(M).connect(r),y.start(l),m.start(l),y.stop(l+u+.02),m.stop(l+u+.02),c.push(y,m,p,M),h=y,l+=u+.035+Math.random()*.1}h&&(h.onended=()=>c.forEach(f=>f.disconnect()))}},Af=i=>Math.min(2048,i>>2);function jl(i,t,e,n){let s=i.createBiquadFilter();return s.type=t,s.frequency.value=e,s.Q.value=n,s}function Ef(i,t,e){let n=i.createBuffer(1,Math.floor(i.sampleRate*t),i.sampleRate),s=n.getChannelData(0),r=0;for(let a=0;a<s.length;a++){let l=Math.random()*2-1;e?(r=(r+.02*l)/1.02,s[a]=r*3.5):s[a]=l*.5}let o=Af(s.length);for(let a=0;a<o;a++){let l=a/o,c=s.length-o+a;s[c]=s[c]*(1-l)+s[a]*l}return n}var tc=class{constructor(){this.active=!1;this.t=0;this.duration=.9;this.p0=new L;this.c0=new L;this.c1=new L;this.p1=new L;this.a0=new L;this.a1=new L;this.look=new L;this.fov0=60;this.fov1=60}start(t,e,n,s,r,o,a,l,c=.9){this.p0.copy(t),this.p1.copy(s),this.c0.copy(t).y+=a,this.c1.copy(s).y+=l,a||this.c0.lerpVectors(t,s,.33),l||this.c1.lerpVectors(t,s,.66),this.a0.copy(e),this.a1.copy(r),this.fov0=n,this.fov1=o,this.duration=c,this.t=0,this.active=!0}step(t,e){if(!this.active)return!1;this.t=Math.min(1,this.t+t/this.duration);let n=yf(this.t),s=1-n,r=s*s*s,o=3*s*s*n,a=3*s*n*n,l=n*n*n;e.position.set(r*this.p0.x+o*this.c0.x+a*this.c1.x+l*this.p1.x,r*this.p0.y+o*this.c0.y+a*this.c1.y+l*this.p1.y,r*this.p0.z+o*this.c0.z+a*this.c1.z+l*this.p1.z),this.look.lerpVectors(this.a0,this.a1,n),e.lookAt(this.look);let c=this.fov0+(this.fov1-this.fov0)*n;return e.fov!==c&&(e.fov=c,e.updateProjectionMatrix()),e.updateMatrixWorld(),this.t>=1?(this.active=!1,!0):!1}cancel(){this.active=!1}};var mr=160,ou=.5,oy=.012,ec=class{constructor(t,e,n){this.x=0;this.z=0;this.shown=!1;this.pulse=null;this.el=document.createElement("div"),this.el.style.cssText=`position:absolute;left:0;top:0;width:${mr}px;height:${mr}px;transform-origin:0 0;pointer-events:none;visibility:hidden;will-change:transform`,this.face=document.createElement("div");let s=n?e:"rgba(255,255,255,.95)";this.face.style.cssText=`position:absolute;inset:0;border-radius:50%;opacity:0;transition:opacity .22s ease;background:radial-gradient(circle,rgba(255,255,255,${n?".16":".1"}) 0 38%,transparent 43%),radial-gradient(circle,transparent 0 50%,${s} 55%,${s} 58%,transparent 64%),radial-gradient(circle,transparent 0 58%,rgba(0,0,0,.2) 63%,transparent 72%)`,this.el.appendChild(this.face),t.appendChild(this.el)}place(t,e){this.x=t,this.z=e}show(t){this.shown!==t&&(this.shown=t,this.face.style.opacity=t?"1":"0",t&&(this.el.style.visibility="visible"))}breathe(t,e){t&&!this.pulse&&!e&&this.face.animate?this.pulse=this.face.animate([{transform:"scale(.86)"},{transform:"scale(1.04)"},{transform:"scale(.86)"}],{duration:1400,iterations:1/0,easing:"ease-in-out"}):!t&&this.pulse&&(this.pulse.cancel(),this.pulse=null)}shake(t){t||!this.el.animate||this.face.animate([{transform:"translateX(0)"},{transform:"translateX(-12%)"},{transform:"translateX(10%)"},{transform:"translateX(-6%)"},{transform:"translateX(3%)"},{transform:"translateX(0)"}],{duration:420,easing:"ease-out"})}hide(){this.el.style.visibility="hidden"}},nc=class{constructor(t,e){this.model=new se;this.m=new se;this.screen=new se;this.layer=document.createElement("div"),this.layer.setAttribute("aria-hidden","true"),this.layer.style.cssText="position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict",t.appendChild(this.layer),this.cursor=new ec(this.layer,e,!1),this.target=new ec(this.layer,e,!0)}get visible(){return this.cursor.shown||this.target.shown}update(t,e,n){this.project(this.cursor,t,e,n),this.project(this.target,t,e,n)}project(t,e,n,s){if(!t.shown)return;let r=ou/mr;this.model.set(r,0,0,t.x-ou/2,0,0,1,oy,0,r,0,t.z-ou/2,0,0,0,1),this.screen.set(n/2,0,0,n/2,0,-s/2,0,s/2,0,0,1,0,0,0,0,1),this.m.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse).multiply(this.model).premultiply(this.screen);let o=this.m.elements;if(o[15]<.05||o[3]*mr+o[15]<.05||o[7]*mr+o[15]<.05||(o[3]+o[7])*mr+o[15]<.05){t.hide();return}t.el.style.visibility="visible",t.el.style.transform=`matrix3d(${o[0]},${o[1]},${o[2]},${o[3]},${o[4]},${o[5]},${o[6]},${o[7]},${o[8]},${o[9]},${o[10]},${o[11]},${o[12]},${o[13]},${o[14]},${o[15]})`}dispose(){this.layer.remove()}};var Cf={KeyW:[0,1],ArrowUp:[0,1],KeyS:[0,-1],ArrowDown:[0,-1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]},ay=new Set(["KeyQ","KeyE","KeyR","KeyF"]),ic=new Set(["ShiftLeft","ShiftRight"]),ly=/^(text|search|email|url|tel|password|number|date|datetime-local|month|time|week)$/;function cy(i){return i instanceof HTMLElement?i.isContentEditable||i.tagName==="TEXTAREA"||i.tagName==="SELECT"?!0:i.tagName==="INPUT"&&ly.test(i.type||"text"):!1}function hy(i){return i instanceof HTMLElement&&!!i.closest("input,select,[role=slider],[role=tab],[role=tablist],[role=radio],[role=radiogroup],[role=menu],[role=menuitem],[role=listbox],[role=option],[role=spinbutton]")}var sc=i=>Math.abs(i)<.15?0:(i-Math.sign(i)*.15)/.85,rc=class{constructor(t,e){this.canvas=t;this.sink=e;this.keys=new Set;this.padX=0;this.padZ=0;this.runHeld=!1;this.locked=!1;this.gamepads=0;this.pointers=new Map;this.pinch=null;this.gp={x:0,z:0,lookX:0,lookY:0,run:!1,a:!1,live:!1};this.gyroOn=!1;this.gyroFresh=!1;this.gyroPrimed=!1;this.gyroSeen=!1;this.gyroWaiter=null;this.orientation={alpha:0,beta:0,gamma:0};this.gyroYaw=0;this.gyroPitch=0;this.euler=new Pn;this.q=new sn;this.q0=new sn;this.q1=new sn(-Math.sqrt(.5),0,0,Math.sqrt(.5));this.zee=new L(0,0,1);this.forward=new L;this.listeners=[];this.held={strafe:0,forward:0,turn:0,pitch:0,run:!1};this.down=t=>{if(!this.sink.ready()||this.sink.paused())return;if(this.locked){if(t.button===0){let n=this.canvas.getBoundingClientRect();this.sink.tap(n.left+n.width/2,n.top+n.height/2,!1)}return}if(t.pointerType==="mouse"&&t.button!==0)return;let e=t.pointerType!=="mouse";if(e||this.canvas.focus({preventScroll:!0}),this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY,sx:t.clientX,sy:t.clientY,t:performance.now(),touch:e,moved:!1}),this.sink.mode()==="walk"){try{this.canvas.setPointerCapture(t.pointerId)}catch{}if(this.pointers.size===2){let n=0,s=0,r=0,o=!0;for(let a of this.pointers.values())a.moved=!0,o?(s=a.x,r=a.y,o=!1):n=Math.hypot(a.x-s,a.y-r);this.pinch={d0:Math.max(20,n),fov0:this.sink.fov()}}}};this.move=t=>{if(this.locked)return;let e=this.pointers.get(t.pointerId);if(!e){t.pointerType==="mouse"&&this.sink.ready()&&!this.sink.paused()&&this.sink.hover(t.clientX,t.clientY);return}let n=t.clientX-e.x,s=t.clientY-e.y;if(e.x=t.clientX,e.y=t.clientY,!e.moved&&Math.hypot(t.clientX-e.sx,t.clientY-e.sy)>(e.touch?10:5)&&(e.moved=!0,this.sink.mode()==="walk"&&this.sink.dragStart()),this.sink.mode()!=="walk"||!e.moved)return;if(this.pinch&&this.pointers.size>=2){let o=0,a=0,l=0,c=!0;for(let h of this.pointers.values())c?(a=h.x,l=h.y,c=!1):o=Math.hypot(h.x-a,h.y-l);o>0&&this.sink.setFov(this.pinch.fov0*this.pinch.d0/o);return}let r=this.sink.fov();if(e.touch){let o=r*Math.PI/180/Math.max(1,this.canvas.clientHeight);this.sink.look(n*o,s*o)}else{let o=.0034*r/60;this.sink.look(-n*o,-s*o*.85)}};this.up=t=>{let e=this.pointers.get(t.pointerId);e&&(this.pointers.delete(t.pointerId),this.pointers.size<2&&(this.pinch=null),t.type==="pointerup"&&!e.moved&&performance.now()-e.t<700&&!this.sink.paused()&&this.sink.tap(t.clientX,t.clientY,e.touch))};this.leave=t=>{t.pointerType==="mouse"&&!this.pointers.has(t.pointerId)&&this.sink.hoverEnd()};this.wheel=t=>{if(this.sink.mode()!=="walk"||!this.sink.ready()||this.sink.paused())return;t.preventDefault();let e=t.deltaMode===1?16:t.deltaMode===2?400:1;this.sink.setFov(this.sink.fov()+t.deltaY*e*.03)};this.keydown=t=>{if(!this.sink.ready()||this.sink.paused()||t.ctrlKey||t.metaKey||t.altKey||cy(t.target)||this.sink.mode()!=="walk")return;let e=t.code;if(!(e.startsWith("Arrow")&&hy(t.target))){if(Cf[e]||ay.has(e)||ic.has(e)){ic.has(e)||t.preventDefault(),this.keys.has(e)||(this.keys.add(e),this.recount(),ic.has(e)||this.sink.manual(),this.sink.wake());return}t.key==="+"||t.key==="="||e==="NumpadAdd"?(t.preventDefault(),this.sink.setFov(this.sink.fov()-5)):(t.key==="-"||t.key==="_"||e==="NumpadSubtract")&&(t.preventDefault(),this.sink.setFov(this.sink.fov()+5))}};this.keyup=t=>{this.keys.delete(t.code)&&(this.recount(),this.sink.wake())};this.lockChange=()=>{let t=document.pointerLockElement===this.canvas;t!==this.locked&&(this.locked=t,this.pointers.clear(),this.sink.lockChanged(t))};this.lockedMove=t=>{if(!this.locked||this.sink.paused())return;let e=.0023*this.sink.fov()/60;this.sink.look(-t.movementX*e,-t.movementY*e)};this.padsChanged=()=>{let t=navigator.getGamepads?navigator.getGamepads():[],e=0;for(let n=0;n<t.length;n++)t[n]&&e++;this.gamepads=e,e||(this.gp.x=this.gp.z=this.gp.lookX=this.gp.lookY=0,this.gp.run=this.gp.live=!1),this.sink.wake()};this.orient=t=>{t.alpha==null||t.beta==null||t.gamma==null||(this.orientation.alpha=t.alpha,this.orientation.beta=t.beta,this.orientation.gamma=t.gamma,this.gyroFresh=!0,this.gyroSeen||(this.gyroSeen=!0,this.gyroWaiter?.(!0)),this.sink.wake())};let n=(s,r,o,a)=>{s.addEventListener(r,o,a),this.listeners.push([s,r,o,a])};n(t,"pointerdown",this.down),n(t,"pointermove",this.move),n(t,"pointerup",this.up),n(t,"pointercancel",this.up),n(t,"pointerleave",this.leave),n(t,"wheel",this.wheel,{passive:!1}),n(t,"contextmenu",s=>s.preventDefault()),n(window,"keydown",this.keydown),n(window,"keyup",this.keyup),n(window,"blur",()=>this.clear()),n(document,"pointerlockchange",this.lockChange),n(document,"mousemove",this.lockedMove),n(window,"gamepadconnected",this.padsChanged),n(window,"gamepaddisconnected",this.padsChanged),this.padsChanged()}recount(){let t=this.held;t.strafe=t.forward=t.turn=t.pitch=0,t.run=!1,this.keys.forEach(e=>{let n=Cf[e];n?(t.strafe+=n[0],t.forward+=n[1]):e==="KeyQ"?t.turn+=1:e==="KeyE"?t.turn-=1:e==="KeyR"?t.pitch+=1:e==="KeyF"?t.pitch-=1:ic.has(e)&&(t.run=!0)})}read(t){let e=this.held;return t.strafe=Math.max(-1,Math.min(1,e.strafe+this.padX+this.gp.x)),t.forward=Math.max(-1,Math.min(1,e.forward+this.padZ+this.gp.z)),t.turn=e.turn-this.gp.lookX*1.6,t.pitch=e.pitch-this.gp.lookY*1.1,t.run=this.runHeld||this.gp.run||e.run,t}get active(){return this.keys.size>0||this.padX!==0||this.padZ!==0||this.gp.live||this.gamepads>0||this.gyroOn}clear(){this.keys.clear(),this.recount(),this.padX=this.padZ=0,this.runHeld=!1,this.pointers.clear(),this.pinch=null}requestLock(t){if(t){if(document.pointerLockElement===this.canvas||!this.canvas.requestPointerLock)return;try{let e=this.canvas.requestPointerLock();e&&typeof e.catch=="function"&&e.catch(()=>this.sink.lockChanged(!1))}catch{this.sink.lockChanged(!1)}}else document.pointerLockElement===this.canvas&&document.exitPointerLock()}pollGamepad(){if(!this.gamepads||!navigator.getGamepads)return;let t=navigator.getGamepads(),e=null;for(let a=0;a<t.length;a++){let l=t[a];if(l&&l.connected){e=l;break}}if(!e||this.sink.paused()||this.sink.mode()!=="walk"){this.gp.live=!1;return}let n=e.axes;this.gp.x=sc(n[0]||0),this.gp.z=-sc(n[1]||0),this.gp.lookX=sc(n[2]||0),this.gp.lookY=sc(n[3]||0);let s=e.buttons[7];this.gp.run=!!s&&(s.pressed||s.value>.3);let r=this.gp.x!==0||this.gp.z!==0||this.gp.lookX!==0||this.gp.lookY!==0;r&&!this.gp.live&&this.sink.manual(),this.gp.live=r;let o=!!e.buttons[0]&&e.buttons[0].pressed;o&&!this.gp.a&&this.sink.nextRoom(),this.gp.a=o}async enableGyro(){let t=window.DeviceOrientationEvent;if(!t)return!1;if(typeof t.requestPermission=="function")try{if(await t.requestPermission()!=="granted")return!1}catch{return!1}this.gyroOn=!0,this.gyroPrimed=!1,this.gyroSeen=!1,window.addEventListener("deviceorientation",this.orient);let e=await new Promise(n=>{this.gyroWaiter=n,setTimeout(()=>n(this.gyroSeen),1e3)});return this.gyroWaiter=null,e||this.disableGyro(),e}disableGyro(){this.gyroOn=!1,window.removeEventListener("deviceorientation",this.orient)}gyroDelta(t){if(!this.gyroOn||!this.gyroFresh)return!1;this.gyroFresh=!1;let e=Math.PI/180,n=this.orientation,s=screen.orientation&&screen.orientation.angle||0;this.euler.set(n.beta*e,n.alpha*e,-n.gamma*e,"YXZ"),this.q.setFromEuler(this.euler).multiply(this.q1).multiply(this.q0.setFromAxisAngle(this.zee,-s*e)),this.forward.set(0,0,-1).applyQuaternion(this.q);let r=Math.atan2(this.forward.x,this.forward.z),o=Math.asin(Math.max(-1,Math.min(1,this.forward.y)));return this.gyroPrimed?(t.yaw=pr(this.gyroYaw,r),t.pitch=o-this.gyroPitch,this.gyroYaw=r,this.gyroPitch=o,t.yaw!==0||t.pitch!==0):(this.gyroPrimed=!0,this.gyroYaw=r,this.gyroPitch=o,!1)}dispose(){this.disableGyro(),document.pointerLockElement===this.canvas&&document.exitPointerLock();for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners.length=0,this.clear()}};var dn=3,uy=3.2,dy=.6,oc=class{constructor(t,e){this.lights=[];this.slots=[];this.wanted=new Int32Array(dn);this.wantedDist=new Float32Array(dn);this.brightest=new Int32Array(dn).fill(-1);this.level=1;this.positions=new Float32Array(t.length*3),this.power=new Float32Array(t.length),t.forEach((s,r)=>{this.positions.set(s.position,r*3),this.power[r]=s.intensity});for(let s=0;s<dn;s++){let r=new us("#fff1d8",0,9,2);r.castShadow=!1,e.add(r),this.lights.push(r),this.slots.push({lamp:-1,fade:0})}let n=Array.from(this.power.keys()).sort((s,r)=>this.power[r]-this.power[s]);for(let s=0;s<dn&&s<n.length;s++)this.brightest[s]=n[s]}coverage(){let t=0,e=0;for(let n=0;n<this.power.length;n++)t+=this.power[n];for(let n=0;n<dn;n++){let s=this.slots[n];s.lamp>=0&&(e+=this.power[s.lamp]*s.fade)}return t>0?e/t:1}setLevel(t){this.level=t}setColor(t){for(let e=0;e<dn;e++)this.lights[e].color.copy(t)}update(t,e,n){if(!this.power.length)return!1;if(e)this.pickNearest(e);else for(let o=0;o<dn;o++)this.wanted[o]=this.brightest[o];let r=!1;for(let o=0;o<dn;o++){let a=this.slots[o],l=a.lamp>=0&&this.isWanted(a.lamp),c=l?1:0;if(!l&&(a.fade<=.001||n)){let u=this.unassigned();u!==a.lamp&&(a.lamp=u,r=!0),c=u>=0?1:0,n&&(a.fade=0)}let h=n?1:uy*t,f=a.fade<c?Math.min(c,a.fade+h):Math.max(c,a.fade-h);f!==a.fade&&(a.fade=f,r=!0)}for(let o=0;o<dn;o++){let a=this.slots[o],l=this.lights[o],c=a.lamp>=0?this.power[a.lamp]*this.level*a.fade:0;if(l.intensity!==c&&(l.intensity=c,r=!0),a.lamp>=0){let h=a.lamp*3;l.position.set(this.positions[h],this.positions[h+1],this.positions[h+2])}}return r}isWanted(t){for(let e=0;e<dn;e++)if(this.wanted[e]===t)return!0;return!1}unassigned(){for(let t=0;t<dn;t++){let e=this.wanted[t];if(e<0)continue;let n=!1;for(let s=0;s<dn;s++)if(this.slots[s].lamp===e){n=!0;break}if(!n)return e}return-1}pickNearest(t){this.wanted.fill(-1),this.wantedDist.fill(1/0);for(let e=0;e<this.power.length;e++){let n=e*3,s=Math.hypot(this.positions[n]-t.x,this.positions[n+1]-t.y,this.positions[n+2]-t.z);for(let r=0;r<dn;r++)if(this.slots[r].lamp===e&&this.slots[r].fade>0){s-=dy;break}for(let r=0;r<dn;r++)if(s<this.wantedDist[r]){for(let o=dn-1;o>r;o--)this.wanted[o]=this.wanted[o-1],this.wantedDist[o]=this.wantedDist[o-1];this.wanted[r]=e,this.wantedDist[r]=s;break}}}};var Yn=Math.PI/180;function Do(i){let[t,e,n]=i.split("-").map(Number);return Date.UTC(t,e-1,n)/864e5+24405875e-1}function Rf(i,t,e,n,s,r){let a=(i+(t-e)/24-2451545)/36525,l=Lo(280.46646+a*(36000.76983+a*3032e-7),360),c=(357.52911+a*(35999.05029-1537e-7*a))*Yn,h=.016708634-a*(42037e-9+1267e-10*a),f=Math.sin(c)*(1.914602-a*(.004817+14e-6*a))+Math.sin(2*c)*(.019993-101e-6*a)+Math.sin(3*c)*289e-6,u=(125.04-1934.136*a)*Yn,d=(l+f-.00569-.00478*Math.sin(u))*Yn,y=(23+(26+(21.448-a*(46.815+a*(59e-5-a*.001813)))/60)/60+.00256*Math.cos(u))*Yn,m=Math.asin(Math.sin(y)*Math.sin(d)),p=Math.tan(y/2)**2,M=l*Yn,E=4/Yn*(p*Math.sin(2*M)-2*h*Math.sin(c)+4*h*p*Math.sin(c)*Math.cos(2*M)-.5*p*p*Math.sin(4*M)-1.25*h*h*Math.sin(2*c)),w=(Lo(t*60+E+4*s-60*e,1440)/4-180)*Yn,S=n*Yn,T=Ee(Math.sin(S)*Math.sin(m)+Math.cos(S)*Math.cos(m)*Math.cos(w),-1,1),v=Math.acos(T),b=Math.cos(S)*Math.sin(v),R=n>0?180:0;if(Math.abs(b)>1e-9){let V=Math.acos(Ee((Math.sin(S)*T-Math.sin(m))/b,-1,1))/Yn;R=w>0?Lo(V+180,360):Lo(540-V,360)}let P=90-v/Yn,O=0;if(P<=85){let V=Math.tan(P*Yn);P>5?O=58.1/V-.07/V**3+86e-6/V**5:P>-.575?O=1735+P*(-518.2+P*(103.4+P*(-12.79+P*.711))):O=-20.772/V,O/=3600}return r.azimuthDeg=R,r.elevationDeg=P+O,r}function Pf(i,t){let e=Ee(i,1e3,4e4)/100,n,s,r;return e<=66?(n=255,s=99.4708025861*Math.log(e)-161.1195681661,r=e<=19?0:138.5177312231*Math.log(e-10)-305.0447927307):(n=329.698727446*Math.pow(e-60,-.1332047592),s=288.1221695283*Math.pow(e-60,-.0755148492),r=255),t.r=Ee(n,0,255)/255,t.g=Ee(s,0,255)/255,t.b=Ee(r,0,255)/255,t}var If=Math.PI/180,ac=class{constructor(t,e,n,s){this.background=new Bt;this.centre=new L;this.dir=new L;this.lastDir=new L(0,-1,0);this.corner=new L;this.rgb={r:1,g:1,b:1};this.ambientNow=0;this.lampLevel=1;this.c={daySky:new Bt("#f5f9ff"),goldSky:new Bt("#ffd9b3"),nightSky:new Bt("#3a5182"),overcast:new Bt("#dde2e8"),rainSky:new Bt("#c3cfdc"),dayGround:new Bt("#b3a695"),nightGround:new Bt("#25252b"),dayAmbient:new Bt("#fff6e9"),goldAmbient:new Bt("#ffd2a1"),nightAmbient:new Bt("#ffe3c2"),lampDay:new Bt("#fff1d8"),lampNight:new Bt("#ffcf94"),cool:new Bt("#c9d4e2"),dayBg:new Bt,duskBg:new Bt("#c9a68c"),nightBg:new Bt,lamp:new Bt};let r=e.lights,o=r.hemi??1;this.base={hemi:o,ambient:r.ambient??.5,sun:r.sun??o*1.72,exposure:r.exposure??1,env:.26,glow:0},this.hemi=new lo(this.c.daySky,this.c.dayGround,o),this.ambient=new uo(this.c.dayAmbient,this.base.ambient),this.sun=new ho("#fff3d9",this.base.sun),this.sun.castShadow=!0,this.sun.shadow.bias=-4e-4,this.sun.shadow.normalBias=.024,this.sun.shadow.autoUpdate=!0,t.add(this.hemi,this.ambient,this.sun,this.sun.target),this.lamps=new oc(e.lights.lamps,t);let a=n.materials.glow;this.glow=a&&a.isMeshStandardMaterial?a:null,this.glow&&(this.base.glow=this.glow.emissiveIntensity),this.c.dayBg.set(r.background),this.c.nightBg.set(e.theme.night).lerp(new Bt("#1b2633"),.5),this.box=s.clone(),this.box.getCenter(this.centre)}setShadowSize(t){let e=this.sun.shadow;e.mapSize.x!==t&&(e.mapSize.set(t,t),e.map&&(e.map.dispose(),e.map=null))}apply(t,e,n,s,r){let o=t.elevationDeg,a=on(-2,20,o),l=on(-9,4,o),c=1-l,h=on(-3,3,o)*(1-on(6,22,o)),f=e?e.cloud:0,u=!!(e&&e.rain),d=this.c,g=o<20?Ti(1800,3600,on(-1,20,o)):Ti(3600,5600,on(20,50,o));Pf(g,this.rgb),this.sun.color.setRGB(this.rgb.r,this.rgb.g,this.rgb.b,en),u&&this.sun.color.lerp(d.cool,.35),this.sun.intensity=this.base.sun*Math.sqrt(a)*(1-.8*f)*(u?.75:1),this.hemi.color.copy(d.daySky).lerp(d.goldSky,h*.85).lerp(d.nightSky,c),f&&this.hemi.color.lerp(d.overcast,.55*f*l),u&&this.hemi.color.lerp(d.rainSky,.5*l),this.hemi.groundColor.copy(d.dayGround).lerp(d.nightGround,c),this.hemi.intensity=this.base.hemi*Ti(.18,1,l)*(1-.32*h)*(1+.15*f*l),this.ambient.color.copy(d.dayAmbient).lerp(d.goldAmbient,h*.55).lerp(d.nightAmbient,c),this.ambientNow=this.base.ambient*Ti(.4,1,l)*(1-.15*h)*(1+.1*f*l),this.ambient.intensity=this.ambientNow,this.lampLevel=Ti(1,1.65,c)+.25*f*l,this.lamps.setLevel(this.lampLevel),this.lamps.setColor(d.lamp.copy(d.lampDay).lerp(d.lampNight,c)),this.glow&&(this.glow.emissiveIntensity=this.base.glow*Ti(1,1.5,c)),r.environmentIntensity=this.base.env*Ti(.25,1,l)*(1-.25*f),s.toneMappingExposure=this.base.exposure*Ti(1,1.07,c)*(u?.97:1),this.background.copy(d.dayBg).lerp(d.duskBg,h*.6).lerp(d.nightBg,c);let y=Math.max(o,3)*If,m=(t.azimuthDeg-n)*If;return this.dir.set(Math.sin(m)*Math.cos(y),Math.sin(y),-Math.cos(m)*Math.cos(y)),this.sun.position.copy(this.centre).addScaledVector(this.dir,20),this.sun.target.position.copy(this.centre),this.sun.updateMatrixWorld(),this.sun.target.updateMatrixWorld(),this.dir.angleTo(this.lastDir)<.002?!1:(this.lastDir.copy(this.dir),this.fitShadow(),!0)}compensate(t,e){this.ambient.intensity=this.ambientNow+(e?this.base.ambient*.3*(1-t)*this.lampLevel:0)}fitShadow(){let t=this.sun.shadow.camera;t.position.copy(this.sun.position),t.lookAt(this.centre),t.updateMatrixWorld();let e=1/0,n=-1/0,s=1/0,r=-1/0,o=1/0,a=-1/0,l=this.box;for(let h=0;h<8;h++)this.corner.set(h&1?l.max.x:l.min.x,h&2?l.max.y:l.min.y,h&4?l.max.z:l.min.z).applyMatrix4(t.matrixWorldInverse),e=Math.min(e,this.corner.x),n=Math.max(n,this.corner.x),s=Math.min(s,this.corner.y),r=Math.max(r,this.corner.y),o=Math.min(o,this.corner.z),a=Math.max(a,this.corner.z);let c=.25;t.left=e-c,t.right=n+c,t.bottom=s-c,t.top=r+c,t.near=Math.max(.05,-a-c),t.far=-o+c,t.updateProjectionMatrix()}};function Df(i,t=!1){let e=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),s=new Set(Object.keys(i[0].morphAttributes)),r={},o={},a=i[0].morphTargetsRelative,l=new Ne,c=0;for(let h=0;h<i.length;++h){let f=i[h],u=0;if(e!==(f.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let d in f.attributes){if(!n.has(d))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+d+'" attribute exists among all geometries, or in none of them.'),null;r[d]===void 0&&(r[d]=[]),r[d].push(f.attributes[d]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==f.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let d in f.morphAttributes){if(!s.has(d))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[d]===void 0&&(o[d]=[]),o[d].push(f.morphAttributes[d])}if(t){let d;if(e)d=f.index.count;else if(f.attributes.position!==void 0)d=f.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,d,h),c+=d}}if(e){let h=0,f=[];for(let u=0;u<i.length;++u){let d=i[u].index;for(let g=0;g<d.count;++g)f.push(d.getX(g)+h);h+=i[u].attributes.position.count}l.setIndex(f)}for(let h in r){let f=Lf(r[h]);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,f)}for(let h in o){let f=o[h][0].length;if(f!==0){l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let u=0;u<f;++u){let d=[];for(let y=0;y<o[h].length;++y)d.push(o[h][y][u]);let g=Lf(d);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(g)}}}return l}function Lf(i){let t,e,n,s=-1,r=0;for(let c=0;c<i.length;++c){let h=i[c];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(s===-1&&(s=h.gpuType),s!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*e}let o=new t(r),a=new ze(o,e,n),l=0;for(let c=0;c<i.length;++c){let h=i[c];if(h.isInterleavedBufferAttribute){let f=l/e;for(let u=0,d=h.count;u<d;u++)for(let g=0;g<e;g++){let y=h.getComponent(u,g);a.setComponent(u+f,g,y)}}else o.set(h.array,l);l+=h.count*e}return s!==void 0&&(a.gpuType=s),a}var fy=new Set(["position","normal","uv"]);function py(i,t){let e=i;if(!e.isMesh||e.isInstancedMesh||e.isSkinnedMesh||Array.isArray(e.material)||e.renderOrder!==0||e.geometry.morphAttributes.position||!e.geometry.attributes.position)return!1;for(let n=i;n&&n!==t;n=n.parent)if(n.userData.keep||!n.visible)return!1;return!0}function my(i,t){let e=i.geometry,n=new Ne;for(let a of Object.keys(e.attributes)){if(!fy.has(a))continue;let l=e.attributes[a],c=l.itemSize,h=l.count*c,f=new Float32Array(h);if(!l.isInterleavedBufferAttribute&&!l.normalized&&l.array.length>=h)f.set(l.array.subarray(0,h));else for(let u=0;u<l.count;u++)for(let d=0;d<c;d++)f[u*c+d]=l.getComponent(u,d);n.setAttribute(a,new ze(f,c))}n.attributes.normal||n.computeVertexNormals(),n.attributes.uv||n.setAttribute("uv",new ze(new Float32Array(n.attributes.position.count*2),2));let s=n.attributes.position.count,r=e.index?e.index.count:s,o=s>65535?new Uint32Array(r):new Uint16Array(r);if(e.index)o.set(e.index.array.subarray(0,r));else for(let a=0;a<r;a++)o[a]=a;if(t.determinant()<0)for(let a=0;a+2<o.length;a+=3){let l=o[a+1];o[a+1]=o[a+2],o[a+2]=l}return n.setIndex(new ze(o,1)),n.applyMatrix4(t),n}function Nf(i,t){let e=new pn,n=new L,s=new se,r=new se,o=0,a=0;for(let l of i){l.updateWorldMatrix(!0,!0),r.copy(l.matrixWorld).invert();let c=new Map,h=[],f=new Set;l.traverse(d=>{if(d.isMesh&&o++,!py(d,l)){d.isMesh&&f.add(d.geometry);return}let g=d,y=g.material;g.geometry.boundingBox||g.geometry.computeBoundingBox(),e.copy(g.geometry.boundingBox).applyMatrix4(g.matrixWorld).getCenter(n);let m=t(n.x,n.z)||"hall",p=m+"|"+y.uuid+"|"+g.castShadow+"|"+g.receiveShadow,M=c.get(p);M||(M={material:y,cast:g.castShadow,receive:g.receiveShadow,room:m,parts:[]},c.set(p,M)),s.multiplyMatrices(r,g.matrixWorld),M.parts.push(my(g,s)),h.push(g)});let u=new Set;for(let d of h)d.removeFromParent(),f.has(d.geometry)||u.add(d.geometry);u.forEach(d=>d.dispose());for(let d of c.values()){let g=d.parts.length===1?d.parts[0]:Df(d.parts,!1);if(d.parts.length>1&&d.parts.forEach(m=>m.dispose()),!g)continue;g.computeBoundingBox(),g.computeBoundingSphere();let y=new be(g,d.material);y.name=d.room+":"+(d.material.name||d.material.type),y.userData.room=d.room,y.castShadow=d.cast,y.receiveShadow=d.receive,y.matrixAutoUpdate=!1,l.add(y)}Uf(l),l.traverse(d=>{d.isMesh&&a++})}return{meshesBefore:o,meshesAfter:a}}function Uf(i){for(let t=i.children.length-1;t>=0;t--){let e=i.children[t];Uf(e),e.children.length===0&&(e.type==="Group"||e.type==="Object3D")&&!e.userData.keep&&i.remove(e)}}var No=class i extends be{constructor(t,e={}){super(t),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this._reflectionCameras=new WeakMap;let n=this,s=e.color!==void 0?new Bt(e.color):new Bt(8355711),r=e.textureWidth||512,o=e.textureHeight||512,a=e.clipBias||0,l=e.shader||i.ReflectorShader,c=e.multisample!==void 0?e.multisample:4,h=new hn,f=new L,u=new L,d=new L,g=new se,y=new L(0,0,-1),m=new Ae,p=new L,M=new L,E=new Ae,x=new se,w=new Ie(r,o,{samples:c,type:Xe}),S=new Fe({name:l.name!==void 0?l.name:"unspecified",uniforms:ci.clone(l.uniforms),fragmentShader:l.fragmentShader,vertexShader:l.vertexShader});S.uniforms.tDiffuse.value=w.texture,S.uniforms.color.value=s,S.uniforms.textureMatrix.value=x,this.material=S,this.onBeforeRender=function(T,v,b){let R=this.getReflectionCamera(b);if(u.setFromMatrixPosition(n.matrixWorld),d.setFromMatrixPosition(b.matrixWorld),g.extractRotation(n.matrixWorld),f.set(0,0,1),f.applyMatrix4(g),p.subVectors(u,d),p.dot(f)>0===!0&&this.forceUpdate===!1)return;p.reflect(f).negate(),p.add(u),g.extractRotation(b.matrixWorld),y.set(0,0,-1),y.applyMatrix4(g),y.add(d),M.subVectors(u,y),M.reflect(f).negate(),M.add(u),R.position.copy(p),R.up.set(0,1,0),R.up.applyMatrix4(g),R.up.reflect(f),R.lookAt(M),R.far=b.far,R.updateMatrixWorld(),R.projectionMatrix.copy(b.projectionMatrix),x.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),x.multiply(R.projectionMatrix),x.multiply(R.matrixWorldInverse),x.multiply(n.matrixWorld),h.setFromNormalAndCoplanarPoint(f,u),h.applyMatrix4(R.matrixWorldInverse),m.set(h.normal.x,h.normal.y,h.normal.z,h.constant);let O=R.projectionMatrix;R.isOrthographicCamera?(E.x=(Math.sign(m.x)+O.elements[8])/O.elements[0],E.y=(Math.sign(m.y)+O.elements[9])/O.elements[5],E.z=-b.far,E.w=1):(E.x=(Math.sign(m.x)+O.elements[8])/O.elements[0],E.y=(Math.sign(m.y)+O.elements[9])/O.elements[5],E.z=-1,E.w=(1+O.elements[10])/O.elements[14]),m.multiplyScalar(2/m.dot(E)),O.elements[2]=m.x,O.elements[6]=m.y,R.isOrthographicCamera?(O.elements[10]=m.z-a,O.elements[14]=m.w-1):(O.elements[10]=m.z+1-a,O.elements[14]=m.w),n.visible=!1;let V=T.getRenderTarget(),q=T.xr.enabled,F=T.shadowMap.autoUpdate;T.xr.enabled=!1,T.shadowMap.autoUpdate=!1,T.setRenderTarget(w),T.state.buffers.depth.setMask(!0),T.autoClear===!1&&T.clear(),T.render(v,R),T.xr.enabled=q,T.shadowMap.autoUpdate=F,T.setRenderTarget(V);let z=b.viewport;z!==void 0&&T.state.viewport(z),n.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return w},this.dispose=function(){w.dispose(),n.material.dispose()},this.getReflectionCamera=function(T){let v=this._reflectionCameras.get(T);return v===void 0&&(v=T.clone(),this._reflectionCameras.set(T,v)),v}}};No.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
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

		}`};var gy=6,lc=class{constructor(t,e){this.group=new yi;this.position=new L;this.armed=!1;this.live=!0;this.stale=!0;let[n,s]=t.size;this.geometry=t.shape==="circle"?new $r(n/2,48):new cs(n,s);let r=(t.shape==="circle"?s/n:1)*(t.scaleY??1),o=t.tint??13226184;this.reflector=new No(this.geometry,{textureWidth:Math.max(1,e),textureHeight:Math.max(1,e),color:o,clipBias:.003,multisample:0}),this.reflector.name="mirror",this.fallbackMaterial=new Si({color:o,metalness:1,roughness:.08}),this.fallback=new be(this.geometry,this.fallbackMaterial),this.fallback.name="mirror-fallback",this.group.add(this.reflector,this.fallback),this.group.position.set(t.position[0],t.position[1],t.position[2]),this.group.rotation.y=t.rotationY,this.group.scale.y=r,this.group.updateMatrixWorld(!0),this.position.copy(this.group.position);let a=this.reflector.onBeforeRender;this.reflector.onBeforeRender=(l,c,h,f,u,d)=>{this.armed&&(this.armed=!1,this.stale=!1,a.call(this.reflector,l,c,h,f,u,d))},this.setResolution(e)}setResolution(t){this.live=t>0,this.reflector.visible=this.live,this.fallback.visible=!this.live,this.live&&this.reflector.getRenderTarget().setSize(t,t),this.stale=!0}setVisible(t){this.group.visible=t}warmup(t){this.reflector.visible=t||this.live,this.fallback.visible=t||!this.live}arm(t,e,n){let s=t.position.distanceTo(this.position)<gy;s||(this.stale=!0),this.armed=this.live&&this.group.visible&&s&&(!e||this.stale||n%3===0)}force(){this.armed=this.live&&this.group.visible}disarm(){this.armed&&(this.stale=!0),this.armed=!1}dispose(){this.reflector.dispose(),this.geometry.dispose(),this.fallbackMaterial.dispose()}};function Ff(i,t,e){let n=t.slice(),s=ru*ru;function r(x,w){if(!i(x,w))return!0;for(let S=0;S<n.length;S++){let T=n[S],v=x<T.x1?T.x1:x>T.x2?T.x2:x,b=w<T.z1?T.z1:w>T.z2?T.z2:w,R=x-v,P=w-b;if(R*R+P*P<s)return!0}return!1}function o(x,w,S,T){let v=Math.ceil(Math.hypot(S-x,T-w)/.045);for(let b=0;b<=v;b++){let R=v?b/v:0;if(r(x+(S-x)*R,w+(T-w)*R))return!1}return!0}function a(x,w,S,T){let v=Math.ceil(Math.hypot(S-x,T-w)/.04);for(let b=1;b<=v;b++){let R=b/v;if(!i(x+(S-x)*R,w+(T-w)*R))return!1}return!0}let l=.12,c=e.minX,h=e.minZ,f=Math.ceil((e.maxX-c)/l)+1,u=Math.ceil((e.maxZ-h)/l)+1,d=x=>c+x%f*l,g=x=>h+Math.floor(x/f)*l,y=(x,w)=>Math.max(0,Math.min(u-1,Math.round((w-h)/l)))*f+Math.max(0,Math.min(f-1,Math.round((x-c)/l))),m=new Uint8Array(f*u);for(let x=0;x<m.length;x++)m[x]=r(d(x),g(x))?0:1;function p(x,w,S){let T=r(x,w)?a:o,v=y(x,w);if(m[v]&&T(x,w,d(v),g(v)))return v;let b=-1,R=1/0,P=Math.ceil(S/l)+1,O=v%f,V=Math.floor(v/f);for(let q=Math.max(0,V-P);q<=Math.min(u-1,V+P);q++)for(let F=Math.max(0,O-P);F<=Math.min(f-1,O+P);F++){let z=q*f+F;if(!m[z])continue;let U=Math.hypot(d(z)-x,g(z)-w);U<R&&U<S&&T(x,w,d(z),g(z))&&(R=U,b=z)}return b}function M(x,w,S,T){if(r(S,T))return null;if(r(x,w)){let U=p(x,w,.5);if(U<0)return null;x=d(U),w=g(U)}if(o(x,w,S,T))return[[x,w],[S,T]];let v=p(x,w,.65),b=p(S,T,.65);if(v<0||b<0)return null;let R=new Int32Array(m.length).fill(-1),P=new Int32Array(m.length),O=0,V=0;for(P[V++]=v,R[v]=v;O<V&&R[b]===-1;){let U=P[O++],Y=U%f,j=(U-Y)/f;Y>0&&m[U-1]&&R[U-1]===-1&&(R[U-1]=U,P[V++]=U-1),Y<f-1&&m[U+1]&&R[U+1]===-1&&(R[U+1]=U,P[V++]=U+1),j>0&&m[U-f]&&R[U-f]===-1&&(R[U-f]=U,P[V++]=U-f),j<u-1&&m[U+f]&&R[U+f]===-1&&(R[U+f]=U,P[V++]=U+f)}if(R[b]===-1)return null;let q=[[S,T]];for(let U=b;U!==v;U=R[U])q.push([d(U),g(U)]);q.push([d(v),g(v)],[x,w]),q.reverse();let F=[q[0]],z=0;for(;z<q.length-1;){let U=z+1;for(let Y=q.length-1;Y>z+1;Y--)if(o(q[z][0],q[z][1],q[Y][0],q[Y][1])){U=Y;break}F.push(q[U]),z=U}return F}function E(x,w,S=.65){if(!r(x,w))return[x,w];let T=p(x,w,S);return T<0?null:[d(T),g(T)]}return{blocked:r,clear:o,sightline:a,path:M,nearestFree:E}}var gr=["battery","balanced","high","ultra"];function xy(i){let t=Math.max(.5,i||1);return{ultra:{dpr:Math.min(t,2),floor:1.5,shadow:2048,ao:!0,mirror:512},high:{dpr:Math.min(t,1.5),floor:1,shadow:2048,ao:!0,mirror:512},balanced:{dpr:Ee(t,1,1.25),floor:.85,shadow:1024,ao:!1,mirror:256},battery:{dpr:.75,floor:.6,shadow:1024,ao:!1,mirror:0}}}var Of=.15,Bf=i=>Math.round(i*100)/100,cc=class{constructor(t,e){this.auto=!0;this.frameMs=16.7;this.workMs=4;this.slowFor=0;this.fastFor=0;this.holdUntil=0;this.lastUpAt=-1e9;this.lastUpFromDpr=0;this.lastUpFromTier="battery";this.ceilingDpr=1/0;this.ceilingTier=3;this.table=xy(t),this.maxTier=t>1.5&&!e?3:2,this.startTier=e?"balanced":"high",this.tier=this.startTier,this.dpr=this.table[this.tier].dpr}get spec(){return this.table[this.tier]}set(t){t==="auto"?(this.auto=!0,this.tier=this.startTier,this.ceilingDpr=1/0,this.ceilingTier=this.maxTier):(this.auto=!1,this.tier=t),this.dpr=this.table[this.tier].dpr,this.slowFor=this.fastFor=0}sample(t,e,n){return e<=0||(e=Math.min(e,250),this.frameMs+=(e-this.frameMs)*.1,this.workMs+=(n-this.workMs)*.1,!this.auto||t<this.holdUntil)?!1:(this.frameMs>20?(this.slowFor+=e,this.fastFor=0):this.frameMs<12||this.frameMs<18.5&&this.workMs<6?(this.fastFor+=e,this.slowFor=0):(this.slowFor=Math.max(0,this.slowFor-e),this.fastFor=Math.max(0,this.fastFor-e)),this.slowFor>1e3?this.stepDown(t):this.fastFor>3e3?this.stepUp(t):!1)}stepDown(t){this.slowFor=this.fastFor=0,this.holdUntil=t+800,t-this.lastUpAt<5e3&&(this.ceilingDpr=this.lastUpFromDpr,this.ceilingTier=gr.indexOf(this.lastUpFromTier));let e=Bf(this.dpr-Of),n=gr.indexOf(this.tier);if(e<this.table[this.tier].floor-.001)if(n===0){if(e=this.table.battery.floor,e>=this.dpr)return!1}else n--,e=Math.min(e,this.table[gr[n]].dpr);return this.tier=gr[n],this.dpr=e,!0}stepUp(t){this.fastFor=0,this.holdUntil=t+800;let e=this.table[this.tier],n=gr.indexOf(this.tier),s=this.dpr,r=this.tier,o=Bf(this.dpr+Of);if(o<=Math.min(e.dpr,this.ceilingDpr)+.001)this.dpr=o;else if(this.dpr<e.dpr-.001&&e.dpr<=this.ceilingDpr)this.dpr=e.dpr;else if(n<Math.min(this.maxTier,this.ceilingTier))this.tier=gr[n+1];else return!1;return this.lastUpAt=t,this.lastUpFromDpr=s,this.lastUpFromTier=r,!0}};var hc=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},vy=new In(-1,1,1,-1,0,1),au=class extends Ne{constructor(){super(),this.setAttribute("position",new pe([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new pe([0,2,0,0,2,0],2))}},_y=new au,xr=class{constructor(t){this._mesh=new be(_y,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,vy)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var Uo={name:"GTAOShader",defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new ft},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new se},cameraProjectionMatrixInverse:{value:new se},cameraWorldMatrix:{value:new se},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new L(-1,-1,-1)},sceneBoxMax:{value:new L(1,1,1)}},vertexShader:`

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
		}`},Fo={name:"GTAODepthShader",defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
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

		}`},uc={name:"GTAOBlendShader",uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
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
		}`};function kf(i=5){let t=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),e=yy(t),n=e.length,s=new Uint8Array(n*4);for(let o=0;o<n;++o){let a=e[o],l=2*Math.PI*a/n,c=new L(Math.cos(l),Math.sin(l),0).normalize();s[o*4]=(c.x*.5+.5)*255,s[o*4+1]=(c.y*.5+.5)*255,s[o*4+2]=127,s[o*4+3]=255}let r=new Hn(s,t,t);return r.wrapS=ii,r.wrapT=ii,r.needsUpdate=!0,r}function yy(i){let t=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),e=t*t,n=Array(e).fill(0),s=Math.floor(t/2),r=t-1;for(let o=1;o<=e;){if(s===-1&&r===t?(r=t-2,s=0):(r===t&&(r=0),s<0&&(s=t-1)),n[s*t+r]!==0){r-=2,s++;continue}else n[s*t+r]=o++;r++,s--}return n}var Oo={name:"PoissonDenoiseShader",defines:{SAMPLES:16,SAMPLE_VECTORS:lu(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new ft},cameraProjectionMatrixInverse:{value:new se},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

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
		}`};function lu(i,t,e){let n=by(i,t,e),s="vec3[SAMPLES](";for(let r=0;r<i;r++){let o=n[r];s+=`vec3(${o.x}, ${o.y}, ${o.z})${r<i-1?",":")"}`}return s}function by(i,t,e){let n=[];for(let s=0;s<i;s++){let r=2*Math.PI*t*s/i,o=Math.pow(s/(i-1),e);n.push(new L(Math.cos(r),Math.sin(r),o))}return n}var dc={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var fc=class{constructor(t=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let e=0;e<256;e++)this.p[e]=Math.floor(t.random()*256);this.perm=[];for(let e=0;e<512;e++)this.perm[e]=this.p[e&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(t,e){let n,s,r,o=.5*(Math.sqrt(3)-1),a=(t+e)*o,l=Math.floor(t+a),c=Math.floor(e+a),h=(3-Math.sqrt(3))/6,f=(l+c)*h,u=l-f,d=c-f,g=t-u,y=e-d,m,p;g>y?(m=1,p=0):(m=0,p=1);let M=g-m+h,E=y-p+h,x=g-1+2*h,w=y-1+2*h,S=l&255,T=c&255,v=this.perm[S+this.perm[T]]%12,b=this.perm[S+m+this.perm[T+p]]%12,R=this.perm[S+1+this.perm[T+1]]%12,P=.5-g*g-y*y;P<0?n=0:(P*=P,n=P*P*this._dot(this.grad3[v],g,y));let O=.5-M*M-E*E;O<0?s=0:(O*=O,s=O*O*this._dot(this.grad3[b],M,E));let V=.5-x*x-w*w;return V<0?r=0:(V*=V,r=V*V*this._dot(this.grad3[R],x,w)),70*(n+s+r)}noise3d(t,e,n){let s,r,o,a,c=(t+e+n)*.3333333333333333,h=Math.floor(t+c),f=Math.floor(e+c),u=Math.floor(n+c),d=1/6,g=(h+f+u)*d,y=h-g,m=f-g,p=u-g,M=t-y,E=e-m,x=n-p,w,S,T,v,b,R;M>=E?E>=x?(w=1,S=0,T=0,v=1,b=1,R=0):M>=x?(w=1,S=0,T=0,v=1,b=0,R=1):(w=0,S=0,T=1,v=1,b=0,R=1):E<x?(w=0,S=0,T=1,v=0,b=1,R=1):M<x?(w=0,S=1,T=0,v=0,b=1,R=1):(w=0,S=1,T=0,v=1,b=1,R=0);let P=M-w+d,O=E-S+d,V=x-T+d,q=M-v+2*d,F=E-b+2*d,z=x-R+2*d,U=M-1+3*d,Y=E-1+3*d,j=x-1+3*d,ht=h&255,ct=f&255,yt=u&255,xt=this.perm[ht+this.perm[ct+this.perm[yt]]]%12,Kt=this.perm[ht+w+this.perm[ct+S+this.perm[yt+T]]]%12,kt=this.perm[ht+v+this.perm[ct+b+this.perm[yt+R]]]%12,Q=this.perm[ht+1+this.perm[ct+1+this.perm[yt+1]]]%12,mt=.6-M*M-E*E-x*x;mt<0?s=0:(mt*=mt,s=mt*mt*this._dot3(this.grad3[xt],M,E,x));let ut=.6-P*P-O*O-V*V;ut<0?r=0:(ut*=ut,r=ut*ut*this._dot3(this.grad3[Kt],P,O,V));let Ft=.6-q*q-F*F-z*z;Ft<0?o=0:(Ft*=Ft,o=Ft*Ft*this._dot3(this.grad3[kt],q,F,z));let Mt=.6-U*U-Y*Y-j*j;return Mt<0?a=0:(Mt*=Mt,a=Mt*Mt*this._dot3(this.grad3[Q],U,Y,j)),32*(s+r+o+a)}noise4d(t,e,n,s){let r=this.grad4,o=this.simplex,a=this.perm,l=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20,h,f,u,d,g,y=(t+e+n+s)*l,m=Math.floor(t+y),p=Math.floor(e+y),M=Math.floor(n+y),E=Math.floor(s+y),x=(m+p+M+E)*c,w=m-x,S=p-x,T=M-x,v=E-x,b=t-w,R=e-S,P=n-T,O=s-v,V=b>R?32:0,q=b>P?16:0,F=R>P?8:0,z=b>O?4:0,U=R>O?2:0,Y=P>O?1:0,j=V+q+F+z+U+Y,ht=o[j][0]>=3?1:0,ct=o[j][1]>=3?1:0,yt=o[j][2]>=3?1:0,xt=o[j][3]>=3?1:0,Kt=o[j][0]>=2?1:0,kt=o[j][1]>=2?1:0,Q=o[j][2]>=2?1:0,mt=o[j][3]>=2?1:0,ut=o[j][0]>=1?1:0,Ft=o[j][1]>=1?1:0,Mt=o[j][2]>=1?1:0,St=o[j][3]>=1?1:0,te=b-ht+c,Vt=R-ct+c,rt=P-yt+c,N=O-xt+c,G=b-Kt+2*c,at=R-kt+2*c,Z=P-Q+2*c,Lt=O-mt+2*c,X=b-ut+3*c,Et=R-Ft+3*c,pt=P-Mt+3*c,B=O-St+3*c,oe=b-1+4*c,It=R-1+4*c,A=P-1+4*c,_=O-1+4*c,H=m&255,$=p&255,nt=M&255,gt=E&255,bt=a[H+a[$+a[nt+a[gt]]]]%32,tt=a[H+ht+a[$+ct+a[nt+yt+a[gt+xt]]]]%32,lt=a[H+Kt+a[$+kt+a[nt+Q+a[gt+mt]]]]%32,st=a[H+ut+a[$+Ft+a[nt+Mt+a[gt+St]]]]%32,Xt=a[H+1+a[$+1+a[nt+1+a[gt+1]]]]%32,Tt=.6-b*b-R*R-P*P-O*O;Tt<0?h=0:(Tt*=Tt,h=Tt*Tt*this._dot4(r[bt],b,R,P,O));let wt=.6-te*te-Vt*Vt-rt*rt-N*N;wt<0?f=0:(wt*=wt,f=wt*wt*this._dot4(r[tt],te,Vt,rt,N));let Wt=.6-G*G-at*at-Z*Z-Lt*Lt;Wt<0?u=0:(Wt*=Wt,u=Wt*Wt*this._dot4(r[lt],G,at,Z,Lt));let Zt=.6-X*X-Et*Et-pt*pt-B*B;Zt<0?d=0:(Zt*=Zt,d=Zt*Zt*this._dot4(r[st],X,Et,pt,B));let Jt=.6-oe*oe-It*It-A*A-_*_;return Jt<0?g=0:(Jt*=Jt,g=Jt*Jt*this._dot4(r[Xt],oe,It,A,_)),27*(h+f+u+d+g)}_dot(t,e,n){return t[0]*e+t[1]*n}_dot3(t,e,n,s){return t[0]*e+t[1]*n+t[2]*s}_dot4(t,e,n,s,r){return t[0]*e+t[1]*n+t[2]*s+t[3]*r}};var vr=class i extends hc{constructor(t,e,n=512,s=512,r,o,a){super(),this.width=n,this.height=s,this.clear=!0,this.camera=e,this.scene=t,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=kf(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new Ie(this.width,this.height,{type:Xe}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new Fe({defines:Object.assign({},Uo.defines),uniforms:ci.clone(Uo.uniforms),vertexShader:Uo.vertexShader,fragmentShader:Uo.fragmentShader,blending:We,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new ro,this.normalMaterial.blending=We,this.pdMaterial=new Fe({defines:Object.assign({},Oo.defines),uniforms:ci.clone(Oo.uniforms),vertexShader:Oo.vertexShader,fragmentShader:Oo.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new Fe({defines:Object.assign({},Fo.defines),uniforms:ci.clone(Fo.uniforms),vertexShader:Fo.vertexShader,fragmentShader:Fo.fragmentShader,blending:We}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new Fe({uniforms:ci.clone(dc.uniforms),vertexShader:dc.vertexShader,fragmentShader:dc.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:go,blendDst:fs,blendEquation:Sn,blendSrcAlpha:mo,blendDstAlpha:fs,blendEquationAlpha:Sn}),this.blendMaterial=new Fe({uniforms:ci.clone(uc.uniforms),vertexShader:uc.vertexShader,fragmentShader:uc.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:tl,blendSrc:go,blendDst:fs,blendEquation:Sn,blendSrcAlpha:mo,blendDstAlpha:fs,blendEquationAlpha:Sn}),this._fsQuad=new xr(null),this._originalClearColor=new Bt,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),o!==void 0&&this.updateGtaoMaterial(o),a!==void 0&&this.updatePdMaterial(a)}setSize(t,e){this.width=t,this.height=e,this.gtaoRenderTarget.setSize(t,e),this.normalRenderTarget.setSize(t,e),this.pdRenderTarget.setSize(t,e),this.gtaoMaterial.uniforms.resolution.value.set(t,e),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(t,e),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(t,e){t!==void 0?(this.depthTexture=t,this.normalTexture=e,this._renderGBuffer=!1):(this.depthTexture=new Wn,this.depthTexture.format=li,this.depthTexture.type=Hi,this.normalRenderTarget=new Ie(this.width,this.height,{minFilter:Ue,magFilter:Ue,type:Xe,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);let n=this.normalTexture?1:0,s=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.defines.DEPTH_SWIZZLING=s,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.defines.DEPTH_SWIZZLING=s,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(t){t?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(t.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(t.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(t){t.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=t.radius),t.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=t.distanceExponent),t.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=t.thickness),t.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=t.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),t.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=t.scale),t.samples!==void 0&&t.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=t.samples,this.gtaoMaterial.needsUpdate=!0),t.screenSpaceRadius!==void 0&&(t.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=t.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(t){let e=!1;t.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=t.lumaPhi),t.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=t.depthPhi),t.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=t.normalPhi),t.radius!==void 0&&t.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=t.radius),t.radiusExponent!==void 0&&t.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=t.radiusExponent,e=!0),t.rings!==void 0&&t.rings!==this.pdRings&&(this.pdRings=t.rings,e=!0),t.samples!==void 0&&t.samples!==this.pdSamples&&(this.pdSamples=t.samples,e=!0),e&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=lu(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(t,e,n){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(t,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(t,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(t,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case i.OUTPUT.Off:break;case i.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=We,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=We,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=We,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(t,this.depthRenderMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=We,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e);break;case i.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=We,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:e),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(t,this.blendMaterial,this.renderToScreen?null:e);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(t,e,n,s,r){t.getClearColor(this._originalClearColor);let o=t.getClearAlpha(),a=t.autoClear;t.setRenderTarget(n),t.autoClear=!1,s!=null&&(t.setClearColor(s),t.setClearAlpha(r||0),t.clear()),this._fsQuad.material=e,this._fsQuad.render(t),t.autoClear=a,t.setClearColor(this._originalClearColor),t.setClearAlpha(o)}_renderOverride(t,e,n,s,r){t.getClearColor(this._originalClearColor);let o=t.getClearAlpha(),a=t.autoClear;t.setRenderTarget(n),t.autoClear=!1,s=e.clearColor||s,r=e.clearAlpha||r,s!=null&&(t.setClearColor(s),t.setClearAlpha(r||0),t.clear()),this.scene.overrideMaterial=e,t.render(this.scene,this.camera),this.scene.overrideMaterial=null,t.autoClear=a,t.setClearColor(this._originalClearColor),t.setClearAlpha(o)}_overrideVisibility(){let t=this.scene,e=this._visibilityCache;t.traverse(function(n){(n.isPoints||n.isLine||n.isLine2)&&n.visible&&(n.visible=!1,e.push(n))})}_restoreVisibility(){let t=this._visibilityCache;for(let e=0;e<t.length;e++)t[e].visible=!0;t.length=0}_generateNoise(t=64){let e=new fc,n=t*t*4,s=new Uint8Array(n);for(let o=0;o<t;o++)for(let a=0;a<t;a++){let l=o,c=a;s[(o*t+a)*4]=(e.noise(l,c)*.5+.5)*255,s[(o*t+a)*4+1]=(e.noise(l+t,c)*.5+.5)*255,s[(o*t+a)*4+2]=(e.noise(l,c+t)*.5+.5)*255,s[(o*t+a)*4+3]=(e.noise(l+t,c+t)*.5+.5)*255}let r=new Hn(s,t,t,vn,Qe);return r.wrapS=ii,r.wrapT=ii,r.needsUpdate=!0,r}};vr.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};var My=`
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Sy=`
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
}`,ys=class{constructor(t,e,n,s,r){this.scene=t;this.gtao=null;this.bg=new Bt;this.toneMapping=-1;this.target=new Ie(n,s,{type:Xe,samples:r.samples}),this.white=new Hn(new Uint8Array([255,255,255,255]),1,1),this.white.needsUpdate=!0,r.ao&&(this.gtao=new vr(t,e,n,s),this.gtao.updateGtaoMaterial({radius:.22,distanceExponent:1.4,thickness:.5,scale:1}),this.gtao.output=vr.OUTPUT.Off),this.material=new nr({name:"TourComposite",uniforms:{tScene:{value:this.target.texture},tAO:{value:this.gtao?this.gtao.gtaoMap:this.white},intensity:{value:0},background:{value:new L},toneMappingExposure:{value:1}},vertexShader:My,fragmentShader:Sy,depthTest:!1,depthWrite:!1}),this.quad=new xr(this.material)}get hasAO(){return this.gtao!==null}setSize(t,e){this.target.setSize(t,e),this.gtao&&this.gtao.setSize(t,e)}renderScene(t,e,n,s){t.setRenderTarget(this.target),t.setClearColor(0,0),n(),t.render(this.scene,e),s(),this.gtao&&(this.gtao.camera=e,this.gtao.render(t,this.target,this.target,0,!1)),t.setRenderTarget(null)}composite(t,e,n,s){let r=this.material.uniforms;r.intensity.value=this.gtao?e:0,this.bg.copy(n).convertLinearToSRGB(),r.background.value.set(this.bg.r,this.bg.g,this.bg.b),r.toneMappingExposure.value=t.toneMappingExposure,this.syncDefines(t),t.setRenderTarget(s),this.quad.render(t),t.setRenderTarget(null)}syncDefines(t){if(this.toneMapping===t.toneMapping)return;this.toneMapping=t.toneMapping;let e={};t.toneMapping===ps?e.ACES_FILMIC_TONE_MAPPING="":t.toneMapping===_o?e.NEUTRAL_TONE_MAPPING="":t.toneMapping===vo?e.AGX_TONE_MAPPING="":t.toneMapping===xo&&(e.LINEAR_TONE_MAPPING=""),this.material.defines=e,this.material.needsUpdate=!0}dispose(){this.target.dispose(),this.gtao?.dispose(),this.quad.dispose(),this.material.dispose(),this.white.dispose()}};async function Vf(i){let t=Math.max(320,Math.min(1600,Math.round(i.screenWidth))),e=Math.round(t*9/16),n=wy(i.camera,t/e),s=i.ao&&n.isPerspectiveCamera,r=new ys(i.scene,n,t,e,{samples:4,ao:s}),o=new Ie(t,e,{type:Qe}),a=new Uint8Array(t*e*4);try{let u=i.mirror;r.renderScene(i.renderer,n,()=>u?.force(),()=>{u&&(u.disarm(),u.stale=!0)}),r.composite(i.renderer,1,i.background,o);try{await i.renderer.readRenderTargetPixelsAsync(o,0,0,t,e,a)}catch{i.renderer.readRenderTargetPixels(o,0,0,t,e,a)}}finally{r.dispose(),o.dispose()}let l=document.createElement("canvas");l.width=t,l.height=e;let c=l.getContext("2d");if(!c)return null;let h=c.createImageData(t,e),f=t*4;for(let u=0;u<e;u++)h.data.set(a.subarray((e-1-u)*f,(e-u)*f),u*f);return c.putImageData(h,0,0),Ty(c,t,e,i.caption),new Promise(u=>l.toBlob(d=>u(d),"image/jpeg",.9))}function wy(i,t){if(i.isPerspectiveCamera){let a=i,l=new He(a.fov,t,a.near,a.far),c=2*Math.atan(Math.tan(92*Math.PI/180/2)/t)*180/Math.PI;return l.fov=Math.min(a.fov,c),l.position.copy(a.position),l.quaternion.copy(a.quaternion),l.updateProjectionMatrix(),l.updateMatrixWorld(!0),l}let e=i,n=(e.top-e.bottom)/2/e.zoom,s=(e.left+e.right)/2/e.zoom,r=(e.top+e.bottom)/2/e.zoom,o=new In(s-n*t,s+n*t,r+n,r-n,e.near,e.far);return o.position.copy(e.position),o.quaternion.copy(e.quaternion),o.updateProjectionMatrix(),o.updateMatrixWorld(!0),o}function Ty(i,t,e,n){let s=Math.round(Math.max(54,e*.085)),r=e-s,o=Math.round(s*.42);i.save(),i.globalAlpha=.9,i.fillStyle=n.night,i.fillRect(0,r,t,s),i.globalAlpha=1,i.fillStyle=n.accent,i.fillRect(0,r,t,Math.max(2,Math.round(s*.035)));let a=n.hour?n.hour:"";i.textBaseline="alphabetic",i.font=`500 ${Math.round(s*.3)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;let l=a?i.measureText(a).width:0;a&&(i.fillStyle=n.paper,i.textAlign="right",i.fillText(a,t-o,r+s*.62)),i.textAlign="left",i.fillStyle=n.paper,i.font=`600 ${Math.round(s*.31)}px Georgia, 'Times New Roman', serif`,i.fillText(zf(i,n.title,t-o*3-l),o,r+s*.48),i.globalAlpha=.72,i.font=`500 ${Math.round(s*.19)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;let c=[n.area,"Cabana 3D tour"].filter(Boolean).join("  \xB7  ").toUpperCase();"letterSpacing"in i&&(i.letterSpacing=`${Math.round(s*.02)}px`),i.fillText(zf(i,c,t-o*3-l),o,r+s*.8),i.restore()}function zf(i,t,e){if(i.measureText(t).width<=e)return t;let n=t;for(;n.length>1&&i.measureText(n+"\u2026").width>e;)n=n.slice(0,-1);return n.trimEnd()+"\u2026"}var Gf=1.35,Hf=2.5,Wf=1.3,Ey=1.9,Ay=1.5,Cy=1.7,Ry=1.1,Zn=1.2,pc=class{constructor(){this.x=0;this.z=0;this.yaw=0;this.pitch=0;this.eye=Mf;this.speed=0;this.journey=null;this.arrived=null;this.vx=0;this.vz=0;this.turnV=0;this.pitchV=0;this.bobPhase=0;this.bobAmp=0;this.bob=0;this.last={x:NaN,z:NaN,yaw:NaN,pitch:NaN,bob:NaN,eye:NaN};this.tmp=[0,0]}place(t,e,n,s){this.x=t,this.z=e,this.yaw=n,this.pitch=Ee(s,-Zn,Zn),this.vx=this.vz=this.turnV=this.pitchV=this.speed=0,this.bobAmp=this.bob=0,this.journey=null}get busy(){return this.journey!==null||this.speed>.001||this.turnV!==0||this.pitchV!==0||this.bobAmp>2e-4}walk(t,e,n,s){let r=[0];for(let a=1;a<t.length;a++)r.push(r[a-1]+Math.hypot(t[a][0]-t[a-1][0],t[a][1]-t[a-1][1]));let o=Math.min(Wf,Math.hypot(this.vx,this.vz));this.journey={points:t,cum:r,length:r[r.length-1],s:0,v:o,seg:0,yaw:e,pitch:n,freeLook:!1,room:s,settling:!1}}cancelJourney(){let t=this.journey;if(t){if(!t.settling&&t.v>0&&t.points.length>1){let e=t.points[t.seg],n=t.points[Math.min(t.seg+1,t.points.length-1)],s=Math.hypot(n[0]-e[0],n[1]-e[1])||1;this.vx=(n[0]-e[0])/s*t.v,this.vz=(n[1]-e[1])/s*t.v}this.journey=null}}step(t,e,n,s){this.journey?this.followJourney(t,e.run):this.moveFree(t,e,n);let r=e.turn*Cy,o=e.pitch*Ry;this.turnV+=(r-this.turnV)*_s(12,t),this.pitchV+=(o-this.pitchV)*_s(12,t),!r&&Math.abs(this.turnV)<.001&&(this.turnV=0),!o&&Math.abs(this.pitchV)<.001&&(this.pitchV=0),this.yaw+=this.turnV*t,this.pitch=Ee(this.pitch+this.pitchV*t,-Zn,Zn);let a=s?0:Math.min(1.2,this.speed/Gf)*.011;this.bobAmp+=(a-this.bobAmp)*_s(6,t),this.bobAmp<2e-4&&!a&&(this.bobAmp=0),this.bobPhase=(this.bobPhase+t*(4.2+this.speed*2.2))%(Math.PI*2),this.bob=Math.sin(this.bobPhase*2)*this.bobAmp;let l=this.last,c=l.x!==this.x||l.z!==this.z||l.yaw!==this.yaw||l.pitch!==this.pitch||l.bob!==this.bob||l.eye!==this.eye;return l.x=this.x,l.z=this.z,l.yaw=this.yaw,l.pitch=this.pitch,l.bob=this.bob,l.eye=this.eye,c}apply(t){t.position.set(this.x,this.eye+this.bob,this.z),t.rotation.set(this.pitch,this.yaw+Math.PI,0),t.updateMatrixWorld()}moveFree(t,e,n){let s=e.strafe,r=e.forward,o=Math.hypot(s,r);o>1&&(s/=o,r/=o);let a=e.run?Hf:Gf,l=Math.sin(this.yaw),c=Math.cos(this.yaw),h=(-c*s+l*r)*a,f=(l*s+c*r)*a,u=h*h+f*f>this.vx*this.vx+this.vz*this.vz,d=_s(u?7:10,t);if(this.vx+=(h-this.vx)*d,this.vz+=(f-this.vz)*d,!h&&Math.abs(this.vx)<.005&&(this.vx=0),!f&&Math.abs(this.vz)<.005&&(this.vz=0),!this.vx&&!this.vz){this.speed=0;return}let g=this.vx*t,y=this.vz*t,m=Math.max(1,Math.ceil(Math.max(Math.abs(g),Math.abs(y))/.035)),p=n.blocked(this.x,this.z),M=this.x,E=this.z;for(let x=0;x<m;x++){let w=this.x+g/m;p||!n.blocked(w,this.z)?this.x=w:this.vx=0;let S=this.z+y/m;p||!n.blocked(this.x,S)?this.z=S:this.vz=0}this.speed=Math.hypot(this.x-M,this.z-E)/Math.max(t,1e-4)}followJourney(t,e){let n=this.journey;if(!n.settling){let s=n.length-n.s,r=Math.max(.16,Math.sqrt(2*Ay*s));n.v=Math.min(e?Hf:Wf,n.v+Ey*t,r),n.s=Math.min(n.length,n.s+n.v*t),this.pointAt(n,n.s),this.x=this.tmp[0],this.z=this.tmp[1],this.speed=n.v,this.vx=this.vz=0,n.s>=n.length-1e-4&&(n.settling=!0,n.v=0,this.speed=0)}if(n.freeLook)n.settling&&this.finish();else{let s=n.length-n.s,r=n.yaw===null?0:n.length<.3?1:1-on(0,1.2,s),o=this.yaw;if(!n.settling){this.pointAt(n,Math.min(n.length,n.s+.9));let l=this.tmp[0]-this.x,c=this.tmp[1]-this.z;l*l+c*c>.0025&&(o=Math.atan2(l,c))}n.yaw!==null&&(o+=pr(o,n.yaw)*r),this.yaw+=pr(this.yaw,o)*_s(n.settling?5:3.2,t);let a=n.pitch!==null?-.06+(n.pitch+.06)*r:-.06;this.pitch+=(a-this.pitch)*_s(n.settling?5:3,t),n.settling&&Math.abs(pr(this.yaw,o))<.002&&Math.abs(a-this.pitch)<.002&&(this.yaw=o,this.pitch=a,this.finish())}}finish(){this.arrived=this.journey,this.journey=null}pointAt(t,e){let n=t.seg;for(;n<t.points.length-2&&t.cum[n+1]<e;)n++;e===t.s&&(t.seg=n);let s=t.points[n],r=t.points[Math.min(n+1,t.points.length-1)],o=t.cum[Math.min(n+1,t.cum.length-1)]-t.cum[n],a=o>1e-6?Ee((e-t.cum[n])/o,0,1):1;this.tmp[0]=s[0]+(r[0]-s[0])*a,this.tmp[1]=s[1]+(r[1]-s[1])*a}};function Py(i,t){return i===0?0:i===1?.2:i===2?.45:i===3?.85:i===45||i===48?.8:i>=51&&i<=57?.75:i>=61&&i<=67||i>=71&&i<=77?.88:i>=80&&i<=82?.7:i>=95?.95:/cloud|overcast|fog/.test(t)?.6:.25}function Iy(i,t){return i>=51&&i<=67||i>=80&&i<=82||i>=95||/rain|drizzle|shower|thunder/.test(t)}function Ly(i){let t=i.trim().toLowerCase();return t?t[0].toUpperCase()+t.slice(1):""}async function Xf(i,t,e){let n=`/api/utilities?action=weather&lat=${i.toFixed(5)}&lng=${t.toFixed(5)}`,s=await fetch(n,{signal:e,credentials:"same-origin",headers:{accept:"application/json"}});if(!s.ok)return null;let r=await s.json(),o=r&&r.current;if(!o||!Number.isFinite(Number(o.temp)))return null;let a=Number(o.wmoCode)||0,l=String(o.condition||"").toLowerCase();return{temp:Math.round(Number(o.temp)),label:Ly(String(o.label||"")),cloud:Py(a,l),rain:Iy(a,l),isDay:o.isDay!==!1&&o.isDay!==0}}var Dy=180,Ny=200,_r=128,qf=5.5,cu=22,Uy=24,Fy=35,Oy=80,hu=45,uu=40,Yf=.12,Zf=.21,$f="That spot can\u2019t be reached from here",dw=(i,t,e)=>{let n;try{n=new Yl({antialias:!0,alpha:!1,stencil:!1,powerPreference:"high-performance"})}catch{return setTimeout(()=>e.onError("This device could not start the 3D view. The original photographs are all here.")),zy(t)}return By(i,t,e,n)};function By(i,t,e,n){let s=matchMedia("(pointer: coarse)").matches,r=matchMedia("(prefers-reduced-motion: reduce)"),o=r.matches,a=bf(),l=t.listing.tzOffsetHours,c=t.northDeg??0,h=!1,f=!1,u=!1,d=!1,g=!1,y=document.hidden,m=0,p=!1,M=!1,E=0,x=0,w=!1,S=0,T=!0,v=0,b=!0,R=0,P=0,O=!1,V="idle",q=0,F=0,z={calls:0,triangles:0},U=new cc(window.devicePixelRatio||1,s),Y=n.domElement;n.setPixelRatio(U.dpr),n.outputColorSpace=en,n.toneMapping=ps,n.toneMappingExposure=t.lights.exposure??1,n.shadowMap.enabled=!0,n.shadowMap.type=ds,n.shadowMap.autoUpdate=!1,n.info.autoReset=!1,getComputedStyle(i).position==="static"&&(i.style.position="relative"),Y.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent",Y.className="tour-canvas",ky(t.theme.accent),Y.tabIndex=0,Y.setAttribute("role","application"),Y.setAttribute("aria-roledescription","3D tour"),Y.setAttribute("aria-label",`${t.listing.title}, 3D view. Move with W A S D or the arrow keys, turn with Q and E, drag to look, click the floor to walk there.`),i.appendChild(Y);let j=Math.max(1,i.clientWidth),ht=Math.max(1,i.clientHeight);n.setSize(j,ht,!1);let ct=new os;ct.matrixWorldAutoUpdate=!0;let yt=j/ht<.8?70:62,xt=new He(yt,j/ht,.05,80);xt.rotation.order="YXZ";let Kt=new In(-1,1,1,-1,.1,100);Kt.up.set(0,0,-1);let kt=xt,Q=t.plan.bounds,mt=(Q.minX+Q.maxX)/2,ut=(Q.minZ+Q.maxZ)/2,Ft=Math.hypot(Q.maxX-Q.minX,Q.maxZ-Q.minZ)/2,Mt=new Io(xt,Y);Mt.enabled=!1,Mt.enableDamping=!o,Mt.dampingFactor=.085,Mt.rotateSpeed=.75,Mt.minPolarAngle=.12,Mt.maxPolarAngle=Math.PI/2-.1,Mt.screenSpacePanning=!0;let St=new Io(Kt,Y);St.enabled=!1,St.enableRotate=!1,St.enableDamping=!1,St.minZoom=.8,St.maxZoom=4,St.screenSpacePanning=!0;let te=()=>{It.active||Oe()};Mt.addEventListener("change",te),St.addEventListener("change",te),Mt.addEventListener("start",Ms),St.addEventListener("start",Ms);let Vt=null,rt=null,N=null,G=null,at=null,Z=null,Lt=2.6,X=new pc,Et={x:0,z:0,yaw:0,pitch:0},pt="walk",B=null,oe=!0,It=new tc,A={playing:!1,index:0,phase:"walk",dwell:0,baseYaw:0,progress:0,dirty:!1,lastAt:0},_=t.start,H=!0,$=0,nt=!0,gt={strafe:0,forward:0,turn:0,pitch:0,run:!1},bt={yaw:0,pitch:0},tt={},lt={azimuthDeg:0,elevationDeg:0},st={live:!1,date:Le(),hour:10.5,jd0:0,weather:null,playing:!1};st.jd0=Do(st.date);let Xt=!0,Tt=0,wt=0,Wt=0,Zt=0,Jt=null,k=new Ql,Ct=!1,it=new nc(i,t.theme.accent),Pt=new fo,Dt=new ft,dt=new hn(new L(0,1,0),0),vt=new L,Gt=new L,ve=new L,ae={on:!1,x:0,y:0,quiet:!1},mn={ready:()=>u&&!f,paused:()=>g,mode:()=>It.active?B??pt:pt,look(D,ot){pt!=="walk"||It.active||(X.yaw+=D,X.pitch=Ee(X.pitch+ot,-Zn,Zn),qt(),Oe())},fov:()=>yt,setFov:D=>$i.setFov(D),hover:(D,ot)=>{ae.on=!0,ae.quiet=!1,ae.x=D,ae.y=ot,le()},hoverEnd:()=>{ae.on=!1,it.cursor.show(!1),Y.style.cursor=""},tap:$t,dragStart:()=>{it.cursor.show(!1),qt()},manual:()=>{At(),X.cancelJourney(),it.target.show(!1)},wake:Jn,lockChanged(D){e.onHint?.(D?"Mouse look on \xB7 press Esc to release":"Mouse look off"),ae.on=!1,it.cursor.show(!1),D&&Oe()},nextRoom(){let D=t.rooms.map(_t=>_t.id),ot=D.indexOf(J());$i.goRoom(D[(ot+1)%D.length])}},de=new rc(Y,mn);function Jn(){m||p||!u||h||f||y||(M=!1,m=requestAnimationFrame(Ss))}function Ms(){Jn()}function Oe(){T=!0,Jn()}function Ss(D){if(m=0,!(h||f||y)){p=!0;try{_c(D)}catch(ot){a&&console.error(ot),ti("The 3D view stopped unexpectedly. Reopen the tour, or browse the original photographs.")}finally{p=!1}}}function _c(D){let ot=M,_t=ot?Math.min(.1,Math.max(0,D-E)/1e3):1/60;E=D,x++;let Rt=performance.now(),ee=!1;if(u){if(!g){if(de.pollGamepad(),de.gyroDelta(bt)&&pt==="walk"&&!It.active&&(X.yaw+=bt.yaw,X.pitch=Ee(X.pitch+bt.pitch,-Zn,Zn),ee=!0),It.active){let Cn=It.step(_t,xt);ee=!0,B==="walk"&&!oe&&xt.position.y<Lt-.05&&jn(!0),Cn&&C()}else pt==="walk"?(de.read(gt),X.step(_t,gt,rt,o)&&(ee=!0),X.arrived&&Nt(X.arrived),zt(_t)&&(ee=!0)):pt==="dollhouse"?(Mt.update()&&(ee=!0),W()):St.update()&&(ee=!0);st.playing&&$e(_t,D)}ee&&yr();let Pe=pt==="walk"&&!It.active?xt.position:null;O=N.lamps.update(_t,Pe,nt||o),O&&(N.compensate(N.lamps.coverage(),pt!=="walk"),T=!0),nt=!1,b&&D-R>=100&&(T=!0)}ee&&(T=!0);let re=!1;T&&u?(pi(D),re=!0,T=!1,v=D,V="pending",d||(d=!0,e.onReady())):V!=="idle"&&u&&br(D),re&&(w&&ot&&U.sample(D,D-S,performance.now()-Rt)&&Mr(),S=D,U.auto&&x%60===0&&Es()),w=re,yn(D,!1),gn(D,!1),xn(D,!1),(T||V!=="idle"||It.active||pt==="walk"&&X.busy||A.playing||st.playing||de.active||O||b)&&!(g&&!T&&V==="idle"&&!It.active)?(M=!0,m=requestAnimationFrame(Ss)):(yn(D,!0),gn(D,!0),xn(D,!0))}function yr(){if(pt==="walk"&&!It.active){X.apply(xt),H=!0;let D=t.roomAt(X.x,X.z);D!==_&&(_=D,e.onRoom(D))}(it.visible||ae.on)&&((ae.on&&!ae.quiet||de.locked)&&le(),it.update(kt,j,ht))}function ws(D){Math.abs(n.getPixelRatio()-D)>.001&&n.setPixelRatio(D)}function pi(D){let ot=U.spec;ws(U.auto?Math.min(U.dpr,ot.dpr):ot.dpr);let _t=st.playing||D-P<120;b&&(!_t||D-R>=100)&&(n.shadowMap.needsUpdate=!0,b=!1,R=D),n.setRenderTarget(null),n.setClearColor(N.background,1),n.info.reset(),G?.arm(kt,!0,x),n.render(ct,kt),G?.disarm(),z.calls=n.info.render.calls,z.triangles=n.info.render.triangles}function br(D){if(V==="pending"){if(D-v<Dy)return;let _t=U.spec;_t.ao&&pt!=="plan"&&!It.active?(ws(_t.dpr),Ts(),b&&(n.shadowMap.needsUpdate=!0,b=!1),at.renderScene(n,kt,()=>G?.arm(kt,!1,x),()=>G?.disarm()),F=o?1:.25,at.composite(n,F,N.background,null),q=D,V=F>=1?"idle":"fading"):(Math.abs(n.getPixelRatio()-_t.dpr)>.001&&(ws(_t.dpr),n.setRenderTarget(null),n.setClearColor(N.background,1),G?.arm(kt,!1,x),n.render(ct,kt),G?.disarm()),V="idle");return}if(!at){V="idle";return}let ot=Math.min(1,.25+.75*(D-q)/Ny);(ot-F>=.18||ot>=1)&&(F=ot,at.composite(n,ot,N.background,null)),ot>=1&&(V="idle")}function Ts(){let D=U.spec,ot=Math.floor(j*D.dpr),_t=Math.floor(ht*D.dpr);at?(at.target.width!==ot||at.target.height!==_t)&&at.setSize(ot,_t):at=new ys(ct,xt,ot,_t,{samples:2,ao:!0})}function Mr(){let D=U.spec;N&&(N.setShadowSize(D.shadow),b=!0),G?.setResolution(D.mirror),!D.ao&&at?at.setSize(_r,_r):at&&Ts(),Es(),Oe()}function Zi(){let D=U.spec;return{tier:U.tier,auto:U.auto,dpr:U.auto?Math.min(U.dpr,D.dpr):D.dpr,fps:Math.round(1e3/Math.max(1,U.frameMs)),ao:D.ao}}function Es(){e.onQuality?.(Zi())}function jn(D){oe=D,Vt&&(Vt.walls.visible=D,Vt.ceilings.visible=D,Vt.lowWalls.visible=!D,G?.setVisible(D))}function Ai(){Et.x=X.x,Et.z=X.z,Et.yaw=X.yaw,Et.pitch=X.pitch}function Sr(D,ot,_t){let Rt=hu*Math.PI/180,ee=2*Math.atan(Math.tan(Rt/2)*xt.aspect),re=Ft/Math.sin(Math.min(Rt,ee)/2)*1.02,Ge=52*Math.PI/180;return _t.set(mt,.35,ut),ot.set(mt-Math.sin(D)*Math.sin(Ge)*re,.35+Math.cos(Ge)*re,ut-Math.cos(D)*Math.sin(Ge)*re),re}function Ho(D,ot){let Rt=(Kt.top-Kt.bottom)/2/Kt.zoom/Math.tan(uu/2*Math.PI/180),ee=St.target.x,re=St.target.z-(Kt.top+Kt.bottom)/2/Kt.zoom;ot.set(ee,0,re),D.set(ee,Rt,re+Rt*1e-4)}function Wo(D,ot,_t,Rt,ee){return ee.set(D+Math.sin(_t)*Math.cos(Rt)*2,X.eye+Math.sin(Rt)*2,ot+Math.cos(_t)*Math.cos(Rt)*2)}function wr(){let D=(Q.maxX-Q.minX)/2*1.1+.3,ot=(Q.maxZ-Q.minZ)/2*1.1+.3,_t=j/ht,Rt=Math.max(ot/(1-Yf-Zf),D/_t),ee=Zf-Yf;Kt.top=Rt*(1-ee),Kt.bottom=-Rt*(1+ee),Kt.right=Rt*_t,Kt.left=-Rt*_t,Kt.updateProjectionMatrix()}function Qn(D,ot={}){if(!u){tt.mode=D;return}let _t=It.active?B??pt:pt;if(D===_t&&!ot.walkTo)return;_t==="walk"&&!It.active&&Ai(),ot.walkTo&&Object.assign(Et,ot.walkTo),X.cancelJourney(),de.clear(),de.locked&&D!=="walk"&&de.requestLock(!1),it.cursor.show(!1),it.target.show(!1),Mt.enabled=St.enabled=!1,b=!0;let Rt=ot.instant||o;kt===Kt?(Ho(Gt,ve),xt.position.copy(Gt),xt.lookAt(ve),xt.fov=uu,xt.updateProjectionMatrix(),kt=xt):It.active?ve.set(0,0,-1).applyQuaternion(xt.quaternion).add(xt.position):pt==="walk"?Wo(X.x,X.z,X.yaw,X.pitch,ve):ve.copy(Mt.target);let ee=Gt.copy(xt.position),re=ve,Ge=xt.fov,Pe=new L,Cn=new L,Ki=yt,Er=0;if(D==="walk")Pe.set(Et.x,X.eye,Et.z),Wo(Et.x,Et.z,Et.yaw,Et.pitch,Cn),Er=2.4;else if(D==="dollhouse"){let As=Sr(Et.yaw,Pe,Cn);Mt.minDistance=As*.45,Mt.maxDistance=As*1.7,Ki=hu}else St.target.set(mt,0,ut),Kt.zoom=1,wr(),Ho(Pe,Cn),Ki=uu;let Ar=_t==="walk";Ar&&jn(!1),pt=D,B=D,e.onMode(D),Rt?(It.cancel(),xt.position.copy(Pe),xt.lookAt(Cn),C()):It.start(ee,re,Ge,Pe,Cn,Ki,Ar?2.4:0,Er,.9),Oe()}function C(){let D=B??pt;if(B=null,D==="walk"){X.place(Et.x,Et.z,Et.yaw,Et.pitch),xt.fov=yt,xt.updateProjectionMatrix(),X.apply(xt),jn(!0),kt=xt,nt=!0,H=!0;let ot=t.roomAt(X.x,X.z);ot!==_&&(_=ot,e.onRoom(ot)),A.playing&&A.phase==="walk"&&(A.phase="dwell",A.dwell=0,A.baseYaw=X.yaw)}else D==="dollhouse"?(jn(!1),xt.fov=hu,xt.updateProjectionMatrix(),Sr(Et.yaw,Gt,ve),Mt.target.copy(ve),It.active||xt.position.copy(Gt),Mt.update(),Mt.enabled=!g,kt=xt,nt=!0):(jn(!1),Kt.position.set(St.target.x,40,St.target.z),Kt.lookAt(St.target.x,0,St.target.z),Kt.updateProjectionMatrix(),St.update(),St.enabled=!g,kt=Kt,nt=!0);b=!0,Oe()}function W(){let D=Mt.target,ot=Ee(D.x,Q.minX,Q.maxX),_t=Ee(D.z,Q.minZ,Q.maxZ),Rt=Ee(D.y,0,2);(ot!==D.x||Rt!==D.y||_t!==D.z)&&(D.set(ot,Rt,_t),Mt.update())}function et(D){let ot=t.views[D],[_t,,Rt]=ot.position,[ee,re,Ge]=ot.target;return{x:_t,z:Rt,yaw:Math.atan2(ee-_t,Ge-Rt),pitch:Math.atan2(re-X.eye,Math.hypot(ee-_t,Ge-Rt))}}function J(){return pt==="walk"&&!It.active?t.roomAt(X.x,X.z):t.roomAt(Et.x,Et.z)}function K(D){if(!t.views[D]||!rt)return;let ot=et(D);if(pt!=="walk"||It.active){Qn("walk",{walkTo:ot});return}it.target.show(!1);let _t=o?null:rt.path(X.x,X.z,ot.x,ot.z);_t?X.walk(_t,ot.yaw,ot.pitch,D):(X.place(ot.x,ot.z,ot.yaw,ot.pitch),nt=!0,X.arrived={room:D}),Oe()}function Nt(D){X.arrived=null,D.room||(it.target.show(!1),it.target.breathe(!1,o)),A.playing&&A.phase==="walk"&&(A.phase="dwell",A.dwell=0,A.baseYaw=X.yaw),H=!0}function zt(D){if(!A.playing)return!1;let ot=t.rooms.length,_t=!1;if(A.phase==="walk"){let Rt=X.journey;A.progress=(A.index+(Rt?.6*(Rt.length?Rt.s/Rt.length:1):0))/ot,!Rt&&!It.active&&!X.arrived&&(A.phase="dwell",A.dwell=0,A.baseYaw=X.yaw)}else A.dwell+=D,o||(X.yaw=A.baseYaw+Math.sin(A.dwell*.42)*.17*on(0,1.5,A.dwell),_t=!0),A.progress=(A.index+.6+.4*Math.min(1,A.dwell/5))/ot,A.dwell>5&&(A.index++,A.index>=ot?(A.playing=!1,A.progress=1):(A.phase="walk",K(t.rooms[A.index].id)));return A.dirty=!0,_t}function At(){A.playing&&(A.playing=!1,A.phase==="dwell"&&(A.index=Math.min(t.rooms.length-1,A.index+1)),A.dirty=!0,gn(performance.now(),!0))}function qt(){let D=X.journey;A.playing?(At(),X.cancelJourney()):D&&(D.freeLook=!0)}function Yt(D,ot,_t){let Rt=Y.getBoundingClientRect();return Dt.set((D-Rt.left)/Rt.width*2-1,1-(ot-Rt.top)/Rt.height*2),Pt.setFromCamera(Dt,kt),Pt.ray.intersectPlane(dt,_t)!==null}function ie(D,ot){return!!rt&&Math.hypot(D-X.x,ot-X.z)<12&&!rt.blocked(D,ot)&&rt.sightline(X.x,X.z,D,ot)}function le(){if(!u||g||It.active)return;if(pt!=="walk"){let Rt=ae.on&&Yt(ae.x,ae.y,vt)&&t.inside(vt.x,vt.z)&&!!t.views[t.roomAt(vt.x,vt.z)];Y.style.cursor=Rt?"pointer":"";return}let D=ae.x,ot=ae.y;if(de.locked){let Rt=Y.getBoundingClientRect();D=Rt.left+Rt.width/2,ot=Rt.top+Rt.height/2}let _t=Yt(D,ot,vt)&&ie(vt.x,vt.z);_t&&it.cursor.place(vt.x,vt.z),it.cursor.show(_t),de.locked||(Y.style.cursor=_t?"pointer":"grab"),_t&&it.update(kt,j,ht)}function $t(D,ot,_t){if(!u||g||It.active||!rt||!Yt(D,ot,vt))return;if(pt!=="walk"){if(!t.inside(vt.x,vt.z))return;let Ge=t.roomAt(vt.x,vt.z);At(),t.views[Ge]?K(Ge):rt.blocked(vt.x,vt.z)||Qn("walk",{walkTo:{x:vt.x,z:vt.z,yaw:Et.yaw,pitch:0}});return}if(At(),Math.hypot(vt.x-X.x,vt.z-X.z)>14||!rt.sightline(X.x,X.z,vt.x,vt.z)){e.onHint?.($f);return}let Rt=rt.blocked(vt.x,vt.z)?rt.nearestFree(vt.x,vt.z,.6):[vt.x,vt.z],ee=Rt&&rt.path(X.x,X.z,Rt[0],Rt[1]),re=it.target;if(!Rt||!ee){re.place(vt.x,vt.z),re.show(!0),it.update(kt,j,ht),re.shake(o),setTimeout(()=>{X.journey||re.show(!1)},650),e.onHint?.($f);return}re.place(Rt[0],Rt[1]),re.show(!0),re.breathe(!0,o),it.update(kt,j,ht),it.cursor.show(!1),ae.quiet=!_t,o?(X.place(Rt[0],Rt[1],X.yaw,X.pitch),nt=!0,X.arrived={room:null}):X.walk(ee,null,null,null),Oe()}function _e(){let D=new Date(Date.now()+l*36e5);return{date:D.toISOString().slice(0,10),hour:D.getUTCHours()+D.getUTCMinutes()/60}}function Le(){return new Date(Date.now()+t.listing.tzOffsetHours*36e5).toISOString().slice(0,10)}function xe(){P=performance.now(),Rf(st.jd0,st.hour,l,t.listing.lat,t.listing.lng,lt),N&&(N.apply(lt,st.live?st.weather:null,c,n,ct)&&(b=!0),N.compensate(N.lamps.coverage(),pt!=="walk"),T=!0),Xt=!0;let D=performance.now();Ct&&(!st.playing||D-wt>250)&&(wt=D,k.setScene({hour:st.hour,elevation:lt.elevationDeg,rain:st.live&&!!st.weather?.rain})),Jn()}function Me(){return{live:st.live,date:st.date,hour:st.hour,sun:{azimuthDeg:lt.azimuthDeg,elevationDeg:lt.elevationDeg},weather:st.live?st.weather:null,playing:st.playing}}function $e(D,ot){st.hour=Math.min(cu,st.hour+D*(cu-qf)/Uy),st.hour>=cu&&(st.playing=!1,b=!0,R=0),xe(),st.playing||xn(ot,!0)}function Ot(){let D=_e();D.date!==st.date&&(st.date=D.date,st.jd0=Do(D.date)),st.hour=D.hour}function an(){Jt?.abort();let D=new AbortController;Jt=D,Xf(t.listing.lat,t.listing.lng,D.signal).then(ot=>{!h&&st.live&&ot&&(st.weather=ot,xe())}).catch(()=>{})}function ge(){Ve(),Ot();let D=6e4-Date.now()%6e4+50;Wt=window.setTimeout(function ot(){!st.live||h||(Ot(),xe(),Wt=window.setTimeout(ot,6e4-Date.now()%6e4+50))},D),an(),Zt=window.setInterval(an,15*6e4)}function Ve(){clearTimeout(Wt),clearInterval(Zt),Wt=Zt=0,Jt?.abort(),Jt=null}function yn(D,ot){!H||!u||!ot&&D-$<100||(H=!1,$=D,e.onPose({x:X.x,z:X.z,yaw:X.yaw,pitch:X.pitch,room:t.roomAt(X.x,X.z)}))}function gn(D,ot){!A.dirty||!ot&&D-A.lastAt<100||(A.dirty=!1,A.lastAt=D,e.onTour({playing:A.playing,index:Math.min(A.index,t.rooms.length-1),progress:A.progress}))}function xn(D,ot){!Xt||!ot&&st.playing&&D-Tt<100||(Xt=!1,Tt=D,e.onLight(Me()))}function Se(){let D=Math.max(1,i.clientWidth),ot=Math.max(1,i.clientHeight);D===j&&ot===ht||(j=D,ht=ot,n.setSize(D,ot,!1),xt.aspect=D/ot,xt.updateProjectionMatrix(),wr(),at&&U.spec.ao&&Ts(),pt==="plan"&&!It.active&&St.update(),Oe())}let Re=new ResizeObserver(Se);Re.observe(i);let Fn=()=>{y=document.hidden,k.setHeld(g||y),y?(m&&cancelAnimationFrame(m),m=0,de.clear()):(st.live&&(Ot(),xe()),Oe())};document.addEventListener("visibilitychange",Fn);let we=D=>{o=D.matches,Mt.enableDamping=!o};r.addEventListener?.("change",we);let On=D=>{D.preventDefault(),ti("The browser paused the 3D view to save memory. Reopen the tour, or browse the original photographs.")};Y.addEventListener("webglcontextlost",On);function ti(D){f||h||(f=!0,m&&cancelAnimationFrame(m),m=0,de.clear(),k.setHeld(!0),e.onError(D))}let Tr=0;function An(D,ot){h||D<Tr||(Tr=D,e.onLoad?.(D,ot))}async function Ep(){if(An(.03,"Preparing the 3D view"),await fi(),h)return;let D=navigator.deviceMemory??8,ot=s||D<=4?"low":"high",_t=new ir,Rt=0,ee=!1,re=()=>{},Ge=new Promise(Be=>{re=Be});if(_t.onStart=()=>{Rt++},_t.onLoad=()=>{ee=!0,re()},_t.onProgress=(Be,Cs,Ip)=>An(.6+.08*(Cs/Math.max(1,Ip)),"Loading surfaces"),_t.onError=Be=>{a&&console.warn("Tour texture failed to load:",Be)},An(.08,"Building the apartment"),await fi(),h)return;let Pe=t.build(_t,ot);Vt=Pe;let Cn=[];Pe.root.traverse(Be=>{Be.isLight&&Cn.push(Be)}),Cn.forEach(Be=>Be.removeFromParent()),Cn.length&&a&&console.warn(`Tour model contained ${Cn.length} light(s); the engine removed them.`);for(let Be of[Pe.walls,Pe.ceilings,Pe.lowWalls])Be.traverse(Cs=>{Cs.castShadow=!1});if(ct.add(Pe.root),h)return;An(.32,"Arranging the rooms"),await fi();let Ki=[Pe.contents,Pe.walls,Pe.ceilings,Pe.lowWalls],Er=0,Ar=0;for(let Be=0;Be<Ki.length;Be++){let Cs=Nf([Ki[Be]],t.roomAt);if(Er+=Cs.meshesBefore,Ar+=Cs.meshesAfter,An(.32+.06*(Be+1),"Arranging the rooms"),await fi(),h)return}a&&console.info(`Tour merge: ${Er} meshes \u2192 ${Ar}`),Pe.root.updateMatrixWorld(!0);for(let Be of[Pe.root,...Ki])Be.matrixAutoUpdate=!1;An(.56,"Mapping the floor"),await fi(),rt=Ff(t.inside,Pe.collisions,t.plan.bounds);let As=new pn().setFromObject(Pe.ceilings);!As.isEmpty()&&As.min.y>1.8&&(Lt=As.min.y);let Rp=new pn(new L(Q.minX,0,Q.minZ),new L(Q.maxX,Lt+.15,Q.maxZ));An(.6,"Lighting the rooms"),await fi();let Su=new ur(n),wu=new Jl;Z=Su.fromScene(wu,.04),ct.environment=Z.texture,wu.dispose(),Su.dispose(),N=new ac(ct,t,Pe,Rp),t.mirror&&(G=new lc(t.mirror,U.spec.mirror),ct.add(G.group)),N.setShadowSize(U.spec.shadow),xe(),Pe.lowWalls.visible=!1;let Pp=t.views[t.start]?t.start:Object.keys(t.views)[0],Xo=et(Pp);X.place(Xo.x,Xo.z,Xo.yaw,Xo.pitch),Ai(),X.apply(xt),_=t.roomAt(X.x,X.z),wr(),Rt&&!ee&&await Promise.race([Ge,new Promise(Be=>setTimeout(Be,1e4))]),!h&&(An(.7,"Preparing shaders"),await Ap(),!(h||f)&&(u=!0,An(1,"Ready"),N.lamps.update(0,xt.position,!0),e.onRoom(_),e.onMode(pt),Es(),Cp(),Xt=H=A.dirty=!0,Oe()))}async function Ap(){let D=Vt,ot=[D.walls,D.ceilings,D.lowWalls],_t=ot.map(re=>re.visible);ot.forEach(re=>{re.visible=!0}),G?.warmup(!0);let Rt=[];ct.traverse(re=>{re.frustumCulled&&(Rt.push(re),re.frustumCulled=!1)});let ee=new Ie(64,64,{type:Xe});try{if(n.setRenderTarget(null),await Mu(),An(.8,"Preparing shaders"),n.setRenderTarget(ee),await Mu(),An(.88,"Warming up"),await fi(),h)return;n.shadowMap.needsUpdate=!0,b=!1,n.setRenderTarget(ee),n.setClearColor(0,0),G?.force(),n.render(ct,xt),G?.disarm(),n.setRenderTarget(null),n.setClearColor(N.background,1),n.render(ct,xt),await fi(),at?at.setSize(_r,_r):at=new ys(ct,xt,_r,_r,{samples:2,ao:!0}),at.renderScene(n,xt,()=>{},()=>{}),at.composite(n,1,N.background,null),An(.96,"Warming up")}finally{ee.dispose(),Rt.forEach(re=>{re.frustumCulled=!0}),ot.forEach((re,Ge)=>{re.visible=_t[Ge]}),G?.warmup(!1),G&&(G.stale=!0),n.setRenderTarget(null)}await fi()}async function Mu(){try{await n.compileAsync(ct,xt)}catch{n.compile(ct,xt)}}function Cp(){if(tt.view){let D=tt.view;tt.view=void 0,$i.setView(D)}if(tt.room){let D=tt.room;tt.room=void 0;let ot=et(D);X.place(ot.x,ot.z,ot.yaw,ot.pitch),X.apply(xt),Ai()}if(tt.mode){let D=tt.mode;tt.mode=void 0,Qn(D,{instant:!0})}tt.tour&&(tt.tour=void 0,$i.setTour(!0))}let $i={goRoom(D){if(t.views[D]){if(!u){tt.room=D;return}At(),K(D)}},walkTo(D,ot){if(!u||!rt||g)return!1;let _t=rt.nearestFree(D,ot,.8),Rt=_t&&rt.path(X.x,X.z,_t[0],_t[1]);return!_t||!Rt?!1:(At(),pt!=="walk"||It.active?(Qn("walk",{walkTo:{x:_t[0],z:_t[1],yaw:Et.yaw,pitch:0}}),!0):(it.target.place(_t[0],_t[1]),it.target.show(!0),it.target.breathe(!0,o),it.update(kt,j,ht),o?(X.place(_t[0],_t[1],X.yaw,X.pitch),X.arrived={room:null}):X.walk(Rt,null,null,null),Oe(),!0))},move(D,ot){D=Ee(D||0,-1,1),ot=Ee(ot||0,-1,1),(D||ot)&&!de.padX&&!de.padZ&&mn.manual(),de.padX=D,de.padZ=ot,Jn()},look(D,ot){u&&!g&&mn.look(D,ot)},setRun(D){de.runHeld=D,Jn()},setEyeHeight(D){X.eye=Ee(D,1,1.9),pt==="walk"&&!It.active&&u&&(X.apply(xt),Oe())},setFov(D){yt=Ee(D,Fy,Oy),pt==="walk"&&!It.active&&(xt.fov=yt,xt.updateProjectionMatrix(),it.visible&&it.update(kt,j,ht),Oe())},setPointerLock(D){D&&(pt!=="walk"||!u)||de.requestLock(D)},async setGyro(D){if(!D)return de.disableGyro(),!1;let ot=await de.enableGyro();return ot||e.onHint?.("Motion sensors aren\u2019t available on this device"),Jn(),ot},setMode(D){At(),Qn(D)},setTour(D){if(!u){tt.tour=D;return}if(!D){At();return}(A.index>=t.rooms.length||A.progress>=1)&&(A.index=0),A.playing=!0,A.phase="walk",A.dirty=!0,K(t.rooms[A.index].id),gn(performance.now(),!0),Jn()},reset(){if(!u){tt.view=void 0,tt.mode=void 0,tt.room=void 0;return}A.playing=!1,A.index=0,A.progress=0,A.dirty=!0,X.cancelJourney(),It.cancel();let D=et(t.views[t.start]?t.start:Object.keys(t.views)[0]);Qn("walk",{instant:!0,walkTo:D}),gn(performance.now(),!0)},setLive(D){st.live=D,D?(st.playing=!1,ge()):(Ve(),st.weather=null),xe(),xn(performance.now(),!0)},setDate(D){!/^\d{4}-\d{2}-\d{2}$/.test(D)||!Number.isFinite(Do(D))||(st.live&&(st.live=!1,Ve(),st.weather=null),st.date=D,st.jd0=Do(D),xe(),xn(performance.now(),!0))},setHour(D){Number.isFinite(D)&&(st.live&&(st.live=!1,Ve(),st.weather=null),st.playing=!1,st.hour=Ee(D,0,24),xe(),xn(performance.now(),!0))},playDay(D){D?(st.live&&(st.live=!1,Ve(),st.weather=null),st.hour=qf,st.playing=!0):st.playing=!1,b=!0,xe(),xn(performance.now(),!0)},setAmbience(D){Ct=D,D&&k.setScene({hour:st.hour,elevation:lt.elevationDeg,rain:st.live&&!!st.weather?.rain}),k.setOn(D),k.setHeld(g||y)},setQuality(D){U.set(D),Mr()},quality:Zi,getView(){let ot=pt==="walk"&&!It.active?X:Et,_t={room:t.roomAt(ot.x,ot.z),x:ot.x,z:ot.z,yaw:ot.yaw,pitch:ot.pitch,mode:pt};return st.live||(_t.hour=st.hour,_t.date=st.date),_t},setView(D){if(!u||!rt){tt.view=D;return}let ot=Number(D.x),_t=Number(D.z);if(!Number.isFinite(ot)||!Number.isFinite(_t)||rt.blocked(ot,_t)){let re=Number.isFinite(ot)&&Number.isFinite(_t)?rt.nearestFree(ot,_t,.6):null;if(re)[ot,_t]=re;else{let Ge=et(t.views[D.room]?D.room:t.start);ot=Ge.x,_t=Ge.z}}let Rt={x:ot,z:_t,yaw:Number(D.yaw)||0,pitch:Ee(Number(D.pitch)||0,-Zn,Zn)};D.date&&/^\d{4}-\d{2}-\d{2}$/.test(D.date)&&$i.setDate(D.date),D.hour!=null&&Number.isFinite(D.hour)&&$i.setHour(D.hour),A.playing=!1,A.dirty=!0,X.cancelJourney(),It.cancel(),B=null,pt!=="walk"?Qn("walk",{instant:!0,walkTo:Rt}):(X.place(Rt.x,Rt.z,Rt.yaw,Rt.pitch),Ai(),nt=!0,yr());let ee=D.mode==="dollhouse"||D.mode==="plan"?D.mode:"walk";ee!=="walk"&&(Ai(),Qn(ee,{instant:!0})),Oe()},async snapshot(){if(!u||f||h||!N)return null;b&&(n.shadowMap.needsUpdate=!0,b=!1),kt.updateMatrixWorld();let D=Math.floor(st.hour),ot=Math.round((st.hour-D)*60),_t=`${String(ot===60?D+1:D).padStart(2,"0")}:${String(ot===60?0:ot).padStart(2,"0")}`;try{return await Vf({renderer:n,scene:ct,camera:kt,screenWidth:j*(window.devicePixelRatio||1),ao:U.spec.ao&&pt!=="plan",background:N.background,mirror:G,caption:{title:t.listing.title,area:t.listing.area,hour:st.live?null:_t,accent:t.theme.accent,night:t.theme.night,paper:t.theme.paper}})}catch(Rt){return a&&console.warn("Postcard failed",Rt),null}finally{Oe()}},setPaused(D){g!==D&&(g=D,de.clear(),D&&de.locked&&de.requestLock(!1),Mt.enabled=!D&&pt==="dollhouse"&&!It.active,St.enabled=!D&&pt==="plan"&&!It.active,k.setHeld(g||y),Oe())},dispose(){if(h)return;h=!0,m&&cancelAnimationFrame(m),m=0,Ve(),Re.disconnect(),document.removeEventListener("visibilitychange",Fn),r.removeEventListener?.("change",we),Y.removeEventListener("webglcontextlost",On),de.dispose(),Mt.removeEventListener("change",te),St.removeEventListener("change",te),Mt.removeEventListener("start",Ms),St.removeEventListener("start",Ms),Mt.dispose(),St.dispose(),it.dispose(),k.dispose(),at?.dispose(),G?.dispose(),N?.sun.shadow.dispose();let D=new Set,ot=new Set,_t=new Set;ct.traverse(Rt=>{let ee=Rt;ee.isMesh&&(D.add(ee.geometry),(Array.isArray(ee.material)?ee.material:[ee.material]).forEach(re=>ot.add(re)))}),Vt&&Object.values(Vt.materials).forEach(Rt=>ot.add(Rt)),ot.forEach(Rt=>{for(let ee of Object.values(Rt))ee instanceof Je&&_t.add(ee);Rt.dispose()}),D.forEach(Rt=>Rt.dispose()),_t.forEach(Rt=>Rt.dispose()),Z?.dispose(),ct.clear(),n.renderLists.dispose(),n.dispose(),n.forceContextLoss(),Y.remove(),a&&delete i.tourSnapshot}};return a&&Object.defineProperty(i,"tourSnapshot",{configurable:!0,value:()=>({mode:pt,ready:u,paused:g,position:{x:kt.position.x,y:kt.position.y,z:kt.position.z},walker:{x:X.x,z:X.z},yaw:X.yaw,pitch:X.pitch,eye:X.eye,fov:yt,room:J(),blocked:rt?rt.blocked(X.x,X.z):!1,drawCalls:z.calls,triangles:z.triangles,programs:n.info.programs?.length??0,dpr:n.getPixelRatio(),tier:U.tier,auto:U.auto,fps:Math.round(1e3/Math.max(1,U.frameMs)),sun:{azimuthDeg:lt.azimuthDeg,elevationDeg:lt.elevationDeg},light:{live:st.live,hour:st.hour,date:st.date,playing:st.playing},refine:V,flying:It.active,journey:X.journey?{length:X.journey.length,s:X.journey.s}:null,touring:A.playing,tourIndex:A.index,looping:m!==0,lamps:N?N.lamps.lights.map(D=>+D.intensity.toFixed(2)):[],footprint:{cursor:it.cursor.shown,target:it.target.shown},audio:k.state,pointerLock:de.locked})}),Ep().catch(D=>{a&&console.error(D),ti("The 3D view could not be built on this device. The original photographs are all here.")}),$i}function ky(i){if(document.getElementById("tour-engine-style"))return;let t=new Bt(i),e=document.createElement("style");e.id="tour-engine-style",e.textContent=`.tour-canvas:focus{outline:none}.tour-canvas:focus-visible{outline:2px solid rgba(${Math.round(t.r*255)},${Math.round(t.g*255)},${Math.round(t.b*255)},.75);outline-offset:-2px}`,document.head.appendChild(e)}function zy(i){let t=i.views[i.start];return{goRoom(){},walkTo:()=>!1,move(){},look(){},setRun(){},setEyeHeight(){},setFov(){},setPointerLock(){},setGyro:async()=>!1,setMode(){},setTour(){},reset(){},setLive(){},setDate(){},setHour(){},playDay(){},setAmbience(){},setQuality(){},quality:()=>({tier:"battery",auto:!0,dpr:1,fps:0,ao:!1}),getView:()=>({room:i.start,x:t?t.position[0]:0,z:t?t.position[2]:0,yaw:0,pitch:0,mode:"walk"}),setView(){},snapshot:async()=>null,setPaused(){},dispose(){}}}var Vy={walk:"w",dollhouse:"d",plan:"p"},Gy={w:"walk",d:"dollhouse",p:"plan"},Kf=/^[a-z0-9-]{1,32}$/;function Jf(i){let t=(e,n=2)=>(Math.round(e*10**n)/10**n).toFixed(n).replace(/\.?0+$/,"")||"0";return[Kf.test(i.room)?i.room:"start",t(i.x),t(i.z),Math.round(i.yaw*180/Math.PI),Math.round(i.pitch*180/Math.PI),Vy[i.mode]||"w",i.hour==null?"":t(i.hour),i.date?i.date.replace(/-/g,""):""].join("~")}function jf(i){if(!i||i==="1"||i.length>120)return null;let t=i.split("~");if(t.length<6)return null;let e=c=>c===""?NaN:Number(c),n=e(t[1]),s=e(t[2]),r=e(t[3]),o=e(t[4]);if(![n,s,r,o].every(Number.isFinite)||Math.abs(n)>500||Math.abs(s)>500)return null;let a={room:Kf.test(t[0])?t[0]:"start",x:n,z:s,yaw:r*Math.PI/180,pitch:Math.max(-80,Math.min(80,o))*Math.PI/180,mode:Gy[t[5]]||"walk"},l=e(t[6]||"");return Number.isFinite(l)&&l>=0&&l<=24&&(a.hour=l),/^\d{8}$/.test(t[7]||"")&&(a.date=t[7].slice(0,4)+"-"+t[7].slice(4,6)+"-"+t[7].slice(6,8)),a}function I(i,t,...e){let n=document.createElement(i);if(t)for(let s in t){let r=t[s];r==null||r===!1||(typeof r=="function"?n.addEventListener(s.slice(2),r):n.setAttribute(s,r===!0?"":String(r)))}return Qf(n,e),n}function Qf(i,t){for(let e of t)e==null||e===!1||(Array.isArray(e)?Qf(i,e):i.appendChild(typeof e=="object"?e:document.createTextNode(String(e))))}function ue(i,t){i.textContent!==t&&(i.textContent=t)}function me(i,t,e){if(e===!1||e==null){i.hasAttribute(t)&&i.removeAttribute(t);return}let n=e===!0?"":e;i.getAttribute(t)!==n&&i.setAttribute(t,n)}var tn=i=>String(i).padStart(2,"0");function Dn(i){let t=(Math.round(i*60)%1440+1440)%1440;return tn(Math.floor(t/60))+":"+tn(t%60)}var Hy=0,tp=i=>`ct-${i}-${++Hy}`,Wy='a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';function du(i){return Array.from(i.querySelectorAll(Wy)).filter(t=>!t.closest("[hidden]")&&t.getClientRects().length>0)}function ep(i,t){if(i.key!=="Tab")return;let e=du(t);if(!e.length)return;let n=e[0],s=e[e.length-1],r=document.activeElement;i.shiftKey&&(r===n||!t.contains(r))?(i.preventDefault(),s.focus()):!i.shiftKey&&r===s&&(i.preventDefault(),n.focus())}var mc=i=>i instanceof HTMLElement&&(i.isContentEditable||i instanceof HTMLInputElement&&!["button","checkbox","radio","range"].includes(i.type)||i instanceof HTMLTextAreaElement||i instanceof HTMLSelectElement);var np={walk:'<circle cx="13.2" cy="4.4" r="1.7"/><path d="M10.6 21l1.9-5.4-2.4-2.6.9-4.6 3.6 3.2 3 .7M11 8.4 8 9.7l-1.4 3M14.2 15.4l2.3 2.5L17 21"/>',dollhouse:'<path d="M3 10.6 12 4l9 6.6"/><path d="M5 9.2V20h14V9.2M5 14.6h14M12 9.6V20"/>',plan:'<rect x="3.5" y="3.5" width="17" height="17" rx="1.6"/><path d="M3.5 12.5h6.5v8M10 3.5v5M14 12.5h6.5M14 12.5v3.5"/>',share:'<path d="M12 3.5v11.5M7.8 7.6 12 3.5l4.2 4.1"/><path d="M8.5 10.5H6.4A1.4 1.4 0 0 0 5 11.9v7.2a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4v-7.2a1.4 1.4 0 0 0-1.4-1.4h-2.1"/>',photos:'<rect x="3" y="6" width="14.5" height="12.5" rx="1.8"/><path d="m3.4 16 3.9-3.9 3.6 3.6 2.4-2.4 3.8 3.8"/><circle cx="12.6" cy="10" r="1.2"/><path d="M6.5 3.5h11.7A2.3 2.3 0 0 1 20.5 5.8V15"/>',sun:'<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M2.8 12h2M19.2 12h2M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',sunset:'<path d="M7 16.5a5 5 0 0 1 10 0"/><path d="M3 16.5h18M6.5 20h11M12 4.5V8M4.9 9.4l1.9 1.5M19.1 9.4l-1.9 1.5"/>',moon:'<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1Z"/>',sound:'<path d="M4 9.6v4.8h3.4l4.6 4.1V5.5L7.4 9.6Z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6M18 6.6a7.6 7.6 0 0 1 0 10.8"/>',mute:'<path d="M4 9.6v4.8h3.4l4.6 4.1V5.5L7.4 9.6Z"/><path d="m15.8 9.8 4.4 4.4M20.2 9.8l-4.4 4.4"/>',sliders:'<path d="M4 7.5h9.5M18.5 7.5H20M4 16.5h1.5M10.5 16.5H20"/><circle cx="16" cy="7.5" r="2.2"/><circle cx="8" cy="16.5" r="2.2"/>',expand:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',shrink:'<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>',close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',info:'<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.7v.2"/>',play:'<path d="M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.7-6.2a.6.6 0 0 0 0-1L9.4 5.3a.6.6 0 0 0-.9.5Z" fill="currentColor" stroke="none"/>',pause:'<rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none"/>',left:'<path d="m14.5 6-6 6 6 6"/>',right:'<path d="m9.5 6 6 6-6 6"/>',up:'<path d="m6 14.5 6-6 6 6"/>',down:'<path d="m6 9.5 6 6 6-6"/>',out:'<path d="M7.5 16.5l9-9M9 7.5h7.5V15"/>',arrow:'<path d="M4.5 12h14.5M13.5 6.5 19 12l-5.5 5.5"/>',check:'<path d="m5 12.6 4.4 4.4L19 7.4"/>',link:'<path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',chat:'<path d="M4.2 20.2 5.4 16.6A8.3 8.3 0 1 1 8 19.1Z"/><path d="M9.2 8.6c0 3.4 2.8 6.2 6.2 6.2l1-1.7-2-1-1 .9a5 5 0 0 1-2.4-2.4l.9-1-1-2Z" fill="currentColor" stroke="none"/>',download:'<path d="M12 3.5v11.5M7.2 10.4 12 15.2l4.8-4.8M4.5 20.5h15"/>',gyro:'<rect x="8.2" y="3.5" width="7.6" height="17" rx="2"/><path d="M4.6 7.6a8.8 8.8 0 0 0 0 8.8M19.4 7.6a8.8 8.8 0 0 1 0 8.8M11 17.6h2"/>',run:'<circle cx="15" cy="4.3" r="1.8"/><path d="M4.5 20.5 8 16l3.4 1.6 1.6-4.9M7.6 10.4l3-2.6c.7-.6 1.7-.7 2.4-.2l2.2 1.8 1.4 3 3 .9M13 12.7l3.4 2.6-.7 5.2"/>',mouse:'<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 6.8v3.4"/>',map:'<path d="M9 4.6 3.6 6.4v13l5.4-1.8 6 2 5.4-1.8v-13L15 6.6Z"/><path d="M9 4.6v13M15 6.6v13"/>',more:'<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',reset:'<path d="M4.4 12.5a7.6 7.6 0 1 0 2.2-5.9L4.4 8.8"/><path d="M4.4 4.4v4.4h4.4"/>',calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',spark:'<path d="M12 3.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5Z"/><path d="M18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z"/>',cube:'<path d="M12 3 3.8 7.5v9L12 21l8.2-4.5v-9Z"/><path d="M3.8 7.5 12 12l8.2-4.5M12 12v9"/>',person:'<circle cx="12" cy="4.6" r="2"/><path d="M12 8.2v6.6M12 14.8l-2.8 5.8M12 14.8l2.8 5.8M7.4 10.8h9.2"/>',compass:'<circle cx="12" cy="12" r="8.6"/><path d="m14.9 9.1-1.6 4.2-4.2 1.6 1.6-4.2Z"/>',feet:'<path d="M8.6 3.4c-2 0-3 2.2-3 4.7 0 2.2.9 3.5 1.1 5.4h3.8c.2-1.9 1.1-3.2 1.1-5.4 0-2.5-1-4.7-3-4.7ZM6.8 16h3.8v1.2a1.9 1.9 0 0 1-3.8 0Z"/><path d="M15.4 7.4c2 0 3 2.2 3 4.7 0 2.2-.9 3.5-1.1 5.4h-3.8c-.2-1.9-1.1-3.2-1.1-5.4 0-2.5 1-4.7 3-4.7ZM13.5 20.1h3.8v.4a1.9 1.9 0 0 1-3.8 0Z"/>',copy:'<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>'};function Ht(i,t=""){let e=document.createElementNS("http://www.w3.org/2000/svg","svg");return e.setAttribute("viewBox","0 0 24 24"),e.setAttribute("aria-hidden","true"),e.setAttribute("focusable","false"),e.setAttribute("class",t?"ic "+t:"ic"),e.innerHTML=np[i],e}function ip(){let i=document.createElementNS("http://www.w3.org/2000/svg","svg");return i.setAttribute("viewBox","0 0 32 38"),i.setAttribute("aria-hidden","true"),i.setAttribute("class","mark"),i.innerHTML='<path d="M25 10C22 3 9 3 6 11C1 24 12 36 25 28M9 24L24 9M14 21C11 13 16 8 24 9C25 16 22 21 14 21Z"/>',i}var gw=Object.keys(np);function sp(i){let{def:t}=i,e=t.listing,n=t.photoUrl((t.rooms.find(a=>a.id===t.start)||t.rooms[0]).image),s=["","one","two","three","four","five","six"],r=e.bedrooms===0?"studio":`${s[e.bedrooms]||e.bedrooms}-bedroom home`,o=(a,l,c)=>I("li",null,Ht(a),I("div",null,I("b",null,l),I("span",null,c)));return I("div",{class:"about"},I("figure",{class:"a-img"},I("img",{src:n,alt:`${e.title}, from the original listing photographs`,loading:"lazy"}),I("figcaption",{class:"k"},t.theme.collection)),I("div",{class:"a-body"},I("header",{class:"ghead"},I("div",null,I("span",{class:"k"},"About this view"),I("h2",{id:"a-title"},"A home, rebuilt from its photographs.")),I("button",{class:"round gclose",type:"button","aria-label":"Close",onclick:()=>i.closeDialog()},Ht("close"))),I("p",{class:"lede"},`An interactive interpretation of this ${r} in ${e.area}, ${e.city}, modelled by hand from the original listing photographs. Walk through it, step back into the dollhouse, or watch the sun move across the rooms.`),I("h3",{class:"k"},"How to move"),I("ul",{class:"howto"},o("walk","Walk","W A S D or the arrow keys. On a phone, hold the lower left of the screen and steer with your thumb."),o("mouse","Look","Drag anywhere. Mouse look follows the mouse until you press Esc. On a phone, swipe, or turn on motion look."),o("feet","Go somewhere","Click or tap the floor, choose a room below, or use the map."),o("sunset","Live Light",`The real sun over ${e.area} at any hour, on any date, or live with today\u2019s weather.`)),I("div",{class:"note"},Ht("info"),I("p",null,I("b",null,"Honest limits. "),t.accuracyNote)),I("p",{class:"fine"},"Lighting is a simulation of the sun\u2019s position at the property, not a photograph. The original photographs show the actual apartment."),I("div",{class:"a-act"},I("a",{class:"btn pri",href:i.listingUrl,target:"_top"},"View the listing",Ht("out")),I("button",{class:"btn quiet",type:"button",onclick:()=>{i.closeDialog(),i.openPhotos()}},Ht("photos"),"See the original photographs"))))}function rp(i){let{def:t,store:e}=i,n=I("span",{class:"k"}),s=I("h2",{class:"ctitle"}),r=I("p",{class:"cdet"}),o=I("i"),a=I("div",{class:"cbar",role:"progressbar","aria-label":"Guided tour progress","aria-valuemin":"0","aria-valuemax":"100"},o),l=I("section",{class:"caption","aria-label":"Where you are"},n,s,r,a),c=t.rooms.length;return e.on((h,f)=>{if(!(f.has("room")||f.has("mode")||f.has("tour")||f.has("phase")))return;let u,d,g,y=h.tour.playing&&h.mode==="walk";if(y){let p=t.rooms[Math.min(c-1,Math.max(0,h.tour.index))];u=`Guided tour \xB7 ${tn(h.tour.index+1)} / ${tn(c)}`,d=p.name,g=p.detail}else if(h.mode==="dollhouse")u="The whole residence",d="The whole picture.",g="Turn it in your hands. Choose a room to step inside.";else if(h.mode==="plan")u="Floor plan",d="Room to explore.",g="A view from above. Choose a room to walk there.";else{let p=t.rooms.findIndex(E=>E.id===h.room),M=t.rooms[p];u=M?`Room ${tn(p+1)} of ${tn(c)}`:"Between the rooms",d=M?M.name:i.roomName(h.room),g=M?M.detail:"A quiet passage from one room to the next."}s.textContent!==d&&(l.classList.remove("is-new"),l.offsetWidth,l.classList.add("is-new")),ue(n,u),ue(s,d),ue(r,g),l.classList.toggle("is-touring",y);let m=Math.round(Math.max(0,Math.min(1,h.tour.progress))*100);o.style.transform=`scaleX(${m/100})`,me(a,"aria-valuenow",String(m))}),l}var fu=2*Math.PI*16;function op(i){let{def:t,store:e}=i,n=t.rooms.length,s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 36 36"),s.setAttribute("class","ring"),s.setAttribute("aria-hidden","true"),s.innerHTML=`<g fill="none" stroke-width="1.6"><circle cx="18" cy="18" r="16" stroke="#ffffff38"/><circle class="ringp" cx="18" cy="18" r="16" style="stroke:var(--hi)" stroke-linecap="round" stroke-dasharray="${fu}" stroke-dashoffset="${fu}"/></g>`;let r=s.lastElementChild,o=I("span",{class:"tico"},Ht("play")),a=I("small",null,`${n} rooms`),l=I("button",{class:"tourb",type:"button","aria-pressed":"false",onclick:()=>i.toggleTour()},I("span",{class:"dial"},s,o),I("span",{class:"tourt"},I("b",null,"Guided tour"),a)),c=M=>{let E=I("img",{src:M,alt:"",loading:"lazy",decoding:"async"});return E.addEventListener("error",()=>{E.style.visibility="hidden"},{once:!0}),E},h=t.rooms.map((M,E)=>I("button",{class:"room",type:"button","data-room":M.id,"aria-label":`${M.name}. ${M.detail}`,onclick:()=>i.chooseRoom(M.id)},I("span",{class:"rimg"},c(t.photoUrl(M.image))),I("span",{class:"rname"},I("i",null,tn(E+1)),M.name))),f=I("div",{class:"rooms"},h),u=I("span",{class:"k"}),d=I("b"),g=I("span",{class:"chev"},Ht("up")),y=I("button",{class:"pill",type:"button","aria-expanded":"true","aria-label":"Show or hide the rooms",onclick:()=>e.set({dockOpen:!e.get().dockOpen})},I("span",{class:"pt"},u,d),g),m=I("nav",{class:"dock","aria-label":"Rooms"},I("div",{class:"dbar"},l,y),f),p=matchMedia("(prefers-reduced-motion: reduce)");return e.on((M,E)=>{if(E.has("room")||E.has("mode")){let x=t.rooms.findIndex(S=>S.id===M.room);h.forEach(S=>{let T=S.dataset.room===M.room;me(S,"aria-current",T?"location":!1),S.classList.toggle("is-here",T&&M.mode==="walk")}),ue(u,x>=0?`${tn(x+1)} / ${tn(n)}`:"Rooms"),ue(d,M.mode==="walk"?i.roomName(M.room):M.mode==="plan"?"Floor plan":"Dollhouse");let w=h[x];w&&f.scrollWidth>f.clientWidth&&f.scrollTo({left:w.offsetLeft-(f.clientWidth-w.offsetWidth)/2,behavior:p.matches?"auto":"smooth"})}if(E.has("tour")){let{playing:x,index:w,progress:S}=M.tour;me(l,"aria-pressed",x?"true":"false"),me(l,"aria-label",x?"Pause the guided tour":"Start the guided tour"),o.replaceChildren(Ht(x?"pause":"play")),r.setAttribute("stroke-dashoffset",String(fu*(1-Math.max(0,Math.min(1,x?S:0))))),ue(a,x?`${tn(w+1)} of ${tn(n)} \xB7 ${t.rooms[Math.min(n-1,w)]?.name??""}`:`${n} rooms`),m.classList.toggle("is-touring",x)}E.has("dockOpen")&&(m.classList.toggle("is-folded",!M.dockOpen),me(y,"aria-expanded",M.dockOpen?"true":"false"),g.replaceChildren(Ht(M.dockOpen?"down":"up")))}),m}function qi(i,t,e,n,...s){let r=tp(t);return I("section",{class:`panel gd p-${t}`,role:"dialog","aria-modal":"false","aria-labelledby":r,hidden:!0},I("header",{class:"ph"},I("div",null,I("span",{class:"k"},e),I("h2",{id:r},n)),I("button",{class:"x",type:"button","aria-label":`Close ${n}`,onclick:()=>i.closePanel()},Ht("close"))),...s)}function Bo(i,t,e=""){return I("button",{class:"sw "+e,type:"button",role:"switch","aria-checked":"false",onclick:t},I("span",{class:"swl"},i),I("span",{class:"trk","aria-hidden":"true"},I("i")))}var ko=(i,t)=>me(i,"aria-checked",t?"true":"false");function pu(i,t,e){let n=t.map(s=>I("button",{type:"button","aria-pressed":"false",title:s.hint,onclick:()=>e(s.value)},s.label));return{el:I("div",{class:"seg",role:"group","aria-label":i},n),set(s){n.forEach((r,o)=>me(r,"aria-pressed",t[o].value===s?"true":"false"))}}}var gc=(i,...t)=>I("div",{class:"row"},I("span",{class:"rl"},i),...t);var xc=Math.PI/180;function zo(i,t,e){let[n,s,r]=t.split("-").map(Number),o=Math.round((Date.UTC(n,s-1,r)-Date.UTC(n,0,1))/864e5)+1,a=n%4===0&&n%100!==0||n%400===0,l=2*Math.PI/(a?366:365)*(o-1+(e-i.tz-12)/24),c=229.18*(75e-6+.001868*Math.cos(l)-.032077*Math.sin(l)-.014615*Math.cos(2*l)-.040849*Math.sin(2*l)),h=.006918-.399912*Math.cos(l)+.070257*Math.sin(l)-.006758*Math.cos(2*l)+907e-6*Math.sin(2*l)-.002697*Math.cos(3*l)+.00148*Math.sin(3*l),u=((e*60+c+4*i.lng-60*i.tz)/4-180)*xc,d=i.lat*xc,g=Math.sin(d)*Math.sin(h)+Math.cos(d)*Math.cos(h)*Math.cos(u),y=Math.acos(Math.max(-1,Math.min(1,g))),m=Math.atan2(Math.sin(u),Math.cos(u)*Math.sin(d)-Math.tan(h)*Math.cos(d))/xc+180;return{elevationDeg:90-y/xc,azimuthDeg:(m+360)%360}}function mu(i,t,e,n,s,r){let o=zo(i,t,s).elevationDeg;for(let a=s+1/30;a<r;a+=1/30){let l=zo(i,t,a).elevationDeg;if(n?o<e&&l>=e:o>e&&l<=e)return a;o=l}return null}var gu=i=>Math.round(i*12)/12;function xu(i,t){let e=mu(i,t,-.833,!0,0,12),n=mu(i,t,-.833,!1,12,24),s=mu(i,t,7,!1,12,24);return{rise:e,set:n,morning:gu(e==null?8:Math.max(7,e+1.5)),golden:gu(s??(n==null?17.5:n-.7)),evening:gu(Math.min(21.5,n==null?19.5:n+1.1))}}function Vo(i,t=Date.now()){let e=new Date(t+i*36e5);return{date:e.toISOString().slice(0,10),hour:e.getUTCHours()+e.getUTCMinutes()/60}}function vu(i,t){let[e,n,s]=i.split("-").map(Number);return new Date(Date.UTC(e,n-1,s+t)).toISOString().slice(0,10)}function ap(i,t){return t<-6?"Night":t<0?i<12?"Dawn":"Blue hour":t<10?i<12?"Early light":"Golden hour":i<11?"Morning":i<14.5?"Midday":"Afternoon"}function lp(i){return i==="Night"||i==="Blue hour"||i==="Dawn"?"moon":i==="Early light"||i==="Golden hour"?"sunset":"sun"}var Xy="http://www.w3.org/2000/svg",Kn=5,Ei=22,bs=320,$n=92,Yi=i=>14+(i-Kn)/(Ei-Kn)*(bs-28),cp=i=>Math.max(8,Math.min(112,$n-Math.sin(i*Math.PI/180)*78)),qy=i=>Kn+(i-14)/(bs-28)*(Ei-Kn),En=(i,t={})=>{let e=document.createElementNS(Xy,i);for(let n in t)e.setAttribute(n,String(t[n]));return e},hp=i=>{let[t,e,n]=i.split("-").map(Number);return new Date(Date.UTC(t,e-1,n)).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"})};function up(i){let{def:t,store:e}=i,n=t.listing,s={lat:n.lat,lng:n.lng,tz:n.tzOffsetHours},r=()=>i.api(),o=()=>{e.get().light?.live&&r()?.setLive(!1)},a=I("span",{class:"lci"},Ht("sun")),l=I("span",{class:"lctm"},"\u2014"),c=I("span",{class:"lcp"},"Live Light"),h=I("span",{class:"live"},I("i"),"Live"),f=I("button",{class:"lc gl",type:"button","data-panel":"light","aria-expanded":"false","aria-label":"Live Light: change the time of day",onclick:Z=>i.togglePanel("light",Z.currentTarget)},a,I("span",{class:"lct"},l,c),h),u=En("svg",{viewBox:`0 0 ${bs} 132`,class:"arc","aria-hidden":"true"});u.innerHTML=`<defs><linearGradient id="arc-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hi);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--hi);stop-opacity:0"/></linearGradient><clipPath id="arc-d"><rect x="0" y="0" width="${bs}" height="${$n}"/></clipPath><clipPath id="arc-n"><rect x="0" y="${$n}" width="${bs}" height="60"/></clipPath><radialGradient id="sun-glow"><stop offset="0" style="stop-color:var(--hi);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--hi);stop-opacity:0"/></radialGradient></defs>`;let d=En("path",{"clip-path":"url(#arc-d)",fill:"url(#arc-f)"}),g=En("path",{"clip-path":"url(#arc-d)",fill:"none",style:"stroke:var(--hi)","stroke-width":1.7}),y=En("path",{"clip-path":"url(#arc-n)",fill:"none",stroke:"#ffffff4d","stroke-width":1.2,"stroke-dasharray":"1 4","stroke-linecap":"round"}),m=En("line",{stroke:"#ffffff47",x1:6,x2:bs-6,y1:$n,y2:$n}),p=En("g",{stroke:"#ffffff47",fill:"#ffffff6b","font-size":10});for(let Z of[6,9,12,15,18,21]){p.append(En("line",{x1:Yi(Z),x2:Yi(Z),y1:$n-3,y2:$n+3}));let Lt=En("text",{x:Yi(Z),y:126,"text-anchor":"middle",stroke:"none"});Lt.textContent=String(Z).padStart(2,"0"),p.append(Lt)}let M={fill:"#ffffff9e","font-size":9.5,"font-weight":600},E=En("text",{...M,"text-anchor":"end"}),x=En("text",{...M,"text-anchor":"start"}),w=En("line",{style:"stroke:rgba(var(--hr),.55)","stroke-dasharray":"2 3"}),S=En("circle",{r:18,fill:"url(#sun-glow)"}),T=En("circle",{r:6.5,class:"sun"});u.append(d,m,p,y,g,E,x,w,S,T);let v=0,b=-1,R=!1,P=Z=>{b=Math.round(Math.max(Kn,Math.min(Ei,Z))*12)/12,!v&&(v=requestAnimationFrame(()=>{v=0,o(),r()?.setHour(b)}))},O=Z=>{let Lt=u.getBoundingClientRect();P(qy((Z.clientX-Lt.left)/Lt.width*bs))};u.addEventListener("pointerdown",Z=>{u.setPointerCapture(Z.pointerId),R=!0,O(Z)}),u.addEventListener("pointermove",Z=>{u.hasPointerCapture(Z.pointerId)&&O(Z)});let V=()=>{R=!1};u.addEventListener("pointerup",V),u.addEventListener("pointercancel",V);let q=I("span",{class:"ltime"},"\u2014"),F=I("span",{class:"lph"}),z=I("span",{class:"lday"}),U=I("input",{class:"range","data-autofocus":!0,type:"range",min:Kn,max:Ei,step:1/12,value:12,"aria-label":"Time of day at the property"});U.addEventListener("input",()=>P(Number(U.value))),U.addEventListener("pointerdown",()=>{R=!0}),U.addEventListener("pointerup",()=>{R=!1}),U.addEventListener("blur",()=>{R=!1});let Y=[{key:"morning",label:"Morning",ico:"sun"},{key:"golden",label:"Golden hour",ico:"sunset"},{key:"evening",label:"Evening",ico:"moon"}],j=xu(s,Vo(s.tz).date),ht=[],ct=[],yt=I("div",{class:"presets",role:"group","aria-label":"Moments"},Y.map(Z=>{let Lt=I("small");ht.push(Lt);let X=I("button",{type:"button","data-preset":Z.key,"aria-pressed":"false",onclick:()=>{o(),r()?.setHour(j[Z.key])}},Ht(Z.ico),I("span",null,Z.label,Lt));return ct.push(X),X})),xt=I("button",{class:"chip",type:"button","aria-pressed":"false",onclick:()=>ut(Vo(s.tz).date)},"Today"),Kt=I("button",{class:"chip",type:"button","aria-pressed":"false",onclick:()=>ut(vu(Vo(s.tz).date,1))},"Tomorrow"),kt=I("span",null,"Check-in day"),Q=I("input",{type:"date","aria-label":"See it on your check-in day"});Q.addEventListener("change",()=>{/^\d{4}-\d{2}-\d{2}$/.test(Q.value)&&ut(Q.value)}),Q.addEventListener("click",()=>{try{Q.showPicker?.()}catch{}});let mt=I("label",{class:"chip cdate"},Ht("calendar"),kt,Q);function ut(Z){o(),r()?.setDate(Z)}let Ft=I("small"),Mt=Bo([I("b",null,I("span",{class:"live"},I("i")),"Live"),Ft],()=>{let Z=!e.get().light?.live;r()?.setLive(Z)},"lsw"),St=I("span",null,"Play the day"),te=I("span",null,Ht("play")),Vt=I("button",{class:"btn line play",type:"button","aria-pressed":"false",onclick:()=>r()?.playDay(!e.get().light?.playing)},te,St),rt=qi(i,"light","Live Light","The light here",I("div",{class:"lread"},q,I("span",{class:"lmeta"},F,z)),u,U,yt,I("div",{class:"dates",role:"group","aria-label":"Date"},xt,Kt,mt),Mt,Vt,I("p",{class:"fine"},`A simulation of the real sun over ${n.area}. Not a photograph.`));i.registerPanel("light",{el:rt,keepOnScene:!0,onOpen:()=>at(e.get().light,!0)});let N="";function G(Z){if(Z===N)return;N=Z,j=xu(s,Z);let Lt=[];for(let pt=Kn;pt<=Ei+1e-6;pt+=1/6)Lt.push(`${Yi(pt).toFixed(1)} ${cp(zo(s,Z,pt).elevationDeg).toFixed(1)}`);let X="M"+Lt.join("L");g.setAttribute("d",X),y.setAttribute("d",X),d.setAttribute("d",`${X}L${Yi(Ei)} ${$n}L${Yi(Kn)} ${$n}Z`);let Et=(pt,B,oe)=>{if(B==null||B<Kn||B>Ei){pt.textContent="";return}pt.setAttribute("x",String(Yi(B)+oe)),pt.setAttribute("y",String($n-7)),pt.textContent=Dn(B)};Et(E,j.rise,-6),Et(x,j.set,6),ht.forEach((pt,B)=>ue(pt,Dn(j[Y[B].key])))}function at(Z,Lt=!1){let X=Vo(s.tz);if(!Z){G(X.date);return}if(!rt.hidden||Lt){G(Z.date);let A=Yi(Math.max(Kn,Math.min(Ei,Z.hour))),_=cp(zo(s,Z.date,Z.hour).elevationDeg);T.setAttribute("cx",A.toFixed(1)),T.setAttribute("cy",_.toFixed(1)),S.setAttribute("cx",A.toFixed(1)),S.setAttribute("cy",_.toFixed(1)),w.setAttribute("x1",A.toFixed(1)),w.setAttribute("x2",A.toFixed(1)),w.setAttribute("y1",_.toFixed(1)),w.setAttribute("y2",String($n)),u.classList.toggle("is-night",Z.sun.elevationDeg<0)}let Et=ap(Z.hour,Z.sun.elevationDeg);ue(q,Dn(Z.hour)),ue(F,Et);let pt=vu(X.date,1);ue(z,Z.date===X.date?"Today":Z.date===pt?"Tomorrow":hp(Z.date)),R||(U.value=String(Math.max(Kn,Math.min(Ei,Z.hour)))),ct.forEach((A,_)=>me(A,"aria-pressed",!Z.live&&!Z.playing&&Math.abs(j[Y[_].key]-Z.hour)<.05?"true":"false")),me(U,"aria-valuetext",`${Dn(Z.hour)}, ${Et}`),me(xt,"aria-pressed",Z.date===X.date?"true":"false"),me(Kt,"aria-pressed",Z.date===pt?"true":"false");let B=Z.date!==X.date&&Z.date!==pt;mt.classList.toggle("is-on",B),ue(kt,B?hp(Z.date):"Check-in day"),me(Q,"min",X.date),B&&Q.value!==Z.date&&(Q.value=Z.date),ko(Mt,Z.live);let oe=Z.weather;ue(Ft,Z.live?[`Now in ${n.area}`,Dn(Z.hour),oe?`${Math.round(oe.temp)}\xB0`:"",oe?oe.label:""].filter(Boolean).join(" \xB7 "):"Follow the real time and weather there"),me(Vt,"aria-pressed",Z.playing?"true":"false"),ue(St,Z.playing?"Pause the day":"Play the day"),te.replaceChildren(Ht(Z.playing?"pause":"play"));let It=lp(Et);a.dataset.ico!==It&&(a.dataset.ico=It,a.replaceChildren(Ht(It))),ue(l,Dn(Z.hour)),ue(c,Z.playing?"Playing the day":Et),f.classList.toggle("is-live",Z.live),f.classList.toggle("is-night",Z.sun.elevationDeg<-2),me(f,"aria-label",`Live Light: ${Dn(Z.hour)}, ${Et}${Z.live?", live":""}. Change the time of day`)}return e.on((Z,Lt)=>{Lt.has("light")&&at(Z.light)}),{chip:f,panel:rt}}var Yy="http://www.w3.org/2000/svg",Nn=(i,t={})=>{let e=document.createElementNS(Yy,i);for(let n in t)e.setAttribute(n,String(t[n]));return e};function dp(i){let{def:t,store:e}=i,n=t.plan.bounds,s=n.maxX-n.minX,r=n.maxZ-n.minZ,o=Math.max(s,r),a=o*.04,l=Nn("svg",{viewBox:`${n.minX-a} ${n.minZ-a} ${s+a*2} ${r+a*2}`,class:"plan",role:"group","aria-label":"Floor plan. Choose a room to walk there."});l.style.setProperty("--u",String(o/100));let c=new Map;for(let M of t.plan.rooms){let E=M.hall||!t.views[M.id],x=Nn("g",{class:E?"pr is-hall":"pr"});x.append(Nn("rect",{x:M.x,y:M.z,width:M.w,height:M.d,rx:o*.006,fill:E?"#ffffff06":"#ffffff12",stroke:"#ffffff6b","stroke-width":1,"vector-effect":"non-scaling-stroke",...E?{"stroke-dasharray":"3 3"}:{}}));let w=M.x+M.w/2,S=M.z+M.d/2,T=Nn("text",{x:w,y:S,"text-anchor":"middle","dominant-baseline":"central","font-size":o*.035,"font-weight":600,"letter-spacing":o*.002,fill:"#ffffff94"});if(M.d>M.w*1.6&&M.w<o*.18&&T.setAttribute("transform",`rotate(-90 ${w} ${S})`),T.textContent=M.label,x.append(T),!M.hall&&t.views[M.id]){let v=()=>{i.chooseRoom(M.id),e.get().panel==="map"&&i.closePanel()};x.setAttribute("role","button"),x.setAttribute("tabindex","0"),x.setAttribute("aria-label",`Walk to the ${i.roomName(M.id).toLowerCase()}`),x.addEventListener("click",v),x.addEventListener("keydown",b=>{(b.key==="Enter"||b.key===" ")&&(b.preventDefault(),v())})}c.set(M.id,x),l.append(x)}let h=o*.085,f=Nn("defs"),u=Nn("radialGradient",{id:"cone",cx:0,cy:0,r:h,gradientUnits:"userSpaceOnUse"});u.append(Nn("stop",{offset:0,style:"stop-color:var(--hi);stop-opacity:.6"}),Nn("stop",{offset:1,style:"stop-color:var(--hi);stop-opacity:0"})),f.append(u),l.prepend(f);let d=Nn("g",{class:"me","aria-hidden":"true"}),g=Nn("path",{d:`M0 0L${-h*.66} ${-h}Q0 ${-h*1.28} ${h*.66} ${-h}Z`,fill:"url(#cone)"});d.append(g,Nn("circle",{r:o*.03,class:"mehalo",style:"fill:rgba(var(--hr),.28)"}),Nn("circle",{r:o*.016,style:"fill:var(--hi)",stroke:"#fff","stroke-width":1.5,"vector-effect":"non-scaling-stroke"})),l.append(d);let y=I("button",{class:"x",type:"button","aria-label":"Open the floor plan",onclick:()=>{i.setMode(e.get().mode==="plan"?"walk":"plan"),i.closePanel()}},Ht("out")),m=I("aside",{class:"map gl","aria-label":"Map of the apartment"},I("header",null,I("span",{class:"k"},Ht("compass"),"The residence"),y),l,I("footer",null,I("span",null,I("i"),"You are here"),I("small",null,"Illustrative plan"))),p=I("button",{class:"round gl mapbtn",type:"button","aria-label":"Show the map","data-panel":"map","aria-expanded":"false",onclick:M=>i.togglePanel("map",M.currentTarget)},Ht("map"));return i.registerPanel("map",{el:m,cssOnly:!0}),e.on((M,E)=>{if(E.has("pose")&&M.pose){let x=M.pose;d.setAttribute("transform",`translate(${x.x.toFixed(3)} ${x.z.toFixed(3)})`),g.setAttribute("transform",`rotate(${(180-x.yaw*180/Math.PI).toFixed(1)})`)}(E.has("room")||E.has("mode"))&&c.forEach((x,w)=>x.classList.toggle("is-here",w===M.room)),E.has("mode")&&m.classList.toggle("is-away",M.mode!=="walk")}),{card:m,button:p}}var Zy={w:[0,1],a:[-1,0],s:[0,-1],d:[1,0]},$y={KeyW:"w",ArrowUp:"w",KeyA:"a",ArrowLeft:"a",KeyS:"s",ArrowDown:"s",KeyD:"d",ArrowRight:"d"};function fp(i){let{store:t}=i,e=()=>i.api(),n=["w","a","s","d"].map(F=>{let[z,U]=Zy[F],Y={w:"Walk forward",a:"Step left",s:"Step back",d:"Step right"}[F],j=I("button",{type:"button",class:"key","data-k":F,"aria-label":Y},F.toUpperCase()),ht=()=>{j.classList.contains("is-down")&&(j.classList.remove("is-down"),e()?.move(0,0))};return j.addEventListener("pointerdown",ct=>{ct.preventDefault(),j.setPointerCapture(ct.pointerId),j.classList.add("is-down"),e()?.move(z,U)}),j.addEventListener("pointerup",ht),j.addEventListener("pointercancel",ht),j.addEventListener("lostpointercapture",ht),j.addEventListener("keydown",ct=>{(ct.key==="Enter"||ct.key===" ")&&!ct.repeat&&(ct.preventDefault(),j.classList.add("is-down"),e()?.move(z,U))}),j.addEventListener("keyup",ct=>{(ct.key==="Enter"||ct.key===" ")&&ht()}),j.addEventListener("blur",ht),j}),s=I("p",{class:"kt"}),r=I("span",null,"Mouse look"),o=I("button",{class:"mlook",type:"button","aria-pressed":"false",onclick:()=>i.toggleMouseLook()},Ht("mouse"),r),a=I("div",{class:"keys gl",role:"group","aria-label":"Walking"},I("div",{class:"pad"},n),s,o),l=(F,z)=>{let U=$y[F.code];!U||mc(F.target)||n.find(Y=>Y.dataset.k===U)?.classList.toggle("is-lit",z)};window.addEventListener("keydown",F=>l(F,!0)),window.addEventListener("keyup",F=>l(F,!1)),window.addEventListener("blur",()=>n.forEach(F=>F.classList.remove("is-lit")));let c=I("i",{class:"knob"}),h=I("div",{class:"stick","aria-hidden":"true"},c),f=I("div",{class:"zone","aria-hidden":"true"}),u=I("div",{class:"ghost","aria-hidden":"true"},I("i"),I("span",null,"Hold here",I("br"),"to walk")),d=48,g=-1,y=0,m=0,p=0,M=0,E=0,x=0,w=0,S=()=>{E=0,e()?.move(x,w)};f.addEventListener("pointerdown",F=>{g===-1&&(g=F.pointerId,y=F.clientX,m=F.clientY,p=performance.now(),M=0,f.setPointerCapture(F.pointerId),h.style.transform=`translate(${y}px, ${m}px)`,c.style.transform="",h.classList.add("is-on"))}),f.addEventListener("pointermove",F=>{if(F.pointerId!==g)return;let z=F.clientX-y,U=F.clientY-m,Y=Math.hypot(z,U);M=Math.max(M,Y),Y>d&&(z*=d/Y,U*=d/Y),c.style.transform=`translate(${z}px, ${U}px)`;let j=Math.min(1,Y/d),ht=j<.14?0:(j-.14)/.86;x=Y?z/Math.min(Y,d)*ht:0,w=Y?-U/Math.min(Y,d)*ht:0,E||(E=requestAnimationFrame(S)),M>10&&!i.el.classList.contains("stick-used")&&(i.el.classList.add("stick-used"),t.set({dockOpen:!1}))});let T=F=>{F.pointerId===g&&(g=-1,h.classList.remove("is-on"),E&&cancelAnimationFrame(E),E=0,x=w=0,e()?.move(0,0),F.type==="pointerup"&&M<8&&performance.now()-p<320&&v(F.clientX,F.clientY))};f.addEventListener("pointerup",T),f.addEventListener("pointercancel",T);function v(F,z){f.style.pointerEvents="none";let U=document.elementFromPoint(F,z);if(f.style.pointerEvents="",!U||!i.scene.contains(U))return;let Y={bubbles:!0,cancelable:!0,composed:!0,clientX:F,clientY:z,screenX:F,screenY:z,button:0,pointerId:9001,pointerType:"touch",isPrimary:!0};U.dispatchEvent(new PointerEvent("pointerdown",{...Y,buttons:1})),U.dispatchEvent(new PointerEvent("pointerup",{...Y,buttons:0})),U.dispatchEvent(new MouseEvent("click",Y))}let b=I("button",{class:"run gl",type:"button","aria-label":"Hold to run"},Ht("run"),I("span",null,"Run")),R=()=>{b.classList.contains("is-down")&&(b.classList.remove("is-down"),e()?.setRun(!1))};b.addEventListener("pointerdown",F=>{F.preventDefault(),b.setPointerCapture(F.pointerId),b.classList.add("is-down"),e()?.setRun(!0)}),b.addEventListener("pointerup",R),b.addEventListener("pointercancel",R),b.addEventListener("lostpointercapture",R),b.addEventListener("contextmenu",F=>F.preventDefault()),b.addEventListener("keydown",F=>{(F.key==="Enter"||F.key===" ")&&!F.repeat&&(F.preventDefault(),b.classList.add("is-down"),e()?.setRun(!0))}),b.addEventListener("keyup",R);let P=I("button",{class:"round gl gyro",type:"button","aria-pressed":"false","aria-label":"Look by moving your phone",onclick:V},Ht("gyro"));"DeviceOrientationEvent"in window||(P.hidden=!0);let O=!1;async function V(){let F=e();if(!F||O)return;let z=!t.get().gyro;O=!0;let U=!1;try{U=await F.setGyro(z)}catch{U=!1}O=!1,t.set({gyro:z&&U}),z&&i.toast(U?"Move your phone to look around":"Motion look is not available on this device",U?"ok":"warn")}let q=I("div",{class:"tcol"},P,b);return t.on((F,z)=>{(z.has("mode")||z.has("input"))&&(ue(s,""),s.append(...F.mode==="walk"?[I("span",null,I("b",null,"Drag")," to look around"),I("span",null,I("b",null,"Click the floor")," to walk there")]:[I("span",null,I("b",null,"Drag")," to turn \xB7 ",I("b",null,"scroll")," to zoom"),I("span",null,I("b",null,"Click a room")," to step inside")])),z.has("pointerLock")&&(me(o,"aria-pressed",F.pointerLock?"true":"false"),ue(r,F.pointerLock?"Esc to release":"Mouse look")),z.has("gyro")&&me(P,"aria-pressed",F.gyro?"true":"false")}),[a,f,h,u,q]}function _u(i,t){let{def:e}=i,n=e.rooms.map(b=>({id:b.id,name:b.name,detail:b.detail,room:!0,photos:b.photos.map(R=>({id:R,name:b.name}))}));e.extraPhotos?.photos.length&&n.push({...e.extraPhotos,room:!1});let s=0,r=0,o=t?"fb-title":"ph-title",a=I("span",{class:"k"},t?"The residence in photographs":"The original photographs"),l=I("h2",{id:o}),c=I("p",{class:"gdet"}),h=n.map((b,R)=>I("button",{type:"button","aria-pressed":"false",onclick:()=>{s=R,r=0,v()}},b.name)),f=I("img",{alt:"",decoding:"async"});f.addEventListener("load",()=>f.classList.remove("is-loading"));let u=I("span",{class:"count"}),d=I("button",{class:"arrow is-prev",type:"button","aria-label":"Previous photograph",onclick:()=>T(-1)},Ht("left")),g=I("button",{class:"arrow is-next",type:"button","aria-label":"Next photograph",onclick:()=>T(1)},Ht("right")),y=I("div",{class:"stage"},f,d,g,u),m=I("div",{class:"thumbs",role:"group","aria-label":"Choose a photograph"}),p=I("p",{class:"gcap"}),M=I("button",{class:"btn line gwalk",type:"button",onclick:()=>{let b=n[s];i.closeDialog(),i.chooseRoom(b.id)}},Ht("walk"),I("span")),E=0,x=0,w=-1;y.addEventListener("pointerdown",b=>{b.pointerType!=="mouse"&&(w=b.pointerId,E=b.clientX,x=b.clientY)}),y.addEventListener("pointerup",b=>{if(b.pointerId!==w)return;w=-1;let R=b.clientX-E,P=b.clientY-x;Math.abs(R)>44&&Math.abs(R)>Math.abs(P)*1.4&&T(R<0?1:-1)});let S=I("div",{class:t?"gal is-page":"gal"},I("header",{class:"ghead"},I("div",null,a,l,c),t?null:I("button",{class:"round gclose",type:"button","aria-label":"Close the photographs",onclick:()=>i.closeDialog()},Ht("close"))),I("div",{class:"tabs",role:"group","aria-label":"Rooms"},h),y,I("div",{class:"gfoot"},p,m,t?null:M));function T(b){let R=n[s];r=(r+b+R.photos.length)%R.photos.length,v()}function v(){let b=n[s],R=b.photos[r];ue(l,b.name),ue(c,b.detail),h.forEach((V,q)=>me(V,"aria-pressed",q===s?"true":"false"));let P=e.photoUrl(R.id);f.getAttribute("src")!==P&&(f.classList.add("is-loading"),f.src=P),f.alt=`${R.name}: original listing photograph ${r+1} of ${b.photos.length}`,ue(u,`${tn(r+1)} / ${tn(b.photos.length)}`),ue(p,b.room?`Photograph ${r+1} of ${b.photos.length}`:R.name);let O=b.photos.length<2;d.hidden=O,g.hidden=O,m.replaceChildren(...b.photos.map((V,q)=>I("button",{type:"button","aria-label":`${V.name}, photograph ${q+1}`,"aria-pressed":q===r?"true":"false",onclick:()=>{r=q,v()}},I("img",{src:e.photoUrl(V.id),alt:"",loading:"lazy",decoding:"async"})))),M.hidden=!b.room||!!i.store.get().error,ue(M.lastElementChild,`Walk into the ${b.name.toLowerCase()}`);for(let V of[1,-1]){let q=b.photos[(r+V+b.photos.length)%b.photos.length];q&&(new Image().src=e.photoUrl(q.id))}}return{el:S,step:T,show(b){let R=b?n.findIndex(P=>P.id===b):-1;R>=0&&(s=R,r=0),v()}}}var Ky={ultra:"Ultra",high:"High",balanced:"Balanced",battery:"Battery"};function pp(i){let{store:t}=i,e=()=>i.api(),n=pu("Picture quality",[{value:"auto",label:"Auto",hint:"Adjusts to keep movement smooth"},{value:"ultra",label:"Ultra"},{value:"high",label:"High"},{value:"balanced",label:"Balanced"},{value:"battery",label:"Battery",hint:"Lighter on your battery"}],f=>e()?.setQuality(f)),s=I("p",{class:"stats","aria-live":"off"}),r=pu("Eye height",[{value:1.1,label:[I("b",null,"Child"),I("small",null,"1.1 m")]},{value:1.6,label:[I("b",null,"Adult"),I("small",null,"1.6 m")]},{value:1.8,label:[I("b",null,"Tall"),I("small",null,"1.8 m")]}],f=>{e()?.setEyeHeight(f),t.set({eye:f})}),o=I("output",{class:"out"}),a=I("input",{class:"range",type:"range",min:35,max:80,step:1,"aria-label":"Field of view in degrees"});a.addEventListener("input",()=>{let f=Number(a.value);e()?.setFov(f),t.set({fov:f})});let l=Bo([I("b",null,"Neighbourhood sound"),I("small",null,"Birdsong, the city, evening crickets")],()=>i.toggleAmbience()),c=Bo([I("b",null,"Mouse look"),I("small",null,"Move the mouse to look. Esc releases it.")],()=>i.toggleMouseLook(),"om"),h=qi(i,"settings","Settings","Your view",gc("Picture quality",n.el,s),gc("Eye height",r.el),gc("Field of view",I("div",{class:"fov"},I("small",null,"Narrow"),a,I("small",null,"Wide"),o)),I("div",{class:"sws"},l,c),I("button",{class:"btn quiet reset",type:"button",onclick:()=>{e()?.reset(),i.closePanel()}},Ht("reset"),"Back to the start"));return i.registerPanel("settings",{el:h,keepOnScene:!0,onOpen:()=>{let f=e()?.quality();f&&t.set({quality:f})}}),t.on((f,u)=>{if(u.has("quality")&&f.quality){let d=f.quality;n.set(d.auto?"auto":d.tier),ue(s,`${Math.round(d.fps)} fps \xB7 ${d.dpr.toFixed(2)}\xD7 pixels \xB7 ${Ky[d.tier]}${d.auto?" (auto)":""}${d.ao?" \xB7 soft shadows":""}`)}u.has("eye")&&r.set(f.eye),u.has("fov")&&(document.activeElement!==a&&(a.value=String(f.fov)),ue(o,`${Math.round(f.fov)}\xB0`)),u.has("ambience")&&ko(l,f.ambience),u.has("pointerLock")&&ko(c,f.pointerLock),(u.has("ready")||u.has("error"))&&me(h,"data-off",!f.ready||!!f.error)}),h}var Jy={walk:"Walk",dollhouse:"Dollhouse",plan:"Floor plan"};function mp(i){let{def:t,store:e}=i,n=t.listing,s="",r=null,o="",a=0,l=I("img",{alt:""});l.addEventListener("load",()=>{let w=l.naturalWidth,S=l.naturalHeight;w&&(c.style.aspectRatio=`${w} / ${S}`,c.style.width=S>w?`min(100%, calc(36vh * ${(w/S).toFixed(3)}))`:"")});let c=I("figure",{class:"card is-loading"},l,I("figcaption")),h=c.lastElementChild,f=I("input",{class:"lf",type:"text",readonly:!0,"aria-label":"Link to this view",onfocus:w=>w.target.select()}),u=I("span",null,"Copy link"),d=I("button",{class:"btn line","data-autofocus":!0,type:"button",onclick:x},Ht("copy"),u),g=I("button",{class:"btn pri",type:"button",onclick:E},Ht("share"),"Share");typeof navigator.share!="function"&&(g.hidden=!0);let y=I("a",{class:"btn line",target:"_blank",rel:"noopener",href:"#"},Ht("chat"),"WhatsApp"),m=I("a",{class:"btn line",href:"#",download:`${t.slug}-view.jpg`,"aria-disabled":"true"},Ht("download"),"Postcard");m.addEventListener("click",w=>{s||w.preventDefault()});let p=qi(i,"share","Share","Share this exact view",c,I("div",{class:"link"},Ht("link"),f),I("div",{class:"sact"},g,y,d,m),I("p",{class:"fine"},"Whoever opens the link steps in right here, at this hour."));i.registerPanel("share",{el:p,onOpen:M,onClose:()=>{a++}});async function M(){let w=i.api(),S=++a,T=t.rooms.find(P=>P.id===e.get().room)?.image??t.rooms[0].image,v=n.title;if(w){let P=w.getView();o=`${location.origin}/apartments?open=${encodeURIComponent(n.id)}&tour=${Jf(P)}`;let O=e.get().light;v=[P.mode==="walk"?i.roomName(P.room):Jy[P.mode],P.hour!=null?Dn(P.hour):O?.live?"Live":""].filter(Boolean).join(" \xB7 ")}else o=`${location.origin}/apartments?open=${encodeURIComponent(n.id)}&tour=1`;f.value=o,ue(h,v);let b=`Step inside ${n.title} in ${n.area} \u2014 a Cabana 3D tour.`;y.href="https://wa.me/?text="+encodeURIComponent(`${b} ${o}`),c.classList.add("is-loading"),me(m,"aria-disabled","true");let R=null;try{R=w?await w.snapshot():null}catch{R=null}S===a&&(s&&URL.revokeObjectURL(s),s="",r=null,R?(s=URL.createObjectURL(R),r=new File([R],`${t.slug}-view.jpg`,{type:R.type||"image/jpeg"}),l.src=s,m.href=s,me(m,"aria-disabled",!1)):l.src=t.photoUrl(T),l.decode?.().catch(()=>{}).finally(()=>{S===a&&c.classList.remove("is-loading")}))}async function E(){let w={title:`${n.title} \xB7 Cabana 3D tour`,text:`Step inside ${n.title} in ${n.area}.`,url:o};r&&navigator.canShare?.({files:[r]})&&(w.files=[r]);try{await navigator.share(w)}catch(S){S?.name!=="AbortError"&&i.toast("Sharing is not available here. Copy the link instead.","warn")}}async function x(){let w=!1;try{await navigator.clipboard.writeText(o),w=!0}catch{f.focus(),f.select();try{w=document.execCommand("copy")}catch{w=!1}}w?(ue(u,"Copied"),d.classList.add("is-done"),i.toast("Link copied","ok"),setTimeout(()=>{ue(u,"Copy link"),d.classList.remove("is-done")},2200)):i.toast("Select the link and copy it","warn")}return p}function gp(i){let t=i,e=[];return{get:()=>t,set(n){let s=new Set;for(let r of Object.keys(n))Object.is(t[r],n[r])||s.add(r);if(s.size){t={...t,...n};for(let r of e)r(t,s)}},on(n){e.push(n),n(t,new Set(Object.keys(t)))}}}function vc(i,t){let e=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(i||"").trim());if(!e)return t;let n=e[1].length===3?e[1].replace(/./g,s=>s+s):e[1];return[0,2,4].map(s=>parseInt(n.slice(s,s+2),16))}var xp=(i,t,e)=>i.map((n,s)=>Math.round(n+(t[s]-n)*e));function yu(i){let t=e=>(e/=255,e<=.03928?e/12.92:((e+.055)/1.055)**2.4);return .2126*t(i[0])+.7152*t(i[1])+.0722*t(i[2])}function vp(i,t){let e=vc(t.night,[20,35,29]),n=vc(t.paper,[246,242,233]),s=vc(t.accent,[196,164,107]),r=vc(t.accentInk,yu(s)>.4?e:[255,255,255]),o=s;for(let h=0;h<8&&yu(o)<.42;h++)o=xp(o,n,.22);let a=s;for(let h=0;h<8&&yu(a)>.16;h++)a=xp(a,e,.22);let l=h=>h.join(","),c={"--accent":`rgb(${l(s)})`,"--ink":`rgb(${l(r)})`,"--hi":`rgb(${l(o)})`,"--hr":l(o),"--lo":`rgb(${l(a)})`,"--night":`rgb(${l(e)})`,"--nr":l(e),"--paper":`rgb(${l(n)})`};for(let h in c)i.style.setProperty(h,c[h])}function _p(){let i=I("div",{class:"toasts",role:"status","aria-live":"polite"}),t=0,e="",n=0;return{el:i,show(s,r){let o=performance.now();if(s===e&&o-n<2500)return;e=s,n=o;let a=I("div",{class:`toast gl${r?" is-"+r:""}`},r==="ok"?Ht("check"):r==="warn"?Ht("info"):Ht("spark"),I("span",null,s));i.replaceChildren(a),clearTimeout(t),t=window.setTimeout(()=>{a.classList.add("is-out"),setTimeout(()=>a.remove(),400)},Math.min(6e3,2200+s.length*45))}}}var yp=[{id:"walk",label:"Walk",icon:"walk"},{id:"dollhouse",label:"Dollhouse",icon:"dollhouse"},{id:"plan",label:"Floor plan",icon:"plan"}],bp=()=>!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen);function Mp(i){let{def:t,store:e}=i,n=yp.map(d=>I("button",{type:"button","data-mode":d.id,"aria-label":d.label,"data-tip":d.label,"aria-pressed":"false",onclick:()=>i.setMode(d.id)},Ht(d.icon),I("span",null,d.label))),s=I("nav",{class:"modes gl","aria-label":"How to view the apartment"},I("span",{class:"thumb","aria-hidden":"true"}),n),r=(d,g,y,m,p)=>I("button",{class:"tool",type:"button","data-act":d,"data-tip":g,"aria-label":g,"data-panel":p,"aria-expanded":p?"false":null,onclick:m},Ht(y)),o=d=>g=>i.togglePanel(d,g.currentTarget),a=r("sound","Neighbourhood sound","mute",()=>i.toggleAmbience()),l=r("fullscreen","Full screen","expand",()=>i.toggleFullscreen());bp()||(l.hidden=!0);let c=I("div",{class:"tools gl"},r("share","Share this view","share",o("share"),"share"),r("photos","Original photographs","photos",()=>i.openPhotos()),r("light","Live Light","sunset",o("light"),"light"),a,r("settings","Settings","sliders",o("settings"),"settings"),r("about","About this view","info",()=>i.openDialog("about")),l),h=I("button",{class:"round gl more",type:"button","aria-label":"More","data-panel":"more","aria-expanded":"false",onclick:o("more")},Ht("more")),f=I("button",{class:"round gl close",type:"button","aria-label":"Close the 3D tour","data-tip":"Close",onclick:()=>i.requestClose()},Ht("close")),u=I("header",{class:"top"},I("div",{class:"brand"},ip(),I("div",{class:"btext"},I("span",{class:"k"},"Cabana",I("i",{"aria-hidden":"true"}),"3D residence"),I("strong",{class:"btitle",title:t.listing.title},t.listing.title),I("a",{class:"area",href:i.listingUrl,target:"_top"},`${t.listing.area}, ${t.listing.city}`,I("span",null,"View listing",Ht("out"))))),s,I("div",{class:"acts"},c,h,f));return e.on((d,g)=>{g.has("mode")&&(n.forEach(y=>me(y,"aria-pressed",y.dataset.mode===d.mode?"true":"false")),s.dataset.at=String(yp.findIndex(y=>y.id===d.mode))),(g.has("ready")||g.has("error"))&&n.forEach(y=>me(y,"disabled",!d.ready||!!d.error)),g.has("ambience")&&(a.replaceChildren(Ht(d.ambience?"sound":"mute")),me(a,"aria-pressed",d.ambience?"true":"false"),a.dataset.tip=d.ambience?"Sound on":"Neighbourhood sound"),g.has("fullscreen")&&(l.replaceChildren(Ht(d.fullscreen?"shrink":"expand")),me(l,"aria-label",d.fullscreen?"Leave full screen":"Full screen"),l.dataset.tip=d.fullscreen?"Leave full screen":"Full screen")}),u}function Sp(i){let{store:t}=i,e=(l,c,h,f)=>I("button",{class:"mi",type:"button",onclick:h},Ht(c),I("span",null,l),f),n=l=>()=>{i.closePanel(),i.togglePanel(l,i.el.querySelector(".more"))},s=I("small"),r=e("Neighbourhood sound","sound",()=>i.toggleAmbience(),s),o=e("Full screen","expand",()=>{i.closePanel(),i.toggleFullscreen()});bp()||(o.hidden=!0);let a=qi(i,"more","Cabana 3D","More",I("div",{class:"menu"},e("Original photographs","photos",()=>{i.closePanel(),i.openPhotos()}),e("Live Light","sunset",n("light")),r,e("Settings","sliders",n("settings")),o,e("About this view","info",()=>{i.closePanel(),i.openDialog("about")}),e("Back to the start","reset",()=>{i.closePanel(),i.api()?.reset()}),I("a",{class:"mi",href:i.listingUrl,target:"_top"},Ht("out"),I("span",null,"View the listing"))));return i.registerPanel("more",{el:a}),t.on((l,c)=>{c.has("ambience")&&(s.textContent=l.ambience?"On":"Off",me(r,"aria-pressed",l.ambience?"true":"false"))}),a}function wp(i,t,e,n,s){let{def:r,store:o}=i,a=r.listing,l=/^(.+?[.!?])\s+(.+)$/.exec(a.tagline.trim()),c=I("h1",{class:"wtitle",id:"wtitle"},l?[l[1]," ",I("em",null,l[2])]:a.tagline),h=I("img",{src:t,alt:"",decoding:"async",fetchpriority:"high"});h.addEventListener("error",()=>{h.src!==new URL(e,location.href).href&&(h.src=e)},{once:!1});let f=(T,v)=>`${T} ${v}${T===1?"":"s"}`,u=[f(a.guests,"guest"),f(a.bedrooms,"bedroom"),f(a.bathrooms,"bath")].join(" \xB7 "),d=I("span",{class:"ll"},"Preparing your private viewing"),g=I("span",{class:"lpct"},"0%"),y=I("i"),m=I("div",{class:"load",role:"status","aria-live":"polite"},I("div",{class:"lrow"},d,g),I("div",{class:"wbar"},y)),p=I("span",null,n?"Step into the shared view":"Enter the apartment"),M=I("button",{class:"btn pri enter",type:"button",disabled:!0,"data-tour-enter":!0,onclick:s},p,Ht("arrow")),E=I("button",{class:"btn quiet",type:"button",onclick:()=>i.openPhotos()},Ht("photos"),"See the original photographs"),x=null;if(n){let T=[n.mode==="walk"?i.roomName(n.room):n.mode==="dollhouse"?"The dollhouse view":"The floor plan"];if(n.hour!=null&&T.push(Dn(n.hour)),n.date){let[v,b,R]=n.date.split("-").map(Number);T.push(new Date(Date.UTC(v,b-1,R)).toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}))}x=I("p",{class:"shared"},Ht("link"),I("span",null,"A view was shared with you",I("b",null,T.join(" \xB7 "))))}let w=I("ol",{class:"windex","aria-label":"Rooms in this tour"},r.rooms.map((T,v)=>I("li",null,I("span",null,tn(v+1)),T.name))),S=I("section",{class:"welcome","aria-labelledby":"wtitle"},I("div",{class:"wbg","aria-hidden":"true"},h),I("div",{class:"wshade","aria-hidden":"true"}),I("div",{class:"wbody"},I("p",{class:"k wk"},I("i",{"aria-hidden":"true"}),r.theme.collection),c,I("p",{class:"listing"},a.title,I("span",null,`${a.area}, ${a.city}`)),I("p",{class:"wdesc"},a.description),I("ul",{class:"chips","aria-label":"In this tour"},I("li",null,Ht("cube"),"Walk every room"),I("li",null,Ht("sunset"),"Live Light"),I("li",null,Ht("person"),u)),x,m,I("div",{class:"wact"},M,E)),w,I("p",{class:"wfoot"},I("span",null,"Photo-based reconstruction \xB7 Estimated dimensions \xB7 Simulated light"),I("span",null,`${a.city}, ${a.country}`)));return o.on((T,v)=>{if(v.has("load")||v.has("ready")||v.has("error")){let b=Math.round(T.load.progress*100);y.style.transform=`scaleX(${T.ready?1:T.load.progress})`,ue(g,T.ready||T.error?"":b+"%"),ue(d,T.error||(T.ready?"Ready when you are":T.load.label||"Preparing your private viewing")),S.classList.toggle("is-ready",T.ready),S.classList.toggle("is-error",!!T.error),me(M,"disabled",!T.ready&&!T.error),ue(p,T.error?"Explore the photographs":n?"Step into the shared view":"Enter the apartment")}if(v.has("phase")){let b=T.phase==="welcome";S.inert=!b,S.classList.toggle("is-gone",!b)}}),S}var jy="This device can\u2019t show the 3D view, so here is the apartment in its original photographs.",bu="The 3D view stopped on this device. Here is the apartment in its original photographs.";function Qy(){try{let i=document.createElement("canvas"),t=i.getContext("webgl2")||i.getContext("webgl");return t?.getExtension("WEBGL_lose_context")?.loseContext(),!!t}catch{return!1}}var tb=i=>i.toLowerCase().replace(/(^|\s)\S/g,t=>t.toUpperCase());function CT(i,t,e){let n=jf(new URLSearchParams(location.search).get("v")),s=matchMedia("(pointer: coarse)").matches,r=window.parent!==window,o="/apartments?open="+encodeURIComponent(t.listing.id),a=gp({phase:"welcome",ready:!1,load:{progress:0,label:""},error:null,mode:"walk",room:t.start,pose:null,tour:{playing:!1,index:0,progress:0},light:null,quality:null,ambience:!1,gyro:!1,pointerLock:!1,fullscreen:!!document.fullscreenElement,eye:1.6,fov:61,input:s?"touch":"mouse",dockOpen:!0,panel:null,dialog:null}),l=I("div",{class:"ct"});vp(l,t.theme);let c=I("div",{class:"scene",tabindex:"0",role:"application","aria-roledescription":"3D view","aria-label":`${t.listing.title} in 3D. Drag to look around. W A S D or the arrow keys walk; Q and E turn.`}),h=null,f={},u=null,d=_p(),g=I("div",{class:"sr","aria-live":"polite"});function y(N){let G=t.rooms.find(Z=>Z.id===N);if(G)return G.name;let at=t.plan.rooms.find(Z=>Z.id===N);return at?tb(at.label):N==="hall"?"Hallway":"The apartment"}function m(N,G){p(!1);let at=f[N];if(!at)return;u=G||document.activeElement,at.cssOnly||(at.el.hidden=!1),a.set({panel:N}),at.onOpen?.();let Z=du(at.el);(Z.find(X=>X.hasAttribute("data-autofocus"))||Z.find(X=>!X.classList.contains("x"))||Z[0])?.focus({preventScroll:!0})}function p(N=!0){let G=a.get().panel;if(!G)return;let at=f[G],Z=at.el.contains(document.activeElement);at.cssOnly||(at.el.hidden=!0),a.set({panel:null}),at.onClose?.(),N&&Z&&u?.isConnected&&u.focus({preventScroll:!0})}let M={};function E(N){p(!1);let G=M[N];a.get().dialog&&a.get().dialog!==N&&M[a.get().dialog].close(),G.open||G.showModal(),a.set({dialog:N})}function x(){let N=a.get().dialog;N&&(M[N].open&&M[N].close(),a.set({dialog:null}))}let w,S=null,T={def:t,el:l,scene:c,store:a,listingUrl:o,roomName:y,api:()=>h,toast:(N,G)=>d.show(N,G),announce:N=>{g.textContent="",requestAnimationFrame(()=>{g.textContent=N})},registerPanel(N,G){f[N]=G,G.el.addEventListener("keydown",at=>{at.key!=="Escape"&&at.stopPropagation()})},togglePanel:(N,G)=>a.get().panel===N?p():m(N,G),closePanel:()=>p(),openDialog:E,closeDialog:x,openPhotos(N){if(a.get().phase==="fallback"){S?.show(N);return}w.show(N||a.get().room),E("photos")},chooseRoom(N){let G=a.get();if(G.error||!h){T.openPhotos(N);return}G.tour.playing&&h.setTour(!1),G.mode!=="walk"&&(h.setMode("walk"),a.set({mode:"walk"})),h.goRoom(N)},setMode(N){h&&(a.get().tour.playing&&h.setTour(!1),h.setMode(N),a.set({mode:N}))},toggleTour(){if(!h)return;let N=a.get();if(N.tour.playing){h.setTour(!1);return}N.mode!=="walk"&&(h.setMode("walk"),a.set({mode:"walk"})),h.setTour(!0)},toggleAmbience(){let N=!a.get().ambience;h?.setAmbience(N),a.set({ambience:N}),N&&d.show("The sound follows the hour and the weather","ok")},async toggleFullscreen(){try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch{}},toggleMouseLook(){if(!h)return;let N=!a.get().pointerLock;h.setPointerLock(N),N&&c.focus({preventScroll:!0})},requestClose(){r?window.parent.postMessage({type:"cabana-tour-close"},location.origin):location.href=o}};function v(N,G){if(console.error("Cabana tour:",N),a.get().error)return;let at=h;h=null;try{at?.dispose()}catch{}p(!1),a.set({error:G,ready:!1}),a.get().phase==="tour"&&O(!0)}let b={onLoad:(N,G)=>a.set({load:{progress:Math.max(0,Math.min(1,N||0)),label:G}}),onReady:()=>{a.set({ready:!0}),R()},onPose:N=>a.set({pose:N}),onRoom:N=>a.set({room:N}),onMode:N=>a.set({mode:N}),onTour:N=>a.set({tour:N}),onLight:N=>a.set({light:N}),onQuality:N=>a.set({quality:N}),onHint:N=>d.show(N),onError:N=>v(N,bu)};function R(){let N=a.get();h&&N.ready&&h.setPaused(N.phase!=="tour"||N.dialog!==null)}function P(){let N=a.get();if(N.error||!h){O(!1);return}if(N.ready){if(a.set({phase:"tour"}),R(),n)try{h.setView(n)}catch(G){console.warn("Shared view could not be applied",G)}requestAnimationFrame(()=>c.focus({preventScroll:!0}))}}function O(N){p(!1),x(),S||(S=_u(T,!0),Vt.insertBefore(S.el,St)),a.set({phase:"fallback"}),S.show(a.get().room),N&&T.announce(a.get().error||bu),requestAnimationFrame(()=>Vt.focus({preventScroll:!0}))}let V=t.rooms.find(N=>N.id===t.start)||t.rooms[0],q=t.photoUrl(V.image),F=i.querySelector("[data-boot]"),z=F?/url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(F).backgroundImage)?.[1]:null,U=wp(T,z||q,q,n,P),Y=Mp(T),j=rp(T),ht=op(T),ct=dp(T),yt=up(T),[xt,Kt,kt,Q,mt]=fp(T),ut=I("p",{class:"foot"},I("span",null,"Photo-based reconstruction \xB7 Estimated dimensions \xB7 Simulated light"),I("button",{type:"button",onclick:()=>E("about")},"About this view",Ht("info"))),Ft=I("div",{class:"hud"},j,ct.card,ct.button,ht,I("div",{class:"br"},mt,xt,yt.chip),ut),Mt=I("div",{class:"panels"},yt.panel,mp(T),pp(T),Sp(T));w=_u(T,!1),M.photos=I("dialog",{class:"dlg d-photos","aria-labelledby":"ph-title"},w.el),M.about=I("dialog",{class:"dlg d-about","aria-labelledby":"a-title"},sp(T));for(let N of Object.values(M))N.addEventListener("cancel",G=>{G.preventDefault(),x()}),N.addEventListener("close",()=>{a.get().dialog&&!Object.values(M).some(G=>G.open)&&a.set({dialog:null})}),N.addEventListener("keydown",G=>{ep(G,N),G.key!=="Escape"&&G.stopPropagation()}),N.addEventListener("click",G=>{G.target===N&&x()});let St=I("p",{class:"foot is-page"},I("span",null,"Photo-based reconstruction \xB7 Estimated dimensions"),I("button",{type:"button",onclick:()=>E("about")},"About this view",Ht("info"))),te=I("p",{class:"fbn"},Ht("info"),I("span")),Vt=I("main",{class:"fb",tabindex:"-1","aria-labelledby":"fb-title"},te,St);l.append(c,I("div",{class:"shade","aria-hidden":"true"}),Kt,kt,Q,Ft,Vt,U,Y,Mt,d.el,g,M.photos,M.about),i.replaceChildren(l);let rt=0;if(a.on((N,G)=>{G.has("phase")&&(l.dataset.phase=N.phase,Ft.inert=N.phase!=="tour",Vt.inert=N.phase!=="fallback",R()),G.has("mode")&&(l.dataset.mode=N.mode),G.has("input")&&(l.dataset.input=N.input),G.has("panel")&&(l.dataset.panel=N.panel||"",l.querySelectorAll("[data-panel]").forEach(at=>at.setAttribute("aria-expanded",at.dataset.panel===N.panel?"true":"false"))),G.has("dockOpen")&&(l.dataset.dock=N.dockOpen?"open":"folded"),G.has("tour")&&l.classList.toggle("is-touring",N.tour.playing),G.has("dialog")&&R(),G.has("error")&&N.error&&(te.lastElementChild.textContent=N.error),G.has("room")&&N.phase==="tour"&&N.mode==="walk"&&t.rooms.some(at=>at.id===N.room)&&(clearTimeout(rt),rt=window.setTimeout(()=>T.announce(y(a.get().room)),700))}),window.addEventListener("pointerdown",N=>{let G=N.pointerType==="mouse"?"mouse":"touch";a.get().input!==G&&a.set({input:G})},!0),document.addEventListener("pointerdown",N=>{let G=a.get().panel;if(!G)return;let at=f[G],Z=N.target;at.el.contains(Z)||Z.closest?.(`[data-panel="${G}"]`)||at.keepOnScene&&c.contains(Z)||p(!1)},!0),document.addEventListener("keydown",N=>{let G=a.get();if(N.key==="Escape"){if(G.dialog){N.preventDefault(),N.stopPropagation(),x();return}if(G.panel){N.preventDefault(),N.stopPropagation(),p();return}if(document.pointerLockElement||document.fullscreenElement)return;r&&(N.preventDefault(),T.requestClose());return}(N.key==="ArrowLeft"||N.key==="ArrowRight")&&!mc(N.target)&&(G.dialog==="photos"||G.phase==="fallback")&&(N.preventDefault(),N.stopImmediatePropagation(),(G.dialog==="photos"?w:S)?.step(N.key==="ArrowLeft"?-1:1))},!0),document.addEventListener("pointerlockchange",()=>a.set({pointerLock:!!document.pointerLockElement})),document.addEventListener("fullscreenchange",()=>a.set({fullscreen:!!document.fullscreenElement})),!Qy())a.set({error:jy});else{try{let N=e(c,t,b);if(a.get().error)try{N.dispose()}catch{}else h=N}catch(N){v(N instanceof Error?N.message:String(N),bu)}h&&a.get().ready&&R()}}var Go=new L;function Un(i,t,e,n,s,r){let o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;Go.copy(t),Go[n]=0,Go.normalize();let c=.5*o/(o+a),h=1-Go.angleTo(i)/l;return Math.sign(Go[e])===1?h*c:a/(o+a)+c+c*(1-h)}var Tp=class i extends oi{constructor(t=1,e=1,n=1,s=2,r=.1){let o=s*2+1;if(r=Math.min(t/2,e/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:t,height:e,depth:n,segments:s,radius:r},o===1)return;let a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;let l=new L,c=new L,h=new L(t,e,n).divideScalar(2).subScalar(r),f=this.attributes.position.array,u=this.attributes.normal.array,d=this.attributes.uv.array,g=f.length/6,y=new L,m=.5/o;for(let p=0,M=0;p<f.length;p+=3,M+=2)switch(l.fromArray(f,p),c.copy(l),c.x-=Math.sign(c.x)*m,c.y-=Math.sign(c.y)*m,c.z-=Math.sign(c.z)*m,c.normalize(),f[p+0]=h.x*Math.sign(l.x)+c.x*r,f[p+1]=h.y*Math.sign(l.y)+c.y*r,f[p+2]=h.z*Math.sign(l.z)+c.z*r,u[p+0]=c.x,u[p+1]=c.y,u[p+2]=c.z,Math.floor(p/g)){case 0:y.set(1,0,0),d[M+0]=Un(y,c,"z","y",r,n),d[M+1]=1-Un(y,c,"y","z",r,e);break;case 1:y.set(-1,0,0),d[M+0]=1-Un(y,c,"z","y",r,n),d[M+1]=1-Un(y,c,"y","z",r,e);break;case 2:y.set(0,1,0),d[M+0]=1-Un(y,c,"x","z",r,t),d[M+1]=Un(y,c,"z","x",r,n);break;case 3:y.set(0,-1,0),d[M+0]=1-Un(y,c,"x","z",r,t),d[M+1]=1-Un(y,c,"z","x",r,n);break;case 4:y.set(0,0,1),d[M+0]=1-Un(y,c,"x","y",r,t),d[M+1]=1-Un(y,c,"y","x",r,e);break;case 5:y.set(0,0,-1),d[M+0]=Un(y,c,"x","y",r,t),d[M+1]=1-Un(y,c,"y","x",r,e);break}}static fromJSON(t){return new i(t.width,t.height,t.depth,t.segments,t.radius)}};export{ai as a,ii as b,wi as c,en as d,ft as e,L as f,yi as g,Bt as h,Xr as i,be as j,Jc as k,oi as l,jc as m,Da as n,Ba as o,nh as p,ih as q,cs as r,sh as s,rh as t,oh as u,Si as v,ah as w,lh as x,Tp as y,dw as z,CT as A};
