document.addEventListener("DOMContentLoaded", () => {
    const navToggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            const isOpen = navLinks.classList.toggle("open");
            navToggle.setAttribute("aria-expanded", String(isOpen));
        });

        navLinks.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("open");
                navToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    const header = document.querySelector(".site-header");
    if (header) {
        const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 8);
        updateHeader();
        window.addEventListener("scroll", updateHeader, { passive: true });
    }

    const revealTargets = document.querySelectorAll(".reveal");
    if (revealTargets.length) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        revealTargets.forEach((el) => observer.observe(el));
    }

    const yearEl = document.getElementById("year");
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
});
