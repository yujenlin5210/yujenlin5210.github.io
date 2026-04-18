---
layout: project-page
title: Photo Mosaic
categories: lab
slogan: 
description: Experiment on creating photo mosaic algorithm
folder: photomosaic
cover: cover.jpg
title-cover: cover-title.jpg
tags: [C++, OpenCV]
links:
  - text: Github
    url: https://github.com/yjlintw/PhotoMosaicV2
---

### Concept
A photo mosaic algorithm built to compose a large base image entirely out of a library of smaller source photographs. The tool was developed to generate massively detailed outputs, enabling very high-resolution final renders suitable for large-scale printing.

### Technical Implementation
The system is written in **C++** using the **openFrameworks** creative coding toolkit and **OpenCV** (via the `ofxCv` addon) for robust image processing. 

*   **Color Analysis & Grid Processing:** The algorithm begins by dividing the target (base) image into a grid of uniform tiles. For each tile, it computes the mean RGB color value using OpenCV's `cv::mean` function. It performs the exact same analysis on an entire directory of source images, storing their mean colors in memory.
*   **Distance-Based Matching:** To find the best fitting photograph for a specific tile, the system calculates the Euclidean distance (`cv::norm`) between the color vectors of the target tile and each source image.
*   **Repetition & Diversity Control:** A naive matching approach often results in the same few images being repeated in areas of uniform color. To solve this, the algorithm employs a clever **two-pass priority queue** mechanism. First, it identifies the top 20 closest matches by color distance. From those 20 candidates, it selects the one with the lowest `usedCount` (the image that has been placed the least number of times). This forces a visually diverse distribution of photos across the final mosaic.
*   **High-Resolution Tiling Engine:** Generating a massive mosaic in memory can easily cause out-of-memory errors. The tool mitigates this by splitting the final output into smaller, manageable sub-regions (e.g., a 9x9 grid). Each section is processed, populated with resized source images, and individually saved to disk, allowing for virtually unlimited final output resolutions.