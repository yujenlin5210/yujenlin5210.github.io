---
layout: project-page
title: Comic Reader
categories: projects
slogan: The best way to read comics
landing-slogan: The best way to read comics
description: Comic Reader is an open source comics reading app. It supports search and subscription which can let you manage the comics with ease. It displays each episode in a single scrolling page, and automatically adjust the page size to provide maximum reading area. Reading comic can never be this easy.
folder: comic-reader
cover: comic-reader.png
title-cover: comic-reader-title.png
tags: [Electron, Open Source]
links:
  - text: Official Website
    url: https://yjlintw.github.io/comic-reader
  - text: Github
    url: https://github.com/yjlintw/comic-reader
---

## The only desktop comic reading app you need

Comic Reader is a comics reading app designed for high-fidelity digital reading. It supports search and subscription, allowing you to manage your library with ease. The app provides update notifications so you never miss your favorite releases. It displays each episode in a single scrolling page and automatically adjusts the page size to provide the maximum reading area.

## It's free and open source

Comic Reader is an open-source project based on Electron. It is licensed under the [GNU GPL v3.0 License](https://github.com/yjlintw/comic-reader/blob/master/LICENSE) and hosted on [Github](https://github.com/yjlintw/comic-reader).

## User Interface

<div class="grid grid-cols-1 gap-8 my-12 not-prose">
<section class="flex flex-col md:flex-row gap-8 p-8 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
<div class="flex-1">
<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Search View</h3>
<p class="text-slate-600 dark:text-slate-400 font-light leading-relaxed">A user can enter keywords to search comic books from multiple sites. There are filters to hide results depending on the sourcing sites. Each result has a cover photo and a short description to help users navigate through the results easily.</p>
</div>
<div class="flex-1">
<img src="/assets/images/projects/comic-reader/ex01.png" alt="Comic Reader - Search View" class="rounded-xl shadow-lg w-full object-cover">
</div>
</section>

<section class="flex flex-col md:flex-row-reverse gap-8 p-8 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
<div class="flex-1">
<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Favorite View</h3>
<p class="text-slate-600 dark:text-slate-400 font-light leading-relaxed">Favorite view is where a user can manage their comics subscription. A desktop notification will send out when a subscribed comics get new updates. The app also stores reading history, returning to the last reading location automatically.</p>
</div>
<div class="flex-1">
<img src="/assets/images/projects/comic-reader/ex02.png" alt="Comic Reader - Favorite View" class="rounded-xl shadow-lg w-full object-cover">
</div>
</section>

<section class="flex flex-col md:flex-row gap-8 p-8 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
<div class="flex-1">
<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Read View</h3>
<p class="text-slate-600 dark:text-slate-400 font-light leading-relaxed">A user can read each episode in a single scrolling page. The app will automatically adjust the page size to provide maximum reading area. It supports keyboard shortcuts to navigate different pages or episodes with arrow keys.</p>
</div>
<div class="flex-1">
<img src="/assets/images/projects/comic-reader/ex03.png" alt="Comic Reader - Read View" class="rounded-xl shadow-lg w-full object-cover">
</div>
</section>
</div>

## User Statistics

<div class="grid grid-cols-1 md:grid-cols-2 gap-8 my-12 not-prose">
<section class="md:col-span-2 p-8 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Active Daily Users</h3>
<p class="text-slate-600 dark:text-slate-400 font-light mb-6">We have approximately 70 users a day. A user uses the app averagely 60 minutes each time.</p>
<img src="/assets/images/projects/comic-reader/dailyusers.png" alt="Comic Reader - Daily Users Chart" class="rounded-xl shadow-md w-full h-auto">
</section>

<section class="p-8 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 w-full text-left">Retained Users</h3>
<p class="text-slate-600 dark:text-slate-400 font-light mb-4 w-full text-left">68% of our users are retained users.</p>
<img src="/assets/images/projects/comic-reader/retained_users.png" alt="Comic Reader - Retained Users Chart" class="w-48 h-auto">
</section>

<section class="p-8 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 w-full text-left">OS Platform</h3>
<p class="text-slate-600 dark:text-slate-400 font-light mb-4 w-full text-left">92% of our users use Mac.</p>
<img src="/assets/images/projects/comic-reader/os.png" alt="Comic Reader - OS Chart" class="w-48 h-auto">
</section>
</div>

## System Architecture

The app follows the [Model View ViewModel (MVVM) design pattern](https://www.objc.io/issues/13-architecture/mvvm/). More information can be found on our [Github wiki page](https://github.com/yjlintw/comic-reader/wiki/App-Architecture).
