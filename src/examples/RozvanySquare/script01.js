// Import libraries
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'
import { RhinoCompute } from 'https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js'

//set up new loader for converting the results to THREEjs
const loader = new Rhino3dmLoader()
loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/')

//Define grasshopper script
const definition = 'RozvanyCompute.gh'

// set up download button click handlers
const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download

//initialize fixity values
var bottomVal = 0;
var rightVal = 0;
var topVal = 0;
var leftVal = 0;

//Materials
var lineWidth = 1;
const materialGreen = new THREE.LineBasicMaterial({
  color: 0x2c205,
  linewidth: lineWidth,
});
const materialPink = new THREE.LineBasicMaterial({
  color: 0xeb34db,
  linewidth: lineWidth,
});
const materialOrange = new THREE.LineBasicMaterial({
  color: 0xeb9834,
  linewidth: lineWidth,
});
const materialYellow = new THREE.LineBasicMaterial({
  color: 0xf0e91a,
  linewidth: lineWidth,
});
const materialBlue = new THREE.LineBasicMaterial({
  color: 0x0915b5,
  linewidth: lineWidth,
});
const materialTeal = new THREE.LineBasicMaterial({
  color: 0x16dbd8,
  linewidth: lineWidth,
});
const materialLightGray = new THREE.LineBasicMaterial({
  color: 0xcfcfcf,
  linewidth: lineWidth,
});
const materialGray = new THREE.LineBasicMaterial({
  color: 0x333333,
  linewidth: lineWidth,
});


// Set up sliders and event listeners
const xdim_slider = document.getElementById('X_Dim')
xdim_slider.addEventListener('mouseup', onSliderChange, false)
xdim_slider.addEventListener('touchend', onSliderChange, false)

const ydim_slider = document.getElementById('Y_Dim')
ydim_slider.addEventListener('mouseup', onSliderChange, false)
ydim_slider.addEventListener('touchend', onSliderChange, false)

const spacing_slider = document.getElementById('spacing')
spacing_slider.addEventListener('mouseup', onSliderChange, false)
spacing_slider.addEventListener('touchend', onSliderChange, false)

const botFree = document.getElementById('botFree');
botFree.addEventListener('click', radioClick);
const botPin = document.getElementById('botPin');
botPin.addEventListener('click', radioClick);
const botFix = document.getElementById('botFixed');
botFix.addEventListener('click', radioClick);

const rightFree = document.getElementById('rightFree');
rightFree.addEventListener('click', radioClick);
const rightPin = document.getElementById('rightPin');
rightPin.addEventListener('click', radioClick);
const rightFix = document.getElementById('rightFixed');
rightFix.addEventListener('click', radioClick);

const topFree = document.getElementById('topFree');
topFree.addEventListener('click', radioClick);
const topPin = document.getElementById('topPin');
topPin.addEventListener('click', radioClick);
const topFix = document.getElementById('topFixed');
topFix.addEventListener('click', radioClick);

const leftFree = document.getElementById('leftFree');
leftFree.addEventListener('click', radioClick);
const leftPin = document.getElementById('leftPin');
leftPin.addEventListener('click', radioClick);
const leftFix = document.getElementById('leftFixed');
leftFix.addEventListener('click', radioClick);


//load the rhino3dm library
let rhino, doc
rhino3dm().then(async m => {
  console.log('Loaded rhino3dm.')
  rhino = m // global

  init()
  compute()
})

//function sets fixity values on click and recomputes if stable
function radioClick() {

  document.getElementById('errorMessage').textContent = '';

  const bottomButtons = document.querySelectorAll('input[name="radioBottom"]');
  for (const bottomButton of bottomButtons) {
    if (bottomButton.checked) {
      bottomVal = bottomButton.value;
    }
  }

  const rightButtons = document.querySelectorAll('input[name="radioRight"]');
  for (var rightButton of rightButtons) {
    if (rightButton.checked) {
      rightVal = rightButton.value;
    }
    else { continue }
  }

  const topButtons = document.querySelectorAll('input[name="radioTop"]');
  for (var topButton of topButtons) {
    if (topButton.checked) {
      topVal = topButton.value;
    }
    else { continue }
  }

  const leftButtons = document.querySelectorAll('input[name="radioLeft"]');
  for (var leftButton of leftButtons) {
    if (leftButton.checked) {
      leftVal = leftButton.value;
    }
    else { continue }
  }

  //Check is unstable condition has been input
  const fixitySum = Number(bottomVal) + Number(topVal) + Number(rightVal) + Number(leftVal);
  console.log(fixitySum);
  if (fixitySum < -2) {
    document.getElementById('errorMessage').textContent = 'UNSTABLE!';
    return;
  }

  // show spinner
  document.getElementById('loader').style.display = 'block'

  compute();
}

//slider change
function onSliderChange() {
  // show spinner
  document.getElementById('loader').style.display = 'block'
  compute()
}

//Call appserver
async function compute() {

  let t0 = performance.now()
  const timeComputeStart = t0

  //collect data from inputs
  let data = {}
  data.definition = definition
  data.inputs = {
    'xDim': xdim_slider.valueAsNumber,
    'yDim': ydim_slider.valueAsNumber,
    'spacing': spacing_slider.valueAsNumber,
    'bottomFix': parseInt(bottomVal),
    'rightFix': parseInt(rightVal),
    'topFix': parseInt(topVal),
    'leftFix': parseInt(leftVal)
  }

  console.log(data.inputs)

  const request = {
    'method': 'POST',
    'body': JSON.stringify(data),
    'headers': { 'Content-Type': 'application/json' }
  }
  console.log(request)

  try {
    const response = await fetch('/solve', request)
    console.log(response)

    if (!response.ok) {
      throw new Error(response.statusText)
    }

    const responseJson = await response.json()

    collectResults(responseJson)

  } catch (error) {
    console.error(error)
  }
}

function decodeItem(item) {
  const data = JSON.parse(item.data)
  if (item.type === 'System.String') {
    // hack for draco meshes
    try {
      return rhino.DracoCompression.decompressBase64String(data)
    } catch { } // ignore errors (maybe the string was just a string...)
  } else if (typeof data === 'object') {
    return rhino.CommonObject.decode(data)
  }
  return null
}

function collectResults(responseJson) {
  const values = responseJson.values

  console.log(values)

  // clear doc
  try {
    if (doc !== undefined)
      doc.delete()
  } catch { }

  //console.log(values)
  doc = new rhino.File3dm()

  // for each output (RH_OUT:*)...
  for (let i = 0; i < values.length; i++) {
    // ...iterate through data tree structure...
    for (const path in values[i].InnerTree) {
      const branch = values[i].InnerTree[path]
      // ...and for each branch...
      for (let j = 0; j < branch.length; j++) {
        // ...load rhino geometry into doc
        const rhinoObject = decodeItem(branch[j])
        if (rhinoObject !== null) {
          // console.log(rhinoObject)
          doc.objects().add(rhinoObject, null)
        }
      }
    }
  }

  if (doc.objects().count < 1) {
    console.error('No rhino objects to load!')
    showSpinner(false)
    return
  }

  // load rhino doc into three.js scene
  const buffer = new Uint8Array(doc.toByteArray()).buffer
  loader.parse(buffer, function (object) {

    // clear objects from scene
    scene.traverse(child => {
      if (!child.isLight) {
          scene.remove(child)
      }
  })

    /*object.traverse(function (child) {
      if (child.isLine) {
        console.log(child)
        if (child.userData.attributes.geometry.userStringCount > 0) {
          var name = child.userData.attributes.userStrings[0][1];
          console.log(name);
          if (name == "positive") { child.material = materialLightGray; }
          if (name == "negative") { child.material = materialLightGray; }
          if (name == "junction") { child.material = materialPink; }
          if (name == "edge") { child.material = materialOrange; }
          if (name == "internal") { child.material = materialYellow; }
          if (name == "free") { child.material = materialGreen; }
          if (name == "pinned") { child.material = materialTeal; }
          if (name == "fixed") { child.material = materialBlue; }

        }
      }
    })*/
    scene.add(object)
    // hide spinner
    document.getElementById('loader').style.display = 'none'

  })
}

// add object graph from rhino model to three.js scene
//scene.add( object )

// hide spinner and enable download button
//showSpinner(false)
//downloadButton.disabled = false



// BOILERPLATE //

let scene, camera, renderer, controls, container;

function init() {

  // Rhino models are z-up, so set this as the default
  //THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );

  // create a scene and a camera
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x3d3e40);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500)
  camera.position.z = 15;

  // create the renderer and add it to the html

  container = document.getElementById('geomContainer');

  var contWidth = container.offsetWidth;
  var contHeight = container.offsetHeight;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);


  // add some controls to orbit the camera
  //controls = new OrbitControls(camera, renderer.domElement)

  // add a directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff)
  directionalLight.intensity = 2
  scene.add(directionalLight)

  const ambientLight = new THREE.AmbientLight()
  scene.add(ambientLight)

  animate()
}

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

// download button handler
function download() {
  let buffer = doc.toByteArray()
  let blob = new Blob([buffer], { type: "application/octect-stream" })
  let link = document.createElement('a')
  link.href = window.URL.createObjectURL(blob)
  link.download = 'RozvanyLayout.3dm'
  link.click()
}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

}

function meshToThreejs(mesh, material) {
  const loader = new THREE.BufferGeometryLoader()
  const geometry = loader.parse(mesh.toThreejsJSON())
  return new THREE.Mesh(geometry, material)
}

function showSpinner(enable) {
  if (enable)
    document.getElementById('loader').style.display = 'block'
  else
    document.getElementById('loader').style.display = 'none'
}