import * as THREE from 'three';
import { WORLD } from './event-navigation.ts';
import { LOGO_SCALE, LOGO_CENTER_Y, LOGO_DEPTH, sampleTrack, type CoasterTrack, type CoasterStop } from './event-coaster.ts';

const MINT = new THREE.Color('#c3e5c8');
const bright = (power = 2) => MINT.clone().multiplyScalar(power);
const vertex = `varying vec3 vWorld; varying vec3 vNormal;
void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`;

function shape(outline: number[][], holes: number[][][] = []) {
  const result = new THREE.Shape(outline.map(([x,z]) => new THREE.Vector2(x,-z)));
  result.holes = holes.map(hole => new THREE.Path(hole.map(([x,z]) => new THREE.Vector2(x,-z))));
  return result;
}

/** Only the logo strokes are solid: its openings remain actual empty space. */
export function createVerticalLogo() {
  const logo = new THREE.Group();
  logo.name = 'Upright Nucleus sculpture';
  logo.position.set(0, LOGO_CENTER_Y, -LOGO_DEPTH / 2);
  logo.scale.set(LOGO_SCALE, LOGO_SCALE, 1);
  const material = new THREE.MeshStandardMaterial({ color: '#264c36', metalness: .55, roughness: .32, emissive: '#c3e5c8', emissiveIntensity: .15 });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: bright(1.65), transparent: true, opacity: .82 });
  for (const wall of WORLD.walls) {
    const geometry = new THREE.ExtrudeGeometry(shape(wall.outline, wall.holes), { depth: LOGO_DEPTH, bevelEnabled: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Solid logo stroke'; mesh.userData.logoObstacle = true;
    logo.add(mesh, new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), edgeMaterial));
  }
  return logo;
}

export function createScenery(scene: THREE.Scene, track: CoasterTrack, stops: CoasterStop[], coarse: boolean, eventTitles: string[] = []) {
  const length = track.getLength();
  const time = { value: 0 }, map = { value: 0 };
  const dark = new THREE.MeshStandardMaterial({ color: '#0c221a', metalness: 0.72, roughness: 0.32 });
  const railMaterial = new THREE.MeshBasicMaterial({ color: bright(2.4) });
  const dimLine = new THREE.LineBasicMaterial({ color: '#89edb3', transparent: true, opacity: 0.34 });
  const logo = createVerticalLogo(); scene.add(logo);
  const hologram = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uMap: map, uColor: { value: MINT } }, vertexShader: vertex,
    fragmentShader: `uniform float uTime;uniform float uMap;uniform vec3 uColor;varying vec3 vWorld;varying vec3 vNormal;
    void main(){float scan=pow(.5+.5*sin(vWorld.y*26.-uTime*1.5),12.);
    float sweep=pow(.5+.5*sin(vWorld.y*.65-uTime*.8),28.);
    float rim=pow(1.-abs(dot(normalize(cameraPosition-vWorld),normalize(vNormal))),2.);
    gl_FragColor=vec4(uColor*(.45+rim*.8+scan*.35+sweep*.7),.12+rim*.28+scan*.1+uMap*.08);}`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  for (const wall of WORLD.walls) {
    const overlay = new THREE.Mesh(new THREE.ExtrudeGeometry(shape(wall.outline, wall.holes), { depth: LOGO_DEPTH + .08, bevelEnabled: false }), hologram);
    overlay.position.z = -.04; logo.add(overlay);
  }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(78, 3, 13), dark); plinth.position.set(0, -1.5, 0); scene.add(plinth);
  const plinthLight = new THREE.Mesh(new THREE.BoxGeometry(76, .06, 12.8), railMaterial); plinthLight.position.set(0, -.12, 0); scene.add(plinthLight);

  const gridMaterial = new THREE.ShaderMaterial({
    uniforms:{uTime:time}, vertexShader:vertex,
    fragmentShader:`varying vec3 vWorld;uniform float uTime;
    float grid(vec2 p,float spacing){vec2 q=p/spacing;vec2 g=abs(fract(q-.5)-.5)/max(fwidth(q),vec2(.0001));return 1.-min(min(g.x,g.y),1.);}
    void main(){float r=length(vWorld.xz);float fade=1.-smoothstep(30.,115.,r);
    float line=grid(vWorld.xz,3.)*.17+grid(vWorld.xz,15.)*.25;
    float wave=pow(max(0.,1.-abs(r-mod(uTime*5.,110.))/2.),3.)*.2;
    gl_FragColor=vec4(vec3(.42,.92,.64)*(line+wave),fade*.6);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(280,280),gridMaterial); grid.rotation.x=-Math.PI/2; grid.position.y=-3; scene.add(grid);
  const dais = new THREE.Group(); scene.add(dais);
  for (const [radius,y,opacity] of [[39,-2.65,.5],[40,-2.65,.18],[45,-2.7,.25],[46,-2.7,.13]]) {
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,4,180),new THREE.MeshBasicMaterial({color:bright(),transparent:true,opacity}));
    ring.rotation.x=Math.PI/2; ring.position.y=y; dais.add(ring);
  }
  const ticks: number[]=[];
  for(let i=0;i<100;i++){const a=i/100*Math.PI*2,r=i%5?44.1:43; ticks.push(Math.sin(a)*r,-2.6,Math.cos(a)*r,Math.sin(a)*44.8,-2.6,Math.cos(a)*44.8);}
  const tickGeometry=new THREE.BufferGeometry();tickGeometry.setAttribute('position',new THREE.Float32BufferAttribute(ticks,3));
  dais.add(new THREE.LineSegments(tickGeometry,dimLine));

  // A double rail with structural sleepers, an underslung spine, and flowing edge lights.
  const divisions = Math.ceil(length * 2);
  const frames=Array.from({length:divisions+1},(_,i)=>sampleTrack(track,length*i/divisions,length));
  const tube=(points:THREE.Vector3[],radius:number)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),divisions,radius,6,false);
  for(const offset of [-.68,.68]) {
    const rail=tube(frames.map(f=>f.point.clone().addScaledVector(f.side,offset)),.06);
    scene.add(new THREE.Mesh(rail,railMaterial));
  }
  scene.add(new THREE.Mesh(tube(frames.map(f=>f.point.clone().addScaledVector(f.up,-.32)),.16),dark));
  const flowMaterial=new THREE.ShaderMaterial({uniforms:{uTime:time},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime;varying vec2 vUv;void main(){float pulse=pow(.5+.5*sin(vUv.x*190.-uTime*5.),18.);gl_FragColor=vec4(vec3(.55,1.,.73)*(.22+pulse*3.),.35+pulse*.65);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
  });
  for(const offset of [-1.05,1.05]) scene.add(new THREE.Mesh(tube(frames.map(f=>f.point.clone().addScaledVector(f.side,offset).addScaledVector(f.up,-.15)),.045),flowMaterial));
  const dummy=new THREE.Object3D(), basis=new THREE.Matrix4();
  const count=Math.ceil(length/.85);
  const sleepers=new THREE.InstancedMesh(new THREE.BoxGeometry(2.05,.12,.19),dark,count);
  const supportFrames = Array.from({ length: Math.ceil(length / 28) }, (_, i) => sampleTrack(track, i / Math.ceil(length / 28) * length)).filter(f => Math.abs(f.point.z) > 14 && f.point.y < 85);
  const supports=new THREE.InstancedMesh(new THREE.CylinderGeometry(.19,.34,1,8),dark,supportFrames.length * 2);
  for(let i=0;i<count;i++) {
    const f=sampleTrack(track,i/(count-1)*length,length);
    dummy.position.copy(f.point).addScaledVector(f.up,-.09);
    basis.makeBasis(f.side,f.up,f.tangent.clone().negate());dummy.quaternion.setFromRotationMatrix(basis);dummy.scale.set(1,1,1);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix);
  }
  supportFrames.forEach((f,i) => { for (const [j,side] of [-1,1].entries()) {
    const h=f.point.y+2.5;
    dummy.position.copy(f.point).addScaledVector(f.side,side*1.45);dummy.position.y=h/2-2.7;dummy.quaternion.identity();dummy.scale.set(1,h,1);dummy.updateMatrix();supports.setMatrixAt(i*2+j,dummy.matrix);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(3.3,.25,.32),dark);
    brace.position.copy(f.point).addScaledVector(f.up,-.46);basis.makeBasis(f.side,f.up,f.tangent.clone().negate());brace.quaternion.setFromRotationMatrix(basis);scene.add(brace);
  }});
  sleepers.computeBoundingSphere();supports.computeBoundingSphere();scene.add(sleepers,supports);

  // Repeating light gates create strong near/middle/far parallax at rider height.
  const gates = new THREE.Group(); scene.add(gates);
  for(let distance=22,index=0;distance<length;distance+=58,index++) {
    const check = sampleTrack(track,distance,length);
    if (Math.abs(check.point.z) < 12 || stops.some(stop => Math.abs(stop.distance-distance)<22)) continue;
    const f=sampleTrack(track,distance,length),gate=new THREE.Group();
    gate.position.copy(f.point).addScaledVector(f.up,1.8);
    basis.makeBasis(f.side,f.up,f.tangent.clone().negate());gate.quaternion.setFromRotationMatrix(basis);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(3.65,.04,6,64,Math.PI*1.72),new THREE.MeshBasicMaterial({color:bright(1.25),transparent:true,opacity:.48}));
    ring.rotation.z=index%2?.44:Math.PI+.44;gate.add(ring);
    const housing=new THREE.Mesh(new THREE.TorusGeometry(3.75,.13,6,64,Math.PI*1.72),dark);housing.rotation.z=ring.rotation.z;gate.add(housing);
    gates.add(gate);
  }
  const beacons:THREE.Group[]=[];
  stops.forEach(({distance,name},index)=>{
    const f=sampleTrack(track,distance,length),beacon=new THREE.Group();beacon.position.copy(f.point);
    basis.makeBasis(f.side,f.up,f.tangent.clone().negate());beacon.quaternion.setFromRotationMatrix(basis);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(3.15,.065,6,72),railMaterial);ring.position.set(0,1.8,-8);beacon.add(ring);
    for(const side of [-1,1]) {
      const platform = new THREE.Mesh(new THREE.BoxGeometry(3.1,.4,18),dark);platform.position.set(side*2.95,-.24,0);beacon.add(platform);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(.065,.07,18),railMaterial);edge.position.set(side*1.36,0,0);beacon.add(edge);
      for (const z of [-7,7]) {
        const column=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,4.6,8),dark);column.position.set(side*4.3,2.1,z);beacon.add(column);
        const lamp=new THREE.Mesh(new THREE.BoxGeometry(.055,2.8,.055),railMaterial);lamp.position.set(side*4.17,2.4,z);beacon.add(lamp);
      }
    }
    const roof=new THREE.Mesh(new THREE.BoxGeometry(10,.2,19),dark);roof.position.y=4.5;beacon.add(roof);
    const ceiling=new THREE.Mesh(new THREE.BoxGeometry(1.6,.04,15),new THREE.MeshBasicMaterial({color:bright(.8)}));ceiling.position.y=4.37;beacon.add(ceiling);
    const label=document.createElement('canvas');label.width=768;label.height=192;
    const context=label.getContext('2d');
    if (context) {
      context.fillStyle='#000000';context.fillRect(0,0,768,192);context.strokeStyle='#c3e5c8';context.lineWidth=3;context.strokeRect(4,4,760,184);
      context.fillStyle='#c3e5c8';context.textAlign='center';context.font='22px sans-serif';context.fillText(`STATION ${String(index+1).padStart(2,'0')}  /  ${name.toUpperCase()}`,384,54);
      context.font='34px sans-serif';const title=eventTitles[index] || name;context.fillText(title.length>35?`${title.slice(0,34)}…`:title,384,122);
      const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.6,1.65),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));sign.position.set(0,3.25,-7.8);beacon.add(sign);
    }
    const platformLight=new THREE.PointLight('#c3e5c8',35,15,2);platformLight.position.set(0,3,0);beacon.add(platformLight);
    scene.add(beacon);beacons.push(beacon);
  });

  let seed=8932;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const skyline=new THREE.Group();scene.add(skyline);
  const facade=new THREE.MeshStandardMaterial({color:'#172b20',metalness:.55,roughness:.45});
  const windows:THREE.Matrix4[]=[];
  // Four deliberate city blocks, with podiums, glazed floors, roof caps, and
  // setbacks. The broad central plaza stays clear of both logo and track.
  for (const [districtX,districtZ] of [[-115,-70],[114,-91],[111,78],[-114,88]]) {
    for (let building=0;building<(coarse?3:4);building++) {
      const x=districtX+(building%2?13:-13),z=districtZ+(building>1?17:-17);
      const height=[34,52,43,28][building],width=building%2?12:16,depth=14;
      const block=new THREE.Group();block.position.set(x,-3,z);skyline.add(block);
      const addBox=(w:number,h:number,d:number,y:number,material:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.y=y;block.add(mesh);return mesh;};
      addBox(width+5,3.6,depth+5,1.8,dark);
      addBox(width,height,depth,height/2+3.6,facade);
      addBox(width+.5,.35,depth+.5,height+3.7,dark);
      addBox(width*.64,4,depth*.62,height+5.8,facade);
      addBox(width*.66,.12,depth*.64,height+7.9,railMaterial);
      for(let floor=0;floor<Math.floor(height/3);floor++) {
        const y=6+floor*3;
        addBox(width+.1,.1,depth+.1,y-.9,dark);
        for(let column=0;column<Math.floor(width/2.4);column++) for(const side of [-1,1]) {
          if(random()<.24)continue;
          dummy.position.set(x-width/2+1.3+column*2.4,y-3,z+side*(depth/2+.035));dummy.quaternion.identity();dummy.scale.set(1.05,1.35,1);dummy.updateMatrix();windows.push(dummy.matrix.clone());
        }
        for(let column=0;column<5;column++)for(const side of [-1,1]) {
          if(random()<.3)continue;
          dummy.position.set(x+side*(width/2+.035),y-3,z-depth/2+1.4+column*2.5);dummy.rotation.set(0,Math.PI/2,0);dummy.scale.set(1.05,1.35,1);dummy.updateMatrix();windows.push(dummy.matrix.clone());
        }
      }
    }
  }
  const glazing=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:bright(.68),side:THREE.DoubleSide}),windows.length);
  windows.forEach((matrix,i)=>glazing.setMatrixAt(i,matrix));glazing.computeBoundingSphere();skyline.add(glazing);
  const landscape=new THREE.Group();scene.add(landscape);
  for(let i=0;i<32;i++) {
    const angle=i/32*Math.PI*2,radius=87+(i%3)*4;
    const tree=new THREE.Group();tree.position.set(Math.sin(angle)*radius,-3,Math.cos(angle)*radius);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.17,.25,2.8,6),dark);trunk.position.y=1.4;tree.add(trunk);
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(2.3,1),new THREE.MeshStandardMaterial({color:'#244b33',roughness:.95}));crown.position.y=4; crown.scale.y=1.35;tree.add(crown);landscape.add(tree);
  }

  const particleCount=coarse?850:1800,positions=new Float32Array(particleCount*3),seeds=new Float32Array(particleCount);
  for(let i=0;i<particleCount;i++){const a=random()*Math.PI*2,r=10+random()*130;positions.set([Math.sin(a)*r,random()*125-3,Math.cos(a)*r],i*3);seeds[i]=random();}
  const particlesGeometry=new THREE.BufferGeometry();particlesGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));particlesGeometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  const particleMaterial=new THREE.ShaderMaterial({uniforms:{uTime:time,uPixelRatio:{value:1}},
    vertexShader:`uniform float uTime;uniform float uPixelRatio;attribute float aSeed;varying float vAlpha;
    void main(){vec3 p=position;p.x+=sin(uTime*.12+aSeed*30.)*.7;p.y+=sin(uTime*.2+aSeed*20.)*.9;vec4 mv=modelViewMatrix*vec4(p,1.);vAlpha=(.3+.7*pow(.5+.5*sin(uTime*.8+aSeed*60.),2.))*(1.-smoothstep(20.,120.,-mv.z));gl_PointSize=clamp((1.+aSeed*2.)*uPixelRatio*85./max(4.,-mv.z),1.,14.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;float glow=pow(max(0.,1.-d),2.);gl_FragColor=vec4(vec3(.58,1.,.73)*1.6,glow*vAlpha);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  });
  const particles=new THREE.Points(particlesGeometry,particleMaterial);scene.add(particles);
  const skyMaterial=new THREE.ShaderMaterial({uniforms:{uTime:time},vertexShader:vertex,
    fragmentShader:`varying vec3 vWorld;uniform float uTime;void main(){vec3 n=normalize(vWorld);float horizon=pow(1.-abs(n.y),6.);float ribbons=pow(.5+.5*sin(n.x*5.+n.z*4.+sin(n.y*8.+uTime*.045)),5.)*smoothstep(0.,.8,n.y);gl_FragColor=vec4(vec3(.008,.025,.019)+vec3(.016,.05,.033)*horizon+vec3(.013,.038,.025)*ribbons,1.);}`,
    side:THREE.BackSide,depthWrite:false,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(270,32,20),skyMaterial));

  const cart=new THREE.Group();scene.add(cart);
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.36,.3,1.7),dark);body.position.set(0,.14,-.2);cart.add(body);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(1.36,.36,.35),dark);nose.position.set(0,.45,-1.42);cart.add(nose);
  const safetyBar=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1.32,12),dark);safetyBar.rotation.z=Math.PI/2;safetyBar.position.set(0,.86,-1.15);cart.add(safetyBar);
  const barGlow=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.16,8),railMaterial);barGlow.rotation.z=Math.PI/2;barGlow.position.set(0,.88,-1.17);cart.add(barGlow);
  for(const x of [-.61,.61]){const upright=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.7,8),dark);upright.position.set(x,.51,-1.15);cart.add(upright);}
  const lantern=new THREE.PointLight('#b5ffd1',35,15,2);lantern.position.set(0,2,-1.3);cart.add(lantern);

  const player=new THREE.Group();scene.add(player);
  const playerCore=new THREE.Mesh(new THREE.SphereGeometry(.3,12,10),new THREE.MeshBasicMaterial({color:bright(4)}));player.add(playerCore);
  const playerRing=new THREE.Mesh(new THREE.TorusGeometry(.65,.035,5,40),railMaterial);playerRing.rotation.x=Math.PI/2;player.add(playerRing);
  const playerBeam=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2.4,6),railMaterial);playerBeam.position.y=1.2;player.add(playerBeam);
  return {
    cart, player, particleMaterial,
    update(elapsed:number,reduced:boolean,mapBlend:number) {
      time.value=reduced?0:elapsed;map.value=mapBlend;
      skyline.visible=mapBlend<.85;landscape.visible=mapBlend<.85;gates.visible=mapBlend<.85;
      cart.visible=mapBlend<.15;player.visible=mapBlend>.5;
      dimLine.opacity=.26+mapBlend*.24;
      if(!reduced) playerRing.rotation.z=elapsed*.65;
    },
  };
}

