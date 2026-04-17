---
layout: project-page
title: Magic Table
categories: lab
slogan: Blurring the line between the digital and the physical worlds
description: Magic Table is aiming for creating an easy-to-use prototype platform for tabletop interaction. It can sense multiple touch inputs as well as fiducial markers for object tracking. The user can also use speech command to interact with it.
folder: magic_table
organization: University of Michigan
role: Research & Interaction Design
cover: cover.jpg
title-cover: cover-title.jpg
tags: [project-feature, Multi-touch Table, Computer Vision, OpenFrameworks, Projection Mapping]
---

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
<figure class="image">
<img src="/assets/images/lab/magic_table/projection4.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/finish.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
</div>

## Interact with the digital world using everyday objects

Magic Table is aiming for creating an easy-to-use prototype platform for tabletop interaction. It can sense multiple touch inputs as well as fiducial markers for object tracking. The user can also use speech command to interact with it. The method I chose here is called [Diffused Surface Illumination (DSI)](http://wiki.nuigroup.com/Diffused_Surface_Illumination). It puts the infrared(IR) LED strip on the side of the acrylic to illuminate the whole surface; therefore, the IR camera underneath can see the surface clearly without being affect by the projection on the surface.

## Applications using Magic Table

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
<div class="w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
<iframe src="https://player.vimeo.com/video/206241891" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
<div class="w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
<iframe src="https://player.vimeo.com/video/214967460" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
</div>

## Material and Equipments

The material and equipments I used for the table contains:
*   [ACRYLITE LED (EndLighten) Colorless 0E011 acrylic sheet](https://www.acrylite-shop.com/US/us/acrylite-led/light-guiding-edge-lit-ga7iwmq7gnt.html)
*   [Infrared LED Strip](http://www.ledlightsworld.com/index.php?main_page=advanced_search_result&search_in_description=1&keyword=SMD3528-600-IR)
*   110V to 12V DC Regulator
*   0.5" & 0.25" plywood
*   0.25" pegboard
*   Foamcore board
*   Microsoft Kinect (For IR camera only)
*   [AAXA P700 Pico Projector](http://www.aaxatech.com/products/p700pro_pico_projector.html) (Some of the photos below were using AAXA ST200)

All of the wood boards are just for making the structure of the table, it can be replaced with any other material. ACRYLITE LED acrylic sheet lets the IR LED's light diffused nicely across the whole surface. ACRYLITE Satinice acrylic sheet is a frosted surface for projection, it can be replaced with any similar material. Kinect in this project is just serving as an IR camera, and it would be a lot easier if just using a normal IR camera than Kinect. ST200 is a short throw pico projector, it can project a 30" screen size (diagonal) in around 30" distance. If the projector has smaller throw rate, you can use a mirror to increase the projector distance without increases the table size, which I did after I replace the projector to P700. The ST200 has only 150 lumens, so the projection is pretty dim and requires a dark room to see the projection clearly. P700 does not have the problem.

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
<figure class="image flex flex-col items-center">
<img src="/assets/images/lab/magic_table/lightprojection.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
<figcaption>ST200 (150 lumens) in bright environment</figcaption>
</figure>
<figure class="image flex flex-col items-center">
<img src="/assets/images/lab/magic_table/darkprojection.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
<figcaption>ST200 (150 lumens) in dark environment</figcaption>
</figure>
</div>

## Testing IR edge lit and projection

We use Kinect as an IR camera here. Kinect itself has an IR LED array that projects IR point clouds, which will interfere with the nicely diffused IR light comes out from the IR LED strips, so we need to block that LED array. The image bellow shows the Kinect with LED array blocked, and the Kinect's views with LED blocked and unblocked.

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 not-prose">
<figure class="image flex flex-col items-center">
<img src="/assets/images/lab/magic_table/kinect.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
<figcaption>Blocks the Kinect IR array to get a nicely diffused IR light surface.</figcaption>
</figure>
<figure class="image flex flex-col items-center">
<img src="/assets/images/lab/magic_table/ledunblocked.png" class="rounded-xl shadow-lg w-full h-full object-cover">
<figcaption>When the IR array is unblocked, the result has a lot of noise points and a huge blobs in the center.</figcaption>
</figure>
<figure class="image flex flex-col items-center">
<img src="/assets/images/lab/magic_table/ledblocked.png" class="rounded-xl shadow-lg w-full h-full object-cover">
<figcaption>When the IR array is blocked. It shows a nicely distributed light surface.</figcaption>
</figure>
</div>

<div class="my-8">
<p>The video below shows what the IR Camera sees</p>
<div class="w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
<iframe src="https://www.youtube.com/embed/dszG4yWQLwY" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
</div>

## Making of the Table

### Models the table using SolidWorks
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 not-prose">
<figure class="image">
<img src="/assets/images/lab/magic_table/solidworks1.png" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/solidworks2.png" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/solidworks3.png" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
</div>

### CNC Routes the sides
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 not-prose">
<figure class="image">
<img src="/assets/images/lab/magic_table/cnc1.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/cnc2.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/cnc3.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
</div>

<div class="w-full aspect-video rounded-2xl overflow-hidden shadow-xl my-8 border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
<iframe src="https://player.vimeo.com/video/164211639" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

### Assembling
<div class="grid grid-cols-2 md:grid-cols-3 gap-6 my-8 not-prose">
<figure class="image">
<img src="/assets/images/lab/magic_table/assemble1.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/assemble2.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/assemble3.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/assemble4.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/assemble5.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/assemble6.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
</div>

<h3 class="my-8">Laser Cuts the cover</h3>
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
<figure class="image">
<img src="/assets/images/lab/magic_table/cover2.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<figure class="image">
<img src="/assets/images/lab/magic_table/cover3.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
<div class="md:col-span-2">
<figure class="image">
<img src="/assets/images/lab/magic_table/cover4.jpg" class="rounded-xl shadow-lg w-full h-full object-cover">
</figure>
</div>
</div>

## Tracking Fingers and Objects

All of the code can be found on [Github](https://github.com/yjlintw/mtproject). I use openFrameworks with some other add-ons, including ofxFiducialTracker. The video shows the tracking result. For the fiducial tracker, the program can get the marker size and the orientation information as well.

<div class="w-full aspect-video rounded-2xl overflow-hidden shadow-xl my-8 border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
<iframe src="https://player.vimeo.com/video/164214236" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

