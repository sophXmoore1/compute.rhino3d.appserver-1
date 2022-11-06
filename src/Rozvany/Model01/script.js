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
const definition = 'DiffEngine_v3.gh'

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

////Button Appearance Features////////

///////////////////////////

// Set up sliders and event listeners
const startSlider = document.getElementById('startPeriod')
startSlider.addEventListener('mouseup', onSliderChange, false)
startSlider.addEventListener('touchend', onSliderChange, false)

const endSlider = document.getElementById('endPeriod')
endSlider.addEventListener('mouseup', onSliderChange, false)
endSlider.addEventListener('touchend', onSliderChange, false)

const categorySelect = document.getElementById('category')
categorySelect.addEventListener("change", onCategoryChange)


//load the rhino3dm library
let rhino, doc
rhino3dm().then(async m => {
  console.log('Loaded rhino3dm.')
  rhino = m // global

  init()
  compute()
})

//slider change
function onSliderChange() {
  compute()
}

//select change
var categoryNumber = 4
function onCategoryChange(){
    var category = document.getElementById("category").value
    if (category == "Structural Framing"){
      categoryNumber = 0
    }
    else if (category == "Columns"){
      categoryNumber = 1
    }
    else if (category == "Floors"){
      categoryNumber = 2
    }
    else if (category == "Walls"){
      categoryNumber = 3
    }
    else{
      categoryNumber = 4
    }
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
    'startPeriod': startSlider.valueAsNumber,
    'endPeriod': endSlider.valueAsNumber,
    'category': parseInt(categoryNumber),
  }
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
    console.log(responseJson)

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

    console.log(scene)
    scene.add(object)

  })
}


// BOILERPLATE //

let scene, chart1camera, chart2camera, modelcamera, modelRenderer, chart1Renderer, chart2Renderer, chart1controls, chart2controls, modelcontrols, container;

function init() {

  // Rhino models are z-up, so set this as the default
  THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 1, 0 );

  // create a scene and a camera
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff);

  // create the renderer and add it to the html

  const ModelCanvas = document.getElementById('leftGrid')
  modelRenderer = new THREE.WebGLRenderer()
  modelRenderer.setSize(ModelCanvas.offsetWidth, ModelCanvas.offsetHeight);
  ModelCanvas.appendChild(modelRenderer.domElement)

  const chart1 = document.getElementById('top')
  chart1Renderer = new THREE.WebGLRenderer()
  chart1Renderer.setSize(chart1.offsetWidth, chart1.offsetHeight);
  chart1.appendChild(chart1Renderer.domElement)

  const chart2 = document.getElementById('bottom')
  chart2Renderer = new THREE.WebGLRenderer()
  chart2Renderer.setSize(chart2.offsetWidth, chart2.offsetHeight);
  chart2.appendChild(chart2Renderer.domElement)

  //camera
  const frustumSize = 20
  const aspect = window.innerWidth / window.innerHeight;
  const modelaspect = ModelCanvas.offsetWidth/ModelCanvas.offsetHeight
  const chart1aspect = chart1.offsetWidth/chart1.offsetHeight
  const chart2aspect = chart2.offsetWidth/chart2.offsetHeight
  chart1camera = new THREE.OrthographicCamera(frustumSize * chart1aspect / - 2, frustumSize * chart1aspect / 2, frustumSize / 2, frustumSize / - 2, -1, 1);
  modelcamera = new THREE.PerspectiveCamera(75, modelaspect, 1, 1000)
  modelcamera.up = new THREE.Vector3(0,0,1);
  modelcamera.position.set(500, -300 , 100)
  modelcamera.lookAt(200, -200, 0) 
  chart2camera = new THREE.OrthographicCamera(frustumSize * chart2aspect / - 2, frustumSize * chart2aspect / 2, frustumSize / 2, frustumSize / - 2, -1, 1);

  // add some controls to orbit the camera
  chart1controls = new OrbitControls(chart1camera, chart1Renderer.domElement)
  chart2controls = new OrbitControls(chart2camera, chart2Renderer.domElement)
  modelcontrols = new OrbitControls(modelcamera, modelRenderer.domElement)

  // add a directional light
  const ambientLight = new THREE.AmbientLight(0xffffff, 3)
  scene.add(ambientLight)

  animate()
}

function animate() {
  requestAnimationFrame(animate)
  modelRenderer.render(scene, modelcamera)
  chart1Renderer.render(scene, chart1camera)
  chart2Renderer.render(scene, chart2camera)
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

function showSpinner(enable) {
  if (enable)
    document.getElementById('loader').style.display = 'block'
  else
    document.getElementById('loader').style.display = 'none'
}