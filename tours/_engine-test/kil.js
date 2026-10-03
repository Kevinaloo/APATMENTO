var Pi={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Ii={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Qh=0,Cc=1,eu=2;var ts=1,tu=2,Vs=3,mi=0,en=1,pn=2,Vt=0,Yi=1,Rc=2,Pc=3,Ic=4,Aa=5;var yn=100,nu=101,iu=102,su=103,ru=104,ns=200,ou=201,au=202,lu=203,Xo=204,qo=205,Yr=206,cu=207,Zr=208,hu=209,uu=210,du=211,fu=212,pu=213,mu=214,Yo=0,Zo=1,Jo=2,Zi=3,$o=4,Ko=5,jo=6,Qo=7,Ca=0,gu=1,xu=2,Wn=0,Jr=1,Dc=2,Lc=3,is=4,Nc=5,$r=6,Kr=7;var Uc=300,Di=301,ss=302,Ra=303,Pa=304,jr=306,An=1e3,ei=1001,ea=1002,It=1003,_u=1004;var Qr=1005;var Kt=1006,Ia=1007;var Li=1008;var $t=1009,Fc=1010,Oc=1011,Gs=1012,Da=1013,Xn=1014,Dn=1015,Gt=1016,La=1017,Na=1018,Ni=1020,Bc=35902,kc=35899,zc=1021,Vc=1022,mn=1023,ti=1026,ii=1027,Ua=1028,Fa=1029,Ui=1030,Oa=1031;var Ba=1033,eo=33776,to=33777,no=33778,io=33779,ka=35840,za=35841,Va=35842,Ga=35843,Ha=36196,Wa=37492,Xa=37496,qa=37488,Ya=37489,so=37490,Za=37491,Ja=37808,$a=37809,Ka=37810,ja=37811,Qa=37812,el=37813,tl=37814,nl=37815,il=37816,sl=37817,rl=37818,ol=37819,al=37820,ll=37821,cl=36492,hl=36494,ul=36495,dl=36283,fl=36284,ro=36285,pl=36286;var Mr=2300,ta=2301,Wo=2302,xc=2303,_c=2400,vc=2401,yc=2402;var vu=3200;var Hs=0,yu=1,qn="",Rt="srgb",br="srgb-linear",Sr="linear",pt="srgb";var Xi=7680;var Mc=519,Mu=512,bu=513,Su=514,ml=515,Tu=516,wu=517,gl=518,Eu=519,bc=35044;var Gc="300 es",zn=2e3,Rs=2001;function tf(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function nf(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Tr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Au(){let i=Tr("canvas");return i.style.display="block",i}var wh={},Ps=null;function Hc(...i){let e="THREE."+i.shift();Ps?Ps("log",e,...i):console.log(e,...i)}function Cu(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function We(...i){i=Cu(i);let e="THREE."+i.shift();if(Ps)Ps("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Xe(...i){i=Cu(i);let e="THREE."+i.shift();if(Ps)Ps("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function qi(...i){let e=i.join(" ");e in wh||(wh[e]=!0,We(...i))}function Ru(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var Pu={[Yo]:Zo,[Jo]:jo,[$o]:Qo,[Zi]:Ko,[Zo]:Yo,[jo]:Jo,[Qo]:$o,[Ko]:Zi},Vn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}},sn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Eh=1234567,xr=Math.PI/180,Is=180/Math.PI;function Ws(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(sn[i&255]+sn[i>>8&255]+sn[i>>16&255]+sn[i>>24&255]+"-"+sn[e&255]+sn[e>>8&255]+"-"+sn[e>>16&15|64]+sn[e>>24&255]+"-"+sn[t&63|128]+sn[t>>8&255]+"-"+sn[t>>16&255]+sn[t>>24&255]+sn[n&255]+sn[n>>8&255]+sn[n>>16&255]+sn[n>>24&255]).toLowerCase()}function it(i,e,t){return Math.max(e,Math.min(t,i))}function Wc(i,e){return(i%e+e)%e}function sf(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function rf(i,e,t){return i!==e?(t-i)/(e-i):0}function _r(i,e,t){return(1-t)*i+t*e}function of(i,e,t,n){return _r(i,e,1-Math.exp(-t*n))}function af(i,e=1){return e-Math.abs(Wc(i,e*2)-e)}function lf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function cf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function hf(i,e){return i+Math.floor(Math.random()*(e-i+1))}function uf(i,e){return i+Math.random()*(e-i)}function df(i){return i*(.5-Math.random())}function ff(i){i!==void 0&&(Eh=i);let e=Eh+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function pf(i){return i*xr}function mf(i){return i*Is}function gf(i){return(i&i-1)===0&&i!==0}function xf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function _f(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function vf(i,e,t,n,s){let r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),u=o((e+n)/2),f=r((e-n)/2),h=o((e-n)/2),d=r((n-e)/2),g=o((n-e)/2);switch(s){case"XYX":i.set(a*u,l*f,l*h,a*c);break;case"YZY":i.set(l*h,a*u,l*f,a*c);break;case"ZXZ":i.set(l*f,l*h,a*u,a*c);break;case"XZX":i.set(a*u,l*g,l*d,a*c);break;case"YXY":i.set(l*d,a*u,l*g,a*c);break;case"ZYZ":i.set(l*g,l*d,a*u,a*c);break;default:We("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function As(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function cn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Xc={DEG2RAD:xr,RAD2DEG:Is,generateUUID:Ws,clamp:it,euclideanModulo:Wc,mapLinear:sf,inverseLerp:rf,lerp:_r,damp:of,pingpong:af,smoothstep:lf,smootherstep:cf,randInt:hf,randFloat:uf,randFloatSpread:df,seededRandom:ff,degToRad:pf,radToDeg:mf,isPowerOfTwo:gf,ceilPowerOfTwo:xf,floorPowerOfTwo:_f,setQuaternionFromProperEuler:vf,normalize:cn,denormalize:As},be=class i{static{i.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=it(this.x,e.x,t.x),this.y=it(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=it(this.x,e,t),this.y=it(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(it(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(it(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},jt=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],u=n[s+2],f=n[s+3],h=r[o+0],d=r[o+1],g=r[o+2],_=r[o+3];if(f!==_||l!==h||c!==d||u!==g){let p=l*h+c*d+u*g+f*_;p<0&&(h=-h,d=-d,g=-g,_=-_,p=-p);let m=1-a;if(p<.9995){let E=Math.acos(p),C=Math.sin(E);m=Math.sin(m*E)/C,a=Math.sin(a*E)/C,l=l*m+h*a,c=c*m+d*a,u=u*m+g*a,f=f*m+_*a}else{l=l*m+h*a,c=c*m+d*a,u=u*m+g*a,f=f*m+_*a;let E=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=E,c*=E,u*=E,f*=E}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],u=n[s+3],f=r[o],h=r[o+1],d=r[o+2],g=r[o+3];return e[t]=a*g+u*f+l*d-c*h,e[t+1]=l*g+u*h+c*f-a*d,e[t+2]=c*g+u*d+a*h-l*f,e[t+3]=u*g-a*f-l*h-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),u=a(s/2),f=a(r/2),h=l(n/2),d=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=h*u*f+c*d*g,this._y=c*d*f-h*u*g,this._z=c*u*g+h*d*f,this._w=c*u*f-h*d*g;break;case"YXZ":this._x=h*u*f+c*d*g,this._y=c*d*f-h*u*g,this._z=c*u*g-h*d*f,this._w=c*u*f+h*d*g;break;case"ZXY":this._x=h*u*f-c*d*g,this._y=c*d*f+h*u*g,this._z=c*u*g+h*d*f,this._w=c*u*f-h*d*g;break;case"ZYX":this._x=h*u*f-c*d*g,this._y=c*d*f+h*u*g,this._z=c*u*g-h*d*f,this._w=c*u*f+h*d*g;break;case"YZX":this._x=h*u*f+c*d*g,this._y=c*d*f+h*u*g,this._z=c*u*g-h*d*f,this._w=c*u*f-h*d*g;break;case"XZY":this._x=h*u*f-c*d*g,this._y=c*d*f-h*u*g,this._z=c*u*g+h*d*f,this._w=c*u*f+h*d*g;break;default:We("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],f=t[10],h=n+a+f;if(h>0){let d=.5/Math.sqrt(h+1);this._w=.25/d,this._x=(u-l)*d,this._y=(r-c)*d,this._z=(o-s)*d}else if(n>a&&n>f){let d=2*Math.sqrt(1+n-a-f);this._w=(u-l)/d,this._x=.25*d,this._y=(s+o)/d,this._z=(r+c)/d}else if(a>f){let d=2*Math.sqrt(1+a-n-f);this._w=(r-c)/d,this._x=(s+o)/d,this._y=.25*d,this._z=(l+u)/d}else{let d=2*Math.sqrt(1+f-n-a);this._w=(o-s)/d,this._x=(r+c)/d,this._y=(l+u)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(it(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+o*a+s*c-r*l,this._y=s*u+o*l+r*a-n*c,this._z=r*u+o*c+n*l-s*a,this._w=o*u-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){let c=Math.acos(a),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},N=class i{static{i.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ah.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ah.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),u=2*(a*t-r*s),f=2*(r*n-o*t);return this.x=t+l*c+o*f-a*u,this.y=n+l*u+a*c-r*f,this.z=s+l*f+r*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=it(this.x,e.x,t.x),this.y=it(this.y,e.y,t.y),this.z=it(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=it(this.x,e,t),this.y=it(this.y,e,t),this.z=it(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(it(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return ql.copy(this).projectOnVector(e),this.sub(ql)}reflect(e){return this.sub(ql.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(it(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},ql=new N,Ah=new jt,Ze=class i{static{i.prototype.isMatrix3=!0}constructor(e,t,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){let u=this.elements;return u[0]=e,u[1]=s,u[2]=a,u[3]=t,u[4]=r,u[5]=l,u[6]=n,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],u=n[4],f=n[7],h=n[2],d=n[5],g=n[8],_=s[0],p=s[3],m=s[6],E=s[1],C=s[4],v=s[7],b=s[2],S=s[5],A=s[8];return r[0]=o*_+a*E+l*b,r[3]=o*p+a*C+l*S,r[6]=o*m+a*v+l*A,r[1]=c*_+u*E+f*b,r[4]=c*p+u*C+f*S,r[7]=c*m+u*v+f*A,r[2]=h*_+d*E+g*b,r[5]=h*p+d*C+g*S,r[8]=h*m+d*v+g*A,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-n*r*u+n*a*l+s*r*c-s*o*l}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=u*o-a*c,h=a*l-u*r,d=c*r-o*l,g=t*f+n*h+s*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/g;return e[0]=f*_,e[1]=(s*c-u*n)*_,e[2]=(a*n-s*o)*_,e[3]=h*_,e[4]=(u*t-s*l)*_,e[5]=(s*r-a*t)*_,e[6]=d*_,e[7]=(n*l-c*t)*_,e[8]=(o*t-n*r)*_,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return qi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Yl.makeScale(e,t)),this}rotate(e){return qi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Yl.makeRotation(-e)),this}translate(e,t){return qi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Yl.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Yl=new Ze,Ch=new Ze().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Rh=new Ze().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function yf(){let i={enabled:!0,workingColorSpace:br,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===pt&&(s.r=pi(s.r),s.g=pi(s.g),s.b=pi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===pt&&(s.r=Cs(s.r),s.g=Cs(s.g),s.b=Cs(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===qn?Sr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return qi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return qi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[br]:{primaries:e,whitePoint:n,transfer:Sr,toXYZ:Ch,fromXYZ:Rh,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Rt},outputColorSpaceConfig:{drawingBufferColorSpace:Rt}},[Rt]:{primaries:e,whitePoint:n,transfer:pt,toXYZ:Ch,fromXYZ:Rh,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Rt}}}),i}var at=yf();function pi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Cs(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var ps,na=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ps===void 0&&(ps=Tr("canvas")),ps.width=e.width,ps.height=e.height;let s=ps.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=ps}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Tr("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=pi(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(pi(t[n]/255)*255):t[n]=pi(t[n]);return{data:t,width:e.width,height:e.height}}else return We("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Mf=0,Ds=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Mf++}),this.uuid=Ws(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Zl(s[o].image)):r.push(Zl(s[o]))}else r=Zl(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function Zl(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?na.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(We("Texture: Unable to serialize Texture."),{})}var bf=0,Jl=new N,Qt=class i extends Vn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=ei,s=ei,r=Kt,o=Li,a=mn,l=$t,c=i.DEFAULT_ANISOTROPY,u=qn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:bf++}),this.uuid=Ws(),this.name="",this.source=new Ds(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new be(0,0),this.repeat=new be(1,1),this.center=new be(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ze,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Jl).x}get height(){return this.source.getSize(Jl).y}get depth(){return this.source.getSize(Jl).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){We(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){We(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Uc)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case An:e.x=e.x-Math.floor(e.x);break;case ei:e.x=e.x<0?0:1;break;case ea:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case An:e.y=e.y-Math.floor(e.y);break;case ei:e.y=e.y<0?0:1;break;case ea:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Qt.DEFAULT_IMAGE=null;Qt.DEFAULT_MAPPING=Uc;Qt.DEFAULT_ANISOTROPY=1;var Mt=class i{static{i.prototype.isVector4=!0}constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,l=e.elements,c=l[0],u=l[4],f=l[8],h=l[1],d=l[5],g=l[9],_=l[2],p=l[6],m=l[10];if(Math.abs(u-h)<.01&&Math.abs(f-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(u+h)<.1&&Math.abs(f+_)<.1&&Math.abs(g+p)<.1&&Math.abs(c+d+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let C=(c+1)/2,v=(d+1)/2,b=(m+1)/2,S=(u+h)/4,A=(f+_)/4,x=(g+p)/4;return C>v&&C>b?C<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(C),s=S/n,r=A/n):v>b?v<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(v),n=S/s,r=x/s):b<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(b),n=A/r,s=x/r),this.set(n,s,r,t),this}let E=Math.sqrt((p-g)*(p-g)+(f-_)*(f-_)+(h-u)*(h-u));return Math.abs(E)<.001&&(E=1),this.x=(p-g)/E,this.y=(f-_)/E,this.z=(h-u)/E,this.w=Math.acos((c+d+m-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=it(this.x,e.x,t.x),this.y=it(this.y,e.y,t.y),this.z=it(this.z,e.z,t.z),this.w=it(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=it(this.x,e,t),this.y=it(this.y,e,t),this.z=it(this.z,e,t),this.w=it(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(it(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},ia=class extends Vn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Kt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Mt(0,0,e,t),this.scissorTest=!1,this.viewport=new Mt(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:n.depth},r=new Qt(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:Kt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new Ds(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Et=class extends ia{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},wr=class extends Qt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=It,this.minFilter=It,this.wrapR=ei,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var sa=class extends Qt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=It,this.minFilter=It,this.wrapR=ei,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var $e=class i{static{i.prototype.isMatrix4=!0}constructor(e,t,n,s,r,o,a,l,c,u,f,h,d,g,_,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,u,f,h,d,g,_,p)}set(e,t,n,s,r,o,a,l,c,u,f,h,d,g,_,p){let m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=u,m[10]=f,m[14]=h,m[3]=d,m[7]=g,m[11]=_,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,s=1/ms.setFromMatrixColumn(e,0).length(),r=1/ms.setFromMatrixColumn(e,1).length(),o=1/ms.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){let h=o*u,d=o*f,g=a*u,_=a*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=d+g*c,t[5]=h-_*c,t[9]=-a*l,t[2]=_-h*c,t[6]=g+d*c,t[10]=o*l}else if(e.order==="YXZ"){let h=l*u,d=l*f,g=c*u,_=c*f;t[0]=h+_*a,t[4]=g*a-d,t[8]=o*c,t[1]=o*f,t[5]=o*u,t[9]=-a,t[2]=d*a-g,t[6]=_+h*a,t[10]=o*l}else if(e.order==="ZXY"){let h=l*u,d=l*f,g=c*u,_=c*f;t[0]=h-_*a,t[4]=-o*f,t[8]=g+d*a,t[1]=d+g*a,t[5]=o*u,t[9]=_-h*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){let h=o*u,d=o*f,g=a*u,_=a*f;t[0]=l*u,t[4]=g*c-d,t[8]=h*c+_,t[1]=l*f,t[5]=_*c+h,t[9]=d*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){let h=o*l,d=o*c,g=a*l,_=a*c;t[0]=l*u,t[4]=_-h*f,t[8]=g*f+d,t[1]=f,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=d*f+g,t[10]=h-_*f}else if(e.order==="XZY"){let h=o*l,d=o*c,g=a*l,_=a*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=h*f+_,t[5]=o*u,t[9]=d*f-g,t[2]=g*f-d,t[6]=a*u,t[10]=_*f+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Sf,e,Tf)}lookAt(e,t,n){let s=this.elements;return _n.subVectors(e,t),_n.lengthSq()===0&&(_n.z=1),_n.normalize(),vi.crossVectors(n,_n),vi.lengthSq()===0&&(Math.abs(n.z)===1?_n.x+=1e-4:_n.z+=1e-4,_n.normalize(),vi.crossVectors(n,_n)),vi.normalize(),So.crossVectors(_n,vi),s[0]=vi.x,s[4]=So.x,s[8]=_n.x,s[1]=vi.y,s[5]=So.y,s[9]=_n.y,s[2]=vi.z,s[6]=So.z,s[10]=_n.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],u=n[1],f=n[5],h=n[9],d=n[13],g=n[2],_=n[6],p=n[10],m=n[14],E=n[3],C=n[7],v=n[11],b=n[15],S=s[0],A=s[4],x=s[8],M=s[12],I=s[1],T=s[5],D=s[9],B=s[13],G=s[2],z=s[6],H=s[10],P=s[14],U=s[3],q=s[7],ne=s[11],se=s[15];return r[0]=o*S+a*I+l*G+c*U,r[4]=o*A+a*T+l*z+c*q,r[8]=o*x+a*D+l*H+c*ne,r[12]=o*M+a*B+l*P+c*se,r[1]=u*S+f*I+h*G+d*U,r[5]=u*A+f*T+h*z+d*q,r[9]=u*x+f*D+h*H+d*ne,r[13]=u*M+f*B+h*P+d*se,r[2]=g*S+_*I+p*G+m*U,r[6]=g*A+_*T+p*z+m*q,r[10]=g*x+_*D+p*H+m*ne,r[14]=g*M+_*B+p*P+m*se,r[3]=E*S+C*I+v*G+b*U,r[7]=E*A+C*T+v*z+b*q,r[11]=E*x+C*D+v*H+b*ne,r[15]=E*M+C*B+v*P+b*se,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],f=e[6],h=e[10],d=e[14],g=e[3],_=e[7],p=e[11],m=e[15],E=l*d-c*h,C=a*d-c*f,v=a*h-l*f,b=o*d-c*u,S=o*h-l*u,A=o*f-a*u;return t*(_*E-p*C+m*v)-n*(g*E-p*b+m*S)+s*(g*C-_*b+m*A)-r*(g*v-_*S+p*A)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],o=e[5],a=e[9],l=e[2],c=e[6],u=e[10];return t*(o*u-a*c)-n*(r*u-a*l)+s*(r*c-o*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=e[9],h=e[10],d=e[11],g=e[12],_=e[13],p=e[14],m=e[15],E=t*a-n*o,C=t*l-s*o,v=t*c-r*o,b=n*l-s*a,S=n*c-r*a,A=s*c-r*l,x=u*_-f*g,M=u*p-h*g,I=u*m-d*g,T=f*p-h*_,D=f*m-d*_,B=h*m-d*p,G=E*B-C*D+v*T+b*I-S*M+A*x;if(G===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let z=1/G;return e[0]=(a*B-l*D+c*T)*z,e[1]=(s*D-n*B-r*T)*z,e[2]=(_*A-p*S+m*b)*z,e[3]=(h*S-f*A-d*b)*z,e[4]=(l*I-o*B-c*M)*z,e[5]=(t*B-s*I+r*M)*z,e[6]=(p*v-g*A-m*C)*z,e[7]=(u*A-h*v+d*C)*z,e[8]=(o*D-a*I+c*x)*z,e[9]=(n*I-t*D-r*x)*z,e[10]=(g*S-_*v+m*E)*z,e[11]=(f*v-u*S-d*E)*z,e[12]=(a*M-o*T-l*x)*z,e[13]=(t*T-n*M+s*x)*z,e[14]=(_*C-g*b-p*E)*z,e[15]=(u*b-f*C+h*E)*z,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,u=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,u*a+n,u*l-s*o,0,c*l-s*a,u*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,u=o+o,f=a+a,h=r*c,d=r*u,g=r*f,_=o*u,p=o*f,m=a*f,E=l*c,C=l*u,v=l*f,b=n.x,S=n.y,A=n.z;return s[0]=(1-(_+m))*b,s[1]=(d+v)*b,s[2]=(g-C)*b,s[3]=0,s[4]=(d-v)*S,s[5]=(1-(h+m))*S,s[6]=(p+E)*S,s[7]=0,s[8]=(g+C)*A,s[9]=(p-E)*A,s[10]=(1-(h+_))*A,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let o=ms.set(s[0],s[1],s[2]).length(),a=ms.set(s[4],s[5],s[6]).length(),l=ms.set(s[8],s[9],s[10]).length();r<0&&(o=-o),On.copy(this);let c=1/o,u=1/a,f=1/l;return On.elements[0]*=c,On.elements[1]*=c,On.elements[2]*=c,On.elements[4]*=u,On.elements[5]*=u,On.elements[6]*=u,On.elements[8]*=f,On.elements[9]*=f,On.elements[10]*=f,t.setFromRotationMatrix(On),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,s,r,o,a=zn,l=!1){let c=this.elements,u=2*r/(t-e),f=2*r/(n-s),h=(t+e)/(t-e),d=(n+s)/(n-s),g,_;if(l)g=r/(o-r),_=o*r/(o-r);else if(a===zn)g=-(o+r)/(o-r),_=-2*o*r/(o-r);else if(a===Rs)g=-o/(o-r),_=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=f,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=zn,l=!1){let c=this.elements,u=2/(t-e),f=2/(n-s),h=-(t+e)/(t-e),d=-(n+s)/(n-s),g,_;if(l)g=1/(o-r),_=o/(o-r);else if(a===zn)g=-2/(o-r),_=-(o+r)/(o-r);else if(a===Rs)g=-1/(o-r),_=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=h,c[1]=0,c[5]=f,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},ms=new N,On=new $e,Sf=new N(0,0,0),Tf=new N(1,1,1),vi=new N,So=new N,_n=new N,Ph=new $e,Ih=new jt,Cn=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],u=s[9],f=s[2],h=s[6],d=s[10];switch(t){case"XYZ":this._y=Math.asin(it(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,d),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-it(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(it(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-it(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(h,d),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(it(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-it(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-u,d),this._y=0);break;default:We("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Ph.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ph,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ih.setFromEuler(this),this.setFromQuaternion(Ih,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Cn.DEFAULT_ORDER="XYZ";var Ls=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},wf=0,Dh=new N,gs=new jt,ci=new $e,To=new N,ur=new N,Ef=new N,Af=new jt,Lh=new N(1,0,0),Nh=new N(0,1,0),Uh=new N(0,0,1),Fh={type:"added"},Cf={type:"removed"},xs={type:"childadded",child:null},$l={type:"childremoved",child:null},Zt=class i extends Vn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:wf++}),this.uuid=Ws(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new N,t=new Cn,n=new jt,s=new N(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new $e},normalMatrix:{value:new Ze}}),this.matrix=new $e,this.matrixWorld=new $e,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ls,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return gs.setFromAxisAngle(e,t),this.quaternion.multiply(gs),this}rotateOnWorldAxis(e,t){return gs.setFromAxisAngle(e,t),this.quaternion.premultiply(gs),this}rotateX(e){return this.rotateOnAxis(Lh,e)}rotateY(e){return this.rotateOnAxis(Nh,e)}rotateZ(e){return this.rotateOnAxis(Uh,e)}translateOnAxis(e,t){return Dh.copy(e).applyQuaternion(this.quaternion),this.position.add(Dh.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Lh,e)}translateY(e){return this.translateOnAxis(Nh,e)}translateZ(e){return this.translateOnAxis(Uh,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ci.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?To.copy(e):To.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),ur.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ci.lookAt(ur,To,this.up):ci.lookAt(To,ur,this.up),this.quaternion.setFromRotationMatrix(ci),s&&(ci.extractRotation(s.matrixWorld),gs.setFromRotationMatrix(ci),this.quaternion.premultiply(gs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Xe("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Fh),xs.child=e,this.dispatchEvent(xs),xs.child=null):Xe("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Cf),$l.child=e,this.dispatchEvent($l),$l.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ci.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ci.multiply(e.parent.matrixWorld)),e.applyMatrix4(ci),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Fh),xs.child=e,this.dispatchEvent(xs),xs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ur,e,Ef),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ur,Af,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){let a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),f=o(e.shapes),h=o(e.skeletons),d=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),f.length>0&&(n.shapes=f),h.length>0&&(n.skeletons=h),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){let l=[];for(let c in a){let u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};Zt.DEFAULT_UP=new N(0,1,0);Zt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Zt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Pt=class extends Zt{constructor(){super(),this.isGroup=!0,this.type="Group"}},Rf={type:"move"},Ns=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Pt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Pt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new N,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new N),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Pt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new N,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new N,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(let _ of e.hand.values()){let p=t.getJointPose(_,n),m=this._getHandJoint(c,_);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],h=u.position.distanceTo(f.position),d=.02,g=.005;c.inputState.pinching&&h>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Rf)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Pt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Iu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},yi={h:0,s:0,l:0},wo={h:0,s:0,l:0};function Kl(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var Ee=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Rt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,at.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=at.workingColorSpace){return this.r=e,this.g=t,this.b=n,at.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=at.workingColorSpace){if(e=Wc(e,1),t=it(t,0,1),n=it(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Kl(o,r,e+1/3),this.g=Kl(o,r,e),this.b=Kl(o,r,e-1/3)}return at.colorSpaceToWorking(this,s),this}setStyle(e,t=Rt){function n(r){r!==void 0&&parseFloat(r)<1&&We("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:We("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);We("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Rt){let n=Iu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):We("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=pi(e.r),this.g=pi(e.g),this.b=pi(e.b),this}copyLinearToSRGB(e){return this.r=Cs(e.r),this.g=Cs(e.g),this.b=Cs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Rt){return at.workingToColorSpace(rn.copy(this),e),Math.round(it(rn.r*255,0,255))*65536+Math.round(it(rn.g*255,0,255))*256+Math.round(it(rn.b*255,0,255))}getHexString(e=Rt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=at.workingColorSpace){at.workingToColorSpace(rn.copy(this),t);let n=rn.r,s=rn.g,r=rn.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,u=(a+o)/2;if(a===o)l=0,c=0;else{let f=o-a;switch(c=u<=.5?f/(o+a):f/(2-o-a),o){case n:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-n)/f+2;break;case r:l=(n-s)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=at.workingColorSpace){return at.workingToColorSpace(rn.copy(this),t),e.r=rn.r,e.g=rn.g,e.b=rn.b,e}getStyle(e=Rt){at.workingToColorSpace(rn.copy(this),e);let t=rn.r,n=rn.g,s=rn.b;return e!==Rt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(yi),this.setHSL(yi.h+e,yi.s+t,yi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(yi),e.getHSL(wo);let n=_r(yi.h,wo.h,t),s=_r(yi.s,wo.s,t),r=_r(yi.l,wo.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},rn=new Ee;Ee.NAMES=Iu;var Ji=class extends Zt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Cn,this.environmentIntensity=1,this.environmentRotation=new Cn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Bn=new N,hi=new N,jl=new N,ui=new N,_s=new N,vs=new N,Oh=new N,Ql=new N,ec=new N,tc=new N,nc=new Mt,ic=new Mt,sc=new Mt,wi=class i{constructor(e=new N,t=new N,n=new N){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),Bn.subVectors(e,t),s.cross(Bn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){Bn.subVectors(s,t),hi.subVectors(n,t),jl.subVectors(e,t);let o=Bn.dot(Bn),a=Bn.dot(hi),l=Bn.dot(jl),c=hi.dot(hi),u=hi.dot(jl),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;let h=1/f,d=(c*l-a*u)*h,g=(o*u-a*l)*h;return r.set(1-d-g,g,d)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,ui)===null?!1:ui.x>=0&&ui.y>=0&&ui.x+ui.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,ui)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ui.x),l.addScaledVector(o,ui.y),l.addScaledVector(a,ui.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return nc.setScalar(0),ic.setScalar(0),sc.setScalar(0),nc.fromBufferAttribute(e,t),ic.fromBufferAttribute(e,n),sc.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(nc,r.x),o.addScaledVector(ic,r.y),o.addScaledVector(sc,r.z),o}static isFrontFacing(e,t,n,s){return Bn.subVectors(n,t),hi.subVectors(e,t),Bn.cross(hi).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Bn.subVectors(this.c,this.b),hi.subVectors(this.a,this.b),Bn.cross(hi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,o,a;_s.subVectors(s,n),vs.subVectors(r,n),Ql.subVectors(e,n);let l=_s.dot(Ql),c=vs.dot(Ql);if(l<=0&&c<=0)return t.copy(n);ec.subVectors(e,s);let u=_s.dot(ec),f=vs.dot(ec);if(u>=0&&f<=u)return t.copy(s);let h=l*f-u*c;if(h<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(n).addScaledVector(_s,o);tc.subVectors(e,r);let d=_s.dot(tc),g=vs.dot(tc);if(g>=0&&d<=g)return t.copy(r);let _=d*c-l*g;if(_<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(vs,a);let p=u*g-d*f;if(p<=0&&f-u>=0&&d-g>=0)return Oh.subVectors(r,s),a=(f-u)/(f-u+(d-g)),t.copy(s).addScaledVector(Oh,a);let m=1/(p+_+h);return o=_*m,a=h*m,t.copy(n).addScaledVector(_s,o).addScaledVector(vs,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},hn=class{constructor(e=new N(1/0,1/0,1/0),t=new N(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(kn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(kn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=kn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,kn):kn.fromBufferAttribute(r,o),kn.applyMatrix4(e.matrixWorld),this.expandByPoint(kn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Eo.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Eo.copy(n.boundingBox)),Eo.applyMatrix4(e.matrixWorld),this.union(Eo)}let s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,kn),kn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(dr),Ao.subVectors(this.max,dr),ys.subVectors(e.a,dr),Ms.subVectors(e.b,dr),bs.subVectors(e.c,dr),Mi.subVectors(Ms,ys),bi.subVectors(bs,Ms),Vi.subVectors(ys,bs);let t=[0,-Mi.z,Mi.y,0,-bi.z,bi.y,0,-Vi.z,Vi.y,Mi.z,0,-Mi.x,bi.z,0,-bi.x,Vi.z,0,-Vi.x,-Mi.y,Mi.x,0,-bi.y,bi.x,0,-Vi.y,Vi.x,0];return!rc(t,ys,Ms,bs,Ao)||(t=[1,0,0,0,1,0,0,0,1],!rc(t,ys,Ms,bs,Ao))?!1:(Co.crossVectors(Mi,bi),t=[Co.x,Co.y,Co.z],rc(t,ys,Ms,bs,Ao))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,kn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(kn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(di[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),di[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),di[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),di[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),di[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),di[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),di[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),di[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(di),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},di=[new N,new N,new N,new N,new N,new N,new N,new N],kn=new N,Eo=new hn,ys=new N,Ms=new N,bs=new N,Mi=new N,bi=new N,Vi=new N,dr=new N,Ao=new N,Co=new N,Gi=new N;function rc(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Gi.fromArray(i,r);let a=s.x*Math.abs(Gi.x)+s.y*Math.abs(Gi.y)+s.z*Math.abs(Gi.z),l=e.dot(Gi),c=t.dot(Gi),u=n.dot(Gi);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}var Ft=new N,Ro=new be,Pf=0,Ot=class extends Vn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Pf++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=bc,this.updateRanges=[],this.gpuType=Dn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Ro.fromBufferAttribute(this,t),Ro.applyMatrix3(e),this.setXY(t,Ro.x,Ro.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.applyMatrix3(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.applyMatrix4(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.applyNormalMatrix(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.transformDirection(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=As(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=cn(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=As(t,this.array)),t}setX(e,t){return this.normalized&&(t=cn(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=As(t,this.array)),t}setY(e,t){return this.normalized&&(t=cn(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=As(t,this.array)),t}setZ(e,t){return this.normalized&&(t=cn(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=As(t,this.array)),t}setW(e,t){return this.normalized&&(t=cn(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=cn(t,this.array),n=cn(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=cn(t,this.array),n=cn(n,this.array),s=cn(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=cn(t,this.array),n=cn(n,this.array),s=cn(s,this.array),r=cn(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==bc&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};var Er=class extends Ot{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Ar=class extends Ot{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var ut=class extends Ot{constructor(e,t,n){super(new Float32Array(e),t,n)}},If=new hn,fr=new N,oc=new N,Ei=class{constructor(e=new N,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):If.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;fr.subVectors(e,this.center);let t=fr.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(fr,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(oc.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(fr.copy(e.center).add(oc)),this.expandByPoint(fr.copy(e.center).sub(oc))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Df=0,En=new $e,ac=new Zt,Ss=new N,vn=new hn,pr=new hn,Yt=new N,Dt=class i extends Vn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Df++}),this.uuid=Ws(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(tf(e)?Ar:Er)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ze().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return En.makeRotationFromQuaternion(e),this.applyMatrix4(En),this}rotateX(e){return En.makeRotationX(e),this.applyMatrix4(En),this}rotateY(e){return En.makeRotationY(e),this.applyMatrix4(En),this}rotateZ(e){return En.makeRotationZ(e),this.applyMatrix4(En),this}translate(e,t,n){return En.makeTranslation(e,t,n),this.applyMatrix4(En),this}scale(e,t,n){return En.makeScale(e,t,n),this.applyMatrix4(En),this}lookAt(e){return ac.lookAt(e),ac.updateMatrix(),this.applyMatrix4(ac.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ss).negate(),this.translate(Ss.x,Ss.y,Ss.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ut(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&We("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new hn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Xe("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new N(-1/0,-1/0,-1/0),new N(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];vn.setFromBufferAttribute(r),this.morphTargetsRelative?(Yt.addVectors(this.boundingBox.min,vn.min),this.boundingBox.expandByPoint(Yt),Yt.addVectors(this.boundingBox.max,vn.max),this.boundingBox.expandByPoint(Yt)):(this.boundingBox.expandByPoint(vn.min),this.boundingBox.expandByPoint(vn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Xe('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ei);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Xe("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new N,1/0);return}if(e){let n=this.boundingSphere.center;if(vn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];pr.setFromBufferAttribute(a),this.morphTargetsRelative?(Yt.addVectors(vn.min,pr.min),vn.expandByPoint(Yt),Yt.addVectors(vn.max,pr.max),vn.expandByPoint(Yt)):(vn.expandByPoint(pr.min),vn.expandByPoint(pr.max))}vn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Yt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Yt));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Yt.fromBufferAttribute(a,c),l&&(Ss.fromBufferAttribute(e,c),Yt.add(Ss)),s=Math.max(s,n.distanceToSquared(Yt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Xe('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Xe("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new Ot(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let x=0;x<n.count;x++)a[x]=new N,l[x]=new N;let c=new N,u=new N,f=new N,h=new be,d=new be,g=new be,_=new N,p=new N;function m(x,M,I){c.fromBufferAttribute(n,x),u.fromBufferAttribute(n,M),f.fromBufferAttribute(n,I),h.fromBufferAttribute(r,x),d.fromBufferAttribute(r,M),g.fromBufferAttribute(r,I),u.sub(c),f.sub(c),d.sub(h),g.sub(h);let T=1/(d.x*g.y-g.x*d.y);isFinite(T)&&(_.copy(u).multiplyScalar(g.y).addScaledVector(f,-d.y).multiplyScalar(T),p.copy(f).multiplyScalar(d.x).addScaledVector(u,-g.x).multiplyScalar(T),a[x].add(_),a[M].add(_),a[I].add(_),l[x].add(p),l[M].add(p),l[I].add(p))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let x=0,M=E.length;x<M;++x){let I=E[x],T=I.start,D=I.count;for(let B=T,G=T+D;B<G;B+=3)m(e.getX(B+0),e.getX(B+1),e.getX(B+2))}let C=new N,v=new N,b=new N,S=new N;function A(x){b.fromBufferAttribute(s,x),S.copy(b);let M=a[x];C.copy(M),C.sub(b.multiplyScalar(b.dot(M))).normalize(),v.crossVectors(S,M);let T=v.dot(l[x])<0?-1:1;o.setXYZW(x,C.x,C.y,C.z,T)}for(let x=0,M=E.length;x<M;++x){let I=E[x],T=I.start,D=I.count;for(let B=T,G=T+D;B<G;B+=3)A(e.getX(B+0)),A(e.getX(B+1)),A(e.getX(B+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new Ot(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let h=0,d=n.count;h<d;h++)n.setXYZ(h,0,0,0);let s=new N,r=new N,o=new N,a=new N,l=new N,c=new N,u=new N,f=new N;if(e)for(let h=0,d=e.count;h<d;h+=3){let g=e.getX(h+0),_=e.getX(h+1),p=e.getX(h+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,_),o.fromBufferAttribute(t,p),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,p),a.add(u),l.add(u),c.add(u),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let h=0,d=t.count;h<d;h+=3)s.fromBufferAttribute(t,h+0),r.fromBufferAttribute(t,h+1),o.fromBufferAttribute(t,h+2),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),n.setXYZ(h+0,u.x,u.y,u.z),n.setXYZ(h+1,u.x,u.y,u.z),n.setXYZ(h+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Yt.fromBufferAttribute(e,t),Yt.normalize(),e.setXYZ(t,Yt.x,Yt.y,Yt.z)}toNonIndexed(){function e(a,l){let c=a.array,u=a.itemSize,f=a.normalized,h=new c.constructor(l.length*u),d=0,g=0;for(let _=0,p=l.length;_<p;_++){a.isInterleavedBufferAttribute?d=l[_]*a.data.stride+a.offset:d=l[_]*u;for(let m=0;m<u;m++)h[g++]=c[d++]}return new Ot(h,u,f)}if(this.index===null)return We("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=e(l,n);t.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let u=0,f=c.length;u<f;u++){let h=c[u],d=e(h,n);l.push(d)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let f=0,h=c.length;f<h;f++){let d=c[f];u.push(d.toJSON(e.data))}u.length>0&&(s[l]=u,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let c in s){let u=s[c];this.setAttribute(c,u.clone(t))}let r=e.morphAttributes;for(let c in r){let u=[],f=r[c];for(let h=0,d=f.length;h<d;h++)u.push(f[h].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let c=0,u=o.length;c<u;c++){let f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Lf=0,ni=class extends Vn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Lf++}),this.uuid=Ws(),this.name="",this.type="Material",this.blending=Yi,this.side=mi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Xo,this.blendDst=qo,this.blendEquation=yn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ee(0,0,0),this.blendAlpha=0,this.depthFunc=Zi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Mc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Xi,this.stencilZFail=Xi,this.stencilZPass=Xi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){We(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){We(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Yi&&(n.blending=this.blending),this.side!==mi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Xo&&(n.blendSrc=this.blendSrc),this.blendDst!==qo&&(n.blendDst=this.blendDst),this.blendEquation!==yn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Zi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Mc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Xi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Xi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Xi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(t){let r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Ee().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new be().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new be().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var fi=new N,lc=new N,Po=new N,Si=new N,cc=new N,Io=new N,hc=new N,$i=class{constructor(e=new N,t=new N(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,fi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=fi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(fi.copy(this.origin).addScaledVector(this.direction,t),fi.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){lc.copy(e).add(t).multiplyScalar(.5),Po.copy(t).sub(e).normalize(),Si.copy(this.origin).sub(lc);let r=e.distanceTo(t)*.5,o=-this.direction.dot(Po),a=Si.dot(this.direction),l=-Si.dot(Po),c=Si.lengthSq(),u=Math.abs(1-o*o),f,h,d,g;if(u>0)if(f=o*l-a,h=o*a-l,g=r*u,f>=0)if(h>=-g)if(h<=g){let _=1/u;f*=_,h*=_,d=f*(f+o*h+2*a)+h*(o*f+h+2*l)+c}else h=r,f=Math.max(0,-(o*h+a)),d=-f*f+h*(h+2*l)+c;else h=-r,f=Math.max(0,-(o*h+a)),d=-f*f+h*(h+2*l)+c;else h<=-g?(f=Math.max(0,-(-o*r+a)),h=f>0?-r:Math.min(Math.max(-r,-l),r),d=-f*f+h*(h+2*l)+c):h<=g?(f=0,h=Math.min(Math.max(-r,-l),r),d=h*(h+2*l)+c):(f=Math.max(0,-(o*r+a)),h=f>0?r:Math.min(Math.max(-r,-l),r),d=-f*f+h*(h+2*l)+c);else h=o>0?-r:r,f=Math.max(0,-(o*h+a)),d=-f*f+h*(h+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(lc).addScaledVector(Po,h),d}intersectSphere(e,t){fi.subVectors(e.center,this.origin);let n=fi.dot(this.direction),s=fi.dot(fi)-n*n,r=e.radius*e.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l,c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,h=this.origin;return c>=0?(n=(e.min.x-h.x)*c,s=(e.max.x-h.x)*c):(n=(e.max.x-h.x)*c,s=(e.min.x-h.x)*c),u>=0?(r=(e.min.y-h.y)*u,o=(e.max.y-h.y)*u):(r=(e.max.y-h.y)*u,o=(e.min.y-h.y)*u),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),f>=0?(a=(e.min.z-h.z)*f,l=(e.max.z-h.z)*f):(a=(e.max.z-h.z)*f,l=(e.min.z-h.z)*f),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,fi)!==null}intersectTriangle(e,t,n,s,r){cc.subVectors(t,e),Io.subVectors(n,e),hc.crossVectors(cc,Io);let o=this.direction.dot(hc),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Si.subVectors(this.origin,e);let l=a*this.direction.dot(Io.crossVectors(Si,Io));if(l<0)return null;let c=a*this.direction.dot(cc.cross(Si));if(c<0||l+c>o)return null;let u=-a*Si.dot(hc);return u<0?null:this.at(u/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Ki=class extends ni{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ee(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Cn,this.combine=Ca,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Bh=new $e,Hi=new $i,Do=new Ei,kh=new N,Lo=new N,No=new N,Uo=new N,uc=new N,Fo=new N,zh=new N,Oo=new N,st=class extends Zt{constructor(e=new Dt,t=new Ki){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let a=this.morphTargetInfluences;if(r&&a){Fo.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let u=a[l],f=r[l];u!==0&&(uc.fromBufferAttribute(f,e),o?Fo.addScaledVector(uc,u):Fo.addScaledVector(uc.sub(t),u))}t.add(Fo)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Do.copy(n.boundingSphere),Do.applyMatrix4(r),Hi.copy(e.ray).recast(e.near),!(Do.containsPoint(Hi.origin)===!1&&(Hi.intersectSphere(Do,kh)===null||Hi.origin.distanceToSquared(kh)>(e.far-e.near)**2))&&(Bh.copy(r).invert(),Hi.copy(e.ray).applyMatrix4(Bh),!(n.boundingBox!==null&&Hi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Hi)))}_computeIntersections(e,t,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,f=r.attributes.normal,h=r.groups,d=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,_=h.length;g<_;g++){let p=h[g],m=o[p.materialIndex],E=Math.max(p.start,d.start),C=Math.min(a.count,Math.min(p.start+p.count,d.start+d.count));for(let v=E,b=C;v<b;v+=3){let S=a.getX(v),A=a.getX(v+1),x=a.getX(v+2);s=Bo(this,m,e,n,c,u,f,S,A,x),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{let g=Math.max(0,d.start),_=Math.min(a.count,d.start+d.count);for(let p=g,m=_;p<m;p+=3){let E=a.getX(p),C=a.getX(p+1),v=a.getX(p+2);s=Bo(this,o,e,n,c,u,f,E,C,v),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,_=h.length;g<_;g++){let p=h[g],m=o[p.materialIndex],E=Math.max(p.start,d.start),C=Math.min(l.count,Math.min(p.start+p.count,d.start+d.count));for(let v=E,b=C;v<b;v+=3){let S=v,A=v+1,x=v+2;s=Bo(this,m,e,n,c,u,f,S,A,x),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{let g=Math.max(0,d.start),_=Math.min(l.count,d.start+d.count);for(let p=g,m=_;p<m;p+=3){let E=p,C=p+1,v=p+2;s=Bo(this,o,e,n,c,u,f,E,C,v),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}}};function Nf(i,e,t,n,s,r,o,a){let l;if(e.side===en?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===mi,a),l===null)return null;Oo.copy(a),Oo.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Oo);return c<t.near||c>t.far?null:{distance:c,point:Oo.clone(),object:i}}function Bo(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,Lo),i.getVertexPosition(l,No),i.getVertexPosition(c,Uo);let u=Nf(i,e,t,n,Lo,No,Uo,zh);if(u){let f=new N;wi.getBarycoord(zh,Lo,No,Uo,f),s&&(u.uv=wi.getInterpolatedAttribute(s,a,l,c,f,new be)),r&&(u.uv1=wi.getInterpolatedAttribute(r,a,l,c,f,new be)),o&&(u.normal=wi.getInterpolatedAttribute(o,a,l,c,f,new N),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));let h={a,b:l,c,normal:new N,materialIndex:0};wi.getNormal(Lo,No,Uo,h.normal),u.face=h,u.barycoord=f}return u}var Gn=class extends Qt{constructor(e=null,t=1,n=1,s,r,o,a,l,c=It,u=It,f,h){super(null,o,a,l,c,u,s,r,f,h),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Us=class extends Ot{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},Ts=new $e,Vh=new $e,ko=[],Gh=new hn,Uf=new $e,mr=new st,gr=new Ei,Cr=class extends st{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Us(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Uf)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new hn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ts),Gh.copy(e.boundingBox).applyMatrix4(Ts),this.boundingBox.union(Gh)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ei),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ts),gr.copy(e.boundingSphere).applyMatrix4(Ts),this.boundingSphere.union(gr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(e,t){let n=this.matrixWorld,s=this.count;if(mr.geometry=this.geometry,mr.material=this.material,mr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),gr.copy(this.boundingSphere),gr.applyMatrix4(n),e.ray.intersectsSphere(gr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Ts),Vh.multiplyMatrices(n,Ts),mr.matrixWorld=Vh,mr.raycast(e,ko);for(let o=0,a=ko.length;o<a;o++){let l=ko[o];l.instanceId=r,l.object=this,t.push(l)}ko.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new Us(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Gn(new Float32Array(s*this.count),s,this.count,Ua,Dn));let r=this.morphTexture.source.data.data,o=0;for(let c=0;c<n.length;c++)o+=n[c];let a=this.geometry.morphTargetsRelative?1:1-o,l=s*e;return r[l]=a,r.set(n,l+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},dc=new N,Ff=new N,Of=new Ze,on=class{constructor(e=new N(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=dc.subVectors(n,t).cross(Ff.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let s=e.delta(dc),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let o=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(s,o)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Of.getNormalMatrix(e),s=this.coplanarPoint(dc).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Wi=new Ei,Bf=new be(.5,.5),zo=new N,Fs=class{constructor(e=new on,t=new on,n=new on,s=new on,r=new on,o=new on){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=zn,n=!1){let s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],u=r[4],f=r[5],h=r[6],d=r[7],g=r[8],_=r[9],p=r[10],m=r[11],E=r[12],C=r[13],v=r[14],b=r[15];if(s[0].setComponents(c-o,d-u,m-g,b-E).normalize(),s[1].setComponents(c+o,d+u,m+g,b+E).normalize(),s[2].setComponents(c+a,d+f,m+_,b+C).normalize(),s[3].setComponents(c-a,d-f,m-_,b-C).normalize(),n)s[4].setComponents(l,h,p,v).normalize(),s[5].setComponents(c-l,d-h,m-p,b-v).normalize();else if(s[4].setComponents(c-l,d-h,m-p,b-v).normalize(),t===zn)s[5].setComponents(c+l,d+h,m+p,b+v).normalize();else if(t===Rs)s[5].setComponents(l,h,p,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Wi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Wi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Wi)}intersectsSprite(e){Wi.center.set(0,0,0);let t=Bf.distanceTo(e.center);return Wi.radius=.7071067811865476+t,Wi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Wi)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(zo.x=s.normal.x>0?e.max.x:e.min.x,zo.y=s.normal.y>0?e.max.y:e.min.y,zo.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(zo)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Rr=class extends Qt{constructor(e=[],t=Di,n,s,r,o,a,l,c,u){super(e,t,n,s,r,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},ji=class extends Qt{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var Hn=class extends Qt{constructor(e,t,n=Xn,s,r,o,a=It,l=It,c,u=ti,f=1){if(u!==ti&&u!==ii)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let h={width:e,height:t,depth:f};super(h,s,r,o,a,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ds(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},ra=class extends Hn{constructor(e,t=Xn,n=Di,s,r,o=It,a=It,l,c=ti){let u={width:e,height:e,depth:1},f=[u,u,u,u,u,u];super(e,e,t,n,s,r,o,a,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Pr=class extends Qt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Rn=class i extends Dt{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],u=[],f=[],h=0,d=0;g("z","y","x",-1,-1,n,t,e,o,r,0),g("z","y","x",1,-1,n,t,-e,o,r,1),g("x","z","y",1,1,e,n,t,s,o,2),g("x","z","y",1,-1,e,n,-t,s,o,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ut(c,3)),this.setAttribute("normal",new ut(u,3)),this.setAttribute("uv",new ut(f,2));function g(_,p,m,E,C,v,b,S,A,x,M){let I=v/A,T=b/x,D=v/2,B=b/2,G=S/2,z=A+1,H=x+1,P=0,U=0,q=new N;for(let ne=0;ne<H;ne++){let se=ne*T-B;for(let ae=0;ae<z;ae++){let fe=ae*I-D;q[_]=fe*E,q[p]=se*C,q[m]=G,c.push(q.x,q.y,q.z),q[_]=0,q[p]=0,q[m]=S>0?1:-1,u.push(q.x,q.y,q.z),f.push(ae/A),f.push(1-ne/x),P+=1}}for(let ne=0;ne<x;ne++)for(let se=0;se<A;se++){let ae=h+se+z*ne,fe=h+se+z*(ne+1),Ke=h+(se+1)+z*(ne+1),Ue=h+(se+1)+z*ne;l.push(ae,fe,Ue),l.push(fe,Ke,Ue),U+=6}a.addGroup(d,U,M),d+=U,h+=P}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var Ir=class i extends Dt{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);let r=[],o=[],a=[],l=[],c=new N,u=new be;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let f=0,h=3;f<=t;f++,h+=3){let d=n+f/t*s;c.x=e*Math.cos(d),c.y=e*Math.sin(d),o.push(c.x,c.y,c.z),a.push(0,0,1),u.x=(o[h]/e+1)/2,u.y=(o[h+1]/e+1)/2,l.push(u.x,u.y)}for(let f=1;f<=t;f++)r.push(f,f+1,0);this.setIndex(r),this.setAttribute("position",new ut(o,3)),this.setAttribute("normal",new ut(a,3)),this.setAttribute("uv",new ut(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.segments,e.thetaStart,e.thetaLength)}},Dr=class i extends Dt{constructor(e=1,t=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let u=[],f=[],h=[],d=[],g=0,_=[],p=n/2,m=0;E(),o===!1&&(e>0&&C(!0),t>0&&C(!1)),this.setIndex(u),this.setAttribute("position",new ut(f,3)),this.setAttribute("normal",new ut(h,3)),this.setAttribute("uv",new ut(d,2));function E(){let v=new N,b=new N,S=0,A=(t-e)/n;for(let x=0;x<=r;x++){let M=[],I=x/r,T=I*(t-e)+e;for(let D=0;D<=s;D++){let B=D/s,G=B*l+a,z=Math.sin(G),H=Math.cos(G);b.x=T*z,b.y=-I*n+p,b.z=T*H,f.push(b.x,b.y,b.z),v.set(z,A,H).normalize(),h.push(v.x,v.y,v.z),d.push(B,1-I),M.push(g++)}_.push(M)}for(let x=0;x<s;x++)for(let M=0;M<r;M++){let I=_[M][x],T=_[M+1][x],D=_[M+1][x+1],B=_[M][x+1];(e>0||M!==0)&&(u.push(I,T,B),S+=3),(t>0||M!==r-1)&&(u.push(T,D,B),S+=3)}c.addGroup(m,S,0),m+=S}function C(v){let b=g,S=new be,A=new N,x=0,M=v===!0?e:t,I=v===!0?1:-1;for(let D=1;D<=s;D++)f.push(0,p*I,0),h.push(0,I,0),d.push(.5,.5),g++;let T=g;for(let D=0;D<=s;D++){let G=D/s*l+a,z=Math.cos(G),H=Math.sin(G);A.x=M*H,A.y=p*I,A.z=M*z,f.push(A.x,A.y,A.z),h.push(0,I,0),S.x=z*.5+.5,S.y=H*.5*I+.5,d.push(S.x,S.y),g++}for(let D=0;D<s;D++){let B=b+D,G=T+D;v===!0?u.push(G,G+1,B):u.push(G+1,G,B),x+=3}c.addGroup(m,x,v===!0?1:2),m+=x}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Pn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){We("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),s=0,r=n.length,o;t?o=t:o=e*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);let u=n[s],h=n[s+1]-u,d=(o-u)/h;return(s+d)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let o=this.getPoint(s),a=this.getPoint(r),l=t||(o.isVector2?new be:new N);return l.copy(a).sub(o).normalize(),l}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new N,s=[],r=[],o=[],a=new N,l=new $e;for(let d=0;d<=e;d++){let g=d/e;s[d]=this.getTangentAt(g,new N)}r[0]=new N,o[0]=new N;let c=Number.MAX_VALUE,u=Math.abs(s[0].x),f=Math.abs(s[0].y),h=Math.abs(s[0].z);u<=c&&(c=u,n.set(1,0,0)),f<=c&&(c=f,n.set(0,1,0)),h<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let d=1;d<=e;d++){if(r[d]=r[d-1].clone(),o[d]=o[d-1].clone(),a.crossVectors(s[d-1],s[d]),a.length()>Number.EPSILON){a.normalize();let g=Math.acos(it(s[d-1].dot(s[d]),-1,1));r[d].applyMatrix4(l.makeRotationAxis(a,g))}o[d].crossVectors(s[d],r[d])}if(t===!0){let d=Math.acos(it(r[0].dot(r[e]),-1,1));d/=e,s[0].dot(a.crossVectors(r[0],r[e]))>0&&(d=-d);for(let g=1;g<=e;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],d*g)),o[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Lr=class extends Pn{constructor(e=0,t=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(e,t=new be){let n=t,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);let a=this.aStartAngle+e*r,l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let u=Math.cos(this.aRotation),f=Math.sin(this.aRotation),h=l-this.aX,d=c-this.aY;l=h*u-d*f+this.aX,c=h*f+d*u+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},oa=class extends Lr{constructor(e,t,n,s,r,o){super(e,t,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}};function qc(){let i=0,e=0,t=0,n=0;function s(r,o,a,l){i=r,e=a,t=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,u,f){let h=(o-r)/c-(a-r)/(c+u)+(a-o)/u,d=(a-o)/u-(l-o)/(u+f)+(l-a)/f;h*=u,d*=u,s(o,a,h,d)},calc:function(r){let o=r*r,a=o*r;return i+e*r+t*o+n*a}}}var Hh=new N,Wh=new N,fc=new qc,pc=new qc,mc=new qc,Os=class extends Pn{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new N){let n=t,s=this.points,r=s.length,o=(r-(this.closed?0:1))*e,a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,u;this.closed||a>0?c=s[(a-1)%r]:(Wh.subVectors(s[0],s[1]).add(s[0]),c=Wh);let f=s[a%r],h=s[(a+1)%r];if(this.closed||a+2<r?u=s[(a+2)%r]:(Hh.subVectors(s[r-1],s[r-2]).add(s[r-1]),u=Hh),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,g=Math.pow(c.distanceToSquared(f),d),_=Math.pow(f.distanceToSquared(h),d),p=Math.pow(h.distanceToSquared(u),d);_<1e-4&&(_=1),g<1e-4&&(g=_),p<1e-4&&(p=_),fc.initNonuniformCatmullRom(c.x,f.x,h.x,u.x,g,_,p),pc.initNonuniformCatmullRom(c.y,f.y,h.y,u.y,g,_,p),mc.initNonuniformCatmullRom(c.z,f.z,h.z,u.z,g,_,p)}else this.curveType==="catmullrom"&&(fc.initCatmullRom(c.x,f.x,h.x,u.x,this.tension),pc.initCatmullRom(c.y,f.y,h.y,u.y,this.tension),mc.initCatmullRom(c.z,f.z,h.z,u.z,this.tension));return n.set(fc.calc(l),pc.calc(l),mc.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new N().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Xh(i,e,t,n,s){let r=(n-e)*.5,o=(s-t)*.5,a=i*i,l=i*a;return(2*t-2*n+r+o)*l+(-3*t+3*n-2*r-o)*a+r*i+t}function kf(i,e){let t=1-i;return t*t*e}function zf(i,e){return 2*(1-i)*i*e}function Vf(i,e){return i*i*e}function vr(i,e,t,n){return kf(i,e)+zf(i,t)+Vf(i,n)}function Gf(i,e){let t=1-i;return t*t*t*e}function Hf(i,e){let t=1-i;return 3*t*t*i*e}function Wf(i,e){return 3*(1-i)*i*i*e}function Xf(i,e){return i*i*i*e}function yr(i,e,t,n,s){return Gf(i,e)+Hf(i,t)+Wf(i,n)+Xf(i,s)}var aa=class extends Pn{constructor(e=new be,t=new be,n=new be,s=new be){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new be){let n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(yr(e,s.x,r.x,o.x,a.x),yr(e,s.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},la=class extends Pn{constructor(e=new N,t=new N,n=new N,s=new N){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new N){let n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(yr(e,s.x,r.x,o.x,a.x),yr(e,s.y,r.y,o.y,a.y),yr(e,s.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},ca=class extends Pn{constructor(e=new be,t=new be){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new be){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new be){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ha=class extends Pn{constructor(e=new N,t=new N){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new N){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new N){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ua=class extends Pn{constructor(e=new be,t=new be,n=new be){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new be){let n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(vr(e,s.x,r.x,o.x),vr(e,s.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Nr=class extends Pn{constructor(e=new N,t=new N,n=new N){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new N){let n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(vr(e,s.x,r.x,o.x),vr(e,s.y,r.y,o.y),vr(e,s.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},da=class extends Pn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new be){let n=t,s=this.points,r=(s.length-1)*e,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],u=s[o>s.length-2?s.length-1:o+1],f=s[o>s.length-3?s.length-1:o+2];return n.set(Xh(a,l.x,c.x,u.x,f.x),Xh(a,l.y,c.y,u.y,f.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new be().fromArray(s))}return this}},qf=Object.freeze({__proto__:null,ArcCurve:oa,CatmullRomCurve3:Os,CubicBezierCurve:aa,CubicBezierCurve3:la,EllipseCurve:Lr,LineCurve:ca,LineCurve3:ha,QuadraticBezierCurve:ua,QuadraticBezierCurve3:Nr,SplineCurve:da});var Mn=class i extends Dt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,u=l+1,f=e/a,h=t/l,d=[],g=[],_=[],p=[];for(let m=0;m<u;m++){let E=m*h-o;for(let C=0;C<c;C++){let v=C*f-r;g.push(v,-E,0),_.push(0,0,1),p.push(C/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let E=0;E<a;E++){let C=E+c*m,v=E+c*(m+1),b=E+1+c*(m+1),S=E+1+c*m;d.push(C,v,S),d.push(v,b,S)}this.setIndex(d),this.setAttribute("position",new ut(g,3)),this.setAttribute("normal",new ut(_,3)),this.setAttribute("uv",new ut(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}};var Ur=class i extends Dt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,u=[],f=new N,h=new N,d=[],g=[],_=[],p=[];for(let m=0;m<=n;m++){let E=[],C=m/n,v=o+C*a,b=e*Math.cos(v),S=Math.sqrt(e*e-b*b),A=0;m===0&&o===0?A=.5/t:m===n&&l===Math.PI&&(A=-.5/t);for(let x=0;x<=t;x++){let M=x/t,I=s+M*r;f.x=-S*Math.cos(I),f.y=b,f.z=S*Math.sin(I),g.push(f.x,f.y,f.z),h.copy(f).normalize(),_.push(h.x,h.y,h.z),p.push(M+A,1-C),E.push(c++)}u.push(E)}for(let m=0;m<n;m++)for(let E=0;E<t;E++){let C=u[m][E+1],v=u[m][E],b=u[m+1][E],S=u[m+1][E+1];(m!==0||o>0)&&d.push(C,v,S),(m!==n-1||l<Math.PI)&&d.push(v,b,S)}this.setIndex(d),this.setAttribute("position",new ut(g,3)),this.setAttribute("normal",new ut(_,3)),this.setAttribute("uv",new ut(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Fr=class i extends Dt{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],u=[],f=[],h=new N,d=new N,g=new N;for(let _=0;_<=n;_++){let p=o+_/n*a;for(let m=0;m<=s;m++){let E=m/s*r;d.x=(e+t*Math.cos(p))*Math.cos(E),d.y=(e+t*Math.cos(p))*Math.sin(E),d.z=t*Math.sin(p),c.push(d.x,d.y,d.z),h.x=e*Math.cos(E),h.y=e*Math.sin(E),g.subVectors(d,h).normalize(),u.push(g.x,g.y,g.z),f.push(m/s),f.push(_/n)}}for(let _=1;_<=n;_++)for(let p=1;p<=s;p++){let m=(s+1)*_+p-1,E=(s+1)*(_-1)+p-1,C=(s+1)*(_-1)+p,v=(s+1)*_+p;l.push(m,E,v),l.push(E,C,v)}this.setIndex(l),this.setAttribute("position",new ut(c,3)),this.setAttribute("normal",new ut(u,3)),this.setAttribute("uv",new ut(f,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var Or=class i extends Dt{constructor(e=new Nr(new N(-1,-1,0),new N(-1,1,0),new N(1,1,0)),t=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:s,closed:r};let o=e.computeFrenetFrames(t,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let a=new N,l=new N,c=new be,u=new N,f=[],h=[],d=[],g=[];_(),this.setIndex(g),this.setAttribute("position",new ut(f,3)),this.setAttribute("normal",new ut(h,3)),this.setAttribute("uv",new ut(d,2));function _(){for(let C=0;C<t;C++)p(C);p(r===!1?t:0),E(),m()}function p(C){u=e.getPointAt(C/t,u);let v=o.normals[C],b=o.binormals[C];for(let S=0;S<=s;S++){let A=S/s*Math.PI*2,x=Math.sin(A),M=-Math.cos(A);l.x=M*v.x+x*b.x,l.y=M*v.y+x*b.y,l.z=M*v.z+x*b.z,l.normalize(),h.push(l.x,l.y,l.z),a.x=u.x+n*l.x,a.y=u.y+n*l.y,a.z=u.z+n*l.z,f.push(a.x,a.y,a.z)}}function m(){for(let C=1;C<=t;C++)for(let v=1;v<=s;v++){let b=(s+1)*(C-1)+(v-1),S=(s+1)*C+(v-1),A=(s+1)*C+v,x=(s+1)*(C-1)+v;g.push(b,S,x),g.push(S,A,x)}}function E(){for(let C=0;C<=t;C++)for(let v=0;v<=s;v++)c.x=C/t,c.y=v/s,d.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new i(new qf[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}};function rs(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];if(qh(s))s.isRenderTargetTexture?(We("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(qh(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}function an(i){let e={};for(let t=0;t<i.length;t++){let n=rs(i[t]);for(let s in n)e[s]=n[s]}return e}function qh(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Yf(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Yc(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:at.workingColorSpace}var si={clone:rs,merge:an},Zf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Jf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Lt=class extends ni{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Zf,this.fragmentShader=Jf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=rs(e.uniforms),this.uniformsGroups=Yf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new Ee().setHex(s.value);break;case"v2":this.uniforms[n].value=new be().fromArray(s.value);break;case"v3":this.uniforms[n].value=new N().fromArray(s.value);break;case"v4":this.uniforms[n].value=new Mt().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ze().fromArray(s.value);break;case"m4":this.uniforms[n].value=new $e().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Bs=class extends Lt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Jt=class extends ni{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ee(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ee(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Hs,this.normalScale=new be(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Cn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},gi=class extends Jt{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new be(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return it(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ee(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ee(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ee(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var Br=class extends ni{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Hs,this.normalScale=new be(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}},kr=class extends ni{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ee(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ee(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Hs,this.normalScale=new be(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Cn,this.combine=Ca,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},fa=class extends ni{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=vu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},pa=class extends ni{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Vo(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}var Ai=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<s)){for(let a=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=t[++n],e<s)break e}o=t.length;break t}if(!(e>=r)){let a=t[1];e<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){let a=n+o>>>1;e<t[a]?o=a:n=a+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},ma=class extends Ai{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:_c,endingEnd:_c}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,o=e+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case vc:r=e,a=2*t-n;break;case yc:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case vc:o=e,l=2*n-t;break;case yc:o=1,l=n+s[1]-s[0];break;default:o=e-1,l=t}let c=(n-t)*.5,u=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=r*u,this._offsetNext=o*u}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this._offsetPrev,f=this._offsetNext,h=this._weightPrev,d=this._weightNext,g=(n-t)/(s-t),_=g*g,p=_*g,m=-h*p+2*h*_-h*g,E=(1+h)*p+(-1.5-2*h)*_+(-.5+h)*g+1,C=(-1-d)*p+(1.5+d)*_+.5*g,v=d*p-d*_;for(let b=0;b!==a;++b)r[b]=m*o[u+b]+E*o[c+b]+C*o[l+b]+v*o[f+b];return r}},ga=class extends Ai{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=(n-t)/(s-t),f=1-u;for(let h=0;h!==a;++h)r[h]=o[c+h]*f+o[l+h]*u;return r}},xa=class extends Ai{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},_a=class extends Ai{interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this.inTangents,f=this.outTangents;if(!u||!f){let g=(n-t)/(s-t),_=1-g;for(let p=0;p!==a;++p)r[p]=o[c+p]*_+o[l+p]*g;return r}let h=a*2,d=e-1;for(let g=0;g!==a;++g){let _=o[c+g],p=o[l+g],m=d*h+g*2,E=f[m],C=f[m+1],v=e*h+g*2,b=u[v],S=u[v+1],A=(n-t)/(s-t),x,M,I,T,D;for(let B=0;B<8;B++){x=A*A,M=x*A,I=1-A,T=I*I,D=T*I;let z=D*t+3*T*A*E+3*I*x*b+M*s-n;if(Math.abs(z)<1e-10)break;let H=3*T*(E-t)+6*I*A*(b-E)+3*x*(s-b);if(Math.abs(H)<1e-10)break;A=A-z/H,A=Math.max(0,Math.min(1,A))}r[g]=D*_+3*T*A*C+3*I*x*S+M*p}return r}},bn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Vo(t,this.TimeBufferType),this.values=Vo(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Vo(e.times,Array),values:Vo(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new xa(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new ga(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ma(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new _a(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Mr:t=this.InterpolantFactoryMethodDiscrete;break;case ta:t=this.InterpolantFactoryMethodLinear;break;case Wo:t=this.InterpolantFactoryMethodSmooth;break;case xc:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return We("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Mr;case this.InterpolantFactoryMethodLinear:return ta;case this.InterpolantFactoryMethodSmooth:return Wo;case this.InterpolantFactoryMethodBezier:return xc}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Xe("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Xe("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Xe("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){Xe("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(s!==void 0&&nf(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Xe("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Wo,r=e.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=e[a],u=e[a+1];if(c!==u&&(a!==1||c!==e[0]))if(s)l=!0;else{let f=a*n,h=f-n,d=f+n;for(let g=0;g!==n;++g){let _=t[f+g];if(_!==t[h+g]||_!==t[d+g]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];let f=a*n,h=o*n;for(let d=0;d!==n;++d)t[h+d]=t[f+d]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};bn.prototype.ValueTypeName="";bn.prototype.TimeBufferType=Float32Array;bn.prototype.ValueBufferType=Float32Array;bn.prototype.DefaultInterpolation=ta;var Ci=class extends bn{constructor(e,t,n){super(e,t,n)}};Ci.prototype.ValueTypeName="bool";Ci.prototype.ValueBufferType=Array;Ci.prototype.DefaultInterpolation=Mr;Ci.prototype.InterpolantFactoryMethodLinear=void 0;Ci.prototype.InterpolantFactoryMethodSmooth=void 0;var va=class extends bn{constructor(e,t,n,s){super(e,t,n,s)}};va.prototype.ValueTypeName="color";var ya=class extends bn{constructor(e,t,n,s){super(e,t,n,s)}};ya.prototype.ValueTypeName="number";var Ma=class extends Ai{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(s-t),c=e*a;for(let u=c+a;c!==u;c+=4)jt.slerpFlat(r,0,o,c-a,o,c,l);return r}},zr=class extends bn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new Ma(this.times,this.values,this.getValueSize(),e)}};zr.prototype.ValueTypeName="quaternion";zr.prototype.InterpolantFactoryMethodSmooth=void 0;var Ri=class extends bn{constructor(e,t,n){super(e,t,n)}};Ri.prototype.ValueTypeName="string";Ri.prototype.ValueBufferType=Array;Ri.prototype.DefaultInterpolation=Mr;Ri.prototype.InterpolantFactoryMethodLinear=void 0;Ri.prototype.InterpolantFactoryMethodSmooth=void 0;var ba=class extends bn{constructor(e,t,n,s){super(e,t,n,s)}};ba.prototype.ValueTypeName="vector";var ks=class{constructor(e,t,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(u){a++,r===!1&&s.onStart!==void 0&&s.onStart(u,o,a),r=!0},this.itemEnd=function(u){o++,s.onProgress!==void 0&&s.onProgress(u,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(u){s.onError!==void 0&&s.onError(u)},this.resolveURL=function(u){return u=u.normalize("NFC"),l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,f){return c.push(u,f),this},this.removeHandler=function(u){let f=c.indexOf(u);return f!==-1&&c.splice(f,2),this},this.getHandler=function(u){for(let f=0,h=c.length;f<h;f+=2){let d=c[f],g=c[f+1];if(d.global&&(d.lastIndex=0),d.test(u))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Du=new ks,Sa=class{constructor(e){this.manager=e!==void 0?e:Du,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Sa.DEFAULT_MATERIAL_NAME="__DEFAULT";var Qi=class extends Zt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ee(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Vr=class extends Qi{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Zt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ee(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},gc=new $e,Yh=new N,Zh=new N,Ta=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new be(512,512),this.mapType=$t,this.map=null,this.mapPass=null,this.matrix=new $e,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Fs,this._frameExtents=new be(1,1),this._viewportCount=1,this._viewports=[new Mt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;Yh.setFromMatrixPosition(e.matrixWorld),t.position.copy(Yh),Zh.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Zh),t.updateMatrixWorld(),gc.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(gc,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Rs||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(gc)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Go=new N,Ho=new jt,Qn=new N,Gr=class extends Zt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new $e,this.projectionMatrix=new $e,this.projectionMatrixInverse=new $e,this.coordinateSystem=zn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Go,Ho,Qn),Qn.x===1&&Qn.y===1&&Qn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Go,Ho,Qn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Go,Ho,Qn),Qn.x===1&&Qn.y===1&&Qn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Go,Ho,Qn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ti=new N,Jh=new be,$h=new be,zt=class extends Gr{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Is*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(xr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Is*2*Math.atan(Math.tan(xr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Ti.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ti.x,Ti.y).multiplyScalar(-e/Ti.z),Ti.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ti.x,Ti.y).multiplyScalar(-e/Ti.z)}getViewSize(e,t){return this.getViewBounds(e,Jh,$h),t.subVectors($h,Jh)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(xr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var Sc=class extends Ta{constructor(){super(new zt(90,1,.5,500)),this.isPointLightShadow=!0}},es=class extends Qi{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Sc}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},In=class extends Gr{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Tc=class extends Ta{constructor(){super(new In(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Hr=class extends Qi{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Zt.DEFAULT_UP),this.updateMatrix(),this.target=new Zt,this.shadow=new Tc}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},Wr=class extends Qi{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}};var ws=-90,Es=1,wa=class extends Zt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new zt(ws,Es,e,t);s.layers=this.layers,this.add(s);let r=new zt(ws,Es,e,t);r.layers=this.layers,this.add(r);let o=new zt(ws,Es,e,t);o.layers=this.layers,this.add(o);let a=new zt(ws,Es,e,t);a.layers=this.layers,this.add(a);let l=new zt(ws,Es,e,t);l.layers=this.layers,this.add(l);let c=new zt(ws,Es,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(let c of t)this.remove(c);if(e===zn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Rs)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,u]=this.children,f=e.getRenderTarget(),h=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(f,h,d),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},Ea=class extends zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var Zc="\\[\\]\\.:\\/",$f=new RegExp("["+Zc+"]","g"),Jc="[^"+Zc+"]",Kf="[^"+Zc.replace("\\.","")+"]",jf=/((?:WC+[\/:])*)/.source.replace("WC",Jc),Qf=/(WCOD+)?/.source.replace("WCOD",Kf),ep=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Jc),tp=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Jc),np=new RegExp("^"+jf+Qf+ep+tp+"$"),ip=["material","materials","bones","map"],wc=class{constructor(e,t,n){let s=n||St.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},St=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace($f,"")}static parseTrackName(e){let t=np.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);ip.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let l=n(a.children);if(l)return l}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){We("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){Xe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Xe("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Xe("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Xe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Xe("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Xe("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){Xe("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let o=e[s];if(o===void 0){let c=t.nodeName;Xe("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Xe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Xe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};St.Composite=wc;St.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};St.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};St.prototype.GetterByBindingType=[St.prototype._getValue_direct,St.prototype._getValue_array,St.prototype._getValue_arrayElement,St.prototype._getValue_toArray];St.prototype.SetterByBindingTypeAndVersioning=[[St.prototype._setValue_direct,St.prototype._setValue_direct_setNeedsUpdate,St.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[St.prototype._setValue_array,St.prototype._setValue_array_setNeedsUpdate,St.prototype._setValue_array_setMatrixWorldNeedsUpdate],[St.prototype._setValue_arrayElement,St.prototype._setValue_arrayElement_setNeedsUpdate,St.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[St.prototype._setValue_fromArray,St.prototype._setValue_fromArray_setNeedsUpdate,St.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var K_=new Float32Array(1);var Kh=new $e,Xr=class{constructor(e,t,n=0,s=1/0){this.ray=new $i(e,t),this.near=n,this.far=s,this.camera=null,this.layers=new Ls,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Xe("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Kh.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Kh),this}intersectObject(e,t=!0,n=[]){return Ec(e,this,n,t),n.sort(jh),n}intersectObjects(e,t=!0,n=[]){for(let s=0,r=e.length;s<r;s++)Ec(e[s],this,n,t);return n.sort(jh),n}};function jh(i,e){return i.distance-e.distance}function Ec(i,e,t,n){let s=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let o=0,a=r.length;o<a;o++)Ec(r[o],e,t,!0)}}var zs=class{constructor(e=1,t=0,n=0){this.radius=e,this.phi=t,this.theta=n}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=it(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(it(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Ac=class i{static{i.prototype.isMatrix2=!0}constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){let r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}};var qr=class extends Vn{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){We("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};function $c(i,e,t,n){let s=sp(n);switch(t){case zc:return i*e;case Ua:return i*e/s.components*s.byteLength;case Fa:return i*e/s.components*s.byteLength;case Ui:return i*e*2/s.components*s.byteLength;case Oa:return i*e*2/s.components*s.byteLength;case Vc:return i*e*3/s.components*s.byteLength;case mn:return i*e*4/s.components*s.byteLength;case Ba:return i*e*4/s.components*s.byteLength;case eo:case to:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case no:case io:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case za:case Ga:return Math.max(i,16)*Math.max(e,8)/4;case ka:case Va:return Math.max(i,8)*Math.max(e,8)/2;case Ha:case Wa:case qa:case Ya:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Xa:case so:case Za:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ja:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case $a:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Ka:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case ja:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Qa:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case el:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case tl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case nl:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case il:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case sl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case rl:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case ol:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case al:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case ll:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case cl:case hl:case ul:return Math.ceil(i/4)*Math.ceil(e/4)*16;case dl:case fl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ro:case pl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function sp(i){switch(i){case $t:case Fc:return{byteLength:1,components:1};case Gs:case Oc:case Gt:return{byteLength:2,components:1};case La:case Na:return{byteLength:2,components:4};case Xn:case Da:case Dn:return{byteLength:4,components:1};case Bc:case kc:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"185"}}));typeof window<"u"&&(window.__THREE__?We("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="185");function td(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function up(i){let e=new WeakMap;function t(a,l){let c=a.array,u=a.usage,f=c.byteLength,h=i.createBuffer();i.bindBuffer(l,h),i.bufferData(l,c,u),a.onUploadCallback();let d;if(c instanceof Float32Array)d=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?d=i.HALF_FLOAT:d=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=i.SHORT;else if(c instanceof Uint32Array)d=i.UNSIGNED_INT;else if(c instanceof Int32Array)d=i.INT;else if(c instanceof Int8Array)d=i.BYTE;else if(c instanceof Uint8Array)d=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function n(a,l,c){let u=l.array,f=l.updateRanges;if(i.bindBuffer(c,a),f.length===0)i.bufferSubData(c,0,u);else{f.sort((d,g)=>d.start-g.start);let h=0;for(let d=1;d<f.length;d++){let g=f[h],_=f[d];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++h,f[h]=_)}f.length=h+1;for(let d=0,g=f.length;d<g;d++){let _=f[d];i.bufferSubData(c,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var dp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,fp=`#ifdef USE_ALPHAHASH
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
#endif`,pp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,mp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,xp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,_p=`#ifdef USE_AOMAP
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
#endif`,vp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,yp=`#ifdef USE_BATCHING
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
#endif`,Mp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,bp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Sp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Tp=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,wp=`#ifdef USE_IRIDESCENCE
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
#endif`,Ep=`#ifdef USE_BUMPMAP
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
#endif`,Ap=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Cp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Rp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Pp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ip=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Dp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Lp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Np=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,Up=`#define PI 3.141592653589793
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
} // validated`,Fp=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Op=`vec3 transformedNormal = objectNormal;
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
#endif`,Bp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,kp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,zp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Vp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Gp="gl_FragColor = linearToOutputTexel( gl_FragColor );",Hp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Wp=`#ifdef USE_ENVMAP
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
#endif`,Xp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,qp=`#ifdef USE_ENVMAP
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
#endif`,Yp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Zp=`#ifdef USE_ENVMAP
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
#endif`,Jp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,$p=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Kp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,jp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Qp=`#ifdef USE_GRADIENTMAP
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
}`,em=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,tm=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,nm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,im=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,sm=`#ifdef USE_ENVMAP
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
#endif`,rm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,om=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,am=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,cm=`PhysicalMaterial material;
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
#endif`,hm=`uniform sampler2D dfgLUT;
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
}`,um=`
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
#endif`,dm=`#if defined( RE_IndirectDiffuse )
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
#endif`,fm=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,pm=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,mm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,gm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,_m=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,vm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ym=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Mm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,bm=`#if defined( USE_POINTS_UV )
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
#endif`,Sm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Tm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,wm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Em=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Am=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Cm=`#ifdef USE_MORPHTARGETS
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
#endif`,Rm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Pm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Im=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Dm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Lm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Nm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Um=`#ifdef USE_NORMALMAP
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
#endif`,Fm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Om=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Bm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,km=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,zm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Vm=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Gm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Hm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Wm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Xm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,qm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ym=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Zm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Jm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,$m=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Km=`float getShadowMask() {
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
}`,jm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Qm=`#ifdef USE_SKINNING
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
#endif`,e0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,t0=`#ifdef USE_SKINNING
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
#endif`,n0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,i0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,s0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,r0=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,o0=`#ifdef USE_TRANSMISSION
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
#endif`,a0=`#ifdef USE_TRANSMISSION
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
#endif`,l0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,c0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,h0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,u0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,d0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,f0=`uniform sampler2D t2D;
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
}`,p0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,m0=`#ifdef ENVMAP_TYPE_CUBE
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
}`,g0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,x0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_0=`#include <common>
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
}`,v0=`#if DEPTH_PACKING == 3200
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
}`,y0=`#define DISTANCE
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
}`,M0=`#define DISTANCE
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
}`,b0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,S0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,T0=`uniform float scale;
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
}`,w0=`uniform vec3 diffuse;
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
}`,E0=`#include <common>
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
}`,A0=`uniform vec3 diffuse;
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
}`,C0=`#define LAMBERT
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
}`,R0=`#define LAMBERT
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
}`,P0=`#define MATCAP
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
}`,I0=`#define MATCAP
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
}`,D0=`#define NORMAL
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
}`,L0=`#define NORMAL
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
}`,N0=`#define PHONG
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
}`,U0=`#define PHONG
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
}`,F0=`#define STANDARD
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
}`,O0=`#define STANDARD
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
}`,B0=`#define TOON
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
}`,k0=`#define TOON
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
}`,z0=`uniform float size;
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
}`,V0=`uniform vec3 diffuse;
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
}`,G0=`#include <common>
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
}`,H0=`uniform vec3 color;
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
}`,W0=`uniform float rotation;
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
}`,X0=`uniform vec3 diffuse;
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
}`,rt={alphahash_fragment:dp,alphahash_pars_fragment:fp,alphamap_fragment:pp,alphamap_pars_fragment:mp,alphatest_fragment:gp,alphatest_pars_fragment:xp,aomap_fragment:_p,aomap_pars_fragment:vp,batching_pars_vertex:yp,batching_vertex:Mp,begin_vertex:bp,beginnormal_vertex:Sp,bsdfs:Tp,iridescence_fragment:wp,bumpmap_pars_fragment:Ep,clipping_planes_fragment:Ap,clipping_planes_pars_fragment:Cp,clipping_planes_pars_vertex:Rp,clipping_planes_vertex:Pp,color_fragment:Ip,color_pars_fragment:Dp,color_pars_vertex:Lp,color_vertex:Np,common:Up,cube_uv_reflection_fragment:Fp,defaultnormal_vertex:Op,displacementmap_pars_vertex:Bp,displacementmap_vertex:kp,emissivemap_fragment:zp,emissivemap_pars_fragment:Vp,colorspace_fragment:Gp,colorspace_pars_fragment:Hp,envmap_fragment:Wp,envmap_common_pars_fragment:Xp,envmap_pars_fragment:qp,envmap_pars_vertex:Yp,envmap_physical_pars_fragment:sm,envmap_vertex:Zp,fog_vertex:Jp,fog_pars_vertex:$p,fog_fragment:Kp,fog_pars_fragment:jp,gradientmap_pars_fragment:Qp,lightmap_pars_fragment:em,lights_lambert_fragment:tm,lights_lambert_pars_fragment:nm,lights_pars_begin:im,lights_toon_fragment:rm,lights_toon_pars_fragment:om,lights_phong_fragment:am,lights_phong_pars_fragment:lm,lights_physical_fragment:cm,lights_physical_pars_fragment:hm,lights_fragment_begin:um,lights_fragment_maps:dm,lights_fragment_end:fm,lightprobes_pars_fragment:pm,logdepthbuf_fragment:mm,logdepthbuf_pars_fragment:gm,logdepthbuf_pars_vertex:xm,logdepthbuf_vertex:_m,map_fragment:vm,map_pars_fragment:ym,map_particle_fragment:Mm,map_particle_pars_fragment:bm,metalnessmap_fragment:Sm,metalnessmap_pars_fragment:Tm,morphinstance_vertex:wm,morphcolor_vertex:Em,morphnormal_vertex:Am,morphtarget_pars_vertex:Cm,morphtarget_vertex:Rm,normal_fragment_begin:Pm,normal_fragment_maps:Im,normal_pars_fragment:Dm,normal_pars_vertex:Lm,normal_vertex:Nm,normalmap_pars_fragment:Um,clearcoat_normal_fragment_begin:Fm,clearcoat_normal_fragment_maps:Om,clearcoat_pars_fragment:Bm,iridescence_pars_fragment:km,opaque_fragment:zm,packing:Vm,premultiplied_alpha_fragment:Gm,project_vertex:Hm,dithering_fragment:Wm,dithering_pars_fragment:Xm,roughnessmap_fragment:qm,roughnessmap_pars_fragment:Ym,shadowmap_pars_fragment:Zm,shadowmap_pars_vertex:Jm,shadowmap_vertex:$m,shadowmask_pars_fragment:Km,skinbase_vertex:jm,skinning_pars_vertex:Qm,skinning_vertex:e0,skinnormal_vertex:t0,specularmap_fragment:n0,specularmap_pars_fragment:i0,tonemapping_fragment:s0,tonemapping_pars_fragment:r0,transmission_fragment:o0,transmission_pars_fragment:a0,uv_pars_fragment:l0,uv_pars_vertex:c0,uv_vertex:h0,worldpos_vertex:u0,background_vert:d0,background_frag:f0,backgroundCube_vert:p0,backgroundCube_frag:m0,cube_vert:g0,cube_frag:x0,depth_vert:_0,depth_frag:v0,distance_vert:y0,distance_frag:M0,equirect_vert:b0,equirect_frag:S0,linedashed_vert:T0,linedashed_frag:w0,meshbasic_vert:E0,meshbasic_frag:A0,meshlambert_vert:C0,meshlambert_frag:R0,meshmatcap_vert:P0,meshmatcap_frag:I0,meshnormal_vert:D0,meshnormal_frag:L0,meshphong_vert:N0,meshphong_frag:U0,meshphysical_vert:F0,meshphysical_frag:O0,meshtoon_vert:B0,meshtoon_frag:k0,points_vert:z0,points_frag:V0,shadow_vert:G0,shadow_frag:H0,sprite_vert:W0,sprite_frag:X0},we={common:{diffuse:{value:new Ee(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ze}},envmap:{envMap:{value:null},envMapRotation:{value:new Ze},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ze}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ze}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ze},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ze},normalScale:{value:new be(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ze},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ze}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ze}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ze}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ee(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new N},probesMax:{value:new N},probesResolution:{value:new N}},points:{diffuse:{value:new Ee(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0},uvTransform:{value:new Ze}},sprite:{diffuse:{value:new Ee(16777215)},opacity:{value:1},center:{value:new be(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}}},oi={basic:{uniforms:an([we.common,we.specularmap,we.envmap,we.aomap,we.lightmap,we.fog]),vertexShader:rt.meshbasic_vert,fragmentShader:rt.meshbasic_frag},lambert:{uniforms:an([we.common,we.specularmap,we.envmap,we.aomap,we.lightmap,we.emissivemap,we.bumpmap,we.normalmap,we.displacementmap,we.fog,we.lights,{emissive:{value:new Ee(0)},envMapIntensity:{value:1}}]),vertexShader:rt.meshlambert_vert,fragmentShader:rt.meshlambert_frag},phong:{uniforms:an([we.common,we.specularmap,we.envmap,we.aomap,we.lightmap,we.emissivemap,we.bumpmap,we.normalmap,we.displacementmap,we.fog,we.lights,{emissive:{value:new Ee(0)},specular:{value:new Ee(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:rt.meshphong_vert,fragmentShader:rt.meshphong_frag},standard:{uniforms:an([we.common,we.envmap,we.aomap,we.lightmap,we.emissivemap,we.bumpmap,we.normalmap,we.displacementmap,we.roughnessmap,we.metalnessmap,we.fog,we.lights,{emissive:{value:new Ee(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:rt.meshphysical_vert,fragmentShader:rt.meshphysical_frag},toon:{uniforms:an([we.common,we.aomap,we.lightmap,we.emissivemap,we.bumpmap,we.normalmap,we.displacementmap,we.gradientmap,we.fog,we.lights,{emissive:{value:new Ee(0)}}]),vertexShader:rt.meshtoon_vert,fragmentShader:rt.meshtoon_frag},matcap:{uniforms:an([we.common,we.bumpmap,we.normalmap,we.displacementmap,we.fog,{matcap:{value:null}}]),vertexShader:rt.meshmatcap_vert,fragmentShader:rt.meshmatcap_frag},points:{uniforms:an([we.points,we.fog]),vertexShader:rt.points_vert,fragmentShader:rt.points_frag},dashed:{uniforms:an([we.common,we.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:rt.linedashed_vert,fragmentShader:rt.linedashed_frag},depth:{uniforms:an([we.common,we.displacementmap]),vertexShader:rt.depth_vert,fragmentShader:rt.depth_frag},normal:{uniforms:an([we.common,we.bumpmap,we.normalmap,we.displacementmap,{opacity:{value:1}}]),vertexShader:rt.meshnormal_vert,fragmentShader:rt.meshnormal_frag},sprite:{uniforms:an([we.sprite,we.fog]),vertexShader:rt.sprite_vert,fragmentShader:rt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ze},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:rt.background_vert,fragmentShader:rt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ze}},vertexShader:rt.backgroundCube_vert,fragmentShader:rt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:rt.cube_vert,fragmentShader:rt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:rt.equirect_vert,fragmentShader:rt.equirect_frag},distance:{uniforms:an([we.common,we.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:rt.distance_vert,fragmentShader:rt.distance_frag},shadow:{uniforms:an([we.lights,we.fog,{color:{value:new Ee(0)},opacity:{value:1}}]),vertexShader:rt.shadow_vert,fragmentShader:rt.shadow_frag}};oi.physical={uniforms:an([oi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ze},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ze},clearcoatNormalScale:{value:new be(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ze},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ze},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ze},sheen:{value:0},sheenColor:{value:new Ee(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ze},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ze},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ze},transmissionSamplerSize:{value:new be},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ze},attenuationDistance:{value:0},attenuationColor:{value:new Ee(0)},specularColor:{value:new Ee(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ze},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ze},anisotropyVector:{value:new be},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ze}}]),vertexShader:rt.meshphysical_vert,fragmentShader:rt.meshphysical_frag};var xl={r:0,b:0,g:0},q0=new $e,nd=new Ze;nd.set(-1,0,0,0,1,0,0,0,1);function Y0(i,e,t,n,s,r){let o=new Ee(0),a=s===!0?0:1,l,c,u=null,f=0,h=null;function d(E){let C=E.isScene===!0?E.background:null;if(C&&C.isTexture){let v=E.backgroundBlurriness>0;C=e.get(C,v)}return C}function g(E){let C=!1,v=d(E);v===null?p(o,a):v&&v.isColor&&(p(v,1),C=!0);let b=i.xr.getEnvironmentBlendMode();b==="additive"?t.buffers.color.setClear(0,0,0,1,r):b==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||C)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function _(E,C){let v=d(C);v&&(v.isCubeTexture||v.mapping===jr)?(c===void 0&&(c=new st(new Rn(1,1,1),new Lt({name:"BackgroundCubeMaterial",uniforms:rs(oi.backgroundCube.uniforms),vertexShader:oi.backgroundCube.vertexShader,fragmentShader:oi.backgroundCube.fragmentShader,side:en,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(b,S,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=v,c.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(q0.makeRotationFromEuler(C.backgroundRotation)).transpose(),v.isCubeTexture&&v.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(nd),c.material.toneMapped=at.getTransfer(v.colorSpace)!==pt,(u!==v||f!==v.version||h!==i.toneMapping)&&(c.material.needsUpdate=!0,u=v,f=v.version,h=i.toneMapping),c.layers.enableAll(),E.unshift(c,c.geometry,c.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new st(new Mn(2,2),new Lt({name:"BackgroundMaterial",uniforms:rs(oi.background.uniforms),vertexShader:oi.background.vertexShader,fragmentShader:oi.background.fragmentShader,side:mi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,l.material.toneMapped=at.getTransfer(v.colorSpace)!==pt,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(u!==v||f!==v.version||h!==i.toneMapping)&&(l.material.needsUpdate=!0,u=v,f=v.version,h=i.toneMapping),l.layers.enableAll(),E.unshift(l,l.geometry,l.material,0,0,null))}function p(E,C){E.getRGB(xl,Yc(i)),t.buffers.color.setClear(xl.r,xl.g,xl.b,C,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(E,C=1){o.set(E),a=C,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(E){a=E,p(o,a)},render:g,addToRenderList:_,dispose:m}}function Z0(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=h(null),r=s,o=!1;function a(T,D,B,G,z){let H=!1,P=f(T,G,B,D);r!==P&&(r=P,c(r.object)),H=d(T,G,B,z),H&&g(T,G,B,z),z!==null&&e.update(z,i.ELEMENT_ARRAY_BUFFER),(H||o)&&(o=!1,v(T,D,B,G),z!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(z).buffer))}function l(){return i.createVertexArray()}function c(T){return i.bindVertexArray(T)}function u(T){return i.deleteVertexArray(T)}function f(T,D,B,G){let z=G.wireframe===!0,H=n[D.id];H===void 0&&(H={},n[D.id]=H);let P=T.isInstancedMesh===!0?T.id:0,U=H[P];U===void 0&&(U={},H[P]=U);let q=U[B.id];q===void 0&&(q={},U[B.id]=q);let ne=q[z];return ne===void 0&&(ne=h(l()),q[z]=ne),ne}function h(T){let D=[],B=[],G=[];for(let z=0;z<t;z++)D[z]=0,B[z]=0,G[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:B,attributeDivisors:G,object:T,attributes:{},index:null}}function d(T,D,B,G){let z=r.attributes,H=D.attributes,P=0,U=B.getAttributes();for(let q in U)if(U[q].location>=0){let se=z[q],ae=H[q];if(ae===void 0&&(q==="instanceMatrix"&&T.instanceMatrix&&(ae=T.instanceMatrix),q==="instanceColor"&&T.instanceColor&&(ae=T.instanceColor)),se===void 0||se.attribute!==ae||ae&&se.data!==ae.data)return!0;P++}return r.attributesNum!==P||r.index!==G}function g(T,D,B,G){let z={},H=D.attributes,P=0,U=B.getAttributes();for(let q in U)if(U[q].location>=0){let se=H[q];se===void 0&&(q==="instanceMatrix"&&T.instanceMatrix&&(se=T.instanceMatrix),q==="instanceColor"&&T.instanceColor&&(se=T.instanceColor));let ae={};ae.attribute=se,se&&se.data&&(ae.data=se.data),z[q]=ae,P++}r.attributes=z,r.attributesNum=P,r.index=G}function _(){let T=r.newAttributes;for(let D=0,B=T.length;D<B;D++)T[D]=0}function p(T){m(T,0)}function m(T,D){let B=r.newAttributes,G=r.enabledAttributes,z=r.attributeDivisors;B[T]=1,G[T]===0&&(i.enableVertexAttribArray(T),G[T]=1),z[T]!==D&&(i.vertexAttribDivisor(T,D),z[T]=D)}function E(){let T=r.newAttributes,D=r.enabledAttributes;for(let B=0,G=D.length;B<G;B++)D[B]!==T[B]&&(i.disableVertexAttribArray(B),D[B]=0)}function C(T,D,B,G,z,H,P){P===!0?i.vertexAttribIPointer(T,D,B,z,H):i.vertexAttribPointer(T,D,B,G,z,H)}function v(T,D,B,G){_();let z=G.attributes,H=B.getAttributes(),P=D.defaultAttributeValues;for(let U in H){let q=H[U];if(q.location>=0){let ne=z[U];if(ne===void 0&&(U==="instanceMatrix"&&T.instanceMatrix&&(ne=T.instanceMatrix),U==="instanceColor"&&T.instanceColor&&(ne=T.instanceColor)),ne!==void 0){let se=ne.normalized,ae=ne.itemSize,fe=e.get(ne);if(fe===void 0)continue;let Ke=fe.buffer,Ue=fe.type,Q=fe.bytesPerElement,ce=Ue===i.INT||Ue===i.UNSIGNED_INT||ne.gpuType===Da;if(ne.isInterleavedBufferAttribute){let oe=ne.data,ze=oe.stride,Me=ne.offset;if(oe.isInstancedInterleavedBuffer){for(let ye=0;ye<q.locationSize;ye++)m(q.location+ye,oe.meshPerAttribute);T.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=oe.meshPerAttribute*oe.count)}else for(let ye=0;ye<q.locationSize;ye++)p(q.location+ye);i.bindBuffer(i.ARRAY_BUFFER,Ke);for(let ye=0;ye<q.locationSize;ye++)C(q.location+ye,ae/q.locationSize,Ue,se,ze*Q,(Me+ae/q.locationSize*ye)*Q,ce)}else{if(ne.isInstancedBufferAttribute){for(let oe=0;oe<q.locationSize;oe++)m(q.location+oe,ne.meshPerAttribute);T.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let oe=0;oe<q.locationSize;oe++)p(q.location+oe);i.bindBuffer(i.ARRAY_BUFFER,Ke);for(let oe=0;oe<q.locationSize;oe++)C(q.location+oe,ae/q.locationSize,Ue,se,ae*Q,ae/q.locationSize*oe*Q,ce)}}else if(P!==void 0){let se=P[U];if(se!==void 0)switch(se.length){case 2:i.vertexAttrib2fv(q.location,se);break;case 3:i.vertexAttrib3fv(q.location,se);break;case 4:i.vertexAttrib4fv(q.location,se);break;default:i.vertexAttrib1fv(q.location,se)}}}}E()}function b(){M();for(let T in n){let D=n[T];for(let B in D){let G=D[B];for(let z in G){let H=G[z];for(let P in H)u(H[P].object),delete H[P];delete G[z]}}delete n[T]}}function S(T){if(n[T.id]===void 0)return;let D=n[T.id];for(let B in D){let G=D[B];for(let z in G){let H=G[z];for(let P in H)u(H[P].object),delete H[P];delete G[z]}}delete n[T.id]}function A(T){for(let D in n){let B=n[D];for(let G in B){let z=B[G];if(z[T.id]===void 0)continue;let H=z[T.id];for(let P in H)u(H[P].object),delete H[P];delete z[T.id]}}}function x(T){for(let D in n){let B=n[D],G=T.isInstancedMesh===!0?T.id:0,z=B[G];if(z!==void 0){for(let H in z){let P=z[H];for(let U in P)u(P[U].object),delete P[U];delete z[H]}delete B[G],Object.keys(B).length===0&&delete n[D]}}}function M(){I(),o=!0,r!==s&&(r=s,c(r.object))}function I(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:M,resetDefaultState:I,dispose:b,releaseStatesOfGeometry:S,releaseStatesOfObject:x,releaseStatesOfProgram:A,initAttributes:_,enableAttribute:p,disableUnusedAttributes:E}}function J0(i,e,t){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),t.update(c,n,1)}function o(l,c,u){u!==0&&(i.drawArraysInstanced(n,l,c,u),t.update(c,n,u))}function a(l,c,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,u);let h=0;for(let d=0;d<u;d++)h+=c[d];t.update(h,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function $0(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let A=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(A){return!(A!==mn&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){let x=A===Gt&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==$t&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==Dn&&!x)}function l(A){if(A==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",u=l(c);u!==c&&(We("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let f=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&h===!1&&We("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let d=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),E=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),C=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),b=i.getParameter(i.MAX_SAMPLES),S=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:h,maxTextures:d,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:E,maxVaryings:C,maxFragmentUniforms:v,maxSamples:b,samples:S}}function K0(i){let e=this,t=null,n=0,s=!1,r=!1,o=new on,a=new Ze,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,h){let d=f.length!==0||h||n!==0||s;return s=h,n=f.length,d},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,h){t=u(f,h,0)},this.setState=function(f,h,d){let g=f.clippingPlanes,_=f.clipIntersection,p=f.clipShadows,m=i.get(f);if(!s||g===null||g.length===0||r&&!p)r?u(null):c();else{let E=r?0:n,C=E*4,v=m.clippingState||null;l.value=v,v=u(g,h,C,d);for(let b=0;b!==C;++b)v[b]=t[b];m.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=E}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(f,h,d,g){let _=f!==null?f.length:0,p=null;if(_!==0){if(p=l.value,g!==!0||p===null){let m=d+_*4,E=h.matrixWorldInverse;a.getNormalMatrix(E),(p===null||p.length<m)&&(p=new Float32Array(m));for(let C=0,v=d;C!==_;++C,v+=4)o.copy(f[C]).applyMatrix4(E,a),o.normal.toArray(p,v),p[v+3]=o.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,p}}var Fi=4,Lu=[.125,.215,.35,.446,.526,.582],os=20,j0=256,oo=new In,Nu=new Ee,Kc=null,jc=0,Qc=0,eh=!1,Q0=new N,Ys=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:o=256,position:a=Q0}=r;Kc=this._renderer.getRenderTarget(),jc=this._renderer.getActiveCubeFace(),Qc=this._renderer.getActiveMipmapLevel(),eh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ou(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Fu(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Kc,jc,Qc),this._renderer.xr.enabled=eh,e.scissorTest=!1,Xs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Di||e.mapping===ss?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Kc=this._renderer.getRenderTarget(),jc=this._renderer.getActiveCubeFace(),Qc=this._renderer.getActiveMipmapLevel(),eh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Kt,minFilter:Kt,generateMipmaps:!1,type:Gt,format:mn,colorSpace:br,depthBuffer:!1},s=Uu(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Uu(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=eg(r)),this._blurMaterial=ng(r,e,t),this._ggxMaterial=tg(r,e,t)}return s}_compileMaterial(e){let t=new st(new Dt,e);this._renderer.compile(t,oo)}_sceneToCubeUV(e,t,n,s,r){let l=new zt(90,1,t,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],f=this._renderer,h=f.autoClear,d=f.toneMapping;f.getClearColor(Nu),f.toneMapping=Wn,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new st(new Rn,new Ki({name:"PMREM.Background",side:en,depthWrite:!1,depthTest:!1})));let _=this._backgroundBox,p=_.material,m=!1,E=e.background;E?E.isColor&&(p.color.copy(E),e.background=null,m=!0):(p.color.copy(Nu),m=!0);for(let C=0;C<6;C++){let v=C%3;v===0?(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[C],r.y,r.z)):v===1?(l.up.set(0,0,c[C]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[C],r.z)):(l.up.set(0,c[C],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[C]));let b=this._cubeSize;Xs(s,v*b,C>2?b:0,b,b),f.setRenderTarget(s),m&&f.render(_,l),f.render(e,l)}f.toneMapping=d,f.autoClear=h,e.background=E}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===Di||e.mapping===ss;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ou()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Fu());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=e;let l=this._cubeSize;Xs(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,oo)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),f=Math.sqrt(c*c-u*u),h=0+c*1.25,d=f*h,{_lodMax:g}=this,_=this._sizeLods[n],p=3*_*(n>g-Fi?n-g+Fi:0),m=4*(this._cubeSize-_);l.envMap.value=e.texture,l.roughness.value=d,l.mipInt.value=g-t,Xs(r,p,m,3*_,2*_),s.setRenderTarget(r),s.render(a,oo),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,Xs(e,p,m,3*_,2*_),s.setRenderTarget(e),s.render(a,oo)}_blur(e,t,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Xe("blur direction must be either latitudinal or longitudinal!");let u=3,f=this._lodMeshes[s];f.material=c;let h=c.uniforms,d=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*d):2*Math.PI/(2*os-1),_=r/g,p=isFinite(r)?1+Math.floor(u*_):os;p>os&&We(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${os}`);let m=[],E=0;for(let A=0;A<os;++A){let x=A/_,M=Math.exp(-x*x/2);m.push(M),A===0?E+=M:A<p&&(E+=2*M)}for(let A=0;A<m.length;A++)m[A]=m[A]/E;h.envMap.value=e.texture,h.samples.value=p,h.weights.value=m,h.latitudinal.value=o==="latitudinal",a&&(h.poleAxis.value=a);let{_lodMax:C}=this;h.dTheta.value=g,h.mipInt.value=C-n;let v=this._sizeLods[s],b=3*v*(s>C-Fi?s-C+Fi:0),S=4*(this._cubeSize-v);Xs(t,b,S,3*v,2*v),l.setRenderTarget(t),l.render(f,oo)}};function eg(i){let e=[],t=[],n=[],s=i,r=i-Fi+1+Lu.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);e.push(a);let l=1/a;o>i-Fi?l=Lu[o-i+Fi-1]:o===0&&(l=0),t.push(l);let c=1/(a-2),u=-c,f=1+c,h=[u,u,f,u,f,f,u,u,f,f,u,f],d=6,g=6,_=3,p=2,m=1,E=new Float32Array(_*g*d),C=new Float32Array(p*g*d),v=new Float32Array(m*g*d);for(let S=0;S<d;S++){let A=S%3*2/3-1,x=S>2?0:-1,M=[A,x,0,A+2/3,x,0,A+2/3,x+1,0,A,x,0,A+2/3,x+1,0,A,x+1,0];E.set(M,_*g*S),C.set(h,p*g*S);let I=[S,S,S,S,S,S];v.set(I,m*g*S)}let b=new Dt;b.setAttribute("position",new Ot(E,_)),b.setAttribute("uv",new Ot(C,p)),b.setAttribute("faceIndex",new Ot(v,m)),n.push(new st(b,null)),s>Fi&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function Uu(i,e,t){let n=new Et(i,e,t);return n.texture.mapping=jr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Xs(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function tg(i,e,t){return new Lt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:j0,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Ml(),fragmentShader:`

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
		`,blending:Vt,depthTest:!1,depthWrite:!1})}function ng(i,e,t){let n=new Float32Array(os),s=new N(0,1,0);return new Lt({name:"SphericalGaussianBlur",defines:{n:os,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Ml(),fragmentShader:`

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
		`,blending:Vt,depthTest:!1,depthWrite:!1})}function Fu(){return new Lt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ml(),fragmentShader:`

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
		`,blending:Vt,depthTest:!1,depthWrite:!1})}function Ou(){return new Lt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ml(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Vt,depthTest:!1,depthWrite:!1})}function Ml(){return`

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
	`}var vl=class extends Et{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new Rr(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Rn(5,5,5),r=new Lt({name:"CubemapFromEquirect",uniforms:rs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:en,blending:Vt});r.uniforms.tEquirect.value=t;let o=new st(s,r),a=t.minFilter;return t.minFilter===Li&&(t.minFilter=Kt),new wa(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}};function ig(i){let e=new WeakMap,t=new WeakMap,n=null;function s(h,d=!1){return h==null?null:d?o(h):r(h)}function r(h){if(h&&h.isTexture){let d=h.mapping;if(d===Ra||d===Pa)if(e.has(h)){let g=e.get(h).texture;return a(g,h.mapping)}else{let g=h.image;if(g&&g.height>0){let _=new vl(g.height);return _.fromEquirectangularTexture(i,h),e.set(h,_),h.addEventListener("dispose",c),a(_.texture,h.mapping)}else return null}}return h}function o(h){if(h&&h.isTexture){let d=h.mapping,g=d===Ra||d===Pa,_=d===Di||d===ss;if(g||_){let p=t.get(h),m=p!==void 0?p.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==m)return n===null&&(n=new Ys(i)),p=g?n.fromEquirectangular(h,p):n.fromCubemap(h,p),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),p.texture;if(p!==void 0)return p.texture;{let E=h.image;return g&&E&&E.height>0||_&&E&&l(E)?(n===null&&(n=new Ys(i)),p=g?n.fromEquirectangular(h):n.fromCubemap(h),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),h.addEventListener("dispose",u),p.texture):null}}}return h}function a(h,d){return d===Ra?h.mapping=Di:d===Pa&&(h.mapping=ss),h}function l(h){let d=0,g=6;for(let _=0;_<g;_++)h[_]!==void 0&&d++;return d===g}function c(h){let d=h.target;d.removeEventListener("dispose",c);let g=e.get(d);g!==void 0&&(e.delete(d),g.dispose())}function u(h){let d=h.target;d.removeEventListener("dispose",u);let g=t.get(d);g!==void 0&&(t.delete(d),g.dispose())}function f(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:f}}function sg(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&qi("WebGLRenderer: "+n+" extension not supported."),s}}}function rg(i,e,t,n){let s={},r=new WeakMap;function o(f){let h=f.target;h.index!==null&&e.remove(h.index);for(let g in h.attributes)e.remove(h.attributes[g]);h.removeEventListener("dispose",o),delete s[h.id];let d=r.get(h);d&&(e.remove(d),r.delete(h)),n.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function a(f,h){return s[h.id]===!0||(h.addEventListener("dispose",o),s[h.id]=!0,t.memory.geometries++),h}function l(f){let h=f.attributes;for(let d in h)e.update(h[d],i.ARRAY_BUFFER)}function c(f){let h=[],d=f.index,g=f.attributes.position,_=0;if(g===void 0)return;if(d!==null){let E=d.array;_=d.version;for(let C=0,v=E.length;C<v;C+=3){let b=E[C+0],S=E[C+1],A=E[C+2];h.push(b,S,S,A,A,b)}}else{let E=g.array;_=g.version;for(let C=0,v=E.length/3-1;C<v;C+=3){let b=C+0,S=C+1,A=C+2;h.push(b,S,S,A,A,b)}}let p=new(g.count>=65535?Ar:Er)(h,1);p.version=_;let m=r.get(f);m&&e.remove(m),r.set(f,p)}function u(f){let h=r.get(f);if(h){let d=f.index;d!==null&&h.version<d.version&&c(f)}else c(f);return r.get(f)}return{get:a,update:l,getWireframeAttribute:u}}function og(i,e,t){let n;function s(f){n=f}let r,o;function a(f){r=f.type,o=f.bytesPerElement}function l(f,h){i.drawElements(n,h,r,f*o),t.update(h,n,1)}function c(f,h,d){d!==0&&(i.drawElementsInstanced(n,h,r,f*o,d),t.update(h,n,d))}function u(f,h,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,h,0,r,f,0,d);let _=0;for(let p=0;p<d;p++)_+=h[p];t.update(_,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function ag(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:Xe("WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function lg(i,e,t){let n=new WeakMap,s=new Mt;function r(o,a,l){let c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=u!==void 0?u.length:0,h=n.get(a);if(h===void 0||h.count!==f){let M=function(){A.dispose(),n.delete(a),a.removeEventListener("dispose",M)};h!==void 0&&h.texture.dispose();let d=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,_=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],E=a.morphAttributes.color||[],C=0;d===!0&&(C=1),g===!0&&(C=2),_===!0&&(C=3);let v=a.attributes.position.count*C,b=1;v>e.maxTextureSize&&(b=Math.ceil(v/e.maxTextureSize),v=e.maxTextureSize);let S=new Float32Array(v*b*4*f),A=new wr(S,v,b,f);A.type=Dn,A.needsUpdate=!0;let x=C*4;for(let I=0;I<f;I++){let T=p[I],D=m[I],B=E[I],G=v*b*4*I;for(let z=0;z<T.count;z++){let H=z*x;d===!0&&(s.fromBufferAttribute(T,z),S[G+H+0]=s.x,S[G+H+1]=s.y,S[G+H+2]=s.z,S[G+H+3]=0),g===!0&&(s.fromBufferAttribute(D,z),S[G+H+4]=s.x,S[G+H+5]=s.y,S[G+H+6]=s.z,S[G+H+7]=0),_===!0&&(s.fromBufferAttribute(B,z),S[G+H+8]=s.x,S[G+H+9]=s.y,S[G+H+10]=s.z,S[G+H+11]=B.itemSize===4?s.w:1)}}h={count:f,texture:A,size:new be(v,b)},n.set(a,h),a.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let d=0;for(let _=0;_<c.length;_++)d+=c[_];let g=a.morphTargetsRelative?1:1-d;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",h.size)}return{update:r}}function cg(i,e,t,n,s){let r=new WeakMap;function o(c){let u=s.render.frame,f=c.geometry,h=e.get(c,f);if(r.get(h)!==u&&(e.update(h),r.set(h,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==u&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,u))),c.isSkinnedMesh){let d=c.skeleton;r.get(d)!==u&&(d.update(),r.set(d,u))}return h}function a(){r=new WeakMap}function l(c){let u=c.target;u.removeEventListener("dispose",l),n.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:o,dispose:a}}var hg={[Jr]:"LINEAR_TONE_MAPPING",[Dc]:"REINHARD_TONE_MAPPING",[Lc]:"CINEON_TONE_MAPPING",[is]:"ACES_FILMIC_TONE_MAPPING",[$r]:"AGX_TONE_MAPPING",[Kr]:"NEUTRAL_TONE_MAPPING",[Nc]:"CUSTOM_TONE_MAPPING"};function ug(i,e,t,n,s,r){let o=new Et(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new Hn(e,t):void 0}),a=new Et(e,t,{type:Gt,depthBuffer:!1,stencilBuffer:!1}),l=new Dt;l.setAttribute("position",new ut([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new ut([0,2,0,0,2,0],2));let c=new Bs({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),u=new st(l,c),f=new In(-1,1,1,-1,0,1),h=null,d=null,g=!1,_,p=null,m=[],E=!1;this.setSize=function(C,v){o.setSize(C,v),a.setSize(C,v);for(let b=0;b<m.length;b++){let S=m[b];S.setSize&&S.setSize(C,v)}},this.setEffects=function(C){m=C,E=m.length>0&&m[0].isRenderPass===!0;let v=o.width,b=o.height;for(let S=0;S<m.length;S++){let A=m[S];A.setSize&&A.setSize(v,b)}},this.begin=function(C,v){if(g||C.toneMapping===Wn&&m.length===0)return!1;if(p=v,v!==null){let b=v.width,S=v.height;(o.width!==b||o.height!==S)&&this.setSize(b,S)}return E===!1&&C.setRenderTarget(o),_=C.toneMapping,C.toneMapping=Wn,!0},this.hasRenderPass=function(){return E},this.end=function(C,v){C.toneMapping=_,g=!0;let b=o,S=a;for(let A=0;A<m.length;A++){let x=m[A];if(x.enabled!==!1&&(x.render(C,S,b,v),x.needsSwap!==!1)){let M=b;b=S,S=M}}if(h!==C.outputColorSpace||d!==C.toneMapping){h=C.outputColorSpace,d=C.toneMapping,c.defines={},at.getTransfer(h)===pt&&(c.defines.SRGB_TRANSFER="");let A=hg[d];A&&(c.defines[A]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=b.texture,C.setRenderTarget(p),C.render(u,f),p=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),a.dispose(),l.dispose(),c.dispose()}}var id=new Qt,ih=new Hn(1,1),sd=new wr,rd=new sa,od=new Rr,Bu=[],ku=[],zu=new Float32Array(16),Vu=new Float32Array(9),Gu=new Float32Array(4);function Zs(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Bu[s];if(r===void 0&&(r=new Float32Array(s),Bu[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Ht(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Wt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function bl(i,e){let t=ku[e];t===void 0&&(t=new Int32Array(e),ku[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function dg(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function fg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ht(t,e))return;i.uniform2fv(this.addr,e),Wt(t,e)}}function pg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Ht(t,e))return;i.uniform3fv(this.addr,e),Wt(t,e)}}function mg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ht(t,e))return;i.uniform4fv(this.addr,e),Wt(t,e)}}function gg(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Ht(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Wt(t,e)}else{if(Ht(t,n))return;Gu.set(n),i.uniformMatrix2fv(this.addr,!1,Gu),Wt(t,n)}}function xg(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Ht(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Wt(t,e)}else{if(Ht(t,n))return;Vu.set(n),i.uniformMatrix3fv(this.addr,!1,Vu),Wt(t,n)}}function _g(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Ht(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Wt(t,e)}else{if(Ht(t,n))return;zu.set(n),i.uniformMatrix4fv(this.addr,!1,zu),Wt(t,n)}}function vg(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function yg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ht(t,e))return;i.uniform2iv(this.addr,e),Wt(t,e)}}function Mg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ht(t,e))return;i.uniform3iv(this.addr,e),Wt(t,e)}}function bg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ht(t,e))return;i.uniform4iv(this.addr,e),Wt(t,e)}}function Sg(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function Tg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ht(t,e))return;i.uniform2uiv(this.addr,e),Wt(t,e)}}function wg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ht(t,e))return;i.uniform3uiv(this.addr,e),Wt(t,e)}}function Eg(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ht(t,e))return;i.uniform4uiv(this.addr,e),Wt(t,e)}}function Ag(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ih.compareFunction=t.isReversedDepthBuffer()?gl:ml,r=ih):r=id,t.setTexture2D(e||r,s)}function Cg(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||rd,s)}function Rg(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||od,s)}function Pg(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||sd,s)}function Ig(i){switch(i){case 5126:return dg;case 35664:return fg;case 35665:return pg;case 35666:return mg;case 35674:return gg;case 35675:return xg;case 35676:return _g;case 5124:case 35670:return vg;case 35667:case 35671:return yg;case 35668:case 35672:return Mg;case 35669:case 35673:return bg;case 5125:return Sg;case 36294:return Tg;case 36295:return wg;case 36296:return Eg;case 35678:case 36198:case 36298:case 36306:case 35682:return Ag;case 35679:case 36299:case 36307:return Cg;case 35680:case 36300:case 36308:case 36293:return Rg;case 36289:case 36303:case 36311:case 36292:return Pg}}function Dg(i,e){i.uniform1fv(this.addr,e)}function Lg(i,e){let t=Zs(e,this.size,2);i.uniform2fv(this.addr,t)}function Ng(i,e){let t=Zs(e,this.size,3);i.uniform3fv(this.addr,t)}function Ug(i,e){let t=Zs(e,this.size,4);i.uniform4fv(this.addr,t)}function Fg(i,e){let t=Zs(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Og(i,e){let t=Zs(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Bg(i,e){let t=Zs(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function kg(i,e){i.uniform1iv(this.addr,e)}function zg(i,e){i.uniform2iv(this.addr,e)}function Vg(i,e){i.uniform3iv(this.addr,e)}function Gg(i,e){i.uniform4iv(this.addr,e)}function Hg(i,e){i.uniform1uiv(this.addr,e)}function Wg(i,e){i.uniform2uiv(this.addr,e)}function Xg(i,e){i.uniform3uiv(this.addr,e)}function qg(i,e){i.uniform4uiv(this.addr,e)}function Yg(i,e,t){let n=this.cache,s=e.length,r=bl(t,s);Ht(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=ih:o=id;for(let a=0;a!==s;++a)t.setTexture2D(e[a]||o,r[a])}function Zg(i,e,t){let n=this.cache,s=e.length,r=bl(t,s);Ht(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||rd,r[o])}function Jg(i,e,t){let n=this.cache,s=e.length,r=bl(t,s);Ht(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||od,r[o])}function $g(i,e,t){let n=this.cache,s=e.length,r=bl(t,s);Ht(n,r)||(i.uniform1iv(this.addr,r),Wt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||sd,r[o])}function Kg(i){switch(i){case 5126:return Dg;case 35664:return Lg;case 35665:return Ng;case 35666:return Ug;case 35674:return Fg;case 35675:return Og;case 35676:return Bg;case 5124:case 35670:return kg;case 35667:case 35671:return zg;case 35668:case 35672:return Vg;case 35669:case 35673:return Gg;case 5125:return Hg;case 36294:return Wg;case 36295:return Xg;case 36296:return qg;case 35678:case 36198:case 36298:case 36306:case 35682:return Yg;case 35679:case 36299:case 36307:return Zg;case 35680:case 36300:case 36308:case 36293:return Jg;case 36289:case 36303:case 36311:case 36292:return $g}}var sh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Ig(t.type)}},rh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Kg(t.type)}},oh=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(e,t[a.id],n)}}},th=/(\w+)(\])?(\[|\.)?/g;function Hu(i,e){i.seq.push(e),i.map[e.id]=e}function jg(i,e,t){let n=i.name,s=n.length;for(th.lastIndex=0;;){let r=th.exec(n),o=th.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Hu(t,c===void 0?new sh(a,i,e):new rh(a,i,e));break}else{let f=t.map[a];f===void 0&&(f=new oh(a),Hu(t,f)),t=f}}}var qs=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);jg(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){let a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let o=e[s];o.id in t&&n.push(o)}return n}};function Wu(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var Qg=37297,ex=0;function tx(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}var Xu=new Ze;function nx(i){at._getMatrix(Xu,at.workingColorSpace,i);let e=`mat3( ${Xu.elements.map(t=>t.toFixed(4))} )`;switch(at.getTransfer(i)){case Sr:return[e,"LinearTransferOETF"];case pt:return[e,"sRGBTransferOETF"];default:return We("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function qu(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+tx(i.getShaderSource(e),a)}else return r}function ix(i,e){let t=nx(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var sx={[Jr]:"Linear",[Dc]:"Reinhard",[Lc]:"Cineon",[is]:"ACESFilmic",[$r]:"AgX",[Kr]:"Neutral",[Nc]:"Custom"};function rx(i,e){let t=sx[e];return t===void 0?(We("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var _l=new N;function ox(){at.getLuminanceCoefficients(_l);let i=_l.x.toFixed(4),e=_l.y.toFixed(4),t=_l.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function ax(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(lo).join(`
`)}function lx(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function cx(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function lo(i){return i!==""}function Yu(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Zu(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var hx=/^[ \t]*#include +<([\w\d./]+)>/gm;function ah(i){return i.replace(hx,dx)}var ux=new Map;function dx(i,e){let t=rt[e];if(t===void 0){let n=ux.get(e);if(n!==void 0)t=rt[n],We('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return ah(t)}var fx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ju(i){return i.replace(fx,px)}function px(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function $u(i){let e=`precision ${i.precision} float;
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
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var mx={[ts]:"SHADOWMAP_TYPE_PCF",[Vs]:"SHADOWMAP_TYPE_VSM"};function gx(i){return mx[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var xx={[Di]:"ENVMAP_TYPE_CUBE",[ss]:"ENVMAP_TYPE_CUBE",[jr]:"ENVMAP_TYPE_CUBE_UV"};function _x(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":xx[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var vx={[ss]:"ENVMAP_MODE_REFRACTION"};function yx(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":vx[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Mx={[Ca]:"ENVMAP_BLENDING_MULTIPLY",[gu]:"ENVMAP_BLENDING_MIX",[xu]:"ENVMAP_BLENDING_ADD"};function bx(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Mx[i.combine]||"ENVMAP_BLENDING_NONE"}function Sx(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Tx(i,e,t,n){let s=i.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,l=gx(t),c=_x(t),u=yx(t),f=bx(t),h=Sx(t),d=ax(t),g=lx(r),_=s.createProgram(),p,m,E=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(lo).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(lo).join(`
`),m.length>0&&(m+=`
`)):(p=[$u(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(lo).join(`
`),m=[$u(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+f:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Wn?"#define TONE_MAPPING":"",t.toneMapping!==Wn?rt.tonemapping_pars_fragment:"",t.toneMapping!==Wn?rx("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",rt.colorspace_pars_fragment,ix("linearToOutputTexel",t.outputColorSpace),ox(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(lo).join(`
`)),o=ah(o),o=Yu(o,t),o=Zu(o,t),a=ah(a),a=Yu(a,t),a=Zu(a,t),o=Ju(o),a=Ju(a),t.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,p=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",t.glslVersion===Gc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Gc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let C=E+p+o,v=E+m+a,b=Wu(s,s.VERTEX_SHADER,C),S=Wu(s,s.FRAGMENT_SHADER,v);s.attachShader(_,b),s.attachShader(_,S),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function A(T){if(i.debug.checkShaderErrors){let D=s.getProgramInfoLog(_)||"",B=s.getShaderInfoLog(b)||"",G=s.getShaderInfoLog(S)||"",z=D.trim(),H=B.trim(),P=G.trim(),U=!0,q=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(U=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,b,S);else{let ne=qu(s,b,"vertex"),se=qu(s,S,"fragment");Xe("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+T.name+`
Material Type: `+T.type+`

Program Info Log: `+z+`
`+ne+`
`+se)}else z!==""?We("WebGLProgram: Program Info Log:",z):(H===""||P==="")&&(q=!1);q&&(T.diagnostics={runnable:U,programLog:z,vertexShader:{log:H,prefix:p},fragmentShader:{log:P,prefix:m}})}s.deleteShader(b),s.deleteShader(S),x=new qs(s,_),M=cx(s,_)}let x;this.getUniforms=function(){return x===void 0&&A(this),x};let M;this.getAttributes=function(){return M===void 0&&A(this),M};let I=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return I===!1&&(I=s.getProgramParameter(_,Qg)),I},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=ex++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=b,this.fragmentShader=S,this}var wx=0,lh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new ch(e),t.set(e,n)),n}},ch=class{constructor(e){this.id=wx++,this.code=e,this.usedTimes=0}};function Ex(i){return i===Ui||i===so||i===ro}function Ax(i,e,t,n,s,r){let o=new Ls,a=new lh,l=new Set,c=[],u=new Map,f=n.logarithmicDepthBuffer,h=n.precision,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(x){return l.add(x),x===0?"uv":`uv${x}`}function _(x,M,I,T,D,B){let G=T.fog,z=D.geometry,H=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?T.environment:null,P=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,U=e.get(x.envMap||H,P),q=U&&U.mapping===jr?U.image.height:null,ne=d[x.type];x.precision!==null&&(h=n.getMaxPrecision(x.precision),h!==x.precision&&We("WebGLProgram.getParameters:",x.precision,"not supported, using",h,"instead."));let se=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,ae=se!==void 0?se.length:0,fe=0;z.morphAttributes.position!==void 0&&(fe=1),z.morphAttributes.normal!==void 0&&(fe=2),z.morphAttributes.color!==void 0&&(fe=3);let Ke,Ue,Q,ce;if(ne){let Re=oi[ne];Ke=Re.vertexShader,Ue=Re.fragmentShader}else{Ke=x.vertexShader,Ue=x.fragmentShader;let Re=a.getVertexShaderStage(x),ht=a.getFragmentShaderStage(x);a.update(x,Re,ht),Q=Re.id,ce=ht.id}let oe=i.getRenderTarget(),ze=i.state.buffers.depth.getReversed(),Me=D.isInstancedMesh===!0,ye=D.isBatchedMesh===!0,dt=!!x.map,qe=!!x.matcap,Ge=!!U,Oe=!!x.aoMap,Ve=!!x.lightMap,Qe=!!x.bumpMap&&x.wireframe===!1,yt=!!x.normalMap,bt=!!x.displacementMap,ie=!!x.emissiveMap,Ye=!!x.metalnessMap,Be=!!x.roughnessMap,O=x.anisotropy>0,Ct=x.clearcoat>0,Pe=x.dispersion>0,R=x.iridescence>0,y=x.sheen>0,V=x.transmission>0,W=O&&!!x.anisotropyMap,j=Ct&&!!x.clearcoatMap,le=Ct&&!!x.clearcoatNormalMap,pe=Ct&&!!x.clearcoatRoughnessMap,J=R&&!!x.iridescenceMap,te=R&&!!x.iridescenceThicknessMap,K=y&&!!x.sheenColorMap,De=y&&!!x.sheenRoughnessMap,me=!!x.specularMap,de=!!x.specularColorMap,Ie=!!x.specularIntensityMap,Fe=V&&!!x.transmissionMap,He=V&&!!x.thicknessMap,F=!!x.gradientMap,xe=!!x.alphaMap,$=x.alphaTest>0,ve=!!x.alphaHash,Se=!!x.extensions,re=Wn;x.toneMapped&&(oe===null||oe.isXRRenderTarget===!0)&&(re=i.toneMapping);let he={shaderID:ne,shaderType:x.type,shaderName:x.name,vertexShader:Ke,fragmentShader:Ue,defines:x.defines,customVertexShaderID:Q,customFragmentShaderID:ce,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:h,batching:ye,batchingColor:ye&&D._colorsTexture!==null,instancing:Me,instancingColor:Me&&D.instanceColor!==null,instancingMorph:Me&&D.morphTexture!==null,outputColorSpace:oe===null?i.outputColorSpace:oe.isXRRenderTarget===!0?oe.texture.colorSpace:at.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:dt,matcap:qe,envMap:Ge,envMapMode:Ge&&U.mapping,envMapCubeUVHeight:q,aoMap:Oe,lightMap:Ve,bumpMap:Qe,normalMap:yt,displacementMap:bt,emissiveMap:ie,normalMapObjectSpace:yt&&x.normalMapType===yu,normalMapTangentSpace:yt&&x.normalMapType===Hs,packedNormalMap:yt&&x.normalMapType===Hs&&Ex(x.normalMap.format),metalnessMap:Ye,roughnessMap:Be,anisotropy:O,anisotropyMap:W,clearcoat:Ct,clearcoatMap:j,clearcoatNormalMap:le,clearcoatRoughnessMap:pe,dispersion:Pe,iridescence:R,iridescenceMap:J,iridescenceThicknessMap:te,sheen:y,sheenColorMap:K,sheenRoughnessMap:De,specularMap:me,specularColorMap:de,specularIntensityMap:Ie,transmission:V,transmissionMap:Fe,thicknessMap:He,gradientMap:F,opaque:x.transparent===!1&&x.blending===Yi&&x.alphaToCoverage===!1,alphaMap:xe,alphaTest:$,alphaHash:ve,combine:x.combine,mapUv:dt&&g(x.map.channel),aoMapUv:Oe&&g(x.aoMap.channel),lightMapUv:Ve&&g(x.lightMap.channel),bumpMapUv:Qe&&g(x.bumpMap.channel),normalMapUv:yt&&g(x.normalMap.channel),displacementMapUv:bt&&g(x.displacementMap.channel),emissiveMapUv:ie&&g(x.emissiveMap.channel),metalnessMapUv:Ye&&g(x.metalnessMap.channel),roughnessMapUv:Be&&g(x.roughnessMap.channel),anisotropyMapUv:W&&g(x.anisotropyMap.channel),clearcoatMapUv:j&&g(x.clearcoatMap.channel),clearcoatNormalMapUv:le&&g(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:pe&&g(x.clearcoatRoughnessMap.channel),iridescenceMapUv:J&&g(x.iridescenceMap.channel),iridescenceThicknessMapUv:te&&g(x.iridescenceThicknessMap.channel),sheenColorMapUv:K&&g(x.sheenColorMap.channel),sheenRoughnessMapUv:De&&g(x.sheenRoughnessMap.channel),specularMapUv:me&&g(x.specularMap.channel),specularColorMapUv:de&&g(x.specularColorMap.channel),specularIntensityMapUv:Ie&&g(x.specularIntensityMap.channel),transmissionMapUv:Fe&&g(x.transmissionMap.channel),thicknessMapUv:He&&g(x.thicknessMap.channel),alphaMapUv:xe&&g(x.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(yt||O),vertexNormals:!!z.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!z.attributes.uv&&(dt||xe),fog:!!G,useFog:x.fog===!0,fogExp2:!!G&&G.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||z.attributes.normal===void 0&&yt===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:ze,skinning:D.isSkinnedMesh===!0,hasPositionAttribute:z.attributes.position!==void 0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:ae,morphTextureStride:fe,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&I.length>0,shadowMapType:i.shadowMap.type,toneMapping:re,decodeVideoTexture:dt&&x.map.isVideoTexture===!0&&at.getTransfer(x.map.colorSpace)===pt,decodeVideoTextureEmissive:ie&&x.emissiveMap.isVideoTexture===!0&&at.getTransfer(x.emissiveMap.colorSpace)===pt,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===pn,flipSided:x.side===en,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:Se&&x.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Se&&x.extensions.multiDraw===!0||ye)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return he.vertexUv1s=l.has(1),he.vertexUv2s=l.has(2),he.vertexUv3s=l.has(3),l.clear(),he}function p(x){let M=[];if(x.shaderID?M.push(x.shaderID):(M.push(x.customVertexShaderID),M.push(x.customFragmentShaderID)),x.defines!==void 0)for(let I in x.defines)M.push(I),M.push(x.defines[I]);return x.isRawShaderMaterial===!1&&(m(M,x),E(M,x),M.push(i.outputColorSpace)),M.push(x.customProgramCacheKey),M.join()}function m(x,M){x.push(M.precision),x.push(M.outputColorSpace),x.push(M.envMapMode),x.push(M.envMapCubeUVHeight),x.push(M.mapUv),x.push(M.alphaMapUv),x.push(M.lightMapUv),x.push(M.aoMapUv),x.push(M.bumpMapUv),x.push(M.normalMapUv),x.push(M.displacementMapUv),x.push(M.emissiveMapUv),x.push(M.metalnessMapUv),x.push(M.roughnessMapUv),x.push(M.anisotropyMapUv),x.push(M.clearcoatMapUv),x.push(M.clearcoatNormalMapUv),x.push(M.clearcoatRoughnessMapUv),x.push(M.iridescenceMapUv),x.push(M.iridescenceThicknessMapUv),x.push(M.sheenColorMapUv),x.push(M.sheenRoughnessMapUv),x.push(M.specularMapUv),x.push(M.specularColorMapUv),x.push(M.specularIntensityMapUv),x.push(M.transmissionMapUv),x.push(M.thicknessMapUv),x.push(M.combine),x.push(M.fogExp2),x.push(M.sizeAttenuation),x.push(M.morphTargetsCount),x.push(M.morphAttributeCount),x.push(M.numDirLights),x.push(M.numPointLights),x.push(M.numSpotLights),x.push(M.numSpotLightMaps),x.push(M.numHemiLights),x.push(M.numRectAreaLights),x.push(M.numDirLightShadows),x.push(M.numPointLightShadows),x.push(M.numSpotLightShadows),x.push(M.numSpotLightShadowsWithMaps),x.push(M.numLightProbes),x.push(M.shadowMapType),x.push(M.toneMapping),x.push(M.numClippingPlanes),x.push(M.numClipIntersection),x.push(M.depthPacking)}function E(x,M){o.disableAll(),M.instancing&&o.enable(0),M.instancingColor&&o.enable(1),M.instancingMorph&&o.enable(2),M.matcap&&o.enable(3),M.envMap&&o.enable(4),M.normalMapObjectSpace&&o.enable(5),M.normalMapTangentSpace&&o.enable(6),M.clearcoat&&o.enable(7),M.iridescence&&o.enable(8),M.alphaTest&&o.enable(9),M.vertexColors&&o.enable(10),M.vertexAlphas&&o.enable(11),M.vertexUv1s&&o.enable(12),M.vertexUv2s&&o.enable(13),M.vertexUv3s&&o.enable(14),M.vertexTangents&&o.enable(15),M.anisotropy&&o.enable(16),M.alphaHash&&o.enable(17),M.batching&&o.enable(18),M.dispersion&&o.enable(19),M.batchingColor&&o.enable(20),M.gradientMap&&o.enable(21),M.packedNormalMap&&o.enable(22),M.vertexNormals&&o.enable(23),x.push(o.mask),o.disableAll(),M.fog&&o.enable(0),M.useFog&&o.enable(1),M.flatShading&&o.enable(2),M.logarithmicDepthBuffer&&o.enable(3),M.reversedDepthBuffer&&o.enable(4),M.skinning&&o.enable(5),M.morphTargets&&o.enable(6),M.morphNormals&&o.enable(7),M.morphColors&&o.enable(8),M.premultipliedAlpha&&o.enable(9),M.shadowMapEnabled&&o.enable(10),M.doubleSided&&o.enable(11),M.flipSided&&o.enable(12),M.useDepthPacking&&o.enable(13),M.dithering&&o.enable(14),M.transmission&&o.enable(15),M.sheen&&o.enable(16),M.opaque&&o.enable(17),M.pointsUvs&&o.enable(18),M.decodeVideoTexture&&o.enable(19),M.decodeVideoTextureEmissive&&o.enable(20),M.alphaToCoverage&&o.enable(21),M.numLightProbeGrids>0&&o.enable(22),M.hasPositionAttribute&&o.enable(23),x.push(o.mask)}function C(x){let M=d[x.type],I;if(M){let T=oi[M];I=si.clone(T.uniforms)}else I=x.uniforms;return I}function v(x,M){let I=u.get(M);return I!==void 0?++I.usedTimes:(I=new Tx(i,M,x,s),c.push(I),u.set(M,I)),I}function b(x){if(--x.usedTimes===0){let M=c.indexOf(x);c[M]=c[c.length-1],c.pop(),u.delete(x.cacheKey),x.destroy()}}function S(x){a.remove(x)}function A(){a.dispose()}return{getParameters:_,getProgramCacheKey:p,getUniforms:C,acquireProgram:v,releaseProgram:b,releaseShaderCache:S,programs:c,dispose:A}}function Cx(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function Rx(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Ku(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function ju(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(h){let d=0;return h.isInstancedMesh&&(d+=2),h.isSkinnedMesh&&(d+=1),d}function a(h,d,g,_,p,m){let E=i[e];return E===void 0?(E={id:h.id,object:h,geometry:d,material:g,materialVariant:o(h),groupOrder:_,renderOrder:h.renderOrder,z:p,group:m},i[e]=E):(E.id=h.id,E.object=h,E.geometry=d,E.material=g,E.materialVariant=o(h),E.groupOrder=_,E.renderOrder=h.renderOrder,E.z=p,E.group=m),e++,E}function l(h,d,g,_,p,m){let E=a(h,d,g,_,p,m);g.transmission>0?n.push(E):g.transparent===!0?s.push(E):t.push(E)}function c(h,d,g,_,p,m){let E=a(h,d,g,_,p,m);g.transmission>0?n.unshift(E):g.transparent===!0?s.unshift(E):t.unshift(E)}function u(h,d,g){t.length>1&&t.sort(h||Rx),n.length>1&&n.sort(d||Ku),s.length>1&&s.sort(d||Ku),g&&(t.reverse(),n.reverse(),s.reverse())}function f(){for(let h=e,d=i.length;h<d;h++){let g=i[h];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:f,sort:u}}function Px(){let i=new WeakMap;function e(n,s){let r=i.get(n),o;return r===void 0?(o=new ju,i.set(n,[o])):s>=r.length?(o=new ju,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function Ix(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new N,color:new Ee};break;case"SpotLight":t={position:new N,direction:new N,color:new Ee,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new N,color:new Ee,distance:0,decay:0};break;case"HemisphereLight":t={direction:new N,skyColor:new Ee,groundColor:new Ee};break;case"RectAreaLight":t={color:new Ee,position:new N,halfWidth:new N,halfHeight:new N};break}return i[e.id]=t,t}}}function Dx(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new be};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new be};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new be,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var Lx=0;function Nx(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Ux(i){let e=new Ix,t=Dx(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new N);let s=new N,r=new $e,o=new $e;function a(c){let u=0,f=0,h=0;for(let M=0;M<9;M++)n.probe[M].set(0,0,0);let d=0,g=0,_=0,p=0,m=0,E=0,C=0,v=0,b=0,S=0,A=0;c.sort(Nx);for(let M=0,I=c.length;M<I;M++){let T=c[M],D=T.color,B=T.intensity,G=T.distance,z=null;if(T.shadow&&T.shadow.map&&(T.shadow.map.texture.format===Ui?z=T.shadow.map.texture:z=T.shadow.map.depthTexture||T.shadow.map.texture),T.isAmbientLight)u+=D.r*B,f+=D.g*B,h+=D.b*B;else if(T.isLightProbe){for(let H=0;H<9;H++)n.probe[H].addScaledVector(T.sh.coefficients[H],B);A++}else if(T.isDirectionalLight){let H=e.get(T);if(H.color.copy(T.color).multiplyScalar(T.intensity),T.castShadow){let P=T.shadow,U=t.get(T);U.shadowIntensity=P.intensity,U.shadowBias=P.bias,U.shadowNormalBias=P.normalBias,U.shadowRadius=P.radius,U.shadowMapSize=P.mapSize,n.directionalShadow[d]=U,n.directionalShadowMap[d]=z,n.directionalShadowMatrix[d]=T.shadow.matrix,E++}n.directional[d]=H,d++}else if(T.isSpotLight){let H=e.get(T);H.position.setFromMatrixPosition(T.matrixWorld),H.color.copy(D).multiplyScalar(B),H.distance=G,H.coneCos=Math.cos(T.angle),H.penumbraCos=Math.cos(T.angle*(1-T.penumbra)),H.decay=T.decay,n.spot[_]=H;let P=T.shadow;if(T.map&&(n.spotLightMap[b]=T.map,b++,P.updateMatrices(T),T.castShadow&&S++),n.spotLightMatrix[_]=P.matrix,T.castShadow){let U=t.get(T);U.shadowIntensity=P.intensity,U.shadowBias=P.bias,U.shadowNormalBias=P.normalBias,U.shadowRadius=P.radius,U.shadowMapSize=P.mapSize,n.spotShadow[_]=U,n.spotShadowMap[_]=z,v++}_++}else if(T.isRectAreaLight){let H=e.get(T);H.color.copy(D).multiplyScalar(B),H.halfWidth.set(T.width*.5,0,0),H.halfHeight.set(0,T.height*.5,0),n.rectArea[p]=H,p++}else if(T.isPointLight){let H=e.get(T);if(H.color.copy(T.color).multiplyScalar(T.intensity),H.distance=T.distance,H.decay=T.decay,T.castShadow){let P=T.shadow,U=t.get(T);U.shadowIntensity=P.intensity,U.shadowBias=P.bias,U.shadowNormalBias=P.normalBias,U.shadowRadius=P.radius,U.shadowMapSize=P.mapSize,U.shadowCameraNear=P.camera.near,U.shadowCameraFar=P.camera.far,n.pointShadow[g]=U,n.pointShadowMap[g]=z,n.pointShadowMatrix[g]=T.shadow.matrix,C++}n.point[g]=H,g++}else if(T.isHemisphereLight){let H=e.get(T);H.skyColor.copy(T.color).multiplyScalar(B),H.groundColor.copy(T.groundColor).multiplyScalar(B),n.hemi[m]=H,m++}}p>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=we.LTC_FLOAT_1,n.rectAreaLTC2=we.LTC_FLOAT_2):(n.rectAreaLTC1=we.LTC_HALF_1,n.rectAreaLTC2=we.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=f,n.ambient[2]=h;let x=n.hash;(x.directionalLength!==d||x.pointLength!==g||x.spotLength!==_||x.rectAreaLength!==p||x.hemiLength!==m||x.numDirectionalShadows!==E||x.numPointShadows!==C||x.numSpotShadows!==v||x.numSpotMaps!==b||x.numLightProbes!==A)&&(n.directional.length=d,n.spot.length=_,n.rectArea.length=p,n.point.length=g,n.hemi.length=m,n.directionalShadow.length=E,n.directionalShadowMap.length=E,n.pointShadow.length=C,n.pointShadowMap.length=C,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=E,n.pointShadowMatrix.length=C,n.spotLightMatrix.length=v+b-S,n.spotLightMap.length=b,n.numSpotLightShadowsWithMaps=S,n.numLightProbes=A,x.directionalLength=d,x.pointLength=g,x.spotLength=_,x.rectAreaLength=p,x.hemiLength=m,x.numDirectionalShadows=E,x.numPointShadows=C,x.numSpotShadows=v,x.numSpotMaps=b,x.numLightProbes=A,n.version=Lx++)}function l(c,u){let f=0,h=0,d=0,g=0,_=0,p=u.matrixWorldInverse;for(let m=0,E=c.length;m<E;m++){let C=c[m];if(C.isDirectionalLight){let v=n.directional[f];v.direction.setFromMatrixPosition(C.matrixWorld),s.setFromMatrixPosition(C.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(p),f++}else if(C.isSpotLight){let v=n.spot[d];v.position.setFromMatrixPosition(C.matrixWorld),v.position.applyMatrix4(p),v.direction.setFromMatrixPosition(C.matrixWorld),s.setFromMatrixPosition(C.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(p),d++}else if(C.isRectAreaLight){let v=n.rectArea[g];v.position.setFromMatrixPosition(C.matrixWorld),v.position.applyMatrix4(p),o.identity(),r.copy(C.matrixWorld),r.premultiply(p),o.extractRotation(r),v.halfWidth.set(C.width*.5,0,0),v.halfHeight.set(0,C.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),g++}else if(C.isPointLight){let v=n.point[h];v.position.setFromMatrixPosition(C.matrixWorld),v.position.applyMatrix4(p),h++}else if(C.isHemisphereLight){let v=n.hemi[_];v.direction.setFromMatrixPosition(C.matrixWorld),v.direction.transformDirection(p),_++}}}return{setup:a,setupView:l,state:n}}function Qu(i){let e=new Ux(i),t=[],n=[],s=[];function r(h){f.camera=h,t.length=0,n.length=0,s.length=0}function o(h){t.push(h)}function a(h){n.push(h)}function l(h){s.push(h)}function c(){e.setup(t)}function u(h){e.setupView(t,h)}let f={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:f,setupLights:c,setupLightsView:u,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function Fx(i){let e=new WeakMap;function t(s,r=0){let o=e.get(s),a;return o===void 0?(a=new Qu(i),e.set(s,[a])):r>=o.length?(a=new Qu(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}var Ox=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Bx=`uniform sampler2D shadow_pass;
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
}`,kx=[new N(1,0,0),new N(-1,0,0),new N(0,1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1)],zx=[new N(0,-1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1),new N(0,-1,0),new N(0,-1,0)],ed=new $e,ao=new N,nh=new N;function Vx(i,e,t){let n=new Fs,s=new be,r=new be,o=new Mt,a=new fa,l=new pa,c={},u=t.maxTextureSize,f={[mi]:en,[en]:mi,[pn]:pn},h=new Lt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new be},radius:{value:4}},vertexShader:Ox,fragmentShader:Bx}),d=h.clone();d.defines.HORIZONTAL_PASS=1;let g=new Dt;g.setAttribute("position",new Ot(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new st(g,h),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ts;let m=this.type;this.render=function(S,A,x){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||S.length===0)return;this.type===tu&&(We("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=ts);let M=i.getRenderTarget(),I=i.getActiveCubeFace(),T=i.getActiveMipmapLevel(),D=i.state;D.setBlending(Vt),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);let B=m!==this.type;B&&A.traverse(function(G){G.material&&(Array.isArray(G.material)?G.material.forEach(z=>z.needsUpdate=!0):G.material.needsUpdate=!0)});for(let G=0,z=S.length;G<z;G++){let H=S[G],P=H.shadow;if(P===void 0){We("WebGLShadowMap:",H,"has no shadow.");continue}if(P.autoUpdate===!1&&P.needsUpdate===!1)continue;s.copy(P.mapSize);let U=P.getFrameExtents();s.multiply(U),r.copy(P.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/U.x),s.x=r.x*U.x,P.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/U.y),s.y=r.y*U.y,P.mapSize.y=r.y));let q=i.state.buffers.depth.getReversed();if(P.camera._reversedDepth=q,P.map===null||B===!0){if(P.map!==null&&(P.map.depthTexture!==null&&(P.map.depthTexture.dispose(),P.map.depthTexture=null),P.map.dispose()),this.type===Vs){if(H.isPointLight){We("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}P.map=new Et(s.x,s.y,{format:Ui,type:Gt,minFilter:Kt,magFilter:Kt,generateMipmaps:!1}),P.map.texture.name=H.name+".shadowMap",P.map.depthTexture=new Hn(s.x,s.y,Dn),P.map.depthTexture.name=H.name+".shadowMapDepth",P.map.depthTexture.format=ti,P.map.depthTexture.compareFunction=null,P.map.depthTexture.minFilter=It,P.map.depthTexture.magFilter=It}else H.isPointLight?(P.map=new vl(s.x),P.map.depthTexture=new ra(s.x,Xn)):(P.map=new Et(s.x,s.y),P.map.depthTexture=new Hn(s.x,s.y,Xn)),P.map.depthTexture.name=H.name+".shadowMap",P.map.depthTexture.format=ti,this.type===ts?(P.map.depthTexture.compareFunction=q?gl:ml,P.map.depthTexture.minFilter=Kt,P.map.depthTexture.magFilter=Kt):(P.map.depthTexture.compareFunction=null,P.map.depthTexture.minFilter=It,P.map.depthTexture.magFilter=It);P.camera.updateProjectionMatrix()}let ne=P.map.isWebGLCubeRenderTarget?6:1;for(let se=0;se<ne;se++){if(P.map.isWebGLCubeRenderTarget)i.setRenderTarget(P.map,se),i.clear();else{se===0&&(i.setRenderTarget(P.map),i.clear());let ae=P.getViewport(se);o.set(r.x*ae.x,r.y*ae.y,r.x*ae.z,r.y*ae.w),D.viewport(o)}if(H.isPointLight){let ae=P.camera,fe=P.matrix,Ke=H.distance||ae.far;Ke!==ae.far&&(ae.far=Ke,ae.updateProjectionMatrix()),ao.setFromMatrixPosition(H.matrixWorld),ae.position.copy(ao),nh.copy(ae.position),nh.add(kx[se]),ae.up.copy(zx[se]),ae.lookAt(nh),ae.updateMatrixWorld(),fe.makeTranslation(-ao.x,-ao.y,-ao.z),ed.multiplyMatrices(ae.projectionMatrix,ae.matrixWorldInverse),P._frustum.setFromProjectionMatrix(ed,ae.coordinateSystem,ae.reversedDepth)}else P.updateMatrices(H);n=P.getFrustum(),v(A,x,P.camera,H,this.type)}P.isPointLightShadow!==!0&&this.type===Vs&&E(P,x),P.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(M,I,T)};function E(S,A){let x=e.update(_);h.defines.VSM_SAMPLES!==S.blurSamples&&(h.defines.VSM_SAMPLES=S.blurSamples,d.defines.VSM_SAMPLES=S.blurSamples,h.needsUpdate=!0,d.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new Et(s.x,s.y,{format:Ui,type:Gt})),h.uniforms.shadow_pass.value=S.map.depthTexture,h.uniforms.resolution.value=S.mapSize,h.uniforms.radius.value=S.radius,i.setRenderTarget(S.mapPass),i.clear(),i.renderBufferDirect(A,null,x,h,_,null),d.uniforms.shadow_pass.value=S.mapPass.texture,d.uniforms.resolution.value=S.mapSize,d.uniforms.radius.value=S.radius,i.setRenderTarget(S.map),i.clear(),i.renderBufferDirect(A,null,x,d,_,null)}function C(S,A,x,M){let I=null,T=x.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(T!==void 0)I=T;else if(I=x.isPointLight===!0?l:a,i.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){let D=I.uuid,B=A.uuid,G=c[D];G===void 0&&(G={},c[D]=G);let z=G[B];z===void 0&&(z=I.clone(),G[B]=z,A.addEventListener("dispose",b)),I=z}if(I.visible=A.visible,I.wireframe=A.wireframe,M===Vs?I.side=A.shadowSide!==null?A.shadowSide:A.side:I.side=A.shadowSide!==null?A.shadowSide:f[A.side],I.alphaMap=A.alphaMap,I.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,I.map=A.map,I.clipShadows=A.clipShadows,I.clippingPlanes=A.clippingPlanes,I.clipIntersection=A.clipIntersection,I.displacementMap=A.displacementMap,I.displacementScale=A.displacementScale,I.displacementBias=A.displacementBias,I.wireframeLinewidth=A.wireframeLinewidth,I.linewidth=A.linewidth,x.isPointLight===!0&&I.isMeshDistanceMaterial===!0){let D=i.properties.get(I);D.light=x}return I}function v(S,A,x,M,I){if(S.visible===!1)return;if(S.layers.test(A.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&I===Vs)&&(!S.frustumCulled||n.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,S.matrixWorld);let B=e.update(S),G=S.material;if(Array.isArray(G)){let z=B.groups;for(let H=0,P=z.length;H<P;H++){let U=z[H],q=G[U.materialIndex];if(q&&q.visible){let ne=C(S,q,M,I);S.onBeforeShadow(i,S,A,x,B,ne,U),i.renderBufferDirect(x,null,B,ne,S,U),S.onAfterShadow(i,S,A,x,B,ne,U)}}}else if(G.visible){let z=C(S,G,M,I);S.onBeforeShadow(i,S,A,x,B,z,null),i.renderBufferDirect(x,null,B,z,S,null),S.onAfterShadow(i,S,A,x,B,z,null)}}let D=S.children;for(let B=0,G=D.length;B<G;B++)v(D[B],A,x,M,I)}function b(S){S.target.removeEventListener("dispose",b);for(let x in c){let M=c[x],I=S.target.uuid;I in M&&(M[I].dispose(),delete M[I])}}}function Gx(i,e){function t(){let F=!1,xe=new Mt,$=null,ve=new Mt(0,0,0,0);return{setMask:function(Se){$!==Se&&!F&&(i.colorMask(Se,Se,Se,Se),$=Se)},setLocked:function(Se){F=Se},setClear:function(Se,re,he,Re,ht){ht===!0&&(Se*=Re,re*=Re,he*=Re),xe.set(Se,re,he,Re),ve.equals(xe)===!1&&(i.clearColor(Se,re,he,Re),ve.copy(xe))},reset:function(){F=!1,$=null,ve.set(-1,0,0,0)}}}function n(){let F=!1,xe=!1,$=null,ve=null,Se=null;return{setReversed:function(re){if(xe!==re){let he=e.get("EXT_clip_control");re?he.clipControlEXT(he.LOWER_LEFT_EXT,he.ZERO_TO_ONE_EXT):he.clipControlEXT(he.LOWER_LEFT_EXT,he.NEGATIVE_ONE_TO_ONE_EXT),xe=re;let Re=Se;Se=null,this.setClear(Re)}},getReversed:function(){return xe},setTest:function(re){re?oe(i.DEPTH_TEST):ze(i.DEPTH_TEST)},setMask:function(re){$!==re&&!F&&(i.depthMask(re),$=re)},setFunc:function(re){if(xe&&(re=Pu[re]),ve!==re){switch(re){case Yo:i.depthFunc(i.NEVER);break;case Zo:i.depthFunc(i.ALWAYS);break;case Jo:i.depthFunc(i.LESS);break;case Zi:i.depthFunc(i.LEQUAL);break;case $o:i.depthFunc(i.EQUAL);break;case Ko:i.depthFunc(i.GEQUAL);break;case jo:i.depthFunc(i.GREATER);break;case Qo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ve=re}},setLocked:function(re){F=re},setClear:function(re){Se!==re&&(Se=re,xe&&(re=1-re),i.clearDepth(re))},reset:function(){F=!1,$=null,ve=null,Se=null,xe=!1}}}function s(){let F=!1,xe=null,$=null,ve=null,Se=null,re=null,he=null,Re=null,ht=null;return{setTest:function(et){F||(et?oe(i.STENCIL_TEST):ze(i.STENCIL_TEST))},setMask:function(et){xe!==et&&!F&&(i.stencilMask(et),xe=et)},setFunc:function(et,un,ot){($!==et||ve!==un||Se!==ot)&&(i.stencilFunc(et,un,ot),$=et,ve=un,Se=ot)},setOp:function(et,un,ot){(re!==et||he!==un||Re!==ot)&&(i.stencilOp(et,un,ot),re=et,he=un,Re=ot)},setLocked:function(et){F=et},setClear:function(et){ht!==et&&(i.clearStencil(et),ht=et)},reset:function(){F=!1,xe=null,$=null,ve=null,Se=null,re=null,he=null,Re=null,ht=null}}}let r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap,u={},f={},h={},d=new WeakMap,g=[],_=null,p=!1,m=null,E=null,C=null,v=null,b=null,S=null,A=null,x=new Ee(0,0,0),M=0,I=!1,T=null,D=null,B=null,G=null,z=null,H=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),P=!1,U=0,q=i.getParameter(i.VERSION);q.indexOf("WebGL")!==-1?(U=parseFloat(/^WebGL (\d)/.exec(q)[1]),P=U>=1):q.indexOf("OpenGL ES")!==-1&&(U=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),P=U>=2);let ne=null,se={},ae=i.getParameter(i.SCISSOR_BOX),fe=i.getParameter(i.VIEWPORT),Ke=new Mt().fromArray(ae),Ue=new Mt().fromArray(fe);function Q(F,xe,$,ve){let Se=new Uint8Array(4),re=i.createTexture();i.bindTexture(F,re),i.texParameteri(F,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(F,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let he=0;he<$;he++)F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY?i.texImage3D(xe,0,i.RGBA,1,1,ve,0,i.RGBA,i.UNSIGNED_BYTE,Se):i.texImage2D(xe+he,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Se);return re}let ce={};ce[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),ce[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ce[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),oe(i.DEPTH_TEST),o.setFunc(Zi),Qe(!1),yt(Cc),oe(i.CULL_FACE),Oe(Vt);function oe(F){u[F]!==!0&&(i.enable(F),u[F]=!0)}function ze(F){u[F]!==!1&&(i.disable(F),u[F]=!1)}function Me(F,xe){return h[F]!==xe?(i.bindFramebuffer(F,xe),h[F]=xe,F===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=xe),F===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=xe),!0):!1}function ye(F,xe){let $=g,ve=!1;if(F){$=d.get(xe),$===void 0&&($=[],d.set(xe,$));let Se=F.textures;if($.length!==Se.length||$[0]!==i.COLOR_ATTACHMENT0){for(let re=0,he=Se.length;re<he;re++)$[re]=i.COLOR_ATTACHMENT0+re;$.length=Se.length,ve=!0}}else $[0]!==i.BACK&&($[0]=i.BACK,ve=!0);ve&&i.drawBuffers($)}function dt(F){return _!==F?(i.useProgram(F),_=F,!0):!1}let qe={[yn]:i.FUNC_ADD,[nu]:i.FUNC_SUBTRACT,[iu]:i.FUNC_REVERSE_SUBTRACT};qe[su]=i.MIN,qe[ru]=i.MAX;let Ge={[ns]:i.ZERO,[ou]:i.ONE,[au]:i.SRC_COLOR,[Xo]:i.SRC_ALPHA,[uu]:i.SRC_ALPHA_SATURATE,[Zr]:i.DST_COLOR,[Yr]:i.DST_ALPHA,[lu]:i.ONE_MINUS_SRC_COLOR,[qo]:i.ONE_MINUS_SRC_ALPHA,[hu]:i.ONE_MINUS_DST_COLOR,[cu]:i.ONE_MINUS_DST_ALPHA,[du]:i.CONSTANT_COLOR,[fu]:i.ONE_MINUS_CONSTANT_COLOR,[pu]:i.CONSTANT_ALPHA,[mu]:i.ONE_MINUS_CONSTANT_ALPHA};function Oe(F,xe,$,ve,Se,re,he,Re,ht,et){if(F===Vt){p===!0&&(ze(i.BLEND),p=!1);return}if(p===!1&&(oe(i.BLEND),p=!0),F!==Aa){if(F!==m||et!==I){if((E!==yn||b!==yn)&&(i.blendEquation(i.FUNC_ADD),E=yn,b=yn),et)switch(F){case Yi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Rc:i.blendFunc(i.ONE,i.ONE);break;case Pc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Ic:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Xe("WebGLState: Invalid blending: ",F);break}else switch(F){case Yi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Rc:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Pc:Xe("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Ic:Xe("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Xe("WebGLState: Invalid blending: ",F);break}C=null,v=null,S=null,A=null,x.set(0,0,0),M=0,m=F,I=et}return}Se=Se||xe,re=re||$,he=he||ve,(xe!==E||Se!==b)&&(i.blendEquationSeparate(qe[xe],qe[Se]),E=xe,b=Se),($!==C||ve!==v||re!==S||he!==A)&&(i.blendFuncSeparate(Ge[$],Ge[ve],Ge[re],Ge[he]),C=$,v=ve,S=re,A=he),(Re.equals(x)===!1||ht!==M)&&(i.blendColor(Re.r,Re.g,Re.b,ht),x.copy(Re),M=ht),m=F,I=!1}function Ve(F,xe){F.side===pn?ze(i.CULL_FACE):oe(i.CULL_FACE);let $=F.side===en;xe&&($=!$),Qe($),F.blending===Yi&&F.transparent===!1?Oe(Vt):Oe(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),o.setFunc(F.depthFunc),o.setTest(F.depthTest),o.setMask(F.depthWrite),r.setMask(F.colorWrite);let ve=F.stencilWrite;a.setTest(ve),ve&&(a.setMask(F.stencilWriteMask),a.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),a.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),ie(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?oe(i.SAMPLE_ALPHA_TO_COVERAGE):ze(i.SAMPLE_ALPHA_TO_COVERAGE)}function Qe(F){T!==F&&(F?i.frontFace(i.CW):i.frontFace(i.CCW),T=F)}function yt(F){F!==Qh?(oe(i.CULL_FACE),F!==D&&(F===Cc?i.cullFace(i.BACK):F===eu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):ze(i.CULL_FACE),D=F}function bt(F){F!==B&&(P&&i.lineWidth(F),B=F)}function ie(F,xe,$){F?(oe(i.POLYGON_OFFSET_FILL),(G!==xe||z!==$)&&(G=xe,z=$,o.getReversed()&&(xe=-xe),i.polygonOffset(xe,$))):ze(i.POLYGON_OFFSET_FILL)}function Ye(F){F?oe(i.SCISSOR_TEST):ze(i.SCISSOR_TEST)}function Be(F){F===void 0&&(F=i.TEXTURE0+H-1),ne!==F&&(i.activeTexture(F),ne=F)}function O(F,xe,$){$===void 0&&(ne===null?$=i.TEXTURE0+H-1:$=ne);let ve=se[$];ve===void 0&&(ve={type:void 0,texture:void 0},se[$]=ve),(ve.type!==F||ve.texture!==xe)&&(ne!==$&&(i.activeTexture($),ne=$),i.bindTexture(F,xe||ce[F]),ve.type=F,ve.texture=xe)}function Ct(){let F=se[ne];F!==void 0&&F.type!==void 0&&(i.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function Pe(){try{i.compressedTexImage2D(...arguments)}catch(F){Xe("WebGLState:",F)}}function R(){try{i.compressedTexImage3D(...arguments)}catch(F){Xe("WebGLState:",F)}}function y(){try{i.texSubImage2D(...arguments)}catch(F){Xe("WebGLState:",F)}}function V(){try{i.texSubImage3D(...arguments)}catch(F){Xe("WebGLState:",F)}}function W(){try{i.compressedTexSubImage2D(...arguments)}catch(F){Xe("WebGLState:",F)}}function j(){try{i.compressedTexSubImage3D(...arguments)}catch(F){Xe("WebGLState:",F)}}function le(){try{i.texStorage2D(...arguments)}catch(F){Xe("WebGLState:",F)}}function pe(){try{i.texStorage3D(...arguments)}catch(F){Xe("WebGLState:",F)}}function J(){try{i.texImage2D(...arguments)}catch(F){Xe("WebGLState:",F)}}function te(){try{i.texImage3D(...arguments)}catch(F){Xe("WebGLState:",F)}}function K(F){return f[F]!==void 0?f[F]:i.getParameter(F)}function De(F,xe){f[F]!==xe&&(i.pixelStorei(F,xe),f[F]=xe)}function me(F){Ke.equals(F)===!1&&(i.scissor(F.x,F.y,F.z,F.w),Ke.copy(F))}function de(F){Ue.equals(F)===!1&&(i.viewport(F.x,F.y,F.z,F.w),Ue.copy(F))}function Ie(F,xe){let $=c.get(xe);$===void 0&&($=new WeakMap,c.set(xe,$));let ve=$.get(F);ve===void 0&&(ve=i.getUniformBlockIndex(xe,F.name),$.set(F,ve))}function Fe(F,xe){let ve=c.get(xe).get(F);l.get(xe)!==ve&&(i.uniformBlockBinding(xe,ve,F.__bindingPointIndex),l.set(xe,ve))}function He(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),u={},f={},ne=null,se={},h={},d=new WeakMap,g=[],_=null,p=!1,m=null,E=null,C=null,v=null,b=null,S=null,A=null,x=new Ee(0,0,0),M=0,I=!1,T=null,D=null,B=null,G=null,z=null,Ke.set(0,0,i.canvas.width,i.canvas.height),Ue.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:oe,disable:ze,bindFramebuffer:Me,drawBuffers:ye,useProgram:dt,setBlending:Oe,setMaterial:Ve,setFlipSided:Qe,setCullFace:yt,setLineWidth:bt,setPolygonOffset:ie,setScissorTest:Ye,activeTexture:Be,bindTexture:O,unbindTexture:Ct,compressedTexImage2D:Pe,compressedTexImage3D:R,texImage2D:J,texImage3D:te,pixelStorei:De,getParameter:K,updateUBOMapping:Ie,uniformBlockBinding:Fe,texStorage2D:le,texStorage3D:pe,texSubImage2D:y,texSubImage3D:V,compressedTexSubImage2D:W,compressedTexSubImage3D:j,scissor:me,viewport:de,reset:He}}function Hx(i,e,t,n,s,r,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new be,u=new WeakMap,f=new Set,h,d=new WeakMap,g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(R,y){return g?new OffscreenCanvas(R,y):Tr("canvas")}function p(R,y,V){let W=1,j=Pe(R);if((j.width>V||j.height>V)&&(W=V/Math.max(j.width,j.height)),W<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){let le=Math.floor(W*j.width),pe=Math.floor(W*j.height);h===void 0&&(h=_(le,pe));let J=y?_(le,pe):h;return J.width=le,J.height=pe,J.getContext("2d").drawImage(R,0,0,le,pe),We("WebGLRenderer: Texture has been resized from ("+j.width+"x"+j.height+") to ("+le+"x"+pe+")."),J}else return"data"in R&&We("WebGLRenderer: Image in DataTexture is too big ("+j.width+"x"+j.height+")."),R;return R}function m(R){return R.generateMipmaps}function E(R){i.generateMipmap(R)}function C(R){return R.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?i.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(R,y,V,W,j,le=!1){if(R!==null){if(i[R]!==void 0)return i[R];We("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let pe;W&&(pe=e.get("EXT_texture_norm16"),pe||We("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let J=y;if(y===i.RED&&(V===i.FLOAT&&(J=i.R32F),V===i.HALF_FLOAT&&(J=i.R16F),V===i.UNSIGNED_BYTE&&(J=i.R8),V===i.UNSIGNED_SHORT&&pe&&(J=pe.R16_EXT),V===i.SHORT&&pe&&(J=pe.R16_SNORM_EXT)),y===i.RED_INTEGER&&(V===i.UNSIGNED_BYTE&&(J=i.R8UI),V===i.UNSIGNED_SHORT&&(J=i.R16UI),V===i.UNSIGNED_INT&&(J=i.R32UI),V===i.BYTE&&(J=i.R8I),V===i.SHORT&&(J=i.R16I),V===i.INT&&(J=i.R32I)),y===i.RG&&(V===i.FLOAT&&(J=i.RG32F),V===i.HALF_FLOAT&&(J=i.RG16F),V===i.UNSIGNED_BYTE&&(J=i.RG8),V===i.UNSIGNED_SHORT&&pe&&(J=pe.RG16_EXT),V===i.SHORT&&pe&&(J=pe.RG16_SNORM_EXT)),y===i.RG_INTEGER&&(V===i.UNSIGNED_BYTE&&(J=i.RG8UI),V===i.UNSIGNED_SHORT&&(J=i.RG16UI),V===i.UNSIGNED_INT&&(J=i.RG32UI),V===i.BYTE&&(J=i.RG8I),V===i.SHORT&&(J=i.RG16I),V===i.INT&&(J=i.RG32I)),y===i.RGB_INTEGER&&(V===i.UNSIGNED_BYTE&&(J=i.RGB8UI),V===i.UNSIGNED_SHORT&&(J=i.RGB16UI),V===i.UNSIGNED_INT&&(J=i.RGB32UI),V===i.BYTE&&(J=i.RGB8I),V===i.SHORT&&(J=i.RGB16I),V===i.INT&&(J=i.RGB32I)),y===i.RGBA_INTEGER&&(V===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),V===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),V===i.UNSIGNED_INT&&(J=i.RGBA32UI),V===i.BYTE&&(J=i.RGBA8I),V===i.SHORT&&(J=i.RGBA16I),V===i.INT&&(J=i.RGBA32I)),y===i.RGB&&(V===i.UNSIGNED_SHORT&&pe&&(J=pe.RGB16_EXT),V===i.SHORT&&pe&&(J=pe.RGB16_SNORM_EXT),V===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),V===i.UNSIGNED_INT_10F_11F_11F_REV&&(J=i.R11F_G11F_B10F)),y===i.RGBA){let te=le?Sr:at.getTransfer(j);V===i.FLOAT&&(J=i.RGBA32F),V===i.HALF_FLOAT&&(J=i.RGBA16F),V===i.UNSIGNED_BYTE&&(J=te===pt?i.SRGB8_ALPHA8:i.RGBA8),V===i.UNSIGNED_SHORT&&pe&&(J=pe.RGBA16_EXT),V===i.SHORT&&pe&&(J=pe.RGBA16_SNORM_EXT),V===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),V===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&e.get("EXT_color_buffer_float"),J}function b(R,y){let V;return R?y===null||y===Xn||y===Ni?V=i.DEPTH24_STENCIL8:y===Dn?V=i.DEPTH32F_STENCIL8:y===Gs&&(V=i.DEPTH24_STENCIL8,We("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===Xn||y===Ni?V=i.DEPTH_COMPONENT24:y===Dn?V=i.DEPTH_COMPONENT32F:y===Gs&&(V=i.DEPTH_COMPONENT16),V}function S(R,y){return m(R)===!0||R.isFramebufferTexture&&R.minFilter!==It&&R.minFilter!==Kt?Math.log2(Math.max(y.width,y.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?y.mipmaps.length:1}function A(R){let y=R.target;y.removeEventListener("dispose",A),M(y),y.isVideoTexture&&u.delete(y),y.isHTMLTexture&&f.delete(y)}function x(R){let y=R.target;y.removeEventListener("dispose",x),T(y)}function M(R){let y=n.get(R);if(y.__webglInit===void 0)return;let V=R.source,W=d.get(V);if(W){let j=W[y.__cacheKey];j.usedTimes--,j.usedTimes===0&&I(R),Object.keys(W).length===0&&d.delete(V)}n.remove(R)}function I(R){let y=n.get(R);i.deleteTexture(y.__webglTexture);let V=R.source,W=d.get(V);delete W[y.__cacheKey],o.memory.textures--}function T(R){let y=n.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),n.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let W=0;W<6;W++){if(Array.isArray(y.__webglFramebuffer[W]))for(let j=0;j<y.__webglFramebuffer[W].length;j++)i.deleteFramebuffer(y.__webglFramebuffer[W][j]);else i.deleteFramebuffer(y.__webglFramebuffer[W]);y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer[W])}else{if(Array.isArray(y.__webglFramebuffer))for(let W=0;W<y.__webglFramebuffer.length;W++)i.deleteFramebuffer(y.__webglFramebuffer[W]);else i.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&i.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let W=0;W<y.__webglColorRenderbuffer.length;W++)y.__webglColorRenderbuffer[W]&&i.deleteRenderbuffer(y.__webglColorRenderbuffer[W]);y.__webglDepthRenderbuffer&&i.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let V=R.textures;for(let W=0,j=V.length;W<j;W++){let le=n.get(V[W]);le.__webglTexture&&(i.deleteTexture(le.__webglTexture),o.memory.textures--),n.remove(V[W])}n.remove(R)}let D=0;function B(){D=0}function G(){return D}function z(R){D=R}function H(){let R=D;return R>=s.maxTextures&&We("WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+s.maxTextures),D+=1,R}function P(R){let y=[];return y.push(R.wrapS),y.push(R.wrapT),y.push(R.wrapR||0),y.push(R.magFilter),y.push(R.minFilter),y.push(R.anisotropy),y.push(R.internalFormat),y.push(R.format),y.push(R.type),y.push(R.generateMipmaps),y.push(R.premultiplyAlpha),y.push(R.flipY),y.push(R.unpackAlignment),y.push(R.colorSpace),y.join()}function U(R,y){let V=n.get(R);if(R.isVideoTexture&&O(R),R.isRenderTargetTexture===!1&&R.isExternalTexture!==!0&&R.version>0&&V.__version!==R.version){let W=R.image;if(W===null)We("WebGLRenderer: Texture marked for update but no image data found.");else if(W.complete===!1)We("WebGLRenderer: Texture marked for update but image is incomplete");else{ze(V,R,y);return}}else R.isExternalTexture&&(V.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,V.__webglTexture,i.TEXTURE0+y)}function q(R,y){let V=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&V.__version!==R.version){ze(V,R,y);return}else R.isExternalTexture&&(V.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,V.__webglTexture,i.TEXTURE0+y)}function ne(R,y){let V=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&V.__version!==R.version){ze(V,R,y);return}t.bindTexture(i.TEXTURE_3D,V.__webglTexture,i.TEXTURE0+y)}function se(R,y){let V=n.get(R);if(R.isCubeDepthTexture!==!0&&R.version>0&&V.__version!==R.version){Me(V,R,y);return}t.bindTexture(i.TEXTURE_CUBE_MAP,V.__webglTexture,i.TEXTURE0+y)}let ae={[An]:i.REPEAT,[ei]:i.CLAMP_TO_EDGE,[ea]:i.MIRRORED_REPEAT},fe={[It]:i.NEAREST,[_u]:i.NEAREST_MIPMAP_NEAREST,[Qr]:i.NEAREST_MIPMAP_LINEAR,[Kt]:i.LINEAR,[Ia]:i.LINEAR_MIPMAP_NEAREST,[Li]:i.LINEAR_MIPMAP_LINEAR},Ke={[Mu]:i.NEVER,[Eu]:i.ALWAYS,[bu]:i.LESS,[ml]:i.LEQUAL,[Su]:i.EQUAL,[gl]:i.GEQUAL,[Tu]:i.GREATER,[wu]:i.NOTEQUAL};function Ue(R,y){if(y.type===Dn&&e.has("OES_texture_float_linear")===!1&&(y.magFilter===Kt||y.magFilter===Ia||y.magFilter===Qr||y.magFilter===Li||y.minFilter===Kt||y.minFilter===Ia||y.minFilter===Qr||y.minFilter===Li)&&We("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(R,i.TEXTURE_WRAP_S,ae[y.wrapS]),i.texParameteri(R,i.TEXTURE_WRAP_T,ae[y.wrapT]),(R===i.TEXTURE_3D||R===i.TEXTURE_2D_ARRAY)&&i.texParameteri(R,i.TEXTURE_WRAP_R,ae[y.wrapR]),i.texParameteri(R,i.TEXTURE_MAG_FILTER,fe[y.magFilter]),i.texParameteri(R,i.TEXTURE_MIN_FILTER,fe[y.minFilter]),y.compareFunction&&(i.texParameteri(R,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(R,i.TEXTURE_COMPARE_FUNC,Ke[y.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===It||y.minFilter!==Qr&&y.minFilter!==Li||y.type===Dn&&e.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||n.get(y).__currentAnisotropy){let V=e.get("EXT_texture_filter_anisotropic");i.texParameterf(R,V.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),n.get(y).__currentAnisotropy=y.anisotropy}}}function Q(R,y){let V=!1;R.__webglInit===void 0&&(R.__webglInit=!0,y.addEventListener("dispose",A));let W=y.source,j=d.get(W);j===void 0&&(j={},d.set(W,j));let le=P(y);if(le!==R.__cacheKey){j[le]===void 0&&(j[le]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,V=!0),j[le].usedTimes++;let pe=j[R.__cacheKey];pe!==void 0&&(j[R.__cacheKey].usedTimes--,pe.usedTimes===0&&I(y)),R.__cacheKey=le,R.__webglTexture=j[le].texture}return V}function ce(R,y,V){return Math.floor(Math.floor(R/V)/y)}function oe(R,y,V,W){let le=R.updateRanges;if(le.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,y.width,y.height,V,W,y.data);else{le.sort((De,me)=>De.start-me.start);let pe=0;for(let De=1;De<le.length;De++){let me=le[pe],de=le[De],Ie=me.start+me.count,Fe=ce(de.start,y.width,4),He=ce(me.start,y.width,4);de.start<=Ie+1&&Fe===He&&ce(de.start+de.count-1,y.width,4)===Fe?me.count=Math.max(me.count,de.start+de.count-me.start):(++pe,le[pe]=de)}le.length=pe+1;let J=t.getParameter(i.UNPACK_ROW_LENGTH),te=t.getParameter(i.UNPACK_SKIP_PIXELS),K=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,y.width);for(let De=0,me=le.length;De<me;De++){let de=le[De],Ie=Math.floor(de.start/4),Fe=Math.ceil(de.count/4),He=Ie%y.width,F=Math.floor(Ie/y.width),xe=Fe,$=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,He),t.pixelStorei(i.UNPACK_SKIP_ROWS,F),t.texSubImage2D(i.TEXTURE_2D,0,He,F,xe,$,V,W,y.data)}R.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,J),t.pixelStorei(i.UNPACK_SKIP_PIXELS,te),t.pixelStorei(i.UNPACK_SKIP_ROWS,K)}}function ze(R,y,V){let W=i.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(W=i.TEXTURE_2D_ARRAY),y.isData3DTexture&&(W=i.TEXTURE_3D);let j=Q(R,y),le=y.source;t.bindTexture(W,R.__webglTexture,i.TEXTURE0+V);let pe=n.get(le);if(le.version!==pe.__version||j===!0){if(t.activeTexture(i.TEXTURE0+V),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let $=at.getPrimaries(at.workingColorSpace),ve=y.colorSpace===qn?null:at.getPrimaries(y.colorSpace),Se=y.colorSpace===qn||$===ve?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se)}t.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment);let te=p(y.image,!1,s.maxTextureSize);te=Ct(y,te);let K=r.convert(y.format,y.colorSpace),De=r.convert(y.type),me=v(y.internalFormat,K,De,y.normalized,y.colorSpace,y.isVideoTexture);Ue(W,y);let de,Ie=y.mipmaps,Fe=y.isVideoTexture!==!0,He=pe.__version===void 0||j===!0,F=le.dataReady,xe=S(y,te);if(y.isDepthTexture)me=b(y.format===ii,y.type),He&&(Fe?t.texStorage2D(i.TEXTURE_2D,1,me,te.width,te.height):t.texImage2D(i.TEXTURE_2D,0,me,te.width,te.height,0,K,De,null));else if(y.isDataTexture)if(Ie.length>0){Fe&&He&&t.texStorage2D(i.TEXTURE_2D,xe,me,Ie[0].width,Ie[0].height);for(let $=0,ve=Ie.length;$<ve;$++)de=Ie[$],Fe?F&&t.texSubImage2D(i.TEXTURE_2D,$,0,0,de.width,de.height,K,De,de.data):t.texImage2D(i.TEXTURE_2D,$,me,de.width,de.height,0,K,De,de.data);y.generateMipmaps=!1}else Fe?(He&&t.texStorage2D(i.TEXTURE_2D,xe,me,te.width,te.height),F&&oe(y,te,K,De)):t.texImage2D(i.TEXTURE_2D,0,me,te.width,te.height,0,K,De,te.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){Fe&&He&&t.texStorage3D(i.TEXTURE_2D_ARRAY,xe,me,Ie[0].width,Ie[0].height,te.depth);for(let $=0,ve=Ie.length;$<ve;$++)if(de=Ie[$],y.format!==mn)if(K!==null)if(Fe){if(F)if(y.layerUpdates.size>0){let Se=$c(de.width,de.height,y.format,y.type);for(let re of y.layerUpdates){let he=de.data.subarray(re*Se/de.data.BYTES_PER_ELEMENT,(re+1)*Se/de.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,re,de.width,de.height,1,K,he)}y.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,0,de.width,de.height,te.depth,K,de.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,$,me,de.width,de.height,te.depth,0,de.data,0,0);else We("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Fe?F&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,$,0,0,0,de.width,de.height,te.depth,K,De,de.data):t.texImage3D(i.TEXTURE_2D_ARRAY,$,me,de.width,de.height,te.depth,0,K,De,de.data)}else{Fe&&He&&t.texStorage2D(i.TEXTURE_2D,xe,me,Ie[0].width,Ie[0].height);for(let $=0,ve=Ie.length;$<ve;$++)de=Ie[$],y.format!==mn?K!==null?Fe?F&&t.compressedTexSubImage2D(i.TEXTURE_2D,$,0,0,de.width,de.height,K,de.data):t.compressedTexImage2D(i.TEXTURE_2D,$,me,de.width,de.height,0,de.data):We("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Fe?F&&t.texSubImage2D(i.TEXTURE_2D,$,0,0,de.width,de.height,K,De,de.data):t.texImage2D(i.TEXTURE_2D,$,me,de.width,de.height,0,K,De,de.data)}else if(y.isDataArrayTexture)if(Fe){if(He&&t.texStorage3D(i.TEXTURE_2D_ARRAY,xe,me,te.width,te.height,te.depth),F)if(y.layerUpdates.size>0){let $=$c(te.width,te.height,y.format,y.type);for(let ve of y.layerUpdates){let Se=te.data.subarray(ve*$/te.data.BYTES_PER_ELEMENT,(ve+1)*$/te.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ve,te.width,te.height,1,K,De,Se)}y.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,te.width,te.height,te.depth,K,De,te.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,me,te.width,te.height,te.depth,0,K,De,te.data);else if(y.isData3DTexture)Fe?(He&&t.texStorage3D(i.TEXTURE_3D,xe,me,te.width,te.height,te.depth),F&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,te.width,te.height,te.depth,K,De,te.data)):t.texImage3D(i.TEXTURE_3D,0,me,te.width,te.height,te.depth,0,K,De,te.data);else if(y.isFramebufferTexture){if(He)if(Fe)t.texStorage2D(i.TEXTURE_2D,xe,me,te.width,te.height);else{let $=te.width,ve=te.height;for(let Se=0;Se<xe;Se++)t.texImage2D(i.TEXTURE_2D,Se,me,$,ve,0,K,De,null),$>>=1,ve>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in i){let $=i.canvas;if($.hasAttribute("layoutsubtree")||$.setAttribute("layoutsubtree","true"),te.parentNode!==$){$.appendChild(te),f.add(y),$.onpaint=ve=>{let Se=ve.changedElements;for(let re of f)Se.includes(re.image)&&(re.needsUpdate=!0)},$.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,te);else{let Se=i.RGBA,re=i.RGBA,he=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Se,re,he,te)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Ie.length>0){if(Fe&&He){let $=Pe(Ie[0]);t.texStorage2D(i.TEXTURE_2D,xe,me,$.width,$.height)}for(let $=0,ve=Ie.length;$<ve;$++)de=Ie[$],Fe?F&&t.texSubImage2D(i.TEXTURE_2D,$,0,0,K,De,de):t.texImage2D(i.TEXTURE_2D,$,me,K,De,de);y.generateMipmaps=!1}else if(Fe){if(He){let $=Pe(te);t.texStorage2D(i.TEXTURE_2D,xe,me,$.width,$.height)}F&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,K,De,te)}else t.texImage2D(i.TEXTURE_2D,0,me,K,De,te);m(y)&&E(W),pe.__version=le.version,y.onUpdate&&y.onUpdate(y)}R.__version=y.version}function Me(R,y,V){if(y.image.length!==6)return;let W=Q(R,y),j=y.source;t.bindTexture(i.TEXTURE_CUBE_MAP,R.__webglTexture,i.TEXTURE0+V);let le=n.get(j);if(j.version!==le.__version||W===!0){t.activeTexture(i.TEXTURE0+V);let pe=at.getPrimaries(at.workingColorSpace),J=y.colorSpace===qn?null:at.getPrimaries(y.colorSpace),te=y.colorSpace===qn||pe===J?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,te);let K=y.isCompressedTexture||y.image[0].isCompressedTexture,De=y.image[0]&&y.image[0].isDataTexture,me=[];for(let re=0;re<6;re++)!K&&!De?me[re]=p(y.image[re],!0,s.maxCubemapSize):me[re]=De?y.image[re].image:y.image[re],me[re]=Ct(y,me[re]);let de=me[0],Ie=r.convert(y.format,y.colorSpace),Fe=r.convert(y.type),He=v(y.internalFormat,Ie,Fe,y.normalized,y.colorSpace),F=y.isVideoTexture!==!0,xe=le.__version===void 0||W===!0,$=j.dataReady,ve=S(y,de);Ue(i.TEXTURE_CUBE_MAP,y);let Se;if(K){F&&xe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ve,He,de.width,de.height);for(let re=0;re<6;re++){Se=me[re].mipmaps;for(let he=0;he<Se.length;he++){let Re=Se[he];y.format!==mn?Ie!==null?F?$&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he,0,0,Re.width,Re.height,Ie,Re.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he,He,Re.width,Re.height,0,Re.data):We("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):F?$&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he,0,0,Re.width,Re.height,Ie,Fe,Re.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he,He,Re.width,Re.height,0,Ie,Fe,Re.data)}}}else{if(Se=y.mipmaps,F&&xe){Se.length>0&&ve++;let re=Pe(me[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ve,He,re.width,re.height)}for(let re=0;re<6;re++)if(De){F?$&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,0,0,me[re].width,me[re].height,Ie,Fe,me[re].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,He,me[re].width,me[re].height,0,Ie,Fe,me[re].data);for(let he=0;he<Se.length;he++){let ht=Se[he].image[re].image;F?$&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he+1,0,0,ht.width,ht.height,Ie,Fe,ht.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he+1,He,ht.width,ht.height,0,Ie,Fe,ht.data)}}else{F?$&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,0,0,Ie,Fe,me[re]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,He,Ie,Fe,me[re]);for(let he=0;he<Se.length;he++){let Re=Se[he];F?$&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he+1,0,0,Ie,Fe,Re.image[re]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+re,he+1,He,Ie,Fe,Re.image[re])}}}m(y)&&E(i.TEXTURE_CUBE_MAP),le.__version=j.version,y.onUpdate&&y.onUpdate(y)}R.__version=y.version}function ye(R,y,V,W,j,le){let pe=r.convert(V.format,V.colorSpace),J=r.convert(V.type),te=v(V.internalFormat,pe,J,V.normalized,V.colorSpace),K=n.get(y),De=n.get(V);if(De.__renderTarget=y,!K.__hasExternalTextures){let me=Math.max(1,y.width>>le),de=Math.max(1,y.height>>le);j===i.TEXTURE_3D||j===i.TEXTURE_2D_ARRAY?t.texImage3D(j,le,te,me,de,y.depth,0,pe,J,null):t.texImage2D(j,le,te,me,de,0,pe,J,null)}t.bindFramebuffer(i.FRAMEBUFFER,R),Be(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,W,j,De.__webglTexture,0,Ye(y)):(j===i.TEXTURE_2D||j>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&j<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,W,j,De.__webglTexture,le),t.bindFramebuffer(i.FRAMEBUFFER,null)}function dt(R,y,V){if(i.bindRenderbuffer(i.RENDERBUFFER,R),y.depthBuffer){let W=y.depthTexture,j=W&&W.isDepthTexture?W.type:null,le=b(y.stencilBuffer,j),pe=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Be(y)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ye(y),le,y.width,y.height):V?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ye(y),le,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,le,y.width,y.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,pe,i.RENDERBUFFER,R)}else{let W=y.textures;for(let j=0;j<W.length;j++){let le=W[j],pe=r.convert(le.format,le.colorSpace),J=r.convert(le.type),te=v(le.internalFormat,pe,J,le.normalized,le.colorSpace);Be(y)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ye(y),te,y.width,y.height):V?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ye(y),te,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,te,y.width,y.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function qe(R,y,V){let W=y.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,R),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let j=n.get(y.depthTexture);if(j.__renderTarget=y,(!j.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),W){if(j.__webglInit===void 0&&(j.__webglInit=!0,y.depthTexture.addEventListener("dispose",A)),j.__webglTexture===void 0){j.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,j.__webglTexture),Ue(i.TEXTURE_CUBE_MAP,y.depthTexture);let K=r.convert(y.depthTexture.format),De=r.convert(y.depthTexture.type),me;y.depthTexture.format===ti?me=i.DEPTH_COMPONENT24:y.depthTexture.format===ii&&(me=i.DEPTH24_STENCIL8);for(let de=0;de<6;de++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,me,y.width,y.height,0,K,De,null)}}else U(y.depthTexture,0);let le=j.__webglTexture,pe=Ye(y),J=W?i.TEXTURE_CUBE_MAP_POSITIVE_X+V:i.TEXTURE_2D,te=y.depthTexture.format===ii?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(y.depthTexture.format===ti)Be(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,te,J,le,0,pe):i.framebufferTexture2D(i.FRAMEBUFFER,te,J,le,0);else if(y.depthTexture.format===ii)Be(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,te,J,le,0,pe):i.framebufferTexture2D(i.FRAMEBUFFER,te,J,le,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Ge(R){let y=n.get(R),V=R.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==R.depthTexture){let W=R.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),W){let j=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,W.removeEventListener("dispose",j)};W.addEventListener("dispose",j),y.__depthDisposeCallback=j}y.__boundDepthTexture=W}if(R.depthTexture&&!y.__autoAllocateDepthBuffer)if(V)for(let W=0;W<6;W++)qe(y.__webglFramebuffer[W],R,W);else{let W=R.texture.mipmaps;W&&W.length>0?qe(y.__webglFramebuffer[0],R,0):qe(y.__webglFramebuffer,R,0)}else if(V){y.__webglDepthbuffer=[];for(let W=0;W<6;W++)if(t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[W]),y.__webglDepthbuffer[W]===void 0)y.__webglDepthbuffer[W]=i.createRenderbuffer(),dt(y.__webglDepthbuffer[W],R,!1);else{let j=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,le=y.__webglDepthbuffer[W];i.bindRenderbuffer(i.RENDERBUFFER,le),i.framebufferRenderbuffer(i.FRAMEBUFFER,j,i.RENDERBUFFER,le)}}else{let W=R.texture.mipmaps;if(W&&W.length>0?t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=i.createRenderbuffer(),dt(y.__webglDepthbuffer,R,!1);else{let j=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,le=y.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,le),i.framebufferRenderbuffer(i.FRAMEBUFFER,j,i.RENDERBUFFER,le)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Oe(R,y,V){let W=n.get(R);y!==void 0&&ye(W.__webglFramebuffer,R,R.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),V!==void 0&&Ge(R)}function Ve(R){let y=R.texture,V=n.get(R),W=n.get(y);R.addEventListener("dispose",x);let j=R.textures,le=R.isWebGLCubeRenderTarget===!0,pe=j.length>1;if(pe||(W.__webglTexture===void 0&&(W.__webglTexture=i.createTexture()),W.__version=y.version,o.memory.textures++),le){V.__webglFramebuffer=[];for(let J=0;J<6;J++)if(y.mipmaps&&y.mipmaps.length>0){V.__webglFramebuffer[J]=[];for(let te=0;te<y.mipmaps.length;te++)V.__webglFramebuffer[J][te]=i.createFramebuffer()}else V.__webglFramebuffer[J]=i.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){V.__webglFramebuffer=[];for(let J=0;J<y.mipmaps.length;J++)V.__webglFramebuffer[J]=i.createFramebuffer()}else V.__webglFramebuffer=i.createFramebuffer();if(pe)for(let J=0,te=j.length;J<te;J++){let K=n.get(j[J]);K.__webglTexture===void 0&&(K.__webglTexture=i.createTexture(),o.memory.textures++)}if(R.samples>0&&Be(R)===!1){V.__webglMultisampledFramebuffer=i.createFramebuffer(),V.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,V.__webglMultisampledFramebuffer);for(let J=0;J<j.length;J++){let te=j[J];V.__webglColorRenderbuffer[J]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,V.__webglColorRenderbuffer[J]);let K=r.convert(te.format,te.colorSpace),De=r.convert(te.type),me=v(te.internalFormat,K,De,te.normalized,te.colorSpace,R.isXRRenderTarget===!0),de=Ye(R);i.renderbufferStorageMultisample(i.RENDERBUFFER,de,me,R.width,R.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+J,i.RENDERBUFFER,V.__webglColorRenderbuffer[J])}i.bindRenderbuffer(i.RENDERBUFFER,null),R.depthBuffer&&(V.__webglDepthRenderbuffer=i.createRenderbuffer(),dt(V.__webglDepthRenderbuffer,R,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(le){t.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture),Ue(i.TEXTURE_CUBE_MAP,y);for(let J=0;J<6;J++)if(y.mipmaps&&y.mipmaps.length>0)for(let te=0;te<y.mipmaps.length;te++)ye(V.__webglFramebuffer[J][te],R,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,te);else ye(V.__webglFramebuffer[J],R,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0);m(y)&&E(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(pe){for(let J=0,te=j.length;J<te;J++){let K=j[J],De=n.get(K),me=i.TEXTURE_2D;(R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(me=R.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(me,De.__webglTexture),Ue(me,K),ye(V.__webglFramebuffer,R,K,i.COLOR_ATTACHMENT0+J,me,0),m(K)&&E(me)}t.unbindTexture()}else{let J=i.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(J=R.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(J,W.__webglTexture),Ue(J,y),y.mipmaps&&y.mipmaps.length>0)for(let te=0;te<y.mipmaps.length;te++)ye(V.__webglFramebuffer[te],R,y,i.COLOR_ATTACHMENT0,J,te);else ye(V.__webglFramebuffer,R,y,i.COLOR_ATTACHMENT0,J,0);m(y)&&E(J),t.unbindTexture()}R.depthBuffer&&Ge(R)}function Qe(R){let y=R.textures;for(let V=0,W=y.length;V<W;V++){let j=y[V];if(m(j)){let le=C(R),pe=n.get(j).__webglTexture;t.bindTexture(le,pe),E(le),t.unbindTexture()}}}let yt=[],bt=[];function ie(R){if(R.samples>0){if(Be(R)===!1){let y=R.textures,V=R.width,W=R.height,j=i.COLOR_BUFFER_BIT,le=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,pe=n.get(R),J=y.length>1;if(J)for(let K=0;K<y.length;K++)t.bindFramebuffer(i.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+K,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,pe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+K,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,pe.__webglMultisampledFramebuffer);let te=R.texture.mipmaps;te&&te.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,pe.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,pe.__webglFramebuffer);for(let K=0;K<y.length;K++){if(R.resolveDepthBuffer&&(R.depthBuffer&&(j|=i.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&(j|=i.STENCIL_BUFFER_BIT)),J){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,pe.__webglColorRenderbuffer[K]);let De=n.get(y[K]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,De,0)}i.blitFramebuffer(0,0,V,W,0,0,V,W,j,i.NEAREST),l===!0&&(yt.length=0,bt.length=0,yt.push(i.COLOR_ATTACHMENT0+K),R.depthBuffer&&R.resolveDepthBuffer===!1&&(yt.push(le),bt.push(le),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,bt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,yt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),J)for(let K=0;K<y.length;K++){t.bindFramebuffer(i.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+K,i.RENDERBUFFER,pe.__webglColorRenderbuffer[K]);let De=n.get(y[K]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,pe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+K,i.TEXTURE_2D,De,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,pe.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&l){let y=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[y])}}}function Ye(R){return Math.min(s.maxSamples,R.samples)}function Be(R){let y=n.get(R);return R.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function O(R){let y=o.render.frame;u.get(R)!==y&&(u.set(R,y),R.update())}function Ct(R,y){let V=R.colorSpace,W=R.format,j=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||V!==br&&V!==qn&&(at.getTransfer(V)===pt?(W!==mn||j!==$t)&&We("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Xe("WebGLTextures: Unsupported texture color space:",V)),y}function Pe(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(c.width=R.naturalWidth||R.width,c.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(c.width=R.displayWidth,c.height=R.displayHeight):(c.width=R.width,c.height=R.height),c}this.allocateTextureUnit=H,this.resetTextureUnits=B,this.getTextureUnits=G,this.setTextureUnits=z,this.setTexture2D=U,this.setTexture2DArray=q,this.setTexture3D=ne,this.setTextureCube=se,this.rebindTextures=Oe,this.setupRenderTarget=Ve,this.updateRenderTargetMipmap=Qe,this.updateMultisampleRenderTarget=ie,this.setupDepthRenderbuffer=Ge,this.setupFrameBufferTexture=ye,this.useMultisampledRTT=Be,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function Wx(i,e){function t(n,s=qn){let r,o=at.getTransfer(s);if(n===$t)return i.UNSIGNED_BYTE;if(n===La)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Na)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Bc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===kc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Fc)return i.BYTE;if(n===Oc)return i.SHORT;if(n===Gs)return i.UNSIGNED_SHORT;if(n===Da)return i.INT;if(n===Xn)return i.UNSIGNED_INT;if(n===Dn)return i.FLOAT;if(n===Gt)return i.HALF_FLOAT;if(n===zc)return i.ALPHA;if(n===Vc)return i.RGB;if(n===mn)return i.RGBA;if(n===ti)return i.DEPTH_COMPONENT;if(n===ii)return i.DEPTH_STENCIL;if(n===Ua)return i.RED;if(n===Fa)return i.RED_INTEGER;if(n===Ui)return i.RG;if(n===Oa)return i.RG_INTEGER;if(n===Ba)return i.RGBA_INTEGER;if(n===eo||n===to||n===no||n===io)if(o===pt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===eo)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===to)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===no)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===io)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===eo)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===to)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===no)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===io)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ka||n===za||n===Va||n===Ga)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===ka)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===za)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Va)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ga)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ha||n===Wa||n===Xa||n===qa||n===Ya||n===so||n===Za)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Ha||n===Wa)return o===pt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Xa)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===qa)return r.COMPRESSED_R11_EAC;if(n===Ya)return r.COMPRESSED_SIGNED_R11_EAC;if(n===so)return r.COMPRESSED_RG11_EAC;if(n===Za)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Ja||n===$a||n===Ka||n===ja||n===Qa||n===el||n===tl||n===nl||n===il||n===sl||n===rl||n===ol||n===al||n===ll)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Ja)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===$a)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ka)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ja)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Qa)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===el)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===tl)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===nl)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===il)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===sl)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===rl)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ol)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===al)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ll)return o===pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===cl||n===hl||n===ul)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===cl)return o===pt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===hl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ul)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===dl||n===fl||n===ro||n===pl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===dl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===fl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===ro)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===pl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ni?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var Xx=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,qx=`
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

}`,hh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Pr(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Lt({vertexShader:Xx,fragmentShader:qx,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new st(new Mn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},uh=class extends Vn{constructor(e,t){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,u=null,f=null,h=null,d=null,g=null,_=typeof XRWebGLBinding<"u",p=new hh,m={},E=t.getContextAttributes(),C=null,v=null,b=[],S=[],A=new be,x=null,M=new zt;M.viewport=new Mt;let I=new zt;I.viewport=new Mt;let T=[M,I],D=new Ea,B=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Q){let ce=b[Q];return ce===void 0&&(ce=new Ns,b[Q]=ce),ce.getTargetRaySpace()},this.getControllerGrip=function(Q){let ce=b[Q];return ce===void 0&&(ce=new Ns,b[Q]=ce),ce.getGripSpace()},this.getHand=function(Q){let ce=b[Q];return ce===void 0&&(ce=new Ns,b[Q]=ce),ce.getHandSpace()};function z(Q){let ce=S.indexOf(Q.inputSource);if(ce===-1)return;let oe=b[ce];oe!==void 0&&(oe.update(Q.inputSource,Q.frame,c||o),oe.dispatchEvent({type:Q.type,data:Q.inputSource}))}function H(){s.removeEventListener("select",z),s.removeEventListener("selectstart",z),s.removeEventListener("selectend",z),s.removeEventListener("squeeze",z),s.removeEventListener("squeezestart",z),s.removeEventListener("squeezeend",z),s.removeEventListener("end",H),s.removeEventListener("inputsourceschange",P);for(let Q=0;Q<b.length;Q++){let ce=S[Q];ce!==null&&(S[Q]=null,b[Q].disconnect(ce))}B=null,G=null,p.reset();for(let Q in m)delete m[Q];e.setRenderTarget(C),d=null,h=null,f=null,s=null,v=null,Ue.stop(),n.isPresenting=!1,e.setPixelRatio(x),e.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Q){r=Q,n.isPresenting===!0&&We("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Q){a=Q,n.isPresenting===!0&&We("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Q){c=Q},this.getBaseLayer=function(){return h!==null?h:d},this.getBinding=function(){return f===null&&_&&(f=new XRWebGLBinding(s,t)),f},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Q){if(s=Q,s!==null){if(C=e.getRenderTarget(),s.addEventListener("select",z),s.addEventListener("selectstart",z),s.addEventListener("selectend",z),s.addEventListener("squeeze",z),s.addEventListener("squeezestart",z),s.addEventListener("squeezeend",z),s.addEventListener("end",H),s.addEventListener("inputsourceschange",P),E.xrCompatible!==!0&&await t.makeXRCompatible(),x=e.getPixelRatio(),e.getSize(A),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let oe=null,ze=null,Me=null;E.depth&&(Me=E.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,oe=E.stencil?ii:ti,ze=E.stencil?Ni:Xn);let ye={colorFormat:t.RGBA8,depthFormat:Me,scaleFactor:r};f=this.getBinding(),h=f.createProjectionLayer(ye),s.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),v=new Et(h.textureWidth,h.textureHeight,{format:mn,type:$t,depthTexture:new Hn(h.textureWidth,h.textureHeight,ze,void 0,void 0,void 0,void 0,void 0,void 0,oe),stencilBuffer:E.stencil,colorSpace:e.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{let oe={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(s,t,oe),s.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),v=new Et(d.framebufferWidth,d.framebufferHeight,{format:mn,type:$t,colorSpace:e.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Ue.setContext(s),Ue.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function P(Q){for(let ce=0;ce<Q.removed.length;ce++){let oe=Q.removed[ce],ze=S.indexOf(oe);ze>=0&&(S[ze]=null,b[ze].disconnect(oe))}for(let ce=0;ce<Q.added.length;ce++){let oe=Q.added[ce],ze=S.indexOf(oe);if(ze===-1){for(let ye=0;ye<b.length;ye++)if(ye>=S.length){S.push(oe),ze=ye;break}else if(S[ye]===null){S[ye]=oe,ze=ye;break}if(ze===-1)break}let Me=b[ze];Me&&Me.connect(oe)}}let U=new N,q=new N;function ne(Q,ce,oe){U.setFromMatrixPosition(ce.matrixWorld),q.setFromMatrixPosition(oe.matrixWorld);let ze=U.distanceTo(q),Me=ce.projectionMatrix.elements,ye=oe.projectionMatrix.elements,dt=Me[14]/(Me[10]-1),qe=Me[14]/(Me[10]+1),Ge=(Me[9]+1)/Me[5],Oe=(Me[9]-1)/Me[5],Ve=(Me[8]-1)/Me[0],Qe=(ye[8]+1)/ye[0],yt=dt*Ve,bt=dt*Qe,ie=ze/(-Ve+Qe),Ye=ie*-Ve;if(ce.matrixWorld.decompose(Q.position,Q.quaternion,Q.scale),Q.translateX(Ye),Q.translateZ(ie),Q.matrixWorld.compose(Q.position,Q.quaternion,Q.scale),Q.matrixWorldInverse.copy(Q.matrixWorld).invert(),Me[10]===-1)Q.projectionMatrix.copy(ce.projectionMatrix),Q.projectionMatrixInverse.copy(ce.projectionMatrixInverse);else{let Be=dt+ie,O=qe+ie,Ct=yt-Ye,Pe=bt+(ze-Ye),R=Ge*qe/O*Be,y=Oe*qe/O*Be;Q.projectionMatrix.makePerspective(Ct,Pe,R,y,Be,O),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert()}}function se(Q,ce){ce===null?Q.matrixWorld.copy(Q.matrix):Q.matrixWorld.multiplyMatrices(ce.matrixWorld,Q.matrix),Q.matrixWorldInverse.copy(Q.matrixWorld).invert()}this.updateCamera=function(Q){if(s===null)return;let ce=Q.near,oe=Q.far;p.texture!==null&&(p.depthNear>0&&(ce=p.depthNear),p.depthFar>0&&(oe=p.depthFar)),D.near=I.near=M.near=ce,D.far=I.far=M.far=oe,(B!==D.near||G!==D.far)&&(s.updateRenderState({depthNear:D.near,depthFar:D.far}),B=D.near,G=D.far),D.layers.mask=Q.layers.mask|6,M.layers.mask=D.layers.mask&-5,I.layers.mask=D.layers.mask&-3;let ze=Q.parent,Me=D.cameras;se(D,ze);for(let ye=0;ye<Me.length;ye++)se(Me[ye],ze);Me.length===2?ne(D,M,I):D.projectionMatrix.copy(M.projectionMatrix),ae(Q,D,ze)};function ae(Q,ce,oe){oe===null?Q.matrix.copy(ce.matrixWorld):(Q.matrix.copy(oe.matrixWorld),Q.matrix.invert(),Q.matrix.multiply(ce.matrixWorld)),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.updateMatrixWorld(!0),Q.projectionMatrix.copy(ce.projectionMatrix),Q.projectionMatrixInverse.copy(ce.projectionMatrixInverse),Q.isPerspectiveCamera&&(Q.fov=Is*2*Math.atan(1/Q.projectionMatrix.elements[5]),Q.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(h===null&&d===null))return l},this.setFoveation=function(Q){l=Q,h!==null&&(h.fixedFoveation=Q),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=Q)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(D)},this.getCameraTexture=function(Q){return m[Q]};let fe=null;function Ke(Q,ce){if(u=ce.getViewerPose(c||o),g=ce,u!==null){let oe=u.views;d!==null&&(e.setRenderTargetFramebuffer(v,d.framebuffer),e.setRenderTarget(v));let ze=!1;oe.length!==D.cameras.length&&(D.cameras.length=0,ze=!0);for(let qe=0;qe<oe.length;qe++){let Ge=oe[qe],Oe=null;if(d!==null)Oe=d.getViewport(Ge);else{let Qe=f.getViewSubImage(h,Ge);Oe=Qe.viewport,qe===0&&(e.setRenderTargetTextures(v,Qe.colorTexture,Qe.depthStencilTexture),e.setRenderTarget(v))}let Ve=T[qe];Ve===void 0&&(Ve=new zt,Ve.layers.enable(qe),Ve.viewport=new Mt,T[qe]=Ve),Ve.matrix.fromArray(Ge.transform.matrix),Ve.matrix.decompose(Ve.position,Ve.quaternion,Ve.scale),Ve.projectionMatrix.fromArray(Ge.projectionMatrix),Ve.projectionMatrixInverse.copy(Ve.projectionMatrix).invert(),Ve.viewport.set(Oe.x,Oe.y,Oe.width,Oe.height),qe===0&&(D.matrix.copy(Ve.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),ze===!0&&D.cameras.push(Ve)}let Me=s.enabledFeatures;if(Me&&Me.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){f=n.getBinding();let qe=f.getDepthInformation(oe[0]);qe&&qe.isValid&&qe.texture&&p.init(qe,s.renderState)}if(Me&&Me.includes("camera-access")&&_){e.state.unbindTexture(),f=n.getBinding();for(let qe=0;qe<oe.length;qe++){let Ge=oe[qe].camera;if(Ge){let Oe=m[Ge];Oe||(Oe=new Pr,m[Ge]=Oe);let Ve=f.getCameraImage(Ge);Oe.sourceTexture=Ve}}}}for(let oe=0;oe<b.length;oe++){let ze=S[oe],Me=b[oe];ze!==null&&Me!==void 0&&Me.update(ze,ce,c||o)}fe&&fe(Q,ce),ce.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ce}),g=null}let Ue=new td;Ue.setAnimationLoop(Ke),this.setAnimationLoop=function(Q){fe=Q},this.dispose=function(){}}},Yx=new $e,ad=new Ze;ad.set(-1,0,0,0,1,0,0,0,1);function Zx(i,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,Yc(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,E,C,v){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),f(p,m)):m.isMeshPhongMaterial?(r(p,m),u(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),h(p,m),m.isMeshPhysicalMaterial&&d(p,m,v)):m.isMeshMatcapMaterial?(r(p,m),g(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),_(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,E,C):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===en&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===en&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let E=e.get(m),C=E.envMap,v=E.envMapRotation;C&&(p.envMap.value=C,p.envMapRotation.value.setFromMatrix4(Yx.makeRotationFromEuler(v)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(ad),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,E,C){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*E,p.scale.value=C*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function u(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function f(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function h(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function d(p,m,E){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===en&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=E.texture,p.transmissionSamplerSize.value.set(E.width,E.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function _(p,m){let E=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(E.matrixWorld),p.nearDistance.value=E.shadow.camera.near,p.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Jx(i,e,t,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,b){let S=b.program;n.uniformBlockBinding(v,S)}function c(v,b){let S=s[v.id];S===void 0&&(p(v),S=u(v),s[v.id]=S,v.addEventListener("dispose",E));let A=b.program;n.updateUBOMapping(v,A);let x=e.render.frame;r[v.id]!==x&&(h(v),r[v.id]=x)}function u(v){let b=f();v.__bindingPointIndex=b;let S=i.createBuffer(),A=v.__size,x=v.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,A,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,b,S),S}function f(){for(let v=0;v<a;v++)if(o.indexOf(v)===-1)return o.push(v),v;return Xe("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(v){let b=s[v.id],S=v.uniforms,A=v.__cache;i.bindBuffer(i.UNIFORM_BUFFER,b);for(let x=0,M=S.length;x<M;x++){let I=S[x];if(Array.isArray(I))for(let T=0,D=I.length;T<D;T++)d(I[T],x,T,A);else d(I,x,0,A)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function d(v,b,S,A){if(_(v,b,S,A)===!0){let x=v.__offset,M=v.value;if(Array.isArray(M)){let I=0;for(let T=0;T<M.length;T++){let D=M[T],B=m(D);g(D,v.__data,I),typeof D!="number"&&typeof D!="boolean"&&!D.isMatrix3&&!ArrayBuffer.isView(D)&&(I+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(M,v.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,v.__data)}}function g(v,b,S){typeof v=="number"||typeof v=="boolean"?b[0]=v:v.isMatrix3?(b[0]=v.elements[0],b[1]=v.elements[1],b[2]=v.elements[2],b[3]=0,b[4]=v.elements[3],b[5]=v.elements[4],b[6]=v.elements[5],b[7]=0,b[8]=v.elements[6],b[9]=v.elements[7],b[10]=v.elements[8],b[11]=0):ArrayBuffer.isView(v)?b.set(new v.constructor(v.buffer,v.byteOffset,b.length)):v.toArray(b,S)}function _(v,b,S,A){let x=v.value,M=b+"_"+S;if(A[M]===void 0)return typeof x=="number"||typeof x=="boolean"?A[M]=x:ArrayBuffer.isView(x)?A[M]=x.slice():A[M]=x.clone(),!0;{let I=A[M];if(typeof x=="number"||typeof x=="boolean"){if(I!==x)return A[M]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(I.equals(x)===!1)return I.copy(x),!0}}return!1}function p(v){let b=v.uniforms,S=0,A=16;for(let M=0,I=b.length;M<I;M++){let T=Array.isArray(b[M])?b[M]:[b[M]];for(let D=0,B=T.length;D<B;D++){let G=T[D],z=Array.isArray(G.value)?G.value:[G.value];for(let H=0,P=z.length;H<P;H++){let U=z[H],q=m(U),ne=S%A,se=ne%q.boundary,ae=ne+se;S+=se,ae!==0&&A-ae<q.storage&&(S+=A-ae),G.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),G.__offset=S,S+=q.storage}}}let x=S%A;return x>0&&(S+=A-x),v.__size=S,v.__cache={},this}function m(v){let b={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(b.boundary=4,b.storage=4):v.isVector2?(b.boundary=8,b.storage=8):v.isVector3||v.isColor?(b.boundary=16,b.storage=12):v.isVector4?(b.boundary=16,b.storage=16):v.isMatrix3?(b.boundary=48,b.storage=48):v.isMatrix4?(b.boundary=64,b.storage=64):v.isTexture?We("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(v)?(b.boundary=16,b.storage=v.byteLength):We("WebGLRenderer: Unsupported uniform value type.",v),b}function E(v){let b=v.target;b.removeEventListener("dispose",E);let S=o.indexOf(b.__bindingPointIndex);o.splice(S,1),i.deleteBuffer(s[b.id]),delete s[b.id],delete r[b.id]}function C(){for(let v in s)i.deleteBuffer(s[v]);o=[],s={},r={}}return{bind:l,update:c,dispose:C}}var $x=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ri=null;function Kx(){return ri===null&&(ri=new Gn($x,16,16,Ui,Gt),ri.name="DFG_LUT",ri.minFilter=Kt,ri.magFilter=Kt,ri.wrapS=ei,ri.wrapT=ei,ri.generateMipmaps=!1,ri.needsUpdate=!0),ri}var yl=class{constructor(e={}){let{canvas:t=Au(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:h=!1,outputBufferType:d=$t}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;let _=d,p=new Set([Ba,Oa,Fa]),m=new Set([$t,Xn,Gs,Ni,La,Na]),E=new Uint32Array(4),C=new Int32Array(4),v=new N,b=null,S=null,A=[],x=[],M=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Wn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let I=this,T=!1,D=null,B=null,G=null,z=null;this._outputColorSpace=Rt;let H=0,P=0,U=null,q=-1,ne=null,se=new Mt,ae=new Mt,fe=null,Ke=new Ee(0),Ue=0,Q=t.width,ce=t.height,oe=1,ze=null,Me=null,ye=new Mt(0,0,Q,ce),dt=new Mt(0,0,Q,ce),qe=!1,Ge=new Fs,Oe=!1,Ve=!1,Qe=new $e,yt=new N,bt=new Mt,ie={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ye=!1;function Be(){return U===null?oe:1}let O=n;function Ct(w,k){return t.getContext(w,k)}try{let w={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"185"}`),t.addEventListener("webglcontextlost",ht,!1),t.addEventListener("webglcontextrestored",et,!1),t.addEventListener("webglcontextcreationerror",un,!1),O===null){let k="webgl2";if(O=Ct(k,w),O===null)throw Ct(k)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(w){throw Xe("WebGLRenderer: "+w.message),w}let Pe,R,y,V,W,j,le,pe,J,te,K,De,me,de,Ie,Fe,He,F,xe,$,ve,Se,re;function he(){Pe=new sg(O),Pe.init(),ve=new Wx(O,Pe),R=new $0(O,Pe,e,ve),y=new Gx(O,Pe),R.reversedDepthBuffer&&h&&y.buffers.depth.setReversed(!0),B=O.createFramebuffer(),G=O.createFramebuffer(),z=O.createFramebuffer(),V=new ag(O),W=new Cx,j=new Hx(O,Pe,y,W,R,ve,V),le=new ig(I),pe=new up(O),Se=new Z0(O,pe),J=new rg(O,pe,V,Se),te=new cg(O,J,pe,Se,V),F=new lg(O,R,j),Ie=new K0(W),K=new Ax(I,le,Pe,R,Se,Ie),De=new Zx(I,W),me=new Px,de=new Fx(Pe),He=new Y0(I,le,y,te,g,l),Fe=new Vx(I,te,R),re=new Jx(O,V,R,y),xe=new J0(O,Pe,V),$=new og(O,Pe,V),V.programs=K.programs,I.capabilities=R,I.extensions=Pe,I.properties=W,I.renderLists=me,I.shadowMap=Fe,I.state=y,I.info=V}he(),_!==$t&&(M=new ug(_,t.width,t.height,a,s,r));let Re=new uh(I,O);this.xr=Re,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let w=Pe.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){let w=Pe.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return oe},this.setPixelRatio=function(w){w!==void 0&&(oe=w,this.setSize(Q,ce,!1))},this.getSize=function(w){return w.set(Q,ce)},this.setSize=function(w,k,Z=!0){if(Re.isPresenting){We("WebGLRenderer: Can't change size while VR device is presenting.");return}Q=w,ce=k,t.width=Math.floor(w*oe),t.height=Math.floor(k*oe),Z===!0&&(t.style.width=w+"px",t.style.height=k+"px"),M!==null&&M.setSize(t.width,t.height),this.setViewport(0,0,w,k)},this.getDrawingBufferSize=function(w){return w.set(Q*oe,ce*oe).floor()},this.setDrawingBufferSize=function(w,k,Z){Q=w,ce=k,oe=Z,t.width=Math.floor(w*Z),t.height=Math.floor(k*Z),this.setViewport(0,0,w,k)},this.setEffects=function(w){if(_===$t){Xe("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(w){for(let k=0;k<w.length;k++)if(w[k].isOutputPass===!0){We("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}M.setEffects(w||[])},this.getCurrentViewport=function(w){return w.copy(se)},this.getViewport=function(w){return w.copy(ye)},this.setViewport=function(w,k,Z,Y){w.isVector4?ye.set(w.x,w.y,w.z,w.w):ye.set(w,k,Z,Y),y.viewport(se.copy(ye).multiplyScalar(oe).round())},this.getScissor=function(w){return w.copy(dt)},this.setScissor=function(w,k,Z,Y){w.isVector4?dt.set(w.x,w.y,w.z,w.w):dt.set(w,k,Z,Y),y.scissor(ae.copy(dt).multiplyScalar(oe).round())},this.getScissorTest=function(){return qe},this.setScissorTest=function(w){y.setScissorTest(qe=w)},this.setOpaqueSort=function(w){ze=w},this.setTransparentSort=function(w){Me=w},this.getClearColor=function(w){return w.copy(He.getClearColor())},this.setClearColor=function(){He.setClearColor(...arguments)},this.getClearAlpha=function(){return He.getClearAlpha()},this.setClearAlpha=function(){He.setClearAlpha(...arguments)},this.clear=function(w=!0,k=!0,Z=!0){let Y=0;if(w){let X=!1;if(U!==null){let Te=U.texture.format;X=p.has(Te)}if(X){let Te=U.texture.type,Ce=m.has(Te),ge=He.getClearColor(),Le=He.getClearAlpha(),Ne=ge.r,Je=ge.g,tt=ge.b;Ce?(E[0]=Ne,E[1]=Je,E[2]=tt,E[3]=Le,O.clearBufferuiv(O.COLOR,0,E)):(C[0]=Ne,C[1]=Je,C[2]=tt,C[3]=Le,O.clearBufferiv(O.COLOR,0,C))}else Y|=O.COLOR_BUFFER_BIT}k&&(Y|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),Z&&(Y|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),Y!==0&&O.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(w){w.setRenderer(this),D=w},this.dispose=function(){t.removeEventListener("webglcontextlost",ht,!1),t.removeEventListener("webglcontextrestored",et,!1),t.removeEventListener("webglcontextcreationerror",un,!1),He.dispose(),me.dispose(),de.dispose(),W.dispose(),le.dispose(),te.dispose(),Se.dispose(),re.dispose(),K.dispose(),Re.dispose(),Re.removeEventListener("sessionstart",ir),Re.removeEventListener("sessionend",hs),li.stop()};function ht(w){w.preventDefault(),Hc("WebGLRenderer: Context Lost."),T=!0}function et(){Hc("WebGLRenderer: Context Restored."),T=!1;let w=V.autoReset,k=Fe.enabled,Z=Fe.autoUpdate,Y=Fe.needsUpdate,X=Fe.type;he(),V.autoReset=w,Fe.enabled=k,Fe.autoUpdate=Z,Fe.needsUpdate=Y,Fe.type=X}function un(w){Xe("WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function ot(w){let k=w.target;k.removeEventListener("dispose",ot),Jn(k)}function Jn(w){ls(w),W.remove(w)}function ls(w){let k=W.get(w).programs;k!==void 0&&(k.forEach(function(Z){K.releaseProgram(Z)}),w.isShaderMaterial&&K.releaseShaderCache(w))}this.renderBufferDirect=function(w,k,Z,Y,X,Te){k===null&&(k=ie);let Ce=X.isMesh&&X.matrixWorld.determinantAffine()<0,ge=Mo(w,k,Z,Y,X);y.setMaterial(Y,Ce);let Le=Z.index,Ne=1;if(Y.wireframe===!0){if(Le=J.getWireframeAttribute(Z),Le===void 0)return;Ne=2}let Je=Z.drawRange,tt=Z.attributes.position,ke=Je.start*Ne,ft=(Je.start+Je.count)*Ne;Te!==null&&(ke=Math.max(ke,Te.start*Ne),ft=Math.min(ft,(Te.start+Te.count)*Ne)),Le!==null?(ke=Math.max(ke,0),ft=Math.min(ft,Le.count)):tt!=null&&(ke=Math.max(ke,0),ft=Math.min(ft,tt.count));let At=ft-ke;if(At<0||At===1/0)return;Se.setup(X,Y,ge,Z,Le);let ct,mt=xe;if(Le!==null&&(ct=pe.get(Le),mt=$,mt.setIndex(ct)),X.isMesh)Y.wireframe===!0?(y.setLineWidth(Y.wireframeLinewidth*Be()),mt.setMode(O.LINES)):mt.setMode(O.TRIANGLES);else if(X.isLine){let qt=Y.linewidth;qt===void 0&&(qt=1),y.setLineWidth(qt*Be()),X.isLineSegments?mt.setMode(O.LINES):X.isLineLoop?mt.setMode(O.LINE_LOOP):mt.setMode(O.LINE_STRIP)}else X.isPoints?mt.setMode(O.POINTS):X.isSprite&&mt.setMode(O.TRIANGLES);if(X.isBatchedMesh)if(Pe.get("WEBGL_multi_draw"))mt.renderMultiDraw(X._multiDrawStarts,X._multiDrawCounts,X._multiDrawCount);else{let qt=X._multiDrawStarts,Ae=X._multiDrawCounts,nn=X._multiDrawCount,lt=Le?pe.get(Le).bytesPerElement:1,Bt=W.get(Y).currentProgram.getUniforms();for(let xn=0;xn<nn;xn++)Bt.setValue(O,"_gl_DrawID",xn),mt.render(qt[xn]/lt,Ae[xn])}else if(X.isInstancedMesh)mt.renderInstances(ke,At,X.count);else if(Z.isInstancedBufferGeometry){let qt=Z._maxInstanceCount!==void 0?Z._maxInstanceCount:1/0,Ae=Math.min(Z.instanceCount,qt);mt.renderInstances(ke,At,Ae)}else mt.render(ke,At)};function Nt(w,k,Z){w.transparent===!0&&w.side===pn&&w.forceSinglePass===!1?(w.side=en,w.needsUpdate=!0,$n(w,k,Z),w.side=mi,w.needsUpdate=!0,$n(w,k,Z),w.side=pn):$n(w,k,Z)}this.compile=function(w,k,Z=null){Z===null&&(Z=w),S=de.get(Z),S.init(k),x.push(S),Z.traverseVisible(function(X){X.isLight&&X.layers.test(k.layers)&&(S.pushLight(X),X.castShadow&&S.pushShadow(X))}),w!==Z&&w.traverseVisible(function(X){X.isLight&&X.layers.test(k.layers)&&(S.pushLight(X),X.castShadow&&S.pushShadow(X))}),S.setupLights();let Y=new Set;return w.traverse(function(X){if(!(X.isMesh||X.isPoints||X.isLine||X.isSprite))return;let Te=X.material;if(Te)if(Array.isArray(Te))for(let Ce=0;Ce<Te.length;Ce++){let ge=Te[Ce];Nt(ge,Z,X),Y.add(ge)}else Nt(Te,Z,X),Y.add(Te)}),S=x.pop(),Y},this.compileAsync=function(w,k,Z=null){let Y=this.compile(w,k,Z);return new Promise(X=>{function Te(){if(Y.forEach(function(Ce){W.get(Ce).currentProgram.isReady()&&Y.delete(Ce)}),Y.size===0){X(w);return}setTimeout(Te,10)}Pe.get("KHR_parallel_shader_compile")!==null?Te():setTimeout(Te,10)})};let cs=null;function Xl(w){cs&&cs(w)}function ir(){li.stop()}function hs(){li.start()}let li=new td;li.setAnimationLoop(Xl),typeof self<"u"&&li.setContext(self),this.setAnimationLoop=function(w){cs=w,Re.setAnimationLoop(w),w===null?li.stop():li.start()},Re.addEventListener("sessionstart",ir),Re.addEventListener("sessionend",hs),this.render=function(w,k){if(k!==void 0&&k.isCamera!==!0){Xe("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(T===!0)return;D!==null&&D.renderStart(w,k);let Z=Re.enabled===!0&&Re.isPresenting===!0,Y=M!==null&&(U===null||Z)&&M.begin(I,U);if(w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),Re.enabled===!0&&Re.isPresenting===!0&&(M===null||M.isCompositing()===!1)&&(Re.cameraAutoUpdate===!0&&Re.updateCamera(k),k=Re.getCamera()),w.isScene===!0&&w.onBeforeRender(I,w,k,U),S=de.get(w,x.length),S.init(k),S.state.textureUnits=j.getTextureUnits(),x.push(S),Qe.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),Ge.setFromProjectionMatrix(Qe,zn,k.reversedDepth),Ve=this.localClippingEnabled,Oe=Ie.init(this.clippingPlanes,Ve),b=me.get(w,A.length),b.init(),A.push(b),Re.enabled===!0&&Re.isPresenting===!0){let Ce=I.xr.getDepthSensingMesh();Ce!==null&&sr(Ce,k,-1/0,I.sortObjects)}sr(w,k,0,I.sortObjects),b.finish(),I.sortObjects===!0&&b.sort(ze,Me,k.reversedDepth),Ye=Re.enabled===!1||Re.isPresenting===!1||Re.hasDepthSensing()===!1,Ye&&He.addToRenderList(b,w),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Oe===!0&&Ie.beginShadows();let X=S.state.shadowsArray;if(Fe.render(X,w,k),Oe===!0&&Ie.endShadows(),(Y&&M.hasRenderPass())===!1){let Ce=b.opaque,ge=b.transmissive;if(S.setupLights(),k.isArrayCamera){let Le=k.cameras;if(ge.length>0)for(let Ne=0,Je=Le.length;Ne<Je;Ne++){let tt=Le[Ne];rr(Ce,ge,w,tt)}Ye&&He.render(w);for(let Ne=0,Je=Le.length;Ne<Je;Ne++){let tt=Le[Ne];Oi(b,w,tt,tt.viewport)}}else ge.length>0&&rr(Ce,ge,w,k),Ye&&He.render(w),Oi(b,w,k)}U!==null&&P===0&&(j.updateMultisampleRenderTarget(U),j.updateRenderTargetMipmap(U)),Y&&M.end(I),w.isScene===!0&&w.onAfterRender(I,w,k),Se.resetDefaultState(),q=-1,ne=null,x.pop(),x.length>0?(S=x[x.length-1],j.setTextureUnits(S.state.textureUnits),Oe===!0&&Ie.setGlobalState(I.clippingPlanes,S.state.camera)):S=null,A.pop(),A.length>0?b=A[A.length-1]:b=null,D!==null&&D.renderEnd()};function sr(w,k,Z,Y){if(w.visible===!1)return;if(w.layers.test(k.layers)){if(w.isGroup)Z=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(k);else if(w.isLightProbeGrid)S.pushLightProbeGrid(w);else if(w.isLight)S.pushLight(w),w.castShadow&&S.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||Ge.intersectsSprite(w)){Y&&bt.setFromMatrixPosition(w.matrixWorld).applyMatrix4(Qe);let Ce=te.update(w),ge=w.material;ge.visible&&b.push(w,Ce,ge,Z,bt.z,null)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||Ge.intersectsObject(w))){let Ce=te.update(w),ge=w.material;if(Y&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),bt.copy(w.boundingSphere.center)):(Ce.boundingSphere===null&&Ce.computeBoundingSphere(),bt.copy(Ce.boundingSphere.center)),bt.applyMatrix4(w.matrixWorld).applyMatrix4(Qe)),Array.isArray(ge)){let Le=Ce.groups;for(let Ne=0,Je=Le.length;Ne<Je;Ne++){let tt=Le[Ne],ke=ge[tt.materialIndex];ke&&ke.visible&&b.push(w,Ce,ke,Z,bt.z,tt)}}else ge.visible&&b.push(w,Ce,ge,Z,bt.z,null)}}let Te=w.children;for(let Ce=0,ge=Te.length;Ce<ge;Ce++)sr(Te[Ce],k,Z,Y)}function Oi(w,k,Z,Y){let{opaque:X,transmissive:Te,transparent:Ce}=w;S.setupLightsView(Z),Oe===!0&&Ie.setGlobalState(I.clippingPlanes,Z),Y&&y.viewport(se.copy(Y)),X.length>0&&Bi(X,k,Z),Te.length>0&&Bi(Te,k,Z),Ce.length>0&&Bi(Ce,k,Z),y.buffers.depth.setTest(!0),y.buffers.depth.setMask(!0),y.buffers.color.setMask(!0),y.setPolygonOffset(!1)}function rr(w,k,Z,Y){if((Z.isScene===!0?Z.overrideMaterial:null)!==null)return;if(S.state.transmissionRenderTarget[Y.id]===void 0){let ke=Pe.has("EXT_color_buffer_half_float")||Pe.has("EXT_color_buffer_float");S.state.transmissionRenderTarget[Y.id]=new Et(1,1,{generateMipmaps:!0,type:ke?Gt:$t,minFilter:Li,samples:Math.max(4,R.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:at.workingColorSpace})}let Te=S.state.transmissionRenderTarget[Y.id],Ce=Y.viewport||se;Te.setSize(Ce.z*I.transmissionResolutionScale,Ce.w*I.transmissionResolutionScale);let ge=I.getRenderTarget(),Le=I.getActiveCubeFace(),Ne=I.getActiveMipmapLevel();I.setRenderTarget(Te),I.getClearColor(Ke),Ue=I.getClearAlpha(),Ue<1&&I.setClearColor(16777215,.5),I.clear(),Ye&&He.render(Z);let Je=I.toneMapping;I.toneMapping=Wn;let tt=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),S.setupLightsView(Y),Oe===!0&&Ie.setGlobalState(I.clippingPlanes,Y),Bi(w,Z,Y),j.updateMultisampleRenderTarget(Te),j.updateRenderTargetMipmap(Te),Pe.has("WEBGL_multisampled_render_to_texture")===!1){let ke=!1;for(let ft=0,At=k.length;ft<At;ft++){let ct=k[ft],{object:mt,geometry:qt,material:Ae,group:nn}=ct;if(Ae.side===pn&&mt.layers.test(Y.layers)){let lt=Ae.side;Ae.side=en,Ae.needsUpdate=!0,us(mt,Z,Y,qt,Ae,nn),Ae.side=lt,Ae.needsUpdate=!0,ke=!0}}ke===!0&&(j.updateMultisampleRenderTarget(Te),j.updateRenderTargetMipmap(Te))}I.setRenderTarget(ge,Le,Ne),I.setClearColor(Ke,Ue),tt!==void 0&&(Y.viewport=tt),I.toneMapping=Je}function Bi(w,k,Z){let Y=k.isScene===!0?k.overrideMaterial:null;for(let X=0,Te=w.length;X<Te;X++){let Ce=w[X],{object:ge,geometry:Le,group:Ne}=Ce,Je=Ce.material;Je.allowOverride===!0&&Y!==null&&(Je=Y),ge.layers.test(Z.layers)&&us(ge,k,Z,Le,Je,Ne)}}function us(w,k,Z,Y,X,Te){w.onBeforeRender(I,k,Z,Y,X,Te),w.modelViewMatrix.multiplyMatrices(Z.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),X.onBeforeRender(I,k,Z,Y,w,Te),X.transparent===!0&&X.side===pn&&X.forceSinglePass===!1?(X.side=en,X.needsUpdate=!0,I.renderBufferDirect(Z,k,Y,X,w,Te),X.side=mi,X.needsUpdate=!0,I.renderBufferDirect(Z,k,Y,X,w,Te),X.side=pn):I.renderBufferDirect(Z,k,Y,X,w,Te),w.onAfterRender(I,k,Z,Y,X,Te)}function $n(w,k,Z){k.isScene!==!0&&(k=ie);let Y=W.get(w),X=S.state.lights,Te=S.state.shadowsArray,Ce=X.state.version,ge=K.getParameters(w,X.state,Te,k,Z,S.state.lightProbeGridArray),Le=K.getProgramCacheKey(ge),Ne=Y.programs;Y.environment=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?k.environment:null,Y.fog=k.fog;let Je=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap;Y.envMap=le.get(w.envMap||Y.environment,Je),Y.envMapRotation=Y.environment!==null&&w.envMap===null?k.environmentRotation:w.envMapRotation,Ne===void 0&&(w.addEventListener("dispose",ot),Ne=new Map,Y.programs=Ne);let tt=Ne.get(Le);if(tt!==void 0){if(Y.currentProgram===tt&&Y.lightsStateVersion===Ce)return or(w,ge),tt}else ge.uniforms=K.getUniforms(w),D!==null&&w.isNodeMaterial&&D.build(w,Z,ge),w.onBeforeCompile(ge,I),tt=K.acquireProgram(ge,Le),Ne.set(Le,tt),Y.uniforms=ge.uniforms;let ke=Y.uniforms;return(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)&&(ke.clippingPlanes=Ie.uniform),or(w,ge),Y.needsLights=Kn(w),Y.lightsStateVersion=Ce,Y.needsLights&&(ke.ambientLightColor.value=X.state.ambient,ke.lightProbe.value=X.state.probe,ke.directionalLights.value=X.state.directional,ke.directionalLightShadows.value=X.state.directionalShadow,ke.spotLights.value=X.state.spot,ke.spotLightShadows.value=X.state.spotShadow,ke.rectAreaLights.value=X.state.rectArea,ke.ltc_1.value=X.state.rectAreaLTC1,ke.ltc_2.value=X.state.rectAreaLTC2,ke.pointLights.value=X.state.point,ke.pointLightShadows.value=X.state.pointShadow,ke.hemisphereLights.value=X.state.hemi,ke.directionalShadowMatrix.value=X.state.directionalShadowMatrix,ke.spotLightMatrix.value=X.state.spotLightMatrix,ke.spotLightMap.value=X.state.spotLightMap,ke.pointShadowMatrix.value=X.state.pointShadowMatrix),Y.lightProbeGrid=S.state.lightProbeGridArray.length>0,Y.currentProgram=tt,Y.uniformsList=null,tt}function _i(w){if(w.uniformsList===null){let k=w.currentProgram.getUniforms();w.uniformsList=qs.seqWithValue(k.seq,w.uniforms)}return w.uniformsList}function or(w,k){let Z=W.get(w);Z.outputColorSpace=k.outputColorSpace,Z.batching=k.batching,Z.batchingColor=k.batchingColor,Z.instancing=k.instancing,Z.instancingColor=k.instancingColor,Z.instancingMorph=k.instancingMorph,Z.skinning=k.skinning,Z.morphTargets=k.morphTargets,Z.morphNormals=k.morphNormals,Z.morphColors=k.morphColors,Z.morphTargetsCount=k.morphTargetsCount,Z.numClippingPlanes=k.numClippingPlanes,Z.numIntersection=k.numClipIntersection,Z.vertexAlphas=k.vertexAlphas,Z.vertexTangents=k.vertexTangents,Z.toneMapping=k.toneMapping}function yo(w,k){if(w.length===0)return null;if(w.length===1)return w[0].texture!==null?w[0]:null;v.setFromMatrixPosition(k.matrixWorld);for(let Z=0,Y=w.length;Z<Y;Z++){let X=w[Z];if(X.texture!==null&&X.boundingBox.containsPoint(v))return X}return null}function Mo(w,k,Z,Y,X){k.isScene!==!0&&(k=ie),j.resetTextureUnits();let Te=k.fog,Ce=Y.isMeshStandardMaterial||Y.isMeshLambertMaterial||Y.isMeshPhongMaterial?k.environment:null,ge=U===null?I.outputColorSpace:U.isXRRenderTarget===!0?U.texture.colorSpace:at.workingColorSpace,Le=Y.isMeshStandardMaterial||Y.isMeshLambertMaterial&&!Y.envMap||Y.isMeshPhongMaterial&&!Y.envMap,Ne=le.get(Y.envMap||Ce,Le),Je=Y.vertexColors===!0&&!!Z.attributes.color&&Z.attributes.color.itemSize===4,tt=!!Z.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),ke=!!Z.morphAttributes.position,ft=!!Z.morphAttributes.normal,At=!!Z.morphAttributes.color,ct=Wn;Y.toneMapped&&(U===null||U.isXRRenderTarget===!0)&&(ct=I.toneMapping);let mt=Z.morphAttributes.position||Z.morphAttributes.normal||Z.morphAttributes.color,qt=mt!==void 0?mt.length:0,Ae=W.get(Y),nn=S.state.lights;if(Oe===!0&&(Ve===!0||w!==ne)){let xt=w===ne&&Y.id===q;Ie.setState(Y,w,xt)}let lt=!1;Y.version===Ae.__version?(Ae.needsLights&&Ae.lightsStateVersion!==nn.state.version||Ae.outputColorSpace!==ge||X.isBatchedMesh&&Ae.batching===!1||!X.isBatchedMesh&&Ae.batching===!0||X.isBatchedMesh&&Ae.batchingColor===!0&&X.colorTexture===null||X.isBatchedMesh&&Ae.batchingColor===!1&&X.colorTexture!==null||X.isInstancedMesh&&Ae.instancing===!1||!X.isInstancedMesh&&Ae.instancing===!0||X.isSkinnedMesh&&Ae.skinning===!1||!X.isSkinnedMesh&&Ae.skinning===!0||X.isInstancedMesh&&Ae.instancingColor===!0&&X.instanceColor===null||X.isInstancedMesh&&Ae.instancingColor===!1&&X.instanceColor!==null||X.isInstancedMesh&&Ae.instancingMorph===!0&&X.morphTexture===null||X.isInstancedMesh&&Ae.instancingMorph===!1&&X.morphTexture!==null||Ae.envMap!==Ne||Y.fog===!0&&Ae.fog!==Te||Ae.numClippingPlanes!==void 0&&(Ae.numClippingPlanes!==Ie.numPlanes||Ae.numIntersection!==Ie.numIntersection)||Ae.vertexAlphas!==Je||Ae.vertexTangents!==tt||Ae.morphTargets!==ke||Ae.morphNormals!==ft||Ae.morphColors!==At||Ae.toneMapping!==ct||Ae.morphTargetsCount!==qt||!!Ae.lightProbeGrid!=S.state.lightProbeGridArray.length>0)&&(lt=!0):(lt=!0,Ae.__version=Y.version);let Bt=Ae.currentProgram;lt===!0&&(Bt=$n(Y,k,X),D&&Y.isNodeMaterial&&D.onUpdateProgram(Y,Bt,Ae));let xn=!1,dn=!1,fn=!1,gt=Bt.getUniforms(),Tt=Ae.uniforms;if(y.useProgram(Bt.program)&&(xn=!0,dn=!0,fn=!0),Y.id!==q&&(q=Y.id,dn=!0),Ae.needsLights){let xt=yo(S.state.lightProbeGridArray,X);Ae.lightProbeGrid!==xt&&(Ae.lightProbeGrid=xt,dn=!0)}if(xn||ne!==w){y.buffers.depth.getReversed()&&w.reversedDepth!==!0&&(w._reversedDepth=!0,w.updateProjectionMatrix()),gt.setValue(O,"projectionMatrix",w.projectionMatrix),gt.setValue(O,"viewMatrix",w.matrixWorldInverse);let Fn=gt.map.cameraPosition;Fn!==void 0&&Fn.setValue(O,yt.setFromMatrixPosition(w.matrixWorld)),R.logarithmicDepthBuffer&&gt.setValue(O,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&gt.setValue(O,"isOrthographic",w.isOrthographicCamera===!0),ne!==w&&(ne=w,dn=!0,fn=!0)}if(Ae.needsLights&&(nn.state.directionalShadowMap.length>0&&gt.setValue(O,"directionalShadowMap",nn.state.directionalShadowMap,j),nn.state.spotShadowMap.length>0&&gt.setValue(O,"spotShadowMap",nn.state.spotShadowMap,j),nn.state.pointShadowMap.length>0&&gt.setValue(O,"pointShadowMap",nn.state.pointShadowMap,j)),X.isSkinnedMesh){gt.setOptional(O,X,"bindMatrix"),gt.setOptional(O,X,"bindMatrixInverse");let xt=X.skeleton;xt&&(xt.boneTexture===null&&xt.computeBoneTexture(),gt.setValue(O,"boneTexture",xt.boneTexture,j))}X.isBatchedMesh&&(gt.setOptional(O,X,"batchingTexture"),gt.setValue(O,"batchingTexture",X._matricesTexture,j),gt.setOptional(O,X,"batchingIdTexture"),gt.setValue(O,"batchingIdTexture",X._indirectTexture,j),gt.setOptional(O,X,"batchingColorTexture"),X._colorsTexture!==null&&gt.setValue(O,"batchingColorTexture",X._colorsTexture,j));let Un=Z.morphAttributes;if((Un.position!==void 0||Un.normal!==void 0||Un.color!==void 0)&&F.update(X,Z,Bt),(dn||Ae.receiveShadow!==X.receiveShadow)&&(Ae.receiveShadow=X.receiveShadow,gt.setValue(O,"receiveShadow",X.receiveShadow)),(Y.isMeshStandardMaterial||Y.isMeshLambertMaterial||Y.isMeshPhongMaterial)&&Y.envMap===null&&k.environment!==null&&(Tt.envMapIntensity.value=k.environmentIntensity),Tt.dfgLUT!==void 0&&(Tt.dfgLUT.value=Kx()),dn){if(gt.setValue(O,"toneMappingExposure",I.toneMappingExposure),Ae.needsLights&&ar(Tt,fn),Te&&Y.fog===!0&&De.refreshFogUniforms(Tt,Te),De.refreshMaterialUniforms(Tt,Y,oe,ce,S.state.transmissionRenderTarget[w.id]),Ae.needsLights&&Ae.lightProbeGrid){let xt=Ae.lightProbeGrid;Tt.probesSH.value=xt.texture,Tt.probesMin.value.copy(xt.boundingBox.min),Tt.probesMax.value.copy(xt.boundingBox.max),Tt.probesResolution.value.copy(xt.resolution)}qs.upload(O,_i(Ae),Tt,j)}if(Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&(qs.upload(O,_i(Ae),Tt,j),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&gt.setValue(O,"center",X.center),gt.setValue(O,"modelViewMatrix",X.modelViewMatrix),gt.setValue(O,"normalMatrix",X.normalMatrix),gt.setValue(O,"modelMatrix",X.matrixWorld),Y.uniformsGroups!==void 0){let xt=Y.uniformsGroups;for(let Fn=0,jn=xt.length;Fn<jn;Fn++){let lr=xt[Fn];re.update(lr,Bt),re.bind(lr,Bt)}}return Bt}function ar(w,k){w.ambientLightColor.needsUpdate=k,w.lightProbe.needsUpdate=k,w.directionalLights.needsUpdate=k,w.directionalLightShadows.needsUpdate=k,w.pointLights.needsUpdate=k,w.pointLightShadows.needsUpdate=k,w.spotLights.needsUpdate=k,w.spotLightShadows.needsUpdate=k,w.rectAreaLights.needsUpdate=k,w.hemisphereLights.needsUpdate=k}function Kn(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return H},this.getActiveMipmapLevel=function(){return P},this.getRenderTarget=function(){return U},this.setRenderTargetTextures=function(w,k,Z){let Y=W.get(w);Y.__autoAllocateDepthBuffer=w.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),W.get(w.texture).__webglTexture=k,W.get(w.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:Z,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(w,k){let Z=W.get(w);Z.__webglFramebuffer=k,Z.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(w,k=0,Z=0){U=w,H=k,P=Z;let Y=null,X=!1,Te=!1;if(w){let ge=W.get(w);if(ge.__useDefaultFramebuffer!==void 0){y.bindFramebuffer(O.FRAMEBUFFER,ge.__webglFramebuffer),se.copy(w.viewport),ae.copy(w.scissor),fe=w.scissorTest,y.viewport(se),y.scissor(ae),y.setScissorTest(fe),q=-1;return}else if(ge.__webglFramebuffer===void 0)j.setupRenderTarget(w);else if(ge.__hasExternalTextures)j.rebindTextures(w,W.get(w.texture).__webglTexture,W.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){let Je=w.depthTexture;if(ge.__boundDepthTexture!==Je){if(Je!==null&&W.has(Je)&&(w.width!==Je.image.width||w.height!==Je.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");j.setupDepthRenderbuffer(w)}}let Le=w.texture;(Le.isData3DTexture||Le.isDataArrayTexture||Le.isCompressedArrayTexture)&&(Te=!0);let Ne=W.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(Array.isArray(Ne[k])?Y=Ne[k][Z]:Y=Ne[k],X=!0):w.samples>0&&j.useMultisampledRTT(w)===!1?Y=W.get(w).__webglMultisampledFramebuffer:Array.isArray(Ne)?Y=Ne[Z]:Y=Ne,se.copy(w.viewport),ae.copy(w.scissor),fe=w.scissorTest}else se.copy(ye).multiplyScalar(oe).floor(),ae.copy(dt).multiplyScalar(oe).floor(),fe=qe;if(Z!==0&&(Y=B),y.bindFramebuffer(O.FRAMEBUFFER,Y)&&y.drawBuffers(w,Y),y.viewport(se),y.scissor(ae),y.setScissorTest(fe),X){let ge=W.get(w.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+k,ge.__webglTexture,Z)}else if(Te){let ge=k;for(let Le=0;Le<w.textures.length;Le++){let Ne=W.get(w.textures[Le]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+Le,Ne.__webglTexture,Z,ge)}}else if(w!==null&&Z!==0){let ge=W.get(w.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,ge.__webglTexture,Z)}q=-1},this.readRenderTargetPixels=function(w,k,Z,Y,X,Te,Ce,ge=0){if(!(w&&w.isWebGLRenderTarget)){Xe("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Le=W.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&Ce!==void 0&&(Le=Le[Ce]),Le){y.bindFramebuffer(O.FRAMEBUFFER,Le);try{let Ne=w.textures[ge],Je=Ne.format,tt=Ne.type;if(w.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+ge),!R.textureFormatReadable(Je)){Xe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!R.textureTypeReadable(tt)){Xe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=w.width-Y&&Z>=0&&Z<=w.height-X&&O.readPixels(k,Z,Y,X,ve.convert(Je),ve.convert(tt),Te)}finally{let Ne=U!==null?W.get(U).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Ne)}}},this.readRenderTargetPixelsAsync=async function(w,k,Z,Y,X,Te,Ce,ge=0){if(!(w&&w.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Le=W.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&Ce!==void 0&&(Le=Le[Ce]),Le)if(k>=0&&k<=w.width-Y&&Z>=0&&Z<=w.height-X){y.bindFramebuffer(O.FRAMEBUFFER,Le);let Ne=w.textures[ge],Je=Ne.format,tt=Ne.type;if(w.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+ge),!R.textureFormatReadable(Je))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!R.textureTypeReadable(tt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ke=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,ke),O.bufferData(O.PIXEL_PACK_BUFFER,Te.byteLength,O.STREAM_READ),O.readPixels(k,Z,Y,X,ve.convert(Je),ve.convert(tt),0);let ft=U!==null?W.get(U).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,ft);let At=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Ru(O,At,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,ke),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,Te),O.deleteBuffer(ke),O.deleteSync(At),Te}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(w,k=null,Z=0){let Y=Math.pow(2,-Z),X=Math.floor(w.image.width*Y),Te=Math.floor(w.image.height*Y),Ce=k!==null?k.x:0,ge=k!==null?k.y:0;j.setTexture2D(w,0),O.copyTexSubImage2D(O.TEXTURE_2D,Z,0,0,Ce,ge,X,Te),y.unbindTexture()},this.copyTextureToTexture=function(w,k,Z=null,Y=null,X=0,Te=0){let Ce,ge,Le,Ne,Je,tt,ke,ft,At,ct=w.isCompressedTexture?w.mipmaps[Te]:w.image;if(Z!==null)Ce=Z.max.x-Z.min.x,ge=Z.max.y-Z.min.y,Le=Z.isBox3?Z.max.z-Z.min.z:1,Ne=Z.min.x,Je=Z.min.y,tt=Z.isBox3?Z.min.z:0;else{let Tt=Math.pow(2,-X);Ce=Math.floor(ct.width*Tt),ge=Math.floor(ct.height*Tt),w.isDataArrayTexture?Le=ct.depth:w.isData3DTexture?Le=Math.floor(ct.depth*Tt):Le=1,Ne=0,Je=0,tt=0}Y!==null?(ke=Y.x,ft=Y.y,At=Y.z):(ke=0,ft=0,At=0);let mt=ve.convert(k.format),qt=ve.convert(k.type),Ae;k.isData3DTexture?(j.setTexture3D(k,0),Ae=O.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(j.setTexture2DArray(k,0),Ae=O.TEXTURE_2D_ARRAY):(j.setTexture2D(k,0),Ae=O.TEXTURE_2D),y.activeTexture(O.TEXTURE0),y.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,k.flipY),y.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),y.pixelStorei(O.UNPACK_ALIGNMENT,k.unpackAlignment);let nn=y.getParameter(O.UNPACK_ROW_LENGTH),lt=y.getParameter(O.UNPACK_IMAGE_HEIGHT),Bt=y.getParameter(O.UNPACK_SKIP_PIXELS),xn=y.getParameter(O.UNPACK_SKIP_ROWS),dn=y.getParameter(O.UNPACK_SKIP_IMAGES);y.pixelStorei(O.UNPACK_ROW_LENGTH,ct.width),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,ct.height),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Ne),y.pixelStorei(O.UNPACK_SKIP_ROWS,Je),y.pixelStorei(O.UNPACK_SKIP_IMAGES,tt);let fn=w.isDataArrayTexture||w.isData3DTexture,gt=k.isDataArrayTexture||k.isData3DTexture;if(w.isDepthTexture){let Tt=W.get(w),Un=W.get(k),xt=W.get(Tt.__renderTarget),Fn=W.get(Un.__renderTarget);y.bindFramebuffer(O.READ_FRAMEBUFFER,xt.__webglFramebuffer),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,Fn.__webglFramebuffer);for(let jn=0;jn<Le;jn++)fn&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,W.get(w).__webglTexture,X,tt+jn),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,W.get(k).__webglTexture,Te,At+jn)),O.blitFramebuffer(Ne,Je,Ce,ge,ke,ft,Ce,ge,O.DEPTH_BUFFER_BIT,O.NEAREST);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(X!==0||w.isRenderTargetTexture||W.has(w)){let Tt=W.get(w),Un=W.get(k);y.bindFramebuffer(O.READ_FRAMEBUFFER,G),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,z);for(let xt=0;xt<Le;xt++)fn?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Tt.__webglTexture,X,tt+xt):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Tt.__webglTexture,X),gt?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Un.__webglTexture,Te,At+xt):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Un.__webglTexture,Te),X!==0?O.blitFramebuffer(Ne,Je,Ce,ge,ke,ft,Ce,ge,O.COLOR_BUFFER_BIT,O.NEAREST):gt?O.copyTexSubImage3D(Ae,Te,ke,ft,At+xt,Ne,Je,Ce,ge):O.copyTexSubImage2D(Ae,Te,ke,ft,Ne,Je,Ce,ge);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else gt?w.isDataTexture||w.isData3DTexture?O.texSubImage3D(Ae,Te,ke,ft,At,Ce,ge,Le,mt,qt,ct.data):k.isCompressedArrayTexture?O.compressedTexSubImage3D(Ae,Te,ke,ft,At,Ce,ge,Le,mt,ct.data):O.texSubImage3D(Ae,Te,ke,ft,At,Ce,ge,Le,mt,qt,ct):w.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,Te,ke,ft,Ce,ge,mt,qt,ct.data):w.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,Te,ke,ft,ct.width,ct.height,mt,ct.data):O.texSubImage2D(O.TEXTURE_2D,Te,ke,ft,Ce,ge,mt,qt,ct);y.pixelStorei(O.UNPACK_ROW_LENGTH,nn),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,lt),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Bt),y.pixelStorei(O.UNPACK_SKIP_ROWS,xn),y.pixelStorei(O.UNPACK_SKIP_IMAGES,dn),Te===0&&k.generateMipmaps&&O.generateMipmap(Ae),y.unbindTexture()},this.initRenderTarget=function(w){W.get(w).__webglFramebuffer===void 0&&j.setupRenderTarget(w)},this.initTexture=function(w){w.isCubeTexture?j.setTextureCube(w,0):w.isData3DTexture?j.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?j.setTexture2DArray(w,0):j.setTexture2D(w,0),y.unbindTexture()},this.resetState=function(){H=0,P=0,U=null,y.reset(),Se.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=at._getDrawingBufferColorSpace(e),t.unpackColorSpace=at._getUnpackColorSpace()}};var ld={type:"change"},fh={type:"start"},hd={type:"end"},Sl=new $i,cd=new on,jx=Math.cos(70*Xc.DEG2RAD),Xt=new N,gn=2*Math.PI,_t={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},dh=1e-6,co=class extends qr{constructor(e,t=null){super(e,t),this.state=_t.NONE,this.target=new N,this.cursor=new N,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Pi.ROTATE,MIDDLE:Pi.DOLLY,RIGHT:Pi.PAN},this.touches={ONE:Ii.ROTATE,TWO:Ii.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new N,this._lastQuaternion=new jt,this._lastTargetPosition=new N,this._quat=new jt().setFromUnitVectors(e.up,new N(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new zs,this._sphericalDelta=new zs,this._scale=1,this._panOffset=new N,this._rotateStart=new be,this._rotateEnd=new be,this._rotateDelta=new be,this._panStart=new be,this._panEnd=new be,this._panDelta=new be,this._dollyStart=new be,this._dollyEnd=new be,this._dollyDelta=new be,this._dollyDirection=new N,this._mouse=new be,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=e_.bind(this),this._onPointerDown=Qx.bind(this),this._onPointerUp=t_.bind(this),this._onContextMenu=l_.bind(this),this._onMouseWheel=s_.bind(this),this._onKeyDown=r_.bind(this),this._onTouchStart=o_.bind(this),this._onTouchMove=a_.bind(this),this._onMouseDown=n_.bind(this),this._onMouseMove=i_.bind(this),this._interceptControlDown=c_.bind(this),this._interceptControlUp=h_.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(ld),this.update(),this.state=_t.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let t=this.object.position;Xt.copy(t).sub(this.target),Xt.applyQuaternion(this._quat),this._spherical.setFromVector3(Xt),this.autoRotate&&this.state===_t.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=gn:n>Math.PI&&(n-=gn),s<-Math.PI?s+=gn:s>Math.PI&&(s-=gn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Xt.setFromSpherical(this._spherical),Xt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Xt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=Xt.length();o=this._clampDistance(a*this._scale);let l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let a=new N(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new N(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Xt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Sl.origin.copy(this.object.position),Sl.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Sl.direction))<jx?this.object.lookAt(this.target):(cd.setFromNormalAndCoplanarPoint(this.object.up,this.target),Sl.intersectPlane(cd,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>dh||8*(1-this._lastQuaternion.dot(this.object.quaternion))>dh||this._lastTargetPosition.distanceToSquared(this.target)>dh?(this.dispatchEvent(ld),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?gn/60*this.autoRotateSpeed*e:gn/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Xt.setFromMatrixColumn(t,0),Xt.multiplyScalar(-e),this._panOffset.add(Xt)}_panUp(e,t){this.screenSpacePanning===!0?Xt.setFromMatrixColumn(t,1):(Xt.setFromMatrixColumn(t,0),Xt.crossVectors(this.object.up,Xt)),Xt.multiplyScalar(e),this._panOffset.add(Xt)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Xt.copy(s).sub(this.target);let r=Xt.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/n.clientHeight,this.object.matrix),this._panUp(2*t*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=e-n.left,r=t-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(gn*this._rotateDelta.x/t.clientHeight),this._rotateUp(gn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(n,s)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),s=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(gn*this._rotateDelta.x/t.clientHeight),this._rotateUp(gn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(e.pageX+t.x)*.5,a=(e.pageY+t.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new be,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function Qx(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function e_(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function t_(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(hd),this.state=_t.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function n_(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Pi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=_t.DOLLY;break;case Pi.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=_t.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=_t.ROTATE}break;case Pi.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=_t.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=_t.PAN}break;default:this.state=_t.NONE}this.state!==_t.NONE&&this.dispatchEvent(fh)}function i_(i){switch(this.state){case _t.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case _t.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case _t.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function s_(i){this.enabled===!1||this.enableZoom===!1||this.state!==_t.NONE||(i.preventDefault(),this.dispatchEvent(fh),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(hd))}function r_(i){this.enabled!==!1&&this._handleKeyDown(i)}function o_(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Ii.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=_t.TOUCH_ROTATE;break;case Ii.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=_t.TOUCH_PAN;break;default:this.state=_t.NONE}break;case 2:switch(this.touches.TWO){case Ii.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=_t.TOUCH_DOLLY_PAN;break;case Ii.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=_t.TOUCH_DOLLY_ROTATE;break;default:this.state=_t.NONE}break;default:this.state=_t.NONE}this.state!==_t.NONE&&this.dispatchEvent(fh)}function a_(i){switch(this._trackPointer(i),this.state){case _t.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case _t.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case _t.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case _t.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=_t.NONE}}function l_(i){this.enabled!==!1&&i.preventDefault()}function c_(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function h_(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Tl=class extends Ji{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let e=new Rn;e.deleteAttribute("uv");let t=new Jt({side:en}),n=new Jt,s=new es(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let r=new st(e,t);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let o=new Cr(e,n,6),a=new Zt;a.position.set(-10.906,2.009,1.846),a.rotation.set(0,-.195,0),a.scale.set(2.328,7.905,4.651),a.updateMatrix(),o.setMatrixAt(0,a.matrix),a.position.set(-5.607,-.754,-.758),a.rotation.set(0,.994,0),a.scale.set(1.97,1.534,3.955),a.updateMatrix(),o.setMatrixAt(1,a.matrix),a.position.set(6.167,.857,7.803),a.rotation.set(0,.561,0),a.scale.set(3.927,6.285,3.687),a.updateMatrix(),o.setMatrixAt(2,a.matrix),a.position.set(-2.017,.018,6.124),a.rotation.set(0,.333,0),a.scale.set(2.002,4.566,2.064),a.updateMatrix(),o.setMatrixAt(3,a.matrix),a.position.set(2.291,-.756,-2.621),a.rotation.set(0,-.286,0),a.scale.set(1.546,1.552,1.496),a.updateMatrix(),o.setMatrixAt(4,a.matrix),a.position.set(-2.193,-.369,-5.547),a.rotation.set(0,.516,0),a.scale.set(3.875,3.487,2.986),a.updateMatrix(),o.setMatrixAt(5,a.matrix),this.add(o);let l=new st(e,Js(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);let c=new st(e,Js(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let u=new st(e,Js(17));u.position.set(14.904,12.198,-1.832),u.scale.set(.15,4.265,6.331),this.add(u);let f=new st(e,Js(43));f.position.set(-.462,8.89,14.52),f.scale.set(4.38,5.441,.088),this.add(f);let h=new st(e,Js(20));h.position.set(3.235,11.486,-12.541),h.scale.set(2.5,2,.1),this.add(h);let d=new st(e,Js(100));d.position.set(0,20,0),d.scale.set(1,.1,1),this.add(d)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function Js(i){return new kr({color:0,emissive:16777215,emissiveIntensity:i})}var vt=(i,e,t)=>i<e?e:i>t?t:i,xi=(i,e,t)=>i+(e-i)*t;function tn(i,e,t){let n=vt((t-i)/(e-i),0,1);return n*n*(3-2*n)}var as=(i,e)=>1-Math.exp(-i*e),$s=(i,e)=>Math.atan2(Math.sin(e-i),Math.cos(e-i)),ud=i=>i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2,ho=(i,e)=>(i%e+e)%e,dd=()=>/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname),ai=()=>new Promise(i=>setTimeout(i)),fd=1.6,ph=.16;var u_=.1,pd=1.5,d_={city:.55,birds:.32,crickets:.5,rain:.75},f_=["city","birds","crickets","rain"],El=class{constructor(){this.ctx=null;this.master=null;this.layers=null;this.pulses=[];this.nextChirp=[0,0];this.nextPhrase=0;this.sources=[];this.timer=0;this.sleepTimer=0;this.on=!1;this.held=!1;this.level={city:0,birds:0,crickets:0,rain:0}}get state(){return this.ctx?`${this.ctx.state}:${this.master?this.master.gain.value.toFixed(3):0}`:"off"}setOn(e){this.on=e,!(e&&!this.ctx&&!this.create())&&this.apply()}setHeld(e){this.held!==e&&(this.held=e,this.apply())}setScene(e){let t=e.elevation,n=e.hour<12,s=tn(-9,-2,t)*(1-tn(12,32,t))*(n?1:.2);if(this.level.birds=vt(s+tn(2,12,t)*.22,0,1)*(e.rain?.25:1),this.level.city=(.3+.7*tn(-6,8,t))*(e.rain?.7:1),this.level.crickets=(1-tn(-5,5,t))*(e.rain?.2:1),this.level.rain=e.rain?1:0,this.ctx&&this.layers){let r=this.ctx.currentTime;for(let o of f_)this.layers[o].gain.setTargetAtTime(this.level[o]*d_[o],r,.8)}}dispose(){clearInterval(this.timer),clearTimeout(this.sleepTimer);for(let e of this.sources)try{e.stop()}catch{}this.sources=[],this.ctx&&this.ctx.close().catch(()=>{}),this.ctx=null,this.master=null,this.layers=null}create(){let e=window.AudioContext||window.webkitAudioContext;if(!e)return!1;let t=new e({latencyHint:"playback"});this.ctx=t;let n=t.createGain();n.gain.value=0,n.connect(t.destination),this.master=n;let s=md(t,6,!0),r=md(t,3,!1),o=()=>{let h=t.createGain();return h.gain.value=0,h.connect(n),h},a={city:o(),birds:o(),crickets:o(),rain:o()};this.layers=a;let l=t.createGain();l.gain.value=.75;let c=t.createOscillator(),u=t.createGain();c.frequency.value=.031,u.gain.value=.25,c.connect(u).connect(l.gain),this.loop(s).connect(wl(t,"lowpass",340,.6)).connect(l).connect(a.city),c.start(),this.sources.push(c),this.loop(r).connect(wl(t,"highpass",650,.5)).connect(wl(t,"lowpass",6200,.4)).connect(a.rain);for(let h of[4350,5150]){let d=t.createGain();d.gain.value=0,this.loop(r).connect(wl(t,"bandpass",h,24)).connect(d).connect(a.crickets),this.pulses.push(d)}let f=t.currentTime;return this.nextChirp=[f+.2,f+.5],this.nextPhrase=f+.4,!0}loop(e){let n=this.ctx.createBufferSource();return n.buffer=e,n.loop=!0,n.loopStart=gd(e.length)/e.sampleRate,n.loopEnd=e.duration,n.start(0,n.loopStart+Math.random()*(e.duration-n.loopStart)),this.sources.push(n),n}apply(){let e=this.ctx,t=this.master;if(!e||!t)return;let n=this.on&&!this.held,s=e.currentTime;if(t.gain.cancelScheduledValues(s),t.gain.setValueAtTime(t.gain.value,s),clearTimeout(this.sleepTimer),n)e.resume().catch(()=>{}),t.gain.linearRampToValueAtTime(u_,s+pd),this.timer||(this.timer=window.setInterval(()=>this.schedule(),200)),this.schedule();else{let r=this.on?.35:pd;t.gain.linearRampToValueAtTime(0,s+r),this.sleepTimer=window.setTimeout(()=>{clearInterval(this.timer),this.timer=0,this.ctx&&!(this.on&&!this.held)&&this.ctx.suspend().catch(()=>{})},r*1e3+120)}}schedule(){let e=this.ctx;if(!e||!this.layers||e.state!=="running")return;let t=e.currentTime+.5;for(let n=0;n<this.pulses.length;n++)for(this.nextChirp[n]<e.currentTime&&(this.nextChirp[n]=e.currentTime+.05);this.nextChirp[n]<t;){let s=this.nextChirp[n],r=this.pulses[n].gain,o=3+(Math.random()<.4?1:0);for(let a=0;a<o;a++){let l=s+a*.034;r.setValueAtTime(0,l),r.linearRampToValueAtTime(1,l+.005),r.setValueAtTime(1,l+.013),r.linearRampToValueAtTime(0,l+.019)}this.nextChirp[n]=s+.5+Math.random()*.55}if(this.level.birds>.02)for(this.nextPhrase<e.currentTime&&(this.nextPhrase=e.currentTime+.1);this.nextPhrase<t;)this.phrase(this.nextPhrase),this.nextPhrase+=(1.2+Math.random()*4.5)/(.35+this.level.birds)}phrase(e){let t=this.ctx,n=this.layers.birds,s=t.createStereoPanner?t.createStereoPanner():null;s&&(s.pan.value=Math.random()*1.6-.8,s.connect(n));let r=s||n,o=Math.random()<.5,a=2+Math.floor(Math.random()*4),l=e,c=s?[s]:[],u=null;for(let f=0;f<a;f++){let h=.05+Math.random()*.11,d=(o?3600:2300)+Math.random()*1500,g=d*(Math.random()<.6?.72+Math.random()*.2:1.12+Math.random()*.25),_=t.createOscillator(),p=t.createOscillator(),m=t.createGain(),E=t.createGain();_.frequency.setValueAtTime(d,l),_.frequency.exponentialRampToValueAtTime(g,l+h),p.frequency.value=28+Math.random()*60,m.gain.value=90+Math.random()*320,p.connect(m).connect(_.frequency),E.gain.setValueAtTime(0,l),E.gain.linearRampToValueAtTime(.5+Math.random()*.5,l+.012),E.gain.exponentialRampToValueAtTime(.001,l+h),_.connect(E).connect(r),_.start(l),p.start(l),_.stop(l+h+.02),p.stop(l+h+.02),c.push(_,p,m,E),u=_,l+=h+.035+Math.random()*.1}u&&(u.onended=()=>c.forEach(f=>f.disconnect()))}},gd=i=>Math.min(2048,i>>2);function wl(i,e,t,n){let s=i.createBiquadFilter();return s.type=e,s.frequency.value=t,s.Q.value=n,s}function md(i,e,t){let n=i.createBuffer(1,Math.floor(i.sampleRate*e),i.sampleRate),s=n.getChannelData(0),r=0;for(let a=0;a<s.length;a++){let l=Math.random()*2-1;t?(r=(r+.02*l)/1.02,s[a]=r*3.5):s[a]=l*.5}let o=gd(s.length);for(let a=0;a<o;a++){let l=a/o,c=s.length-o+a;s[c]=s[c]*(1-l)+s[a]*l}return n}var Al=class{constructor(){this.active=!1;this.t=0;this.duration=.9;this.p0=new N;this.c0=new N;this.c1=new N;this.p1=new N;this.a0=new N;this.a1=new N;this.look=new N;this.fov0=60;this.fov1=60}start(e,t,n,s,r,o,a,l,c=.9){this.p0.copy(e),this.p1.copy(s),this.c0.copy(e).y+=a,this.c1.copy(s).y+=l,a||this.c0.lerpVectors(e,s,.33),l||this.c1.lerpVectors(e,s,.66),this.a0.copy(t),this.a1.copy(r),this.fov0=n,this.fov1=o,this.duration=c,this.t=0,this.active=!0}step(e,t){if(!this.active)return!1;this.t=Math.min(1,this.t+e/this.duration);let n=ud(this.t),s=1-n,r=s*s*s,o=3*s*s*n,a=3*s*n*n,l=n*n*n;t.position.set(r*this.p0.x+o*this.c0.x+a*this.c1.x+l*this.p1.x,r*this.p0.y+o*this.c0.y+a*this.c1.y+l*this.p1.y,r*this.p0.z+o*this.c0.z+a*this.c1.z+l*this.p1.z),this.look.lerpVectors(this.a0,this.a1,n),t.lookAt(this.look);let c=this.fov0+(this.fov1-this.fov0)*n;return t.fov!==c&&(t.fov=c,t.updateProjectionMatrix()),t.updateMatrixWorld(),this.t>=1?(this.active=!1,!0):!1}cancel(){this.active=!1}};var Ks=160,mh=.5,p_=.012,Cl=class{constructor(e,t,n){this.x=0;this.z=0;this.shown=!1;this.pulse=null;this.el=document.createElement("div"),this.el.style.cssText=`position:absolute;left:0;top:0;width:${Ks}px;height:${Ks}px;transform-origin:0 0;pointer-events:none;visibility:hidden;will-change:transform`,this.face=document.createElement("div");let s=n?t:"rgba(255,255,255,.95)";this.face.style.cssText=`position:absolute;inset:0;border-radius:50%;opacity:0;transition:opacity .22s ease;background:radial-gradient(circle,rgba(255,255,255,${n?".16":".1"}) 0 38%,transparent 43%),radial-gradient(circle,transparent 0 50%,${s} 55%,${s} 58%,transparent 64%),radial-gradient(circle,transparent 0 58%,rgba(0,0,0,.2) 63%,transparent 72%)`,this.el.appendChild(this.face),e.appendChild(this.el)}place(e,t){this.x=e,this.z=t}show(e){this.shown!==e&&(this.shown=e,this.face.style.opacity=e?"1":"0",e&&(this.el.style.visibility="visible"))}breathe(e,t){e&&!this.pulse&&!t&&this.face.animate?this.pulse=this.face.animate([{transform:"scale(.86)"},{transform:"scale(1.04)"},{transform:"scale(.86)"}],{duration:1400,iterations:1/0,easing:"ease-in-out"}):!e&&this.pulse&&(this.pulse.cancel(),this.pulse=null)}shake(e){e||!this.el.animate||this.face.animate([{transform:"translateX(0)"},{transform:"translateX(-12%)"},{transform:"translateX(10%)"},{transform:"translateX(-6%)"},{transform:"translateX(3%)"},{transform:"translateX(0)"}],{duration:420,easing:"ease-out"})}hide(){this.el.style.visibility="hidden"}},Rl=class{constructor(e,t){this.model=new $e;this.m=new $e;this.screen=new $e;this.layer=document.createElement("div"),this.layer.setAttribute("aria-hidden","true"),this.layer.style.cssText="position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict",e.appendChild(this.layer),this.cursor=new Cl(this.layer,t,!1),this.target=new Cl(this.layer,t,!0)}get visible(){return this.cursor.shown||this.target.shown}update(e,t,n){this.project(this.cursor,e,t,n),this.project(this.target,e,t,n)}project(e,t,n,s){if(!e.shown)return;let r=mh/Ks;this.model.set(r,0,0,e.x-mh/2,0,0,1,p_,0,r,0,e.z-mh/2,0,0,0,1),this.screen.set(n/2,0,0,n/2,0,-s/2,0,s/2,0,0,1,0,0,0,0,1),this.m.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse).multiply(this.model).premultiply(this.screen);let o=this.m.elements;if(o[15]<.05||o[3]*Ks+o[15]<.05||o[7]*Ks+o[15]<.05||(o[3]+o[7])*Ks+o[15]<.05){e.hide();return}e.el.style.visibility="visible",e.el.style.transform=`matrix3d(${o[0]},${o[1]},${o[2]},${o[3]},${o[4]},${o[5]},${o[6]},${o[7]},${o[8]},${o[9]},${o[10]},${o[11]},${o[12]},${o[13]},${o[14]},${o[15]})`}dispose(){this.layer.remove()}};var xd={KeyW:[0,1],ArrowUp:[0,1],KeyS:[0,-1],ArrowDown:[0,-1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]},m_=new Set(["KeyQ","KeyE","KeyR","KeyF"]),Pl=new Set(["ShiftLeft","ShiftRight"]),g_=/^(text|search|email|url|tel|password|number|date|datetime-local|month|time|week)$/;function x_(i){return i instanceof HTMLElement?i.isContentEditable||i.tagName==="TEXTAREA"||i.tagName==="SELECT"?!0:i.tagName==="INPUT"&&g_.test(i.type||"text"):!1}function __(i){return i instanceof HTMLElement&&!!i.closest("input,select,[role=slider],[role=tab],[role=tablist],[role=radio],[role=radiogroup],[role=menu],[role=menuitem],[role=listbox],[role=option],[role=spinbutton]")}var Il=i=>Math.abs(i)<.15?0:(i-Math.sign(i)*.15)/.85,Dl=class{constructor(e,t){this.canvas=e;this.sink=t;this.keys=new Set;this.padX=0;this.padZ=0;this.runHeld=!1;this.locked=!1;this.gamepads=0;this.pointers=new Map;this.pinch=null;this.gp={x:0,z:0,lookX:0,lookY:0,run:!1,a:!1,live:!1};this.gyroOn=!1;this.gyroFresh=!1;this.gyroPrimed=!1;this.gyroSeen=!1;this.gyroWaiter=null;this.orientation={alpha:0,beta:0,gamma:0};this.gyroYaw=0;this.gyroPitch=0;this.euler=new Cn;this.q=new jt;this.q0=new jt;this.q1=new jt(-Math.sqrt(.5),0,0,Math.sqrt(.5));this.zee=new N(0,0,1);this.forward=new N;this.listeners=[];this.held={strafe:0,forward:0,turn:0,pitch:0,run:!1};this.down=e=>{if(!this.sink.ready()||this.sink.paused())return;if(this.locked){if(e.button===0){let n=this.canvas.getBoundingClientRect();this.sink.tap(n.left+n.width/2,n.top+n.height/2,!1)}return}if(e.pointerType==="mouse"&&e.button!==0)return;let t=e.pointerType!=="mouse";if(t||this.canvas.focus({preventScroll:!0}),this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),touch:t,moved:!1}),this.sink.mode()==="walk"){try{this.canvas.setPointerCapture(e.pointerId)}catch{}if(this.pointers.size===2){let n=0,s=0,r=0,o=!0;for(let a of this.pointers.values())a.moved=!0,o?(s=a.x,r=a.y,o=!1):n=Math.hypot(a.x-s,a.y-r);this.pinch={d0:Math.max(20,n),fov0:this.sink.fov()}}}};this.move=e=>{if(this.locked)return;let t=this.pointers.get(e.pointerId);if(!t){e.pointerType==="mouse"&&this.sink.ready()&&!this.sink.paused()&&this.sink.hover(e.clientX,e.clientY);return}let n=e.clientX-t.x,s=e.clientY-t.y;if(t.x=e.clientX,t.y=e.clientY,!t.moved&&Math.hypot(e.clientX-t.sx,e.clientY-t.sy)>(t.touch?10:5)&&(t.moved=!0,this.sink.mode()==="walk"&&this.sink.dragStart()),this.sink.mode()!=="walk"||!t.moved)return;if(this.pinch&&this.pointers.size>=2){let o=0,a=0,l=0,c=!0;for(let u of this.pointers.values())c?(a=u.x,l=u.y,c=!1):o=Math.hypot(u.x-a,u.y-l);o>0&&this.sink.setFov(this.pinch.fov0*this.pinch.d0/o);return}let r=this.sink.fov();if(t.touch){let o=r*Math.PI/180/Math.max(1,this.canvas.clientHeight);this.sink.look(n*o,s*o)}else{let o=.0034*r/60;this.sink.look(-n*o,-s*o*.85)}};this.up=e=>{let t=this.pointers.get(e.pointerId);t&&(this.pointers.delete(e.pointerId),this.pointers.size<2&&(this.pinch=null),e.type==="pointerup"&&!t.moved&&performance.now()-t.t<700&&!this.sink.paused()&&this.sink.tap(e.clientX,e.clientY,t.touch))};this.leave=e=>{e.pointerType==="mouse"&&!this.pointers.has(e.pointerId)&&this.sink.hoverEnd()};this.wheel=e=>{if(this.sink.mode()!=="walk"||!this.sink.ready()||this.sink.paused())return;e.preventDefault();let t=e.deltaMode===1?16:e.deltaMode===2?400:1;this.sink.setFov(this.sink.fov()+e.deltaY*t*.03)};this.keydown=e=>{if(!this.sink.ready()||this.sink.paused()||e.ctrlKey||e.metaKey||e.altKey||x_(e.target)||this.sink.mode()!=="walk")return;let t=e.code;if(!(t.startsWith("Arrow")&&__(e.target))){if(xd[t]||m_.has(t)||Pl.has(t)){Pl.has(t)||e.preventDefault(),this.keys.has(t)||(this.keys.add(t),this.recount(),Pl.has(t)||this.sink.manual(),this.sink.wake());return}e.key==="+"||e.key==="="||t==="NumpadAdd"?(e.preventDefault(),this.sink.setFov(this.sink.fov()-5)):(e.key==="-"||e.key==="_"||t==="NumpadSubtract")&&(e.preventDefault(),this.sink.setFov(this.sink.fov()+5))}};this.keyup=e=>{this.keys.delete(e.code)&&(this.recount(),this.sink.wake())};this.lockChange=()=>{let e=document.pointerLockElement===this.canvas;e!==this.locked&&(this.locked=e,this.pointers.clear(),this.sink.lockChanged(e))};this.lockedMove=e=>{if(!this.locked||this.sink.paused())return;let t=.0023*this.sink.fov()/60;this.sink.look(-e.movementX*t,-e.movementY*t)};this.padsChanged=()=>{let e=navigator.getGamepads?navigator.getGamepads():[],t=0;for(let n=0;n<e.length;n++)e[n]&&t++;this.gamepads=t,t||(this.gp.x=this.gp.z=this.gp.lookX=this.gp.lookY=0,this.gp.run=this.gp.live=!1),this.sink.wake()};this.orient=e=>{e.alpha==null||e.beta==null||e.gamma==null||(this.orientation.alpha=e.alpha,this.orientation.beta=e.beta,this.orientation.gamma=e.gamma,this.gyroFresh=!0,this.gyroSeen||(this.gyroSeen=!0,this.gyroWaiter?.(!0)),this.sink.wake())};let n=(s,r,o,a)=>{s.addEventListener(r,o,a),this.listeners.push([s,r,o,a])};n(e,"pointerdown",this.down),n(e,"pointermove",this.move),n(e,"pointerup",this.up),n(e,"pointercancel",this.up),n(e,"pointerleave",this.leave),n(e,"wheel",this.wheel,{passive:!1}),n(e,"contextmenu",s=>s.preventDefault()),n(window,"keydown",this.keydown),n(window,"keyup",this.keyup),n(window,"blur",()=>this.clear()),n(document,"pointerlockchange",this.lockChange),n(document,"mousemove",this.lockedMove),n(window,"gamepadconnected",this.padsChanged),n(window,"gamepaddisconnected",this.padsChanged),this.padsChanged()}recount(){let e=this.held;e.strafe=e.forward=e.turn=e.pitch=0,e.run=!1,this.keys.forEach(t=>{let n=xd[t];n?(e.strafe+=n[0],e.forward+=n[1]):t==="KeyQ"?e.turn+=1:t==="KeyE"?e.turn-=1:t==="KeyR"?e.pitch+=1:t==="KeyF"?e.pitch-=1:Pl.has(t)&&(e.run=!0)})}read(e){let t=this.held;return e.strafe=Math.max(-1,Math.min(1,t.strafe+this.padX+this.gp.x)),e.forward=Math.max(-1,Math.min(1,t.forward+this.padZ+this.gp.z)),e.turn=t.turn-this.gp.lookX*1.6,e.pitch=t.pitch-this.gp.lookY*1.1,e.run=this.runHeld||this.gp.run||t.run,e}get active(){return this.keys.size>0||this.padX!==0||this.padZ!==0||this.gp.live||this.gamepads>0||this.gyroOn}clear(){this.keys.clear(),this.recount(),this.padX=this.padZ=0,this.runHeld=!1,this.pointers.clear(),this.pinch=null}requestLock(e){if(e){if(document.pointerLockElement===this.canvas||!this.canvas.requestPointerLock)return;try{let t=this.canvas.requestPointerLock();t&&typeof t.catch=="function"&&t.catch(()=>this.sink.lockChanged(!1))}catch{this.sink.lockChanged(!1)}}else document.pointerLockElement===this.canvas&&document.exitPointerLock()}pollGamepad(){if(!this.gamepads||!navigator.getGamepads)return;let e=navigator.getGamepads(),t=null;for(let a=0;a<e.length;a++){let l=e[a];if(l&&l.connected){t=l;break}}if(!t||this.sink.paused()||this.sink.mode()!=="walk"){this.gp.live=!1;return}let n=t.axes;this.gp.x=Il(n[0]||0),this.gp.z=-Il(n[1]||0),this.gp.lookX=Il(n[2]||0),this.gp.lookY=Il(n[3]||0);let s=t.buttons[7];this.gp.run=!!s&&(s.pressed||s.value>.3);let r=this.gp.x!==0||this.gp.z!==0||this.gp.lookX!==0||this.gp.lookY!==0;r&&!this.gp.live&&this.sink.manual(),this.gp.live=r;let o=!!t.buttons[0]&&t.buttons[0].pressed;o&&!this.gp.a&&this.sink.nextRoom(),this.gp.a=o}async enableGyro(){let e=window.DeviceOrientationEvent;if(!e)return!1;if(typeof e.requestPermission=="function")try{if(await e.requestPermission()!=="granted")return!1}catch{return!1}this.gyroOn=!0,this.gyroPrimed=!1,this.gyroSeen=!1,window.addEventListener("deviceorientation",this.orient);let t=await new Promise(n=>{this.gyroWaiter=n,setTimeout(()=>n(this.gyroSeen),1e3)});return this.gyroWaiter=null,t||this.disableGyro(),t}disableGyro(){this.gyroOn=!1,window.removeEventListener("deviceorientation",this.orient)}gyroDelta(e){if(!this.gyroOn||!this.gyroFresh)return!1;this.gyroFresh=!1;let t=Math.PI/180,n=this.orientation,s=screen.orientation&&screen.orientation.angle||0;this.euler.set(n.beta*t,n.alpha*t,-n.gamma*t,"YXZ"),this.q.setFromEuler(this.euler).multiply(this.q1).multiply(this.q0.setFromAxisAngle(this.zee,-s*t)),this.forward.set(0,0,-1).applyQuaternion(this.q);let r=Math.atan2(this.forward.x,this.forward.z),o=Math.asin(Math.max(-1,Math.min(1,this.forward.y)));return this.gyroPrimed?(e.yaw=$s(this.gyroYaw,r),e.pitch=o-this.gyroPitch,this.gyroYaw=r,this.gyroPitch=o,e.yaw!==0||e.pitch!==0):(this.gyroPrimed=!0,this.gyroYaw=r,this.gyroPitch=o,!1)}dispose(){this.disableGyro(),document.pointerLockElement===this.canvas&&document.exitPointerLock();for(let[e,t,n,s]of this.listeners)e.removeEventListener(t,n,s);this.listeners.length=0,this.clear()}};var ln=3,v_=3.2,y_=.6,Ll=class{constructor(e,t){this.lights=[];this.slots=[];this.wanted=new Int32Array(ln);this.wantedDist=new Float32Array(ln);this.brightest=new Int32Array(ln).fill(-1);this.level=1;this.positions=new Float32Array(e.length*3),this.power=new Float32Array(e.length),e.forEach((s,r)=>{this.positions.set(s.position,r*3),this.power[r]=s.intensity});for(let s=0;s<ln;s++){let r=new es("#fff1d8",0,9,2);r.castShadow=!1,t.add(r),this.lights.push(r),this.slots.push({lamp:-1,fade:0})}let n=Array.from(this.power.keys()).sort((s,r)=>this.power[r]-this.power[s]);for(let s=0;s<ln&&s<n.length;s++)this.brightest[s]=n[s]}coverage(){let e=0,t=0;for(let n=0;n<this.power.length;n++)e+=this.power[n];for(let n=0;n<ln;n++){let s=this.slots[n];s.lamp>=0&&(t+=this.power[s.lamp]*s.fade)}return e>0?t/e:1}setLevel(e){this.level=e}setColor(e){for(let t=0;t<ln;t++)this.lights[t].color.copy(e)}update(e,t,n){if(!this.power.length)return!1;if(t)this.pickNearest(t);else for(let o=0;o<ln;o++)this.wanted[o]=this.brightest[o];let r=!1;for(let o=0;o<ln;o++){let a=this.slots[o],l=a.lamp>=0&&this.isWanted(a.lamp),c=l?1:0;if(!l&&(a.fade<=.001||n)){let h=this.unassigned();h!==a.lamp&&(a.lamp=h,r=!0),c=h>=0?1:0,n&&(a.fade=0)}let u=n?1:v_*e,f=a.fade<c?Math.min(c,a.fade+u):Math.max(c,a.fade-u);f!==a.fade&&(a.fade=f,r=!0)}for(let o=0;o<ln;o++){let a=this.slots[o],l=this.lights[o],c=a.lamp>=0?this.power[a.lamp]*this.level*a.fade:0;if(l.intensity!==c&&(l.intensity=c,r=!0),a.lamp>=0){let u=a.lamp*3;l.position.set(this.positions[u],this.positions[u+1],this.positions[u+2])}}return r}isWanted(e){for(let t=0;t<ln;t++)if(this.wanted[t]===e)return!0;return!1}unassigned(){for(let e=0;e<ln;e++){let t=this.wanted[e];if(t<0)continue;let n=!1;for(let s=0;s<ln;s++)if(this.slots[s].lamp===t){n=!0;break}if(!n)return t}return-1}pickNearest(e){this.wanted.fill(-1),this.wantedDist.fill(1/0);for(let t=0;t<this.power.length;t++){let n=t*3,s=Math.hypot(this.positions[n]-e.x,this.positions[n+1]-e.y,this.positions[n+2]-e.z);for(let r=0;r<ln;r++)if(this.slots[r].lamp===t&&this.slots[r].fade>0){s-=y_;break}for(let r=0;r<ln;r++)if(s<this.wantedDist[r]){for(let o=ln-1;o>r;o--)this.wanted[o]=this.wanted[o-1],this.wantedDist[o]=this.wantedDist[o-1];this.wanted[r]=t,this.wantedDist[r]=s;break}}}};var Yn=Math.PI/180;function uo(i){let[e,t,n]=i.split("-").map(Number);return Date.UTC(e,t-1,n)/864e5+24405875e-1}function _d(i,e,t,n,s,r){let a=(i+(e-t)/24-2451545)/36525,l=ho(280.46646+a*(36000.76983+a*3032e-7),360),c=(357.52911+a*(35999.05029-1537e-7*a))*Yn,u=.016708634-a*(42037e-9+1267e-10*a),f=Math.sin(c)*(1.914602-a*(.004817+14e-6*a))+Math.sin(2*c)*(.019993-101e-6*a)+Math.sin(3*c)*289e-6,h=(125.04-1934.136*a)*Yn,d=(l+f-.00569-.00478*Math.sin(h))*Yn,_=(23+(26+(21.448-a*(46.815+a*(59e-5-a*.001813)))/60)/60+.00256*Math.cos(h))*Yn,p=Math.asin(Math.sin(_)*Math.sin(d)),m=Math.tan(_/2)**2,E=l*Yn,C=4/Yn*(m*Math.sin(2*E)-2*u*Math.sin(c)+4*u*m*Math.sin(c)*Math.cos(2*E)-.5*m*m*Math.sin(4*E)-1.25*u*u*Math.sin(2*c)),b=(ho(e*60+C+4*s-60*t,1440)/4-180)*Yn,S=n*Yn,A=vt(Math.sin(S)*Math.sin(p)+Math.cos(S)*Math.cos(p)*Math.cos(b),-1,1),x=Math.acos(A),M=Math.cos(S)*Math.sin(x),I=n>0?180:0;if(Math.abs(M)>1e-9){let B=Math.acos(vt((Math.sin(S)*A-Math.sin(p))/M,-1,1))/Yn;I=b>0?ho(B+180,360):ho(540-B,360)}let T=90-x/Yn,D=0;if(T<=85){let B=Math.tan(T*Yn);T>5?D=58.1/B-.07/B**3+86e-6/B**5:T>-.575?D=1735+T*(-518.2+T*(103.4+T*(-12.79+T*.711))):D=-20.772/B,D/=3600}return r.azimuthDeg=I,r.elevationDeg=T+D,r}function vd(i,e){let t=vt(i,1e3,4e4)/100,n,s,r;return t<=66?(n=255,s=99.4708025861*Math.log(t)-161.1195681661,r=t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307):(n=329.698727446*Math.pow(t-60,-.1332047592),s=288.1221695283*Math.pow(t-60,-.0755148492),r=255),e.r=vt(n,0,255)/255,e.g=vt(s,0,255)/255,e.b=vt(r,0,255)/255,e}var yd=Math.PI/180,Nl=class{constructor(e,t,n,s){this.background=new Ee;this.centre=new N;this.dir=new N;this.lastDir=new N(0,-1,0);this.corner=new N;this.rgb={r:1,g:1,b:1};this.ambientNow=0;this.lampLevel=1;this.c={daySky:new Ee("#f5f9ff"),goldSky:new Ee("#ffd9b3"),nightSky:new Ee("#3a5182"),overcast:new Ee("#dde2e8"),rainSky:new Ee("#c3cfdc"),dayGround:new Ee("#b3a695"),nightGround:new Ee("#25252b"),dayAmbient:new Ee("#fff6e9"),goldAmbient:new Ee("#ffd2a1"),nightAmbient:new Ee("#ffe3c2"),lampDay:new Ee("#fff1d8"),lampNight:new Ee("#ffcf94"),cool:new Ee("#c9d4e2"),dayBg:new Ee,duskBg:new Ee("#c9a68c"),nightBg:new Ee,lamp:new Ee};let r=t.lights,o=r.hemi??1;this.base={hemi:o,ambient:r.ambient??.5,sun:r.sun??o*1.72,exposure:r.exposure??1,env:.26,glow:0},this.hemi=new Vr(this.c.daySky,this.c.dayGround,o),this.ambient=new Wr(this.c.dayAmbient,this.base.ambient),this.sun=new Hr("#fff3d9",this.base.sun),this.sun.castShadow=!0,this.sun.shadow.bias=-4e-4,this.sun.shadow.normalBias=.024,this.sun.shadow.autoUpdate=!0,e.add(this.hemi,this.ambient,this.sun,this.sun.target),this.lamps=new Ll(t.lights.lamps,e);let a=n.materials.glow;this.glow=a&&a.isMeshStandardMaterial?a:null,this.glow&&(this.base.glow=this.glow.emissiveIntensity),this.c.dayBg.set(r.background),this.c.nightBg.set(t.theme.night).lerp(new Ee("#1b2633"),.5),this.box=s.clone(),this.box.getCenter(this.centre)}setShadowSize(e){let t=this.sun.shadow;t.mapSize.x!==e&&(t.mapSize.set(e,e),t.map&&(t.map.dispose(),t.map=null))}apply(e,t,n,s,r){let o=e.elevationDeg,a=tn(-2,20,o),l=tn(-9,4,o),c=1-l,u=tn(-3,3,o)*(1-tn(6,22,o)),f=t?t.cloud:0,h=!!(t&&t.rain),d=this.c,g=o<20?xi(1800,3600,tn(-1,20,o)):xi(3600,5600,tn(20,50,o));vd(g,this.rgb),this.sun.color.setRGB(this.rgb.r,this.rgb.g,this.rgb.b,Rt),h&&this.sun.color.lerp(d.cool,.35),this.sun.intensity=this.base.sun*Math.sqrt(a)*(1-.8*f)*(h?.75:1),this.hemi.color.copy(d.daySky).lerp(d.goldSky,u*.85).lerp(d.nightSky,c),f&&this.hemi.color.lerp(d.overcast,.55*f*l),h&&this.hemi.color.lerp(d.rainSky,.5*l),this.hemi.groundColor.copy(d.dayGround).lerp(d.nightGround,c),this.hemi.intensity=this.base.hemi*xi(.18,1,l)*(1-.32*u)*(1+.15*f*l),this.ambient.color.copy(d.dayAmbient).lerp(d.goldAmbient,u*.55).lerp(d.nightAmbient,c),this.ambientNow=this.base.ambient*xi(.55,1,l)*(1-.15*u)*(1+.1*f*l),this.ambient.intensity=this.ambientNow,this.lampLevel=xi(1,1.45,c)+.25*f*l,this.lamps.setLevel(this.lampLevel),this.lamps.setColor(d.lamp.copy(d.lampDay).lerp(d.lampNight,c)),this.glow&&(this.glow.emissiveIntensity=this.base.glow*xi(1,1.5,c)),r.environmentIntensity=this.base.env*xi(.25,1,l)*(1-.25*f),s.toneMappingExposure=this.base.exposure*xi(1,1.07,c)*(h?.97:1),this.background.copy(d.dayBg).lerp(d.duskBg,u*.6).lerp(d.nightBg,c);let _=Math.max(o,3)*yd,p=(e.azimuthDeg-n)*yd;return this.dir.set(Math.sin(p)*Math.cos(_),Math.sin(_),-Math.cos(p)*Math.cos(_)),this.sun.position.copy(this.centre).addScaledVector(this.dir,20),this.sun.target.position.copy(this.centre),this.sun.updateMatrixWorld(),this.sun.target.updateMatrixWorld(),this.dir.angleTo(this.lastDir)<.002?!1:(this.lastDir.copy(this.dir),this.fitShadow(),!0)}compensate(e,t){this.ambient.intensity=this.ambientNow+(t?this.base.ambient*.3*(1-e)*this.lampLevel:0)}fitShadow(){let e=this.sun.shadow.camera;e.position.copy(this.sun.position),e.lookAt(this.centre),e.updateMatrixWorld();let t=1/0,n=-1/0,s=1/0,r=-1/0,o=1/0,a=-1/0,l=this.box;for(let u=0;u<8;u++)this.corner.set(u&1?l.max.x:l.min.x,u&2?l.max.y:l.min.y,u&4?l.max.z:l.min.z).applyMatrix4(e.matrixWorldInverse),t=Math.min(t,this.corner.x),n=Math.max(n,this.corner.x),s=Math.min(s,this.corner.y),r=Math.max(r,this.corner.y),o=Math.min(o,this.corner.z),a=Math.max(a,this.corner.z);let c=.25;e.left=t-c,e.right=n+c,e.bottom=s-c,e.top=r+c,e.near=Math.max(.05,-a-c),e.far=-o+c,e.updateProjectionMatrix()}};function bd(i,e=!1){let t=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),s=new Set(Object.keys(i[0].morphAttributes)),r={},o={},a=i[0].morphTargetsRelative,l=new Dt,c=0;for(let u=0;u<i.length;++u){let f=i[u],h=0;if(t!==(f.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let d in f.attributes){if(!n.has(d))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+'. All geometries must have compatible attributes; make sure "'+d+'" attribute exists among all geometries, or in none of them.'),null;r[d]===void 0&&(r[d]=[]),r[d].push(f.attributes[d]),h++}if(h!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". Make sure all geometries have the same number of attributes."),null;if(a!==f.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let d in f.morphAttributes){if(!s.has(d))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+".  .morphAttributes must be consistent throughout all geometries."),null;o[d]===void 0&&(o[d]=[]),o[d].push(f.morphAttributes[d])}if(e){let d;if(t)d=f.index.count;else if(f.attributes.position!==void 0)d=f.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,d,u),c+=d}}if(t){let u=0,f=[];for(let h=0;h<i.length;++h){let d=i[h].index;for(let g=0;g<d.count;++g)f.push(d.getX(g)+u);u+=i[h].attributes.position.count}l.setIndex(f)}for(let u in r){let f=Md(r[u]);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" attribute."),null;l.setAttribute(u,f)}for(let u in o){let f=o[u][0].length;if(f!==0){l.morphAttributes=l.morphAttributes||{},l.morphAttributes[u]=[];for(let h=0;h<f;++h){let d=[];for(let _=0;_<o[u].length;++_)d.push(o[u][_][h]);let g=Md(d);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" morphAttribute."),null;l.morphAttributes[u].push(g)}}}return l}function Md(i){let e,t,n,s=-1,r=0;for(let c=0;c<i.length;++c){let u=i[c];if(e===void 0&&(e=u.array.constructor),e!==u.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=u.itemSize),t!==u.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=u.normalized),n!==u.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(s===-1&&(s=u.gpuType),s!==u.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=u.count*t}let o=new e(r),a=new Ot(o,t,n),l=0;for(let c=0;c<i.length;++c){let u=i[c];if(u.isInterleavedBufferAttribute){let f=l/t;for(let h=0,d=u.count;h<d;h++)for(let g=0;g<t;g++){let _=u.getComponent(h,g);a.setComponent(h+f,g,_)}}else o.set(u.array,l);l+=u.count*t}return s!==void 0&&(a.gpuType=s),a}var M_=new Set(["position","normal","uv"]);function b_(i,e){let t=i;if(!t.isMesh||t.isInstancedMesh||t.isSkinnedMesh||Array.isArray(t.material)||t.renderOrder!==0||t.geometry.morphAttributes.position||!t.geometry.attributes.position)return!1;for(let n=i;n&&n!==e;n=n.parent)if(n.userData.keep||!n.visible)return!1;return!0}function S_(i,e){let t=i.geometry,n=new Dt;for(let a of Object.keys(t.attributes)){if(!M_.has(a))continue;let l=t.attributes[a],c=l.itemSize,u=l.count*c,f=new Float32Array(u);if(!l.isInterleavedBufferAttribute&&!l.normalized&&l.array.length>=u)f.set(l.array.subarray(0,u));else for(let h=0;h<l.count;h++)for(let d=0;d<c;d++)f[h*c+d]=l.getComponent(h,d);n.setAttribute(a,new Ot(f,c))}n.attributes.normal||n.computeVertexNormals(),n.attributes.uv||n.setAttribute("uv",new Ot(new Float32Array(n.attributes.position.count*2),2));let s=n.attributes.position.count,r=t.index?t.index.count:s,o=s>65535?new Uint32Array(r):new Uint16Array(r);if(t.index)o.set(t.index.array.subarray(0,r));else for(let a=0;a<r;a++)o[a]=a;if(e.determinant()<0)for(let a=0;a+2<o.length;a+=3){let l=o[a+1];o[a+1]=o[a+2],o[a+2]=l}return n.setIndex(new Ot(o,1)),n.applyMatrix4(e),n}function Sd(i,e){let t=new hn,n=new N,s=new $e,r=new $e,o=0,a=0;for(let l of i){l.updateWorldMatrix(!0,!0),r.copy(l.matrixWorld).invert();let c=new Map,u=[],f=new Set;l.traverse(d=>{if(d.isMesh&&o++,!b_(d,l)){d.isMesh&&f.add(d.geometry);return}let g=d,_=g.material;g.geometry.boundingBox||g.geometry.computeBoundingBox(),t.copy(g.geometry.boundingBox).applyMatrix4(g.matrixWorld).getCenter(n);let p=e(n.x,n.z)||"hall",m=p+"|"+_.uuid+"|"+g.castShadow+"|"+g.receiveShadow,E=c.get(m);E||(E={material:_,cast:g.castShadow,receive:g.receiveShadow,room:p,parts:[]},c.set(m,E)),s.multiplyMatrices(r,g.matrixWorld),E.parts.push(S_(g,s)),u.push(g)});let h=new Set;for(let d of u)d.removeFromParent(),f.has(d.geometry)||h.add(d.geometry);h.forEach(d=>d.dispose());for(let d of c.values()){let g=d.parts.length===1?d.parts[0]:bd(d.parts,!1);if(d.parts.length>1&&d.parts.forEach(p=>p.dispose()),!g)continue;g.computeBoundingBox(),g.computeBoundingSphere();let _=new st(g,d.material);_.name=d.room+":"+(d.material.name||d.material.type),_.userData.room=d.room,_.castShadow=d.cast,_.receiveShadow=d.receive,_.matrixAutoUpdate=!1,l.add(_)}Td(l),l.traverse(d=>{d.isMesh&&a++})}return{meshesBefore:o,meshesAfter:a}}function Td(i){for(let e=i.children.length-1;e>=0;e--){let t=i.children[e];Td(t),t.children.length===0&&(t.type==="Group"||t.type==="Object3D")&&!t.userData.keep&&i.remove(t)}}var fo=class i extends st{constructor(e,t={}){super(e),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this._reflectionCameras=new WeakMap;let n=this,s=t.color!==void 0?new Ee(t.color):new Ee(8355711),r=t.textureWidth||512,o=t.textureHeight||512,a=t.clipBias||0,l=t.shader||i.ReflectorShader,c=t.multisample!==void 0?t.multisample:4,u=new on,f=new N,h=new N,d=new N,g=new $e,_=new N(0,0,-1),p=new Mt,m=new N,E=new N,C=new Mt,v=new $e,b=new Et(r,o,{samples:c,type:Gt}),S=new Lt({name:l.name!==void 0?l.name:"unspecified",uniforms:si.clone(l.uniforms),fragmentShader:l.fragmentShader,vertexShader:l.vertexShader});S.uniforms.tDiffuse.value=b.texture,S.uniforms.color.value=s,S.uniforms.textureMatrix.value=v,this.material=S,this.onBeforeRender=function(A,x,M){let I=this.getReflectionCamera(M);if(h.setFromMatrixPosition(n.matrixWorld),d.setFromMatrixPosition(M.matrixWorld),g.extractRotation(n.matrixWorld),f.set(0,0,1),f.applyMatrix4(g),m.subVectors(h,d),m.dot(f)>0===!0&&this.forceUpdate===!1)return;m.reflect(f).negate(),m.add(h),g.extractRotation(M.matrixWorld),_.set(0,0,-1),_.applyMatrix4(g),_.add(d),E.subVectors(h,_),E.reflect(f).negate(),E.add(h),I.position.copy(m),I.up.set(0,1,0),I.up.applyMatrix4(g),I.up.reflect(f),I.lookAt(E),I.far=M.far,I.updateMatrixWorld(),I.projectionMatrix.copy(M.projectionMatrix),v.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),v.multiply(I.projectionMatrix),v.multiply(I.matrixWorldInverse),v.multiply(n.matrixWorld),u.setFromNormalAndCoplanarPoint(f,h),u.applyMatrix4(I.matrixWorldInverse),p.set(u.normal.x,u.normal.y,u.normal.z,u.constant);let D=I.projectionMatrix;I.isOrthographicCamera?(C.x=(Math.sign(p.x)+D.elements[8])/D.elements[0],C.y=(Math.sign(p.y)+D.elements[9])/D.elements[5],C.z=-M.far,C.w=1):(C.x=(Math.sign(p.x)+D.elements[8])/D.elements[0],C.y=(Math.sign(p.y)+D.elements[9])/D.elements[5],C.z=-1,C.w=(1+D.elements[10])/D.elements[14]),p.multiplyScalar(2/p.dot(C)),D.elements[2]=p.x,D.elements[6]=p.y,I.isOrthographicCamera?(D.elements[10]=p.z-a,D.elements[14]=p.w-1):(D.elements[10]=p.z+1-a,D.elements[14]=p.w),n.visible=!1;let B=A.getRenderTarget(),G=A.xr.enabled,z=A.shadowMap.autoUpdate;A.xr.enabled=!1,A.shadowMap.autoUpdate=!1,A.setRenderTarget(b),A.state.buffers.depth.setMask(!0),A.autoClear===!1&&A.clear(),A.render(x,I),A.xr.enabled=G,A.shadowMap.autoUpdate=z,A.setRenderTarget(B);let H=M.viewport;H!==void 0&&A.state.viewport(H),n.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return b},this.dispose=function(){b.dispose(),n.material.dispose()},this.getReflectionCamera=function(A){let x=this._reflectionCameras.get(A);return x===void 0&&(x=A.clone(),this._reflectionCameras.set(A,x)),x}}};fo.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
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

		}`};var T_=6,Ul=class{constructor(e,t){this.group=new Pt;this.position=new N;this.armed=!1;this.live=!0;this.stale=!0;let[n,s]=e.size;this.geometry=e.shape==="circle"?new Ir(n/2,48):new Mn(n,s);let r=(e.shape==="circle"?s/n:1)*(e.scaleY??1),o=e.tint??13226184;this.reflector=new fo(this.geometry,{textureWidth:Math.max(1,t),textureHeight:Math.max(1,t),color:o,clipBias:.003,multisample:0}),this.reflector.name="mirror",this.fallbackMaterial=new Jt({color:o,metalness:1,roughness:.08}),this.fallback=new st(this.geometry,this.fallbackMaterial),this.fallback.name="mirror-fallback",this.group.add(this.reflector,this.fallback),this.group.position.set(e.position[0],e.position[1],e.position[2]),this.group.rotation.y=e.rotationY,this.group.scale.y=r,this.group.updateMatrixWorld(!0),this.position.copy(this.group.position);let a=this.reflector.onBeforeRender;this.reflector.onBeforeRender=(l,c,u,f,h,d)=>{this.armed&&(this.armed=!1,this.stale=!1,a.call(this.reflector,l,c,u,f,h,d))},this.setResolution(t)}setResolution(e){this.live=e>0,this.reflector.visible=this.live,this.fallback.visible=!this.live,this.live&&this.reflector.getRenderTarget().setSize(e,e),this.stale=!0}setVisible(e){this.group.visible=e}warmup(e){this.reflector.visible=e||this.live,this.fallback.visible=e||!this.live}arm(e,t,n){let s=e.position.distanceTo(this.position)<T_;s||(this.stale=!0),this.armed=this.live&&this.group.visible&&s&&(!t||this.stale||n%3===0)}force(){this.armed=this.live&&this.group.visible}disarm(){this.armed&&(this.stale=!0),this.armed=!1}dispose(){this.reflector.dispose(),this.geometry.dispose(),this.fallbackMaterial.dispose()}};function wd(i,e,t){let n=e.slice(),s=ph*ph;function r(v,b){if(!i(v,b))return!0;for(let S=0;S<n.length;S++){let A=n[S],x=v<A.x1?A.x1:v>A.x2?A.x2:v,M=b<A.z1?A.z1:b>A.z2?A.z2:b,I=v-x,T=b-M;if(I*I+T*T<s)return!0}return!1}function o(v,b,S,A){let x=Math.ceil(Math.hypot(S-v,A-b)/.045);for(let M=0;M<=x;M++){let I=x?M/x:0;if(r(v+(S-v)*I,b+(A-b)*I))return!1}return!0}function a(v,b,S,A){let x=Math.ceil(Math.hypot(S-v,A-b)/.04);for(let M=1;M<=x;M++){let I=M/x;if(!i(v+(S-v)*I,b+(A-b)*I))return!1}return!0}let l=.12,c=t.minX,u=t.minZ,f=Math.ceil((t.maxX-c)/l)+1,h=Math.ceil((t.maxZ-u)/l)+1,d=v=>c+v%f*l,g=v=>u+Math.floor(v/f)*l,_=(v,b)=>Math.max(0,Math.min(h-1,Math.round((b-u)/l)))*f+Math.max(0,Math.min(f-1,Math.round((v-c)/l))),p=new Uint8Array(f*h);for(let v=0;v<p.length;v++)p[v]=r(d(v),g(v))?0:1;function m(v,b,S){let A=r(v,b)?a:o,x=_(v,b);if(p[x]&&A(v,b,d(x),g(x)))return x;let M=-1,I=1/0,T=Math.ceil(S/l)+1,D=x%f,B=Math.floor(x/f);for(let G=Math.max(0,B-T);G<=Math.min(h-1,B+T);G++)for(let z=Math.max(0,D-T);z<=Math.min(f-1,D+T);z++){let H=G*f+z;if(!p[H])continue;let P=Math.hypot(d(H)-v,g(H)-b);P<I&&P<S&&A(v,b,d(H),g(H))&&(I=P,M=H)}return M}function E(v,b,S,A){if(r(S,A))return null;if(r(v,b)){let P=m(v,b,.5);if(P<0)return null;v=d(P),b=g(P)}if(o(v,b,S,A))return[[v,b],[S,A]];let x=m(v,b,.65),M=m(S,A,.65);if(x<0||M<0)return null;let I=new Int32Array(p.length).fill(-1),T=new Int32Array(p.length),D=0,B=0;for(T[B++]=x,I[x]=x;D<B&&I[M]===-1;){let P=T[D++],U=P%f,q=(P-U)/f;U>0&&p[P-1]&&I[P-1]===-1&&(I[P-1]=P,T[B++]=P-1),U<f-1&&p[P+1]&&I[P+1]===-1&&(I[P+1]=P,T[B++]=P+1),q>0&&p[P-f]&&I[P-f]===-1&&(I[P-f]=P,T[B++]=P-f),q<h-1&&p[P+f]&&I[P+f]===-1&&(I[P+f]=P,T[B++]=P+f)}if(I[M]===-1)return null;let G=[[S,A]];for(let P=M;P!==x;P=I[P])G.push([d(P),g(P)]);G.push([d(x),g(x)],[v,b]),G.reverse();let z=[G[0]],H=0;for(;H<G.length-1;){let P=H+1;for(let U=G.length-1;U>H+1;U--)if(o(G[H][0],G[H][1],G[U][0],G[U][1])){P=U;break}z.push(G[P]),H=P}return z}function C(v,b,S=.65){if(!r(v,b))return[v,b];let A=m(v,b,S);return A<0?null:[d(A),g(A)]}return{blocked:r,clear:o,sightline:a,path:E,nearestFree:C}}var js=["battery","balanced","high","ultra"];function w_(i){let e=Math.max(.5,i||1);return{ultra:{dpr:Math.min(e,2),floor:1.5,shadow:2048,ao:!0,mirror:512},high:{dpr:Math.min(e,1.5),floor:1,shadow:2048,ao:!0,mirror:512},balanced:{dpr:vt(e,1,1.25),floor:.85,shadow:1024,ao:!1,mirror:256},battery:{dpr:.75,floor:.6,shadow:1024,ao:!1,mirror:0}}}var Ed=.15,Ad=i=>Math.round(i*100)/100,Fl=class{constructor(e,t){this.auto=!0;this.frameMs=16.7;this.workMs=4;this.slowFor=0;this.fastFor=0;this.holdUntil=0;this.lastUpAt=-1e9;this.lastUpFromDpr=0;this.lastUpFromTier="battery";this.ceilingDpr=1/0;this.ceilingTier=3;this.table=w_(e),this.maxTier=e>1.5&&!t?3:2,this.startTier=t?"balanced":"high",this.tier=this.startTier,this.dpr=this.table[this.tier].dpr}get spec(){return this.table[this.tier]}set(e){e==="auto"?(this.auto=!0,this.tier=this.startTier,this.ceilingDpr=1/0,this.ceilingTier=this.maxTier):(this.auto=!1,this.tier=e),this.dpr=this.table[this.tier].dpr,this.slowFor=this.fastFor=0}sample(e,t,n){return t<=0||(t=Math.min(t,250),this.frameMs+=(t-this.frameMs)*.1,this.workMs+=(n-this.workMs)*.1,!this.auto||e<this.holdUntil)?!1:(this.frameMs>20?(this.slowFor+=t,this.fastFor=0):this.frameMs<12||this.frameMs<18.5&&this.workMs<6?(this.fastFor+=t,this.slowFor=0):(this.slowFor=Math.max(0,this.slowFor-t),this.fastFor=Math.max(0,this.fastFor-t)),this.slowFor>1e3?this.stepDown(e):this.fastFor>3e3?this.stepUp(e):!1)}stepDown(e){this.slowFor=this.fastFor=0,this.holdUntil=e+800,e-this.lastUpAt<5e3&&(this.ceilingDpr=this.lastUpFromDpr,this.ceilingTier=js.indexOf(this.lastUpFromTier));let t=Ad(this.dpr-Ed),n=js.indexOf(this.tier);if(t<this.table[this.tier].floor-.001)if(n===0){if(t=this.table.battery.floor,t>=this.dpr)return!1}else n--,t=Math.min(t,this.table[js[n]].dpr);return this.tier=js[n],this.dpr=t,!0}stepUp(e){this.fastFor=0,this.holdUntil=e+800;let t=this.table[this.tier],n=js.indexOf(this.tier),s=this.dpr,r=this.tier,o=Ad(this.dpr+Ed);if(o<=Math.min(t.dpr,this.ceilingDpr)+.001)this.dpr=o;else if(this.dpr<t.dpr-.001&&t.dpr<=this.ceilingDpr)this.dpr=t.dpr;else if(n<Math.min(this.maxTier,this.ceilingTier))this.tier=js[n+1];else return!1;return this.lastUpAt=e,this.lastUpFromDpr=s,this.lastUpFromTier=r,!0}};var Ol=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},E_=new In(-1,1,1,-1,0,1),gh=class extends Dt{constructor(){super(),this.setAttribute("position",new ut([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ut([0,2,0,0,2,0],2))}},A_=new gh,Qs=class{constructor(e){this._mesh=new st(A_,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,E_)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var po={name:"GTAOShader",defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new be},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new $e},cameraProjectionMatrixInverse:{value:new $e},cameraWorldMatrix:{value:new $e},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new N(-1,-1,-1)},sceneBoxMax:{value:new N(1,1,1)}},vertexShader:`

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
		}`},mo={name:"GTAODepthShader",defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
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

		}`},Bl={name:"GTAOBlendShader",uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
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
		}`};function Cd(i=5){let e=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),t=C_(e),n=t.length,s=new Uint8Array(n*4);for(let o=0;o<n;++o){let a=t[o],l=2*Math.PI*a/n,c=new N(Math.cos(l),Math.sin(l),0).normalize();s[o*4]=(c.x*.5+.5)*255,s[o*4+1]=(c.y*.5+.5)*255,s[o*4+2]=127,s[o*4+3]=255}let r=new Gn(s,e,e);return r.wrapS=An,r.wrapT=An,r.needsUpdate=!0,r}function C_(i){let e=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),t=e*e,n=Array(t).fill(0),s=Math.floor(e/2),r=e-1;for(let o=1;o<=t;){if(s===-1&&r===e?(r=e-2,s=0):(r===e&&(r=0),s<0&&(s=e-1)),n[s*e+r]!==0){r-=2,s++;continue}else n[s*e+r]=o++;r++,s--}return n}var go={name:"PoissonDenoiseShader",defines:{SAMPLES:16,SAMPLE_VECTORS:xh(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new be},cameraProjectionMatrixInverse:{value:new $e},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

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
		}`};function xh(i,e,t){let n=R_(i,e,t),s="vec3[SAMPLES](";for(let r=0;r<i;r++){let o=n[r];s+=`vec3(${o.x}, ${o.y}, ${o.z})${r<i-1?",":")"}`}return s}function R_(i,e,t){let n=[];for(let s=0;s<i;s++){let r=2*Math.PI*e*s/i,o=Math.pow(s/(i-1),t);n.push(new N(Math.cos(r),Math.sin(r),o))}return n}var kl={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var zl=class{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let n,s,r,o=.5*(Math.sqrt(3)-1),a=(e+t)*o,l=Math.floor(e+a),c=Math.floor(t+a),u=(3-Math.sqrt(3))/6,f=(l+c)*u,h=l-f,d=c-f,g=e-h,_=t-d,p,m;g>_?(p=1,m=0):(p=0,m=1);let E=g-p+u,C=_-m+u,v=g-1+2*u,b=_-1+2*u,S=l&255,A=c&255,x=this.perm[S+this.perm[A]]%12,M=this.perm[S+p+this.perm[A+m]]%12,I=this.perm[S+1+this.perm[A+1]]%12,T=.5-g*g-_*_;T<0?n=0:(T*=T,n=T*T*this._dot(this.grad3[x],g,_));let D=.5-E*E-C*C;D<0?s=0:(D*=D,s=D*D*this._dot(this.grad3[M],E,C));let B=.5-v*v-b*b;return B<0?r=0:(B*=B,r=B*B*this._dot(this.grad3[I],v,b)),70*(n+s+r)}noise3d(e,t,n){let s,r,o,a,c=(e+t+n)*.3333333333333333,u=Math.floor(e+c),f=Math.floor(t+c),h=Math.floor(n+c),d=1/6,g=(u+f+h)*d,_=u-g,p=f-g,m=h-g,E=e-_,C=t-p,v=n-m,b,S,A,x,M,I;E>=C?C>=v?(b=1,S=0,A=0,x=1,M=1,I=0):E>=v?(b=1,S=0,A=0,x=1,M=0,I=1):(b=0,S=0,A=1,x=1,M=0,I=1):C<v?(b=0,S=0,A=1,x=0,M=1,I=1):E<v?(b=0,S=1,A=0,x=0,M=1,I=1):(b=0,S=1,A=0,x=1,M=1,I=0);let T=E-b+d,D=C-S+d,B=v-A+d,G=E-x+2*d,z=C-M+2*d,H=v-I+2*d,P=E-1+3*d,U=C-1+3*d,q=v-1+3*d,ne=u&255,se=f&255,ae=h&255,fe=this.perm[ne+this.perm[se+this.perm[ae]]]%12,Ke=this.perm[ne+b+this.perm[se+S+this.perm[ae+A]]]%12,Ue=this.perm[ne+x+this.perm[se+M+this.perm[ae+I]]]%12,Q=this.perm[ne+1+this.perm[se+1+this.perm[ae+1]]]%12,ce=.6-E*E-C*C-v*v;ce<0?s=0:(ce*=ce,s=ce*ce*this._dot3(this.grad3[fe],E,C,v));let oe=.6-T*T-D*D-B*B;oe<0?r=0:(oe*=oe,r=oe*oe*this._dot3(this.grad3[Ke],T,D,B));let ze=.6-G*G-z*z-H*H;ze<0?o=0:(ze*=ze,o=ze*ze*this._dot3(this.grad3[Ue],G,z,H));let Me=.6-P*P-U*U-q*q;return Me<0?a=0:(Me*=Me,a=Me*Me*this._dot3(this.grad3[Q],P,U,q)),32*(s+r+o+a)}noise4d(e,t,n,s){let r=this.grad4,o=this.simplex,a=this.perm,l=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20,u,f,h,d,g,_=(e+t+n+s)*l,p=Math.floor(e+_),m=Math.floor(t+_),E=Math.floor(n+_),C=Math.floor(s+_),v=(p+m+E+C)*c,b=p-v,S=m-v,A=E-v,x=C-v,M=e-b,I=t-S,T=n-A,D=s-x,B=M>I?32:0,G=M>T?16:0,z=I>T?8:0,H=M>D?4:0,P=I>D?2:0,U=T>D?1:0,q=B+G+z+H+P+U,ne=o[q][0]>=3?1:0,se=o[q][1]>=3?1:0,ae=o[q][2]>=3?1:0,fe=o[q][3]>=3?1:0,Ke=o[q][0]>=2?1:0,Ue=o[q][1]>=2?1:0,Q=o[q][2]>=2?1:0,ce=o[q][3]>=2?1:0,oe=o[q][0]>=1?1:0,ze=o[q][1]>=1?1:0,Me=o[q][2]>=1?1:0,ye=o[q][3]>=1?1:0,dt=M-ne+c,qe=I-se+c,Ge=T-ae+c,Oe=D-fe+c,Ve=M-Ke+2*c,Qe=I-Ue+2*c,yt=T-Q+2*c,bt=D-ce+2*c,ie=M-oe+3*c,Ye=I-ze+3*c,Be=T-Me+3*c,O=D-ye+3*c,Ct=M-1+4*c,Pe=I-1+4*c,R=T-1+4*c,y=D-1+4*c,V=p&255,W=m&255,j=E&255,le=C&255,pe=a[V+a[W+a[j+a[le]]]]%32,J=a[V+ne+a[W+se+a[j+ae+a[le+fe]]]]%32,te=a[V+Ke+a[W+Ue+a[j+Q+a[le+ce]]]]%32,K=a[V+oe+a[W+ze+a[j+Me+a[le+ye]]]]%32,De=a[V+1+a[W+1+a[j+1+a[le+1]]]]%32,me=.6-M*M-I*I-T*T-D*D;me<0?u=0:(me*=me,u=me*me*this._dot4(r[pe],M,I,T,D));let de=.6-dt*dt-qe*qe-Ge*Ge-Oe*Oe;de<0?f=0:(de*=de,f=de*de*this._dot4(r[J],dt,qe,Ge,Oe));let Ie=.6-Ve*Ve-Qe*Qe-yt*yt-bt*bt;Ie<0?h=0:(Ie*=Ie,h=Ie*Ie*this._dot4(r[te],Ve,Qe,yt,bt));let Fe=.6-ie*ie-Ye*Ye-Be*Be-O*O;Fe<0?d=0:(Fe*=Fe,d=Fe*Fe*this._dot4(r[K],ie,Ye,Be,O));let He=.6-Ct*Ct-Pe*Pe-R*R-y*y;return He<0?g=0:(He*=He,g=He*He*this._dot4(r[De],Ct,Pe,R,y)),27*(u+f+h+d+g)}_dot(e,t,n){return e[0]*t+e[1]*n}_dot3(e,t,n,s){return e[0]*t+e[1]*n+e[2]*s}_dot4(e,t,n,s,r){return e[0]*t+e[1]*n+e[2]*s+e[3]*r}};var er=class i extends Ol{constructor(e,t,n=512,s=512,r,o,a){super(),this.width=n,this.height=s,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=Cd(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new Et(this.width,this.height,{type:Gt}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new Lt({defines:Object.assign({},po.defines),uniforms:si.clone(po.uniforms),vertexShader:po.vertexShader,fragmentShader:po.fragmentShader,blending:Vt,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new Br,this.normalMaterial.blending=Vt,this.pdMaterial=new Lt({defines:Object.assign({},go.defines),uniforms:si.clone(go.uniforms),vertexShader:go.vertexShader,fragmentShader:go.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new Lt({defines:Object.assign({},mo.defines),uniforms:si.clone(mo.uniforms),vertexShader:mo.vertexShader,fragmentShader:mo.fragmentShader,blending:Vt}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new Lt({uniforms:si.clone(kl.uniforms),vertexShader:kl.vertexShader,fragmentShader:kl.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:Zr,blendDst:ns,blendEquation:yn,blendSrcAlpha:Yr,blendDstAlpha:ns,blendEquationAlpha:yn}),this.blendMaterial=new Lt({uniforms:si.clone(Bl.uniforms),vertexShader:Bl.vertexShader,fragmentShader:Bl.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:Aa,blendSrc:Zr,blendDst:ns,blendEquation:yn,blendSrcAlpha:Yr,blendDstAlpha:ns,blendEquationAlpha:yn}),this._fsQuad=new Qs(null),this._originalClearColor=new Ee,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),o!==void 0&&this.updateGtaoMaterial(o),a!==void 0&&this.updatePdMaterial(a)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){e!==void 0?(this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1):(this.depthTexture=new Hn,this.depthTexture.format=ii,this.depthTexture.type=Ni,this.normalRenderTarget=new Et(this.width,this.height,{minFilter:It,magFilter:It,type:Gt,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);let n=this.normalTexture?1:0,s=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.defines.DEPTH_SWIZZLING=s,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.defines.DEPTH_SWIZZLING=s,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&(e.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=e.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=xh(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,n){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(e,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case i.OUTPUT.Off:break;case i.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=Vt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case i.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=Vt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case i.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=Vt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case i.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case i.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=Vt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case i.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=Vt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(e,t,n,s,r){e.getClearColor(this._originalClearColor);let o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_renderOverride(e,t,n,s,r){e.getClearColor(this._originalClearColor);let o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,s=t.clearColor||s,r=t.clearAlpha||r,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_overrideVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(n){(n.isPoints||n.isLine||n.isLine2)&&n.visible&&(n.visible=!1,t.push(n))})}_restoreVisibility(){let e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){let t=new zl,n=e*e*4,s=new Uint8Array(n);for(let o=0;o<e;o++)for(let a=0;a<e;a++){let l=o,c=a;s[(o*e+a)*4]=(t.noise(l,c)*.5+.5)*255,s[(o*e+a)*4+1]=(t.noise(l+e,c)*.5+.5)*255,s[(o*e+a)*4+2]=(t.noise(l,c+e)*.5+.5)*255,s[(o*e+a)*4+3]=(t.noise(l+e,c+e)*.5+.5)*255}let r=new Gn(s,e,e,mn,$t);return r.wrapS=An,r.wrapT=An,r.needsUpdate=!0,r}};er.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};var P_=`
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,I_=`
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
}`,tr=class{constructor(e,t,n,s,r){this.scene=e;this.gtao=null;this.bg=new Ee;this.toneMapping=-1;this.target=new Et(n,s,{type:Gt,samples:r.samples}),this.white=new Gn(new Uint8Array([255,255,255,255]),1,1),this.white.needsUpdate=!0,r.ao&&(this.gtao=new er(e,t,n,s),this.gtao.updateGtaoMaterial({radius:.22,distanceExponent:1.4,thickness:.5,scale:1}),this.gtao.output=er.OUTPUT.Off),this.material=new Bs({name:"TourComposite",uniforms:{tScene:{value:this.target.texture},tAO:{value:this.gtao?this.gtao.gtaoMap:this.white},intensity:{value:0},background:{value:new N},toneMappingExposure:{value:1}},vertexShader:P_,fragmentShader:I_,depthTest:!1,depthWrite:!1}),this.quad=new Qs(this.material)}get hasAO(){return this.gtao!==null}setSize(e,t){this.target.setSize(e,t),this.gtao&&this.gtao.setSize(e,t)}renderScene(e,t,n,s){e.setRenderTarget(this.target),e.setClearColor(0,0),n(),e.render(this.scene,t),s(),this.gtao&&(this.gtao.camera=t,this.gtao.render(e,this.target,this.target,0,!1)),e.setRenderTarget(null)}composite(e,t,n,s){let r=this.material.uniforms;r.intensity.value=this.gtao?t:0,this.bg.copy(n).convertLinearToSRGB(),r.background.value.set(this.bg.r,this.bg.g,this.bg.b),r.toneMappingExposure.value=e.toneMappingExposure,this.syncDefines(e),e.setRenderTarget(s),this.quad.render(e),e.setRenderTarget(null)}syncDefines(e){if(this.toneMapping===e.toneMapping)return;this.toneMapping=e.toneMapping;let t={};e.toneMapping===is?t.ACES_FILMIC_TONE_MAPPING="":e.toneMapping===Kr?t.NEUTRAL_TONE_MAPPING="":e.toneMapping===$r?t.AGX_TONE_MAPPING="":e.toneMapping===Jr&&(t.LINEAR_TONE_MAPPING=""),this.material.defines=t,this.material.needsUpdate=!0}dispose(){this.target.dispose(),this.gtao?.dispose(),this.quad.dispose(),this.material.dispose(),this.white.dispose()}};async function Pd(i){let e=Math.max(320,Math.min(1600,Math.round(i.screenWidth))),t=Math.round(e*9/16),n=D_(i.camera,e/t),s=i.ao&&n.isPerspectiveCamera,r=new tr(i.scene,n,e,t,{samples:4,ao:s}),o=new Et(e,t,{type:$t}),a=new Uint8Array(e*t*4);try{let h=i.mirror;r.renderScene(i.renderer,n,()=>h?.force(),()=>{h&&(h.disarm(),h.stale=!0)}),r.composite(i.renderer,1,i.background,o);try{await i.renderer.readRenderTargetPixelsAsync(o,0,0,e,t,a)}catch{i.renderer.readRenderTargetPixels(o,0,0,e,t,a)}}finally{r.dispose(),o.dispose()}let l=document.createElement("canvas");l.width=e,l.height=t;let c=l.getContext("2d");if(!c)return null;let u=c.createImageData(e,t),f=e*4;for(let h=0;h<t;h++)u.data.set(a.subarray((t-1-h)*f,(t-h)*f),h*f);return c.putImageData(u,0,0),L_(c,e,t,i.caption),new Promise(h=>l.toBlob(d=>h(d),"image/jpeg",.9))}function D_(i,e){if(i.isPerspectiveCamera){let a=i,l=new zt(a.fov,e,a.near,a.far),c=2*Math.atan(Math.tan(92*Math.PI/180/2)/e)*180/Math.PI;return l.fov=Math.min(a.fov,c),l.position.copy(a.position),l.quaternion.copy(a.quaternion),l.updateProjectionMatrix(),l.updateMatrixWorld(!0),l}let t=i,n=(t.top-t.bottom)/2/t.zoom,s=(t.left+t.right)/2/t.zoom,r=(t.top+t.bottom)/2/t.zoom,o=new In(s-n*e,s+n*e,r+n,r-n,t.near,t.far);return o.position.copy(t.position),o.quaternion.copy(t.quaternion),o.updateProjectionMatrix(),o.updateMatrixWorld(!0),o}function L_(i,e,t,n){let s=Math.round(Math.max(54,t*.085)),r=t-s,o=Math.round(s*.42);i.save(),i.globalAlpha=.9,i.fillStyle=n.night,i.fillRect(0,r,e,s),i.globalAlpha=1,i.fillStyle=n.accent,i.fillRect(0,r,e,Math.max(2,Math.round(s*.035)));let a=n.hour?n.hour:"";i.textBaseline="alphabetic",i.font=`500 ${Math.round(s*.3)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;let l=a?i.measureText(a).width:0;a&&(i.fillStyle=n.paper,i.textAlign="right",i.fillText(a,e-o,r+s*.62)),i.textAlign="left",i.fillStyle=n.paper,i.font=`600 ${Math.round(s*.31)}px Georgia, 'Times New Roman', serif`,i.fillText(Rd(i,n.title,e-o*3-l),o,r+s*.48),i.globalAlpha=.72,i.font=`500 ${Math.round(s*.19)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;let c=[n.area,"Cabana 3D tour"].filter(Boolean).join("  \xB7  ").toUpperCase();"letterSpacing"in i&&(i.letterSpacing=`${Math.round(s*.02)}px`),i.fillText(Rd(i,c,e-o*3-l),o,r+s*.8),i.restore()}function Rd(i,e,t){if(i.measureText(e).width<=t)return e;let n=e;for(;n.length>1&&i.measureText(n+"\u2026").width>t;)n=n.slice(0,-1);return n.trimEnd()+"\u2026"}var Id=1.35,Dd=2.5,Ld=1.3,N_=1.9,U_=1.5,F_=1.7,O_=1.1,Zn=1.2,Vl=class{constructor(){this.x=0;this.z=0;this.yaw=0;this.pitch=0;this.eye=fd;this.speed=0;this.journey=null;this.arrived=null;this.vx=0;this.vz=0;this.turnV=0;this.pitchV=0;this.bobPhase=0;this.bobAmp=0;this.bob=0;this.last={x:NaN,z:NaN,yaw:NaN,pitch:NaN,bob:NaN,eye:NaN};this.tmp=[0,0]}place(e,t,n,s){this.x=e,this.z=t,this.yaw=n,this.pitch=vt(s,-Zn,Zn),this.vx=this.vz=this.turnV=this.pitchV=this.speed=0,this.bobAmp=this.bob=0,this.journey=null}get busy(){return this.journey!==null||this.speed>.001||this.turnV!==0||this.pitchV!==0||this.bobAmp>2e-4}walk(e,t,n,s){let r=[0];for(let a=1;a<e.length;a++)r.push(r[a-1]+Math.hypot(e[a][0]-e[a-1][0],e[a][1]-e[a-1][1]));let o=Math.min(Ld,Math.hypot(this.vx,this.vz));this.journey={points:e,cum:r,length:r[r.length-1],s:0,v:o,seg:0,yaw:t,pitch:n,freeLook:!1,room:s,settling:!1}}cancelJourney(){let e=this.journey;if(e){if(!e.settling&&e.v>0&&e.points.length>1){let t=e.points[e.seg],n=e.points[Math.min(e.seg+1,e.points.length-1)],s=Math.hypot(n[0]-t[0],n[1]-t[1])||1;this.vx=(n[0]-t[0])/s*e.v,this.vz=(n[1]-t[1])/s*e.v}this.journey=null}}step(e,t,n,s){this.journey?this.followJourney(e,t.run):this.moveFree(e,t,n);let r=t.turn*F_,o=t.pitch*O_;this.turnV+=(r-this.turnV)*as(12,e),this.pitchV+=(o-this.pitchV)*as(12,e),!r&&Math.abs(this.turnV)<.001&&(this.turnV=0),!o&&Math.abs(this.pitchV)<.001&&(this.pitchV=0),this.yaw+=this.turnV*e,this.pitch=vt(this.pitch+this.pitchV*e,-Zn,Zn);let a=s?0:Math.min(1.2,this.speed/Id)*.011;this.bobAmp+=(a-this.bobAmp)*as(6,e),this.bobAmp<2e-4&&!a&&(this.bobAmp=0),this.bobPhase=(this.bobPhase+e*(4.2+this.speed*2.2))%(Math.PI*2),this.bob=Math.sin(this.bobPhase*2)*this.bobAmp;let l=this.last,c=l.x!==this.x||l.z!==this.z||l.yaw!==this.yaw||l.pitch!==this.pitch||l.bob!==this.bob||l.eye!==this.eye;return l.x=this.x,l.z=this.z,l.yaw=this.yaw,l.pitch=this.pitch,l.bob=this.bob,l.eye=this.eye,c}apply(e){e.position.set(this.x,this.eye+this.bob,this.z),e.rotation.set(this.pitch,this.yaw+Math.PI,0),e.updateMatrixWorld()}moveFree(e,t,n){let s=t.strafe,r=t.forward,o=Math.hypot(s,r);o>1&&(s/=o,r/=o);let a=t.run?Dd:Id,l=Math.sin(this.yaw),c=Math.cos(this.yaw),u=(-c*s+l*r)*a,f=(l*s+c*r)*a,h=u*u+f*f>this.vx*this.vx+this.vz*this.vz,d=as(h?7:10,e);if(this.vx+=(u-this.vx)*d,this.vz+=(f-this.vz)*d,!u&&Math.abs(this.vx)<.005&&(this.vx=0),!f&&Math.abs(this.vz)<.005&&(this.vz=0),!this.vx&&!this.vz){this.speed=0;return}let g=this.vx*e,_=this.vz*e,p=Math.max(1,Math.ceil(Math.max(Math.abs(g),Math.abs(_))/.035)),m=n.blocked(this.x,this.z),E=this.x,C=this.z;for(let v=0;v<p;v++){let b=this.x+g/p;m||!n.blocked(b,this.z)?this.x=b:this.vx=0;let S=this.z+_/p;m||!n.blocked(this.x,S)?this.z=S:this.vz=0}this.speed=Math.hypot(this.x-E,this.z-C)/Math.max(e,1e-4)}followJourney(e,t){let n=this.journey;if(!n.settling){let s=n.length-n.s,r=Math.max(.16,Math.sqrt(2*U_*s));n.v=Math.min(t?Dd:Ld,n.v+N_*e,r),n.s=Math.min(n.length,n.s+n.v*e),this.pointAt(n,n.s),this.x=this.tmp[0],this.z=this.tmp[1],this.speed=n.v,this.vx=this.vz=0,n.s>=n.length-1e-4&&(n.settling=!0,n.v=0,this.speed=0)}if(n.freeLook)n.settling&&this.finish();else{let s=n.length-n.s,r=n.yaw===null?0:n.length<.3?1:1-tn(0,1.2,s),o=this.yaw;if(!n.settling){this.pointAt(n,Math.min(n.length,n.s+.9));let l=this.tmp[0]-this.x,c=this.tmp[1]-this.z;l*l+c*c>.0025&&(o=Math.atan2(l,c))}n.yaw!==null&&(o+=$s(o,n.yaw)*r),this.yaw+=$s(this.yaw,o)*as(n.settling?5:3.2,e);let a=n.pitch!==null?-.06+(n.pitch+.06)*r:-.06;this.pitch+=(a-this.pitch)*as(n.settling?5:3,e),n.settling&&Math.abs($s(this.yaw,o))<.002&&Math.abs(a-this.pitch)<.002&&(this.yaw=o,this.pitch=a,this.finish())}}finish(){this.arrived=this.journey,this.journey=null}pointAt(e,t){let n=e.seg;for(;n<e.points.length-2&&e.cum[n+1]<t;)n++;t===e.s&&(e.seg=n);let s=e.points[n],r=e.points[Math.min(n+1,e.points.length-1)],o=e.cum[Math.min(n+1,e.cum.length-1)]-e.cum[n],a=o>1e-6?vt((t-e.cum[n])/o,0,1):1;this.tmp[0]=s[0]+(r[0]-s[0])*a,this.tmp[1]=s[1]+(r[1]-s[1])*a}};function B_(i,e){return i===0?0:i===1?.2:i===2?.45:i===3?.85:i===45||i===48?.8:i>=51&&i<=57?.75:i>=61&&i<=67||i>=71&&i<=77?.88:i>=80&&i<=82?.7:i>=95?.95:/cloud|overcast|fog/.test(e)?.6:.25}function k_(i,e){return i>=51&&i<=67||i>=80&&i<=82||i>=95||/rain|drizzle|shower|thunder/.test(e)}function z_(i){let e=i.trim().toLowerCase();return e?e[0].toUpperCase()+e.slice(1):""}async function Nd(i,e,t){let n=`/api/utilities?action=weather&lat=${i.toFixed(5)}&lng=${e.toFixed(5)}`,s=await fetch(n,{signal:t,credentials:"same-origin",headers:{accept:"application/json"}});if(!s.ok)return null;let r=await s.json(),o=r&&r.current;if(!o||!Number.isFinite(Number(o.temp)))return null;let a=Number(o.wmoCode)||0,l=String(o.condition||"").toLowerCase();return{temp:Math.round(Number(o.temp)),label:z_(String(o.label||"")),cloud:B_(a,l),rain:k_(a,l),isDay:o.isDay!==!1&&o.isDay!==0}}var V_=180,G_=200,Ud=5.5,_h=22,H_=24,W_=35,X_=80,vh=45,yh=40,Fd="That spot can\u2019t be reached from here",Od=(i,e,t)=>{let n;try{n=new yl({antialias:!0,alpha:!1,stencil:!1,powerPreference:"high-performance"})}catch{return setTimeout(()=>t.onError("This device could not start the 3D view. The original photographs are all here.")),Z_(e)}return q_(i,e,t,n)};function q_(i,e,t,n){let s=matchMedia("(pointer: coarse)").matches,r=matchMedia("(prefers-reduced-motion: reduce)"),o=r.matches,a=dd(),l=e.listing.tzOffsetHours,c=e.northDeg??0,u=!1,f=!1,h=!1,d=!1,g=!1,_=document.hidden,p=0,m=!1,E=!1,C=0,v=0,b=!1,S=0,A=!0,x=0,M=!0,I=0,T=0,D=!1,B="idle",G=0,z=0,H={calls:0,triangles:0},P=new Fl(window.devicePixelRatio||1,s),U=n.domElement;n.setPixelRatio(P.dpr),n.outputColorSpace=Rt,n.toneMapping=is,n.toneMappingExposure=e.lights.exposure??1,n.shadowMap.enabled=!0,n.shadowMap.type=ts,n.shadowMap.autoUpdate=!1,n.info.autoReset=!1,getComputedStyle(i).position==="static"&&(i.style.position="relative"),U.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent",U.className="tour-canvas",Y_(e.theme.accent),U.tabIndex=0,U.setAttribute("role","application"),U.setAttribute("aria-roledescription","3D tour"),U.setAttribute("aria-label",`${e.listing.title}, 3D view. Move with W A S D or the arrow keys, turn with Q and E, drag to look, click the floor to walk there.`),i.appendChild(U);let q=Math.max(1,i.clientWidth),ne=Math.max(1,i.clientHeight);n.setSize(q,ne,!1);let se=new Ji;se.matrixWorldAutoUpdate=!0;let ae=q/ne<.8?70:62,fe=new zt(ae,q/ne,.05,80);fe.rotation.order="YXZ";let Ke=new In(-1,1,1,-1,.1,100);Ke.up.set(0,0,-1);let Ue=fe,Q=e.plan.bounds,ce=(Q.minX+Q.maxX)/2,oe=(Q.minZ+Q.maxZ)/2,ze=Math.hypot(Q.maxX-Q.minX,Q.maxZ-Q.minZ)/2,Me=new co(fe,U);Me.enabled=!1,Me.enableDamping=!o,Me.dampingFactor=.085,Me.rotateSpeed=.75,Me.minPolarAngle=.12,Me.maxPolarAngle=Math.PI/2-.1,Me.screenSpacePanning=!0;let ye=new co(Ke,U);ye.enabled=!1,ye.enableRotate=!1,ye.enableDamping=!1,ye.minZoom=.8,ye.maxZoom=4,ye.screenSpacePanning=!0;let dt=()=>{Pe.active||Nt()};Me.addEventListener("change",dt),ye.addEventListener("change",dt),Me.addEventListener("start",ls),ye.addEventListener("start",ls);let qe=null,Ge=null,Oe=null,Ve=null,Qe=null,yt=null,bt=2.6,ie=new Vl,Ye={x:0,z:0,yaw:0,pitch:0},Be="walk",O=null,Ct=!0,Pe=new Al,R={playing:!1,index:0,phase:"walk",dwell:0,baseYaw:0,progress:0,dirty:!1,lastAt:0},y=e.start,V=!0,W=0,j=!0,le={strafe:0,forward:0,turn:0,pitch:0,run:!1},pe={yaw:0,pitch:0},J={},te={azimuthDeg:0,elevationDeg:0},K={live:!1,date:At(),hour:10.5,jd0:0,weather:null,playing:!1};K.jd0=uo(K.date);let De=!0,me=0,de=0,Ie=0,Fe=0,He=null,F=new El,xe=!1,$=new Rl(i,e.theme.accent),ve=new Xr,Se=new be,re=new on(new N(0,1,0),0),he=new N,Re=new N,ht=new N,et={on:!1,x:0,y:0,quiet:!1},un={ready:()=>h&&!f,paused:()=>g,mode:()=>Pe.active?O??Be:Be,look(L,ee){Be!=="walk"||Pe.active||(ie.yaw+=L,ie.pitch=vt(ie.pitch+ee,-Zn,Zn),Le(),Nt())},fov:()=>ae,setFov:L=>ki.setFov(L),hover:(L,ee)=>{et.on=!0,et.quiet=!1,et.x=L,et.y=ee,tt()},hoverEnd:()=>{et.on=!1,$.cursor.show(!1),U.style.cursor=""},tap:ke,dragStart:()=>{$.cursor.show(!1),Le()},manual:()=>{ge(),ie.cancelJourney(),$.target.show(!1)},wake:Jn,lockChanged(L){t.onHint?.(L?"Mouse look on \xB7 press Esc to release":"Mouse look off"),et.on=!1,$.cursor.show(!1),L&&Nt()},nextRoom(){let L=e.rooms.map(ue=>ue.id),ee=L.indexOf(Y());ki.goRoom(L[(ee+1)%L.length])}},ot=new Dl(U,un);function Jn(){p||m||!h||u||f||_||(E=!1,p=requestAnimationFrame(cs))}function ls(){Jn()}function Nt(){A=!0,Jn()}function cs(L){if(p=0,!(u||f||_)){m=!0;try{Xl(L)}catch(ee){a&&console.error(ee),jn("The 3D view stopped unexpectedly. Reopen the tour, or browse the original photographs.")}finally{m=!1}}}function Xl(L){let ee=E,ue=ee?Math.min(.1,Math.max(0,L-C)/1e3):1/60;C=L,v++;let _e=performance.now(),nt=!1;if(h){if(!g){if(ot.pollGamepad(),ot.gyroDelta(pe)&&Be==="walk"&&!Pe.active&&(ie.yaw+=pe.yaw,ie.pitch=vt(ie.pitch+pe.pitch,-Zn,Zn),nt=!0),Pe.active){let wn=Pe.step(ue,fe);nt=!0,O==="walk"&&!Ct&&fe.position.y<bt-.05&&$n(!0),wn&&w()}else Be==="walk"?(ot.read(le),ie.step(ue,le,Ge,o)&&(nt=!0),ie.arrived&&Te(ie.arrived),Ce(ue)&&(nt=!0)):Be==="dollhouse"?(Me.update()&&(nt=!0),k()):ye.update()&&(nt=!0);K.playing&&qt(ue,L)}nt&&ir();let wt=Be==="walk"&&!Pe.active?fe.position:null;D=Oe.lamps.update(ue,wt,j||o),D&&(Oe.compensate(Oe.lamps.coverage(),Be!=="walk"),A=!0),j=!1,M&&L-I>=100&&(A=!0)}nt&&(A=!0);let je=!1;A&&h?(li(L),je=!0,A=!1,x=L,B="pending",d||(d=!0,t.onReady())):B!=="idle"&&h&&sr(L),je&&(b&&ee&&P.sample(L,L-S,performance.now()-_e)&&rr(),S=L,P.auto&&v%60===0&&us()),b=je,xn(L,!1),dn(L,!1),fn(L,!1),(A||B!=="idle"||Pe.active||Be==="walk"&&ie.busy||R.playing||K.playing||ot.active||D||M)&&!(g&&!A&&B==="idle"&&!Pe.active)?(E=!0,p=requestAnimationFrame(cs)):(xn(L,!0),dn(L,!0),fn(L,!0))}function ir(){if(Be==="walk"&&!Pe.active){ie.apply(fe),V=!0;let L=e.roomAt(ie.x,ie.z);L!==y&&(y=L,t.onRoom(L))}($.visible||et.on)&&((et.on&&!et.quiet||ot.locked)&&tt(),$.update(Ue,q,ne))}function hs(L){Math.abs(n.getPixelRatio()-L)>.001&&n.setPixelRatio(L)}function li(L){let ee=P.spec;hs(P.auto?Math.min(P.dpr,ee.dpr):ee.dpr);let ue=K.playing||L-T<120;M&&(!ue||L-I>=100)&&(n.shadowMap.needsUpdate=!0,M=!1,I=L),n.setRenderTarget(null),n.setClearColor(Oe.background,1),n.info.reset(),Ve?.arm(Ue,!0,v),n.render(se,Ue),Ve?.disarm(),H.calls=n.info.render.calls,H.triangles=n.info.render.triangles}function sr(L){if(B==="pending"){if(L-x<V_)return;let ue=P.spec;ue.ao&&Be!=="plan"&&!Pe.active?(hs(ue.dpr),Oi(),M&&(n.shadowMap.needsUpdate=!0,M=!1),Qe.renderScene(n,Ue,()=>Ve?.arm(Ue,!1,v),()=>Ve?.disarm()),z=o?1:.25,Qe.composite(n,z,Oe.background,null),G=L,B=z>=1?"idle":"fading"):(Math.abs(n.getPixelRatio()-ue.dpr)>.001&&(hs(ue.dpr),n.setRenderTarget(null),n.setClearColor(Oe.background,1),Ve?.arm(Ue,!1,v),n.render(se,Ue),Ve?.disarm()),B="idle");return}if(!Qe){B="idle";return}let ee=Math.min(1,.25+.75*(L-G)/G_);(ee-z>=.18||ee>=1)&&(z=ee,Qe.composite(n,ee,Oe.background,null)),ee>=1&&(B="idle")}function Oi(){let L=P.spec,ee=Math.floor(q*L.dpr),ue=Math.floor(ne*L.dpr);Qe?(Qe.target.width!==ee||Qe.target.height!==ue)&&Qe.setSize(ee,ue):Qe=new tr(se,fe,ee,ue,{samples:2,ao:!0})}function rr(){let L=P.spec;Oe&&(Oe.setShadowSize(L.shadow),M=!0),Ve?.setResolution(L.mirror),!L.ao&&Qe&&(Qe.dispose(),Qe=null),Qe&&Oi(),us(),Nt()}function Bi(){let L=P.spec;return{tier:P.tier,auto:P.auto,dpr:P.auto?Math.min(P.dpr,L.dpr):L.dpr,fps:Math.round(1e3/Math.max(1,P.frameMs)),ao:L.ao}}function us(){t.onQuality?.(Bi())}function $n(L){Ct=L,qe&&(qe.walls.visible=L,qe.ceilings.visible=L,qe.lowWalls.visible=!L,Ve?.setVisible(L))}function _i(){Ye.x=ie.x,Ye.z=ie.z,Ye.yaw=ie.yaw,Ye.pitch=ie.pitch}function or(L,ee,ue){let _e=vh*Math.PI/180,nt=2*Math.atan(Math.tan(_e/2)*fe.aspect),je=ze/Math.sin(Math.min(_e,nt)/2)*1.02,kt=52*Math.PI/180;return ue.set(ce,.35,oe),ee.set(ce-Math.sin(L)*Math.sin(kt)*je,.35+Math.cos(kt)*je,oe-Math.cos(L)*Math.sin(kt)*je),je}function yo(L,ee){let _e=Ke.top/Ke.zoom/Math.tan(yh/2*Math.PI/180),nt=ye.target.x,je=ye.target.z;ee.set(nt,0,je),L.set(nt,_e,je+_e*1e-4)}function Mo(L,ee,ue,_e,nt){return nt.set(L+Math.sin(ue)*Math.cos(_e)*2,ie.eye+Math.sin(_e)*2,ee+Math.cos(ue)*Math.cos(_e)*2)}function ar(){let L=(Q.maxX-Q.minX)/2*1.1+.3,ee=(Q.maxZ-Q.minZ)/2*1.1+.3,ue=q/ne,_e=Math.max(ee,L/ue);Ke.top=_e,Ke.bottom=-_e,Ke.right=_e*ue,Ke.left=-_e*ue,Ke.updateProjectionMatrix()}function Kn(L,ee={}){if(!h){J.mode=L;return}let ue=Pe.active?O??Be:Be;if(L===ue&&!ee.walkTo)return;ue==="walk"&&!Pe.active&&_i(),ee.walkTo&&Object.assign(Ye,ee.walkTo),ie.cancelJourney(),ot.clear(),ot.locked&&L!=="walk"&&ot.requestLock(!1),$.cursor.show(!1),$.target.show(!1),Me.enabled=ye.enabled=!1,M=!0;let _e=ee.instant||o;Ue===Ke?(yo(Re,ht),fe.position.copy(Re),fe.lookAt(ht),fe.fov=yh,fe.updateProjectionMatrix(),Ue=fe):Pe.active?ht.set(0,0,-1).applyQuaternion(fe.quaternion).add(fe.position):Be==="walk"?Mo(ie.x,ie.z,ie.yaw,ie.pitch,ht):ht.copy(Me.target);let nt=Re.copy(fe.position),je=ht,kt=fe.fov,wt=new N,wn=new N,zi=ae,cr=0;if(L==="walk")wt.set(Ye.x,ie.eye,Ye.z),Mo(Ye.x,Ye.z,Ye.yaw,Ye.pitch,wn),cr=2.4;else if(L==="dollhouse"){let ds=or(Ye.yaw,wt,wn);Me.minDistance=ds*.45,Me.maxDistance=ds*1.7,zi=vh}else ye.target.set(ce,0,oe),Ke.zoom=1,ar(),yo(wt,wn),zi=yh;let hr=ue==="walk";hr&&$n(!1),Be=L,O=L,t.onMode(L),_e?(Pe.cancel(),fe.position.copy(wt),fe.lookAt(wn),w()):Pe.start(nt,je,kt,wt,wn,zi,hr?2.4:0,cr,.9),Nt()}function w(){let L=O??Be;if(O=null,L==="walk"){ie.place(Ye.x,Ye.z,Ye.yaw,Ye.pitch),fe.fov=ae,fe.updateProjectionMatrix(),ie.apply(fe),$n(!0),Ue=fe,j=!0,V=!0;let ee=e.roomAt(ie.x,ie.z);ee!==y&&(y=ee,t.onRoom(ee)),R.playing&&R.phase==="walk"&&(R.phase="dwell",R.dwell=0,R.baseYaw=ie.yaw)}else L==="dollhouse"?($n(!1),fe.fov=vh,fe.updateProjectionMatrix(),or(Ye.yaw,Re,ht),Me.target.copy(ht),Pe.active||fe.position.copy(Re),Me.update(),Me.enabled=!g,Ue=fe,j=!0):($n(!1),Ke.position.set(ye.target.x,40,ye.target.z),Ke.lookAt(ye.target.x,0,ye.target.z),Ke.updateProjectionMatrix(),ye.update(),ye.enabled=!g,Ue=Ke,j=!0);M=!0,Nt()}function k(){let L=Me.target,ee=vt(L.x,Q.minX,Q.maxX),ue=vt(L.z,Q.minZ,Q.maxZ),_e=vt(L.y,0,2);(ee!==L.x||_e!==L.y||ue!==L.z)&&(L.set(ee,_e,ue),Me.update())}function Z(L){let ee=e.views[L],[ue,,_e]=ee.position,[nt,je,kt]=ee.target;return{x:ue,z:_e,yaw:Math.atan2(nt-ue,kt-_e),pitch:Math.atan2(je-ie.eye,Math.hypot(nt-ue,kt-_e))}}function Y(){return Be==="walk"&&!Pe.active?e.roomAt(ie.x,ie.z):e.roomAt(Ye.x,Ye.z)}function X(L){if(!e.views[L]||!Ge)return;let ee=Z(L);if(Be!=="walk"||Pe.active){Kn("walk",{walkTo:ee});return}$.target.show(!1);let ue=o?null:Ge.path(ie.x,ie.z,ee.x,ee.z);ue?ie.walk(ue,ee.yaw,ee.pitch,L):(ie.place(ee.x,ee.z,ee.yaw,ee.pitch),j=!0,ie.arrived={room:L}),Nt()}function Te(L){ie.arrived=null,L.room||($.target.show(!1),$.target.breathe(!1,o)),R.playing&&R.phase==="walk"&&(R.phase="dwell",R.dwell=0,R.baseYaw=ie.yaw),V=!0}function Ce(L){if(!R.playing)return!1;let ee=e.rooms.length,ue=!1;if(R.phase==="walk"){let _e=ie.journey;R.progress=(R.index+(_e?.6*(_e.length?_e.s/_e.length:1):0))/ee,!_e&&!Pe.active&&!ie.arrived&&(R.phase="dwell",R.dwell=0,R.baseYaw=ie.yaw)}else R.dwell+=L,o||(ie.yaw=R.baseYaw+Math.sin(R.dwell*.42)*.17*tn(0,1.5,R.dwell),ue=!0),R.progress=(R.index+.6+.4*Math.min(1,R.dwell/5))/ee,R.dwell>5&&(R.index++,R.index>=ee?(R.playing=!1,R.progress=1):(R.phase="walk",X(e.rooms[R.index].id)));return R.dirty=!0,ue}function ge(){R.playing&&(R.playing=!1,R.phase==="dwell"&&(R.index=Math.min(e.rooms.length-1,R.index+1)),R.dirty=!0,dn(performance.now(),!0))}function Le(){let L=ie.journey;R.playing?(ge(),ie.cancelJourney()):L&&(L.freeLook=!0)}function Ne(L,ee,ue){let _e=U.getBoundingClientRect();return Se.set((L-_e.left)/_e.width*2-1,1-(ee-_e.top)/_e.height*2),ve.setFromCamera(Se,Ue),ve.ray.intersectPlane(re,ue)!==null}function Je(L,ee){return!!Ge&&Math.hypot(L-ie.x,ee-ie.z)<12&&!Ge.blocked(L,ee)&&Ge.sightline(ie.x,ie.z,L,ee)}function tt(){if(!h||g||Pe.active)return;if(Be!=="walk"){let _e=et.on&&Ne(et.x,et.y,he)&&e.inside(he.x,he.z)&&!!e.views[e.roomAt(he.x,he.z)];U.style.cursor=_e?"pointer":"";return}let L=et.x,ee=et.y;if(ot.locked){let _e=U.getBoundingClientRect();L=_e.left+_e.width/2,ee=_e.top+_e.height/2}let ue=Ne(L,ee,he)&&Je(he.x,he.z);ue&&$.cursor.place(he.x,he.z),$.cursor.show(ue),ot.locked||(U.style.cursor=ue?"pointer":"grab"),ue&&$.update(Ue,q,ne)}function ke(L,ee,ue){if(!h||g||Pe.active||!Ge||!Ne(L,ee,he))return;if(Be!=="walk"){if(!e.inside(he.x,he.z))return;let kt=e.roomAt(he.x,he.z);ge(),e.views[kt]?X(kt):Ge.blocked(he.x,he.z)||Kn("walk",{walkTo:{x:he.x,z:he.z,yaw:Ye.yaw,pitch:0}});return}if(ge(),Math.hypot(he.x-ie.x,he.z-ie.z)>14||!Ge.sightline(ie.x,ie.z,he.x,he.z)){t.onHint?.(Fd);return}let _e=Ge.blocked(he.x,he.z)?Ge.nearestFree(he.x,he.z,.6):[he.x,he.z],nt=_e&&Ge.path(ie.x,ie.z,_e[0],_e[1]),je=$.target;if(!_e||!nt){je.place(he.x,he.z),je.show(!0),$.update(Ue,q,ne),je.shake(o),setTimeout(()=>{ie.journey||je.show(!1)},650),t.onHint?.(Fd);return}je.place(_e[0],_e[1]),je.show(!0),je.breathe(!0,o),$.update(Ue,q,ne),$.cursor.show(!1),et.quiet=!ue,o?(ie.place(_e[0],_e[1],ie.yaw,ie.pitch),j=!0,ie.arrived={room:null}):ie.walk(nt,null,null,null),Nt()}function ft(){let L=new Date(Date.now()+l*36e5);return{date:L.toISOString().slice(0,10),hour:L.getUTCHours()+L.getUTCMinutes()/60}}function At(){return new Date(Date.now()+e.listing.tzOffsetHours*36e5).toISOString().slice(0,10)}function ct(){T=performance.now(),_d(K.jd0,K.hour,l,e.listing.lat,e.listing.lng,te),Oe&&(Oe.apply(te,K.live?K.weather:null,c,n,se)&&(M=!0),Oe.compensate(Oe.lamps.coverage(),Be!=="walk"),A=!0),De=!0;let L=performance.now();xe&&(!K.playing||L-de>250)&&(de=L,F.setScene({hour:K.hour,elevation:te.elevationDeg,rain:K.live&&!!K.weather?.rain})),Jn()}function mt(){return{live:K.live,date:K.date,hour:K.hour,sun:{azimuthDeg:te.azimuthDeg,elevationDeg:te.elevationDeg},weather:K.live?K.weather:null,playing:K.playing}}function qt(L,ee){K.hour=Math.min(_h,K.hour+L*(_h-Ud)/H_),K.hour>=_h&&(K.playing=!1,M=!0,I=0),ct(),K.playing||fn(ee,!0)}function Ae(){let L=ft();L.date!==K.date&&(K.date=L.date,K.jd0=uo(L.date)),K.hour=L.hour}function nn(){He?.abort();let L=new AbortController;He=L,Nd(e.listing.lat,e.listing.lng,L.signal).then(ee=>{!u&&K.live&&ee&&(K.weather=ee,ct())}).catch(()=>{})}function lt(){Bt(),Ae();let L=6e4-Date.now()%6e4+50;Ie=window.setTimeout(function ee(){!K.live||u||(Ae(),ct(),Ie=window.setTimeout(ee,6e4-Date.now()%6e4+50))},L),nn(),Fe=window.setInterval(nn,15*6e4)}function Bt(){clearTimeout(Ie),clearInterval(Fe),Ie=Fe=0,He?.abort(),He=null}function xn(L,ee){!V||!h||!ee&&L-W<100||(V=!1,W=L,t.onPose({x:ie.x,z:ie.z,yaw:ie.yaw,pitch:ie.pitch,room:e.roomAt(ie.x,ie.z)}))}function dn(L,ee){!R.dirty||!ee&&L-R.lastAt<100||(R.dirty=!1,R.lastAt=L,t.onTour({playing:R.playing,index:Math.min(R.index,e.rooms.length-1),progress:R.progress}))}function fn(L,ee){!De||!ee&&K.playing&&L-me<100||(De=!1,me=L,t.onLight(mt()))}function gt(){let L=Math.max(1,i.clientWidth),ee=Math.max(1,i.clientHeight);L===q&&ee===ne||(q=L,ne=ee,n.setSize(L,ee,!1),fe.aspect=L/ee,fe.updateProjectionMatrix(),ar(),Qe&&Oi(),Be==="plan"&&!Pe.active&&ye.update(),Nt())}let Tt=new ResizeObserver(gt);Tt.observe(i);let Un=()=>{_=document.hidden,F.setHeld(g||_),_?(p&&cancelAnimationFrame(p),p=0,ot.clear()):(K.live&&(Ae(),ct()),Nt())};document.addEventListener("visibilitychange",Un);let xt=L=>{o=L.matches,Me.enableDamping=!o};r.addEventListener?.("change",xt);let Fn=L=>{L.preventDefault(),jn("The browser paused the 3D view to save memory. Reopen the tour, or browse the original photographs.")};U.addEventListener("webglcontextlost",Fn);function jn(L){f||u||(f=!0,p&&cancelAnimationFrame(p),p=0,ot.clear(),F.setHeld(!0),t.onError(L))}let lr=0;function Tn(L,ee){u||L<lr||(lr=L,t.onLoad?.(L,ee))}async function Jd(){if(Tn(.03,"Preparing the 3D view"),await ai(),u)return;let L=navigator.deviceMemory??8,ee=s||L<=4?"low":"high",ue=new ks,_e=0,nt=!1,je=()=>{},kt=new Promise(Ut=>{je=Ut});if(ue.onStart=()=>{_e++},ue.onLoad=()=>{nt=!0,je()},ue.onProgress=(Ut,fs,ef)=>Tn(.6+.08*(fs/Math.max(1,ef)),"Loading surfaces"),ue.onError=Ut=>{a&&console.warn("Tour texture failed to load:",Ut)},Tn(.08,"Building the apartment"),await ai(),u)return;let wt=e.build(ue,ee);qe=wt;let wn=[];wt.root.traverse(Ut=>{Ut.isLight&&wn.push(Ut)}),wn.forEach(Ut=>Ut.removeFromParent()),wn.length&&a&&console.warn(`Tour model contained ${wn.length} light(s); the engine removed them.`);for(let Ut of[wt.walls,wt.ceilings,wt.lowWalls])Ut.traverse(fs=>{fs.castShadow=!1});if(se.add(wt.root),u)return;Tn(.32,"Arranging the rooms"),await ai();let zi=[wt.contents,wt.walls,wt.ceilings,wt.lowWalls],cr=0,hr=0;for(let Ut=0;Ut<zi.length;Ut++){let fs=Sd([zi[Ut]],e.roomAt);if(cr+=fs.meshesBefore,hr+=fs.meshesAfter,Tn(.32+.06*(Ut+1),"Arranging the rooms"),await ai(),u)return}a&&console.info(`Tour merge: ${cr} meshes \u2192 ${hr}`),wt.root.updateMatrixWorld(!0);for(let Ut of[wt.root,...zi])Ut.matrixAutoUpdate=!1;Tn(.56,"Mapping the floor"),await ai(),Ge=wd(e.inside,wt.collisions,e.plan.bounds);let ds=new hn().setFromObject(wt.ceilings);!ds.isEmpty()&&ds.min.y>1.8&&(bt=ds.min.y);let jd=new hn(new N(Q.minX,0,Q.minZ),new N(Q.maxX,bt+.15,Q.maxZ));Tn(.6,"Lighting the rooms"),await ai();let Sh=new Ys(n),Th=new Tl;yt=Sh.fromScene(Th,.04),se.environment=yt.texture,Th.dispose(),Sh.dispose(),Oe=new Nl(se,e,wt,jd),e.mirror&&(Ve=new Ul(e.mirror,P.spec.mirror),se.add(Ve.group)),Oe.setShadowSize(P.spec.shadow),ct(),wt.lowWalls.visible=!1;let Qd=e.views[e.start]?e.start:Object.keys(e.views)[0],bo=Z(Qd);ie.place(bo.x,bo.z,bo.yaw,bo.pitch),_i(),ie.apply(fe),y=e.roomAt(ie.x,ie.z),ar(),_e&&!nt&&await Promise.race([kt,new Promise(Ut=>setTimeout(Ut,1e4))]),!u&&(Tn(.7,"Preparing shaders"),await $d(),!(u||f)&&(h=!0,Tn(1,"Ready"),Oe.lamps.update(0,fe.position,!0),t.onRoom(y),t.onMode(Be),us(),Kd(),De=V=R.dirty=!0,Nt()))}async function $d(){let L=qe,ee=[L.walls,L.ceilings,L.lowWalls],ue=ee.map(je=>je.visible);ee.forEach(je=>{je.visible=!0}),Ve?.warmup(!0);let _e=[];se.traverse(je=>{je.frustumCulled&&(_e.push(je),je.frustumCulled=!1)});let nt=new Et(64,64,{type:Gt});try{if(n.setRenderTarget(null),await bh(),Tn(.8,"Preparing shaders"),n.setRenderTarget(nt),await bh(),Tn(.88,"Warming up"),await ai(),u)return;n.shadowMap.needsUpdate=!0,M=!1,n.setRenderTarget(nt),n.setClearColor(0,0),Ve?.force(),n.render(se,fe),Ve?.disarm(),n.setRenderTarget(null),n.setClearColor(Oe.background,1),n.render(se,fe),await ai(),P.spec.ao&&(Oi(),Qe.renderScene(n,fe,()=>{},()=>{}),Qe.composite(n,1,Oe.background,null)),Tn(.96,"Warming up")}finally{nt.dispose(),_e.forEach(je=>{je.frustumCulled=!0}),ee.forEach((je,kt)=>{je.visible=ue[kt]}),Ve?.warmup(!1),Ve&&(Ve.stale=!0),n.setRenderTarget(null)}await ai()}async function bh(){try{await n.compileAsync(se,fe)}catch{n.compile(se,fe)}}function Kd(){if(J.view){let L=J.view;J.view=void 0,ki.setView(L)}if(J.room){let L=J.room;J.room=void 0;let ee=Z(L);ie.place(ee.x,ee.z,ee.yaw,ee.pitch),ie.apply(fe),_i()}if(J.mode){let L=J.mode;J.mode=void 0,Kn(L,{instant:!0})}J.tour&&(J.tour=void 0,ki.setTour(!0))}let ki={goRoom(L){if(e.views[L]){if(!h){J.room=L;return}ge(),X(L)}},walkTo(L,ee){if(!h||!Ge||g)return!1;let ue=Ge.nearestFree(L,ee,.8),_e=ue&&Ge.path(ie.x,ie.z,ue[0],ue[1]);return!ue||!_e?!1:(ge(),Be!=="walk"||Pe.active?(Kn("walk",{walkTo:{x:ue[0],z:ue[1],yaw:Ye.yaw,pitch:0}}),!0):($.target.place(ue[0],ue[1]),$.target.show(!0),$.target.breathe(!0,o),$.update(Ue,q,ne),o?(ie.place(ue[0],ue[1],ie.yaw,ie.pitch),ie.arrived={room:null}):ie.walk(_e,null,null,null),Nt(),!0))},move(L,ee){L=vt(L||0,-1,1),ee=vt(ee||0,-1,1),(L||ee)&&!ot.padX&&!ot.padZ&&un.manual(),ot.padX=L,ot.padZ=ee,Jn()},look(L,ee){h&&!g&&un.look(L,ee)},setRun(L){ot.runHeld=L,Jn()},setEyeHeight(L){ie.eye=vt(L,1,1.9),Be==="walk"&&!Pe.active&&h&&(ie.apply(fe),Nt())},setFov(L){ae=vt(L,W_,X_),Be==="walk"&&!Pe.active&&(fe.fov=ae,fe.updateProjectionMatrix(),$.visible&&$.update(Ue,q,ne),Nt())},setPointerLock(L){L&&(Be!=="walk"||!h)||ot.requestLock(L)},async setGyro(L){if(!L)return ot.disableGyro(),!1;let ee=await ot.enableGyro();return ee||t.onHint?.("Motion sensors aren\u2019t available on this device"),Jn(),ee},setMode(L){ge(),Kn(L)},setTour(L){if(!h){J.tour=L;return}if(!L){ge();return}(R.index>=e.rooms.length||R.progress>=1)&&(R.index=0),R.playing=!0,R.phase="walk",R.dirty=!0,X(e.rooms[R.index].id),dn(performance.now(),!0),Jn()},reset(){if(!h){J.view=void 0,J.mode=void 0,J.room=void 0;return}R.playing=!1,R.index=0,R.progress=0,R.dirty=!0,ie.cancelJourney(),Pe.cancel();let L=Z(e.views[e.start]?e.start:Object.keys(e.views)[0]);Kn("walk",{instant:!0,walkTo:L}),dn(performance.now(),!0)},setLive(L){K.live=L,L?(K.playing=!1,lt()):(Bt(),K.weather=null),ct(),fn(performance.now(),!0)},setDate(L){!/^\d{4}-\d{2}-\d{2}$/.test(L)||!Number.isFinite(uo(L))||(K.live&&(K.live=!1,Bt(),K.weather=null),K.date=L,K.jd0=uo(L),ct(),fn(performance.now(),!0))},setHour(L){Number.isFinite(L)&&(K.live&&(K.live=!1,Bt(),K.weather=null),K.playing=!1,K.hour=vt(L,0,24),ct(),fn(performance.now(),!0))},playDay(L){L?(K.live&&(K.live=!1,Bt(),K.weather=null),K.hour=Ud,K.playing=!0):K.playing=!1,M=!0,ct(),fn(performance.now(),!0)},setAmbience(L){xe=L,L&&F.setScene({hour:K.hour,elevation:te.elevationDeg,rain:K.live&&!!K.weather?.rain}),F.setOn(L),F.setHeld(g||_)},setQuality(L){P.set(L),rr()},quality:Bi,getView(){let ee=Be==="walk"&&!Pe.active?ie:Ye,ue={room:e.roomAt(ee.x,ee.z),x:ee.x,z:ee.z,yaw:ee.yaw,pitch:ee.pitch,mode:Be};return K.live||(ue.hour=K.hour,ue.date=K.date),ue},setView(L){if(!h||!Ge){J.view=L;return}let ee=Number(L.x),ue=Number(L.z);if(!Number.isFinite(ee)||!Number.isFinite(ue)||Ge.blocked(ee,ue)){let je=Number.isFinite(ee)&&Number.isFinite(ue)?Ge.nearestFree(ee,ue,.6):null;if(je)[ee,ue]=je;else{let kt=Z(e.views[L.room]?L.room:e.start);ee=kt.x,ue=kt.z}}let _e={x:ee,z:ue,yaw:Number(L.yaw)||0,pitch:vt(Number(L.pitch)||0,-Zn,Zn)};L.date&&/^\d{4}-\d{2}-\d{2}$/.test(L.date)&&ki.setDate(L.date),L.hour!=null&&Number.isFinite(L.hour)&&ki.setHour(L.hour),R.playing=!1,R.dirty=!0,ie.cancelJourney(),Pe.cancel(),O=null,Be!=="walk"?Kn("walk",{instant:!0,walkTo:_e}):(ie.place(_e.x,_e.z,_e.yaw,_e.pitch),_i(),j=!0,ir());let nt=L.mode==="dollhouse"||L.mode==="plan"?L.mode:"walk";nt!=="walk"&&(_i(),Kn(nt,{instant:!0})),Nt()},async snapshot(){if(!h||f||u||!Oe)return null;M&&(n.shadowMap.needsUpdate=!0,M=!1),Ue.updateMatrixWorld();let L=Math.floor(K.hour),ee=Math.round((K.hour-L)*60),ue=`${String(ee===60?L+1:L).padStart(2,"0")}:${String(ee===60?0:ee).padStart(2,"0")}`;try{return await Pd({renderer:n,scene:se,camera:Ue,screenWidth:q*(window.devicePixelRatio||1),ao:P.spec.ao&&Be!=="plan",background:Oe.background,mirror:Ve,caption:{title:e.listing.title,area:e.listing.area,hour:K.live?null:ue,accent:e.theme.accent,night:e.theme.night,paper:e.theme.paper}})}catch(_e){return a&&console.warn("Postcard failed",_e),null}finally{Nt()}},setPaused(L){g!==L&&(g=L,ot.clear(),L&&ot.locked&&ot.requestLock(!1),Me.enabled=!L&&Be==="dollhouse"&&!Pe.active,ye.enabled=!L&&Be==="plan"&&!Pe.active,F.setHeld(g||_),Nt())},dispose(){if(u)return;u=!0,p&&cancelAnimationFrame(p),p=0,Bt(),Tt.disconnect(),document.removeEventListener("visibilitychange",Un),r.removeEventListener?.("change",xt),U.removeEventListener("webglcontextlost",Fn),ot.dispose(),Me.removeEventListener("change",dt),ye.removeEventListener("change",dt),Me.removeEventListener("start",ls),ye.removeEventListener("start",ls),Me.dispose(),ye.dispose(),$.dispose(),F.dispose(),Qe?.dispose(),Ve?.dispose(),Oe?.sun.shadow.dispose();let L=new Set,ee=new Set,ue=new Set;se.traverse(_e=>{let nt=_e;nt.isMesh&&(L.add(nt.geometry),(Array.isArray(nt.material)?nt.material:[nt.material]).forEach(je=>ee.add(je)))}),qe&&Object.values(qe.materials).forEach(_e=>ee.add(_e)),ee.forEach(_e=>{for(let nt of Object.values(_e))nt instanceof Qt&&ue.add(nt);_e.dispose()}),L.forEach(_e=>_e.dispose()),ue.forEach(_e=>_e.dispose()),yt?.dispose(),se.clear(),n.renderLists.dispose(),n.dispose(),n.forceContextLoss(),U.remove(),a&&delete i.tourSnapshot}};return a&&Object.defineProperty(i,"tourSnapshot",{configurable:!0,value:()=>({mode:Be,ready:h,paused:g,position:{x:Ue.position.x,y:Ue.position.y,z:Ue.position.z},walker:{x:ie.x,z:ie.z},yaw:ie.yaw,pitch:ie.pitch,eye:ie.eye,fov:ae,room:Y(),blocked:Ge?Ge.blocked(ie.x,ie.z):!1,drawCalls:H.calls,triangles:H.triangles,programs:n.info.programs?.length??0,dpr:n.getPixelRatio(),tier:P.tier,auto:P.auto,fps:Math.round(1e3/Math.max(1,P.frameMs)),sun:{azimuthDeg:te.azimuthDeg,elevationDeg:te.elevationDeg},light:{live:K.live,hour:K.hour,date:K.date,playing:K.playing},refine:B,flying:Pe.active,journey:ie.journey?{length:ie.journey.length,s:ie.journey.s}:null,touring:R.playing,tourIndex:R.index,looping:p!==0,lamps:Oe?Oe.lamps.lights.map(L=>+L.intensity.toFixed(2)):[],footprint:{cursor:$.cursor.shown,target:$.target.shown},audio:F.state,pointerLock:ot.locked})}),Jd().catch(L=>{a&&console.error(L),jn("The 3D view could not be built on this device. The original photographs are all here.")}),ki}function Y_(i){if(document.getElementById("tour-engine-style"))return;let e=new Ee(i),t=document.createElement("style");t.id="tour-engine-style",t.textContent=`.tour-canvas:focus{outline:none}.tour-canvas:focus-visible{outline:2px solid rgba(${Math.round(e.r*255)},${Math.round(e.g*255)},${Math.round(e.b*255)},.75);outline-offset:-2px}`,document.head.appendChild(t)}function Z_(i){let e=i.views[i.start];return{goRoom(){},walkTo:()=>!1,move(){},look(){},setRun(){},setEyeHeight(){},setFov(){},setPointerLock(){},setGyro:async()=>!1,setMode(){},setTour(){},reset(){},setLive(){},setDate(){},setHour(){},playDay(){},setAmbience(){},setQuality(){},quality:()=>({tier:"battery",auto:!0,dpr:1,fps:0,ao:!1}),getView:()=>({room:i.start,x:e?e.position[0]:0,z:e?e.position[2]:0,yaw:0,pitch:0,mode:"walk"}),setView(){},snapshot:async()=>null,setPaused(){},dispose(){}}}var xo=new N;function Ln(i,e,t,n,s,r){let o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;xo.copy(e),xo[n]=0,xo.normalize();let c=.5*o/(o+a),u=1-xo.angleTo(i)/l;return Math.sign(xo[t])===1?u*c:a/(o+a)+c+c*(1-u)}var Gl=class i extends Rn{constructor(e=1,t=1,n=1,s=2,r=.1){let o=s*2+1;if(r=Math.min(e/2,t/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:s,radius:r},o===1)return;let a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;let l=new N,c=new N,u=new N(e,t,n).divideScalar(2).subScalar(r),f=this.attributes.position.array,h=this.attributes.normal.array,d=this.attributes.uv.array,g=f.length/6,_=new N,p=.5/o;for(let m=0,E=0;m<f.length;m+=3,E+=2)switch(l.fromArray(f,m),c.copy(l),c.x-=Math.sign(c.x)*p,c.y-=Math.sign(c.y)*p,c.z-=Math.sign(c.z)*p,c.normalize(),f[m+0]=u.x*Math.sign(l.x)+c.x*r,f[m+1]=u.y*Math.sign(l.y)+c.y*r,f[m+2]=u.z*Math.sign(l.z)+c.z*r,h[m+0]=c.x,h[m+1]=c.y,h[m+2]=c.z,Math.floor(m/g)){case 0:_.set(1,0,0),d[E+0]=Ln(_,c,"z","y",r,n),d[E+1]=1-Ln(_,c,"y","z",r,t);break;case 1:_.set(-1,0,0),d[E+0]=1-Ln(_,c,"z","y",r,n),d[E+1]=1-Ln(_,c,"y","z",r,t);break;case 2:_.set(0,1,0),d[E+0]=1-Ln(_,c,"x","z",r,e),d[E+1]=Ln(_,c,"z","x",r,n);break;case 3:_.set(0,-1,0),d[E+0]=1-Ln(_,c,"x","z",r,e),d[E+1]=1-Ln(_,c,"z","x",r,n);break;case 4:_.set(0,0,1),d[E+0]=1-Ln(_,c,"x","y",r,e),d[E+1]=1-Ln(_,c,"y","x",r,t);break;case 5:_.set(0,0,-1),d[E+0]=Ln(_,c,"x","y",r,e),d[E+1]=1-Ln(_,c,"y","x",r,t);break}}static fromJSON(e){return new i(e.width,e.height,e.depth,e.segments,e.radius)}};function Bd(){let i=731,e=()=>(i=1664525*i+1013904223>>>0)/4294967296;function t(u){let f=document.createElement("canvas");f.width=f.height=512;let h=f.getContext("2d");if(h.fillStyle={wood:"#c9b48f",marble:"#e8e6df",cloth:"#ece9e1",rug:"#e9e5d9",zebra:"#faf8ed",curtain:"#b6b8b5",art:"#b78d23",floorwood:"#c4a677"}[u]||"#eeeeea",h.fillRect(0,0,512,512),u==="wood"||u==="floorwood"){for(let _=0;_<512;_++){h.strokeStyle=`rgba(68,43,18,${.025+e()*.13})`,h.lineWidth=.5+e()*1.2,h.beginPath(),h.moveTo(_,0);for(let p=0;p<=512;p+=8)h.lineTo(_+Math.sin(p*.011+_*.008)*4+Math.sin(p*.055+_*.03)*1.8,p);h.stroke()}if(u==="floorwood"){h.strokeStyle="#927d5f",h.lineWidth=1;for(let _=0;_<512;_+=128)h.strokeRect(_,0,128,512),h.beginPath(),h.moveTo(_,150+_%256),h.lineTo(_+128,150+_%256),h.stroke()}}if(u==="marble"){for(let _=0;_<85;_++){let p=e()*800-180,m=e()*512;h.strokeStyle=`rgba(110,112,110,${.012+e()*.045})`,h.lineWidth=.5+e()*9,h.beginPath(),h.moveTo(p,m),h.bezierCurveTo(p+35,m+80,p+130,m+90,p+210,m+220),h.stroke()}h.strokeStyle="#b8b7af",h.lineWidth=1.2,h.strokeRect(0,0,512,512)}if(u==="rug"){for(let _=0;_<21e3;_++){let p=e()*512,m=e()*512,E=Math.sin(p*.05)+Math.sin(m*.02+p*.036);h.fillStyle=E+e()>.5?"rgba(24,24,22,.88)":"rgba(129,125,115,.32)",h.fillRect(p,m,1+e()*7,1+e()*3)}h.strokeStyle="#d6d0c0",h.lineWidth=9,h.strokeRect(5,5,502,502)}if(u==="zebra")for(let _=-3;_<18;_++){h.fillStyle="#121616",h.beginPath();let p=_*39;h.moveTo(p,0);for(let m=0;m<=512;m+=8)h.lineTo(p+Math.sin(m*.025+_*1.3)*27+Math.sin(m*.011)*20,m);for(let m=512;m>=0;m-=8)h.lineTo(p+23+Math.sin(m*.025+_*1.3+.12)*28+Math.sin(m*.011)*20,m);h.fill()}if(u==="curtain"){h.strokeStyle="rgba(76,82,82,.3)",h.lineWidth=1.4;for(let _=-80;_<600;_+=65)for(let p=-60;p<600;p+=65){h.beginPath(),h.moveTo(p,_+32),h.lineTo(p+32,_+14),h.lineTo(p+65,_+32),h.lineTo(p+32,_+51),h.closePath(),h.stroke();for(let m=0;m<4;m++)h.beginPath(),h.moveTo(p+8,_+35+m*4),h.lineTo(p+32,_+49+m*4),h.lineTo(p+58,_+34+m*4),h.stroke()}}if(u==="art")for(let _=0;_<9;_++){let p=_%3*190+e()*80,m=Math.floor(_/3)*190+e()*80;for(let E=6;E<110;E+=5)h.strokeStyle=E%3?"#dbb642":"#8d660e",h.lineWidth=2.4,h.beginPath(),h.arc(p,m,E,0,Math.PI*2),h.stroke()}let d=h.getImageData(0,0,512,512);for(let _=0;_<d.data.length;_+=4){let p=(e()-.5)*(u==="cloth"?28:10);d.data[_]+=p,d.data[_+1]+=p,d.data[_+2]+=p}h.putImageData(d,0,0);let g=new ji(f);return g.colorSpace=Rt,g.wrapS=g.wrapT=An,g.anisotropy=8,g}let n=t("cloth"),s=n.clone();s.colorSpace=qn,s.repeat.set(6,6);let r=(u,f=.6,h=0)=>new Jt({color:u,roughness:f,metalness:h}),o=u=>new gi({color:u,bumpMap:s,bumpScale:.006,roughness:.93,sheen:.55,sheenColor:new Ee("#c9c8c1"),sheenRoughness:.9}),a=t("marble"),l=t("wood");return{plaster:r("#e5e3db",.94),white:r("#efeee4",.34),edge:r("#cfc5ac",.5),oak:new Jt({map:l,color:"#e4d6b6",roughness:.47}),timber:new Jt({map:t("floorwood"),roughness:.56}),marble:new Jt({map:a,roughness:.24}),cream:o("#c5beaf"),linen:o("#e9e6dc"),velvet:o("#11181c"),blue:o("#6c8298"),yellow:o("#dbab1c"),zebra:new gi({map:t("zebra"),bumpMap:s,bumpScale:.004,roughness:.91,sheen:.4}),curtain:new gi({color:"#969d9a",map:t("curtain"),bumpMap:s,bumpScale:.003,roughness:.85,side:pn}),rug:new Jt({map:t("rug"),bumpMap:s,bumpScale:.011,roughness:1}),art:new Jt({map:t("art"),bumpMap:t("art"),bumpScale:.025,metalness:.65,roughness:.38}),gold:r("#cfad53",.26,.82),black:r("#141919",.4),taupe:r("#b7ac96",.56),steel:r("#a1a6a5",.27,.8),chrome:r("#c8d2d2",.13,.95),green:r("#3c6233",.72),ceramic:new gi({color:"#f6f5ed",roughness:.19,clearcoat:.5,side:pn}),glass:new gi({color:"#b8d2d0",transparent:!0,opacity:.18,roughness:.12,metalness:.1,depthWrite:!1,side:pn}),glow:new Jt({color:"#fff1cd",emissive:"#ffe3a2",emissiveIntensity:2.2,roughness:.24}),screen:new Jt({color:"#14343d",emissive:"#1e6473",emissiveIntensity:.3,roughness:.16,metalness:.2})}}var Hl={id:"2d488e1a-3582-409f-ac3c-5f67adc90c74",title:"Fully furnished Elegant 1Bedroom in Kileleshwa",location:"Kileleshwa \xB7 Nairobi",description:"A considered city retreat. Pale oak, soft ivory and a touch of gold.",guests:2,bedrooms:1,bathrooms:1};var kd=[{id:"living",name:"Living room",detail:"Soft ivory. A little gold.",image:3,photos:[1,3,5,8]},{id:"dining",name:"Dining & work",detail:"Slow mornings. Space to focus.",image:11,photos:[11,5,1]},{id:"kitchen",name:"Kitchen",detail:"Pale oak, thoughtfully equipped.",image:6,photos:[6,12,7,13]},{id:"bedroom",name:"Bedroom",detail:"Charcoal velvet. A golden finish.",image:2,photos:[2,16,17]},{id:"bathroom",name:"Bathroom",detail:"Marble tones & a glass shower.",image:9,photos:[9,14]},{id:"utility",name:"Laundry",detail:"The practical details, considered.",image:10,photos:[10,6]}];var _o=[{id:"living",x:0,z:1.8,w:3.7,d:4.6},{id:"dining",x:0,z:0,w:3.7,d:1.8},{id:"kitchen",x:0,z:-2.6,w:3.7,d:2.6},{id:"utility",x:0,z:-3.8,w:3.7,d:1.2},{id:"hall",x:3.7,z:-2.6,w:1.2,d:4.4},{id:"bedroom",x:4.9,z:0,w:3.6,d:4},{id:"bathroom",x:4.9,z:-2.6,w:2.4,d:2.6}],Nn=i=>8.5-i,zd=_o.map(i=>({...i,x:Nn(i.x+i.w)})),Mh={minX:0,maxX:8.5,minZ:-3.8,maxZ:6.4},J_={living:{position:[.9,1.6,2.25],target:[2.4,1.25,5.3]},dining:{position:[.7,1.6,.25],target:[2.6,1.02,1.65]},kitchen:{position:[1.5,1.6,-.48],target:[1.5,1.2,-2.4]},bedroom:{position:[7.85,1.6,.65],target:[6.5,1.15,2.8]},bathroom:{position:[5.42,1.6,-1.35],target:[6.8,1.25,-1.1]},utility:{position:[2.6,1.6,-3.15],target:[.75,.7,-3.4]}},Vd=Object.fromEntries(Object.entries(J_).map(([i,e])=>[i,{position:[Nn(e.position[0]),e.position[1],e.position[2]],target:[Nn(e.target[0]),e.target[1],e.target[2]]}]));function Gd(){let i=new Pt,e=new Pt,t=new Pt,n=new Pt,s=new Pt;i.add(e,t,n,s);let r=Bd(),o=[],a=(E,C,v,b,S,A,x,M,I=0)=>{let T=new st(I?new Gl(C,v,b,2,Math.min(I,C/2,v/2,b/2)):new Rn(C,v,b),M);return T.position.set(S,A,x),T.castShadow=T.receiveShadow=!0,E.add(T),T},l=(E,C,v,b,S,A,x,M)=>{let I=new st(new Ur(1,20,12),M);return I.position.set(C,v,b),I.scale.set(S,A,x),I.castShadow=I.receiveShadow=!0,E.add(I),I},c=(E,C,v,b,S,A,x,M)=>{let I=new st(new Dr(C,v,b,28),M);return I.position.set(S,A,x),I.castShadow=I.receiveShadow=!0,E.add(I),I},u=(E,C,v,b)=>{let S=new Os(C.map(x=>new N(x[0],x[1],x[2]))),A=new st(new Or(S,Math.max(6,C.length*4),v,6,!1),b);return A.castShadow=!0,E.add(A),A},f=(E,C,v,b,S,A,x)=>{let M=new st(new Fr(C,v,8,40),x);return M.position.set(b,S,A),M.castShadow=!0,E.add(M),M},h=(E,C,v=0)=>{let b=new Pt;return b.position.set(E,0,C),b.rotation.y=v,e.add(b),b},d=(E,C,v,b)=>o.push({x1:E-v/2,x2:E+v/2,z1:C-b/2,z2:C+b/2});function g(E,C,v,b,S=!1){a(e,v+.08,.14,b+.08,E+v/2,-.09,C+b/2,r.taupe);let A=(S?r.timber:r.marble).clone();A.map=A.map.clone(),A.map.repeat.set(v/(S?1.2:.65),b/(S?2:.65));let x=new st(new Mn(v,b),A);x.rotation.x=-Math.PI/2,x.position.set(E+v/2,.002,C+b/2),x.receiveShadow=!0,e.add(x);let M=a(n,v,.06,b,E+v/2,2.85,C+b/2,r.plaster);M.castShadow=!1}_o.forEach(E=>g(E.x,E.z,E.w,E.d,E.id==="bedroom"));function _(E,C,v,b,S=r.plaster){let A=Math.hypot(v-E,b-C),x=(E+v)/2,M=(C+b)/2,I=-Math.atan2(b-C,v-E);a(t,A+.1,2.85,.1,x,1.425,M,S).rotation.y=I,a(s,A+.1,.18,.11,x,.09,M,S).rotation.y=I,a(t,A+.1,.085,.135,x,.044,M,r.edge).rotation.y=I,o.push({x1:Math.min(E,v)-.05,x2:Math.max(E,v)+.05,z1:Math.min(C,b)-.05,z2:Math.max(C,b)+.05})}function p(E,C,v,b=0){let S=new Pt;S.position.set(E,0,C),S.rotation.y=b,t.add(S),a(S,v,.52,.12,0,2.59,0,r.plaster);for(let A of[-1,1])a(S,.06,2.32,.15,A*v/2,1.16,0,r.oak);a(S,v+.1,.06,.15,0,2.32,0,r.oak)}[[0,-3.8,0,6.4],[0,6.4,3.7,6.4],[3.7,1.5,3.7,6.4],[3.7,-2.6,3.7,.48],[3.7,-2.6,4.9,-2.6],[3.7,1.8,4.9,1.8],[4.9,1.5,4.9,4],[4.9,-2.6,4.9,-1.95],[4.9,-.85,4.9,.48],[4.9,4,8.5,4],[8.5,0,8.5,4],[4.9,0,8.5,0],[4.9,-2.6,7.3,-2.6],[7.3,-2.6,7.3,0],[0,-3.8,3.7,-3.8],[3.7,-3.8,3.7,-2.6],[0,-2.6,2.95,-2.6]].forEach(E=>_(...E)),p(3.7,.99,1.02,Math.PI/2),p(4.9,.99,1.02,Math.PI/2),p(4.9,-1.4,1.1,Math.PI/2),p(3.325,-2.6,.75);for(let[E,C,v,b]of[[1.85,3.2,3.7,6.4],[6.7,2,3.6,4]]){for(let S of[-1,1])a(n,.24,.18,b,E+S*(v/2-.12),2.72,C,r.plaster),a(n,v,.18,.22,E,2.72,C+S*(b/2-.11),r.plaster);for(let S of[C-b*.3,C,C+b*.3])for(let A of[E-v/2+.18,E+v/2-.18])c(n,.045,.045,.009,A,2.623,S,r.glow),c(n,.054,.054,.011,A,2.632,S,r.white)}function m(E,C,v,b,S=0){let A=new Mn(v,b,Math.ceil(v*60),24),x=A.attributes.position;for(let T=0;T<x.count;T++){let D=x.getX(T)/v+.5;x.setZ(T,Math.sin(D*Math.PI*2*Math.round(v/.15))*.052),x.setY(T,x.getY(T)+.014*Math.sin(D*61)*(1-(x.getY(T)/b+.5)))}A.computeVertexNormals();let M=new st(A,r.curtain);M.position.set(E,b/2+.07,C),M.rotation.y=S,M.castShadow=M.receiveShadow=!0,e.add(M);let I=c(e,.014,.014,v+.12,E,b+.13,C,r.black);return I.rotation.z=Math.PI/2,M}return m(1.85,6.29,3.53,2.55),m(8.38,2.6,2.55,2.58,Math.PI/2),{root:i,contents:e,walls:t,ceilings:n,lowWalls:s,m:r,collisions:o,box:a,sphere:l,cyl:c,tube:u,group:h,obstacle:d,torus:f,curtain:m}}function Hd(i){i.root.scale.x=-1,i.root.position.x=8.5;for(let e of i.collisions){let t=e.x1;e.x1=Nn(e.x2),e.x2=Nn(t)}}function Wd(i){let{contents:e,walls:t,ceilings:n,m:s,box:r,sphere:o,cyl:a,tube:l,group:c,obstacle:u,torus:f}=i,h=c(3.08,4.77,-Math.PI/2);r(h,3,.34,.92,0,.27,0,s.cream,.085),r(h,3.02,.57,.2,0,.72,-.37,s.cream,.065);for(let P of[-1,1]){r(h,.17,.64,.98,P*1.43,.53,.02,s.cream,.065);for(let U of[-.3,.3])a(h,.035,.028,.13,P*1.32,.075,U,s.black)}for(let P=0;P<3;P++){let U=(P-1)*.89;r(h,.87,.19,.72,U,.49,.07,s.cream,.057);let q=r(h,.88,.5,.18,U,.84,-.23,s.cream,.073);q.rotation.x=-.13;for(let ne=0;ne<2;ne++)o(h,U+(ne?1:-1)*.18,.85,-.119,.012,.013,.007,s.taupe);l(h,[[U-.4,.515,.43],[U,.504,.438],[U+.4,.515,.43]],.0025,s.linen)}r(h,.88,.35,1.53,.94,.28,.35,s.cream,.07),r(h,.88,.18,1.38,.94,.5,.4,s.cream,.06);for(let[P,U,q]of[[-1.05,-.05,-.14],[.82,-.02,.1],[.13,.1,-.1]])r(h,.43,.45,.15,P,.79,U,s.zebra,.07).rotation.set(-.18,0,q);let d=r(h,.54,.08,.69,.91,.625,.47,s.blue,.035);d.rotation.y=.16,u(3.1,4.77,.98,3.04),u(2.65,5.71,1.72,.96),r(e,2.92,.014,3.48,1.85,.016,4.63,s.rug,.009);for(let P=0;P<3;P++){let U=4.93-P*.43,q=1.78-P*.08,ne=.59-P*.07,se=.61-P*.045,ae=.47;r(e,se,.032,ae,q,ne,U,s.black,.009);for(let fe of[-1,1])l(e,[[q-se*.43,.025,U+fe*ae*.43],[q+se*.43,ne-.01,U+fe*ae*.43]],.013,s.black),l(e,[[q+se*.43,.025,U+fe*ae*.43],[q-se*.43,ne-.01,U+fe*ae*.43]],.013,s.black),l(e,[[q-se*.43,.025,U+fe*ae*.43],[q+se*.43,.025,U+fe*ae*.43]],.013,s.black)}u(1.7,4.5,.72,1.35),r(e,.05,.016,.17,1.82,.622,4.95,s.black,.008);for(let P=0;P<5;P++)o(e,1.82,.633,4.9+P*.019,.005,.002,.004,s.white);for(let P=0;P<6;P++)r(t,.035,2.65,.56,.072,1.39,3.08+P*.59,s.oak,.002);r(e,.055,.76,1.34,.12,1.61,4.58,s.black,.014),r(e,.007,.7,1.27,.153,1.61,4.58,s.screen,.005);let g=document.createElement("canvas");g.width=640,g.height=360;let _=g.getContext("2d"),p=_.createLinearGradient(0,0,640,360);p.addColorStop(0,"#14353b"),p.addColorStop(.5,"#496e77"),p.addColorStop(1,"#112b35"),_.fillStyle=p,_.fillRect(0,0,640,360);for(let P=0;P<7;P++){_.fillStyle=`rgba(117,166,169,${.04+P*.014})`,_.beginPath(),_.moveTo(0,300-P*16);for(let U=0;U<=640;U+=20)_.lineTo(U,250+Math.sin(U*.012+P*.5)*(35+P*6)-P*16);_.lineTo(640,360),_.lineTo(0,360),_.fill()}let m=new ji(g);m.colorSpace=Rt;let E=new Ki({map:m}),C=new st(new Mn(1.27,.7),E);C.rotation.y=Math.PI/2,C.position.set(.158,1.61,4.58),e.add(C),r(e,.41,.035,2.24,.34,.53,4.6,s.black,.02),r(e,.37,.025,2.12,.34,.1,4.6,s.black,.009),r(e,.34,.31,.7,.34,.32,4.6,s.black,.007);for(let P of[3.53,5.67])for(let U of[.17,.51])l(e,[[U,.08,P],[U,.53,P]],.013,s.gold);for(let P of[3.95,5.22])l(e,[[.53,.1,P-.34],[.53,.53,P+.34]],.008,s.gold),l(e,[[.53,.53,P-.34],[.53,.1,P+.34]],.008,s.gold);r(e,.012,.016,.21,.523,.32,4.6,s.gold,.002),u(.34,4.6,.45,2.28);for(let P=0;P<3;P++)r(e,.19,.035,.28,.33,.565+P*.035,5.27,P%2?s.black:s.linen,.002);let v=a(e,.13,.12,.016,.32,.562,3.93,s.chrome);for(let P=0;P<8;P++)o(e,.3+Math.cos(P*2.4)*.075,.58,3.93+Math.sin(P*2.4)*.075,.019,.011,.022,P%2?s.yellow:s.green);r(t,.03,.79,1.28,3.62,1.97,4.81,s.gold,.004),r(t,.013,.75,1.24,3.6,1.97,4.81,s.art);let b=new Pt;b.position.set(1.85,0,4.52),n.add(b),a(b,.075,.075,.04,0,2.76,0,s.gold),a(b,.014,.014,.46,0,2.51,0,s.gold),a(b,.038,.038,.14,0,2.25,0,s.gold);for(let P=0;P<10;P++){let U=P*Math.PI*2/10,q=P%2?.67:.39,ne=2.22+P%3*.085,se=Math.cos(U)*q,ae=Math.sin(U)*q;l(b,[[0,2.24,0],[se*.48,2.25,ae*.48],[se,ne,ae]],.009,s.gold),o(b,se,ne,ae,.088,.088,.088,s.glow),f(b,.037,.006,se,ne,ae,s.gold)}let S=c(1.84,1.2);a(S,.5,.5,.035,0,.745,0,s.white),a(S,.06,.12,.6,0,.42,0,s.white),a(S,.12,.31,.115,0,.105,0,s.white),a(S,.33,.33,.022,0,.037,0,s.white),u(1.84,1.2,1,1);for(let P of[-1,1]){let U=c(1.84,1.2+P*.8,P===1?Math.PI:0);r(U,.46,.055,.43,0,.46,0,s.white,.08);let q=r(U,.46,.44,.05,0,.69,-.18,s.white,.1);q.rotation.x=-.13;for(let se of[-.18,.18])for(let ae of[-.15,.15])l(U,[[se*1.15,.03,ae*1.3],[se,.435,ae]],.011,s.gold);u(1.84,1.2+P*.8,.47,.47),a(S,.14,.13,.012,0,.771,P*.27,s.ceramic),a(S,.105,.1,.012,0,.784,P*.27,s.ceramic),a(S,.046,.035,.095,0,.838,P*.27,s.ceramic);let ne=f(S,.029,.007,.047,.838,P*.27,s.ceramic);ne.rotation.y=Math.PI/2}a(S,.04,.05,.16,.08,.845,0,s.gold);for(let P=0;P<7;P++){let U=.08+Math.sin(P*2.4)*.03,q=Math.cos(P*2.4)*.025;l(S,[[U,.83,q],[U,.99+P%2*.035,q]],.0025,s.gold),o(S,U,1+P%2*.035,q,.013,.029,.008,s.gold)}let A=c(3.02,2.71,Math.PI/2);r(A,.94,.043,.6,0,.75,0,s.black,.008);for(let P of[-.445,.445])r(A,.035,.71,.58,P,.373,0,s.black);r(A,.86,.5,.03,0,.48,.27,s.black),u(3.02,2.71,.62,.98);let x=c(3.48,2.71,Math.PI/2);r(x,.44,.08,.44,0,.46,0,s.black,.09);let M=r(x,.42,.57,.05,0,.77,.18,s.black,.07);M.rotation.x=.1,r(x,.3,.2,.055,0,1.11,.2,s.black,.085),a(x,.034,.034,.38,0,.22,0,s.chrome);for(let P=0;P<5;P++){let U=P*Math.PI*2/5;l(x,[[0,.13,0],[Math.sin(U)*.29,.07,Math.cos(U)*.29]],.014,s.chrome),o(x,Math.sin(U)*.29,.04,Math.cos(U)*.29,.035,.035,.02,s.black)}for(let P=0;P<6;P++)r(x,.3,.024,.015,0,.6+P*.065,.146,s.taupe,.012);let I=c(3.48,1.89,Math.PI/2);r(I,.72,.035,.28,0,.8,0,s.black,.004);for(let P of[-1,1])l(I,[[-.34,.04,P*.1],[.34,.785,P*.1]],.018,s.gold),l(I,[[.34,.04,P*.1],[-.34,.785,P*.1]],.018,s.gold);let T=f(t,.285,.02,3.62,1.76,1.89,s.gold);T.rotation.y=-Math.PI/2,T.scale.y=1.2;for(let P=0;P<24;P++){let U=P*Math.PI*2/24,q=f(t,.027,.008,3.6,1.76+Math.sin(U)*.34,1.89+Math.cos(U)*.285,s.gold);q.rotation.y=-Math.PI/2}a(I,.055,.045,.12,.2,.879,0,s.ceramic);for(let P=0;P<6;P++){let U=o(I,.2+Math.sin(P)*.036,.954,Math.cos(P)*.034,.045,.012,.025,s.green);U.rotation.z=P}u(3.48,1.89,.3,.74);let D=c(6.9,2.48,Math.PI);r(D,1.87,.38,2.12,0,.3,0,s.velvet,.06),r(D,1.8,.23,2.01,0,.61,0,s.linen,.085),r(D,1.98,1.46,.13,0,.85,-1.08,s.velvet,.045);for(let P=0;P<5;P++)for(let U=0;U<3;U++)r(D,.37,.37,.095,(P-2)*.386,.56+U*.37,-.985,s.velvet,.055);r(D,1.91,.66,.13,0,.43,1.08,s.velvet,.07);for(let P of[-.44,.44]){let U=r(D,.71,.17,.41,P,.83,-.72,s.linen,.075);U.rotation.x=.17,r(D,.45,.41,.14,P,.97,-.43,s.blue,.09).rotation.set(-.24,0,P*.2)}D.rotation.y=Math.PI;let B=new Mn(1.86,.74,48,24),G=B.attributes.position;for(let P=0;P<G.count;P++){let U=G.getX(P),q=G.getY(P);G.setZ(P,.012*Math.sin(U*23+q*7)+.009*Math.sin(U*41))}B.computeVertexNormals();let z=new st(B,s.yellow);z.rotation.x=-Math.PI/2,z.position.set(0,.766,.49),z.castShadow=!0,D.add(z);for(let P of[-1,1])r(D,.045,.23,.73,P*.925,.64,.49,s.yellow,.018);u(6.9,2.48,1.96,2.25);for(let[P,U,q]of[[6.3,2.11,.105],[6.66,2.32,.14],[7.13,2.48,.12],[7.5,2.29,.115],[6.61,1.91,.13],[7.02,2.11,.15]]){let ne=a(t,q,q,.018,P,U,3.91,s.zebra);ne.rotation.x=Math.PI/2,f(t,q,.005,P,U,3.894,s.gold)}for(let P=0;P<4;P++){let U=2.06+P*.46;r(e,.51,2.49,.45,5.2,1.255,U,s.taupe,.004),r(e,.017,.29,.013,5.463,1.17,U+.155,s.black,.003)}u(5.21,2.75,.56,1.86),r(e,.44,.46,.4,8.05,.42,3.43,s.white,.012),r(e,.44,.034,.42,8.05,.67,3.43,s.white),r(e,.4,.16,.02,8.05,.565,3.213,s.oak),o(e,8.05,.565,3.192,.015,.015,.01,s.black);for(let P of[-.14,.14])for(let U of[-.13,.13])a(e,.018,.012,.21,8.05+P,.105,3.43+U,s.oak);a(e,.09,.085,.025,8.05,.7,3.43,s.gold),a(e,.014,.014,.25,8.05,.83,3.43,s.gold),a(e,.105,.155,.21,8.05,1,3.43,s.velvet),a(e,.105,.105,.008,8.05,1.11,3.43,s.gold),u(8.05,3.43,.44,.42);let H=new Pt;n.add(H),a(H,.16,.16,.04,6.75,2.8,1.9,s.gold),o(H,6.75,2.745,1.9,.14,.065,.14,s.glow);for(let[P,U,q]of[[3.64,.34,-Math.PI/2],[5.02,.38,Math.PI/2],[.09,2.33,Math.PI/2]]){let ne=new Pt;ne.position.set(P,1.15,U),ne.rotation.y=q,t.add(ne),r(ne,.1,.105,.012,0,0,0,s.steel,.005),r(ne,.026,.052,.013,0,0,.01,s.taupe,.002)}}function Xd(i){let{contents:e,walls:t,m:n,box:s,sphere:r,cyl:o,tube:a,group:l,obstacle:c,torus:u}=i,f=n.green.clone();f.color.set("#a6bca5");let h=n.green.clone();h.color.set("#752e34");let d=l(0,0);s(d,2.1,.12,.66,1.68,.08,-2.2,n.steel),s(d,2.1,.7,.61,1.68,.48,-2.2,n.oak),s(d,2.13,.045,.68,1.68,.85,-2.17,n.marble,.012);for(let T of[.67,1.69,2.13,2.7])s(d,.008,.66,.014,T,.48,-1.887,n.taupe);s(d,1.46,.014,.012,1.98,.792,-1.881,n.taupe),s(d,.64,.73,1.19,2.54,.465,-1.59,n.oak),s(d,.66,.045,1.26,2.55,.852,-1.59,n.marble,.012),s(d,.015,.64,.011,2.211,.48,-1.09,n.taupe),s(d,.012,.012,1.16,2.21,.795,-1.59,n.taupe),s(d,.64,.1,1.19,2.54,.075,-1.59,n.steel),c(1.68,-2.2,2.1,.67),c(2.54,-1.59,.66,1.26),s(d,.69,2.32,.63,.38,1.16,-2.215,n.oak),s(d,.63,1.77,.655,.38,.913,-2.19,n.steel,.023),s(d,.58,.54,.035,.38,1.496,-1.846,n.steel,.012),s(d,.58,1.08,.035,.38,.672,-1.846,n.steel,.012),s(d,.587,.015,.046,.38,1.213,-1.841,n.black),s(d,.4,.018,.024,.39,1.237,-1.816,n.chrome,.006),s(d,.4,.018,.024,.39,1.183,-1.816,n.chrome,.006),s(d,.63,.41,.64,.38,2.115,-2.21,n.oak),s(d,.009,.38,.015,.38,2.11,-1.882,n.taupe),s(d,.64,.025,.68,.38,1.882,-2.2,n.oak),c(.38,-2.2,.71,.7);let g=l(0,0);e.remove(g),t.add(g),s(g,2.05,.91,.027,1.685,1.329,-2.532,n.marble),s(g,2.08,.51,.36,1.685,2.043,-2.375,n.oak);for(let T of[.99,1.34,1.69,2.04,2.39])s(g,.007,.48,.014,T,2.043,-2.187,n.taupe);s(g,.69,.073,.45,1.205,1.757,-2.32,n.black,.009),s(g,.65,.019,.4,1.205,1.713,-2.304,n.steel);for(let T of[.966,1.446])o(g,.028,.028,.007,T,1.701,-2.175,n.glow);for(let T=0;T<7;T++)s(g,.38,.002,.007,1.205,1.7,-2.41+T*.034,n.taupe);s(d,.585,.607,.052,1.195,.456,-1.866,n.black,.013),s(d,.49,.343,.017,1.195,.396,-1.83,n.glass,.012),s(d,.43,.005,.01,1.195,.281,-1.817,n.chrome),s(d,.43,.005,.01,1.195,.322,-1.817,n.chrome),s(d,.435,.031,.054,1.195,.635,-1.809,n.chrome,.012);for(let T of[1.01,1.195,1.38]){let D=o(d,.026,.026,.014,T,.733,-1.826,n.chrome);D.rotation.x=Math.PI/2,s(d,.002,.013,.004,T,.745,-1.816,n.black)}s(d,.63,.021,.48,1.195,.884,-2.188,n.black,.018);for(let[T,D,B]of[[1.025,-2.31,.065],[1.38,-2.31,.056],[1.025,-2.085,.08],[1.38,-2.085,.061]]){o(d,B+.009,B+.009,.013,T,.9,D,n.chrome),o(d,B,B,.026,T,.917,D,n.black),s(d,.023,.022,.21,T,.936,D,n.black),s(d,.21,.022,.021,T,.937,D,n.black);for(let G of[-1,1])s(d,.027,.048,.025,T+G*.093,.924,D,n.black)}for(let T of[1.078,1.153,1.228,1.303])o(d,.02,.023,.022,T,.907,-1.995,n.steel);s(d,.46,.286,.335,1.9,1.013,-2.205,n.black,.018),s(d,.33,.202,.018,1.865,1.016,-2.029,n.glass,.008),s(d,.011,.177,.025,2.044,1.012,-2.018,n.chrome,.003);for(let T of[.956,1.074]){let D=o(d,.024,.024,.012,2.08,T,-2.02,n.chrome);D.rotation.x=Math.PI/2}o(d,.065,.08,.19,2.315,.978,-2.21,n.black),o(d,.08,.08,.013,2.315,.879,-2.21,n.black),o(d,.064,.064,.014,2.315,1.083,-2.21,n.steel),r(d,2.315,1.1,-2.21,.018,.015,.018,n.black),a(d,[[2.375,1.065,-2.21],[2.428,1.065,-2.21],[2.44,.934,-2.21],[2.382,.928,-2.21]],.012,n.black),a(d,[[2.258,1.055,-2.21],[2.24,1.018,-2.21],[2.255,.984,-2.21]],.02,n.black),s(g,.19,.105,.018,1.932,1.395,-2.506,n.steel,.003);for(let T of[1.88,1.979])s(g,.036,.034,.024,T,1.395,-2.488,n.black,.005),s(g,.007,.016,.004,T,1.431,-2.489,n.black);a(d,[[1.88,1.382,-2.474],[1.81,1.225,-2.46],[1.925,1.163,-2.36],[2.04,1.07,-2.32]],.006,n.black),a(d,[[1.978,1.382,-2.474],[2.085,1.242,-2.46],[2.2,1.16,-2.39],[2.318,.893,-2.3]],.006,n.black),s(d,.47,.012,.45,2.548,.881,-1.53,n.steel,.035),s(d,.376,.013,.34,2.548,.888,-1.53,n.black,.055),s(d,.332,.014,.29,2.548,.89,-1.53,n.steel,.046),o(d,.031,.031,.003,2.548,.899,-1.53,n.chrome),a(d,[[2.55,.889,-1.855],[2.55,1.14,-1.855],[2.55,1.19,-1.77],[2.55,1.11,-1.655]],.012,n.chrome),o(d,.033,.035,.015,2.55,.899,-1.855,n.chrome),a(d,[[2.604,.908,-1.849],[2.622,.949,-1.849],[2.631,.997,-1.849]],.008,n.chrome),s(d,.34,.052,.2,2.55,.925,-1.126,n.white,.03);for(let T=0;T<6;T++)s(d,.011,.013,.17,2.412+T*.05,.958,-1.126,n.ceramic);for(let T=0;T<3;T++){let D=o(d,.071,.071,.012,2.462+T*.048,1.01,-1.118,n.ceramic);D.rotation.z=Math.PI/2}s(d,.81,.007,.34,1.24,.009,-1.653,n.black,.018),s(d,.37,.007,.56,2.081,.009,-1.368,n.black,.018);for(let T of[-1.806,-1.5])s(d,.75,.003,.005,1.24,.014,T,n.gold);for(let T of[.869,1.611])s(d,.005,.003,.302,T,.014,-1.653,n.gold);s(g,.88,.95,.03,2.453,1.853,-2.516,n.glass);for(let T of[2.013,2.893])s(g,.034,1,.045,T,1.853,-2.491,n.black);for(let T of[1.355,2.351])s(g,.91,.032,.045,2.453,T,-2.491,n.black);s(g,.034,.97,.047,2.453,1.853,-2.487,n.black);let _=l(.58,-3.31);s(_,.64,.86,.62,0,.445,0,n.steel,.025),s(_,.603,.168,.027,0,.773,.32,n.black,.013),s(_,.164,.067,.018,-.19,.775,.343,n.steel,.006),s(_,.126,.01,.007,-.19,.786,.355,n.chrome);let p=o(_,.064,.064,.018,.011,.774,.343,n.chrome);p.rotation.x=Math.PI/2,s(_,.097,.043,.009,.208,.79,.342,n.screen,.005);for(let T=0;T<4;T++)r(_,.15+T*.025,.733,.35,.005,.005,.003,n.chrome);u(_,.214,.027,0,.4,.324,n.chrome),u(_,.184,.011,0,.4,.342,n.black),r(_,0,.4,.324,.182,.182,.021,n.glass),r(_,0,.395,.311,.164,.164,.014,n.black),a(_,[[-.126,.52,.349],[-.162,.428,.353],[-.122,.299,.349]],.009,n.steel),s(_,.043,.085,.02,.191,.438,.352,n.chrome,.008);let m=o(_,.055,.055,.007,.2,.12,.322,n.steel);m.rotation.x=Math.PI/2,u(_,.055,.002,.2,.12,.328,n.black),s(_,.61,.024,.037,0,.035,.303,n.taupe),c(.58,-3.31,.69,.69),a(_,[[0,.888,-.1],[0,1.16,-.15],[0,1.17,-.28]],.013,n.chrome),s(_,.075,.025,.035,0,1.18,-.287,n.blue,.005);let E=l(1.62,-3.61);for(let T of[-.35,.35])a(E,[[T,.05,.13],[T,1.12,.055],[T,1.17,-.06],[T,.03,-.1]],.009,n.chrome);for(let T=0;T<5;T++)a(E,[[-.35,.39+T*.15,.049],[.35,.39+T*.15,.049]],.007,n.chrome);c(1.62,-3.61,.76,.25);let C=l(0,0);s(C,.85,.035,2.32,6.827,.026,-1.3,n.marble,.012),s(C,.024,.017,2.34,6.406,.052,-1.3,n.chrome);let v=s(C,.013,2.1,2.22,6.408,1.104,-1.3,n.glass);v.castShadow=!1,s(C,.045,.045,2.3,6.408,2.163,-1.3,n.chrome,.006);for(let T of[-2.436,-.165])s(C,.032,2.13,.034,6.408,1.103,T,n.chrome);s(C,.018,2.064,.02,6.418,1.099,-1.415,n.chrome),a(C,[[6.377,.905,-1.493],[6.349,.93,-1.493],[6.349,1.215,-1.493],[6.377,1.24,-1.493]],.012,n.chrome),a(C,[[6.387,.817,-2.218],[6.375,.817,-1.7]],.011,n.chrome),c(6.827,-1.3,.91,2.43),a(C,[[7.193,.83,-1.861],[7.193,2.005,-1.861]],.012,n.chrome);for(let T of[.88,1.938]){let D=o(C,.029,.029,.048,7.217,T,-1.861,n.chrome);D.rotation.z=Math.PI/2}a(C,[[7.184,1.745,-1.86],[7.106,1.973,-1.858]],.018,n.chrome);let b=o(C,.049,.049,.017,7.084,1.985,-1.858,n.chrome);b.rotation.z=.75,a(C,[[7.18,1.755,-1.86],[7.07,1.175,-1.862],[7.075,.564,-1.783],[7.184,.751,-1.706]],.008,n.chrome);let S=o(C,.055,.055,.045,7.208,.775,-1.712,n.chrome);S.rotation.z=Math.PI/2,a(C,[[7.18,.788,-1.716],[7.15,.828,-1.716],[7.149,.88,-1.716]],.009,n.chrome);for(let T of[1.125,1.435])s(C,.22,.012,.28,7.12,T,-2.265,n.glass,.016),a(C,[[7.016,T+.024,-2.401],[7.016,T+.024,-2.13]],.006,n.chrome);a(C,[[7.205,1.899,-.814],[7.16,1.899,-.814],[7.16,1.899,-.283],[7.205,1.899,-.283]],.014,n.chrome),a(C,[[7.205,1.812,-.814],[7.16,1.812,-.814],[7.16,1.812,-.283],[7.205,1.812,-.283]],.01,n.chrome),s(C,.09,.003,.09,7.032,.049,-2.22,n.steel);for(let T=0;T<4;T++)s(C,.003,.003,.073,7.007+T*.017,.052,-2.22,n.black);let A=l(5.65,-.42);s(A,.357,.456,.178,0,.536,0,n.ceramic,.047),s(A,.374,.037,.188,0,.778,0,n.white,.024),o(A,.033,.033,.008,0,.8,-.005,n.chrome),r(A,0,.37,-.205,.218,.17,.276,n.ceramic),s(A,.244,.296,.22,0,.186,-.16,n.ceramic,.072),r(A,0,.504,-.212,.222,.025,.272,n.white),r(A,0,.515,-.226,.149,.006,.192,n.ceramic),c(5.65,-.56,.49,.7);let x=l(6.122,-.307);for(let T of[-.135,.135])for(let D of[-.105,.105])s(x,.023,1.3,.023,T,.65,D,n.white);for(let T of[.08,.445,.806,1.177])s(x,.29,.024,.242,0,T,0,n.white);for(let T of[.26,.624,.986])a(x,[[-.123,T-.157,-.11],[.123,T+.157,-.11]],.009,n.white),a(x,[[.123,T-.157,-.11],[-.123,T+.157,-.11]],.009,n.white);s(x,.245,.095,.195,0,1.237,0,n.linen,.025),s(x,.235,.075,.19,0,1.316,0,n.linen,.025),o(x,.033,.033,.075,-.035,.859,.006,n.white),o(x,.012,.012,.002,-.035,.898,.006,n.taupe),c(6.122,-.307,.33,.28),s(C,.49,.009,.84,6.056,.011,-1.74,n.linen,.045);for(let[T,D]of[[5.92,-2.02],[6.13,-1.86],[5.92,-1.69],[6.13,-1.51]]){let B=o(C,.103,.103,.002,T,.018,D,n.black);B.scale.z=.73}let M=l(4.3,-2.337);s(M,.89,.395,.37,0,.615,0,n.oak),s(M,.846,.154,.026,0,.665,.192,n.taupe),s(M,.48,.118,.05,-.175,.7,.209,n.oak),s(M,.846,.15,.04,0,.502,.201,n.oak),s(M,.011,.368,.041,.217,.607,.216,n.taupe),s(M,.872,.01,.022,0,.8,.222,n.gold),s(M,.94,.031,.403,0,.828,.005,n.black,.012),s(M,.91,.06,.025,0,.874,-.181,n.black),r(M,-.103,.846,.019,.2,.014,.124,n.steel),r(M,-.103,.852,.019,.169,.011,.099,n.black),o(M,.029,.03,.006,-.103,.862,.028,n.chrome),a(M,[[-.106,.848,-.117],[-.106,1.015,-.117],[-.106,1.039,-.047],[-.106,1.012,-.019]],.012,n.chrome),s(M,.038,.013,.028,-.106,1.04,-.12,n.chrome,.005),c(4.3,-2.337,.96,.43);let I=l(4.3,-2.337);e.remove(I),t.add(I),s(I,.95,.57,.057,0,1.71,-.158,n.steel,.005),s(I,.92,.54,.013,0,1.712,-.122,n.glass),s(I,.94,.106,.092,0,1.372,-.137,n.oak),s(I,.016,.52,.018,-.449,1.712,-.113,n.glow),s(I,.016,.52,.018,.449,1.712,-.113,n.glow);for(let T of[-.229,.231])s(I,.006,.533,.024,T,1.712,-.113,n.taupe);o(M,.043,.038,.105,.265,.899,.021,f),o(M,.028,.028,.004,.265,.954,.021,n.black),o(M,.079,.072,.285,.298,.151,.056,f),o(M,.081,.081,.018,.298,.303,.056,f),s(M,.073,.024,.028,.298,.035,.14,n.steel,.007),o(M,.011,.011,.007,.298,.316,.056,n.black),o(M,.045,.037,.063,.383,.879,-.069,n.black);for(let[T,D,B]of[[-.022,.053,-.013],[.018,.086,-.008],[-.004,.123,.003],[.032,.078,.018]]){a(M,[[.383,.915,-.069],[.383+T,1+D,-.069+B]],.003,n.taupe);let G=r(M,.383+T,1+D,-.069+B,.012,.039,.006,h);G.rotation.z=T*18}s(e,.72,.007,.41,4.3,.011,-1.91,n.linen,.047);for(let[T,D]of[[4.05,-2],[4.3,-1.8],[4.54,-2]]){let B=o(e,.102,.102,.003,T,.017,D,n.black);B.scale.z=.68}}function qd(i,e){return i=Nn(i),_o.some(t=>i>t.x+.055&&i<t.x+t.w-.055&&e>t.z+.055&&e<t.z+t.d-.055)||i>.07&&i<3.63&&e>-2.53&&e<6.33||i>3.55&&i<5.04&&e>.55&&e<1.43||i>4.75&&i<5.1&&e>-1.88&&e<-.92||i>3.01&&i<3.63&&e>-2.76&&e<-2.44}function Yd(i,e){return i=Nn(i),i>=4.9?e<0?"bathroom":"bedroom":i>=3.7?"hall":e<-2.6?"utility":e<0?"kitchen":e<1.8?"dining":"living"}var $_={slug:"kileleshwa-elegant",listing:{id:Hl.id,title:Hl.title,area:"Kileleshwa",city:"Nairobi",country:"Kenya",lat:-1.28535,lng:36.77497,tzOffsetHours:3,guests:2,bedrooms:1,bathrooms:1,tagline:"An elegant stay. A closer look.",description:Hl.description},theme:{accent:"#b8975a",accentInk:"#1a1a14",night:"#172c27",paper:"#f7f1e7",collection:"THE KILELESHWA COLLECTION"},rooms:kd,photoUrl:i=>"/tours/kileleshwa-elegant/photos/"+i+".jpg",plan:{bounds:Mh,rooms:zd.map(i=>({id:i.id,x:i.x,z:i.z,w:i.w,d:i.d,label:i.id.toUpperCase(),hall:i.id==="hall"}))},views:Vd,start:"living",inside:qd,roomAt:Yd,build(){let i=Gd();return Wd(i),Xd(i),Hd(i),{root:i.root,contents:i.contents,walls:i.walls,ceilings:i.ceilings,lowWalls:i.lowWalls,materials:i.m,collisions:i.collisions}},lights:{lamps:[[1.85,2.38,4.5,16],[1.8,2.5,1,11],[1.6,2.4,-1.3,13],[6.8,2.5,2,13],[5.8,2.5,-1.2,10],[4.25,2.5,-.6,8],[1.8,2.4,-3.3,6]].map(([i,e,t,n])=>({position:[Nn(i),e,t],intensity:n})),background:"#d7dbd5",exposure:.96,ambient:.46,hemi:1.05},mirror:{shape:"circle",size:[.53,.53],position:[Nn(3.585),1.76,1.89],rotationY:Math.PI/2,scaleY:1.2,tint:13358023},accuracyNote:"Scratch adapter for engine benchmarking."},Zd=document.getElementById("root");Zd.innerHTML="";var Wl=document.createElement("div");Wl.style.cssText="position:absolute;inset:0";Zd.appendChild(Wl);var nr=window,vo=[];nr.__log=vo;nr.__host=Wl;nr.__tour=Od(Wl,$_,{onLoad:(i,e)=>vo.push(["load",i,e]),onReady:()=>{nr.__ready=!0;let i=document.createElement("button");i.setAttribute("data-tour-enter",""),i.textContent="enter",i.style.cssText="position:fixed;left:-9999px",document.body.appendChild(i)},onPose:()=>{},onRoom:i=>vo.push(["room",i]),onMode:()=>{},onTour:()=>{},onLight:()=>{},onQuality:i=>{nr.__quality=i},onHint:i=>vo.push(["hint",i]),onError:i=>{nr.__error=i,vo.push(["error",i])}});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
