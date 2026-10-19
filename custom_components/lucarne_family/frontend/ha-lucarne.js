var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),s=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},c=(n,r,o)=>(o=n==null?{}:e(i(n)),s(r||!n||!n.__esModule||!a.call(n,`default`)?t(o,`default`,{value:n,enumerable:!0}):o,n)),l=`ha-lucarne`,u=`lucarne_error_`,d=6e4,f=5,p=50,m=null,h=!1,g=!1,_=/* @__PURE__ */ new Map,v=[],y=null,b=null;function x(e,t){e&&(m=e),t&&(h=!0),S()}function S(){if(!h||!m||v.length===0)return;let e=v;v=[];for(let{error:t,context:n}of e)D(t,n)}function C(e){if(e instanceof Error){var t;let n=((t=(e.stack??``).split(`
`)[1])==null?void 0:t.trim())??``;return`${e.name}: ${e.message} @ ${n}`}return String(e)}function w(e,t){return!!(t&&t.includes(l)||e instanceof Error&&(e.stack??``).includes(l))}function T(e){return e instanceof Error?(e.stack??`${e.name}: ${e.message}`).split(`
`).slice(0,6).join(`
`):String(e)}function ee(e){let t=5381;for(let n=0;n<e.length;n++)t=(t<<5)+t+e.charCodeAt(n)|0;return(t>>>0).toString(36)}function te(){return typeof performance<`u`&&typeof performance.now==`function`?performance.now():Date.now()}function E(e,t){try{if(console.error(`[lucarne] card error in ${t}:`,e),!h||!m){v.push({error:e,context:t}),v.length>f&&v.shift();return}D(e,t)}catch{}}function D(e,t){try{if(!m)return;let n=C(e),r=te(),i=_.get(n);if(i!==void 0&&r-i<d||_.size>=p&&(O(r),_.size>=p))return;_.set(n,r),m.callService(`persistent_notification`,`create`,{notification_id:u+ee(n),title:`Lucarne card error (${t})`,message:["```",T(e),"```"].join(`
`)}).catch(()=>{})}catch{}}function O(e){for(let[t,n]of _)e-n>=d&&_.delete(t)}function k(){g||typeof window<`u`&&typeof window.addEventListener==`function`&&(g=!0,y=e=>{w(e.error,e.filename)&&E(e.error??Error(e.message),`window.onerror`)},b=e=>{w(e.reason)&&E(e.reason,`unhandledrejection`)},window.addEventListener(`error`,y),window.addEventListener(`unhandledrejection`,b))}function A(e){try{if(typeof window>`u`)return;let t=window,n=t.__lucarneBoot??(t.__lucarneBoot={});(n.marks??(n.marks=[])).push(e)}catch{}}k(),A(`reporter-installed`);var j=globalThis,ne=j.ShadowRoot&&(j.ShadyCSS===void 0||j.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,re=Symbol(),ie=/* @__PURE__ */ new WeakMap,M=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==re)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(ne&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=ie.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&ie.set(t,e))}return e}toString(){return this.cssText}},N=e=>new M(typeof e==`string`?e:e+``,void 0,re),P=(e,...t)=>new M(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,re),ae=(e,t)=>{if(ne)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),r=j.litNonce;r!==void 0&&t.setAttribute(`nonce`,r),t.textContent=n.cssText,e.appendChild(t)}},oe=ne?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return N(t)})(e):e,se,{is:ce,defineProperty:le,getOwnPropertyDescriptor:ue,getOwnPropertyNames:de,getOwnPropertySymbols:fe,getPrototypeOf:pe}=Object,me=globalThis,he=me.trustedTypes,ge=he?he.emptyScript:``,_e=me.reactiveElementPolyfillSupport,ve=(e,t)=>e,ye={toAttribute(e,t){switch(t){case Boolean:e=e?ge:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},be=(e,t)=>!ce(e,t),xe={attribute:!0,type:String,converter:ye,reflect:!1,useDefault:!1,hasChanged:be};(se=Symbol).metadata??(se.metadata=Symbol(`metadata`)),me.litPropertyMetadata??(me.litPropertyMetadata=/* @__PURE__ */ new WeakMap);var Se=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=xe){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&le(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=ue(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r==null?void 0:r.call(this);i==null||i.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??xe}static _$Ei(){if(this.hasOwnProperty(ve(`elementProperties`)))return;let e=pe(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(ve(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ve(`properties`))){let e=this.properties,t=[...de(e),...fe(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=/* @__PURE__ */ new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(oe(e))}else e!==void 0&&t.push(oe(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=/* @__PURE__ */ new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(e=>e(this))}addController(e){var t;(this._$EO??(this._$EO=/* @__PURE__ */ new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){let e=/* @__PURE__ */ new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ae(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(e=>{var t;return(t=e.hostConnected)==null?void 0:t.call(e)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(e=>{var t;return(t=e.hostDisconnected)==null?void 0:t.call(e)})}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){var i;let a=(((i=n.converter)==null?void 0:i.toAttribute)===void 0?ye:n.converter).toAttribute(t,n.type);this._$Em=e,a==null?this.removeAttribute(r):this.setAttribute(r,a),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){var i,a;let e=n.getPropertyOptions(r),o=typeof e.converter==`function`?{fromAttribute:e.converter}:((i=e.converter)==null?void 0:i.fromAttribute)===void 0?ye:e.converter;this._$Em=r;let s=o.fromAttribute(t,e.type);this[r]=s??((a=this._$Ej)==null?void 0:a.get(r))??s,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){var a;let o=this.constructor;if(!1===r&&(i=this[e]),n??(n=o.getPropertyOptions(e)),!((n.hasChanged??be)(i,t)||n.useDefault&&n.reflect&&i===((a=this._$Ej)==null?void 0:a.get(e))&&!this.hasAttribute(o._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??(this._$Ej=/* @__PURE__ */ new Map)).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??(this._$Eq=/* @__PURE__ */ new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{var n;e=this.shouldUpdate(t),e?(this.willUpdate(t),(n=this._$EO)==null||n.forEach(e=>{var t;return(t=e.hostUpdate)==null?void 0:t.call(e)}),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(e=>{var t;return(t=e.hostUpdated)==null?void 0:t.call(e)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=/* @__PURE__ */ new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(e=>this._$ET(e,this[e]))),this._$EM()}updated(e){}firstUpdated(e){}};Se.elementStyles=[],Se.shadowRootOptions={mode:`open`},Se[ve(`elementProperties`)]=/* @__PURE__ */ new Map,Se[ve(`finalized`)]=/* @__PURE__ */ new Map,_e==null||_e({ReactiveElement:Se}),(me.reactiveElementVersions??(me.reactiveElementVersions=[])).push(`2.1.2`);var Ce=globalThis,we=e=>e,Te=Ce.trustedTypes,Ee=Te?Te.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,De=`$lit$`,Oe=`lit$${Math.random().toFixed(9).slice(2)}$`,ke=`?`+Oe,Ae=`<${ke}>`,je=document,Me=()=>je.createComment(``),Ne=e=>e===null||typeof e!=`object`&&typeof e!=`function`,Pe=Array.isArray,Fe=e=>Pe(e)||typeof(e==null?void 0:e[Symbol.iterator])==`function`,Ie=`[ 	
\f\r]`,Le=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Re=/-->/g,ze=/>/g,Be=RegExp(`>|${Ie}(?:([^\\s"'>=/]+)(${Ie}*=${Ie}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),Ve=/'/g,F=/"/g,He=/^(?:script|style|textarea|title)$/i,Ue=e=>(t,...n)=>({_$litType$:e,strings:t,values:n}),I=Ue(1),We=Ue(2),Ge=Symbol.for(`lit-noChange`),L=Symbol.for(`lit-nothing`),Ke=/* @__PURE__ */ new WeakMap,qe=je.createTreeWalker(je,129);function R(e,t){if(!Pe(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return Ee===void 0?t:Ee.createHTML(t)}var z=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=Le;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===Le?c[1]===`!--`?o=Re:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=Be):(He.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=Be):o=ze:o===Be?c[0]===`>`?(o=i??Le,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?Be:c[3]===`"`?F:Ve):o===F||o===Ve?o=Be:o===Re||o===ze?o=Le:(o=Be,i=void 0);let d=o===Be&&e[t+1].startsWith(`/>`)?` `:``;a+=o===Le?n+Ae:l>=0?(r.push(s),n.slice(0,l)+De+n.slice(l)+Oe+d):n+Oe+(l===-2?t:d)}return[R(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},Je=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=z(t,n);if(this.el=e.createElement(l,r),qe.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=qe.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(De)){let t=u[o++],n=i.getAttribute(e).split(Oe),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?B:r[1]===`?`?$e:r[1]===`@`?et:Qe}),i.removeAttribute(e)}else e.startsWith(Oe)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(He.test(i.tagName)){let e=i.textContent.split(Oe),t=e.length-1;if(t>0){i.textContent=Te?Te.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],Me()),qe.nextNode(),c.push({type:2,index:++a});i.append(e[t],Me())}}}else if(i.nodeType===8){if(i.data===ke)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(Oe,e+1))!==-1;)c.push({type:7,index:a}),e+=Oe.length-1}}a++}}static createElement(e,t){let n=je.createElement(`template`);return n.innerHTML=e,n}};function Ye(e,t,n=e,r){var i,a;if(t===Ge)return t;let o=r===void 0?n._$Cl:(i=n._$Co)==null?void 0:i[r],s=Ne(t)?void 0:t._$litDirective$;return(o==null?void 0:o.constructor)!==s&&(o==null||(a=o._$AO)==null||a.call(o,!1),s===void 0?o=void 0:(o=new s(e),o._$AT(e,n,r)),r===void 0?n._$Cl=o:(n._$Co??(n._$Co=[]))[r]=o),o!==void 0&&(t=Ye(e,o._$AS(e,t.values),o,r)),t}var Xe=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=((e==null?void 0:e.creationScope)??je).importNode(t,!0);qe.currentNode=r;let i=qe.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new Ze(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new tt(i,this,e)),this._$AV.push(t),s=n[++o]}a!==(s==null?void 0:s.index)&&(i=qe.nextNode(),a++)}return qe.currentNode=je,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},Ze=class e{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=L,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=(r==null?void 0:r.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Ye(this,e,t),Ne(e)?e===L||e==null||e===``?(this._$AH!==L&&this._$AR(),this._$AH=L):e!==this._$AH&&e!==Ge&&this._(e):e._$litType$===void 0?e.nodeType===void 0?Fe(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==L&&Ne(this._$AH)?this._$AA.nextSibling.data=e:this.T(je.createTextNode(e)),this._$AH=e}$(e){var t;let{values:n,_$litType$:r}=e,i=typeof r==`number`?this._$AC(e):(r.el===void 0&&(r.el=Je.createElement(R(r.h,r.h[0]),this.options)),r);if(((t=this._$AH)==null?void 0:t._$AD)===i)this._$AH.p(n);else{let e=new Xe(i,this),t=e.u(this.options);e.p(n),this.T(t),this._$AH=e}}_$AC(e){let t=Ke.get(e.strings);return t===void 0&&Ke.set(e.strings,t=new Je(e)),t}k(t){Pe(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(Me()),this.O(Me()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){var n;for((n=this._$AP)==null||n.call(this,!1,!0,t);e!==this._$AB;){let t=we(e).nextSibling;we(e).remove(),e=t}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}},Qe=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=L,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(/* @__PURE__ */ new String),this.strings=n):this._$AH=L}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=Ye(this,e,t,0),a=!Ne(e)||e!==this._$AH&&e!==Ge,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=Ye(this,r[n+o],t,o),s===Ge&&(s=this._$AH[o]),a||(a=!Ne(s)||s!==this._$AH[o]),s===L?e=L:e!==L&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===L?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},B=class extends Qe{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===L?void 0:e}},$e=class extends Qe{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==L)}},et=class extends Qe{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=Ye(this,e,t,0)??L)===Ge)return;let n=this._$AH,r=e===L&&n!==L||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==L&&(n===L||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t;typeof this._$AH==`function`?this._$AH.call(((t=this.options)==null?void 0:t.host)??this.element,e):this._$AH.handleEvent(e)}},tt=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){Ye(this,e)}},nt=Ce.litHtmlPolyfillSupport;nt==null||nt(Je,Ze),(Ce.litHtmlVersions??(Ce.litHtmlVersions=[])).push(`3.3.3`);var rt=(e,t,n)=>{let r=(n==null?void 0:n.renderBefore)??t,i=r._$litPart$;if(i===void 0){let e=(n==null?void 0:n.renderBefore)??null;r._$litPart$=i=new Ze(t.insertBefore(Me(),e),e,void 0,n??{})}return i._$AI(e),i},it,at=globalThis,V=class extends Se{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e;let t=super.createRenderRoot();return(e=this.renderOptions).renderBefore??(e.renderBefore=t.firstChild),t}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=rt(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return Ge}};V._$litElement$=!0,V.finalized=!0,(it=at.litElementHydrateSupport)==null||it.call(at,{LitElement:V});var ot=at.litElementPolyfillSupport;ot==null||ot({LitElement:V}),(at.litElementVersions??(at.litElementVersions=[])).push(`4.2.2`);var H=e=>(t,n)=>{n===void 0?customElements.define(e,t):n.addInitializer(()=>{customElements.define(e,t)})},st={attribute:!0,type:String,converter:ye,reflect:!1,hasChanged:be},ct=(e=st,t,n)=>{let{kind:r,metadata:i}=n,a=globalThis.litPropertyMetadata.get(i);if(a===void 0&&globalThis.litPropertyMetadata.set(i,a=/* @__PURE__ */ new Map),r===`setter`&&((e=Object.create(e)).wrapped=!0),a.set(n.name,e),r===`accessor`){let{name:r}=n;return{set(n){let i=t.get.call(this);t.set.call(this,n),this.requestUpdate(r,i,e,!0,n)},init(t){return t!==void 0&&this.C(r,void 0,e,t),t}}}if(r===`setter`){let{name:r}=n;return function(n){let i=this[r];t.call(this,n),this.requestUpdate(r,i,e,!0,n)}}throw Error(`Unsupported decorator location: `+r)};function U(e){return(t,n)=>typeof n==`object`?ct(e,t,n):((e,t,n)=>{let r=t.hasOwnProperty(n);return t.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(t,n):void 0})(e,t,n)}function W(e){return U({...e,state:!0,attribute:!1})}var lt=(e,t,n)=>(n.configurable=!0,n.enumerable=!0,Reflect.decorate&&typeof t!=`object`&&Object.defineProperty(e,t,n),n);function ut(e,t){return(n,r,i)=>{let a=t=>{var n;return((n=t.renderRoot)==null?void 0:n.querySelector(e))??null};if(t){let{get:e,set:t}=typeof r==`object`?n:i??(()=>{let e=Symbol();return{get(){return this[e]},set(t){this[e]=t}}})();return lt(n,r,{get(){let n=e.call(this);return n===void 0&&(n=a(this),(n!==null||this.hasUpdated)&&t.call(this,n)),n}})}return lt(n,r,{get(){return a(this)}})}}var G=P`
  :host {
    --lucarne-spacing-xs: 4px;
    --lucarne-spacing-sm: 8px;
    --lucarne-spacing-md: 12px;
    --lucarne-spacing-lg: 16px;
    --lucarne-spacing-xl: 24px;
    --lucarne-spacing-xxl: 32px;

    --lucarne-radius-sm: 4px;
    --lucarne-radius-md: 8px;
    --lucarne-radius-lg: 16px;

    --lucarne-fs-sm: clamp(0.75rem, 0.5vw + 0.5rem, 0.875rem);
    --lucarne-fs-md: clamp(0.875rem, 0.75vw + 0.6rem, 1rem);
    --lucarne-fs-lg: clamp(1rem, 1vw + 0.75rem, 1.25rem);
    --lucarne-fs-xl: clamp(1.25rem, 1.5vw + 0.875rem, 1.75rem);

    --lucarne-shadow-card: 0 1px 4px rgba(0, 0, 0, 0.08);

    --lucarne-color-family: #a8d8b9;
    --lucarne-color-anton: #a8c5e8;
    --lucarne-color-ingrid: #c8b4e0;
    --lucarne-color-holidays: #d4cfc4;
    --lucarne-color-birthdays: #f0dca0;
    --lucarne-color-les-lilas: #b8b4e8;

    --lucarne-success-bg: #e8f5e9;
    --lucarne-success-fg: #2e7d32;

    --lucarne-surface: var(--ha-card-background, var(--card-background-color, #fff));
    --lucarne-on-surface: var(--primary-text-color, #212121);
    --lucarne-on-surface-muted: var(--secondary-text-color, #727272);

    --lucarne-skeleton-base: rgba(0, 0, 0, 0.06);
    --lucarne-skeleton-highlight: rgba(0, 0, 0, 0.12);
    --lucarne-pan-easing: cubic-bezier(0.32, 0.72, 0, 1);
    --lucarne-pan-duration: 240ms;

    /* Shared OUTER height for the Today + Calendar cards so their ha-card boxes
       line up side by side regardless of differing header/chrome heights. Applied
       to each card's ha-card under fill_viewport; the inner scroll region flexes to fill. The ~114px
       offset is the dashboard chrome above the card plus the gap below it. */
    --lucarne-card-fill-height: calc(100vh - 114px);
  }

  @supports (height: 100dvh) {
    :host {
      --lucarne-card-fill-height: calc(100dvh - 114px);
    }
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --lucarne-skeleton-base: rgba(255, 255, 255, 0.08);
      --lucarne-skeleton-highlight: rgba(255, 255, 255, 0.16);
    }
  }
`;function K(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a}var dt=class extends Error{constructor(e){super(e),this.name=`LucarneConfigError`}},ft=class e extends V{setConfig(e){x(void 0,e==null?void 0:e.debug);let t=(e==null?void 0:e.fill_viewport)===!0;this.toggleAttribute(`fill-viewport`,t),this._configFailure=void 0;try{this.applyConfig(e)}catch(e){if(e instanceof dt)throw e;E(e,`${this.tagName.toLowerCase()}.setConfig`),this._configFailure=e instanceof Error?e.message:String(e)}}render(){var t;let n=this;if(x(n.hass,(t=n._config)==null?void 0:t.debug),this._configFailure!==void 0)return e._notice(`This card could not read its configuration: ${this._configFailure}`);try{return this.renderContent()}catch(t){return E(t,this.tagName.toLowerCase()),e._notice(`This card hit an error and will recover on the next update.`)}}static _notice(e){return I`
      <ha-card>
        <div style="padding:16px;color:var(--secondary-text-color);font-size:14px">
          ${e}
        </div>
      </ha-card>
    `}};K([W()],ft.prototype,`_configFailure`,void 0);var pt=`unavailable`;function mt(e,t,n,r={}){let i,a=!1;if(t.length===0)return()=>{};let o=new Set(t),s=!1,c=0,l=e=>{if(a)return;let t=s?`change`:`snapshot`;s=!0;for(let[r,i]of Object.entries(e.a??{}))o.has(r)&&i.s!==void 0&&n(r,i.s,t);for(let[t,i]of Object.entries(e.c??{})){var r;let e=(r=i[`+`])==null?void 0:r.s;o.has(t)&&e!==void 0&&n(t,e,`change`)}for(let t of e.r??[])o.has(t)&&n(t,pt,`change`)},u=()=>{let n=++c;e.connection.subscribeMessage(l,{type:`subscribe_entities`,entity_ids:t},{resubscribe:!1}).then(e=>{a||n!==c?e():i=e}).catch(e=>{var o;n===c&&(i=void 0,!a&&(console.warn(`[lucarne] subscribe_entities failed for`,t,e),(o=r.onError)==null||o.call(r,e)))})},d=()=>{a||(i=void 0,u())};return e.connection.addEventListener(`ready`,d),u(),()=>{a=!0,e.connection.removeEventListener(`ready`,d),i==null||i(),i=void 0}}function ht(e,t,n){return mt(e,[t],(e,t,r)=>n(t,r))}function gt(e){return typeof e==`string`?e:e&&typeof e==`object`?e.dateTime??e.date??``:``}function _t(e){let t={start:gt(e.start),end:gt(e.end),summary:e.summary??``};return e.description&&(t.description=e.description),e.location&&(t.location=e.location),e.uid&&(t.uid=e.uid),e.recurrence_id&&(t.recurrence_id=e.recurrence_id),e.rrule&&(t.rrule=e.rrule),t}async function vt(e,t,n,r){let i=/* @__PURE__ */ new Set,a=encodeURIComponent(n.toISOString()),o=encodeURIComponent(r.toISOString()),s=await Promise.all(t.map(t=>e.callApi(`GET`,`calendars/${encodeURIComponent(t)}?start=${a}&end=${o}`).then(e=>[t,e.map(_t)]).catch(e=>(console.warn(`[lucarne] GET /api/calendars/${t} failed:`,e),i.add(t),[t,[]]))));return{events:new Map(s),failed:i}}async function yt(e,t,n,r,i){await e.connection.sendMessagePromise({type:`calendar/event/delete`,entity_id:t,uid:n,recurrence_id:r,recurrence_range:i})}var bt=2;function xt(e,t){var n;let r=(n=e.states[t])==null||(n=n.attributes)==null?void 0:n.supported_features;return typeof r==`number`&&(r&bt)!==0}async function St(e,t){try{var n;let r=await e.connection.sendMessagePromise({type:`call_service`,domain:`todo`,service:`get_items`,service_data:{},target:{entity_id:t},return_response:!0});return(r==null||(n=r.response)==null||(n=n[t])==null?void 0:n.items)??[]}catch(e){return console.warn(`[lucarne] todo.get_items failed for ${t}:`,e),[]}}function Ct(e,t,n){let r=!1,i=()=>{St(e,t).then(e=>{r||n(e)})};i();let a=ht(e,t,(e,t)=>{t!==`snapshot`&&i()});return()=>{r=!0,a()}}function wt(e,t){let n=parseInt(e.split(`:`)[0],10),r=parseInt(t.split(`:`)[0],10),i=[];for(let e=n;e<=r;e++)i.push(e);return i}function Tt(e,t,n){let[r,i]=t.split(`:`).map(Number),[a,o]=n.split(`:`).map(Number),s=new Date(e);s.setHours(r,i,0,0);let c=new Date(e);return c.setHours(a,o,0,0),{bandStartMs:s.getTime(),bandEndMs:c.getTime()}}function Et(e,t,n,r){let i=Dt(e.start).getTime(),a=Dt(e.end).getTime(),{bandStartMs:o,bandEndMs:s}=Tt(t,n,r),c=Math.max(i,o),l=Math.min(a,s);return c>=l?null:{start:new Date(c),end:new Date(l)}}function Dt(e){return e.length===10&&!e.includes(`T`)?/* @__PURE__ */ new Date(`${e}T00:00:00`):new Date(e)}function Ot(e){let t=e.split(`:`);if(t.length!==2)return null;let[n,r]=t.map(Number);return!Number.isFinite(n)||!Number.isFinite(r)||n<0||n>23||r<0||r>59?null:n*60+r}function kt(e,t,n){let r=e=>Ot(e)??1/0,i=e.getHours()*60+e.getMinutes();return i>=r(n)?`night`:i>=r(t)?`afternoon`:`morning`}function At(e,t){let n=1/0;for(let r of t){let t=Ot(r);if(t===null)continue;let i=new Date(e.getFullYear(),e.getMonth(),e.getDate(),Math.floor(t/60),t%60,0,0);i.getTime()<=e.getTime()&&i.setDate(i.getDate()+1),n=Math.min(n,i.getTime()-e.getTime())}return n}function jt(e,t){let n=Ot(t)??0,r=new Date(e.getFullYear(),e.getMonth(),e.getDate(),Math.floor(n/60),n%60,0,0);return r.getTime()>e.getTime()&&r.setDate(r.getDate()-1),r}var Mt=6e4;function Nt(e,t,n){if(!e)return!1;let r=new Date(e).getTime();return Number.isNaN(r)||t.getTime()-r<Mt?!1:r<jt(t,n).getTime()}function Pt(e){return e.start.length===10&&!e.start.includes(`T`)}function q(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function Ft(e){return e.uid??`${e.start}|${e.end}|${e.summary??``}`}function It(e){if(e.length===0)return[];let t=e.map((e,t)=>({...e,_idx:t}));t.sort((e,t)=>e.start.getTime()-t.start.getTime());let n=[],r=Array(e.length);for(let e of t){let t=e.start.getTime(),i=n.findIndex(e=>e<=t);i===-1?(i=n.length,n.push(e.end.getTime())):n[i]=e.end.getTime(),r[e._idx]=i}let i=Array(e.length),a=[],o=0,s=t[0].end.getTime();i[t[0]._idx]=0,a.push(r[t[0]._idx]);for(let e=1;e<t.length;e++){let n=t[e];n.start.getTime()>=s?(o++,a.push(0),s=n.end.getTime()):s=Math.max(s,n.end.getTime()),i[n._idx]=o,a[o]=Math.max(a[o],r[n._idx])}return r.map((e,t)=>({lane:e,laneCount:a[i[t]]+1}))}function Lt(e,t){let[n,r]=t.split(`:`).map(Number),i=new Date(e);return i.setHours(n,r,0,0),i.getTime()}function Rt(e,t,n,r){let i=/* @__PURE__ */ new Map;for(let e of t)i.set(q(e),{allDay:[],inBand:[],earlier:[],later:[]});let a=t.length>0?t[0]:null,o=t.length>0?t[t.length-1]:null;for(let s of e){if(Pt(s)){let e=/* @__PURE__ */ new Date(s.start+`T00:00:00`),n=/* @__PURE__ */ new Date(s.end+`T00:00:00`),r=a!==null&&e<a,c=o?new Date(o):null;c&&c.setDate(c.getDate()+1);let l=c!==null&&n>c;for(let c of t){let t=q(c),u=i.get(t);if(c>=e&&c<n&&(u.allDay.push(s),r||l)){u.allDayClipped||(u.allDayClipped=/* @__PURE__ */ new Map);let e=a!==null&&q(c)===q(a),t=o!==null&&q(c)===q(o);u.allDayClipped.set(Ft(s),{left:r&&e,right:l&&t})}}continue}let e=new Date(s.start),c=new Date(s.end);for(let a of t){let t=q(a),o=i.get(t),l=new Date(a);l.setHours(0,0,0,0);let u=new Date(a);if(u.setHours(23,59,59,999),c<=l||e>u)continue;let d=Lt(a,n),f=Lt(a,r);if(c.getTime()<=d)o.earlier.push(s);else if(e.getTime()>=f)o.later.push(s);else{let e=Et(s,a,n,r);if(e){let t=f-d,n=(e.start.getTime()-d)/t*100,r=(e.end.getTime()-e.start.getTime())/t*100;o.inBand.push({event:s,lane:0,laneCount:1,topPercent:Math.max(0,Math.min(100,n)),heightPercent:Math.max(0,Math.min(100-n,r))})}}}}for(let e of t){let t=q(e),a=i.get(t);if(a.inBand.length===0)continue;let o=Lt(e,n),s=Lt(e,r)-o,c=It(a.inBand.map(e=>{let t=o+e.topPercent/100*s,n=t+e.heightPercent/100*s;return{event:e.event,start:new Date(t),end:new Date(n),lane:0}}));a.inBand=a.inBand.map((e,t)=>({...e,lane:c[t].lane,laneCount:c[t].laneCount}))}return{days:t,perDay:i}}var zt=/* @__PURE__ */ new Map,Bt=0;function Vt(e,t,n,r){let i=q(r);for(let[e,t]of zt)t.day!==i&&zt.delete(e);let a=`${e}#${t}#${n?`refill`:`burn`}`,o=zt.get(a);if(o)return o;let s={entityId:e,day:i,order:[],admitted:/* @__PURE__ */ new Set,completed:/* @__PURE__ */ new Map,lastOrder:[],away:!1};return zt.set(a,s),s}function Ht(e,t){e.admitted.has(t)||(e.admitted.add(t),e.order.push(t))}function Ut(e,t,n,r=!1){e.completed.has(t)||e.completed.set(t,{index:n,sunk:r,seq:++Bt})}function Wt(e,t){e.completed.delete(t)}function Gt(e){for(let t of zt.values())if(e===void 0||t.entityId===e){for(let e of t.completed.values())e.sunk=!0;t.away=!0}}function Kt(e){for(let t of zt.values())(e===void 0||t.entityId===e)&&(t.away=!1)}function qt(e){let t=e;for(;t;){if(t instanceof Element){let e=t.tagName.toLowerCase();if(e===`hui-dialog-edit-card`||e===`ha-dialog`)return!0}let e=t.parentNode;if(e){t=e;continue}let n=t.getRootNode();t=n instanceof ShadowRoot?n.host:null}return!1}function Jt(e){let t=e.parentElement;for(;t&&!t.style.getPropertyValue(`--column-size`);)t=t.parentElement;return(t==null?void 0:t.parentElement)??null}function Yt(e){if(!qt(e))return null;let t=Jt(e);if(!t)return null;let n=t.style.getPropertyValue(`--grid-column-count`),r=()=>{t.style.getPropertyValue(`--grid-column-count`)!==`1`&&t.style.setProperty(`--grid-column-count`,`1`)};r();let i=new MutationObserver(r);return i.observe(t,{attributes:!0,attributeFilter:[`style`]}),{uninstall(){i.disconnect(),n?t.style.setProperty(`--grid-column-count`,n):t.style.removeProperty(`--grid-column-count`)}}}var Xt=`todo.lucarne_household`,Zt={slug:`household`,name:`Household`,color:`var(--primary-color)`,avatar:null,todo_entity_id:Xt,streak_counter_id:``},Qt=2e4,$t=3e5;function en(e,t,n){return e.map(e=>{let r=n.get(e.uid)??{item_uid:e.uid,member_slug:t,assignee_slug:``,type:`chore`,recurrence:``,icon:``,source:`manual`,time_of_day:`anytime`};return{uid:e.uid,summary:e.summary,status:e.status,due:e.due??null,description:e.description??``,completed:e.completed,metadata:r}})}function tn(e,t,n){let r=(n==null?void 0:n.rewards)===!0||(n==null?void 0:n.rewardsHistory)!==void 0,i=!1,a=null,o=0,s=/* @__PURE__ */ new Map,c=[],l=/* @__PURE__ */ new Map,u=/* @__PURE__ */ new Map,d=``,f=``,p=null,m=``,h=[],g=/* @__PURE__ */ new Map,_=null,v=null,y=null,b=!1,x=null;function S(){if(i)return;let e=/* @__PURE__ */ new Map;for(let t of c){let n=l.get(t.todo_entity_id)??[];e.set(t.slug,en(n,t.slug,s))}let n=l.get(Xt)??[];e.set(`household`,en(n,`household`,s)),t({members:c,tasksByMember:e,streakByMember:new Map(u),taskMetadataByUid:new Map(s),resetTime:d,streakCheckTime:f,integrationError:x,rewards:a,rewardsFetchedAt:o})}function C(){return y?(b=!0,y):(y=(async()=>{try{do b=!1,await w();while(b&&!i)}finally{y=null}})(),y)}async function w(){try{let l=Date.now(),p={type:`lucarne_family/get_rewards`};(n==null?void 0:n.rewardsHistory)!==void 0&&(p.history_limit=n.rewardsHistory,p.include_archived=!0);let[m,h]=await Promise.allSettled([e.connection.sendMessagePromise({type:`lucarne_family/get_family`}),r?e.connection.sendMessagePromise(p):Promise.resolve(null)]);if(i)return;if(m.status===`rejected`)throw m.reason;let g=m.value;if(r){let e=h.status===`fulfilled`&&h.value;a=e?h.value:null,o=e?l:0}let _=/* @__PURE__ */ new Map;for(let e of g.task_metadata??[]){let t=[],n=e.rotation_owners;if(typeof n==`string`&&n!==``)try{let e=JSON.parse(n);Array.isArray(e)&&(t=e.map(String))}catch{}else Array.isArray(n)&&(t=n.map(String));_.set(e.item_uid,{...e,rotation_owners:t,points:Number(e.points??0)})}s=_,d=g.reset_time??``,f=g.streak_check_time??``,c=(g.members??[]).filter(e=>e.todo_entity_id?!0:(console.debug(`[lucarne] skipping member ${e.slug}: no todo_entity_id yet`),!1)),x=null;let v=new Set(c.map(e=>e.slug));for(let e of[...u.keys()])v.has(e)||u.delete(e);for(let n of c){var t;if(!n.streak_counter_id||u.has(n.slug))continue;let r=(t=e.states)==null||(t=t[n.streak_counter_id])==null?void 0:t.state;if(r!==void 0){let e=parseInt(r,10);u.set(n.slug,isNaN(e)?0:e)}}let y=[...c.map(e=>e.todo_entity_id),Xt];if(ee(y,new Map(c.filter(e=>e.streak_counter_id).map(e=>[e.streak_counter_id,e.slug]))),await Promise.all(y.map(e=>D(e))),i)return;S()}catch(e){console.debug(`[lucarne] get_family failed — integration may not be installed:`,e),i||(x=e instanceof Error?e:Error(String(e)),T(),c=[],s=/* @__PURE__ */ new Map,u=/* @__PURE__ */ new Map,l.clear(),d=``,f=``,a=null,S())}}function T(){p==null||p(),p=null,m=``,h=[],g=/* @__PURE__ */ new Map}function ee(t,n){h=t,g=n;for(let e of[...l.keys()])t.includes(e)||l.delete(e);for(let e of[...E.keys()])t.includes(e)||E.delete(e);let r=[...t,...n.keys()],i=[...r].sort().join(`|`);i===m&&p||(m=i,p==null||p(),p=mt(e,r,te,{onError:()=>{m=``}}))}function te(e,t,n){if(i)return;let r=g.get(e);if(r!==void 0){let e=parseInt(t,10);u.set(r,isNaN(e)?0:e),S();return}h.includes(e)&&n!==`snapshot`&&D(e).then(S)}let E=/* @__PURE__ */ new Map;async function D(t){let n=(E.get(t)??0)+1;E.set(t,n);let r=await St(e,t);i||E.get(t)===n&&h.includes(t)&&l.set(t,r)}function O(){_===null&&(_=setTimeout(()=>{_=null,C()},1e3))}function k(){v=setTimeout(()=>{v=null,(typeof document<`u`&&document.visibilityState===`hidden`?Promise.resolve():C()).finally(()=>{i||k()})},x===null?Qt:$t)}let A=()=>{i||(typeof document>`u`||document.visibilityState!==`hidden`)&&C()};typeof document<`u`&&document.addEventListener(`visibilitychange`,A),typeof window<`u`&&window.addEventListener(`pageshow`,A);let j=[];return e.connection.subscribeMessage(()=>{O()},{type:`lucarne_family/subscribe`}).then(e=>{i?e():j.push(e)}).catch(e=>{console.debug(`[lucarne] could not subscribe to family updates:`,e)}),C().finally(()=>{i||k()}),()=>{i=!0,_!==null&&clearTimeout(_),v!==null&&clearTimeout(v),typeof document<`u`&&document.removeEventListener(`visibilitychange`,A),typeof window<`u`&&window.removeEventListener(`pageshow`,A),T(),j.forEach(e=>e())}}var nn=[`MO`,`TU`,`WE`,`TH`,`FR`,`SA`,`SU`],rn=/^DTSTART:(\d{4})(\d{2})(\d{2})\nRRULE:(.+)$/;function an(e){if(!e||e.trim()===``)return{mode:`none`};let t=e.trim().match(rn);if(!t)return sn(e,e.trim());let[,n,r,i,a]=t,o=`${n}-${r}-${i}`,s=sn(e,a);return s.mode===`unknown`||s.mode===`none`||!on(o)?{mode:`unknown`,raw:e}:{...s,start:o}}function on(e){let[t,n,r]=e.split(`-`).map(Number),i=new Date(Date.UTC(t,n-1,r));return i.getUTCFullYear()===t&&i.getUTCMonth()===n-1&&i.getUTCDate()===r}function sn(e,t){let n=t.split(`;`),r={};for(let t of n){let n=t.indexOf(`=`);if(n===-1)return{mode:`unknown`,raw:e};r[t.slice(0,n)]=t.slice(n+1)}let i=r.FREQ,a;if(r.INTERVAL!==void 0){if(!/^[1-9]\d*$/.test(r.INTERVAL))return{mode:`unknown`,raw:e};a=parseInt(r.INTERVAL,10)}let o=r.BYDAY,s=r.BYMONTHDAY,c=r.BYMONTH;function l(...e){let t=new Set(e);return Object.keys(r).every(e=>t.has(e))}if(i===`DAILY`&&!o&&!s&&!c)return l(`FREQ`,`INTERVAL`)?{mode:`daily`,...a?{interval:a}:{}}:{mode:`unknown`,raw:e};if(i===`WEEKLY`&&o&&!s&&!c){if(!l(`FREQ`,`BYDAY`,`INTERVAL`))return{mode:`unknown`,raw:e};let t=o.split(`,`);return t.every(e=>nn.includes(e))?{mode:`weekly`,days:t,...a?{interval:a}:{}}:{mode:`unknown`,raw:e}}if(i===`MONTHLY`&&s&&!o&&!c)return!l(`FREQ`,`BYMONTHDAY`,`INTERVAL`)||!/^([1-9]|[12]\d|3[01])$/.test(s)?{mode:`unknown`,raw:e}:{mode:`monthly-date`,dayOfMonth:parseInt(s,10),...a?{interval:a}:{}};if(i===`MONTHLY`&&o&&!s&&!c){if(!l(`FREQ`,`BYDAY`,`INTERVAL`))return{mode:`unknown`,raw:e};let t=o.match(/^([+-]?\d+)([A-Z]{2})$/);if(!t)return{mode:`unknown`,raw:e};let n=parseInt(t[1],10);if(![1,2,3,4,-1].includes(n))return{mode:`unknown`,raw:e};let r=t[2];return nn.includes(r)?{mode:`monthly-nth`,nth:n,day:r,...a?{interval:a}:{}}:{mode:`unknown`,raw:e}}return i===`YEARLY`&&c&&s&&!o?!l(`FREQ`,`BYMONTH`,`BYMONTHDAY`,`INTERVAL`)||!/^([1-9]|1[0-2])$/.test(c)||!/^([1-9]|[12]\d|3[01])$/.test(s)?{mode:`unknown`,raw:e}:{mode:`yearly`,month:parseInt(c,10),dayOfMonth:parseInt(s,10),...a?{interval:a}:{}}:{mode:`unknown`,raw:e}}function cn(e){if(e.mode===`none`)return``;let t=ln(e);return e.start?`DTSTART:${e.start.replace(/-/g,``)}\nRRULE:${t}`:t}function ln(e){if(e.mode===`daily`){let t=`FREQ=DAILY`;return e.interval&&e.interval>1&&(t+=`;INTERVAL=${e.interval}`),t}if(e.mode===`weekly`){let t=`FREQ=WEEKLY;BYDAY=${e.days.join(`,`)}`;return e.interval&&e.interval>1&&(t+=`;INTERVAL=${e.interval}`),t}if(e.mode===`monthly-date`){let t=`FREQ=MONTHLY;BYMONTHDAY=${e.dayOfMonth}`;return e.interval&&e.interval>1&&(t+=`;INTERVAL=${e.interval}`),t}if(e.mode===`monthly-nth`){let t=`FREQ=MONTHLY;BYDAY=${`${e.nth}`}${e.day}`;return e.interval&&e.interval>1&&(t+=`;INTERVAL=${e.interval}`),t}if(e.mode===`yearly`){let t=`FREQ=YEARLY;BYMONTH=${e.month};BYMONTHDAY=${e.dayOfMonth}`;return e.interval&&e.interval>1&&(t+=`;INTERVAL=${e.interval}`),t}return``}var un=[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`];function dn(e){let t=an(e),n=fn(t);if(!(`start`in t)||!t.start)return n;let[r,i,a]=t.start.split(`-`).map(Number);return`${n}, starting ${un[i-1]} ${a}, ${r}`}function fn(e){if(e.mode===`none`)return`One-off (no repeat)`;if(e.mode===`unknown`)return`Custom recurrence (not editable here)`;let t=`interval`in e&&e.interval?e.interval:1;if(e.mode===`daily`)return t===1?`Daily`:`Every ${t} days`;if(e.mode===`weekly`){let n={MO:`Mon`,TU:`Tue`,WE:`Wed`,TH:`Thu`,FR:`Fri`,SA:`Sat`,SU:`Sun`},r=e.days.map(e=>n[e]).join(`, `);return t===1?`Weekly on ${r}`:`Every ${t} weeks on ${r}`}if(e.mode===`monthly-date`){let n=pn(e.dayOfMonth);return t===1?`Monthly on the ${e.dayOfMonth}${n}`:`Every ${t} months on the ${e.dayOfMonth}${n}`}if(e.mode===`monthly-nth`){let n=mn(e.nth),r={MO:`Monday`,TU:`Tuesday`,WE:`Wednesday`,TH:`Thursday`,FR:`Friday`,SA:`Saturday`,SU:`Sunday`};return t===1?`Monthly on the ${n} ${r[e.day]}`:`Every ${t} months on the ${n} ${r[e.day]}`}if(e.mode===`yearly`){let n=[``,`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`],r=pn(e.dayOfMonth);return t===1?`Yearly on ${n[e.month]} ${e.dayOfMonth}${r}`:`Every ${t} years on ${n[e.month]} ${e.dayOfMonth}${r}`}return``}function pn(e){if(e>=11&&e<=13)return`th`;switch(e%10){case 1:return`st`;case 2:return`nd`;case 3:return`rd`;default:return`th`}}function mn(e){return e===-1?`last`:e===1?`1st`:e===2?`2nd`:e===3?`3rd`:`${e}th`}function hn(e){return Math.floor(Date.UTC(e.getFullYear(),e.getMonth(),e.getDate())/864e5)}function gn(e){let[t,n,r]=e.split(`-`).map(Number);return Math.floor(Date.UTC(t,n-1,r)/864e5)}function _n(e,t,n){let r=e.getDate();if(e.getDay()!==n)return!1;if(t>0)return Math.floor((r-1)/7)===t-1;let i=new Date(e.getFullYear(),e.getMonth()+1,0).getDate();return Math.floor((i-r)/7)===0}var vn={SU:0,MO:1,TU:2,WE:3,TH:4,FR:5,SA:6};function yn(e,t=/* @__PURE__ */ new Date){if(e.mode===`none`||e.mode===`unknown`)return!1;let n=e.interval??1,r=e.start??`1970-01-01`,i=hn(t),a=gn(r);if(i<a)return!1;let[o,s]=r.split(`-`).map(Number),c=(t.getFullYear()-o)*12+t.getMonth()+1-s;if(e.mode===`daily`)return(i-a)%n===0;if(e.mode===`weekly`){let r=t.getDay();if(!e.days.some(e=>vn[e]===r))return!1;let o=a-((a+3)%7+7)%7;return Math.floor((i-o)/7)%n===0}if(e.mode===`monthly-date`)return t.getDate()===e.dayOfMonth&&c%n===0;if(e.mode===`monthly-nth`){let r=vn[e.day];return _n(t,e.nth,r)?c%n===0:!1}return e.mode===`yearly`?t.getMonth()+1!==e.month||t.getDate()!==e.dayOfMonth?!1:(t.getFullYear()-o)%n===0:!1}function bn(e){let t=e=>String(e).padStart(2,`0`);return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())}`}function xn(e,t=/* @__PURE__ */ new Date){if(e.mode===`none`||e.mode===`unknown`)return;let n=Math.min(2922*(e.interval??1),4e5),r=new Date(t.getFullYear(),t.getMonth(),t.getDate(),12);if(e.start&&e.start>bn(r)){let[t,n,i]=e.start.split(`-`).map(Number);r=new Date(t,n-1,i,12)}for(let t=0;t<=n;t++){if(yn(e,r))return bn(r);r.setDate(r.getDate()+1)}}var J={today:`Today`,tomorrow:`Tomorrow`,nothingOnCalendar:`Nothing on the calendar today`,allDone:`All done!`,allDoneForNow:`All done for now!`,addWeatherEntity:`Add a weather entity to show forecast`,dressingTipHeavyCoat:`Heavy coat + hat`,dressingTipCoatScarf:`Coat + scarf`,dressingTipLightJacket:`Light jacket`,dressingTipTShirt:`T-shirt`,dressingTipShorts:`Shorts weather`,dressingTipBoots:`Boots + heavy coat`,dressingTipUmbrella:` + umbrella`,dressingTipDefault:`Check the weather`,tasksTitle:`Tasks`,timePillNow:`now`,timePillInMinutes:e=>`in ${e}m`,timePillInHours:e=>`in ${e}h`,errorUnavailable:`—`,noRoutinesToday:`no routines today`,familyReady:(e,t)=>`${e}/${t} ready`},Sn;function Cn(e){return e.length===10?/* @__PURE__ */ new Date(e+`T00:00:00`):new Date(e)}function wn(e,t,n){let r=new Date(t);r.setHours(0,0,0,0);let i=new Date(r);return i.setDate(i.getDate()+n),e.filter(e=>Cn(e.end)>r&&Cn(e.start)<i).sort((e,t)=>Cn(e.start).getTime()-Cn(t.start).getTime())}function Tn(e,t){let n=new Date(t);n.setHours(0,0,0,0),n.setDate(n.getDate()+1);let r=[],i=[];for(let t of e)(Cn(t.start)<n?r:i).push(t);return{today:r,tomorrow:i}}function En(e,t,n){let r=e.getTime()-n.getTime();if(e<=n&&n<t)return J.timePillNow;if(r>0&&r<36e5){let e=Math.round(r/6e4);return J.timePillInMinutes(e)}if(r>0&&r<72e5){let e=Math.round(r/36e5);return J.timePillInHours(e)}return e.toLocaleTimeString(`en`,{hour:`2-digit`,minute:`2-digit`,hour12:!1})}function Dn(e){return e.start.length===10&&e.end.length===10}var On=(Sn=class extends V{constructor(...e){super(...e),this.events=[],this.calendarColors=/* @__PURE__ */ new Map,this.windowDays=1}render(){let e=/* @__PURE__ */ new Date,t=wn(this.events,e,this.windowDays);if(t.length===0)return I`<div class="empty-state">${J.nothingOnCalendar}</div>`;let{today:n,tomorrow:r}=Tn(t,e);return I`
      ${n.map(t=>this._renderEvent(t,e))}
      ${r.length>0?I`<div class="day-divider ${n.length===0?`leading`:``}" role="heading" aria-level="3">${J.tomorrow}</div>`:``}
      ${r.map(t=>this._renderEvent(t,e))}
    `}_renderEvent(e,t){let n=Cn(e.start),r=Cn(e.end),i=n<=t&&t<r,a=!Dn(e)&&r<=t,o=Dn(e)?`all day`:En(n,r,t),s=this._colorForEvent(e);return I`
      <div class="event-row ${a?`past`:``}">
        <div class="time-pill ${i?`now`:``}">
          ${i?I`<span class="pulse-dot"></span>`:``} ${o}
        </div>
        <div class="color-bar" style="background:${s}"></div>
        <div class="event-content">
          <div class="event-summary">${e.summary}</div>
          ${e.location?I`<div class="event-secondary">${e.location}</div>`:``}
        </div>
      </div>
    `}_colorForEvent(e){if(e.uid){let t=e.uid.split(`::`)[0],n=this.calendarColors.get(t);if(n)return n}return`var(--lucarne-color-family)`}},Sn.styles=[G,P`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
        container-type: inline-size;
        /* A long today-list scrolls within the section instead of stretching
           the card. The host card can tune the cap via --lucarne-agenda-max-height. */
        max-height: var(--lucarne-agenda-max-height, 360px);
        overflow-y: auto;
      }
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--lucarne-spacing-xl) 0;
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-md);
        text-align: center;
      }
      .event-row {
        display: flex;
        align-items: flex-start;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-sm) 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }
      .event-row:last-child {
        border-bottom: none;
      }
      /* Events that already ended earlier today stay listed but read as done. */
      .event-row.past {
        opacity: 0.45;
      }
      .event-row.past .event-summary {
        text-decoration: line-through;
      }
      .day-divider {
        padding: var(--lucarne-spacing-md) 0 var(--lucarne-spacing-xs);
        border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--lucarne-on-surface-muted);
      }
      /* Nothing on today: the divider leads the list, so there is nothing to rule
         off. A class, not :first-child — without adoptedStyleSheets Lit's <style>
         is the shadow root's first child (iPadOS 15). */
      .day-divider.leading {
        border-top: none;
        padding-top: 0;
      }
      .time-pill {
        flex-shrink: 0;
        min-width: 64px;
        padding: 3px 8px;
        border-radius: var(--lucarne-radius-md);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        text-align: center;
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .time-pill.now {
        background: rgba(76, 175, 80, 0.15);
        color: #2e7d32;
      }
      .pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #4caf50;
        animation: pulse 1.4s ease-in-out infinite;
        flex-shrink: 0;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.85); }
      }
      .color-bar {
        flex-shrink: 0;
        width: 4px;
        min-height: 36px;
        border-radius: var(--lucarne-radius-sm);
        align-self: stretch;
      }
      .event-content {
        flex: 1;
        min-width: 0;
      }
      .event-summary {
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        color: var(--lucarne-on-surface);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .event-secondary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @container (min-width: 600px) {
        :host {
          display: flex;
          flex-direction: column;
        }
      }
    `],Sn);K([U({type:Array})],On.prototype,`events`,void 0),K([U({type:Object})],On.prototype,`calendarColors`,void 0),K([U({type:Number})],On.prototype,`windowDays`,void 0),On=K([H(`lucarne-agenda-strip`)],On);var kn=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`,An=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
</svg>`,jn=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
  <line x1="8" y1="19" x2="8" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="19" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="16" y1="19" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`,Mn=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
  <line x1="8" y1="21" x2="8" y2="19"/>
  <line x1="8" y1="19" x2="10" y2="17"/>
  <line x1="8" y1="19" x2="6" y2="17"/>
  <line x1="16" y1="21" x2="16" y2="19"/>
  <line x1="16" y1="19" x2="18" y2="17"/>
  <line x1="16" y1="19" x2="14" y2="17"/>
  <line x1="12" y1="22" x2="12" y2="20"/>
  <line x1="12" y1="20" x2="14" y2="18"/>
  <line x1="12" y1="20" x2="10" y2="18"/>
</svg>`,Nn=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2v2M4.22 4.22l1.42 1.42M2 12h2M4.22 19.78l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="10" cy="10" r="3" fill="currentColor"/>
  <path d="M20 15h-1.26A6 6 0 1 0 8 20h12a4 4 0 0 0 0-8z" fill="currentColor" opacity="0.7"/>
</svg>`;We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="7" r="4"/>
  <path d="M20 21a8 8 0 1 0-16 0"/>
</svg>`,We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"/>
</svg>`;var Pn=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>`,Fn=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M3,12H7A5,5 0 0,1 12,7A5,5 0 0,1 17,12H21A1,1 0 0,1 22,13A1,1 0 0,1 21,14H3A1,1 0 0,1 2,13A1,1 0 0,1 3,12M15,12A3,3 0 0,0 12,9A3,3 0 0,0 9,12H15M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M12.71,16.3L15.82,19.41C16.21,19.8 16.21,20.43 15.82,20.82C15.43,21.21 14.8,21.21 14.41,20.82L12,18.41L9.59,20.82C9.2,21.21 8.57,21.21 8.18,20.82C7.79,20.43 7.79,19.8 8.18,19.41L11.29,16.3C11.5,16.1 11.74,16 12,16C12.26,16 12.5,16.1 12.71,16.3Z"/>
</svg>`,In=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"/>
</svg>`,Ln=We`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z"/>
</svg>`,Rn={sunny:kn,"clear-night":kn,cloudy:An,fog:An,hail:jn,lightning:jn,"lightning-rainy":jn,partlycloudy:Nn,pouring:jn,rainy:jn,snowy:Mn,"snowy-rainy":Mn,windy:An,"windy-variant":An,exceptional:An};function zn(e){return Rn[e]??Rn[e.toLowerCase()]??An}var Bn={sunny:`#f4b740`,"clear-night":`#7a86c8`,cloudy:`#8aa0b8`,partlycloudy:`#9bb3cf`,rainy:`#5a8fc0`,pouring:`#4a7aa8`,snowy:`#a8c5e8`,"snowy-rainy":`#86a8d0`,fog:`#a8a8a8`,hail:`#7ac0d8`,lightning:`#c89c4a`,"lightning-rainy":`#a08358`,windy:`#7a8a95`,"windy-variant":`#7a8a95`,exceptional:`#c87060`};function Vn(e){return Bn[e.toLowerCase()]??`#8aa0b8`}function Hn(e){if(!e.length)return J.dressingTipDefault;let t=e[0];if(t.condition.toLowerCase().includes(`snow`))return J.dressingTipBoots;let n=t.temperature,r;return r=n<5?J.dressingTipHeavyCoat:n<12?J.dressingTipCoatScarf:n<18?J.dressingTipLightJacket:n<24?J.dressingTipTShirt:J.dressingTipShorts,(t.precipitation_probability??0)>50&&(r+=J.dressingTipUmbrella),r}var Un=class extends V{constructor(...e){super(...e),this.forecast=[]}render(){if(!this.weatherEntity)return I`<div class="empty-state">${J.addWeatherEntity}</div>`;let e=this.weatherEntity.attributes,t=e.temperature,n=e.temperature_unit??`°C`,r=this.weatherEntity.state,i=this.forecast[0],a=this.forecast[1],o=Hn(this.forecast);return I`
      <div class="current">
        <span class="condition-icon" style="color: ${Vn(r)}">${zn(r)}</span>
        <div class="temp-group">
          <div class="current-temp">${t===void 0?J.errorUnavailable:`${Math.round(t)}${n}`}</div>
          ${i?I`<div class="high-low">
                ↑${Math.round(i.temperature)}${n}
                ${i.templow===void 0?``:` ↓${Math.round(i.templow)}${n}`}
              </div>`:``}
        </div>
      </div>
      ${a?I`
            <div class="tomorrow-row">
              <span class="tomorrow-icon" style="color: ${Vn(a.condition)}">${zn(a.condition)}</span>
              <span>Tomorrow ↑${Math.round(a.temperature)}${n}${a.templow===void 0?``:` ↓${Math.round(a.templow)}${n}`}</span>
            </div>
          `:``}
      <div class="dressing-tip">
        <span class="dressing-label">Wear:</span>
        ${o}
      </div>
    `}},Wn=(Un.styles=[G,P`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
      }
      .empty-state {
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        padding: var(--lucarne-spacing-lg) 0;
        text-align: center;
      }
      .current {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-md);
        margin-bottom: var(--lucarne-spacing-md);
      }
      .condition-icon {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
      }
      .temp-group {
        flex: 1;
      }
      .current-temp {
        font-size: var(--lucarne-fs-xl);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        line-height: 1;
      }
      .high-low {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
      }
      .tomorrow-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-bottom: var(--lucarne-spacing-md);
        padding-bottom: var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .tomorrow-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .dressing-tip {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-xs);
      }
      .dressing-label {
        font-weight: 600;
        font-style: normal;
        color: var(--lucarne-on-surface-muted);
      }
    `],Un);K([U({attribute:!1})],Wn.prototype,`weatherEntity`,void 0),K([U({type:Array})],Wn.prototype,`forecast`,void 0),Wn=K([H(`lucarne-weather-block`)],Wn);function Gn(e,t){let n=/* @__PURE__ */ new Set,r=[];for(let i of e)t.has(i)&&!n.has(i)&&(n.add(i),r.push(i));return r}function Kn(e,t,n){let r=Gn(e,n);return r.length===0?null:r.includes(t)?r[(r.indexOf(t)+1)%r.length]:r[0]}var qn=/\[apple:[^\]]+\]/g;function Jn(e){return e?e.replace(qn,``).trim():``}var Yn=/(?:https?:\/\/|www\.)[^\s<>"']+/gi,Xn=/^(?:https?:\/\/[^\s/?#]|www\.[^\s.])/i,Zn=`.,;:!?`,Qn={")":`(`,"]":`[`,"}":`{`};function $n(e,t){let n=0;for(let r of e)r===t&&n++;return n}function er(e){let t=e.length;for(;t>0;){let n=e[t-1];if(Zn.includes(n)){t--;continue}let r=Qn[n];if(r){let i=e.slice(0,t-1);if($n(i,n)+1>$n(i,r)){t--;continue}}break}return e.slice(0,t)}function tr(e){let t=[],n=0;Yn.lastIndex=0;let r;for(;(r=Yn.exec(e))!==null;){let i=er(r[0]);if(!Xn.test(i)){Yn.lastIndex=r.index+r[0].length;continue}r.index>n&&t.push({text:e.slice(n,r.index),href:null}),t.push({text:i,href:i.toLowerCase().startsWith(`www.`)?`https://${i}`:i}),n=r.index+i.length,Yn.lastIndex=n}return n<e.length&&t.push({text:e.slice(n),href:null}),t}var nr,rr=`^(?=.*[\\p{Extended_Pictographic}\\p{Regional_Indicator}])[\\p{Extended_Pictographic}\\p{Emoji_Component}\\p{Emoji_Modifier}\\p{Regional_Indicator}‍️]+$`,ir=`^(?=.*[\\u{1F000}-\\u{1FAFF}\\u{2300}-\\u{27FF}\\u{2B00}-\\u{2BFF}\\u{1F1E0}-\\u{1F1FF}])[\\u{1F000}-\\u{1FAFF}\\u{2300}-\\u{27FF}\\u{2B00}-\\u{2BFF}\\u{1F1E0}-\\u{1F1FF}\\u{FE00}-\\u{FE0F}\\u{200D}\\u{20E3}\\u{1F3FB}-\\u{1F3FF}]+$`,ar=/(?!)/;function or(e=[rr,ir]){for(let t of e)try{return new RegExp(t,`u`)}catch{}return ar}var sr=or(),cr=(nr=class extends V{constructor(...e){super(...e),this.name=``,this.color=`#a8d8b9`,this.avatar=null}render(){let e=this.avatar;if(e&&e.startsWith(`/local/`))return I`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <img src="${e}" alt="${this.name}" />
        </div>
      `;if(e&&sr.test(e))return I`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <span class="emoji">${e}</span>
        </div>
      `;let t=this.name.trim().charAt(0)||`?`;return I`
      <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
        <span class="initial">${t}</span>
      </div>
    `}},nr.styles=P`
    :host {
      display: block;
    }
    .avatar {
      width: var(--lucarne-avatar-size, clamp(48px, 6vw, 72px));
      height: var(--lucarne-avatar-size, clamp(48px, 6vw, 72px));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .initial {
      font-size: var(--lucarne-avatar-font, clamp(1.25rem, 2.5vw, 2rem));
      font-weight: 700;
      color: rgba(0, 0, 0, 0.7);
      line-height: 1;
      text-transform: uppercase;
      font-family: var(--primary-font-family, sans-serif);
    }
    .emoji {
      font-size: var(--lucarne-avatar-font, clamp(1.5rem, 3vw, 2.25rem));
      line-height: 1;
    }
  `,nr);K([U()],cr.prototype,`name`,void 0),K([U()],cr.prototype,`color`,void 0),K([U()],cr.prototype,`avatar`,void 0),cr=K([H(`lucarne-member-avatar`)],cr);var lr,ur=500,dr=180;function fr(e){var t;let n=e.target;return!!(n!=null&&(t=n.closest)!=null&&t.call(n,`a`))}var pr=(lr=class extends V{constructor(...e){super(...e),this.memberColor=`#a8d8b9`,this.compact=!1,this.members=[],this.showNotes=!1,this.owner=null,this.notToday=!1,this._noteExpanded=!1,this._noteAnimating=!1,this._noteAnim=null,this._pressTimer=null,this._longPressed=!1,this._notePress=!1,this._nextDateKey=``}_onPointerDown(e){this._longPressed=!1,this._notePress=!1,this._pressTimer=setTimeout(()=>{this._longPressed=!0,this.dispatchEvent(new CustomEvent(`task-long-press`,{detail:{task:this.task},bubbles:!0,composed:!0}))},ur),e.currentTarget.setPointerCapture(e.pointerId)}_onPointerUp(){this._pressTimer!==null&&(clearTimeout(this._pressTimer),this._pressTimer=null)}_onPointerCancel(){this._notePress=!1,this._pressTimer!==null&&(clearTimeout(this._pressTimer),this._pressTimer=null)}willUpdate(e){if(e.has(`task`)){var t;let r=e.get(`task`);if(r&&r.uid!==((t=this.task)==null?void 0:t.uid)){var n;this._noteExpanded=!1,(n=this._noteAnim)==null||n.cancel(),this._noteAnim=null,this._noteAnimating=!1}}}_toggleNote(){let e=!this._noteExpanded;this._noteExpanded=e,this._noteAnimating=this._startNoteAnimation(e)}_startNoteAnimation(e){var t;let n=this.renderRoot.querySelector(`.note`),r=typeof window.matchMedia==`function`&&window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;if(!n||r||typeof n.animate!=`function`)return!1;(t=this._noteAnim)==null||t.cancel(),this._noteAnim=null;let i=this._measureNote(n,!1),a=this._measureNote(n,!0),o=e?i:a,s=e?a:i;if(o===s)return!1;let c=n.animate([{height:`${o}px`},{height:`${s}px`}],{duration:dr,easing:`cubic-bezier(0.32, 0.72, 0, 1)`,fill:`forwards`});return this._noteAnim=c,c.onfinish=()=>{this._noteAnim===c&&(this._noteAnim=null,this._noteAnimating=!1,this.updateComplete.then(()=>c.cancel()))},c.oncancel=()=>{this._noteAnim===c&&(this._noteAnim=null,this._noteAnimating=!1)},!0}_measureNote(e,t){let n=e.style.whiteSpace,r=e.style.height;e.style.whiteSpace=t?`normal`:`nowrap`,e.style.height=`auto`;let i=e.offsetHeight;return e.style.whiteSpace=n,e.style.height=r,i}_onClick(){if(!this._longPressed){if(this._notePress){this._notePress=!1;return}this.dispatchEvent(new CustomEvent(this.notToday?`task-edit`:`task-toggle`,{detail:{task:this.task},bubbles:!0,composed:!0}))}}render(){if(!this.task)return I``;let e=this.task.status===`completed`,t=this.task.metadata.icon,n=this.task.due,r=this.task.metadata.type===`rotating`,i=this.showNotes?Jn(this.task.description):``,a=null;if(r){let e=this.task.metadata.rotation_owners??[],t=this.task.metadata.current_owner??``;if(e.length>1){let n=Kn(e,t,new Set(this.members.filter(e=>e.slug!==`household`).map(e=>e.slug)));if(n){let e=this.members.find(e=>e.slug===n);a=(e==null?void 0:e.name)??n}}}let o=this.notToday?this._nextDate():void 0,s=this.task.metadata.points??0;return I`
      <div
        class="row"
        style="--member-color:${this.memberColor}"
        role=${this.notToday?`button`:`checkbox`}
        aria-checked=${this.notToday?L:e}
        aria-label=${this.notToday?`Edit ${this.task.summary}, not due today${o?`, next ${this._formatNext(o)}`:``}`:this._rowLabel(n,a)}
        aria-describedby=${i?`task-note`:L}
        tabindex="0"
        @click=${this._onClick}
        @keydown=${e=>{fr(e)||(e.key===`Enter`||e.key===` `)&&!e.repeat&&(e.preventDefault(),this._onClick())}}
        @pointerdown=${this._onPointerDown}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        ${this.owner?this._renderOwnerAvatar(this.owner):``}
        <div class="check ${e?`done`:``}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="rgba(0,0,0,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        ${t?I`<span class="icon" aria-hidden="true">${t}</span>`:``}
        <div class="middle">
          <span class="label ${e?`done`:``}">${this.task.summary}</span>
          ${a?I`<span class="rotation-next">next: ${a}</span>`:``}
          ${i?this._renderNote(i,e):``}
        </div>
        ${r?I`<span class="rotation-badge" aria-hidden="true">↻</span>`:``}
        ${n?I`<span class="due">${this._formatDue(n)}</span>`:``}
        ${s>0&&!this.notToday?I`<span class="points" aria-hidden="true">+${s}</span>`:``}
        ${o?I`<span class="due">${this._formatNext(o)}</span>`:``}
      </div>
    `}_nextDate(){let e=`${this.task.metadata.recurrence}|${bn(/* @__PURE__ */ new Date)}`;return e!==this._nextDateKey&&(this._nextDateKey=e,this._nextDateValue=xn(an(this.task.metadata.recurrence))),this._nextDateValue}_formatNext(e){let[t,n,r]=e.split(`-`).map(Number);return new Date(t,n-1,r).toLocaleDateString(void 0,{weekday:`short`,month:`short`,day:`numeric`})}_rowLabel(e,t){let n=this.task.summary;e&&(n+=`, due ${this._formatDue(e)}`),t&&(n+=`, next: ${t}`);let r=this.task.metadata.points??0;return r>0&&!this.notToday&&(n+=`, ${r} ${r===1?`point`:`points`}`),n}_renderOwnerAvatar(e){let t=e.avatar,n;return n=t&&t.startsWith(`/local/`)?I`<img src="${t}" alt="" draggable="false" />`:t&&sr.test(t)?I`<span>${t}</span>`:I`<span class="initial">${e.name.trim().charAt(0)||`?`}</span>`,I`
      <div
        class="owner-avatar"
        style="background:${e.color}"
        title="${e.name}"
        aria-hidden="true"
      >
        ${n}
      </div>
    `}_renderNote(e,t){return I`
      <div
        id="task-note"
        class="note ${t?`done`:``} ${this._noteExpanded?`expanded`:``} ${this._noteAnimating?`animating`:``}"
        @click=${e=>{e.stopPropagation(),this._notePress=!1,!fr(e)&&this._toggleNote()}}
        @pointerdown=${e=>{var t,n;e.stopPropagation(),!fr(e)&&(this._notePress=!0,(t=(n=e.currentTarget).setPointerCapture)==null||t.call(n,e.pointerId))}}
      >
        ${tr(e).map(e=>e.href?I`<a
                href=${e.href}
                target="_blank"
                rel="noopener noreferrer"
                >${e.text}</a
              >`:e.text)}
      </div>
    `}_formatDue(e){if(e.includes(`T`)){let t=new Date(e);return isNaN(t.getTime())?e:t.toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`})}if(e.length===10){let t=/* @__PURE__ */ new Date(e+`T00:00:00`);if(!isNaN(t.getTime()))return t.toLocaleDateString(`en`,{month:`short`,day:`numeric`})}return e}},lr.styles=P`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 4px;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.1s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    /* compact tightens visual spacing while preserving the 44px hit area —
       per a11y guidelines the interactive role="checkbox" must keep that
       minimum touch target. Density comes from the smaller circle + gap. */
    :host([compact]) .row {
      gap: 8px;
      padding: 4px 2px;
    }
    .row:hover,
    .row:active {
      background: rgba(0, 0, 0, 0.04);
    }
    /* The owner avatar lives INSIDE .row so .row's align-items:center keeps it on
       the check circle's centre line at any row height — a wrapped label growing
       the row, or a note line below it, can no longer drift the two apart. It
       used to be a sibling in tasks-summary, which had to model .row's geometry
       with a magic offset and got it wrong twice. */
    .owner-avatar {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-size: 13px;
      line-height: 1;
      color: rgba(0, 0, 0, 0.75);
    }
    .owner-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .owner-avatar .initial {
      font-weight: 700;
      text-transform: uppercase;
      font-family: var(--primary-font-family, sans-serif);
      font-size: 11px;
    }
    .check {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
    }
    :host([compact]) .check {
      width: 20px;
      height: 20px;
      border-width: 2px;
    }
    :host([compact]) .check svg {
      width: 12px;
      height: 12px;
    }
    .check.done {
      background: var(--member-color, #a8d8b9);
      border-color: var(--member-color, #a8d8b9);
    }
    .check svg {
      width: 14px;
      height: 14px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .check.done svg {
      opacity: 1;
    }
    .icon {
      font-size: 1.1rem;
      line-height: 1;
      flex-shrink: 0;
    }
    .middle {
      flex: 1;
      min-width: 0;
    }
    .label {
      font-size: clamp(0.95rem, 1.2vw, 1.05rem);
      color: var(--primary-text-color, #212121);
      font-family: var(--primary-font-family, sans-serif);
      transition: text-decoration 0.15s, color 0.15s;
      /* Wrap long task text instead of overflowing the column. The label is an
         inline span, so overflow/text-overflow never clipped it — nowrap just
         pushed the column wide and forced a horizontal scrollbar (issue #69).
         overflow-wrap: anywhere breaks single overlong words too. */
      overflow-wrap: anywhere;
    }
    .label.done {
      text-decoration: line-through;
      color: var(--secondary-text-color, #727272);
      opacity: 0.6;
    }
    :host([not-today]) .row {
      opacity: 0.55;
    }
    :host([not-today]) .check {
      visibility: hidden;
    }
    .due {
      font-size: 0.75rem;
      color: var(--secondary-text-color, #727272);
      flex-shrink: 0;
    }
    .points {
      font-size: 0.75rem;
      color: var(--secondary-text-color, #727272);
      flex-shrink: 0;
      min-width: 2em;
      text-align: right;
    }
    .rotation-badge {
      font-size: 0.9rem;
      opacity: 0.55;
      flex-shrink: 0;
    }
    .rotation-next {
      font-size: 0.7rem;
      color: var(--secondary-text-color, #727272);
      display: block;
    }
    /* The note lives inside .middle, alongside .label — so it starts where the
       summary starts, automatically, whatever leads the row (check circle,
       emoji icon, owner avatar) and at any density. It previously sat outside
       .row with a hard-coded left margin that reproduced the leading width; the
       moment the avatar moved into .row that constant was wrong. Being inside
       .row means it DOES bubble into the row's toggle and long-press handlers,
       so its pointer handlers stop propagation — see _renderNote. */
    .note {
      display: block;
      margin: 2px 0 0;
      /* .row sets user-select: none for the tap target; note text is content, so
         let it be selected and copied. */
      user-select: text;
      -webkit-user-select: text;
      font-size: 0.75rem;
      line-height: 1.35;
      color: var(--secondary-text-color, #727272);
      font-family: var(--primary-font-family, sans-serif);
      cursor: pointer;
      border-radius: 6px;
      -webkit-tap-highlight-color: transparent;
      /* Match .label so a single overlong word — a URL, typically — wraps
         instead of overflowing. On the base rule, not just the wrapped states,
         so measuring one shape never depends on the class of the other. */
      overflow-wrap: anywhere;
      /* Collapsed: one line, ellipsised. Deliberately NOT -webkit-line-clamp —
         plain text-overflow is unambiguously safe at the safari15/chrome85
         floor pinned in vite.config.ts. */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .note.expanded {
      white-space: normal;
      overflow: visible;
    }
    /* Held for the length of the expand/collapse animation, in BOTH directions:
       the note is laid out wrapped (its expanded shape) while an inline height
       animates between the one-line and full heights, and the overflow clip is
       what turns that into a reveal. Must come after .note.expanded — same
       specificity — so a collapsing note keeps clipping instead of spilling.
       See _startNoteAnimation. */
    .note.animating {
      white-space: normal;
      overflow: hidden;
      text-overflow: clip;
    }
    .note a {
      /* Same fallback as every other accent in the cards — HA's own default
         primary colour, overridden by the active theme. */
      color: var(--primary-color, #03a9f4);
      text-decoration: underline;
    }
    .note.done {
      opacity: 0.6;
    }
    :host([compact]) .note {
      font-size: 0.7rem;
    }
  `,lr);K([U({attribute:!1})],pr.prototype,`task`,void 0),K([U()],pr.prototype,`memberColor`,void 0),K([U({type:Boolean,reflect:!0})],pr.prototype,`compact`,void 0),K([U({attribute:!1})],pr.prototype,`members`,void 0),K([U({type:Boolean,attribute:`show-notes`})],pr.prototype,`showNotes`,void 0),K([U({attribute:!1})],pr.prototype,`owner`,void 0),K([U({type:Boolean,reflect:!0,attribute:`not-today`})],pr.prototype,`notToday`,void 0),K([W()],pr.prototype,`_noteExpanded`,void 0),K([W()],pr.prototype,`_noteAnimating`,void 0),pr=K([H(`lucarne-task-row`)],pr);var mr,hr=`household`;function gr(e){return e.length===10?/* @__PURE__ */ new Date(e+`T00:00:00`):new Date(e)}function _r(e,t){let n=new Date(t);n.setHours(0,0,0,0);let r=new Date(n);r.setDate(r.getDate()+1);let i=new Date(n);i.setDate(i.getDate()+4);let a=e=>{if(!e.due)return 3;let t=gr(e.due);return t<n?0:t<r?1:t<i?2:4};return[...e].sort((e,t)=>{let n=a(e),r=a(t);if(n!==r)return n-r;if(n===3)return e.summary.localeCompare(t.summary);let i=e.due?gr(e.due).getTime():0,o=t.due?gr(t.due).getTime():0;return i===o?e.summary.localeCompare(t.summary):i-o})}function vr(e){return{uid:e.uid,summary:e.summary,status:e.status,due:e.due??null,description:e.description??``,completed:e.completed,metadata:{item_uid:e.uid,member_slug:hr,assignee_slug:``,type:`chore`,recurrence:``,icon:``,source:`manual`}}}var yr=(mr=class extends V{constructor(...e){super(...e),this.items=[],this.integrationMode=!1,this.renderableTasks=[],this.members=[],this.limit=5,this.refillOnComplete=!1}_resolveVisible(e){let t=/* @__PURE__ */ new Date,n=_r(e.filter(e=>e.status===`needs_action`),t),r=n.length,i=Vt(this.todoEntityId??``,this.limit,this.refillOnComplete,t),a=typeof document<`u`&&document.visibilityState===`hidden`,o=a||i.away,s=new Map(e.map(e=>[e.uid,e])),c=new Set(n.map(e=>e.uid));for(let e of i.order){var l;if(c.has(e)){Wt(i,e);continue}if(((l=s.get(e))==null?void 0:l.status)===`completed`){let t=i.lastOrder.indexOf(e);Ut(i,e,t===-1?i.lastOrder.length:t,o)}}let u;if(this.refillOnComplete){u=n.slice(0,this.limit);for(let e of u)Ht(i,e.uid)}else{let e=i.order.filter(e=>!c.has(e)).length,t=Math.max(0,this.limit-e),r=t-n.filter(e=>i.admitted.has(e.uid)).length;for(let e of n){if(r<=0)break;i.admitted.has(e.uid)||(Ht(i,e.uid),r--)}u=n.filter(e=>i.admitted.has(e.uid)).slice(0,t)}let d=[...i.completed.entries()].filter(([e])=>s.has(e)),f=(e,t)=>t[1].seq-e[1].seq,p=[...u],m=d.filter(([,e])=>!e.sunk).sort(f).slice(0,this.limit).sort((e,t)=>e[1].index-t[1].index);for(let[e,t]of m)p.splice(Math.min(t.index,p.length),0,s.get(e));let h=Math.max(0,this.limit-m.length),g=d.filter(([,e])=>e.sunk).sort(f).slice(0,h).sort((e,t)=>e[1].seq-t[1].seq);for(let[e]of g)p.push(s.get(e));return e.length>0&&(i.lastOrder=p.map(e=>e.uid),a||(i.away=!1)),{rows:p,totalActive:r}}render(){let e=this.integrationMode?this.renderableTasks:this.items.map(vr),{rows:t,totalActive:n}=this._resolveVisible(e);return t.length===0?I`
        <div class="empty-state">
          <span class="empty-icon">${Pn}</span>
          ${n===0?J.allDone:J.allDoneForNow}
        </div>
      `:I`
      <div class="header">
        ${J.tasksTitle}
        <span class="count-badge">${n}</span>
      </div>
      ${n===0?I`
            <div class="empty-state done-banner">
              <span class="empty-icon">${Pn}</span>
              ${J.allDone}
            </div>
          `:``}
      <div class="task-list">${t.map(e=>this._renderTaskLine(e))}</div>
    `}_renderTaskLine(e){let t=this._ownerFor(e);return I`
      <div class="task-line">
        <lucarne-task-row
          compact
          show-notes
          .task=${e}
          .owner=${t}
          .memberColor=${(t==null?void 0:t.color)??`var(--primary-color)`}
        ></lucarne-task-row>
      </div>
    `}_ownerFor(e){if(!this.integrationMode)return null;let t=e.metadata.member_slug;return!t||t===hr?null:this.members.find(e=>e.slug===t)??null}},mr.styles=[G,P`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
      }
      .header {
        display: flex;
        align-items: baseline;
        gap: var(--lucarne-spacing-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .count-badge {
        background: var(--lucarne-color-ingrid);
        color: #5b3f7e;
        padding: 1px 7px;
        border-radius: var(--lucarne-radius-lg);
        font-size: 0.8em;
        font-weight: 700;
      }
      .task-list {
        display: flex;
        flex-direction: column;
        /* Up to "limit" ACTIVE rows are rendered (backlog beyond it is
           intentionally not shown), plus crossed-out completions — which reuse
           their own slot in no-refill mode, but are extra rows in refill mode,
           themselves capped at "limit". This is a safety cap: if the host card
           sets --lucarne-tasks-max-height and those rows exceed it, they scroll
           rather than overflow. Uncapped (none) by default. */
        max-height: var(--lucarne-tasks-max-height, none);
        overflow-y: auto;
      }
      .task-line {
        display: flex;
        align-items: center;
      }
      .task-line + .task-line {
        border-top: 1px solid rgba(0, 0, 0, 0.05);
      }
      .task-line lucarne-task-row {
        flex: 1;
        min-width: 0;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-lg) 0;
        color: #4caf50;
        font-size: var(--lucarne-fs-md);
      }
      .empty-icon {
        width: 28px;
        height: 28px;
        color: #4caf50;
      }
      /* Everything is done but the crossed-out rows are still on screen — keep
         the celebration without the full-height empty state. */
      .done-banner {
        flex-direction: row;
        padding: 0 0 var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-sm);
      }
      .done-banner .empty-icon {
        width: 18px;
        height: 18px;
      }
    `],mr);K([U({type:Array})],yr.prototype,`items`,void 0),K([U({type:String})],yr.prototype,`todoEntityId`,void 0),K([U({type:Boolean})],yr.prototype,`integrationMode`,void 0),K([U({attribute:!1})],yr.prototype,`renderableTasks`,void 0),K([U({attribute:!1})],yr.prototype,`members`,void 0),K([U({type:Number})],yr.prototype,`limit`,void 0),K([U({type:Boolean})],yr.prototype,`refillOnComplete`,void 0),yr=K([H(`lucarne-tasks-summary`)],yr);var br=class extends V{constructor(...e){super(...e),this.entries=[]}render(){return I`
      ${this.entries.map(e=>I`
          <span class="pill ${e.isHome?`home`:`away`}">
            <span class="dot"></span>
            ${e.name}
          </span>
        `)}
    `}},xr=(br.styles=[G,P`
      :host {
        display: flex;
        flex-wrap: wrap;
        gap: var(--lucarne-spacing-xs);
      }
      .pill {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px 3px 7px;
        border-radius: var(--lucarne-radius-lg);
        font-size: var(--lucarne-fs-sm);
        font-weight: 500;
        background: var(--lucarne-surface);
        border: 1.5px solid currentColor;
        transition: opacity 0.2s;
      }
      .pill.away {
        opacity: 0.45;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .pill.home .dot {
        background: #4caf50;
      }
      .pill.away .dot {
        background: #9e9e9e;
      }
      .pill.home {
        color: #2e7d32;
        border-color: #a5d6a7;
      }
      .pill.away {
        color: var(--lucarne-on-surface-muted);
        border-color: #e0e0e0;
      }
    `],br);K([U({type:Array})],xr.prototype,`entries`,void 0),xr=K([H(`lucarne-presence-pills`)],xr);var Sr=class extends V{constructor(...e){super(...e),this.members=[],this.tasksByMember=/* @__PURE__ */ new Map}_handleClick(){this.dispatchEvent(new CustomEvent(`family-ready-clicked`,{bubbles:!0,composed:!0}))}_computeReadiness(){let e=0,t=0,n=/* @__PURE__ */ new Date;for(let r of this.members){let i=(this.tasksByMember.get(r.slug)??[]).filter(e=>e.metadata.type===`routine`&&yn(an(e.metadata.recurrence),n));i.length!==0&&(e++,i.every(e=>e.status===`completed`)&&t++)}return{readyCount:t,totalWithRoutines:e}}render(){let{readyCount:e,totalWithRoutines:t}=this._computeReadiness();if(t===0)return I`
        <div class="pill none" @click=${this._handleClick}>
          <span class="icon">✓</span>
          ${J.noRoutinesToday}
        </div>
      `;let n=e===t;return I`
      <div class="pill ${n?`all-done`:``}" @click=${this._handleClick}>
        <span class="icon">${n?`🎉`:`⏳`}</span>
        ${J.familyReady(e,t)}
      </div>
    `}},Cr=(Sr.styles=[G,P`
      :host {
        display: inline-block;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: var(--lucarne-radius-lg);
        background: rgba(0, 0, 0, 0.07);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;
      }
      .pill:hover {
        background: rgba(0, 0, 0, 0.12);
      }
      .pill.all-done {
        background: var(--lucarne-success-bg);
        color: var(--lucarne-success-fg);
      }
      .pill.none {
        opacity: 0.5;
      }
      .icon {
        font-size: 1.1em;
      }
    `],Sr);K([U({attribute:!1})],Cr.prototype,`members`,void 0),K([U({attribute:!1})],Cr.prototype,`tasksByMember`,void 0),Cr=K([H(`lucarne-family-ready-pill`)],Cr);var wr,Tr=[`calendar`,`weather`,`tasks`];function Er(e){let t=/* @__PURE__ */ new Set,n=[];for(let r of e??[])Tr.includes(r)&&!t.has(r)&&(t.add(r),n.push(r));for(let e of Tr)t.has(e)||n.push(e);return n}window.customCards=window.customCards||[],window.customCards.push({type:`lucarne-today-card`,name:`Lucarne Today`,description:`Family agenda + weather + tasks + presence`,preview:!0}),A(`evaluating:lucarne-today-card`);var Dr=(wr=class extends ft{constructor(...e){super(...e),this._calendarEvents=/* @__PURE__ */ new Map,this._forecast=[],this._todoItems=[],this._familyState=null,this._optimistic=/* @__PURE__ */ new Map,this._fetchingForecast=!1,this._lastWeatherState=``,this._onVisibilityChange=()=>{typeof document<`u`&&document.visibilityState===`hidden`&&(Gt(this._tasksEntityId),this.requestUpdate())},this._applyOptimistic=e=>{let t=this._optimistic.get(e.uid);return t&&t!==e.status?{...e,status:t}:e}}applyConfig(e){if(!e.calendars||!Array.isArray(e.calendars)||e.calendars.length===0)throw new dt(`lucarne-today-card: "calendars" must be a non-empty array`);for(let t of e.calendars)if(!t||typeof t!=`object`||!t.entity||!t.color)throw new dt(`lucarne-today-card: each calendar entry requires "entity" and "color"`);this._config=e,this.isConnected&&(this._teardownSubscriptions(),this._setupSubscriptions())}static getConfigElement(){return document.createElement(`lucarne-today-card-editor`)}static getStubConfig(e){let t=Object.keys(e.states).filter(e=>e.startsWith(`calendar.`)).slice(0,3),n=[`#a8d8b9`,`#a8c5e8`,`#c8b4e0`],r=t.map((e,t)=>({entity:e,color:n[t]??`#a8d8b9`})),i=`weather.forecast_home`in e.states;return{type:`custom:lucarne-today-card`,title:J.today,calendars:r.length?r:[{entity:`calendar.example`,color:`#a8d8b9`}],weather:i?`weather.forecast_home`:void 0}}getCardSize(){return 4}getGridOptions(){return{columns:6,rows:`auto`,min_rows:3,min_columns:3,max_columns:6}}connectedCallback(){super.connectedCallback(),this._setupSubscriptions(),typeof document<`u`&&document.addEventListener(`visibilitychange`,this._onVisibilityChange),this._previewOverrideRaf=requestAnimationFrame(()=>{this._previewOverrideRaf=void 0,this.isConnected&&(this._previewOverride=Yt(this))})}disconnectedCallback(){var e;super.disconnectedCallback(),this._teardownSubscriptions(),typeof document<`u`&&document.removeEventListener(`visibilitychange`,this._onVisibilityChange),Gt(this._tasksEntityId),this._previewOverrideRaf!==void 0&&(cancelAnimationFrame(this._previewOverrideRaf),this._previewOverrideRaf=void 0),(e=this._previewOverride)==null||e.uninstall(),this._previewOverride=void 0}get _tasksEntityId(){var e,t;return(e=this._config)!=null&&e.household_tasks_from_integration?`todo.lucarne_household`:((t=this._config)==null?void 0:t.tasks)??``}_setupSubscriptions(){this._config&&this.hass&&(this._fetchCalendarEvents(),this._config.weather&&this._fetchForecast(),this._calendarIntervalId=setInterval(()=>{var e;this._fetchCalendarEvents(),(e=this._config)!=null&&e.weather&&this._fetchForecast()},3e5),this._config.tasks&&!this._config.household_tasks_from_integration&&(this._todoUnsub=Ct(this.hass,this._config.tasks,e=>{this._todoItems=e,this._reconcileOptimistic()})),(this._config.household_tasks_from_integration||this._config.show_family_ready_pill||this._config.tasks)&&(this._unsubFamily=tn(this.hass,e=>{this._familyState=e,this._reconcileOptimistic()})))}_teardownSubscriptions(){var e,t;clearInterval(this._calendarIntervalId),(e=this._todoUnsub)==null||e.call(this),this._todoUnsub=void 0,(t=this._unsubFamily)==null||t.call(this),this._unsubFamily=void 0,this._calendarIntervalId=void 0}updated(e){if(super.updated(e),!e.has(`hass`)||!this._config)return;if(!e.get(`hass`)&&this.hass&&!this._calendarIntervalId){this._setupSubscriptions();return}let t=this._config.weather;if(t){var n;let e=(n=this.hass.states[t])==null?void 0:n.state;e&&e!==this._lastWeatherState&&(this._lastWeatherState=e,this._fetchForecast())}}async _fetchCalendarEvents(){if(!this._config||!this.hass)return;let e=this._config.calendars.map(e=>e.entity),t=/* @__PURE__ */ new Date;t.setHours(0,0,0,0);let n=new Date(Date.now()+6048e5),{events:r}=await vt(this.hass,e,t,n),i=/* @__PURE__ */ new Map;for(let[e,t]of r.entries())i.set(e,t.map(t=>({...t,uid:`${e}::${t.uid??t.summary}`})));this._calendarEvents=i}async _fetchForecast(){var e;if(!this._fetchingForecast&&(e=this._config)!=null&&e.weather&&this.hass){this._fetchingForecast=!0;try{var t;let e=await this.hass.connection.sendMessagePromise({type:`call_service`,domain:`weather`,service:`get_forecasts`,service_data:{type:`daily`},target:{entity_id:this._config.weather},return_response:!0});this._forecast=(e==null||(t=e.response)==null||(t=t[this._config.weather])==null?void 0:t.forecast)??[]}catch(e){console.warn(`[lucarne] weather.get_forecasts failed for ${this._config.weather}:`,e),this._forecast=[]}finally{this._fetchingForecast=!1}}}get _mergedEvents(){let e=[];for(let t of this._calendarEvents.values())e.push(...t);return e}get _calendarColorMap(){var e;let t=/* @__PURE__ */ new Map;for(let n of((e=this._config)==null?void 0:e.calendars)??[])t.set(n.entity,n.color);return t}get _householdTasks(){var e;return((e=this._familyState)==null?void 0:e.tasksByMember.get(`household`))??[]}get _familyMembers(){var e;return((e=this._familyState)==null?void 0:e.members)??[]}get _familyTasksByMember(){var e;return((e=this._familyState)==null?void 0:e.tasksByMember)??/* @__PURE__ */ new Map}get _enrichedRawTasks(){var e,t,n;if(!((e=this._config)!=null&&e.tasks))return[];let r=((t=this._familyState)==null?void 0:t.taskMetadataByUid)??/* @__PURE__ */ new Map,i=((n=this._familyState)==null||(n=n.members.find(e=>e.todo_entity_id===this._config.tasks))==null?void 0:n.slug)??``;return this._todoItems.map(e=>{let t=r.get(e.uid)??{item_uid:e.uid,member_slug:i,assignee_slug:``,type:`chore`,recurrence:``,icon:``,source:`manual`};return{uid:e.uid,summary:e.summary,status:e.status,due:e.due??null,description:e.description??``,metadata:t}})}async _handleTaskToggle(e){let{task:t}=e.detail;if(!this.hass)return;let n=t.status===`completed`?`needs_action`:`completed`,r=this._resolveTaskEntityId(t);if(r){Kt(this._tasksEntityId),this._optimistic=new Map(this._optimistic).set(t.uid,n);try{await this.hass.callService(`todo`,`update_item`,{item:t.uid,status:n},{entity_id:r})}catch(e){let n=new Map(this._optimistic);throw n.delete(t.uid),this._optimistic=n,e}}}_reconcileOptimistic(){if(this._optimistic.size===0)return;let e=/* @__PURE__ */ new Map;for(let t of this._todoItems)e.set(t.uid,t.status);if(this._familyState)for(let t of this._familyState.tasksByMember.values())for(let n of t)e.set(n.uid,n.status);let t=!1,n=new Map(this._optimistic);for(let[r,i]of n){let a=e.get(r);(a===void 0||a===i)&&(n.delete(r),t=!0)}t&&(this._optimistic=n)}_handleTaskLongPress(e){let{task:t}=e.detail,n=this._resolveTaskEntityId(t);n&&this.dispatchEvent(new CustomEvent(`hass-more-info`,{detail:{entityId:n},bubbles:!0,composed:!0}))}_resolveTaskEntityId(e){var t,n;if((t=this._config)!=null&&t.household_tasks_from_integration&&this._familyState){let t=e.metadata.member_slug;if(t===`household`)return`todo.lucarne_household`;let n=this._familyState.members.find(e=>e.slug===t);return n!=null&&n.todo_entity_id?n.todo_entity_id:void 0}return(n=this._config)==null?void 0:n.tasks}_renderCalendarSection(){var e;return I`
      <div class="section section-calendar" data-section="calendar">
        <lucarne-agenda-strip
          .events=${this._mergedEvents}
          .calendarColors=${this._calendarColorMap}
          .windowDays=${(e=this._config)!=null&&e.agenda_show_tomorrow?2:1}
        ></lucarne-agenda-strip>
      </div>
    `}_renderWeatherSection(){var e,t;return I`
      <div class="section section-weather" data-section="weather">
        <lucarne-weather-block
          .weatherEntity=${(e=this._config)!=null&&e.weather?(t=this.hass)==null?void 0:t.states[this._config.weather]:void 0}
          .forecast=${this._forecast}
        ></lucarne-weather-block>
      </div>
    `}get _maxTasks(){var e;let t=(e=this._config)==null?void 0:e.max_tasks;return typeof t==`number`&&Number.isFinite(t)?Math.max(1,Math.floor(t)):5}_renderTasksSection(e,t){var n;if(!e&&!t)return``;let r=/* @__PURE__ */ new Date,i=(t?this._householdTasks:this._enrichedRawTasks).filter(e=>{if(e.metadata.type===`rotating`)return!1;if(e.metadata.type===`routine`){let t=an(e.metadata.recurrence);return t.mode===`none`||t.mode===`unknown`||yn(t,r)}return!0}).map(this._applyOptimistic),a=this._tasksEntityId;return I`
      <div
        class="section section-tasks"
        data-section="tasks"
        @task-toggle=${this._handleTaskToggle}
        @task-long-press=${this._handleTaskLongPress}
      >
        <lucarne-tasks-summary
          .integrationMode=${!0}
          .renderableTasks=${i}
          .members=${this._familyMembers}
          .todoEntityId=${a}
          .limit=${this._maxTasks}
          .refillOnComplete=${((n=this._config)==null?void 0:n.refill_tasks_on_complete)??!1}
        ></lucarne-tasks-summary>
      </div>
    `}renderContent(){if(!this._config)return I``;let e=(this._config.presence??[]).map(e=>{var t;return{name:e.name,isHome:((t=this.hass)==null||(t=t.states[e.entity])==null?void 0:t.state)===`on`}}),t=this._familyState!==null&&this._familyState.integrationError===null,n=(this._config.show_family_ready_pill??!1)&&t,r=(this._config.household_tasks_from_integration??!1)&&t,i=!(this._config.household_tasks_from_integration??!1)&&!!this._config.tasks,a=Er(this._config.section_order);return I`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${this._config.title??J.today}</h2>
          <div class="header-right">
            ${e.length>0?I`<lucarne-presence-pills .entries=${e}></lucarne-presence-pills>`:``}
            ${n?I`<lucarne-family-ready-pill
                  .members=${this._familyMembers}
                  .tasksByMember=${this._familyTasksByMember}
                ></lucarne-family-ready-pill>`:``}
          </div>
        </div>
        <div class="card-body">
          ${a.map(e=>{switch(e){case`calendar`:return this._renderCalendarSection();case`weather`:return this._renderWeatherSection();case`tasks`:return this._renderTasksSection(i,r)}})}
        </div>
      </ha-card>
    `}},wr.styles=[G,P`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        font-family: var(--primary-font-family, sans-serif);
        container-type: inline-size;
      }
      /* Fill HA's grid cell: a fixed row count gives it a height, and at Auto
         height 100% resolves to auto, so the card sizes to its content — the
         same rule HA's own cards use (issue #156). */
      ha-card {
        width: 100%;
        height: 100%;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      /* fill_viewport: the kiosk layout, sharing its height with the Calendar card.
         max-height lets a fixed row count win — at Auto height it resolves to none. */
      :host([fill-viewport]) ha-card {
        height: var(--lucarne-card-fill-height);
        max-height: 100%;
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .card-body {
        display: flex;
        flex-direction: column;
        /* Fill the space below the header; section-tasks absorbs the slack when
           content is short, and the body scrolls if it would overflow the fixed
           card height instead of being clipped. */
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }
      .section + .section {
        border-top: 1px solid rgba(0, 0, 0, 0.07);
      }
      /* Tasks absorb any vertical slack so the card fills to the shared height
         with the list at the bottom rather than a blank gap. */
      .section-tasks {
        flex: 1 1 auto;
        min-height: 0;
      }
    `],wr);K([U({attribute:!1})],Dr.prototype,`hass`,void 0),K([W()],Dr.prototype,`_config`,void 0),K([W()],Dr.prototype,`_calendarEvents`,void 0),K([W()],Dr.prototype,`_forecast`,void 0),K([W()],Dr.prototype,`_todoItems`,void 0),K([W()],Dr.prototype,`_familyState`,void 0),K([W()],Dr.prototype,`_optimistic`,void 0),Dr=K([H(`lucarne-today-card`)],Dr);var Or=P`
  input[type='checkbox'] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    margin: 0;
    flex-shrink: 0;
    position: relative;
    cursor: pointer;
    border: 2px solid var(--lucarne-on-surface-muted, #727272);
    border-radius: 4px;
    background: var(--lucarne-surface, var(--ha-card-background, #fff));
  }
  input[type='checkbox']:checked {
    background: var(--primary-color, #03a9f4);
    border-color: var(--primary-color, #03a9f4);
  }
  input[type='checkbox']:checked::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 45%;
    width: 4px;
    height: 8px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: translate(-50%, -50%) rotate(45deg);
  }
  input[type='checkbox']:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
`,kr=P`
  select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 40px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%23727272' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 16px center;
    background-size: 12px 8px;
  }
`,Ar=P`
  :host {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-md);
    padding: var(--lucarne-spacing-lg);
    box-sizing: border-box;
    width: 100%;
  }
  .section-label {
    font-size: var(--lucarne-fs-sm);
    font-weight: 600;
    color: var(--lucarne-on-surface-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin: var(--lucarne-spacing-md) 0 var(--lucarne-spacing-xs);
  }
  .section-label:first-of-type {
    margin-top: 0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-xs);
  }
  .field-inline {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--lucarne-spacing-md);
  }
  .field-inline .field-label {
    flex: 1;
  }
  .field-inline input[type='checkbox'] {
    flex-shrink: 0;
    margin: 0;
  }
  ${Or}
  .field-label {
    font-size: var(--lucarne-fs-sm);
    color: var(--lucarne-on-surface-muted);
  }
  .row {
    display: flex;
    gap: var(--lucarne-spacing-sm);
    align-items: flex-start;
  }
  .row > * {
    flex: 1;
  }
  .text-input,
  .select-input {
    font: inherit;
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
    border-radius: var(--lucarne-radius-sm);
    padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
    width: 100%;
    box-sizing: border-box;
  }
  .text-input:focus,
  .select-input:focus {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: -1px;
  }
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--lucarne-spacing-md);
    padding: var(--lucarne-spacing-xs) 0;
  }
  .toggle-label {
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
  }
  .cal-row,
  .presence-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--lucarne-spacing-sm);
    align-items: center;
    padding: var(--lucarne-spacing-sm) 0;
    border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
  }
  .presence-row {
    grid-template-columns: 1fr auto;
  }
  .row-stack {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-xs);
    min-width: 0;
  }
  .cal-row ha-entity-picker,
  .presence-row ha-entity-picker,
  .row ha-entity-picker,
  .row-stack ha-entity-picker {
    width: 100%;
    min-width: 0;
  }
  .cal-color {
    width: 24px;
    height: 24px;
    border-radius: var(--lucarne-radius-sm);
    border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    appearance: none;
    -webkit-appearance: none;
  }
  .cal-color::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  .cal-color::-webkit-color-swatch {
    border: none;
    border-radius: var(--lucarne-radius-sm);
  }
  button.remove {
    background: none;
    border: none;
    color: var(--error-color, #f44336);
    cursor: pointer;
    font-size: 1.1em;
    padding: 4px 8px;
    border-radius: var(--lucarne-radius-sm);
  }
  .editor-error {
    color: var(--error-color, #f44336);
    font-size: var(--lucarne-fs-sm);
    margin-top: var(--lucarne-spacing-xs);
  }
  button.add {
    background: none;
    border: 1px dashed var(--divider-color, rgba(0, 0, 0, 0.2));
    border-radius: var(--lucarne-radius-md);
    padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
    cursor: pointer;
    color: var(--lucarne-on-surface-muted);
    font-size: var(--lucarne-fs-sm);
    width: 100%;
    text-align: center;
    margin-top: var(--lucarne-spacing-xs);
  }
  button.add:hover {
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  }
  .loading {
    color: var(--lucarne-on-surface-muted);
    font-size: var(--lucarne-fs-sm);
    text-align: center;
    padding: var(--lucarne-spacing-lg);
  }
`,jr=[`ha-entity-picker`,`ha-textfield`],Mr=3e3,Nr;function Pr(e){return new Promise(t=>setTimeout(t,e))}async function Fr(){let e=window.loadCardHelpers;if(e)try{let t=await e(),n=(await Promise.resolve(t.createCardElement({type:`entities`,entities:[]}))).constructor;typeof(n==null?void 0:n.getConfigElement)==`function`&&await Promise.resolve(n.getConfigElement())}catch(e){console.warn(`[lucarne] loadCardHelpers failed; falling back to whenDefined`,e)}let t=Promise.all(jr.map(e=>customElements.whenDefined(e))).then(()=>`ready`),n=Pr(Mr).then(()=>`timeout`);if(await Promise.race([t,n])===`timeout`&&!jr.every(e=>customElements.get(e)))throw Error(`[lucarne] HA form elements did not register within timeout`)}function Ir(){return Nr||(Nr=Fr().catch(e=>{throw Nr=void 0,e})),Nr}function Lr(e,t,n,r={}){let i=new CustomEvent(t,{bubbles:r.bubbles??!0,cancelable:r.cancelable??!1,composed:r.composed??!0,detail:n??{}});return e.dispatchEvent(i),i}var Rr=class extends V{constructor(...e){super(...e),this.items=[],this.label=`Reorderable list`,this._dragIndex=null,this._dragOverIndex=null}_emitReorder(e,t){let n=this.items.length;if(e===t||e<0||t<0||e>=n||t>=n)return;let r=this.items.map(e=>e.key),[i]=r.splice(e,1);r.splice(t,0,i),this.dispatchEvent(new CustomEvent(`reorder`,{detail:{from:e,to:t,order:r},bubbles:!0,composed:!0}))}_onDragStart(e,t){this._dragIndex=e,t.dataTransfer&&(t.dataTransfer.effectAllowed=`move`,t.dataTransfer.setData(`text/plain`,String(e)))}_onDragOver(e,t){this._dragIndex!==null&&this._dragIndex!==e&&(t.preventDefault(),t.dataTransfer&&(t.dataTransfer.dropEffect=`move`),this._dragOverIndex!==e&&(this._dragOverIndex=e))}_onDrop(e,t){t.preventDefault();let n=this._dragIndex;this._dragIndex=null,this._dragOverIndex=null,n!==null&&this._emitReorder(n,e)}_onDragEnd(){this._dragIndex=null,this._dragOverIndex=null}render(){return I`
      <div class="reorder-list" role="list" aria-label=${this.label}>
        ${this.items.map((e,t)=>I`
          <div
            class="reorder-row ${this._dragIndex===t?`dragging`:``} ${this._dragOverIndex===t?`drag-over`:``}"
            role="listitem"
            data-key=${e.key}
            draggable="true"
            @dragstart=${e=>this._onDragStart(t,e)}
            @dragover=${e=>this._onDragOver(t,e)}
            @drop=${e=>this._onDrop(t,e)}
            @dragend=${this._onDragEnd}
          >
            <span class="grab-handle" aria-hidden="true" title="Drag to reorder">≡</span>
            <div class="reorder-content"><slot name=${e.key}></slot></div>
            <button
              class="move-btn move-up-btn"
              type="button"
              aria-label="Move ${e.label??`item`} up"
              ?disabled=${t===0}
              @click=${()=>this._emitReorder(t,t-1)}
            >↑</button>
            <button
              class="move-btn move-down-btn"
              type="button"
              aria-label="Move ${e.label??`item`} down"
              ?disabled=${t===this.items.length-1}
              @click=${()=>this._emitReorder(t,t+1)}
            >↓</button>
          </div>
        `)}
      </div>
    `}},zr=(Rr.styles=P`
    .reorder-list {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: var(--lucarne-radius-md, 12px);
      overflow: hidden;
    }
    .reorder-row {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: var(--lucarne-spacing-sm, 8px);
      padding: var(--lucarne-spacing-sm, 8px) var(--lucarne-spacing-md, 12px);
      background: var(--ha-card-background, var(--card-background-color, #fff));
    }
    .reorder-row + .reorder-row {
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
    }
    .reorder-row.dragging {
      opacity: 0.5;
    }
    .reorder-row.drag-over {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .grab-handle {
      cursor: grab;
      color: var(--lucarne-on-surface-muted, #727272);
      font-size: 1.2em;
      line-height: 1;
      user-select: none;
      padding: 0 var(--lucarne-spacing-xs, 4px);
    }
    .grab-handle:active {
      cursor: grabbing;
    }
    .reorder-content {
      min-width: 0;
    }
    .move-btn {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.15));
      border-radius: var(--lucarne-radius-sm, 8px);
      padding: 2px 8px;
      font-size: 0.9em;
      color: var(--lucarne-on-surface-muted, #727272);
      cursor: pointer;
      min-width: 28px;
    }
    .move-btn:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .move-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  `,Rr);K([U({attribute:!1})],zr.prototype,`items`,void 0),K([U()],zr.prototype,`label`,void 0),K([W()],zr.prototype,`_dragIndex`,void 0),K([W()],zr.prototype,`_dragOverIndex`,void 0),zr=K([H(`lucarne-reorder-list`)],zr);var Br,Vr={calendar:`Calendar`,weather:`Weather`,tasks:`Tasks`},Hr=P`
  .section-label-cell {
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
  }
`,Ur=(Br=class extends V{constructor(...e){super(...e),this._haReady=!1}connectedCallback(){super.connectedCallback(),Ir().catch(e=>console.warn(`[lucarne] HA editor elements load failed; rendering anyway`,e)).then(()=>{this._haReady=!0})}setConfig(e){this._config=e}_fire(e){Lr(this,`config-changed`,{config:e})}_titleChanged(e){let t=e.target;this._fire({...this._config,title:t.value||void 0})}_weatherChanged(e){var t;this._fire({...this._config,weather:((t=e.detail)==null?void 0:t.value)??void 0})}_tasksChanged(e){var t;this._fire({...this._config,tasks:((t=e.detail)==null?void 0:t.value)??void 0})}_integrationTasksChanged(e){let t=e.target.checked;this._fire({...this._config,household_tasks_from_integration:t||void 0})}_familyPillChanged(e){let t=e.target.checked;this._fire({...this._config,show_family_ready_pill:t||void 0})}_isIntegrationAvailable(){var e;return!!((e=this.hass)!=null&&(e=e.states)!=null&&e[Zt.todo_entity_id])}_agendaShowTomorrowChanged(e){let t=e.target.checked;this._fire({...this._config,agenda_show_tomorrow:t||void 0})}_maxTasksChanged(e){let t=e.target,n=parseInt(t.value,10);this._fire({...this._config,max_tasks:isNaN(n)?void 0:Math.max(1,n)})}_refillTasksChanged(e){let t=e.target.checked;this._fire({...this._config,refill_tasks_on_complete:t||void 0})}_calEntityChanged(e,t){var n,r;let i=[...((n=this._config)==null?void 0:n.calendars)??[]];i[e]={...i[e],entity:((r=t.detail)==null?void 0:r.value)??``},this._fire({...this._config,calendars:i})}_calColorChanged(e,t){var n;let r=[...((n=this._config)==null?void 0:n.calendars)??[]];r[e]={...r[e],color:t.target.value},this._fire({...this._config,calendars:r})}_removeCalendar(e){var t;let n=[...((t=this._config)==null?void 0:t.calendars)??[]];n.length<=1||(n.splice(e,1),this._fire({...this._config,calendars:n}))}_addCalendar(){var e,t;let n=Object.keys(((e=this.hass)==null?void 0:e.states)??{}).find(e=>e.startsWith(`calendar.`))??`calendar.example`,r=[...((t=this._config)==null?void 0:t.calendars)??[],{entity:n,color:`#a8d8b9`}];this._fire({...this._config,calendars:r})}_presenceEntityChanged(e,t){var n,r;let i=[...((n=this._config)==null?void 0:n.presence)??[]];i[e]={...i[e],entity:((r=t.detail)==null?void 0:r.value)??``},this._fire({...this._config,presence:i})}_presenceNameChanged(e,t){var n;let r=[...((n=this._config)==null?void 0:n.presence)??[]];r[e]={...r[e],name:t.target.value},this._fire({...this._config,presence:r})}_removePresence(e){var t;let n=[...((t=this._config)==null?void 0:t.presence)??[]];n.splice(e,1),this._fire({...this._config,presence:n})}_addPresence(){var e;let t=[...((e=this._config)==null?void 0:e.presence)??[],{entity:``,name:``}];this._fire({...this._config,presence:t})}_commitSectionOrder(e){this._fire({...this._config,section_order:e})}_renderSectionOrder(){var e;let t=Er((e=this._config)==null?void 0:e.section_order);return I`
      <div class="section-label">Section order</div>
      <lucarne-reorder-list
        label="Card sections (drag to reorder)"
        .items=${t.map(e=>({key:e,label:Vr[e]}))}
        @reorder=${e=>this._commitSectionOrder(e.detail.order)}
      >
        ${t.map(e=>I`<span slot=${e} class="section-label-cell">${Vr[e]}</span>`)}
      </lucarne-reorder-list>
    `}render(){if(!this._config)return I``;if(!this._haReady)return I`<div class="loading">Loading editor…</div>`;let e=this._config.calendars??[],t=this._config.presence??[];return I`
      <label class="field">
        <span class="field-label">Card title</span>
        <input
          class="text-input"
          type="text"
          .value=${this._config.title??``}
          @change=${this._titleChanged}
        />
      </label>
      <label class="field field-inline">
        <span class="field-label">Also show tomorrow in agenda</span>
        <input
          type="checkbox"
          .checked=${this._config.agenda_show_tomorrow??!1}
          @change=${this._agendaShowTomorrowChanged}
        />
      </label>

      ${this._renderSectionOrder()}

      <ha-entity-picker
        label="Weather entity"
        .hass=${this.hass}
        .value=${this._config.weather??``}
        .includeDomains=${[`weather`]}
        allow-custom-entity
        @value-changed=${this._weatherChanged}
      ></ha-entity-picker>

      <ha-entity-picker
        label="Todo entity"
        .hass=${this.hass}
        .value=${this._config.tasks??``}
        .includeDomains=${[`todo`]}
        allow-custom-entity
        @value-changed=${this._tasksChanged}
      ></ha-entity-picker>

      <label class="field">
        <span class="field-label">Max tasks to show</span>
        <input
          class="text-input"
          type="number"
          min="1"
          .value=${String(this._config.max_tasks??5)}
          @change=${this._maxTasksChanged}
        />
      </label>
      <label class="field field-inline">
        <span class="field-label">Show a new task when one is completed</span>
        <input
          type="checkbox"
          .checked=${this._config.refill_tasks_on_complete??!1}
          @change=${this._refillTasksChanged}
        />
      </label>

      <div class="section-label">Lucarne Family integration</div>
      <label class="field field-inline" style="${this._isIntegrationAvailable()?``:`opacity:0.5;pointer-events:none`}">
        <span class="field-label">Household tasks from integration</span>
        <input
          type="checkbox"
          .checked=${this._config.household_tasks_from_integration??!1}
          @change=${this._integrationTasksChanged}
          ?disabled=${!this._isIntegrationAvailable()}
        />
        ${this._isIntegrationAvailable()?``:I`<small> — install Lucarne Family integration first</small>`}
      </label>
      <label class="field field-inline" style="${this._isIntegrationAvailable()?``:`opacity:0.5;pointer-events:none`}">
        <span class="field-label">Show family ready pill</span>
        <input
          type="checkbox"
          .checked=${this._config.show_family_ready_pill??!1}
          @change=${this._familyPillChanged}
          ?disabled=${!this._isIntegrationAvailable()}
        />
        ${this._isIntegrationAvailable()?``:I`<small> — install Lucarne Family integration first</small>`}
      </label>

      <div class="section-label">Calendars</div>
      ${e.map((e,t)=>I`
          <div class="cal-row">
            <ha-entity-picker
              label="Calendar entity"
              .hass=${this.hass}
              .value=${e.entity}
              .includeDomains=${[`calendar`]}
              allow-custom-entity
              @value-changed=${e=>this._calEntityChanged(t,e)}
            ></ha-entity-picker>
            <input
              type="color"
              class="cal-color"
              .value=${e.color}
              @input=${e=>this._calColorChanged(t,e)}
              title="Calendar color"
            />
            <button type="button" class="remove" @click=${()=>this._removeCalendar(t)} title="Remove">✕</button>
          </div>
        `)}
      <button type="button" class="add" @click=${this._addCalendar}>+ Add calendar</button>

      <div class="section-label">Presence</div>
      ${t.map((e,t)=>I`
          <div class="presence-row">
            <div class="row-stack">
              <ha-entity-picker
                label="Entity"
                .hass=${this.hass}
                .value=${e.entity}
                .includeDomains=${[`input_boolean`]}
                allow-custom-entity
                @value-changed=${e=>this._presenceEntityChanged(t,e)}
              ></ha-entity-picker>
              <input
                class="text-input"
                type="text"
                placeholder="Display name"
                .value=${e.name}
                @change=${e=>this._presenceNameChanged(t,e)}
              />
            </div>
            <button type="button" class="remove" @click=${()=>this._removePresence(t)} title="Remove">✕</button>
          </div>
        `)}
      <button type="button" class="add" @click=${this._addPresence}>+ Add person</button>
    `}},Br.styles=[G,Ar,Hr],Br);K([U({attribute:!1})],Ur.prototype,`hass`,void 0),K([W()],Ur.prototype,`_config`,void 0),K([W()],Ur.prototype,`_haReady`,void 0),Ur=K([H(`lucarne-today-card-editor`)],Ur);function Wr(e,t){var n;let r=t==null||(n=t.states)==null||(n=n[e.entity])==null||(n=n.attributes)==null?void 0:n.friendly_name;return typeof r==`string`&&r?r:e.entity}function Gr(e,t){return e.map(e=>({...e,label:Wr(e,t)}))}function Kr(e,t){let n=Math.min(t.minColWidth,t.maxColWidth),r=Math.max(t.minColWidth,t.maxColWidth),i=Math.min(t.minDays,t.maxDays),a=Math.max(t.minDays,t.maxDays),o=Math.max(0,e-t.timeColWidth);if(o<=0)return{visibleCount:i,dayWidthPx:n};let s=Math.floor(o/n),c=Math.ceil(o/r),l=Math.min(a,Math.max(i,c,Math.min(s,a)));return{visibleCount:l,dayWidthPx:o/l}}function qr(e){return`syn:${e.start}|${e.end}|${e.summary??``}`}function Jr(e){if(e!==void 0&&typeof e==`number`&&Number.isFinite(e))return Math.max(0,Math.floor(e))}function Yr(e,t){let n=new Date(e);return n.setDate(n.getDate()+t),n}function Xr(e){let t=new Date(e);return t.setHours(0,0,0,0),t}var Zr=class{constructor(e,t){this._isConnected=!1,this._hasHass=!1,this._dayOffset=0,this._fetchSeq=0,this._cachedEvents=/* @__PURE__ */ new Map,this._cachedDayKeys=/* @__PURE__ */ new Set,this._host=e,this._opts=t,this._fetcher=t.fetcher??vt,this._pollIntervalMs=t.pollIntervalMs??3e5,this._tickIntervalMs=t.tickIntervalMs??6e4,this._panBound=t.panBoundDays??90,this._visibleCount=t.visibleCount,this._bufferDaysExplicit=Jr(t.bufferDays);let n=(t.now??(()=>/* @__PURE__ */ new Date))();this._anchorToday=Xr(n),e.addController(this)}hostConnected(){this._isConnected=!0,this._tickIntervalMs>0&&(this._tickTimer=setInterval(()=>this.tick(),this._tickIntervalMs)),this._pollIntervalMs>0&&(this._pollTimer=setInterval(()=>this._poll(),this._pollIntervalMs)),this._hass&&this._fetchRange(...this._computeRange())}hostDisconnected(){this._isConnected=!1,clearInterval(this._tickTimer),clearInterval(this._pollTimer),this._tickTimer=void 0,this._pollTimer=void 0}setHass(e){let t=!this._hasHass;this._hass=e,this._hasHass=!0,t&&this._isConnected&&this._fetchRange(...this._computeRange())}updateCalendars(e){let t=new Set(this._opts.calendars.map(e=>e.entity)),n=new Set(e.map(e=>e.entity)),r=t.size!==n.size||[...n].some(e=>!t.has(e));this._opts.calendars=e,r&&this._hass&&this._fetchRange(...this._computeRange())}setVisibleCount(e){var t,n;let r=this._visibleCount;if(this._visibleCount=e,(t=(n=this._opts).onChange)==null||t.call(n),this._host.requestUpdate(),e!==r){let[e,t]=this._computeRange();this._rangeIsCovered(e,t)||this._fetchRange(e,t)}}setBufferDays(e){var t,n;let r=Jr(e);r!==this._bufferDaysExplicit&&(this._bufferDaysExplicit=r,(t=(n=this._opts).onChange)==null||t.call(n),this._host.requestUpdate())}pan(e){var t,n;let r=-this._panBound,i=this._panBound-this._visibleCount,a=Math.max(r,Math.min(i,this._dayOffset+e));this._dayOffset=a,(t=(n=this._opts).onChange)==null||t.call(n),this._host.requestUpdate();let[o,s]=this._computeRange();this._rangeIsCovered(o,s)||this._fetchRange(o,s)}goToToday(){let e=this._dayOffset===0;if(this._dayOffset=0,!e){var t,n;(t=(n=this._opts).onChange)==null||t.call(n)}this._host.requestUpdate();let[r,i]=this._computeRange();this._rangeIsCovered(r,i)||this._fetchRange(r,i)}tick(){let e=Xr((this._opts.now??(()=>/* @__PURE__ */ new Date))());if(e.getTime()!==this._anchorToday.getTime()&&(this._anchorToday=e,this._dayOffset===0)){var t,n;(t=(n=this._opts).onChange)==null||t.call(n),this._host.requestUpdate(),this._hass&&this._fetchRange(...this._computeRange())}}async _poll(){this._hass&&this._fetchRange(...this._computeRange())}get days(){return Array.from({length:this._visibleCount},(e,t)=>{let n=Yr(this._anchorToday,this._dayOffset+t);return n.setHours(0,0,0,0),n})}get bufferDays(){return this._bufferDaysExplicit??this._visibleCount}get renderDays(){let e=this.bufferDays,t=e*2+this._visibleCount;return Array.from({length:t},(t,n)=>{let r=Yr(this._anchorToday,this._dayOffset-e+n);return r.setHours(0,0,0,0),r})}get dayOffset(){return this._dayOffset}get isAtToday(){return this._dayOffset===0}get canPanBack(){return this._dayOffset>-this._panBound}get canPanForward(){return this._dayOffset+this._visibleCount<this._panBound}get cachedEvents(){return this._cachedEvents}get cachedRange(){if(!this._cacheStart||!this._cacheEnd)return[];let e=[],t=new Date(this._cacheStart);for(;t<this._cacheEnd;)e.push(new Date(t)),t.setDate(t.getDate()+1);return e}isDayCached(e){return this._cachedDayKeys.has(q(e))}_computeRange(){let e=this._visibleCount,t=Yr(this._anchorToday,this._dayOffset-e);t.setHours(0,0,0,0);let n=Yr(this._anchorToday,this._dayOffset+2*e);return n.setHours(0,0,0,0),[t,n]}_rangeIsCovered(e,t){return!this._cacheStart||!this._cacheEnd?!1:e>=this._cacheStart&&t<=this._cacheEnd}_fetchRange(e,t){var n,r;if(!this._hass)return;let i=++this._fetchSeq,a=this._opts.calendars.map(e=>e.entity);(n=(r=this._opts).onFetchStart)==null||n.call(r,{start:e,end:t}),this._fetcher(this._hass,a,e,t).then(({events:n,failed:r})=>{var a,o;if(i!==this._fetchSeq)return;let s=/* @__PURE__ */ new Map;for(let[e,t]of n.entries())s.set(e,t.map(t=>{let n=t.uid&&t.uid.length>0?t.uid:qr(t);return{...t,uid:`${e}::${n}`}}));this._cachedEvents=s,this._cachedDayKeys=/* @__PURE__ */ new Set;for(let n=new Date(e);n<t;n.setDate(n.getDate()+1))this._cachedDayKeys.add(q(n));this._cacheStart=new Date(e),this._cacheEnd=new Date(t),(a=(o=this._opts).onFetchComplete)==null||a.call(o,s,r)}).catch(e=>{console.warn(`[lucarne] RollingWindowController fetch failed:`,e)})}};function Qr(e){let{now:t,bandStartH:n,bandEndH:r,timeGridTopPx:i,timeGridHeightPx:a,paddingPx:o,stickyHeadPx:s=0,maxScrollTop:c}=e,l=r-n;if(l<=0)return 0;let u=t.getHours()+t.getMinutes()/60+t.getSeconds()/3600;if(u<=n)return 0;if(u>=r)return Math.max(0,c);let d=i+(u-n)/l*a-o-s;return Math.max(0,Math.min(c,d))}var $r=class extends V{constructor(...e){super(...e),this.calendars=[],this.visibleIds=/* @__PURE__ */ new Set}_toggle(e){let t=new Set(this.visibleIds);t.has(e)?t.delete(e):t.add(e),this.dispatchEvent(new CustomEvent(`visibility-change`,{detail:t,bubbles:!0,composed:!0}))}render(){return I`
      ${this.calendars.map(e=>I`
          <button
            class="pill ${this.visibleIds.has(e.entity)?`visible`:`hidden`}"
            style="background: ${this.visibleIds.has(e.entity)?e.color+`33`:`transparent`}"
            @click=${()=>this._toggle(e.entity)}
            aria-pressed=${this.visibleIds.has(e.entity)}
            aria-label="${e.label}"
          >
            <span class="dot" style="background: ${e.color}"></span>
            <span class="label">${e.label}</span>
          </button>
        `)}
    `}},ei=($r.styles=[G,P`
      :host {
        display: flex;
        flex-wrap: wrap;
        gap: var(--lucarne-spacing-xs);
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-xl);
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: var(--lucarne-fs-sm);
        cursor: pointer;
        user-select: none;
        transition: opacity 0.15s, background 0.15s;
        border: 1.5px solid transparent;
        min-height: 44px;
        box-sizing: border-box;
        touch-action: manipulation;
      }
      .pill.visible {
        opacity: 1;
        border-color: transparent;
      }
      .pill.hidden {
        opacity: 0.45;
        text-decoration: line-through;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .label {
        white-space: nowrap;
        font-weight: 500;
        color: var(--lucarne-on-surface);
      }
    `],$r);K([U({type:Array})],ei.prototype,`calendars`,void 0),K([U({type:Object})],ei.prototype,`visibleIds`,void 0),ei=K([H(`lucarne-visibility-pills`)],ei);var ti={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},ni=e=>(...t)=>({_$litDirective$:e,values:t}),ri=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,n){this._$Ct=e,this._$AM=t,this._$Ci=n}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}},ii=`important`,ai=` !`+ii,oi=ni(class extends ri{constructor(e){var t;if(super(e),e.type!==ti.ATTRIBUTE||e.name!==`style`||((t=e.strings)==null?void 0:t.length)>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(e){return Object.keys(e).reduce((t,n)=>{let r=e[n];return r==null?t:t+`${n=n.includes(`-`)?n:n.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,`-$&`).toLowerCase()}:${r};`},``)}update(e,[t]){let{style:n}=e.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(t)),this.render(t);for(let e of this.ft)t[e]??(this.ft.delete(e),e.includes(`-`)?n.removeProperty(e):n[e]=null);for(let e in t){let r=t[e];if(r!=null){this.ft.add(e);let t=typeof r==`string`&&r.endsWith(ai);e.includes(`-`)||t?n.setProperty(e,t?r.slice(0,-11):r,t?ii:``):n[e]=r}}return Ge}}),si;function ci(e){return e.toLocaleTimeString(`en-US`,{hour:`numeric`,minute:`2-digit`,hour12:!0})}var li=(si=class extends V{constructor(...e){super(...e),this.color=`#a8d8b9`,this.lane=0,this.laneCount=1,this.topPercent=0,this.heightPercent=10}_handleClick(e){e.stopPropagation(),this.dispatchEvent(new CustomEvent(`lucarne-event-tap`,{detail:{event:this.event,color:this.color},bubbles:!0,composed:!0}))}render(){let e=new Date(this.event.start),t=new Date(this.event.end),n=`${ci(e)}–${ci(t)}`,r=this.event.pending?`0.5`:`1`;return I`
      <div @click=${this._handleClick} style="height:100%;width:100%;overflow:hidden;opacity:${r}">
        <div class="event-summary">${this.event.summary}</div>
        <div class="event-time">${n}</div>
      </div>
    `}},si.styles=[G,P`
      :host {
        /* Position/size is controlled by inline style from the parent day column.
         * display:block so the host fills its inline-style-determined box. */
        display: block;
        overflow: hidden;
        cursor: pointer;
        border-radius: var(--lucarne-radius-sm);
        border-left: 3px solid transparent;
        transition: filter 0.1s;
        box-sizing: border-box;
        padding: 2px 4px;
      }
      :host(:hover) {
        filter: brightness(0.92);
        z-index: 10;
      }
      .event-summary {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: rgba(0, 0, 0, 0.8);
        line-height: 1.2;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        white-space: normal;
        word-break: break-word;
      }
      .event-time {
        font-size: 0.7rem;
        color: rgba(0, 0, 0, 0.55);
        line-height: 1.1;
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `],si);K([U({type:Object})],li.prototype,`event`,void 0),K([U({type:String})],li.prototype,`color`,void 0),K([U({type:Number})],li.prototype,`lane`,void 0),K([U({type:Number})],li.prototype,`laneCount`,void 0),K([U({type:Number})],li.prototype,`topPercent`,void 0),K([U({type:Number})],li.prototype,`heightPercent`,void 0),li=K([H(`lucarne-calendar-event-block`)],li);var ui=class extends V{constructor(...e){super(...e),this.events=[],this.label=`earlier`,this.eventColors=/* @__PURE__ */ new Map,this._open=!1}_formatTime(e){return new Date(e).toLocaleTimeString(`en-US`,{hour:`numeric`,minute:`2-digit`,hour12:!0})}_openPopover(e){e.stopPropagation(),this._chipEl=e.currentTarget,this._open=!0}_close(){this._open=!1}_tapEvent(e,t){e.stopPropagation(),this._close(),this.dispatchEvent(new CustomEvent(`lucarne-event-tap`,{detail:{event:t,color:this.eventColors.get(t.uid??``)??`#a8d8b9`},bubbles:!0,composed:!0}))}render(){if(this.events.length===0)return I``;let e=this._chipEl,t=0,n=0;if(e){let r=e.getBoundingClientRect();t=r.bottom+4,n=r.left}return I`
      <button class="stub-chip" @click=${this._openPopover}>
        +${this.events.length} ${this.label}
      </button>

      ${this._open?I`
            <div class="backdrop" @click=${this._close}></div>
            <div class="mini-popover" style="top:${t}px;left:${n}px;">
              <div class="mini-title">${this.label}</div>
              ${this.events.map(e=>I`
                  <div class="mini-event" @click=${t=>this._tapEvent(t,e)}>
                    <span class="mini-event-summary">${e.summary}</span>
                    <span class="mini-event-time">${this._formatTime(e.start)}</span>
                  </div>
                `)}
            </div>
          `:``}
    `}},di=(ui.styles=[G,P`
      :host {
        display: block;
      }
      .stub-chip {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 8px;
        cursor: pointer;
        background: rgba(0, 0, 0, 0.07);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        box-sizing: border-box;
        border: none;
        width: 100%;
        justify-content: center;
      }
      .stub-chip:hover {
        background: rgba(0, 0, 0, 0.12);
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
      }
      .mini-popover {
        position: fixed;
        z-index: 101;
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-md);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
        padding: var(--lucarne-spacing-md);
        min-width: 220px;
        max-width: 320px;
        max-height: 60vh;
        overflow-y: auto;
      }
      .mini-title {
        font-size: var(--lucarne-fs-sm);
        font-weight: 700;
        color: var(--lucarne-on-surface-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--lucarne-spacing-sm);
      }
      .mini-event {
        display: flex;
        flex-direction: column;
        padding: var(--lucarne-spacing-sm) 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        cursor: pointer;
        min-height: 44px;
        justify-content: center;
      }
      .mini-event:last-child {
        border-bottom: none;
      }
      .mini-event:hover {
        background: rgba(0, 0, 0, 0.04);
        border-radius: var(--lucarne-radius-sm);
      }
      .mini-event-summary {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface);
      }
      .mini-event-time {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
      }
    `],ui);K([U({type:Array})],di.prototype,`events`,void 0),K([U({type:String})],di.prototype,`label`,void 0),K([U({type:Object})],di.prototype,`eventColors`,void 0),K([W()],di.prototype,`_open`,void 0),di=K([H(`lucarne-out-of-band-stub`)],di);var fi;function pi(e){return 20+(e*37+11)%30}function mi(e){return 10+(e*53+7)%60}var hi=(fi=class extends V{constructor(...e){super(...e),this.bandStart=`07:00`,this.bandEnd=`21:00`,this.hourHeightPx=60}render(){let[e]=this.bandStart.split(`:`).map(Number),[t]=this.bandEnd.split(`:`).map(Number),n=Math.max(1,t-e)*this.hourHeightPx;return I`
      <div class="sk-host" style="height:${n}px">
        ${[0,1].map(e=>I`
            <div
              class="fake-event"
              style="top: ${mi(e)/100*n}px; height: ${pi(e)}px;"
            >
              <div class="shimmer-sweep"></div>
            </div>
          `)}
      </div>
    `}},fi.styles=[G,P`
      :host {
        display: block;
        width: 100%;
      }
      /*
       * Wrapper with an explicit pixel height derived from bandStart/bandEnd
       * and hourHeightPx. Avoids height:100% on :host because the parent
       * wrapper in calendar-grid is a flex column with no fixed height — on
       * the initial render (cachedDayKeys empty, no real day-col anywhere to
       * establish a row height), 100% of nothing collapsed the skeleton to
       * 0px and the shimmer was invisible.
       */
      .sk-host {
        position: relative;
        width: 100%;
        overflow: hidden;
      }
      .fake-event {
        position: absolute;
        left: 6px;
        right: 6px;
        border-radius: 3px;
        background: var(--lucarne-skeleton-base);
        overflow: hidden;
      }
      .shimmer-sweep {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--lucarne-skeleton-highlight) 50%,
          transparent 100%
        );
        animation: shimmer-sweep 3s ease-in-out infinite;
      }
      @keyframes shimmer-sweep {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .shimmer-sweep {
          display: none;
        }
        .fake-event {
          background: var(--lucarne-skeleton-base);
        }
      }
    `],fi);K([U({type:String})],hi.prototype,`bandStart`,void 0),K([U({type:String})],hi.prototype,`bandEnd`,void 0),K([U({type:Number})],hi.prototype,`hourHeightPx`,void 0),hi=K([H(`lucarne-skeleton-day-column`)],hi);var gi;function _i(e,t){return e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()&&e.getDate()===t.getDate()}var vi=(gi=class extends V{constructor(...e){super(...e),this.layout=null,this.bandStart=`07:00`,this.bandEnd=`21:00`,this.calendars=[],this.hourHeightPx=60,this.showCreateButton=!1,this.dayWidthPx=0,this.bufferDays=0,this.cachedDayKeys=/* @__PURE__ */ new Set}get _colorMap(){let e=/* @__PURE__ */ new Map;for(let t of this.calendars)e.set(t.entity,t.color);return e}_eventColor(e){var t;let n=this._colorMap;if((t=e.uid)!=null&&t.includes(`::`)){let t=e.uid.split(`::`)[0];return n.get(t)??`#a8d8b9`}return`#a8d8b9`}_onBandClick(e,t){if(!this.showCreateButton)return;let n=e.currentTarget.getBoundingClientRect(),[r]=this.bandStart.split(`:`).map(Number),[i]=this.bandEnd.split(`:`).map(Number),a=i-r,o=r+Math.max(0,Math.min(1,(e.clientY-n.top)/n.height))*a,s=Math.min(i-1,Math.round(o*2)/2);this.dispatchEvent(new CustomEvent(`lucarne-create-event-tap`,{detail:{day:t,startHour:s},bubbles:!0,composed:!0}))}_buildEventColorMap(e){let t=/* @__PURE__ */ new Map;for(let n of e)t.set(n.uid??``,this._eventColor(n));return t}_renderDayColumn(e,t){if(!this.layout)return I``;let n=q(e),r=this.layout.perDay.get(n);if(!r)return I``;let i=wt(this.bandStart,this.bandEnd),a=(i.length-1)*this.hourHeightPx,o=_i(e,t),[s]=this.bandStart.split(`:`).map(Number),[c]=this.bandEnd.split(`:`).map(Number),l=(c-s)*36e5,u=null;if(o){let n=new Date(e);n.setHours(s,0,0,0);let r=new Date(e);r.setHours(c,0,0,0),t>=n&&t<=r&&(u=(t.getTime()-n.getTime())/l*100)}let d=this._buildEventColorMap([...r.inBand.map(e=>e.event),...r.earlier,...r.later]);return I`
      <div class="day-col-wrapper">
        ${r.earlier.length>0?I`
              <div class="stub-area-top">
                <lucarne-out-of-band-stub
                  .events=${r.earlier}
                  label="earlier"
                  .eventColors=${d}
                ></lucarne-out-of-band-stub>
              </div>
            `:``}

        <div
          class="day-col"
          style="height:${a}px${this.showCreateButton?`; cursor: crosshair`:``}"
          @click=${t=>this._onBandClick(t,e)}
        >
          ${i.slice(0,-1).map((e,t)=>I`
              <div
                class="hour-line"
                style="top: ${(t+1)/(i.length-1)*100}%"
              ></div>
            `)}

          ${u===null?``:I`<div class="now-line" style="top:${u}%"></div>`}

          ${r.inBand.map(e=>{let t=100/e.laneCount,n=e.lane/e.laneCount*100,r=this._eventColor(e.event);return I`
              <lucarne-calendar-event-block
                style="
                  position: absolute;
                  top: ${e.topPercent}%;
                  left: calc(${n}% + 1px);
                  width: calc(${t}% - 2px);
                  height: ${e.heightPercent}%;
                  z-index: ${e.lane+1};
                  background: ${r}cc;
                  border-left-color: ${r};
                "
                .event=${e.event}
                .color=${r}
                .lane=${e.lane}
                .laneCount=${e.laneCount}
                .topPercent=${e.topPercent}
                .heightPercent=${e.heightPercent}
              ></lucarne-calendar-event-block>
            `})}
        </div>

        ${r.later.length>0?I`
              <div class="stub-area-bottom">
                <lucarne-out-of-band-stub
                  .events=${r.later}
                  label="tonight"
                  .eventColors=${d}
                ></lucarne-out-of-band-stub>
              </div>
            `:``}
      </div>
    `}render(){if(!this.layout)return I`<div>Loading…</div>`;let e=/* @__PURE__ */ new Date,t=wt(this.bandStart,this.bandEnd),n=(t.length-1)*this.hourHeightPx,r=new Intl.DateTimeFormat(`en-US`,{weekday:`short`}),i={"--lucarne-day-render-count":String(this.layout.days.length)};return this.dayWidthPx>0&&(i[`--lucarne-day-width-px`]=`${this.dayWidthPx}px`,i[`--lucarne-day-baseline-px`]=`${-this.bufferDays*this.dayWidthPx}px`),I`
      <div class="grid-wrapper" style=${oi(i)}>
        <!-- Sticky head: day names + all-day rows stay pinned while the time band scrolls -->
        <div class="grid-head">
          <!-- Time-column gutter cells (col 1): stay fixed during pan -->
          <div class="header-spacer"></div>

          <!-- Day header track -->
          <div class="day-cols-track" style="grid-row:1">
            ${this.layout.days.map((t,n)=>I`
                <div
                  class="day-header ${_i(t,e)?`today`:``}"
                  style="grid-column: ${n+1}"
                >
                  <div class="day-pill">
                    <span class="day-weekday">${r.format(t)}</span>
                    <span class="day-num">${t.getDate()}</span>
                  </div>
                </div>
              `)}
          </div>

          <div class="allday-spacer">all-day</div>

          <!-- All-day event track (wrapped in .day-cols-clip — see CSS) -->
          <div class="day-cols-clip" style="grid-row:2">
            <div class="day-cols-track">
              ${this.layout.days.map((e,t)=>{let n=q(e),r=this.cachedDayKeys.has(n),i=this.layout.perDay.get(n);return I`
                  <div class="allday-cell" style="grid-column: ${t+1}">
                    ${r?((i==null?void 0:i.allDay)??[]).map(e=>{var t;let n=i==null||(t=i.allDayClipped)==null?void 0:t.get(Ft(e));return I`
                            <div
                              class="allday-event"
                              style="background: ${this._eventColor(e)}cc"
                              @click=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent(`lucarne-event-tap`,{detail:{event:e,color:this._eventColor(e)},bubbles:!0,composed:!0}))}}
                            >
                              ${n!=null&&n.left?I`<span class="clip-chevron">‹</span>`:``}${e.summary}${n!=null&&n.right?I`<span class="clip-chevron">›</span>`:``}
                            </div>
                          `}):I`<div class="allday-skeleton"><div class="shimmer-sweep"></div></div>`}
                  </div>
                `})}
            </div>
          </div>
        </div>

        <div class="grid-body">
          <div class="time-col" style="height:${n}px">
            ${t.map((e,n)=>I`
                <div
                  class="hour-label ${n===0?`first`:``}"
                  style="top: ${n/(t.length-1)*100}%"
                >
                  ${e===0||e===24?`12 AM`:e<12?`${e} AM`:e===12?`12 PM`:`${e-12} PM`}
                </div>
              `)}
          </div>

          <!-- Time-band columns track -->
          <div class="day-cols-track">
            ${this.layout.days.map((t,n)=>{let r=q(t),i=this.cachedDayKeys.has(r);return I`
                <div style="grid-column:${n+1}; position:relative; overflow:visible; display:flex; flex-direction:column;">
                  ${i?this._renderDayColumn(t,e):I`<lucarne-skeleton-day-column
                        .bandStart=${this.bandStart}
                        .bandEnd=${this.bandEnd}
                        .hourHeightPx=${this.hourHeightPx}
                      ></lucarne-skeleton-day-column>`}
                </div>
              `})}
          </div>
        </div>
      </div>
    `}},gi.styles=[G,P`
      :host {
        display: block;
        position: relative;
      }
      /*
       * Two stacked blocks, not one 3-row grid: .grid-head (day names +
       * all-day) is position:sticky so both rows stay pinned while the time
       * band scrolls under it (issue #82). Both blocks declare the same
       * grid-template-columns, which is what keeps the gutter and the day
       * columns aligned across the split.
       *
       * Why one block rather than two sticky rows: sticky siblings all resolve
       * top against the same scrollport, so a sticky all-day row would need
       * top = height-of-the-day-name-row to sit below the headers instead of
       * under them — a hard-coded offset that breaks as soon as the header's
       * font, padding, or the narrow-column layout changes its height. One
       * sticky block pins both rows at top: 0 with no measurement.
       *
       * The wrapper must stay overflow-visible and span the full content
       * height: it is the sticky element's containing block, so it defines how
       * far the head may travel.
       */
      .grid-wrapper {
        display: block;
      }
      /* minmax(0, 1fr) prevents the .day-cols-track (which is wider than 1fr
         when render buffer columns are present) from expanding the column. */
      .grid-head,
      .grid-body {
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr);
      }
      .grid-head {
        position: sticky;
        top: 0;
        z-index: 6;
        grid-template-rows: auto auto;
        /* Opaque: the time band scrolls underneath it. .day-header and the two
           gutter spacers paint their own surface, but .allday-cell does not. */
        background: var(--lucarne-surface);
      }
      /*
       * Wraps ONLY the all-day .day-cols-track in a column-2-scoped
       * overflow:hidden box (issue #3). On iPad Safari the gutter spacer
       * wasn't reliably stacking above the all-day track's transform-induced
       * stacking context, so all-day events bled across the hour column during
       * pan. Clipping at the column boundary fixes it unconditionally and
       * browser-agnostic.
       *
       * Why the all-day row only:
       *  - The day-name row's events are the headers themselves, which never
       *    overflow their column.
       *  - The time-band row contains <lucarne-out-of-band-stub> whose
       *    backdrop/popover are position: fixed. Because .day-cols-track has a
       *    transform, it is the containing block for those fixed children;
       *    clipping it would also clip the stub's full-viewport overlay.
       *  - The time band's regular events already don't bleed past the gutter
       *    (the .time-col sticky spacer plus the .day-col isolation: isolate
       *    keep them stacked correctly).
       */
      .day-cols-clip {
        grid-column: 2;
        overflow: hidden;
        min-width: 0;
      }
      /*
       * Three .day-cols-track elements — day names, all-day, time band — so that
       * each row is sized by its own day-column content. All three receive the
       * same translateX during pan. Using a single spanning element would
       * decouple the inner sub-grid row sizing from the outer rows and cause the
       * time-column gutter labels to misalign with the day content (no CSS
       * subgrid on Safari < 16).
       *
       * Track is rendered at fixed px widths (--lucarne-day-render-count columns
       * × --lucarne-day-width-px each) so visible columns keep their target width
       * even with buffer days added on either side. The baseline transform shifts
       * the track left by bufferDays * dayWidthPx so visible day 0 lands at the
       * container's left edge. The pan handler overrides transform via inline
       * style during gestures; on snap completion it clears the inline style so
       * this CSS baseline reapplies (the new days then occupy the same screen
       * position as the OLD days at the snap target — visually invisible swap).
       *
       * The day-name and time-band tracks sit directly in grid-column 2; the
       * all-day track is wrapped in a .day-cols-clip first (see the
       * .day-cols-clip rule above for why only that one needs the wrapper).
       */
      .day-cols-track {
        grid-column: 2;
        display: grid;
        grid-template-columns: repeat(var(--lucarne-day-render-count, 7), var(--lucarne-day-width-px, 140px));
        width: calc(var(--lucarne-day-render-count, 7) * var(--lucarne-day-width-px, 140px));
        transform: translateX(var(--lucarne-day-baseline-px, 0px));
        will-change: transform;
      }
      /*
       * Reset grid-column on the inner track when it's inside a clip wrapper —
       * the wrapper already owns grid-column 2; the track is now a normal block
       * child of the wrapper, not a grid item.
       */
      .day-cols-clip > .day-cols-track {
        grid-column: auto;
      }
      /* Header row: day names */
      .header-spacer {
        grid-column: 1;
        grid-row: 1;
        /* sticky (not relative) so the gutter cells hold column 1 alongside
           .time-col if scrollLeft ever leaves 0 — overflow-x: hidden still
           scrolls programmatically, e.g. when focus moves to an off-screen
           buffer day. z-index keeps this painted over the day-name track, which
           is wider than its column while buffer days are rendered. */
        position: sticky;
        left: 0;
        z-index: 4;
        background: var(--lucarne-surface);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        border-right: 1px solid rgba(0, 0, 0, 0.07);
      }
      .day-header {
        text-align: center;
        padding: var(--lucarne-spacing-xs) 2px;
        font-size: var(--lucarne-fs-sm);
        font-weight: 700;
        color: var(--lucarne-on-surface-muted);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        user-select: none;
        background: var(--lucarne-surface);
        /* Container query target: lets the @container rule below hide the
           weekday when the column itself becomes too narrow. inline-size
           queries the header's inline width, which equals --lucarne-day-width-px. */
        container-type: inline-size;
      }
      .day-header .day-pill {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        line-height: 1.1;
        max-width: 100%;
      }
      .day-header .day-weekday {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
      }
      .day-header .day-num {
        font-size: var(--lucarne-fs-md);
        font-weight: 700;
      }
      .day-header.today .day-pill {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      /* Narrow column: drop the weekday name so the day number still fits
         comfortably inside the pill. 70px ≈ enough for "30" with padding;
         below that "Sun 30" wraps or overflows. */
      @container (max-width: 70px) {
        .day-header .day-weekday {
          display: none;
        }
      }
      /* All-day row */
      .allday-spacer {
        grid-column: 1;
        grid-row: 2;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        font-size: 0.65rem;
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        min-height: 24px;
        /* Sticky for the same reason as .header-spacer above. */
        position: sticky;
        left: 0;
        z-index: 2;
        background: var(--lucarne-surface);
      }
      .allday-cell {
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        padding: 2px 1px;
        min-height: 24px;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .allday-skeleton {
        height: 18px;
        border-radius: 3px;
        margin: 2px 4px;
        background: var(--lucarne-skeleton-base);
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }
      .shimmer-sweep {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--lucarne-skeleton-highlight) 50%,
          transparent 100%
        );
        animation: allday-shimmer 3s ease-in-out infinite;
      }
      @keyframes allday-shimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .shimmer-sweep {
          display: none;
        }
      }
      .allday-event {
        font-size: 0.7rem;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 3px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: rgba(0, 0, 0, 0.8);
      }
      .clip-chevron {
        font-style: normal;
        margin: 0 1px;
        opacity: 0.7;
      }
      /* Time grid */
      .time-col {
        grid-column: 1;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        position: sticky;
        left: 0;
        z-index: 2;
        background: var(--lucarne-surface);
      }
      .hour-label {
        position: absolute;
        right: 6px;
        font-size: 0.68rem;
        color: var(--lucarne-on-surface-muted);
        transform: translateY(-50%);
        white-space: nowrap;
        user-select: none;
      }
      /* The band's first label sits at top:0, so centring it on the line pushes
         half of it above the time column — where the sticky head now paints over
         it. Hang it below the line instead so it stays fully readable. */
      .hour-label.first {
        transform: none;
      }
      .day-col {
        position: relative;
        isolation: isolate;
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        overflow: visible;
        touch-action: manipulation;
      }
      .hour-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(0, 0, 0, 0.06);
        pointer-events: none;
      }
      .now-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: #e53935;
        z-index: 5;
        pointer-events: none;
      }
      .now-line::before {
        content: '';
        position: absolute;
        left: -4px;
        top: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #e53935;
      }
      .day-col-wrapper {
        display: flex;
        flex-direction: column;
      }
      .stub-area-top {
        padding: 2px 2px 0;
        flex-shrink: 0;
      }
      .stub-area-bottom {
        padding: 0 2px 2px;
        flex-shrink: 0;
      }
    `],gi);K([U({type:Object})],vi.prototype,`layout`,void 0),K([U({type:String})],vi.prototype,`bandStart`,void 0),K([U({type:String})],vi.prototype,`bandEnd`,void 0),K([U({type:Array})],vi.prototype,`calendars`,void 0),K([U({type:Number})],vi.prototype,`hourHeightPx`,void 0),K([U({type:Boolean})],vi.prototype,`showCreateButton`,void 0),K([U({type:Number})],vi.prototype,`dayWidthPx`,void 0),K([U({type:Number})],vi.prototype,`bufferDays`,void 0),K([U({attribute:!1})],vi.prototype,`cachedDayKeys`,void 0),vi=K([H(`lucarne-calendar-grid`)],vi);var yi=500;function bi(e,t,n){return t<=0?0:Math.abs(n)>=yi?n>0?Math.ceil(e/t):Math.floor(e/t):Math.round(e/t)}function xi(e,t){if(Math.abs(e)<=t)return e;let n=Math.abs(e)-t;return Math.sign(e)*(t+n*.33)}var Si=class extends V{constructor(...e){super(...e),this.dayWidthPx=0,this.bufferDays=0,this.canPanBack=!0,this.canPanForward=!0,this._startX=0,this._startY=0,this._startTime=0,this._isDragging=!1,this._cachedTargets=[]}get _panTargets(){var e,t;let n=(e=this._slot)==null?void 0:e.assignedElements()[0];return n?Array.from(((t=n.shadowRoot)==null?void 0:t.querySelectorAll(`.day-cols-track`))??[]):[]}_cachePanTargets(){this._cachedTargets=this._panTargets}_applyRubberBand(e){return e>0&&!this.canPanBack||e<0&&!this.canPanForward?xi(e,0):e}_baselinePx(){return-this.bufferDays*this.dayWidthPx}_setTranslate(e){let t=this._baselinePx()+e;for(let e of this._cachedTargets)e.style.transition=``,e.style.transform=`translateX(${t}px)`}_clearInlineTransform(){for(let e of this._panTargets)e.style.transition=``,e.style.transform=``}_cancelPendingSnap(){this._pendingTransitionEnd&&this._pendingSnapTarget&&this._pendingSnapTarget.removeEventListener(`transitionend`,this._pendingTransitionEnd),this._pendingTransitionEnd=void 0,this._pendingSnapTarget=void 0,this._pendingClearRaf!==void 0&&(cancelAnimationFrame(this._pendingClearRaf),this._pendingClearRaf=void 0)}_scheduleClearInline(){this._pendingClearRaf!==void 0&&cancelAnimationFrame(this._pendingClearRaf),this._pendingClearRaf=requestAnimationFrame(()=>{this._pendingClearRaf=void 0,this._clearInlineTransform()})}_snapAndCommit(e){let t=this._cachedTargets;if(t.length===0){e!==0&&(this._dispatchPanSnap(e),this._scheduleClearInline());return}this._cancelPendingSnap();let n=this._baselinePx();if(typeof window.matchMedia==`function`&&window.matchMedia(`(prefers-reduced-motion: reduce)`).matches){for(let e of t)e.style.transition=``,e.style.transform=`translateX(${n}px)`;e!==0&&this._dispatchPanSnap(e),this._scheduleClearInline();return}let r=`transform ${getComputedStyle(this).getPropertyValue(`--lucarne-pan-duration`).trim()||`240ms`} ${getComputedStyle(this).getPropertyValue(`--lucarne-pan-easing`).trim()||`cubic-bezier(0.32, 0.72, 0, 1)`}`,i=n+e*this.dayWidthPx;for(let e of t)e.style.transition=r,e.style.transform=`translateX(${i}px)`;let a=n=>{let r=n;r.target===t[0]&&(r.propertyName&&r.propertyName!==`transform`||(this._pendingTransitionEnd=void 0,t[0].removeEventListener(`transitionend`,a),e!==0&&this._dispatchPanSnap(e),this._scheduleClearInline()))};this._pendingSnapTarget=t[0],this._pendingTransitionEnd=a,t[0].addEventListener(`transitionend`,a)}_dispatchPanSnap(e){this.dispatchEvent(new CustomEvent(`pan-snap`,{detail:{deltaDays:e},bubbles:!0,composed:!0}))}_onPointerDown(e){(e.pointerType!==`mouse`||e.button===0)&&this._pointerId===void 0&&(this._cancelPendingSnap(),this._pointerId=e.pointerId,this._startX=e.clientX,this._startY=e.clientY,this._startTime=performance.now(),this._isDragging=!1,this._cachePanTargets())}_onPointerMove(e){if(e.pointerId!==this._pointerId)return;let t=e.clientX-this._startX,n=e.clientY-this._startY;if(!this._isDragging){if(Math.abs(t)<10&&Math.abs(n)<10)return;if(Math.abs(n)>Math.abs(t)){try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}this._pointerId=void 0;return}this._isDragging=!0;try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}let r=this._applyRubberBand(t);this._setTranslate(r)}_onPointerUp(e){if(e.pointerId===this._pointerId){try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}if(this._isDragging){let t=e.clientX-this._startX,n=performance.now()-this._startTime,r=n>0?t/n*1e3:0,i=bi(this._applyRubberBand(t),this.dayWidthPx,r);(i>0&&!this.canPanBack||i<0&&!this.canPanForward)&&(i=0),this._snapAndCommit(i)}this._pointerId=void 0,this._isDragging=!1,this._cachedTargets=[]}}render(){return I`
      <div
        class="pan-wrapper"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
      >
        <slot></slot>
      </div>
    `}},Ci=(Si.styles=P`
    :host {
      display: block;
      position: relative;
      /*
       * Deliberately NOT overflow: hidden. That makes the host a scroll
       * container, which then becomes the scrollport for every sticky
       * descendant — including the grid's sticky head, which would silently
       * stop sticking (issue #82). The card's .grid-area owns the clipping
       * instead (overflow-x: hidden), so the wider-than-viewport day track is
       * still cut off at the card edge.
       */
    }
    .pan-wrapper {
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      position: relative;
    }
    ::slotted(*) {
      display: block;
    }
  `,Si);K([U({type:Number})],Ci.prototype,`dayWidthPx`,void 0),K([U({type:Number})],Ci.prototype,`bufferDays`,void 0),K([U({type:Boolean})],Ci.prototype,`canPanBack`,void 0),K([U({type:Boolean})],Ci.prototype,`canPanForward`,void 0),K([ut(`slot`)],Ci.prototype,`_slot`,void 0),Ci=K([H(`lucarne-calendar-day-pan`)],Ci);function wi(e,t){if(e instanceof Error)return Ti(e.message)??t;if(typeof e==`string`)return Ti(e)??t;if(typeof e==`object`&&e&&Object.prototype.hasOwnProperty.call(e,`message`)){let{message:n}=e;if(typeof n==`string`)return Ti(n)??t}return t}function Ti(e){return e.trim()?e:void 0}var Ei;function Di(e){return new Date(e).toLocaleString(`en-US`,{weekday:`short`,month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`,hour12:!0})}var Oi=(Ei=class extends V{constructor(...e){super(...e),this.event=null,this.color=`#a8d8b9`,this.calendarLabel=``,this.entityId=``,this._confirmingDelete=!1,this._deleting=!1,this._deleteError=``}_close(){this.dispatchEvent(new CustomEvent(`popover-close`,{bubbles:!0,composed:!0}))}_isRecurring(e){return!!e.rrule||!!e.recurrence_id}_hasSyntheticUid(e){if(!e)return!0;let t=e.includes(`::`)?e.split(`::`).slice(1).join(`::`):e;return t.startsWith(`syn:`)||t.startsWith(`pending:`)||t.length===0}_startDelete(){this._confirmingDelete=!0,this._deleteError=``}_cancelDelete(){this._confirmingDelete=!1}async _confirmDelete(){var e;if(!((e=this.event)!=null&&e.uid)||!this.entityId)return;this._deleting=!0,this._deleteError=``;let t=this.event.uid.includes(`::`)?this.event.uid.split(`::`).slice(1).join(`::`):this.event.uid;try{await yt(this.hass,this.entityId,t)}catch(e){this._deleteError=wi(e,`Failed to delete event`),this._deleting=!1,this._confirmingDelete=!1;return}this.dispatchEvent(new CustomEvent(`lucarne-event-deleted`,{detail:{entityId:this.entityId,uid:this.event.uid},bubbles:!0,composed:!0})),this._deleting=!1,this._confirmingDelete=!1}render(){if(!this.event)return I``;let e=this.event,t=e.start.length===10&&!e.start.includes(`T`)?`All day`:`${Di(e.start)} – ${new Date(e.end).toLocaleTimeString(`en-US`,{hour:`numeric`,minute:`2-digit`,hour12:!0})}`,n=this._hasSyntheticUid(e.uid),r=!!this.entityId&&!!e.uid&&this.hass!=null&&xt(this.hass,this.entityId)&&!this._isRecurring(e)&&!n,i=this._confirmingDelete?this._confirmDelete:this._startDelete,a=this._confirmingDelete?`Confirm delete`:`Delete event`;return I`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true">
        <div class="popover-header">
          <span class="color-dot" style="background:${this.color}"></span>
          <span class="event-title">${e.summary}</span>
          ${r?I`
                <button
                  class="icon-btn ${this._confirmingDelete?`armed`:``}"
                  @click=${i}
                  ?disabled=${this._deleting}
                  aria-label=${a}
                  title=${a}
                >🗑️</button>
              `:I`<span></span>`}
          <button class="icon-btn" @click=${this._close} aria-label="Close">✕</button>
        </div>

        ${this._confirmingDelete?I`
              <div class="confirm-pill" role="alert">
                <span>Tap 🗑️ again to delete this event.</span>
                <button
                  class="cancel-link"
                  @click=${this._cancelDelete}
                  ?disabled=${this._deleting}
                >Cancel</button>
              </div>
            `:``}

        <div class="detail-row">
          <em class="detail-icon">⏰</em>
          <span class="detail-text">${t}</span>
        </div>

        ${this.calendarLabel?I`
              <div class="detail-row">
                <em class="detail-icon">📅</em>
                <span class="calendar-label detail-text">
                  <span
                    style="width:10px;height:10px;border-radius:50%;background:${this.color};display:inline-block;flex-shrink:0"
                  ></span>
                  ${this.calendarLabel}
                </span>
              </div>
            `:``}

        ${e.location?I`
              <div class="detail-row">
                <em class="detail-icon">📍</em>
                <span class="detail-text">${e.location}</span>
              </div>
            `:``}

        ${e.description?I`
              <div class="detail-row">
                <em class="detail-icon">📝</em>
                <span class="detail-text">${e.description}</span>
              </div>
            `:``}

        ${this._deleteError?I`<div class="error-msg">${this._deleteError}</div>`:``}
      </div>
    `}},Ei.styles=[G,P`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 280px;
        max-width: min(480px, 90vw);
        z-index: 1;
      }
      .popover-header {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        column-gap: var(--lucarne-spacing-md);
        align-items: center;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .color-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .event-title {
        font-size: var(--lucarne-fs-xl);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        line-height: 1.25;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.5rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
        line-height: 1;
      }
      .icon-btn:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      .icon-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .icon-btn.armed {
        background: rgba(198, 40, 40, 0.12);
      }
      .confirm-pill {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--lucarne-spacing-sm);
        background: rgba(198, 40, 40, 0.08);
        color: #b71c1c;
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 12px;
        font-size: var(--lucarne-fs-md);
        font-weight: 600;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .confirm-pill .cancel-link {
        background: none;
        border: none;
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        cursor: pointer;
        text-decoration: underline;
        padding: 4px 6px;
        margin-left: auto;
        min-height: 32px;
      }
      .confirm-pill .cancel-link:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .detail-row {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        align-items: center;
        margin-bottom: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface-muted);
        line-height: 1.4;
      }
      .detail-icon {
        flex-shrink: 0;
        font-style: normal;
        width: 22px;
        text-align: center;
        font-size: 1.1em;
      }
      .detail-text {
        color: var(--lucarne-on-surface);
      }
      .calendar-label {
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .error-msg {
        color: #b71c1c;
        font-size: var(--lucarne-fs-md);
        margin-top: var(--lucarne-spacing-sm);
      }
    `],Ei);K([U({attribute:!1})],Oi.prototype,`hass`,void 0),K([U({type:Object})],Oi.prototype,`event`,void 0),K([U({type:String})],Oi.prototype,`color`,void 0),K([U({type:String})],Oi.prototype,`calendarLabel`,void 0),K([U({type:String})],Oi.prototype,`entityId`,void 0),K([W()],Oi.prototype,`_confirmingDelete`,void 0),K([W()],Oi.prototype,`_deleting`,void 0),K([W()],Oi.prototype,`_deleteError`,void 0),Oi=K([H(`lucarne-calendar-event-popover`)],Oi);var ki;function Ai(e,t){let n=-(/* @__PURE__ */ new Date(`${e}T${t}:00`)).getTimezoneOffset();return`${e}T${t}:00${n>=0?`+`:`-`}${Math.floor(Math.abs(n)/60).toString().padStart(2,`0`)}:${(Math.abs(n)%60).toString().padStart(2,`0`)}`}function ji(e){return`${Math.floor(e).toString().padStart(2,`0`)}:${e%1==.5?`30`:`00`}`}function Mi(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}var Y=(ki=class extends V{constructor(...e){super(...e),this.day=null,this.startHour=9,this.calendars=[],this._title=``,this._calendarEntityId=``,this._date=``,this._startTime=``,this._endTime=``,this._allDay=!1,this._description=``,this._location=``,this._error=``,this._saving=!1}updated(e){super.updated(e),(e.has(`day`)||e.has(`startHour`))&&this._initDefaults()}_initDefaults(){var e;let t=this.day??/* @__PURE__ */ new Date;this._date=Mi(t),this._startTime=ji(Math.max(0,Math.min(23,this.startHour)));let n=Math.min(24,this.startHour+1);this._endTime=ji(n<24?n:23.5),this._calendarEntityId=((e=this.calendars[0])==null?void 0:e.entity)??``,this._title=``,this._allDay=!1,this._description=``,this._location=``,this._error=``,this._saving=!1}_close(){this.dispatchEvent(new CustomEvent(`popover-close`,{bubbles:!0,composed:!0}))}async _create(){if(this._saving)return;if(!this._title.trim()){this._error=`Title is required`;return}if(!this._allDay&&this._startTime>=this._endTime){this._error=`End time must be after start time`;return}this._saving=!0,this._error=``;let e={summary:this._title.trim()};this._description.trim()&&(e.description=this._description.trim()),this._location.trim()&&(e.location=this._location.trim());let t,n;if(this._allDay){e.start_date=this._date;let r=/* @__PURE__ */ new Date(`${this._date}T00:00:00`);r.setDate(r.getDate()+1);let i=Mi(r);e.end_date=i,t=this._date,n=i}else{let r=Ai(this._date,this._startTime),i=Ai(this._date,this._endTime);e.start_date_time=r,e.end_date_time=i,t=r,n=i}try{await this.hass.callService(`calendar`,`create_event`,e,{entity_id:this._calendarEntityId})}catch(e){this._error=wi(e,`Failed to create event`),this._saving=!1;return}this.dispatchEvent(new CustomEvent(`lucarne-event-created`,{detail:{entityId:this._calendarEntityId,event:{summary:this._title.trim(),start:t,end:n,description:this._description.trim()||void 0,location:this._location.trim()||void 0,uid:`${this._calendarEntityId}::pending:${t}|${n}|${this._title.trim()}`,pending:!0}},bubbles:!0,composed:!0}))}render(){return this.calendars.length?I`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Create event">
        <div class="popover-header">
          <h2 class="popover-title">New Event</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label for="ce-title">Title *</label>
          <input
            id="ce-title"
            type="text"
            placeholder="Event title"
            .value=${this._title}
            @input=${e=>this._title=e.target.value}
            @keydown=${e=>e.key===`Enter`&&this._create()}
          />
        </div>

        <div class="field">
          <label for="ce-calendar">Calendar</label>
          <select
            id="ce-calendar"
            .value=${this._calendarEntityId}
            @change=${e=>this._calendarEntityId=e.target.value}
          >
            ${this.calendars.map(e=>I`<option value=${e.entity}>${e.label}</option>`)}
          </select>
        </div>

        <div class="field">
          <label for="ce-date">Date</label>
          <input
            id="ce-date"
            type="date"
            .value=${this._date}
            @change=${e=>this._date=e.target.value}
          />
        </div>

        <div class="allday-row">
          <input
            id="ce-allday"
            type="checkbox"
            .checked=${this._allDay}
            @change=${e=>this._allDay=e.target.checked}
          />
          <label for="ce-allday" style="margin:0; font-weight:400; color:var(--lucarne-on-surface)">All day</label>
        </div>

        ${this._allDay?``:I`
              <div class="time-row">
                <div class="field">
                  <label for="ce-start">Start</label>
                  <input
                    id="ce-start"
                    type="time"
                    .value=${this._startTime}
                    @change=${e=>this._startTime=e.target.value}
                  />
                </div>
                <div class="field">
                  <label for="ce-end">End</label>
                  <input
                    id="ce-end"
                    type="time"
                    .value=${this._endTime}
                    @change=${e=>this._endTime=e.target.value}
                  />
                </div>
              </div>
            `}

        <div class="field">
          <label for="ce-location">Location</label>
          <input
            id="ce-location"
            type="text"
            placeholder="Optional"
            .value=${this._location}
            @input=${e=>this._location=e.target.value}
          />
        </div>

        <div class="field">
          <label for="ce-description">Description</label>
          <textarea
            id="ce-description"
            placeholder="Optional"
            .value=${this._description}
            @input=${e=>this._description=e.target.value}
          ></textarea>
        </div>

        ${this._error?I`<div class="error-msg">${this._error}</div>`:``}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button class="btn btn-create" ?disabled=${this._saving} @click=${this._create}>
            ${this._saving?`Creating…`:`Create`}
          </button>
        </div>
      </div>
    `:I``}},ki.styles=[G,P`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        z-index: 1;
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .popover-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
      }
      .close-btn:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      .field {
        margin-bottom: var(--lucarne-spacing-md);
      }
      label {
        display: block;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin-bottom: 4px;
      }
      input[type='text'],
      input[type='date'],
      input[type='time'],
      select,
      textarea {
        appearance: none;
        -webkit-appearance: none;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 10px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        background: var(--lucarne-surface);
        min-height: 44px;
        font-family: inherit;
      }
      input[type='date']::-webkit-date-and-time-value,
      input[type='time']::-webkit-date-and-time-value {
        text-align: left;
      }
      input[type='date']::-webkit-calendar-picker-indicator,
      input[type='time']::-webkit-calendar-picker-indicator {
        opacity: 0.6;
      }
      input:focus,
      select:focus,
      textarea:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      textarea {
        min-height: 64px;
        resize: vertical;
      }
      .time-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lucarne-spacing-sm);
      }
      .allday-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        margin-bottom: var(--lucarne-spacing-md);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
      }
      .allday-row input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .allday-row input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .allday-row input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .error-msg {
        color: #c62828;
        font-size: var(--lucarne-fs-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        padding: 6px 10px;
        background: #ffebee;
        border-radius: var(--lucarne-radius-sm);
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
      .btn {
        padding: 8px 20px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        min-height: 44px;
        min-width: 80px;
      }
      .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
      }
      .btn-create {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-create:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `],ki);K([U({attribute:!1})],Y.prototype,`hass`,void 0),K([U({type:Object})],Y.prototype,`day`,void 0),K([U({type:Number})],Y.prototype,`startHour`,void 0),K([U({type:Array})],Y.prototype,`calendars`,void 0),K([W()],Y.prototype,`_title`,void 0),K([W()],Y.prototype,`_calendarEntityId`,void 0),K([W()],Y.prototype,`_date`,void 0),K([W()],Y.prototype,`_startTime`,void 0),K([W()],Y.prototype,`_endTime`,void 0),K([W()],Y.prototype,`_allDay`,void 0),K([W()],Y.prototype,`_description`,void 0),K([W()],Y.prototype,`_location`,void 0),K([W()],Y.prototype,`_error`,void 0),K([W()],Y.prototype,`_saving`,void 0),Y=K([H(`lucarne-create-event-popover`)],Y);var Ni,Pi=6e4,Fi=4,Ii=60;window.customCards=window.customCards||[],window.customCards.push({type:`lucarne-calendar-card`,name:`Lucarne Calendar`,description:`Week view calendar with per-person color, visibility pills, and create-event flow`,preview:!0}),A(`evaluating:lucarne-calendar-card`);var X=(Ni=class extends ft{constructor(...e){super(...e),this._layout=null,this._visibleIds=/* @__PURE__ */ new Set,this._openEvent=null,this._openEventColor=``,this._openEventCalLabel=``,this._openEventEntityId=``,this._createDay=null,this._createStartHour=9,this._creatableCalendars=[],this._dayWidthPx=0,this._deletedUids=/* @__PURE__ */ new Set,this._pendingEvents=[],this._lastVisibleCount=3,this._didInitialScroll=!1,this._initialScrollScheduled=!1,this._initialScrollAttempts=0,this._autoFollow=!0,this._lastAutoScrollTop=null}applyConfig(e){if(!e.calendars||!Array.isArray(e.calendars)||e.calendars.length===0)throw new dt(`lucarne-calendar-card: "calendars" must be a non-empty array`);for(let t of e.calendars)if(!t||typeof t!=`object`||!t.entity||!t.color)throw new dt(`lucarne-calendar-card: each calendar requires "entity" and "color"`);let t=e;if(e.visible_hours){let n=/^\d{1,2}:\d{2}$/;if(!n.test(e.visible_hours.start)||!n.test(e.visible_hours.end))throw new dt(`lucarne-calendar-card: "visible_hours" start and end must be in HH:MM format`);let r=parseInt(e.visible_hours.start.split(`:`)[0],10),i=parseInt(e.visible_hours.end.split(`:`)[0],10);if(r<0||i>24||r>=i)throw new dt(`lucarne-calendar-card: "visible_hours" must satisfy 0 <= start < end <= 24`);t={...e,visible_hours:{start:`${String(r).padStart(2,`0`)}:00`,end:`${String(i).padStart(2,`0`)}:00`}}}let n=this._config;if(this._config=t,this._visibleIds=new Set(e.calendars.map(e=>e.entity)),this.hass&&this._updateCreatableCalendars(),this._rolling)this._rolling.updateCalendars(t.calendars),(n==null?void 0:n.render_buffer_days)!==t.render_buffer_days&&this._rolling.setBufferDays(t.render_buffer_days),((n==null?void 0:n.min_days)!==e.min_days||(n==null?void 0:n.max_days)!==e.max_days||(n==null?void 0:n.min_col_width)!==e.min_col_width||(n==null?void 0:n.max_col_width)!==e.max_col_width)&&this._onResize();else{let e=this._effectiveConfig();this._lastVisibleCount=e.minDays,this._rolling=new Zr(this,{calendars:t.calendars,visibleCount:e.minDays,bufferDays:t.render_buffer_days,onFetchComplete:(e,t)=>this._onFetchComplete(e,t),onChange:()=>this._recompute()})}}static getStubConfig(e){let t=Object.keys(e.states).filter(e=>e.startsWith(`calendar.`)).slice(0,3),n=[`#a8d8b9`,`#a8c5e8`,`#c8b4e0`],r=t.map((e,t)=>({entity:e,color:n[t]??`#a8d8b9`}));return{type:`custom:lucarne-calendar-card`,title:`Calendar`,calendars:r.length?r:[{entity:`calendar.example`,color:`#a8d8b9`}],visible_hours:{start:`07:00`,end:`21:00`},show_create_button:!0,min_days:3,max_days:7,min_col_width:140,max_col_width:220}}getCardSize(){return 6}getGridOptions(){return{columns:9,rows:`auto`,min_rows:4,min_columns:6,max_columns:12}}static getConfigElement(){return document.createElement(`lucarne-calendar-card-editor`)}connectedCallback(){super.connectedCallback(),this._previewOverrideRaf=requestAnimationFrame(()=>{this._previewOverrideRaf=void 0,this.isConnected&&(this._previewOverride=Yt(this))}),this._followTimer=setInterval(()=>this._followNow(),Pi),this._ensureGridMeasured()}disconnectedCallback(){var e;super.disconnectedCallback(),this._previewOverrideRaf!==void 0&&(cancelAnimationFrame(this._previewOverrideRaf),this._previewOverrideRaf=void 0),this._followTimer!==void 0&&(clearInterval(this._followTimer),this._followTimer=void 0),this._resetInitialScroll(),this._autoFollow=!0,this._lastAutoScrollTop=null,this._teardownGridObserver(),(e=this._previewOverride)==null||e.uninstall(),this._previewOverride=void 0}firstUpdated(){this._ensureGridMeasured()}_ensureGridMeasured(){let e=this._gridAreaEl;if(!e){this._observedGridEl!==void 0&&(this._teardownGridObserver(),this._resetInitialScroll());return}if(e===this._observedGridEl)return;let t=this._observedGridEl!==void 0;this._teardownGridObserver(),this._observedGridEl=e,typeof ResizeObserver<`u`&&(this._resizeObserver=new ResizeObserver(()=>this._onResize()),this._resizeObserver.observe(e)),t&&this._resetInitialScroll(),this._onResize()}_teardownGridObserver(){var e;(e=this._resizeObserver)==null||e.disconnect(),this._resizeObserver=void 0,this._observedGridEl=void 0}_resetInitialScroll(){this._initialScrollRaf!==void 0&&(cancelAnimationFrame(this._initialScrollRaf),this._initialScrollRaf=void 0),this._didInitialScroll=!1,this._initialScrollScheduled=!1,this._initialScrollAttempts=0}updated(e){super.updated(e),this._ensureGridMeasured(),!this._didInitialScroll&&!this._initialScrollScheduled&&this._layout&&this._dayWidthPx>0&&(this._initialScrollScheduled=!0,this._scheduleInitialScroll()),e.has(`hass`)&&this._config&&(this._rolling.setHass(this.hass),this._updateCreatableCalendars())}_scheduleInitialScroll(){this._initialScrollRaf=requestAnimationFrame(()=>{if(this._initialScrollRaf=void 0,!this.isConnected||this._didInitialScroll){this._initialScrollScheduled=!1;return}if(this._performAutoScroll(`auto`)){this._didInitialScroll=!0,this._initialScrollScheduled=!1;return}++this._initialScrollAttempts<Ii?this._scheduleInitialScroll():this._initialScrollScheduled=!1})}_performAutoScroll(e){var t,n,r,i;let a=this._gridAreaEl;if(!a||!this._config)return!1;let o=this.renderRoot.querySelector(`lucarne-calendar-grid`),s=o==null||(t=o.shadowRoot)==null?void 0:t.querySelector(`.time-col`);if(!s)return!1;let c=o==null||(n=o.shadowRoot)==null?void 0:n.querySelector(`.grid-head`),l=a.getBoundingClientRect(),u=s.getBoundingClientRect();if(u.height<=0)return!1;let[d]=(((r=this._config.visible_hours)==null?void 0:r.start)??`07:00`).split(`:`).map(Number),[f]=(((i=this._config.visible_hours)==null?void 0:i.end)??`21:00`).split(`:`).map(Number),p=f-d;if(p<=0)return!1;let m=Qr({now:/* @__PURE__ */ new Date,bandStartH:d,bandEndH:f,timeGridTopPx:u.top-l.top+a.scrollTop,timeGridHeightPx:u.height,paddingPx:u.height/p,stickyHeadPx:(c==null?void 0:c.getBoundingClientRect().height)??0,maxScrollTop:a.scrollHeight-a.clientHeight});return a.scrollTo({top:m,behavior:e}),this._lastAutoScrollTop=m,!0}_followNow(){var e;if(!this._autoFollow||!((e=this._rolling)!=null&&e.isAtToday)||typeof document<`u`&&document.visibilityState===`hidden`)return;let t=this._gridAreaEl;if(t){if(this._lastAutoScrollTop!==null&&Math.abs(t.scrollTop-this._lastAutoScrollTop)>Fi){this._autoFollow=!1;return}this._performAutoScroll(`smooth`)}}_onTodayClick(){this._rolling.goToToday(),this._autoFollow=!0,this.updateComplete.then(()=>requestAnimationFrame(()=>this._performAutoScroll(`smooth`)))}_effectiveConfig(){let e=this._config;return{minDays:e.min_days&&e.min_days>0?e.min_days:3,maxDays:e.max_days&&e.max_days>0?e.max_days:7,minColWidth:e.min_col_width&&e.min_col_width>0?e.min_col_width:140,maxColWidth:e.max_col_width&&e.max_col_width>0?e.max_col_width:220,timeColWidth:40}}_onResize(){this._resizeFrame===void 0&&(this._resizeFrame=requestAnimationFrame(()=>{var e;this._resizeFrame=void 0;let{visibleCount:t,dayWidthPx:n}=Kr(((e=this._gridAreaEl)==null?void 0:e.getBoundingClientRect().width)??0,this._effectiveConfig());t!==this._lastVisibleCount&&(this._lastVisibleCount=t,this._rolling.setVisibleCount(t),this.style.setProperty(`--lucarne-day-count`,String(t))),this._dayWidthPx=n}))}_recompute(){var e,t;if(!this._config)return;let n=[];for(let[e,t]of this._rolling.cachedEvents.entries())this._visibleIds.has(e)&&n.push(...t);n.push(...this._pendingEvents.filter(e=>{var t;let n=(t=e.uid)==null?void 0:t.split(`::`)[0];return!n||this._visibleIds.has(n)}));let r=this._deletedUids.size>0?n.filter(e=>!e.uid||!this._deletedUids.has(e.uid)):n,i=((e=this._config.visible_hours)==null?void 0:e.start)??`07:00`,a=((t=this._config.visible_hours)==null?void 0:t.end)??`21:00`,o=this._rolling.renderDays;this._layout=Rt(r,o,i,a)}_supportsCreate(e){var t;let n=(t=this.hass)==null||(t=t.states[e])==null||(t=t.attributes)==null?void 0:t.supported_features;return n!==void 0&&!!(n&1)}_updateCreatableCalendars(){if(!this._config||!this.hass)return;let e=this._config.calendars.filter(e=>this._supportsCreate(e.entity));e.length===this._creatableCalendars.length&&e.every((e,t)=>{var n;return e.entity===((n=this._creatableCalendars[t])==null?void 0:n.entity)})||(this._creatableCalendars=e)}_onVisibilityChange(e){this._visibleIds=e.detail,this._recompute()}_onEventTap(e){var t;let{event:n,color:r}=e.detail;if(this._openEvent=n,this._openEventColor=r,(t=n.uid)!=null&&t.includes(`::`)){var i;let e=n.uid.split(`::`)[0];this._openEventEntityId=e;let t=(i=this._config)==null?void 0:i.calendars.find(t=>t.entity===e);this._openEventCalLabel=t?Wr(t,this.hass):``}else this._openEventEntityId=``,this._openEventCalLabel=``}_onEventDeleted(e){this._deletedUids=/* @__PURE__ */ new Set([...this._deletedUids,e.detail.uid]),this._openEvent=null,this._openEventEntityId=``,this._recompute()}_onFetchComplete(e,t){if(this._pendingEvents=[],this._deletedUids.size>0){let n=/* @__PURE__ */ new Set;for(let t of e.values())for(let e of t)e.uid&&n.add(e.uid);let r=/* @__PURE__ */ new Set;for(let e of this._deletedUids){let i=e.includes(`::`)?e.split(`::`)[0]:``;(t.has(i)||n.has(e))&&r.add(e)}this._deletedUids=r}this._recompute()}_closePopover(){this._openEvent=null}_onCreateEventTap(e){let{day:t,startHour:n}=e.detail;this._createDay=t,this._createStartHour=n}_closeCreatePopover(){this._createDay=null}_onEventCreated(e){let{event:t}=e.detail;this._pendingEvents=[...this._pendingEvents,t],this._recompute(),this._closeCreatePopover()}_rangeLabel(){let e=this._rolling.days;if(e.length===0)return``;let t=e[0],n=e[e.length-1],r=(e,t)=>e.toLocaleDateString(`en-US`,t),i=t.getMonth()===n.getMonth()&&t.getFullYear()===n.getFullYear(),a=t.getFullYear()===n.getFullYear();return i?`${r(t,{month:`short`,day:`numeric`})} – ${r(n,{day:`numeric`})}`:a?`${r(t,{month:`short`,day:`numeric`})} – ${r(n,{month:`short`,day:`numeric`})}`:`${r(t,{month:`short`,day:`numeric`,year:`numeric`})} – ${r(n,{month:`short`,day:`numeric`,year:`numeric`})}`}renderContent(){var e,t;if(!this._config)return I``;let n=((e=this._config.visible_hours)==null?void 0:e.start)??`07:00`,r=((t=this._config.visible_hours)==null?void 0:t.end)??`21:00`,i=Gr(this._config.calendars,this.hass),a=Gr(this._creatableCalendars,this.hass);return I`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${this._config.title??`Calendar`}</h2>
          <div class="week-nav">
            <button
              class="nav-btn"
              @click=${()=>this._rolling.pan(-this._lastVisibleCount)}
              ?disabled=${!this._rolling.canPanBack}
              aria-label="Previous ${this._lastVisibleCount} days"
            >←</button>
            ${this._rolling.isAtToday?``:I`<button class="nav-btn" @click=${()=>this._onTodayClick()} aria-label="Today">Today</button>`}
            <span class="week-label">${this._rangeLabel()}</span>
            <button
              class="nav-btn"
              @click=${()=>this._rolling.pan(+this._lastVisibleCount)}
              ?disabled=${!this._rolling.canPanForward}
              aria-label="Next ${this._lastVisibleCount} days"
            >→</button>
          </div>
        </div>

        <div class="pills-row">
          <lucarne-visibility-pills
            .calendars=${i}
            .visibleIds=${this._visibleIds}
            @visibility-change=${this._onVisibilityChange}
          ></lucarne-visibility-pills>
        </div>

        <div
          class="grid-area"
          @lucarne-event-tap=${this._onEventTap}
          @lucarne-create-event-tap=${this._onCreateEventTap}
        >
          <lucarne-calendar-day-pan
            .dayWidthPx=${this._dayWidthPx}
            .bufferDays=${this._rolling.bufferDays}
            .canPanBack=${this._rolling.canPanBack}
            .canPanForward=${this._rolling.canPanForward}
            @pan-snap=${e=>this._rolling.pan(-e.detail.deltaDays)}
          >
            <lucarne-calendar-grid
              .layout=${this._layout}
              .bandStart=${n}
              .bandEnd=${r}
              .calendars=${i}
              .dayWidthPx=${this._dayWidthPx}
              .bufferDays=${this._rolling.bufferDays}
              .cachedDayKeys=${new Set(this._rolling.cachedRange.map(q))}
              .showCreateButton=${(this._config.show_create_button??!0)&&this._creatableCalendars.length>0}
            ></lucarne-calendar-grid>
          </lucarne-calendar-day-pan>
        </div>

        ${this._openEvent?I`
              <lucarne-calendar-event-popover
                .event=${this._openEvent}
                .color=${this._openEventColor}
                .calendarLabel=${this._openEventCalLabel}
                .hass=${this.hass}
                .entityId=${this._openEventEntityId}
                @popover-close=${this._closePopover}
                @lucarne-event-deleted=${this._onEventDeleted}
              ></lucarne-calendar-event-popover>
            `:``}

        ${this._createDay===null?``:I`
              <lucarne-create-event-popover
                .hass=${this.hass}
                .day=${this._createDay}
                .startHour=${this._createStartHour}
                .calendars=${a}
                @popover-close=${this._closeCreatePopover}
                @lucarne-event-created=${this._onEventCreated}
              ></lucarne-create-event-popover>
            `}
      </ha-card>
    `}},Ni.styles=[G,P`
      :host {
        display: block;
        height: 100%;
        font-family: var(--primary-font-family, sans-serif);
      }
      /* Fill HA's grid cell: a fixed row count gives it a height, and at Auto
         height 100% resolves to auto, so the card sizes to its content — the
         same rule HA's own cards use (issue #156). */
      ha-card {
        height: 100%;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      /* fill_viewport: the kiosk layout, sharing its height with the Today card.
         A height, not a min-height, which would let the tall time grid push the
         card open. max-height lets a fixed row count win — at Auto height it
         resolves to none. */
      :host([fill-viewport]) ha-card {
        height: var(--lucarne-card-fill-height);
        max-height: 100%;
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-xs);
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .week-nav {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-xs);
      }
      .nav-btn {
        background: none;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: var(--lucarne-radius-sm);
        padding: 4px 10px;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
      .nav-btn:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.04);
      }
      .nav-btn:disabled {
        opacity: 0.3;
        cursor: default;
      }
      .week-label {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-width: 80px;
        text-align: center;
      }
      .pills-row {
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      .grid-area {
        /*
         * The vertical scrollport for the whole grid — and therefore the box the
         * grid's sticky head pins against (issue #82). It has to be the nearest
         * scroll container to that head, which is why <lucarne-calendar-day-pan>
         * no longer sets overflow: hidden.
         * overflow-x: hidden (not auto) clips the render-buffer day columns that
         * make the day track wider than the card, without ever letting the user
         * scroll horizontally — days move by pan gesture only.
         */
        overflow-x: hidden;
        overflow-y: auto;
        /* Fill the space below the header + pills; ha-card sets the card height. */
        flex: 1 1 auto;
        min-height: 0;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
    `],Ni);K([U({attribute:!1})],X.prototype,`hass`,void 0),K([ut(`.grid-area`)],X.prototype,`_gridAreaEl`,void 0),K([W()],X.prototype,`_config`,void 0),K([W()],X.prototype,`_layout`,void 0),K([W()],X.prototype,`_visibleIds`,void 0),K([W()],X.prototype,`_openEvent`,void 0),K([W()],X.prototype,`_openEventColor`,void 0),K([W()],X.prototype,`_openEventCalLabel`,void 0),K([W()],X.prototype,`_openEventEntityId`,void 0),K([W()],X.prototype,`_createDay`,void 0),K([W()],X.prototype,`_createStartHour`,void 0),K([W()],X.prototype,`_creatableCalendars`,void 0),K([W()],X.prototype,`_dayWidthPx`,void 0),K([W()],X.prototype,`_deletedUids`,void 0),X=K([H(`lucarne-calendar-card`)],X);var Li=class extends V{constructor(...e){super(...e),this._haReady=!1,this._invalid={}}connectedCallback(){super.connectedCallback(),Ir().catch(e=>console.warn(`[lucarne] HA editor elements load failed; rendering anyway`,e)).then(()=>{this._haReady=!0})}setConfig(e){this._config=e}_fire(e){Lr(this,`config-changed`,{config:e})}_titleChanged(e){let t=e.target;this._fire({...this._config,title:t.value||void 0})}_bandStartChanged(e){let t=e.target;this._fire({...this._config,visible_hours:{...this._config.visible_hours??{start:`07:00`,end:`21:00`},start:t.value}})}_bandEndChanged(e){let t=e.target;this._fire({...this._config,visible_hours:{...this._config.visible_hours??{start:`07:00`,end:`21:00`},end:t.value}})}_showCreateChanged(e){let t=e.target.checked;this._fire({...this._config,show_create_button:t})}_calEntityChanged(e,t){var n,r;let i=[...((n=this._config)==null?void 0:n.calendars)??[]];i[e]={...i[e],entity:((r=t.detail)==null?void 0:r.value)??``},this._fire({...this._config,calendars:i})}_calColorChanged(e,t){var n;let r=[...((n=this._config)==null?void 0:n.calendars)??[]];r[e]={...r[e],color:t.target.value},this._fire({...this._config,calendars:r})}_removeCalendar(e){var t;let n=[...((t=this._config)==null?void 0:t.calendars)??[]];n.length<=1||(n.splice(e,1),this._fire({...this._config,calendars:n}))}_windowFieldChanged(e,t){let n=t.target,r=n.value===``?void 0:n.valueAsNumber,i=r!==void 0&&Number.isFinite(r)?r:void 0,a={...this._config,[e]:i},o=a.min_days??3,s=a.max_days??7,c=a.min_col_width??140,l=a.max_col_width??220;this._invalid={days:o>s,cols:c>l},this._fire(a)}_addCalendar(){var e,t;let n=Object.keys(((e=this.hass)==null?void 0:e.states)??{}).find(e=>e.startsWith(`calendar.`))??`calendar.example`,r=[...((t=this._config)==null?void 0:t.calendars)??[],{entity:n,color:`#a8d8b9`}];this._fire({...this._config,calendars:r})}render(){var e,t;if(!this._config)return I``;if(!this._haReady)return I`<div class="loading">Loading editor…</div>`;let n=this._config.calendars??[],r=((e=this._config.visible_hours)==null?void 0:e.start)??`07:00`,i=((t=this._config.visible_hours)==null?void 0:t.end)??`21:00`,a=this._config.show_create_button??!0,o=this._config.min_days,s=this._config.max_days,c=this._config.min_col_width,l=this._config.max_col_width;return I`
      <label class="field">
        <span class="field-label">Card title</span>
        <input
          class="text-input"
          type="text"
          .value=${this._config.title??``}
          @change=${this._titleChanged}
        />
      </label>

      <div class="row">
        <label class="field">
          <span class="field-label">Visible hours start (HH:MM)</span>
          <input
            class="text-input"
            type="text"
            .value=${r}
            @change=${this._bandStartChanged}
          />
        </label>
        <label class="field">
          <span class="field-label">Visible hours end (HH:MM)</span>
          <input
            class="text-input"
            type="text"
            .value=${i}
            @change=${this._bandEndChanged}
          />
        </label>
      </div>

      <label class="toggle-row">
        <span class="toggle-label">Show create-event button</span>
        <input
          type="checkbox"
          .checked=${a}
          @change=${this._showCreateChanged}
        />
      </label>

      <div class="section-label">Visible day window</div>
      <div class="row">
        <label class="field">
          <span class="field-label">Min days (1–14)</span>
          <input
            class="text-input"
            type="number"
            min="1"
            max="14"
            step="1"
            .value=${o===void 0?``:String(o)}
            placeholder="3"
            @change=${e=>this._windowFieldChanged(`min_days`,e)}
          />
          ${this._invalid.days?I`<div class="editor-error">Min days must be ≤ max days</div>`:``}
        </label>
        <label class="field">
          <span class="field-label">Max days (1–14)</span>
          <input
            class="text-input"
            type="number"
            min="1"
            max="14"
            step="1"
            .value=${s===void 0?``:String(s)}
            placeholder="7"
            @change=${e=>this._windowFieldChanged(`max_days`,e)}
          />
          ${this._invalid.days?I`<div class="editor-error">Max days must be ≥ min days</div>`:``}
        </label>
      </div>
      <div class="row">
        <label class="field">
          <span class="field-label">Min column width px (60–400)</span>
          <input
            class="text-input"
            type="number"
            min="60"
            max="400"
            step="10"
            .value=${c===void 0?``:String(c)}
            placeholder="140"
            @change=${e=>this._windowFieldChanged(`min_col_width`,e)}
          />
          ${this._invalid.cols?I`<div class="editor-error">Min width must be ≤ max width</div>`:``}
        </label>
        <label class="field">
          <span class="field-label">Max column width px (100–600)</span>
          <input
            class="text-input"
            type="number"
            min="100"
            max="600"
            step="10"
            .value=${l===void 0?``:String(l)}
            placeholder="220"
            @change=${e=>this._windowFieldChanged(`max_col_width`,e)}
          />
          ${this._invalid.cols?I`<div class="editor-error">Max width must be ≥ min width</div>`:``}
        </label>
      </div>

      <div class="section-label">Calendars</div>
      ${n.map((e,t)=>I`
          <div class="cal-row">
            <ha-entity-picker
              label="Calendar entity"
              .hass=${this.hass}
              .value=${e.entity}
              .includeDomains=${[`calendar`]}
              allow-custom-entity
              @value-changed=${e=>this._calEntityChanged(t,e)}
            ></ha-entity-picker>
            <input
              type="color"
              class="cal-color"
              .value=${e.color}
              @input=${e=>this._calColorChanged(t,e)}
              title="Calendar color"
            />
            <button type="button" class="remove" @click=${()=>this._removeCalendar(t)} title="Remove">✕</button>
          </div>
        `)}
      <button type="button" class="add" @click=${this._addCalendar}>+ Add calendar</button>
    `}},Ri=(Li.styles=[G,Ar],Li);K([U({attribute:!1})],Ri.prototype,`hass`,void 0),K([W()],Ri.prototype,`_config`,void 0),K([W()],Ri.prototype,`_haReady`,void 0),K([W()],Ri.prototype,`_invalid`,void 0),Ri=K([H(`lucarne-calendar-card-editor`)],Ri);var zi=3e4,Bi=/* @__PURE__ */ new Set([`rejected`,`cancelled`,`refunded`]),Vi=class{constructor(e=Date.now){this.now=e,this.overrides=[]}resolveClaim(e,t){this.overrides.push({kind:`resolveClaim`,claimId:e,status:t,appliedAt:this.now()})}addClaim(e){this.overrides.push({kind:`addClaim`,claim:e,appliedAt:this.now()})}addTickDelta(e,t,n){this.overrides.push({kind:`tickDelta`,uid:e,member:t,points:n,appliedAt:this.now()})}addGrant(e,t){this.overrides.push({kind:`grant`,member:e,points:t,appliedAt:this.now()})}addReward(e){this.overrides.push({kind:`addReward`,reward:e,appliedAt:this.now()})}editReward(e,t){this.overrides.push({kind:`editReward`,id:e,fields:t,appliedAt:this.now()})}archiveReward(e){this.overrides.push({kind:`archiveReward`,id:e,appliedAt:this.now()})}setSettings(e){this.overrides.push({kind:`settings`,settings:e,appliedAt:this.now()})}reconcile(e){let t=this.now();this.overrides=this.overrides.filter(n=>n.appliedAt>=e&&t-n.appliedAt<=zi)}apply(e){if(this.overrides.length===0)return e;let t=[...e.claims],n={...e.balances},r=e.rewards.map(e=>({...e})),i=e.settings;for(let e of this.overrides)switch(e.kind){case`resolveClaim`:{let r=t.find(t=>t.id===e.claimId);if(!r||r.status!==(e.status===`refunded`?`approved`:`pending`))break;if(t=t.filter(t=>t.id!==e.claimId),Bi.has(e.status))for(let e of r.contributors)n[e.member_slug]=(n[e.member_slug]??0)+e.share;break}case`addClaim`:if(t.some(t=>t.id===e.claim.id))break;t=[e.claim,...t];for(let t of e.claim.contributors)n[t.member_slug]=(n[t.member_slug]??0)-t.share;break;case`tickDelta`:case`grant`:n[e.member]=(n[e.member]??0)+e.points;break;case`addReward`:r.some(t=>t.id===e.reward.id)||(r=[...r,{...e.reward}]);break;case`editReward`:r=r.map(t=>t.id===e.id?{...t,...e.fields}:t);break;case`archiveReward`:r=r.map(t=>t.id===e.id?{...t,archived:!0}:t);break;case`settings`:i=e.settings}return{...e,claims:t,balances:n,rewards:r,settings:i}}};function Hi(e,t,n){let r=Array.from(/* @__PURE__ */ new Set([t,...n])),i=r.length;if(i>e)return null;let a=Math.floor(e/i),o=/* @__PURE__ */ new Map;for(let e of r)o.set(e,a);return o.set(t,a+e%i),o}function Ui(e){return e.filter(e=>!e.archived)}function Wi(e,t){return Ui(e).filter(e=>e.cost<=t)}function Gi(e,t){return Ui(e).sort((e,n)=>(e.cost<=t?0:1)-(n.cost<=t?0:1)||e.cost-n.cost||e.name.localeCompare(n.name))}var Ki=[`anytime`,`morning`,`afternoon`,`night`];function qi(e){return typeof e==`string`&&Ki.includes(e)?e:`anytime`}var Ji=class extends V{constructor(...e){super(...e),this.streak=0}_milestoneClass(e){return e>=30?`milestone-5`:e>=14?`milestone-4`:e>=7?`milestone-3`:e>=3?`milestone-2`:e>=1?`milestone-1`:``}render(){let e=isNaN(this.streak)?0:this.streak,t=e>0?`day streak`:`start a streak today`;return I`
      <div class="streak-row">
        <span class="flame ${this._milestoneClass(e)}">🔥</span>
        <span class="count">${e}</span>
        <slot name="aside"></slot>
      </div>
      <div class="label">${t}</div>
    `}},Yi=(Ji.styles=P`
    :host {
      display: block;
      text-align: center;
      padding: 8px 4px;
      font-family: var(--primary-font-family, sans-serif);
    }
    .streak-row {
      min-height: var(--lucarne-streak-row-min-height, 0);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .flame {
      font-size: clamp(1.1rem, 1.8vw, 1.5rem);
      line-height: 1;
      transition: font-size 0.2s;
    }
    .flame.milestone-1 { font-size: clamp(1.2rem, 2vw, 1.6rem); }
    .flame.milestone-2 { font-size: clamp(1.3rem, 2.2vw, 1.75rem); }
    .flame.milestone-3 { font-size: clamp(1.4rem, 2.4vw, 1.9rem); }
    .flame.milestone-4 { font-size: clamp(1.5rem, 2.6vw, 2rem); }
    .flame.milestone-5 { font-size: clamp(1.6rem, 2.8vw, 2.2rem); }
    .count {
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      color: var(--primary-text-color, #212121);
    }
    ::slotted([slot='aside']) {
      margin-left: 12px;
    }
    .label {
      font-size: clamp(0.7rem, 0.9vw, 0.8rem);
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }
  `,Ji);K([U({type:Number})],Yi.prototype,`streak`,void 0),Yi=K([H(`lucarne-streak-display`)],Yi);var Xi=class extends V{constructor(...e){super(...e),this.balance=0,this.affordable=!1,this.memberName=``,this.memberSlug=``}render(){let e=this.balance<0?`−${Math.abs(this.balance)}`:String(this.balance),t=`${this.memberName}: ${this.balance} ${this.balance===1?`point`:`points`}${this.affordable?`, a reward is ready`:``}`;return I`
      <button type="button" class=${this.affordable?`ready`:``} aria-label=${t} @click=${this._onClick}>
        <span aria-hidden="true">⭐ ${e}</span>
      </button>
    `}_onClick(){this.dispatchEvent(new CustomEvent(`rewards-open`,{detail:{memberSlug:this.memberSlug},bubbles:!0,composed:!0}))}},Zi=(Xi.styles=P`
    :host {
      display: inline-block;
      font-family: var(--primary-font-family, sans-serif);
    }
    button {
      position: relative;
      min-width: 44px;
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 22px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      cursor: pointer;
    }
    /* Filled = a reward is within reach; the rewards modal's Claim buttons use the same fill. */
    button.ready {
      background: var(--primary-color, #03a9f4);
      border-color: transparent;
      color: var(--text-primary-color, #fff);
    }
  `,Xi);K([U({type:Number})],Zi.prototype,`balance`,void 0),K([U({type:Boolean})],Zi.prototype,`affordable`,void 0),K([U({attribute:`member-name`})],Zi.prototype,`memberName`,void 0),K([U({attribute:`member-slug`})],Zi.prototype,`memberSlug`,void 0),Zi=K([H(`lucarne-reward-balance-pill`)],Zi);var Qi=class extends V{constructor(...e){super(...e),this.kidSlug=``,this.active=!1,this._dots=[]}connectedCallback(){super.connectedCallback(),this._generateDots()}_generateDots(){let e=[`#f5c89c`,`#b8e0d2`,`#f0b8c8`,`#a8d8b9`,`#c8b4e0`,`#f0dca0`];this._dots=Array.from({length:18},(t,n)=>({left:`${n/17*90+5}%`,color:e[n%e.length],delay:`${(n*.08).toFixed(2)}s`,size:`${8+Math.round(Math.random()*6)}px`}))}render(){return this.active?I`
      ${this._dots.map(e=>I`
          <div
            class="dot"
            style="left:${e.left};background:${e.color};animation-delay:${e.delay};width:${e.size};height:${e.size}"
          ></div>
        `)}
    `:I``}},$i=(Qi.styles=P`
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      border-radius: inherit;
    }
    .dot {
      position: absolute;
      bottom: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: float-up 2s ease-out forwards;
    }
    @keyframes float-up {
      0%   { transform: translateY(0) scale(1);   opacity: 0.9; }
      60%  { opacity: 0.7; }
      100% { transform: translateY(-110%) scale(0.6); opacity: 0; }
    }
  `,Qi);K([U({attribute:`kid-slug`})],$i.prototype,`kidSlug`,void 0),K([U({type:Boolean})],$i.prototype,`active`,void 0),$i=K([H(`lucarne-celebration-overlay`)],$i);var ea,ta=[`morning`,`afternoon`,`night`,`anytime`],na={morning:`Morning`,afternoon:`Afternoon`,night:`Night`,anytime:`Anytime`},ra={morning:Fn,afternoon:In,night:Ln};function ia(e,t){return e.due&&t.due?e.due.localeCompare(t.due):e.due?-1:t.due?1:e.summary.localeCompare(t.summary)}function aa(e){let t=e.filter(e=>e.metadata.type===`routine`).sort((e,t)=>e.summary.localeCompare(t.summary)),n=e.filter(e=>e.metadata.type!==`routine`).sort(ia);return[...t,...n]}function oa(e){let t=aa(e.filter(e=>e.status!==`completed`)),n=aa(e.filter(e=>e.status===`completed`));return[...t,...n]}function sa(e){let t=/* @__PURE__ */ new Map;for(let n of e){let e=qi(n.metadata.time_of_day),r=t.get(e)??[];r.push(n),t.set(e,r)}let n=[];for(let e of ta){let r=t.get(e);r&&r.length!==0&&n.push({bucket:e,tasks:oa(r)})}return n}var Z=(ea=class extends V{constructor(...e){super(...e),this.tasks=[],this.notTodayTasks=[],this.members=[],this.streak=0,this.showRoutines=!0,this.showTasks=!0,this.showStreak=!0,this.balance=null,this.affordable=!1,this.hasActiveRewards=!1,this.showRewards=!1,this.hideName=!1,this.scrollToBucket=``,this._celebrating=!1,this._notTodayOpen=!1,this._celebrationTimer=null,this._lastAllRoutinesDone=null,this._scrollRaf=null,this._pendingScrollBucket=!1}updated(e){if(super.updated(e),e.has(`scrollToBucket`)&&this._onScrollBucketChanged(),!e.has(`tasks`))return;let t=this.tasks.filter(e=>e.metadata.type===`routine`);if(t.length===0)return;let n=t.every(e=>e.status===`completed`);if(this._lastAllRoutinesDone===null){this._lastAllRoutinesDone=n;return}!this._lastAllRoutinesDone&&n&&this._triggerCelebration(),this._lastAllRoutinesDone=n}_triggerCelebration(){this._celebrating=!0,this._celebrationTimer&&clearTimeout(this._celebrationTimer),this._celebrationTimer=setTimeout(()=>{this._celebrating=!1,this._celebrationTimer=null,this.requestUpdate()},2200),this.requestUpdate()}disconnectedCallback(){var e;super.disconnectedCallback(),this._celebrationTimer&&clearTimeout(this._celebrationTimer),this._scrollRaf!==null&&(cancelAnimationFrame(this._scrollRaf),this._scrollRaf=null),(e=this._listsResizeObs)==null||e.disconnect()}_onScrollBucketChanged(){if(!this.scrollToBucket){var e;this._pendingScrollBucket=!1,this._scrollRaf!==null&&(cancelAnimationFrame(this._scrollRaf),this._scrollRaf=null),(e=this._listsResizeObs)==null||e.disconnect();return}this._pendingScrollBucket=!0,this._scrollRaf!==null&&cancelAnimationFrame(this._scrollRaf),this._scrollRaf=requestAnimationFrame(()=>{this._scrollRaf=null,this._tryApplyScroll()}),this._observeListsResize()}_tryApplyScroll(){if(!this._pendingScrollBucket||!this.scrollToBucket)return;let e=this.renderRoot.querySelector(`.lists`);if(!e)return;let t=this._sectionForBucket(e);if(t&&(e.scrollTop=t.offsetTop-e.offsetTop),e.clientHeight>0){var n;this._pendingScrollBucket=!1,(n=this._listsResizeObs)==null||n.disconnect()}}_observeListsResize(){var e;if(typeof ResizeObserver>`u`)return;let t=(e=this.renderRoot)==null?void 0:e.querySelector(`.lists`);t&&(this._listsResizeObs||(this._listsResizeObs=new ResizeObserver(()=>this._tryApplyScroll())),this._listsResizeObs.observe(t))}_sectionForBucket(e){let t=ta.indexOf(this.scrollToBucket);if(t<0)return null;for(let n of ta.slice(t)){let t=e.querySelector(`.section[data-bucket="${n}"]`);if(t)return t}return null}render(){if(!this.member)return I``;let e=sa(this.tasks.filter(e=>e.metadata.type===`routine`?this.showRoutines:e.metadata.type===`chore`||e.metadata.type===`rotating`?this.showTasks:!1));return I`
      <div class="column" style="--member-color:${this.member.color}">
        <lucarne-celebration-overlay
          kid-slug=${this.member.slug}
          ?active=${this._celebrating}
        ></lucarne-celebration-overlay>

        <button
          class="add-task-btn"
          @click=${this._onAddTask}
          aria-label="Add task for ${this.member.name}"
        ><span aria-hidden="true">+</span></button>

        <div class="header">
          <lucarne-member-avatar
            name=${this.member.name}
            color=${this.member.color}
            .avatar=${this.member.avatar}
          ></lucarne-member-avatar>
          ${this.hideName?``:I`<div class="member-name">${this.member.name}</div>`}
        </div>

        <div class="lists">
          ${e.map(({bucket:e,tasks:t})=>I`
            <div class="section" data-bucket=${e}>
              <div class="section-header">
                ${ra[e]?I`<span class="section-icon">${ra[e]}</span>`:``}
                ${na[e]}
              </div>
              ${t.map(e=>I`
                <lucarne-task-row
                  .task=${e}
                  .memberColor=${this.member.color}
                  .members=${this.members}
                ></lucarne-task-row>
              `)}
            </div>
          `)}
          ${this._renderNotToday()}
        </div>

        ${this._renderBottom()}
      </div>
    `}_renderBottom(){let e=this.showRewards&&this.balance!==null&&!(this.balance===0&&!this.hasActiveRewards);if(!this.showStreak&&!e)return``;let t=e?I`<lucarne-reward-balance-pill
          slot="aside"
          .balance=${this.balance}
          .affordable=${this.affordable}
          member-name=${this.member.name}
          member-slug=${this.member.slug}
        ></lucarne-reward-balance-pill>`:``;return I`
      <div class="streak-area ${this.showRewards?`rewards`:``} ${this.showStreak?``:`pill-only`}">
        ${this.showStreak?I`<lucarne-streak-display .streak=${this.streak}>${t}</lucarne-streak-display>`:t}
      </div>
    `}_renderNotToday(){if(!this.showRoutines||this.notTodayTasks.length===0)return``;let e=this.notTodayTasks.length;return I`
      <div class="section not-today">
        <button
          class="not-today-toggle"
          aria-expanded=${this._notTodayOpen}
          @click=${()=>this._notTodayOpen=!this._notTodayOpen}
        >
          ${e} not due today <span aria-hidden="true">${this._notTodayOpen?`▴`:`▾`}</span>
        </button>
        ${this._notTodayOpen?this.notTodayTasks.map(e=>I`
              <lucarne-task-row
                not-today
                .task=${e}
                .memberColor=${this.member.color}
                .members=${this.members}
              ></lucarne-task-row>
            `):``}
      </div>
    `}_onAddTask(){this.dispatchEvent(new CustomEvent(`add-task-clicked`,{detail:{memberSlug:this.member.slug},bubbles:!0,composed:!0}))}},ea.styles=P`
    :host {
      display: block;
      position: relative;
      height: 100%;
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 12px;
      position: relative;
      height: 100%;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      margin-bottom: 8px;
      flex: 0 0 auto;
    }
    .member-name {
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      font-family: var(--primary-font-family, sans-serif);
      text-align: center;
    }
    .add-task-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px dashed rgba(0, 0, 0, 0.25);
      border-radius: 50%;
      font-size: 1.35rem;
      line-height: 1;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
    }
    .add-task-btn:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    /* List region: flex:1 pushes the streak to the bottom of every column (so
       streaks align across equal-height columns). At Auto height the list shows
       every task; in a fixed-height grid cell it shrinks to fit and scrolls, but
       never below about two tasks, so a short cell scrolls the card instead of
       hiding the list (issue #156). */
    .lists {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 auto;
      min-height: 112px;
      overflow-y: auto;
    }
    .section {
      display: flex;
      flex-direction: column;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--secondary-text-color, #727272);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 4px 2px;
    }
    .section-icon {
      display: inline-flex;
      flex-shrink: 0;
    }
    .section-icon svg {
      width: 14px;
      height: 14px;
    }
    .not-today-toggle {
      align-self: flex-start;
      background: none;
      border: none;
      padding: 8px 4px 2px;
      font: inherit;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--secondary-text-color, #727272);
      opacity: 0.8;
      cursor: pointer;
    }
    .streak-area {
      padding-top: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.07);
      margin-top: 8px;
      flex: 0 0 auto;
    }
    /* Reserve the pill's 44px in every column, pill or not, so the streak rows line up. */
    .streak-area.rewards lucarne-streak-display {
      --lucarne-streak-row-min-height: 44px;
    }
    .streak-area.pill-only {
      display: flex;
      justify-content: center;
    }
  `,ea);K([U({attribute:!1})],Z.prototype,`member`,void 0),K([U({attribute:!1})],Z.prototype,`tasks`,void 0),K([U({attribute:!1})],Z.prototype,`notTodayTasks`,void 0),K([U({attribute:!1})],Z.prototype,`members`,void 0),K([U({type:Number})],Z.prototype,`streak`,void 0),K([U({type:Boolean,attribute:`show-routines`})],Z.prototype,`showRoutines`,void 0),K([U({type:Boolean,attribute:`show-tasks`})],Z.prototype,`showTasks`,void 0),K([U({type:Boolean,attribute:`show-streak`})],Z.prototype,`showStreak`,void 0),K([U({attribute:!1})],Z.prototype,`balance`,void 0),K([U({type:Boolean})],Z.prototype,`affordable`,void 0),K([U({type:Boolean,attribute:`has-active-rewards`})],Z.prototype,`hasActiveRewards`,void 0),K([U({type:Boolean,attribute:`show-rewards`})],Z.prototype,`showRewards`,void 0),K([U({type:Boolean,attribute:`hide-name`})],Z.prototype,`hideName`,void 0),K([U({attribute:`scroll-to-bucket`})],Z.prototype,`scrollToBucket`,void 0),K([W()],Z.prototype,`_celebrating`,void 0),K([W()],Z.prototype,`_notTodayOpen`,void 0),Z=K([H(`lucarne-member-column`)],Z);async function ca(e,t){var n;let r={member:t.member,summary:t.summary,type:t.type};t.recurrence!==void 0&&(r.recurrence=t.recurrence),t.icon!==void 0&&(r.icon=t.icon),t.due!==void 0&&(r.due=t.due),t.source!==void 0&&(r.source=t.source),t.assignee!==void 0&&(r.assignee=t.assignee),t.time_of_day!==void 0&&(r.time_of_day=t.time_of_day),t.rotation_owners!==void 0&&(r.rotation_owners=t.rotation_owners),t.current_owner!==void 0&&(r.current_owner=t.current_owner),t.points!==void 0&&(r.points=t.points);let i=await e.callService(`lucarne_family`,`add_task`,r,void 0,!0,!0);return(i==null||(n=i.response)==null?void 0:n.uid)??null}async function la(e,t,n){let r={uid:t};n.type!==void 0&&(r.type=n.type),n.recurrence!==void 0&&(r.recurrence=n.recurrence),n.icon!==void 0&&(r.icon=n.icon),n.assignee!==void 0&&(r.assignee=n.assignee),n.time_of_day!==void 0&&(r.time_of_day=n.time_of_day),n.rotation_owners!==void 0&&(r.rotation_owners=n.rotation_owners),n.current_owner!==void 0&&(r.current_owner=n.current_owner),n.points!==void 0&&(r.points=n.points),await e.callService(`lucarne_family`,`update_task_metadata`,r)}async function ua(e,t){await e.callService(`lucarne_family`,`delete_task`,{uid:t})}async function da(e,t,n){let r=await n.arrayBuffer(),i=new Uint8Array(r),a=``;for(let e of i)a+=String.fromCharCode(e);let o=btoa(a);await e.callService(`lucarne_family`,`upload_avatar`,{member:t,image_data:o,mime_type:n.type})}async function fa(e,t,n){await e.callService(`lucarne_family`,`set_member_avatar`,{member:t,avatar:n})}async function pa(e,t,n,r){let i={member:t,points:n};r!==void 0&&(i.reason=r),await e.callService(`lucarne_family`,`grant_points`,i)}async function ma(e,t){let n={name:t.name,cost:t.cost};t.description!==void 0&&(n.description=t.description),t.poolable!==void 0&&(n.poolable=t.poolable);let r=await e.callService(`lucarne_family`,`create_reward`,n,void 0,!0,!0);return(r==null?void 0:r.response)??{id:-1}}async function ha(e,t,n){let r={reward_id:t};n.name!==void 0&&(r.name=n.name),n.cost!==void 0&&(r.cost=n.cost),n.description!==void 0&&(r.description=n.description),n.poolable!==void 0&&(r.poolable=n.poolable),await e.callService(`lucarne_family`,`update_reward`,r)}async function ga(e,t){await e.callService(`lucarne_family`,`archive_reward`,{reward_id:t})}async function _a(e,t){let n={};t.streak_daily_bonus!==void 0&&(n.streak_daily_bonus=t.streak_daily_bonus),t.streak_milestones!==void 0&&(n.streak_milestones=t.streak_milestones),await e.callService(`lucarne_family`,`set_rewards_settings`,n)}async function va(e,t,n,r){let i={member:t,reward_id:n};r!==void 0&&(i.pool_with=r);let a=await e.callService(`lucarne_family`,`claim_reward`,i,void 0,!0,!0);return(a==null?void 0:a.response)??{claim_id:-1,shares:{}}}async function ya(e,t){await e.callService(`lucarne_family`,`cancel_claim`,{claim_id:t})}async function ba(e,t){await e.callService(`lucarne_family`,`approve_claim`,{claim_id:t})}async function xa(e,t){await e.callService(`lucarne_family`,`reject_claim`,{claim_id:t})}async function Sa(e,t){await e.callService(`lucarne_family`,`refund_claim`,{claim_id:t})}var Ca,wa=[`🪥`,`🛏️`,`🎒`,`💗`,`📵`,`🧸`,`👕`,`🧹`,`🧺`,`🍽️`,`🐕`,`🌱`],Q=(Ca=class extends V{constructor(...e){super(...e),this.members=[],this.isAdmin=!1,this._selectedMemberSlug=``,this._summary=``,this._type=`chore`,this._icon=``,this._recurrenceMode=`none`,this._recurrenceDays=[],this._recurrenceInterval=1,this._recurrenceMonthDay=1,this._recurrenceNth=1,this._recurrenceNthDay=`MO`,this._recurrenceMonth=1,this._recurrenceStart=``,this._due=``,this._timeOfDay=`anytime`,this._points=`0`,this._error=``,this._saving=!1,this._alsoAddSlugs=/* @__PURE__ */ new Set,this._rotatingOwners=[]}updated(e){super.updated(e),e.has(`member`)&&this.member&&(this._selectedMemberSlug=this.member.slug)}_close(){this.dispatchEvent(new CustomEvent(`popover-close`,{bubbles:!0,composed:!0}))}_pickedRecurrence(){let e=this._recurrenceInterval>1?{interval:this._recurrenceInterval}:{};switch(this._recurrenceMode){case`none`:return{mode:`none`};case`daily`:return{mode:`daily`,...e};case`weekly`:return this._recurrenceDays.length===0?null:{mode:`weekly`,days:this._recurrenceDays,...e};case`monthly-date`:return{mode:`monthly-date`,dayOfMonth:this._recurrenceMonthDay,...e};case`monthly-nth`:return{mode:`monthly-nth`,nth:this._recurrenceNth,day:this._recurrenceNthDay,...e};case`yearly`:return{mode:`yearly`,month:this._recurrenceMonth,dayOfMonth:this._recurrenceMonthDay,...e};default:return null}}_effectiveStart(){let e=this._pickedRecurrence();if(!(!e||e.mode===`none`||this._recurrenceInterval<=1))return this._recurrenceStart||xn({...e,interval:1})}_buildRRule(){let e=this._pickedRecurrence();if(!e)return``;let t=this._effectiveStart();return cn(t&&e.mode!==`none`?{...e,start:t}:e)}_showPoints(){return this.isAdmin&&(this._type===`rotating`||this._selectedMemberSlug!==`household`)}async _submit(){if(this._saving)return;if(!this._summary.trim()){this._error=`Summary is required`;return}if(this._summary.trim().length>200){this._error=`Summary must be 200 characters or less`;return}if(this._type===`routine`&&this._recurrenceMode===`weekly`&&this._recurrenceDays.length===0){this._error=`Select at least one day for weekly recurrence`;return}if(this._type===`rotating`&&this._rotatingOwners.length<2){this._error=`Select at least 2 owners for a rotating task`;return}let e;if(this._showPoints()&&(e=Number(this._points),this._points.trim()===``||!Number.isInteger(e)||e<0||e>1e3)){this._error=`Points must be a whole number from 0 to 1000`;return}this._saving=!0,this._error=``;let t=this._summary.trim(),n=[];try{if(this._type===`rotating`){let r=await ca(this.hass,{member:`household`,summary:t,type:`rotating`,...this._icon?{icon:this._icon}:{},time_of_day:this._timeOfDay,source:`manual`,rotation_owners:this._rotatingOwners,...e===void 0?{}:{points:e}});r&&n.push(this._provisionalTask(r,`household`,t,null,{rotation_owners:this._rotatingOwners,current_owner:this._rotatingOwners[0],points:e}))}else{let r=this._type===`routine`?this._buildRRule():``,i=this._type===`chore`?this._due:``,a=this._type===`routine`?[this._selectedMemberSlug,...Array.from(this._alsoAddSlugs).filter(e=>e!==this._selectedMemberSlug)]:[this._selectedMemberSlug];for(let o of a){let a=await ca(this.hass,{member:o,summary:t,type:this._type,...r?{recurrence:r}:{},...this._icon?{icon:this._icon}:{},...i?{due:i}:{},time_of_day:this._timeOfDay,source:`manual`,...e===void 0?{}:{points:e}});a&&n.push(this._provisionalTask(a,o,t,i||null,{recurrence:r,points:e}))}}n.length>0&&this.dispatchEvent(new CustomEvent(`task-added`,{detail:{tasks:n},bubbles:!0,composed:!0})),this._close()}catch(e){this._error=wi(e,`Failed to add task`),this._saving=!1}}_provisionalTask(e,t,n,r,i={}){return{uid:e,summary:n,status:`needs_action`,due:r,description:``,metadata:{item_uid:e,member_slug:t,assignee_slug:``,type:this._type,recurrence:i.recurrence??``,icon:this._icon,source:`manual`,time_of_day:this._timeOfDay,...i.rotation_owners===void 0?{}:{rotation_owners:i.rotation_owners},...i.current_owner===void 0?{}:{current_owner:i.current_owner},...i.points===void 0?{}:{points:i.points}}}}_toggleAlsoAdd(e){let t=new Set(this._alsoAddSlugs);t.has(e)?t.delete(e):t.add(e),this._alsoAddSlugs=t}_toggleRotatingOwner(e){this._rotatingOwners=this._rotatingOwners.includes(e)?this._rotatingOwners.filter(t=>t!==e):[...this._rotatingOwners,e]}_moveOwner(e,t){let n=this._rotatingOwners.indexOf(e);if(n<0)return;let r=[...this._rotatingOwners],i=t===`up`?n-1:n+1;i<0||i>=r.length||([r[n],r[i]]=[r[i],r[n]],this._rotatingOwners=r)}_toggleDay(e){this._recurrenceDays=this._recurrenceDays.includes(e)?this._recurrenceDays.filter(t=>t!==e):[...this._recurrenceDays,e]}render(){let e=this._buildRRule(),t=e?dn(e):`One-off (no repeat)`,n={MO:`Mon`,TU:`Tue`,WE:`Wed`,TH:`Thu`,FR:`Fri`,SA:`Sat`,SU:`Sun`};return I`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Add task">
        <div class="popover-header">
          <h2 class="popover-title">Add Task</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label for="at-member">Member</label>
          <select
            id="at-member"
            .value=${this._selectedMemberSlug}
            @change=${e=>this._selectedMemberSlug=e.target.value}
          >
            ${this.members.map(e=>I`<option value=${e.slug}>${e.name}</option>`)}
          </select>
        </div>

        <div class="field">
          <label for="at-summary">Summary *</label>
          <input
            id="at-summary"
            type="text"
            placeholder="Task name"
            maxlength="200"
            .value=${this._summary}
            @input=${e=>this._summary=e.target.value}
            @keydown=${e=>e.key===`Enter`&&this._submit()}
          />
        </div>

        <div class="field">
          <label for="at-type">Type</label>
          <select
            id="at-type"
            .value=${this._type}
            @change=${e=>{let t=e.target.value;this._type=t,t!==`routine`&&(this._alsoAddSlugs=/* @__PURE__ */ new Set),t!==`rotating`&&(this._rotatingOwners=[])}}
          >
            <option value="routine">Routine</option>
            <option value="chore">Chore</option>
            <option value="rotating">Rotating</option>
          </select>
        </div>

        <div class="field">
          <label for="at-time-of-day">Time of day</label>
          <select
            id="at-time-of-day"
            .value=${this._timeOfDay}
            @change=${e=>this._timeOfDay=e.target.value}
          >
            <option value="anytime">Anytime</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div class="field">
          <label>Icon</label>
          <div class="emoji-picker">
            ${wa.map(e=>I`
              <button
                class="emoji-btn ${this._icon===e?`selected`:``}"
                @click=${()=>this._icon=this._icon===e?``:e}
                title="${e}"
              >${e}</button>
            `)}
          </div>
          <input
            type="text"
            placeholder="Custom emoji"
            maxlength="8"
            .value=${this._icon}
            @input=${e=>this._icon=e.target.value}
            style="margin-top:4px"
          />
        </div>

        ${this._type===`routine`?I`
        <div class="field">
          <label for="at-recurrence">Recurrence</label>
          <select
            id="at-recurrence"
            .value=${this._recurrenceMode}
            @change=${e=>this._recurrenceMode=e.target.value}
          >
            <option value="none">None (one-off)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly-date">Monthly by date</option>
            <option value="monthly-nth">Monthly by Nth weekday</option>
            <option value="yearly">Yearly</option>
          </select>

          ${this._recurrenceMode===`none`?``:I`
                <div class="recurrence-extra">
                  ${this._recurrenceMode!==`monthly-nth`&&this._recurrenceMode!==`yearly`?I`
                        <div>
                          <label>Interval</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            .value=${String(this._recurrenceInterval)}
                            @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceInterval=isNaN(t)||t<1?1:t}}
                          />
                        </div>
                      `:``}

                  ${this._recurrenceMode===`weekly`?I`
                        <div>
                          <label>Days</label>
                          <div class="days-row">
                            ${nn.map(e=>I`
                              <button
                                class="day-btn ${this._recurrenceDays.includes(e)?`selected`:``}"
                                @click=${()=>this._toggleDay(e)}
                              >${n[e]}</button>
                            `)}
                          </div>
                        </div>
                      `:``}

                  ${this._recurrenceMode===`monthly-date`?I`
                        <div>
                          <label for="at-monthday">Day of month</label>
                          <input
                            id="at-monthday"
                            type="number"
                            min="1"
                            max="31"
                            .value=${String(this._recurrenceMonthDay)}
                            @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceMonthDay=isNaN(t)||t<1?1:Math.min(t,31)}}
                          />
                        </div>
                      `:``}

                  ${this._recurrenceMode===`monthly-nth`?I`
                        <div style="display:flex;gap:8px">
                          <div style="flex:1">
                            <label for="at-nth">Nth</label>
                            <select
                              id="at-nth"
                              .value=${String(this._recurrenceNth)}
                              @change=${e=>this._recurrenceNth=parseInt(e.target.value,10)}
                            >
                              <option value="1">1st</option>
                              <option value="2">2nd</option>
                              <option value="3">3rd</option>
                              <option value="4">4th</option>
                              <option value="-1">Last</option>
                            </select>
                          </div>
                          <div style="flex:1">
                            <label for="at-nthday">Day</label>
                            <select
                              id="at-nthday"
                              .value=${this._recurrenceNthDay}
                              @change=${e=>this._recurrenceNthDay=e.target.value}
                            >
                              ${nn.map(e=>I`<option value=${e}>${n[e]}</option>`)}
                            </select>
                          </div>
                          <div style="flex:1">
                            <label for="at-nth-interval">Every N months</label>
                            <input
                              id="at-nth-interval"
                              type="number"
                              min="1"
                              max="99"
                              .value=${String(this._recurrenceInterval)}
                              @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceInterval=isNaN(t)||t<1?1:t}}
                            />
                          </div>
                        </div>
                      `:``}

                  ${this._recurrenceMode===`yearly`?I`
                        <div style="display:flex;gap:8px">
                          <div style="flex:1">
                            <label for="at-year-month">Month</label>
                            <input
                              id="at-year-month"
                              type="number"
                              min="1"
                              max="12"
                              .value=${String(this._recurrenceMonth)}
                              @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceMonth=isNaN(t)||t<1?1:Math.min(t,12)}}
                            />
                          </div>
                          <div style="flex:1">
                            <label for="at-year-day">Day</label>
                            <input
                              id="at-year-day"
                              type="number"
                              min="1"
                              max="31"
                              .value=${String(this._recurrenceMonthDay)}
                              @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceMonthDay=isNaN(t)||t<1?1:Math.min(t,31)}}
                            />
                          </div>
                          <div style="flex:1">
                            <label for="at-year-interval">Every N years</label>
                            <input
                              id="at-year-interval"
                              type="number"
                              min="1"
                              max="99"
                              .value=${String(this._recurrenceInterval)}
                              @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceInterval=isNaN(t)||t<1?1:t}}
                            />
                          </div>
                        </div>
                      `:``}

                  ${this._effectiveStart()?I`
                        <div>
                          <label for="at-start">Starting on</label>
                          <input
                            id="at-start"
                            type="date"
                            .value=${this._effectiveStart()??``}
                            @change=${e=>this._recurrenceStart=e.target.value}
                          />
                        </div>
                      `:``}
                </div>
                <div class="recurrence-summary">${t}</div>
              `}
        </div>

        ${(()=>{let e=this.members.filter(e=>e.slug!==this._selectedMemberSlug&&e.slug!==`household`);return e.length===0?``:I`
            <div class="field also-add-section">
              <label>Also add to:</label>
              <div class="also-add-list">
                ${e.map(e=>I`
                  <label class="also-add-item">
                    <input
                      type="checkbox"
                      .checked=${this._alsoAddSlugs.has(e.slug)}
                      @change=${()=>this._toggleAlsoAdd(e.slug)}
                    />
                    ${e.name}
                  </label>
                `)}
              </div>
            </div>
          `})()}
        `:``}

        ${this._type===`rotating`?I`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter(e=>e.slug!==`household`).map(e=>{let t=this._rotatingOwners.includes(e.slug),n=this._rotatingOwners.indexOf(e.slug);return I`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${t}
                    @change=${()=>this._toggleRotatingOwner(e.slug)}
                    aria-label="${e.name}"
                  />
                  ${t?I`<span class="owner-order">${n+1}.</span>`:I`<span class="owner-order"></span>`}
                  <span class="owner-name">${e.name}</span>
                  ${t?I`
                    <div class="reorder-btns">
                      <button
                        class="reorder-btn"
                        ?disabled=${n===0}
                        @click=${()=>this._moveOwner(e.slug,`up`)}
                        aria-label="Move ${e.name} earlier"
                      >▲</button>
                      <button
                        class="reorder-btn"
                        ?disabled=${n===this._rotatingOwners.length-1}
                        @click=${()=>this._moveOwner(e.slug,`down`)}
                        aria-label="Move ${e.name} later"
                      >▼</button>
                    </div>
                  `:``}
                </div>
              `})}
          </div>
          ${this._rotatingOwners.length<2?I`<div class="owners-hint">Select at least 2 owners to enable rotation</div>`:``}
        </div>
        `:``}

        ${this._type===`chore`?I`
              <div class="field">
                <label for="at-due">Due (optional)</label>
                <input
                  id="at-due"
                  type="datetime-local"
                  .value=${this._due}
                  @change=${e=>this._due=e.target.value}
                />
              </div>
            `:``}

        ${this._showPoints()?I`
              <div class="field">
                <label for="at-points">Points</label>
                <input
                  id="at-points"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  inputmode="numeric"
                  .value=${this._points}
                  @input=${e=>this._points=e.target.value}
                />
              </div>
            `:``}

        ${this._error?I`<div class="error-msg">${this._error}</div>`:``}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button
            class="btn btn-submit"
            ?disabled=${this._saving||this._type===`rotating`&&this._rotatingOwners.length<2}
            @click=${this._submit}
          >
            ${this._saving?`Adding…`:`Add Task`}
          </button>
        </div>
      </div>
    `}},Ca.styles=[G,P`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        z-index: 1;
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .popover-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
      }
      .field {
        margin-bottom: var(--lucarne-spacing-md);
      }
      label {
        display: block;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin-bottom: 4px;
      }
      input[type='text'],
      input[type='date'],
      input[type='datetime-local'],
      select,
      input[type='number'] {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 10px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        background: var(--lucarne-surface);
        min-height: 44px;
        font-family: inherit;
      }
      input:focus, select:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      .emoji-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
      .emoji-btn {
        font-size: 1.25rem;
        padding: 4px;
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        background: none;
        min-width: 36px;
        min-height: 36px;
      }
      .emoji-btn.selected {
        border-color: var(--primary-color, #03a9f4);
        background: rgba(3, 169, 244, 0.1);
      }
      .recurrence-summary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
        font-style: italic;
      }
      .recurrence-extra {
        margin-top: var(--lucarne-spacing-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .days-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .day-btn {
        padding: 4px 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        cursor: pointer;
        background: none;
        font-size: 0.75rem;
        min-height: 32px;
      }
      .day-btn.selected {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }
      .error-msg {
        color: #c62828;
        font-size: var(--lucarne-fs-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        padding: 6px 10px;
        background: #ffebee;
        border-radius: var(--lucarne-radius-sm);
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
      .btn {
        padding: 8px 20px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        min-height: 44px;
        min-width: 80px;
      }
      .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
      }
      .btn-submit {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .also-add-section {
        margin-top: var(--lucarne-spacing-sm);
      }
      .also-add-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;
      }
      .also-add-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        cursor: pointer;
        min-height: 32px;
      }
      .also-add-item input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .also-add-item input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .also-add-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owners-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }
      .owner-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .owner-item:last-child {
        border-bottom: none;
      }
      .owner-item input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .owner-item input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .owner-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owner-order {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        min-width: 16px;
        text-align: right;
        flex-shrink: 0;
      }
      .owner-name {
        flex: 1;
      }
      .reorder-btns {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
      }
      .reorder-btn {
        background: none;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.65rem;
        padding: 1px 5px;
        min-height: 18px;
        line-height: 1;
        color: var(--lucarne-on-surface-muted);
      }
      .reorder-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .owners-hint {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        margin-top: 4px;
      }
    `],Ca);K([U({attribute:!1})],Q.prototype,`hass`,void 0),K([U({attribute:!1})],Q.prototype,`member`,void 0),K([U({attribute:!1})],Q.prototype,`members`,void 0),K([U({type:Boolean})],Q.prototype,`isAdmin`,void 0),K([W()],Q.prototype,`_selectedMemberSlug`,void 0),K([W()],Q.prototype,`_summary`,void 0),K([W()],Q.prototype,`_type`,void 0),K([W()],Q.prototype,`_icon`,void 0),K([W()],Q.prototype,`_recurrenceMode`,void 0),K([W()],Q.prototype,`_recurrenceDays`,void 0),K([W()],Q.prototype,`_recurrenceInterval`,void 0),K([W()],Q.prototype,`_recurrenceMonthDay`,void 0),K([W()],Q.prototype,`_recurrenceNth`,void 0),K([W()],Q.prototype,`_recurrenceNthDay`,void 0),K([W()],Q.prototype,`_recurrenceMonth`,void 0),K([W()],Q.prototype,`_recurrenceStart`,void 0),K([W()],Q.prototype,`_due`,void 0),K([W()],Q.prototype,`_timeOfDay`,void 0),K([W()],Q.prototype,`_points`,void 0),K([W()],Q.prototype,`_error`,void 0),K([W()],Q.prototype,`_saving`,void 0),K([W()],Q.prototype,`_alsoAddSlugs`,void 0),K([W()],Q.prototype,`_rotatingOwners`,void 0),Q=K([H(`lucarne-add-task-popover`)],Q);var Ta=class extends V{constructor(...e){super(...e),this.members=[],this.isAdmin=!1,this._summary=``,this._type=`chore`,this._icon=``,this._recurrenceMode=`none`,this._recurrenceDays=[],this._recurrenceInterval=1,this._recurrenceMonthDay=1,this._recurrenceNth=1,this._recurrenceNthDay=`MO`,this._recurrenceMonth=1,this._recurrenceStart=``,this._due=``,this._assignee=``,this._timeOfDay=`anytime`,this._isCustomRecurrence=!1,this._rawRecurrence=``,this._points=`0`,this._error=``,this._saving=!1,this._confirmingDelete=!1,this._rotatingOwners=[],this._backdropPressActive=!1}updated(e){super.updated(e),e.has(`task`)&&this.task&&this._prefill()}_prefill(){let e=this.task;this._summary=e.summary,this._type=e.metadata.type,this._icon=e.metadata.icon,this._points=String(e.metadata.points??0),this._due=e.due??``,this._assignee=e.metadata.assignee_slug,this._timeOfDay=qi(e.metadata.time_of_day),this._recurrenceDays=[],this._recurrenceInterval=1,this._recurrenceMonthDay=1,this._recurrenceNth=1,this._recurrenceNthDay=`MO`,this._recurrenceMonth=1,this._recurrenceStart=``,this._rawRecurrence=``,this._isCustomRecurrence=!1,this._rotatingOwners=e.metadata.rotation_owners?[...e.metadata.rotation_owners]:[];let t=an(e.metadata.recurrence);t.mode===`unknown`?(this._isCustomRecurrence=!0,this._rawRecurrence=t.raw,this._recurrenceMode=`unknown`):(this._isCustomRecurrence=!1,this._recurrenceMode=t.mode,t.mode!==`none`&&(this._recurrenceStart=t.start??``),t.mode===`daily`?this._recurrenceInterval=t.interval??1:t.mode===`weekly`?(this._recurrenceDays=[...t.days],this._recurrenceInterval=t.interval??1):t.mode===`monthly-date`?(this._recurrenceMonthDay=t.dayOfMonth,this._recurrenceInterval=t.interval??1):t.mode===`monthly-nth`?(this._recurrenceNth=t.nth,this._recurrenceNthDay=t.day,this._recurrenceInterval=t.interval??1):t.mode===`yearly`&&(this._recurrenceMonth=t.month,this._recurrenceMonthDay=t.dayOfMonth,this._recurrenceInterval=t.interval??1))}_onBackdropPointerDown(e){this._backdropPressActive=e.isPrimary&&e.button===0,this._backdropPressActive&&e.currentTarget.setPointerCapture(e.pointerId)}_onBackdropPointerUp(){this._backdropPressActive&&(this._backdropPressActive=!1,this._close())}_onBackdropPointerCancel(){this._backdropPressActive=!1}_close(){this.dispatchEvent(new CustomEvent(`popover-close`,{bubbles:!0,composed:!0}))}_buildRRule(){let e=this._buildBaseRRule();if(this._isCustomRecurrence||!this._recurrenceStart)return e;let t=an(e);return t.mode===`none`||t.mode===`unknown`?e:cn({...t,start:this._recurrenceStart})}_displayedStart(){if(!this._isCustomRecurrence&&!(this._recurrenceInterval<=1&&!this._recurrenceStart))return this._recurrenceStart?this._recurrenceStart:xn(an(this._buildBaseRRule()))}_buildBaseRRule(){return this._isCustomRecurrence?this._rawRecurrence:this._recurrenceMode===`none`?``:this._recurrenceMode===`daily`?cn({mode:`daily`,...this._recurrenceInterval>1?{interval:this._recurrenceInterval}:{}}):this._recurrenceMode===`weekly`?cn({mode:`weekly`,days:this._recurrenceDays,...this._recurrenceInterval>1?{interval:this._recurrenceInterval}:{}}):this._recurrenceMode===`monthly-date`?cn({mode:`monthly-date`,dayOfMonth:this._recurrenceMonthDay,...this._recurrenceInterval>1?{interval:this._recurrenceInterval}:{}}):this._recurrenceMode===`monthly-nth`?cn({mode:`monthly-nth`,nth:this._recurrenceNth,day:this._recurrenceNthDay,...this._recurrenceInterval>1?{interval:this._recurrenceInterval}:{}}):this._recurrenceMode===`yearly`?cn({mode:`yearly`,month:this._recurrenceMonth,dayOfMonth:this._recurrenceMonthDay,...this._recurrenceInterval>1?{interval:this._recurrenceInterval}:{}}):``}_showPoints(){var e;return this.isAdmin&&(this._type===`rotating`||((e=this.task)==null?void 0:e.metadata.member_slug)!==`household`)}async _save(){if(this._saving)return;if(!this._summary.trim()){this._error=`Summary is required`;return}if(this._summary.trim().length>200){this._error=`Summary must be 200 characters or less`;return}if(this._recurrenceMode===`weekly`&&!this._isCustomRecurrence&&this._recurrenceDays.length===0){this._error=`Select at least one day for weekly recurrence`;return}if(!this._due&&this.task.due){this._error=`Due date cannot be cleared here — delete and recreate the task to remove it`;return}if(this._type===`rotating`&&this._rotatingOwners.length<2){this._error=`Select at least 2 owners for a rotating task`;return}let e=this.task.metadata.points??0,t;if(this._showPoints()){let n=Number(this._points);if(this._points.trim()===``||!Number.isInteger(n)||n<0||n>1e3){this._error=`Points must be a whole number from 0 to 1000`;return}n!==e&&(t=n)}else this.isAdmin&&this.task.metadata.member_slug===`household`&&this._type!==`rotating`&&e>0&&(t=0);this._saving=!0,this._error=``;try{var n;let e=this.task.metadata.member_slug===`household`?`todo.lucarne_household`:((n=this.members.find(e=>e.slug===this.task.metadata.member_slug))==null?void 0:n.todo_entity_id)??``,r=this._summary.trim()!==this.task.summary,i=!!this._due&&this._due!==(this.task.due??``),a=this._type===`rotating`,o=this.task.metadata.rotation_owners??[],s=a&&JSON.stringify(this._rotatingOwners)!==JSON.stringify(o),c=this.task.metadata.member_slug===`household`,l=this._type!==this.task.metadata.type||this._icon!==this.task.metadata.icon||!a&&this._buildRRule()!==this.task.metadata.recurrence||this._timeOfDay!==(this.task.metadata.time_of_day??`anytime`)||c&&!a&&this._assignee!==this.task.metadata.assignee_slug||s||t!==void 0,u=a&&!!this.task.metadata.current_owner&&!this._rotatingOwners.includes(this.task.metadata.current_owner);if(r||i){if(!e)throw Error(`Could not resolve todo entity for this task`);await this.hass.callService(`todo`,`update_item`,{item:this.task.uid,rename:this._summary.trim(),...i?{due_datetime:this._due}:{}},{entity_id:e})}if(l&&await la(this.hass,this.task.uid,{...this._type===this.task.metadata.type?{}:{type:this._type},...this._icon===this.task.metadata.icon?{}:{icon:this._icon},...!a&&this._buildRRule()!==this.task.metadata.recurrence?{recurrence:this._buildRRule()}:{},...this._timeOfDay===(this.task.metadata.time_of_day??`anytime`)?{}:{time_of_day:this._timeOfDay},...c&&!a&&this._assignee!==this.task.metadata.assignee_slug?{assignee:this._assignee}:{},...s?{rotation_owners:this._rotatingOwners}:{},...u?{current_owner:this._rotatingOwners[0]}:{},...t===void 0?{}:{points:t}}),r||i||l){let e={...this.task,summary:this._summary.trim(),due:this._due||this.task.due,metadata:{...this.task.metadata,type:this._type,icon:this._icon,recurrence:a?this.task.metadata.recurrence:this._buildRRule(),time_of_day:this._timeOfDay,...t===void 0?{}:{points:t},...c&&!a?{assignee_slug:this._assignee}:{},...a?{rotation_owners:this._rotatingOwners,current_owner:u?this._rotatingOwners[0]:this.task.metadata.current_owner}:{}}};this.dispatchEvent(new CustomEvent(`task-updated`,{detail:{task:e},bubbles:!0,composed:!0}))}this._close()}catch(e){this._error=wi(e,`Failed to save`),this._saving=!1}}async _delete(){if(!this._saving){this._saving=!0,this._error=``;try{await ua(this.hass,this.task.uid),this.dispatchEvent(new CustomEvent(`task-deleted`,{detail:{uid:this.task.uid},bubbles:!0,composed:!0})),this._close()}catch(e){this._error=wi(e,`Failed to delete`),this._saving=!1,this._confirmingDelete=!1}}}_toggleRotatingOwner(e){if(this._rotatingOwners.includes(e)){if(this._rotatingOwners.length<=1)return;this._rotatingOwners=this._rotatingOwners.filter(t=>t!==e)}else this._rotatingOwners=[...this._rotatingOwners,e]}_moveOwner(e,t){let n=this._rotatingOwners.indexOf(e);if(n<0)return;let r=[...this._rotatingOwners],i=t===`up`?n-1:n+1;i<0||i>=r.length||([r[n],r[i]]=[r[i],r[n]],this._rotatingOwners=r)}_toggleDay(e){this._recurrenceDays=this._recurrenceDays.includes(e)?this._recurrenceDays.filter(t=>t!==e):[...this._recurrenceDays,e]}render(){var e,t;if(!this.task)return I``;let n=this.task.metadata.member_slug===`household`,r=n?`Household`:((e=this.members.find(e=>e.slug===this.task.metadata.member_slug))==null?void 0:e.name)??this.task.metadata.member_slug,i=this._buildRRule(),a=this._isCustomRecurrence?`Custom recurrence (not editable here)`:dn(i),o={MO:`Mon`,TU:`Tue`,WE:`Wed`,TH:`Thu`,FR:`Fri`,SA:`Sat`,SU:`Sun`};return I`
      <div
        class="backdrop"
        @pointerdown=${this._onBackdropPointerDown}
        @pointerup=${this._onBackdropPointerUp}
        @pointercancel=${this._onBackdropPointerCancel}
      ></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Edit task">
        <div class="popover-header">
          <h2 class="popover-title">Edit Task</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label>Member</label>
          <div class="readonly-field" title="Member cannot be changed in v1">${r}</div>
          <div class="readonly-tooltip">Member cannot be changed here</div>
        </div>

        ${n&&this._type!==`rotating`?I`
              <div class="field">
                <label for="et-assignee">Assignee (optional)</label>
                <select
                  id="et-assignee"
                  .value=${this._assignee}
                  @change=${e=>this._assignee=e.target.value}
                >
                  <option value="">— None —</option>
                  ${this.members.filter(e=>e.slug!==`household`).map(e=>I`<option value=${e.slug}>${e.name}</option>`)}
                </select>
              </div>
            `:``}

        <div class="field">
          <label for="et-summary">Summary *</label>
          <input
            id="et-summary"
            type="text"
            maxlength="200"
            .value=${this._summary}
            @input=${e=>this._summary=e.target.value}
          />
        </div>

        <div class="field">
          <label>Type</label>
          <div class="type-row">
            <button class="type-btn ${this._type===`routine`?`active`:``}" @click=${()=>this._type=`routine`}>Routine</button>
            <button class="type-btn ${this._type===`chore`?`active`:``}" @click=${()=>this._type=`chore`}>Chore</button>
            ${((t=this.task)==null||(t=t.metadata)==null?void 0:t.member_slug)===`household`?I`<button class="type-btn ${this._type===`rotating`?`active`:``}" @click=${()=>this._type=`rotating`}>Rotating</button>`:``}
          </div>
        </div>

        <div class="field">
          <label for="et-time-of-day">Time of day</label>
          <select
            id="et-time-of-day"
            .value=${this._timeOfDay}
            @change=${e=>this._timeOfDay=e.target.value}
          >
            <option value="anytime">Anytime</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div class="field">
          <label for="et-icon">Icon</label>
          <input
            id="et-icon"
            type="text"
            placeholder="Emoji or empty"
            maxlength="8"
            .value=${this._icon}
            @input=${e=>this._icon=e.target.value}
          />
        </div>

        ${this._type===`rotating`?I`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter(e=>e.slug!==`household`).map(e=>{let t=this._rotatingOwners.includes(e.slug),n=this._rotatingOwners.indexOf(e.slug);return I`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${t}
                    ?disabled=${this._rotatingOwners.length<=1&&t}
                    @change=${()=>this._toggleRotatingOwner(e.slug)}
                    aria-label="${e.name}"
                  />
                  ${t?I`<span class="owner-order">${n+1}.</span>`:I`<span class="owner-order"></span>`}
                  <span class="owner-name">${e.name}</span>
                  ${t?I`
                    <div class="reorder-btns">
                      <button
                        class="reorder-btn"
                        ?disabled=${n===0}
                        @click=${()=>this._moveOwner(e.slug,`up`)}
                        aria-label="Move ${e.name} earlier"
                      >▲</button>
                      <button
                        class="reorder-btn"
                        ?disabled=${n===this._rotatingOwners.length-1}
                        @click=${()=>this._moveOwner(e.slug,`down`)}
                        aria-label="Move ${e.name} later"
                      >▼</button>
                    </div>
                  `:``}
                </div>
              `})}
          </div>
          ${this._rotatingOwners.length<2?I`<div class="owners-hint">Select at least 2 owners — delete the task to remove all owners</div>`:``}
        </div>
        `:I`
        <div class="field">
          <label for="et-recurrence">Recurrence</label>
          ${this._isCustomRecurrence?I`<div class="custom-recurrence-note">${a}</div>`:I`
                <select
                  id="et-recurrence"
                  .value=${this._recurrenceMode}
                  @change=${e=>this._recurrenceMode=e.target.value}
                >
                  <option value="none">None (one-off)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly-date">Monthly by date</option>
                  <option value="monthly-nth">Monthly by Nth weekday</option>
                  <option value="yearly">Yearly</option>
                </select>

                ${this._recurrenceMode===`none`?``:I`
                      <div class="recurrence-extra">
                        ${this._recurrenceMode!==`monthly-nth`&&this._recurrenceMode!==`yearly`?I`
                              <div>
                                <label>Interval</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  .value=${String(this._recurrenceInterval)}
                                  @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceInterval=isNaN(t)||t<1?1:t}}
                                />
                              </div>
                            `:``}

                        ${this._recurrenceMode===`weekly`?I`
                              <div>
                                <label>Days</label>
                                <div class="days-row">
                                  ${nn.map(e=>I`
                                    <button
                                      class="day-btn ${this._recurrenceDays.includes(e)?`selected`:``}"
                                      @click=${()=>this._toggleDay(e)}
                                    >${o[e]}</button>
                                  `)}
                                </div>
                              </div>
                            `:``}

                        ${this._recurrenceMode===`monthly-date`?I`
                              <div>
                                <label>Day of month</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  .value=${String(this._recurrenceMonthDay)}
                                  @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceMonthDay=isNaN(t)||t<1?1:Math.min(t,31)}}
                                />
                              </div>
                            `:``}

                        ${this._recurrenceMode===`monthly-nth`?I`
                              <div style="display:flex;gap:8px">
                                <div style="flex:1">
                                  <label>Nth</label>
                                  <select
                                    .value=${String(this._recurrenceNth)}
                                    @change=${e=>this._recurrenceNth=parseInt(e.target.value,10)}
                                  >
                                    <option value="1">1st</option>
                                    <option value="2">2nd</option>
                                    <option value="3">3rd</option>
                                    <option value="4">4th</option>
                                    <option value="-1">Last</option>
                                  </select>
                                </div>
                                <div style="flex:1">
                                  <label>Day</label>
                                  <select
                                    .value=${this._recurrenceNthDay}
                                    @change=${e=>this._recurrenceNthDay=e.target.value}
                                  >
                                    ${nn.map(e=>I`<option value=${e}>${o[e]}</option>`)}
                                  </select>
                                </div>
                                <div style="flex:1">
                                  <label>Every N months</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    .value=${String(this._recurrenceInterval)}
                                    @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceInterval=isNaN(t)||t<1?1:t}}
                                  />
                                </div>
                              </div>
                            `:``}

                        ${this._recurrenceMode===`yearly`?I`
                              <div style="display:flex;gap:8px">
                                <div style="flex:1">
                                  <label>Month</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    .value=${String(this._recurrenceMonth)}
                                    @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceMonth=isNaN(t)||t<1?1:Math.min(t,12)}}
                                  />
                                </div>
                                <div style="flex:1">
                                  <label>Day</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    .value=${String(this._recurrenceMonthDay)}
                                    @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceMonthDay=isNaN(t)||t<1?1:Math.min(t,31)}}
                                  />
                                </div>
                                <div style="flex:1">
                                  <label>Every N years</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    .value=${String(this._recurrenceInterval)}
                                    @change=${e=>{let t=parseInt(e.target.value,10);this._recurrenceInterval=isNaN(t)||t<1?1:t}}
                                  />
                                </div>
                              </div>
                            `:``}

                        ${this._displayedStart()?I`
                              <div>
                                <label for="et-start">Starting on</label>
                                <input
                                  id="et-start"
                                  type="date"
                                  .value=${this._displayedStart()??``}
                                  @change=${e=>this._recurrenceStart=e.target.value}
                                />
                              </div>
                            `:``}
                      </div>
                      <div class="recurrence-summary">${a}</div>
                    `}
              `}
        </div>
        `}

        ${this._type===`rotating`?``:I`
        <div class="field">
          <label for="et-due">Due (optional)</label>
          <input
            id="et-due"
            type="datetime-local"
            .value=${this._due}
            @change=${e=>this._due=e.target.value}
          />
        </div>
        `}

        ${this._showPoints()?I`
              <div class="field">
                <label for="et-points">Points</label>
                <input
                  id="et-points"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  inputmode="numeric"
                  .value=${this._points}
                  @input=${e=>this._points=e.target.value}
                />
              </div>
            `:``}

        ${this._error?I`<div class="error-msg">${this._error}</div>`:``}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button
            class="btn btn-save"
            ?disabled=${this._saving||this._type===`rotating`&&this._rotatingOwners.length<2}
            @click=${this._save}
          >
            ${this._saving?`Saving…`:`Save`}
          </button>
        </div>

        <div class="delete-zone">
          ${this._confirmingDelete?I`
                <div class="confirm-delete">
                  <span>Delete this task?</span>
                  <button
                    style="background:#f44336;color:#fff"
                    ?disabled=${this._saving}
                    @click=${this._delete}
                  >Yes, delete</button>
                  <button
                    style="background:rgba(0,0,0,0.06)"
                    @click=${()=>this._confirmingDelete=!1}
                  >Cancel</button>
                </div>
              `:I`
                <button class="btn btn-delete" @click=${()=>this._confirmingDelete=!0}>
                  Delete Task
                </button>
              `}
        </div>
      </div>
    `}},$=(Ta.styles=[G,P`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        z-index: 1;
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .popover-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
      }
      .field {
        margin-bottom: var(--lucarne-spacing-md);
      }
      label {
        display: block;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin-bottom: 4px;
      }
      input[type='text'],
      input[type='datetime-local'],
      input[type='number'],
      select {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 10px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        background: var(--lucarne-surface);
        min-height: 44px;
        font-family: inherit;
      }
      input:focus, select:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      .readonly-field {
        padding: 8px 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: var(--lucarne-radius-sm);
        background: rgba(0, 0, 0, 0.03);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        display: flex;
        align-items: center;
        position: relative;
      }
      .readonly-tooltip {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        margin-top: 2px;
        font-style: italic;
      }
      .type-row {
        display: flex;
        gap: var(--lucarne-spacing-sm);
      }
      .type-btn {
        flex: 1;
        padding: 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        background: var(--lucarne-surface);
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        min-height: 44px;
      }
      .type-btn.active {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }
      .recurrence-summary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
        font-style: italic;
      }
      .custom-recurrence-note {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        padding: 6px 0;
      }
      .recurrence-extra {
        margin-top: var(--lucarne-spacing-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .days-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .day-btn {
        padding: 4px 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        cursor: pointer;
        background: none;
        font-size: 0.75rem;
        min-height: 32px;
      }
      .day-btn.selected {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }
      .delete-zone {
        margin-top: var(--lucarne-spacing-md);
        padding-top: var(--lucarne-spacing-md);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }
      .error-msg {
        color: #c62828;
        font-size: var(--lucarne-fs-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        padding: 6px 10px;
        background: #ffebee;
        border-radius: var(--lucarne-radius-sm);
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
      .btn {
        padding: 8px 20px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        min-height: 44px;
        min-width: 80px;
      }
      .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
      }
      .btn-save {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-delete {
        background: none;
        border: 1px solid #f44336;
        color: #f44336;
        width: 100%;
      }
      .confirm-delete {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        align-items: center;
        font-size: var(--lucarne-fs-sm);
        color: #c62828;
      }
      .confirm-delete button {
        padding: 4px 12px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        min-height: 36px;
      }
      .owners-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }
      .owner-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .owner-item:last-child {
        border-bottom: none;
      }
      .owner-item input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .owner-item input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .owner-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owner-order {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        min-width: 16px;
        text-align: right;
        flex-shrink: 0;
      }
      .owner-name {
        flex: 1;
      }
      .reorder-btns {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
      }
      .reorder-btn {
        background: none;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.65rem;
        padding: 1px 5px;
        min-height: 18px;
        line-height: 1;
        color: var(--lucarne-on-surface-muted);
      }
      .reorder-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .owners-hint {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        margin-top: 4px;
      }
    `],Ta);K([U({attribute:!1})],$.prototype,`hass`,void 0),K([U({attribute:!1})],$.prototype,`task`,void 0),K([U({attribute:!1})],$.prototype,`members`,void 0),K([U({type:Boolean})],$.prototype,`isAdmin`,void 0),K([W()],$.prototype,`_summary`,void 0),K([W()],$.prototype,`_type`,void 0),K([W()],$.prototype,`_icon`,void 0),K([W()],$.prototype,`_recurrenceMode`,void 0),K([W()],$.prototype,`_recurrenceDays`,void 0),K([W()],$.prototype,`_recurrenceInterval`,void 0),K([W()],$.prototype,`_recurrenceMonthDay`,void 0),K([W()],$.prototype,`_recurrenceNth`,void 0),K([W()],$.prototype,`_recurrenceNthDay`,void 0),K([W()],$.prototype,`_recurrenceMonth`,void 0),K([W()],$.prototype,`_recurrenceStart`,void 0),K([W()],$.prototype,`_due`,void 0),K([W()],$.prototype,`_assignee`,void 0),K([W()],$.prototype,`_timeOfDay`,void 0),K([W()],$.prototype,`_isCustomRecurrence`,void 0),K([W()],$.prototype,`_rawRecurrence`,void 0),K([W()],$.prototype,`_points`,void 0),K([W()],$.prototype,`_error`,void 0),K([W()],$.prototype,`_saving`,void 0),K([W()],$.prototype,`_confirmingDelete`,void 0),K([W()],$.prototype,`_rotatingOwners`,void 0),$=K([H(`lucarne-edit-task-popover`)],$);var Ea,Da=e=>e===1?`point`:`points`,Oa=`button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])`,ka=(Ea=class extends V{constructor(){super(),this.members=[],this._step={kind:`list`},this._busy=!1,this._error=``,this._onKeydown=e=>{if(e.key===`Escape`){e.preventDefault(),this._close();return}if(e.key!==`Tab`)return;let t=Array.from(this.renderRoot.querySelectorAll(Oa));if(t.length===0)return;let n=this.renderRoot.activeElement,r=n?t.indexOf(n):-1,i=e.shiftKey?r<=0?t.length-1:r-1:r===t.length-1?0:r+1;e.preventDefault(),t[i].focus()},this.addEventListener(`keydown`,this._onKeydown)}firstUpdated(){var e;(e=this._closeButton())==null||e.focus()}updated(){let e=this.renderRoot;if(e.querySelector(`:focus`))return;let t=e.querySelector(`.confirm ~ .actions button:not([disabled]), .confirm ~ label.pick input:not([disabled])`)??this._closeButton();t==null||t.focus()}_closeButton(){return this.renderRoot.querySelector(`.close-btn`)}_close(){this.dispatchEvent(new CustomEvent(`popover-close`,{bubbles:!0,composed:!0}))}_go(e){this._step=e,this._error=``}_reward(e){return this.rewards.rewards.find(t=>t.id===e)}_balance(e){return this.rewards.balances[e]??0}_name(e){var t;return((t=this.members.find(t=>t.slug===e))==null?void 0:t.name)??e}async _submitClaim(e,t){if(!this._busy){this._busy=!0,this._error=``;try{let n=await va(this.hass,this.member.slug,e.id,t.length?t:void 0),r={id:n.claim_id,reward_id:e.id,reward_name:e.name,cost:e.cost,claimer_slug:this.member.slug,status:`pending`,created_at:(/* @__PURE__ */ new Date()).toISOString(),resolved_at:null,contributors:Object.entries(n.shares).map(([e,t])=>({member_slug:e,share:t}))};this.dispatchEvent(new CustomEvent(`reward-claimed`,{detail:{claim:r},bubbles:!0,composed:!0})),this._go({kind:`list`})}catch(e){this._error=wi(e,`Could not claim this reward`)}finally{this._busy=!1}}}async _submitCancel(e){if(!this._busy){this._busy=!0,this._error=``;try{await ya(this.hass,e),this.dispatchEvent(new CustomEvent(`claim-cancelled`,{detail:{claimId:e},bubbles:!0,composed:!0})),this._go({kind:`list`})}catch(e){this._error=wi(e,`Could not cancel this claim`)}finally{this._busy=!1}}}render(){if(!this.member||!this.rewards)return L;let e=this._balance(this.member.slug),t=this.rewards.claims.filter(e=>e.status===`pending`&&(e.claimer_slug===this.member.slug||e.contributors.some(e=>e.member_slug===this.member.slug))),n=Gi(this.rewards.rewards,e);return I`
      <div class="backdrop" @click=${this._close}></div>
      <div
        class="popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rw-title"
      >
        <div class="popover-header">
          <h2 id="rw-title">${this.member.name}'s rewards</h2>
          <button class="close-btn" type="button" aria-label="Close" @click=${this._close}>✕</button>
        </div>
        <div class="balance">
          <span class="balance-num">⭐ ${e}</span><span class="balance-unit">${Da(e)}</span>
        </div>
        ${this._renderPending(t)}
        ${n.length===0?I`<p class="sub">No rewards yet — ask a grown-up to add some.</p>`:I`${t.length?I`<h3>Rewards</h3>`:L}${n.map(t=>this._renderReward(t,e))}`}
        ${this._renderError()}
      </div>
    `}_renderError(){return this._error?I`<div class="alert" role="alert">${this._error}</div>`:L}_renderPending(e){return e.length===0?L:I`
      <h3>Waiting for a grown-up</h3>
      ${e.map(e=>{let t=e.contributors.find(e=>e.member_slug===this.member.slug),n=e.claimer_slug===this.member.slug,r=e.contributors.filter(t=>t.member_slug!==this.member.slug&&t.member_slug!==e.claimer_slug).map(e=>this._name(e.member_slug)),i=this._step.kind===`cancelConfirm`&&this._step.claimId===e.id,a=(t==null?void 0:t.share)??0,o=[`${a} ${Da(a)} set aside${n?``:` for ${this._name(e.claimer_slug)}'s claim`}`,r.length?`with ${r.join(`, `)}`:``].filter(Boolean).join(`, `);return I`
          <div class="item">
            <div class="item-main">
              <div class="item-text">
                <div class="name">${e.reward_name}</div>
                <div class="sub">${o}</div>
              </div>
              ${n&&!i?I`<button type="button" class="ghost" ?disabled=${this._busy} @click=${()=>this._go({kind:`cancelConfirm`,claimId:e.id})}>Cancel</button>`:L}
            </div>
            ${i?I`<div class="confirm">Cancel claim?</div>
                  <div class="actions">
                    <button type="button" class="primary" ?disabled=${this._busy} @click=${()=>this._submitCancel(e.id)}>Yes, cancel</button>
                    <button type="button" ?disabled=${this._busy} @click=${()=>this._go({kind:`list`})}>Keep</button>
                  </div>`:L}
          </div>
        `})}
    `}_renderReward(e,t){let n=e.cost<=t,r=this._step,i=this.members.filter(e=>e.slug!==this.member.slug&&e.slug!==`household`),a=e.poolable&&i.length>0,o;if(r.kind===`confirm`&&r.rewardId===e.id)o=I`
        <div class="confirm">Claim ${e.name} for ${e.cost} ${Da(e.cost)}?</div>
        <div class="actions">
          <button type="button" class="primary" ?disabled=${this._busy} @click=${()=>this._submitClaim(e,[])}>Claim</button>
          <button type="button" ?disabled=${this._busy} @click=${()=>this._go({kind:`list`})}>Back</button>
        </div>
      `;else if(r.kind===`pool`&&r.rewardId===e.id)o=this._renderPool(e,r.selected,i);else{let r=e.cost-t,i=I`<span class="sub">${r} more ${Da(r)}</span>`;o=I`
        ${n?L:t>0?I`<div class="progress">
                <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax=${e.cost} aria-valuenow=${t} aria-label="Progress to ${e.name}">
                  <span style="width:${t/e.cost*100}%"></span>
                </div>
                ${i}
              </div>`:I`<div class="progress">${i}</div>`}
        ${a?I`<button type="button" class="ghost pool" ?disabled=${this._busy} @click=${()=>this._go({kind:`pool`,rewardId:e.id,selected:[]})}>Claim together</button>`:L}
      `}let s=!(`rewardId`in r&&r.rewardId===e.id),c=n&&s?I`<button type="button" class="primary claim-btn" ?disabled=${this._busy} aria-label="Claim ${e.name} for ${e.cost} ${Da(e.cost)}" @click=${()=>this._go({kind:`confirm`,rewardId:e.id})}>Claim <span class="cost">⭐ ${e.cost}</span></button>`:I`<span class="price">⭐ ${e.cost}</span>`;return I`
      <div class="item" aria-disabled=${n?`false`:`true`}>
        <div class="item-main">
          <div class="item-text">
            <div class="name">${e.name}</div>
            ${e.description?I`<div class="desc">${e.description}</div>`:L}
          </div>
          ${c}
        </div>
        ${o}
      </div>
    `}_renderPool(e,t,n){let r=Hi(e.cost,this.member.slug,t),i=[];if(r)for(let[e,t]of r)t>this._balance(e)&&i.push(e);let a=r!==null&&t.length>0&&i.length===0,o=r?[...r].map(([e,t])=>`${e===this.member.slug?`You pay`:`${this._name(e)} pays`} ${t}`).join(`, `):``,s=n=>{let r=t.includes(n)?t.filter(e=>e!==n):[...t,n];this._go({kind:`pool`,rewardId:e.id,selected:r})};return I`
      <div class="confirm">Who is chipping in?</div>
      ${n.map(e=>I`
        <label class="pick">
          <input type="checkbox" .checked=${t.includes(e.slug)} ?disabled=${this._busy} @change=${()=>s(e.slug)} />
          <lucarne-member-avatar name=${e.name} color=${e.color} .avatar=${e.avatar}></lucarne-member-avatar>
          <span>${e.name} <span class="sub">has ${this._balance(e.slug)}</span></span>
          ${r!=null&&r.has(e.slug)&&i.includes(e.slug)?I`<span class="sub">needs ${(r.get(e.slug)??0)-this._balance(e.slug)} more</span>`:L}
        </label>
      `)}
      ${r===null?I`<div class="sub">Too many people for this reward</div>`:I`<div class="sub">${o}</div>`}
      ${r&&i.includes(this.member.slug)?I`<div class="sub">You need ${(r.get(this.member.slug)??0)-this._balance(this.member.slug)} more</div>`:L}
      <div class="actions">
        <button type="button" class="primary" ?disabled=${this._busy||!a} @click=${()=>this._submitClaim(e,t)}>Ask together</button>
        <button type="button" ?disabled=${this._busy} @click=${()=>this._go({kind:`list`})}>Back</button>
      </div>
    `}},Ea.styles=[G,Or,P`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        z-index: 1;
        color: var(--lucarne-on-surface);
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h2,
      h3 {
        margin: 0;
      }
      h2 {
        font-size: var(--lucarne-fs-lg);
      }
      h3 {
        font-size: var(--lucarne-fs-md);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin: 20px 0 4px;
      }
      /* The one place the balance is stated, and where ⭐ is taught to mean points. */
      .balance {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin: 8px 0 4px;
      }
      .balance-num {
        font-size: var(--lucarne-fs-xl);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .balance-unit {
        color: var(--lucarne-on-surface-muted);
      }
      /* Each reward's cost, stated once. Filled = you can get it now. */
      .price {
        flex-shrink: 0;
        padding: 2px 10px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 999px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      button {
        font: inherit;
        min-height: 44px;
        min-width: 44px;
        padding: 0 14px;
        border-radius: 22px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        background: var(--lucarne-surface);
        color: var(--lucarne-on-surface);
        cursor: pointer;
      }
      button.primary {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
        font-weight: 600;
      }
      /* Secondary actions that should not compete with Claim; still a 44px target. */
      button.ghost {
        border-color: transparent;
        background: none;
        padding: 0 4px;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-color: rgba(0, 0, 0, 0.25);
      }
      button.pool {
        margin-top: 2px;
        margin-left: -4px;
      }
      .claim-btn {
        flex-shrink: 0;
        white-space: nowrap;
      }
      .claim-btn .cost {
        font-variant-numeric: tabular-nums;
        margin-left: 4px;
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .close-btn {
        border: none;
        background: none;
        font-size: 1.25rem;
      }
      .item {
        padding: 10px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .item:last-child {
        border-bottom: none;
      }
      .item[aria-disabled='true'] .name {
        color: var(--lucarne-on-surface-muted);
      }
      .item-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        min-height: 44px;
      }
      .item-text {
        min-width: 0;
      }
      .name {
        font-weight: 600;
      }
      .desc,
      .sub {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      .confirm {
        margin-top: 8px;
        font-weight: 600;
      }
      .alert {
        margin-top: 8px;
        padding: 8px 10px;
        border-radius: var(--lucarne-radius-sm);
        background: rgba(219, 68, 55, 0.12);
        color: #8c1d13;
      }
      .progress {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 6px;
      }
      .progress .sub {
        white-space: nowrap;
      }
      .bar {
        display: block;
        flex: 1;
        height: 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      .bar > span {
        display: block;
        height: 100%;
        background: var(--primary-color, #03a9f4);
      }
      label.pick {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 44px;
      }
      label.pick lucarne-member-avatar {
        --lucarne-avatar-size: 32px;
        --lucarne-avatar-font: 0.9rem;
        flex-shrink: 0;
      }
      label.pick input {
        width: 22px;
        height: 22px;
      }
    `],Ea);K([U({attribute:!1})],ka.prototype,`hass`,void 0),K([U({attribute:!1})],ka.prototype,`member`,void 0),K([U({attribute:!1})],ka.prototype,`members`,void 0),K([U({attribute:!1})],ka.prototype,`rewards`,void 0),K([W()],ka.prototype,`_step`,void 0),K([W()],ka.prototype,`_busy`,void 0),K([W()],ka.prototype,`_error`,void 0),ka=K([H(`lucarne-rewards-modal`)],ka);var Aa,ja=1e4,Ma=3e4;function Na(e,t){if(e.summary!==t.summary||(e.due??``)!==(t.due??``))return!1;let n=e.metadata,r=t.metadata;return n.type===r.type&&n.icon===r.icon&&n.recurrence===r.recurrence&&(n.time_of_day??`anytime`)===(r.time_of_day??`anytime`)&&(n.assignee_slug??``)===(r.assignee_slug??``)&&(n.current_owner??``)===(r.current_owner??``)&&(n.points??0)===(r.points??0)&&JSON.stringify(n.rotation_owners??[])===JSON.stringify(r.rotation_owners??[])}window.customCards=window.customCards||[],window.customCards.push({type:`lucarne-chores-card`,name:`Lucarne Chores`,description:`Family chore grid with streaks and celebration`,preview:!0}),A(`evaluating:lucarne-chores-card`);var Pa=(Aa=class extends ft{constructor(...e){super(...e),this._familyState=null,this._addTaskMember=null,this._editTask=null,this._rewardsMember=null,this._optimistic=/* @__PURE__ */ new Map,this._optimisticAdds=/* @__PURE__ */ new Map,this._deletedUids=/* @__PURE__ */ new Set,this._optimisticEdits=/* @__PURE__ */ new Map,this._rewardsOverlay=new Vi,this._addTimers=/* @__PURE__ */ new Map,this._editTimers=/* @__PURE__ */ new Map,this._onFamilyState=e=>{var t;if(this._optimistic.size>0||this._optimisticAdds.size>0||this._deletedUids.size>0||this._optimisticEdits.size>0){let t=/* @__PURE__ */ new Set,n=/* @__PURE__ */ new Map,r=new Map(this._optimistic);for(let i of e.tasksByMember.values())for(let e of i)t.add(e.uid),n.set(e.uid,e),r.get(e.uid)===e.status&&r.delete(e.uid);if(this._deletedUids.size>0){let e=/* @__PURE__ */ new Set;for(let n of this._deletedUids)t.has(n)&&e.add(n);e.size!==this._deletedUids.size&&(this._deletedUids=e)}if(this._optimistic.size>0){for(let e of r.keys())t.has(e)||r.delete(e);this._optimistic=r}if(this._optimisticAdds.size>0){let e=new Map(this._optimisticAdds),n=!1;for(let r of e.keys())t.has(r)&&(e.delete(r),this._clearAddTimeout(r),n=!0);n&&(this._optimisticAdds=e)}if(this._optimisticEdits.size>0){let e=new Map(this._optimisticEdits),t=!1;for(let[r,i]of e){let a=n.get(r);(!a||Na(a,i))&&(e.delete(r),this._clearEditTimeout(r),t=!0)}t&&(this._optimisticEdits=e)}}this._rewardsOverlay.reconcile(e.rewardsFetchedAt),e.rewards||(this._rewardsMember=null);let n=((t=this._familyState)==null?void 0:t.resetTime)!==e.resetTime;this._familyState=e,n&&this.isConnected&&this._scheduleMidnightRefresh()},this._handleTaskUpdated=e=>{let{task:t}=e.detail;t!=null&&t.uid&&(this._optimisticEdits=new Map(this._optimisticEdits).set(t.uid,t),this._scheduleEditCleanup(t.uid))},this._handleTaskDeleted=e=>{let{uid:t}=e.detail;if(t){if(this._optimisticAdds.has(t)){let e=new Map(this._optimisticAdds);e.delete(t),this._clearAddTimeout(t),this._optimisticAdds=e}this._deletedUids=new Set(this._deletedUids).add(t)}},this._handleTaskAdded=e=>{let{tasks:t}=e.detail;if(!(t!=null&&t.length))return;let n=new Map(this._optimisticAdds);for(let e of t)n.set(e.uid,e),this._scheduleAddCleanup(e.uid);this._optimisticAdds=n},this._handleRewardsOpen=e=>{var t,n;let{memberSlug:r}=e.detail,i=(t=this._familyState)==null?void 0:t.members.find(e=>e.slug===r);i&&(n=this._familyState)!=null&&n.rewards&&(this._rewardsMember=i)},this._handleRewardClaimed=e=>{this._rewardsOverlay.addClaim(e.detail.claim),this.requestUpdate()},this._handleClaimCancelled=e=>{this._rewardsOverlay.resolveClaim(e.detail.claimId,`cancelled`),this.requestUpdate()},this._closeRewards=async()=>{var e,t,n;let r=(e=this._rewardsMember)==null?void 0:e.slug;this._rewardsMember=null,await this.updateComplete;let i=Array.from(this.renderRoot.querySelectorAll(`lucarne-member-column`)).find(e=>{var t;return((t=e.member)==null?void 0:t.slug)===r}),a=i==null||(t=i.shadowRoot)==null?void 0:t.querySelector(`lucarne-reward-balance-pill`);a==null||(n=a.shadowRoot)==null||(n=n.querySelector(`button`))==null||n.focus()}}applyConfig(e){if(`kids`in e){this._config=e;return}if(!Array.isArray(e.members))throw new dt(`lucarne-chores-card: members must be an array`);this._config=e,this.isConnected&&this._scheduleScrollRefresh()}static getConfigElement(){return document.createElement(`lucarne-chores-card-editor`)}getCardSize(){return 5}getGridOptions(){return{columns:12,rows:`auto`,min_rows:7,min_columns:6,max_columns:12}}static getStubConfig(){return{type:`custom:lucarne-chores-card`,title:`Chores`,members:[]}}connectedCallback(){super.connectedCallback(),this.hass&&!this._unsubFamily&&(this._unsubFamily=tn(this.hass,this._onFamilyState,{rewards:!0})),this._scheduleMidnightRefresh(),this._scheduleScrollRefresh()}_scheduleMidnightRefresh(){var e;this._midnightTimer&&clearTimeout(this._midnightTimer);let t=((e=this._familyState)==null?void 0:e.resetTime)??``,n=At(/* @__PURE__ */ new Date,[`00:00`,t]);this._midnightTimer=setTimeout(()=>{this._midnightTimer=void 0,this.requestUpdate(),this._scheduleMidnightRefresh()},n)}_scheduleScrollRefresh(){var e,t,n;if(this._scrollTimer&&clearTimeout(this._scrollTimer),this._scrollTimer=void 0,!(((e=this._config)==null?void 0:e.auto_scroll)??!0))return;let r=((t=this._config)==null?void 0:t.afternoon_start)??`12:00`,i=((n=this._config)==null?void 0:n.night_start)??`19:00`,a=At(/* @__PURE__ */ new Date,[r,i]);Number.isFinite(a)&&(this._scrollTimer=setTimeout(()=>{this._scrollTimer=void 0,this.requestUpdate(),this._scheduleScrollRefresh()},a))}updated(e){super.updated(e),e.has(`hass`)&&this.hass&&!this._unsubFamily&&(this._unsubFamily=tn(this.hass,this._onFamilyState,{rewards:!0}))}_scheduleEditCleanup(e){this._clearEditTimeout(e),this._editTimers.set(e,setTimeout(()=>{if(this._editTimers.delete(e),this._optimisticEdits.has(e)){let t=new Map(this._optimisticEdits);t.delete(e),this._optimisticEdits=t}},Ma))}_clearEditTimeout(e){let t=this._editTimers.get(e);t!==void 0&&(clearTimeout(t),this._editTimers.delete(e))}_scheduleAddCleanup(e){this._clearAddTimeout(e),this._addTimers.set(e,setTimeout(()=>{if(this._addTimers.delete(e),this._optimisticAdds.has(e)){let t=new Map(this._optimisticAdds);t.delete(e),this._optimisticAdds=t}},ja))}_clearAddTimeout(e){let t=this._addTimers.get(e);t!==void 0&&(clearTimeout(t),this._addTimers.delete(e))}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._unsubFamily)==null||e.call(this),this._unsubFamily=void 0,this._midnightTimer&&(clearTimeout(this._midnightTimer),this._midnightTimer=void 0),this._scrollTimer&&(clearTimeout(this._scrollTimer),this._scrollTimer=void 0);for(let e of this._addTimers.values())clearTimeout(e);this._addTimers.clear();for(let e of this._editTimers.values())clearTimeout(e);this._editTimers.clear()}_overlaidRewards(){var e;let t=(e=this._familyState)==null?void 0:e.rewards;return t?this._rewardsOverlay.apply(t):null}_resolveMembers(){if(!this._config||!this._familyState)return[];let{members:e}=this._config,t=new Set(this._config.hidden_members??[]),n=this._config.show_routines??!0,r=this._config.show_tasks??!0,i=/* @__PURE__ */ new Date,a=new Date(i.getFullYear(),i.getMonth(),i.getDate(),23,59,59,999),o=e=>this._optimisticEdits.get(e.uid)??e,s=this._familyState.resetTime,c=e=>e.status===`completed`&&e.metadata.type===`chore`&&Nt(e.completed,i,s),l=(this._familyState.tasksByMember.get(`household`)??[]).filter(e=>!this._deletedUids.has(e.uid)).map(o),u=e=>{let t=this._optimistic.get(e.uid);return t&&t!==e.status?{...e,status:t}:e},d=e=>{if(c(e))return!1;if(e.metadata.type===`routine`){if(!n)return!1;let t=an(e.metadata.recurrence);return t.mode===`none`||t.mode===`unknown`||yn(t,i)}return e.metadata.type===`chore`&&r?e.due===null||(e.due.includes(`T`)?new Date(e.due):/* @__PURE__ */ new Date(e.due+`T00:00:00`))<=a:!1},f=e=>{if(!n||e.metadata.type!==`routine`||c(e))return!1;let t=an(e.metadata.recurrence);return t.mode===`none`||t.mode===`unknown`?!1:!yn(t,i)},p=this._overlaidRewards(),m=[...this._optimisticAdds.values()],h=new Set(l.map(e=>e.uid)),g=[];for(let n of e){if(t.has(n))continue;let e=n===`household`?Zt:this._familyState.members.find(e=>e.slug===n)??null;if(!e)continue;let i=(this._familyState.tasksByMember.get(n)??[]).filter(e=>!this._deletedUids.has(e.uid)).map(o),a=new Set(i.map(e=>e.uid)),s=i.filter(d).map(u),c=[...i,...m.filter(e=>e.metadata.member_slug===n&&!a.has(e.uid)&&!this._deletedUids.has(e.uid))].filter(f),_=m.filter(e=>e.metadata.member_slug===n&&e.metadata.type!==`rotating`&&!a.has(e.uid)&&!this._deletedUids.has(e.uid)&&d(e)),v;if(n===`household`)v=[...s,..._];else{let e=r?l.filter(e=>e.metadata.type===`rotating`&&e.metadata.current_owner===n).map(u):[],t=r?m.filter(e=>e.metadata.type===`rotating`&&e.metadata.current_owner===n&&!h.has(e.uid)&&!this._deletedUids.has(e.uid)):[];v=[...s,...e,..._,...t]}let y=this._familyState.streakByMember.get(n)??0,b=p&&n!==`household`?p.balances[n]??0:null;g.push({member:e,tasks:v,notToday:c,streak:y,balance:b,affordable:p!==null&&b!==null&&Wi(p.rewards,b).length>0,hasActiveRewards:(p==null?void 0:p.rewards.some(e=>!e.archived))??!1})}return g}async _handleTaskToggle(e){var t;let{task:n}=e.detail;if(!this.hass||!this._familyState)return;let r=n.status===`completed`?`needs_action`:`completed`,i=n.metadata.member_slug===`household`?`todo.lucarne_household`:((t=this._familyState.members.find(e=>e.slug===n.metadata.member_slug))==null?void 0:t.todo_entity_id)??``;if(i){this._optimistic=new Map(this._optimistic).set(n.uid,r);try{await this.hass.callService(`todo`,`update_item`,{item:n.uid,status:r},{entity_id:i})}catch(e){let t=new Map(this._optimistic);throw t.delete(n.uid),this._optimistic=t,e}this._recordTickDelta(n,r===`completed`)}}_recordTickDelta(e,t){var n;let r=e.metadata.points??0;if(r<=0||!((n=this._familyState)!=null&&n.rewards))return;let i=e.metadata.type===`rotating`?e.metadata.current_owner??``:e.metadata.member_slug;i&&i!==`household`&&(this._rewardsOverlay.addTickDelta(e.uid,i,t?r:-r),this.requestUpdate())}_handleAddTask(e){let{memberSlug:t}=e.detail;if(!this._familyState)return;let n=t===`household`?Zt:this._familyState.members.find(e=>e.slug===t)??null;n&&(this._addTaskMember=n)}_handleLongPress(e){let{task:t}=e.detail;this._editTask=t}renderContent(){var e,t;if(!this._config)return I``;if(`kids`in this._config)return I`
        <ha-card>
          <div class="error-block">
            <strong>Card upgraded</strong>
            This card was upgraded. Install the Lucarne Family integration and update your YAML.
          </div>
        </ha-card>
      `;let n=this._config.title??`Chores`,r=this._config.show_routines??!0,i=this._config.show_tasks??!0,a=this._config.show_streak??!0,o=this._config.show_rewards??!0,s=this._config.hide_names??!1,c=this._config.auto_scroll??!0?kt(/* @__PURE__ */ new Date,this._config.afternoon_start??`12:00`,this._config.night_start??`19:00`):``;if(this._familyState===null)return I`<ha-card><div class="loading">Loading…</div></ha-card>`;if(this._familyState.integrationError!==null)return I`
        <ha-card>
          <div class="error-block">
            <strong>Lucarne Family integration not set up</strong>
            Install it in Settings → Devices &amp; Services.
          </div>
        </ha-card>
      `;let l=this._resolveMembers(),u=[...this._familyState.members,Zt];return I`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${n}</h2>
        </div>
        <div
          class="members-grid"
          @add-task-clicked=${this._handleAddTask}
          @task-toggle=${this._handleTaskToggle}
          @task-long-press=${this._handleLongPress}
          @task-edit=${this._handleLongPress}
          @rewards-open=${this._handleRewardsOpen}
        >
          ${l.map(({member:e,tasks:t,notToday:n,streak:l,balance:d,affordable:f,hasActiveRewards:p})=>I`
            <div class="member-cell">
              <lucarne-member-column
                .member=${e}
                .tasks=${t}
                .notTodayTasks=${n}
                .streak=${l}
                .members=${u}
                ?show-routines=${r}
                ?show-tasks=${i}
                ?show-streak=${a}
                ?show-rewards=${o}
                .balance=${d}
                .affordable=${f}
                ?has-active-rewards=${p}
                ?hide-name=${s}
                scroll-to-bucket=${c}
              ></lucarne-member-column>
            </div>
          `)}
        </div>
      </ha-card>

      ${this._addTaskMember===null?``:I`
            <lucarne-add-task-popover
              .hass=${this.hass}
              .member=${this._addTaskMember}
              .members=${u}
              .isAdmin=${((e=this._familyState)==null||(e=e.rewards)==null?void 0:e.is_admin)??!1}
              @task-added=${this._handleTaskAdded}
              @popover-close=${()=>{this._addTaskMember=null}}
            ></lucarne-add-task-popover>
          `}

      ${this._rewardsMember!==null&&this._overlaidRewards()!==null?I`
            <lucarne-rewards-modal
              .hass=${this.hass}
              .member=${this._rewardsMember}
              .members=${this._familyState.members}
              .rewards=${this._overlaidRewards()}
              @reward-claimed=${this._handleRewardClaimed}
              @claim-cancelled=${this._handleClaimCancelled}
              @popover-close=${this._closeRewards}
            ></lucarne-rewards-modal>
          `:``}

      ${this._editTask===null?``:I`
            <lucarne-edit-task-popover
              .hass=${this.hass}
              .task=${this._editTask}
              .members=${u}
              .isAdmin=${((t=this._familyState)==null||(t=t.rewards)==null?void 0:t.is_admin)??!1}
              @task-updated=${this._handleTaskUpdated}
              @task-deleted=${this._handleTaskDeleted}
              @popover-close=${()=>{this._editTask=null}}
            ></lucarne-edit-task-popover>
          `}
    `}},Aa.styles=[G,P`
      :host {
        display: block;
        height: 100%;
        font-family: var(--primary-font-family, sans-serif);
      }
      /* Fill HA's grid cell: a fixed row count gives it a height, and at Auto
         height 100% resolves to auto, so the card sizes to its content — the
         same rule HA's own cards use (issue #156). */
      ha-card {
        height: 100%;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .card-header {
        display: flex;
        align-items: center;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .members-grid {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        /* Shrink into a fixed-height cell and scroll there, rather than being
           clipped by ha-card. */
        flex: 1 1 auto;
        min-height: 0;
        overflow-x: auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x proximity;
      }
      .member-cell {
        display: flex;
        flex: 1 0 220px;
        min-width: 220px;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        position: relative;
        scroll-snap-align: start;
      }
      .member-cell:last-child {
        border-right: none;
      }
      /* Stretch the column to the cell so equal-height columns pin their
         streaks to the same baseline (see member-column .lists/.streak-area). */
      .member-cell lucarne-member-column {
        flex: 1 1 auto;
        min-width: 0;
      }
      @media (max-width: 600px) {
        .members-grid {
          flex-direction: column;
          scroll-snap-type: none;
        }
        .member-cell {
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
          border-right: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        }
        .member-cell:last-child {
          border-bottom: none;
        }
      }
      .error-block {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .error-block strong {
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-md);
      }
      .loading {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
      }
    `],Aa);K([U({attribute:!1})],Pa.prototype,`hass`,void 0),K([W()],Pa.prototype,`_config`,void 0),K([W()],Pa.prototype,`_familyState`,void 0),K([W()],Pa.prototype,`_addTaskMember`,void 0),K([W()],Pa.prototype,`_editTask`,void 0),K([W()],Pa.prototype,`_rewardsMember`,void 0),K([W()],Pa.prototype,`_optimistic`,void 0),K([W()],Pa.prototype,`_optimisticAdds`,void 0),K([W()],Pa.prototype,`_deletedUids`,void 0),K([W()],Pa.prototype,`_optimisticEdits`,void 0),Pa=K([H(`lucarne-chores-card`)],Pa);var Fa=/* @__PURE__ */ c((/* @__PURE__ */ o(((e,t)=>{(function(n,r){typeof e==`object`&&t!==void 0?t.exports=r():typeof define==`function`&&define.amd?define(r):(n=typeof globalThis<`u`?globalThis:n||self,n.Cropper=r())})(e,(function(){function e(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,r=Array(t);n<t;n++)r[n]=e[n];return r}function t(e){if(Array.isArray(e))return e}function n(t){if(Array.isArray(t))return e(t)}function r(e,t){if(!(e instanceof t))throw TypeError(`Cannot call a class as a function`)}function i(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,`value`in r&&(r.writable=!0),Object.defineProperty(e,g(r.key),r)}}function a(e,t,n){return t&&i(e.prototype,t),n&&i(e,n),Object.defineProperty(e,"prototype",{writable:!1}),e}function o(e,t,n){return(t=g(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e){if(typeof Symbol<`u`&&e[Symbol.iterator]!=null||e[`@@iterator`]!=null)return Array.from(e)}function c(e,t){var n=e==null?null:typeof Symbol<`u`&&e[Symbol.iterator]||e[`@@iterator`];if(n!=null){var r,i,a,o,s=[],c=!0,l=!1;try{if(a=(n=n.call(e)).next,t===0){if(Object(n)!==n)return;c=!1}else for(;!(c=(r=a.call(n)).done)&&(s.push(r.value),s.length!==t);c=!0);}catch(e){l=!0,i=e}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw i}}return s}}function l(){throw TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function u(){throw TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function d(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function f(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?d(Object(n),!0).forEach(function(t){o(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):d(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function p(e,n){return t(e)||c(e,n)||v(e,n)||l()}function m(e){return n(e)||s(e)||v(e)||u()}function h(e,t){if(typeof e!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(typeof r!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function g(e){var t=h(e,`string`);return typeof t==`symbol`?t:t+``}function _(e){"@babel/helpers - typeof";return _=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},_(e)}function v(t,n){if(t){if(typeof t==`string`)return e(t,n);var r={}.toString.call(t).slice(8,-1);return r===`Object`&&t.constructor&&(r=t.constructor.name),r===`Map`||r===`Set`?Array.from(t):r===`Arguments`||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?e(t,n):void 0}}var y=typeof window<`u`&&window.document!==void 0,b=y?window:{},x=y&&b.document.documentElement?`ontouchstart`in b.document.documentElement:!1,S=y?`PointerEvent`in b:!1,C=`cropper`,w=`all`,T=`crop`,ee=`move`,te=`zoom`,E=`e`,D=`w`,O=`s`,k=`n`,A=`ne`,j=`nw`,ne=`se`,re=`sw`,ie=`${C}-crop`,M=`${C}-disabled`,N=`${C}-hidden`,P=`${C}-hide`,ae=`${C}-invisible`,oe=`${C}-modal`,se=`${C}-move`,ce=`${C}Action`,le=`${C}Preview`,ue=`crop`,de=`move`,fe=`none`,pe=`blur`,me=`crop`,he=`cropend`,ge=`cropmove`,_e=`cropstart`,ve=`dblclick`,ye=`error`,be=x?`touchstart`:`mousedown`,xe=x?`touchmove`:`mousemove`,Se=x?`touchend touchcancel`:`mouseup`,Ce=S?`pointerdown`:be,we=S?`pointermove`:xe,Te=S?`pointerup pointercancel`:Se,Ee=`ready`,De=`resize`,Oe=`wheel`,ke=`zoom`,Ae=`image/jpeg`,je=/^(e|w|s|n|se|sw|ne|nw|all|crop|move|zoom)$/,Me=/^data:/,Ne=/^data:image\/jpeg;base64,/,Pe=/\s+/,Fe=/^(img|canvas)$/i,Ie=200,Le=100,Re={viewMode:0,dragMode:ue,initialAspectRatio:NaN,aspectRatio:NaN,borderRadius:0,data:null,preview:``,responsive:!0,restore:!0,checkCrossOrigin:!0,checkOrientation:!0,modal:!0,guides:!0,center:!0,highlight:!0,background:!0,autoCrop:!0,autoCropArea:.8,movable:!0,rotatable:!0,scalable:!0,zoomable:!0,zoomOnTouch:!0,zoomOnWheel:!0,zoomAroundCenter:!1,wheelZoomRatio:.1,cropBoxMovable:!0,cropBoxMoveMode:`cursor`,cropBoxResizable:!0,cropBoxResizeAroundCenter:!1,toggleDragModeOnDblclick:!0,minCanvasWidth:0,minCanvasHeight:0,minCropBoxWidth:0,minCropBoxHeight:0,minContainerWidth:Ie,minContainerHeight:Le,ready:null,error:null,cropstart:null,cropmove:null,cropend:null,crop:null,zoom:null},ze=`<div class="cropper-container" touch-action="none"><div class="cropper-wrap-box"><div class="cropper-canvas"></div></div><div class="cropper-drag-box"></div><div class="cropper-crop-box"><span class="cropper-view-box"></span><span class="cropper-dashed dashed-h"></span><span class="cropper-dashed dashed-v"></span><span class="cropper-center"></span><span class="cropper-face"></span><span class="cropper-line line-e" data-cropper-action="e"></span><span class="cropper-line line-n" data-cropper-action="n"></span><span class="cropper-line line-w" data-cropper-action="w"></span><span class="cropper-line line-s" data-cropper-action="s"></span><span class="cropper-point point-e" data-cropper-action="e"></span><span class="cropper-point point-n" data-cropper-action="n"></span><span class="cropper-point point-w" data-cropper-action="w"></span><span class="cropper-point point-s" data-cropper-action="s"></span><span class="cropper-point point-ne" data-cropper-action="ne"></span><span class="cropper-point point-nw" data-cropper-action="nw"></span><span class="cropper-point point-sw" data-cropper-action="sw"></span><span class="cropper-point point-se" data-cropper-action="se"></span></div></div>`,Be=Number.isNaN||b.isNaN,Ve=Number.isFinite||b.isFinite;function F(e){return typeof e==`number`&&!Be(e)}var He=function(e){return e>0&&e<1/0};function Ue(e){return e===void 0}function I(e){return _(e)===`object`&&e!==null}var We=Object.prototype.hasOwnProperty;function Ge(e){if(!I(e))return!1;try{var t=e.constructor,n=t.prototype;return t&&n&&We.call(n,`isPrototypeOf`)}catch{return!1}}function L(e){return typeof e==`function`}var Ke=Array.prototype.slice;function qe(e){return Array.from?Array.from(e):Ke.call(e)}function R(e,t){return e&&L(t)&&(Array.isArray(e)||F(e.length)?qe(e).forEach(function(n,r){t.call(e,n,r,e)}):I(e)&&Object.keys(e).forEach(function(n){t.call(e,e[n],n,e)})),e}var z=Object.assign||function(e){var t=[...arguments].slice(1);return I(e)&&t.length>0&&t.forEach(function(t){I(t)&&Object.keys(t).forEach(function(n){e[n]=t[n]})}),e},Je=/\.\d*(?:0|9){12}\d*$/;function Ye(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:1e11;return Math.abs(e)<1/t||Je.test(e)?Math.round(e*t)/t:e}var Xe=/^width|height|left|top|marginLeft|marginTop$/;function Ze(e,t){var n=e.style;R(t,function(e,t){Xe.test(t)&&F(e)&&(e=`${e}px`),n[t]=e})}function Qe(e,t){return e.classList?e.classList.contains(t):e.className.split(Pe).indexOf(t)>-1}function B(e,t){if(t){if(F(e.length)){R(e,function(e){B(e,t)});return}if(e.classList){e.classList.add(t);return}var n=e.className.trim();n?n.indexOf(t)<0&&(e.className=`${n} ${t}`):e.className=t}}function $e(e,t){if(t){if(F(e.length)){R(e,function(e){$e(e,t)});return}if(e.classList){e.classList.remove(t);return}e.className.indexOf(t)>=0&&(e.className=e.className.split(Pe).filter(function(e){return e&&e!==t}).join(` `))}}function et(e,t,n){if(t){if(F(e.length)){R(e,function(e){et(e,t,n)});return}n?B(e,t):$e(e,t)}}var tt=/([a-z\d])([A-Z])/g;function nt(e){return typeof e==`string`?e.replace(tt,`$1-$2`).toLowerCase():``}function rt(e,t){return I(e[t])?e[t]:e.dataset?e.dataset[t]:e.getAttribute(`data-${nt(t)}`)}function it(e,t,n){I(n)?e[t]=n:e.dataset?e.dataset[t]=n:e.setAttribute(`data-${nt(t)}`,n)}function at(e,t){if(I(e[t]))try{delete e[t]}catch{e[t]=void 0}else if(e.dataset)try{delete e.dataset[t]}catch{e.dataset[t]=void 0}else e.removeAttribute(`data-${nt(t)}`)}var V=function(){var e=!1;if(y){var t=!1,n=function(){},r=Object.defineProperty({},"once",{get:function(){return e=!0,t},set:function(e){t=e}});b.addEventListener(`test`,n,r),b.removeEventListener(`test`,n,r)}return e}();function ot(e,t,n){var r=arguments.length>3&&arguments[3]!==void 0?arguments[3]:{};if(e&&t&&L(e.removeEventListener)){var i=n;t.trim().split(Pe).forEach(function(t){if(!V){var a=e.__cropperListeners__||{};a[t]&&a[t][n]&&(i=a[t][n],delete a[t][n],Object.keys(a[t]).length===0&&delete a[t],Object.keys(a).length===0&&delete e.__cropperListeners__)}e.removeEventListener(t,i,r)})}}function H(e,t,n){var r=arguments.length>3&&arguments[3]!==void 0?arguments[3]:{};if(e&&t&&L(e.addEventListener)&&L(n)){var i=n;t.trim().split(Pe).forEach(function(t){if(r.once&&!V){var a=e.__cropperListeners__||{};i=function(){a[t]&&a[t][n]&&delete a[t][n],e.removeEventListener(t,i,r);var o=[...arguments];n.apply(e,o)},a[t]||(a[t]={}),a[t][n]&&e.removeEventListener(t,a[t][n],r),a[t][n]=i,e.__cropperListeners__=a}e.addEventListener(t,i,r)})}}function st(e,t,n){if(!e||!t||!L(e.dispatchEvent))return!1;var r;if(L(Event)&&L(CustomEvent))r=new CustomEvent(t,{detail:n,bubbles:!0,cancelable:!0});else if(I(document)&&L(document.createEvent))r=document.createEvent(`CustomEvent`),r.initCustomEvent(t,!0,!0,n);else return!1;return e.dispatchEvent(r)}function ct(e){if(!e||!L(e.getBoundingClientRect))return{left:0,top:0};var t=e.getBoundingClientRect(),n=(document||{}).documentElement,r=n===void 0?{}:n,i=b.pageXOffset||0,a=b.pageYOffset||0;return{left:t.left+(i-(r.clientLeft||0)),top:t.top+(a-(r.clientTop||0))}}var U=b.location,W=/^(\w+:)\/\/([^:/?#]*):?(\d*)/i;function lt(e){var t=e.match(W);return t!==null&&(t[1]!==U.protocol||t[2]!==U.hostname||t[3]!==U.port)}function ut(e){var t=e.indexOf(`#`),n=t>=0?e.slice(t):``,r=t>=0?e.slice(0,t):e,i=`timestamp=${(/* @__PURE__ */ new Date()).getTime()}`;return`${r}${r.indexOf(`?`)===-1?`?`:`&`}${i}${n}`}function G(e){var t=e.rotate,n=e.scaleX,r=e.scaleY,i=e.translateX,a=e.translateY,o=[];F(i)&&i!==0&&o.push(`translateX(${i}px)`),F(a)&&a!==0&&o.push(`translateY(${a}px)`),F(t)&&t!==0&&o.push(`rotate(${t}deg)`),F(n)&&n!==1&&o.push(`scaleX(${n})`),F(r)&&r!==1&&o.push(`scaleY(${r})`);var s=o.length?o.join(` `):`none`;return{WebkitTransform:s,msTransform:s,transform:s}}function K(e){var t=f({},e),n=0;return R(e,function(e,r){delete t[r],R(t,function(t){var r=Math.abs(e.startX-t.startX),i=Math.abs(e.startY-t.startY),a=Math.abs(e.endX-t.endX),o=Math.abs(e.endY-t.endY),s=Math.sqrt(r*r+i*i),c=Math.sqrt(a*a+o*o);if(Ve(s)&&Ve(c)&&s!==0&&c!==s){var l=(c-s)/s;Ve(l)&&Math.abs(l)>Math.abs(n)&&(n=l)}})}),n}function dt(e,t){var n=e.pageX,r=e.pageY,i={endX:n,endY:r};return t?i:f({startX:n,startY:r},i)}function ft(e){var t=0,n=0,r=0;return R(e,function(e){var i=e.startX,a=e.startY;t+=i,n+=a,r+=1}),t/=r,n/=r,{pageX:t,pageY:n}}function pt(e){var t=e.aspectRatio,n=e.height,r=e.width,i=arguments.length>1&&arguments[1]!==void 0?arguments[1]:`contain`,a=He(r),o=He(n);if(a&&o){var s=n*t;i===`contain`&&s>r||i===`cover`&&s<r?n=r/t:r=n*t}else a?n=r/t:o&&(r=n*t);return{width:r,height:n}}function mt(e){var t=e.width,n=e.height,r=e.degree;if(r=Math.abs(r)%180,r===90)return{width:n,height:t};var i=r%90*Math.PI/180,a=Math.sin(i),o=Math.cos(i),s=t*o+n*a,c=t*a+n*o;return r>90?{width:c,height:s}:{width:s,height:c}}function ht(e,t,n,r){var i=t.aspectRatio,a=t.naturalWidth,o=t.naturalHeight,s=t.rotate,c=s===void 0?0:s,l=t.scaleX,u=l===void 0?1:l,d=t.scaleY,f=d===void 0?1:d,p=n.aspectRatio,h=n.naturalWidth,g=n.naturalHeight,_=r.fillColor,v=_===void 0?`transparent`:_,y=r.imageSmoothingEnabled,b=y===void 0||y,x=r.imageSmoothingQuality,S=x===void 0?`low`:x,C=r.maxWidth,w=C===void 0?1/0:C,T=r.maxHeight,ee=T===void 0?1/0:T,te=r.minWidth,E=te===void 0?0:te,D=r.minHeight,O=D===void 0?0:D,k=document.createElement(`canvas`),A=k.getContext(`2d`),j=pt({aspectRatio:p,width:w,height:ee}),ne=pt({aspectRatio:p,width:E,height:O},`cover`),re=Math.min(j.width,Math.max(ne.width,h)),ie=Math.min(j.height,Math.max(ne.height,g)),M=pt({aspectRatio:i,width:w,height:ee}),N=pt({aspectRatio:i,width:E,height:O},`cover`),P=Math.min(M.width,Math.max(N.width,a)),ae=Math.min(M.height,Math.max(N.height,o)),oe=[-P/2,-ae/2,P,ae];return k.width=Ye(re),k.height=Ye(ie),A.fillStyle=v,A.fillRect(0,0,re,ie),A.save(),A.translate(re/2,ie/2),A.rotate(c*Math.PI/180),A.scale(u,f),A.imageSmoothingEnabled=b,A.imageSmoothingQuality=S,A.drawImage.apply(A,[e].concat(m(oe.map(function(e){return Math.floor(Ye(e))})))),A.restore(),k}var gt=String.fromCharCode;function _t(e,t,n){var r=``;n+=t;for(var i=t;i<n;i+=1)r+=gt(e.getUint8(i));return r}var vt=/^data:.*,/;function yt(e){var t=e.replace(vt,``),n=atob(t),r=new ArrayBuffer(n.length),i=new Uint8Array(r);return R(i,function(e,t){i[t]=n.charCodeAt(t)}),r}function bt(e,t){for(var n=[],r=8192,i=new Uint8Array(e);i.length>0;)n.push(gt.apply(null,qe(i.subarray(0,r)))),i=i.subarray(r);return`data:${t};base64,${btoa(n.join(``))}`}function xt(e){var t=new DataView(e),n;try{var r,i,a;if(t.getUint8(0)===255&&t.getUint8(1)===216)for(var o=t.byteLength,s=2;s+1<o;){if(t.getUint8(s)===255&&t.getUint8(s+1)===225){i=s;break}s+=1}if(i){var c=i+4,l=i+10;if(_t(t,c,4)===`Exif`){var u=t.getUint16(l);if(r=u===18761,(r||u===19789)&&t.getUint16(l+2,r)===42){var d=t.getUint32(l+4,r);d>=8&&(a=l+d)}}}if(a){for(var f=t.getUint16(a,r),p,m=0;m<f;m+=1)if(p=a+m*12+2,t.getUint16(p,r)===274){p+=8,n=t.getUint16(p,r),t.setUint16(p,1,r);break}}}catch{n=1}return n}function St(e){var t=0,n=1,r=1;switch(e){case 2:n=-1;break;case 3:t=-180;break;case 4:r=-1;break;case 5:t=90,r=-1;break;case 6:t=90;break;case 7:t=90,n=-1;break;case 8:t=-90}return{rotate:t,scaleX:n,scaleY:r}}var Ct={render:function(){this.initContainer(),this.initCanvas(),this.initCropBox(),this.renderCanvas(),this.cropped&&this.renderCropBox()},initContainer:function(){var e=this.element,t=this.options,n=this.container,r=this.cropper,i=Number(t.minContainerWidth),a=Number(t.minContainerHeight);B(r,N),$e(e,N);var o={width:Math.max(n.offsetWidth,i>=0?i:Ie),height:Math.max(n.offsetHeight,a>=0?a:Le)};this.containerData=o,Ze(r,{width:o.width,height:o.height}),B(e,N),$e(r,N)},initCanvas:function(){var e=this.containerData,t=this.imageData,n=this.options.viewMode,r=Math.abs(t.rotate)%180==90,i=r?t.naturalHeight:t.naturalWidth,a=r?t.naturalWidth:t.naturalHeight,o=i/a,s=e.width,c=e.height;e.height*o>e.width?n===3?s=e.height*o:c=e.width/o:n===3?c=e.width/o:s=e.height*o;var l={aspectRatio:o,naturalWidth:i,naturalHeight:a,width:s,height:c};this.canvasData=l,this.limited=n===1||n===2,this.limitCanvas(!0,!0),l.width=Math.min(Math.max(l.width,l.minWidth),l.maxWidth),l.height=Math.min(Math.max(l.height,l.minHeight),l.maxHeight),l.left=(e.width-l.width)/2,l.top=(e.height-l.height)/2,l.oldLeft=l.left,l.oldTop=l.top,this.initialCanvasData=z({},l)},limitCanvas:function(e,t){var n=this.options,r=this.containerData,i=this.canvasData,a=this.cropBoxData,o=n.viewMode,s=i.aspectRatio,c=this.cropped&&a;if(e){var l=Number(n.minCanvasWidth)||0,u=Number(n.minCanvasHeight)||0;o>1?(l=Math.max(l,r.width),u=Math.max(u,r.height),o===3&&(u*s>l?l=u*s:u=l/s)):o>0&&(l?l=Math.max(l,c?a.width:0):u?u=Math.max(u,c?a.height:0):c&&(l=a.width,u=a.height,u*s>l?l=u*s:u=l/s));var d=pt({aspectRatio:s,width:l,height:u});l=d.width,u=d.height,i.minWidth=l,i.minHeight=u,i.maxWidth=1/0,i.maxHeight=1/0}if(t){if(o>+!c){var f=r.width-i.width,p=r.height-i.height;i.minLeft=Math.min(0,f),i.minTop=Math.min(0,p),i.maxLeft=Math.max(0,f),i.maxTop=Math.max(0,p),c&&this.limited&&(i.minLeft=Math.min(a.left,a.left+(a.width-i.width)),i.minTop=Math.min(a.top,a.top+(a.height-i.height)),i.maxLeft=a.left,i.maxTop=a.top,o===2&&(i.width>=r.width&&(i.minLeft=Math.min(0,f),i.maxLeft=Math.max(0,f)),i.height>=r.height&&(i.minTop=Math.min(0,p),i.maxTop=Math.max(0,p))))}else i.minLeft=-i.width,i.minTop=-i.height,i.maxLeft=r.width,i.maxTop=r.height}},renderCanvas:function(e,t){var n=this.canvasData,r=this.imageData;if(t){var i=mt({width:r.naturalWidth*Math.abs(r.scaleX||1),height:r.naturalHeight*Math.abs(r.scaleY||1),degree:r.rotate||0}),a=i.width,o=i.height,s=n.width*(a/n.naturalWidth),c=n.height*(o/n.naturalHeight);n.left-=(s-n.width)/2,n.top-=(c-n.height)/2,n.width=s,n.height=c,n.aspectRatio=a/o,n.naturalWidth=a,n.naturalHeight=o,this.limitCanvas(!0,!1)}(n.width>n.maxWidth||n.width<n.minWidth)&&(n.left=n.oldLeft),(n.height>n.maxHeight||n.height<n.minHeight)&&(n.top=n.oldTop),n.width=Math.min(Math.max(n.width,n.minWidth),n.maxWidth),n.height=Math.min(Math.max(n.height,n.minHeight),n.maxHeight),this.limitCanvas(!1,!0),n.left=Math.min(Math.max(n.left,n.minLeft),n.maxLeft),n.top=Math.min(Math.max(n.top,n.minTop),n.maxTop),n.oldLeft=n.left,n.oldTop=n.top,Ze(this.canvas,z({width:n.width,height:n.height},G({translateX:n.left,translateY:n.top}))),this.renderImage(e),this.cropped&&this.limited&&this.limitCropBox(!0,!0)},renderImage:function(e){var t=this.canvasData,n=this.imageData,r=n.naturalWidth*(t.width/t.naturalWidth),i=n.naturalHeight*(t.height/t.naturalHeight);z(n,{width:r,height:i,left:(t.width-r)/2,top:(t.height-i)/2}),Ze(this.image,z({width:n.width,height:n.height},G(z({translateX:n.left,translateY:n.top},n)))),e&&this.output()},initCropBox:function(){var e=this.options,t=this.canvasData,n=e.aspectRatio||e.initialAspectRatio,r=Number(e.autoCropArea)||.8,i={width:t.width,height:t.height};n&&(t.height*n>t.width?i.height=i.width/n:i.width=i.height*n),this.cropBoxData=i,this.limitCropBox(!0,!0),i.width=Math.min(Math.max(i.width,i.minWidth),i.maxWidth),i.height=Math.min(Math.max(i.height,i.minHeight),i.maxHeight),i.width=Math.max(i.minWidth,i.width*r),i.height=Math.max(i.minHeight,i.height*r),i.left=t.left+(t.width-i.width)/2,i.top=t.top+(t.height-i.height)/2,i.oldLeft=i.left,i.oldTop=i.top,this.initialCropBoxData=z({},i)},limitCropBox:function(e,t){var n=this.options,r=this.containerData,i=this.canvasData,a=this.cropBoxData,o=this.limited,s=n.aspectRatio;if(e){var c=Number(n.minCropBoxWidth)||0,l=Number(n.minCropBoxHeight)||0,u=o?Math.min(r.width,i.width,i.width+i.left,r.width-i.left):r.width,d=o?Math.min(r.height,i.height,i.height+i.top,r.height-i.top):r.height;c=Math.min(c,r.width),l=Math.min(l,r.height),s&&(c&&l?l*s>c?l=c/s:c=l*s:c?l=c/s:l&&(c=l*s),d*s>u?d=u/s:u=d*s),a.minWidth=Math.min(c,u),a.minHeight=Math.min(l,d),a.maxWidth=u,a.maxHeight=d}t&&(o?(a.minLeft=Math.max(0,i.left),a.minTop=Math.max(0,i.top),a.maxLeft=Math.min(r.width,i.left+i.width)-a.width,a.maxTop=Math.min(r.height,i.top+i.height)-a.height):(a.minLeft=0,a.minTop=0,a.maxLeft=r.width-a.width,a.maxTop=r.height-a.height))},renderCropBox:function(){var e=this.options,t=this.containerData,n=this.cropBoxData;(n.width>n.maxWidth||n.width<n.minWidth)&&(n.left=n.oldLeft),(n.height>n.maxHeight||n.height<n.minHeight)&&(n.top=n.oldTop),n.width=Math.min(Math.max(n.width,n.minWidth),n.maxWidth),n.height=Math.min(Math.max(n.height,n.minHeight),n.maxHeight),this.limitCropBox(!1,!0),n.left=Math.min(Math.max(n.left,n.minLeft),n.maxLeft),n.top=Math.min(Math.max(n.top,n.minTop),n.maxTop),n.oldLeft=n.left,n.oldTop=n.top,e.movable&&e.cropBoxMovable&&it(this.face,ce,n.width>=t.width&&n.height>=t.height?ee:w),Ze(this.cropBox,z({width:n.width,height:n.height,borderRadius:e.borderRadius},G({translateX:n.left,translateY:n.top}))),this.cropped&&this.limited&&this.limitCanvas(!0,!0),this.disabled||this.output()},output:function(){this.preview(),st(this.element,me,this.getData())}},wt={initPreview:function(){var e=this.element,t=this.crossOrigin,n=this.options.preview,r=t?this.crossOriginUrl:this.url,i=e.alt||`The image to preview`,a=document.createElement(`img`);if(t&&(a.crossOrigin=t),a.src=r,a.alt=i,this.viewBox.appendChild(a),this.viewBoxImage=a,n){var o=n;typeof n==`string`?o=e.ownerDocument.querySelectorAll(n):n.querySelector&&(o=[n]),this.previews=o,R(o,function(e){var n=document.createElement(`img`);it(e,le,{width:e.offsetWidth,height:e.offsetHeight,html:e.innerHTML}),t&&(n.crossOrigin=t),n.src=r,n.alt=i,n.style.cssText=`display:block;width:100%;height:auto;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;image-orientation:0deg!important;`,e.innerHTML=``,e.appendChild(n)})}},resetPreview:function(){R(this.previews,function(e){var t=rt(e,le);Ze(e,{width:t.width,height:t.height}),e.innerHTML=t.html,at(e,le)})},preview:function(){var e=this.imageData,t=this.canvasData,n=this.cropBoxData,r=n.width,i=n.height,a=e.width,o=e.height,s=n.left-t.left-e.left,c=n.top-t.top-e.top;this.cropped&&!this.disabled&&(Ze(this.viewBoxImage,z({width:a,height:o},G(z({translateX:-s,translateY:-c},e)))),R(this.previews,function(t){var n=rt(t,le),l=n.width,u=n.height,d=l,f=u,p=1;r&&(p=l/r,f=i*p),i&&f>u&&(p=u/i,d=r*p,f=u),Ze(t,{width:d,height:f}),Ze(t.getElementsByTagName(`img`)[0],z({width:a*p,height:o*p},G(z({translateX:-s*p,translateY:-c*p},e))))}))}},Tt={bind:function(){var e=this.element,t=this.options,n=this.cropper;L(t.cropstart)&&H(e,_e,t.cropstart),L(t.cropmove)&&H(e,ge,t.cropmove),L(t.cropend)&&H(e,he,t.cropend),L(t.crop)&&H(e,me,t.crop),L(t.zoom)&&H(e,ke,t.zoom),H(n,Ce,this.onCropStart=this.cropStart.bind(this)),t.zoomable&&t.zoomOnWheel&&H(n,Oe,this.onWheel=this.wheel.bind(this),{passive:!1,capture:!0}),t.toggleDragModeOnDblclick&&H(n,ve,this.onDblclick=this.dblclick.bind(this)),H(e.ownerDocument,we,this.onCropMove=this.cropMove.bind(this)),H(e.ownerDocument,Te,this.onCropEnd=this.cropEnd.bind(this)),H(e.ownerDocument.defaultView,pe,this.onCropBlur=this.cropEnd.bind(this)),t.responsive&&H(window,De,this.onResize=this.resize.bind(this))},unbind:function(){var e=this.element,t=this.options,n=this.cropper;L(t.cropstart)&&ot(e,_e,t.cropstart),L(t.cropmove)&&ot(e,ge,t.cropmove),L(t.cropend)&&ot(e,he,t.cropend),L(t.crop)&&ot(e,me,t.crop),L(t.zoom)&&ot(e,ke,t.zoom),ot(n,Ce,this.onCropStart),t.zoomable&&t.zoomOnWheel&&ot(n,Oe,this.onWheel,{passive:!1,capture:!0}),t.toggleDragModeOnDblclick&&ot(n,ve,this.onDblclick),ot(e.ownerDocument,we,this.onCropMove),ot(e.ownerDocument,Te,this.onCropEnd),ot(e.ownerDocument.defaultView,pe,this.onCropBlur),t.responsive&&ot(window,De,this.onResize)}},Et=.5522848;function Dt(e){return e.length===1?[e[0],e[0],e[0],e[0]]:e.length===2?[e[0],e[1],e[0],e[1]]:e.length===3?[e[0],e[1],e[2],e[1]]:e.slice(0,4)}function Ot(e,t,n){return e.trim().split(/\s+/).map(function(e){var r=Number.parseFloat(e);return e.endsWith(`%`)?r*t/100:(r||0)*n})}function kt(e,t,n,r){var i=String(e||0).trim().split(`/`),a=Dt(Ot(i[0],t,r)),o=Dt(Ot(i[1]||i[0],n,r)),s=[{x:a[0],y:o[0]},{x:a[1],y:o[1]},{x:a[2],y:o[2]},{x:a[3],y:o[3]}],c=Math.min(1,t/(s[0].x+s[1].x||1),t/(s[3].x+s[2].x||1),n/(s[0].y+s[3].y||1),n/(s[1].y+s[2].y||1));return s.map(function(e){var t=e.x,n=e.y;return{x:t*c,y:n*c}})}function At(e,t,n,r,i){var a=p(kt(r,t,n,i),4),o=a[0],s=a[1],c=a[2],l=a[3],u=Et;e.beginPath(),e.moveTo(o.x,0),e.lineTo(t-s.x,0),e.bezierCurveTo(t-s.x+s.x*u,0,t,s.y-s.y*u,t,s.y),e.lineTo(t,n-c.y),e.bezierCurveTo(t,n-c.y+c.y*u,t-c.x+c.x*u,n,t-c.x,n),e.lineTo(l.x,n),e.bezierCurveTo(l.x-l.x*u,n,0,n-l.y+l.y*u,0,n-l.y),e.lineTo(0,o.y),e.bezierCurveTo(0,o.y-o.y*u,o.x-o.x*u,0,o.x,0),e.closePath(),e.fill()}function jt(e,t,n){var r=this.options,i=this.canvasData,a=this.containerData,o=i.width,s=i.height,c=i.naturalWidth,l=i.naturalHeight;if(e=Number(e),e>=0&&this.ready&&!this.disabled&&r.zoomable){var u=c*e,d=l*e;if(st(this.element,ke,{ratio:e,oldRatio:o/c,originalEvent:n})===!1)return this;if(Ge(t)&&F(t.x)&&F(t.y))i.left-=(u-o)*((t.x-i.left)/o),i.top-=(d-s)*((t.y-i.top)/s);else if(r.zoomAroundCenter){var f=a.width/2,p=a.height/2;i.left-=(u-o)*((f-i.left)/o),i.top-=(d-s)*((p-i.top)/s)}else if(n){var m=this.pointers,h=ct(this.cropper),g=m&&Object.keys(m).length?ft(m):{pageX:n.pageX,pageY:n.pageY};i.left-=(u-o)*((g.pageX-h.left-i.left)/o),i.top-=(d-s)*((g.pageY-h.top-i.top)/s)}else i.left-=(u-o)/2,i.top-=(d-s)/2;i.width=u,i.height=d,this.renderCanvas(!0)}return this}function Mt(e,t){var n=this.canvasData;return e=Number(e),e=e<0?1/(1-e):1+e,jt.call(this,n.width*e/n.naturalWidth,null,t)}function Nt(e,t){return Mt.call(this,e,t)}var Pt={crop:function(){return this.ready&&!this.cropped&&!this.disabled&&(this.cropped=!0,this.limitCropBox(!0,!0),this.options.modal&&B(this.dragBox,oe),$e(this.cropBox,N),this.setCropBoxData(this.initialCropBoxData)),this},reset:function(){return this.ready&&!this.disabled&&(this.imageData=z({},this.initialImageData),this.canvasData=z({},this.initialCanvasData),this.cropBoxData=z({},this.initialCropBoxData),this.renderCanvas(),this.cropped&&this.renderCropBox()),this},clear:function(){return this.cropped&&!this.disabled&&(z(this.cropBoxData,{left:0,top:0,width:0,height:0}),this.cropped=!1,this.renderCropBox(),this.limitCanvas(!0,!0),this.renderCanvas(),$e(this.dragBox,oe),B(this.cropBox,N)),this},replace:function(e){var t=arguments.length>1&&arguments[1]!==void 0&&arguments[1];return!this.disabled&&e&&(this.isImg&&(this.element.src=e),t?(this.url=e,this.image.src=e,this.ready&&(this.viewBoxImage.src=e,R(this.previews,function(t){t.getElementsByTagName(`img`)[0].src=e}))):(this.isImg&&(this.replaced=!0),this.options.data=null,this.uncreate(),this.load(e))),this},enable:function(){return this.ready&&this.disabled&&(this.disabled=!1,$e(this.cropper,M)),this},disable:function(){return this.ready&&!this.disabled&&(this.disabled=!0,B(this.cropper,M)),this},destroy:function(){var e=this.element;return e[C]?(e[C]=void 0,this.isImg&&this.replaced&&(e.src=this.originalUrl),this.uncreate(),this):this},move:function(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:e,n=this.canvasData,r=n.left,i=n.top;return this.moveTo(Ue(e)?e:r+Number(e),Ue(t)?t:i+Number(t))},moveTo:function(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:e,n=this.canvasData,r=!1;return e=Number(e),t=Number(t),this.ready&&!this.disabled&&this.options.movable&&(F(e)&&(n.left=e,r=!0),F(t)&&(n.top=t,r=!0),r&&this.renderCanvas(!0)),this},zoom:function(e){return Mt.call(this,e)},zoomTo:function(e,t){return jt.call(this,e,t)},rotate:function(e){return this.rotateTo((this.imageData.rotate||0)+Number(e))},rotateTo:function(e){return e=Number(e),F(e)&&this.ready&&!this.disabled&&this.options.rotatable&&(this.imageData.rotate=e%360,this.renderCanvas(!0,!0)),this},scaleX:function(e){var t=this.imageData.scaleY;return this.scale(e,F(t)?t:1)},scaleY:function(e){var t=this.imageData.scaleX;return this.scale(F(t)?t:1,e)},scale:function(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:e,n=this.imageData,r=!1;return e=Number(e),t=Number(t),this.ready&&!this.disabled&&this.options.scalable&&(F(e)&&(n.scaleX=e,r=!0),F(t)&&(n.scaleY=t,r=!0),r&&this.renderCanvas(!0,!0)),this},getData:function(){var e=arguments.length>0&&arguments[0]!==void 0&&arguments[0],t=this.options,n=this.imageData,r=this.canvasData,i=this.cropBoxData,a;if(this.ready&&this.cropped){a={x:i.left-r.left,y:i.top-r.top,width:i.width,height:i.height};var o=n.width/n.naturalWidth;if(R(a,function(e,t){a[t]=Ye(e/o)}),e){var s=Math.round(a.y+a.height),c=Math.round(a.x+a.width);a.x=Math.round(a.x),a.y=Math.round(a.y),a.width=c-a.x,a.height=s-a.y}}else a={x:0,y:0,width:0,height:0};return t.rotatable&&(a.rotate=n.rotate||0),t.scalable&&(a.scaleX=n.scaleX||1,a.scaleY=n.scaleY||1),a},setData:function(e){var t=this.options,n=this.imageData,r=this.canvasData,i={};if(this.ready&&!this.disabled&&Ge(e)){var a=!1;t.rotatable&&F(e.rotate)&&e.rotate!==n.rotate&&(n.rotate=e.rotate,a=!0),t.scalable&&(F(e.scaleX)&&e.scaleX!==n.scaleX&&(n.scaleX=e.scaleX,a=!0),F(e.scaleY)&&e.scaleY!==n.scaleY&&(n.scaleY=e.scaleY,a=!0)),a&&this.renderCanvas(!0,!0);var o=n.width/n.naturalWidth;F(e.x)&&(i.left=e.x*o+r.left),F(e.y)&&(i.top=e.y*o+r.top),F(e.width)&&(i.width=e.width*o),F(e.height)&&(i.height=e.height*o),this.setCropBoxData(i)}return this},getContainerData:function(){return this.ready?z({},this.containerData):{}},getImageData:function(){return this.sized?z({},this.imageData):{}},getCanvasData:function(){var e=this.canvasData,t={};return this.ready&&R([`left`,`top`,`width`,`height`,`naturalWidth`,`naturalHeight`],function(n){t[n]=e[n]}),t},setCanvasData:function(e){var t=this.canvasData,n=t.aspectRatio;return this.ready&&!this.disabled&&Ge(e)&&(F(e.left)&&(t.left=e.left),F(e.top)&&(t.top=e.top),F(e.width)?(t.width=e.width,t.height=e.width/n):F(e.height)&&(t.height=e.height,t.width=e.height*n),this.renderCanvas(!0)),this},getCropBoxData:function(){var e=this.cropBoxData,t;return this.ready&&this.cropped&&(t={left:e.left,top:e.top,width:e.width,height:e.height}),t||{}},setCropBoxData:function(e){var t=this.cropBoxData,n=this.options.aspectRatio,r,i;return this.ready&&this.cropped&&!this.disabled&&Ge(e)&&(F(e.left)&&(t.left=e.left),F(e.top)&&(t.top=e.top),F(e.width)&&e.width!==t.width&&(r=!0,t.width=e.width),F(e.height)&&e.height!==t.height&&(i=!0,t.height=e.height),n&&(r?t.height=t.width/n:i&&(t.width=t.height*n)),this.renderCropBox()),this},getCroppedCanvas:function(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(!this.ready||!window.HTMLCanvasElement)return null;var t=this.canvasData,n=ht(this.image,this.imageData,t,e);if(!this.cropped)return n;var r=this.getData(e.rounded),i=r.x,a=r.y,o=r.width,s=r.height,c=n.width/Math.floor(t.naturalWidth);c!==1&&(i*=c,a*=c,o*=c,s*=c);var l=o/s,u=pt({aspectRatio:l,width:e.maxWidth||1/0,height:e.maxHeight||1/0}),d=pt({aspectRatio:l,width:e.minWidth||0,height:e.minHeight||0},`cover`),f=pt({aspectRatio:l,width:e.width||(c===1?o:n.width),height:e.height||(c===1?s:n.height)}),p=f.width,h=f.height;p=Math.min(u.width,Math.max(d.width,p)),h=Math.min(u.height,Math.max(d.height,h));var g=document.createElement(`canvas`),_=g.getContext(`2d`);g.width=Ye(p),g.height=Ye(h),_.fillStyle=e.fillColor||`transparent`,_.fillRect(0,0,p,h);var v=e.imageSmoothingEnabled,y=v===void 0||v,b=e.imageSmoothingQuality;_.imageSmoothingEnabled=y,b&&(_.imageSmoothingQuality=b),L(e.beforeDraw)&&e.beforeDraw.call(this,_,g);var x=n.width,S=n.height,C=i,w=a,T,ee,te,E,D,O;C<=-o||C>x?(C=0,T=0,te=0,D=0):C<=0?(te=-C,C=0,T=Math.min(x,o+C),D=T):C<=x&&(te=0,T=Math.min(o,x-C),D=T),T<=0||w<=-s||w>S?(w=0,ee=0,E=0,O=0):w<=0?(E=-w,w=0,ee=Math.min(S,s+w),O=ee):w<=S&&(E=0,ee=Math.min(s,S-w),O=ee);var k=[C,w,T,ee];if(D>0&&O>0){var A=p/o;k.push(te*A,E*A,D*A,O*A)}return _.drawImage.apply(_,[n].concat(m(k.map(function(e){return Math.floor(Ye(e))})))),this.options.borderRadius&&(_.globalCompositeOperation=`destination-in`,_.fillStyle=`#000`,At(_,p,h,this.options.borderRadius,p/this.cropBoxData.width)),g},setAspectRatio:function(e){var t=this.options;return!this.disabled&&!Ue(e)&&(t.aspectRatio=Math.max(0,e)||NaN,this.ready&&(this.initCropBox(),this.cropped&&this.renderCropBox())),this},setDragMode:function(e){var t=this.options,n=this.dragBox,r=this.face;if(this.ready&&!this.disabled){var i=e===ue,a=t.movable&&e===de;e=i||a?e:fe,t.dragMode=e,it(n,ce,e),et(n,ie,i),et(n,se,a),t.cropBoxMovable||(it(r,ce,e),et(r,ie,i),et(r,se,a))}return this}},q={resize:function(){if(!this.disabled){var e=this.options,t=this.container,n=this.containerData,r=t.offsetWidth/n.width,i=t.offsetHeight/n.height,a=Math.abs(r-1)>Math.abs(i-1)?r:i;if(a!==1){var o,s;e.restore&&(o=this.getCanvasData(),s=this.getCropBoxData()),this.render(),e.restore&&(this.setCanvasData(R(o,function(e,t){o[t]=e*a})),this.setCropBoxData(R(s,function(e,t){s[t]=e*a})))}}},dblclick:function(){this.disabled||this.options.dragMode===fe||this.setDragMode(Qe(this.dragBox,ie)?de:ue)},wheel:function(e){var t=this,n=Number(this.options.wheelZoomRatio)||.1,r=1;this.disabled||(e.preventDefault(),!this.wheeling&&(this.wheeling=!0,setTimeout(function(){t.wheeling=!1},50),e.deltaY?r=e.deltaY>0?1:-1:e.wheelDelta?r=-e.wheelDelta/120:e.detail&&(r=e.detail>0?1:-1),Nt.call(this,-r*n,e)))},cropStart:function(e){var t=e.buttons,n=e.button;if(!(this.disabled||(e.type===`mousedown`||e.type===`pointerdown`&&e.pointerType===`mouse`)&&(F(t)&&t!==1||F(n)&&n!==0||e.ctrlKey))){var r=this.options,i=this.pointers,a;e.changedTouches?R(e.changedTouches,function(e){i[e.identifier]=dt(e)}):i[e.pointerId||0]=dt(e),a=Object.keys(i).length>1&&r.zoomable&&r.zoomOnTouch?te:rt(e.target,ce),je.test(a)&&st(this.element,_e,{originalEvent:e,action:a})!==!1&&(e.preventDefault(),this.action=a,this.cropping=!1,this.cropBoxDragStartData=null,this.cropBoxDragStartAction=r.cropBoxMoveMode===`dragStart`&&a!==T&&a!==ee&&a!==te?a:``,a===T&&(this.cropping=!0,B(this.dragBox,oe)))}},cropMove:function(e){var t=this.action;if(!this.disabled&&t){var n=this.pointers;e.preventDefault(),st(this.element,ge,{originalEvent:e,action:t})!==!1&&(e.changedTouches?R(e.changedTouches,function(e){z(n[e.identifier]||{},dt(e,!0))}):z(n[e.pointerId||0]||{},dt(e,!0)),this.change(e))}},cropEnd:function(e){if(!this.disabled){var t=this.action,n=this.pointers;e.type===pe?Object.keys(n).forEach(function(e){delete n[e]}):e.changedTouches?R(e.changedTouches,function(e){delete n[e.identifier]}):delete n[e.pointerId||0],t&&(e.preventDefault(),Object.keys(n).length||(this.action=``,this.cropBoxDragStartData=null,this.cropBoxDragStartAction=``),this.cropping&&(this.cropping=!1,et(this.dragBox,oe,this.cropped&&this.options.modal)),st(this.element,he,{originalEvent:e,action:t}))}}};function Ft(e,t,n,r,i){var a=r.left+r.width/2,o=r.top+r.height/2,s=e===E||e===A||e===ne,c=e===O||e===ne||e===re,l=e===E||e===D,u=e===k||e===O,d=r.width,f=r.height;n?l||!u&&c?(d+=(s?2:-2)*t.x,f=d/n):(f+=(c?2:-2)*t.y,d=f*n):(d+=(s?2:-2)*t.x,f+=(c?2:-2)*t.y),d<0&&(d=-d,(!n||l||!u&&c)&&(s=!s)),f<0&&(f=-f,(!n||u||!u&&!c)&&(c=!c));var p=Math.max(0,2*Math.min(a-i.minLeft,i.maxWidth-a)),m=Math.max(0,2*Math.min(o-i.minTop,i.maxHeight-o)),h=Math.min(r.minWidth,p),g=Math.min(r.minHeight,m);if(n){var _=Math.max(d?h/d:0,f?g/f:0,1),v=Math.min(d?p/d:0,f?m/f:0),y=Math.min(_,v);d*=y,f*=y}else d=Math.min(Math.max(d,h),p),f=Math.min(Math.max(f,g),m);return e=s?c?ne:A:c?re:j,l?e=s?E:D:u&&(e=c?O:k),{action:e,left:a-d/2,top:o-f/2,width:d,height:f}}var It={change:function(e){var t=this.options,n=this.canvasData,r=this.containerData,i=this.cropBoxData,a=this.pointers,o=this.action,s=t.aspectRatio,c=i.left,l=i.top,u=i.width,d=i.height,p=c+u,m=l+d,h=0,g=0,_=r.width,v=r.height,y=!0,b;!s&&e.shiftKey&&(s=u&&d?u/d:1),this.limited&&(h=i.minLeft,g=i.minTop,_=h+Math.min(r.width,n.width,n.left+n.width),v=g+Math.min(r.height,n.height,n.top+n.height));var x=a[Object.keys(a)[0]],S=t.cropBoxMoveMode===`dragStart`&&this.cropBoxDragStartAction&&[w,E,k,O,D,A,j,ne,re].includes(o);S&&(this.cropBoxDragStartData||(this.cropBoxDragStartData=f({},i)),Object.assign(i,this.cropBoxDragStartData),c=i.left,l=i.top,u=i.width,d=i.height,p=c+u,m=l+d,o=this.cropBoxDragStartAction);var C={x:x.endX-x.startX,y:x.endY-x.startY};if(t.cropBoxResizeAroundCenter&&[E,k,O,D,A,j,ne,re].includes(o)){var ie=Ft(o,C,s,i,{minLeft:h,minTop:g,maxWidth:_,maxHeight:v});i.left=ie.left,i.top=ie.top,i.width=ie.width,i.height=ie.height,this.action=ie.action,this.renderCropBox(),S||R(a,function(e){e.startX=e.endX,e.startY=e.endY});return}var M=function(e){switch(e){case E:p+C.x>_&&(C.x=_-p);break;case D:c+C.x<h&&(C.x=h-c);break;case k:l+C.y<g&&(C.y=g-l);break;case O:m+C.y>v&&(C.y=v-m)}};switch(o){case w:c+=C.x,l+=C.y;break;case E:if(C.x>=0&&(p>=_||s&&(l<=g||m>=v))){y=!1;break}M(E),u+=C.x,u<0&&(o=D,u=-u,c-=u,u<i.minWidth&&(u=i.minWidth,c=i.left-u)),s&&(d=u/s,l+=(i.height-d)/2);break;case k:if(C.y<=0&&(l<=g||s&&(c<=h||p>=_))){y=!1;break}M(k),d-=C.y,l+=C.y,d<0&&(o=O,d=-d,l-=d,d<i.minHeight&&(d=i.minHeight,l=m)),s&&(u=d*s,c+=(i.width-u)/2);break;case D:if(C.x<=0&&(c<=h||s&&(l<=g||m>=v))){y=!1;break}M(D),u-=C.x,c+=C.x,u<0&&(o=E,u=-u,c-=u,u<i.minWidth&&(u=i.minWidth,c=p)),s&&(d=u/s,l+=(i.height-d)/2);break;case O:if(C.y>=0&&(m>=v||s&&(c<=h||p>=_))){y=!1;break}M(O),d+=C.y,d<0&&(o=k,d=-d,l-=d,d<i.minHeight&&(d=i.minHeight,l=i.top-d)),s&&(u=d*s,c+=(i.width-u)/2);break;case A:if(s){if(C.y<=0&&(l<=g||p>=_)){y=!1;break}M(k),d-=C.y,l+=C.y,u=d*s}else M(k),M(E),C.x>=0?p<_?u+=C.x:C.y<=0&&l<=g&&(y=!1):u+=C.x,C.y<=0?l>g&&(d-=C.y,l+=C.y):(d-=C.y,l+=C.y);u<0&&d<0?(o=re,d=-d,u=-u,l-=d,c-=u):u<0?(o=j,u=-u,c-=u):d<0&&(o=ne,d=-d,l-=d);break;case j:if(s){if(C.y<=0&&(l<=g||c<=h)){y=!1;break}M(k),d-=C.y,l+=C.y,u=d*s,c+=i.width-u}else M(k),M(D),C.x<=0?c>h?(u-=C.x,c+=C.x):C.y<=0&&l<=g&&(y=!1):(u-=C.x,c+=C.x),C.y<=0?l>g&&(d-=C.y,l+=C.y):(d-=C.y,l+=C.y);u<0&&d<0?(o=ne,d=-d,u=-u,l-=d,c-=u):u<0?(o=A,u=-u,c-=u):d<0&&(o=re,d=-d,l-=d);break;case re:if(s){if(C.x<=0&&(c<=h||m>=v)){y=!1;break}M(D),u-=C.x,c+=C.x,d=u/s}else M(O),M(D),C.x<=0?c>h?(u-=C.x,c+=C.x):C.y>=0&&m>=v&&(y=!1):(u-=C.x,c+=C.x),C.y>=0?m<v&&(d+=C.y):d+=C.y;u<0&&d<0?(o=A,d=-d,u=-u,l-=d,c-=u):u<0?(o=ne,u=-u,c-=u):d<0&&(o=j,d=-d,l-=d);break;case ne:if(s){if(C.x>=0&&(p>=_||m>=v)){y=!1;break}M(E),u+=C.x,d=u/s}else M(O),M(E),C.x>=0?p<_?u+=C.x:C.y>=0&&m>=v&&(y=!1):u+=C.x,C.y>=0?m<v&&(d+=C.y):d+=C.y;u<0&&d<0?(o=j,d=-d,u=-u,l-=d,c-=u):u<0?(o=re,u=-u,c-=u):d<0&&(o=A,d=-d,l-=d);break;case ee:this.move(C.x,C.y),y=!1;break;case te:Nt.call(this,K(a),e),y=!1;break;case T:if(!C.x||!C.y){y=!1;break}b=ct(this.cropper),c=x.startX-b.left,l=x.startY-b.top,s?(u=Math.max(Math.abs(C.x),Math.abs(C.y)*s,i.minWidth,i.minHeight*s),d=u/s):(u=Math.max(Math.abs(C.x),i.minWidth),d=Math.max(Math.abs(C.y),i.minHeight)),C.x>0?o=C.y>0?ne:A:C.x<0&&(c-=u,o=C.y>0?re:j),C.y<0&&(l-=d),this.cropped||($e(this.cropBox,N),this.cropped=!0,this.limited&&this.limitCropBox(!0,!0))}y&&(i.width=u,i.height=d,i.left=c,i.top=l,this.action=o,this.renderCropBox()),R(a,function(e){o!==T&&!S&&(e.startX=e.endX,e.startY=e.endY)})}},Lt=b.Cropper,Rt=/*#__PURE__*/ function(){function e(t){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};if(r(this,e),!t||!Fe.test(t.tagName))throw Error(`The first argument is required and must be an <img> or <canvas> element.`);this.element=t,this.options=z({},Re,Ge(n)&&n),this.cropped=!1,this.disabled=!1,this.pointers={},this.ready=!1,this.reloading=!1,this.replaced=!1,this.sized=!1,this.sizing=!1,this.init()}return a(e,[{key:`init`,value:function(){var e=this.element,t=e.tagName.toLowerCase(),n;if(!e[C]){if(e[C]=this,t===`img`){if(this.isImg=!0,n=e.getAttribute(`src`)||``,this.originalUrl=n,!n)return;n=e.src}else t===`canvas`&&window.HTMLCanvasElement&&(n=e.toDataURL());this.load(n)}}},{key:`load`,value:function(e){var t=this;if(e){this.url=e,this.imageData={};var n=this.element,r=this.options;if(!r.rotatable&&!r.scalable&&(r.checkOrientation=!1),!r.checkOrientation||!window.ArrayBuffer){this.clone();return}if(Me.test(e)){Ne.test(e)?this.read(yt(e)):this.clone();return}var i=new XMLHttpRequest,a=this.clone.bind(this);this.reloading=!0,this.xhr=i,i.onabort=a,i.onerror=a,i.ontimeout=a,i.onprogress=function(){i.getResponseHeader(`content-type`)!==Ae&&i.abort()},i.onload=function(){t.read(i.response)},i.onloadend=function(){t.reloading=!1,t.xhr=null},r.checkCrossOrigin&&lt(e)&&n.crossOrigin&&(e=ut(e)),i.open(`GET`,e,!0),i.responseType=`arraybuffer`,i.withCredentials=n.crossOrigin===`use-credentials`,i.send()}}},{key:`read`,value:function(e){var t=this.options,n=this.imageData,r=xt(e),i=0,a=1,o=1;if(r>1){this.url=bt(e,Ae);var s=St(r);i=s.rotate,a=s.scaleX,o=s.scaleY}t.rotatable&&(n.rotate=i),t.scalable&&(n.scaleX=a,n.scaleY=o),this.clone()}},{key:`clone`,value:function(){var e=this,t=this.element,n=this.options,r=this.url,i=t.crossOrigin,a=r;this.options.checkCrossOrigin&&lt(r)&&(i||(i=`anonymous`),a=ut(r)),this.crossOrigin=i,this.crossOriginUrl=a;var o=document.createElement(`img`);i&&(o.crossOrigin=i),o.src=a||r,o.alt=t.alt||`The image to crop`,this.image=o,o.onload=this.start.bind(this),L(n.error)&&H(t,ye,n.error,{once:!0}),o.onerror=function(n){st(t,ye,n),e.stop()},B(o,P),t.parentNode.insertBefore(o,t.nextSibling)}},{key:`start`,value:function(){var e=this,t=this.image;t.onload=null,t.onerror=null,this.sizing=!0;var n=b.navigator&&/(?:iPad|iPhone|iPod).*?AppleWebKit/i.test(b.navigator.userAgent),r=function(t,n){z(e.imageData,{naturalWidth:t,naturalHeight:n,aspectRatio:t/n}),e.initialImageData=z({},e.imageData),e.sizing=!1,e.sized=!0,e.build()},i=document.createElement(`img`),a=document.body||document.documentElement;this.sizingImage=i,i.onload=function(){r(i.width,i.height),n||a.removeChild(i)},i.src=t.src,n||(i.style.cssText=`left:0;max-height:none!important;max-width:none!important;min-height:0!important;min-width:0!important;opacity:0;image-orientation:0deg;position:absolute;top:0;z-index:-1;`,a.appendChild(i))}},{key:`stop`,value:function(){var e=this.image;e.onload=null,e.onerror=null,e.parentNode.removeChild(e),this.image=null}},{key:`build`,value:function(){if(this.sized&&!this.ready){var e=this.element,t=this.options,n=this.image,r=e.parentNode,i=document.createElement(`div`);i.innerHTML=ze;var a=i.querySelector(`.${C}-container`),o=a.querySelector(`.${C}-canvas`),s=a.querySelector(`.${C}-drag-box`),c=a.querySelector(`.${C}-crop-box`),l=c.querySelector(`.${C}-face`);this.container=r,this.cropper=a,this.canvas=o,this.dragBox=s,this.cropBox=c,this.viewBox=a.querySelector(`.${C}-view-box`),this.face=l,o.appendChild(n),B(e,N),r.insertBefore(a,e.nextSibling),$e(n,P),this.initPreview(),this.bind(),t.initialAspectRatio=Math.max(0,t.initialAspectRatio)||NaN,t.aspectRatio=Math.max(0,t.aspectRatio)||NaN,t.viewMode=Math.max(0,Math.min(3,Math.round(t.viewMode)))||0,B(c,N),t.guides||B(c.getElementsByClassName(`${C}-dashed`),N),t.center||B(c.getElementsByClassName(`${C}-center`),N),t.background&&B(a,`${C}-bg`),t.highlight||B(l,ae),t.cropBoxMovable&&(B(l,se),it(l,ce,w)),t.cropBoxResizable||(B(c.getElementsByClassName(`${C}-line`),N),B(c.getElementsByClassName(`${C}-point`),N)),this.render(),this.ready=!0,this.setDragMode(t.dragMode),t.autoCrop&&this.crop(),this.setData(t.data),L(t.ready)&&H(e,Ee,t.ready,{once:!0}),st(e,Ee)}}},{key:`unbuild`,value:function(){if(this.ready){this.ready=!1,this.unbind(),this.resetPreview();var e=this.cropper.parentNode;e&&e.removeChild(this.cropper),$e(this.element,N)}}},{key:`uncreate`,value:function(){this.ready?(this.unbuild(),this.ready=!1,this.cropped=!1):this.sizing?(this.sizingImage.onload=null,this.sizing=!1,this.sized=!1):this.reloading?(this.xhr.onabort=null,this.xhr.abort()):this.image&&this.stop()}}],[{key:`create`,value:function(t,n){return new e(t,n)}},{key:`setDefaults`,value:function(e){z(Re,Ge(e)&&e)}},{key:`noConflict`,value:function(){return window.Cropper=Lt,e}}])}();return z(Rt.prototype,Ct,wt,Tt,q,It,Pt),Rt}))})))(),1),Ia=`
.cropper-container {
  direction: ltr;
  font-size: 0;
  line-height: 0;
  position: relative;
  -ms-touch-action: none;
      touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
}
.cropper-container img {
  backface-visibility: hidden;
  display: block;
  height: 100%;
  image-orientation: 0deg;
  max-height: none !important;
  max-width: none !important;
  min-height: 0 !important;
  min-width: 0 !important;
  width: 100%;
}
.cropper-wrap-box,
.cropper-canvas,
.cropper-drag-box,
.cropper-crop-box,
.cropper-modal {
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}
.cropper-wrap-box,
.cropper-canvas {
  overflow: hidden;
}
.cropper-drag-box {
  background-color: #fff;
  opacity: 0;
}
.cropper-modal {
  background-color: #000;
  opacity: 0.5;
}
.cropper-view-box {
  display: block;
  height: 100%;
  outline: 1px solid #39f;
  outline-color: rgba(51, 153, 255, 0.75);
  overflow: hidden;
  width: 100%;
}
.cropper-dashed {
  border: 0 dashed #eee;
  display: block;
  opacity: 0.5;
  position: absolute;
}
.cropper-dashed.dashed-h {
  border-bottom-width: 1px;
  border-top-width: 1px;
  height: calc(100% / 3);
  left: 0;
  top: calc(100% / 3);
  width: 100%;
}
.cropper-dashed.dashed-v {
  border-left-width: 1px;
  border-right-width: 1px;
  height: 100%;
  left: calc(100% / 3);
  top: 0;
  width: calc(100% / 3);
}
.cropper-center {
  display: block;
  height: 0;
  left: 50%;
  opacity: 0.75;
  position: absolute;
  top: 50%;
  width: 0;
}
.cropper-center::before,
.cropper-center::after {
  background-color: #eee;
  content: ' ';
  display: block;
  position: absolute;
}
.cropper-center::before {
  height: 1px;
  left: -3px;
  top: 0;
  width: 7px;
}
.cropper-center::after {
  height: 7px;
  left: 0;
  top: -3px;
  width: 1px;
}
.cropper-face,
.cropper-line,
.cropper-point {
  display: block;
  height: 100%;
  opacity: 0.1;
  position: absolute;
  width: 100%;
}
.cropper-face {
  background-color: #fff;
  left: 0;
  top: 0;
}
.cropper-line {
  background-color: #39f;
}
.cropper-line.line-e {
  cursor: ew-resize;
  right: -3px;
  top: 0;
  width: 5px;
}
.cropper-line.line-n {
  cursor: ns-resize;
  height: 5px;
  left: 0;
  top: -3px;
}
.cropper-line.line-w {
  cursor: ew-resize;
  left: -3px;
  top: 0;
  width: 5px;
}
.cropper-line.line-s {
  bottom: -3px;
  cursor: ns-resize;
  height: 5px;
  left: 0;
}
.cropper-point {
  background-color: #39f;
  height: 5px;
  opacity: 0.75;
  width: 5px;
}
.cropper-point.point-e {
  cursor: ew-resize;
  margin-top: -3px;
  right: -3px;
  top: 50%;
}
.cropper-point.point-n {
  cursor: ns-resize;
  left: 50%;
  margin-left: -3px;
  top: -3px;
}
.cropper-point.point-w {
  cursor: ew-resize;
  left: -3px;
  margin-top: -3px;
  top: 50%;
}
.cropper-point.point-s {
  bottom: -3px;
  cursor: s-resize;
  left: 50%;
  margin-left: -3px;
}
.cropper-point.point-ne {
  cursor: nesw-resize;
  right: -3px;
  top: -3px;
}
.cropper-point.point-nw {
  cursor: nwse-resize;
  left: -3px;
  top: -3px;
}
.cropper-point.point-sw {
  bottom: -3px;
  cursor: nesw-resize;
  left: -3px;
}
.cropper-point.point-se {
  bottom: -3px;
  cursor: nwse-resize;
  height: 20px;
  opacity: 1;
  right: -3px;
  width: 20px;
}
@media (min-width: 768px) {
  .cropper-point.point-se {
    height: 15px;
    width: 15px;
  }
}
@media (min-width: 992px) {
  .cropper-point.point-se {
    height: 10px;
    width: 10px;
  }
}
@media (min-width: 1200px) {
  .cropper-point.point-se {
    height: 5px;
    opacity: 0.75;
    width: 5px;
  }
}
.cropper-point.point-se::before {
  background-color: #39f;
  bottom: -50%;
  content: ' ';
  display: block;
  height: 200%;
  opacity: 0;
  position: absolute;
  right: -50%;
  width: 200%;
}
.cropper-invisible {
  opacity: 0;
}
.cropper-bg {
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC");
}
.cropper-hide {
  display: block;
  height: 0;
  position: absolute;
  width: 0;
}
.cropper-hidden {
  display: none !important;
}
.cropper-move {
  cursor: move;
}
.cropper-crop {
  cursor: crosshair;
}
.cropper-disabled .cropper-drag-box,
.cropper-disabled .cropper-face,
.cropper-disabled .cropper-line,
.cropper-disabled .cropper-point {
  cursor: not-allowed;
}
`,La,Ra=2097152,za=/* @__PURE__ */ new Set([`image/png`,`image/jpeg`,`image/webp`]),Ba=512,Va=/* @__PURE__ */ `👶.🧒.👧.🧑.👦.👩.👨.🧓.👴.👵.🐶.🐱.🐻.🐼.🐨.🦊.🦁.🐯.🐸.🦄.🌟.⭐.🌈.🌸.🌺.🌻.🍀.🎈.🎨.🎯.🏃.⚽.🎸.🎤.📚.🎮.🏆.❤️.💙.💚`.split(`.`),Ha=(La=class extends V{constructor(...e){super(...e),this._mode=`emoji`,this._selectedEmoji=null,this._sourceUrl=null,this._error=null,this._submitting=!1,this._cropper=null}_close(){this.dispatchEvent(new CustomEvent(`close`))}_selectEmoji(e){this._selectedEmoji=e,this._error=null}_onFileChange(e){var t;let n=e.target,r=(t=n.files)==null?void 0:t[0];if(n.value=``,r){if(!za.has(r.type)){this._error=`Only PNG, JPEG, and WebP images are accepted.`;return}if(r.size>Ra){this._error=`Image must be 2 MB or smaller.`;return}this._error=null,this._setSource(URL.createObjectURL(r))}}_setSource(e){this._cropper&&(this._cropper.destroy(),this._cropper=null),this._sourceUrl&&URL.revokeObjectURL(this._sourceUrl),this._sourceUrl=e}_onCropImageLoad(){let e=this._cropImage;e&&(this._cropper&&this._cropper.destroy(),this._cropper=new Fa.default(e,{aspectRatio:1,viewMode:1,dragMode:`move`,autoCropArea:.9,background:!1,cropBoxResizable:!0,cropBoxMovable:!0,toggleDragModeOnDblclick:!1,guides:!1,center:!1}))}_clearPickedImage(){this._setSource(null),this._error=null}async _submit(){if(!this._submitting){if(this._error=null,this._mode===`emoji`){if(!this._selectedEmoji){this._error=`Pick an emoji first.`;return}this._submitting=!0;try{await fa(this.hass,this.memberSlug,this._selectedEmoji),this.dispatchEvent(new CustomEvent(`avatar-changed`,{detail:{avatar:this._selectedEmoji}})),this._close()}catch(e){this._error=wi(e,`Failed to save avatar`)}finally{this._submitting=!1}return}if(!this._sourceUrl||!this._cropper){this._error=`Pick an image first.`;return}this._submitting=!0;try{let e=await this._getCroppedFile();await da(this.hass,this.memberSlug,e),this.dispatchEvent(new CustomEvent(`avatar-changed`)),this._close()}catch(e){this._error=wi(e,`Failed to upload avatar`)}finally{this._submitting=!1}}}_getCroppedFile(){return new Promise((e,t)=>{if(!this._cropper){t(/* @__PURE__ */ Error(`Cropper not initialized`));return}let n=this._cropper.getCroppedCanvas({width:Ba,height:Ba,imageSmoothingQuality:`high`});if(!n){t(/* @__PURE__ */ Error(`Failed to crop image`));return}n.toBlob(n=>{if(!n){t(/* @__PURE__ */ Error(`Failed to encode cropped image`));return}e(new File([n],`avatar.jpg`,{type:`image/jpeg`}))},`image/jpeg`,.9)})}disconnectedCallback(){super.disconnectedCallback(),this._setSource(null)}render(){return I`
      <div class="backdrop" @click=${e=>{e.target===e.currentTarget&&this._close()}}>
        <div class="modal" @click=${e=>e.stopPropagation()}>
          <div class="modal-header">
            <span class="modal-title">Change avatar — ${this.memberName}</span>
            <button class="close-btn" @click=${this._close}>✕</button>
          </div>

          <div class="mode-tabs">
            <button
              class="mode-tab ${this._mode===`emoji`?`active`:``}"
              @click=${()=>{this._mode=`emoji`,this._error=null}}
            >Emoji</button>
            <button
              class="mode-tab ${this._mode===`upload`?`active`:``}"
              @click=${()=>{this._mode=`upload`,this._error=null}}
            >Upload photo</button>
          </div>

          ${this._mode===`emoji`?this._renderEmojiMode():this._renderUploadMode()}

          ${this._error?I`<div class="error-msg">${this._error}</div>`:``}

          <div class="actions">
            <button class="btn btn-secondary" @click=${this._close}>Cancel</button>
            <button
              class="btn btn-primary"
              ?disabled=${this._submitting}
              @click=${this._submit}
            >${this._submitting?`Saving…`:`Save`}</button>
          </div>
        </div>
      </div>
    `}_renderEmojiMode(){return I`
      <div class="emoji-grid">
        ${Va.map(e=>I`
            <button
              class="emoji-btn ${this._selectedEmoji===e?`selected`:``}"
              @click=${()=>this._selectEmoji(e)}
              title=${e}
            >${e}</button>
          `)}
      </div>
    `}_renderUploadMode(){return this._sourceUrl?I`
        <div class="upload-area">
          <div class="crop-stage">
            <img
              id="crop-image"
              src=${this._sourceUrl}
              alt="Crop preview"
              @load=${this._onCropImageLoad}
            />
          </div>
          <div class="crop-actions">
            <button class="link-btn" @click=${this._clearPickedImage}>Choose different image</button>
            <span class="crop-hint">Drag to position · drag corners to resize</span>
          </div>
        </div>
      `:I`
      <div class="upload-area">
        <div class="picker">
          <button type="button" class="picker-button" @click=${this._openFilePicker}>Add picture</button>
          <span>Click the button above to choose an image.</span>
          <span>Supports PNG, JPEG, or WebP (max 2 MB).</span>
        </div>
        <input
          type="file"
          id="avatar-file-input"
          accept="image/png,image/jpeg,image/webp"
          @change=${this._onFileChange}
        />
      </div>
    `}_openFilePicker(){let e=this.renderRoot.querySelector(`#avatar-file-input`);e==null||e.click()}},La.styles=[G,N(Ia),P`
      :host {
        display: block;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal {
        background: var(--card-background-color, #fff);
        border-radius: var(--lucarne-radius-lg);
        padding: var(--lucarne-spacing-lg);
        width: min(420px, 92vw);
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-md);
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .modal-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 600;
        color: var(--lucarne-on-surface);
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
      }
      .mode-tabs {
        display: flex;
        border-bottom: 1px solid rgba(0,0,0,0.1);
      }
      .mode-tab {
        flex: 1;
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        transition: all 0.15s;
      }
      .mode-tab.active {
        border-bottom-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: 600;
      }
      .emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
      .emoji-btn {
        background: none;
        border: 1px solid transparent;
        border-radius: var(--lucarne-radius-sm);
        font-size: 1.4rem;
        cursor: pointer;
        padding: 4px;
        text-align: center;
        transition: background 0.1s;
      }
      .emoji-btn:hover {
        background: rgba(0,0,0,0.05);
      }
      .emoji-btn.selected {
        border-color: var(--primary-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1);
      }
      .upload-area {
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .picker {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-lg);
        border: 2px dashed rgba(0,0,0,0.18);
        border-radius: var(--lucarne-radius-md);
        text-align: center;
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
      }
      .picker-button {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
        border-radius: 999px;
        border: 1px solid var(--primary-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.08);
        color: var(--primary-color);
        font-weight: 600;
        cursor: pointer;
      }
      input[type='file'] {
        display: none;
      }
      .crop-stage {
        position: relative;
        width: 100%;
        /* cropperjs needs a fixed-size container so it can compute layout. */
        height: 320px;
        background: #000;
        border-radius: var(--lucarne-radius-md);
        overflow: hidden;
      }
      .crop-stage img {
        display: block;
        max-width: 100%;
      }
      /* Round preview overlay so the user sees how the avatar will look. */
      .crop-stage .cropper-view-box,
      .crop-stage .cropper-face {
        border-radius: 50%;
      }
      .crop-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .crop-hint {
        font-size: var(--lucarne-fs-xs);
        color: var(--lucarne-on-surface-muted);
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        padding: 0;
      }
      .error-msg {
        color: var(--error-color, #b00020);
        font-size: var(--lucarne-fs-sm);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-xs);
      }
      .btn {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 500;
        transition: opacity 0.15s;
      }
      .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-primary {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .btn-secondary {
        background: transparent;
        border: 1px solid rgba(0,0,0,0.2);
        color: var(--lucarne-on-surface);
      }
    `],La);K([U({attribute:!1})],Ha.prototype,`hass`,void 0),K([U()],Ha.prototype,`memberSlug`,void 0),K([U()],Ha.prototype,`memberName`,void 0),K([W()],Ha.prototype,`_mode`,void 0),K([W()],Ha.prototype,`_selectedEmoji`,void 0),K([W()],Ha.prototype,`_sourceUrl`,void 0),K([W()],Ha.prototype,`_error`,void 0),K([W()],Ha.prototype,`_submitting`,void 0),K([ut(`#crop-image`)],Ha.prototype,`_cropImage`,void 0),Ha=K([H(`lucarne-avatar-upload-modal`)],Ha);var Ua=class extends V{constructor(...e){super(...e),this._familyState=null,this._avatarModalMember=null}setConfig(e){this._config=e}connectedCallback(){super.connectedCallback(),this.hass&&!this._unsubFamily&&(this._unsubFamily=tn(this.hass,e=>{this._familyState=e}))}updated(e){super.updated(e),e.has(`hass`)&&this.hass&&!this._unsubFamily&&(this._unsubFamily=tn(this.hass,e=>{this._familyState=e}))}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._unsubFamily)==null||e.call(this),this._unsubFamily=void 0}_fire(e){let t={...e};delete t.kids,Array.isArray(t.members)||(t.members=[]),Lr(this,`config-changed`,{config:t})}_membersModel(){var e,t,n;let r=[...((e=this._familyState)==null?void 0:e.members)??[],Zt],i=new Map(r.map(e=>[e.slug,e])),a=((t=this._config)==null?void 0:t.members)??[],o=new Set(a),s=[...a.filter(e=>i.has(e)),...r.filter(e=>!o.has(e.slug)).map(e=>e.slug)],c=new Set(((n=this._config)==null?void 0:n.hidden_members)??[]),l=/* @__PURE__ */ new Set;for(let e of s)(c.has(e)||!o.has(e))&&l.add(e);return{ordered:s.map(e=>i.get(e)),hidden:l}}_commitMembers(e,t){let n={...this._config};n.members=e,t.size?n.hidden_members=[...t]:delete n.hidden_members,this._fire(n)}_titleChanged(e){let t=e.target.value;this._fire({...this._config,title:t||void 0})}_toggleVisibility(e){let{ordered:t,hidden:n}=this._membersModel(),r=new Set(n);r.has(e)?r.delete(e):r.add(e),this._commitMembers(t.map(e=>e.slug),r)}_onMembersReorder(e){let{hidden:t}=this._membersModel();this._commitMembers(e,t)}_toggleChanged(e,t){let n=t.target.checked;this._fire({...this._config,[e]:n})}_autoScrollChanged(e){let t=e.target.checked;this._fire({...this._config,auto_scroll:t})}_scrollTimeChanged(e,t){let n=t.target.value;this._fire({...this._config,[e]:n||void 0})}_renderMemberContent(e,t){return I`
      <div class="member-content ${t?`hidden-member`:``}" slot=${e.slug} data-slug=${e.slug}>
        <div class="member-avatar">
          ${e.avatar&&e.avatar.startsWith(`/local/`)?I`<img src=${e.avatar} alt=${e.name} style="width:100%;height:100%;object-fit:cover;" />`:I`${e.avatar??e.name[0]}`}
        </div>
        <span class="member-name">${e.name}</span>
        <button
          class="icon-btn visibility-btn"
          type="button"
          aria-label="${t?`Show`:`Hide`} ${e.name} on the card"
          title="${t?`Show on card`:`Hide from card`}"
          @click=${()=>this._toggleVisibility(e.slug)}
        >
          <ha-icon icon=${t?`mdi:eye-off-outline`:`mdi:eye-outline`}></ha-icon>
        </button>
        ${e.slug===`household`?``:I`<button
              class="icon-btn change-avatar-btn"
              type="button"
              title="Edit avatar"
              aria-label="Edit avatar for ${e.name}"
              @click=${()=>{this._avatarModalMember=e}}
            >
              <ha-icon icon="mdi:pencil-outline"></ha-icon>
            </button>`}
      </div>
    `}render(){if(!this._config)return I``;if(this._familyState!==null&&this._familyState.integrationError!==null)return I`
        <div class="error-block">
          Install the Lucarne Family integration first.
          <a href="/config/integrations/dashboard#search=lucarne" target="_blank"
            >Open Integrations</a
          >
        </div>
      `;if(this._familyState===null)return I`<div class="loading">Loading members…</div>`;let{ordered:e,hidden:t}=this._membersModel(),n=e.map(e=>({key:e.slug,label:e.name}));return I`
      <div class="section-label">General</div>
      <input
        id="ed-title"
        type="text"
        placeholder="Card title (default: Chores)"
        .value=${this._config.title??``}
        @change=${this._titleChanged}
      />

      <div class="section-label">Members</div>
      <lucarne-reorder-list
        label="Members (drag to reorder, eye to show or hide)"
        .items=${n}
        @reorder=${e=>this._onMembersReorder(e.detail.order)}
      >
        ${e.map(e=>this._renderMemberContent(e,t.has(e.slug)))}
      </lucarne-reorder-list>

      ${this._avatarModalMember?I`<lucarne-avatar-upload-modal
            .hass=${this.hass}
            .memberSlug=${this._avatarModalMember.slug}
            .memberName=${this._avatarModalMember.name}
            @close=${()=>{this._avatarModalMember=null}}
            @avatar-changed=${()=>{this._avatarModalMember=null}}
          ></lucarne-avatar-upload-modal>`:``}

      <div class="section-label">Display</div>
      ${[[`show_routines`,`Show routines`],[`show_tasks`,`Show tasks`],[`show_streak`,`Show streak`],[`show_rewards`,`Show rewards`],[`hide_names`,`Hide names`]].map(([e,t])=>I`
          <div class="toggle-row">
            <input
              type="checkbox"
              id="ed-${e}"
              .checked=${this._config[e]??e!==`hide_names`}
              @change=${t=>this._toggleChanged(e,t)}
            />
            <label for="ed-${e}">${t}</label>
          </div>
        `)}

      <div class="section-label">Auto-scroll</div>
      <div class="toggle-row">
        <input
          type="checkbox"
          id="ed-auto_scroll"
          .checked=${this._config.auto_scroll??!0}
          @change=${this._autoScrollChanged}
        />
        <label for="ed-auto_scroll">Scroll columns to the current time of day</label>
      </div>
      <div class="time-row">
        <label for="ed-afternoon_start">Afternoon starts at</label>
        <input
          type="time"
          id="ed-afternoon_start"
          ?disabled=${!(this._config.auto_scroll??!0)}
          .value=${this._config.afternoon_start??`12:00`}
          @change=${e=>this._scrollTimeChanged(`afternoon_start`,e)}
        />
      </div>
      <div class="time-row">
        <label for="ed-night_start">Night starts at</label>
        <input
          type="time"
          id="ed-night_start"
          ?disabled=${!(this._config.auto_scroll??!0)}
          .value=${this._config.night_start??`19:00`}
          @change=${e=>this._scrollTimeChanged(`night_start`,e)}
        />
      </div>
    `}},Wa=(Ua.styles=[G,P`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-lg);
        box-sizing: border-box;
        width: 100%;
      }
      .section-label {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin: var(--lucarne-spacing-md) 0 var(--lucarne-spacing-xs);
      }
      .section-label:first-of-type {
        margin-top: 0;
      }
      /* Row content rendered inside the shared <lucarne-reorder-list>. */
      .member-content {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        min-width: 0;
      }
      .member-content.hidden-member .member-avatar,
      .member-content.hidden-member .member-name {
        opacity: 0.45;
      }
      .member-name {
        flex: 1;
        min-width: 0;
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .member-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
        flex-shrink: 0;
      }
      .icon-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--lucarne-on-surface);
      }
      .icon-btn ha-icon {
        --mdc-icon-size: 20px;
        width: 20px;
        height: 20px;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .toggle-row label {
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        cursor: pointer;
        flex: 1;
      }
      /* Custom checkbox: the native control follows the OS color-scheme and
         renders as a black box on a light HA theme when the OS is dark. Render
         it ourselves from theme tokens so it matches the card surface + accent. */
      input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        margin: 0;
        flex-shrink: 0;
        position: relative;
        cursor: pointer;
        border: 2px solid var(--lucarne-on-surface-muted, #727272);
        border-radius: 4px;
        background: var(--lucarne-surface, var(--ha-card-background, #fff));
      }
      input[type='checkbox']:checked {
        background: var(--primary-color, #03a9f4);
        border-color: var(--primary-color, #03a9f4);
      }
      input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      input[type='text'] {
        width: 100%;
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: var(--lucarne-radius-sm);
        font-size: var(--lucarne-fs-md);
        box-sizing: border-box;
      }
      .time-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .time-row label {
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        flex: 1;
      }
      /* Without an explicit color-scheme the native time control paints itself in
         the OS scheme — a dark box on the (light) lucarne theme. Pin it to the
         theme surface + tokens so the field, its digits, and the clock glyph match
         the rest of the editor instead of following the OS. */
      input[type='time'] {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: var(--lucarne-radius-sm);
        font-size: var(--lucarne-fs-md);
        box-sizing: border-box;
        color-scheme: light;
        background: var(--lucarne-surface, var(--ha-card-background, #fff));
        color: var(--lucarne-on-surface, #212121);
      }
      input[type='time']:disabled {
        opacity: 0.5;
      }
      .loading {
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
        padding: var(--lucarne-spacing-lg);
      }
      .error-block {
        padding: var(--lucarne-spacing-md);
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-xs);
      }
      .error-block a {
        color: var(--primary-color);
      }
    `],Ua);K([U({attribute:!1})],Wa.prototype,`hass`,void 0),K([W()],Wa.prototype,`_config`,void 0),K([W()],Wa.prototype,`_familyState`,void 0),K([W()],Wa.prototype,`_avatarModalMember`,void 0),Wa=K([H(`lucarne-chores-card-editor`)],Wa);var Ga,Ka=`rewards-overlay-changed`;function qa(e){return e<0?`−${Math.abs(e)}`:String(e)}function Ja(e){return`${qa(e)} ${Math.abs(e)===1?`point`:`points`}`}function Ya(e){return e>0?`+${e}`:qa(e)}function Xa(e,t=Date.now()){let n=Date.parse(e);if(Number.isNaN(n))return``;let r=Math.max(0,Math.round((t-n)/6e4));if(r<1)return`just now`;if(r<60)return`${r} min ago`;let i=Math.round(r/60);return i<48?`${i} h ago`:`${Math.round(i/24)} d ago`}function Za(e){let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`})}function Qa(e,t,n){if(e.trim()===``)return null;let r=Number(e);return Number.isInteger(r)&&r>=t&&r<=n?r:null}var $a=P`
  :host {
    display: block;
    color: var(--lucarne-on-surface);
    font-size: var(--lucarne-fs-md);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-sm);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--lucarne-spacing-md);
    padding: var(--lucarne-spacing-md);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--lucarne-radius-md);
  }
  .row.archived {
    opacity: 0.55;
  }
  .grow {
    flex: 1 1 160px;
    min-width: 0;
  }
  .title {
    font-weight: 600;
  }
  .muted {
    color: var(--lucarne-on-surface-muted);
    font-size: var(--lucarne-fs-sm);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--lucarne-spacing-sm);
    margin-top: var(--lucarne-spacing-xs);
  }
  .claim-line {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
    min-width: 0;
  }
  .claim-line .chips {
    margin-top: 0;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--lucarne-spacing-xs);
    font-size: var(--lucarne-fs-sm);
  }
  .chip lucarne-member-avatar {
    --lucarne-avatar-size: 24px;
    --lucarne-avatar-font: 0.8rem;
  }
  .badge {
    font-size: var(--lucarne-fs-sm);
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--lucarne-success-bg);
    color: var(--lucarne-success-fg);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--lucarne-spacing-sm);
  }
  button {
    min-height: 44px;
    min-width: 44px;
    padding: 0 var(--lucarne-spacing-lg);
    border-radius: var(--lucarne-radius-md);
    border: 1px solid rgba(0, 0, 0, 0.2);
    background: transparent;
    color: var(--lucarne-on-surface);
    font: inherit;
    cursor: pointer;
  }
  button.primary {
    background: var(--primary-color, #03a9f4);
    border-color: transparent;
    color: var(--text-primary-color, #fff);
  }
  button.danger {
    color: var(--error-color, #db4437);
    border-color: var(--error-color, #db4437);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  input[type='text'],
  input[type='number'],
  textarea,
  select {
    box-sizing: border-box;
    min-height: 44px;
    padding: 0 var(--lucarne-spacing-md);
    border: 1px solid rgba(0, 0, 0, 0.25);
    border-radius: var(--lucarne-radius-md);
    background: var(--lucarne-surface);
    color: var(--lucarne-on-surface);
    font: inherit;
  }
  textarea {
    padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
    width: 100%;
    min-height: 72px;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-sm);
    width: 100%;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-xs);
  }
  .field-inline {
    flex-direction: row;
    align-items: center;
    gap: var(--lucarne-spacing-sm);
    min-height: 44px;
  }
  .error {
    color: var(--error-color, #db4437);
    font-size: var(--lucarne-fs-sm);
    width: 100%;
  }
  .empty {
    color: var(--lucarne-on-surface-muted);
    padding: var(--lucarne-spacing-lg) 0;
  }
  .balance {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`,eo=class extends V{constructor(...e){super(...e),this.members=[]}get isAdmin(){var e;return((e=this.rewards)==null?void 0:e.is_admin)===!0}notify(){Lr(this,Ka)}memberFor(e){return this.members.find(t=>t.slug===e)}memberName(e){var t;return((t=this.memberFor(e))==null?void 0:t.name)??e}renderChip(e,t=``){let n=this.memberFor(e);return I`<span class="chip">
      <lucarne-member-avatar
        .name=${(n==null?void 0:n.name)??e}
        .color=${(n==null?void 0:n.color)??`#a8d8b9`}
        .avatar=${(n==null?void 0:n.avatar)??null}
      ></lucarne-member-avatar>
      ${(n==null?void 0:n.name)??e}${t}
    </span>`}};Ga=eo,Ga.styles=[G,$a,Or,kr],K([U({attribute:!1})],eo.prototype,`hass`,void 0),K([U({attribute:!1})],eo.prototype,`rewards`,void 0),K([U({attribute:!1})],eo.prototype,`members`,void 0),K([U({attribute:!1})],eo.prototype,`overlay`,void 0);var to=class extends eo{constructor(...e){super(...e),this._busy=/* @__PURE__ */ new Set,this._errors=/* @__PURE__ */ new Map}async _resolve(e,t){if(this._busy.has(e))return;this._busy=new Set(this._busy).add(e);let n=new Map(this._errors);n.delete(e),this._errors=n;try{t===`approve`?await ba(this.hass,e):await xa(this.hass,e),this.overlay.resolveClaim(e,t===`approve`?`approved`:`rejected`),this.notify()}catch(n){this._errors=new Map(this._errors).set(e,wi(n,t===`approve`?`Failed to approve`:`Failed to reject`))}finally{let t=new Set(this._busy);t.delete(e),this._busy=t}}render(){let e=this.rewards.claims.filter(e=>e.status===`pending`).sort((e,t)=>Date.parse(e.created_at)-Date.parse(t.created_at));return e.length===0?I`<div class="empty">No claims waiting.</div>`:I`
      <ul class="list">
        ${e.map(e=>{let t=this._busy.has(e.id),n=this._errors.get(e.id),r=e.contributors.length>1;return I`
            <li class="row" data-claim-id=${e.id}>
              <div class="claim-line">
                <span class="chips">
                  ${e.contributors.map(e=>this.renderChip(e.member_slug,r?` (${Ja(e.share)})`:``))}
                </span>
                <span class="title">${e.reward_name}</span>
                <span class="muted">${Ja(e.cost)} · ${Xa(e.created_at)}</span>
              </div>
              ${this.isAdmin?I`<div class="actions">
                    <button class="primary approve" ?disabled=${t} @click=${()=>this._resolve(e.id,`approve`)}>
                      Approve
                    </button>
                    <button class="reject" ?disabled=${t} @click=${()=>this._resolve(e.id,`reject`)}>
                      Reject
                    </button>
                  </div>`:``}
              ${n?I`<div class="error" role="alert">${n}</div>`:``}
            </li>
          `})}
      </ul>
    `}};K([W()],to.prototype,`_busy`,void 0),K([W()],to.prototype,`_errors`,void 0),to=K([H(`lucarne-rewards-claims-tab`)],to);var no,ro=200,io=`.dialog button:not([disabled]), .dialog input:not([disabled])`,ao=(no=class extends eo{constructor(...e){super(...e),this._form=null,this._opener=null,this._onDialogKeydown=e=>{if(e.key===`Escape`){e.preventDefault(),e.stopPropagation(),this._close();return}if(e.key!==`Tab`)return;let t=Array.from(this.renderRoot.querySelectorAll(io));if(t.length===0)return;let n=this.renderRoot.activeElement,r=n?t.indexOf(n):-1,i=e.shiftKey?r<=0?t.length-1:r-1:r===t.length-1?0:r+1;e.preventDefault(),t[i].focus()}}_open(e,t){this._opener=t,this._form={slug:e,points:``,reason:``,error:``,busy:!1},this.updateComplete.then(()=>{var e;return(e=this.renderRoot.querySelector(`.grant-points`))==null?void 0:e.focus()})}updated(){var e;this._form&&!this.renderRoot.activeElement&&((e=this.renderRoot.querySelector(`.grant-points`))==null||e.focus())}_close(){var e,t;(e=this._form)!=null&&e.busy||(this._form=null,(t=this._opener)==null||t.focus(),this._opener=null)}_patch(e){this._form&&(this._form={...this._form,...e})}async _grant(){let e=this._form;if(!e||e.busy)return;let t=Qa(e.points,1,1e4);if(t===null){this._patch({error:`Points must be a whole number from 1 to 10000`});return}if(e.reason.length>ro){this._patch({error:`Reason must be ${ro} characters or less`});return}this._patch({busy:!0,error:``});try{await pa(this.hass,e.slug,t,e.reason.trim()||void 0),this.overlay.addGrant(e.slug,t),this._patch({busy:!1}),this._close(),this.notify()}catch(e){this._patch({busy:!1,error:wi(e,`Failed to grant points`)})}}_renderDialog(e){let t=this.memberName(e.slug),n=e=>e.key===`Enter`&&this._grant();return I`<div class="grant-modal" @keydown=${this._onDialogKeydown}>
      <div class="backdrop" @click=${()=>this._close()}></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="grant-title">
        <h2 id="grant-title">Grant points to ${t}</h2>
        <div class="muted">Balance: ${Ja(this.rewards.balances[e.slug]??0)}</div>
        <div class="form">
          <label class="field">
            <span class="muted">Points</span>
            <input
              class="grant-points"
              type="number"
              min="1"
              max="10000"
              step="1"
              inputmode="numeric"
              .value=${e.points}
              @input=${e=>this._patch({points:e.target.value})}
              @keydown=${n}
            />
          </label>
          <label class="field">
            <span class="muted">Reason (${e.reason.length}/${ro})</span>
            <input
              class="grant-reason"
              type="text"
              maxlength=${ro}
              .value=${e.reason}
              @input=${e=>this._patch({reason:e.target.value})}
              @keydown=${n}
            />
          </label>
          ${e.error?I`<div class="error" role="alert">${e.error}</div>`:``}
        </div>
        <div class="actions">
          <button class="cancel" ?disabled=${e.busy} @click=${()=>this._close()}>Cancel</button>
          <button class="primary confirm-grant" ?disabled=${e.busy} @click=${()=>this._grant()}>Grant</button>
        </div>
      </div>
    </div>`}render(){let e=this.members.filter(e=>e.slug!==`household`);return e.length===0?I`<div class="empty">No family members yet.</div>`:I`
      <ul class="list">
        ${e.map(e=>I`
            <li class="row" data-member=${e.slug}>
              <div class="grow">${this.renderChip(e.slug)}</div>
              <div class="balance" aria-label="${e.name} balance">
                ${qa(this.rewards.balances[e.slug]??0)}
              </div>
              ${this.isAdmin?I`<button
                    class="primary grant"
                    aria-label="Grant points to ${e.name}"
                    @click=${t=>this._open(e.slug,t.currentTarget)}
                  >
                    Grant
                  </button>`:``}
            </li>
          `)}
      </ul>
      ${this._form?this._renderDialog(this._form):``}
    `}},no.styles=[...eo.styles,P`
      .grant-modal {
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
      }
      .dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        width: min(420px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        padding: var(--lucarne-spacing-xl);
        border-radius: var(--lucarne-radius-lg);
        background: var(--lucarne-surface);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      }
      .dialog h2 {
        margin: 0 0 var(--lucarne-spacing-md);
        font-size: var(--lucarne-fs-lg);
      }
      .dialog .actions {
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
    `],no);K([W()],ao.prototype,`_form`,void 0),ao=K([H(`lucarne-rewards-points-tab`)],ao);var oo=60,so=1e5,co=500,lo={name:``,cost:``,description:``,poolable:!1},uo=class extends eo{constructor(...e){super(...e),this._showArchived=!1,this._editing=null,this._form=lo,this._confirmArchive=null,this._busy=!1,this._error=null}_open(e,t){this._editing=e,this._form=t,this._error=null,this._confirmArchive=null}_close(){this._editing=null,this._error=null}async _save(){let e=this._editing;if(e===null||this._busy)return;let t=this._form.name.trim(),n=this._form.description.trim(),r=Qa(this._form.cost,1,so),i=``;if(t===``?i=`Name is required`:t.length>oo?i=`Name must be ${oo} characters or less`:r===null?i=`Cost must be a whole number from 1 to ${so}`:n.length>co&&(i=`Description must be ${co} characters or less`),i||r===null){this._error={text:i,target:e};return}let a={name:t,cost:r,description:n,poolable:this._form.poolable};this._busy=!0,this._error=null;try{if(e===`new`){let{id:e}=await ma(this.hass,a);this.overlay.addReward({id:e,...a,archived:!1})}else await ha(this.hass,e,a),this.overlay.editReward(e,a);this.notify(),this._close()}catch(t){this._error={text:wi(t,`Failed to save reward`),target:e}}finally{this._busy=!1}}async _archive(e){if(!this._busy){this._busy=!0,this._error=null;try{await ga(this.hass,e),this.overlay.archiveReward(e),this._confirmArchive=null,this.notify()}catch(t){this._error={text:wi(t,`Failed to archive reward`),target:e}}finally{this._busy=!1}}}_renderForm(e){var t;let n=this._form,r=e=>this._form={...this._form,...e};return I`
      <div class="form">
        <label class="field">
          <span class="muted">Name</span>
          <input
            class="reward-name"
            type="text"
            maxlength=${oo}
            .value=${n.name}
            @input=${e=>r({name:e.target.value})}
          />
        </label>
        <label class="field">
          <span class="muted">Cost (points)</span>
          <input
            class="reward-cost"
            type="number"
            min="1"
            max=${so}
            step="1"
            inputmode="numeric"
            .value=${n.cost}
            @input=${e=>r({cost:e.target.value})}
          />
        </label>
        <label class="field">
          <span class="muted">Description (${n.description.length}/${co})</span>
          <textarea
            class="reward-description"
            maxlength=${co}
            .value=${n.description}
            @input=${e=>r({description:e.target.value})}
          ></textarea>
        </label>
        <label class="field field-inline">
          <input
            class="reward-poolable"
            type="checkbox"
            .checked=${n.poolable}
            @change=${e=>r({poolable:e.target.checked})}
          />
          <span>Allow pooling points</span>
        </label>
        ${((t=this._error)==null?void 0:t.target)===e?I`<div class="error" role="alert">${this._error.text}</div>`:``}
        <div class="actions">
          <button class="primary save" ?disabled=${this._busy} @click=${()=>this._save()}>Save</button>
          <button class="cancel" @click=${()=>this._close()}>Cancel</button>
        </div>
      </div>
    `}_renderReward(e){var t;if(this._editing===e.id)return I`<li class="row" data-reward=${e.id}>${this._renderForm(e.id)}</li>`;let n=this._confirmArchive===e.id;return I`
      <li class="row ${e.archived?`archived`:``}" data-reward=${e.id}>
        <div class="grow">
          <div class="title">${e.name}</div>
          <div class="muted">${e.cost} points</div>
          ${e.description?I`<div class="muted">${e.description}</div>`:``}
        </div>
        ${e.poolable?I`<span class="badge">Shareable</span>`:``}
        ${this.isAdmin&&!e.archived?I`<div class="actions">
              ${n?I`<span class="muted">Archive?</span>
                    <button class="danger confirm-archive" ?disabled=${this._busy} @click=${()=>this._archive(e.id)}>
                      Archive
                    </button>
                    <button class="keep" @click=${()=>this._confirmArchive=null}>Keep</button>`:I`<button
                      class="edit"
                      @click=${()=>this._open(e.id,{name:e.name,cost:String(e.cost),description:e.description,poolable:e.poolable})}
                    >
                      Edit
                    </button>
                    <button class="archive" @click=${()=>this._confirmArchive=e.id}>Archive</button>`}
            </div>`:``}
        ${((t=this._error)==null?void 0:t.target)===e.id?I`<div class="error" role="alert">${this._error.text}</div>`:``}
      </li>
    `}render(){let e=this.rewards.rewards.filter(e=>!e.archived),t=this._showArchived?this.rewards.rewards.filter(e=>e.archived):[];return I`
      <div class="actions">
        ${this.isAdmin&&this._editing!==`new`?I`<button class="primary add" @click=${()=>this._open(`new`,lo)}>Add reward</button>`:``}
        <label class="field field-inline">
          <input
            class="show-archived"
            type="checkbox"
            .checked=${this._showArchived}
            @change=${e=>this._showArchived=e.target.checked}
          />
          <span>Show archived</span>
        </label>
      </div>
      ${this.isAdmin&&this._editing===`new`?I`<div class="row">${this._renderForm(`new`)}</div>`:``}
      ${e.length===0&&t.length===0?I`<div class="empty">No rewards yet.</div>`:I`<ul class="list">${[...e,...t].map(e=>this._renderReward(e))}</ul>`}
    `}};K([W()],uo.prototype,`_showArchived`,void 0),K([W()],uo.prototype,`_editing`,void 0),K([W()],uo.prototype,`_form`,void 0),K([W()],uo.prototype,`_confirmArchive`,void 0),K([W()],uo.prototype,`_busy`,void 0),K([W()],uo.prototype,`_error`,void 0),uo=K([H(`lucarne-rewards-catalog-tab`)],uo);function fo(e){switch(e.kind){case`earn`:return e.summary;case`revoke`:return`Un-ticked: ${e.summary}`;case`grant`:return e.reason||`Points granted`;case`streak_daily`:return`Streak bonus`;case`streak_milestone`:return e.reason;case`claim_reserve`:return`Claimed ${e.summary}`;case`claim_release`:return`Returned: ${e.summary}`;default:return e.summary||e.reason||e.kind}}var po=class extends eo{constructor(...e){super(...e),this._member=``,this._confirmRefund=null,this._busy=!1,this._error=null}async _refund(e){if(!this._busy){this._busy=!0,this._error=null;try{await Sa(this.hass,e),this.overlay.resolveClaim(e,`refunded`),this._confirmRefund=null,this.notify()}catch(t){this._error={claimId:e,text:wi(t,`Failed to refund`)}}finally{this._busy=!1}}}render(){let e=new Set(this.rewards.claims.filter(e=>e.status===`approved`).map(e=>e.id)),t=[...this.rewards.history??[]].filter(e=>this._member===``||e.member_slug===this._member).sort((e,t)=>Date.parse(t.created_at)-Date.parse(e.created_at)||t.id-e.id),n=/* @__PURE__ */ new Set;return I`
      <label class="field">
        <span class="muted">Member</span>
        <select
          class="member-filter"
          .value=${this._member}
          @change=${e=>this._member=e.target.value}
        >
          <option value="">Everyone</option>
          ${this.members.map(e=>I`<option value=${e.slug}>${e.name}</option>`)}
        </select>
      </label>
      ${t.length===0?I`<div class="empty">No history yet.</div>`:I`<ul class="list">
            ${t.map(t=>{let r=this.isAdmin&&t.kind===`claim_reserve`&&t.claim_id!==null&&e.has(t.claim_id)&&!n.has(t.claim_id);r&&n.add(t.claim_id);let i=r&&this._confirmRefund===t.claim_id;return I`
                <li class="row" data-ledger=${t.id}>
                  <div class="grow">
                    <div class="title">${fo(t)}</div>
                    <div class="muted">
                      ${Za(t.created_at)} · ${this.memberName(t.member_slug)}${t.actor_name?I` · by ${t.actor_name}`:``}
                    </div>
                  </div>
                  <div class="balance delta">${Ya(t.delta)}</div>
                  ${r?I`<div class="actions">
                        ${i?I`<span class="muted">Refund?</span>
                              <button
                                class="danger confirm-refund"
                                ?disabled=${this._busy}
                                @click=${()=>this._refund(t.claim_id)}
                              >
                                Refund
                              </button>
                              <button class="keep" @click=${()=>this._confirmRefund=null}>Keep</button>`:I`<button class="refund" @click=${()=>this._confirmRefund=t.claim_id}>
                              Refund
                            </button>`}
                      </div>`:``}
                  ${this._error&&this._error.claimId===t.claim_id&&r?I`<div class="error" role="alert">${this._error.text}</div>`:``}
                </li>
              `})}
          </ul>`}
    `}};K([W()],po.prototype,`_member`,void 0),K([W()],po.prototype,`_confirmRefund`,void 0),K([W()],po.prototype,`_busy`,void 0),K([W()],po.prototype,`_error`,void 0),po=K([H(`lucarne-rewards-history-tab`)],po);var mo=20,ho=class extends eo{constructor(...e){super(...e),this._daily=null,this._milestones=null,this._busy=!1,this._error=``}get _dailyValue(){return this._daily??String(this.rewards.settings.streak_daily_bonus)}get _rows(){return this._milestones??this.rewards.settings.streak_milestones.map(e=>({days:String(e.days),points:String(e.points)}))}_setRow(e,t){this._milestones=this._rows.map((n,r)=>r===e?{...n,...t}:n)}_duplicateDays(e){let t=/* @__PURE__ */ new Set,n=/* @__PURE__ */ new Set;for(let r of e){let e=r.days.trim();e!==``&&(t.has(e)&&n.add(e),t.add(e))}return n}_valid(e){return Qa(this._dailyValue,0,1e3)!==null&&this._duplicateDays(e).size===0&&e.every(e=>Qa(e.days,1,365)!==null&&Qa(e.points,1,1e4)!==null)}async _save(){let e=this._rows;if(this._busy||!this._valid(e))return;let t={streak_daily_bonus:Qa(this._dailyValue,0,1e3),streak_milestones:e.map(e=>({days:Number(e.days),points:Number(e.points)})).sort((e,t)=>e.days-t.days)};this._busy=!0,this._error=``;try{await _a(this.hass,t),this.overlay.setSettings(t),this._daily=null,this._milestones=null,this.notify()}catch(e){this._error=wi(e,`Failed to save settings`)}finally{this._busy=!1}}render(){let e=this.rewards.settings;if(!this.isAdmin)return I`
        <div>Daily streak bonus: ${e.streak_daily_bonus===0?`off`:`${e.streak_daily_bonus} points`}</div>
        ${e.streak_milestones.length===0?I`<div class="muted">No streak milestones.</div>`:I`<ul class="list">
              ${e.streak_milestones.map(e=>I`<li>${e.days}-day streak: ${e.points} points</li>`)}
            </ul>`}
      `;let t=this._rows,n=this._duplicateDays(t);return I`
      <div class="form">
        <label class="field">
          <span class="muted">Daily streak bonus (0 = off)</span>
          <input
            class="daily-bonus"
            type="number"
            min="0"
            max="1000"
            step="1"
            inputmode="numeric"
            .value=${this._dailyValue}
            @input=${e=>this._daily=e.target.value}
          />
        </label>
        <div class="muted">Streak milestones</div>
        <ul class="list">
          ${t.map((e,r)=>I`
              <li class="row" data-milestone=${r}>
                <label class="field">
                  <span class="muted">Days</span>
                  <input
                    class="milestone-days"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    inputmode="numeric"
                    .value=${e.days}
                    @input=${e=>this._setRow(r,{days:e.target.value})}
                  />
                </label>
                <label class="field">
                  <span class="muted">Points</span>
                  <input
                    class="milestone-points"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    inputmode="numeric"
                    .value=${e.points}
                    @input=${e=>this._setRow(r,{points:e.target.value})}
                  />
                </label>
                <button class="remove" @click=${()=>this._milestones=t.filter((e,t)=>t!==r)}>
                  Remove
                </button>
                ${n.has(e.days.trim())?I`<div class="error">Day ${e.days.trim()} is already used</div>`:``}
              </li>
            `)}
        </ul>
        ${this._error?I`<div class="error" role="alert">${this._error}</div>`:``}
        <div class="actions">
          <button
            class="add"
            ?disabled=${t.length>=mo}
            @click=${()=>this._milestones=[...t,{days:``,points:``}]}
          >
            Add milestone
          </button>
          <button class="primary save" ?disabled=${this._busy||!this._valid(t)} @click=${()=>this._save()}>
            Save
          </button>
        </div>
      </div>
    `}};K([W()],ho.prototype,`_daily`,void 0),K([W()],ho.prototype,`_milestones`,void 0),K([W()],ho.prototype,`_busy`,void 0),K([W()],ho.prototype,`_error`,void 0),ho=K([H(`lucarne-rewards-settings-tab`)],ho);var go,_o=[{id:`claims`,label:`Claims`},{id:`points`,label:`Points`},{id:`rewards`,label:`Rewards`},{id:`history`,label:`History`},{id:`settings`,label:`Settings`}],vo=`rewards-panel`;window.customCards=window.customCards||[],window.customCards.push({type:`lucarne-rewards-admin-card`,name:`Lucarne Rewards Admin`,description:`Approve reward claims, grant points and manage the reward catalog`,preview:!1}),A(`evaluating:lucarne-rewards-admin-card`);var yo=(go=class extends ft{constructor(...e){super(...e),this._familyState=null,this._tab=`claims`,this._overlay=new Vi,this._onFamilyState=e=>{this._overlay.reconcile(e.rewardsFetchedAt),this._familyState=e}}static getConfigElement(){return document.createElement(`lucarne-rewards-admin-card-editor`)}static getStubConfig(){return{type:`custom:lucarne-rewards-admin-card`}}getCardSize(){return 6}getGridOptions(){return{columns:12,rows:`auto`,min_columns:6}}applyConfig(e){let t=e.history_limit;if(t!==void 0&&!(Number.isInteger(t)&&t>=1&&t<=500))throw new dt(`lucarne-rewards-admin-card: history_limit must be an integer from 1 to 500`);let n=this._historyLimit(this._config)!==this._historyLimit(e);this._config=e,n&&this._unsubFamily&&(this._unsubFamily(),this._unsubFamily=void 0,this._subscribe())}_historyLimit(e){return(e==null?void 0:e.history_limit)??200}_subscribe(){this.hass&&!this._unsubFamily&&this.isConnected&&(this._unsubFamily=tn(this.hass,this._onFamilyState,{rewards:!0,rewardsHistory:this._historyLimit(this._config)}))}connectedCallback(){super.connectedCallback(),this._subscribe()}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._unsubFamily)==null||e.call(this),this._unsubFamily=void 0}updated(e){super.updated(e),e.has(`hass`)&&this._subscribe()}_onTabKeydown(e){if(e.key!==`ArrowLeft`&&e.key!==`ArrowRight`)return;e.preventDefault();let t=_o[(_o.findIndex(e=>e.id===this._tab)+(e.key===`ArrowRight`?1:_o.length-1))%_o.length];this._tab=t.id,this.updateComplete.then(()=>{var e;return(e=this.shadowRoot)==null||(e=e.querySelector(`#tab-${t.id}`))==null?void 0:e.focus()})}_renderPanel(e,t,n){let{hass:r,_overlay:i}=this,a=n.members;switch(e){case`claims`:return I`<lucarne-rewards-claims-tab .hass=${r} .rewards=${t} .members=${a} .overlay=${i}></lucarne-rewards-claims-tab>`;case`points`:return I`<lucarne-rewards-points-tab .hass=${r} .rewards=${t} .members=${a} .overlay=${i}></lucarne-rewards-points-tab>`;case`rewards`:return I`<lucarne-rewards-catalog-tab .hass=${r} .rewards=${t} .members=${a} .overlay=${i}></lucarne-rewards-catalog-tab>`;case`history`:return I`<lucarne-rewards-history-tab .hass=${r} .rewards=${t} .members=${a} .overlay=${i}></lucarne-rewards-history-tab>`;case`settings`:return I`<lucarne-rewards-settings-tab .hass=${r} .rewards=${t} .members=${a} .overlay=${i}></lucarne-rewards-settings-tab>`}}renderContent(){var e;let t=this._familyState,n=(e=this._config)==null?void 0:e.title,r=n?I`<div class="card-title">${n}</div>`:``,i=t!=null&&t.rewards?this._overlay.apply(t.rewards):null;if(!t||!i)return I`<ha-card>
        ${r}
        ${t!==null&&t.rewards===null&&t.members.length>0?I`<div class="message">Rewards need the Lucarne integration to be updated.</div>`:I`<div class="skeleton" aria-hidden="true"></div>`}
      </ha-card>`;let a=i.claims.filter(e=>e.status===`pending`).length;return I`<ha-card @rewards-overlay-changed=${()=>this.requestUpdate()}>
      ${r}
      ${i.is_admin?``:I`<div class="note" role="note">
            You can view rewards, but approving claims and granting points needs a Home Assistant administrator.
          </div>`}
      <div class="tabs" role="tablist" aria-label="Rewards" @keydown=${this._onTabKeydown}>
        ${_o.map(e=>{let t=e.id===this._tab;return I`<button
            class="tab"
            id="tab-${e.id}"
            role="tab"
            aria-selected=${t?`true`:`false`}
            aria-controls=${vo}
            tabindex=${t?`0`:`-1`}
            @click=${()=>this._tab=e.id}
          >
            ${e.id===`claims`&&a>0?`${e.label} (${a})`:e.label}
          </button>`})}
      </div>
      <div class="panel" id=${vo} role="tabpanel" aria-labelledby="tab-${this._tab}">
        ${this._renderPanel(this._tab,i,t)}
      </div>
    </ha-card>`}},go.styles=[G,P`
      :host {
        display: block;
        font-family: var(--primary-font-family, sans-serif);
      }
      ha-card {
        padding: 0;
        overflow: hidden;
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) 0;
      }
      .note {
        margin: var(--lucarne-spacing-md) var(--lucarne-spacing-xl) 0;
        padding: var(--lucarne-spacing-md);
        border-radius: var(--lucarne-radius-md);
        background: var(--lucarne-skeleton-base);
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-sm);
      }
      .tabs {
        display: flex;
        overflow-x: auto;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-xl) 0;
        gap: var(--lucarne-spacing-xs);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }
      .tab {
        min-height: 44px;
        padding: 0 var(--lucarne-spacing-lg);
        border: none;
        border-bottom: 3px solid transparent;
        background: transparent;
        color: var(--lucarne-on-surface-muted);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .tab[aria-selected='true'] {
        color: var(--lucarne-on-surface);
        border-bottom-color: var(--primary-color, #03a9f4);
      }
      .panel {
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-xl);
      }
      .skeleton {
        height: 16px;
        margin: var(--lucarne-spacing-xl);
        border-radius: var(--lucarne-radius-sm);
        background: var(--lucarne-skeleton-base);
      }
      .message {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
      }
    `],go);K([U({attribute:!1})],yo.prototype,`hass`,void 0),K([W()],yo.prototype,`_config`,void 0),K([W()],yo.prototype,`_familyState`,void 0),K([W()],yo.prototype,`_tab`,void 0),yo=K([H(`lucarne-rewards-admin-card`)],yo);var bo=class extends V{setConfig(e){this._config=e}_fire(e){Lr(this,`config-changed`,{config:e})}_titleChanged(e){let t=e.target;this._fire({...this._config,title:t.value||void 0})}_historyLimitChanged(e){let t=parseInt(e.target.value,10);this._fire({...this._config,history_limit:isNaN(t)?void 0:t})}render(){return this._config?I`
      <label class="field">
        <span class="field-label">Card title</span>
        <input
          class="text-input"
          type="text"
          .value=${this._config.title??``}
          @change=${this._titleChanged}
        />
      </label>
      <label class="field">
        <span class="field-label">History rows (1–500)</span>
        <input
          class="text-input"
          type="number"
          min="1"
          max="500"
          step="1"
          .value=${String(this._config.history_limit??200)}
          @change=${this._historyLimitChanged}
        />
      </label>
    `:I``}},xo=(bo.styles=[G,Ar],bo);K([U({attribute:!1})],xo.prototype,`hass`,void 0),K([W()],xo.prototype,`_config`,void 0),xo=K([H(`lucarne-rewards-admin-card-editor`)],xo),A(`bundle-complete`);