import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin);

// Animation presets
export const animations = {
  // Entrance for container elements
  containerEntrance: (el: HTMLElement | null) => {
    if (!el) return;
    return gsap.fromTo(el, 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );
  },

  // Staggered entrance for items
  staggerEntrance: (selector: string, parent: HTMLElement | null) => {
    if (!parent) return;
    return gsap.fromTo(selector,
      { opacity: 0, x: -20 },
      { 
        opacity: 1, 
        x: 0, 
        duration: 0.5, 
        stagger: 0.1, 
        ease: "power2.out",
        clearProps: "all"
      }
    );
  },

  // Hacker-style text reveal
  textReveal: (el: HTMLElement | null, text: string) => {
    if (!el) return;
    return gsap.to(el, {
      duration: 1.5,
      text: {
        value: text,
        delimiter: "",
      },
      ease: "none",
    });
  },

  // Pulse effect for status indicators
  statusPulse: (el: HTMLElement | null) => {
    if (!el) return;
    return gsap.to(el, {
      opacity: 0.5,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });
  },

  // Count up for stats
  countUp: (el: HTMLElement | null, endValue: number) => {
    if (!el) return;
    const obj = { value: 0 };
    return gsap.to(obj, {
      value: endValue,
      duration: 2,
      ease: "power2.out",
      onUpdate: () => {
        if (el) el.textContent = Math.floor(obj.value).toString();
      }
    });
  }
};

export default gsap;
