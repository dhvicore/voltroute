"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Check,
  ChevronRight,
  Leaf,
  MapPin,
  Menu,
  Route,
  Zap,
  X,
} from "lucide-react";
import {
  motion,
  MotionConfig,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Brand } from "./brand";
import { EVScene } from "./ev-scene";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { useSession } from "@/components/workspace/session-provider";
const features = [
  {
    icon: Route,
    number: "01",
    title: "The journey, reimagined.",
    text: "Your starting point. Your destination. A route with the charging stops that fit your EV.",
    link: "Explore route planning",
  },
  {
    icon: Zap,
    number: "02",
    title: "A little pause. More possibility.",
    text: "Explore compatible connectors, compare charging options, and plan a stop that works for you.",
    link: "Find your next charge",
  },
  {
    icon: BatteryCharging,
    number: "03",
    title: "Everything, in your space.",
    text: "Your profile and saved activity, ready when you are. Less to think about. More road ahead.",
    link: "Make it your journey",
  },
];
const reveal = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
export function LandingPage() {
  const { user, isDemo } = useSession();
  const authenticated = !!user && !isDemo;
  const [menu, setMenu] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: hero,
    // Continue through the short hero exit, finishing as the next heading enters.
    offset: ["start start", "end 45%"],
  });
  const carX = useTransform(scrollYProgress, [0, 0.5, 1], [0, -6, -10]);
  const carRotate = useTransform(scrollYProgress, [0, 0.65, 1], [0, 0, 0]);
  const carScale = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1, 1],
  );
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -15]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0.85]);
  const chargeOpacity = useTransform(scrollYProgress, [0.04, 0.22], [0, 1]);
  const chargeY = useTransform(scrollYProgress, [0.04, 0.22], [24, 0]);
  const chargeScale = useTransform(scrollYProgress, [0.04, 0.22], [0.97, 1]);
  const routeOpacity = useTransform(scrollYProgress, [0.28, 0.48], [0, 1]);
  const routeY = useTransform(scrollYProgress, [0.28, 0.48], [24, 0]);
  const routeScale = useTransform(scrollYProgress, [0.28, 0.48], [0.97, 1]);
  const main = authenticated ? (user.is_operator || user.role === "admin" ? "/operator" : "/planner") : "/login";
  const accountLink = authenticated ? "/profile" : "/login";
  return (
    <MotionConfig reducedMotion="user">
      <div className="site-page cinematic-site">
        <header className="site-header cinematic-header">
          <Brand />
          <nav
            aria-label="Website navigation"
            className={menu ? "site-navigation open" : "site-navigation"}
          >
            <a href="#experience" onClick={() => setMenu(false)}>
              The experience
            </a>
            <a href="#how-it-works" onClick={() => setMenu(false)}>
              How it works
            </a>
            <Link href={accountLink}>
              {authenticated ? "My account" : "Log in"}
              <ArrowUpRight size={12} />
            </Link>
          </nav>
          <div className="site-header-actions">
            <ThemeToggle compact />
            <Link href={authenticated ? main : "/register"} className="site-button site-button-small">
              {authenticated ? (user?.is_operator || user?.role === "admin" ? "Station console" : "Open planner") : "Create account"}
              <ArrowUpRight size={14} />
            </Link>
            <button
              className="site-menu"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
            >
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>
        <main>
          <section
            ref={hero}
            className="cinema-scroll-story"
            aria-label="Scroll-driven electric car experience"
          >
            <div className="cinema-hero cinema-hero-sticky">
              <div className="cinema-grain" aria-hidden="true" />
              <motion.div
                className="cinema-hero-copy"
                style={reduce ? {} : { y: copyY, opacity: copyOpacity }}
                initial={reduce ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 }}
              >
                <div className="cinema-eyebrow">
                  <span className="pulse-dot" />
                  THE ROAD AHEAD IS ELECTRIC
                </div>
                <h1>
                  A little charge.
                  <br />
                  <span>A world of possibility.</span>
                </h1>
                <p>
                  Go where life takes you. We’ll help you find
                  <br className="desktop-break" /> a better way to charge along
                  the way.
                </p>
                <div className="cinema-actions">
                  <Link className="site-button" href={main}>
                    {!authenticated
                      ? "Log in"
                      : user?.is_operator
                        ? "Open station console"
                        : "Plan your journey"}
                    <ArrowUpRight size={17} />
                  </Link>
                  <a href="#experience" className="cinema-secondary">
                    Discover VoltRoute
                    <ArrowDown size={15} />
                  </a>
                </div>
              </motion.div>
              <div className="cinema-car-stage">
                <EVScene
                  x={carX}
                  rotateY={carRotate}
                  scale={carScale}
                  progress={scrollYProgress}
                />
                <motion.div
                  className="cinema-floating-chip cinema-chip-battery"
                  initial={false}
                  style={reduce ? {} : { opacity: chargeOpacity, y: chargeY, scale: chargeScale }}
                >
                  <span className="cinema-chip-icon">
                    <BatteryCharging size={19} />
                  </span>
                  <div>
                    <small>Built for your EV</small>
                    <strong>Charge your way.</strong>
                  </div>
                  <span className="cinema-chip-dot" />
                </motion.div>
                <motion.div
                  className="cinema-floating-chip cinema-chip-route"
                  initial={false}
                  style={reduce ? {} : { opacity: routeOpacity, y: routeY, scale: routeScale }}
                >
                  <Route size={17} />
                  <span>A smarter route starts here.</span>
                  <ArrowUpRight size={14} />
                </motion.div>
              </div>
              <a className="cinema-scroll-cue" href="#experience">
                <span className="cinema-scroll-mouse">
                  <i />
                </span>
                <span>SCROLL TO TURN THE CAR</span>
                <ArrowDown size={13} />
              </a>
            </div>
          </section>
          <section
            className="cinema-network"
            aria-label="Compatible charging connectors"
          >
            <span>ONE JOURNEY. MORE WAYS TO CHARGE.</span>
            <div>
              <strong>
                CCS2<small>DC fast charging</small>
              </strong>
              <i />
              <strong>
                Type 2<small>Everyday charging</small>
              </strong>
              <i />
              <strong>
                CHAdeMO<small>More ways to connect</small>
              </strong>
              <span className="cinema-network-note">
                <Leaf size={17} />
                Thoughtfully electric.
              </span>
            </div>
          </section>
          <section id="experience" className="cinema-section">
            <motion.div
              className="cinema-section-heading"
              variants={reveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.65 }}
            >
              <div>
                <span className="cinema-eyebrow">
                  DESIGNED AROUND YOUR JOURNEY
                </span>
                <h2>
                  Less figuring it out.
                  <br />
                  <span>More finding your way.</span>
                </h2>
              </div>
              <p>
                Thoughtful tools. A little peace of mind.
                <br />A better feeling about the road ahead.
              </p>
            </motion.div>
            <div className="cinema-feature-grid">
              {features.map((feature, i) => (
                <motion.article
                  className="cinema-feature-card"
                  key={feature.number}
                  variants={reveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={reduce ? {} : { y: -7 }}
                >
                  <div className="cinema-feature-top">
                    <span>
                      <feature.icon size={24} strokeWidth={1.4} />
                    </span>
                    <small>{feature.number}</small>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <Link href={i === 2 ? accountLink : main}>
                    {feature.link}
                    <ArrowUpRight size={15} />
                  </Link>
                  <span className="cinema-card-glow" aria-hidden="true" />
                </motion.article>
              ))}
            </div>
          </section>
          <section id="how-it-works" className="cinema-how cinema-section">
            <motion.div
              variants={reveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <span className="cinema-eyebrow">FROM HERE TO ANYWHERE</span>
              <h2>
                Good journeys
                <br />
                start with <em>a plan.</em>
              </h2>
              <p>
                Your next destination is waiting.
                <br />
                Getting there can feel a little easier.
              </p>
              <Link href={main} className="cinema-secondary">
                Let’s find your way
                <ArrowRight size={16} />
              </Link>
              <div className="cinema-route-art" aria-hidden="true">
                <span>
                  <MapPin size={18} />
                </span>
                <i />
                <span className="cinema-route-charge">
                  <Zap size={20} />
                </span>
                <i />
                <span>
                  <Check size={18} />
                </span>
              </div>
            </motion.div>
            <div className="cinema-steps">
              {[
                {
                  title: "Tell us where you’re going.",
                  text: "Add your starting point, destination, and departure battery.",
                },
                {
                  title: "Find a good place to recharge.",
                  text: "Explore charging stops and the connectors that suit your vehicle.",
                },
                {
                  title: "Make the journey yours.",
                  text: "Choose your stop, review a slot, and keep your details close.",
                },
              ].map((s, i) => (
                <motion.article
                  key={s.title}
                  initial={reduce ? false : { opacity: 0, x: 25 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.55, delay: i * 0.1 }}
                >
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                  <ChevronRight size={17} />
                </motion.article>
              ))}
            </div>
          </section>
          <motion.section
            className="cinema-cta"
            initial={reduce ? false : { opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7 }}
          >
            <div className="cinema-cta-orbit" aria-hidden="true" />
            <span className="cinema-eyebrow">
              YOUR NEXT CHAPTER STARTS HERE
            </span>
            <h2>
              Take the long way.
              <br />
              <span>We’ll bring the charge.</span>
            </h2>
            <Link href={main} className="site-button">
              {user?.is_operator
                ? "Open station console"
                : "Let’s get you moving"}
              <ArrowUpRight size={17} />
            </Link>
            <span className="cinema-cta-caption">
              A little charge. A lot of possibility.
            </span>
          </motion.section>
        </main>
        <footer className="site-footer cinema-footer">
          <Brand />
          <span>Built for a better electric journey.</span>
          <div>
            <Link href={accountLink}>{authenticated ? "My account" : "Log in"}</Link>
            <Link href={main}>Route planner</Link>
            <a href="#experience">Back to explore</a>
          </div>
          <small>© {new Date().getFullYear()} VoltRoute</small>
        </footer>
      </div>
    </MotionConfig>
  );
}
