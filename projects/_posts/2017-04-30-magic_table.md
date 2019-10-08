---
layout: project-page
title: Magic Table
categories: projects
slogan: Blurring the line between the digital and the physical worlds
description: Magic Table is aiming for creating an easy-to-use prototype platform for tabletop interaction. It can sense multiple touch inputs as well as fiducial markers for object tracking. The user can also use speech command to interact with it.
folder: magic_table
cover: cover.jpg
title-cover: cover-title.jpg
tags: [project-main, Multi-touch Table, Computer Vision, OpenFrameworks, Projection Mapping]
---
<div class="columns is-gapless">
    <div class="column is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/projection4.jpg">
        </figure>
    </div>
    <div class="column is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/finish.jpg">
        </figure>
    </div>
</div>
<h2>Interact with the digital world using everyday objects</h2>
Magic Table is aiming for creating an easy-to-use prototype platform for tabletop interaction. It can sense multiple touch inputs as well as fiducial markers for object tracking. The user can also use speech command to interact with it. The method I chose here is called <a href="http://wiki.nuigroup.com/Diffused_Surface_Illumination" target="_blank">Diffused Surface Illumination (DSI)</a>. It puts the infrared(IR) LED strip on the side of the acrylic to illuminate the whole surface; therefore, the IR camera underneath can see the surface clearly without being affect by the projection on the surface.
<h2>Applications using Magic Table</h2>
<div class="columns">
    <div class="column is-half">
        <div class="video-container">
        <iframe src="https://player.vimeo.com/video/206241891" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
        </div>
    </div>
    <div class="column is-half">
        <div class="video-container">
        <iframe src="https://player.vimeo.com/video/214967460" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
        </div>
    </div>
</div>
<h2> Material and Equipments</h2>
The material and equipments I used for the table contains:
<ul>
  <li><a href="https://www.acrylite-shop.com/US/us/acrylite-led/light-guiding-edge-lit-ga7iwmq7gnt.html" target="_blank">ACRYLITE LED (EndLighten) Colorless 0E011 acrylic sheet</a></li>
  <li><a href="http://www.ledlightsworld.com/index.php?main_page=advanced_search_result&search_in_description=1&keyword=SMD3528-600-IR" target="_blank">Infrared LED Strip</a></li>
  <li><a href="">110V to 12V DC Regulator</a></li>
  <li>0.5" &amp; 0.25" plywood</li>
  <li>0.25" pegboard</li>
  <li>Foamcore board</li>
  <li>Microsoft Kinect (For IR camera only)</li>
  <li><a href="http://www.aaxatech.com/products/p700pro_pico_projector.html" target="_blank">AAXA P700 Pico Projector (Some of the photos below were using AAXA ST200)</a></li>
</ul>
<p>All of the wood boards are just for making the structure of the table, it can be replaced with any other material. ACRYLITE LED acrylic sheet lets the IR LED's light diffused nicely across the whole surface. ACRYLITE Satinice acrylic sheet is a frosted surface for projection, it can be replaced with any similar material. Kinect in this project is just serving as an IR camera, and it would be a lot easier if just using a normal IR camera than Kinect. ST200 is a short throw pico projector, it can project a 30" screen size (diagonal) in around 30" distance. If the projector has smaller throw rate, you can use a mirror to increase the projector distance without increases the table size, which I did after I replace the projector to P700. The ST200 has only 150 lumens, so the projection is pretty dim and requires a dark room to see the projection clearly. P700 does not have the problem.</p>
<div class="columns">
    <div class="column is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/lightprojection.jpg">
        </figure>
        <p class="has-text-centered">ST200 (150 lumens) in bright environment</p>
    </div>
    <div class="column is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/darkprojection.jpg">
        </figure>
        <p class="has-text-centered">ST200 (150 lumens) in dark environment</p>
    </div>
</div>

<h2>Testing IR edge lit and projection</h2>
<p>We use Kinect as an IR camera here. Kinect itself has an IR LED array that projects IR point clouds, which will interfere with the nicely diffused IR light comes out from the IR LED strips, so we need to block that LED array. The image bellow shows the Kinect with LED array blocked, and the Kinect's views with LED blocked and unblocked.</p>
<div class="columns">
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/kinect.jpg">
        </figure>
        <p class="has-text-centered">Blocks the Kinect IR array to get a nicely diffused IR light surface.</p>
    </div>
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/ledunblocked.png">
        </figure>
        <p class="has-text-centered">When the IR array is unblocked, the result has a lot of noise points and a huge blobs in the center.</p>
    </div>
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/ledblocked.png">
        </figure>
        <p class="has-text-centered">When the IR array is blocked. It shows a nicely distributed light surface.</p>
    </div>
</div>
<div class="columns">
    <div class="column">
        <p>The video below shows what the IR Camera sees</p>
        <div class="video-container">
            <iframe src="https://www.youtube.com/embed/dszG4yWQLwY" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
        </div>
    </div>
</div>
<h2>Making of the Table</h2>
<h3>Models the table using SolidWorks</h3>
<div class="columns">
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/solidworks1.png">
        </figure>
    </div>
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/solidworks2.png">
        </figure>
    </div>
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/solidworks3.png">
        </figure>
    </div>
</div>
<h3>CNC Routes the sides</h3>
<div class="columns">
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/cnc1.jpg">
        </figure>
    </div>
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/cnc2.jpg">
        </figure>
    </div>
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/cnc3.jpg">
        </figure>
    </div>
</div>
<div class="columns">
    <div class="column">
        <div class="video-container">
        <iframe src="https://player.vimeo.com/video/164211639" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
        </div>
    </div>
</div>
<h3>Assembling</h3>
<div class="columns is-multiline">
    <div class="column is-one-third-desktop is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/assemble1.jpg">
        </figure>
    </div>
    <div class="column is-one-third-desktop is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/assemble2.jpg">
        </figure>
    </div>
    <div class="column is-one-third-desktop is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/assemble3.jpg">
        </figure>
    </div>
    <div class="column is-one-third-desktop is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/assemble4.jpg">
        </figure>
    </div>
    <div class="column is-one-third-desktop is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/assemble5.jpg">
        </figure>
    </div>
    <div class="column is-one-third-desktop is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/assemble6.jpg">
        </figure>
    </div>
</div>
<h3>Laser Cuts the cover</h3>
<div class="columns is-multiline">
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/cover2.jpg">
        </figure>
    </div>
    <div class="column">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/cover3.jpg">
        </figure>
    </div>
    <div class="column is-half">
        <figure class="image">
            <img src="/assets/images/projects/magic_table/cover4.jpg">
        </figure>
    </div>
</div>

<h2>Tracking Fingers and Objects</h2>
<p>All of the code can be found on <a href="https://github.com/yjlintw/mtproject">Github</a>. I use openFrameworks with some other add-ons, including ofxFiducialTracker. The video shows the tracking result. For the fiducial tracker, the program can get the marker size and the orientation information as well.</p>
<div class="columns">
    <div class="column">
        <div class="video-container">
        <iframe src="https://player.vimeo.com/video/164214236" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
        </div>
    </div>
</div>