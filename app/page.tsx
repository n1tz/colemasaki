// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  const projects = [
    { title: "Project One", tag: "3D / VFX", href: "#", img: "/placeholder/1.jpg" },
    { title: "Project Two", tag: "Branding", href: "#", img: "/placeholder/2.jpg" },
    { title: "Project Three", tag: "Illustration", href: "#", img: "/placeholder/3.jpg" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      {/* Nav */}
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          COLE MASAKI
        </Link>
        <nav className="hidden gap-6 text-sm text-[--color-subtle] md:flex">
          <Link href="#about" className="hover:text-[--color-fg]">About</Link>
          <Link href="#work" className="hover:text-[--color-fg]">Work</Link>
          <Link href="#contact" className="hover:text-[--color-fg]">Contact</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mt-14 md:mt-20">
        <h1 className="text-4xl leading-tight font-semibold md:text-6xl tracking-tight">
          Designer, illustrator, and 3D/VFX generalist in Akihabara.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[--color-subtle] md:text-lg">
          I build campaign KVs, merchandise, and motion for anime/IP brands. Below is a small selection of work.
          For inquiries, email{" "}
          <a
            href="mailto:hello@example.com"
            className="text-[--color-fg] underline decoration-[--color-brand] underline-offset-4 hover:opacity-90"
          >
            hello@example.com
          </a>.
        </p>

        <div className="mt-8 flex gap-3">
          <Link
            href="#work"
            className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            View Work
          </Link>
          <a
            href="/ColeMasaki_Resume.pdf"
            className="inline-flex items-center rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
          >
            Download Résumé
          </a>
        </div>
      </section>

      {/* Work */}
      <section id="work" className="mt-16 md:mt-24">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Selected Work</h2>
          <Link href="/projects" className="text-sm text-[--color-subtle] hover:text-[--color-fg]">
            All projects →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {projects.map((p) => (
            <a
              key={p.title}
              href={p.href}
              className="group overflow-hidden rounded-2xl border border-white/10 hover:border-white/20"
            >
              <div className="aspect-[4/3] w-full bg-white/5">
                {/* Replace with next/image when you add real assets */}
                {/* <Image src={p.img} alt={p.title} fill className="object-cover" /> */}
              </div>
              <div className="p-4">
                <div className="text-xs uppercase tracking-wide text-[--color-subtle]">{p.tag}</div>
                <div className="mt-1 text-base font-medium group-hover:underline underline-offset-4 decoration-white/20">
                  {p.title}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="mt-16 md:mt-24">
        <h2 className="text-2xl font-semibold">About</h2>
        <p className="mt-3 max-w-3xl text-[--color-subtle]">
          I’m a Tokyo-based designer focused on anime/IP campaigns, merch, and 3D key visuals.
          Tools: Blender, ZBrush, Illustrator, Photoshop. Currently at Akihabara Premium Collection / Tokyo Dub Agent.
        </p>
      </section>

      {/* Contact / Footer */}
      <section id="contact" className="mt-16 md:mt-24">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <div className="mt-3 text-[--color-subtle]">
          <p>
            Email:{" "}
            <a
              href="mailto:hello@example.com"
              className="underline decoration-[--color-brand] underline-offset-4 hover:text-[--color-fg]"
            >
              hello@example.com
            </a>
          </p>
          <p>
            GitHub:{" "}
            <a
              href="https://github.com/n1tz"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[--color-brand] underline-offset-4 hover:text-[--color-fg]"
            >
              n1tz
            </a>
          </p>
          <p>
            Instagram:{" "}
            <a
              href="#"
              className="underline decoration-[--color-brand] underline-offset-4 hover:text-[--color-fg]"
            >
              @colemasaki
            </a>
          </p>
        </div>
        <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-[--color-subtle]">
          © {new Date().getFullYear()} Cole Masaki. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
