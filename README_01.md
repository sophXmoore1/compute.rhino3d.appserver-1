# Project Brief
This web app will allow people to explore Rozvany's optimal structural layouts. 

## Description
It will consist of three different part:

1. Users can **play** with the size and boundary conditions of a rectangular floor plan (already implemented last session)
2. Users can **draw** their own floor plan and place their own columns and walls by clicking within the canvas.
3. Users can **upload** their own Rhino file which contains a their own floor layout consisting of lines, curves, and points.

After playing, drawing, or uploading, an optimal structural framing layout will be computed and outputed on the screen with the option for the user to download the results.

## Plug-ins
None

## Data Flow

**PLAY INPUTS**
X_Size (integer)
Y_Size (integer)
Spacing (double)
botFix (-1, 0 1)
rightFix (-1, 0 1)
topFix (-1, 0 1)
leftFix (-1, 0 1)

**PLAY OUTPUTS**
A series of a group of curves each with their own name attribute. Color is assigned in VScode based on the name.

**DRAW INPUTS**
Points - to be assigned by the user in the canvas which represent column placements. 2 Points - to be assigned by the user in the canvas which are the end point of a line to represent a boundary or a wall. 
3 Points - to be assigned by the user in the canvas to form an arch which can represent a boundary or a wall.

**Draw OUTPUTS**
A series of a group of curves each with their own name attribute. Color is assigned in VScode based on the name.

**UPLOAD INPUTS**
A rhino file of points, lines, and curves each on their own layer to be pulled grasshopper via geometry pipeline.

**UPLOAD OUTPUTS**
A series of a group of curves each with their own name attribute. Color is assigned in VScode based on the name.





