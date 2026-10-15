"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CHAPTERS, chapterAt, storyTimeAt, type ChapterId, type SectionMetrics } from "@/lib/story/chapters";
import { story } from "@/lib/story/store";

/**
 * Binds document scroll to story time. Scrolling stays native: no wheel
 * hijacking and no pinning. ScrollTrigger is used for its robust refresh
 * handling (resize, font loading, orientation changes) and for text reveals.
 */
export default function StoryScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    story.set({ reducedMotion: media.matches });
    const onMedia = () => story.set({ reducedMotion: media.matches });
    media.addEventListener("change", onMedia);

    let sections: SectionMetrics[] = [];
    let opaqueRange: [number, number] | null = null;

    const measure = () => {
      sections = CHAPTERS.map((c) => {
        const el = document.getElementById(c.id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { id: c.id as ChapterId, top: rect.top + window.scrollY, height: rect.height };
      }).filter((s): s is SectionMetrics => s !== null);
      const opaque = sections.filter((s) => CHAPTERS.find((c) => c.id === s.id)?.opaque);
      opaqueRange = opaque.length ? [opaque[0].top, opaque[opaque.length - 1].top + opaque[opaque.length - 1].height] : null;
    };

    const update = () => {
      if (sections.length === 0) return;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const chapter = chapterAt(y, vh, sections);
      const reduced = story.motionReduced();
      const target = reduced ? chapter.rest : storyTimeAt(y, vh, sections);
      const covered = opaqueRange ? y >= opaqueRange[0] && y + vh <= opaqueRange[1] : false;
      const navLine = y + 32;
      const navOnLight = opaqueRange ? navLine >= opaqueRange[0] && navLine < opaqueRange[1] : false;
      story.set({ target, chapter: chapter.id, covered, navOnLight });
      document.documentElement.style.setProperty("--story-progress", String(Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - vh))));
    };

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: update,
      onRefresh: () => {
        measure();
        update();
      },
    });
    const unsub = story.subscribe((s) => {
      // Re-evaluate when the motion preference changes.
      if (s.reducedMotion !== lastReduced || s.userPaused !== lastPaused) {
        lastReduced = s.reducedMotion;
        lastPaused = s.userPaused;
        update();
      }
    });
    let lastReduced = story.get().reducedMotion;
    let lastPaused = story.get().userPaused;

    measure();
    update();

    // Restrained reveals for editorial text. Content is server-rendered and
    // visible without JavaScript; reveals only run when motion is allowed.
    const ctx = gsap.context(() => {
      if (story.motionReduced()) return;
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (els) =>
          gsap.fromTo(els, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out", stagger: 0.08, overwrite: true }),
      });
    });

    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(document.body);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);

    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("load", onLoad);
      ro.disconnect();
      unsub();
      trigger.kill();
      ctx.revert();
    };
  }, []);

  return null;
}
