// Import libraries
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js'

//set up new loader for converting the results to THREEjs
const loader = new Rhino3dmLoader()
loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/')

//Define Variables
const definition = 'RozvanyDraw01x.gh'
const mouse = new THREE.Vector3()
const canvasContainer = document.querySelector('#canvasContainer')

//spinner
showSpinner(false);

//starting message

//Define Materials
const material = new THREE.LineBasicMaterial({
    color: 0xcfcfcf
});

// set up download button click handlers
const downloadButton = document.getElementById("download")
downloadButton.onclick = download

// event listeners
const addBoundary = document.getElementById('boundary')
//addBoundary.addEventListener('click', AddBoundary)

const freeBoundary = document.getElementById('Frboundary')
freeBoundary.addEventListener('click', AssnBoundType)
const pinnedBoundary = document.getElementById('Piboundary')
pinnedBoundary.addEventListener('click', AssnBoundType)
const fixedBoundary = document.getElementById('Fiboundary')
fixedBoundary.addEventListener('click', AssnBoundType)

const addPoints = document.getElementById('column')
addPoints.addEventListener('click', AddPoints)

const addLine = document.getElementById('line')
addLine.addEventListener('click', AddLine)

const computeButton = document.getElementById('compute')
computeButton.addEventListener('click', compute)

const reset = document.getElementById('reset')
reset.addEventListener('click', Reset)

window.addEventListener('keyup', Close)

////Button Appearance Features////////

const boundaryButton = document.getElementById('boundary');
boundaryButton.addEventListener('mouseup', boundContent, false)
var geometryClicked = 0;

function boundContent(e){
  var $content = e.target.nextElementSibling.nextElementSibling.style;
  if (geometryClicked == 0){
    $content.display = "block"
    geometryClicked = 1
    return
  }
  if(geometryClicked == 1){
    $content.display = "none"
    geometryClicked = 0
    return
  }
}
///////////////////////////

function AssnBoundType(e){
    var $boundType = e.target.id;
    if ($boundType == 'Frboundary'){
        var Type = 0;
        pinnedBoundary.disabled = true
        fixedBoundary.disabled = true
        AddBoundary()
    }
    if ($boundType == 'Piboundary'){
        var Type = 1;
        freeBoundary.disabled = true
        fixedBoundary.disabled = true
        AddBoundary()
    }
    if ($boundType == 'Fiboundary'){
        var Type = 2;
        freeBoundary.disabled = true
        pinnedBoundary.disabled = true
        AddBoundary()
    }
    data.inputs['boundType'].push(Type)
    document.getElementById('boundary').nextElementSibling.nextElementSibling.style.display = "none"
    geometryClicked = 0
}

//starting disabled buttons
addPoints.disabled = true;
addLine.disabled = true;
computeButton.disabled = true;
reset.disabled = true;
downloadButton.disabled = true;

//Intialize data objects
let data = {}
data.definition = definition
data.inputs = {
    'boundType': [],
    'boundaryPoints': [],
    'colPoints': [],
    'lnPoints': [],
    'splitIndex': []
}

//load the rhino3dm library
let rhino, doc
rhino3dm().then(async m => {
    console.log('Loaded rhino3dm.')
    rhino = m // global

    init()
})

//slider change

//Enables element addition
function AddBoundary() {
    if (numBoundPoints == 0){
        document.getElementById('directions').innerText = ""
    }
    canvasContainer.addEventListener('click', onClickBound, false);
    document.body.style.cursor = "crosshair"
    console.log("here")
}

function Close() {

    //check that atleast 3 points have been added
    if (numBoundPoints < 3) {
        return
    }
    else {
        //change description message

        document.getElementById('directions').innerText = ""
        //remove add boundary point event listener
        canvasContainer.removeEventListener('click', onClickBound, false)

        //draw closing boundary line
        const points = [boundVectors[boundVectors.length - 1], boundVectors[0]]
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }
    document.getElementById('directions').innerText = ""
    document.body.style.cursor = "auto"

    //enable buttons
    addBoundary.disabled = true;
    addPoints.disabled = false;
    addLine.disabled = false;
    reset.disabled = false;
    computeButton.disabled = false;
}

function AddPoints() {
    document.getElementById('directions').innerText = ''

    document.body.style.cursor = "crosshair"

    //remove event listeners
    canvasContainer.removeEventListener('click', onClickLine, false)
    canvasContainer.removeEventListener('click', NewLine, false)

    //add event listener for column poibnts
    canvasContainer.addEventListener('click', onClickCol, false);
}

function AddLine() {
    document.body.style.cursor = "crosshair"
    if (numLinePoints == 0){
        document.getElementById('directions').innerText = ""
    }

    canvasContainer.removeEventListener('click', onClickCol, false)
    //canvasContainer.removeEventListener('click', onClickArc, false)

    //add event listener for column poibnts
    canvasContainer.addEventListener('click', onClickLine, false);
}

function Reset() {
    addBoundary.disabled = false;
    freeBoundary.disabled = false;
    pinnedBoundary.disabled = false;
    fixedBoundary.disabled = false;
    downloadButton.disabled = true;
    reset.disabled = true;

    document.body.style.cursor = "auto"
    document.getElementById('directions').innerText = ""

    data.inputs['boundaryPoints'] = []
    data.inputs['colPoints'] = []
    data.inputs['lnPoints'] = []

    numBoundPoints = 0;
    numLinePoints = 0;
    boundVectors = []
    lineVectors = []

    while (scene.children.length > 2) {
        for (let i = 0; i < scene.children.length - 1; i++) {
            scene.remove(scene.children[2])
        }
    }
}

//Click Events
var numBoundPoints = 0;
var numLinePoints = 0;
var boundVectors = [];
var lineVectors = [];

function onClickBound(event) {

    document.getElementById('directions').innerText = ""

    if (numBoundPoints > 1) {
        document.getElementById('directions').innerText = "Press any key to close boundary."
    }

    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1
    mouse.z = 0
    mouse.unproject(camera)

    boundVectors.push(new THREE.Vector3(mouse.x, mouse.y, 0))

    // add json-encoded Point3d to list, e.g. '{ "X": 1.0, "Y": 2.0, "Z": 0.0 }'
    let pt = "{\"X\":" + mouse.x + ",\"Y\":" + mouse.y + ",\"Z\":0}"
    data.inputs['boundaryPoints'].push(pt)

    //create Three.js Line and material and add to scene
    numBoundPoints = numBoundPoints + 1; //count number of times a point is clicked so that we know we have at least two points to make a line

    const points = [];
    if (numBoundPoints > 1) {
        points.push(boundVectors[boundVectors.length - 2])
        points.push(boundVectors[boundVectors.length - 1])
    }

    const circGeometry = new THREE.CircleGeometry(2, 32);
    const circle = new THREE.Mesh(circGeometry, material);
    circle.position.set(mouse.x, mouse.y, mouse.z)
    scene.add(circle);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
}

function onClickCol(event) {
    // calculate mouse position in normalized device coordinates, (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1
    mouse.z = 0
    mouse.unproject(camera)

    // add json-encoded Point3d to list, e.g. '{ "X": 1.0, "Y": 2.0, "Z": 0.0 }'
    let pt = "{\"X\":" + mouse.x + ",\"Y\":" + mouse.y + ",\"Z\":0}"
    data.inputs['colPoints'].push(pt)

    const geometry = new THREE.CircleGeometry(5, 32);
    const circle = new THREE.Mesh(geometry, material);
    circle.position.set(mouse.x, mouse.y, mouse.z)
    scene.add(circle);
}

function onClickLine(event) {

    if (numLinePoints > 0){
        document.getElementById('directions').innerText = "Press any key to draw a new line."
    }

    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1
    mouse.z = 0
    mouse.unproject(camera)

    lineVectors.push(new THREE.Vector3(mouse.x, mouse.y, 0))

    // add json-encoded Point3d to list, e.g. '{ "X": 1.0, "Y": 2.0, "Z": 0.0 }'
    let pt = "{\"X\":" + mouse.x + ",\"Y\":" + mouse.y + ",\"Z\":0}"
    data.inputs['lnPoints'].push(pt)

    //create Three.js Line and material and add to scene
    numLinePoints = numLinePoints + 1; //count number of times a point is clicked so that we know we have at least two points to make a line
    console.log(numLinePoints)
    const points = [];
    var splitList = data.inputs['splitIndex'];
    var splitLength = data.inputs['splitIndex'].length
    if (splitLength > 0) {
        console.log(numLinePoints - splitList[splitLength - 1])
        if (numLinePoints - splitList[splitLength - 1] > 1) {
            points.push(lineVectors[lineVectors.length - 2])
            points.push(lineVectors[lineVectors.length - 1])
        }
    }
    else {
        if (numLinePoints > 1) {
            points.push(lineVectors[lineVectors.length - 2])
            points.push(lineVectors[lineVectors.length - 1])
        }
    }

    console.log(data.inputs)


    const circGeometry = new THREE.CircleGeometry(5, 32);
    const circle = new THREE.Mesh(circGeometry, material);
    circle.position.set(mouse.x, mouse.y, mouse.z)
    scene.add(circle);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    window.addEventListener('keyup', NewLine)
}

function NewLine() {
    document.body.style.cursor = "crosshair" 
    document.getElementById('directions').innerText = ""
    data.inputs['splitIndex'].push(numLinePoints)
    console.log(data.inputs)
}

//Call appserver
async function compute() {
    addLine.disabled = true;
    addPoints.disabled = true;
    downloadButton.disabled = false;
    computeButton.disabled = true;

    document.body.style.cursor = "auto"
    //start spinner
    showSpinner(true);

    //remove event listeners
    canvasContainer.removeEventListener('click', onClickLine, false)
    canvasContainer.removeEventListener('click', onClickCol, false)
    canvasContainer.removeEventListener('click', onClickBound, false)
    canvasContainer.removeEventListener('click', NewLine, false)

    document.getElementById('directions').innerText = ""

    let t0 = performance.now()
    const timeComputeStart = t0

    console.log(data.inputs)

    const request = {
        'method': 'POST',
        'body': JSON.stringify(data),
        'headers': { 'Content-Type': 'application/json' }
    }

    try {
        const response = await fetch('/solve', request)

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
    console.log(values) //logs gh outputs

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
            if (child.Line) {
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

let scene, camera, renderer, controls

function init() {

    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x3d3e40);
    const frustumSize = 1000
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1, 1);


    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: document.querySelector('canvas') //adds renderer to HTML canvas element
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    //document.body.appendChild(renderer.domElement);

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
    link.download = 'RozvanyDrawLayout.3dm'
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