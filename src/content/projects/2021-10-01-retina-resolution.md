---
layout: project-page
title: "Retina Resolution Prototype: Butterscotch"
categories: projects
slogan: Passing the Visual Turing Test with retinal-level clarity
landing-slogan: Passing the Visual Turing Test with retinal-level clarity
description: The Retina Resolution Prototype, known as Butterscotch, is a research vehicle designed to reach the point where VR pixels are indistinguishable from reality.
folder: retina-resolution
organization: Meta Reality Labs
role: Lead Product Design Prototyper
cover: cover.jpg
title-cover: title.jpg
animation: retina-resolution
tags: [project-main, landing, Research, Unity3D, VR]
links:
  - text: Mark Zuckerberg's Post
    url: https://www.facebook.com/zuck/posts/10113982963226401
  - text: Road to VR Coverage
    url: https://www.roadtovr.com/meta-butterscotch-retina-resolution-vr-prototype/
---

Butterscotch is one of Meta Reality Labs' most iconic "Time Machine" projects. Its singular goal was to demonstrate **retinal resolution**—the level of pixel density required to pass the "Visual Turing Test," where a virtual display meets or exceeds the resolving power of the human eye.

<div class="w-full aspect-video rounded-2xl overflow-hidden shadow-xl my-8 border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
    <iframe src="https://www.youtube.com/embed/IMpWH6vDZ8E?si=MoUA_NQw5EM-rKEZ&amp;start=20" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

## Software Stack & Experience Development

As the **Lead Product Design Prototyper**, I was responsible for building the software foundation that brought these high-density displays to life. My work bridged the gap between raw hardware engineering and a meaningful user experience.

### Prototype Software Infrastructure
I developed the core software stack that allowed us to quickly spin up and iterate on a series of internal retinal-resolution prototypes. This involved:
*   **System Integration:** Integrating custom display correction algorithms and high-precision tracking solutions to ensure the visual output remained stable at such high PPD.
*   **Engineering Tooling:** Building specialized debugging tools that allowed firmware engineers to validate and adjust hardware parameters in real-time within the VR environment.

### The "Visual Turing Test" Showcase
I designed and developed the interactive VR experience that served as the primary internal and public showcase for the technology. 

The demo centered on a high-fidelity **virtual workspace**, specifically engineered to highlight the prototype's extreme resolution. By placing users in a desktop-like environment with small, crisp text and detailed interfaces, we demonstrated the feasibility of long-term productivity in VR. 

While the workspace provided the primary context for the resolution benefits, the experience also incorporated technical validation tools such as a virtual Snellen eye chart. With the display achieving over **55 Pixels Per Degree (PPD)**—nearly 2.5x the density of consumer headsets at the time—users could resolve the 20/20 line in VR, providing a definitive benchmark for the technology's performance. This experience was famously shared by **Mark Zuckerberg** on his public Facebook, helping to define and validate the long-term VR roadmaps for the company.

## Hardware & Optical Architecture

To achieve retinal resolution with contemporary technology, the Butterscotch team prioritized pixel density over all other factors, including form factor and field of view.

### Breaking the 20/20 Barrier
*   **55+ PPD Density:** By utilizing ultra-high-resolution LCD panels and condensing them into a focused area, the prototype eliminated the "screen door effect" entirely.
*   **Custom Hybrid Lenses:** To fully resolve the extreme pixel density without distortion, the team developed a custom hybrid lens system.
*   **The FOV Trade-off:** To maximize resolution, the field of view was reduced to approximately **50-60 degrees**. This allowed the prototype to concentrate its pixels into a "retinal window," proving the feasibility of the technology before it could be scaled to a full FOV.
