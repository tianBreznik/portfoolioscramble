import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'dat-gui'
import { Stats } from 'three/examples/js/libs/stats.min.js'
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';
import { WEBGL } from 'three/examples/jsm/WebGL.js'
import gsap from 'gsap'

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { BleachBypassShader } from "three/examples/jsm/shaders/BleachBypassShader.js";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import { SubsurfaceScatteringShader } from "three/examples/jsm/shaders/SubsurfaceScatteringShader.js";
import { UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const HDR = 'sky.hdr';

var objects = [];

let renderer;
let container;
let scene;
let camera;
let controls;
var composer;
var bloomPass;
let lightup;
var nino;
let nino_moving = false;
//const gui = new dat.GUI();
const params = {
    color: 0xffffff,
    transmission: 1,
    opacity: 1,
    metalness: 0,
    roughness: 0,
    ior: 1.52,
    thickness: 0.1,
    specularIntensity: 1,
    specularColor: 0xffffff,
    lightIntensity: 1,
    exposure: 1
  };

  var params_bloom = {
    exposure: 0.3,
    bloomStrength: 1.2,
    bloomThreshold: 0.57,
    bloomRadius: 0.1
};

// gui.add(params_bloom, 'exposure', 0, 3)
// gui.add(params_bloom, 'bloomStrength', 0, 3)
// gui.add(params_bloom, 'bloomThreshold', 0, 1)
// gui.add(params_bloom, 'bloomRadius', 0, 1)

var xOff=0, yOff=0;

const hdrEquirect = new RGBELoader()
  .load( HDR, function () {

    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    hdrEquirect.encoding = THREE.sRGBEncoding;
    
    init();
    //createComposer();
    animate();

  } 
);

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 80000);
    camera.position.x = 5178.324821516374
    camera.position.y = 68.19826638441215
    camera.position.z = -768.2749219407596

    console.log(camera)
    scene = new THREE.Scene();
    var ambient = new THREE.AmbientLight(0x101030);
    scene.add(ambient);

    scene.background = hdrEquirect;
    scene.environment = hdrEquirect;
  
    const material = new THREE.MeshPhysicalMaterial( {
      color: params.color,
      metalness: params.metalness,
      roughness: params.roughness,
      ior: params.ior,
      transmission: params.transmission,
      specularIntensity: params.specularIntensity,
      specularColor: params.specularColor,
      opacity: params.opacity,
      side: THREE.DoubleSide,
    });

    const textureLoader = new THREE.TextureLoader()
    const matcapTextureNew = textureLoader.load('porcelain_matcap.jpg');
    const material_porcelain_matcap = new THREE.MeshMatcapMaterial({matcap: matcapTextureNew});
    material_porcelain_matcap.color.set(0xffffff)

    const material_porcelain_black = new THREE.MeshMatcapMaterial({matcap: matcapTextureNew});
    material_porcelain_black.color.set(0x000000)
    
    // const porcelain_roughness = textureLoader.load('Tiles101_1K_Roughness.jpg')
    // porcelain_roughness.wrapS = THREE.RepeatWrapping;
    // porcelain_roughness.wrapT = THREE.RepeatWrapping;
    // porcelain_roughness.repeat.set(120, 1);
    // const porcelain_ao = textureLoader.load('Tiles101_1K_AmbientOcclusion.jpg')
    // porcelain_ao.wrapS = THREE.RepeatWrapping;
    // porcelain_ao.wrapT = THREE.RepeatWrapping;
    // porcelain_ao.repeat.set(120, 1);
    // const porcelain_displacement = textureLoader.load('Tiles101_1K_Displacement.jpg')
    // porcelain_displacement.wrapS = THREE.RepeatWrapping;
    // porcelain_displacement.wrapT = THREE.RepeatWrapping;
    // porcelain_displacement.repeat.set(120, 1);
    // const porcelain_normalness = textureLoader.load('Tiles101_1K_NormalDX.jpg')
    // porcelain_normalness.wrapS = THREE.RepeatWrapping;
    // porcelain_normalness.wrapT = THREE.RepeatWrapping;
    // porcelain_normalness.repeat.set(120, 1);
    // const porcelain_color = textureLoader.load('Tiles101_1K_Color.jpg')
    // porcelain_color.wrapS = THREE.RepeatWrapping;
    // porcelain_color.wrapT = THREE.RepeatWrapping;
    // porcelain_color.repeat.set(120, 1);

    // const material_porcelain = new THREE.MeshStandardMaterial(
    //     {
    //         roughnessMap: porcelain_roughness,
    //         aoMap: porcelain_ao,
    //         displacementMap: porcelain_displacement,
    //         displacementScale: 0.1,
    //         normalMap: porcelain_normalness,
    //         map: porcelain_color,
        
    //         envMap : hdrEquirect, // important -- especially for metals!
    //     }
    // )


    const imgTexture = new THREE.TextureLoader().load('white.jpg' );
    const thicknessTexture = new THREE.TextureLoader().load( 'texture.png' );
    imgTexture.wrapS = imgTexture.wrapT = THREE.RepeatWrapping;

    const shader = SubsurfaceScatteringShader;
    const uniforms = THREE.UniformsUtils.clone( shader.uniforms );

    uniforms[ 'map' ].value = imgTexture;

    uniforms[ 'diffuse' ].value = new THREE.Vector3( 1.0, 0.2, 0.2 );
    uniforms[ 'shininess' ].value = 500;

    uniforms['thicknessMap' ].value = thicknessTexture;
    uniforms['thicknessColor' ].value = new THREE.Vector3( 0.5, 0.3, 0.0 );
    uniforms['thicknessDistortion' ].value = 0.7;
    uniforms['thicknessAmbient' ].value = 0.1;
    uniforms['thicknessAttenuation' ].value = 4.5;
    uniforms['thicknessPower' ].value = 7.5;
    uniforms['thicknessScale' ].value = 16.0;
    
    const material_skin = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        lights: true
      });
    material_skin.extensions.derivatives = true;

    var manager = new THREE.LoadingManager();
    manager.onProgress = function(item, loaded, total) {
        console.log(item, loaded, total);
    };

    var onProgress = function(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            if (percentComplete < 100) {var downloaded = ('Loading: ' + Math.round(percentComplete, 2) + '%'); 
            }
            else {var downloaded = (" ");
            }
          document.getElementById("Loader").innerHTML = downloaded;
        }
    };

    var onError = function(xhr) {
    };

    var texture = new THREE.Texture();
    var loader = new THREE.ImageLoader(manager);
    loader.load('texture.png', function(image) {
        texture.image = image;
        texture.needsUpdate = true;
    });

    var loader = new OBJLoader(manager);          
    loader.load('samo_dobro_lepse.obj', function(object) {
        object.traverse( function(child) {
            //console.log(child)
                if (child instanceof THREE.Mesh) {
                    if(child.name != ''){
                        if(child.name == 'BezierCurve.001'){
                            child.material = material_porcelain_matcap;
                        }
                        else if(child.name == 'NurbsPath')
                        {
                            child.material = material_skin;
                        }
                        else{
                            child.material = material;
                        }
                    }
                }
        });
        object.position.y = 0;
        object.position.x = 0;
        object.scale.x = 150;
        object.scale.y = 150;
        object.scale.z = 150;
        scene.add( object );                
    }, onProgress, onError);

    // loader.load('ninonew.obj', function(object){
    //     object.traverse(function(child){
    //         console.log(child)
    //         if(child instanceof THREE.Mesh){
    //             child.material = material_porcelain_black
    //             child.name = "goblin"
    //         }
    //     })
    //     object.position.y = 0;
    //     object.position.x = 0;
    //     object.position.z = 0;
    //     object.scale.x = 22;
    //     object.scale.y = 22;
    //     object.scale.z = 22;
    //     nino = object
    //     scene.add(nino)
    // }, onProgress, onError);

    if (WEBGL.isWebGLAvailable())
        renderer = new THREE.WebGLRenderer({ antialias: true });
    else
        renderer = new THREE.CanvasRenderer(); 
    //projector = new THREE.Projector();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.phisicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = params.exposure * 2.7;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(window.innerWidth/2, window.innerHeight);
    container = document.getElementById('ThreeJS');
    container.appendChild(renderer.domElement);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    window.addEventListener('resize', onWindowResize, false);

    var canvas_got = document.getElementsByTagName('canvas');
    console.log(canvas_got);
    xOff = canvas_got.scrollLeft - canvas_got.offsetLeft;
    yOff = canvas_got.scrollTop - canvas_got.offsetTop;

    
    console.log(xOff);

    controls = new OrbitControls(camera, renderer.domElement);
    renderer.setClearColor (0xffffff, 1);

    var light = new THREE.PointLight(0xffffff, 1, 0);
    light.position.set(0, 0, 400);
    // var ambientLight = new THREE.AmbientLight(0x101030);
    scene.add(light);
    var geometry = new THREE.SphereGeometry(64,128, 128);
    // const terrazzo_roughness = textureLoader.load('Terrazzo015_2K_Roughness.jpg')
    // terrazzo_roughness.wrapS = THREE.RepeatWrapping;
    // terrazzo_roughness.wrapT = THREE.RepeatWrapping;
    // terrazzo_roughness.repeat.set(3, 3);
    // const terrazzo_displacement = textureLoader.load('Terrazzo015_2K_Displacement.jpg')
    // terrazzo_displacement.wrapS = THREE.RepeatWrapping;
    // terrazzo_displacement.wrapT = THREE.RepeatWrapping;
    // terrazzo_displacement.repeat.set(3, 3);
    // const terrazzo_normalness = textureLoader.load('Terrazzo015_2K_NormalDX.jpg')
    // terrazzo_normalness.wrapS = THREE.RepeatWrapping;
    // terrazzo_normalness.wrapT = THREE.RepeatWrapping;
    // terrazzo_normalness.repeat.set(3, 3);
    // const terrazzo_color = textureLoader.load('Terrazzo015_2K_Color.jpg')
    // terrazzo_color.wrapS = THREE.RepeatWrapping;
    // terrazzo_color.wrapT = THREE.RepeatWrapping;
    // terrazzo_color.repeat.set(3, 3);
    var spherebasemat = new THREE.MeshBasicMaterial({
        color: '#0000ff'
    }); 
    for (var i = 0; i < 5; i++) {
        var object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            //shading: THREE.FlatShading,
            //roughnessMap: terrazzo_roughness,
            //displacementMap: terrazzo_displacement,
            //displacementScale: 0.5,
            //normalMap: terrazzo_normalness,
            roughnessMap: texture,
            color: 'red'
        }));
        //console.log(object);
        switch (i) {
            case 0:
                camera.add(object);
                    object.userData = {
                        URL:"https://www.youtube.com/watch?v=DeWrneNglJY"
                    };
                object.position.set(1200, 1100, 230); //x, y, z
                var spriteFeatures = makeTextSprite("you want alchemy");
                spriteFeatures.position.set(1200, 1100, 230);
                scene.add( spriteFeatures );
                break;
            case 1:
                object.userData = {
                    URL:"https://www.youtube.com/watch?v=C8VeYWRBBZY&t=3s"
                };
                object.position.set(2450, -1110, 930);
                var spriteContact = makeTextSprite("birds, pt. 1");
                spriteContact.position.set(2450, -1110, 930);
                scene.add( spriteContact );
                break;
            case 2:
                object.userData = {
                    URL:"https://www.youtube.com/watch?v=QcwLiDCENfA"
                };
                object.position.set(1400, -700, -2500);
                var spritesignup = makeTextSprite("slow jam");
                spritesignup.position.set(1400, -700, -2500);
                scene.add( spritesignup );
                break;
            case 3:
                object.userData = {
                    URL:"https://www.youtube.com/watch?v=wjX6OsvrXd4"
                };
                object.position.set(1950, 220, 1200);
                var spriteAbout = makeTextSprite("folding");
                spriteAbout.position.set(1950, 220, 1200);
                scene.add( spriteAbout );
                break;
            case 4:
                object.userData = {
                    URL:"https://www.youtube.com/watch?v=g6DRlyxi8hc"
                };
                object.position.set(1650, -755, -1270);
                var spriteAbout = makeTextSprite("before I let go");
                spriteAbout.position.set(1650, -755, -1270);
                scene.add( spriteAbout );
                break;
        }
        scene.add(object);
        objects.push(object);
    }

    var renderScene = new RenderPass(scene, camera);

    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), params_bloom.bloomStrength, params_bloom.bloomRadius,  params_bloom.bloomThreshold);
    bloomPass.renderToScreen = true;
    // bloomPass.threshold = params.bloomThreshold;
    // bloomPass.strength = params.bloomStrength;
    // bloomPass.radius = params.bloomRadius;

    composer = new EffectComposer( renderer );
    composer.setSize(window.innerWidth,  window.innerHeight);
    composer.addPass( renderScene );
    //composer.addPass( bloomPass );

}

    function onWindowResize() {
            
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
    }

    function onDocumentMouseDown(event) {
        
        event.preventDefault();
        var vector = new THREE.Vector3((event.clientX/ window.innerWidth) * 4 - 3, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
        console.log(vector);
        vector.unproject(camera);
        var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
        var intersects = raycaster.intersectObjects(objects);
        console.log(intersects)
        if (intersects.length > 0) {
            window.open(intersects[0].object.userData.URL,"_target");
            intersects[0].object.material.color = new THREE.Color(0x551abb);
            intersects[0].object.material.needsUpdate = true; 
        } 
      
    }

    function createComposer() {
        renderer.autoClear = false;
      
        const renderModel = new RenderPass(scene, camera);
        const effectBleach = new ShaderPass(BleachBypassShader);
        const effectColor = new ShaderPass(ColorCorrectionShader);
        effectFXAA = new ShaderPass(FXAAShader);
        const gammaCorrection = new ShaderPass(GammaCorrectionShader);
      
        effectFXAA.uniforms["resolution"].value.set(
          1 / window.innerWidth,
          1 / window.innerHeight
        );
      
        effectBleach.uniforms["opacity"].value = 0.2;
        effectColor.uniforms["powRGB"].value.set(1.4, 1.45, 1.45);
        effectColor.uniforms["mulRGB"].value.set(1.1, 1.1, 1.1);
      
        composer = new EffectComposer(renderer);
      
        composer.addPass(renderModel);
        composer.addPass(effectFXAA);
        composer.addPass(effectBleach);
        composer.addPass(effectColor);
        composer.addPass(gammaCorrection);
      }

    function makeTextSprite(message, parameters) {
            
        if (parameters === undefined) parameters = {};
        var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
        var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 32;
        var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 1;
        var borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
        var textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:0, g:0, b:0, a:1.0 };

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.font = fontsize + "px " + fontface;
        var metrics = context.measureText(message);
        var textWidth = metrics.width;

        context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
        context.lineWidth = borderThickness;
        context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
        context.fillText( message, borderThickness, fontsize + borderThickness);

        var texture = new THREE.Texture(canvas) 
        texture.needsUpdate = true;

        var spriteMaterial = new THREE.SpriteMaterial({ map: texture, useScreenCoordinates: false });
        var sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(4 * fontsize, 2 * fontsize, 5 * fontsize);
        return sprite;  
        
    }

    var content;
    var header;
    var el_text;
    var button;
    var clicked = false;
    $(document).ready(function () {
        $(".logo").click(function () {
    
            header = $(this);
            el_text = header.children().find("a")
            button = header.children().find("button")
            //console.log($(this).next().next().next())
            //getting the next element
            // $hwrap = $header.next();
            // $nino = $hwrap.next();
            content = header.next().next()
            // //open up the content needed - toggle the slide- if visible, slide up, if not slidedown.
            content.slideToggle(500, function () {
                //execute this after slideToggle is done
                //change text of header based on visibility of content div
                if(!clicked)
                {
                    button.css("border-bottom-left-radius", "0px")
                    button.css("border-bottom-right-radius", "0px")
                    clicked = true
                }
                else
                {
                    clicked = false
                    button.css("border-bottom-left-radius", "2.5px")
                    button.css("border-bottom-right-radius", "2.5px")
                }
                el_text.text(function () {
                    //change text based on condition
                    return content.is(":visible") ? "'Ello" : "Tian Breznik";
                });
            });
        
        });
      });

    function animate() {

        requestAnimationFrame(animate);
        render();       
        update();
        
    }

    function update() {
        
        controls.update();

    }

    var axis = new THREE.Vector3(0.5,0.5,0);
    var rad = 0.1;
    var increment = 0.001;
    function render() {
        renderer.render(scene, camera);
        composer.render();
    }
            