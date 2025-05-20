document.addEventListener('DOMContentLoaded', () => {
    // Create a Three.js scene for the network visualization
    const container = document.getElementById('canvas-container');
    
    // Initialize the renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    // Create scene
    const scene = new THREE.Scene();
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 100;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0x00c8ff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    // Create a group to hold all network elements
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);
    
    // Create nodes and connections
    const nodeCount = 40;
    const nodes = [];
    const nodePositions = [];
    const connections = [];
    const nodeGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const nodeMaterial = new THREE.MeshPhongMaterial({ color: 0x00c8ff });
    
    // Generate random positions for nodes
    for (let i = 0; i < nodeCount; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 60;
        const z = (Math.random() - 0.5) * 50;
        
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        node.position.set(x, y, z);
        nodes.push(node);
        nodePositions.push(new THREE.Vector3(x, y, z));
        networkGroup.add(node);
    }
    
    // Create connections between nodes
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x36a3da,
        transparent: true,
        opacity: 0.6
    });
    
    // Connect each node to 2-4 other nodes
    for (let i = 0; i < nodeCount; i++) {
        const connectionsCount = Math.floor(Math.random() * 3) + 2; // 2-4 connections
        
        for (let j = 0; j < connectionsCount; j++) {
            const targetIndex = Math.floor(Math.random() * nodeCount);
            if (targetIndex !== i) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    nodes[i].position,
                    nodes[targetIndex].position
                ]);
                const line = new THREE.Line(geometry, lineMaterial);
                connections.push({
                    line: line,
                    startIndex: i,
                    endIndex: targetIndex
                });
                networkGroup.add(line);
            }
        }
    }
    
    // Add animation for connections
    const pulsingMaterials = [];
    for (let i = 0; i < connections.length; i++) {
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: 0x00c8ff,
            transparent: true,
            opacity: 0
        });
        pulsingMaterials.push(pulseMaterial);
        
        const start = nodes[connections[i].startIndex].position;
        const end = nodes[connections[i].endIndex].position;
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const distance = start.distanceTo(end);
        
        const pulseGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulse.position.copy(start);
        pulse.userData.direction = direction;
        pulse.userData.distance = distance;
        pulse.userData.progress = 0;
        pulse.userData.speed = 0.01 + Math.random() * 0.02;
        pulse.userData.active = Math.random() > 0.7; // 30% of connections have active pulses
        networkGroup.add(pulse);
        
        connections[i].pulse = pulse;
    }
    
    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -((event.clientY / window.innerHeight) * 2 - 1);
        
        targetRotationX = mouseY * 0.3;
        targetRotationY = mouseX * 0.3;
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Smooth rotation based on mouse position
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        
        networkGroup.rotation.x = currentRotationX;
        networkGroup.rotation.y = currentRotationY;
        
        // Animate connections
        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            const pulse = connection.pulse;
            
            if (pulse.userData.active) {
                pulse.userData.progress += pulse.userData.speed;
                
                if (pulse.userData.progress > 1) {
                    pulse.userData.progress = 0;
                    pulse.userData.active = Math.random() > 0.5; // 50% chance to reactivate
                }
                
                pulse.position.copy(nodes[connection.startIndex].position);
                pulse.position.lerp(nodes[connection.endIndex].position, pulse.userData.progress);
                
                // Fade in at start, fade out at end
                if (pulse.userData.progress < 0.2) {
                    pulsingMaterials[i].opacity = pulse.userData.progress * 5;
                } else if (pulse.userData.progress > 0.8) {
                    pulsingMaterials[i].opacity = (1 - pulse.userData.progress) * 5;
                } else {
                    pulsingMaterials[i].opacity = 1;
                }
            } else {
                pulsingMaterials[i].opacity = 0;
                if (Math.random() > 0.99) { // Small chance to activate
                    pulse.userData.active = true;
                }
            }
        }
        
        // Update connection lines (they may need to be redrawn if nodes move)
        for (let i = 0; i < connections.length; i++) {
            const startPos = nodes[connections[i].startIndex].position;
            const endPos = nodes[connections[i].endIndex].position;
            const positions = connections[i].line.geometry.attributes.position.array;
            
            positions[0] = startPos.x;
            positions[1] = startPos.y;
            positions[2] = startPos.z;
            positions[3] = endPos.x;
            positions[4] = endPos.y;
            positions[5] = endPos.z;
            
            connections[i].line.geometry.attributes.position.needsUpdate = true;
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
});
