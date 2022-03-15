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
const definition = 'RozvanyUpload.gh'

//initialize data objects to be used by compute
let data = {}
data.definition = definition
data.inputs = {
  boundary: [],
  points: [],
  lines: []
}

//1. upload rhino file
//2. check if file has been uploaded
//3. extract elements
//4. rhino compute

// set up listener events
const downloadButton = document.getElementById("download")
downloadButton.onclick = download

// register event listener for file input
document.getElementById('upload')
  .addEventListener('change', readSingleFile, false);

//load the rhino3dm library
let rhino, doc
rhino3dm().then(async m => {
  console.log('Loaded rhino3dm.')
  rhino = m // global

  init()
  //compute()
})

async function readSingleFile(e) {
  // get file
  var file = e.target.files[0]
  if (!file) {
    document.getElementById('errorMessage').innerText = 'Something went wrong...'
    return
  }

  // try to open 3dm file
  const buffer = await file.arrayBuffer()
  const uploadDoc = rhino.File3dm.fromByteArray(new Uint8Array(buffer))

  if (uploadDoc === null) {
    document.getElementById('msg').innerText = 'Must be a .3dm file!'
    return
  }

  var elementAddCount = 0
  // get geometry from file
  const objs = uploadDoc.objects()
  console.log(objs.count)
  for (let i = 0; i < objs.count; i++) {
    const geom = objs.get(i).geometry()
    console.log(geom)
    // filter for geometry of a specific type
    if (geom instanceof rhino.LineCurve) {
      data.inputs['lines'].push(JSON.stringify(geom.encode()))
      elementAddCount++
    }
    if (geom instanceof rhino.Point){
      //data.inputs['points'].push(JSON.stringify(geom))
      let pt01 = '{\"X\":'+geom.pointAtStart[0]+', \"Y\":'+geom.pointAtStart[1]+', \"Z\": '+geom.pointAtStart[2]+'}'
      data.inputs['points'].push(pt01)
      let pt02 = '{\"X\":'+geom.pointAtEnd[0]+', \"Y\":'+geom.pointAtEnd[1]+', \"Z\": '+geom.pointAtEnd[2]+'}'
      data.inputs['points'].push(pt02)
      elementAddCount++
    }
    if (geom instanceof rhino.PolylineCurve){
      data.inputs['boundary'].push(JSON.stringify(geom.encode()))
      elementAddCount++
    }
  }
  console.log(data.inputs['lines'])
  console.log(data.inputs)

  //test if rhino elements were added
  if (elementAddCount != objs.count){
    console.log("not all rhino elements were read")
    console.log(elementAddCount)
  }
  else {
    console.log('all elements read')
  }

  console.log(data.inputs)
  // solve!
  compute()
}


//Call appserver
async function compute() {

  let t0 = performance.now()
  const timeComputeStart = t0

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

  // create a scene and a camera
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x3d3e40);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500)
  camera.position.z = 15;

  // create the renderer and add it to the html

  container = document.getElementById('geomContainer');

  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('canvas')
  });
  renderer.setSize(window.innerWidth, window.innerHeight);


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
  downloadClicked = 1;
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

function showSpinner(enable) {
  if (enable)
    document.getElementById('loader').style.display = 'block'
  else
    document.getElementById('loader').style.display = 'none'
}