// Import libraries - use the latest 3dm
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.137.5/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.137.5/examples/jsm/controls/OrbitControls.js";
import rhino3dm from "https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/rhino3dm.module.js";
import { Rhino3dmLoader } from "https://cdn.jsdelivr.net/npm/three@0.137.5/examples/jsm/loaders/3DMLoader.js";

// set up loader for converting the results to threejs
const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/' )

//Event Listeners
const downloadButton = document.getElementById("download")
downloadButton.onclick = download
const spacing_slider = document.getElementById('spacing')
spacing_slider.addEventListener('mouseup', onSliderChange, false)
spacing_slider.addEventListener('touchend', onSliderChange, false)

const freeBoundary = document.getElementById('Frboundary')
freeBoundary.addEventListener('click', AssnBoundType)
const pinnedBoundary = document.getElementById('Piboundary')
pinnedBoundary.addEventListener('click', AssnBoundType)
const fixedBoundary = document.getElementById('Fiboundary')
fixedBoundary.addEventListener('click', AssnBoundType)


// initialise 'data' object that will be used by compute()
const data = {
  definition: 'RozvanyUpload.gh',
  inputs: {
    'lines': [], // start with an empty list (corresponds to "points" input)
    'points': [],  
    'boundary': [],
    'spacing': spacing_slider.valueAsNumber,
    'boundType': 2,
}
}

showSpinner(false)

// globals
let rhino, doc

rhino3dm().then(async m => {
    rhino = m

    init()
    // compute()
})

////Button Appearance Features////////

const boundaryButton = document.getElementById('boundary');
boundaryButton.addEventListener('mouseup', boundContent, false)
const geomButton = document.getElementById('geometry');
geomButton.addEventListener('mouseup', geomContent, false)

var boundaryClicked = 0;
var geomClicked = 0;

function boundContent(e){
  var $content = e.target.nextElementSibling.nextElementSibling.style;
  if (boundaryClicked == 0){
    $content.display = "block"
    boundaryClicked = 1
    return
  }
  if(boundaryClicked == 1){
    $content.display = "none"
    boundaryClicked = 0
    return
  }
}

function geomContent(e){
  var $content = e.target.nextElementSibling.nextElementSibling.style;
  if (geomClicked == 0){
    $content.display = "block"
    geomClicked = 1
    return
  }
  if(geomClicked == 1){
    $content.display = "none"
    geomClicked = 0
    return
  }
}
///////////////////////////

function AssnBoundType(e){
    var $boundType = e.target.id;
    if ($boundType == 'Frboundary'){
        var Type = 0;
    }
    if ($boundType == 'Piboundary'){
        var Type = 1;
    }
    if ($boundType == 'Fiboundary'){
        var Type = 2;

    }
    data.inputs['boundType'] = Type;
    //document.getElementById('boundary').nextElementSibling.nextElementSibling.style.display = "none"
    boundaryClicked = 0

    compute()
}

//Initialize buttons to be disabled
boundaryButton.disabled = true
geomButton.disabled = true
downloadButton.disabled = true

///////////////////////////////////////////////////////////////////////////
function onSliderChange() {
  // show spinner
  document.getElementById('loader').style.display = 'block'
  data.inputs['spacing'] = spacing_slider.valueAsNumber
  compute()
}

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
    document.getElementById('errorMessage').innerText = 'Must be a .3dm file!'
    return
  }

  // get geometry from file
  const objs = uploadDoc.objects()
  const geoLines = []
  const geoPoints = []
  const geoBreps = []

  for (let i = 0; i < objs.count; i++) {
    const geom = objs.get(i).geometry()
    // filter for geometry of a specific type
    if (geom instanceof rhino.Curve) {
        geoLines.push(JSON.stringify(geom.encode()))
    }
    if (geom instanceof rhino.Point) {
        geoPoints.push(JSON.stringify(geom))
    }

    if (geom instanceof rhino.Brep || geom instanceof rhino.Extrusion) {
        geoBreps.push(JSON.stringify(geom))
      }
    
  }
  
  // solve!
  data.inputs.lines = geoLines
  data.inputs.points = geoPoints
  data.inputs.boundary = geoBreps

  console.log(data.inputs)
  
  compute()
}

// register event listener for file input
document.getElementById('upload')
  .addEventListener('change', readSingleFile, false);

// more globals
let scene, camera, renderer, controls

/**
 * Sets up the scene, camera, renderer, lights and controls and starts the animation
 */
function init() {

    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x3d3e40);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
    camera.position.set(1, -1, 1) // like perspective view

    // create the renderer and add it to the html
    //container = document.getElementById('container');
    renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('canvas')
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio( window.devicePixelRatio )
    renderer.setSize(window.innerWidth, window.innerHeight)

    // add some controls to orbit the camera
    controls = new OrbitControls(camera, renderer.domElement)

    // add a directional light
    const directionalLight = new THREE.DirectionalLight( 0xffffff )
    directionalLight.intensity = 2
    scene.add( directionalLight )

    const ambientLight = new THREE.AmbientLight()
    scene.add( ambientLight )

    // handle changes in the window size
    window.addEventListener( 'resize', onWindowResize, false )

    animate()
}

/**
 * Call appserver
 */
async function compute() {
///////////////////////////////////////////////////////////////////////////
  showSpinner(true)

  // use POST request
  const request = {
    'method':'POST',
    'body': JSON.stringify(data),
    'headers': {'Content-Type': 'application/json'}
  }
  console.log(data.inputs)
  
  try {
    const response = await fetch('/solve', request)
///////////////////////////////////////////////////////////////////////////
  
    if(!response.ok) {
      // TODO: check for errors in response json
      throw new Error(response.statusText)
    }

    const responseJson = await response.json()
    collectResults(responseJson)

  } catch(error) {
    console.error(error)
  }
}

/**
 * Parse response
 */
function collectResults(responseJson) {

    const values = responseJson.values
    console.log(values)

    // clear doc
    if( doc !== undefined)
        doc.delete()

    //console.log(values)
    doc = new rhino.File3dm()

    // for each output (RH_OUT:*)...
    for ( let i = 0; i < values.length; i ++ ) {
      // ...iterate through data tree structure...
      for (const path in values[i].InnerTree) {
        const branch = values[i].InnerTree[path]
        // ...and for each branch...
        for( let j = 0; j < branch.length; j ++) {
          // ...load rhino geometry into doc
          const rhinoObject = decodeItem(branch[j])
          if (rhinoObject !== null) {
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

///////////////////////////////////////////////////////////////////////////
    //const countBefore = data.inputs.lines.length
    //const countAfter = doc.objects().count
    //document.getElementById('errorMsg').innerText = `${countBefore} breps become ${countAfter}!`

///////////////////////////////////////////////////////////////////////////

    // load rhino doc into three.js scene
    const buffer = new Uint8Array(doc.toByteArray()).buffer
    loader.parse( buffer, function ( object ) 
    {
///////////////////////////////////////////////////////////////////////////
        object.traverse(child => {
            if (child.isLine) {

                const threeColor = new THREE.Color("white");
                const mat = new THREE.LineBasicMaterial({ color: threeColor });
                child.material = mat;
            }
            }, false)
        ///////////////////////////////////////////////////////////////////////////


        // clear objects from scene. do this here to avoid blink
        scene.traverse(child => {
            if (!child.isLight) {
                scene.remove(child)
            }
        })

        // add object graph from rhino model to three.js scene
        scene.add( object )

        // hide spinner and enable download button
        showSpinner(false)
        downloadButton.disabled = false

        // zoom to extents
        zoomCameraToSelection(camera, controls, scene.children)
    })
}

/**
 * Attempt to decode data tree item to rhino geometry
 */
function decodeItem(item) {
  const data = JSON.parse(item.data)
  if (item.type === 'System.String') {
    // hack for draco meshes
    try {
        return rhino.DracoCompression.decompressBase64String(data)
    } catch {} // ignore errors (maybe the string was just a string...)
  } else if (typeof data === 'object') {
    return rhino.CommonObject.decode(data)
  }
  return null
}


/**
 * The animation loop!
 */
function animate() {
  requestAnimationFrame( animate )
  controls.update()
  renderer.render(scene, camera)
}

/**
 * Helper function for window resizes (resets the camera pov and renderer size)
  */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize( window.innerWidth, window.innerHeight )
  animate()
}

/**
 * Helper function that behaves like rhino's "zoom to selection", but for three.js!
 */
function zoomCameraToSelection( camera, controls, selection, fitOffset = 1.2 ) {
  
  const box = new THREE.Box3();
  
  for( const object of selection ) {
    if (object.isLight) continue
    box.expandByObject( object );
  }
  
  const size = box.getSize( new THREE.Vector3() );
  const center = box.getCenter( new THREE.Vector3() );
  
  const maxSize = Math.max( size.x, size.y, size.z );
  const fitHeightDistance = maxSize / ( 2 * Math.atan( Math.PI * camera.fov / 360 ) );
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = fitOffset * Math.max( fitHeightDistance, fitWidthDistance );
  
  const direction = controls.target.clone()
    .sub( camera.position )
    .normalize()
    .multiplyScalar( distance );
  controls.maxDistance = distance * 10;
  controls.target.copy( center );
  
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  camera.position.copy( controls.target ).sub(direction);
  
  controls.update();

  //Enable buttons
  boundaryButton.disabled = false
  geomButton.disabled = false 
  downloadButton.disabled = false

  
}

/**
 * This function is called when the download button is clicked
 */
function download () {
    // write rhino doc to "blob"
    const bytes = doc.toByteArray()
    const blob = new Blob([bytes], {type: "application/octect-stream"})

    // use "hidden link" trick to get the browser to download the blob
    const filename = data.definition.replace(/\.gh$/, '') + '.3dm'
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = filename
    link.click()
}

/**
 * Shows or hides the loading spinner
 */
function showSpinner(enable) {
  if (enable)
    document.getElementById('loader').style.display = 'block'
  else
    document.getElementById('loader').style.display = 'none'
}