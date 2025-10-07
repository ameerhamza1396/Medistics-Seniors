import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function Ahroid3d() {
    const mountRef = useRef<HTMLDivElement>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef(new THREE.Clock());
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    // state to trigger view changes
    const [view, setView] = useState<"face" | "full" | "side">("full");
    // New state for loading
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff); // white background

        // Camera
        const camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        // Deprecated, but keeping for compatibility if environment hasn't updated:
        // renderer.outputEncoding = THREE.sRGBEncoding; 

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;

        // Initial setup for controls target
        controls.target.set(0, 100, 0);
        controls.update();

        // Lights
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        hemiLight.position.set(0, 200, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(100, 200, 100);
        scene.add(dirLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // White background planes (floor + wall behind)
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(2000, 2000),
            planeMaterial
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        scene.add(floor);

        const backdrop = new THREE.Mesh(
            new THREE.PlaneGeometry(2000, 2000),
            planeMaterial
        );
        // Backdrop positioned and rotated to act as a wall behind the model
        backdrop.position.z = -500;
        backdrop.position.y = 50;
        scene.add(backdrop);

        // FBX Loader
        const loader = new FBXLoader();
        loader.load(
            "/avatar.fbx",
            (object) => {
                object.scale.setScalar(100);
                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                // Center model at origin for better control targeting
                object.position.sub(center);
                scene.add(object);

                if (object.animations && object.animations.length > 0) {
                    const newMixer = new THREE.AnimationMixer(object);
                    newMixer.clipAction(object.animations[0]).play();
                    mixerRef.current = newMixer;
                }

                // Set loading to false once model is loaded
                setLoading(false);
            },
            // Progress callback removed to shorten code (as per request 1)
            undefined,
            // Error callback removed to shorten code (as per request 1)
            undefined
        );

        // Animate
        const animate = () => {
            requestAnimationFrame(animate);
            if (mixerRef.current) {
                mixerRef.current.update(clockRef.current.getDelta());
            }
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        // Cleanup
        return () => {
            window.removeEventListener("resize", handleResize);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Update camera view when "view" changes
    useEffect(() => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        // Camera positions adjusted for better framing/viewing distance
        if (view === "face") {
            // Positioned closer to the face
            camera.position.set(0, 150, 200);
        } else if (view === "full") {
            // Full body view
            camera.position.set(0, 150, 450);
        } else if (view === "side") {
            // Side view, placed to the right side
            camera.position.set(450, 150, 0);
        }

        // Always look at the center of the model's torso area
        controls.target.set(0, 100, 0);
        controls.update();
    }, [view]);

    return (
        <div style={{ width: "100%", height: "100vh", position: "relative" }}>
            {/* Loading Overlay */}
            {loading && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#ffffff", // Match scene background
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 10,
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#333",
                    }}
                >
                    Ahroid is getting ready...
                </div>
            )}

            {/* Three.js Canvas */}
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

            {/* Control Buttons */}
            <div style={{ position: "absolute", top: 20, left: 20, zIndex: 11 }}>
                <button
                    onClick={() => setView("face")}
                    style={{ margin: "5px", padding: "10px", cursor: "pointer" }}
                >
                    Face View
                </button>
                <button
                    onClick={() => setView("full")}
                    style={{ margin: "5px", padding: "10px", cursor: "pointer" }}
                >
                    Full Body
                </button>
                <button
                    onClick={() => setView("side")}
                    style={{ margin: "5px", padding: "10px", cursor: "pointer" }}
                >
                    Side View
                </button>
            </div>
        </div>
    );
}