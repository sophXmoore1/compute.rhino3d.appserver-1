// Import libraries
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'
import { RhinoCompute } from 'https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js'
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/TransformControls.js'

//set up new loader for converting the results to THREEjs
const loader = new Rhino3dmLoader()
loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/')

//Define grasshopper script
const definition = 'RozvanyDraw.gh'

//Initialize Variables
const mouse = new THREE.Vector3()

// set up download button click handlers
const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download

// event listeners
const addBoundary = document.getElementById('border')
addBoundary.addEventListener('click', AddBoundary)

const addPoints = document.getElementById('column')
addPoints.addEventListener('click', AddPoints)

const addArc = document.getElementById('arc')
addArc.addEventListener('click', AddArc)

const addLine = document.getElementById('line')
addLine.addEventListener('click', AddLine)

//Intialize data objecys
let data = {}
data.definition = definition
data.inputs = {
  'boundaryPoints': [],
  'intPoints': [],
  'intLine': [],
  'arcPoints': []
}

//load the rhino3dm library
let rhino, doc
rhino3dm().then(async m => {
  console.log('Loaded rhino3dm.')
  rhino = m // global

  init()
})

//Enables element addition
function AddBoundary() {
  window.addEventListener('click', onClick, false);
  let pt = "{\"X\":"+mouse.x+",\"Y\":"+mouse.y+",\"Z\":"+mouse.z+"}"
  data.inputs['boundaryPoints'].push(pt)
  
}

function AddPoints() {
}

function AddArc() {
}

function AddLine() {
}

//Click Events

function onClick(event){
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1
  mouse.unproject(camera)

  const icoGeo = new THREE.IcosahedronGeometry(5)
  const icoMat = new THREE.MeshNormalMaterial()
  const ico = new THREE.Mesh( icoGeo, icoMat )
  ico.name = 'ico'
  ico.position.set( mouse.x, mouse.y, 0)
  scene.add( ico )

  console.log( `${mouse.x},${mouse.y},${mouse.z}` )

  let tcontrols = new TransformControls(camera, renderer.domElement)
  tcontrols.enabled = true
  tcontrols.attach(ico)
  tcontrols.showZ = false
  scene.add(tcontrols)
  return mouse
}

//Call appserver
async function compute() {

  let t0 = performance.now()
  const timeComputeStart = t0

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

  // go through the objects in the Rhino document
  let objects = doc.objects();
  for (let i = 0; i < objects.count; i++) {
    const rhinoObject = objects.get(i);

    // asign geometry userstrings to object attributes
    if (rhinoObject.geometry().userStringCount > 0) {
      const g_userStrings = rhinoObject.geometry().getUserStrings()
      rhinoObject.attributes().setUserString(g_userStrings[0][0], g_userStrings[0][1])
    }
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

    // add object graph from rhino model to three.js scene
    scene.add(object)

    // hide spinner and enable download button
    showSpinner(false)
    //downloadButton.disabled = false

  })
}


// BOILERPLATE //

let scene, camera, renderer, controls, container;

function init() {

  // Rhino models are z-up, so set this as the default
  //THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );

  container = document.getElementById('geomContainer');
  let container2 = document.getElementById('container');

  var contWidth = (container.offsetWidth)-250;
  var contHeight = container2.offsetHeight;
  console.log(contWidth)
  console.log(contHeight)

  // create a scene and a camera
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x3d3e40);
  const frustumSize = 1000
  const aspect = contWidth / contHeight;
  camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1, 1 );
  camera.position.z = 0

  // create the renderer and add it to the html

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(contWidth, contHeight);
  container.appendChild(renderer.domElement);


  // add some controls to orbit the camera
  controls = new OrbitControls(camera, renderer.domElement)

  // add a directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff)
  directionalLight.intensity = 2
  scene.add(directionalLight)

  const ambientLight = new THREE.AmbientLight()
  scene.add(ambientLight)

  window.addEventListener('resize', onWindowResize, false);

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

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

}

function showSpinner(enable) {
  if (enable)
    document.getElementById('loader').style.display = 'block'
  else
    document.getElementById('loader').style.display = 'none'
}