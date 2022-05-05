# Project Brief
This web app will allow people to explore Rozvany's optimal structural layouts. 

## Description
It will consist of four different part:

1. Users can **play** with the size and boundary conditions of a rectangular floor plan 
2. Users can **draw** their own floor plan and place their own columns and walls by clicking within the canvas.
3. Users can modify a **grid** of column
4. Users can **upload** their own rhino geometry

After playing, drawing, uploading, or modifying their grid, an optimal structural framing layout will be computed and outputed on the screen with the option for the user to download the results.

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
All inputs are drawn by the user into the canvas

Boundary Points - At least three points that make up the boundary vertices.  
Column Points - points within the boundary that represent column placement  
Line Support Points - At least two points that make up the end points of a line or polyline  

**Draw OUTPUTS**
A series of a group of curves each with their own name attribute. Color is assigned in VScode based on the name.

**Grid INPUTS**
Number of points in X  
Number of points in Y  
Spacing between points  

Grid Spacing: Determined by stream filter  
    Triangular Grid (stream filter value: 0)  
    Square Grid (stream filter value: 1)  
    Hexagon Grid (stream filter value: 2)  

**Grid OUTPUTS**
A series of colored meshes that reprersents different curvature region types.


**Rozvany** is a project of IAAC, Institute for Advanced Architecture of Catalonia developed in the Master In Advanced Computation For Architecture & Design 2021/22 by  
Student: Sophie Moore     
Lead Faculty:  David Leon and Hesham Shawqy  





