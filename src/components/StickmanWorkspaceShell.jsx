import { useLayoutEffect, useRef, useState } from 'react';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FALLBACK_HEADER_HEIGHT_PX = 88;
const WORKSPACE_TOP_INSET_PX = 20;
const WORKSPACE_BOTTOM_INSET_PX = 20;
const SNAP_APPROACH_DISTANCE_PX = 190;
const SNAP_OVERSHOOT_DISTANCE_PX = 80;
const SNAP_RELEASE_DISTANCE_PX = 240;
const MIN_COMFORTABLE_WORKSPACE_HEIGHT_PX = 420;
const IMMERSIVE_WORKSPACE_ACTIVE_CLASS = 'immersive-stickman-workspace-active';

function getHeaderHeight() {
  if (typeof document === 'undefined') {
    return FALLBACK_HEADER_HEIGHT_PX;
  }

  const header = document.querySelector('body > header');

  if (!(header instanceof HTMLElement)) {
    return FALLBACK_HEADER_HEIGHT_PX;
  }

  return Math.max(Math.round(header.getBoundingClientRect().height), FALLBACK_HEADER_HEIGHT_PX);
}

function setImmersiveWorkspaceActive(isActive) {
  if (typeof document === 'undefined' || !document.body) {
    return;
  }

  document.body.classList.toggle(IMMERSIVE_WORKSPACE_ACTIVE_CLASS, isActive);
}

export default function StickmanWorkspaceShell({ preview, controls }) {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const didSnapInRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const snapTimeoutRef = useRef(0);
  const layoutRef = useRef({
    isDesktop: false,
    headerHeight: FALLBACK_HEADER_HEIGHT_PX,
    stickyTop: WORKSPACE_TOP_INSET_PX,
    workspaceHeight: 0,
    overflow: 0,
    prefersReducedMotion: false,
  });

  const [stickyTop, setStickyTop] = useState(WORKSPACE_TOP_INSET_PX);
  const [workspaceHeight, setWorkspaceHeight] = useState(null);
  const [sectionHeight, setSectionHeight] = useState(null);

  const syncScrollPositionRef = useRef(() => {});

  syncScrollPositionRef.current = () => {
    // No-op: controls now use native overflow-y-auto scroll
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let animationFrameId = 0;

    const clearSnapTimeout = () => {
      if (snapTimeoutRef.current) {
        window.clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = 0;
      }
    };

    const syncWorkspaceChrome = () => {
      const section = sectionRef.current;
      const { isDesktop, headerHeight, stickyTop: currentStickyTop, workspaceHeight: currentWorkspaceHeight } =
        layoutRef.current;

      if (!section || !isDesktop) {
        setImmersiveWorkspaceActive(false);
        return;
      }

      const rect = section.getBoundingClientRect();
      const headerHideTrigger = headerHeight + 12;
      const releaseLine = currentStickyTop + Math.min(currentWorkspaceHeight * 0.35, 220);
      const shouldHideHeader = rect.top <= headerHideTrigger && rect.bottom >= releaseLine;

      setImmersiveWorkspaceActive(shouldHideHeader);
    };

    const scheduleMeasure = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        measureLayout();
      });
    };

    const updateSnapState = (currentScrollY) => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const targetTop = window.scrollY + section.getBoundingClientRect().top - layoutRef.current.stickyTop;

      if (currentScrollY < targetTop - SNAP_RELEASE_DISTANCE_PX) {
        didSnapInRef.current = false;
      }
    };

    const maybeSnapIntoWorkspace = (currentScrollY, direction) => {
      const section = sectionRef.current;
      const { isDesktop, stickyTop: currentStickyTop, prefersReducedMotion } = layoutRef.current;

      if (
        !section ||
        !isDesktop ||
        prefersReducedMotion ||
        direction <= 0 ||
        didSnapInRef.current ||
        isAutoScrollingRef.current
      ) {
        return;
      }

      const sectionTop = section.getBoundingClientRect().top;
      const distanceFromPinnedTop = sectionTop - currentStickyTop;
      const targetTop = currentScrollY + distanceFromPinnedTop;

      if (
        distanceFromPinnedTop > SNAP_APPROACH_DISTANCE_PX ||
        distanceFromPinnedTop < -SNAP_OVERSHOOT_DISTANCE_PX ||
        sectionTop > window.innerHeight * 0.66
      ) {
        return;
      }

      isAutoScrollingRef.current = true;
      didSnapInRef.current = true;
      clearSnapTimeout();
      window.scrollTo({ top: targetTop, behavior: 'auto' });
      snapTimeoutRef.current = window.setTimeout(() => {
        isAutoScrollingRef.current = false;
        snapTimeoutRef.current = 0;
      }, 160);
    };

    const handleScroll = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        const currentScrollY = window.scrollY;
        const direction =
          currentScrollY > lastScrollYRef.current ? 1 : currentScrollY < lastScrollYRef.current ? -1 : 0;

        lastScrollYRef.current = currentScrollY;
        maybeSnapIntoWorkspace(currentScrollY, direction);
        syncScrollPositionRef.current();
        updateSnapState(window.scrollY);
        syncWorkspaceChrome();
      });
    };

    const measureLayout = () => {
      const content = contentRef.current;
      const nextHeaderHeight = getHeaderHeight();
      const nextStickyTop = WORKSPACE_TOP_INSET_PX;
      const prefersReducedMotion = reducedMotionQuery.matches;

      if (!content) {
        return;
      }

      if (!desktopQuery.matches) {
        layoutRef.current = {
          isDesktop: false,
          headerHeight: nextHeaderHeight,
          stickyTop: nextStickyTop,
          workspaceHeight: 0,
          overflow: 0,
          prefersReducedMotion,
        };

        setStickyTop(nextStickyTop);
        setWorkspaceHeight(null);
        setSectionHeight(null);
        syncScrollPositionRef.current();
        syncWorkspaceChrome();
        return;
      }

      const nextWorkspaceHeight = Math.max(
        window.innerHeight - nextStickyTop - WORKSPACE_BOTTOM_INSET_PX,
        MIN_COMFORTABLE_WORKSPACE_HEIGHT_PX
      );

      layoutRef.current = {
        isDesktop: true,
        headerHeight: nextHeaderHeight,
        stickyTop: nextStickyTop,
        workspaceHeight: nextWorkspaceHeight,
        overflow: 0,
        prefersReducedMotion,
      };

      setStickyTop(nextStickyTop);
      setWorkspaceHeight(nextWorkspaceHeight);
      setSectionHeight(nextWorkspaceHeight);
      syncScrollPositionRef.current();
      syncWorkspaceChrome();
    };

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    const handleMediaChange = () => {
      scheduleMeasure();
    };

    measureLayout();
    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', scheduleMeasure);
    desktopQuery.addEventListener('change', handleMediaChange);
    reducedMotionQuery.addEventListener('change', handleMediaChange);

    return () => {
      resizeObserver.disconnect();
      clearSnapTimeout();
      setImmersiveWorkspaceActive(false);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', scheduleMeasure);
      desktopQuery.removeEventListener('change', handleMediaChange);
      reducedMotionQuery.removeEventListener('change', handleMediaChange);

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="mt-6"
      style={{
        scrollMarginTop: `${stickyTop}px`,
        ...(sectionHeight ? { height: `${sectionHeight}px` } : {}),
      }}
    >
      <div
        className="stickman-workspace-sticky space-y-6 lg:sticky lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,420px)] lg:items-stretch lg:gap-6 lg:space-y-0 xl:gap-8"
        style={{
          top: `${stickyTop}px`,
          ...(workspaceHeight ? { height: `${workspaceHeight}px` } : {}),
        }}
      >
        <div className="min-h-0 lg:h-full">{preview}</div>

        <div className="relative min-h-0 lg:h-full">
          <div className="relative min-h-0 lg:h-full lg:overflow-y-auto">
            <div ref={contentRef} className="space-y-6 lg:pr-8">
              {controls}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
