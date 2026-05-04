import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('caduceusCanvas', { static: false }) caduceusHost?: ElementRef<HTMLDivElement>;

  email = '';
  password = '';
  showPassword = false;
  rememberMe = false;
  loading = false;
  errorMessage = '';
  loginMode: 'admin' | 'pharmacien' = 'admin';

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private model?: THREE.Object3D;
  private rafId?: number;
  private resizeObserver?: ResizeObserver;
  private startTime = 0;
  private revealStart = 0;
  private revealUniform = { value: 0 };
  private readonly revealDuration = 2.6;

  constructor(
    private auth: AuthService,
    private router: Router,
    private zone: NgZone,
  ) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.isPharmacien() ? '/ph/dashboard' : '/dashboard']);
    }
  }

  ngAfterViewInit(): void {
    if (!this.caduceusHost) return;
    this.zone.runOutsideAngular(() => this.initThree(this.caduceusHost!.nativeElement));
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.scene?.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose?.());
        else mat?.dispose?.();
      }
    });
  }

  private initThree(host: HTMLElement): void {
    const width = host.clientWidth || 260;
    const height = host.clientHeight || 380;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 22);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    // Lighting tuned for the gold/blue panel
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const keyLight = new THREE.DirectionalLight(0xfff1c8, 1.6);
    keyLight.position.set(4, 6, 6);
    const rimLight = new THREE.DirectionalLight(0x4ec5ff, 1.0);
    rimLight.position.set(-5, 2, -3);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(0, -4, 4);
    scene.add(ambient, keyLight, rimLight, fillLight);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    const loader = new GLTFLoader();
    loader.load('assets/3dmodel/scene.gltf', (gltf) => {
      const root = gltf.scene;

      // Gold PBR material with a noise-dissolve reveal patch
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xe8c97a,
        metalness: 0.85,
        roughness: 0.32,
      });
      this.patchDissolveShader(goldMat);

      root.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.material = goldMat;
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });

      // The Sketchfab matrix on the GLTF root mis-orients this OBJ:
      // the model's long axis ends up along world Z (lying flat). Rotate
      // -90deg on X to stand it upright along world Y.
      root.rotation.x = -Math.PI / 2;
      root.updateMatrixWorld(true);

      // Compute bbox AFTER orientation fix, then center within a pivot Group
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const pivot = new THREE.Group();
      pivot.add(root);
      root.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const targetHeight = 14;
      pivot.scale.setScalar(targetHeight / maxDim);

      this.model = pivot;
      scene.add(pivot);

      // Kick off the materialize-in animation
      this.revealStart = performance.now();
    });

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    this.resizeObserver.observe(host);

    this.startTime = performance.now();
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      const t = (performance.now() - this.startTime) / 1000;
      if (this.model) {
        // Float (vertical bob)
        this.model.position.y = Math.sin(t * 1.2) * 0.45;
      }
      // Materialize-in: drive uReveal from 0 -> 1.06 with ease-out cubic
      if (this.revealStart && this.revealUniform.value < 1.06) {
        const e = (performance.now() - this.revealStart) / 1000 / this.revealDuration;
        const k = Math.min(1, Math.max(0, e));
        const eased = 1 - Math.pow(1 - k, 3);
        this.revealUniform.value = eased * 1.06;
      }
      renderer.render(scene, camera);
    };
    tick();
  }

  /** Inject a noise-based dissolve into the standard material's shader. */
  private patchDissolveShader(mat: THREE.MeshStandardMaterial): void {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms['uReveal'] = this.revealUniform;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vObjPos;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
vObjPos = position;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vObjPos;
uniform float uReveal;
float hash13(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}`
        )
        .replace(
          'void main() {',
          `void main() {
  float dissolveN = vnoise(vObjPos * 0.45);
  if (dissolveN > uReveal) discard;`
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
{
  // edge = 1 right at the dissolve front, 0 deep inside
  float edge = smoothstep(uReveal - 0.08, uReveal, dissolveN);
  // fade out the glow once the materialize animation completes
  float glowFade = 1.0 - smoothstep(0.95, 1.05, uReveal);
  edge *= glowFade;
  vec3 edgeColor = vec3(1.0, 0.78, 0.32) * 2.4;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, edgeColor, edge * 0.85);
}`
        );
    };
    mat.needsUpdate = true;
  }

  onLogin(): void {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    this.loading = true;

    if (this.loginMode === 'pharmacien') {
      this.auth.loginPharmacien(this.email, this.password).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/ph/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 401 || err.status === 403) {
            this.errorMessage = err.error?.error ?? 'Identifiants invalides ou accès refusé.';
          } else {
            this.errorMessage = 'Erreur serveur. Veuillez réessayer.';
          }
        }
      });
    } else {
      this.auth.login(this.email, this.password).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 401 || err.status === 403) {
            this.errorMessage = err.error?.error ?? 'Identifiants invalides ou accès refusé.';
          } else {
            this.errorMessage = 'Erreur serveur. Veuillez réessayer.';
          }
        }
      });
    }
  }

  fillDemo(): void {
    this.email = 'admin@pharix.tn';
    this.password = 'admin123';
    this.loginMode = 'admin';
  }
}
